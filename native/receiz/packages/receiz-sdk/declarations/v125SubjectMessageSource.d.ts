import { type ReceizArtifactTransitionSealer } from "./artifactTransition.js";
import type { ReceizArtifactTransitionStore } from "./artifactTransitionStore.js";
import { type ReceizCommitDomainId } from "./artifactTransition.js";
import { type ReceizSignedCapability } from "./capabilityAuthority.js";
import { type ReceizConversationEventV2 } from "./conversationDomain.js";
import { type ReceizOpenedSubjectSourceFamilyV125 } from "./v125SubjectSourceFamily.js";
import { type ReceizOpenedSubjectThreadSourceFamilyV125, type readReceizSubjectThreadSourceMemberV125 } from "./v125SubjectThreadSource.js";
type Member = ReturnType<typeof readReceizSubjectThreadSourceMemberV125>;
/** Reopening requires the actual enclosing successor plus its exact signed candidate authority. */
export declare function admitReceizSubjectThreadEventV125(input: Readonly<{
    prior: Member;
    source: Member;
    subjects: ReceizOpenedSubjectSourceFamilyV125;
    carried: unknown;
    signedCapability: ReceizSignedCapability;
    priorEvents: readonly ReceizConversationEventV2[];
    tuple: Readonly<{
        registryDigest: string;
        reducerDigest: string;
        namespace: string;
    }>;
}>): Promise<Readonly<{
    capability: Readonly<{
        schema: "receiz.verified-capability.v112";
        payload: import("./capabilityAuthority.js").ReceizCapabilityPayload;
        digest: string;
        verifier: "receiz.sdk.capability.v112";
        authority: Readonly<{
            capabilityIsProofAuthority: false;
            strongerTruth: "sealed-receiz-proof-object";
        }>;
    }>;
    event: Readonly<Omit<Readonly<{
        schema: "receiz.chat.conversation-event.v1";
        eventId: string;
        conversationId: string;
        predecessorEventIds: readonly string[];
        actorReceizId: string;
        kaiUPulse: number;
        effect: import("./conversationDomain.js").ReceizConversationEffectV1;
        eventDigest: string;
    }>, "schema" | "effect"> & {
        schema: "receiz.chat.conversation-event.v2";
        effect: import("./conversationDomain.js").ReceizConversationEffectV2;
    }>;
    carried: Readonly<Record<string, unknown>>;
    events: Readonly<Omit<Readonly<{
        schema: "receiz.chat.conversation-event.v1";
        eventId: string;
        conversationId: string;
        predecessorEventIds: readonly string[];
        actorReceizId: string;
        kaiUPulse: number;
        effect: import("./conversationDomain.js").ReceizConversationEffectV1;
        eventDigest: string;
    }>, "schema" | "effect"> & {
        schema: "receiz.chat.conversation-event.v2";
        effect: import("./conversationDomain.js").ReceizConversationEffectV2;
    }>[];
    projection: import("./conversationDomain.js").ReceizConversationProjectionV2;
    plan: Readonly<Readonly<{
        transitionDigest: import("./artifactTransition.js").ReceizArtifactTransitionDigest;
        actor: import("./artifactAdmissionTypes.js").ReceizVerifiedActorReference;
        resource: import("./artifactTransition.js").ReceizArtifactId;
        operation: "artifact.append";
        commitDomain: ReceizCommitDomainId;
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
    }>;
    identity: import("./artifactAdmissionTypes.js").ReceizVerifiedIdentityArtifactAdmission;
    coordinate: Readonly<{
        schema: typeof import("./v125KaiAuthority.js").RECEIZ_KKS_V1_PROOF_COORDINATE_SCHEMA;
        kksVersion: typeof import("./v125KaiAuthority.js").RECEIZ_KKS_V1_VERSION;
        kaiPulse: string;
        kaiUpulse: string;
        source: import("./v125KaiAuthority.js").ReceizKksV1CoordinateSource;
        kaiSigil: import("./v125KaiAuthority.js").ReceizKaiSigilTemporalProofV1;
        authority: Readonly<{
            temporalAuthority: "kai-pulse-monotonic-frequency-from-genesis";
            intrinsicProof: "kaisigil-blake3-poseidon-groth16";
            causalOrder: "verified-previous-head-then-strictly-greater-kai-upulse";
            chronosRole: "descriptive-projection-only";
            createdAtAuthority: false;
            networkRequired: false;
        }>;
    }>;
    readDependencies: {
        resource: string;
        expectedHeadDigest: string;
    }[];
    consumedPbiReceiptDigests: string[];
}>>;
/** Plans only from SDK-opened sealed conversation custody and an event-specific Identity/PBI ceremony. */
export declare function planReceizSubjectMessageEventV125(input: Readonly<{
    thread: ReceizOpenedSubjectThreadSourceFamilyV125;
    carried: unknown;
    kksCoordinate: unknown;
    commitDomain: ReceizCommitDomainId;
}>): Promise<Readonly<{
    schema: "receiz.subject.thread-event-plan.v125";
    planIdentity: string;
    confirmationDigest: string;
    confirmationRequired: true;
    transitionPlan: Readonly<Readonly<{
        transitionDigest: import("./artifactTransition.js").ReceizArtifactTransitionDigest;
        actor: import("./artifactAdmissionTypes.js").ReceizVerifiedActorReference;
        resource: import("./artifactTransition.js").ReceizArtifactId;
        operation: "artifact.append";
        commitDomain: ReceizCommitDomainId;
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
    }>;
    event: Readonly<Omit<Readonly<{
        schema: "receiz.chat.conversation-event.v1";
        eventId: string;
        conversationId: string;
        predecessorEventIds: readonly string[];
        actorReceizId: string;
        kaiUPulse: number;
        effect: import("./conversationDomain.js").ReceizConversationEffectV1;
        eventDigest: string;
    }>, "schema" | "effect"> & {
        schema: "receiz.chat.conversation-event.v2";
        effect: import("./conversationDomain.js").ReceizConversationEffectV2;
    }>;
    writesPerformed: 0;
}>>;
/** Projection only: neither a detached event list nor a copied family establishes source custody. */
export declare function projectReceizSubjectThreadV125(thread: ReceizOpenedSubjectThreadSourceFamilyV125): import("./conversationDomain.js").ReceizConversationProjectionV2;
export type ReceizSubjectMessageEventPlanV125 = Awaited<ReturnType<typeof planReceizSubjectMessageEventV125>>;
export type ReceizSubjectThreadSourceStoreV125 = ReceizArtifactTransitionStore & Readonly<{
    /** Persist and verify candidate source custody before commit. Returned custody is staged, not accepted. */
    retainThreadSourceFamily(thread: ReceizOpenedSubjectThreadSourceFamilyV125): Promise<ReceizOpenedSubjectThreadSourceFamilyV125>;
    /** Recover only source with exact successful atomic transition commit evidence. */
    readThreadSourceFamily(familySetDigest: string): Promise<ReceizOpenedSubjectThreadSourceFamilyV125 | null>;
}>;
/** Applies the supported close effect. Exact PBI consumption and all participant heads share one atomic append. */
export declare function applyReceizSubjectMessageEventV125(input: Readonly<{
    plan: ReceizSubjectMessageEventPlanV125;
    confirmationDigest: string;
    signedCapability: ReceizSignedCapability;
    sealer: ReceizArtifactTransitionSealer;
    store: ReceizSubjectThreadSourceStoreV125;
}>): Promise<Readonly<{
    schema: "receiz.subject.thread-event-apply.v125";
    sourceFamily: Readonly<{
        schema: "receiz.subject-thread-source-family.v125";
        originalArtifacts: readonly import("./v124PortableAuthority.js").ReceizPortableSealedArtifactV124[];
        temporalArtifacts: readonly import("./v124PortableAuthority.js").ReceizPortableSealedArtifactV124[];
        originalArtifactSha256: string;
        currentArtifactSha256: string;
        subjectFamily: import("./v125SubjectSourceFamily.js").ReceizSubjectSourceFamilyV125;
        authors: readonly Readonly<{
            sourceArtifactSha256: string;
            selection: import("./conversationActorSource.js").ReceizConversationAuthorSourceSelectionV125;
        }>[];
        familySetDigest: string;
        temporalAuthorizations?: readonly Readonly<{
            sourceArtifactSha256: string;
            signedCapability: ReceizSignedCapability;
        }>[];
    }>;
    projection: import("./conversationDomain.js").ReceizConversationProjectionV2;
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
    acceptedHead: string;
    writesPerformed: 0 | 1;
    authority: Readonly<{
        applyIsProofAuthority: false;
        strongerTruth: "sealed-receiz-proof-object";
    }>;
}>>;
export {};
//# sourceMappingURL=v125SubjectMessageSource.d.ts.map