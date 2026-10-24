"use client";

import { accountIdentityCreationFromPortableSource } from "@/app/lib/profile/profileIdentityCreationCoordinate";
import { downloadBlob } from "@/app/lib/download";
import { readReceizAccountStateHead } from "@/app/lib/auth/receizAccountStateHead";
import { buildProfileIdentityArtworkSvgSet } from "@/app/lib/profile/identityArtwork";
import { nextLiveProofKaiUpulse } from "@/app/lib/kai/liveProofKai";
import { jcsCanonicalize } from "@/app/utils/jcs";
import { momentFromPulse } from "@/app/utils/kai_pulse";
import { insertPngTextChunks, readPngTextChunk } from "@/app/utils/pngChunks";
import {
  isSegmentedReceizPortableStateRef,
  isReceizPortableStateSegmentComposite,
  materializeReceizPortableStateRef,
  receizPortableSegmentSignatureBytes,
  segmentedReceizPortableStateRef,
  segmentReceizPortableStateSnapshot,
  type ReceizPortableStateSegmentComposite,
} from "../../packages/receiz-sdk/src/portableStateSegments";

const KEY_ID_RE = /^[0-9a-f]{64}$/;
const BASE64URL_RE = /^[A-Za-z0-9_-]+$/;
const HEX64_RE = /^[0-9a-f]{64}$/;
const RECEIZ_KEY_SCHEMA = "receiz.key.v1";
const RECEIZ_KEY_NAME = "Receiz Key";
export const RECEIZ_IDENTITY_RECORD_KEY_CHUNK_KEY = "receiz.identity_record.keyfile.v1";
const RECEIZ_IDENTITY_RECORD_META_CHUNK_KEY = "receiz.identity_record.v1";
const RECEIZ_IDENTITY_RECORD_KEY_TRAILER_PREFIX = "\n--RECEIZ-IDENTITY-RECORD-KEYFILE-V1--\n";
const RECEIZ_IDENTITY_RECORD_KEY_TRAILER_SUFFIX = "\n--END-RECEIZ-IDENTITY-RECORD-KEYFILE-V1--\n";
const RECEIZ_KEYFILE_VERSION = 1;
const RECEIZ_KEYFILE_MIN_PASSPHRASE_LENGTH = 12;
const DEFAULT_PBKDF2_ITERATIONS = 210_000;
const PNG_SIGNATURE = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);

export type ReceizIdentityKeyAlgorithm = "Ed25519" | "P-256";

type ReceizPortableStateProofMethod = "ed25519.jcs.v1" | "ecdsa-p256-sha256.jcs.v1";

export type ReceizKeyAttestation = {
  pbiDecision: string;
  pbiReceiptHash: string;
  pbiChallengeId: string;
  pbiRequestId: string | null;
  attestedAt: string;
  pbiSignedKaiMicroPulse: string | null;
};

export type ReceizKeyOwner = {
  uid: string;
  email: string | null;
  username: string | null;
  displayName: string | null;
};

export type ReceizPortableState = {
  schema: string;
  exportedAt: string;
  snapshot: unknown;
  segmented?: ReceizPortableStateSegmentComposite | null;
  proof: ReceizPortableStateProof | null;
};

