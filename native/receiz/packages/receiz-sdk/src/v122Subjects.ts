import { snapshotReceizArtifactInput, type ReceizArtifactInput } from "./artifactInput.js";
import { digestReceizCanonicalV122, deriveReceizSubjectIdV122, type ReceizV122ZeroWriteValidationFailure } from "./v122Canonical.js";

const SHA256 = /^[0-9a-f]{64}$/;

export type ReceizSubjectAdmissionInputV122 = Readonly<{
  proofObject: ReceizArtifactInput;
  ownerReceizId: string;
  idempotencyKey: string;
  expectedAbsent: true;
}>;

export type ReceizSnapshottedSubjectAdmissionInputV122 = Readonly<{
  proofObject: Readonly<{ exactBytes: Uint8Array; filename: string; mimeType: string }>;
  ownerReceizId: string;
  idempotencyKey: string;
  expectedAbsent: true;
}>;

export type ReceizSubjectAdmissionReceiptV122 = Readonly<{
  schema: "receiz.subject.admission-receipt.v122";
  subjectId: string;
  proofObjectId: string;
  admittedProofDigest: string;
  immutableProofVersion: string;
  ownerReceizId: string;
  ownerProofDigest: string;
  genesisHead: string;
  registryDigest: string;
  reducerDigest: string;
  kai: number;
  idempotencyIdentityDigest: string;
  authority: Readonly<{
    receiptIsProofAuthority: false;
    strongerTruth: "sealed-receiz-proof-object";
  }>;
  receiptDigest: string;
}>;

export type ReceizSubjectAdmissionSuccessV122 = Readonly<{
  ok: true;
  subjectId: string;
  head: string;
  proofDigest: string;
  registryDigest: string;
  reducerDigest: string;
  receipt: ReceizSubjectAdmissionReceiptV122;
}>;

export const RECEIZ_SUBJECT_ADMISSION_FAILURE_CODES_V122 = [
  "IDEMPOTENCY_CONFLICT",
  "SUBJECT_PROOF_CONFLICT",
  "SUBJECT_OWNER_CONFLICT",
  "INVALID_ENCLOSING_PROOF",
  "INVALID_OWNER_PROOF",
  "REGISTRY_INCOMPATIBLE",
  "REDUCER_INCOMPATIBLE",
  "EXACT_BYTES_INVALID",
  "UNAUTHORIZED",
] as const;

export type ReceizSubjectAdmissionFailureCodeV122 = (typeof RECEIZ_SUBJECT_ADMISSION_FAILURE_CODES_V122)[number];
export type ReceizSubjectAdmissionFailureV122 = Readonly<{
  ok: false;
  code: ReceizSubjectAdmissionFailureCodeV122;
  writes: 0;
}>;
export type ReceizSubjectAdmissionResultV122 = ReceizSubjectAdmissionSuccessV122 | ReceizSubjectAdmissionFailureV122;

export type ReceizSubjectStateV122 = Readonly<{
  schema: "receiz.subject.state.v122";
  subjectId: string;
  proofObjectId: string;
  admittedProofDigest: string;
  immutableProofVersion: string;
  subjectType: string;
  opaqueNamespaces: readonly Readonly<{ namespace: string; exactBytesB64u: string; digest: string }>[];
  genesisHead: string;
  head: string;
  ownerReceizId: string;
  ownershipHead: string;
  ownerProofDigest: string;
  registryDigest: string;
  reducerDigest: string;
  admissionReceipt: ReceizSubjectAdmissionReceiptV122;
  causalParents: readonly string[];
  accessKeyHead: string | null;
  replay: Readonly<{ appendCursor: string; eventCursor: string }>;
  authority: Readonly<{
    stateIsProofAuthority: false;
    strongerTruth: "sealed-receiz-proof-object";
  }>;
  stateDigest: string;
}>;

export type ReceizSubjectStateVerificationResultV122 =
  | Readonly<{ ok: true; state: ReceizSubjectStateV122 }>
  | ReceizV122ZeroWriteValidationFailure<
      | "subject_state_invalid"
      | "subject_identity_mismatch"
      | "subject_admission_receipt_mismatch"
      | "subject_admission_receipt_unauthenticated"
      | "subject_state_digest_mismatch"
      | "subject_state_unauthenticated"
    >;

export type ReceizSubjectStateAuthenticatorV122 = Readonly<{
  authenticateAdmissionReceipt: (receipt: ReceizSubjectAdmissionReceiptV122) => boolean | Promise<boolean>;
  authenticateState: (input: Readonly<{ state: ReceizSubjectStateV122; stateDigest: string }>) => boolean | Promise<boolean>;
}>;

