import type { ReceizArtifactTransitionStore } from "./artifactTransitionStore.js";
import { type ReceizIdentityLoginProof } from "./identity.js";
import { type ReceizArtifactAppendPlan, type ReceizArtifactTransitionSealer } from "./artifactTransition.js";
import type { ReceizVerifiedCapability } from "./capabilityAuthority.js";
import { type ReceizV125EnclosingArtifactBinding, type ReceizV125EnclosingArtifactVerifierOptions } from "./v125ArtifactBinding.js";
import { type ReceizPortableSealedArtifactV124 } from "./v124PortableAuthority.js";
export type ReceizSealedLifecycleContextV125 = Readonly<{
    sourceArtifact: ReceizPortableSealedArtifactV124;
    identityArtifact: ReceizPortableSealedArtifactV124;
    expectedArtifactDigest: string;
    expectedHead: string;
    commitDomain: ReceizArtifactAppendPlan["commitDomain"];
    kksCoordinate: unknown;
    verifier: ReceizV125EnclosingArtifactVerifierOptions;
}>;
export type ReceizSealedLifecycleExecutionV125 = Readonly<{
    capability: ReceizVerifiedCapability;
    sealer: ReceizArtifactTransitionSealer;
    store: ReceizArtifactTransitionStore;
}>;
type Event = Readonly<{
    actorReceizId: string;
    actorProof: ReceizIdentityLoginProof;
    eventKai: string;
    eventDigest: string;
    idempotencyKey: string;
}>;
export declare function readReceizLifecyclePlanCustodyV125(plan: object): {
    context: ReceizSealedLifecycleContextV125;
    transitionPlan: ReceizArtifactAppendPlan;
} | undefined;
export declare function retainReceizLifecyclePlanV125(plan: object, context: ReceizSealedLifecycleContextV125, transitionPlan: ReceizArtifactAppendPlan): void;
/** Only additions bound to canonical carried nodes may extend the immutable payload. */
export declare function readReceizLifecycleAdditionsV125<E extends Event>(binding: ReceizV125EnclosingArtifactBinding, lifecycle: string, verifier: ReceizV125EnclosingArtifactVerifierOptions): Promise<readonly E[]>;
export declare function readReceizLifecyclePayloadV125(context: ReceizSealedLifecycleContextV125): Promise<{
    opened: import("./v125ArtifactBinding.js").ReceizV125VerifiedArtifactPayloadBytes;
    admitted: import("./artifactAdmissionTypes.js").ReceizVerifiedPortableStateAdmission;
}>;
export declare function planReceizSealedLifecycleV125(context: ReceizSealedLifecycleContextV125, lifecycle: string, event: Event): Promise<Readonly<Readonly<{
    transitionDigest: import("./artifactTransition.js").ReceizArtifactTransitionDigest;
    actor: import("./artifactAdmissionTypes.js").ReceizVerifiedActorReference;
    resource: import("./artifactTransition.js").ReceizArtifactId;
    operation: "artifact.append";
    commitDomain: import("./artifactTransition.js").ReceizCommitDomainId;
    effectsDigest: import("./artifactTransition.js").ReceizEffectsDigest;
    idempotencyKeyDigest: import("./artifactTransition.js").ReceizIdempotencyDigest;
    registryDigest: import("./artifactTransition.js").ReceizRegistryDigest;
}> & {
    schema: "receiz.artifact-append-plan.v112";
    transition: import("./artifactTransition.js").ReceizArtifactTransitionBasis;
    actorConstraint: import("./artifactAdmissionTypes.js").ReceizActorId | null;
    planDigest: import("./artifactTransition.js").ReceizPlanDigest;
    authority: Readonly<{
        planIsProofAuthority: false;
        strongerTruth: "sealed-receiz-proof-object";
    }>;
}>>;
export declare function applyReceizSealedLifecycleV125<T>(plan: object, execution: ReceizSealedLifecycleExecutionV125, project: (sourceArtifact: ReceizPortableSealedArtifactV124, verifier: ReceizV125EnclosingArtifactVerifierOptions) => Promise<T>): Promise<{
    projection: Awaited<T>;
    sourceArtifact: Readonly<{
        schema: "receiz.sealed-artifact-bytes.v124";
        exactBytesB64u: string;
        filename: string;
        mimeType: string;
        artifactSha256: string;
        payloadSha256: string;
    }>;
    committedTransition: Readonly<{
        status: "committed-artifact-transition";
        acceptance: "committed" | "idempotent";
        artifact: import("./artifacts.js").ReceizSealedArtifact;
        artifactDigest: import("./artifactTransition.js").ReceizArtifactDigest;
        history: import("./proofHistory.js").ReceizVerifiedProofHistory | null;
        proofHistoryHead: import("./compositeProofTransport.js").ReceizCarriedProofHistoryHeadV114 | null;
        receipt: import("./artifactTransitionStore.js").ReceizAppendReceipt;
        committed: true;
    }>;
    writesPerformed: 0 | 1;
}>;
export {};
//# sourceMappingURL=v125SealedLifecycle.d.ts.map