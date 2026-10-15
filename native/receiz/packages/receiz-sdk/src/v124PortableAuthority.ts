import {
  createReceizArtifactAdmissionEngine,
  createReceizCapabilityIssuerResolver,
  reverifyReceizArtifactWithAdmissionContext,
} from "./artifactAdmission.js";
import {
  verifyReceizArtifact,
  verifyReceizArtifactWithCanonicalRoots,
} from "./artifactVerification.js";
import {
  bindReceizArtifactAppendRegistryAuthority,
  bindReceizCurrentArtifactAppendRegistryAuthority,
  commitArtifactTransition,
  isSdkIssuedReceizCommittedArtifactTransition,
  planArtifactAppend,
  planReceizExactKksArtifactAppend,
  readSdkIssuedReceizCommittedArtifactTransitionCustody,
  receizArtifactAppendCapabilityContext,
  sealArtifactTransitionCandidate,
  verifyReceizArtifactTransitionCommitCandidate,
  type ReceizArtifactAppendPlan,
  type ReceizCommittedArtifactTransition,
  type ReceizCommitDomainId,
  type ReceizHistoryDigest,
  type ReceizNamespaceId,
} from "./artifactTransition.js";
import {
  readReceizArtifactTransitionCandidateCustody,
  type ReceizVerifiedArtifactTransitionCandidate,
} from "./artifactTransitionCandidateCustody.js";
import {
  type ReceizArtifactTransitionCommitResult,
  type ReceizAppendReceipt,
  type ReceizArtifactTransitionCommitUnit,
  type ReceizArtifactTransitionStore,
  type ReceizStagedArtifactTransition,
  type ReceizStagedCandidateReference,
} from "./artifactTransitionStore.js";
import { digestReceizAuthority } from "./authorityEncoding.js";
import {
  createReceizCapabilityVerifier,
  type ReceizSignedCapability,
} from "./capabilityAuthority.js";
import type { ReceizConstitutionJson } from "./constitution.js";
import { RECEIZ_CURRENT_CONSTITUTION_REGISTRY } from "./currentRegistry.generated.js";
import {
  observeReceizHistoricalIdentityKeyState,
  verifyReceizIdentityKeyStateArtifactAdmission,
} from "./historicalHandoffCustody.js";
import {
  receizBase64UrlDecode,
  receizBase64UrlEncode,
  type ReceizIdentityLoginProof,
} from "./identity.js";
import {
  parseReceizPortableAssetDocument,
} from "./portableAsset.js";
import {
  verifyReceizCarriedProofHistory,
  readReceizProofHistoryExactKksCoordinate,
  type ReceizVerifiedProofHistory,
} from "./proofHistory.js";
import type { ReceizRegistryDiscoveryResult } from "./registryDiscovery.js";
import { sha256ReceizBytes, type ReceizSealedArtifact } from "./artifacts.js";
import type { ReceizSignatureV4RootPublicKey } from "./verifier/signatureV4.js";
import { canonicalizeReceizV122, digestReceizCanonicalV122 } from "./v122Canonical.js";
import { receizKaiNow } from "./v124Kai.js";
import type { ReceizKksV1ProofCoordinate } from "./v125KaiAuthority.js";
import {
  closedRecord,
  digest,
  freeze,
  text,
  validateReceizOperationPlanV124,
  type ReceizOperationPlanV124,
} from "./v124Contracts.js";

export type ReceizPortableSealedArtifactV124 = Readonly<{
  schema: "receiz.sealed-artifact-bytes.v124";
  exactBytesB64u: string;
  filename: string;
  mimeType: string;
  artifactSha256: string;
  payloadSha256: string;
}>;

export type ReceizPortableExecutionAuthorityRequestV124 = Readonly<{
  schema: "receiz.execution-authority-request.v124";
  phase: "stage" | "execute" | "resolve";
  method: "GET" | "POST";
  path: string;
  body: unknown;
}>;

export type ReceizPortableExecutionOutcomeCoordinatesV124 = Readonly<{
  schema: "receiz.execution-outcome.v124";
  status: "committed";
  executionId: string;
  applicationId: string;
  domainId: string;
  operationKind: string;
  exactPlanDigest: string;
  semanticIdempotencyKey: string;
  attemptId: string;
  terminalAtKaiUPulse: number;
}>;

export type ReceizPortableExecutionAuthorityEventV124 = Readonly<{
  schema: "receiz.execution-authority-append.v124";
  participantId: string;
  applicationId: string;
  exactPlanDigest: string;
  requestDigest: string;
  outcomeCoordinatesDigest: string;
}>;

export type ReceizPortableExecutionAuthorityEvidenceV124 = Readonly<{
  schema: "receiz.portable-execution-authority.v124";
  profile: "portable-state";
  participantId: string;
  operationPlan: ReceizOperationPlanV124;
  request: ReceizPortableExecutionAuthorityRequestV124;
  outcome: unknown;
  planning: Readonly<{
    commitDomain: ReceizCommitDomainId;
    namespace: ReceizNamespaceId;
    event: ReceizPortableExecutionAuthorityEventV124;
    expectedHead: ReceizHistoryDigest;
    idempotencyKey: string;
  }>;
  predecessor: ReceizPortableSealedArtifactV124;
  successor: ReceizPortableSealedArtifactV124;
  identityArtifact: ReceizPortableSealedArtifactV124;
  signedCapability: ReceizSignedCapability;
  identityProof: ReceizIdentityLoginProof;
  authority: Readonly<{
    evidenceIsProofAuthority: false;
    strongerTruth: "sealed-receiz-proof-object";
  }>;
}>;

export type ReceizPortableExecutionAuthorityVerifierOptionsV124 = Readonly<{
  canonicalSignatureV4RootPublicKeys?: ReadonlyMap<string, ReceizSignatureV4RootPublicKey>;
  verifiedRegistryDiscovery?: ReceizRegistryDiscoveryResult;
  audience: string;
}>;

export type ReceizVerifiedPortableExecutionAuthorityV124 = Readonly<{
  status: "verified-portable-execution-authority";
  plan: ReceizOperationPlanV124;
  request: ReceizPortableExecutionAuthorityRequestV124;
  outcome: Readonly<Record<string, unknown>>;
  participantId: string;
  actorReceizId: string;
  priorHead: string;
  /** Legacy projection in whole pulses; exact coordinates are carried separately. */
  priorHeadKai: string;
  committedHead: string;
  carriedHistoryHead: string;
  completionKai: string;
  exactKksCoordinates?: Readonly<{ priorHead: ReceizKksV1ProofCoordinate; completion: ReceizKksV1ProofCoordinate }>;
  requestDigest: string;
  successorArtifact: ReceizSealedArtifact;
  authority: Readonly<{
    verificationIsProofAuthority: false;
    strongerTruth: "sealed-receiz-proof-object";
  }>;
}>;

export type ReceizPortableExecutionTransitionMemberV124 = Readonly<{
  schema: "receiz.portable-execution-transition-member.v124";
  profile: "portable-state";
  participantId: string;
  operationPlan: ReceizOperationPlanV124;
  planning: ReceizPortableExecutionAuthorityEvidenceV124["planning"];
  predecessor: ReceizPortableSealedArtifactV124;
  candidate: ReceizPortableSealedArtifactV124;
  identityArtifact: ReceizPortableSealedArtifactV124;
  signedCapability: ReceizSignedCapability;
  identityProof: ReceizIdentityLoginProof;
  authority: Readonly<{
    memberIsProofAuthority: false;
    candidateIsCommitted: false;
    strongerTruth: "sealed-receiz-proof-object";
  }>;
}>;

export type ReceizPortableExecutionTransitionSetV124 = Readonly<{
  schema: "receiz.portable-execution-transition-set.v124";
  applicationId: string;
  exactPlanDigest: string;
  expectedParticipantHeads: Readonly<Record<string, string>>;
  proposedParticipantHeads: Readonly<Record<string, string>>;
  members: readonly ReceizPortableExecutionTransitionMemberV124[];
  authority: Readonly<{
    transitionSetIsProofAuthority: false;
    committed: false;
    strongerTruth: "sealed-receiz-proof-object";
  }>;
}>;

export type ReceizPortableExecutionTransitionVerifierOptionsV124 =
  ReceizPortableExecutionAuthorityVerifierOptionsV124 & Readonly<{
    currentKai: string;
  }>;

export type ReceizVerifiedPortableExecutionTransitionMemberV124 = Readonly<{
  participantId: string;
  plan: ReceizArtifactAppendPlan;
  capability: import("./capabilityAuthority.js").ReceizVerifiedCapability;
  candidate: ReceizVerifiedArtifactTransitionCandidate;
  priorHead: string;
  proposedHead: string;
  authority: Readonly<{
    verificationIsProofAuthority: false;
    candidateIsCommitted: false;
    strongerTruth: "sealed-receiz-proof-object";
  }>;
}>;

export type ReceizVerifiedPortableExecutionTransitionSetV124 = Readonly<{
  status: "verified-portable-execution-transition-set";
  operationPlan: ReceizOperationPlanV124;
  expectedParticipantHeads: Readonly<Record<string, string>>;
  proposedParticipantHeads: Readonly<Record<string, string>>;
  members: readonly ReceizVerifiedPortableExecutionTransitionMemberV124[];
  authority: Readonly<{
    transitionSetIsProofAuthority: false;
    committed: false;
    strongerTruth: "sealed-receiz-proof-object";
  }>;
}>;

/**
 * Canonical commit mechanics derived from an already production-pinned source.
 * This is a subordinate SQL/CAS input and receipt expectation, never committed
 * transition custody and never an issuer.
 */
export type ReceizPreparedPortableExecutionTransitionCommitSetV124 = Readonly<{
  schema: "receiz.prepared-portable-execution-transition-commit-set.v124";
  operationPlan: ReceizOperationPlanV124;
  members: readonly Readonly<{
    participantId: string;
    commitUnit: ReceizArtifactTransitionCommitUnit;
    expectedReceipt: ReceizAppendReceipt;
  }>[];
  authority: Readonly<{
    preparationIsProofAuthority: false;
    receiptIsProofAuthority: false;
    committed: false;
    strongerTruth: "sealed-receiz-proof-object";
  }>;
}>;

