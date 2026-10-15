import { digestReceizAuthority } from "./authorityEncoding.js";
import { receizBase64UrlDecode, receizBase64UrlEncode } from "./identity.js";
import {
  createReceizOfflineNoteCustodyQualification,
  verifyReceizOfflineNoteCustodyQualification,
  type ReceizOfflineNoteCustodyQualificationV1,
} from "./offlineNoteIrreversibleCustody.js";

export const RECEIZ_OFFLINE_NOTE_WEBAUTHN_CONSUMPTION_SCHEMA =
  "receiz.offline-note.webauthn-consumption.v1" as const;
export const RECEIZ_OFFLINE_NOTE_WEBAUTHN_ACTIVATION_SCHEMA =
  "receiz.offline-note.webauthn-activation.v1" as const;

const SHA256_RE = /^[0-9a-f]{64}$/;
const BASE64URL_RE = /^[A-Za-z0-9_-]+$/;
const POSITIVE_UINT_RE = /^[1-9][0-9]*$/;
const UINT_RE = /^(0|[1-9][0-9]*)$/;

type WebAuthnConsumptionBasis = Readonly<{
  schema: typeof RECEIZ_OFFLINE_NOTE_WEBAUTHN_CONSUMPTION_SCHEMA;
  qualificationDigest: string;
  profileId: string;
  profileEvidenceDigest: string;
  adapterKind: "pwa-webauthn";
  custodyPublicKeyAlgorithm: "P-256";
  custodyPublicKeyRawB64u: string;
  installationCommitment: string;
  noteId: string;
  predecessorArtifactSha256: string;
  currentCustodyCommitmentDigest: string;
  expectedStateCommitment: string;
  consumedStateCommitment: string;
  expectedStateSequence: string;
  consumedStateSequence: string;
  receiverCustodyCommitmentDigest: string;
  wholeValuePhiMicro: string;
  acceptedAtKai: string;
  successorBasisDigest: string;
  rpId: string;
  origin: string;
  activationReceipt: ReceizOfflineNoteWebAuthnActivationReceiptV1;
}>;

export type ReceizOfflineNotePreparedWebAuthnConsumptionV1 = Readonly<{
  qualification: ReceizOfflineNoteCustodyQualificationV1;
  basis: WebAuthnConsumptionBasis;
  receiptDigest: string;
  challengeB64u: string;
}>;

export type ReceizOfflineNoteWebAuthnConsumptionReceiptV1 = WebAuthnConsumptionBasis & Readonly<{
  receiptDigest: string;
  authenticatorDataB64u: string;
  clientDataJSONB64u: string;
  signatureB64u: string;
}>;

type WebAuthnActivationBasis = Readonly<{
  schema: typeof RECEIZ_OFFLINE_NOTE_WEBAUTHN_ACTIVATION_SCHEMA;
  qualificationDigest: string;
  profileId: string;
  profileEvidenceDigest: string;
  adapterKind: "pwa-webauthn";
  custodyPublicKeyAlgorithm: "P-256";
  custodyPublicKeyRawB64u: string;
  installationCommitment: string;
  noteId: string;
  verifiedSuccessorArtifactSha256: string;
  receivingCustodyCommitmentDigest: string;
  expectedStateCommitment: string;
  activeStateCommitment: string;
  expectedStateSequence: string;
  activeStateSequence: string;
  wholeValuePhiMicro: string;
  acceptedAtKai: string;
  rpId: string;
  origin: string;
}>;

export type ReceizOfflineNotePreparedWebAuthnActivationV1 = Readonly<{
  qualification: ReceizOfflineNoteCustodyQualificationV1;
  basis: WebAuthnActivationBasis;
  receiptDigest: string;
  challengeB64u: string;
}>;

export type ReceizOfflineNoteWebAuthnActivationReceiptV1 = WebAuthnActivationBasis & Readonly<{
  receiptDigest: string;
  authenticatorDataB64u: string;
  clientDataJSONB64u: string;
  signatureB64u: string;
}>;

function fail(): never {
  throw new TypeError("RECEIZ_OFFLINE_NOTE_WEBAUTHN_CONSUMPTION_RECEIPT_INVALID");
}

function strictArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.slice().buffer;
}

function bytesEqual(left: Uint8Array, right: Uint8Array): boolean {
  if (left.byteLength !== right.byteLength) return false;
  let difference = 0;
  for (let index = 0; index < left.byteLength; index += 1) {
    difference |= (left[index] ?? 0) ^ (right[index] ?? 0);
  }
  return difference === 0;
}

function concatBytes(left: Uint8Array, right: Uint8Array): Uint8Array {
  const bytes = new Uint8Array(left.byteLength + right.byteLength);
  bytes.set(left);
  bytes.set(right, left.byteLength);
  return bytes;
}

function hexToBytes(hex: string): Uint8Array {
  if (!SHA256_RE.test(hex)) fail();
  return Uint8Array.from({ length: 32 }, (_, index) => Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16));
}

function exactKeys(candidate: Record<string, unknown>, expected: readonly string[]): void {
  if (Object.keys(candidate).sort().join("\0") !== [...expected].sort().join("\0")) fail();
}

function derToRawSignature(signature: Uint8Array): Uint8Array | null {
  if (signature.byteLength === 64) return signature;
  if (signature.byteLength < 8 || signature[0] !== 0x30) return null;
  let offset = 2;
  if ((signature[1] ?? 0) & 0x80) {
    const lengthBytes = (signature[1] ?? 0) & 0x7f;
    if (lengthBytes < 1 || lengthBytes > 2 || 2 + lengthBytes >= signature.byteLength) return null;
    offset = 2 + lengthBytes;
  }
  if (signature[offset] !== 0x02) return null;
  const rLength = signature[offset + 1] ?? 0;
  const r = signature.slice(offset + 2, offset + 2 + rLength);
  offset += 2 + rLength;
  if (signature[offset] !== 0x02) return null;
  const sLength = signature[offset + 1] ?? 0;
  const s = signature.slice(offset + 2, offset + 2 + sLength);
  const normalize = (value: Uint8Array): Uint8Array | null => {
    let normalized = value;
    while (normalized.byteLength > 32 && normalized[0] === 0) normalized = normalized.slice(1);
    if (normalized.byteLength > 32) return null;
    const output = new Uint8Array(32);
    output.set(normalized, 32 - normalized.byteLength);
    return output;
  };
  const rawR = normalize(r);
  const rawS = normalize(s);
  return rawR && rawS ? concatBytes(rawR, rawS) : null;
}

export type ReceizVerifiedOfflineNoteWebAuthnAssertion = Readonly<{
  signCount: number;
  flags: number;
}>;

