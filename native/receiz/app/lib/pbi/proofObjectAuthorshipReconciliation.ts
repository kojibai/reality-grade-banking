import {
  verifyReceizPbiProofObjectAuthorshipChainV1,
  type ReceizPbiProofObjectAuthorshipAppendV1,
} from "../../../packages/receiz-sdk/src/proofObjectAuthorship";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";
import type { VerifiedLocalPbiAuthorshipAppend } from "@/app/lib/pbi/localAuthorshipAppend";
import { jcsCanonicalize } from "@/app/utils/jcs";

const INPUT_KIND = "proof-object-authorship-reconciliation";
const QUEUE_STATUS = "reconciliation-queued";
const GLOBAL_PROOF_STATUS = "pending-artifact-admission";
const ARTIFACT_DIGEST_AUTHORITY = "unverified-locator";
const RECONCILIATION_DIGEST_SCHEMA =
  "receiz.pbi.proof-object-authorship.reconciliation-queue-digest.v1";
const RECONCILIATION_ID_SCHEMA =
  "receiz.pbi.proof-object-authorship.reconciliation-queue-id.v1";
const ACK_SCHEMA =
  "receiz.pbi.proof-object-authorship.reconciliation-queue-ack.v1";
const COMPACT_RECEIPT_SCHEMA =
  "receiz.pbi.proof-object-authorship.reconciliation-queue-receipt.v1";
const HEX64_RE = /^[0-9a-f]{64}$/;
const TEXT_ENCODER = new TextEncoder();
const INPUT_KEYS = new Set([
  "kind",
  "artifactDigestLocator",
  "predecessorArtifactSha256",
  "appendHeadSha256",
  "pbiReceiptHash",
  "receizId",
  "createdAt",
  "authorshipHistory",
]);
const QUEUED_RECONCILIATION_KEYS = new Set([
  ...INPUT_KEYS,
  "queueStatus",
  "globalProofStatus",
  "artifactDigestAuthority",
]);
const ACK_KEYS = new Set([
  "schema",
  "queueStatus",
  "globalProofStatus",
  "artifactDigestAuthority",
  "actionHashHex",
  "reconciliationDigestSha256",
  "reconciliationId",
  "reconciliation",
]);
const COMPACT_RECEIPT_KEYS = new Set([
  "schema",
  "actionHashHex",
  "queueStatus",
  "globalProofStatus",
  "artifactDigestAuthority",
  "reconciliationDigestSha256",
  "reconciliationId",
  "artifactDigestLocator",
  "predecessorArtifactSha256",
  "appendHeadSha256",
  "pbiReceiptHash",
  "receizId",
  "authorshipCreatedAt",
  "queuedAtMs",
]);

export type LocalPbiProofObjectAuthorshipReconciliationInput = Readonly<{
  kind: typeof INPUT_KIND;
  artifactDigestLocator: string;
  predecessorArtifactSha256: string;
  appendHeadSha256: string;
  pbiReceiptHash: string;
  receizId: string;
  createdAt: string;
  authorshipHistory: readonly ReceizPbiProofObjectAuthorshipAppendV1[];
}>;

export type LocalPbiQueuedProofObjectAuthorshipReconciliation =
  LocalPbiProofObjectAuthorshipReconciliationInput
  & Readonly<{
    queueStatus: typeof QUEUE_STATUS;
    globalProofStatus: typeof GLOBAL_PROOF_STATUS;
    artifactDigestAuthority: typeof ARTIFACT_DIGEST_AUTHORITY;
  }>;

export type DurableProofObjectAuthorshipReconciliationRow = Readonly<{
  storageRecordId: string;
  reconciliationDigestSha256: string;
  actionHashHex: string;
  ownerUserId: string;
  sourceReceizId: string | null;
  artifactDigestLocator: string;
  artifactDigestAuthority: typeof ARTIFACT_DIGEST_AUTHORITY;
  globalProofStatus: typeof GLOBAL_PROOF_STATUS;
  queueStatus: typeof QUEUE_STATUS;
  predecessorArtifactSha256: string;
  appendHeadSha256: string;
  pbiReceiptHash: string;
  receizId: string;
  createdAt: string;
  reconciliation: LocalPbiQueuedProofObjectAuthorshipReconciliation;
}>;

