"use client";

import { receizBase64UrlDecode, receizBase64UrlEncode } from "../../../packages/receiz-sdk/src/identity";
import {
  createKairosNotePwaCustodyAdapter,
  type KairosNotePwaCustodyState,
  type KairosNotePwaCustodyStorage,
  type KairosNotePwaWebAuthnClient,
} from "./kairosNotePwaCustodyAdapter";
import {
  verifyReceizOfflineNotePlatformAttestationCertificate,
  type ReceizOfflineNotePlatformAttestationCertificateV1,
} from "../../../packages/receiz-sdk/src/offlineNotePlatformAttestation";
import type {
  KairosReservePwaCustodyState,
  KairosReservePwaCustodyStorage,
} from "./kairosReservePwaCustodyAdapter";

const DATABASE_NAME = "receiz-offline-note-qualified-custody-v1";
const STORE_NAME = "custody-slots";

function strictArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.slice().buffer;
}

function platformCeremonyFailure(error: unknown): Error {
  const name = error instanceof DOMException ? error.name : "";
  if (name === "NotAllowedError" || name === "AbortError") {
    return new Error("OFFLINE_NOTE_CUSTODY_CEREMONY_CANCELLED");
  }
  if (name === "NotSupportedError" || name === "SecurityError") {
    return new Error("OFFLINE_NOTE_CUSTODY_PLATFORM_AUTHENTICATOR_UNAVAILABLE");
  }
  return error instanceof Error
    ? error
    : new Error("OFFLINE_NOTE_CUSTODY_CEREMONY_FAILED");
}

function aaguidFromRegistration(response: AuthenticatorAttestationResponse): string {
  const authenticatorData = new Uint8Array(response.getAuthenticatorData());
  if (authenticatorData.byteLength < 53 || ((authenticatorData[32] ?? 0) & 0x40) !== 0x40) {
    throw new Error("OFFLINE_NOTE_CUSTODY_ATTESTED_CREDENTIAL_REQUIRED");
  }
  const hex = [...authenticatorData.slice(37, 53)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

async function publicKeyRaw(response: AuthenticatorAttestationResponse): Promise<string> {
  const spki = response.getPublicKey();
  if (!spki) throw new Error("OFFLINE_NOTE_CUSTODY_P256_PUBLIC_KEY_REQUIRED");
  const key = await crypto.subtle.importKey(
    "spki",
    spki,
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    [],
  );
  return receizBase64UrlEncode(new Uint8Array(await crypto.subtle.exportKey("raw", key)));
}

function openDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("OFFLINE_NOTE_CUSTODY_INDEXEDDB_UNAVAILABLE"));
  }
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, 1);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) database.createObjectStore(STORE_NAME);
    };
    request.onerror = () => reject(request.error ?? new Error("OFFLINE_NOTE_CUSTODY_INDEXEDDB_UNAVAILABLE"));
    request.onsuccess = () => resolve(request.result);
  });
}

export function createKairosNoteIndexedDbPwaCustodyStorage(slotId: string): KairosNotePwaCustodyStorage {
  const normalizedSlotId = slotId.trim();
  if (!normalizedSlotId) throw new Error("OFFLINE_NOTE_CUSTODY_SLOT_ID_REQUIRED");
  return Object.freeze({
    async read(): Promise<KairosNotePwaCustodyState | null> {
      const database = await openDatabase();
      try {
        return await new Promise((resolve, reject) => {
          const request = database.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(normalizedSlotId);
          request.onerror = () => reject(request.error ?? new Error("OFFLINE_NOTE_CUSTODY_STATE_READ_FAILED"));
          request.onsuccess = () => resolve((request.result as KairosNotePwaCustodyState | undefined) ?? null);
        });
      } finally {
        database.close();
      }
    },
    async write(state: KairosNotePwaCustodyState): Promise<void> {
      const database = await openDatabase();
      try {
        await new Promise<void>((resolve, reject) => {
          const transaction = database.transaction(STORE_NAME, "readwrite");
          transaction.objectStore(STORE_NAME).put(structuredClone(state), normalizedSlotId);
          transaction.oncomplete = () => resolve();
          transaction.onerror = () => reject(transaction.error ?? new Error("OFFLINE_NOTE_CUSTODY_STATE_WRITE_FAILED"));
          transaction.onabort = () => reject(transaction.error ?? new Error("OFFLINE_NOTE_CUSTODY_STATE_WRITE_FAILED"));
        });
      } finally {
        database.close();
      }
    },
  });
}

