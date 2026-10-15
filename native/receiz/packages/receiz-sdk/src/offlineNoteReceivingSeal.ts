import { digestReceizAuthority } from "./authorityEncoding.js";
import {
  createReceizOfflineNoteDestination,
  verifyReceizOfflineNoteDestination,
  type ReceizOfflineNoteDestinationV1,
} from "./offlineNoteDestination.js";
import {
  decryptReceizIdentityPrivateSigningKey,
  receizBase64UrlDecode,
  receizBase64UrlEncode,
  type ReceizIdentityKeyAlgorithm,
  type ReceizKeyFile,
} from "./identity.js";

const RECEIVING_SEAL_SCHEMA = "receiz.offline-note.receiving-seal.v2" as const;
const INSTALLATION_KEY_ALGORITHM = "P-256" as const;
const SHA256_RE = /^[0-9a-f]{64}$/;
const BASE64URL_RE = /^[A-Za-z0-9_-]+$/;

type ReceivingSealBasis = Readonly<{
  schema: typeof RECEIVING_SEAL_SCHEMA;
  destination: ReceizOfflineNoteDestinationV1;
  installationKeyAlgorithm: typeof INSTALLATION_KEY_ALGORITHM;
  installationPublicKeyRawB64u: string;
  installationCommitment: string;
}>;

export type ReceizOfflineNoteReceivingSealV2 = ReceivingSealBasis & Readonly<{
  receivingSealDigest: string;
  receivingSealSignatureB64u: string;
}>;

function strictArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.slice().buffer;
}

function identitySignatureAlgorithm(algorithm: ReceizIdentityKeyAlgorithm): AlgorithmIdentifier | EcdsaParams {
  return algorithm === "Ed25519"
    ? { name: "Ed25519" }
    : { name: "ECDSA", hash: "SHA-256" };
}

function identityImportAlgorithm(algorithm: ReceizIdentityKeyAlgorithm): AlgorithmIdentifier | EcKeyImportParams {
  return algorithm === "Ed25519"
    ? { name: "Ed25519" }
    : { name: "ECDSA", namedCurve: "P-256" };
}

function sealSignatureBytes(digest: string): Uint8Array {
  return new TextEncoder().encode(`${RECEIVING_SEAL_SCHEMA}:${digest}`);
}

function receivingSealBasis(seal: ReceizOfflineNoteReceivingSealV2): ReceivingSealBasis {
  return {
    schema: seal.schema,
    destination: seal.destination,
    installationKeyAlgorithm: seal.installationKeyAlgorithm,
    installationPublicKeyRawB64u: seal.installationPublicKeyRawB64u,
    installationCommitment: seal.installationCommitment,
  };
}

function assertShape(value: unknown): asserts value is ReceizOfflineNoteReceivingSealV2 {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("RECEIZ_OFFLINE_NOTE_RECEIVING_SEAL_INVALID");
  }
  const candidate = value as Record<string, unknown>;
  const expectedKeys = [
    "schema",
    "destination",
    "installationKeyAlgorithm",
    "installationPublicKeyRawB64u",
    "installationCommitment",
    "receivingSealDigest",
    "receivingSealSignatureB64u",
  ].sort().join(",");
  if (Object.keys(candidate).sort().join(",") !== expectedKeys
    || candidate.schema !== RECEIVING_SEAL_SCHEMA
    || candidate.installationKeyAlgorithm !== INSTALLATION_KEY_ALGORITHM
    || typeof candidate.installationPublicKeyRawB64u !== "string"
    || !BASE64URL_RE.test(candidate.installationPublicKeyRawB64u)
    || typeof candidate.installationCommitment !== "string"
    || !SHA256_RE.test(candidate.installationCommitment)
    || typeof candidate.receivingSealDigest !== "string"
    || !SHA256_RE.test(candidate.receivingSealDigest)
    || typeof candidate.receivingSealSignatureB64u !== "string"
    || !BASE64URL_RE.test(candidate.receivingSealSignatureB64u)) {
    throw new TypeError("RECEIZ_OFFLINE_NOTE_RECEIVING_SEAL_INVALID");
  }
}

