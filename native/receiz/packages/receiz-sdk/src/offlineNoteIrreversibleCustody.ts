import { digestReceizAuthority } from "./authorityEncoding.js";
import { receizBase64UrlDecode, receizBase64UrlEncode } from "./identity.js";

export const RECEIZ_OFFLINE_NOTE_CUSTODY_QUALIFICATION_SCHEMA =
  "receiz.offline-note.custody-qualification.v1" as const;
export const RECEIZ_OFFLINE_NOTE_RECEIVING_CUSTODY_SCHEMA =
  "receiz.offline-note.receiving-custody.v1" as const;
export const RECEIZ_OFFLINE_NOTE_CONSUMPTION_SCHEMA =
  "receiz.offline-note.irreversible-consumption.v1" as const;

const SHA256_RE = /^[0-9a-f]{64}$/;
const BASE64URL_RE = /^[A-Za-z0-9_-]+$/;
const UINT_RE = /^(0|[1-9][0-9]*)$/;
const POSITIVE_UINT_RE = /^[1-9][0-9]*$/;
const CUSTODY_ADAPTER_KINDS = [
  "pwa-webauthn",
  "ios-secure",
  "android-hardware",
  "windows-tpm",
  "receiz-certified",
] as const;

export type ReceizOfflineNoteCustodyAdapterKind = (typeof CUSTODY_ADAPTER_KINDS)[number];

export type ReceizOfflineNoteCustodyQualificationV1 = Readonly<{
  schema: typeof RECEIZ_OFFLINE_NOTE_CUSTODY_QUALIFICATION_SCHEMA;
  status: "qualified";
  profileId: string;
  profileEvidenceDigest: string;
  adapterKind: ReceizOfflineNoteCustodyAdapterKind;
  custodyPublicKeyAlgorithm: "P-256";
  custodyPublicKeyRawB64u: string;
  installationCommitment: string;
  stateCommitment: string;
  stateSequence: string;
  qualificationDigest: string;
}>;

export type ReceizOfflineNoteReceivingCustodyCommitmentV1 = Readonly<{
  schema: typeof RECEIZ_OFFLINE_NOTE_RECEIVING_CUSTODY_SCHEMA;
  qualificationDigest: string;
  profileId: string;
  profileEvidenceDigest: string;
  adapterKind: ReceizOfflineNoteCustodyAdapterKind;
  custodyPublicKeyAlgorithm: "P-256";
  custodyPublicKeyRawB64u: string;
  installationCommitment: string;
  stateCommitment: string;
  stateSequence: string;
  receivingCustodyCommitmentDigest: string;
}>;

export type ReceizOfflineNoteIrreversibleConsumptionReceiptV1 = Readonly<{
  schema: typeof RECEIZ_OFFLINE_NOTE_CONSUMPTION_SCHEMA;
  qualificationDigest: string;
  profileId: string;
  profileEvidenceDigest: string;
  adapterKind: ReceizOfflineNoteCustodyAdapterKind;
  custodyPublicKeyAlgorithm: "P-256";
  custodyPublicKeyRawB64u: string;
  installationCommitment: string;
  noteId: string;
  predecessorArtifactSha256: string;
  expectedStateCommitment: string;
  consumedStateCommitment: string;
  expectedStateSequence: string;
  consumedStateSequence: string;
  receiverCustodyCommitmentDigest: string;
  wholeValuePhiMicro: string;
  acceptedAtKai: string;
  successorBasisDigest: string;
  receiptDigest: string;
  signatureB64u: string;
}>;

type QualificationBasis = Omit<ReceizOfflineNoteCustodyQualificationV1, "qualificationDigest">;
type ReceivingBasis = Omit<ReceizOfflineNoteReceivingCustodyCommitmentV1, "receivingCustodyCommitmentDigest">;
type ConsumptionBasis = Omit<ReceizOfflineNoteIrreversibleConsumptionReceiptV1, "receiptDigest" | "signatureB64u">;

function fail(code: string): never {
  throw new TypeError(code);
}

function exactKeys(value: Record<string, unknown>, keys: readonly string[], code: string): void {
  if (Object.keys(value).sort().join("\0") !== [...keys].sort().join("\0")) fail(code);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function strictArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.slice().buffer;
}

