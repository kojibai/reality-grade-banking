import { createReceizIdIdentity, serializeReceizIdentityArtifact } from "./identity.js";
import { verifyReceizArtifact } from "./artifactVerification.js";
import { createReceizArtifactAdmissionEngine, readReceizIdentityPublicBinding } from "./artifactAdmission.js";
import {
  coerceReceizSignatureV4DeviceCert, maybeSignReceizBundleV4,
  DOCUMENT_SEAL_GROTH16_PROOF_MANIFEST, generateDocumentSealGroth16ProofWithResources,
  receizeDocumentBytesCore, receizedContentType,
} from "./offlineSealImplementation.js";
import { base64UrlEncode, sha256Hex, toArrayBuffer } from "./verifier/crypto.js";
import { verifyReceizSignatureV4 } from "./verifier/signatureV4.js";
import { receizCurrentPinnedSignatureV4Roots } from "./verifier/roots.js";
import { verifyReceizDocumentBytesCanonical } from "./verifier/canonical.js";
import { receizKaiNow } from "./v124Kai.js";

export type ReceizOfflineSealCertificate = Readonly<{
  version: 1; certType: "receiz.device.v1"; certId: string; issuerKid: string;
  alg: "Ed25519"; subjectPublicKeyRawB64u: string; issuedAtMs: number; expiresAtMs: number; sig: string;
}>;
export type ReceizOfflineSealEnrollment = Readonly<{
  privateKey: CryptoKey; cert: ReceizOfflineSealCertificate;
}>;
export interface ReceizOfflineSealStore {
  load(): Promise<ReceizOfflineSealEnrollment | null>;
  save(value: ReceizOfflineSealEnrollment): Promise<void>;
}
export type ReceizOfflineSealResources = Readonly<{ wasm: Uint8Array; zkey: Uint8Array }>;

export function verifyReceizOfflineSealedFile(input: Readonly<{ bytes: Uint8Array; filename: string; mimeType?: string }>) {
  return verifyReceizDocumentBytesCanonical({ fileBytes: input.bytes, filename: input.filename,
    ...(input.mimeType ? { mime: input.mimeType } : {}), signatureV4RootPublicKeys: receizCurrentPinnedSignatureV4Roots() });
}

/** Ephemeral custody for tests or a single session. Use durable custody for restart. */
export function createReceizMemorySealStore(): ReceizOfflineSealStore {
  let held: ReceizOfflineSealEnrollment | null = null;
  return { load: async () => held, save: async value => { held = value; } };
}