export function createKairosReserveIndexedDbPwaCustodyStorage(slotId: string): KairosReservePwaCustodyStorage {
  const delegate = createKairosNoteIndexedDbPwaCustodyStorage(`reserve:${slotId}`);
  return Object.freeze({
    async read(): Promise<KairosReservePwaCustodyState | null> {
      return await delegate.read() as unknown as KairosReservePwaCustodyState | null;
    },
    async write(state: KairosReservePwaCustodyState): Promise<void> {
      await delegate.write(state as unknown as KairosNotePwaCustodyState);
    },
  });
}

export function createKairosNoteBrowserWebAuthnClient(input: Readonly<{
  rpId: string;
  origin: string;
  fetchImpl?: typeof fetch;
}>): KairosNotePwaWebAuthnClient {
  const rpId = input.rpId.trim();
  const origin = input.origin.trim();
  const fetch = input.fetchImpl ?? globalThis.fetch.bind(globalThis);
  if (!rpId || !origin) throw new Error("OFFLINE_NOTE_CUSTODY_BROWSER_REALM_REQUIRED");
  return Object.freeze({
    async enroll() {
      if (typeof window === "undefined"
        || window.location.origin !== origin
        || typeof PublicKeyCredential === "undefined"
        || !navigator.credentials) {
        throw new Error("OFFLINE_NOTE_CUSTODY_WEBAUTHN_UNAVAILABLE");
      }
      const challengeResponse = await fetch("/api/wallet/notes/custody/attestation", {
        method: "GET",
        credentials: "same-origin",
        cache: "no-store",
      });
      const challengePayload = await challengeResponse.json().catch(() => null) as unknown;
      if (!challengeResponse.ok || !challengePayload || typeof challengePayload !== "object") {
        throw new Error("OFFLINE_NOTE_CUSTODY_CEREMONY_NOT_STARTED");
      }
      const challengeRow = challengePayload as Record<string, unknown>;
      const challengeB64u = typeof challengeRow.challengeB64u === "string" ? challengeRow.challengeB64u : "";
      if (!challengeB64u || challengeRow.origin !== origin || challengeRow.rpId !== rpId) {
        throw new Error("OFFLINE_NOTE_CUSTODY_CEREMONY_NOT_STARTED");
      }
      const userId = crypto.getRandomValues(new Uint8Array(32));
      let credential: Credential | null;
      try {
        credential = await navigator.credentials.create({
          publicKey: {
          challenge: strictArrayBuffer(receizBase64UrlDecode(challengeB64u)),
          rp: { id: rpId, name: "Receiz Offline Note Custody" },
          user: {
            id: userId,
            name: `offline-note-${crypto.randomUUID()}`,
            displayName: "Offline Note Custody",
          },
          pubKeyCredParams: [{ type: "public-key", alg: -7 }],
          authenticatorSelection: {
            authenticatorAttachment: "platform",
            residentKey: "required",
            requireResidentKey: true,
            userVerification: "required",
          },
          attestation: "direct",
          timeout: 120_000,
          },
        });
      } catch (error) {
        throw platformCeremonyFailure(error);
      }
      if (!(credential instanceof PublicKeyCredential)
        || !(credential.response instanceof AuthenticatorAttestationResponse)) {
        throw new Error("OFFLINE_NOTE_CUSTODY_CREDENTIAL_CREATION_FAILED");
      }
      const response = credential.response;
      const certificationResponse = await fetch("/api/wallet/notes/custody/attestation", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          challengeB64u,
          response: {
            id: credential.id,
            rawId: receizBase64UrlEncode(new Uint8Array(credential.rawId)),
            response: {
              attestationObject: receizBase64UrlEncode(new Uint8Array(response.attestationObject)),
              clientDataJSON: receizBase64UrlEncode(new Uint8Array(response.clientDataJSON)),
              transports: response.getTransports(),
            },
            type: "public-key",
            clientExtensionResults: credential.getClientExtensionResults(),
            authenticatorAttachment: credential.authenticatorAttachment,
          },
        }),
      });
      const certificationPayload = await certificationResponse.json().catch(() => null) as unknown;
      if (!certificationResponse.ok || !certificationPayload || typeof certificationPayload !== "object") {
        const failure = certificationPayload && typeof certificationPayload === "object"
          ? (certificationPayload as Record<string, unknown>).error
          : null;
        throw new Error(
          typeof failure === "string" && /^OFFLINE_NOTE_CUSTODY_[A-Z_]+$/.test(failure)
            ? failure
            : "OFFLINE_NOTE_DEVICE_ATTESTATION_INSUFFICIENT",
        );
      }
      const custodyPublicKeyRawB64u = await publicKeyRaw(response);
      const platformAttestationCertificate = await verifyReceizOfflineNotePlatformAttestationCertificate(
        (certificationPayload as Record<string, unknown>).certificate,
        {
          expectedRpId: rpId,
          expectedOrigin: origin,
          expectedCustodyPublicKeyRawB64u: custodyPublicKeyRawB64u,
        },
      ) as ReceizOfflineNotePlatformAttestationCertificateV1;
      return Object.freeze({
        credentialIdB64u: receizBase64UrlEncode(new Uint8Array(credential.rawId)),
        custodyPublicKeyRawB64u,
        aaguid: aaguidFromRegistration(response),
        rpId,
        origin,
        platformAttestationCertificate,
      });
    },
    async assert(assertionInput: Readonly<{ credentialIdB64u: string; challengeB64u: string }>) {
      if (typeof window === "undefined"
        || window.location.origin !== origin
        || typeof PublicKeyCredential === "undefined"
        || !navigator.credentials) {
        throw new Error("OFFLINE_NOTE_CUSTODY_WEBAUTHN_UNAVAILABLE");
      }
      const credential = await navigator.credentials.get({
        publicKey: {
          challenge: strictArrayBuffer(receizBase64UrlDecode(assertionInput.challengeB64u)),
          rpId,
          allowCredentials: [{
            id: strictArrayBuffer(receizBase64UrlDecode(assertionInput.credentialIdB64u)),
            type: "public-key",
            transports: ["internal"],
          }],
          userVerification: "required",
          timeout: 120_000,
        },
      });
      if (!(credential instanceof PublicKeyCredential)
        || !(credential.response instanceof AuthenticatorAssertionResponse)) {
        throw new Error("OFFLINE_NOTE_CUSTODY_ASSERTION_INVALID");
      }
      return Object.freeze({
        authenticatorDataB64u: receizBase64UrlEncode(new Uint8Array(credential.response.authenticatorData)),
        clientDataJSONB64u: receizBase64UrlEncode(new Uint8Array(credential.response.clientDataJSON)),
        signatureB64u: receizBase64UrlEncode(new Uint8Array(credential.response.signature)),
      });
    },
  });
}

export function createKairosNoteBrowserPwaCustodyAdapter(input: Readonly<{
  slotId: string;
  rpId: string;
  origin: string;
  fetchImpl?: typeof fetch;
}>) {
  return createKairosNotePwaCustodyAdapter({
    webAuthn: createKairosNoteBrowserWebAuthnClient({ rpId: input.rpId, origin: input.origin, fetchImpl: input.fetchImpl }),
    storage: createKairosNoteIndexedDbPwaCustodyStorage(input.slotId),
    profiles: [],
  });
}