export async function verifyReceizOfflineNoteWebAuthnAssertion(input: Readonly<{
  custodyPublicKeyRawB64u: string;
  rpId: string;
  origin: string;
  challengeB64u: string;
  expectedSignCount: string;
  authenticatorDataB64u: string;
  clientDataJSONB64u: string;
  signatureB64u: string;
}>): Promise<ReceizVerifiedOfflineNoteWebAuthnAssertion> {
  if (!BASE64URL_RE.test(input.authenticatorDataB64u)
    || !BASE64URL_RE.test(input.clientDataJSONB64u)
    || !BASE64URL_RE.test(input.signatureB64u)
    || !BASE64URL_RE.test(input.challengeB64u)
    || !POSITIVE_UINT_RE.test(input.expectedSignCount)) fail();
  const authenticatorData = receizBase64UrlDecode(input.authenticatorDataB64u);
  const clientDataJSON = receizBase64UrlDecode(input.clientDataJSONB64u);
  const signature = receizBase64UrlDecode(input.signatureB64u);
  if (authenticatorData.byteLength < 37) fail();
  let clientData: unknown;
  try {
    clientData = JSON.parse(new TextDecoder().decode(clientDataJSON));
  } catch {
    fail();
  }
  if (!clientData || typeof clientData !== "object") fail();
  const client = clientData as Record<string, unknown>;
  if (client.type !== "webauthn.get"
    || client.challenge !== input.challengeB64u
    || client.origin !== input.origin
    || client.crossOrigin === true) fail();
  const expectedRpIdHash = new Uint8Array(await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(input.rpId),
  ));
  if (!bytesEqual(authenticatorData.slice(0, 32), expectedRpIdHash)) fail();
  const flags = authenticatorData[32] ?? 0;
  const userPresent = (flags & 0x01) === 0x01;
  const userVerified = (flags & 0x04) === 0x04;
  const backupEligible = (flags & 0x08) === 0x08;
  const backupState = (flags & 0x10) === 0x10;
  if (!userPresent || !userVerified || backupEligible || backupState) fail();
  const signCount = new DataView(
    authenticatorData.buffer,
    authenticatorData.byteOffset + 33,
    4,
  ).getUint32(0, false);
  if (BigInt(signCount) !== BigInt(input.expectedSignCount)) fail();
  let publicKey: CryptoKey;
  try {
    publicKey = await crypto.subtle.importKey(
      "raw",
      strictArrayBuffer(receizBase64UrlDecode(input.custodyPublicKeyRawB64u)),
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["verify"],
    );
  } catch {
    fail();
  }
  const clientDataHash = new Uint8Array(await crypto.subtle.digest("SHA-256", strictArrayBuffer(clientDataJSON)));
  const signedBytes = concatBytes(authenticatorData, clientDataHash);
  const rawSignature = derToRawSignature(signature);
  if (!rawSignature) fail();
  const verified = await crypto.subtle.verify(
    { name: "ECDSA", hash: "SHA-256" },
    publicKey,
    strictArrayBuffer(rawSignature),
    strictArrayBuffer(signedBytes),
  ).catch(() => false);
  if (!verified) fail();
  return Object.freeze({ signCount, flags });
}

async function verifyWebAuthnEvidence(
  receipt: ReceizOfflineNoteWebAuthnConsumptionReceiptV1,
): Promise<void> {
  await verifyReceizOfflineNoteWebAuthnAssertion({
    custodyPublicKeyRawB64u: receipt.custodyPublicKeyRawB64u,
    rpId: receipt.rpId,
    origin: receipt.origin,
    challengeB64u: receizBase64UrlEncode(hexToBytes(receipt.receiptDigest)),
    expectedSignCount: receipt.consumedStateSequence,
    authenticatorDataB64u: receipt.authenticatorDataB64u,
    clientDataJSONB64u: receipt.clientDataJSONB64u,
    signatureB64u: receipt.signatureB64u,
  });
}

async function verifyActivationWebAuthnEvidence(
  receipt: ReceizOfflineNoteWebAuthnActivationReceiptV1,
): Promise<void> {
  await verifyReceizOfflineNoteWebAuthnAssertion({
    custodyPublicKeyRawB64u: receipt.custodyPublicKeyRawB64u,
    rpId: receipt.rpId,
    origin: receipt.origin,
    challengeB64u: receizBase64UrlEncode(hexToBytes(receipt.receiptDigest)),
    expectedSignCount: receipt.activeStateSequence,
    authenticatorDataB64u: receipt.authenticatorDataB64u,
    clientDataJSONB64u: receipt.clientDataJSONB64u,
    signatureB64u: receipt.signatureB64u,
  });
}

