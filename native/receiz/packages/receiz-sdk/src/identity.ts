import {
  isSegmentedReceizPortableStateRef,
  isReceizPortableStateSegmentComposite,
  materializeReceizPortableStateRef,
  receizPortableSegmentSignatureBytes,
  segmentedReceizPortableStateRef,
  segmentReceizPortableStateSnapshot,
  type ReceizPortableStateSegmentComposite,
} from "./portableStateSegments.js";

export const RECEIZ_KEY_SCHEMA = "receiz.key.v1";
export const RECEIZ_KEY_NAME = "Receiz Key";
export const RECEIZ_ACCOUNT_STATE_SCHEMA = "receiz.account.state.v3";
export const RECEIZ_DEVICE_IDENTITY_SCHEMA = "receiz.device.identity.v1";
export const RECEIZ_IDENTITY_LOGIN_PROOF_SCHEMA = "receiz.identity.login_proof.v1";
export const RECEIZ_IDENTITY_ACCOUNT_PROJECTION_SCHEMA = "receiz.sdk.identity_account_projection.v1";
export const RECEIZ_IDENTITY_RECORD_KEY_CHUNK_KEY = "receiz.identity_record.keyfile.v1";

const KEY_ID_RE = /^[0-9a-f]{64}$/;
const HEX64_RE = /^[0-9a-f]{64}$/;
const BASE64URL_RE = /^[A-Za-z0-9_-]+$/;
const RECEIZ_KEYFILE_VERSION = 1;
const RECEIZ_KEYFILE_MIN_PASSPHRASE_LENGTH = 12;
const DEFAULT_PBKDF2_ITERATIONS = 210_000;
const RECEIZ_IDENTITY_RECORD_KEY_TRAILER_PREFIX = "\n--RECEIZ-IDENTITY-RECORD-KEYFILE-V1--\n";
const RECEIZ_IDENTITY_RECORD_KEY_TRAILER_SUFFIX = "\n--END-RECEIZ-IDENTITY-RECORD-KEYFILE-V1--\n";
const PNG_SIGNATURE = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);

type JsonPrimitive = string | number | boolean | null;
type ByteBufferLike = {
  readonly length: number;
  readonly [index: number]: number;
  toString(encoding?: string): string;
};
type BufferCtorLike = {
  from(input: Uint8Array | ArrayBuffer | string, encoding?: string): ByteBufferLike;
};

export type ReceizIdentityKeyAlgorithm = "Ed25519" | "P-256";
export type ReceizPortableStateProofMethod = "ed25519.jcs.v1" | "ecdsa-p256-sha256.jcs.v1";

export type ReceizIdentityPublicKeyProjection = Readonly<{
  keyId: string;
  alg: ReceizIdentityKeyAlgorithm;
  publicKeyRawB64u: string;
}>;

export type ReceizIdentityPublicKeyProjectionSignatureInput = Readonly<{
  keyId: string;
  alg: ReceizIdentityKeyAlgorithm;
  publicKeyRawB64u: string;
  challengeB64Url: string;
  signatureB64Url: string;
}>;

export type ReceizKeyOwner = {
  uid: string;
  email: string | null;
  username: string | null;
  displayName: string | null;
};

export type ReceizPortableStateProof = {
  method: ReceizPortableStateProofMethod;
  digestSha256Hex: string;
  signatureB64u: string;
  signedAt: string;
};

export type ReceizPortableState = {
  schema: string;
  exportedAt: string;
  snapshot: unknown;
  segmented?: ReceizPortableStateSegmentComposite | null;
  proof: ReceizPortableStateProof | null;
};

export type ReceizKeyAttestation = {
  pbiDecision: string;
  pbiReceiptHash: string;
  pbiChallengeId: string;
  pbiRequestId: string | null;
  attestedAt: string;
  pbiSignedKaiMicroPulse: string | null;
};

export type ReceizKeyFileV1 = {
  schema: typeof RECEIZ_KEY_SCHEMA;
  name: typeof RECEIZ_KEY_NAME;
  version: 1;
  issuedAt: string;
  keyId: string;
  alg: ReceizIdentityKeyAlgorithm;
  owner: ReceizKeyOwner;
  crypto: {
    publicKeyRawB64u: string;
    privateKeyPkcs8CiphertextB64u: string;
    privateKeyPkcs8B64u?: string | null;
    kdf: {
      name: "PBKDF2-SHA256";
      iterations: number;
      saltB64u: string;
    };
    cipher: {
      name: "AES-GCM-256";
      ivB64u: string;
      aad: string;
    };
  };
  attestation: ReceizKeyAttestation | null;
  portableState: ReceizPortableState | null;
};

export type ReceizKeyFile = ReceizKeyFileV1;

export type ReceizDeviceIdentity = {
  schema: typeof RECEIZ_DEVICE_IDENTITY_SCHEMA;
  createdAt: string;
  updatedAt: string;
  localUid: string;
  username: string;
  displayName: string;
  deviceName: string | null;
  keyFile: ReceizKeyFile;
};

export type ReceizIdIdentityOptions = {
  username?: string | null | undefined;
  displayName?: string | null | undefined;
  deviceName?: string | null | undefined;
  createdAt?: string | undefined;
  passphrase?: string | undefined;
  allowP256Fallback?: boolean | undefined;
  pbkdf2Iterations?: number | undefined;
};

export type ReceizIdentityLoginProof = {
  schema: typeof RECEIZ_IDENTITY_LOGIN_PROOF_SCHEMA;
  keyId: string;
  alg: ReceizIdentityKeyAlgorithm;
  challengeB64Url: string;
  signatureB64Url: string;
};

export type ReceizIdentityLoginProofInput = {
  keyFile: ReceizKeyFile;
  passphrase?: string | undefined;
  challengeText?: string | undefined;
  challengeB64Url?: string | undefined;
};

export type ReceizIdContinueRequest = {
  keyId: string;
  alg: ReceizIdentityKeyAlgorithm;
  publicKeyRawB64u: string;
  localUid: string;
  username: string;
  displayName: string;
  deviceName: string | null;
  createdAt: string;
  challengeB64Url: string;
  signatureB64Url: string;
  next?: string;
};

export type ReceizIdContinueOptions = {
  next?: string | undefined;
  nowMs?: number | undefined;
  nonceB64Url?: string | undefined;
  passphrase?: string | undefined;
};

export type ReceizIdentityAccountProjection = {
  schema: typeof RECEIZ_IDENTITY_ACCOUNT_PROJECTION_SCHEMA;
  keyId: string;
  alg: ReceizIdentityKeyAlgorithm;
  owner: ReceizKeyOwner;
  accountStateSchema: string | null;
  portableStateVerified: boolean;
  portableStateStatus: "verified" | "missing" | "invalid";
  authority: "verified-identity-portable-state" | "identity-only" | "rejected-portable-state";
  completeAtSealedHead: boolean;
  networkRequiredForProjection: false;
  continuity: ReceizIdentityLocalContinuityAuthority;
  /** Verified portable account truth. */
  verifiedState: unknown;
  /** Backward-compatible projection alias. Use verifiedState for product truth. */
  snapshot: unknown;
  domains: {
    profile: boolean;
    showcase: boolean;
    actionLedger: boolean;
    calendar: boolean;
    contacts: boolean;
    wallet: boolean;
    market: boolean;
    sports: boolean;
    signalVault: boolean;
    media: boolean;
    preferences: boolean;
    proofHistory: boolean;
  };
};