export type ReceizPortableStateProof = {
  method: ReceizPortableStateProofMethod;
  digestSha256Hex: string;
  signatureB64u: string;
  signedAt: string;
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

export function normalizeIdentityKeyId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (!KEY_ID_RE.test(normalized)) return null;
  return normalized;
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
  if (!BASE64URL_RE.test(normalized)) return null;
  return normalized;
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

function asPositiveKaiMicroPulse(value: unknown): string | null {
  const normalized = asTrimmedString(value);
  return /^(0|[1-9][0-9]*)$/u.test(normalized) ? normalized : null;
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((part) => part.toString(16).padStart(2, "0"))
    .join("");
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
  const padding = "=".repeat((4 - (normalized.length % 4)) % 4);
  return fromBase64(`${normalized}${padding}`);
}

function randomBytes(size: number): Uint8Array {
  if (typeof crypto === "undefined" || !crypto.getRandomValues) {
    throw new Error("identity_key_not_supported");
  }
  const bytes = new Uint8Array(size);
  crypto.getRandomValues(bytes);
  return bytes;
}

function getSubtle(): SubtleCrypto {
  if (typeof crypto === "undefined" || !crypto.subtle) {
    throw new Error("identity_key_not_supported");
  }
  return crypto.subtle;
}

function toUtf8(input: string): Uint8Array {
  return new TextEncoder().encode(input);
}

function isPngBytes(bytes: Uint8Array): boolean {
  if (bytes.byteLength < PNG_SIGNATURE.byteLength) return false;
  for (let i = 0; i < PNG_SIGNATURE.byteLength; i += 1) {
    if (bytes[i] !== PNG_SIGNATURE[i]) return false;
  }
  return true;
}

function indexOfBytes(haystack: Uint8Array, needle: Uint8Array, start = 0): number {
  if (needle.byteLength === 0) return Math.max(0, start);
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

function pngReadUint32BE(bytes: Uint8Array, offset: number): number {
  return (
    ((bytes[offset] ?? 0) << 24) |
    ((bytes[offset + 1] ?? 0) << 16) |
    ((bytes[offset + 2] ?? 0) << 8) |
    (bytes[offset + 3] ?? 0)
  ) >>> 0;
}

function pngIendEndOffset(bytes: Uint8Array): number | null {
  if (!isPngBytes(bytes)) return null;
  let offset = PNG_SIGNATURE.byteLength;
  while (offset + 12 <= bytes.byteLength) {
    const length = pngReadUint32BE(bytes, offset);
    const typeOffset = offset + 4;
    const dataStart = offset + 8;
    const chunkEnd = dataStart + length + 4;
    if (chunkEnd > bytes.byteLength) return null;
    if (
      bytes[typeOffset] === 73 &&
      bytes[typeOffset + 1] === 69 &&
      bytes[typeOffset + 2] === 78 &&
      bytes[typeOffset + 3] === 68
    ) {
      return chunkEnd;
    }
    offset = chunkEnd;
  }
  return null;
}

export function appendReceizIdentityRecordKeyTrailer(pngBytes: Uint8Array, keyFile: ReceizKeyFile): Uint8Array {
  const iendEnd = pngIendEndOffset(pngBytes);
  if (iendEnd === null) {
    throw new Error("receiz_key_identity_record_png_required");
  }

  const serialized = serializeReceizKeyFile(keyFile);
  const encoded = base64UrlEncode(toUtf8(serialized));
  const trailer = toUtf8(`${RECEIZ_IDENTITY_RECORD_KEY_TRAILER_PREFIX}${encoded}${RECEIZ_IDENTITY_RECORD_KEY_TRAILER_SUFFIX}`);
  const pngBasis = pngBytes.slice(0, iendEnd);
  const out = new Uint8Array(pngBasis.byteLength + trailer.byteLength);
  out.set(pngBasis, 0);
  out.set(trailer, pngBasis.byteLength);
  return out;
}

/**
 * Keeps the Identity Record directly recoverable while placing the same
 * Receiz Key evidence inside the native Record → Seal proof boundary. The PNG
 * text chunk is readable immediately and is also part of the signed basis.
 * Legacy post-IEND trailers remain readable but are never added to new seals.
 */
export async function sealReceizIdentityRecordPayload(args: {
  pngBytes: Uint8Array;
  keyFile: ReceizKeyFile;
  ownerReceizId?: string;
  seal: (input: Readonly<{
    payloadBytes: Uint8Array;
    nativeRecordSeal: Readonly<{
      ownerReceizId: string;
      recordId: string;
    }>;
  }>) => Promise<Uint8Array>;
}): Promise<Uint8Array> {
  const ownerReceizId = args.ownerReceizId?.trim().normalize("NFC").toLowerCase()
    || `${args.keyFile.owner.username?.trim().replace(/^@+/, "").toLowerCase() ?? ""}.receiz.id`;
  if (!/^[a-z0-9](?:[a-z0-9._-]{0,62}[a-z0-9])?\.receiz\.id$/.test(ownerReceizId)) {
    throw new Error("receiz_key_identity_record_owner_required");
  }
  const sealedPayload = insertPngTextChunks(args.pngBytes, [{
    keyword: RECEIZ_IDENTITY_RECORD_KEY_CHUNK_KEY,
    text: serializeReceizKeyFile(args.keyFile),
  }]);
  const sealedArtifact = await args.seal({
    payloadBytes: sealedPayload,
    nativeRecordSeal: {
      ownerReceizId,
      recordId: `identity-record:${args.keyFile.keyId}`,
    },
  });
  return sealedArtifact;
}

export function readReceizIdentityRecordKeyTrailer(pngBytes: Uint8Array): string | null {
  const iendEnd = pngIendEndOffset(pngBytes);
  if (iendEnd === null || iendEnd >= pngBytes.byteLength) return null;

  const trailerBytes = pngBytes.slice(iendEnd);
  const prefixBytes = toUtf8(RECEIZ_IDENTITY_RECORD_KEY_TRAILER_PREFIX);
  const suffixBytes = toUtf8(RECEIZ_IDENTITY_RECORD_KEY_TRAILER_SUFFIX);
  const prefixStart = indexOfBytes(trailerBytes, prefixBytes);
  if (prefixStart < 0) return null;
  const encodedStart = prefixStart + prefixBytes.byteLength;
  const suffixStart = indexOfBytes(trailerBytes, suffixBytes, encodedStart);
  if (suffixStart < 0) return null;

  const encoded = new TextDecoder().decode(trailerBytes.slice(encodedStart, suffixStart)).trim();
  if (!encoded || !BASE64URL_RE.test(encoded)) return null;
  try {
    return new TextDecoder().decode(base64UrlDecode(encoded));
  } catch {
    return null;
  }
}

function safeIso(value: unknown): string | null {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

function toStrictArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const out = new Uint8Array(bytes.byteLength);
  out.set(bytes);
  return out.buffer;
}

function normalizePassphrase(passphrase: string): string {
  return passphrase.normalize("NFKC");
}

function keyAad(keyId: string): string {
  return `RECEIZ_KEY_V1|${keyId}`;
}

export function normalizeReceizIdentityKeyAlgorithm(value: unknown): ReceizIdentityKeyAlgorithm | null {
  const normalized = asTrimmedString(value);
  if (normalized === "Ed25519" || normalized === "P-256") return normalized;
  return null;
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

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await getSubtle().digest("SHA-256", toStrictArrayBuffer(bytes));
  const view = new Uint8Array(digest);
  return Array.from(view)
    .map((part) => part.toString(16).padStart(2, "0"))
    .join("");
}

async function deriveAesGcmKey(args: {
  passphrase: string;
  salt: Uint8Array;
  iterations: number;
}): Promise<CryptoKey> {
  const subtle = getSubtle();
  const passphraseBytes = toUtf8(args.passphrase);
  const keyMaterial = await subtle.importKey("raw", toStrictArrayBuffer(passphraseBytes), { name: "PBKDF2" }, false, ["deriveKey"]);
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

function normalizeOwner(owner: {
  uid: string;
  email?: string | null;
  username?: string | null;
  displayName?: string | null;
}): ReceizKeyOwner {
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

async function normalizePortableState(args: {
  portableState: { schema?: string; exportedAt?: string; snapshot: unknown } | null | undefined;
  privateKey: CryptoKey;
  alg: ReceizIdentityKeyAlgorithm;
  stableArtifactId: string;
}): Promise<ReceizPortableState | null> {
  const input = args.portableState;
  if (!input) return null;
  const schema = asTrimmedString(input.schema) || "receiz.account.state.v1";
  const exportedAt = asTrimmedString(input.exportedAt) || new Date().toISOString();
  const segmented = await segmentReceizPortableStateSnapshot({
    snapshot: input.snapshot,
    stableArtifactId: args.stableArtifactId,
    sign: async (bytes) => base64UrlEncode(new Uint8Array(
      await getSubtle().sign(keySignVerifyAlgorithmForAlg(args.alg), args.privateKey, toStrictArrayBuffer(bytes)),
    )),
  });
  const exactSnapshot = materializeReceizPortableStateRef(segmentedReceizPortableStateRef(segmented));
  const canonical = jcsCanonicalize({
    schema,
    exportedAt,
    snapshot: segmentedReceizPortableStateRef(segmented),
  });

  const canonicalBytes = toUtf8(canonical);
  const subtle = getSubtle();

  let proof: ReceizPortableStateProof | null = null;
  try {
    const digest = new Uint8Array(await subtle.digest("SHA-256", toStrictArrayBuffer(canonicalBytes)));
    const signature = new Uint8Array(
      await subtle.sign(keySignVerifyAlgorithmForAlg(args.alg), args.privateKey, toStrictArrayBuffer(canonicalBytes)),
    );
    proof = {
      method: portableStateProofMethodForAlg(args.alg),
      digestSha256Hex: bytesToHex(digest),
      signatureB64u: base64UrlEncode(signature),
      signedAt: exportedAt,
    };
  } catch {
    proof = null;
  }

  return {
    schema,
    exportedAt,
    snapshot: exactSnapshot,
    segmented,
    proof,
  };
}

function ensureKeyFileShape(file: ReceizKeyFileV1): ReceizKeyFileV1 {
  const keyId = normalizeIdentityKeyId(file.keyId);
  const alg = normalizeReceizIdentityKeyAlgorithm(file.alg);
  if (!keyId) throw new Error("receiz_key_invalid");
  const publicKeyRawB64u = normalizeBase64Url(file.crypto.publicKeyRawB64u);
  const privateCiphertextB64u = normalizeOptionalBase64Url(file.crypto.privateKeyPkcs8CiphertextB64u);
  const privateKeyPkcs8B64u = normalizeOptionalBase64Url(file.crypto.privateKeyPkcs8B64u);
  const saltB64u = normalizeBase64Url(file.crypto.kdf.saltB64u);
  const ivB64u = normalizeBase64Url(file.crypto.cipher.ivB64u);

  if (!alg || !publicKeyRawB64u || (!privateCiphertextB64u && !privateKeyPkcs8B64u) || !saltB64u || !ivB64u) {
    throw new Error("receiz_key_invalid");
  }

  if (!validatePublicKeyRawBytesForAlg(base64UrlDecode(publicKeyRawB64u), alg)) {
    throw new Error("receiz_key_invalid");
  }

  if (file.crypto.cipher.name !== "AES-GCM-256" || file.crypto.kdf.name !== "PBKDF2-SHA256") {
    throw new Error("receiz_key_invalid");
  }

  if (!Number.isFinite(file.crypto.kdf.iterations) || file.crypto.kdf.iterations < 1_000) {
    throw new Error("receiz_key_invalid");
  }

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

export async function deriveIdentityKeyIdFromPublicKeyRawB64u(
  publicKeyRawB64u: string,
  alg: ReceizIdentityKeyAlgorithm = "Ed25519",
): Promise<string> {
  const normalized = normalizeBase64Url(publicKeyRawB64u);
  if (!normalized) throw new Error("invalid_public_key");
  const bytes = base64UrlDecode(normalized);
  if (!validatePublicKeyRawBytesForAlg(bytes, alg)) throw new Error("invalid_public_key_length");
  return sha256Hex(bytes);
}

export async function createEncryptedReceizKeyFile(args: {
  passphrase?: string;
  owner: {
    uid: string;
    email?: string | null;
    username?: string | null;
    displayName?: string | null;
  };
  portableState?: {
    schema?: string;
    exportedAt?: string;
    snapshot: unknown;
  } | null;
  issuedAt?: string;
  pbkdf2Iterations?: number;
  allowP256Fallback?: boolean;
}): Promise<{
  keyFile: ReceizKeyFileV1;
  keyId: string;
  publicKeyRawB64u: string;
  alg: ReceizIdentityKeyAlgorithm;
}> {
  const subtle = getSubtle();
  const passphrase = normalizePassphrase(args.passphrase ?? "");
  const usePassphraseEncryption = passphrase.length > 0;
  if (usePassphraseEncryption && passphrase.length < RECEIZ_KEYFILE_MIN_PASSPHRASE_LENGTH) {
    throw new Error("receiz_key_passphrase_too_short");
  }

  let keyPair: CryptoKeyPair;
  let alg: ReceizIdentityKeyAlgorithm = "Ed25519";
  try {
    keyPair = (await subtle.generateKey(keyGenerationAlgorithmForAlg("Ed25519"), true, ["sign", "verify"])) as CryptoKeyPair;
  } catch {
    if (!args.allowP256Fallback) {
      throw new Error("identity_key_not_supported");
    }
    try {
      alg = "P-256";
      keyPair = (await subtle.generateKey(keyGenerationAlgorithmForAlg(alg), true, ["sign", "verify"])) as CryptoKeyPair;
    } catch {
      throw new Error("identity_key_not_supported");
    }
  }

  const publicKeyRaw = new Uint8Array(await subtle.exportKey("raw", keyPair.publicKey));
  const privateKeyPkcs8 = new Uint8Array(await subtle.exportKey("pkcs8", keyPair.privateKey));
  const keyId = await sha256Hex(publicKeyRaw);
  const publicKeyRawB64u = base64UrlEncode(publicKeyRaw);

  const iterations = normalizedIterations(args.pbkdf2Iterations);
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const aad = keyAad(keyId);

  let privateKeyPkcs8CiphertextB64u = "";
  let privateKeyPkcs8B64u: string | null = null;

  if (usePassphraseEncryption) {
    const aesKey = await deriveAesGcmKey({ passphrase, salt, iterations });
    const ciphertext = new Uint8Array(
      await subtle.encrypt(
        {
          name: "AES-GCM",
          iv: toStrictArrayBuffer(iv),
          additionalData: toStrictArrayBuffer(toUtf8(aad)),
        },
        aesKey,
        toStrictArrayBuffer(privateKeyPkcs8),
      ),
    );
    privateKeyPkcs8CiphertextB64u = base64UrlEncode(ciphertext);
  } else {
    privateKeyPkcs8B64u = base64UrlEncode(privateKeyPkcs8);
  }

  const portableState = await normalizePortableState({
    portableState: args.portableState,
    privateKey: keyPair.privateKey,
    alg,
    stableArtifactId: `account-state:${keyId}`,
  });

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
        saltB64u: base64UrlEncode(salt),
      },
      cipher: {
        name: "AES-GCM-256",
        ivB64u: base64UrlEncode(iv),
        aad,
      },
    },
    attestation: null,
    portableState,
  });

  return {
    keyFile,
    keyId,
    publicKeyRawB64u,
    alg,
  };
}

export async function withReceizKeyPortableState(args: {
  keyFile: ReceizKeyFile;
  sourcePassphrase?: string;
  exportPassphrase?: string;
  owner?: {
    uid: string;
    email?: string | null;
    username?: string | null;
    displayName?: string | null;
  };
  portableState: {
    schema?: string;
    exportedAt?: string;
    snapshot: unknown;
  };
}): Promise<ReceizKeyFileV1> {
  const source = ensureKeyFileShape(args.keyFile);
  const privateKeyPkcs8 = await decryptPrivateKeyPkcs8Bytes({
    keyFile: source,
    passphrase: args.sourcePassphrase,
  });
  const privateKey = await getSubtle().importKey(
    "pkcs8",
    toStrictArrayBuffer(privateKeyPkcs8),
    keyImportAlgorithmForAlg(source.alg),
    false,
    ["sign"],
  );
  const portableState = await normalizePortableState({
    portableState: args.portableState,
    privateKey,
    alg: source.alg,
    stableArtifactId: `account-state:${source.keyId}`,
  });

  const exportPassphrase = normalizePassphrase(args.exportPassphrase ?? "");
  if (exportPassphrase && exportPassphrase.length < RECEIZ_KEYFILE_MIN_PASSPHRASE_LENGTH) {
    throw new Error("receiz_key_passphrase_too_short");
  }

  const iterations = normalizedIterations(source.crypto.kdf.iterations);
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const aad = keyAad(source.keyId);
  let privateKeyPkcs8CiphertextB64u = "";
  let privateKeyPkcs8B64u: string | null = null;
  if (exportPassphrase) {
    const aesKey = await deriveAesGcmKey({
      passphrase: exportPassphrase,
      salt,
      iterations,
    });
    const ciphertext = new Uint8Array(
      await getSubtle().encrypt(
        {
          name: "AES-GCM",
          iv: toStrictArrayBuffer(iv),
          additionalData: toStrictArrayBuffer(toUtf8(aad)),
        },
        aesKey,
        toStrictArrayBuffer(privateKeyPkcs8),
      ),
    );
    privateKeyPkcs8CiphertextB64u = base64UrlEncode(ciphertext);
  } else {
    privateKeyPkcs8B64u = base64UrlEncode(privateKeyPkcs8);
  }

  return ensureKeyFileShape({
    ...source,
    owner: args.owner ? normalizeOwner(args.owner) : source.owner,
    crypto: {
      ...source.crypto,
      privateKeyPkcs8CiphertextB64u,
      privateKeyPkcs8B64u,
      kdf: {
        name: "PBKDF2-SHA256",
        iterations,
        saltB64u: base64UrlEncode(salt),
      },
      cipher: {
        name: "AES-GCM-256",
        ivB64u: base64UrlEncode(iv),
        aad,
      },
    },
    portableState,
  });
}

export function withReceizKeyAttestation(
  keyFile: ReceizKeyFileV1,
  attestation: ReceizKeyAttestation,
): ReceizKeyFileV1 {
  const pbiDecision = asTrimmedString(attestation.pbiDecision);
  const pbiReceiptHash = asTrimmedString(attestation.pbiReceiptHash).toLowerCase();
  const pbiChallengeId = asTrimmedString(attestation.pbiChallengeId);
  const pbiRequestId = asNullableTrimmedString(attestation.pbiRequestId);
  const attestedAt = asTrimmedString(attestation.attestedAt) || new Date().toISOString();
  const pbiSignedKaiMicroPulse = asPositiveKaiMicroPulse(attestation.pbiSignedKaiMicroPulse);

  if (!pbiDecision || !pbiChallengeId || !KEY_ID_RE.test(pbiReceiptHash)
    || (attestation.pbiSignedKaiMicroPulse != null && attestation.pbiSignedKaiMicroPulse !== "" && !pbiSignedKaiMicroPulse)) {
    throw new Error("receiz_key_attestation_invalid");
  }

  // A legacy receipt carries no signing coordinate. It cannot replace an
  // already-held attestation that carries the stronger exact PBI coordinate.
  if (!pbiSignedKaiMicroPulse && keyFile.attestation?.pbiSignedKaiMicroPulse) {
    return ensureKeyFileShape(keyFile);
  }

  return ensureKeyFileShape({
    ...keyFile,
    attestation: {
      pbiDecision,
      pbiReceiptHash,
      pbiChallengeId,
      pbiRequestId,
      attestedAt,
      pbiSignedKaiMicroPulse,
    },
  });
}

export function serializeReceizKeyFile(keyFile: ReceizKeyFile): string {
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

function parseReceizKeyFileObject(value: unknown): ReceizKeyFileV1 {
  const record = asRecord(value);
  if (!record) throw new Error("receiz_key_invalid");

  const schema = asTrimmedString(record.schema);
  const name = asTrimmedString(record.name);
  const version = typeof record.version === "number" ? Math.trunc(record.version) : Number.NaN;
  const keyId = normalizeIdentityKeyId(record.keyId);
  const alg = normalizeReceizIdentityKeyAlgorithm(record.alg);
  const issuedAt = asTrimmedString(record.issuedAt);

  if (schema !== RECEIZ_KEY_SCHEMA || name !== RECEIZ_KEY_NAME || version !== 1 || !keyId || !alg || !issuedAt) {
    throw new Error("receiz_key_invalid");
  }

  const ownerRaw = asRecord(record.owner);
  const cryptoRaw = asRecord(record.crypto);
  const kdfRaw = cryptoRaw ? asRecord(cryptoRaw.kdf) : null;
  const cipherRaw = cryptoRaw ? asRecord(cryptoRaw.cipher) : null;

  if (!ownerRaw || !cryptoRaw || !kdfRaw || !cipherRaw) {
    throw new Error("receiz_key_invalid");
  }

  const owner = normalizeOwner({
    uid: asTrimmedString(ownerRaw.uid),
    email: asNullableTrimmedString(ownerRaw.email),
    username: asNullableTrimmedString(ownerRaw.username),
    displayName: asNullableTrimmedString(ownerRaw.displayName),
  });

  const portableStateRaw = record.portableState;
  const portableStateRecord = asRecord(portableStateRaw);
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

  const attestationRaw = record.attestation;
  const attestationRecord = asRecord(attestationRaw);
  const attestation = attestationRecord
    ? {
        pbiDecision: asTrimmedString(attestationRecord.pbiDecision),
        pbiReceiptHash: asTrimmedString(attestationRecord.pbiReceiptHash).toLowerCase(),
        pbiChallengeId: asTrimmedString(attestationRecord.pbiChallengeId),
        pbiRequestId: asNullableTrimmedString(attestationRecord.pbiRequestId),
        attestedAt: asTrimmedString(attestationRecord.attestedAt),
        pbiSignedKaiMicroPulse: asPositiveKaiMicroPulse(attestationRecord.pbiSignedKaiMicroPulse),
      }
    : null;

  return ensureKeyFileShape({
    schema: RECEIZ_KEY_SCHEMA,
    name: RECEIZ_KEY_NAME,
    version: RECEIZ_KEYFILE_VERSION,
    issuedAt,
    keyId,
    alg,
    owner,
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

export function parseReceizKeyFileText(text: string): ReceizKeyFileV1 {
  try {
    const parsed = JSON.parse(text) as unknown;
    return parseReceizKeyFileObject(parsed);
  } catch (error) {
    if (error instanceof Error && error.message === "receiz_key_invalid") {
      throw error;
    }
    throw new Error("receiz_key_invalid");
  }
}

export async function readReceizKeyFileFromBlob(file: Blob): Promise<ReceizKeyFileV1> {
  if (!file) throw new Error("receiz_key_file_required");
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (isPngBytes(bytes)) {
    const embedded = readReceizIdentityRecordKeyTrailer(bytes) ?? readPngTextChunk(bytes, RECEIZ_IDENTITY_RECORD_KEY_CHUNK_KEY);
    if (!embedded) throw new Error("receiz_key_identity_record_missing");
    return parseReceizKeyFileText(embedded);
  }
  return parseReceizKeyFileText(new TextDecoder().decode(bytes));
}

async function decryptPrivateKeyPkcs8Bytes(args: {
  keyFile: ReceizKeyFileV1;
  passphrase?: string;
}): Promise<Uint8Array> {
  const subtle = getSubtle();
  const keyFile = ensureKeyFileShape(args.keyFile);
  const privateKeyPkcs8B64u = normalizeOptionalBase64Url(keyFile.crypto.privateKeyPkcs8B64u);
  if (privateKeyPkcs8B64u) {
    return base64UrlDecode(privateKeyPkcs8B64u);
  }

  const passphrase = normalizePassphrase(args.passphrase ?? "");
  if (!passphrase) throw new Error("receiz_key_legacy_passphrase_required");

  const salt = base64UrlDecode(keyFile.crypto.kdf.saltB64u);
  const iv = base64UrlDecode(keyFile.crypto.cipher.ivB64u);
  const privateCiphertextB64u = normalizeOptionalBase64Url(keyFile.crypto.privateKeyPkcs8CiphertextB64u);
  if (!privateCiphertextB64u) throw new Error("receiz_key_invalid");
  const ciphertext = base64UrlDecode(privateCiphertextB64u);

  try {
    const key = await deriveAesGcmKey({
      passphrase,
      salt,
      iterations: normalizedIterations(keyFile.crypto.kdf.iterations),
    });
    const pt = await subtle.decrypt(
      {
        name: "AES-GCM",
        iv: toStrictArrayBuffer(iv),
        additionalData: toStrictArrayBuffer(toUtf8(keyFile.crypto.cipher.aad || keyAad(keyFile.keyId))),
      },
      key,
      toStrictArrayBuffer(ciphertext),
    );
    return new Uint8Array(pt);
  } catch {
    throw new Error("receiz_key_decrypt_failed");
  }
}

export async function decryptReceizKeyPrivateSigningKey(args: {
  keyFile: ReceizKeyFile;
  passphrase?: string;
}): Promise<CryptoKey> {
  const subtle = getSubtle();
  const keyFile = ensureKeyFileShape(args.keyFile);
  const pkcs8 = await decryptPrivateKeyPkcs8Bytes({ keyFile, passphrase: args.passphrase });

  const derivedKeyId = await deriveIdentityKeyIdFromPublicKeyRawB64u(keyFile.crypto.publicKeyRawB64u, keyFile.alg);
  if (derivedKeyId !== keyFile.keyId) {
    throw new Error("receiz_key_invalid");
  }

  try {
    return await subtle.importKey("pkcs8", toStrictArrayBuffer(pkcs8), keyImportAlgorithmForAlg(keyFile.alg), false, ["sign"]);
  } catch {
    throw new Error("receiz_key_decrypt_failed");
  }
}

export async function signIdentityKeyChallenge(args: {
  keyFile: ReceizKeyFile;
  passphrase?: string;
  challengeB64Url: string;
}): Promise<{ keyId: string; signatureB64Url: string }> {
  const subtle = getSubtle();
  const challengeB64Url = normalizeBase64Url(args.challengeB64Url);
  if (!challengeB64Url) throw new Error("identity_key_challenge_invalid");

  const keyFile = ensureKeyFileShape(args.keyFile);
  const privateKey = await decryptReceizKeyPrivateSigningKey({
    keyFile,
    passphrase: args.passphrase,
  });

  const challengeBytes = base64UrlDecode(challengeB64Url);
  const signature = new Uint8Array(
    await subtle.sign(keySignVerifyAlgorithmForAlg(keyFile.alg), privateKey, toStrictArrayBuffer(challengeBytes)),
  );
  return {
    keyId: keyFile.keyId,
    signatureB64Url: base64UrlEncode(signature),
  };
}

export async function verifyReceizKeyChallengeSignature(args: {
  keyFile: ReceizKeyFile;
  challengeB64Url: string;
  signatureB64Url: string;
}): Promise<boolean> {
  const subtle = getSubtle();
  const keyFile = ensureKeyFileShape(args.keyFile);
  const challengeB64Url = normalizeBase64Url(args.challengeB64Url);
  const signatureB64Url = normalizeBase64Url(args.signatureB64Url);
  if (!challengeB64Url || !signatureB64Url) return false;

  const derivedKeyId = await deriveIdentityKeyIdFromPublicKeyRawB64u(keyFile.crypto.publicKeyRawB64u, keyFile.alg);
  if (derivedKeyId !== keyFile.keyId) return false;

  try {
    const publicKey = await subtle.importKey(
      "raw",
      toStrictArrayBuffer(base64UrlDecode(keyFile.crypto.publicKeyRawB64u)),
      keyImportAlgorithmForAlg(keyFile.alg),
      false,
      ["verify"],
    );
    return await subtle.verify(
      keySignVerifyAlgorithmForAlg(keyFile.alg),
      publicKey,
      toStrictArrayBuffer(base64UrlDecode(signatureB64Url)),
      toStrictArrayBuffer(base64UrlDecode(challengeB64Url)),
    );
  } catch {
    return false;
  }
}

export async function verifyReceizKeyPortableStateProof(
  keyFileInput: ReceizKeyFile,
): Promise<"verified" | "missing" | "invalid"> {
  const keyFile = ensureKeyFileShape(keyFileInput);
  const envelope = keyFile.portableState;
  if (!envelope) return "missing";

  const proof = envelope.proof;
  if (!proof) return "missing";
  if (proof.method !== portableStateProofMethodForAlg(keyFile.alg)) return "invalid";

  const digestSha256Hex = asTrimmedString(proof.digestSha256Hex).toLowerCase();
  const signatureB64u = normalizeBase64Url(proof.signatureB64u);
  if (!HEX64_RE.test(digestSha256Hex) || !signatureB64u) return "invalid";

  const canonical = jcsCanonicalize({
    schema: asTrimmedString(envelope.schema) || "receiz.account.state.v1",
    exportedAt: asTrimmedString(envelope.exportedAt) || keyFile.issuedAt,
    snapshot: envelope.segmented ? segmentedReceizPortableStateRef(envelope.segmented) : envelope.snapshot,
  });
  const digest = bytesToHex(new Uint8Array(await getSubtle().digest("SHA-256", toStrictArrayBuffer(toUtf8(canonical)))));
  if (digest !== digestSha256Hex) return "invalid";

  const canonicalB64Url = base64UrlEncode(toUtf8(canonical));
  const verified = await verifyReceizKeyChallengeSignature({
    keyFile,
    challengeB64Url: canonicalB64Url,
    signatureB64Url: signatureB64u,
  });
  if (!verified) return "invalid";
  if (envelope.segmented) {
    for (const segment of envelope.segmented.segments) {
      const childVerified = await verifyReceizKeyChallengeSignature({
        keyFile,
        challengeB64Url: base64UrlEncode(receizPortableSegmentSignatureBytes(segment)),
        signatureB64Url: segment.signatureB64u,
      });
      if (!childVerified) return "invalid";
    }
  }
  return "verified";
}

export function buildReceizKeyFilename(username: string | null | undefined): string {
  const normalizedUser = (username ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  const base = normalizedUser || "account";
  return `identity_record_${base}.png`;
}

export function buildReceizKeyJsonFilename(username: string | null | undefined): string {
  const normalizedUser = (username ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  const base = normalizedUser || "account";
  return `receiz_key_${base}.receizkey`;
}

function keyFileArtworkAccountId(keyFile: ReceizKeyFile): string {
  const account = asRecord(asRecord(keyFile.portableState?.snapshot)?.account);
  return asTrimmedString(account?.userId) || keyFile.owner.uid;
}

function keyFileIdentityCreatedAt(keyFile: ReceizKeyFile): string {
  const creation = accountIdentityCreationFromPortableSource({
    ownerUserId: keyFile.owner.uid, profileUserId: keyFileArtworkAccountId(keyFile), snapshot: keyFile.portableState?.snapshot,
  });
  if (!creation) throw new Error("identity_key_creation_coordinate_missing");
  return creation.createdAt;
}

function keyFileIdentityCreationKaiMicroPulse(keyFile: ReceizKeyFile): string | null {
  return accountIdentityCreationFromPortableSource({
    ownerUserId: keyFile.owner.uid, profileUserId: keyFileArtworkAccountId(keyFile), snapshot: keyFile.portableState?.snapshot,
  })?.creationKaiMicroPulse ?? null;
}

export type ReceizIdentityRecordKaiStamp = {
  schema: "receiz.identity_record.kai_stamp.v1";
  creationKaiPulse: string;
  accountHeadKaiPulse: string | null;
  accountHeadKaiUpulse: string | null;
  savedKaiPulse: string;
  savedAt: string;
};

export function buildReceizIdentityRecordKaiStamp(
  keyFileInput: ReceizKeyFile,
  savedAtInput: string,
  savedKaiUpulseInput?: string,
): ReceizIdentityRecordKaiStamp {
  const keyFile = ensureKeyFileShape(keyFileInput);
  const creationKaiMicroPulse = keyFileIdentityCreationKaiMicroPulse(keyFile);
  if (!creationKaiMicroPulse) throw new Error("identity_key_creation_kai_coordinate_missing");
  const savedAt = safeIso(savedAtInput) ?? new Date().toISOString();
  const accountHead = readReceizAccountStateHead(keyFile.portableState?.snapshot);
  const savedKaiUpulse = /^\d+$/u.test(savedKaiUpulseInput?.trim() ?? "")
    ? BigInt(savedKaiUpulseInput!.trim())
    : BigInt(nextLiveProofKaiUpulse(accountHead.kaiUpulse ?? undefined));
  if (savedKaiUpulse <= 0n) throw new Error("identity_record_saved_kai_coordinate_invalid");
  return {
    schema: "receiz.identity_record.kai_stamp.v1",
    creationKaiPulse: String(momentFromPulse(BigInt(creationKaiMicroPulse) / 1_000_000n).pulse),
    accountHeadKaiPulse: accountHead.kaiPulse,
    accountHeadKaiUpulse: accountHead.kaiUpulse,
    savedKaiPulse: String(savedKaiUpulse / 1_000_000n),
    savedAt,
  };
}

function loadIdentityRecordImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("identity_record_png_rasterize_failed"));
    image.src = src;
  });
}

function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
        return;
      }
      reject(new Error("identity_record_png_encode_failed"));
    }, "image/png");
  });
}