export async function prepareReceizOfflineNoteWebAuthnActivationChallenge(input: Readonly<{
  qualification: ReceizOfflineNoteCustodyQualificationV1;
  noteId: string;
  verifiedSuccessorArtifactSha256: string;
  receivingCustodyCommitmentDigest: string;
  expectedStateCommitment: string;
  activeStateCommitment: string;
  expectedStateSequence: string;
  activeStateSequence: string;
  wholeValuePhiMicro: string;
  acceptedAtKai: string;
  rpId: string;
  origin: string;
}>): Promise<ReceizOfflineNotePreparedWebAuthnActivationV1> {
  const qualification = await verifyReceizOfflineNoteCustodyQualification(input.qualification);
  if (qualification.adapterKind !== "pwa-webauthn"
    || !input.noteId.trim()
    || !SHA256_RE.test(input.verifiedSuccessorArtifactSha256)
    || !SHA256_RE.test(input.receivingCustodyCommitmentDigest)
    || !SHA256_RE.test(input.expectedStateCommitment)
    || !SHA256_RE.test(input.activeStateCommitment)
    || input.expectedStateCommitment !== qualification.stateCommitment
    || input.expectedStateCommitment === input.activeStateCommitment
    || !POSITIVE_UINT_RE.test(input.expectedStateSequence)
    || !POSITIVE_UINT_RE.test(input.activeStateSequence)
    || input.expectedStateSequence !== qualification.stateSequence
    || BigInt(input.activeStateSequence) !== BigInt(input.expectedStateSequence) + 1n
    || !POSITIVE_UINT_RE.test(input.wholeValuePhiMicro)
    || !UINT_RE.test(input.acceptedAtKai)
    || !input.rpId.trim()) {
    throw new TypeError("RECEIZ_OFFLINE_NOTE_WEBAUTHN_ACTIVATION_RECEIPT_INVALID");
  }
  let origin: URL;
  try {
    origin = new URL(input.origin);
  } catch {
    throw new TypeError("RECEIZ_OFFLINE_NOTE_WEBAUTHN_ACTIVATION_RECEIPT_INVALID");
  }
  if (origin.protocol !== "https:" || origin.origin !== input.origin) {
    throw new TypeError("RECEIZ_OFFLINE_NOTE_WEBAUTHN_ACTIVATION_RECEIPT_INVALID");
  }
  const basis: WebAuthnActivationBasis = Object.freeze({
    schema: RECEIZ_OFFLINE_NOTE_WEBAUTHN_ACTIVATION_SCHEMA,
    qualificationDigest: qualification.qualificationDigest,
    profileId: qualification.profileId,
    profileEvidenceDigest: qualification.profileEvidenceDigest,
    adapterKind: "pwa-webauthn",
    custodyPublicKeyAlgorithm: "P-256",
    custodyPublicKeyRawB64u: qualification.custodyPublicKeyRawB64u,
    installationCommitment: qualification.installationCommitment,
    noteId: input.noteId.trim(),
    verifiedSuccessorArtifactSha256: input.verifiedSuccessorArtifactSha256,
    receivingCustodyCommitmentDigest: input.receivingCustodyCommitmentDigest,
    expectedStateCommitment: input.expectedStateCommitment,
    activeStateCommitment: input.activeStateCommitment,
    expectedStateSequence: input.expectedStateSequence,
    activeStateSequence: input.activeStateSequence,
    wholeValuePhiMicro: input.wholeValuePhiMicro,
    acceptedAtKai: input.acceptedAtKai,
    rpId: input.rpId,
    origin: input.origin,
  });
  const receiptDigest = await digestReceizAuthority(
    "transition",
    RECEIZ_OFFLINE_NOTE_WEBAUTHN_ACTIVATION_SCHEMA,
    basis,
  );
  return Object.freeze({
    qualification,
    basis,
    receiptDigest,
    challengeB64u: receizBase64UrlEncode(hexToBytes(receiptDigest)),
  });
}

export async function finalizeReceizOfflineNoteWebAuthnActivationReceipt(input: Readonly<{
  prepared: ReceizOfflineNotePreparedWebAuthnActivationV1;
  authenticatorDataB64u: string;
  clientDataJSONB64u: string;
  signatureB64u: string;
}>): Promise<ReceizOfflineNoteWebAuthnActivationReceiptV1> {
  const receipt = Object.freeze({
    ...input.prepared.basis,
    receiptDigest: input.prepared.receiptDigest,
    authenticatorDataB64u: input.authenticatorDataB64u,
    clientDataJSONB64u: input.clientDataJSONB64u,
    signatureB64u: input.signatureB64u,
  });
  await verifyReceizOfflineNoteWebAuthnActivationReceipt(receipt);
  return receipt;
}