function signatureBytes(schema: string, digest: string): Uint8Array {
  return new TextEncoder().encode(`${schema}:${digest}`);
}

async function assertP256PublicKey(publicKeyRawB64u: string, code: string): Promise<CryptoKey> {
  try {
    if (!BASE64URL_RE.test(publicKeyRawB64u)) fail(code);
    return await crypto.subtle.importKey(
      "raw",
      strictArrayBuffer(receizBase64UrlDecode(publicKeyRawB64u)),
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["verify"],
    );
  } catch {
    fail(code);
  }
}

function assertAdapterKind(value: unknown, code: string): asserts value is ReceizOfflineNoteCustodyAdapterKind {
  if (typeof value !== "string" || !(CUSTODY_ADAPTER_KINDS as readonly string[]).includes(value)) fail(code);
}

function assertDigest(value: unknown, code: string): asserts value is string {
  if (typeof value !== "string" || !SHA256_RE.test(value)) fail(code);
}

function assertPositiveSequence(value: unknown, code: string): asserts value is string {
  if (typeof value !== "string" || !POSITIVE_UINT_RE.test(value)) fail(code);
}

function receivingBasis(value: ReceizOfflineNoteReceivingCustodyCommitmentV1): ReceivingBasis {
  const { receivingCustodyCommitmentDigest: _digest, ...basis } = value;
  return basis;
}

function consumptionBasis(value: ReceizOfflineNoteIrreversibleConsumptionReceiptV1): ConsumptionBasis {
  const { receiptDigest: _digest, signatureB64u: _signature, ...basis } = value;
  return basis;
}

export async function createReceizOfflineNoteCustodyQualification(input: Readonly<{
  profileId: string;
  profileEvidenceDigest: string;
  adapterKind: ReceizOfflineNoteCustodyAdapterKind;
  custodyPublicKeyRawB64u: string;
  stateCommitment: string;
  stateSequence: string;
}>): Promise<ReceizOfflineNoteCustodyQualificationV1> {
  const code = "RECEIZ_OFFLINE_NOTE_CUSTODY_QUALIFICATION_INVALID";
  const profileId = input.profileId.trim();
  if (!profileId) fail(code);
  assertDigest(input.profileEvidenceDigest, code);
  assertAdapterKind(input.adapterKind, code);
  await assertP256PublicKey(input.custodyPublicKeyRawB64u, code);
  assertDigest(input.stateCommitment, code);
  assertPositiveSequence(input.stateSequence, code);
  const installationCommitment = await digestReceizAuthority(
    "identity",
    "receiz.offline-note.irreversible-installation.v1",
    {
      profileId,
      profileEvidenceDigest: input.profileEvidenceDigest,
      adapterKind: input.adapterKind,
      custodyPublicKeyAlgorithm: "P-256",
      custodyPublicKeyRawB64u: input.custodyPublicKeyRawB64u,
    },
  );
  const basis: QualificationBasis = Object.freeze({
    schema: RECEIZ_OFFLINE_NOTE_CUSTODY_QUALIFICATION_SCHEMA,
    status: "qualified",
    profileId,
    profileEvidenceDigest: input.profileEvidenceDigest,
    adapterKind: input.adapterKind,
    custodyPublicKeyAlgorithm: "P-256",
    custodyPublicKeyRawB64u: input.custodyPublicKeyRawB64u,
    installationCommitment,
    stateCommitment: input.stateCommitment,
    stateSequence: input.stateSequence,
  });
  return Object.freeze({
    ...basis,
    qualificationDigest: await digestReceizAuthority(
      "identity",
      RECEIZ_OFFLINE_NOTE_CUSTODY_QUALIFICATION_SCHEMA,
      basis,
    ),
  });
}