export type LocalPbiProofObjectAuthorshipReconciliationAck = Readonly<{
  schema: typeof ACK_SCHEMA;
  queueStatus: typeof QUEUE_STATUS;
  globalProofStatus: typeof GLOBAL_PROOF_STATUS;
  artifactDigestAuthority: typeof ARTIFACT_DIGEST_AUTHORITY;
  actionHashHex: string;
  reconciliationDigestSha256: string;
  reconciliationId: string;
  reconciliation: LocalPbiQueuedProofObjectAuthorshipReconciliation;
}>;

export type LocalPbiProofObjectAuthorshipReconciliationReceipt = Readonly<{
  schema: typeof COMPACT_RECEIPT_SCHEMA;
  actionHashHex: string;
  queueStatus: typeof QUEUE_STATUS;
  globalProofStatus: typeof GLOBAL_PROOF_STATUS;
  artifactDigestAuthority: typeof ARTIFACT_DIGEST_AUTHORITY;
  reconciliationDigestSha256: string;
  reconciliationId: string;
  artifactDigestLocator: string;
  predecessorArtifactSha256: string;
  appendHeadSha256: string;
  pbiReceiptHash: string;
  receizId: string;
  authorshipCreatedAt: string;
  queuedAtMs: number;
}>;

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function exactEnumerableDataKeys(value: object, expected: ReadonlySet<string>): boolean {
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return false;
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const keys = Reflect.ownKeys(value);
  return (
    keys.length === expected.size
    && keys.every((key) =>
      typeof key === "string"
      && expected.has(key)
      && descriptors[key]?.enumerable === true
      && "value" in descriptors[key]!)
  );
}

function canonicalHistory(
  value: unknown,
): readonly ReceizPbiProofObjectAuthorshipAppendV1[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  try {
    return Object.freeze(
      JSON.parse(jcsCanonicalize(value)) as ReceizPbiProofObjectAuthorshipAppendV1[],
    );
  } catch {
    return null;
  }
}

function exactChronos(value: unknown): string | null {
  const text = normalizeText(value);
  try {
    return new Date(text).toISOString() === text ? text : null;
  } catch {
    return null;
  }
}

export function normalizeLocalPbiProofObjectAuthorshipReconciliationInput(
  value: unknown,
): LocalPbiProofObjectAuthorshipReconciliationInput | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  if (!exactEnumerableDataKeys(value, INPUT_KEYS)) return null;
  const record = value as Record<string, unknown>;
  const artifactDigestLocator =
    normalizeText(record.artifactDigestLocator).toLowerCase();
  const predecessorArtifactSha256 =
    normalizeText(record.predecessorArtifactSha256).toLowerCase();
  const appendHeadSha256 = normalizeText(record.appendHeadSha256).toLowerCase();
  const pbiReceiptHash = normalizeText(record.pbiReceiptHash).toLowerCase();
  const receizId = normalizeText(record.receizId).toLowerCase();
  const createdAt = exactChronos(record.createdAt);
  const authorshipHistory = canonicalHistory(record.authorshipHistory);
  if (
    record.kind !== INPUT_KIND
    || !HEX64_RE.test(artifactDigestLocator)
    || !HEX64_RE.test(predecessorArtifactSha256)
    || artifactDigestLocator === predecessorArtifactSha256
    || !HEX64_RE.test(appendHeadSha256)
    || !HEX64_RE.test(pbiReceiptHash)
    || !HEX64_RE.test(receizId)
    || !createdAt
    || !authorshipHistory
  ) {
    return null;
  }
  return Object.freeze({
    kind: INPUT_KIND,
    artifactDigestLocator,
    predecessorArtifactSha256,
    appendHeadSha256,
    pbiReceiptHash,
    receizId,
    createdAt,
    authorshipHistory,
  });
}

