import type { ReceizArtifactInput } from "./artifactInput.js";
import type { ReceizVerifiedActorReference, ReceizVerifiedArtifactAdmission } from "./artifactAdmissionTypes.js";
import type {
  ReceizReconciliationCapabilityPayload,
  ReceizSignedReconciliationCapability,
  ReceizVerifiedReconciliationCapability,
} from "./capabilityAuthority.js";
import type { ReceizSignedCapability } from "./capabilityAuthority.js";
import type {
  ReceizArtifactDigest,
  ReceizArtifactId,
  ReceizCapabilityDigest,
  ReceizCommandDigest,
  ReceizCommitDomainId,
  ReceizDigest,
  ReceizEffectsDigest,
  ReceizHistoryDigest,
  ReceizIdempotencyDigest,
  ReceizRegistryDigest,
} from "./artifactTransition.js";
import type { ReceizAppendReceipt, ReceizReportedActorReference } from "./artifactTransitionStore.js";
import type { ReceizProofHistoryNode, ReceizVerifiedProofHistory } from "./proofHistory.js";
import type { ReceizCarriedProofHistoryHeadV114 } from "./compositeProofTransport.js";

export const RECEIZ_V113_GLOBAL_COMMIT_DOMAIN = Object.freeze({
  scheme: "receiz-commit-domain.v1",
  value: "receiz.com/global/v1",
} as const satisfies ReceizCommitDomainId);

export const RECEIZ_RECONCILIATION_REJECTION_CODES = Object.freeze([
  "ARTIFACT_VERIFICATION_FAILED",
  "HISTORY_VERIFICATION_FAILED",
  "NO_COMMON_PREDECESSOR",
  "COMMIT_DOMAIN_MISMATCH",
  "CONNECT_ACCOUNT_MISMATCH",
  "IDENTITY_SEAL_MISMATCH",
  "TENANT_MISMATCH",
  "CAPABILITY_MISMATCH",
  "CAPABILITY_EXPIRED",
  "IDENTITY_KEY_REVOKED",
  "TOKEN_REVOKED",
  "AUTHORIZATION_STATE_CHANGED",
  "STAGED_BYTES_MISMATCH",
  "IDEMPOTENT_ATTEMPT_EVIDENCE_MISMATCH",
  "ARTIFACT_TOO_LARGE",
  "ARCHIVE_LIMIT_EXCEEDED",
  "ARCHIVE_PATH_INVALID",
  "ARCHIVE_COMPRESSION_LIMIT_EXCEEDED",
  "ARCHIVE_RECURSION_FORBIDDEN",
  "HISTORY_TOO_DEEP",
  "RECONCILIATION_BATCH_TOO_LARGE",
  "PREDECESSOR_FETCH_LIMIT_EXCEEDED",
  "NAMESPACE_LIMIT_EXCEEDED",
  "VERIFICATION_BUDGET_EXCEEDED",
  "VERIFICATION_RESOURCE_UNAVAILABLE",
  "STAGING_QUOTA_EXCEEDED",
  "RATE_LIMITED",
  "CONCURRENCY_LIMIT_EXCEEDED",
  "SERVICE_CAPACITY_UNAVAILABLE",
] as const);

export type ReceizReconciliationRejectionCode = typeof RECEIZ_RECONCILIATION_REJECTION_CODES[number];
export type ReceizTenantId = Readonly<{ scheme: "receiz-tenant.v1"; value: string }>;
export type ReceizAccountId = Readonly<{ scheme: "receiz-account.v1"; value: string }>;
export type ReceizReconciliationAttemptId = Readonly<{ scheme: "receiz-reconciliation-attempt.v1"; value: string }>;
export type ReceizReconciliationPlanDigest = ReceizDigest<"offline-reconciliation-plan">;
export type ReceizApplicationOperationMatrixDigest = ReceizDigest<"application-operation-matrix">;
export type ReceizStorageIntegrityDigest = ReceizDigest<"immutable-stored-artifact-bytes">;
export type ReceizAcceptedHeadExpectation =
  | Readonly<{ status: "unaccepted" }>
  | Readonly<{ status: "accepted"; head: ReceizHistoryDigest }>;