export type ReceizInspectedPortableExecutionTransitionSetV124 = Readonly<{
  status: "inspected-portable-execution-transition-set";
  applicationId: string;
  exactPlanDigest: string;
  expectedParticipantHeads: Readonly<Record<string, string>>;
  proposedParticipantHeads: Readonly<Record<string, string>>;
  members: readonly Readonly<{
    participantId: string;
    priorHead: string;
    proposedHead: string;
    candidateArtifactSha256: string;
  }>[];
  authority: Readonly<{
    inspectionIsProofAuthority: false;
    candidateCustodyExposed: false;
    committed: false;
    strongerTruth: "sealed-receiz-proof-object";
  }>;
}>;

export type ReceizPortableExecutionTransitionRecoveryV124 = Readonly<{
  schema: "receiz.portable-execution-transition-recovery.v124";
  transitionSet: ReceizPortableExecutionTransitionSetV124;
  members: readonly Readonly<{
    participantId: string;
    commitUnit: ReceizArtifactTransitionCommitUnit;
    receipt: ReceizAppendReceipt;
  }>[];
  authority: Readonly<{
    recoveryIsProofAuthority: false;
    receiptIsProofAuthority: false;
    strongerTruth: "sealed-receiz-proof-object";
  }>;
}>;

export type ReceizRecoveredPortableExecutionTransitionSetV124 = Readonly<{
  status: "recovered-portable-execution-transition-set";
  transitions: readonly ReceizCommittedArtifactTransition[];
  authority: Readonly<{
    recoveryIsProofAuthority: false;
    strongerTruth: "sealed-receiz-proof-object";
  }>;
}>;

export type ReceizInspectedPortableExecutionTransitionRecoveryV124 = Readonly<{
  status: "inspected-portable-execution-transition-recovery";
  participantIds: readonly string[];
  authority: Readonly<{
    inspectionIsProofAuthority: false;
    committedCustodyIssued: false;
    strongerTruth: "sealed-receiz-proof-object";
  }>;
}>;

const verifiedPortableAuthorities = new WeakSet<object>();
const verifiedPortableTransitionSets = new WeakSet<object>();
const HEX64 = /^[0-9a-f]{64}$/;
const B64U = /^[A-Za-z0-9_-]+$/;
const PATH = /^\/api\/sdk\/v1\/execution\/[A-Za-z0-9%._~!$&'()*+,;=:@/-]+$/;

function fail(code: string): never { throw new TypeError(code); }

function terminalWholeKai(terminalAtKaiUPulse: number): string {
  return (BigInt(terminalAtKaiUPulse) / 1_000_000n).toString();
}

function artifactLocalCapabilityRevocations(
  history: ReceizVerifiedProofHistory,
): ReadonlySet<string> {
  const revoked = new Set<string>();
  for (const node of history.nodes) {
    const receipt = node.receipt;
    if (receipt === null || typeof receipt !== "object" || Array.isArray(receipt)
      || !Object.prototype.hasOwnProperty.call(receipt, "revokedCapabilityDigests")) continue;
    const values = (receipt as Readonly<Record<string, unknown>>).revokedCapabilityDigests;
    if (!Array.isArray(values)
      || values.some((value) => typeof value !== "string" || !HEX64.test(value))) {
      fail("V124_PORTABLE_AUTHORITY_REVOCATION_EVIDENCE_INVALID");
    }
    for (const value of values) revoked.add(value as string);
  }
  return revoked;
}

function exactObjectKeys(value: unknown, keys: readonly string[], code: string): Record<string, unknown> {
  return closedRecord(value, keys, code);
}

function safeInteger(value: unknown, code: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) fail(code);
  return value as number;
}

function exactHeads(value: unknown, code: string): Readonly<Record<string, string>> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) fail(code);
  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length === 0 || entries.some(([key], index) => index > 0 && entries[index - 1]![0].localeCompare(key) >= 0)) fail(code);
  const result: Record<string, string> = {};
  for (const [key, head] of entries) result[text(key, code)] = digest(head, code);
  return freeze(result);
}

function exactArtifact(value: unknown): ReceizPortableSealedArtifactV124 {
  const record = exactObjectKeys(value, ["schema", "exactBytesB64u", "filename", "mimeType", "artifactSha256", "payloadSha256"], "V124_PORTABLE_AUTHORITY_ARTIFACT_INVALID");
  if (record.schema !== "receiz.sealed-artifact-bytes.v124"
    || typeof record.exactBytesB64u !== "string" || !B64U.test(record.exactBytesB64u)
    || typeof record.filename !== "string" || record.filename.length === 0
    || typeof record.mimeType !== "string" || record.mimeType.length === 0) {
    fail("V124_PORTABLE_AUTHORITY_ARTIFACT_INVALID");
  }
  let bytes: Uint8Array;
  try { bytes = receizBase64UrlDecode(record.exactBytesB64u); } catch { return fail("V124_PORTABLE_AUTHORITY_ARTIFACT_INVALID"); }
  if (bytes.byteLength === 0 || receizBase64UrlEncode(bytes) !== record.exactBytesB64u) fail("V124_PORTABLE_AUTHORITY_ARTIFACT_INVALID");
  return freeze({
    schema: "receiz.sealed-artifact-bytes.v124" as const,
    exactBytesB64u: record.exactBytesB64u,
    filename: record.filename,
    mimeType: record.mimeType,
    artifactSha256: digest(record.artifactSha256, "V124_PORTABLE_AUTHORITY_ARTIFACT_INVALID"),
    payloadSha256: digest(record.payloadSha256, "V124_PORTABLE_AUTHORITY_ARTIFACT_INVALID"),
  });
}

function strictArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

async function verifyArtifact(
  value: ReceizPortableSealedArtifactV124,
  options: ReceizPortableExecutionAuthorityVerifierOptionsV124,
) {
  const bytes = receizBase64UrlDecode(value.exactBytesB64u);
  const exactFile = new File([strictArrayBuffer(bytes)], value.filename, { type: value.mimeType });
  const result = options.canonicalSignatureV4RootPublicKeys
    ? await verifyReceizArtifactWithCanonicalRoots(exactFile, options.canonicalSignatureV4RootPublicKeys)
    : await verifyReceizArtifact(exactFile);
  if (result.status !== "verified-artifact"
    || result.artifactDigest.value !== value.artifactSha256
    || result.payloadDigest.value !== value.payloadSha256) {
    fail("V124_PORTABLE_AUTHORITY_ARTIFACT_UNVERIFIED");
  }
  return result;
}

function request(value: unknown): ReceizPortableExecutionAuthorityRequestV124 {
  const record = exactObjectKeys(value, ["schema", "phase", "method", "path", "body"], "V124_PORTABLE_AUTHORITY_REQUEST_INVALID");
  if (record.schema !== "receiz.execution-authority-request.v124"
    || !["stage", "execute", "resolve"].includes(String(record.phase))
    || !["GET", "POST"].includes(String(record.method))
    || typeof record.path !== "string" || !PATH.test(record.path)) fail("V124_PORTABLE_AUTHORITY_REQUEST_INVALID");
  let body: unknown;
  try { body = structuredClone(record.body); } catch { return fail("V124_PORTABLE_AUTHORITY_REQUEST_INVALID"); }
  return freeze({
    schema: "receiz.execution-authority-request.v124" as const,
    phase: record.phase as ReceizPortableExecutionAuthorityRequestV124["phase"],
    method: record.method as ReceizPortableExecutionAuthorityRequestV124["method"],
    path: record.path,
    body: freeze(body),
  });
}

function outcomeCoordinates(value: unknown): ReceizPortableExecutionOutcomeCoordinatesV124 {
  const record = exactObjectKeys(value, ["schema", "status", "executionId", "applicationId", "domainId", "operationKind", "exactPlanDigest", "semanticIdempotencyKey", "attemptId", "terminalAtKaiUPulse"], "V124_PORTABLE_AUTHORITY_OUTCOME_INVALID");
  if (record.schema !== "receiz.execution-outcome.v124" || record.status !== "committed") fail("V124_PORTABLE_AUTHORITY_OUTCOME_INVALID");
  return freeze({
    schema: "receiz.execution-outcome.v124" as const,
    status: "committed" as const,
    executionId: text(record.executionId, "V124_PORTABLE_AUTHORITY_OUTCOME_INVALID"),
    applicationId: text(record.applicationId, "V124_PORTABLE_AUTHORITY_OUTCOME_INVALID"),
    domainId: text(record.domainId, "V124_PORTABLE_AUTHORITY_OUTCOME_INVALID"),
    operationKind: text(record.operationKind, "V124_PORTABLE_AUTHORITY_OUTCOME_INVALID"),
    exactPlanDigest: digest(record.exactPlanDigest, "V124_PORTABLE_AUTHORITY_OUTCOME_INVALID"),
    semanticIdempotencyKey: text(record.semanticIdempotencyKey, "V124_PORTABLE_AUTHORITY_OUTCOME_INVALID"),
    attemptId: text(record.attemptId, "V124_PORTABLE_AUTHORITY_OUTCOME_INVALID"),
    terminalAtKaiUPulse: safeInteger(record.terminalAtKaiUPulse, "V124_PORTABLE_AUTHORITY_OUTCOME_INVALID"),
  });
}