function normalizeQueuedReconciliation(
  value: unknown,
): LocalPbiQueuedProofObjectAuthorshipReconciliation | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  if (!exactEnumerableDataKeys(value, QUEUED_RECONCILIATION_KEYS)) return null;
  const record = value as Record<string, unknown>;
  const input = normalizeLocalPbiProofObjectAuthorshipReconciliationInput({
    kind: record.kind,
    artifactDigestLocator: record.artifactDigestLocator,
    predecessorArtifactSha256: record.predecessorArtifactSha256,
    appendHeadSha256: record.appendHeadSha256,
    pbiReceiptHash: record.pbiReceiptHash,
    receizId: record.receizId,
    createdAt: record.createdAt,
    authorshipHistory: record.authorshipHistory,
  });
  if (
    !input
    || record.queueStatus !== QUEUE_STATUS
    || record.globalProofStatus !== GLOBAL_PROOF_STATUS
    || record.artifactDigestAuthority !== ARTIFACT_DIGEST_AUTHORITY
  ) {
    return null;
  }
  return Object.freeze({
    ...input,
    queueStatus: QUEUE_STATUS,
    globalProofStatus: GLOBAL_PROOF_STATUS,
    artifactDigestAuthority: ARTIFACT_DIGEST_AUTHORITY,
  });
}

function sameCanonical(left: unknown, right: unknown): boolean {
  try {
    return jcsCanonicalize(left) === jcsCanonicalize(right);
  } catch {
    return false;
  }
}

function canonicalSha256Hex(value: unknown): string {
  return bytesToHex(sha256(TEXT_ENCODER.encode(jcsCanonicalize(value))));
}

function deriveReconciliationDigest(
  reconciliation: LocalPbiQueuedProofObjectAuthorshipReconciliation,
): string {
  return canonicalSha256Hex({
    schema: RECONCILIATION_DIGEST_SCHEMA,
    reconciliation,
  });
}

function deriveReconciliationId(
  actionHashHex: string,
  reconciliationDigestSha256: string,
): string {
  return canonicalSha256Hex({
    schema: RECONCILIATION_ID_SCHEMA,
    actionHashHex,
    reconciliationDigestSha256,
  });
}

async function buildRow(args: {
  verifiedProof: VerifiedLocalPbiAuthorshipAppend;
  reconciliation: unknown;
  ownerUserId: string;
  sourceReceizId: string | null;
}): Promise<DurableProofObjectAuthorshipReconciliationRow> {
  const scope = args.verifiedProof.input.proofObjectScope;
  const ownerUserId = normalizeText(args.ownerUserId);
  const sourceReceizId = normalizeText(args.sourceReceizId) || null;
  const input =
    normalizeLocalPbiProofObjectAuthorshipReconciliationInput(args.reconciliation);
  const history = input?.authorshipHistory ?? [];
  const append = history.at(-1);
  if (
    !scope
    || !input
    || !append
    || !ownerUserId
    || !await verifyReceizPbiProofObjectAuthorshipChainV1(history)
    || history.length !== scope.authorshipPosition + 1
    || append.position !== scope.authorshipPosition
    || append.predecessorArtifactSha256 !== scope.predecessorArtifactSha256
    || append.predecessorProofHead !== scope.predecessorProofHead
    || append.claimHashHex !== args.verifiedProof.input.claimHashHex
    || append.slug !== args.verifiedProof.input.slug
    || append.code !== args.verifiedProof.input.code
    || append.pulse !== args.verifiedProof.input.pulse
    || append.receizId !== scope.receizId
    || append.credentialId !== args.verifiedProof.credential.credIdB64Url
    || append.credentialPublicKeyPem !== args.verifiedProof.credential.pubKeyPem
    || !sameCanonical(append.pbiReceipt, args.verifiedProof.receipt)
    || append.pbiReceiptHash !== args.verifiedProof.pbiReceiptHash
    || append.signedAt !== args.verifiedProof.verifiedAt
    || append.kaiUpulse !== scope.kaiUpulse
    || input.predecessorArtifactSha256 !== scope.predecessorArtifactSha256
    || input.appendHeadSha256 !== append.appendHeadSha256
    || input.pbiReceiptHash !== args.verifiedProof.pbiReceiptHash
    || input.receizId !== scope.receizId
    || input.createdAt !== args.verifiedProof.verifiedAt
  ) {
    throw new Error("proof_object_authorship_reconciliation_invalid");
  }
  const reconciliation = Object.freeze({
    ...input,
    queueStatus: QUEUE_STATUS,
    globalProofStatus: GLOBAL_PROOF_STATUS,
    artifactDigestAuthority: ARTIFACT_DIGEST_AUTHORITY,
  });
  const reconciliationDigestSha256 = deriveReconciliationDigest(reconciliation);
  const reconciliationId = deriveReconciliationId(
    args.verifiedProof.actionHashHex,
    reconciliationDigestSha256,
  );
  return Object.freeze({
    storageRecordId: reconciliationId,
    reconciliationDigestSha256,
    actionHashHex: args.verifiedProof.actionHashHex,
    ownerUserId,
    sourceReceizId,
    artifactDigestLocator: input.artifactDigestLocator,
    artifactDigestAuthority: ARTIFACT_DIGEST_AUTHORITY,
    globalProofStatus: GLOBAL_PROOF_STATUS,
    queueStatus: QUEUE_STATUS,
    predecessorArtifactSha256: input.predecessorArtifactSha256,
    appendHeadSha256: append.appendHeadSha256,
    pbiReceiptHash: input.pbiReceiptHash,
    receizId: input.receizId,
    createdAt: input.createdAt,
    reconciliation,
  });
}