export async function verifyReceizOfflineNoteCustodyQualification(
  candidate: unknown,
): Promise<ReceizOfflineNoteCustodyQualificationV1> {
  const code = "RECEIZ_OFFLINE_NOTE_CUSTODY_QUALIFICATION_INVALID";
  try {
    if (!isRecord(candidate)) fail(code);
    exactKeys(candidate, [
      "schema", "status", "profileId", "profileEvidenceDigest", "adapterKind",
      "custodyPublicKeyAlgorithm", "custodyPublicKeyRawB64u", "installationCommitment",
      "stateCommitment", "stateSequence", "qualificationDigest",
    ], code);
    if (candidate.schema !== RECEIZ_OFFLINE_NOTE_CUSTODY_QUALIFICATION_SCHEMA
      || candidate.status !== "qualified"
      || typeof candidate.profileId !== "string"
      || !candidate.profileId.trim()
      || candidate.custodyPublicKeyAlgorithm !== "P-256") fail(code);
    assertDigest(candidate.profileEvidenceDigest, code);
    assertAdapterKind(candidate.adapterKind, code);
    if (typeof candidate.custodyPublicKeyRawB64u !== "string") fail(code);
    await assertP256PublicKey(candidate.custodyPublicKeyRawB64u, code);
    assertDigest(candidate.installationCommitment, code);
    assertDigest(candidate.stateCommitment, code);
    assertPositiveSequence(candidate.stateSequence, code);
    assertDigest(candidate.qualificationDigest, code);
    const recreated = await createReceizOfflineNoteCustodyQualification({
      profileId: candidate.profileId,
      profileEvidenceDigest: candidate.profileEvidenceDigest,
      adapterKind: candidate.adapterKind,
      custodyPublicKeyRawB64u: candidate.custodyPublicKeyRawB64u,
      stateCommitment: candidate.stateCommitment,
      stateSequence: candidate.stateSequence,
    });
    if (recreated.installationCommitment !== candidate.installationCommitment
      || recreated.qualificationDigest !== candidate.qualificationDigest) fail(code);
    return Object.freeze(structuredClone(candidate)) as ReceizOfflineNoteCustodyQualificationV1;
  } catch {
    fail(code);
  }
}

export async function createReceizOfflineNoteReceivingCustodyCommitment(
  qualificationInput: ReceizOfflineNoteCustodyQualificationV1,
): Promise<ReceizOfflineNoteReceivingCustodyCommitmentV1> {
  const qualification = await verifyReceizOfflineNoteCustodyQualification(qualificationInput);
  const basis: ReceivingBasis = Object.freeze({
    schema: RECEIZ_OFFLINE_NOTE_RECEIVING_CUSTODY_SCHEMA,
    qualificationDigest: qualification.qualificationDigest,
    profileId: qualification.profileId,
    profileEvidenceDigest: qualification.profileEvidenceDigest,
    adapterKind: qualification.adapterKind,
    custodyPublicKeyAlgorithm: qualification.custodyPublicKeyAlgorithm,
    custodyPublicKeyRawB64u: qualification.custodyPublicKeyRawB64u,
    installationCommitment: qualification.installationCommitment,
    stateCommitment: qualification.stateCommitment,
    stateSequence: qualification.stateSequence,
  });
  return Object.freeze({
    ...basis,
    receivingCustodyCommitmentDigest: await digestReceizAuthority(
      "identity",
      RECEIZ_OFFLINE_NOTE_RECEIVING_CUSTODY_SCHEMA,
      basis,
    ),
  });
}

export async function verifyReceizOfflineNoteReceivingCustodyCommitment(
  candidate: unknown,
): Promise<ReceizOfflineNoteReceivingCustodyCommitmentV1> {
  const code = "RECEIZ_OFFLINE_NOTE_RECEIVING_CUSTODY_COMMITMENT_INVALID";
  try {
    if (!isRecord(candidate)) fail(code);
    exactKeys(candidate, [
      "schema", "qualificationDigest", "profileId", "profileEvidenceDigest", "adapterKind",
      "custodyPublicKeyAlgorithm", "custodyPublicKeyRawB64u", "installationCommitment",
      "stateCommitment", "stateSequence", "receivingCustodyCommitmentDigest",
    ], code);
    if (candidate.schema !== RECEIZ_OFFLINE_NOTE_RECEIVING_CUSTODY_SCHEMA
      || typeof candidate.profileId !== "string"
      || !candidate.profileId.trim()
      || candidate.custodyPublicKeyAlgorithm !== "P-256"
      || typeof candidate.custodyPublicKeyRawB64u !== "string") fail(code);
    assertDigest(candidate.qualificationDigest, code);
    assertDigest(candidate.profileEvidenceDigest, code);
    assertAdapterKind(candidate.adapterKind, code);
    await assertP256PublicKey(candidate.custodyPublicKeyRawB64u, code);
    assertDigest(candidate.installationCommitment, code);
    assertDigest(candidate.stateCommitment, code);
    assertPositiveSequence(candidate.stateSequence, code);
    assertDigest(candidate.receivingCustodyCommitmentDigest, code);
    const basis = receivingBasis(candidate as unknown as ReceizOfflineNoteReceivingCustodyCommitmentV1);
    const digest = await digestReceizAuthority("identity", RECEIZ_OFFLINE_NOTE_RECEIVING_CUSTODY_SCHEMA, basis);
    if (digest !== candidate.receivingCustodyCommitmentDigest) fail(code);
    return Object.freeze(structuredClone(candidate)) as ReceizOfflineNoteReceivingCustodyCommitmentV1;
  } catch {
    fail(code);
  }
}

