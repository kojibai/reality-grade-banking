"use client";

import {
  isCustomDomainRuntime,
  releaseCanonicalPbiAssertionPopup,
  requestCanonicalPbiAssertion,
  reserveCanonicalPbiAssertionPopup,
} from "@/app/lib/auth/bridgeClient";
import { decodeCbor } from "@/app/utils/cbor";
import { PBI_RP_ID, isAllowedPbiOrigin } from "@/app/lib/pbi/realm";

/**
 * This is the exact assertion payload we send to the server for PresenceBound verification.
 * It includes the signature + authenticator data + client data, and the stored public key.
 */
export type PresenceBoundAttesterAssertion = {
  authenticatorDataB64Url: string;
  clientDataJSONB64Url: string;
  signatureB64Url: string;
  credIdB64Url: string;
  pubKeyPem: string;
};

// Back-compat: older components import AssertionJSON.
export type AssertionJSON = PresenceBoundAttesterAssertion;

// Alias (some server code refers to PresenceBoundAssertion).
export type PresenceBoundAssertion = PresenceBoundAttesterAssertion;

export type StoredCredential = {
  credIdB64Url: string;
  pubKeyPem: string;
};

type MePayload = {
  userIdB64Url: string;
  email: string | null;
};

const PBI_LOCAL_STORAGE_KEYS = ["pbi:credIdB64Url", "pbi:presencebound:credential", "presencebound:credential", "presencebound:pbi"] as const;
const PBI_CREDENTIAL_JSON_KEYS = ["pbi:presencebound:credential", "presencebound:credential"] as const;
const PBI_CREDENTIAL_ID_KEYS = ["pbi:credIdB64Url"] as const;

function readClientStorageValue(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(key);
    if (typeof value === "string" && value.trim()) return value;
  } catch {
    // ignore
  }
  try {
    const value = window.sessionStorage.getItem(key);
    if (typeof value === "string" && value.trim()) return value;
  } catch {
    // ignore
  }
  return null;
}

function writeClientStorageValue(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // ignore
  }
  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

function parseStoredCredential(value: string): StoredCredential | null {
  try {
    const parsed = JSON.parse(value) as {
      credIdB64Url?: unknown;
      pubKeyPem?: unknown;
    };
    const credIdB64Url = typeof parsed.credIdB64Url === "string" ? parsed.credIdB64Url.trim() : "";
    const pubKeyPem = typeof parsed.pubKeyPem === "string" ? parsed.pubKeyPem.trim() : "";
    if (!credIdB64Url || !pubKeyPem.includes("BEGIN PUBLIC KEY")) return null;
    return { credIdB64Url, pubKeyPem };
  } catch {
    return null;
  }
}

export function peekPresenceBoundClientCredential(): StoredCredential | null {
  for (const key of PBI_CREDENTIAL_JSON_KEYS) {
    const value = readClientStorageValue(key);
    if (!value) continue;
    const credential = parseStoredCredential(value);
    if (credential) return credential;
  }
  return null;
}

export function hasPresenceBoundDeviceHint(): boolean {
  if (peekPresenceBoundClientCredential()) return true;
  for (const key of PBI_CREDENTIAL_ID_KEYS) {
    if (readClientStorageValue(key)?.trim()) return true;
  }
  return readClientStorageValue("presencebound:pbi") === "known";
}

export function rememberPresenceBoundDeviceHint(args: {
  credIdB64Url?: string | null;
  pubKeyPem?: string | null;
}): void {
  const credIdB64Url = args.credIdB64Url?.trim() ?? "";
  const pubKeyPem = args.pubKeyPem?.trim() ?? "";
  if (!credIdB64Url) return;

  writeClientStorageValue("pbi:credIdB64Url", credIdB64Url);
  writeClientStorageValue("presencebound:pbi", "known");

  if (pubKeyPem.includes("BEGIN PUBLIC KEY")) {
    const payload = JSON.stringify({ credIdB64Url, pubKeyPem });
    for (const key of PBI_CREDENTIAL_JSON_KEYS) {
      writeClientStorageValue(key, payload);
    }
  }
}

function assertCanonicalOrigin(): void {
  if (typeof window === "undefined") return;
  if (!isAllowedPbiOrigin(window.location.origin)) {
    throw new Error("webauthn_origin_not_canonical");
  }
}