export function createReceizOfflineSealer(options: Readonly<{
  store: ReceizOfflineSealStore;
  resources: ReceizOfflineSealResources;
  enrollmentUrl?: string;
  /** Genuine admitted identity custody; never an owner string or signing certificate. */
  ownerIdentityAdmission?: unknown;
  fetch?: typeof globalThis.fetch;
}>) {
  // Snapshot resource bytes so a caller cannot mutate them after qualification.
  const resources = { wasm: new Uint8Array(options.resources.wasm), zkey: new Uint8Array(options.resources.zkey) };
  let resourcesReady: Promise<void> | undefined;
  let enrolling: Promise<void> | undefined;
  const signerFor = (state: ReceizOfflineSealEnrollment) => ({
    cert: state.cert,
    sign: async (bytes: Uint8Array) => new Uint8Array(await crypto.subtle.sign("Ed25519", state.privateKey, toArrayBuffer(bytes))),
  });
  async function checkEnrollment(state: ReceizOfflineSealEnrollment) {
    if (!coerceReceizSignatureV4DeviceCert(state.cert)) throw new Error("offline_seal_certificate_invalid");
    const bundle: Record<string, unknown> = { createdAtMs: Date.now(), kaiPulseEternal: String(receizKaiNow().pulse) };
    const signatureV4 = await maybeSignReceizBundleV4(bundle, signerFor(state));
    if (!signatureV4 || await verifyReceizSignatureV4({ ...bundle, signatureV4 }, receizCurrentPinnedSignatureV4Roots())) {
      throw new Error("offline_seal_certificate_invalid");
    }
  }
  async function qualifyResources() {
    resourcesReady ??= (async () => {
      if (await sha256Hex(resources.wasm) !== DOCUMENT_SEAL_GROTH16_PROOF_MANIFEST.wasmSha256
        || await sha256Hex(resources.zkey) !== DOCUMENT_SEAL_GROTH16_PROOF_MANIFEST.zkeySha256) {
        throw new Error("offline_seal_resources_invalid");
      }
    })();
    return resourcesReady;
  }
  async function enrollOnce() {
    const existing = await options.store.load();
    if (existing) { await checkEnrollment(existing); return; }
    const keys = await crypto.subtle.generateKey("Ed25519", false, ["sign", "verify"]) as CryptoKeyPair;
    const publicKeyRawB64u = base64UrlEncode(new Uint8Array(await crypto.subtle.exportKey("raw", keys.publicKey)));
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const response = await (options.fetch ?? globalThis.fetch)(options.enrollmentUrl ?? "https://receiz.com/api/signer/v4/receiz/enroll", {
      method: "POST", credentials: "omit", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ publicKeyRawB64u, challengeB64u: base64UrlEncode(challenge),
        challengeSigB64u: base64UrlEncode(new Uint8Array(await crypto.subtle.sign("Ed25519", keys.privateKey, challenge))) }),
    });
    if (!response.ok) throw new Error(`offline_seal_enrollment_failed:${response.status}`);
    const payload = await response.json() as { cert?: unknown };
    const cert = coerceReceizSignatureV4DeviceCert(payload.cert);
    if (!cert || cert.subjectPublicKeyRawB64u !== publicKeyRawB64u) throw new Error("offline_seal_certificate_invalid");
    const state = { cert, privateKey: keys.privateKey };
    await checkEnrollment(state);
    await options.store.save(state);
  }
  async function sealWithEnrollment(source: { bytes: Uint8Array; filename: string; mimeType?: string | undefined },
    state: ReceizOfflineSealEnrollment, nativeRecordSeal?: { ownerReceizId: string; recordId: string }) {
    const mime = source.mimeType || "application/octet-stream";
    const result = await receizeDocumentBytesCore({ fileBytes: source.bytes, filename: source.filename, mime,
      ...(nativeRecordSeal ? { options: { nativeRecordSeal } } : {}),
    }, {
      signingKey: "receiz-offline-signing-key-v2", verifyOrigin: "https://receiz.com",
      generateProof: args => generateDocumentSealGroth16ProofWithResources(args, { wasmPath: resources.wasm, zkeyPath: resources.zkey }),
      attachTrustedSignature: async bundle => {
        const signatureV4 = await maybeSignReceizBundleV4(bundle, signerFor(state));
        if (!signatureV4) throw new Error("offline_seal_signature_failed");
        return { ...bundle, signatureV4 };
      },
    });
    const contentType = result.kind === "trailer" ? "application/octet-stream" : receizedContentType(result.kind, mime);
    const verification = await verifyReceizOfflineSealedFile({ filename: result.downloadName, bytes: result.artifactBytes, mimeType: contentType });
    if (!verification.ok) throw new Error("offline_seal_output_verification_failed", { cause: verification });
    return Object.freeze({ artifactBytes: result.artifactBytes, filename: result.downloadName, mimeType: contentType, verification });
  }
  return Object.freeze({
    /** Explicit one-time network operation. Never called implicitly by seal. */
    async enroll() {
      enrolling ??= enrollOnce().finally(() => { enrolling = undefined; });
      await enrolling;
    },
    async ready() {
      const state = await options.store.load();
      if (!state) return false;
      await checkEnrollment(state);
      await qualifyResources();
      return true;
    },
    /** Host-side onboarding. Produces an encrypted Identity Seal; never an MCP response. */
    async createIdentity(input: Readonly<{ passphrase: string }>) {
      if (!input || typeof input !== "object" || Object.keys(input).some(key => key !== "passphrase")
        || typeof input.passphrase !== "string" || input.passphrase.length < 16) {
        throw new TypeError("offline_identity_private_passphrase_required");
      }
      if (options.ownerIdentityAdmission !== undefined) throw new TypeError("offline_identity_already_bound");
      const passphrase = input.passphrase;
      const state = await options.store.load();
      if (!state) throw new Error("offline_seal_enrollment_required");
      await checkEnrollment(state);
      await qualifyResources();
      const identity = await createReceizIdIdentity({ passphrase });
      const source = { bytes: new TextEncoder().encode(serializeReceizIdentityArtifact(identity.keyFile)),
        filename: "identity.receizkey", mimeType: "application/json" };
      const artifact = await sealWithEnrollment(source, state, {
        ownerReceizId: `${identity.username}.receiz.id`, recordId: `identity-record:${identity.keyFile.keyId}`,
      });
      const verification = await verifyReceizArtifact(new File([new Uint8Array(artifact.artifactBytes)], artifact.filename, { type: artifact.mimeType }));
      const admission = await createReceizArtifactAdmissionEngine()(verification, { profile: "identity", identityPassphrase: passphrase });
      await readReceizIdentityPublicBinding(admission);
      return artifact;
    },
    async seal(input: Readonly<{ bytes: Uint8Array; filename: string; mimeType?: string }>) {
      // Creation coordinates come from the canonical live proof path. A tool
      // or JavaScript caller cannot smuggle a temporal override through extras.
      if (!input || typeof input !== "object" || Object.keys(input).some(key => !["bytes", "filename", "mimeType"].includes(key))) {
        throw new TypeError("offline_seal_input_fields_invalid");
      }
      if (!(input.bytes instanceof Uint8Array) || !input.bytes.length || typeof input.filename !== "string" || !input.filename.trim()) throw new Error("offline_seal_input_invalid");
      const source = { bytes: new Uint8Array(input.bytes), filename: input.filename, mimeType: input.mimeType };
      const state = await options.store.load();
      if (!state) throw new Error("offline_seal_enrollment_required");
      await checkEnrollment(state);
      await qualifyResources();
      let nativeRecordSeal: { ownerReceizId: string; recordId: string } | undefined;
      if (options.ownerIdentityAdmission !== undefined) {
        const identity = await readReceizIdentityPublicBinding(options.ownerIdentityAdmission);
        if (!identity.signatureVerified || !identity.artifactOwnerReceizId) {
          throw new TypeError("offline_seal_identity_owner_mismatch");
        }
        nativeRecordSeal = { ownerReceizId: identity.artifactOwnerReceizId, recordId: `record:${await sha256Hex(source.bytes)}` };
      }
      return sealWithEnrollment(source, state, nativeRecordSeal);
    },
  });
}

/** Browser-origin custody: IndexedDB retains the non-exportable private CryptoKey. */
export function createReceizIndexedDbSealStore(name = "receiz-sdk-offline-seal"): ReceizOfflineSealStore {
  async function database(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(name, 1);
      request.onupgradeneeded = () => { request.result.createObjectStore("signer"); };
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }
  return {
    async load() {
      const db = await database();
      try { return await new Promise<ReceizOfflineSealEnrollment | null>((resolve, reject) => {
        const request = db.transaction("signer").objectStore("signer").get("active");
        request.onsuccess = () => resolve(request.result ?? null);
        request.onerror = () => reject(request.error);
      }); } finally { db.close(); }
    },
    async save(value) {
      const db = await database();
      try { await new Promise<void>((resolve, reject) => {
        const tx = db.transaction("signer", "readwrite");
        const request = tx.objectStore("signer").add(value, "active");
        request.onerror = () => reject(request.error);
        tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error);
      }); } finally { db.close(); }
    },
  };
}