export const RECEIZ_IDENTITY_LOCAL_CONTINUITY_SCHEMA =
  "receiz.identity.local-continuity-authority.v1" as const;

export type ReceizIdentityLocalContinuityAuthority = Readonly<{
  schema: typeof RECEIZ_IDENTITY_LOCAL_CONTINUITY_SCHEMA;
  admittedProjection: "immediate-complete-sealed-head";
  localTruth: "permanent-append-only";
  synchronization: "verified-descendants-after-sealed-head-only";
  serverRole: "distribution-and-indexing-only";
  networkRequiredForLocalUse: false;
  globalAcknowledgementDeletesLocalTruth: false;
  infrastructureMayBlockVerifiedOwner: false;
}>;

export const RECEIZ_IDENTITY_LOCAL_CONTINUITY_AUTHORITY:
ReceizIdentityLocalContinuityAuthority = Object.freeze({
  schema: RECEIZ_IDENTITY_LOCAL_CONTINUITY_SCHEMA,
  admittedProjection: "immediate-complete-sealed-head",
  localTruth: "permanent-append-only",
  synchronization: "verified-descendants-after-sealed-head-only",
  serverRole: "distribution-and-indexing-only",
  networkRequiredForLocalUse: false,
  globalAcknowledgementDeletesLocalTruth: false,
  infrastructureMayBlockVerifiedOwner: false,
});

function isJsonPrimitive(value: unknown): value is JsonPrimitive {
  return value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean";
}

function normalizeNumber(value: number): string {
  if (!Number.isFinite(value)) return "null";
  return JSON.stringify(value);
}

