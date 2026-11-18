import { type ReceizCompositeFibonacciState, type ReceizCompositeMerkleSibling, type ReceizCompositeMerkleState } from "./compositeProofKernel.js";
import { type PortableJson, type ReceizPortableAssetDocument } from "./portableAsset.js";
import { type ReceizIdentityKeyAlgorithm } from "./identity.js";
import type { ReceizPortableSealedArtifactV124 } from "./v124PortableAuthority.js";
import type { ReceizAuthenticatedRuntimeRequestV124 } from "./v124AuthenticatedRuntime.js";
import { type ReceizProofAuthorityChallengeV123 } from "./v123ProofAuthority.js";
import type { ReceizCheckpointReceiptV124, ReceizCheckpointV124, ReceizDomainReplayReceiptV124, ReceizDomainReplayV124, ReceizNamespaceProjectionV124 } from "./v124Replay.js";
import { type ReceizSubjectStateV122 } from "./v122Subjects.js";
export declare const RECEIZ_V124_DOMAIN_REPLAY_PROOF_CARRIER_MIME: "application/vnd.receiz.domain-replay-proof-carrier.v124+json";
export declare const RECEIZ_V124_PORTABLE_PROOF_OBJECT_MIME: "application/vnd.receiz.portable-asset.v1+json";
/** One production replay page is one immutable proof segment. */
export declare const RECEIZ_V124_DOMAIN_REPLAY_SEGMENT_CAPACITY: 128;
export type ReceizDomainReplayKaiV124 = Readonly<{
    pulse: number;
    uPulse: number;
}>;
export type ReceizDomainReplayNamespaceHeadV124 = Readonly<{
    name: string;
    head: string;
    digest: string;
}>;
export type ReceizDomainReplaySourceAuthorityV124 = Readonly<{
    schema: "receiz.domain-replay-source-authority.v124";
    applicationId: string;
    audience: string;
    domainId: string;
    ownerReceizId: string;
    actorSubjectId: string;
    actorSubjectHead: string;
    v123AuthorityDigest: string;
    v123KeyId: string;
    v123IdentityArtifactDigest: string;
    proofHeadBindingDigest: string;
    acceptedHead: string;
    ownershipDigest: string;
    provenanceDigest: string;
    sourceAuthorityBindingDigest: string;
    authority: Readonly<{
        bindingIsProofAuthority: false;
        grantIsIdentityAuthority: false;
        strongerTruth: "receiz-identity-artifact";
    }>;
}>;
export type ReceizDomainReplaySourceIntentInputV124 = Readonly<{
    applicationId: string;
    audience: string;
    domainId: string;
    registryDigest: string;
    reducerDigest: string;
    acceptedHead: string;
    sourceKai: ReceizDomainReplayKaiV124;
    predecessorArtifactSha256: string | null;
    replay: ReceizDomainReplayV124;
    replayReceipt: ReceizDomainReplayReceiptV124;
    journalAppends: readonly ReceizDomainAppendCommandV124[];
    causalParentWitnesses: readonly ReceizDomainReplayAppendIndexWitnessV124[];
    sourceAuthority: ReceizDomainReplaySourceAuthorityV124;
    ownership: ReceizPortableAssetDocument["ownership"];
    provenance: ReceizPortableAssetDocument["provenance"];
}>;
/** Exact deterministic consent basis presented before the Receiz ID signs. */
export type ReceizDomainReplaySourceIntentV124 = Readonly<{
    schema: "receiz.domain-replay-source-intent.v124";
    applicationId: string;
    audience: string;
    domainId: string;
    registryDigest: string;
    reducerDigest: string;
    acceptedHead: string;
    sourceKai: ReceizDomainReplayKaiV124;
    predecessorArtifactSha256: string | null;
    replayDigest: string;
    replayReceiptDigest: string;
    journalAppendsDigest: string;
    sourceAuthorityBindingDigest: string;
    v123KeyId: string;
    v123IdentityArtifactDigest: string;
    ownershipDigest: string;
    provenanceDigest: string;
    consentStatementDigest: string;
    authority: Readonly<{
        intentIsProofAuthority: false;
        strongerTruth: "receiz-identity-artifact";
    }>;
}>;
/** Public-only coordinate beneath the exact Receiz ID artifact. */
export type ReceizDomainReplayIdentityVerificationProjectionV124 = Readonly<{
    schema: "receiz.identity-public-verification.v124";
    identityArtifactDigest: string;
    keyId: string;
    alg: ReceizIdentityKeyAlgorithm;
    publicKeyRawB64u: string;
    authority: Readonly<{
        projectionIsIdentityAuthority: false;
        strongerTruth: "receiz-identity-artifact";
    }>;
}>;
export type ReceizDomainReplaySourceAuthoringEvidenceV124 = Readonly<{
    schema: "receiz.domain-replay-source-authoring-evidence.v124";
    identity: ReceizDomainReplayIdentityVerificationProjectionV124;
    signedChallenge: ReceizProofAuthorityChallengeV123;
    scopes: readonly string[];
    consentStatementDigest: string;
    authority: Readonly<{
        evidenceIsProofAuthority: false;
        evidenceIsIdentityAuthority: false;
        grantIsIdentityAuthority: false;
        strongerTruth: "receiz-identity-artifact";
    }>;
}>;
export type ReceizDomainReplayAppendIndexValueV124 = Readonly<{
    eventDigest: string;
    cursor: number;
    newHead: string;
}>;
export type ReceizDomainAppendReceiptV124 = Readonly<{
    schema: "receiz.domain.append-receipt.v124";
    applicationId: string;
    domainId: string;
    appendId: string;
    sequence: number;
    priorHead: string;
    newHead: string;
    eventDigest: string;
    namespace: ReceizDomainReplayNamespaceHeadV124;
    authority: Readonly<{
        journalIsProofAuthority: false;
        strongerTruth: "sealed-receiz-proof-object";
    }>;
    receiptDigest: string;
}>;
export type ReceizDomainAppendResultV124 = Readonly<{
    schema: "receiz.domain.append-result.v124";
    ok: true;
    applicationId: string;
    domainId: string;
    appendId: string;
    sequence: number;
    head: string;
    receiptDigest: string;
}>;
export type ReceizDomainAppendConflictV124 = Readonly<{
    schema: "receiz.domain.append-conflict.v124";
    ok: false;
    applicationId: string;
    domainId: string;
    appendId: string;
    expectedHead: string;
    reasonCode: "STALE_HEAD";
    writes: 0;
}>;
/** Exact closed command consumed by the durable journal CAS mirror. */
export type ReceizDomainAppendCommandV124 = Readonly<{
    acceptedAtKaiUPulse: number;
    acceptedHead: string;
    appendId: string;
    applicationId: string;
    causalAppendIds: readonly string[];
    causalParentHeads: readonly string[];
    conflict: ReceizDomainAppendConflictV124;
    domainId: string;
    eventBytesB64u: string;
    eventDigest: string;
    eventPosition: number;
    expectedAbsent: boolean;
    expectedHead: string;
    namespace: ReceizNamespaceProjectionV124;
    receipt: ReceizDomainAppendReceiptV124;
    reducerDigest: string;
    registryDigest: string;
    result: ReceizDomainAppendResultV124;
}>;
export type ReceizDomainAppendCausalParentHeadV124 = Readonly<{
    appendId: string;
    head: string;
}>;
/** Exact source inputs that cannot be derived from the replay projection. */
export type ReceizDomainAppendCommandsInputV124 = Readonly<{
    replay: ReceizDomainReplayV124;
    replayReceipt: ReceizDomainReplayReceiptV124;
    kai: ReceizDomainReplayKaiV124;
    acceptedAtKaiUPulses: readonly number[];
    externalCausalParentHeads: readonly ReceizDomainAppendCausalParentHeadV124[];
}>;
export type ReceizDomainReplayAppendIndexWitnessV124 = Readonly<{
    schema: "receiz.domain-replay-append-index-witness.v124";
    appendId: string;
    value: ReceizDomainReplayAppendIndexValueV124 | null;
    /** Only non-default siblings, ordered by root depth. */
    siblings: readonly Readonly<{
        depth: number;
        digest: string;
    }>[];
}>;
export type ReceizDomainReplayFibonacciWitnessV124 = Readonly<{
    schema: "receiz.domain-replay-fibonacci-witness.v124";
    segmentPosition: number;
    segmentId: string;
    artifactSha256: string;
    peakLevel: number;
    siblings: readonly ReceizCompositeMerkleSibling[];
}>;
export type ReceizDomainReplayProofSegmentChildV124 = Readonly<{
    schema: "receiz.domain-replay-page-segment.v124";
    proofObjectId: string;
    segmentIndex: number;
    kai: ReceizDomainReplayKaiV124;
    sourceAuthority: ReceizDomainReplaySourceAuthorityV124;
    authoringEvidence: ReceizDomainReplaySourceAuthoringEvidenceV124;
    replay: ReceizDomainReplayV124;
    replayReceipt: ReceizDomainReplayReceiptV124;
    journalAppends: readonly ReceizDomainAppendCommandV124[];
    insertionWitnesses: readonly ReceizDomainReplayAppendIndexWitnessV124[];
    causalParentWitnesses: readonly ReceizDomainReplayAppendIndexWitnessV124[];
    authority: Readonly<{
        segmentIsProofAuthority: false;
        witnessIsProofAuthority: false;
        strongerTruth: "sealed-receiz-proof-object";
    }>;
}>;
export type ReceizDomainReplayProofSegmentCommitmentV124 = Readonly<{
    schema: "receiz.domain-replay-page-segment-commitment.v124";
    segmentIndex: number;
    startCursor: number;
    endCursor: number;
    additionCount: number;
    eventRoot: string;
    segmentBytesDigest: string;
    segmentId: string;
    exactSegmentBytesB64u: string;
}>;
export type ReceizDomainReplayProofHeadV124 = Readonly<{
    schema: "receiz.domain-replay-proof-head.v124";
    proofObjectId: string;
    applicationId: string;
    domainId: string;
    registryDigest: string;
    reducerDigest: string;
    genesisHead: string;
    kai: ReceizDomainReplayKaiV124;
    head: string;
    cursor: number;
    namespace: ReceizDomainReplayNamespaceHeadV124;
    segmentCount: number;
    segmentAccumulator: ReceizCompositeMerkleState;
    appendIndexRoot: string;
    appendIndexCount: number;
    fibonacci: ReceizCompositeFibonacciState;
    priorSourceArtifactSha256: string | null;
    priorSourceSegmentDigest: string | null;
    currentSourceSegmentDigest: string;
    currentSegment: Omit<ReceizDomainReplayProofSegmentCommitmentV124, "schema" | "exactSegmentBytesB64u">;
    headDigest: string;
    authority: Readonly<{
        headIsProofAuthority: false;
        accumulatorIsProofAuthority: false;
        indexIsProofAuthority: false;
        strongerTruth: "sealed-receiz-proof-object";
    }>;
}>;
export type ReceizDomainReplaySegmentProofCarrierV124 = Readonly<{
    schema: "receiz.domain-replay-segment-proof.v124";
    proofObjectId: string;
    applicationId: string;
    domainId: string;
    registryDigest: string;
    reducerDigest: string;
    predecessor: Readonly<{
        artifactSha256: string;
        head: ReceizDomainReplayProofHeadV124;
    }> | null;
    segment: ReceizDomainReplayProofSegmentCommitmentV124;
    fibonacciWitnesses: readonly ReceizDomainReplayFibonacciWitnessV124[];
    head: ReceizDomainReplayProofHeadV124;
    authority: Readonly<{
        carrierIsProofAuthority: false;
        projectionIsProofAuthority: false;
        strongerTruth: "sealed-receiz-proof-object";
    }>;
}>;
export type ReceizDomainReplayCheckpointProofCarrierV124 = Readonly<{
    schema: "receiz.domain-replay-checkpoint-proof.v124";
    proofObjectId: string;
    applicationId: string;
    domainId: string;
    registryDigest: string;
    reducerDigest: string;
    kai: ReceizDomainReplayKaiV124;
    sourceAuthority: ReceizDomainReplaySourceAuthorityV124;
    replaySourceArtifact: ReceizPortableSealedArtifactV124;
    replaySourceArtifactSha256: string;
    replayHead: ReceizDomainReplayProofHeadV124;
    checkpoint: ReceizCheckpointV124;
    checkpointReceipt: ReceizCheckpointReceiptV124;
    currentSourceSegmentDigest: string;
    authority: Readonly<{
        carrierIsProofAuthority: false;
        checkpointIsProofAuthority: false;
        strongerTruth: "sealed-receiz-proof-object";
    }>;
}>;
export type ReceizViewerSubjectSourceCarrierV124 = Readonly<{
    schema: "receiz.viewer-subject-source.v124";
    subjectId: string;
    proofObjectId: string;
    ownerReceizId: string;
    head: string;
    accessKeyHead: string | null;
    exactSubjectStateBytesB64u: string;
    subjectStateDigest: string;
    authority: Readonly<{
        carrierIsSubjectAuthority: false;
        projectionIsSubjectAuthority: false;
        strongerTruth: "sealed-receiz-proof-object";
    }>;
}>;
/** Constant-width persistence bundle; nested exact artifacts remain source. */
export type ReceizDomainReplayProofCarrierV124 = Readonly<{
    schema: "receiz.domain-replay-proof-custody.v124";
    proofObjectId: string;
    applicationId: string;
    domainId: string;
    registryDigest: string;
    reducerDigest: string;
    head: string;
    cursor: number;
    namespace: ReceizDomainReplayNamespaceHeadV124;
    predecessorSourceArtifact: ReceizPortableSealedArtifactV124 | null;
    replaySourceArtifact: ReceizPortableSealedArtifactV124;
    checkpointSourceArtifact: ReceizPortableSealedArtifactV124 | null;
    authority: Readonly<{
        custodyIsProofAuthority: false;
        projectionIsProofAuthority: false;
        strongerTruth: "sealed-receiz-proof-object";
    }>;
}>;
export type ReceizDomainReplayProofObjectExportInputV124 = Readonly<{
    applicationId: string;
    domainId: string;
    expectedRegistryDigest: string;
    expectedReducerDigest: string;
    throughHead: string;
    includeCheckpoint?: boolean;
    ownership: ReceizPortableAssetDocument["ownership"];
    provenance: ReceizPortableAssetDocument["provenance"];
    settlement: Readonly<Record<string, PortableJson>>;
}>;
export type ReceizDomainReplayProofObjectExportV124 = Readonly<{
    schema: "receiz.domain-replay-proof-object-export.v124";
    applicationId: string;
    domainId: string;
    registryDigest: string;
    reducerDigest: string;
    throughHead: string;
    cursor: number;
    namespace: ReceizDomainReplayNamespaceHeadV124;
    portableAssetDigest: string;
    proofObject: Readonly<{
        assetType: "proof_object";
        payload: Readonly<{
            mimeType: typeof RECEIZ_V124_PORTABLE_PROOF_OBJECT_MIME;
            bytes: Uint8Array;
        }>;
    }>;
    authority: Readonly<{
        exportIsProofAuthority: false;
        strongerTruth: "sealed-receiz-proof-object";
    }>;
}>;
export type ReceizProofObjectCandidatePortableV124 = Readonly<{
    ownership: ReceizPortableAssetDocument["ownership"];
    provenance: ReceizPortableAssetDocument["provenance"];
    settlement: Readonly<Record<string, PortableJson>>;
}>;
type ReceizProofObjectCandidatePayloadV124 = Readonly<{
    assetType: "proof_object";
    payload: Readonly<{
        mimeType: typeof RECEIZ_V124_PORTABLE_PROOF_OBJECT_MIME;
        bytes: Uint8Array;
    }>;
}>;
export type ReceizSubjectSourceProofObjectCandidateV124 = Readonly<{
    schema: "receiz.subject-source-proof-object-candidate.v124";
    carrier: ReceizViewerSubjectSourceCarrierV124;
    portableAssetDigest: string;
    proofObject: ReceizProofObjectCandidatePayloadV124;
    authority: Readonly<{
        candidateIsSubjectAuthority: false;
        sealed: false;
        strongerTruth: "sealed-receiz-proof-object";
    }>;
}>;
export type ReceizDomainReplaySegmentProofObjectCandidateV124 = Readonly<{
    schema: "receiz.domain-replay-segment-proof-object-candidate.v124";
    carrier: ReceizDomainReplaySegmentProofCarrierV124;
    portableAssetDigest: string;
    proofObject: ReceizProofObjectCandidatePayloadV124;
    authority: Readonly<{
        candidateIsProofAuthority: false;
        sealed: false;
        strongerTruth: "sealed-receiz-proof-object";
    }>;
}>;
export type ReceizDomainReplayCheckpointProofObjectCandidateV124 = Readonly<{
    schema: "receiz.domain-replay-checkpoint-proof-object-candidate.v124";
    carrier: ReceizDomainReplayCheckpointProofCarrierV124;
    portableAssetDigest: string;
    proofObject: ReceizProofObjectCandidatePayloadV124;
    authority: Readonly<{
        candidateIsProofAuthority: false;
        sealed: false;
        strongerTruth: "sealed-receiz-proof-object";
    }>;
}>;
export type ReceizSubjectSourceProofObjectCandidateInputV124 = Readonly<{
    subjectState: ReceizSubjectStateV122;
    portable: ReceizProofObjectCandidatePortableV124;
}>;
export type ReceizDomainReplaySegmentProofObjectCandidateInputV124 = Readonly<{
    replay: ReceizDomainReplayV124;
    replayReceipt: ReceizDomainReplayReceiptV124;
    journalAppends: readonly ReceizDomainAppendCommandV124[];
    authoringEvidence: ReceizDomainReplaySourceAuthoringEvidenceV124;
    sourceAuthority: ReceizDomainReplaySourceAuthorityV124;
    kai: ReceizDomainReplayKaiV124;
    predecessorArtifact: ReceizPortableSealedArtifactV124 | null;
    insertionWitnesses: readonly ReceizDomainReplayAppendIndexWitnessV124[];
    causalParentWitnesses: readonly ReceizDomainReplayAppendIndexWitnessV124[];
    fibonacci: ReceizCompositeFibonacciState;
    fibonacciWitnesses: readonly ReceizDomainReplayFibonacciWitnessV124[];
    portable: ReceizProofObjectCandidatePortableV124;
}>;
export type ReceizDomainReplayCheckpointProofObjectCandidateInputV124 = Readonly<{
    replaySourceArtifact: ReceizPortableSealedArtifactV124;
    replayPredecessorArtifact: ReceizPortableSealedArtifactV124 | null;
    expectedAudience: string;
    checkpoint: ReceizCheckpointV124;
    checkpointReceipt: ReceizCheckpointReceiptV124;
    portable: ReceizProofObjectCandidatePortableV124;
}>;
export type ReceizDomainReplayProofObjectExpectationV124 = Readonly<{
    applicationId: string;
    domainId: string;
    expectedRegistryDigest: string;
    expectedReducerDigest: string;
    expectedHead: string;
    expectedCursor: number;
    expectedNamespace: ReceizDomainReplayNamespaceHeadV124;
}>;
export type ReceizDomainReplayProofObjectRestoreInputV124 = ReceizDomainReplayProofObjectExpectationV124 & Readonly<{
    artifact: ReceizPortableSealedArtifactV124;
}>;
export type ReceizDomainReplayProofObjectRestorationV124 = Readonly<{
    schema: "receiz.domain-replay-proof-object-restoration.v124";
    status: "restored";
    replay: ReceizDomainReplayV124;
    checkpoint: ReceizCheckpointV124 | null;
    sourceArtifactSha256: string;
    checkpointSourceArtifactSha256: string | null;
    headDigest: string;
    sourceAuthority: ReceizDomainReplaySourceAuthorityV124;
    authority: Readonly<{
        restorationIsProofAuthority: false;
        strongerTruth: "sealed-receiz-proof-object";
    }>;
}>;
export type ReceizDomainReplaySegmentSourceExpectationV124 = Readonly<{
    applicationId: string;
    audience: string;
    domainId?: string;
    expectedRegistryDigest?: string;
    expectedReducerDigest?: string;
    afterHead?: string | null;
    afterCursor?: number;
}>;
export type ReceizReadDomainReplaySegmentSourceV124 = Readonly<{
    schema: "receiz.domain-replay-segment-source-read.v124";
    status: "verified-source";
    artifact: ReceizPortableSealedArtifactV124;
    artifactSha256: string;
    artifactKaiPulse: number;
    predecessorArtifact: ReceizPortableSealedArtifactV124 | null;
    carrier: ReceizDomainReplaySegmentProofCarrierV124;
    head: ReceizDomainReplayProofHeadV124;
    replay: ReceizDomainReplayV124;
    replayReceipt: ReceizDomainReplayReceiptV124;
    journalAppends: readonly ReceizDomainAppendCommandV124[];
    sourceIntent: ReceizDomainReplaySourceIntentV124;
    authoringEvidence: ReceizDomainReplaySourceAuthoringEvidenceV124;
    sourceAuthority: ReceizDomainReplaySourceAuthorityV124;
    ownership: ReceizPortableAssetDocument["ownership"];
    provenance: ReceizPortableAssetDocument["provenance"];
    authority: Readonly<{
        sourceReadIsProofAuthority: false;
        strongerTruth: "sealed-receiz-proof-object";
    }>;
}>;
/** Non-authoritative content-addressed lookup coordinate from one pinned source. */
export type ReceizDomainReplaySegmentSourceCoordinateV124 = Readonly<{
    schema: "receiz.domain-replay-segment-source-coordinate.v124";
    artifactSha256: string;
    predecessorArtifactSha256: string | null;
    proofObjectId: string;
    applicationId: string;
    domainId: string;
    registryDigest: string;
    reducerDigest: string;
    head: string;
    headDigest: string;
    authority: Readonly<{
        coordinateIsProofAuthority: false;
        strongerTruth: "sealed-receiz-proof-object";
    }>;
}>;
export type ReceizReadDomainReplayCheckpointSourceV124 = Readonly<{
    schema: "receiz.domain-replay-checkpoint-source-read.v124";
    status: "verified-source";
    artifact: ReceizPortableSealedArtifactV124;
    artifactSha256: string;
    artifactKaiPulse: number;
    carrier: ReceizDomainReplayCheckpointProofCarrierV124;
    replaySource: ReceizReadDomainReplaySegmentSourceV124;
    replayHead: ReceizDomainReplayProofHeadV124;
    checkpoint: ReceizCheckpointV124;
    checkpointReceipt: ReceizCheckpointReceiptV124;
    sourceAuthority: ReceizDomainReplaySourceAuthorityV124;
    ownership: ReceizPortableAssetDocument["ownership"];
    provenance: ReceizPortableAssetDocument["provenance"];
    authority: Readonly<{
        sourceReadIsProofAuthority: false;
        strongerTruth: "sealed-receiz-proof-object";
    }>;
}>;
export type ReceizReadViewerSubjectSourceV124 = Readonly<{
    schema: "receiz.viewer-subject-source-read.v124";
    status: "verified-source";
    artifact: ReceizPortableSealedArtifactV124;
    artifactSha256: string;
    artifactKaiPulse: number;
    carrier: ReceizViewerSubjectSourceCarrierV124;
    subjectState: ReceizSubjectStateV122;
    ownership: ReceizPortableAssetDocument["ownership"];
    provenance: ReceizPortableAssetDocument["provenance"];
    authority: Readonly<{
        sourceReadIsSubjectAuthority: false;
        strongerTruth: "sealed-receiz-proof-object";
    }>;
}>;
/** Domain-neutral name for the same existing sealed subject-state primitive. */
export type ReceizReadSubjectSourceV124 = ReceizReadViewerSubjectSourceV124;
export type ReceizDomainReplayRuntimeSourceAdmissionV124 = Readonly<{
    kind: "replay-segment";
    requestDigest: string;
    source: ReceizReadDomainReplaySegmentSourceV124;
}> | Readonly<{
    kind: "replay-no-additions";
    requestDigest: string;
    source: ReceizReadDomainReplaySegmentSourceV124;
    replay: ReceizDomainReplayV124;
    replayReceipt: ReceizDomainReplayReceiptV124;
}> | Readonly<{
    kind: "checkpoint";
    requestDigest: string;
    source: ReceizReadDomainReplayCheckpointSourceV124;
}> | Readonly<{
    kind: "private";
    requestDigest: string;
    eventSource: ReceizReadDomainReplaySegmentSourceV124;
    viewerSubjectSource: ReceizReadViewerSubjectSourceV124;
    accessGrantSource: ReceizReadDomainReplaySegmentSourceV124;
}> | Readonly<{
    kind: "private-failure";
    requestDigest: string;
}> | Readonly<{
    kind: "namespace";
    requestDigest: string;
    subjectSource: ReceizReadSubjectSourceV124;
}> | Readonly<{
    kind: "namespace-failure";
    requestDigest: string;
}>;
export declare function parseReceizDomainReplayKaiV124(value: unknown, code?: string): ReceizDomainReplayKaiV124;
export declare function parseReceizDomainReplayNamespaceHeadV124(value: unknown, code?: string): ReceizDomainReplayNamespaceHeadV124;
export declare function deriveReceizDomainReplayProofObjectIdV124(input: Readonly<{
    applicationId: string;
    domainId: string;
    registryDigest: string;
    reducerDigest: string;
    genesisHead: string;
}>): string;
export declare function createReceizDomainReplaySourceAuthorityV124(input: Readonly<{
    applicationId: string;
    audience: string;
    domainId: string;
    ownerReceizId: string;
    actorSubjectId: string;
    actorSubjectHead: string;
    v123AuthorityDigest: string;
    v123KeyId: string;
    v123IdentityArtifactDigest: string;
    proofHeadBindingDigest: string;
    acceptedHead: string;
    ownership: ReceizPortableAssetDocument["ownership"];
    provenance: ReceizPortableAssetDocument["provenance"];
}>): Promise<ReceizDomainReplaySourceAuthorityV124>;
export declare function parseReceizDomainReplaySourceAuthorityV124(value: unknown, enclosing?: Readonly<{
    ownership: ReceizPortableAssetDocument["ownership"];
    provenance: ReceizPortableAssetDocument["provenance"];
}>): Promise<ReceizDomainReplaySourceAuthorityV124>;
/**
 * Builds the exact source-authorship consent basis before any identity proof
 * is requested. This is deterministic coordination data only; the resulting
 * digest acquires no authority until the Receiz ID signs the V123 challenge
 * and the enclosing replay candidate is sealed and pinned-admitted.
 */
