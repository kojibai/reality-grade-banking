import { digestReceizAuthority } from "./authorityEncoding.js";
import {
  decryptReceizIdentityPrivateSigningKey,
  deriveReceizIdentityKeyIdFromPublicKeyRawB64u,
  receizBase64UrlDecode,
  receizBase64UrlEncode,
  type ReceizIdentityKeyAlgorithm,
  type ReceizKeyFile,
} from "./identity.js";

const DESTINATION_SCHEMA = "receiz.offline-note.destination.v1" as const;
const DESTINATION_PURPOSE = "offline-note-whole-transfer" as const;
const SHA256_RE = /^[0-9a-f]{64}$/;
const BASE64URL_RE = /^[A-Za-z0-9_-]+$/;

type ReceizOfflineNoteDestinationBasis = Readonly<{
  schema: typeof DESTINATION_SCHEMA;
  recipientIdentityArtifactSha256: string;
  recipientReceizId: string;
  recipientUsername: string | null;
  recipientIdentityKeyId: string;
  recipientIdentityAlgorithm: ReceizIdentityKeyAlgorithm;
  recipientPublicKeyRawB64u: string;
  destinationPurpose: typeof DESTINATION_PURPOSE;
}>;

export type ReceizOfflineNoteDestinationV1 = ReceizOfflineNoteDestinationBasis & Readonly<{
  destinationDigest: string;
  destinationSignatureB64u: string;
}>;

function strictArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.slice().buffer;
}

function signatureAlgorithm(algorithm: ReceizIdentityKeyAlgorithm): AlgorithmIdentifier | EcdsaParams {
  return algorithm === "Ed25519"
    ? { name: "Ed25519" }
    : { name: "ECDSA", hash: "SHA-256" };
}

function keyImportAlgorithm(algorithm: ReceizIdentityKeyAlgorithm): AlgorithmIdentifier | EcKeyImportParams {
  return algorithm === "Ed25519"
    ? { name: "Ed25519" }
    : { name: "ECDSA", namedCurve: "P-256" };
}

function destinationBasis(value: ReceizOfflineNoteDestinationV1): ReceizOfflineNoteDestinationBasis {
  return {
    schema: value.schema,
    recipientIdentityArtifactSha256: value.recipientIdentityArtifactSha256,
    recipientReceizId: value.recipientReceizId,
    recipientUsername: value.recipientUsername,
    recipientIdentityKeyId: value.recipientIdentityKeyId,
    recipientIdentityAlgorithm: value.recipientIdentityAlgorithm,
    recipientPublicKeyRawB64u: value.recipientPublicKeyRawB64u,
    destinationPurpose: value.destinationPurpose,
  };
}

function assertDestinationShape(value: unknown): asserts value is ReceizOfflineNoteDestinationV1 {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("RECEIZ_OFFLINE_NOTE_DESTINATION_INVALID");
  }
  const candidate = value as Record<string, unknown>;
  const exactKeys = [
    "schema",
    "recipientIdentityArtifactSha256",
    "recipientReceizId",
    "recipientUsername",
    "recipientIdentityKeyId",
    "recipientIdentityAlgorithm",
    "recipientPublicKeyRawB64u",
    "destinationPurpose",
    "destinationDigest",
    "destinationSignatureB64u",
  ].sort().join(",");
  if (Object.keys(candidate).sort().join(",") !== exactKeys
    || candidate.schema !== DESTINATION_SCHEMA
    || typeof candidate.recipientIdentityArtifactSha256 !== "string"
    || !SHA256_RE.test(candidate.recipientIdentityArtifactSha256)
    || typeof candidate.recipientReceizId !== "string"
    || !candidate.recipientReceizId.trim()
    || candidate.recipientReceizId !== candidate.recipientReceizId.trim()
    || candidate.recipientUsername !== null
      && (typeof candidate.recipientUsername !== "string"
        || !candidate.recipientUsername.trim()
        || candidate.recipientUsername !== candidate.recipientUsername.trim())
    || typeof candidate.recipientIdentityKeyId !== "string"
    || !SHA256_RE.test(candidate.recipientIdentityKeyId)
    || candidate.recipientIdentityAlgorithm !== "Ed25519"
      && candidate.recipientIdentityAlgorithm !== "P-256"
    || typeof candidate.recipientPublicKeyRawB64u !== "string"
    || !BASE64URL_RE.test(candidate.recipientPublicKeyRawB64u)
    || candidate.destinationPurpose !== DESTINATION_PURPOSE
    || typeof candidate.destinationDigest !== "string"
    || !SHA256_RE.test(candidate.destinationDigest)
    || typeof candidate.destinationSignatureB64u !== "string"
    || !BASE64URL_RE.test(candidate.destinationSignatureB64u)) {
    throw new TypeError("RECEIZ_OFFLINE_NOTE_DESTINATION_INVALID");
  }
}