function jcsCanonicalizeValue(value: unknown): string {
  if (isJsonPrimitive(value)) {
    if (typeof value === "number") return normalizeNumber(value);
    return JSON.stringify(value);
  }
  if (typeof value === "bigint") throw new TypeError("JCS does not support bigint values.");
  if (typeof value === "function" || typeof value === "symbol" || value === undefined) return "null";
  if (value && typeof value === "object") {
    const withToJson = value as { toJSON?: () => unknown };
    if (typeof withToJson.toJSON === "function") return jcsCanonicalizeValue(withToJson.toJSON());
    if (Array.isArray(value)) {
      return `[${value
        .map((item) =>
          item === undefined || typeof item === "function" || typeof item === "symbol" ? "null" : jcsCanonicalizeValue(item),
        )
        .join(",")}]`;
    }
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .filter((key) => record[key] !== undefined && typeof record[key] !== "function" && typeof record[key] !== "symbol")
      .map((key) => `${JSON.stringify(key)}:${jcsCanonicalizeValue(record[key])}`)
      .join(",")}}`;
  }
  return "null";
}

function jcsCanonicalize(value: unknown): string {
  return jcsCanonicalizeValue(value);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asTrimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asNullableTrimmedString(value: unknown): string | null {
  const normalized = asTrimmedString(value);
  return normalized ? normalized : null;
}

function normalizeIdentityKeyId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  return KEY_ID_RE.test(normalized) ? normalized : null;
}

function normalizeBase64Url(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  if (!normalized || !BASE64URL_RE.test(normalized)) return null;
  return normalized;
}

function normalizeOptionalBase64Url(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  if (!normalized) return null;
  return BASE64URL_RE.test(normalized) ? normalized : null;
}

function normalizeReceizIdentityKeyAlgorithm(value: unknown): ReceizIdentityKeyAlgorithm | null {
  const normalized = asTrimmedString(value);
  return normalized === "Ed25519" || normalized === "P-256" ? normalized : null;
}

function bufferCtor(): BufferCtorLike | null {
  return ((globalThis as unknown as { Buffer?: BufferCtorLike }).Buffer ?? null);
}

function bytesToBase64(bytes: Uint8Array): string {
  const BufferLike = bufferCtor();
  if (BufferLike) return BufferLike.from(bytes).toString("base64");
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
  const BufferLike = bufferCtor();
  if (BufferLike) {
    const buffer = BufferLike.from(base64, "base64");
    const out = new Uint8Array(buffer.length);
    for (let i = 0; i < buffer.length; i += 1) out[i] = (buffer[i] ?? 0) & 0xff;
    return out;
  }
  const binary = atob(base64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i);
  return out;
}

export function receizBase64UrlEncode(bytes: Uint8Array): string {
  return bytesToBase64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function receizBase64UrlDecode(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (normalized.length % 4)) % 4);
  return base64ToBytes(`${normalized}${padding}`);
}

function utf8(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

function decodeUtf8(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

function toStrictArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const out = new Uint8Array(bytes.byteLength);
  out.set(bytes);
  return out.buffer;
}

function randomBytes(size: number): Uint8Array {
  if (!globalThis.crypto?.getRandomValues) throw new Error("identity_key_not_supported");
  const bytes = new Uint8Array(size);
  globalThis.crypto.getRandomValues(bytes);
  return bytes;
}

function getSubtle(): SubtleCrypto {
  if (!globalThis.crypto?.subtle) throw new Error("identity_key_not_supported");
  return globalThis.crypto.subtle;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((part) => part.toString(16).padStart(2, "0"))
    .join("");
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  return bytesToHex(new Uint8Array(await getSubtle().digest("SHA-256", toStrictArrayBuffer(bytes))));
}

function normalizePassphrase(passphrase: string): string {
  return passphrase.normalize("NFKC");
}

function keyAad(keyId: string): string {
  return `RECEIZ_KEY_V1|${keyId}`;
}

function portableStateProofMethodForAlg(alg: ReceizIdentityKeyAlgorithm): ReceizPortableStateProofMethod {
  return alg === "P-256" ? "ecdsa-p256-sha256.jcs.v1" : "ed25519.jcs.v1";
}

function validatePublicKeyRawBytesForAlg(bytes: Uint8Array, alg: ReceizIdentityKeyAlgorithm): boolean {
  if (alg === "Ed25519") return bytes.byteLength === 32;
  return bytes.byteLength === 65 && bytes[0] === 4;
}

function keyGenerationAlgorithmForAlg(alg: ReceizIdentityKeyAlgorithm): EcKeyGenParams | AlgorithmIdentifier {
  return alg === "P-256" ? { name: "ECDSA", namedCurve: "P-256" } : { name: "Ed25519" };
}

function keyImportAlgorithmForAlg(alg: ReceizIdentityKeyAlgorithm): EcKeyImportParams | AlgorithmIdentifier {
  return alg === "P-256" ? { name: "ECDSA", namedCurve: "P-256" } : { name: "Ed25519" };
}

function keySignVerifyAlgorithmForAlg(alg: ReceizIdentityKeyAlgorithm): EcdsaParams | AlgorithmIdentifier {
  return alg === "P-256" ? { name: "ECDSA", hash: "SHA-256" } : "Ed25519";
}

function normalizedIterations(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number.NaN;
  if (!Number.isFinite(parsed)) return DEFAULT_PBKDF2_ITERATIONS;
  return Math.max(100_000, Math.min(1_500_000, Math.trunc(parsed)));
}

async function deriveAesGcmKey(args: { passphrase: string; salt: Uint8Array; iterations: number }): Promise<CryptoKey> {
  const subtle = getSubtle();
  const keyMaterial = await subtle.importKey("raw", toStrictArrayBuffer(utf8(args.passphrase)), { name: "PBKDF2" }, false, ["deriveKey"]);
  return subtle.deriveKey(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: toStrictArrayBuffer(args.salt),
      iterations: args.iterations,
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

function normalizeOwner(owner: { uid: string; email?: string | null; username?: string | null; displayName?: string | null }): ReceizKeyOwner {
  const uid = asTrimmedString(owner.uid);
  if (!uid) throw new Error("invalid_owner_uid");
  return {
    uid,
    email: asNullableTrimmedString(owner.email),
    username: asNullableTrimmedString(owner.username),
    displayName: asNullableTrimmedString(owner.displayName),
  };
}

function normalizePortableStateProof(value: unknown): ReceizPortableStateProof | null {
  const record = asRecord(value);
  if (!record) return null;
  const method = asTrimmedString(record.method);
  const digestSha256Hex = asTrimmedString(record.digestSha256Hex).toLowerCase();
  const signatureB64u = normalizeBase64Url(record.signatureB64u);
  const signedAt = asTrimmedString(record.signedAt);
  if (
    (method !== "ed25519.jcs.v1" && method !== "ecdsa-p256-sha256.jcs.v1") ||
    !HEX64_RE.test(digestSha256Hex) ||
    !signatureB64u ||
    !signedAt
  ) {
    return null;
  }
  return {
    method: method as ReceizPortableStateProofMethod,
    digestSha256Hex,
    signatureB64u,
    signedAt,
  };
}

function ensureKeyFileShape(file: ReceizKeyFileV1): ReceizKeyFileV1 {
  const keyId = normalizeIdentityKeyId(file.keyId);
  const alg = normalizeReceizIdentityKeyAlgorithm(file.alg);
  const publicKeyRawB64u = normalizeBase64Url(file.crypto?.publicKeyRawB64u);
  const privateCiphertextB64u = normalizeOptionalBase64Url(file.crypto?.privateKeyPkcs8CiphertextB64u);
  const privateKeyPkcs8B64u = normalizeOptionalBase64Url(file.crypto?.privateKeyPkcs8B64u);
  const saltB64u = normalizeBase64Url(file.crypto?.kdf?.saltB64u);
  const ivB64u = normalizeBase64Url(file.crypto?.cipher?.ivB64u);

  if (!keyId || !alg || !publicKeyRawB64u || (!privateCiphertextB64u && !privateKeyPkcs8B64u) || !saltB64u || !ivB64u) {
    throw new Error("receiz_key_invalid");
  }
  if (!validatePublicKeyRawBytesForAlg(receizBase64UrlDecode(publicKeyRawB64u), alg)) throw new Error("receiz_key_invalid");
  if (file.crypto.cipher.name !== "AES-GCM-256" || file.crypto.kdf.name !== "PBKDF2-SHA256") throw new Error("receiz_key_invalid");
  if (!Number.isFinite(file.crypto.kdf.iterations) || file.crypto.kdf.iterations < 1_000) throw new Error("receiz_key_invalid");

  const carriedSnapshot = file.portableState?.snapshot;
  const segmented = isSegmentedReceizPortableStateRef(carriedSnapshot)
    ? carriedSnapshot.composite
    : file.portableState?.segmented ?? null;
  const portableState = file.portableState
    ? {
        schema: asTrimmedString(file.portableState.schema) || "receiz.account.state.v1",
        exportedAt: asTrimmedString(file.portableState.exportedAt) || file.issuedAt,
        snapshot: segmented
          ? materializeReceizPortableStateRef(segmentedReceizPortableStateRef(segmented))
          : carriedSnapshot,
        segmented,
        proof: normalizePortableStateProof(file.portableState.proof),
      }
    : null;

  return {
    ...file,
    alg,
    keyId,
    crypto: {
      ...file.crypto,
      publicKeyRawB64u,
      privateKeyPkcs8CiphertextB64u: privateCiphertextB64u ?? "",
      privateKeyPkcs8B64u: privateKeyPkcs8B64u ?? null,
      kdf: {
        ...file.crypto.kdf,
        saltB64u,
      },
      cipher: {
        ...file.crypto.cipher,
        ivB64u,
      },
    },
    portableState,
  };
}

function parseReceizKeyFileObject(value: unknown): ReceizKeyFileV1 {
  const record = asRecord(value);
  if (!record) throw new Error("receiz_key_invalid");

  const schema = asTrimmedString(record.schema);
  const name = asTrimmedString(record.name);
  const version = typeof record.version === "number" ? Math.trunc(record.version) : Number.NaN;
  const keyId = normalizeIdentityKeyId(record.keyId);
  const alg = normalizeReceizIdentityKeyAlgorithm(record.alg);
  const issuedAt = asTrimmedString(record.issuedAt);
  const ownerRaw = asRecord(record.owner);
  const cryptoRaw = asRecord(record.crypto);
  const kdfRaw = asRecord(cryptoRaw?.kdf);
  const cipherRaw = asRecord(cryptoRaw?.cipher);

  if (schema !== RECEIZ_KEY_SCHEMA || name !== RECEIZ_KEY_NAME || version !== 1 || !keyId || !alg || !issuedAt) {
    throw new Error("receiz_key_invalid");
  }
  if (!ownerRaw || !cryptoRaw || !kdfRaw || !cipherRaw) throw new Error("receiz_key_invalid");

  const portableStateRecord = asRecord(record.portableState);
  const portableSnapshot = portableStateRecord?.snapshot ?? null;
  const directlyCarriedSegmented = portableStateRecord?.segmented;
  const portableState = portableStateRecord
    ? {
        schema: asTrimmedString(portableStateRecord.schema) || "receiz.account.state.v1",
        exportedAt: asTrimmedString(portableStateRecord.exportedAt) || issuedAt,
        snapshot: portableSnapshot,
        segmented: isSegmentedReceizPortableStateRef(portableSnapshot)
          ? portableSnapshot.composite
          : isReceizPortableStateSegmentComposite(directlyCarriedSegmented)
            ? directlyCarriedSegmented
            : null,
        proof: normalizePortableStateProof(portableStateRecord.proof),
      }
    : null;
  const attestationRecord = asRecord(record.attestation);
  const attestation = attestationRecord
    ? {
        pbiDecision: asTrimmedString(attestationRecord.pbiDecision),
        pbiReceiptHash: asTrimmedString(attestationRecord.pbiReceiptHash).toLowerCase(),
        pbiChallengeId: asTrimmedString(attestationRecord.pbiChallengeId),
        pbiRequestId: asNullableTrimmedString(attestationRecord.pbiRequestId),
        attestedAt: asTrimmedString(attestationRecord.attestedAt),
        pbiSignedKaiMicroPulse: (() => {
          const value = asTrimmedString(attestationRecord.pbiSignedKaiMicroPulse);
          return /^(0|[1-9][0-9]*)$/u.test(value) ? value : null;
        })(),
      }
    : null;

  return ensureKeyFileShape({
    schema: RECEIZ_KEY_SCHEMA,
    name: RECEIZ_KEY_NAME,
    version: RECEIZ_KEYFILE_VERSION,
    issuedAt,
    keyId,
    alg,
    owner: normalizeOwner({
      uid: asTrimmedString(ownerRaw.uid),
      email: asNullableTrimmedString(ownerRaw.email),
      username: asNullableTrimmedString(ownerRaw.username),
      displayName: asNullableTrimmedString(ownerRaw.displayName),
    }),
    crypto: {
      publicKeyRawB64u: asTrimmedString(cryptoRaw.publicKeyRawB64u),
      privateKeyPkcs8CiphertextB64u: asTrimmedString(cryptoRaw.privateKeyPkcs8CiphertextB64u),
      privateKeyPkcs8B64u: asNullableTrimmedString(cryptoRaw.privateKeyPkcs8B64u),
      kdf: {
        name: asTrimmedString(kdfRaw.name) as "PBKDF2-SHA256",
        iterations: Number(kdfRaw.iterations),
        saltB64u: asTrimmedString(kdfRaw.saltB64u),
      },
      cipher: {
        name: asTrimmedString(cipherRaw.name) as "AES-GCM-256",
        ivB64u: asTrimmedString(cipherRaw.ivB64u),
        aad: asTrimmedString(cipherRaw.aad),
      },
    },
    attestation,
    portableState,
  });
}

export function parseReceizIdentityArtifactText(text: string): ReceizKeyFileV1 {
  try {
    return parseReceizKeyFileObject(JSON.parse(text) as unknown);
  } catch (error) {
    if (error instanceof Error && error.message === "receiz_key_invalid") throw error;
    throw new Error("receiz_key_invalid");
  }
}

function isPngBytes(bytes: Uint8Array): boolean {
  if (bytes.byteLength < PNG_SIGNATURE.byteLength) return false;
  for (let i = 0; i < PNG_SIGNATURE.byteLength; i += 1) {
    if (bytes[i] !== PNG_SIGNATURE[i]) return false;
  }
  return true;
}

function readUint32BE(bytes: Uint8Array, offset: number): number {
  return (((bytes[offset] ?? 0) << 24) | ((bytes[offset + 1] ?? 0) << 16) | ((bytes[offset + 2] ?? 0) << 8) | (bytes[offset + 3] ?? 0)) >>> 0;
}

function chunkType(bytes: Uint8Array, offset: number): string {
  return String.fromCharCode(bytes[offset] ?? 0, bytes[offset + 1] ?? 0, bytes[offset + 2] ?? 0, bytes[offset + 3] ?? 0);
}

function pngIendEndOffset(bytes: Uint8Array): number | null {
  if (!isPngBytes(bytes)) return null;
  let offset = PNG_SIGNATURE.byteLength;
  while (offset + 12 <= bytes.byteLength) {
    const length = readUint32BE(bytes, offset);
    const type = chunkType(bytes, offset + 4);
    const chunkEnd = offset + 8 + length + 4;
    if (chunkEnd > bytes.byteLength) return null;
    if (type === "IEND") return chunkEnd;
    offset = chunkEnd;
  }
  return null;
}

function indexOfBytes(haystack: Uint8Array, needle: Uint8Array, start = 0): number {
  const lastStart = haystack.byteLength - needle.byteLength;
  for (let i = Math.max(0, start); i <= lastStart; i += 1) {
    let matched = true;
    for (let j = 0; j < needle.byteLength; j += 1) {
      if (haystack[i + j] !== needle[j]) {
        matched = false;
        break;
      }
    }
    if (matched) return i;
  }
  return -1;
}

function indexOfNull(bytes: Uint8Array, start: number): number {
  for (let i = start; i < bytes.length; i += 1) {
    if (bytes[i] === 0) return i;
  }
  return -1;
}

function parseTextChunkData(data: Uint8Array): { keyword: string; text: string } | null {
  const keywordEnd = indexOfNull(data, 0);
  if (keywordEnd <= 0) return null;
  return {
    keyword: decodeUtf8(data.slice(0, keywordEnd)),
    text: decodeUtf8(data.slice(keywordEnd + 1)),
  };
}

function parseITXtChunkData(data: Uint8Array): { keyword: string; text: string } | null {
  const keywordEnd = indexOfNull(data, 0);
  if (keywordEnd <= 0) return null;
  const keyword = decodeUtf8(data.slice(0, keywordEnd));
  let cursor = keywordEnd + 1;
  if (cursor + 2 > data.length) return null;
  const compressionFlag = data[cursor] ?? 0;
  const compressionMethod = data[cursor + 1] ?? 0;
  cursor += 2;
  if (compressionFlag !== 0 || compressionMethod !== 0) return null;
  const langEnd = indexOfNull(data, cursor);
  if (langEnd < 0) return null;
  cursor = langEnd + 1;
  const translatedEnd = indexOfNull(data, cursor);
  if (translatedEnd < 0) return null;
  cursor = translatedEnd + 1;
  return { keyword, text: decodeUtf8(data.slice(cursor)) };
}

function readPngTextChunk(bytes: Uint8Array, keyword: string): string | null {
  if (!isPngBytes(bytes)) return null;
  let offset = PNG_SIGNATURE.byteLength;
  while (offset + 12 <= bytes.byteLength) {
    const length = readUint32BE(bytes, offset);
    const type = chunkType(bytes, offset + 4);
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    if (dataEnd + 4 > bytes.byteLength) break;
    const data = bytes.slice(dataStart, dataEnd);
    const parsed = type === "iTXt" ? parseITXtChunkData(data) : type === "tEXt" ? parseTextChunkData(data) : null;
    if (parsed?.keyword === keyword) return parsed.text;
    offset = dataEnd + 4;
    if (type === "IEND") break;
  }
  return null;
}

function readReceizIdentityRecordKeyTrailer(pngBytes: Uint8Array): string | null {
  const iendEnd = pngIendEndOffset(pngBytes);
  if (iendEnd === null || iendEnd >= pngBytes.byteLength) return null;
  const trailerBytes = pngBytes.slice(iendEnd);
  const prefixBytes = utf8(RECEIZ_IDENTITY_RECORD_KEY_TRAILER_PREFIX);
  const suffixBytes = utf8(RECEIZ_IDENTITY_RECORD_KEY_TRAILER_SUFFIX);
  const prefixStart = indexOfBytes(trailerBytes, prefixBytes);
  if (prefixStart < 0) return null;
  const encodedStart = prefixStart + prefixBytes.byteLength;
  const suffixStart = indexOfBytes(trailerBytes, suffixBytes, encodedStart);
  if (suffixStart < 0) return null;
  const encoded = decodeUtf8(trailerBytes.slice(encodedStart, suffixStart)).trim();
  if (!encoded || !BASE64URL_RE.test(encoded)) return null;
  try {
    return decodeUtf8(receizBase64UrlDecode(encoded));
  } catch {
    return null;
  }
}

export function appendReceizIdentityArtifactTrailerToPng(pngBytes: Uint8Array, keyFile: ReceizKeyFile): Uint8Array {
  const iendEnd = pngIendEndOffset(pngBytes);
  if (iendEnd === null) throw new Error("receiz_key_identity_record_png_required");
  const encoded = receizBase64UrlEncode(utf8(serializeReceizIdentityArtifact(keyFile)));
  const trailer = utf8(`${RECEIZ_IDENTITY_RECORD_KEY_TRAILER_PREFIX}${encoded}${RECEIZ_IDENTITY_RECORD_KEY_TRAILER_SUFFIX}`);
  const pngBasis = pngBytes.slice(0, iendEnd);
  const out = new Uint8Array(pngBasis.byteLength + trailer.byteLength);
  out.set(pngBasis, 0);
  out.set(trailer, pngBasis.byteLength);
  return out;
}

async function inputToBytes(input: Blob | ArrayBuffer | Uint8Array | string): Promise<Uint8Array> {
  if (typeof input === "string") return utf8(input);
  if (input instanceof Uint8Array) return input;
  if (input instanceof ArrayBuffer) return new Uint8Array(input);
  if (typeof Blob !== "undefined" && input instanceof Blob) {
    return new Uint8Array(await input.arrayBuffer());
  }
  throw new Error("receiz_key_file_required");
}

export async function readReceizIdentityArtifact(input: Blob | ArrayBuffer | Uint8Array | string): Promise<ReceizKeyFileV1> {
  const bytes = await inputToBytes(input);
  if (isPngBytes(bytes)) {
    const embedded = readReceizIdentityRecordKeyTrailer(bytes) ?? readPngTextChunk(bytes, RECEIZ_IDENTITY_RECORD_KEY_CHUNK_KEY);
    if (!embedded) throw new Error("receiz_key_identity_record_missing");
    return parseReceizIdentityArtifactText(embedded);
  }
  return parseReceizIdentityArtifactText(decodeUtf8(bytes));
}

export function serializeReceizIdentityArtifact(keyFile: ReceizKeyFile): string {
  const normalized = ensureKeyFileShape(keyFile);
  const portableState = normalized.portableState
    ? {
        ...normalized.portableState,
        snapshot: normalized.portableState.segmented
          ? segmentedReceizPortableStateRef(normalized.portableState.segmented)
          : normalized.portableState.snapshot,
        segmented: undefined,
      }
    : null;
  return `${JSON.stringify({ ...normalized, portableState }, null, 2)}\n`;
}

export async function deriveReceizIdentityKeyIdFromPublicKeyRawB64u(
  publicKeyRawB64u: string,
  alg: ReceizIdentityKeyAlgorithm = "Ed25519",
): Promise<string> {
  const normalized = normalizeBase64Url(publicKeyRawB64u);
  if (!normalized) throw new Error("invalid_public_key");
  const bytes = receizBase64UrlDecode(normalized);
  if (!validatePublicKeyRawBytesForAlg(bytes, alg)) throw new Error("invalid_public_key_length");
  return sha256Hex(bytes);
}

function closedIdentityPublicKeySignatureInput(
  value: unknown,
): ReceizIdentityPublicKeyProjectionSignatureInput | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return null;
  const expected = ["keyId", "alg", "publicKeyRawB64u", "challengeB64Url", "signatureB64Url"] as const;
  const ownKeys = Reflect.ownKeys(value);
  if (ownKeys.length !== expected.length || ownKeys.some((key) => typeof key !== "string" || !expected.includes(key as typeof expected[number]))) {
    return null;
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (expected.some((key) => !descriptors[key]
    || !descriptors[key]!.enumerable
    || !("value" in descriptors[key]!))) return null;
  return {
    keyId: descriptors.keyId!.value as string,
    alg: descriptors.alg!.value as ReceizIdentityKeyAlgorithm,
    publicKeyRawB64u: descriptors.publicKeyRawB64u!.value as string,
    challengeB64Url: descriptors.challengeB64Url!.value as string,
    signatureB64Url: descriptors.signatureB64Url!.value as string,
  };
}

/**
 * Verifies exact signature bytes using only a clone-safe public identity-key
 * projection. This is a cryptographic predicate, not an issuer, admission, or
 * authority brand.
 */
export async function verifyReceizIdentityPublicKeyProjectionSignature(
  value: ReceizIdentityPublicKeyProjectionSignatureInput,
): Promise<boolean> {
  const input = closedIdentityPublicKeySignatureInput(value);
  if (!input) return false;
  const keyId = normalizeIdentityKeyId(input.keyId);
  const alg = normalizeReceizIdentityKeyAlgorithm(input.alg);
  const publicKeyRawB64u = normalizeBase64Url(input.publicKeyRawB64u);
  const challengeB64Url = normalizeBase64Url(input.challengeB64Url);
  const signatureB64Url = normalizeBase64Url(input.signatureB64Url);
  if (!keyId || keyId !== input.keyId || !alg || alg !== input.alg
    || !publicKeyRawB64u || publicKeyRawB64u !== input.publicKeyRawB64u
    || !challengeB64Url || challengeB64Url !== input.challengeB64Url
    || !signatureB64Url || signatureB64Url !== input.signatureB64Url) return false;
  try {
    const publicKeyBytes = receizBase64UrlDecode(publicKeyRawB64u);
    const challengeBytes = receizBase64UrlDecode(challengeB64Url);
    const signatureBytes = receizBase64UrlDecode(signatureB64Url);
    if (!validatePublicKeyRawBytesForAlg(publicKeyBytes, alg)
      || receizBase64UrlEncode(publicKeyBytes) !== publicKeyRawB64u
      || receizBase64UrlEncode(challengeBytes) !== challengeB64Url
      || signatureBytes.byteLength !== 64
      || receizBase64UrlEncode(signatureBytes) !== signatureB64Url
      || await sha256Hex(publicKeyBytes) !== keyId) return false;
    const publicKey = await getSubtle().importKey(
      "raw",
      toStrictArrayBuffer(publicKeyBytes),
      keyImportAlgorithmForAlg(alg),
      false,
      ["verify"],
    );
    return getSubtle().verify(
      keySignVerifyAlgorithmForAlg(alg),
      publicKey,
      toStrictArrayBuffer(signatureBytes),
      toStrictArrayBuffer(challengeBytes),
    );
  } catch {
    return false;
  }
}

async function normalizePortableState(args: {
  portableState: { schema?: string; snapshot: unknown } | null | undefined;
  privateKey: CryptoKey;
  alg: ReceizIdentityKeyAlgorithm;
  exportedAt?: string | undefined;
  stableArtifactId: string;
}): Promise<ReceizPortableState | null> {
  if (!args.portableState) return null;
  const schema = asTrimmedString(args.portableState.schema) || RECEIZ_ACCOUNT_STATE_SCHEMA;
  const exportedAt = asTrimmedString(args.exportedAt) || new Date().toISOString();
  const segmented = await segmentReceizPortableStateSnapshot({
    snapshot: args.portableState.snapshot,
    stableArtifactId: args.stableArtifactId,
    sign: async (bytes) => receizBase64UrlEncode(new Uint8Array(
      await getSubtle().sign(keySignVerifyAlgorithmForAlg(args.alg), args.privateKey, toStrictArrayBuffer(bytes)),
    )),
  });
  const wireSnapshot = segmentedReceizPortableStateRef(segmented);
  const exactSnapshot = materializeReceizPortableStateRef(wireSnapshot);
  const canonical = jcsCanonicalize({
    schema,
    exportedAt,
    snapshot: wireSnapshot,
  });
  const canonicalBytes = utf8(canonical);
  const digest = new Uint8Array(await getSubtle().digest("SHA-256", toStrictArrayBuffer(canonicalBytes)));
  const signature = new Uint8Array(
    await getSubtle().sign(keySignVerifyAlgorithmForAlg(args.alg), args.privateKey, toStrictArrayBuffer(canonicalBytes)),
  );
  return {
    schema,
    exportedAt,
    snapshot: exactSnapshot,
    segmented,
    proof: {
      method: portableStateProofMethodForAlg(args.alg),
      digestSha256Hex: bytesToHex(digest),
      signatureB64u: receizBase64UrlEncode(signature),
      signedAt: exportedAt,
    },
  };
}

export async function appendReceizIdentityPortableState(args: {
  keyFile: ReceizKeyFile;
  snapshot: unknown;
  schema?: string | undefined;
  exportedAt?: string | undefined;
  passphrase?: string | undefined;
}): Promise<ReceizKeyFile> {
  const keyFile = ensureKeyFileShape(args.keyFile);
  const privateKey = await decryptReceizIdentityPrivateSigningKey({ keyFile, passphrase: args.passphrase });
  const portableState = await normalizePortableState({
    portableState: { schema: args.schema ?? keyFile.portableState?.schema ?? RECEIZ_ACCOUNT_STATE_SCHEMA, snapshot: args.snapshot },
    privateKey,
    alg: keyFile.alg,
    exportedAt: args.exportedAt,
    stableArtifactId: `account-state:${keyFile.keyId}`,
  });
  if (!portableState) throw new Error("receiz_portable_state_required");
  return ensureKeyFileShape({ ...keyFile, portableState });
}

export async function createReceizIdentityKeyFile(args: {
  passphrase?: string | undefined;
  owner: {
    uid: string;
    email?: string | null;
    username?: string | null;
    displayName?: string | null;
  };
  portableState?: {
    schema?: string;
    snapshot: unknown;
  } | null;
  issuedAt?: string | undefined;
  pbkdf2Iterations?: number | undefined;
  allowP256Fallback?: boolean | undefined;
}): Promise<{ keyFile: ReceizKeyFileV1; keyId: string; publicKeyRawB64u: string; alg: ReceizIdentityKeyAlgorithm }> {
  const subtle = getSubtle();
  const passphrase = normalizePassphrase(args.passphrase ?? "");
  if (passphrase && passphrase.length < RECEIZ_KEYFILE_MIN_PASSPHRASE_LENGTH) throw new Error("receiz_key_passphrase_too_short");

  let keyPair: CryptoKeyPair;
  let alg: ReceizIdentityKeyAlgorithm = "Ed25519";
  try {
    keyPair = (await subtle.generateKey(keyGenerationAlgorithmForAlg("Ed25519"), true, ["sign", "verify"])) as CryptoKeyPair;
  } catch {
    if (args.allowP256Fallback === false) throw new Error("identity_key_not_supported");
    alg = "P-256";
    keyPair = (await subtle.generateKey(keyGenerationAlgorithmForAlg(alg), true, ["sign", "verify"])) as CryptoKeyPair;
  }

  const publicKeyRaw = new Uint8Array(await subtle.exportKey("raw", keyPair.publicKey));
  const privateKeyPkcs8 = new Uint8Array(await subtle.exportKey("pkcs8", keyPair.privateKey));
  const keyId = await sha256Hex(publicKeyRaw);
  const publicKeyRawB64u = receizBase64UrlEncode(publicKeyRaw);
  const iterations = normalizedIterations(args.pbkdf2Iterations);
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const aad = keyAad(keyId);

  let privateKeyPkcs8CiphertextB64u = "";
  let privateKeyPkcs8B64u: string | null = null;
  if (passphrase) {
    const aesKey = await deriveAesGcmKey({ passphrase, salt, iterations });
    const ciphertext = new Uint8Array(
      await subtle.encrypt(
        { name: "AES-GCM", iv: toStrictArrayBuffer(iv), additionalData: toStrictArrayBuffer(utf8(aad)) },
        aesKey,
        toStrictArrayBuffer(privateKeyPkcs8),
      ),
    );
    privateKeyPkcs8CiphertextB64u = receizBase64UrlEncode(ciphertext);
  } else {
    privateKeyPkcs8B64u = receizBase64UrlEncode(privateKeyPkcs8);
  }

  const keyFile = ensureKeyFileShape({
    schema: RECEIZ_KEY_SCHEMA,
    name: RECEIZ_KEY_NAME,
    version: RECEIZ_KEYFILE_VERSION,
    issuedAt: asTrimmedString(args.issuedAt) || new Date().toISOString(),
    keyId,
    alg,
    owner: normalizeOwner(args.owner),
    crypto: {
      publicKeyRawB64u,
      privateKeyPkcs8CiphertextB64u,
      privateKeyPkcs8B64u,
      kdf: {
        name: "PBKDF2-SHA256",
        iterations,
        saltB64u: receizBase64UrlEncode(salt),
      },
      cipher: {
        name: "AES-GCM-256",
        ivB64u: receizBase64UrlEncode(iv),
        aad,
      },
    },
    attestation: null,
    portableState: await normalizePortableState({
      portableState: args.portableState,
      privateKey: keyPair.privateKey,
      alg,
      stableArtifactId: `account-state:${keyId}`,
    }),
  });

  return { keyFile, keyId, publicKeyRawB64u, alg };
}

function randomToken(size = 18): string {
  return receizBase64UrlEncode(randomBytes(size)).toLowerCase().replace(/[^a-z0-9]/g, "");
}

function normalizeReceizUsername(value: string | null | undefined, fallback: string): string {
  const normalized = (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 30);
  return normalized || fallback;
}

export async function createReceizIdIdentity(options: ReceizIdIdentityOptions = {}): Promise<ReceizDeviceIdentity> {
  const createdAt = asTrimmedString(options.createdAt) || new Date().toISOString();
  const token = randomToken(18);
  const localUid = `receiz_device_${token}`.slice(0, 64);
  const generatedUsername = `receiz_${token.slice(0, 18)}`.slice(0, 30);
  const username = normalizeReceizUsername(options.username, generatedUsername);
  const displayName = asTrimmedString(options.displayName) || "Receiz ID";
  const deviceName = asNullableTrimmedString(options.deviceName);
  const created = await createReceizIdentityKeyFile({
    passphrase: options.passphrase,
    allowP256Fallback: options.allowP256Fallback ?? true,
    pbkdf2Iterations: options.pbkdf2Iterations,
    owner: {
      uid: localUid,
      email: null,
      username,
      displayName,
    },
    portableState: {
      schema: RECEIZ_ACCOUNT_STATE_SCHEMA,
      snapshot: {
        schema: RECEIZ_DEVICE_IDENTITY_SCHEMA,
        createdAt,
        account: {
          userId: localUid,
          email: null,
          username,
          displayName,
        },
        identityKey: {
          keyId: "pending",
          authority: "receiz-device",
        },
      },
    },
    issuedAt: createdAt,
  });

  return {
    schema: RECEIZ_DEVICE_IDENTITY_SCHEMA,
    createdAt,
    updatedAt: createdAt,
    localUid,
    username,
    displayName,
    deviceName,
    keyFile: created.keyFile,
  };
}

async function decryptPrivateKeyPkcs8Bytes(args: { keyFile: ReceizKeyFile; passphrase?: string | undefined }): Promise<Uint8Array> {
  const keyFile = ensureKeyFileShape(args.keyFile);
  const privateKeyPkcs8B64u = normalizeOptionalBase64Url(keyFile.crypto.privateKeyPkcs8B64u);
  if (privateKeyPkcs8B64u) return receizBase64UrlDecode(privateKeyPkcs8B64u);

  const passphrase = normalizePassphrase(args.passphrase ?? "");
  if (!passphrase) throw new Error("receiz_key_legacy_passphrase_required");
  const privateCiphertextB64u = normalizeOptionalBase64Url(keyFile.crypto.privateKeyPkcs8CiphertextB64u);
  if (!privateCiphertextB64u) throw new Error("receiz_key_invalid");

  try {
    const key = await deriveAesGcmKey({
      passphrase,
      salt: receizBase64UrlDecode(keyFile.crypto.kdf.saltB64u),
      iterations: normalizedIterations(keyFile.crypto.kdf.iterations),
    });
    const plaintext = await getSubtle().decrypt(
      {
        name: "AES-GCM",
        iv: toStrictArrayBuffer(receizBase64UrlDecode(keyFile.crypto.cipher.ivB64u)),
        additionalData: toStrictArrayBuffer(utf8(keyFile.crypto.cipher.aad || keyAad(keyFile.keyId))),
      },
      key,
      toStrictArrayBuffer(receizBase64UrlDecode(privateCiphertextB64u)),
    );
    return new Uint8Array(plaintext);
  } catch {
    throw new Error("receiz_key_decrypt_failed");
  }
}

export async function decryptReceizIdentityPrivateSigningKey(args: { keyFile: ReceizKeyFile; passphrase?: string | undefined }): Promise<CryptoKey> {
  const keyFile = ensureKeyFileShape(args.keyFile);
  const derivedKeyId = await deriveReceizIdentityKeyIdFromPublicKeyRawB64u(keyFile.crypto.publicKeyRawB64u, keyFile.alg);
  if (derivedKeyId !== keyFile.keyId) throw new Error("receiz_key_invalid");
  try {
    return await getSubtle().importKey(
      "pkcs8",
      toStrictArrayBuffer(await decryptPrivateKeyPkcs8Bytes({ keyFile, passphrase: args.passphrase })),
      keyImportAlgorithmForAlg(keyFile.alg),
      false,
      ["sign"],
    );
  } catch {
    throw new Error("receiz_key_decrypt_failed");
  }
}

export async function signReceizIdentityLoginProof(input: ReceizIdentityLoginProofInput): Promise<ReceizIdentityLoginProof> {
  const keyFile = ensureKeyFileShape(input.keyFile);
  const challengeB64Url = normalizeBase64Url(input.challengeB64Url) ?? (input.challengeText ? receizBase64UrlEncode(utf8(input.challengeText)) : null);
  if (!challengeB64Url) throw new Error("identity_key_challenge_invalid");
  const privateKey = await decryptReceizIdentityPrivateSigningKey({ keyFile, passphrase: input.passphrase });
  const signature = new Uint8Array(
    await getSubtle().sign(keySignVerifyAlgorithmForAlg(keyFile.alg), privateKey, toStrictArrayBuffer(receizBase64UrlDecode(challengeB64Url))),
  );
  return {
    schema: RECEIZ_IDENTITY_LOGIN_PROOF_SCHEMA,
    keyId: keyFile.keyId,
    alg: keyFile.alg,
    challengeB64Url,
    signatureB64Url: receizBase64UrlEncode(signature),
  };
}

export async function verifyReceizIdentityLoginProof(args: {
  keyFile: ReceizKeyFile;
  challengeB64Url: string;
  signatureB64Url: string;
}): Promise<boolean> {
  const keyFile = ensureKeyFileShape(args.keyFile);
  return verifyReceizIdentityPublicKeyProjectionSignature({
    keyId: keyFile.keyId,
    alg: keyFile.alg,
    publicKeyRawB64u: keyFile.crypto.publicKeyRawB64u,
    challengeB64Url: args.challengeB64Url,
    signatureB64Url: args.signatureB64Url,
  });
}

export async function verifyReceizIdentityPortableStateProof(keyFileInput: ReceizKeyFile): Promise<"verified" | "missing" | "invalid"> {
  const keyFile = ensureKeyFileShape(keyFileInput);
  const envelope = keyFile.portableState;
  if (!envelope?.proof) return "missing";
  if (envelope.proof.method !== portableStateProofMethodForAlg(keyFile.alg)) return "invalid";
  const digestSha256Hex = asTrimmedString(envelope.proof.digestSha256Hex).toLowerCase();
  const signatureB64u = normalizeBase64Url(envelope.proof.signatureB64u);
  if (!HEX64_RE.test(digestSha256Hex) || !signatureB64u) return "invalid";
  const canonical = jcsCanonicalize({
    schema: asTrimmedString(envelope.schema) || "receiz.account.state.v1",
    exportedAt: asTrimmedString(envelope.exportedAt) || keyFile.issuedAt,
    snapshot: envelope.segmented ? segmentedReceizPortableStateRef(envelope.segmented) : envelope.snapshot,
  });
  const digest = bytesToHex(new Uint8Array(await getSubtle().digest("SHA-256", toStrictArrayBuffer(utf8(canonical)))));
  if (digest !== digestSha256Hex) return "invalid";
  const parentVerified = await verifyReceizIdentityLoginProof({
    keyFile,
    challengeB64Url: receizBase64UrlEncode(utf8(canonical)),
    signatureB64Url: signatureB64u,
  });
  if (!parentVerified) return "invalid";
  if (envelope.segmented) {
    for (const segment of envelope.segmented.segments) {
      const verified = await verifyReceizIdentityLoginProof({
        keyFile,
        challengeB64Url: receizBase64UrlEncode(receizPortableSegmentSignatureBytes(segment)),
        signatureB64Url: segment.signatureB64u,
      });
      if (!verified) return "invalid";
    }
  }
  return "verified";
}

function challengeNonce(options: ReceizIdContinueOptions): string {
  const supplied = normalizeBase64Url(options.nonceB64Url);
  if (supplied && receizBase64UrlDecode(supplied).byteLength >= 16) return supplied;
  return receizBase64UrlEncode(randomBytes(16));
}

function createReceizDeviceChallengeB64Url(identity: ReceizDeviceIdentity, options: ReceizIdContinueOptions): string {
  const issuedAtMs = Number.isFinite(options.nowMs) ? Math.trunc(options.nowMs ?? Date.now()) : Date.now();
  return receizBase64UrlEncode(
    utf8(
      [
        "RECEIZ_DEVICE_SESSION_V1",
        `keyId=${identity.keyFile.keyId}`,
        `localUid=${identity.localUid}`,
        `createdAt=${identity.createdAt}`,
        `issuedAtMs=${issuedAtMs}`,
        `nonce=${challengeNonce(options)}`,
      ].join("\n"),
    ),
  );
}

export async function buildReceizIdContinueRequest(
  identity: ReceizDeviceIdentity,
  options: ReceizIdContinueOptions = {},
): Promise<ReceizIdContinueRequest> {
  const keyFile = ensureKeyFileShape(identity.keyFile);
  const challengeB64Url = createReceizDeviceChallengeB64Url({ ...identity, keyFile }, options);
  const signed = await signReceizIdentityLoginProof({ keyFile, challengeB64Url, passphrase: options.passphrase });
  return {
    keyId: keyFile.keyId,
    alg: keyFile.alg,
    publicKeyRawB64u: keyFile.crypto.publicKeyRawB64u,
    localUid: identity.localUid,
    username: identity.username,
    displayName: identity.displayName,
    deviceName: identity.deviceName,
    createdAt: identity.createdAt,
    challengeB64Url,
    signatureB64Url: signed.signatureB64Url,
    ...(options.next ? { next: options.next } : {}),
  };
}

function domainPresent(snapshot: Record<string, unknown> | null, keys: string[]): boolean {
  if (!snapshot) return false;
  return keys.some((key) => snapshot[key] !== undefined && snapshot[key] !== null);
}

const PORTABLE_COMPLETENESS_V1_SCHEMA = "receiz.account.portable-completeness.v1";
const PORTABLE_COMPLETENESS_V2_SCHEMA = "receiz.account.portable-completeness.v2";
const REQUIRED_PORTABLE_DOMAINS = [
  "profile",
  "showcase",
  "actionLedger",
  "calendar",
  "contacts",
  "wallet",
  "market",
  "sports",
  "signalVault",
  "media",
  "preferences",
  "proofHistory",
] as const;
const REQUIRED_PORTABLE_V1_DOMAINS = REQUIRED_PORTABLE_DOMAINS
  .filter((domain) => domain !== "market");

function carriedPortableCompleteness(snapshot: Record<string, unknown> | null): boolean {
  const completeness = asRecord(snapshot?.portableCompleteness);
  const domains = asRecord(completeness?.domains);
  const carriedHead = asRecord(completeness?.accountStateHead);
  const actualHead = asRecord(snapshot?.accountStateHead);
  const requiredDomains = completeness?.schema === PORTABLE_COMPLETENESS_V1_SCHEMA
    ? REQUIRED_PORTABLE_V1_DOMAINS
    : completeness?.schema === PORTABLE_COMPLETENESS_V2_SCHEMA
      ? REQUIRED_PORTABLE_DOMAINS
      : null;
  const headPulse = asTrimmedString(actualHead?.kaiPulse);
  const headUpulse = asTrimmedString(actualHead?.kaiUpulse);
  const exactV2Head = completeness?.schema !== PORTABLE_COMPLETENESS_V2_SCHEMA || Boolean(
    /^(0|[1-9][0-9]*)$/u.test(headPulse) &&
    /^(0|[1-9][0-9]*)$/u.test(headUpulse) &&
    BigInt(headUpulse) / 1_000_000n === BigInt(headPulse),
  );
  return Boolean(
    requiredDomains &&
    completeness?.completeAtSealedHead === true &&
    domains &&
    carriedHead &&
    actualHead &&
    asTrimmedString(carriedHead.kaiPulse) === asTrimmedString(actualHead.kaiPulse) &&
    asTrimmedString(carriedHead.kaiUpulse) === asTrimmedString(actualHead.kaiUpulse) &&
    exactV2Head &&
    requiredDomains.every((domain) => domains[domain] === true),
  );
}

export async function projectReceizIdentityAccount(keyFileInput: ReceizKeyFile): Promise<ReceizIdentityAccountProjection> {
  const keyFile = ensureKeyFileShape(keyFileInput);
  const portableStateStatus = await verifyReceizIdentityPortableStateProof(keyFile);
  const portableStateVerified = portableStateStatus === "verified";
  const snapshot = portableStateVerified ? keyFile.portableState?.snapshot ?? null : null;
  const snapshotRecord = asRecord(snapshot);
  const completeAtSealedHead = Boolean(
    portableStateVerified &&
    keyFile.portableState?.schema === RECEIZ_ACCOUNT_STATE_SCHEMA &&
    carriedPortableCompleteness(snapshotRecord),
  );
  return {
    schema: RECEIZ_IDENTITY_ACCOUNT_PROJECTION_SCHEMA,
    keyId: keyFile.keyId,
    alg: keyFile.alg,
    owner: keyFile.owner,
    accountStateSchema: keyFile.portableState?.schema ?? null,
    portableStateVerified,
    portableStateStatus,
    authority: portableStateVerified
      ? "verified-identity-portable-state"
      : portableStateStatus === "missing"
        ? "identity-only"
        : "rejected-portable-state",
    completeAtSealedHead,
    networkRequiredForProjection: false,
    continuity: RECEIZ_IDENTITY_LOCAL_CONTINUITY_AUTHORITY,
    verifiedState: snapshot,
    snapshot,
    domains: {
      profile: domainPresent(snapshotRecord, ["profile", "account", "profiles"]),
      showcase: domainPresent(snapshotRecord, ["profileView", "originalsManifest", "originals", "showcase"]),
      actionLedger: domainPresent(snapshotRecord, ["ledger", "actionLedger", "actionLedgerEntries", "ledgerActions"]),
      calendar: domainPresent(snapshotRecord, ["calendar", "calendarEvents", "calendarRecurrences"]),
      contacts: domainPresent(snapshotRecord, ["contacts", "contactsProjection"]),
      wallet: domainPresent(snapshotRecord, ["wallet", "walletLedgerEntries", "walletNotes", "walletChatTransfers"]),
      market: domainPresent(snapshotRecord, ["market"]),
      sports: domainPresent(snapshotRecord, ["sports", "sportsVaultCards", "sportsArenaCardAppends", "sportsArenaEventProofs"]),
      signalVault: domainPresent(snapshotRecord, ["signalVault"]),
      media: domainPresent(snapshotRecord, ["media", "mediaObjects", "profileView", "originalsManifest"]),
      preferences: domainPresent(snapshotRecord, ["preferences", "settings", "profilePreferences"]),
      proofHistory: domainPresent(snapshotRecord, ["ledger", "actionLedger", "proofHistory", "originalsManifest", "profileView"]),
    },
  };
}