export declare function createReceizDomainReplaySourceIntentV124(input: ReceizDomainReplaySourceIntentInputV124): Promise<ReceizDomainReplaySourceIntentV124>;
export declare function createEmptyReceizDomainReplayAppendIndexRootV124(): string;
export declare function deriveReceizDomainReplayAppendIndexKeyV124(appendId: string): string;
export declare function deriveReceizDomainReplayAppendIndexLeafV124(input: Readonly<{
    appendId: string;
    value: ReceizDomainReplayAppendIndexValueV124;
}>): string;
export declare function deriveReceizDomainReplaySegmentEventLeafV124(input: Readonly<{
    appendId: string;
    eventDigest: string;
    cursor: number;
    newHead: string;
}>): string;
export declare function deriveReceizDomainReplaySegmentIdV124(input: Readonly<{
    proofObjectId: string;
    segmentIndex: number;
    startCursor: number;
    endCursor: number;
    additionCount: number;
    eventRoot: string;
    segmentBytesDigest: string;
}>): string;
export declare function parseReceizDomainReplaySegmentCommitmentV124(value: unknown): ReceizDomainReplayProofSegmentCommitmentV124;
export declare function parseReceizDomainReplayAppendIndexWitnessV124(value: unknown): ReceizDomainReplayAppendIndexWitnessV124;
export declare function deriveReceizDomainReplayAppendIndexRootFromWitnessV124(input: Readonly<{
    witness: ReceizDomainReplayAppendIndexWitnessV124;
    value: ReceizDomainReplayAppendIndexValueV124 | null;
}>): string;
export declare function verifyReceizDomainReplayAppendIndexWitnessV124(input: Readonly<{
    witness: unknown;
    expectedRoot: string;
    expectedAppendId: string;
    expectedValue: ReceizDomainReplayAppendIndexValueV124 | null;
    insertValue?: ReceizDomainReplayAppendIndexValueV124;
}>): Readonly<{
    witness: ReceizDomainReplayAppendIndexWitnessV124;
    resultingRoot: string;
}>;
export declare function parseReceizDomainReplayProofHeadV124(value: unknown): ReceizDomainReplayProofHeadV124;
export declare function createReceizDomainReplayProofHeadV124(input: Omit<ReceizDomainReplayProofHeadV124, "schema" | "headDigest" | "authority">): ReceizDomainReplayProofHeadV124;
export declare function compareReceizDomainReplaySourceHeadsV124(left: Readonly<{
    head: ReceizDomainReplayProofHeadV124;
    artifactSha256: string;
}>, right: Readonly<{
    head: ReceizDomainReplayProofHeadV124;
    artifactSha256: string;
}>): number;
export declare function createEmptyReceizDomainReplaySegmentAccumulatorV124(): ReceizCompositeMerkleState;
export declare function appendReceizDomainReplaySegmentAccumulatorV124(prior: ReceizCompositeMerkleState, segmentId: string): ReceizCompositeMerkleState;
export declare function verifyReceizDomainReplayFibonacciWitnessV124(input: Readonly<{
    witness: unknown;
    accumulator: ReceizCompositeMerkleState;
    expectedOperationCount: number;
    expectedArtifactSha256: string;
}>): ReceizDomainReplayFibonacciWitnessV124;
/**
 * Purely derives the exact durable-journal commands for one replay segment.
 * The result is coordination data and acquires no custody until it is carried
 * by a pinned-admitted sealed segment proof object.
 */