async function committedOutcome(value: unknown): Promise<Readonly<Record<string, unknown>>> {
  const record = exactObjectKeys(value, ["schema", "status", "executionId", "applicationId", "domainId", "operationKind", "exactPlanDigest", "semanticIdempotencyKey", "attemptId", "terminalAtKaiUPulse", "authority", "committedHeads", "outcomeDigest", "receiptDigest"], "V124_PORTABLE_AUTHORITY_OUTCOME_INVALID");
  const coordinates = outcomeCoordinates(Object.fromEntries(Object.entries(record).filter(([key]) => ["schema", "status", "executionId", "applicationId", "domainId", "operationKind", "exactPlanDigest", "semanticIdempotencyKey", "attemptId", "terminalAtKaiUPulse"].includes(key))));
  const authority = exactObjectKeys(record.authority, ["outcomeIsProofAuthority", "strongerTruth"], "V124_PORTABLE_AUTHORITY_OUTCOME_INVALID");
  if (authority.outcomeIsProofAuthority !== false || authority.strongerTruth !== "sealed-receiz-proof-object") fail("V124_PORTABLE_AUTHORITY_OUTCOME_INVALID");
  const heads = exactHeads(record.committedHeads, "V124_PORTABLE_AUTHORITY_OUTCOME_INVALID");
  const outcomeDigest = digest(record.outcomeDigest, "V124_PORTABLE_AUTHORITY_OUTCOME_INVALID");
  const receiptDigest = digest(record.receiptDigest, "V124_PORTABLE_AUTHORITY_OUTCOME_INVALID");
  const terminalBasis = freeze({
    status: "committed" as const,
    executionId: coordinates.executionId,
    applicationId: coordinates.applicationId,
    domainId: coordinates.domainId,
    operationKind: coordinates.operationKind,
    exactPlanDigest: coordinates.exactPlanDigest,
    semanticIdempotencyKey: coordinates.semanticIdempotencyKey,
    attemptId: coordinates.attemptId,
    terminalAtKaiUPulse: coordinates.terminalAtKaiUPulse,
    authority: freeze({ outcomeIsProofAuthority: false as const, strongerTruth: "sealed-receiz-proof-object" as const }),
    committedHeads: heads,
  });
  if (outcomeDigest !== await digestReceizCanonicalV122({ schema: "receiz.execution-terminal.v124", ...terminalBasis })
    || receiptDigest !== await digestReceizCanonicalV122({ schema: "receiz.execution-receipt.v124", ...terminalBasis, outcomeDigest })) {
    fail("V124_PORTABLE_AUTHORITY_OUTCOME_INVALID");
  }
  return freeze({ schema: "receiz.execution-outcome.v124" as const, ...terminalBasis, outcomeDigest, receiptDigest });
}

function exactPlanning(value: unknown): ReceizPortableExecutionAuthorityEvidenceV124["planning"] {
  const record = exactObjectKeys(value, ["commitDomain", "namespace", "event", "expectedHead", "idempotencyKey"], "V124_PORTABLE_AUTHORITY_PLANNING_INVALID");
  const commitDomain = exactObjectKeys(record.commitDomain, ["scheme", "value"], "V124_PORTABLE_AUTHORITY_PLANNING_INVALID");
  const namespace = exactObjectKeys(record.namespace, ["scheme", "value"], "V124_PORTABLE_AUTHORITY_PLANNING_INVALID");
  const expectedHead = exactObjectKeys(record.expectedHead, ["algorithm", "binds", "value"], "V124_PORTABLE_AUTHORITY_PLANNING_INVALID");
  if (commitDomain.scheme !== "receiz-commit-domain.v1" || namespace.scheme !== "receiz-namespace.v1"
    || expectedHead.algorithm !== "sha-256" || expectedHead.binds !== "verified-proof-history") fail("V124_PORTABLE_AUTHORITY_PLANNING_INVALID");
  return freeze({
    commitDomain: freeze({ scheme: "receiz-commit-domain.v1" as const, value: text(commitDomain.value, "V124_PORTABLE_AUTHORITY_PLANNING_INVALID") }),
    namespace: freeze({ scheme: "receiz-namespace.v1" as const, value: text(namespace.value, "V124_PORTABLE_AUTHORITY_PLANNING_INVALID") }),
    event: freeze(structuredClone(record.event)) as ReceizPortableExecutionAuthorityEventV124,
    expectedHead: freeze({ algorithm: "sha-256" as const, binds: "verified-proof-history" as const, value: digest(expectedHead.value, "V124_PORTABLE_AUTHORITY_PLANNING_INVALID") }),
    idempotencyKey: text(record.idempotencyKey, "V124_PORTABLE_AUTHORITY_PLANNING_INVALID"),
  });
}

/** The complete candidate already carries temporal proof; transport adds no authority field. */
async function reconstructPortableTransition(
  input: Parameters<typeof planArtifactAppend>[0],
  candidateHistory: ReceizVerifiedProofHistory | null,
) {
  const head = candidateHistory?.nodes.find((node) => node.nodeDigest === candidateHistory.headDigests[0]);
  const coordinate = head ? await readReceizProofHistoryExactKksCoordinate(head) : null;
  const transitionPlan = coordinate
    ? await planReceizExactKksArtifactAppend({ ...input, kksCoordinate: coordinate })
    : await planArtifactAppend(input);
  return { transitionPlan, coordinate };
}

export async function transportReceizSealedArtifactV124(
  artifact: ReceizSealedArtifact,
): Promise<ReceizPortableSealedArtifactV124> {
  const bytes = new Uint8Array(await artifact.artifact.arrayBuffer());
  if (bytes.byteLength === 0) fail("V124_PORTABLE_AUTHORITY_ARTIFACT_INVALID");
  return freeze({
    schema: "receiz.sealed-artifact-bytes.v124" as const,
    exactBytesB64u: receizBase64UrlEncode(bytes),
    filename: text(artifact.filename, "V124_PORTABLE_AUTHORITY_ARTIFACT_INVALID"),
    mimeType: text(artifact.mimeType, "V124_PORTABLE_AUTHORITY_ARTIFACT_INVALID"),
    artifactSha256: digest(artifact.artifactSha256, "V124_PORTABLE_AUTHORITY_ARTIFACT_INVALID"),
    payloadSha256: digest(artifact.payloadSha256, "V124_PORTABLE_AUTHORITY_ARTIFACT_INVALID"),
  });
}

export async function createReceizPortableExecutionAuthorityEventV124(input: Readonly<{
  participantId: string;
  operationPlan: ReceizOperationPlanV124;
  request: ReceizPortableExecutionAuthorityRequestV124;
  outcomeCoordinates: ReceizPortableExecutionOutcomeCoordinatesV124;
}>): Promise<ReceizPortableExecutionAuthorityEventV124> {
  const plan = await validateReceizOperationPlanV124(input.operationPlan);
  const exactRequest = request(input.request);
  const coordinates = outcomeCoordinates(input.outcomeCoordinates);
  if (coordinates.applicationId !== plan.applicationId
    || coordinates.domainId !== plan.domainId
    || coordinates.operationKind !== plan.operationKind
    || coordinates.exactPlanDigest !== plan.exactPlanDigest
    || coordinates.semanticIdempotencyKey !== plan.semanticIdempotencyKey
    || coordinates.attemptId !== plan.attemptId) fail("V124_PORTABLE_AUTHORITY_OUTCOME_PLAN_MISMATCH");
  return freeze({
    schema: "receiz.execution-authority-append.v124" as const,
    participantId: text(input.participantId, "V124_PORTABLE_AUTHORITY_PARTICIPANT_INVALID"),
    applicationId: plan.applicationId,
    exactPlanDigest: plan.exactPlanDigest,
    requestDigest: await digestReceizCanonicalV122(exactRequest),
    outcomeCoordinatesDigest: await digestReceizCanonicalV122(coordinates),
  });
}

type UnsignedEvidence = Omit<ReceizPortableExecutionAuthorityEvidenceV124, "identityProof">;

export async function createReceizPortableExecutionAuthorityIdentityChallengeV124(
  evidence: UnsignedEvidence,
): Promise<string> {
  const record = exactObjectKeys(evidence, ["schema", "profile", "participantId", "operationPlan", "request", "outcome", "planning", "predecessor", "successor", "identityArtifact", "signedCapability", "authority"], "V124_PORTABLE_AUTHORITY_EVIDENCE_INVALID");
  if (record.schema !== "receiz.portable-execution-authority.v124" || record.profile !== "portable-state") fail("V124_PORTABLE_AUTHORITY_EVIDENCE_INVALID");
  const identityArtifact = exactArtifact(record.identityArtifact);
  const capability = record.signedCapability as Partial<ReceizSignedCapability> | null;
  if (!capability || capability.schema !== "receiz.signed-capability.v112"
    || !capability.payload || typeof capability.payload !== "object") {
    fail("V124_PORTABLE_AUTHORITY_IDENTITY_CHALLENGE_INVALID");
  }
  const payload = capability.payload as ReceizSignedCapability["payload"];
  return [
    "RECEIZ-IDENTITY-ADMISSION-V112",
    identityArtifact.artifactSha256,
    identityArtifact.payloadSha256,
    payload.issuerKeyId,
    payload.actorId,
    payload.registryDigest,
  ].join("\n");
}

type UnsignedTransitionMember = Omit<ReceizPortableExecutionTransitionMemberV124, "identityProof">;

export async function createReceizPortableExecutionTransitionIdentityChallengeV124(
  member: UnsignedTransitionMember,
): Promise<string> {
  const record = exactObjectKeys(member, [
    "schema", "profile", "participantId", "operationPlan", "planning", "predecessor",
    "candidate", "identityArtifact", "signedCapability", "authority",
  ], "V124_PORTABLE_TRANSITION_MEMBER_INVALID");
  if (record.schema !== "receiz.portable-execution-transition-member.v124"
    || record.profile !== "portable-state") fail("V124_PORTABLE_TRANSITION_MEMBER_INVALID");
  const identityArtifact = exactArtifact(record.identityArtifact);
  const capability = record.signedCapability as Partial<ReceizSignedCapability> | null;
  if (!capability || capability.schema !== "receiz.signed-capability.v112"
    || !capability.payload || typeof capability.payload !== "object") {
    fail("V124_PORTABLE_TRANSITION_IDENTITY_CHALLENGE_INVALID");
  }
  const payload = capability.payload as ReceizSignedCapability["payload"];
  return [
    "RECEIZ-IDENTITY-ADMISSION-V112",
    identityArtifact.artifactSha256,
    identityArtifact.payloadSha256,
    payload.issuerKeyId,
    payload.actorId,
    payload.registryDigest,
  ].join("\n");
}

function canonicalWholeKai(value: unknown, code: string): string {
  if (typeof value !== "string" || !/^(0|[1-9][0-9]*)$/.test(value)) fail(code);
  return value;
}