function sameRow(
  left: DurableProofObjectAuthorshipReconciliationRow,
  right: DurableProofObjectAuthorshipReconciliationRow,
): boolean {
  const {
    storageRecordId: _leftStorageRecordId,
    ...leftComparable
  } = left;
  const {
    storageRecordId: _rightStorageRecordId,
    ...rightComparable
  } = right;
  return sameCanonical(leftComparable, rightComparable);
}

export async function persistLocalPbiProofObjectAuthorshipReconciliation(args: {
  verifiedProof: VerifiedLocalPbiAuthorshipAppend;
  reconciliation: unknown;
  ownerUserId: string;
  sourceReceizId: string | null;
  persist: (
    row: DurableProofObjectAuthorshipReconciliationRow,
  ) => Promise<DurableProofObjectAuthorshipReconciliationRow>;
}): Promise<LocalPbiProofObjectAuthorshipReconciliationAck> {
  const expected = await buildRow(args);
  const persisted = await args.persist(expected);
  if (!sameRow(persisted, expected)) {
    throw new Error("proof_object_authorship_reconciliation_conflict");
  }
  return Object.freeze({
    schema: ACK_SCHEMA,
    queueStatus: QUEUE_STATUS,
    globalProofStatus: GLOBAL_PROOF_STATUS,
    artifactDigestAuthority: ARTIFACT_DIGEST_AUTHORITY,
    actionHashHex: expected.actionHashHex,
    reconciliationDigestSha256: expected.reconciliationDigestSha256,
    reconciliationId: deriveReconciliationId(
      expected.actionHashHex,
      expected.reconciliationDigestSha256,
    ),
    reconciliation: expected.reconciliation,
  });
}

