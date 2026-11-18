import type { ReceizCapabilityIssuerResolver } from "./artifactAdmissionTypes.js";
import { type ReceizArtifactInput } from "./artifactInput.js";
import type { ReceizAppendReceipt } from "./artifactTransitionStore.js";
import { type ReceizAcceptedHeadExpectation, type ReceizOfflineReconciliationPlan, type ReceizOfflineReconciliationPreparationResult, type ReceizOwnershipHandoffAuthorityReceipt, type ReceizReconciliationCommitConfirmation, type ReceizReconciliationDivergence, type ReceizVerifiedReconciliationCommitCommand, type ReceizTenantId, type ReceizVerifiedArtifact, type ReceizVerifiedBoundedProfileShowcaseArtifact, type ReceizVerifiedMergeArtifactResolver } from "./globalCoordinationTypes.js";
import { type ReceizHistoricalIdentityKeyRevocationState } from "./historicalHandoffCustody.js";
import { type ReceizKeyFile } from "./identity.js";
import { type ReceizProofHistoryNode, type ReceizVerifiedProofHistory } from "./proofHistory.js";
export declare function exactVerifiedDescendantAdditions(input: Readonly<{
    history: ReceizVerifiedProofHistory;
    expected: ReceizAcceptedHeadExpectation;
    verifyMergeArtifact: ReceizVerifiedMergeArtifactResolver;
}>): Promise<readonly ReceizProofHistoryNode[] | null>;
export declare function verifyReceizArtifactForReconciliation(input: Readonly<{
    sealedArtifact: ReceizArtifactInput;
    admission: unknown;
}>): Promise<ReceizVerifiedArtifact>;
/**
 * Additive bounded-history admission for profile showcase artifacts. The v113
 * coordination envelope remains byte-for-byte unchanged; only the already
 * verified v114 carried-history proof supplies its exact bounded addition.
 */
export declare function verifyReceizBoundedProfileShowcaseForReconciliationV114(input: Readonly<{
    sealedArtifact: ReceizArtifactInput;
    admission: unknown;
}>): Promise<ReceizVerifiedBoundedProfileShowcaseArtifact>;
export declare function planReceizBoundedProfileShowcaseReconciliationV114(input: Readonly<{
    verifiedArtifact: ReceizVerifiedBoundedProfileShowcaseArtifact;
    verifiedActorEvidence: unknown;
    tenantId: ReceizTenantId;
    issuerKeyId: string;
    expectedAcceptedHead: ReceizAcceptedHeadExpectation;
    idempotencyKey: string;
    validFromKai: string;
    expiresAtKai: string;
    localReceipts?: readonly ReceizAppendReceipt[];
}>): Promise<ReceizOfflineReconciliationPreparationResult>;
export declare function planReceizOfflineReconciliation(input: Readonly<{
    verifiedArtifact: ReceizVerifiedArtifact;
    verifiedActorEvidence: unknown;
    tenantId: ReceizTenantId;
    issuerKeyId: string;
    expectedAcceptedHead: ReceizAcceptedHeadExpectation;
    idempotencyKey: string;
    validFromKai: string;
    expiresAtKai: string;
    localReceipts?: readonly ReceizAppendReceipt[];
    verifyMergeArtifact?: ReceizVerifiedMergeArtifactResolver;
}>): Promise<ReceizOfflineReconciliationPreparationResult>;
export declare function evaluateReceizHistoricalHandoffRevocation(value: unknown): Readonly<{
    ok: true;
}> | Readonly<{
    ok: false;
    code: "IDENTITY_KEY_REVOKED" | "HISTORY_VERIFICATION_FAILED";
}>;
export declare function createReceizOwnershipHandoffAuthorityReceipt(input: Readonly<{
    keyFile: ReceizKeyFile;
    passphrase?: string;
    predecessorDigest: string;
    fromOwnerReceizId: string;
    toOwnerReceizId: string;
    successorIssuerKeyId: string;
    registryDigest: string;
    authorizedAtKai: string;
}>): Promise<ReceizOwnershipHandoffAuthorityReceipt>;
export declare function verifyReceizOwnershipHandoffSequence(input: Readonly<{
    history: unknown;
    resolveAdmittedIssuer: ReceizCapabilityIssuerResolver;
    revocationStates: readonly ReceizHistoricalIdentityKeyRevocationState[];
}>): Promise<Readonly<{
    ok: true;
    handoffCount: number;
}> | Readonly<{
    ok: false;
    code: "HISTORY_VERIFICATION_FAILED" | "IDENTITY_KEY_REVOKED";
}>>;
export declare function classifyReceizReconciliationDivergence(input: Readonly<{
    localHistory: unknown;
    acceptedHistory: unknown;
    targetNamespace?: string;
}>): Promise<ReceizReconciliationDivergence>;
export declare function verifyReceizReconciliationCommitAuthorization(input: Readonly<{
    accountBound: boolean;
    tenantBound: boolean;
    tokenValid: boolean;
    identityKeyValid: boolean;
    capabilityValid: boolean;
    plannedAuthorizationEpoch: string;
    commitAuthorizationEpoch: string;
}>): Readonly<{
    ok: true;
}> | Readonly<{
    ok: false;
    code: "CONNECT_ACCOUNT_MISMATCH" | "TENANT_MISMATCH" | "TOKEN_REVOKED" | "IDENTITY_KEY_REVOKED" | "CAPABILITY_MISMATCH" | "AUTHORIZATION_STATE_CHANGED";
}>;
export declare function createReceizReconciliationCommitConfirmation(input: Readonly<{
    plan: ReceizOfflineReconciliationPlan;
    stagedReference: import("./globalCoordinationTypes.js").ReceizStagedReconciliationReference;
    capability: unknown;
    command: ReceizVerifiedReconciliationCommitCommand;
}>): Promise<ReceizReconciliationCommitConfirmation>;
//# sourceMappingURL=globalReconciliation.d.ts.map