export async function verifyReceizOfflineNoteWebAuthnActivationReceipt(
  candidate: unknown,
): Promise<ReceizOfflineNoteWebAuthnActivationReceiptV1> {
  const invalid = (): never => {
    throw new TypeError("RECEIZ_OFFLINE_NOTE_WEBAUTHN_ACTIVATION_RECEIPT_INVALID");
  };
  try {
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) invalid();
    const record = candidate as Record<string, unknown>;
    exactKeys(record, [
      "schema", "qualificationDigest", "profileId", "profileEvidenceDigest", "adapterKind",
      "custodyPublicKeyAlgorithm", "custodyPublicKeyRawB64u", "installationCommitment", "noteId",
      "verifiedSuccessorArtifactSha256", "receivingCustodyCommitmentDigest", "expectedStateCommitment",
      "activeStateCommitment", "expectedStateSequence", "activeStateSequence", "wholeValuePhiMicro",
      "acceptedAtKai", "rpId", "origin", "receiptDigest", "authenticatorDataB64u",
      "clientDataJSONB64u", "signatureB64u",
    ]);
    const receipt = record as unknown as ReceizOfflineNoteWebAuthnActivationReceiptV1;
    if (receipt.schema !== RECEIZ_OFFLINE_NOTE_WEBAUTHN_ACTIVATION_SCHEMA
      || receipt.adapterKind !== "pwa-webauthn"
      || receipt.custodyPublicKeyAlgorithm !== "P-256"
      || !SHA256_RE.test(receipt.qualificationDigest)
      || !SHA256_RE.test(receipt.profileEvidenceDigest)
      || !SHA256_RE.test(receipt.installationCommitment)
      || !SHA256_RE.test(receipt.receiptDigest)) invalid();
    const qualification = await createReceizOfflineNoteCustodyQualification({
      profileId: receipt.profileId,
      profileEvidenceDigest: receipt.profileEvidenceDigest,
      adapterKind: "pwa-webauthn",
      custodyPublicKeyRawB64u: receipt.custodyPublicKeyRawB64u,
      stateCommitment: receipt.expectedStateCommitment,
      stateSequence: receipt.expectedStateSequence,
    });
    if (qualification.qualificationDigest !== receipt.qualificationDigest
      || qualification.installationCommitment !== receipt.installationCommitment) invalid();
    const prepared = await prepareReceizOfflineNoteWebAuthnActivationChallenge({
      qualification,
      noteId: receipt.noteId,
      verifiedSuccessorArtifactSha256: receipt.verifiedSuccessorArtifactSha256,
      receivingCustodyCommitmentDigest: receipt.receivingCustodyCommitmentDigest,
      expectedStateCommitment: receipt.expectedStateCommitment,
      activeStateCommitment: receipt.activeStateCommitment,
      expectedStateSequence: receipt.expectedStateSequence,
      activeStateSequence: receipt.activeStateSequence,
      wholeValuePhiMicro: receipt.wholeValuePhiMicro,
      acceptedAtKai: receipt.acceptedAtKai,
      rpId: receipt.rpId,
      origin: receipt.origin,
    });
    if (prepared.receiptDigest !== receipt.receiptDigest) invalid();
    await verifyActivationWebAuthnEvidence(receipt);
    return Object.freeze(structuredClone(receipt));
  } catch {
    return invalid();
  }
}