async function verifyPortableTransitionMember(
  value: unknown,
  options: ReceizPortableExecutionTransitionVerifierOptionsV124,
): Promise<Readonly<{
  operationPlan: ReceizOperationPlanV124;
  member: ReceizVerifiedPortableExecutionTransitionMemberV124;
}>> {
  const record = exactObjectKeys(value, [
    "schema", "profile", "participantId", "operationPlan", "planning", "predecessor",
    "candidate", "identityArtifact", "signedCapability", "identityProof", "authority",
  ], "V124_PORTABLE_TRANSITION_MEMBER_INVALID");
  if (record.schema !== "receiz.portable-execution-transition-member.v124"
    || record.profile !== "portable-state") fail("V124_PORTABLE_TRANSITION_MEMBER_INVALID");
  const authority = exactObjectKeys(
    record.authority,
    ["memberIsProofAuthority", "candidateIsCommitted", "strongerTruth"],
    "V124_PORTABLE_TRANSITION_MEMBER_INVALID",
  );
  if (authority.memberIsProofAuthority !== false || authority.candidateIsCommitted !== false
    || authority.strongerTruth !== "sealed-receiz-proof-object") {
    fail("V124_PORTABLE_TRANSITION_MEMBER_INVALID");
  }
  const participantId = text(record.participantId, "V124_PORTABLE_TRANSITION_PARTICIPANT_INVALID");
  const operationPlan = await validateReceizOperationPlanV124(record.operationPlan);
  const planning = exactPlanning(record.planning);
  const expectedHead = operationPlan.expectedParticipantHeads[participantId];
  if (!expectedHead || planning.expectedHead.value !== expectedHead) {
    fail("V124_PORTABLE_TRANSITION_PARTICIPANT_MISMATCH");
  }
  const currentKai = canonicalWholeKai(options.currentKai, "V124_PORTABLE_TRANSITION_KAI_INVALID");
  const predecessorWire = exactArtifact(record.predecessor);
  const candidateWire = exactArtifact(record.candidate);
  const identityWire = exactArtifact(record.identityArtifact);
  const predecessorVerification = await verifyArtifact(predecessorWire, options);
  const candidateVerification = await verifyArtifact(candidateWire, options);
  const identityVerification = await verifyArtifact(identityWire, options);
  const admissionDependencies = {
    ...(options.canonicalSignatureV4RootPublicKeys
      ? { canonicalSignatureV4RootPublicKeys: options.canonicalSignatureV4RootPublicKeys }
      : {}),
    ...(options.verifiedRegistryDiscovery
      ? { verifiedRegistryDiscovery: options.verifiedRegistryDiscovery }
      : {}),
  };
  const admit = createReceizArtifactAdmissionEngine(admissionDependencies);
  const predecessorAdmission = await admit(predecessorVerification, { profile: "portable-state" });
  if (predecessorAdmission.verdict !== "bearer-recovery" || !predecessorAdmission.proofHistory) {
    fail("V124_PORTABLE_TRANSITION_PREDECESSOR_UNADMITTED");
  }
  const candidateAdmission = await admit(candidateVerification, { profile: "portable-state" });
  if (candidateAdmission.verdict !== "bearer-recovery"
    || candidateAdmission.openedArtifact.sealedArtifact.kind !== "receiz.native-record-seal") {
    fail("V124_PORTABLE_TRANSITION_CANDIDATE_UNADMITTED");
  }
  const candidateArtifact = candidateAdmission.openedArtifact.sealedArtifact;
  const unsigned = Object.fromEntries(
    Object.entries(record).filter(([key]) => key !== "identityProof"),
  ) as unknown as UnsignedTransitionMember;
  const identityChallenge = await createReceizPortableExecutionTransitionIdentityChallengeV124(unsigned);
  const identityAdmission = await admit(identityVerification, {
    profile: "identity",
    ...(predecessorAdmission.ownerReceizId
      ? { ownerConstraint: predecessorAdmission.ownerReceizId }
      : {}),
    ...(predecessorAdmission.actorConstraint
      ? { actorConstraint: predecessorAdmission.actorConstraint }
      : {}),
    identityExactChallenge: identityChallenge,
    identityProof: structuredClone(record.identityProof) as ReceizIdentityLoginProof,
  });
  if (identityAdmission.verdict !== "canonical-identity") {
    fail("V124_PORTABLE_TRANSITION_IDENTITY_UNADMITTED");
  }
  if (options.verifiedRegistryDiscovery) {
    await bindReceizArtifactAppendRegistryAuthority({
      admission: predecessorAdmission,
      registryDiscovery: options.verifiedRegistryDiscovery,
    });
  } else {
    await bindReceizCurrentArtifactAppendRegistryAuthority({
      admission: predecessorAdmission,
      registry: RECEIZ_CURRENT_CONSTITUTION_REGISTRY,
    });
  }
  const { transitionPlan } = await reconstructPortableTransition({
    admission: predecessorAdmission,
    verifiedHistory: predecessorAdmission.proofHistory,
    verifiedActorEvidence: identityAdmission,
    commitDomain: planning.commitDomain,
    namespace: planning.namespace,
    event: planning.event as unknown as ReceizConstitutionJson,
    expectedHead: planning.expectedHead,
    idempotencyKey: planning.idempotencyKey,
  }, candidateAdmission.proofHistory);
  const transportedCapability = record.signedCapability as ReceizSignedCapability;
  const revokedCapabilityDigests = artifactLocalCapabilityRevocations(predecessorAdmission.proofHistory);
  if (transportedCapability.payload.authorityProfile !== "artifact-local"
    || !Array.isArray(transportedCapability.payload.resourceScopes)
    || transportedCapability.payload.resourceScopes.length !== 1
    || transportedCapability.payload.resourceScopes[0] !== transitionPlan.resource) {
    fail("V124_PORTABLE_TRANSITION_REVOCATION_SCOPE_UNSUPPORTED");
  }
  let issuerKeyState: Awaited<ReturnType<typeof observeReceizHistoricalIdentityKeyState>>;
  try {
    issuerKeyState = await observeReceizHistoricalIdentityKeyState({
      keyStateEvidence: await verifyReceizIdentityKeyStateArtifactAdmission(identityAdmission),
    });
  } catch {
    fail("V124_PORTABLE_TRANSITION_REVOCATION_EVIDENCE_REQUIRED");
  }
  if (issuerKeyState.issuerKeyId !== transportedCapability.payload.issuerKeyId
    || issuerKeyState.actorId !== transportedCapability.payload.actorId
    || issuerKeyState.registryDigest !== transportedCapability.payload.registryDigest) {
    fail("V124_PORTABLE_TRANSITION_REVOCATION_EVIDENCE_REQUIRED");
  }
  if (BigInt(issuerKeyState.observedThroughKai) < BigInt(currentKai)) {
    fail("V124_PORTABLE_TRANSITION_REVOCATION_EVIDENCE_INCOMPLETE");
  }
  const issuerWasRevoked = issuerKeyState.revokedAtKai !== null
    && BigInt(issuerKeyState.revokedAtKai) <= BigInt(currentKai);
  const resolveIssuer = await createReceizCapabilityIssuerResolver({
    identityAdmissions: [identityAdmission],
    revokedIssuerKeyIds: issuerWasRevoked
      ? new Set([issuerKeyState.issuerKeyId])
      : new Set(),
  });
  const capabilityResult = await createReceizCapabilityVerifier({
    resolveAdmittedIssuer: resolveIssuer,
    currentKai,
    audience: options.audience,
    revokedCapabilityDigests,
    ...(options.verifiedRegistryDiscovery
      ? { verifiedRegistryDiscovery: options.verifiedRegistryDiscovery }
      : {}),
  })(transportedCapability, receizArtifactAppendCapabilityContext(transitionPlan));
  if (!capabilityResult.ok) fail(`V124_PORTABLE_TRANSITION_${capabilityResult.code}`);
  const candidate = await sealArtifactTransitionCandidate({
    plan: transitionPlan,
    capability: capabilityResult.capability,
    sealer: async () => candidateArtifact,
  });
  if (candidate.artifactDigest.value !== candidateWire.artifactSha256
    || transitionPlan.transition.expectedHead.value !== expectedHead) {
    fail("V124_PORTABLE_TRANSITION_CANDIDATE_MISMATCH");
  }
  return freeze({
    operationPlan,
    member: freeze({
      participantId,
      plan: transitionPlan,
      capability: capabilityResult.capability,
      candidate,
      priorHead: transitionPlan.transition.expectedHead.value,
      proposedHead: transitionPlan.transition.proposedHistoryHead.value,
      authority: freeze({
        verificationIsProofAuthority: false as const,
        candidateIsCommitted: false as const,
        strongerTruth: "sealed-receiz-proof-object" as const,
      }),
    }),
  });
}