export async function deriveReceizOfflineNoteCustodyOwnerId(
  commitmentInput: ReceizOfflineNoteReceivingCustodyCommitmentV1,
): Promise<`c_${string}.receiz.id`> {
  const commitment = await verifyReceizOfflineNoteReceivingCustodyCommitment(commitmentInput);
  return `c_${commitment.receivingCustodyCommitmentDigest.slice(0, 22)}.receiz.id`;
}

export async function createReceizOfflineNoteIrreversibleConsumptionReceipt(input: Readonly<{
  qualification: ReceizOfflineNoteCustodyQualificationV1;
  privateKey: CryptoKey;
  noteId: string;
  predecessorArtifactSha256: string;
  expectedStateCommitment: string;
  consumedStateCommitment: string;
  expectedStateSequence: string;
  consumedStateSequence: string;
  receiverCustodyCommitmentDigest: string;
  wholeValuePhiMicro: string;
  acceptedAtKai: string;
  successorBasisDigest: string;
}>): Promise<ReceizOfflineNoteIrreversibleConsumptionReceiptV1> {
  const code = "RECEIZ_OFFLINE_NOTE_CONSUMPTION_RECEIPT_INVALID";
  const qualification = await verifyReceizOfflineNoteCustodyQualification(input.qualification);
  const noteId = input.noteId.trim();
  if (!noteId) fail(code);
  assertDigest(input.predecessorArtifactSha256, code);
  assertDigest(input.expectedStateCommitment, code);
  assertDigest(input.consumedStateCommitment, code);
  assertPositiveSequence(input.expectedStateSequence, code);
  assertPositiveSequence(input.consumedStateSequence, code);
  if (BigInt(input.consumedStateSequence) !== BigInt(input.expectedStateSequence) + 1n
    || input.expectedStateCommitment === input.consumedStateCommitment
    || input.expectedStateCommitment !== qualification.stateCommitment
    || input.expectedStateSequence !== qualification.stateSequence) fail(code);
  assertDigest(input.receiverCustodyCommitmentDigest, code);
  if (!POSITIVE_UINT_RE.test(input.wholeValuePhiMicro) || !UINT_RE.test(input.acceptedAtKai)) fail(code);
  assertDigest(input.successorBasisDigest, code);
  const basis: ConsumptionBasis = Object.freeze({
    schema: RECEIZ_OFFLINE_NOTE_CONSUMPTION_SCHEMA,
    qualificationDigest: qualification.qualificationDigest,
    profileId: qualification.profileId,
    profileEvidenceDigest: qualification.profileEvidenceDigest,
    adapterKind: qualification.adapterKind,
    custodyPublicKeyAlgorithm: qualification.custodyPublicKeyAlgorithm,
    custodyPublicKeyRawB64u: qualification.custodyPublicKeyRawB64u,
    installationCommitment: qualification.installationCommitment,
    noteId,
    predecessorArtifactSha256: input.predecessorArtifactSha256,
    expectedStateCommitment: input.expectedStateCommitment,
    consumedStateCommitment: input.consumedStateCommitment,
    expectedStateSequence: input.expectedStateSequence,
    consumedStateSequence: input.consumedStateSequence,
    receiverCustodyCommitmentDigest: input.receiverCustodyCommitmentDigest,
    wholeValuePhiMicro: input.wholeValuePhiMicro,
    acceptedAtKai: input.acceptedAtKai,
    successorBasisDigest: input.successorBasisDigest,
  });
  const receiptDigest = await digestReceizAuthority("transition", RECEIZ_OFFLINE_NOTE_CONSUMPTION_SCHEMA, basis);
  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    input.privateKey,
    strictArrayBuffer(signatureBytes(RECEIZ_OFFLINE_NOTE_CONSUMPTION_SCHEMA, receiptDigest)),
  );
  return Object.freeze({
    ...basis,
    receiptDigest,
    signatureB64u: receizBase64UrlEncode(new Uint8Array(signature)),
  });
}