async function installationCommitment(publicKeyRawB64u: string): Promise<string> {
  await crypto.subtle.importKey(
    "raw",
    strictArrayBuffer(receizBase64UrlDecode(publicKeyRawB64u)),
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["verify"],
  );
  return digestReceizAuthority("identity", "receiz.offline-note.installation.v1", {
    algorithm: INSTALLATION_KEY_ALGORITHM,
    publicKeyRawB64u,
  });
}

export async function createReceizOfflineNoteReceivingSeal(input: Readonly<{
  verifiedIdentityArtifactSha256: string;
  keyFile: ReceizKeyFile;
  passphrase?: string;
  installationPublicKeyRawB64u: string;
}>): Promise<ReceizOfflineNoteReceivingSealV2> {
  try {
    const destination = await createReceizOfflineNoteDestination(input);
    const publicKeyRawB64u = input.installationPublicKeyRawB64u.trim();
    const commitment = await installationCommitment(publicKeyRawB64u);
    const basis: ReceivingSealBasis = Object.freeze({
      schema: RECEIVING_SEAL_SCHEMA,
      destination,
      installationKeyAlgorithm: INSTALLATION_KEY_ALGORITHM,
      installationPublicKeyRawB64u: publicKeyRawB64u,
      installationCommitment: commitment,
    });
    const receivingSealDigest = await digestReceizAuthority("identity", RECEIVING_SEAL_SCHEMA, basis);
    const privateKey = await decryptReceizIdentityPrivateSigningKey({
      keyFile: input.keyFile,
      passphrase: input.passphrase,
    });
    const signature = await crypto.subtle.sign(
      identitySignatureAlgorithm(input.keyFile.alg),
      privateKey,
      strictArrayBuffer(sealSignatureBytes(receivingSealDigest)),
    );
    return Object.freeze({
      ...basis,
      receivingSealDigest,
      receivingSealSignatureB64u: receizBase64UrlEncode(new Uint8Array(signature)),
    });
  } catch {
    throw new TypeError("RECEIZ_OFFLINE_NOTE_RECEIVING_SEAL_INVALID");
  }
}

export async function verifyReceizOfflineNoteReceivingSeal(
  candidate: unknown,
): Promise<ReceizOfflineNoteReceivingSealV2> {
  try {
    assertShape(candidate);
    const destination = await verifyReceizOfflineNoteDestination(candidate.destination);
    const commitment = await installationCommitment(candidate.installationPublicKeyRawB64u);
    const digest = await digestReceizAuthority(
      "identity",
      RECEIVING_SEAL_SCHEMA,
      receivingSealBasis(candidate),
    );
    if (commitment !== candidate.installationCommitment || digest !== candidate.receivingSealDigest) {
      throw new TypeError("RECEIZ_OFFLINE_NOTE_RECEIVING_SEAL_INVALID");
    }
    const publicKey = await crypto.subtle.importKey(
      "raw",
      strictArrayBuffer(receizBase64UrlDecode(destination.recipientPublicKeyRawB64u)),
      identityImportAlgorithm(destination.recipientIdentityAlgorithm),
      false,
      ["verify"],
    );
    const verified = await crypto.subtle.verify(
      identitySignatureAlgorithm(destination.recipientIdentityAlgorithm),
      publicKey,
      strictArrayBuffer(receizBase64UrlDecode(candidate.receivingSealSignatureB64u)),
      strictArrayBuffer(sealSignatureBytes(candidate.receivingSealDigest)),
    );
    if (!verified) throw new TypeError("RECEIZ_OFFLINE_NOTE_RECEIVING_SEAL_INVALID");
    return Object.freeze(structuredClone(candidate));
  } catch {
    throw new TypeError("RECEIZ_OFFLINE_NOTE_RECEIVING_SEAL_INVALID");
  }
}
