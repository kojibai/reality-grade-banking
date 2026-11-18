import type { ReceizSealedArtifact } from "./artifacts.js";
import type { ReceizArtifactAppendPlan, ReceizArtifactDigest, ReceizArtifactTransitionDigest, ReceizCommitDomainId, ReceizPlanDigest } from "./artifactTransition.js";
export type ReceizVerifiedArtifactTransitionCandidate = Readonly<{
    status: "sealed-transition";
    artifact: ReceizSealedArtifact;
    artifactDigest: ReceizArtifactDigest;
    transitionDigest: ReceizArtifactTransitionDigest;
    planDigest: ReceizPlanDigest;
    committed: false;
}>;
export type ReceizArtifactTransitionCandidateCustody = Readonly<{
    plan: ReceizArtifactAppendPlan;
    commitDomain: ReceizCommitDomainId;
    exactBytes: Uint8Array;
    filename: string;
    mimeType: string;
    payloadSha256: string;
    createdAt: number;
}>;
/** Internal custody registration. Task 7 may call this only after canonical verification. */
export declare function registerReceizArtifactTransitionCandidateCustody(candidate: ReceizVerifiedArtifactTransitionCandidate, custody: ReceizArtifactTransitionCandidateCustody): void;
export declare function readReceizArtifactTransitionCandidateCustody(candidate: unknown): ReceizArtifactTransitionCandidateCustody | null;
//# sourceMappingURL=artifactTransitionCandidateCustody.d.ts.map