export function normalizeLocalPbiProofObjectAuthorshipReconciliationAck(
  value: unknown,
): LocalPbiProofObjectAuthorshipReconciliationAck | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  if (!exactEnumerableDataKeys(value, ACK_KEYS)) return null;
  const record = value as Record<string, unknown>;
  const actionHashHex = normalizeText(record.actionHashHex).toLowerCase();
  const reconciliationDigestSha256 =
    normalizeText(record.reconciliationDigestSha256).toLowerCase();
  const reconciliationId = normalizeText(record.reconciliationId).toLowerCase();
  const reconciliation = normalizeQueuedReconciliation(record.reconciliation);
  if (
    record.schema !== ACK_SCHEMA
    || record.queueStatus !== QUEUE_STATUS
    || record.globalProofStatus !== GLOBAL_PROOF_STATUS
    || record.artifactDigestAuthority !== ARTIFACT_DIGEST_AUTHORITY
    || !HEX64_RE.test(actionHashHex)
    || !HEX64_RE.test(reconciliationDigestSha256)
    || !HEX64_RE.test(reconciliationId)
    || !reconciliation
  ) {
    return null;
  }
  return Object.freeze({
    schema: ACK_SCHEMA,
    queueStatus: QUEUE_STATUS,
    globalProofStatus: GLOBAL_PROOF_STATUS,
    artifactDigestAuthority: ARTIFACT_DIGEST_AUTHORITY,
    actionHashHex,
    reconciliationDigestSha256,
    reconciliationId,
    reconciliation,
  });
}

export async function verifyLocalPbiProofObjectAuthorshipReconciliationAck(args: {
  ack: unknown;
  actionHashHex: string;
  reconciliation: LocalPbiProofObjectAuthorshipReconciliationInput;
}): Promise<LocalPbiProofObjectAuthorshipReconciliationAck | null> {
  const ack =
    normalizeLocalPbiProofObjectAuthorshipReconciliationAck(args.ack);
  const input =
    normalizeLocalPbiProofObjectAuthorshipReconciliationInput(args.reconciliation);
  if (!ack || !input) return null;
  const expected = Object.freeze({
    ...input,
    queueStatus: QUEUE_STATUS,
    globalProofStatus: GLOBAL_PROOF_STATUS,
    artifactDigestAuthority: ARTIFACT_DIGEST_AUTHORITY,
  });
  if (
    ack.actionHashHex !== normalizeText(args.actionHashHex).toLowerCase()
    || !sameCanonical(ack.reconciliation, expected)
    || ack.reconciliationDigestSha256 !== deriveReconciliationDigest(expected)
    || ack.reconciliationId !== deriveReconciliationId(
      ack.actionHashHex,
      ack.reconciliationDigestSha256,
    )
  ) {
    return null;
  }
  return ack;
}

export function createLocalPbiProofObjectAuthorshipReconciliationReceiptFromLegacyAck(
  args: {
    ack: unknown;
    actionHashHex: string;
    reconciliation: unknown;
    queuedAtMs: number;
  },
): LocalPbiProofObjectAuthorshipReconciliationReceipt | null {
  const ack = normalizeLocalPbiProofObjectAuthorshipReconciliationAck(args.ack);
  const input =
    normalizeLocalPbiProofObjectAuthorshipReconciliationInput(args.reconciliation);
  const actionHashHex = normalizeText(args.actionHashHex).toLowerCase();
  if (
    !ack
    || !input
    || !HEX64_RE.test(actionHashHex)
    || ack.actionHashHex !== actionHashHex
    || !Number.isSafeInteger(args.queuedAtMs)
    || args.queuedAtMs < 0
  ) {
    return null;
  }
  const expectedReconciliation = Object.freeze({
    ...input,
    queueStatus: QUEUE_STATUS,
    globalProofStatus: GLOBAL_PROOF_STATUS,
    artifactDigestAuthority: ARTIFACT_DIGEST_AUTHORITY,
  });
  const reconciliationDigestSha256 =
    deriveReconciliationDigest(expectedReconciliation);
  if (
    !sameCanonical(ack.reconciliation, expectedReconciliation)
    || ack.reconciliationDigestSha256 !== reconciliationDigestSha256
  ) {
    return null;
  }
  return createLocalPbiProofObjectAuthorshipReconciliationReceipt(
    Object.freeze({
      ...ack,
      reconciliationId: deriveReconciliationId(
        actionHashHex,
        reconciliationDigestSha256,
      ),
    }),
    args.queuedAtMs,
  );
}