export declare function createReceizDomainAppendCommandsV124(input: ReceizDomainAppendCommandsInputV124): Promise<readonly ReceizDomainAppendCommandV124[]>;
export declare function parseReceizPortableReplaySourceArtifactV124(value: unknown): ReceizPortableSealedArtifactV124;
/** Pinned source opening; no caller roots, admissions, issuer, clock, or booleans. */
export declare function verifyAndReadReceizDomainReplayProofObjectV124(value: unknown): Promise<Readonly<{
    carrier: unknown;
    artifactSha256: string;
    artifactKaiPulse: number;
    artifact: ReceizPortableSealedArtifactV124;
    ownership: ReceizPortableAssetDocument["ownership"];
    provenance: ReceizPortableAssetDocument["provenance"];
}>>;
/**
 * Pinned, stateless lookup inspection for loading the exact predecessor bytes.
 * The returned digest is only a coordinate; full admission still requires the
 * exact predecessor artifact to be supplied to the segment reader.
 */
export declare function inspectReceizDomainReplaySegmentSourceCoordinateV124(artifact: ReceizPortableSealedArtifactV124): Promise<ReceizDomainReplaySegmentSourceCoordinateV124>;
/** Pinned verification and full reconstruction of one immutable replay segment. */
export declare function readReceizDomainReplaySegmentSourceV124(input: Readonly<{
    artifact: ReceizPortableSealedArtifactV124;
    predecessorArtifact?: ReceizPortableSealedArtifactV124;
    expected: ReceizDomainReplaySegmentSourceExpectationV124;
}>): Promise<ReceizReadDomainReplaySegmentSourceV124>;
/** Pinned verification of a checkpoint source, optionally bound to held replay source. */
export declare function readReceizDomainReplayCheckpointSourceV124(input: Readonly<{
    artifact: ReceizPortableSealedArtifactV124;
    expectedAudience: string;
    replaySource?: ReceizReadDomainReplaySegmentSourceV124;
    replayPredecessorArtifact?: ReceizPortableSealedArtifactV124;
}>): Promise<ReceizReadDomainReplayCheckpointSourceV124>;
/** Pinned enclosing subject source; the carried state is subordinate to it. */
export declare function readReceizViewerSubjectSourceV124(artifact: ReceizPortableSealedArtifactV124): Promise<ReceizReadViewerSubjectSourceV124>;
/** Domain-neutral alias; namespace/private callers share the same sealed source. */
export declare const readReceizSubjectSourceV124: typeof readReceizViewerSubjectSourceV124;
/**
 * Verifies sealed source before the authenticated-runtime module records any
 * runtime custody. Direct callers gain nothing unless the exact pinned artifact
 * and every carried relation are valid.
 */
