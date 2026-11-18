import { type ReceizConversationProjectionV2 } from "./conversationDomain.js";
import type { ReceizSignedCapability } from "./capabilityAuthority.js";
import { type ReceizConversationAuthorSourceSelectionV125 } from "./conversationActorSource.js";
export { projectReceizConversationParticipantSourceV125 } from "./conversationActorSource.js";
export type { ReceizConversationAuthorSourceSelectionV125 } from "./conversationActorSource.js";
import type { ReceizConstitutionJson } from "./constitution.js";
import type { ReceizPortableSealedArtifactV124 } from "./v124PortableAuthority.js";
import { type ReceizDomainReplaySegmentProofObjectCandidateInputV124, type ReceizDomainReplaySegmentSourceExpectationV124 } from "./v124ReplayProofObject.js";
import { type ReceizSubjectSourceFamilyV125 } from "./v125SubjectSourceFamily.js";
export type ReceizSubjectThreadSourceFamilyV125 = Readonly<{
    schema: "receiz.subject-thread-source-family.v125";
    originalArtifacts: readonly ReceizPortableSealedArtifactV124[];
    temporalArtifacts: readonly ReceizPortableSealedArtifactV124[];
    originalArtifactSha256: string;
    currentArtifactSha256: string;
    subjectFamily: ReceizSubjectSourceFamilyV125;
    authors: readonly Readonly<{
        sourceArtifactSha256: string;
        selection: ReceizConversationAuthorSourceSelectionV125;
    }>[];
    familySetDigest: string;
    temporalAuthorizations?: readonly Readonly<{
        sourceArtifactSha256: string;
        signedCapability: ReceizSignedCapability;
    }>[];
}>;
/** Initial issuance only. Existing v124 signed source intent is verified unchanged. */
export declare function prepareReceizInitialTemporalConversationSourceV125(input: Readonly<{
    initialSource: true;
    conversation: ReceizDomainReplaySegmentProofObjectCandidateInputV124;
    subjectFamily: ReceizSubjectSourceFamilyV125;
    author: ReceizConversationAuthorSourceSelectionV125;
    kksCoordinate: unknown;
}>): Promise<Readonly<{
    portableAssetDigest: string;
    proofObject: Readonly<{
        payload: Readonly<{
            bytes: Uint8Array<ArrayBufferLike>;
            mimeType: typeof import("./v124ReplayProofObject.js").RECEIZ_V124_PORTABLE_PROOF_OBJECT_MIME;
        }>;
        assetType: "proof_object";
    }>;
    schema: "receiz.domain-replay-segment-proof-object-candidate.v124";
    carrier: import("./v124ReplayProofObject.js").ReceizDomainReplaySegmentProofCarrierV124;
    authority: Readonly<{
        candidateIsProofAuthority: false;
        sealed: false;
        strongerTruth: "sealed-receiz-proof-object";
    }>;
}>>;
type FamilyInput = Omit<ReceizSubjectThreadSourceFamilyV125, "schema" | "familySetDigest">;
/** Closed portable transport, not admission or runtime custody. */
export declare function createReceizSubjectThreadSourceFamilyV125(input: FamilyInput): Promise<ReceizSubjectThreadSourceFamilyV125>;
declare function temporal(artifact: ReceizPortableSealedArtifactV124): Promise<Readonly<{
    artifact: Readonly<{
        schema: "receiz.sealed-artifact-bytes.v124";
        exactBytesB64u: string;
        filename: string;
        mimeType: string;
        artifactSha256: string;
        payloadSha256: string;
    }>;
    admission: import("./artifactAdmissionTypes.js").ReceizVerifiedPortableStateAdmission;
    history: import("./proofHistory.js").ReceizVerifiedProofHistory;
    node: Readonly<{
        schema: "receiz.proof-history-node.v1";
        nodeDigest: string;
        artifactId: string;
        registryDigest: string;
        parentDigests: readonly string[];
        kaiPulse: string;
        receiptDigest: string;
        receipt: ReceizConstitutionJson;
        event: import("./proofHistory.js").ReceizProofHistoryEvent;
        namespaceData: Readonly<Record<string, ReceizConstitutionJson>>;
        authority: Readonly<{
            historyNodeIsProofAuthority: false;
            strongerTruth: "sealed-receiz-proof-object";
        }>;
    }>;
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
    document: Readonly<{
        schema: "receiz.portable_asset.v1";
        assetType: import("./portableAssetReader.js").ReceizPortableAssetType;
        payload: Readonly<{
            mimeType: string;
            bytesBase64Url: string;
            sha256: string;
        }>;
        ownership: Readonly<{
            ownerReceizId: string;
            custody: string;
            proofRef: string;
        }>;
        provenance: Readonly<{
            root: string;
            appends: readonly Readonly<Record<string, import("./portableAssetReader.js").PortableJson>>[];
        }>;
        settlement: Readonly<Record<string, import("./portableAssetReader.js").PortableJson>>;
        receizProofHistory?: Readonly<{
            schema: "receiz.carried-proof-history.v113";
            history: import("./proofHistory.js").ReceizProofHistory;
            commitmentDigest: string;
        }>;
    }>;
}>>;
type Temporal = Awaited<ReturnType<typeof temporal>>;
/** Internal temporal member custody; copied parsed source state cannot grant event admission. */
export declare function assertReceizSubjectThreadTemporalMemberV125(member: unknown): asserts member is Temporal;
/** Admits exact history descendants; new conversation events require their own actor evidence.
 * A descendant never enters the unchanged v124 replay opener as an original segment.
 */