function fail(code: string): never {
  throw new TypeError(code);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Reflect.ownKeys(value);
  return actual.every((key) => typeof key === "string")
    && actual.length === keys.length
    && keys.every((key) => Object.prototype.propertyIsEnumerable.call(value, key));
}

function text(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function digest(value: unknown): value is string {
  return typeof value === "string" && SHA256.test(value);
}

function receiptStructurallyValid(value: unknown): value is ReceizSubjectAdmissionReceiptV122 {
  if (!isRecord(value) || !hasExactKeys(value, [
    "schema", "subjectId", "proofObjectId", "admittedProofDigest", "immutableProofVersion",
    "ownerReceizId", "ownerProofDigest", "genesisHead", "registryDigest", "reducerDigest",
    "kai", "idempotencyIdentityDigest", "authority", "receiptDigest",
  ])) return false;
  if (!isRecord(value.authority) || !hasExactKeys(value.authority, ["receiptIsProofAuthority", "strongerTruth"])) return false;
  return value.schema === "receiz.subject.admission-receipt.v122"
    && text(value.subjectId)
    && text(value.proofObjectId)
    && digest(value.admittedProofDigest)
    && text(value.immutableProofVersion)
    && text(value.ownerReceizId)
    && digest(value.ownerProofDigest)
    && digest(value.genesisHead)
    && digest(value.registryDigest)
    && digest(value.reducerDigest)
    && Number.isSafeInteger(value.kai)
    && Number(value.kai) >= 0
    && digest(value.idempotencyIdentityDigest)
    && value.authority.receiptIsProofAuthority === false
    && value.authority.strongerTruth === "sealed-receiz-proof-object"
    && digest(value.receiptDigest);
}

export async function validateReceizSubjectAdmissionInputV122(
  value: ReceizSubjectAdmissionInputV122,
): Promise<ReceizSnapshottedSubjectAdmissionInputV122> {
  if (value.expectedAbsent !== true) fail("V122_SUBJECT_EXPECTED_ABSENT_REQUIRED");
  const ownerReceizId = value.ownerReceizId?.trim();
  const idempotencyKey = value.idempotencyKey?.trim();
  if (!ownerReceizId) fail("V122_SUBJECT_OWNER_REQUIRED");
  if (!idempotencyKey) fail("V122_SUBJECT_IDEMPOTENCY_REQUIRED");
  const snapshot = await snapshotReceizArtifactInput(value.proofObject);
  return Object.freeze({
    proofObject: Object.freeze({ exactBytes: snapshot.bytes.slice(), filename: snapshot.filename, mimeType: snapshot.mimeType }),
    ownerReceizId,
    idempotencyKey,
    expectedAbsent: true,
  });
}

export async function validateReceizSubjectAdmissionResultV122(value: unknown): Promise<ReceizSubjectAdmissionResultV122> {
  if (!isRecord(value) || typeof value.ok !== "boolean") fail("V122_SUBJECT_ADMISSION_RESULT_INVALID");
  if (value.ok === true) {
    if (!hasExactKeys(value, ["ok", "subjectId", "head", "proofDigest", "registryDigest", "reducerDigest", "receipt"])) {
      fail("V122_SUBJECT_ADMISSION_RESULT_KEYS_INVALID");
    }
    if (!text(value.subjectId) || !digest(value.head) || !digest(value.proofDigest)
      || !digest(value.registryDigest) || !digest(value.reducerDigest) || !receiptStructurallyValid(value.receipt)) {
      fail("V122_SUBJECT_ADMISSION_SUCCESS_INVALID");
    }
    if (value.subjectId !== value.receipt.subjectId || value.head !== value.receipt.genesisHead
      || value.proofDigest !== value.receipt.admittedProofDigest
      || value.registryDigest !== value.receipt.registryDigest || value.reducerDigest !== value.receipt.reducerDigest) {
      fail("V122_SUBJECT_ADMISSION_SUCCESS_RECEIPT_MISMATCH");
    }
    const { receiptDigest, ...receiptBasis } = value.receipt;
    if (await deriveReceizSubjectIdV122(value.proofDigest) !== value.subjectId
      || await digestReceizCanonicalV122(receiptBasis) !== receiptDigest) {
      fail("V122_SUBJECT_ADMISSION_SUCCESS_RECEIPT_MISMATCH");
    }
    return value as unknown as ReceizSubjectAdmissionSuccessV122;
  }
  if (!hasExactKeys(value, ["ok", "code", "writes"])) fail("V122_SUBJECT_ADMISSION_RESULT_KEYS_INVALID");
  if (!(RECEIZ_SUBJECT_ADMISSION_FAILURE_CODES_V122 as readonly unknown[]).includes(value.code)) {
    fail("V122_SUBJECT_FAILURE_CODE_INVALID");
  }
  if (value.writes !== 0) fail("V122_SUBJECT_FAILURE_WRITES_INVALID");
  return value as unknown as ReceizSubjectAdmissionFailureV122;
}

function stateStructurallyValid(value: unknown): value is ReceizSubjectStateV122 {
  if (!isRecord(value) || !hasExactKeys(value, [
    "schema", "subjectId", "proofObjectId", "admittedProofDigest", "immutableProofVersion", "subjectType",
    "opaqueNamespaces", "genesisHead", "head", "ownerReceizId", "ownershipHead", "ownerProofDigest",
    "registryDigest", "reducerDigest", "admissionReceipt", "causalParents", "accessKeyHead", "replay",
    "authority", "stateDigest",
  ])) return false;
  if (!Array.isArray(value.opaqueNamespaces) || !Array.isArray(value.causalParents)
    || !isRecord(value.replay) || !hasExactKeys(value.replay, ["appendCursor", "eventCursor"])
    || !isRecord(value.authority) || !hasExactKeys(value.authority, ["stateIsProofAuthority", "strongerTruth"])) return false;
  const opaqueNamespacesValid = value.opaqueNamespaces.every((entry) => isRecord(entry)
    && hasExactKeys(entry, ["namespace", "exactBytesB64u", "digest"])
    && text(entry.namespace) && typeof entry.exactBytesB64u === "string" && digest(entry.digest));
  return value.schema === "receiz.subject.state.v122"
    && text(value.subjectId) && text(value.proofObjectId) && digest(value.admittedProofDigest)
    && text(value.immutableProofVersion) && text(value.subjectType) && opaqueNamespacesValid
    && digest(value.genesisHead) && digest(value.head) && text(value.ownerReceizId)
    && digest(value.ownershipHead) && digest(value.ownerProofDigest) && digest(value.registryDigest)
    && digest(value.reducerDigest) && receiptStructurallyValid(value.admissionReceipt)
    && value.causalParents.every(digest) && (value.accessKeyHead === null || digest(value.accessKeyHead))
    && text(value.replay.appendCursor) && text(value.replay.eventCursor)
    && value.authority.stateIsProofAuthority === false
    && value.authority.strongerTruth === "sealed-receiz-proof-object"
    && digest(value.stateDigest);
}

export async function verifyReceizAuthenticatedSubjectStateV122(
  value: unknown,
  authenticator: ReceizSubjectStateAuthenticatorV122,
): Promise<ReceizSubjectStateVerificationResultV122> {
  if (!stateStructurallyValid(value)) return { ok: false, code: "subject_state_invalid", writesOnFailure: 0 };
  if (await deriveReceizSubjectIdV122(value.admittedProofDigest) !== value.subjectId) {
    return { ok: false, code: "subject_identity_mismatch", writesOnFailure: 0 };
  }
  const { receiptDigest, ...receiptBasis } = value.admissionReceipt;
  if (await digestReceizCanonicalV122(receiptBasis) !== receiptDigest
    || value.admissionReceipt.subjectId !== value.subjectId
    || value.admissionReceipt.proofObjectId !== value.proofObjectId
    || value.admissionReceipt.admittedProofDigest !== value.admittedProofDigest
    || value.admissionReceipt.genesisHead !== value.genesisHead
    || value.admissionReceipt.ownerReceizId !== value.ownerReceizId
    || value.admissionReceipt.ownerProofDigest !== value.ownerProofDigest
    || value.admissionReceipt.registryDigest !== value.registryDigest
    || value.admissionReceipt.reducerDigest !== value.reducerDigest) {
    return { ok: false, code: "subject_admission_receipt_mismatch", writesOnFailure: 0 };
  }
  const { stateDigest, ...stateBasis } = value;
  if (await digestReceizCanonicalV122(stateBasis) !== stateDigest) {
    return { ok: false, code: "subject_state_digest_mismatch", writesOnFailure: 0 };
  }
  if (!await authenticator.authenticateAdmissionReceipt(value.admissionReceipt)) {
    return { ok: false, code: "subject_admission_receipt_unauthenticated", writesOnFailure: 0 };
  }
  if (!await authenticator.authenticateState({ state: value, stateDigest: value.stateDigest })) {
    return { ok: false, code: "subject_state_unauthenticated", writesOnFailure: 0 };
  }
  return { ok: true, state: value };
}
