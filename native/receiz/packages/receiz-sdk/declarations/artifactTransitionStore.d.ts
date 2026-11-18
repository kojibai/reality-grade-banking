import type { ReceizArtifactTransitionAtomicRequirements } from "./artifactTransitionAtomicRequirements.js";
import { type ReceizVerifiedArtifactTransitionCandidate } from "./artifactTransitionCandidateCustody.js";
import { type ReceizArtifactAppendPlan, type ReceizArtifactDigest, type ReceizArtifactId, type ReceizArtifactTransitionDigest, type ReceizCapabilityDigest, type ReceizCommandDigest, type ReceizCommitDomainId, type ReceizDigest, type ReceizHistoryDigest, type ReceizIdempotencyDigest, type ReceizPlanDigest, type ReceizRegistryDigest } from "./artifactTransition.js";
import type { ReceizActorEvidenceDigest, ReceizActorId } from "./artifactAdmissionTypes.js";
import { type ReceizVerifiedCapability } from "./capabilityAuthority.js";
import type { ReceizConstitutionJson } from "./constitution.js";
export type { ReceizVerifiedArtifactTransitionCandidate } from "./artifactTransitionCandidateCustody.js";
export type ReceizStagedCandidateReference = Readonly<{
    commitDomain: ReceizCommitDomainId;
    artifactDigest: ReceizArtifactDigest;
    transitionDigest: ReceizArtifactTransitionDigest;
    storageKeyDigest: ReceizDigest<"candidate-storage-key">;
    authority: Readonly<{
        stagingReferenceIsProofAuthority: false;
        strongerTruth: "sealed-receiz-proof-object";
    }>;
}>;
export type ReceizStagedArtifactTransition = Readonly<{
    status: "staged-transition";
    reference: ReceizStagedCandidateReference;
    exactBytes: Uint8Array;
    filename: string;
    mimeType: string;
    payloadSha256: string;
    committed: false;
}>;
export type ReceizArtifactTransitionCommitCommandBasis = Readonly<{
    atomicRequirements?: ReceizArtifactTransitionAtomicRequirements;
    planDigest: ReceizPlanDigest;
    capabilityDigest: ReceizCapabilityDigest;
    transitionDigest: ReceizArtifactTransitionDigest;
    candidateArtifactDigest: ReceizArtifactDigest;
    stagedCandidateReference: ReceizStagedCandidateReference;
    commitDomain: ReceizCommitDomainId;
}>;
export type ReceizArtifactTransitionCommitUnit = Readonly<{
    commitDomain: ReceizCommitDomainId;
    plan: ReceizArtifactAppendPlan;
    capability: ReceizVerifiedCapability;
    command: ReceizArtifactTransitionCommitCommandBasis & {
        commandDigest: ReceizCommandDigest;
    };
    expectedHead: ReceizHistoryDigest;
}>;
export type ReceizReportedActorReference = Readonly<{
    actorId: ReceizActorId;
    evidenceDigest: ReceizActorEvidenceDigest;
    admissionProfile: "identity";
    registryDigest: ReceizRegistryDigest;
}>;
export type ReceizAppendReceipt = Readonly<{
    commitDomain: ReceizCommitDomainId;
    actor: ReceizReportedActorReference;
    resource: ReceizArtifactId;
    operation: "artifact.append";
    planDigest: ReceizPlanDigest;
    capabilityDigest: ReceizCapabilityDigest;
    transitionDigest: ReceizArtifactTransitionDigest;
    artifactDigest: ReceizArtifactDigest;
    priorHead: ReceizHistoryDigest;
    acceptedHead: ReceizHistoryDigest;
    commandDigest: ReceizCommandDigest;
    idempotencyIdentityDigest: ReceizIdempotencyDigest;
    authority: Readonly<{
        receiptIsProofAuthority: false;
        strongerTruth: "sealed-receiz-proof-object";
    }>;
}>;
export type ReceizArtifactTransitionCommitResult = Readonly<{
    status: "committed" | "idempotent";
    receipt: ReceizAppendReceipt;
}> | Readonly<{
    status: "conflict";
    code: "IDEMPOTENCY_CONFLICT" | "EXPECTED_HEAD_MISMATCH";
}> | Readonly<{
    status: "rejected";
    code: "COMMIT_DOMAIN_MISMATCH" | "CANDIDATE_NOT_STAGED" | "CANDIDATE_VERIFICATION_FAILED" | "TRANSITION_MISMATCH";
}> | Readonly<{
    status: "failed";
    code: "ATOMIC_COMMIT_FAILED";
}>;
export interface ReceizArtifactTransitionStore {
    readonly atomicReadDependencies?: true;
    readonly commitDomain: ReceizCommitDomainId;
    stageCandidate(candidate: ReceizVerifiedArtifactTransitionCandidate): Promise<ReceizStagedArtifactTransition>;
    resolveCandidate(artifactDigest: ReceizArtifactDigest): Promise<ReceizStagedArtifactTransition | null>;
    commitTransition(unit: ReceizArtifactTransitionCommitUnit): Promise<ReceizArtifactTransitionCommitResult>;
}
export type ReceizInMemoryArtifactTransitionStore = ReceizArtifactTransitionStore & Readonly<{
    seedHead(resource: ReceizArtifactId, head: ReceizHistoryDigest): Promise<void>;
    seedAcceptedHeadForTesting(resource: ReceizArtifactId, head: ReceizHistoryDigest, artifactDigest: ReceizArtifactDigest): Promise<void>;
    corruptStagedCandidateForTesting(artifactDigest: ReceizArtifactDigest, replacement: Uint8Array): void;
    collectOrphanedCandidates(input: Readonly<{
        createdBefore: number;
    }>): Promise<number>;
    inspect(): Promise<Readonly<{
        staged: readonly ReceizStagedCandidateReference[];
        heads: readonly Readonly<{
            resource: ReceizArtifactId;
            head: ReceizHistoryDigest;
        }>[];
        idempotency: readonly ReceizConstitutionJson[];
    }>>;
}>;
export type ReceizArtifactTransitionStoreVerificationInput = Readonly<{
    exactBytes: Uint8Array;
    staged: ReceizStagedArtifactTransition;
    plan: ReceizArtifactAppendPlan;
    capability: ReceizVerifiedCapability;
    command: ReceizArtifactTransitionCommitUnit["command"];
}>;
/**
 * Synthetic adapter mechanics for `@receiz/sdk/testing` only. The callback is
 * conformance instrumentation, never canonical artifact proof authority. The
 * universal SDK exports only the store contract; Task 7 supplies the
 * runtime-custodied canonical verification choreography.
 */