declare const receizVerifiedArtifactBrand: unique symbol;
export type ReceizVerifiedArtifact = Readonly<{
  exactBytes: Uint8Array;
  artifactDigest: ReceizArtifactDigest;
  history: ReceizVerifiedProofHistory;
  admission: ReceizVerifiedArtifactAdmission;
  [receizVerifiedArtifactBrand]: true;
}>;

declare const receizVerifiedBoundedProfileShowcaseArtifactBrand: unique symbol;
export type ReceizVerifiedBoundedProfileShowcaseArtifact = Readonly<{
  exactBytes: Uint8Array;
  artifactDigest: ReceizArtifactDigest;
  historyHead: ReceizCarriedProofHistoryHeadV114;
  profileIdentity: string;
  admission: Extract<ReceizVerifiedArtifactAdmission, { profile: "profile-showcase" }>;
  [receizVerifiedBoundedProfileShowcaseArtifactBrand]: true;
}>;

/**
 * Retrieves a sealed merge artifact that has already passed SDK verification.
 * This is custody/retrieval mechanics only: the returned artifact remains the
 * proof authority for the merge and all of its carried parent heads.
 */
export type ReceizVerifiedMergeArtifactResolver = (
  nodeDigest: string,
) => Promise<ReceizVerifiedArtifact | null>;

export type ReceizEffectReport = Readonly<{
  digest: ReceizEffectsDigest;
  status: "none" | "pending";
}>;

export type ReceizAcceptedHeadReport = Readonly<{
  commitDomain: ReceizCommitDomainId;
  tenantId: ReceizTenantId;
  artifactId: ReceizArtifactId;
  artifactDigest: ReceizArtifactDigest;
  acceptedHead: ReceizHistoryDigest;
  registryDigest: ReceizRegistryDigest;
  operationMatrixDigest: ReceizApplicationOperationMatrixDigest;
  effects: ReceizEffectReport;
  authority: Readonly<{
    acceptanceReportIsProofAuthority: false;
    strongerTruth: "sealed-receiz-proof-object";
  }>;
}>;

export type ReceizOfflineReconciliationPlanInput = Readonly<{
  artifactId: ReceizArtifactId;
  issuerKeyId: string;
  expectedAcceptedHead: ReceizAcceptedHeadExpectation;
  sealedArtifact: ReceizArtifactInput;
  localHistory?: ReceizVerifiedProofHistory;
  localReceipts?: readonly ReceizAppendReceipt[];
  idempotencyKey: string;
}>;

export type ReceizOfflineReconciliationPlan = Readonly<{
  schema: "receiz.offline-reconciliation-plan.v113";
  attemptId: ReceizReconciliationAttemptId;
  commitDomain: ReceizCommitDomainId;
  tenantId: ReceizTenantId;
  actor: ReceizVerifiedActorReference;
  artifactId: ReceizArtifactId;
  candidateArtifactDigest: ReceizArtifactDigest;
  expectedAcceptedHead: ReceizAcceptedHeadExpectation;
  proposedAcceptedHead: ReceizHistoryDigest;
  orderedAdditionDigests: readonly ReceizHistoryDigest[];
  additionCount: number;
  registryDigest: ReceizRegistryDigest;
  operationMatrixDigest: ReceizApplicationOperationMatrixDigest;
  effectsDigest: ReceizEffectsDigest;
  idempotencyIdentityDigest: ReceizIdempotencyDigest;
  planDigest: ReceizReconciliationPlanDigest;
  authority: Readonly<{
    planIsProofAuthority: false;
    strongerTruth: "sealed-receiz-proof-object";
  }>;
}>;

