import type { ReceizCommitDomainId } from "./artifactTransition.js";
import type { ReceizAcceptedHeadResolutionInput, ReceizAcceptedHeadResolutionResult, ReceizEffectStatusResolutionInput, ReceizEffectStatusResolutionResult, ReceizOfflineReconciliationCommitInput, ReceizOfflineReconciliationConvenienceInput, ReceizOfflineReconciliationPlanInput, ReceizOfflineReconciliationPreparationResult, ReceizOfflineReconciliationResult, ReceizOfflineReconciliationStageInput, ReceizOfflineReconciliationStageResult, ReceizReconciliationAttemptResolutionInput, ReceizReconciliationAttemptResolutionResult, ReceizVerifiedArtifact } from "./globalCoordinationTypes.js";
import { type ReceizGlobalCoordinationTransport } from "./globalCoordinationProtocol.js";
import { createReceizRemoteAdmissionStore } from "./remoteAdmissionStore.js";
import { createReceizRemoteArtifactTransitionStore } from "./remoteArtifactTransitionStore.js";
export type ReceizRemoteArtifactVerifier = (wireArtifact: unknown) => Promise<ReceizVerifiedArtifact>;
export type ReceizRemoteDomainOptions = Readonly<{
    namespace: string;
    commitDomain: ReceizCommitDomainId;
    accessToken: string;
    baseUrl?: string;
    fetchImpl?: typeof fetch;
    transport?: ReceizGlobalCoordinationTransport;
    verifyReturnedArtifact: ReceizRemoteArtifactVerifier;
}>;
export type ReceizRemoteDomain = Readonly<{
    admissionStore: ReturnType<typeof createReceizRemoteAdmissionStore>;
    transitionStore: ReturnType<typeof createReceizRemoteArtifactTransitionStore>;
    planOfflineReconciliation(input: ReceizOfflineReconciliationPlanInput): Promise<ReceizOfflineReconciliationPreparationResult>;
    stageOfflineReconciliation(input: ReceizOfflineReconciliationStageInput): Promise<ReceizOfflineReconciliationStageResult>;
    commitOfflineReconciliation(input: ReceizOfflineReconciliationCommitInput): Promise<ReceizOfflineReconciliationResult>;
    reconcileOffline(input: ReceizOfflineReconciliationConvenienceInput): Promise<ReceizOfflineReconciliationResult>;
    resolveAcceptedHead(input: ReceizAcceptedHeadResolutionInput): Promise<ReceizAcceptedHeadResolutionResult>;
    resolveReconciliationAttempt(input: ReceizReconciliationAttemptResolutionInput): Promise<ReceizReconciliationAttemptResolutionResult>;
    resolveEffectStatus(input: ReceizEffectStatusResolutionInput): Promise<ReceizEffectStatusResolutionResult>;
}>;
export declare function createReceizRemoteDomain(options: ReceizRemoteDomainOptions): ReceizRemoteDomain;
//# sourceMappingURL=remoteDomain.d.ts.map