export declare function openReceizSubjectThreadSourceFamilyV125(input: Readonly<{
    family: ReceizSubjectThreadSourceFamilyV125;
    expected: ReceizDomainReplaySegmentSourceExpectationV124;
    expectedConversationId: string;
}>): Promise<Readonly<{
    family: Readonly<{
        schema: "receiz.subject-thread-source-family.v125";
        originalArtifacts: readonly ReceizPortableSealedArtifactV124[];
        temporalArtifacts: readonly ReceizPortableSealedArtifactV124[];
        originalArtifactSha256: string;
        currentArtifactSha256: string;
        subjectFamily: ReceizSubjectSourceFamilyV125;
        authors: readonly Readonly<{
            sourceArtifactSha256: string;
            selection: ReceizConversationAuthorSourceSelectionV125;
        }>[];
        familySetDigest: string;
        temporalAuthorizations?: readonly Readonly<{
            sourceArtifactSha256: string;
            signedCapability: ReceizSignedCapability;
        }>[];
    }>;
    conversationId: string;
    proofObjectId: string;
    artifactId: string;
    currentArtifactSha256: string;
    artifactHistoryHead: string;
    replayHead: string;
    conversationEventFrontier: readonly string[];
    projection: ReceizConversationProjectionV2;
    authority: Readonly<{
        familyIsProofAuthority: false;
        projectionIsProofAuthority: false;
        strongerTruth: "sealed-receiz-proof-object";
    }>;
}>>;
export type ReceizOpenedSubjectThreadSourceFamilyV125 = Awaited<ReturnType<typeof openReceizSubjectThreadSourceFamilyV125>>;
/** Returns an exact custodied member; clones and serialized projections are never custody. */
export declare function readReceizSubjectThreadSourceMemberV125(opened: ReceizOpenedSubjectThreadSourceFamilyV125, artifactSha256: string): Readonly<{
    artifact: Readonly<{
        schema: "receiz.sealed-artifact-bytes.v124";
        exactBytesB64u: string;
        filename: string;
        mimeType: string;
        artifactSha256: string;
        payloadSha256: string;
    }>;
    admission: import("./artifactAdmissionTypes.js").ReceizVerifiedPortableStateAdmission;
    history: import("./proofHistory.js").ReceizVerifiedProofHistory;
    node: Readonly<{
        schema: "receiz.proof-history-node.v1";
        nodeDigest: string;
        artifactId: string;
        registryDigest: string;
        parentDigests: readonly string[];
        kaiPulse: string;
        receiptDigest: string;
        receipt: ReceizConstitutionJson;
        event: import("./proofHistory.js").ReceizProofHistoryEvent;
        namespaceData: Readonly<Record<string, ReceizConstitutionJson>>;
        authority: Readonly<{
            historyNodeIsProofAuthority: false;
            strongerTruth: "sealed-receiz-proof-object";
        }>;
    }>;
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
    document: Readonly<{
        schema: "receiz.portable_asset.v1";
        assetType: import("./portableAssetReader.js").ReceizPortableAssetType;
        payload: Readonly<{
            mimeType: string;
            bytesBase64Url: string;
            sha256: string;
        }>;
        ownership: Readonly<{
            ownerReceizId: string;
            custody: string;
            proofRef: string;
        }>;
        provenance: Readonly<{
            root: string;
            appends: readonly Readonly<Record<string, import("./portableAssetReader.js").PortableJson>>[];
        }>;
        settlement: Readonly<Record<string, import("./portableAssetReader.js").PortableJson>>;
        receizProofHistory?: Readonly<{
            schema: "receiz.carried-proof-history.v113";
            history: import("./proofHistory.js").ReceizProofHistory;
            commitmentDigest: string;
        }>;
    }>;
}>;
/** Internal mutation context derived only from the opened complete sealed family. */
export declare function readReceizSubjectThreadPlanningContextV125(thread: ReceizOpenedSubjectThreadSourceFamilyV125): Readonly<{
    current: Readonly<{
        artifact: Readonly<{
            schema: "receiz.sealed-artifact-bytes.v124";
            exactBytesB64u: string;
            filename: string;
            mimeType: string;
            artifactSha256: string;
            payloadSha256: string;
        }>;
        admission: import("./artifactAdmissionTypes.js").ReceizVerifiedPortableStateAdmission;
        history: import("./proofHistory.js").ReceizVerifiedProofHistory;
        node: Readonly<{
            schema: "receiz.proof-history-node.v1";
            nodeDigest: string;
            artifactId: string;
            registryDigest: string;
            parentDigests: readonly string[];
            kaiPulse: string;
            receiptDigest: string;
            receipt: ReceizConstitutionJson;
            event: import("./proofHistory.js").ReceizProofHistoryEvent;
            namespaceData: Readonly<Record<string, ReceizConstitutionJson>>;
            authority: Readonly<{
                historyNodeIsProofAuthority: false;
                strongerTruth: "sealed-receiz-proof-object";
            }>;
        }>;
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
        document: Readonly<{
            schema: "receiz.portable_asset.v1";
            assetType: import("./portableAssetReader.js").ReceizPortableAssetType;
            payload: Readonly<{
                mimeType: string;
                bytesBase64Url: string;
                sha256: string;
            }>;
            ownership: Readonly<{
                ownerReceizId: string;
                custody: string;
                proofRef: string;
            }>;
            provenance: Readonly<{
                root: string;
                appends: readonly Readonly<Record<string, import("./portableAssetReader.js").PortableJson>>[];
            }>;
            settlement: Readonly<Record<string, import("./portableAssetReader.js").PortableJson>>;
            receizProofHistory?: Readonly<{
                schema: "receiz.carried-proof-history.v113";
                history: import("./proofHistory.js").ReceizProofHistory;
                commitmentDigest: string;
            }>;
        }>;
    }>;
    subjects: Readonly<{
        family: ReceizSubjectSourceFamilyV125;
        verifyPbiAuthorship: import("./v125PbiCeremony.js").ReceizPbiAuthorshipVerifierV125;
        authority: Readonly<{
            familyIsProofAuthority: false;
            selectionIsIdentityAdmission: false;
            strongerTruth: "sealed-receiz-proof-object";
        }>;
    }>;
    transitionPlan: Readonly<Readonly<{
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
    }> | undefined;
    events: readonly Readonly<Omit<Readonly<{
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
    }>[] | undefined;
    tuple: Readonly<{
        registryDigest: string;
        reducerDigest: string;
        namespace: string;
    }>;
    expected: Readonly<{
        applicationId: string;
        audience: string;
        domainId?: string;
        expectedRegistryDigest?: string;
        expectedReducerDigest?: string;
        afterHead?: string | null;
        afterCursor?: number;
    }>;
}>;
//# sourceMappingURL=v125SubjectThreadSource.d.ts.map