export type ReceizReconciliationStageConfirmation = Readonly<{
  schema: "receiz.reconciliation-stage-confirmation.v113";
  attemptId: ReceizReconciliationAttemptId;
  planDigest: ReceizReconciliationPlanDigest;
  candidateArtifactDigest: ReceizArtifactDigest;
  commitDomain: ReceizCommitDomainId;
  tenantId: ReceizTenantId;
  confirmationDigest: ReceizDigest<"reconciliation-stage-confirmation">;
}>;

export type ReceizStagedReconciliationReference = Readonly<{
  commitDomain: ReceizCommitDomainId;
  tenantId: ReceizTenantId;
  artifactId: ReceizArtifactId;
  artifactDigest: ReceizArtifactDigest;
  reconciliationPlanDigest: ReceizReconciliationPlanDigest;
  proposedAcceptedHead: ReceizHistoryDigest;
  byteLength: number;
  immutableObjectVersion: string;
  storageIntegrityDigest: ReceizStorageIntegrityDigest;
  storageKeyDigest: ReceizDigest<"candidate-storage-key">;
  authority: Readonly<{
    stagingReferenceIsProofAuthority: false;
    strongerTruth: "sealed-receiz-proof-object";
  }>;
}>;

export type ReceizReconciliationCommitConfirmation = Readonly<{
  schema: "receiz.reconciliation-commit-confirmation.v113";
  attemptId: ReceizReconciliationAttemptId;
  planDigest: ReceizReconciliationPlanDigest;
  capabilityDigest: ReceizCapabilityDigest;
  stagedReferenceDigest: ReceizDigest<"staged-reconciliation-reference">;
  expectedAcceptedHead: ReceizAcceptedHeadExpectation;
  commandDigest: ReceizCommandDigest;
  commitDomain: ReceizCommitDomainId;
  registryDigest: ReceizRegistryDigest;
  operationMatrixDigest: ReceizApplicationOperationMatrixDigest;
  confirmationDigest: ReceizDigest<"reconciliation-commit-confirmation">;
}>;

export type ReceizVerifiedReconciliationCommitCommand = Readonly<{
  schema: "receiz.verified-reconciliation-commit-command.v113";
  plan: ReceizOfflineReconciliationPlan;
  stagedReference: ReceizStagedReconciliationReference;
  capability: ReceizVerifiedReconciliationCapability;
  stagedReferenceDigest: ReceizDigest<"staged-reconciliation-reference">;
  commandDigest: ReceizCommandDigest;
  authority: Readonly<{
    commandIsProofAuthority: false;
    strongerTruth: "sealed-receiz-proof-object";
  }>;
}>;

export type ReceizReconciliationReceipt = Readonly<{
  operation: "artifact.reconcile";
  commitDomain: ReceizCommitDomainId;
  actor: ReceizReportedActorReference;
  artifactId: ReceizArtifactId;
  artifactDigest: ReceizArtifactDigest;
  priorAcceptedHead: ReceizAcceptedHeadExpectation;
  acceptedHead: ReceizHistoryDigest;
  planDigest: ReceizReconciliationPlanDigest;
  capabilityDigest: ReceizCapabilityDigest;
  commandDigest: ReceizCommandDigest;
  idempotencyIdentityDigest: ReceizIdempotencyDigest;
  effects: ReceizEffectReport;
  authority: Readonly<{
    receiptIsProofAuthority: false;
    strongerTruth: "sealed-receiz-proof-object";
  }>;
}>;

export type ReceizReconciliationWarning = Readonly<{ code: "LOCAL_RECEIPT_INCONSISTENT" }>;