export declare function verifyReceizDomainReplayRuntimeSourceV124(wire: unknown, request: ReceizAuthenticatedRuntimeRequestV124): Promise<ReceizDomainReplayRuntimeSourceAdmissionV124>;
/** Single-use handoff into authenticated-runtime finalization. */
export declare function consumeReceizDomainReplayRuntimeSourceAdmissionV124(wire: unknown, requestDigest: string): ReceizDomainReplayRuntimeSourceAdmissionV124;
export declare function clearReceizDomainReplayRuntimeSourceAdmissionV124(wire: unknown): void;
export declare function createReceizDomainReplayProofObjectExportV124(carrier: ReceizDomainReplayProofCarrierV124 | ReceizDomainReplaySegmentProofCarrierV124 | ReceizDomainReplayCheckpointProofCarrierV124, portable: Readonly<{
    ownership: ReceizPortableAssetDocument["ownership"];
    provenance: ReceizPortableAssetDocument["provenance"];
    settlement: Readonly<Record<string, PortableJson>>;
}>): Promise<ReceizDomainReplayProofObjectExportV124>;
/**
 * Prepares exact portable bytes for the existing Record+Seal primitive.
 * The returned candidate is deliberately unsealed and carries no authority.
 */
export declare function prepareReceizSubjectSourceProofObjectCandidateV124(input: ReceizSubjectSourceProofObjectCandidateInputV124): Promise<ReceizSubjectSourceProofObjectCandidateV124>;
/**
 * Builds one bounded replay-page candidate from exact replay coordinates and
 * independently checkable sparse/Fibonacci witnesses. The candidate must be
 * sealed and pinned-admitted before it can establish replay custody.
 */
export declare function prepareReceizDomainReplaySegmentProofObjectCandidateV124(input: ReceizDomainReplaySegmentProofObjectCandidateInputV124): Promise<ReceizDomainReplaySegmentProofObjectCandidateV124>;
/** Builds an unsealed checkpoint candidate bound to one exact pinned replay source. */
export declare function prepareReceizDomainReplayCheckpointProofObjectCandidateV124(input: ReceizDomainReplayCheckpointProofObjectCandidateInputV124): Promise<ReceizDomainReplayCheckpointProofObjectCandidateV124>;
export {};
//# sourceMappingURL=v124ReplayProofObject.d.ts.map