export function clearPresenceBoundClientCache(): void {
  if (typeof window === "undefined") return;
  for (const key of PBI_LOCAL_STORAGE_KEYS) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // ignore
    }
    try {
      window.sessionStorage.removeItem(key);
    } catch {
      // ignore
    }
  }
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i] ?? 0);
  }
  return btoa(binary);
}

function fromBase64(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function base64UrlEncode(bytes: Uint8Array): string {
  return toBase64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function base64UrlDecode(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padLength = (4 - (normalized.length % 4)) % 4;
  const padding = "=".repeat(padLength);
  return fromBase64(`${normalized}${padding}`);
}

export function challengeToBytes(challengeB64Url: string): Uint8Array {
  return base64UrlDecode(challengeB64Url);
}

function toB64UrlFromBuffer(buffer: ArrayBuffer): string {
  return base64UrlEncode(new Uint8Array(buffer));
}

function toArrayBuffer(u8: Uint8Array): ArrayBuffer {
  const ab = new ArrayBuffer(u8.byteLength);
  new Uint8Array(ab).set(u8);
  return ab;
}

function getErrorName(error: unknown): string {
  if (error instanceof DOMException) return error.name;
  if (typeof error === "object" && error !== null && "name" in error && typeof (error as { name?: unknown }).name === "string") {
    return (error as { name: string }).name;
  }
  return "";
}

function canRecoverWithRegistration(error: unknown): boolean {
  const name = getErrorName(error);
  return name === "NotAllowedError" || name === "NotFoundError";
}

export async function fetchStoredCredential(): Promise<StoredCredential | null> {
  const localCredential = peekPresenceBoundClientCredential();
  if (localCredential) return localCredential;

  const res = await fetch("/api/pbi/webauthn/credential", {
    method: "GET",
    headers: { accept: "application/json" },
    credentials: "same-origin",
    cache: "no-store",
  });

  if (!res.ok) {
    if (res.status === 401) throw new Error("webauthn_unauthorized");
    throw new Error("webauthn_credential_fetch_failed");
  }

  const payload = (await res.json()) as { credential?: StoredCredential | null };
  if (payload.credential) {
    rememberPresenceBoundDeviceHint(payload.credential);
  }
  return payload.credential ?? null;
}

export async function storeCredential(credential: StoredCredential): Promise<void> {
  const res = await fetch("/api/pbi/webauthn/credential", {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(credential),
  });

  if (!res.ok) {
    if (res.status === 401) throw new Error("webauthn_unauthorized");
    throw new Error("webauthn_credential_store_failed");
  }

  rememberPresenceBoundDeviceHint(credential);
}

export async function fetchMe(): Promise<MePayload> {
  const res = await fetch("/api/pbi/webauthn/me", {
    method: "GET",
    headers: { accept: "application/json" },
    credentials: "same-origin",
    cache: "no-store",
  });

  if (!res.ok) {
    if (res.status === 401) throw new Error("webauthn_unauthorized");
    throw new Error("webauthn_me_fetch_failed");
  }

  return (await res.json()) as MePayload;
}

type AuthData = {
  credentialId: Uint8Array;
  credentialPublicKey: Uint8Array;
};

function getCoseValue(key: unknown, label: number): unknown {
  if (key instanceof Map) return key.get(label);
  if (typeof key === "object" && key !== null) {
    const obj = key as Record<string, unknown>;
    return obj[label] ?? obj[String(label)];
  }
  return undefined;
}

function bytesFromCose(value: unknown): Uint8Array {
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (Array.isArray(value)) return new Uint8Array(value);
  throw new Error("Invalid COSE coordinate data.");
}

function parseAuthData(authData: Uint8Array): AuthData {
  if (authData.length < 37) throw new Error("AuthData too short.");
  const view = new DataView(authData.buffer, authData.byteOffset, authData.byteLength);

  const flags = authData[32];
  const hasAttestedCredData = (flags & 0x40) !== 0;
  if (!hasAttestedCredData) throw new Error("Attestation missing credential data.");

  let offset = 37;
  offset += 16; // AAGUID

  if (offset + 2 > authData.length) throw new Error("AuthData missing credentialId length.");
  const credIdLen = view.getUint16(offset, false);
  offset += 2;

  if (offset + credIdLen > authData.length) throw new Error("AuthData credentialId length out of bounds.");
  const credentialId = authData.slice(offset, offset + credIdLen);
  offset += credIdLen;

  const credentialPublicKey = authData.slice(offset);
  if (credentialPublicKey.length === 0) throw new Error("Credential public key missing.");

  return { credentialId, credentialPublicKey };
}

function readAuthDataFromAttestation(decoded: unknown): Uint8Array {
  const authDataRaw: unknown =
    decoded instanceof Map
      ? decoded.get("authData")
      : typeof decoded === "object" && decoded !== null
        ? (decoded as Record<string, unknown>)["authData"]
        : undefined;

  if (!authDataRaw) throw new Error("Attestation missing authData.");
  if (authDataRaw instanceof Uint8Array) return authDataRaw;
  if (authDataRaw instanceof ArrayBuffer) return new Uint8Array(authDataRaw);
  if (Array.isArray(authDataRaw)) return new Uint8Array(authDataRaw);

  throw new Error("Attestation authData is not a byte array.");
}

function pemFromDerSpki(spkiBytes: Uint8Array): string {
  const b64 = toBase64(spkiBytes);
  const lines = b64.match(/.{1,64}/g) ?? [];
  return `-----BEGIN PUBLIC KEY-----\n${lines.join("\n")}\n-----END PUBLIC KEY-----`;
}

async function coseEc2ToPem(coseKey: unknown): Promise<string> {
  const x = bytesFromCose(getCoseValue(coseKey, -2));
  const y = bytesFromCose(getCoseValue(coseKey, -3));

  const jwk: JsonWebKey = {
    kty: "EC",
    crv: "P-256",
    x: base64UrlEncode(x),
    y: base64UrlEncode(y),
    ext: true,
  };

  const pubKey = await crypto.subtle.importKey("jwk", jwk, { name: "ECDSA", namedCurve: "P-256" }, true, []);
  const spki = await crypto.subtle.exportKey("spki", pubKey);
  return pemFromDerSpki(new Uint8Array(spki));
}

async function storedCredentialFromAttestation(credential: PublicKeyCredential): Promise<StoredCredential> {
  const response = credential.response;
  if (!(response instanceof AuthenticatorAttestationResponse)) {
    throw new Error("webauthn_create_bad_response");
  }

  const attestationObjectBytes = new Uint8Array(response.attestationObject);
  const decoded = decodeCbor(attestationObjectBytes);

  const authData = readAuthDataFromAttestation(decoded);
  const parsed = parseAuthData(authData);
  const coseKeyDecoded = decodeCbor(parsed.credentialPublicKey);

  return {
    credIdB64Url: base64UrlEncode(parsed.credentialId),
    pubKeyPem: await coseEc2ToPem(coseKeyDecoded),
  };
}

export async function registerPasskey(): Promise<StoredCredential> {
  assertCanonicalOrigin();
  if (typeof window === "undefined") throw new Error("webauthn_browser_only");
  if (typeof PublicKeyCredential === "undefined" || !navigator.credentials?.create) {
    throw new Error("webauthn_create_not_supported");
  }

  const me = await fetchMe();

  const publicKey: PublicKeyCredentialCreationOptions = {
    rp: { id: PBI_RP_ID, name: "Receiz" },
    user: {
      id: toArrayBuffer(base64UrlDecode(me.userIdB64Url)),
      name: me.email ?? "receiz-user",
      displayName: me.email ?? "Receiz User",
    },
    challenge: toArrayBuffer(crypto.getRandomValues(new Uint8Array(32))),
    pubKeyCredParams: [{ type: "public-key", alg: -7 }], // ES256
    authenticatorSelection: {
      userVerification: "required",
      residentKey: "preferred",
    },
    timeout: 60_000,
    attestation: "none",
  };

  const credential = (await navigator.credentials.create({ publicKey })) as PublicKeyCredential | null;
  if (!credential) throw new Error("webauthn_create_failed");

  const stored = await storedCredentialFromAttestation(credential);
  await storeCredential(stored);

  return stored;
}

/**
 * Register a platform passkey with an explicit user payload.
 */
export async function registerPlatformPasskey(params: {
  userIdB64Url: string;
  userName: string;
  userDisplayName: string;
  rpName?: string;
}): Promise<{ credIdB64Url: string }> {
  assertCanonicalOrigin();
  if (typeof window === "undefined") throw new Error("webauthn_browser_only");
  if (typeof PublicKeyCredential === "undefined" || !navigator.credentials?.create) {
    throw new Error("webauthn_create_not_supported");
  }

  const userIdBytes = base64UrlDecode(params.userIdB64Url);

  const challengeBytes = new Uint8Array(32);
  crypto.getRandomValues(challengeBytes);

  const publicKey: PublicKeyCredentialCreationOptions = {
    rp: { id: PBI_RP_ID, name: params.rpName ?? "Receiz" },
    user: {
      id: toArrayBuffer(userIdBytes),
      name: params.userName,
      displayName: params.userDisplayName,
    },
    challenge: toArrayBuffer(challengeBytes),
    pubKeyCredParams: [{ type: "public-key", alg: -7 }],
    authenticatorSelection: {
      userVerification: "required",
      residentKey: "preferred",
    },
    timeout: 60_000,
    attestation: "none",
  };

  const cred = (await navigator.credentials.create({ publicKey })) as PublicKeyCredential | null;
  if (!cred) throw new Error("webauthn_create_failed");

  return { credIdB64Url: toB64UrlFromBuffer(cred.rawId) };
}

export async function registerPresenceBoundCredentialForLocalIdentity(params: {
  userIdB64Url: string;
  userName: string;
  userDisplayName: string;
  rpName?: string;
}): Promise<StoredCredential> {
  assertCanonicalOrigin();
  if (typeof window === "undefined") throw new Error("webauthn_browser_only");
  if (typeof PublicKeyCredential === "undefined" || !navigator.credentials?.create) {
    throw new Error("webauthn_create_not_supported");
  }

  const challengeBytes = new Uint8Array(32);
  crypto.getRandomValues(challengeBytes);

  const credential = (await navigator.credentials.create({
    publicKey: {
      rp: { id: PBI_RP_ID, name: params.rpName ?? "Receiz" },
      user: {
        id: toArrayBuffer(base64UrlDecode(params.userIdB64Url)),
        name: params.userName,
        displayName: params.userDisplayName,
      },
      challenge: toArrayBuffer(challengeBytes),
      pubKeyCredParams: [{ type: "public-key", alg: -7 }],
      authenticatorSelection: {
        userVerification: "required",
        residentKey: "preferred",
      },
      timeout: 60_000,
      attestation: "none",
    },
  })) as PublicKeyCredential | null;

  if (!credential) throw new Error("webauthn_create_failed");

  const stored = await storedCredentialFromAttestation(credential);
  rememberPresenceBoundDeviceHint(stored);
  return stored;
}

export async function attestWithPlatformAuthenticator(params: {
  challenge: Uint8Array;
  allowCredIdB64Url?: string;
}): Promise<PresenceBoundAttesterAssertion> {
  assertCanonicalOrigin();
  if (typeof window === "undefined") throw new Error("webauthn_browser_only");
  if (typeof PublicKeyCredential === "undefined" || !navigator.credentials?.get) {
    throw new Error("webauthn_get_not_supported");
  }

  const challengeBuffer = toArrayBuffer(params.challenge);

  const allowCredentials =
    params.allowCredIdB64Url && params.allowCredIdB64Url.trim()
      ? [
          {
            type: "public-key" as const,
            id: toArrayBuffer(base64UrlDecode(params.allowCredIdB64Url.trim())),
          },
        ]
      : undefined;

  const credential = await navigator.credentials.get({
    publicKey: {
      rpId: PBI_RP_ID,
      challenge: challengeBuffer,
      userVerification: "required",
      timeout: 60_000,
      ...(allowCredentials ? { allowCredentials } : {}),
    },
  });

  if (!(credential instanceof PublicKeyCredential)) {
    throw new Error("webauthn_assert_no_credential");
  }

  const response = credential.response;
  if (!(response instanceof AuthenticatorAssertionResponse)) {
    throw new Error("webauthn_assert_bad_response");
  }

  const credIdB64Url = params.allowCredIdB64Url?.trim() || toB64UrlFromBuffer(credential.rawId);
  const stored = await fetchStoredCredential();
  if (!stored || stored.credIdB64Url !== credIdB64Url) {
    throw new Error("webauthn_credential_not_stored");
  }

  rememberPresenceBoundDeviceHint(stored);

  return {
    authenticatorDataB64Url: toB64UrlFromBuffer(response.authenticatorData),
    clientDataJSONB64Url: toB64UrlFromBuffer(response.clientDataJSON),
    signatureB64Url: toB64UrlFromBuffer(response.signature),
    credIdB64Url: stored.credIdB64Url,
    pubKeyPem: stored.pubKeyPem,
  };
}

/**
 * PresenceBound assertion helper (challengeB64Url from server).
 * Uses stored credential when possible; falls back to registering if recoverable.
 */
export async function performPresenceBoundAssertionOnCurrentOrigin(
  challengeB64Url: string,
): Promise<PresenceBoundAttesterAssertion> {
  assertCanonicalOrigin();
  if (typeof window === "undefined") throw new Error("webauthn_browser_only");
  if (typeof PublicKeyCredential === "undefined" || !navigator.credentials?.get) {
    throw new Error("webauthn_get_not_supported");
  }

  const challenge = challengeToBytes(challengeB64Url);
  const stored = await fetchStoredCredential();

  if (stored?.credIdB64Url) {
    try {
      return await attestWithPlatformAuthenticator({
        challenge,
        allowCredIdB64Url: stored.credIdB64Url,
      });
    } catch (error) {
      if (!canRecoverWithRegistration(error)) throw error;
    }
  }

  const registered = await registerPasskey();
  return attestWithPlatformAuthenticator({
    challenge,
    allowCredIdB64Url: registered.credIdB64Url,
  });
}

/**
 * PresenceBound assertion helper for login flows that already know the expected passkey credential.
 * Does not require a signed-in session and does not read/write stored credential state.
 */
export async function performPresenceBoundAssertionWithKnownCredentialOnCurrentOrigin(args: {
  challengeB64Url: string;
  credIdB64Url: string;
  pubKeyPem: string;
}): Promise<PresenceBoundAttesterAssertion> {
  assertCanonicalOrigin();
  if (typeof window === "undefined") throw new Error("webauthn_browser_only");
  if (typeof PublicKeyCredential === "undefined" || !navigator.credentials?.get) {
    throw new Error("webauthn_get_not_supported");
  }

  const credId = args.credIdB64Url.trim();
  const pubKeyPem = args.pubKeyPem.trim();
  if (!credId || !pubKeyPem) throw new Error("webauthn_credential_not_stored");
  if (!pubKeyPem.includes("BEGIN PUBLIC KEY")) throw new Error("webauthn_credential_not_stored");

  const credential = await navigator.credentials.get({
    publicKey: {
      rpId: PBI_RP_ID,
      challenge: toArrayBuffer(challengeToBytes(args.challengeB64Url)),
      userVerification: "required",
      timeout: 60_000,
      allowCredentials: [
        {
          type: "public-key",
          id: toArrayBuffer(base64UrlDecode(credId)),
        },
      ],
    },
  });

  if (!(credential instanceof PublicKeyCredential)) {
    throw new Error("webauthn_assert_no_credential");
  }

  const response = credential.response;
  if (!(response instanceof AuthenticatorAssertionResponse)) {
    throw new Error("webauthn_assert_bad_response");
  }

  rememberPresenceBoundDeviceHint({
    credIdB64Url: credId,
    pubKeyPem,
  });

  return {
    authenticatorDataB64Url: toB64UrlFromBuffer(response.authenticatorData),
    clientDataJSONB64Url: toB64UrlFromBuffer(response.clientDataJSON),
    signatureB64Url: toB64UrlFromBuffer(response.signature),
    credIdB64Url: credId,
    pubKeyPem,
  };
}

export function reservePresenceBoundAssertionWindow(): Window | null {
  return reserveCanonicalPbiAssertionPopup();
}

export function releasePresenceBoundAssertionWindow(popup: Window | null | undefined): void {
  releaseCanonicalPbiAssertionPopup(popup);
}

export async function performPresenceBoundAssertion(
  challengeB64Url: string,
  options?: { canonicalPopup?: Window | null },
): Promise<PresenceBoundAttesterAssertion> {
  if (isCustomDomainRuntime()) {
    return requestCanonicalPbiAssertion({
      challengeB64Url,
      needsCanonicalSession: true,
      reservedPopup: options?.canonicalPopup,
    });
  }

  return performPresenceBoundAssertionOnCurrentOrigin(challengeB64Url);
}

export async function performPresenceBoundAssertionWithKnownCredential(args: {
  challengeB64Url: string;
  credIdB64Url: string;
  pubKeyPem: string;
}): Promise<PresenceBoundAttesterAssertion> {
  if (isCustomDomainRuntime()) {
    return requestCanonicalPbiAssertion({
      challengeB64Url: args.challengeB64Url,
      credIdB64Url: args.credIdB64Url,
      pubKeyPem: args.pubKeyPem,
      needsCanonicalSession: false,
    });
  }

  return performPresenceBoundAssertionWithKnownCredentialOnCurrentOrigin(args);
}