function drawIdentityRecordKaiStamp(
  context: CanvasRenderingContext2D,
  stamp: ReceizIdentityRecordKaiStamp,
): void {
  const headPulse = stamp.accountHeadKaiPulse ?? stamp.creationKaiPulse;
  const x = 1190;
  const y = 34;
  const width = 340;
  const height = 76;
  const radius = 18;
  context.save();
  context.fillStyle = "rgba(4, 18, 34, 0.88)";
  context.strokeStyle = "rgba(111, 231, 188, 0.72)";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(x + radius, y);
  context.lineTo(x + width - radius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + radius);
  context.lineTo(x + width, y + height - radius);
  context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  context.lineTo(x + radius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - radius);
  context.lineTo(x, y + radius);
  context.quadraticCurveTo(x, y, x + radius, y);
  context.closePath();
  context.fill();
  context.stroke();
  context.fillStyle = "rgba(187, 255, 232, 0.96)";
  context.font = "700 17px ui-monospace, SFMono-Regular, Menlo, monospace";
  context.fillText(`HEAD KAI ${headPulse}`, 1214, 66, 292);
  context.fillStyle = "rgba(203, 213, 225, 0.92)";
  context.font = "600 14px ui-monospace, SFMono-Regular, Menlo, monospace";
  context.fillText(`SAVED KAI ${stamp.savedKaiPulse}`, 1214, 92, 292);
  context.restore();
}

