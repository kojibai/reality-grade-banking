import type { ReceizDomainReplaySourceAuthoringEvidenceV124, ReceizDomainReplaySourceAuthorityV124 } from "./v124ReplayProofObject.js";
import { type ReceizOpenedSubjectSourceFamilyV125 } from "./v125SubjectSourceFamily.js";
/** Selection only: every coordinate and public-key byte is derived from its sealed source. */
export type ReceizConversationAuthorSourceSelectionV125 = Readonly<{
    currentArtifactSha256: string;
    identityArtifactSha256: string;
    subjectArtifactSha256: string;
    accessNamespace: string;
}>;
export declare function normalizeReceizConversationAuthorSelectionV125(value: unknown): ReceizConversationAuthorSourceSelectionV125;
/** The namespace name selects existing carried access material; it never grants access. */
export declare function projectReceizConversationParticipantSourceV125(input: Readonly<{
    family: ReceizOpenedSubjectSourceFamilyV125;
    selection: ReceizConversationAuthorSourceSelectionV125;
}>): Promise<Readonly<{
    participant: Readonly<{
        receizId: string;
        subjectId: string;
        subjectHead: string;
        accessKeyHead: string;
        bindingDigest: string;
    }>;
    access: Readonly<{
        schema: "receiz.subject.access-public-key.v122";
        subjectId: string;
        subjectHead: string;
        accessKeyHead: string;
        publicKeyJwk: JsonWebKey;
        bindingDigest: string;
    }>;
    subject: {
        source: Readonly<{
            schema: "receiz.viewer-subject-source-read.v124";
            status: "verified-source";
            artifact: import("./v124PortableAuthority.js").ReceizPortableSealedArtifactV124;
            artifactSha256: string;
            artifactKaiPulse: number;
            carrier: import("./v124ReplayProofObject.js").ReceizViewerSubjectSourceCarrierV124;
            subjectState: import("./v122Subjects.js").ReceizSubjectStateV122;
            ownership: import("./portableAssetReader.js").ReceizPortableAssetDocument["ownership"];
            provenance: import("./portableAssetReader.js").ReceizPortableAssetDocument["provenance"];
            authority: Readonly<{
                sourceReadIsSubjectAuthority: false;
                strongerTruth: "sealed-receiz-proof-object";
            }>;
        }>;
        admission: import("./artifactAdmissionTypes.js").ReceizVerifiedPortableStateAdmission;
        head: string;
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
    };
    identity: Readonly<{
        artifact: import("./v124PortableAuthority.js").ReceizPortableSealedArtifactV124;
        verification: Extract<import("./artifactVerification.js").ReceizArtifactVerificationResult, {
            status: "verified-artifact";
        }>;
    }>;
    actorId: string;
}>>;
export declare function bindReceizConversationAuthorSourceV125(input: Readonly<{
    family: ReceizOpenedSubjectSourceFamilyV125;
    selection: ReceizConversationAuthorSourceSelectionV125;
    evidence: ReceizDomainReplaySourceAuthoringEvidenceV124;
    authority: ReceizDomainReplaySourceAuthorityV124;
}>): Promise<Readonly<{
    admission: import("./artifactAdmissionTypes.js").ReceizVerifiedIdentityArtifactAdmission;
    participant: Readonly<{
        receizId: string;
        subjectId: string;
        subjectHead: string;
        accessKeyHead: string;
        bindingDigest: string;
    }>;
    access: Readonly<{
        schema: "receiz.subject.access-public-key.v122";
        subjectId: string;
        subjectHead: string;
        accessKeyHead: string;
        publicKeyJwk: JsonWebKey;
        bindingDigest: string;
    }>;
    subject: {
        source: Readonly<{
            schema: "receiz.viewer-subject-source-read.v124";
            status: "verified-source";
            artifact: import("./v124PortableAuthority.js").ReceizPortableSealedArtifactV124;
            artifactSha256: string;
            artifactKaiPulse: number;
            carrier: import("./v124ReplayProofObject.js").ReceizViewerSubjectSourceCarrierV124;
            subjectState: import("./v122Subjects.js").ReceizSubjectStateV122;
            ownership: import("./portableAssetReader.js").ReceizPortableAssetDocument["ownership"];
            provenance: import("./portableAssetReader.js").ReceizPortableAssetDocument["provenance"];
            authority: Readonly<{
                sourceReadIsSubjectAuthority: false;
                strongerTruth: "sealed-receiz-proof-object";
            }>;
        }>;
        admission: import("./artifactAdmissionTypes.js").ReceizVerifiedPortableStateAdmission;
        head: string;
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
    };
    identity: Readonly<{
        artifact: import("./v124PortableAuthority.js").ReceizPortableSealedArtifactV124;
        verification: Extract<import("./artifactVerification.js").ReceizArtifactVerificationResult, {
            status: "verified-artifact";
        }>;
    }>;
    actorId: string;
}>>;
export declare function bindReceizConversationSourceEventsV125(additions: readonly {
    exactEventBytesB64u: string;
}[], derived: Awaited<ReturnType<typeof bindReceizConversationAuthorSourceV125>>, kaiUpulse?: string, replay?: Readonly<{
    registryDigest: string;
    reducerDigest: string;
    namespace: Readonly<{
        name: string;
    }>;
}>): Promise<(Readonly<{
    schema: "receiz.chat.conversation-event.v1";
    eventId: string;
    conversationId: string;
    predecessorEventIds: readonly string[];
    actorReceizId: string;
    kaiUPulse: number;
    effect: import("./conversationDomain.js").ReceizConversationEffectV1;
    eventDigest: string;
}> | Readonly<Omit<Readonly<{
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
}>)[]>;
//# sourceMappingURL=conversationActorSource.d.ts.map