export type ReceizOfflineReconciliationResult =
  | Readonly<{ status: "idempotent"; artifact: ReceizVerifiedArtifact; receipt: ReceizReconciliationReceipt; effects: ReceizEffectReport; warnings: readonly ReceizReconciliationWarning[] }>
  | Readonly<{ status: "already-accepted"; artifact: ReceizVerifiedArtifact; acceptance: ReceizAcceptedHeadReport; warnings: readonly ReceizReconciliationWarning[] }>
  | Readonly<{ status: "accepted"; relation: "direct-successor" | "verified-descendant"; additionCount: number; artifact: ReceizVerifiedArtifact; receipt: ReceizReconciliationReceipt; effects: ReceizEffectReport; warnings: readonly ReceizReconciliationWarning[] }>
  | Readonly<{ status: "remote-ahead"; artifact: ReceizVerifiedArtifact; verifiedAdditions: readonly ReceizProofHistoryNode[]; warnings: readonly ReceizReconciliationWarning[] }>
  | Readonly<{ status: "divergent"; code: "SIBLING_BRANCHES" | "TARGET_NAMESPACE_CONFLICT"; localHead: ReceizHistoryDigest; acceptedHead: ReceizHistoryDigest; commonPredecessor: ReceizHistoryDigest; warnings: readonly ReceizReconciliationWarning[] }>
  | Readonly<{ status: "rejected"; code: ReceizReconciliationRejectionCode; warnings: readonly ReceizReconciliationWarning[] }>
  | Readonly<{ status: "indeterminate"; code: "COMMIT_OUTCOME_UNKNOWN"; attemptId: ReceizReconciliationAttemptId; idempotencyIdentityDigest: ReceizIdempotencyDigest }>
  | Readonly<{ status: "failed"; code: "NETWORK_UNAVAILABLE" | "ATOMIC_COMMIT_FAILED" }>;

export type ReceizOfflineReconciliationPreparationResult =
  | Readonly<{ status: "planned"; plan: ReceizOfflineReconciliationPlan; capabilityPayload: ReceizReconciliationCapabilityPayload; stageConfirmation: ReceizReconciliationStageConfirmation; warnings: readonly ReceizReconciliationWarning[] }>
  | Extract<ReceizOfflineReconciliationResult, { status: "already-accepted" | "remote-ahead" | "divergent" | "rejected" | "failed" }>;

export type ReceizOfflineReconciliationStageInput = Readonly<{
  plan: ReceizOfflineReconciliationPlan;
  signedCapability: ReceizSignedReconciliationCapability;
  sealedArtifact: ReceizArtifactInput;
  confirmation: ReceizReconciliationStageConfirmation;
}>;
export type ReceizOfflineReconciliationStageResult =
  | Readonly<{ status: "staged"; reference: ReceizStagedReconciliationReference; commitConfirmation: ReceizReconciliationCommitConfirmation }>
  | Readonly<{ status: "rejected"; code: ReceizReconciliationRejectionCode }>
  | Readonly<{ status: "failed"; code: "NETWORK_UNAVAILABLE" | "STAGING_FAILED" }>;
export type ReceizOfflineReconciliationCommitInput = Readonly<{
  plan: ReceizOfflineReconciliationPlan;
  signedCapability: ReceizSignedReconciliationCapability;
  stagedReference: ReceizStagedReconciliationReference;
  confirmation: ReceizReconciliationCommitConfirmation;
}>;
export type ReceizOfflineReconciliationConvenienceInput = ReceizOfflineReconciliationPlanInput & Readonly<{
  authorize: (payload: ReceizReconciliationCapabilityPayload) => Promise<ReceizSignedReconciliationCapability>;
}>;

export type ReceizOwnershipHandoffAuthorityReceipt = Readonly<{
  schema: "receiz.ownership-handoff-authority-evidence.v113";
  operation: "ownership.transition";
  predecessorDigest: string;
  fromOwnerReceizId: string;
  toOwnerReceizId: string;
  actorId: string;
  successorActorId: string;
  issuerKeyId: string;
  successorIssuerKeyId: string;
  capabilityDigest: string;
  registryDigest: string;
  authorizedAtKai: string;
  signedCapability: ReceizSignedCapability;
  evidenceDigest: string;
  authority: Readonly<{
    evidenceIsArtifactAuthorityAlone: false;
    binding: "verified-history-node-receipt";
  }>;
}>;