async function verifyReceizPortableExecutionTransitionSetInternalV124(
  value: unknown,
  options: ReceizPortableExecutionTransitionVerifierOptionsV124,
): Promise<ReceizVerifiedPortableExecutionTransitionSetV124> {
  const record = exactObjectKeys(value, [
    "schema", "applicationId", "exactPlanDigest", "expectedParticipantHeads",
    "proposedParticipantHeads", "members", "authority",
  ], "V124_PORTABLE_TRANSITION_SET_INVALID");
  if (record.schema !== "receiz.portable-execution-transition-set.v124"
    || !Array.isArray(record.members) || record.members.length === 0) {
    fail("V124_PORTABLE_TRANSITION_SET_INVALID");
  }
  const applicationId = text(record.applicationId, "V124_PORTABLE_TRANSITION_SET_INVALID");
  const exactPlanDigest = digest(record.exactPlanDigest, "V124_PORTABLE_TRANSITION_SET_INVALID");
  const expectedParticipantHeads = exactHeads(
    record.expectedParticipantHeads,
    "V124_PORTABLE_TRANSITION_SET_INVALID",
  );
  const proposedParticipantHeads = exactHeads(
    record.proposedParticipantHeads,
    "V124_PORTABLE_TRANSITION_SET_INVALID",
  );
  const authority = exactObjectKeys(
    record.authority,
    ["transitionSetIsProofAuthority", "committed", "strongerTruth"],
    "V124_PORTABLE_TRANSITION_SET_INVALID",
  );
  if (authority.transitionSetIsProofAuthority !== false || authority.committed !== false
    || authority.strongerTruth !== "sealed-receiz-proof-object") {
    fail("V124_PORTABLE_TRANSITION_SET_INVALID");
  }
  const verifiedMembers: ReceizVerifiedPortableExecutionTransitionMemberV124[] = [];
  let operationPlan: ReceizOperationPlanV124 | null = null;
  let priorId = "";
  for (const candidate of record.members) {
    const verified = await verifyPortableTransitionMember(candidate, options);
    if (verified.member.participantId.localeCompare(priorId) <= 0) {
      fail("V124_PORTABLE_TRANSITION_MEMBER_ORDER_INVALID");
    }
    priorId = verified.member.participantId;
    if (operationPlan === null) operationPlan = verified.operationPlan;
    else if (canonicalizeReceizV122(operationPlan) !== canonicalizeReceizV122(verified.operationPlan)) {
      fail("V124_PORTABLE_TRANSITION_PLAN_SUBSTITUTION");
    }
    verifiedMembers.push(verified.member);
  }
  if (operationPlan === null
    || operationPlan.applicationId !== applicationId
    || operationPlan.exactPlanDigest !== exactPlanDigest
    || canonicalizeReceizV122(operationPlan.expectedParticipantHeads)
      !== canonicalizeReceizV122(expectedParticipantHeads)) {
    fail("V124_PORTABLE_TRANSITION_PLAN_MISMATCH");
  }
  const memberIds = verifiedMembers.map((member) => member.participantId);
  if (canonicalizeReceizV122(memberIds) !== canonicalizeReceizV122(Object.keys(expectedParticipantHeads))
    || canonicalizeReceizV122(memberIds) !== canonicalizeReceizV122(Object.keys(proposedParticipantHeads))) {
    fail("V124_PORTABLE_TRANSITION_PARTICIPANT_SET_MISMATCH");
  }
  for (const member of verifiedMembers) {
    if (member.priorHead !== expectedParticipantHeads[member.participantId]
      || member.proposedHead !== proposedParticipantHeads[member.participantId]) {
      fail("V124_PORTABLE_TRANSITION_PARTICIPANT_HEAD_MISMATCH");
    }
  }
  const verified = freeze({
    status: "verified-portable-execution-transition-set" as const,
    operationPlan,
    expectedParticipantHeads,
    proposedParticipantHeads,
    members: freeze(verifiedMembers),
    authority: freeze({
      transitionSetIsProofAuthority: false as const,
      committed: false as const,
      strongerTruth: "sealed-receiz-proof-object" as const,
    }),
  });
  return verified;
}

/** Arbitrary-root mechanics are diagnostics only; no SDK-issued candidate/set custody is exposed. */
export async function verifyReceizPortableExecutionTransitionSetWithVerifierContextV124(
  value: unknown,
  options: ReceizPortableExecutionTransitionVerifierOptionsV124,
): Promise<ReceizInspectedPortableExecutionTransitionSetV124> {
  const verified = await verifyReceizPortableExecutionTransitionSetInternalV124(value, options);
  return freeze({
    status: "inspected-portable-execution-transition-set" as const,
    applicationId: verified.operationPlan.applicationId,
    exactPlanDigest: verified.operationPlan.exactPlanDigest,
    expectedParticipantHeads: verified.expectedParticipantHeads,
    proposedParticipantHeads: verified.proposedParticipantHeads,
    members: freeze(verified.members.map((member) => freeze({
      participantId: member.participantId,
      priorHead: member.priorHead,
      proposedHead: member.proposedHead,
      candidateArtifactSha256: member.candidate.artifactDigest.value,
    }))),
    authority: freeze({
      inspectionIsProofAuthority: false as const,
      candidateCustodyExposed: false as const,
      committed: false as const,
      strongerTruth: "sealed-receiz-proof-object" as const,
    }),
  });
}

export function isReceizVerifiedPortableExecutionTransitionSetV124(
  value: unknown,
): value is ReceizVerifiedPortableExecutionTransitionSetV124 {
  return value !== null && typeof value === "object" && verifiedPortableTransitionSets.has(value);
}

export async function prepareReceizPortableExecutionTransitionCommitSetV124(
  value: ReceizVerifiedPortableExecutionTransitionSetV124,
): Promise<ReceizPreparedPortableExecutionTransitionCommitSetV124> {
  if (!isReceizVerifiedPortableExecutionTransitionSetV124(value)) {
    fail("V124_PORTABLE_TRANSITION_PRODUCTION_CUSTODY_REQUIRED");
  }
  const members: Array<ReceizPreparedPortableExecutionTransitionCommitSetV124["members"][number]> = [];
  for (const member of value.members) {
    const custody = readReceizArtifactTransitionCandidateCustody(member.candidate);
    if (!custody) fail("V124_PORTABLE_TRANSITION_CANDIDATE_UNVERIFIED");
    if (await sha256ReceizBytes(custody.exactBytes) !== member.candidate.artifactDigest.value) {
      fail("V124_PORTABLE_TRANSITION_CANDIDATE_UNVERIFIED");
    }
    const reference: ReceizStagedCandidateReference = freeze({
      commitDomain: structuredClone(member.plan.commitDomain),
      artifactDigest: structuredClone(member.candidate.artifactDigest),
      transitionDigest: structuredClone(member.candidate.transitionDigest),
      storageKeyDigest: freeze({
        algorithm: "sha-256" as const,
        binds: "candidate-storage-key" as const,
        value: await digestReceizAuthority(
          "command",
          "receiz.candidate-storage-key.v112",
          {
            commitDomain: member.plan.commitDomain,
            artifactDigest: member.candidate.artifactDigest,
          },
        ),
      }),
      authority: freeze({
        stagingReferenceIsProofAuthority: false as const,
        strongerTruth: "sealed-receiz-proof-object" as const,
      }),
    });
    const staged: ReceizStagedArtifactTransition = Object.freeze({
      status: "staged-transition" as const,
      reference,
      exactBytes: custody.exactBytes.slice(),
      filename: custody.filename,
      mimeType: custody.mimeType,
      payloadSha256: custody.payloadSha256,
      committed: false as const,
    });
    const stagedSnapshot = (): ReceizStagedArtifactTransition => Object.freeze({
      ...staged,
      reference: freeze(structuredClone(reference)),
      exactBytes: staged.exactBytes.slice(),
    });
    let captured: ReceizArtifactTransitionCommitUnit | null = null;
    const captureStore: ReceizArtifactTransitionStore = freeze({
      commitDomain: freeze(structuredClone(member.plan.commitDomain)),
      async stageCandidate(candidate) {
        if (candidate !== member.candidate) fail("V124_PORTABLE_TRANSITION_CANDIDATE_UNVERIFIED");
        return stagedSnapshot();
      },
      async resolveCandidate(artifactDigest) {
        return artifactDigest.value === member.candidate.artifactDigest.value
          ? stagedSnapshot()
          : null;
      },
      async commitTransition(unit): Promise<ReceizArtifactTransitionCommitResult> {
        const valid = await verifyReceizArtifactTransitionCommitCandidate(unit, {
          exactBytes: custody.exactBytes.slice(),
          staged,
          plan: unit.plan,
          capability: unit.capability,
          command: unit.command,
        });
        if (!valid) fail("V124_PORTABLE_TRANSITION_COMMIT_UNIT_INVALID");
        captured = unit;
        // Preparation deliberately never crosses the commit boundary.
        return { status: "rejected", code: "TRANSITION_MISMATCH" };
      },
    });
    const prepared = await commitArtifactTransition({
      plan: member.plan,
      capability: member.capability,
      staged,
      store: captureStore,
    });
    if (prepared.status !== "rejected" || prepared.code !== "TRANSITION_MISMATCH" || captured === null) {
      fail("V124_PORTABLE_TRANSITION_COMMIT_UNIT_INVALID");
    }
    const unit = captured as ReceizArtifactTransitionCommitUnit;
    const expectedReceipt: ReceizAppendReceipt = freeze({
      commitDomain: structuredClone(unit.commitDomain),
      actor: freeze({
        actorId: unit.plan.actor.actorId,
        evidenceDigest: structuredClone(unit.plan.actor.evidenceDigest),
        admissionProfile: "identity" as const,
        registryDigest: structuredClone(unit.plan.actor.registryDigest),
      }),
      resource: unit.plan.resource,
      operation: "artifact.append" as const,
      planDigest: structuredClone(unit.plan.planDigest),
      capabilityDigest: structuredClone(unit.command.capabilityDigest),
      transitionDigest: structuredClone(unit.plan.transitionDigest),
      artifactDigest: structuredClone(unit.command.candidateArtifactDigest),
      priorHead: structuredClone(unit.expectedHead),
      acceptedHead: structuredClone(unit.plan.transition.proposedHistoryHead),
      commandDigest: structuredClone(unit.command.commandDigest),
      idempotencyIdentityDigest: structuredClone(unit.plan.idempotencyKeyDigest),
      authority: freeze({
        receiptIsProofAuthority: false as const,
        strongerTruth: "sealed-receiz-proof-object" as const,
      }),
    });
    members.push(freeze({ participantId: member.participantId, commitUnit: unit, expectedReceipt }));
  }
  return freeze({
    schema: "receiz.prepared-portable-execution-transition-commit-set.v124" as const,
    operationPlan: value.operationPlan,
    members: freeze(members),
    authority: freeze({
      preparationIsProofAuthority: false as const,
      receiptIsProofAuthority: false as const,
      committed: false as const,
      strongerTruth: "sealed-receiz-proof-object" as const,
    }),
  });
}

/**
 * Packages already-committed edge transitions for portable synchronization.
 * Every transition must retain live SDK custody from the exact local commit;
 * a caller-created receipt or transported property bag cannot cross this boundary.
 */