function signatureBytes(destinationDigest: string): Uint8Array {
  return new TextEncoder().encode(`${DESTINATION_SCHEMA}:${destinationDigest}`);
}

export async function createReceizOfflineNoteDestination(input: Readonly<{
  verifiedIdentityArtifactSha256: string;
  keyFile: ReceizKeyFile;
  passphrase?: string;
}>): Promise<ReceizOfflineNoteDestinationV1> {
  const artifactSha256 = input.verifiedIdentityArtifactSha256.trim().toLowerCase();
  const recipientReceizId = input.keyFile.owner.uid.trim();
  const recipientUsername = input.keyFile.owner.username?.trim() || null;
  const publicKey = input.keyFile.crypto.publicKeyRawB64u.trim();
  if (!SHA256_RE.test(artifactSha256) || !recipientReceizId || !recipientUsername) {
    throw new TypeError("RECEIZ_OFFLINE_NOTE_DESTINATION_INVALID");
  }
  const derivedKeyId = await deriveReceizIdentityKeyIdFromPublicKeyRawB64u(publicKey, input.keyFile.alg);
  if (derivedKeyId !== input.keyFile.keyId) {
    throw new TypeError("RECEIZ_OFFLINE_NOTE_DESTINATION_INVALID");
  }
  const basis: ReceizOfflineNoteDestinationBasis = Object.freeze({
    schema: DESTINATION_SCHEMA,
    recipientIdentityArtifactSha256: artifactSha256,
    recipientReceizId,
    recipientUsername,
    recipientIdentityKeyId: input.keyFile.keyId,
    recipientIdentityAlgorithm: input.keyFile.alg,
    recipientPublicKeyRawB64u: publicKey,
    destinationPurpose: DESTINATION_PURPOSE,
  });
  const destinationDigest = await digestReceizAuthority("identity", DESTINATION_SCHEMA, basis);
  const privateKey = await decryptReceizIdentityPrivateSigningKey({
    keyFile: input.keyFile,
    passphrase: input.passphrase,
  });
  const signature = await crypto.subtle.sign(
    signatureAlgorithm(input.keyFile.alg),
    privateKey,
    strictArrayBuffer(signatureBytes(destinationDigest)),
  );
  return Object.freeze({
    ...basis,
    destinationDigest,
    destinationSignatureB64u: receizBase64UrlEncode(new Uint8Array(signature)),
  });
}

export async function verifyReceizOfflineNoteDestination(
  candidate: unknown,
): Promise<ReceizOfflineNoteDestinationV1> {
  try {
    assertDestinationShape(candidate);
    const derivedKeyId = await deriveReceizIdentityKeyIdFromPublicKeyRawB64u(
      candidate.recipientPublicKeyRawB64u,
      candidate.recipientIdentityAlgorithm,
    );
    const digest = await digestReceizAuthority("identity", DESTINATION_SCHEMA, destinationBasis(candidate));
    if (derivedKeyId !== candidate.recipientIdentityKeyId || digest !== candidate.destinationDigest) {
      throw new TypeError("RECEIZ_OFFLINE_NOTE_DESTINATION_INVALID");
    }
    const publicKey = await crypto.subtle.importKey(
      "raw",
      strictArrayBuffer(receizBase64UrlDecode(candidate.recipientPublicKeyRawB64u)),
      keyImportAlgorithm(candidate.recipientIdentityAlgorithm),
      false,
      ["verify"],
    );
    const verified = await crypto.subtle.verify(
      signatureAlgorithm(candidate.recipientIdentityAlgorithm),
      publicKey,
      strictArrayBuffer(receizBase64UrlDecode(candidate.destinationSignatureB64u)),
      strictArrayBuffer(signatureBytes(candidate.destinationDigest)),
    );
    if (!verified) throw new TypeError("RECEIZ_OFFLINE_NOTE_DESTINATION_INVALID");
    return Object.freeze(structuredClone(candidate));
  } catch {
    throw new TypeError("RECEIZ_OFFLINE_NOTE_DESTINATION_INVALID");
  }
}

export function resolveReceizOfflineNoteDestination(
  visibleUsernameOrReceizId: string,
  verifiedLocalDestinations: readonly ReceizOfflineNoteDestinationV1[],
): ReceizOfflineNoteDestinationV1 {
  const visible = visibleUsernameOrReceizId.trim().replace(/^@/, "");
  const matches = verifiedLocalDestinations.filter((destination) =>
    destination.recipientReceizId === visible || destination.recipientUsername === visible);
  if (matches.length !== 1) {
    throw new TypeError("RECEIZ_OFFLINE_NOTE_DESTINATION_MAPPING_REQUIRED");
  }
  return matches[0]!;
}