export function createLocalPbiProofObjectAuthorshipReconciliationReceipt(
  ack: LocalPbiProofObjectAuthorshipReconciliationAck,
  queuedAtMs: number,
): LocalPbiProofObjectAuthorshipReconciliationReceipt {
  if (!Number.isSafeInteger(queuedAtMs) || queuedAtMs < 0) {
    throw new Error("proof_object_authorship_reconciliation_receipt_invalid");
  }
  return Object.freeze({
    schema: COMPACT_RECEIPT_SCHEMA,
    actionHashHex: ack.actionHashHex,
    queueStatus: ack.queueStatus,
    globalProofStatus: ack.globalProofStatus,
    artifactDigestAuthority: ack.artifactDigestAuthority,
    reconciliationDigestSha256: ack.reconciliationDigestSha256,
    reconciliationId: ack.reconciliationId,
    artifactDigestLocator: ack.reconciliation.artifactDigestLocator,
    predecessorArtifactSha256: ack.reconciliation.predecessorArtifactSha256,
    appendHeadSha256: ack.reconciliation.appendHeadSha256,
    pbiReceiptHash: ack.reconciliation.pbiReceiptHash,
    receizId: ack.reconciliation.receizId,
    authorshipCreatedAt: ack.reconciliation.createdAt,
    queuedAtMs,
  });
}

export function normalizeLocalPbiProofObjectAuthorshipReconciliationReceipt(
  value: unknown,
): LocalPbiProofObjectAuthorshipReconciliationReceipt | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  if (!exactEnumerableDataKeys(value, COMPACT_RECEIPT_KEYS)) return null;
  const record = value as Record<string, unknown>;
  const actionHashHex = normalizeText(record.actionHashHex).toLowerCase();
  const reconciliationDigestSha256 =
    normalizeText(record.reconciliationDigestSha256).toLowerCase();
  const reconciliationId = normalizeText(record.reconciliationId).toLowerCase();
  const artifactDigestLocator =
    normalizeText(record.artifactDigestLocator).toLowerCase();
  const predecessorArtifactSha256 =
    normalizeText(record.predecessorArtifactSha256).toLowerCase();
  const appendHeadSha256 = normalizeText(record.appendHeadSha256).toLowerCase();
  const pbiReceiptHash = normalizeText(record.pbiReceiptHash).toLowerCase();
  const receizId = normalizeText(record.receizId).toLowerCase();
  const authorshipCreatedAt = exactChronos(record.authorshipCreatedAt);
  const queuedAtMs = Number(record.queuedAtMs);
  if (
    record.schema !== COMPACT_RECEIPT_SCHEMA
    || record.queueStatus !== QUEUE_STATUS
    || record.globalProofStatus !== GLOBAL_PROOF_STATUS
    || record.artifactDigestAuthority !== ARTIFACT_DIGEST_AUTHORITY
    || !HEX64_RE.test(actionHashHex)
    || !HEX64_RE.test(reconciliationDigestSha256)
    || !HEX64_RE.test(reconciliationId)
    || !HEX64_RE.test(artifactDigestLocator)
    || !HEX64_RE.test(predecessorArtifactSha256)
    || !HEX64_RE.test(appendHeadSha256)
    || !HEX64_RE.test(pbiReceiptHash)
    || !HEX64_RE.test(receizId)
    || !authorshipCreatedAt
    || !Number.isSafeInteger(queuedAtMs)
    || queuedAtMs < 0
    || reconciliationId !== deriveReconciliationId(
      actionHashHex,
      reconciliationDigestSha256,
    )
  ) {
    return null;
  }
  return Object.freeze({
    schema: COMPACT_RECEIPT_SCHEMA,
    actionHashHex,
    queueStatus: QUEUE_STATUS,
    globalProofStatus: GLOBAL_PROOF_STATUS,
    artifactDigestAuthority: ARTIFACT_DIGEST_AUTHORITY,
    reconciliationDigestSha256,
    reconciliationId,
    artifactDigestLocator,
    predecessorArtifactSha256,
    appendHeadSha256,
    pbiReceiptHash,
    receizId,
    authorshipCreatedAt,
    queuedAtMs,
  });
}