export async function createReceizPortableExecutionTransitionRecoveryV124(input: Readonly<{
  applicationId: string;
  transitionSet: ReceizPortableExecutionTransitionSetV124;
  committedTransitions: readonly ReceizCommittedArtifactTransition[];
}>): Promise<ReceizPortableExecutionTransitionRecoveryV124> {
  const applicationId = text(input.applicationId, "V124_PORTABLE_TRANSITION_RECOVERY_INPUT_INVALID");
  const rawTransitionSet = freeze(structuredClone(input.transitionSet));
  const verified = await verifyReceizPortableExecutionTransitionSetV124(
    rawTransitionSet,
    { audience: applicationId },
  );
  const prepared = await prepareReceizPortableExecutionTransitionCommitSetV124(verified);
  if (!Array.isArray(input.committedTransitions)
    || input.committedTransitions.length !== prepared.members.length) {
    fail("V124_PORTABLE_TRANSITION_RECOVERY_PARTICIPANT_MISMATCH");
  }
  const members: Array<ReceizPortableExecutionTransitionRecoveryV124["members"][number]> = [];
  for (let index = 0; index < prepared.members.length; index += 1) {
    const preparedMember = prepared.members[index]!;
    const verifiedMember = verified.members[index]!;
    const committed = input.committedTransitions[index]!;
    if (!isSdkIssuedReceizCommittedArtifactTransition(committed) || committed.committed !== true) {
      fail("V124_PORTABLE_TRANSITION_COMMITTED_CUSTODY_REQUIRED");
    }
    const custody = readSdkIssuedReceizCommittedArtifactTransitionCustody(committed);
    if (custody.plan.planDigest.value !== verifiedMember.plan.planDigest.value
      || custody.plan.resource !== verifiedMember.plan.resource
      || custody.plan.commitDomain.value !== verifiedMember.plan.commitDomain.value
      || custody.plan.transitionDigest.value !== verifiedMember.plan.transitionDigest.value
      || custody.plan.transition.expectedHead.value !== verifiedMember.plan.transition.expectedHead.value
      || custody.plan.transition.proposedHistoryHead.value !== verifiedMember.plan.transition.proposedHistoryHead.value
      || custody.plan.actor.actorId !== verifiedMember.plan.actor.actorId
      || custody.plan.actor.evidenceDigest.value !== verifiedMember.plan.actor.evidenceDigest.value) {
      fail("V124_PORTABLE_TRANSITION_COMMITTED_PLAN_MISMATCH");
    }
    if (canonicalizeReceizV122(committed.receipt) !== canonicalizeReceizV122(preparedMember.expectedReceipt)) {
      fail("V124_PORTABLE_TRANSITION_COMMITTED_RECEIPT_MISMATCH");
    }
    if (committed.receipt.acceptedHead.value !== verifiedMember.proposedHead) {
      fail("V124_PORTABLE_TRANSITION_COMMITTED_HEAD_MISMATCH");
    }
    if (committed.artifactDigest.value !== verifiedMember.candidate.artifactDigest.value
      || committed.receipt.artifactDigest.value !== verifiedMember.candidate.artifactDigest.value) {
      fail("V124_PORTABLE_TRANSITION_COMMITTED_ARTIFACT_MISMATCH");
    }
    members.push(freeze({
      participantId: preparedMember.participantId,
      commitUnit: preparedMember.commitUnit,
      receipt: committed.receipt,
    }));
  }
  const recovery = freeze({
    schema: "receiz.portable-execution-transition-recovery.v124" as const,
    transitionSet: rawTransitionSet,
    members: freeze(members),
    authority: freeze({
      recoveryIsProofAuthority: false as const,
      receiptIsProofAuthority: false as const,
      strongerTruth: "sealed-receiz-proof-object" as const,
    }),
  });
  await recoverReceizPortableExecutionTransitionSetV124(recovery, { audience: applicationId });
  return recovery;
}

function stagedReferenceFromRecovery(
  value: unknown,
  member: ReceizVerifiedPortableExecutionTransitionMemberV124,
): ReceizStagedCandidateReference {
  const record = exactObjectKeys(
    value,
    ["commitDomain", "artifactDigest", "transitionDigest", "storageKeyDigest", "authority"],
    "V124_PORTABLE_TRANSITION_RECOVERY_UNIT_INVALID",
  );
  const commitDomain = exactObjectKeys(
    record.commitDomain,
    ["scheme", "value"],
    "V124_PORTABLE_TRANSITION_RECOVERY_UNIT_INVALID",
  );
  const parseBoundDigest = (candidate: unknown, binds: string) => {
    const entry = exactObjectKeys(
      candidate,
      ["algorithm", "binds", "value"],
      "V124_PORTABLE_TRANSITION_RECOVERY_UNIT_INVALID",
    );
    if (entry.algorithm !== "sha-256" || entry.binds !== binds) {
      fail("V124_PORTABLE_TRANSITION_RECOVERY_UNIT_INVALID");
    }
    return freeze({ algorithm: "sha-256" as const, binds, value: digest(entry.value, "V124_PORTABLE_TRANSITION_RECOVERY_UNIT_INVALID") });
  };
  const artifactDigest = parseBoundDigest(record.artifactDigest, "exact-artifact-bytes");
  const transitionDigest = parseBoundDigest(record.transitionDigest, "canonical-artifact-transition");
  const storageKeyDigest = parseBoundDigest(record.storageKeyDigest, "candidate-storage-key");
  const authority = exactObjectKeys(
    record.authority,
    ["stagingReferenceIsProofAuthority", "strongerTruth"],
    "V124_PORTABLE_TRANSITION_RECOVERY_UNIT_INVALID",
  );
  if (commitDomain.scheme !== "receiz-commit-domain.v1"
    || commitDomain.value !== member.plan.commitDomain.value
    || artifactDigest.value !== member.candidate.artifactDigest.value
    || transitionDigest.value !== member.plan.transitionDigest.value
    || authority.stagingReferenceIsProofAuthority !== false
    || authority.strongerTruth !== "sealed-receiz-proof-object") {
    fail("V124_PORTABLE_TRANSITION_RECOVERY_UNIT_INVALID");
  }
  return freeze({
    commitDomain: freeze({ scheme: "receiz-commit-domain.v1" as const, value: member.plan.commitDomain.value }),
    artifactDigest: artifactDigest as ReceizStagedCandidateReference["artifactDigest"],
    transitionDigest: transitionDigest as ReceizStagedCandidateReference["transitionDigest"],
    storageKeyDigest: storageKeyDigest as ReceizStagedCandidateReference["storageKeyDigest"],
    authority: freeze({
      stagingReferenceIsProofAuthority: false as const,
      strongerTruth: "sealed-receiz-proof-object" as const,
    }),
  });
}

function recoveryStore(input: Readonly<{
  member: ReceizVerifiedPortableExecutionTransitionMemberV124;
  persistedUnit: ReceizArtifactTransitionCommitUnit;
  receipt: ReceizAppendReceipt;
  issueCommittedCustody: boolean;
}>): Readonly<{ store: ReceizArtifactTransitionStore; inspected: () => boolean }> {
  const custody = readReceizArtifactTransitionCandidateCustody(input.member.candidate);
  if (!custody) fail("V124_PORTABLE_TRANSITION_RECOVERY_CANDIDATE_UNVERIFIED");
  const rawUnit = exactObjectKeys(
    input.persistedUnit,
    ["commitDomain", "plan", "capability", "command", "expectedHead"],
    "V124_PORTABLE_TRANSITION_RECOVERY_UNIT_INVALID",
  );
  const command = exactObjectKeys(
    rawUnit.command,
    ["planDigest", "capabilityDigest", "transitionDigest", "candidateArtifactDigest", "stagedCandidateReference", "commitDomain", "commandDigest"],
    "V124_PORTABLE_TRANSITION_RECOVERY_UNIT_INVALID",
  );
  const reference = stagedReferenceFromRecovery(command.stagedCandidateReference, input.member);
  const staged = Object.freeze({
    status: "staged-transition" as const,
    reference,
    exactBytes: custody.exactBytes.slice(),
    filename: custody.filename,
    mimeType: custody.mimeType,
    payloadSha256: custody.payloadSha256,
    committed: false as const,
  });
  const snapshot = (): ReceizStagedArtifactTransition => Object.freeze({
    ...staged,
    reference: freeze(structuredClone(staged.reference)),
    exactBytes: staged.exactBytes.slice(),
  });
  const commitUnitProjection = (unit: ReceizArtifactTransitionCommitUnit) => freeze({
    schema: "receiz.portable-artifact-transition-commit-unit.v124" as const,
    commitDomain: unit.commitDomain,
    actorId: unit.plan.actor.actorId,
    resource: unit.plan.resource,
    planDigest: unit.plan.planDigest,
    capabilityDigest: unit.command.capabilityDigest,
    transitionDigest: unit.plan.transitionDigest,
    candidateArtifactDigest: unit.command.candidateArtifactDigest,
    stagedCandidateReference: unit.command.stagedCandidateReference,
    commandDigest: unit.command.commandDigest,
    expectedHead: unit.expectedHead,
    proposedHead: unit.plan.transition.proposedHistoryHead,
  });
  let inspected = false;
  const store: ReceizArtifactTransitionStore = freeze({
    commitDomain: freeze(structuredClone(input.member.plan.commitDomain)),
    async stageCandidate(candidate) {
      if (candidate !== input.member.candidate) {
        fail("V124_PORTABLE_TRANSITION_RECOVERY_CANDIDATE_UNVERIFIED");
      }
      return snapshot();
    },
    async resolveCandidate(artifactDigest) {
      return artifactDigest.value === input.member.candidate.artifactDigest.value ? snapshot() : null;
    },
    async commitTransition(unit): Promise<ReceizArtifactTransitionCommitResult> {
      const validCandidate = await verifyReceizArtifactTransitionCommitCandidate(unit, {
        exactBytes: staged.exactBytes.slice(),
        staged: snapshot(),
        plan: unit.plan,
        capability: unit.capability,
        command: unit.command,
      });
      let sameUnit = false;
      try {
        sameUnit = canonicalizeReceizV122(commitUnitProjection(unit))
          === canonicalizeReceizV122(commitUnitProjection(input.persistedUnit));
      } catch {
        sameUnit = false;
      }
      const expectedReceipt = freeze({
        commitDomain: unit.commitDomain,
        actor: freeze({
          actorId: unit.plan.actor.actorId,
          evidenceDigest: unit.plan.actor.evidenceDigest,
          admissionProfile: "identity" as const,
          registryDigest: unit.plan.actor.registryDigest,
        }),
        resource: unit.plan.resource,
        operation: "artifact.append" as const,
        planDigest: unit.plan.planDigest,
        capabilityDigest: unit.command.capabilityDigest,
        transitionDigest: unit.plan.transitionDigest,
        artifactDigest: unit.command.candidateArtifactDigest,
        priorHead: unit.expectedHead,
        acceptedHead: unit.plan.transition.proposedHistoryHead,
        commandDigest: unit.command.commandDigest,
        idempotencyIdentityDigest: unit.plan.idempotencyKeyDigest,
        authority: freeze({
          receiptIsProofAuthority: false as const,
          strongerTruth: "sealed-receiz-proof-object" as const,
        }),
      });
      let sameReceipt = false;
      try {
        sameReceipt = canonicalizeReceizV122(expectedReceipt) === canonicalizeReceizV122(input.receipt);
      } catch {
        sameReceipt = false;
      }
      inspected = validCandidate && sameUnit && sameReceipt;
      if (!validCandidate) fail("V124_PORTABLE_TRANSITION_RECOVERY_CANDIDATE_INSPECTION_FAILED");
      if (!sameUnit) fail("V124_PORTABLE_TRANSITION_RECOVERY_UNIT_INSPECTION_FAILED");
      if (!sameReceipt) fail("V124_PORTABLE_TRANSITION_RECOVERY_RECEIPT_INSPECTION_FAILED");
      if (!inspected || !input.issueCommittedCustody) {
        return { status: "rejected", code: "TRANSITION_MISMATCH" };
      }
      return { status: "idempotent", receipt: structuredClone(input.receipt) };
    },
  });
  return freeze({ store, inspected: () => inspected });
}