export type ReceizHistoricalOwnershipHandoffEvidence = ReceizOwnershipHandoffAuthorityReceipt;

export type ReceizReconciliationDivergence =
  | Readonly<{ relation: "same"; head: ReceizHistoryDigest }>
  | Readonly<{ relation: "local-descendant"; commonPredecessor: ReceizHistoryDigest; orderedAdditionDigests: readonly ReceizHistoryDigest[] }>
  | Readonly<{ relation: "accepted-descendant"; commonPredecessor: ReceizHistoryDigest; verifiedAdditions: readonly ReceizProofHistoryNode[] }>
  | Readonly<{ relation: "divergent"; code: "SIBLING_BRANCHES" | "TARGET_NAMESPACE_CONFLICT"; localHead: ReceizHistoryDigest; acceptedHead: ReceizHistoryDigest; commonPredecessor: ReceizHistoryDigest }>
  | Readonly<{ relation: "rejected"; code: "NO_COMMON_PREDECESSOR" | "HISTORY_VERIFICATION_FAILED" }>;

export type ReceizAcceptedHeadResolutionInput = Readonly<{ artifactId: ReceizArtifactId; knownHead?: ReceizHistoryDigest }>;
export type ReceizAcceptedHeadHandshake = Readonly<{
  protocol: "receiz.global-coordination.v113";
  commitDomain: ReceizCommitDomainId;
  tenantId: ReceizTenantId;
  accountId: ReceizAccountId;
  registryDigest: ReceizRegistryDigest;
  operationMatrixDigest: ReceizApplicationOperationMatrixDigest;
  acceptedArtifactDigest: ReceizArtifactDigest;
  acceptedHistoryHead: ReceizHistoryDigest;
}>;
export type ReceizAcceptedHeadResolutionResult =
  | Readonly<{ status: "resolved"; artifact: ReceizVerifiedArtifact; acceptance: ReceizAcceptedHeadReport; handshake: ReceizAcceptedHeadHandshake; verifiedAdditions: readonly ReceizProofHistoryNode[] }>
  | Readonly<{ status: "not-found-or-not-authorized" }>
  | Readonly<{ status: "rejected"; code: "REMOTE_HEAD_ROLLBACK_DETECTED" | "REMOTE_DOMAIN_MISMATCH" | "REMOTE_PROTOCOL_MISMATCH" | "REMOTE_REGISTRY_MISMATCH" | "REMOTE_OPERATION_MATRIX_MISMATCH" | "REMOTE_SCOPE_MISMATCH" }>
  | Readonly<{ status: "failed"; code: "NETWORK_UNAVAILABLE" }>;

export type ReceizReconciliationAttemptResolutionInput = Readonly<{ attemptId: ReceizReconciliationAttemptId; idempotencyKey: string }>;
export type ReceizReconciliationAttemptResolutionResult =
  | Readonly<{ status: "committed"; artifact: ReceizVerifiedArtifact; receipt: ReceizReconciliationReceipt; effects: ReceizEffectReport }>
  | Readonly<{ status: "uncommitted"; retry: "reuse-original-idempotency-key" }>
  | Readonly<{ status: "indeterminate"; attemptId: ReceizReconciliationAttemptId; idempotencyIdentityDigest: ReceizIdempotencyDigest }>
  | Readonly<{ status: "rejected"; code: "IDEMPOTENT_ATTEMPT_EVIDENCE_MISMATCH" }>;
export type ReceizEffectStatusResolutionInput = Readonly<{ artifactId: ReceizArtifactId; acceptedHead: ReceizHistoryDigest; commandDigest: ReceizCommandDigest; effectsDigest: ReceizEffectsDigest }>;
export type ReceizEffectStatusResolutionResult = Readonly<{
  status: "none" | "pending" | "delivered" | "retrying" | "dead-letter";
  effectsDigest: ReceizEffectsDigest;
  authority: Readonly<{ effectStatusIsArtifactAuthority: false }>;
}>;