async function rasterizeIdentityRecordSvg(
  svgText: string,
  stamp: ReceizIdentityRecordKaiStamp,
  artwork: "record" | "seal" = "record",
): Promise<Uint8Array> {
  if (typeof document === "undefined" || typeof Image === "undefined") {
    throw new Error("identity_record_png_not_supported");
  }

  const svgUrl = URL.createObjectURL(new Blob([svgText], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const image = await loadIdentityRecordImage(svgUrl);
    const canvas = document.createElement("canvas");
    canvas.width = artwork === "seal" ? 600 : 1600;
    canvas.height = 600;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("identity_record_png_canvas_unavailable");
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    if (artwork === "record") drawIdentityRecordKaiStamp(context, stamp);
    return new Uint8Array(await (await canvasToPngBlob(canvas)).arrayBuffer());
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}

/** Artwork projects the signed account carried by the original Receiz ID.
 * It does not issue a new identity or manufacture a PBI attestation. */
export async function buildReceizKeyIdentityRecordArtwork(args: {
  keyFile: ReceizKeyFile;
  username?: string | null;
}) {
  const keyFile = ensureKeyFileShape(args.keyFile);
  const proofStatus = await verifyReceizKeyPortableStateProof(keyFile);
  if (proofStatus === "invalid") throw new Error("portable_state_proof_invalid");
  const snapshot = proofStatus === "verified" ? asRecord(keyFile.portableState?.snapshot) : null;
  const account = asRecord(snapshot?.account);
  const profile = asRecord(asRecord(snapshot?.profileView)?.profile) ?? asRecord(snapshot?.profile);
  const accountId = keyFileArtworkAccountId(keyFile);
  const accountProfile = asTrimmedString(profile?.userId) === accountId ? profile : null;
  const profileReceipt = accountProfile?.authorshipVerified === true
    ? asTrimmedString(accountProfile.authorshipPbiReceiptHash).toLowerCase() : "";
  const pbiReceiptHash = HEX64_RE.test(profileReceipt) ? profileReceipt : keyFile.attestation?.pbiReceiptHash ?? null;
  const attestation = keyFile.attestation?.pbiReceiptHash === pbiReceiptHash ? keyFile.attestation : null;
  const username = asTrimmedString(args.username) || asTrimmedString(accountProfile?.username)
    || asTrimmedString(account?.username) || keyFile.owner.username || keyFile.owner.uid;
  const creationKaiMicroPulse = keyFileIdentityCreationKaiMicroPulse(keyFile);
  if (!creationKaiMicroPulse) throw new Error("identity_key_creation_kai_coordinate_missing");
  return { ...buildProfileIdentityArtworkSvgSet({
    userId: accountId,
    createdAt: keyFileIdentityCreatedAt(keyFile),
    creationKaiMicroPulse,
    receizId: username,
    receizIdentityKeyId: keyFile.keyId,
    pbiReceiptHash,
    pbiSignedAt: attestation?.attestedAt ?? null,
    pbiSignedKaiMicroPulse: attestation?.pbiSignedKaiMicroPulse ?? null,
  }), username };
}

export async function buildReceizKeyIdentityRecordPng(args: {
  keyFile: ReceizKeyFile;
  username?: string | null;
  verifyOrigin?: string;
  artwork?: "record" | "seal";
}): Promise<Blob> {
  const keyFile = ensureKeyFileShape(args.keyFile);
  const svgSet = await buildReceizKeyIdentityRecordArtwork(args);
  const savedAtMs = Date.now();
  const savedAt = new Date(savedAtMs).toISOString();
  const kaiStamp = buildReceizIdentityRecordKaiStamp(keyFile, savedAt);
  const basePng = await rasterizeIdentityRecordSvg(args.artwork === "seal" ? svgSet.avatarSvg : svgSet.bannerSvg, kaiStamp, args.artwork);
  const embeddedMeta = insertPngTextChunks(basePng, [
    {
      keyword: RECEIZ_IDENTITY_RECORD_META_CHUNK_KEY,
      text: JSON.stringify({
        schema: "receiz.identity_record.v1",
        kind: "identity-record",
        keyId: keyFile.keyId,
        ownerUid: keyFile.owner.uid,
        receizId: svgSet.username,
        pulse: svgSet.pulse,
        seedHash: svgSet.seedHash,
        issuedAt: keyFile.issuedAt,
        embeddedAt: savedAt,
        kaiStamp,
      }),
    },
  ]);
  const { receizeDocumentBytesClient } = await import("@/app/lib/documentSeal/receizeDocumentBytesClient");
  const embedded = await sealReceizIdentityRecordPayload({
    pngBytes: embeddedMeta,
    keyFile,
    ownerReceizId: `${(keyFile.owner.username ?? args.username ?? "").trim().replace(/^@+/, "").toLowerCase()}.receiz.id`,
    seal: async ({ payloadBytes, nativeRecordSeal }) => {
      const sealed = await receizeDocumentBytesClient({
        fileBytes: payloadBytes,
        filename: buildReceizKeyFilename(args.username),
        mime: "image/png",
        now: savedAtMs,
        verifyOrigin: args.verifyOrigin,
        options: identityRecordSealOptions(nativeRecordSeal),
      });
      if (sealed.kind !== "png") {
        throw new Error("receiz_key_identity_record_png_required");
      }
      return sealed.artifactBytes;
    },
  });
  const embeddedBuffer = new ArrayBuffer(embedded.byteLength);
  new Uint8Array(embeddedBuffer).set(embedded);
  return new Blob([embeddedBuffer], { type: "image/png" });
}

/** Promotes an already-recoverable PNG Seal into native Identity Record custody without repainting it. */
export async function buildReceizKeyIdentityRecordFromPng(args: {
  artifact: Blob;
  keyFile: ReceizKeyFile;
  username: string;
}): Promise<Blob> {
  const pngBytes = new Uint8Array(await args.artifact.arrayBuffer());
  const { receizeDocumentBytesClient } = await import("@/app/lib/documentSeal/receizeDocumentBytesClient");
  const embedded = await sealReceizIdentityRecordPayload({
    pngBytes,
    keyFile: args.keyFile,
    ownerReceizId: `${args.username.trim().replace(/^@+/, "").normalize("NFC").toLowerCase()}.receiz.id`,
    seal: async ({ payloadBytes, nativeRecordSeal }) => {
      const sealed = await receizeDocumentBytesClient({
        fileBytes: payloadBytes,
        filename: buildReceizKeyFilename(args.username),
        mime: "image/png",
        options: identityRecordSealOptions(nativeRecordSeal),
      });
      if (sealed.kind !== "png") throw new Error("receiz_key_identity_record_png_required");
      return sealed.artifactBytes;
    },
  });
  return new Blob([embedded.slice().buffer], { type: "image/png" });
}

export function identityRecordSealOptions(
  nativeRecordSeal: Readonly<{
    ownerReceizId: string;
    recordId: string;
  }>,
) {
  return Object.freeze({
    nativeRecordSeal,
    requirePng: true as const,
  });
}

export async function downloadReceizKeyFile(args: {
  keyFile: ReceizKeyFile;
  username?: string | null;
  fileName?: string;
  identityPassphrase?: string;
  artwork?: "record" | "seal";
}): Promise<void> {
  const blob = await buildReceizKeyIdentityRecordPng({
    keyFile: args.keyFile,
    username: args.username,
    artwork: args.artwork,
  });
  const fileName = asTrimmedString(args.fileName) || (args.artwork === "seal"
    ? buildReceizKeyFilename(args.username).replace(/^identity_record_/, "identity_seal_")
    : buildReceizKeyFilename(args.username));
  try {
    const username = (args.keyFile.owner.username ?? args.username ?? "")
      .trim()
      .replace(/^@+/, "")
      .toLowerCase();
    if (username) {
      const { createReceizIdentityArtifactCustody } = await import(
        "@/app/lib/auth/receizIdentityArtifactCustody"
      );
      const admission = await createReceizIdentityArtifactCustody().admitAndStore({
        artifact: new File([blob], fileName, { type: "image/png" }),
        ownerReceizId: `${username}.receiz.id`,
        actorId: args.keyFile.owner.uid,
        issuerKeyId: args.keyFile.keyId,
        passphrase: args.identityPassphrase ?? "",
      });
      const { admitActiveIdentityCustodyContext } = await import(
        "@/app/lib/auth/activeIdentityCustodyContext"
      );
      admitActiveIdentityCustodyContext({
        ownerReceizId: `${username}.receiz.id`,
        actorId: args.keyFile.owner.uid,
        issuerKeyId: args.keyFile.keyId,
        artifactSha256: admission.artifactSha256,
        actorAdmission: admission,
        keyFile: args.keyFile,
        passphrase: args.identityPassphrase ?? "",
      });
    }
  } catch {
    // A protected or legacy Identity Record remains downloadable. Publication
    // authority stays unavailable until its exact sealed proof is admitted.
  }
  downloadBlob(blob, fileName);
}

export async function downloadReceizKeyJsonFile(args: {
  keyFile: ReceizKeyFile;
  username?: string | null;
  fileName?: string;
}): Promise<void> {
  const serialized = serializeReceizKeyFile(args.keyFile);
  const sourceFilename = buildReceizKeyJsonFilename(args.username);
  const { receizeDocumentBytesClient } = await import("@/app/lib/documentSeal/receizeDocumentBytesClient");
  const receized = await receizeDocumentBytesClient({
    fileBytes: toUtf8(serialized),
    filename: sourceFilename,
    mime: "application/json",
  });
  const artifactBuffer = new ArrayBuffer(receized.artifactBytes.byteLength);
  new Uint8Array(artifactBuffer).set(receized.artifactBytes);
  const blob = new Blob([artifactBuffer], { type: "application/json" });
  const fileName = asTrimmedString(args.fileName) || receized.downloadName || sourceFilename;
  downloadBlob(blob, fileName);
}

const RECEIZ_KEY_FRIENDLY_ERRORS: Record<string, string> = {
  identity_key_not_supported: "This browser does not support Receiz Key cryptography yet.",
  receiz_key_file_required: "Choose your Receiz Key file to continue.",
  receiz_key_invalid: "This file is not a valid Receiz Key.",
  receiz_key_identity_record_missing: "This Identity Record does not contain a Receiz Key payload.",
  receiz_key_passphrase_required: "Enter your Receiz Key passphrase.",
  receiz_key_passphrase_too_short: "Use at least 12 characters for your Receiz Key passphrase.",
  receiz_key_legacy_passphrase_required: "This Receiz Key is password protected. Enter its password and try again.",
  receiz_key_decrypt_failed: "Could not unlock this Receiz Key. Check your passphrase and try again.",
  identity_key_challenge_invalid: "The login challenge was invalid. Try again.",
  identity_key_unavailable: "This Receiz Key is not active on an account.",
  identity_key_revoked: "This Receiz Key has been revoked.",
  identity_key_list_failed: "Could not load Receiz Key controls.",
  identity_key_lookup_failed: "Could not verify that Receiz Key.",
  identity_key_not_found: "That Receiz Key is not active on this account.",
  identity_key_revoke_failed: "Could not revoke that Receiz Key.",
  invalid_or_used_challenge: "This login challenge was already used. Start again.",
  challenge_expired: "This login challenge expired. Start again.",
  signature_verification_failed: "This Receiz Key could not be verified.",
  user_lookup_failed: "Receiz could not load your account. Try again.",
  signin_required: "Sign in first to manage Receiz Key exports.",
  portable_state_proof_invalid: "Portable state proof did not validate. This key file may be tampered.",
  portable_state_ledger_integrity_failed: "Portable state ledger integrity check failed.",
  portable_state_account_mismatch: "Portable state account does not match this signed-in user.",
  identity_key_user_mismatch: "This Receiz Key belongs to a different account.",
  pbi_denied: "Presence verification did not approve this Receiz Key export.",
  pbi_verify_failed: "Presence verification could not be completed.",
  pbi_signing_online_required: "Connect to Receiz before PBI-signing this Identity Record.",
  identity_key_challenge_failed: "Could not start Receiz Key enrollment.",
  identity_key_enroll_failed: "Could not finalize Receiz Key enrollment.",
  identity_key_begin_failed: "Could not start Receiz Key sign-in.",
  identity_key_finish_failed: "Could not complete Receiz Key sign-in.",
  identity_key_import_failed: "Could not import portable account state from this Receiz Key.",
  identity_key_local_create_failed: "Could not create a local Receiz ID on this device.",
  identity_key_local_pbi_invalid: "The local PresenceBound assertion did not verify for this local Receiz ID.",
  identity_key_passkey_required: "This account is on an older Receiz Key recovery path. Try again after refresh.",
  identity_key_passkey_mismatch: "This account is on an older Receiz Key recovery path. Try again after refresh.",
  identity_key_offline_canonical_required: "Offline Receiz Key sign-in must run on the canonical Receiz origin.",
  identity_key_offline_enrollment_required:
    "Open Receiz online once with this Receiz Key so the verified identity block can be admitted for offline sign-in.",
  identity_key_offline_portable_state_required:
    "This Receiz Key does not include a verified portable state block for first-time offline restore.",
  identity_key_offline_signature_invalid: "This Receiz Key could not verify its offline signature.",
  identity_key_offline_pbi_required: "This older local identity block needs its PresenceBound passkey before publishing.",
  identity_key_offline_pbi_mismatch: "The local PresenceBound passkey does not match this Receiz Key session.",
  identity_key_offline_pbi_invalid: "The local PresenceBound assertion did not verify for this offline Receiz Key sign-in.",
  identity_key_offline_session_mismatch: "This Receiz Key does not match the locally admitted identity session.",
  identity_key_offline_session_invalid: "The verified identity session could not be admitted for offline sign-in.",
  webauthn_create_not_supported: "This browser cannot create a PresenceBound credential on this device.",
  webauthn_create_failed: "The PresenceBound credential was not created.",
  webauthn_origin_not_canonical: "Local Receiz ID creation must run on the canonical Receiz origin.",
};

export function explainReceizKeyError(codeOrMessage: string): string {
  return RECEIZ_KEY_FRIENDLY_ERRORS[codeOrMessage] ?? codeOrMessage;
}

export function supportsReceizKeyCrypto(): boolean {
  return typeof window !== "undefined" && typeof File !== "undefined" && typeof crypto !== "undefined" && Boolean(crypto.subtle);
}