export declare function createReceizInMemoryArtifactTransitionStore(options: Readonly<{
    commitDomain: ReceizCommitDomainId;
    verifyCandidate: (input: ReceizArtifactTransitionStoreVerificationInput) => boolean | Promise<boolean>;
    failBeforeSwap?: (unit: ReceizArtifactTransitionCommitUnit) => boolean;
    loseResponseAfterCommit?: (unit: ReceizArtifactTransitionCommitUnit) => boolean;
    observeLedgerRead?: () => void;
    now?: () => number;
    mutateRetainedCandidateBeforeVerification?: (input: Readonly<{
        exactBytes: Uint8Array;
        unit: ReceizArtifactTransitionCommitUnit;
    }>) => Uint8Array | null;
    decorateReceiptResult?: (receipt: ReceizConstitutionJson) => ReceizConstitutionJson;
    beforeIdempotencyRead?: () => void | Promise<void>;
}>): ReceizInMemoryArtifactTransitionStore;
export type ReceizArtifactTransitionStoreConformanceReport = Readonly<{
    schema: "receiz.artifact-transition-store.conformance.v112";
    ok: boolean;
    checks: Readonly<{
        immutableStaging: boolean;
        domainIsolation: boolean;
        domainFailureOrdering: boolean;
        optimisticHead: boolean;
        idempotentRetry: boolean;
        idempotencyConflict: boolean;
        crashRollback: boolean;
        acceptedBytesGcProtected: boolean;
    }>;
}>;
export declare function runReceizArtifactTransitionStoreConformance(input: Readonly<{
    create(options?: Partial<Parameters<typeof createReceizInMemoryArtifactTransitionStore>[0]>): ReceizInMemoryArtifactTransitionStore;
    prepare(store: ReceizInMemoryArtifactTransitionStore): Promise<ReceizArtifactTransitionCommitUnit>;
    prepareConflict(store: ReceizInMemoryArtifactTransitionStore): Promise<ReceizArtifactTransitionCommitUnit>;
}>): Promise<ReceizArtifactTransitionStoreConformanceReport>;
//# sourceMappingURL=artifactTransitionStore.d.ts.map