export async function verifyReceizOfflineNoteIrreversibleConsumptionReceipt(
  candidate: unknown,
): Promise<ReceizOfflineNoteIrreversibleConsumptionReceiptV1> {
  const code = "RECEIZ_OFFLINE_NOTE_CONSUMPTION_RECEIPT_INVALID";
  try {
    if (!isRecord(candidate)) fail(code);
    exactKeys(candidate, [
      "schema", "qualificationDigest", "profileId", "profileEvidenceDigest", "adapterKind",
      "custodyPublicKeyAlgorithm", "custodyPublicKeyRawB64u", "installationCommitment", "noteId",
      "predecessorArtifactSha256", "expectedStateCommitment", "consumedStateCommitment",
      "expectedStateSequence", "consumedStateSequence", "receiverCustodyCommitmentDigest",
      "wholeValuePhiMicro", "acceptedAtKai", "successorBasisDigest", "receiptDigest", "signatureB64u",
    ], code);
    if (candidate.schema !== RECEIZ_OFFLINE_NOTE_CONSUMPTION_SCHEMA
      || typeof candidate.profileId !== "string"
      || !candidate.profileId.trim()
      || candidate.custodyPublicKeyAlgorithm !== "P-256"
      || typeof candidate.custodyPublicKeyRawB64u !== "string"
      || typeof candidate.noteId !== "string"
      || !candidate.noteId.trim()
      || typeof candidate.signatureB64u !== "string"
      || !BASE64URL_RE.test(candidate.signatureB64u)) fail(code);
    assertDigest(candidate.qualificationDigest, code);
    assertDigest(candidate.profileEvidenceDigest, code);
    assertAdapterKind(candidate.adapterKind, code);
    assertDigest(candidate.installationCommitment, code);
    assertDigest(candidate.predecessorArtifactSha256, code);
    assertDigest(candidate.expectedStateCommitment, code);
    assertDigest(candidate.consumedStateCommitment, code);
    assertPositiveSequence(candidate.expectedStateSequence, code);
    assertPositiveSequence(candidate.consumedStateSequence, code);
    if (BigInt(candidate.consumedStateSequence) !== BigInt(candidate.expectedStateSequence) + 1n
      || candidate.expectedStateCommitment === candidate.consumedStateCommitment) fail(code);
    assertDigest(candidate.receiverCustodyCommitmentDigest, code);
    if (typeof candidate.wholeValuePhiMicro !== "string"
      || !POSITIVE_UINT_RE.test(candidate.wholeValuePhiMicro)
      || typeof candidate.acceptedAtKai !== "string"
      || !UINT_RE.test(candidate.acceptedAtKai)) fail(code);
    assertDigest(candidate.successorBasisDigest, code);
    assertDigest(candidate.receiptDigest, code);
    const typed = candidate as unknown as ReceizOfflineNoteIrreversibleConsumptionReceiptV1;
    const digest = await digestReceizAuthority("transition", RECEIZ_OFFLINE_NOTE_CONSUMPTION_SCHEMA, consumptionBasis(typed));
    if (digest !== candidate.receiptDigest) fail(code);
    const publicKey = await assertP256PublicKey(candidate.custodyPublicKeyRawB64u, code);
    const verified = await crypto.subtle.verify(
      { name: "ECDSA", hash: "SHA-256" },
      publicKey,
      strictArrayBuffer(receizBase64UrlDecode(candidate.signatureB64u)),
      strictArrayBuffer(signatureBytes(RECEIZ_OFFLINE_NOTE_CONSUMPTION_SCHEMA, candidate.receiptDigest)),
    );
    if (!verified) fail(code);
    return Object.freeze(structuredClone(candidate)) as ReceizOfflineNoteIrreversibleConsumptionReceiptV1;
  } catch {
    fail(code);
  }
}