export async function prepareReceizOfflineNoteWebAuthnConsumptionChallenge(input: Readonly<{
  qualification: ReceizOfflineNoteCustodyQualificationV1;
  activationReceipt: ReceizOfflineNoteWebAuthnActivationReceiptV1;
  noteId: string;
  predecessorArtifactSha256: string;
  currentCustodyCommitmentDigest: string;
  expectedStateCommitment: string;
  consumedStateCommitment: string;
  expectedStateSequence: string;
  consumedStateSequence: string;
  receiverCustodyCommitmentDigest: string;
  wholeValuePhiMicro: string;
  acceptedAtKai: string;
  successorBasisDigest: string;
  rpId: string;
  origin: string;
}>): Promise<ReceizOfflineNotePreparedWebAuthnConsumptionV1> {
  const qualification = await verifyReceizOfflineNoteCustodyQualification(input.qualification);
  const activationReceipt = await verifyReceizOfflineNoteWebAuthnActivationReceipt(input.activationReceipt);
  if (qualification.adapterKind !== "pwa-webauthn"
    || activationReceipt.activeStateCommitment !== qualification.stateCommitment
    || activationReceipt.activeStateSequence !== qualification.stateSequence
    || activationReceipt.custodyPublicKeyRawB64u !== qualification.custodyPublicKeyRawB64u
    || activationReceipt.installationCommitment !== qualification.installationCommitment
    || activationReceipt.profileId !== qualification.profileId
    || activationReceipt.profileEvidenceDigest !== qualification.profileEvidenceDigest
    || activationReceipt.noteId !== input.noteId.trim()
    || activationReceipt.verifiedSuccessorArtifactSha256 !== input.predecessorArtifactSha256
    || activationReceipt.receivingCustodyCommitmentDigest !== input.currentCustodyCommitmentDigest
    || activationReceipt.wholeValuePhiMicro !== input.wholeValuePhiMicro
    || !input.noteId.trim()
    || !SHA256_RE.test(input.predecessorArtifactSha256)
    || !SHA256_RE.test(input.currentCustodyCommitmentDigest)
    || !SHA256_RE.test(input.expectedStateCommitment)
    || !SHA256_RE.test(input.consumedStateCommitment)
    || input.expectedStateCommitment !== qualification.stateCommitment
    || input.expectedStateCommitment === input.consumedStateCommitment
    || !POSITIVE_UINT_RE.test(input.expectedStateSequence)
    || !POSITIVE_UINT_RE.test(input.consumedStateSequence)
    || input.expectedStateSequence !== qualification.stateSequence
    || BigInt(input.consumedStateSequence) !== BigInt(input.expectedStateSequence) + 1n
    || !SHA256_RE.test(input.receiverCustodyCommitmentDigest)
    || !POSITIVE_UINT_RE.test(input.wholeValuePhiMicro)
    || !UINT_RE.test(input.acceptedAtKai)
    || !SHA256_RE.test(input.successorBasisDigest)
    || !input.rpId.trim()) fail();
  let origin: URL;
  try {
    origin = new URL(input.origin);
  } catch {
    fail();
  }
  if (origin.protocol !== "https:" || origin.origin !== input.origin) fail();
  const basis: WebAuthnConsumptionBasis = Object.freeze({
    schema: RECEIZ_OFFLINE_NOTE_WEBAUTHN_CONSUMPTION_SCHEMA,
    qualificationDigest: qualification.qualificationDigest,
    profileId: qualification.profileId,
    profileEvidenceDigest: qualification.profileEvidenceDigest,
    adapterKind: "pwa-webauthn",
    custodyPublicKeyAlgorithm: "P-256",
    custodyPublicKeyRawB64u: qualification.custodyPublicKeyRawB64u,
    installationCommitment: qualification.installationCommitment,
    noteId: input.noteId.trim(),
    predecessorArtifactSha256: input.predecessorArtifactSha256,
    currentCustodyCommitmentDigest: input.currentCustodyCommitmentDigest,
    expectedStateCommitment: input.expectedStateCommitment,
    consumedStateCommitment: input.consumedStateCommitment,
    expectedStateSequence: input.expectedStateSequence,
    consumedStateSequence: input.consumedStateSequence,
    receiverCustodyCommitmentDigest: input.receiverCustodyCommitmentDigest,
    wholeValuePhiMicro: input.wholeValuePhiMicro,
    acceptedAtKai: input.acceptedAtKai,
    successorBasisDigest: input.successorBasisDigest,
    rpId: input.rpId,
    origin: input.origin,
    activationReceipt,
  });
  const receiptDigest = await digestReceizAuthority(
    "transition",
    RECEIZ_OFFLINE_NOTE_WEBAUTHN_CONSUMPTION_SCHEMA,
    basis,
  );
  return Object.freeze({
    qualification,
    basis,
    receiptDigest,
    challengeB64u: receizBase64UrlEncode(hexToBytes(receiptDigest)),
  });
}

