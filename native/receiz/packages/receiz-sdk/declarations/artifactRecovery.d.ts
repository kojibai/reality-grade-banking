import { type ReceizAuthorityFailure } from "./authorityResults.js";
import type { ReceizAdmissionAssessments, ReceizArtifactAdmissionOptions, ReceizArtifactAdmissionResult, ReceizVerifiedArtifactAdmission } from "./artifactAdmissionTypes.js";
import { type ReceizVerifiedProofHistory } from "./proofHistory.js";
import type { ReceizAdmissionCommitResult, ReceizAdmissionStore } from "./admissionStore.js";
import { type ReceizVerifiedCapability } from "./capabilityAuthority.js";
export type ReceizArtifactRecoveryPlan = Readonly<{
    schema: "receiz.artifact-recovery-plan.v1";
    planDigest: string;
    registryDigest: string;
    artifactDigest: string;
    admissionProofDigest: string;
    verifierContextDigest: string;
    identityBindingDigest: string | null;
    historyVerificationDigest: string;
    recoveredStateDigest: string;
    assessmentsDigest: string;
    artifactId: string;
    requiredActorId: string | null;
    verdict: ReceizVerifiedArtifactAdmission["verdict"];
    priorHeadDigest: string | null;
    nextHeadDigest: string;
    recoveredState: Readonly<Record<string, unknown>>;
    proofHistory: ReceizVerifiedProofHistory;
    assessments: ReceizAdmissionAssessments;
    commitEligible: boolean;
    requiredOperation: "recovery.commit" | null;
    writesPerformed: 0;
    authority: Readonly<{
        planIsProofAuthority: false;
        explanationIsProofAuthority: false;
        strongerTruth: "sealed-receiz-proof-object";
    }>;
}>;
export type ReceizArtifactRecoveryResult = Readonly<{
    admission: ReceizArtifactAdmissionResult;
    recoveryPlan: ReceizArtifactRecoveryPlan | ReceizAuthorityFailure | null;
}>;
export type ReceizArtifactRecoveryCommitRejectionCode = "PLAN_NOT_SDK_ISSUED" | "PLAN_AUTHORITY_MISMATCH" | "PLAN_DIGEST_MISMATCH" | "RECOVERY_NOT_COMMIT_ELIGIBLE" | "IDEMPOTENCY_KEY_REQUIRED" | "CAPABILITY_NOT_VERIFIED" | "CAPABILITY_OPERATION_MISMATCH" | "CAPABILITY_RESOURCE_MISMATCH" | "CAPABILITY_REGISTRY_MISMATCH" | "CAPABILITY_ACTOR_MISMATCH" | "CAPABILITY_EFFECTS_MISMATCH";
export type ReceizArtifactRecoveryCommitResult = Extract<ReceizAdmissionCommitResult, {
    status: "committed" | "idempotent";
}> | ReceizAuthorityFailure;
export declare function commitReceizArtifactRecovery(plan: ReceizArtifactRecoveryPlan, capability: ReceizVerifiedCapability, idempotencyKey: string, store: ReceizAdmissionStore): Promise<ReceizArtifactRecoveryCommitResult>;
export declare function isSdkIssuedReceizArtifactRecoveryPlan(value: unknown): value is ReceizArtifactRecoveryPlan;
export declare function planReceizArtifactRecovery(admission: ReceizArtifactAdmissionResult, knownHistory?: ReceizVerifiedProofHistory): Promise<ReceizArtifactRecoveryPlan | ReceizAuthorityFailure | null>;
export declare function createReceizArtifactRecoveryCoordinator(dependencies: Readonly<{
    admit(verification: unknown, options: ReceizArtifactAdmissionOptions): Promise<ReceizArtifactAdmissionResult>;
}>): (verification: unknown, options: ReceizArtifactAdmissionOptions) => Promise<ReceizArtifactRecoveryResult>;
//# sourceMappingURL=artifactRecovery.d.ts.map