async function processReceizPortableExecutionTransitionRecoveryV124(
  value: unknown,
  transitionSet: ReceizVerifiedPortableExecutionTransitionSetV124,
  issueCommittedCustody: boolean,
): Promise<ReceizRecoveredPortableExecutionTransitionSetV124 | ReceizInspectedPortableExecutionTransitionRecoveryV124> {
  const record = exactObjectKeys(
    value,
    ["schema", "transitionSet", "members", "authority"],
    "V124_PORTABLE_TRANSITION_RECOVERY_INVALID",
  );
  if (record.schema !== "receiz.portable-execution-transition-recovery.v124"
    || !Array.isArray(record.members) || record.members.length === 0) {
    fail("V124_PORTABLE_TRANSITION_RECOVERY_INVALID");
  }
  const authority = exactObjectKeys(
    record.authority,
    ["recoveryIsProofAuthority", "receiptIsProofAuthority", "strongerTruth"],
    "V124_PORTABLE_TRANSITION_RECOVERY_INVALID",
  );
  if (authority.recoveryIsProofAuthority !== false || authority.receiptIsProofAuthority !== false
    || authority.strongerTruth !== "sealed-receiz-proof-object") {
    fail("V124_PORTABLE_TRANSITION_RECOVERY_INVALID");
  }
  if (record.members.length !== transitionSet.members.length) {
    fail("V124_PORTABLE_TRANSITION_RECOVERY_PARTICIPANT_MISMATCH");
  }
  const transitions: ReceizCommittedArtifactTransition[] = [];
  for (let index = 0; index < transitionSet.members.length; index += 1) {
    const member = transitionSet.members[index]!;
    const recovery = exactObjectKeys(
      record.members[index],
      ["participantId", "commitUnit", "receipt"],
      "V124_PORTABLE_TRANSITION_RECOVERY_MEMBER_INVALID",
    );
    if (recovery.participantId !== member.participantId) {
      fail("V124_PORTABLE_TRANSITION_RECOVERY_PARTICIPANT_MISMATCH");
    }
    const recoveryMechanics = recoveryStore({
      member,
      persistedUnit: structuredClone(recovery.commitUnit) as ReceizArtifactTransitionCommitUnit,
      receipt: structuredClone(recovery.receipt) as ReceizAppendReceipt,
      issueCommittedCustody,
    });
    const store = recoveryMechanics.store;
    const staged = await store.stageCandidate(member.candidate);
    const committed = await commitArtifactTransition({
      plan: member.plan,
      capability: member.capability,
      staged,
      store,
    });
    if (!issueCommittedCustody) {
      if (committed.status !== "rejected" || !recoveryMechanics.inspected()) {
        fail("V124_PORTABLE_TRANSITION_RECOVERY_INSPECTION_FAILED");
      }
      continue;
    }
    if (committed.status !== "committed-artifact-transition") {
      fail(`V124_PORTABLE_TRANSITION_RECOVERY_${committed.code}`);
    }
    transitions.push(committed);
  }
  if (!issueCommittedCustody) {
    return freeze({
      status: "inspected-portable-execution-transition-recovery" as const,
      participantIds: freeze(transitionSet.members.map((member) => member.participantId)),
      authority: freeze({
        inspectionIsProofAuthority: false as const,
        committedCustodyIssued: false as const,
        strongerTruth: "sealed-receiz-proof-object" as const,
      }),
    });
  }
  return freeze({
    status: "recovered-portable-execution-transition-set" as const,
    transitions: freeze(transitions),
    authority: freeze({
      recoveryIsProofAuthority: false as const,
      strongerTruth: "sealed-receiz-proof-object" as const,
    }),
  });
}

/** Arbitrary-root mechanics inspect exact binding only and cannot issue candidate or committed custody. */
export async function inspectReceizPortableExecutionTransitionRecoveryWithVerifierContextV124(
  value: unknown,
  options: ReceizPortableExecutionTransitionVerifierOptionsV124,
): Promise<ReceizInspectedPortableExecutionTransitionRecoveryV124> {
  const holder = exactObjectKeys(value, ["schema", "transitionSet", "members", "authority"], "V124_PORTABLE_TRANSITION_RECOVERY_INVALID");
  const transitionSet = await verifyReceizPortableExecutionTransitionSetInternalV124(
    holder.transitionSet,
    options,
  );
  const inspected = await processReceizPortableExecutionTransitionRecoveryV124(value, transitionSet, false);
  if (inspected.status !== "inspected-portable-execution-transition-recovery") {
    fail("V124_PORTABLE_TRANSITION_RECOVERY_INSPECTION_FAILED");
  }
  return inspected;
}

/** Production entrypoint: repository-pinned roots and the canonical live Kai clock only. */
export async function verifyReceizPortableExecutionTransitionSetV124(
  value: unknown,
  input: Readonly<{ audience: string }>,
): Promise<ReceizVerifiedPortableExecutionTransitionSetV124> {
  const holder = exactObjectKeys(input, ["audience"], "V124_PORTABLE_TRANSITION_VERIFIER_INPUT_INVALID");
  const verified = await verifyReceizPortableExecutionTransitionSetInternalV124(value, {
    audience: text(holder.audience, "V124_PORTABLE_TRANSITION_VERIFIER_INPUT_INVALID"),
    currentKai: String(receizKaiNow().pulse),
  });
  verifiedPortableTransitionSets.add(verified);
  return verified;
}

/** Production recovery reopens every source with pinned roots and live Kai. */
export async function recoverReceizPortableExecutionTransitionSetV124(
  value: unknown,
  input: Readonly<{ audience: string }>,
): Promise<ReceizRecoveredPortableExecutionTransitionSetV124> {
  const holder = exactObjectKeys(input, ["audience"], "V124_PORTABLE_TRANSITION_VERIFIER_INPUT_INVALID");
  const recovery = exactObjectKeys(value, ["schema", "transitionSet", "members", "authority"], "V124_PORTABLE_TRANSITION_RECOVERY_INVALID");
  const transitionSet = await verifyReceizPortableExecutionTransitionSetV124(recovery.transitionSet, {
    audience: text(holder.audience, "V124_PORTABLE_TRANSITION_VERIFIER_INPUT_INVALID"),
  });
  const restored = await processReceizPortableExecutionTransitionRecoveryV124(value, transitionSet, true);
  if (restored.status !== "recovered-portable-execution-transition-set") {
    fail("V124_PORTABLE_TRANSITION_RECOVERY_INVALID");
  }
  return restored;
}