export async function finalizeReceizOfflineNoteWebAuthnConsumptionReceipt(input: Readonly<{
  prepared: ReceizOfflineNotePreparedWebAuthnConsumptionV1;
  authenticatorDataB64u: string;
  clientDataJSONB64u: string;
  signatureB64u: string;
}>): Promise<ReceizOfflineNoteWebAuthnConsumptionReceiptV1> {
  const receipt = Object.freeze({
    ...input.prepared.basis,
    receiptDigest: input.prepared.receiptDigest,
    authenticatorDataB64u: input.authenticatorDataB64u,
    clientDataJSONB64u: input.clientDataJSONB64u,
    signatureB64u: input.signatureB64u,
  });
  await verifyReceizOfflineNoteWebAuthnConsumptionReceipt(receipt);
  return receipt;
}

export async function verifyReceizOfflineNoteWebAuthnConsumptionReceipt(
  candidate: unknown,
): Promise<ReceizOfflineNoteWebAuthnConsumptionReceiptV1> {
  try {
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) fail();
    const record = candidate as Record<string, unknown>;
    exactKeys(record, [
      "schema", "qualificationDigest", "profileId", "profileEvidenceDigest", "adapterKind",
      "custodyPublicKeyAlgorithm", "custodyPublicKeyRawB64u", "installationCommitment", "noteId",
      "predecessorArtifactSha256", "currentCustodyCommitmentDigest", "expectedStateCommitment", "consumedStateCommitment",
      "expectedStateSequence", "consumedStateSequence", "receiverCustodyCommitmentDigest",
      "wholeValuePhiMicro", "acceptedAtKai", "successorBasisDigest", "rpId", "origin",
      "activationReceipt", "receiptDigest", "authenticatorDataB64u", "clientDataJSONB64u", "signatureB64u",
    ]);
    const receipt = record as unknown as ReceizOfflineNoteWebAuthnConsumptionReceiptV1;
    if (receipt.schema !== RECEIZ_OFFLINE_NOTE_WEBAUTHN_CONSUMPTION_SCHEMA
      || receipt.adapterKind !== "pwa-webauthn"
      || receipt.custodyPublicKeyAlgorithm !== "P-256"
      || !SHA256_RE.test(receipt.qualificationDigest)
      || !SHA256_RE.test(receipt.profileEvidenceDigest)
      || !SHA256_RE.test(receipt.installationCommitment)
      || !SHA256_RE.test(receipt.receiptDigest)) fail();
    const qualification = await createReceizOfflineNoteCustodyQualification({
      profileId: receipt.profileId,
      profileEvidenceDigest: receipt.profileEvidenceDigest,
      adapterKind: "pwa-webauthn",
      custodyPublicKeyRawB64u: receipt.custodyPublicKeyRawB64u,
      stateCommitment: receipt.expectedStateCommitment,
      stateSequence: receipt.expectedStateSequence,
    });
    if (qualification.qualificationDigest !== receipt.qualificationDigest
      || qualification.installationCommitment !== receipt.installationCommitment) fail();
    const prepared = await prepareReceizOfflineNoteWebAuthnConsumptionChallenge({
      qualification,
      activationReceipt: receipt.activationReceipt,
      noteId: receipt.noteId,
      predecessorArtifactSha256: receipt.predecessorArtifactSha256,
      currentCustodyCommitmentDigest: receipt.currentCustodyCommitmentDigest,
      expectedStateCommitment: receipt.expectedStateCommitment,
      consumedStateCommitment: receipt.consumedStateCommitment,
      expectedStateSequence: receipt.expectedStateSequence,
      consumedStateSequence: receipt.consumedStateSequence,
      receiverCustodyCommitmentDigest: receipt.receiverCustodyCommitmentDigest,
      wholeValuePhiMicro: receipt.wholeValuePhiMicro,
      acceptedAtKai: receipt.acceptedAtKai,
      successorBasisDigest: receipt.successorBasisDigest,
      rpId: receipt.rpId,
      origin: receipt.origin,
    });
    if (prepared.receiptDigest !== receipt.receiptDigest) fail();
    await verifyWebAuthnEvidence(receipt);
    return Object.freeze(structuredClone(receipt));
  } catch {
    fail();
  }
}