export async function verifyReceizPortableExecutionAuthorityEvidenceV124(
  value: unknown,
  options: ReceizPortableExecutionAuthorityVerifierOptionsV124,
): Promise<ReceizVerifiedPortableExecutionAuthorityV124> {
  const record = exactObjectKeys(value, ["schema", "profile", "participantId", "operationPlan", "request", "outcome", "planning", "predecessor", "successor", "identityArtifact", "signedCapability", "identityProof", "authority"], "V124_PORTABLE_AUTHORITY_EVIDENCE_INVALID");
  if (record.schema !== "receiz.portable-execution-authority.v124" || record.profile !== "portable-state") fail("V124_PORTABLE_AUTHORITY_EVIDENCE_INVALID");
  const authority = exactObjectKeys(record.authority, ["evidenceIsProofAuthority", "strongerTruth"], "V124_PORTABLE_AUTHORITY_EVIDENCE_INVALID");
  if (authority.evidenceIsProofAuthority !== false || authority.strongerTruth !== "sealed-receiz-proof-object") fail("V124_PORTABLE_AUTHORITY_EVIDENCE_INVALID");
  const participantId = text(record.participantId, "V124_PORTABLE_AUTHORITY_PARTICIPANT_INVALID");
  const plan = await validateReceizOperationPlanV124(record.operationPlan);
  const exactRequest = request(record.request);
  const outcome = await committedOutcome(record.outcome);
  const coordinates = outcomeCoordinates(Object.fromEntries(Object.entries(outcome).filter(([key]) => ["schema", "status", "executionId", "applicationId", "domainId", "operationKind", "exactPlanDigest", "semanticIdempotencyKey", "attemptId", "terminalAtKaiUPulse"].includes(key))));
  const planning = exactPlanning(record.planning);
  const expectedEvent = await createReceizPortableExecutionAuthorityEventV124({ participantId, operationPlan: plan, request: exactRequest, outcomeCoordinates: coordinates });
  if (canonicalizeReceizV122(planning.event) !== canonicalizeReceizV122(expectedEvent)) fail("V124_PORTABLE_AUTHORITY_EVENT_MISMATCH");
  const expectedPriorHead = plan.expectedParticipantHeads[participantId];
  const committedHeads = outcome.committedHeads as Readonly<Record<string, string>>;
  const committedHead = committedHeads[participantId];
  if (!expectedPriorHead || planning.expectedHead.value !== expectedPriorHead || !committedHead
    || Object.keys(committedHeads).length !== 1
    || Object.keys(committedHeads)[0] !== participantId) {
    fail("V124_PORTABLE_AUTHORITY_PARTICIPANT_MISMATCH");
  }

  const predecessorWire = exactArtifact(record.predecessor);
  const successorWire = exactArtifact(record.successor);
  const identityWire = exactArtifact(record.identityArtifact);
  const predecessorVerification = await verifyArtifact(predecessorWire, options);
  const successorVerification = await verifyArtifact(successorWire, options);
  const identityVerification = await verifyArtifact(identityWire, options);
  const admissionDependencies = {
    ...(options.canonicalSignatureV4RootPublicKeys
      ? { canonicalSignatureV4RootPublicKeys: options.canonicalSignatureV4RootPublicKeys }
      : {}),
    ...(options.verifiedRegistryDiscovery
      ? { verifiedRegistryDiscovery: options.verifiedRegistryDiscovery }
      : {}),
  };
  const admit = createReceizArtifactAdmissionEngine(admissionDependencies);
  const predecessorAdmission = await admit(predecessorVerification, { profile: "portable-state" });
  if (predecessorAdmission.verdict !== "bearer-recovery" || !predecessorAdmission.proofHistory) fail("V124_PORTABLE_AUTHORITY_PREDECESSOR_UNADMITTED");
  const successorAdmission = await admit(successorVerification, { profile: "portable-state" });
  if (successorAdmission.verdict !== "bearer-recovery"
    || successorAdmission.openedArtifact.sealedArtifact.kind !== "receiz.native-record-seal") {
    fail("V124_PORTABLE_AUTHORITY_SUCCESSOR_UNADMITTED");
  }

  const unsigned = Object.fromEntries(Object.entries(record).filter(([key]) => key !== "identityProof")) as unknown as UnsignedEvidence;
  const challengeText = await createReceizPortableExecutionAuthorityIdentityChallengeV124(unsigned);
  const identityAdmission = await admit(identityVerification, {
    profile: "identity",
    ...(predecessorAdmission.ownerReceizId
      ? { ownerConstraint: predecessorAdmission.ownerReceizId }
      : {}),
    ...(predecessorAdmission.actorConstraint
      ? { actorConstraint: predecessorAdmission.actorConstraint }
      : {}),
    identityExactChallenge: challengeText,
    identityProof: structuredClone(record.identityProof) as ReceizIdentityLoginProof,
  });
  if (identityAdmission.verdict !== "canonical-identity") fail("V124_PORTABLE_AUTHORITY_IDENTITY_UNADMITTED");

  if (options.verifiedRegistryDiscovery) {
    await bindReceizArtifactAppendRegistryAuthority({ admission: predecessorAdmission, registryDiscovery: options.verifiedRegistryDiscovery });
  } else {
    await bindReceizCurrentArtifactAppendRegistryAuthority({ admission: predecessorAdmission, registry: RECEIZ_CURRENT_CONSTITUTION_REGISTRY });
  }
  const { transitionPlan, coordinate: exactCompletion } = await reconstructPortableTransition({
    admission: predecessorAdmission,
    verifiedHistory: predecessorAdmission.proofHistory,
    verifiedActorEvidence: identityAdmission,
    commitDomain: planning.commitDomain,
    namespace: planning.namespace,
    event: planning.event as unknown as ReceizConstitutionJson,
    expectedHead: planning.expectedHead,
    idempotencyKey: planning.idempotencyKey,
  }, successorAdmission.proofHistory);
  const transportedCapability = record.signedCapability as ReceizSignedCapability;
  const revokedCapabilityDigests = artifactLocalCapabilityRevocations(predecessorAdmission.proofHistory);
  if (transportedCapability.payload.authorityProfile !== "artifact-local"
    || !Array.isArray(transportedCapability.payload.resourceScopes)
    || transportedCapability.payload.resourceScopes.length !== 1
    || transportedCapability.payload.resourceScopes[0] !== transitionPlan.resource) {
    fail("V124_PORTABLE_AUTHORITY_REVOCATION_SCOPE_UNSUPPORTED");
  }
  const terminalKai = terminalWholeKai(coordinates.terminalAtKaiUPulse);
  if (exactCompletion && BigInt(coordinates.terminalAtKaiUPulse) !== BigInt(exactCompletion.kaiUpulse)) {
    fail("V124_PORTABLE_AUTHORITY_EXACT_KKS_TERMINAL_MISMATCH");
  }
  let issuerKeyState: Awaited<ReturnType<typeof observeReceizHistoricalIdentityKeyState>>;
  try {
    issuerKeyState = await observeReceizHistoricalIdentityKeyState({
      keyStateEvidence: await verifyReceizIdentityKeyStateArtifactAdmission(identityAdmission),
    });
  } catch {
    fail("V124_PORTABLE_AUTHORITY_REVOCATION_EVIDENCE_REQUIRED");
  }
  if (issuerKeyState.issuerKeyId !== transportedCapability.payload.issuerKeyId
    || issuerKeyState.actorId !== transportedCapability.payload.actorId
    || issuerKeyState.registryDigest !== transportedCapability.payload.registryDigest) {
    fail("V124_PORTABLE_AUTHORITY_REVOCATION_EVIDENCE_REQUIRED");
  }
  if (BigInt(issuerKeyState.observedThroughKai) < BigInt(terminalKai)) {
    fail("V124_PORTABLE_AUTHORITY_REVOCATION_EVIDENCE_INCOMPLETE");
  }
  const issuerWasRevoked = issuerKeyState.revokedAtKai !== null
    && BigInt(issuerKeyState.revokedAtKai) <= BigInt(terminalKai);
  const resolveIssuer = await createReceizCapabilityIssuerResolver({
    identityAdmissions: [identityAdmission],
    revokedIssuerKeyIds: issuerWasRevoked
      ? new Set([issuerKeyState.issuerKeyId])
      : new Set(),
  });
  const capability = await createReceizCapabilityVerifier({
    resolveAdmittedIssuer: resolveIssuer,
    currentKai: terminalKai,
    audience: options.audience,
    revokedCapabilityDigests,
    ...(options.verifiedRegistryDiscovery ? { verifiedRegistryDiscovery: options.verifiedRegistryDiscovery } : {}),
  })(transportedCapability, receizArtifactAppendCapabilityContext(transitionPlan));
  if (!capability.ok) fail(`V124_PORTABLE_AUTHORITY_${capability.code}`);
  const successorArtifact = successorAdmission.openedArtifact.sealedArtifact;
  const candidate = await sealArtifactTransitionCandidate({
    plan: transitionPlan,
    capability: capability.capability,
    sealer: async () => successorArtifact,
  });
  if (candidate.artifactDigest.value !== successorWire.artifactSha256
    || transitionPlan.transition.expectedHead.value !== expectedPriorHead
    || transitionPlan.transition.proposedHistoryHead.value !== committedHead) {
    fail("V124_PORTABLE_AUTHORITY_TRANSITION_MISMATCH");
  }
  const reopened = await reverifyReceizArtifactWithAdmissionContext({
    predecessorAdmission,
    candidateArtifact: successorArtifact,
  });
  const portable = await parseReceizPortableAssetDocument(JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(reopened.payloadBytes)));
  if (!portable.receizProofHistory) fail("V124_PORTABLE_AUTHORITY_HISTORY_MISSING");
  const carriedHistory = await verifyReceizCarriedProofHistory({
    history: portable.receizProofHistory.history,
    artifactId: predecessorAdmission.artifactId,
    registryDigest: predecessorAdmission.admissionProof.registryDigest,
    artifactDigest: reopened.artifactDigest.value,
    verifierContextDigest: reopened.verifierContextDigest,
  });
  const carriedHistoryHead = carriedHistory.headDigests[0];
  if (carriedHistoryHead !== committedHead) fail("V124_PORTABLE_AUTHORITY_HISTORY_HEAD_MISMATCH");
  const priorHeadNode = predecessorAdmission.proofHistory.nodes.find((node) => node.nodeDigest === expectedPriorHead);
  if (!priorHeadNode) fail("V124_PORTABLE_AUTHORITY_PRIOR_HEAD_KAI_MISSING");
  const exactPrior = exactCompletion ? await readReceizProofHistoryExactKksCoordinate(priorHeadNode) : null;
  if (exactCompletion && !exactPrior) fail("V124_PORTABLE_AUTHORITY_PRIOR_HEAD_KAI_MISSING");
  const verified = freeze({
    status: "verified-portable-execution-authority" as const,
    plan,
    request: exactRequest,
    outcome,
    participantId,
    actorReceizId: capability.capability.payload.actorId,
    priorHead: expectedPriorHead,
    priorHeadKai: priorHeadNode.kaiPulse,
    committedHead,
    carriedHistoryHead,
    completionKai: terminalKai,
    ...(exactCompletion && exactPrior ? { exactKksCoordinates: freeze({ priorHead: exactPrior, completion: exactCompletion }) } : {}),
    requestDigest: expectedEvent.requestDigest,
    successorArtifact: reopened.artifact,
    authority: freeze({ verificationIsProofAuthority: false as const, strongerTruth: "sealed-receiz-proof-object" as const }),
  });
  verifiedPortableAuthorities.add(verified);
  return verified;
}

export function isReceizVerifiedPortableExecutionAuthorityV124(
  value: unknown,
): value is ReceizVerifiedPortableExecutionAuthorityV124 {
  return value !== null && typeof value === "object" && verifiedPortableAuthorities.has(value);
}
