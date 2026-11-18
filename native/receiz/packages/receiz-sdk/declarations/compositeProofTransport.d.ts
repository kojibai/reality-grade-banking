import { type ReceizConstitutionJson } from "./constitution.js";
import { type ReceizProofHistoryNode } from "./proofHistory.js";
import { RECEIZ_ECONOMY_SHOWCASE_ARTIFACT_ID, type ReceizEconomyShowcaseHeadV114 } from "./economyShowcaseTransport.js";
import { type ReceizProfileShowcasePersistentNodeV114, type ReceizProfileShowcasePersistentStateIOV114, type ReceizProfileShowcasePersistentStateV114 } from "./profileShowcasePersistentState.js";
declare const PROFILE_SEGMENT_AUTHORITY: Readonly<{
    readonly segmentIsProofAuthority: false;
    readonly rootIsProofAuthority: false;
    readonly witnessIsProofAuthority: false;
    readonly strongerTruth: "sealed-receiz-proof-object";
    readonly admissionStatus: "requires-sealed-showcase-artifact";
}>;
export type ReceizCompositeMerkleTransport = Readonly<{
    algorithm: "sha256/binary-carry/v1";
    leafCount: number;
    root: string;
    frontier: readonly (string | null)[];
}>;
export type ReceizProofHistoryParentReference = Readonly<{
    nodeDigest: string;
    artifactDigest: string;
    nodeCount: number;
    accumulatorRoot: string;
}>;
export type ReceizCarriedProofHistoryHeadV114 = Readonly<{
    schema: "receiz.carried-proof-history-head.v114";
    artifactId: string;
    registryDigest: string;
    rootDigest: string;
    headDigest: string;
    nodeCount: number;
    accumulator: ReceizCompositeMerkleTransport;
    currentNode: ReceizProofHistoryNode;
    parentRefs: readonly ReceizProofHistoryParentReference[];
    commitmentDigest: string;
}>;
export type ReceizBoundedProfileShowcaseCarrierV114 = Readonly<{
    schema: "receiz.profile-showcase-carrier.v114";
    artifactId: `profile-showcase:${string}`;
    ownerReceizIdentity: string;
    "profile-showcase": Readonly<Record<string, unknown>>;
    receizProofHistory: ReceizCarriedProofHistoryHeadV114;
}>;
export type ReceizEconomyShowcaseCarrierV114 = Readonly<{
    schema: "receiz.economy-showcase-carrier.v114";
    artifactId: typeof RECEIZ_ECONOMY_SHOWCASE_ARTIFACT_ID;
    "economy-showcase": ReceizEconomyShowcaseHeadV114;
    receizProofHistory: ReceizCarriedProofHistoryHeadV114;
}>;
export type ReceizProfileShowcaseSegmentMechanicsV114 = Readonly<{
    schema: "receiz.profile-showcase.segment.v1";
    commitment: Readonly<{
        segmentId: string;
        startOperationCount: number;
        endOperationCount: number;
        operationCount: number;
        root: string;
    }>;
    bytes: Uint8Array;
    operations: readonly ReceizConstitutionJson[];
    segmentBytesDigest: string;
    witnesses: readonly Readonly<Record<string, unknown>>[];
    membershipWitnesses: readonly Readonly<Record<string, unknown>>[];
    authority: typeof PROFILE_SEGMENT_AUTHORITY;
}>;
export declare function digestReceizProfileShowcaseOperationLeafV114(operation: ReceizConstitutionJson): Promise<string>;
export declare function deriveReceizProfileShowcaseNativeOperationDigestV114(operation: Readonly<Record<string, unknown>>): string;
export declare function deriveReceizProfileShowcasePersistentHeadDigestV114(input: Readonly<{
    state: ReceizProfileShowcasePersistentStateV114;
    merkleRoot: string;
}>): string;
export declare function createReceizProfileShowcaseSegmentMechanicsV114(input: Readonly<{
    operations: readonly ReceizConstitutionJson[];
    startOperationCount: number;
}>): Promise<ReceizProfileShowcaseSegmentMechanicsV114>;
export declare function createReceizProfileShowcaseCheckpointSegmentV114(input: Readonly<{
    operations: readonly ReceizConstitutionJson[];
    startOperationCount: number;
}>): Promise<ReceizProfileShowcaseSegmentMechanicsV114>;
export type ReceizProfileShowcaseCheckpointBundleV114 = Readonly<{
    schema: "receiz.profile-showcase.checkpoint-bundle.v114";
    artifactId: `profile-showcase:${string}`;
    ownerReceizIdentity: string;
    profileIdentity: string;
    predecessorArtifactDigest: string;
    predecessorHistoryHeadDigest: string;
    actorEvidenceRoot: string;
    headKaiUpulse: string;
    operationCount: number;
    merkle: ReceizCompositeMerkleTransport;
    counts: Readonly<{
        operationCount: number;
        membershipCount: number;
        visibleCount: number;
        hiddenCount: number;
        unlistedCount: number;
        pinnedCount: number;
    }>;
    currentStateRoot: string;
    finalHeadDigest: string;
    placementRoot: string;
    orderRoot: string;
    segmentAccumulator: ReceizCompositeMerkleTransport;
    segmentCount: number;
    firstPaintSegmentWindow: readonly ReceizProfileShowcaseSegmentMechanicsV114["commitment"][];
    fibonacciCheckpoints: readonly Readonly<{
        operationCount: number;
        merkleRoot: string;
        segmentPrefixRoot: string;
        partialSegmentRoot: string;
        segmentId: string;
    }>[];
    firstPaintWindow: Readonly<Record<string, unknown>>;
    firstPaintWitnessNodes: readonly ReceizProfileShowcasePersistentNodeV114[];
    checkpointHistoryNode: ReceizProofHistoryNode;
    versions: Readonly<{
        registryDigest: string;
        kernelVersion: "receiz.composite.kernel.v1";
        verifierVersion: "receiz.profile-showcase.verifier.v114";
    }>;
    authority: Readonly<{
        bundleIsProofAuthority: false;
        segmentIsProofAuthority: false;
        checkpointProjectionIsProofAuthority: false;
        strongerTruth: "sealed-receiz-proof-object";
    }>;
}>;
export type ReceizProfileShowcaseCheckpointBundleBuildV114 = Readonly<{
    bundle: ReceizProfileShowcaseCheckpointBundleV114;
    segments: readonly ReceizProfileShowcaseSegmentMechanicsV114[];
    instrumentation: Readonly<{
        maxLiveOperations: number;
        maxLiveSegments: number;
        maxLiveSegmentBytes: number;
        maxLivePersistentNodes: number;
        persistentNodeReads: number;
        persistentNodeWrites: number;
    }>;
}>;
/**
 * Builds one exact, content-addressed archive beneath an enclosing sealed
 * artifact. Operations are consumed once; immutable segments carry at most
 * 256 operations while the resulting foreground head remains bounded.
 */
export declare function createReceizProfileShowcaseCheckpointBundleV114(input: Readonly<{
    artifactId: `profile-showcase:${string}`;
    ownerReceizIdentity: string;
    profileIdentity: string;
    predecessorArtifactDigest: string;
    predecessorHistoryHeadDigest: string;
    actorEvidenceRoot: string;
    headKaiUpulse: string;
    operationCount: number;
    operations: Iterable<ReceizConstitutionJson> | AsyncIterable<ReceizConstitutionJson>;
    registryDigest: string;
    persistentStateIO?: ReceizProfileShowcasePersistentStateIOV114;
    retainSegments?: boolean;
    writeSegment?: (segment: ReceizProfileShowcaseSegmentMechanicsV114) => void | Promise<void>;
    checkpointPersistentState?: (state: ReceizProfileShowcasePersistentStateV114) => void | Promise<void>;
}>): Promise<ReceizProfileShowcaseCheckpointBundleBuildV114>;
export type ReceizProfileShowcaseCheckpointSegmentResolverV114 = (segmentIndex: number) => Promise<ReceizProfileShowcaseSegmentMechanicsV114 | null>;
export declare function verifyReceizProfileShowcaseCheckpointSnapshotV114(input: Readonly<{
    bundle: unknown;
    persistentStateIO?: ReceizProfileShowcasePersistentStateIOV114;
}>): Promise<ReceizProfileShowcaseCheckpointBundleBuildV114>;
export declare function verifyReceizProfileShowcaseCheckpointBundleV114(input: Readonly<{
    bundle: unknown;
    resolveSegment: ReceizProfileShowcaseCheckpointSegmentResolverV114;
    persistentStateIO?: ReceizProfileShowcasePersistentStateIOV114;
}>): Promise<ReceizProfileShowcaseCheckpointBundleBuildV114>;
export declare function deriveReceizProfileShowcaseBoundedGenesisHeadV114(input: Readonly<{
    artifactId: `profile-showcase:${string}`;
    ownerReceizIdentity: string;
    profileIdentity: string;
    genesisKaiUpulse: string;
    directDelta: readonly ReceizConstitutionJson[];
    registryDigest: string;
}>): Promise<Readonly<Record<string, unknown>>>;
export declare function deriveReceizLegacyProfileShowcaseCheckpointHeadV114(input: Readonly<{
    artifactId: `profile-showcase:${string}`;
    ownerReceizIdentity: string;
    profileIdentity: string;
    legacyArtifactDigest: string;
    legacyHistoryHeadDigest: string;
    legacyHeadKaiUpulse: string;
    legacyOperationCount: number;
    legacyStateRoot: string;
    merkle: ReceizCompositeMerkleTransport;
    fibonacciCheckpoints: readonly Readonly<{
        distance: number;
        operationCount: number;
        artifactDigest: string;
    }>[];
    segmentWindow: readonly Readonly<{
        segmentId: string;
        startOperationCount: number;
        endOperationCount: number;
        operationCount: number;
        root: string;
    }>[];
    counts: Readonly<Record<string, number>>;
    firstPaintChildren: readonly Readonly<{
        reference: Readonly<Record<string, unknown>>;
        membershipWitness: Readonly<Record<string, unknown>>;
    }>[];
    totalVisibleCount: number;
    registryDigest: string;
    placementRoot?: string;
    orderRoot?: string;
    firstPaintWitnessNodes?: readonly ReceizProfileShowcasePersistentNodeV114[];
}>): Promise<Readonly<Record<string, unknown>>>;
export type ReceizProfileShowcaseRetainedSegmentResolverV114 = (segmentId: string) => Promise<Readonly<{
    segmentId: string;
    startOperationCount: number;
    endOperationCount: number;
    operationCount: number;
    root: string;
}> | null>;
export declare function deriveReceizProfileShowcaseBoundedSuccessorHeadV114(input: Readonly<{
    predecessorCarrier: ReceizBoundedProfileShowcaseCarrierV114;
    predecessorArtifactDigest: string;
    directDelta: readonly ReceizConstitutionJson[];
    resolveRetainedSegment?: ReceizProfileShowcaseRetainedSegmentResolverV114;
    persistentStateIO?: ReceizProfileShowcasePersistentStateIOV114;
    resolveVerifiedHistoricalArtifactDigest?: (operationCount: number) => Promise<string | null> | string | null;
}>): Promise<Readonly<Record<string, unknown>>>;
export declare function verifyReceizProfileShowcaseBoundedSuccessorV114(input: Readonly<{
    predecessorCarrier: ReceizBoundedProfileShowcaseCarrierV114;
    predecessorArtifactDigest: string;
    candidateHead: Readonly<Record<string, unknown>>;
    resolveVerifiedHistoricalArtifactDigest?: (operationCount: number) => Promise<string | null> | string | null;
}>): Promise<Readonly<Record<string, unknown>>>;
export type ReceizProfileShowcaseBoundedMergeParentV114 = Readonly<{
    artifactDigest: string;
    carrier: ReceizBoundedProfileShowcaseCarrierV114;
}>;
/**
 * Coheres two verified bounded sibling proof objects. Both parents remain
 * direct causal history parents; deterministic ordering only selects the
 * predecessor mechanics used to apply the sealed union operation.
 */
export declare function deriveReceizProfileShowcaseBoundedMergeHeadV114(input: Readonly<{
    commonPredecessorCarrier: ReceizBoundedProfileShowcaseCarrierV114;
    commonPredecessorArtifactDigest: string;
    parents: readonly [
        ReceizProfileShowcaseBoundedMergeParentV114,
        ReceizProfileShowcaseBoundedMergeParentV114
    ];
    directDelta: readonly ReceizConstitutionJson[];
    persistentStateIO?: ReceizProfileShowcasePersistentStateIOV114;
    resolveVerifiedHistoricalArtifactDigest?: (operationCount: number) => Promise<string | null> | string | null;
}>): Promise<Readonly<Record<string, unknown>>>;
export declare function verifyReceizProfileShowcaseBoundedMergeV114(input: Parameters<typeof deriveReceizProfileShowcaseBoundedMergeHeadV114>[0] & Readonly<{
    candidateHead: Readonly<Record<string, unknown>>;
}>): Promise<Readonly<Record<string, unknown>>>;
export declare function assertReceizProfileShowcaseBoundedHeadV114(value: unknown): asserts value is Readonly<Record<string, unknown>>;
export declare function createReceizCarriedProofHistoryHeadV114(input: Omit<ReceizCarriedProofHistoryHeadV114, "schema" | "commitmentDigest">): Promise<ReceizCarriedProofHistoryHeadV114>;
export declare function parseReceizCarriedProofHistoryHeadV114(value: unknown): Promise<ReceizCarriedProofHistoryHeadV114>;
/**
 * Appends one immutable history node to the carried bounded head. This is
 * transport mechanics beneath the newly sealed artifact; it creates no
 * parallel admission, planning, sealing, or commit authority.
 */
export declare function appendReceizCarriedProofHistoryHeadV114(input: Readonly<{
    predecessor: ReceizCarriedProofHistoryHeadV114;
    predecessorArtifactDigest: string;
    appendNode: ReceizProofHistoryNode;
}>): Promise<ReceizCarriedProofHistoryHeadV114>;
export declare function mergeReceizCarriedProofHistoryHeadsV114(input: Readonly<{
    parents: readonly Readonly<{
        historyHead: ReceizCarriedProofHistoryHeadV114;
        artifactDigest: string;
    }>[];
    mergeNode: ReceizProofHistoryNode;
}>): Promise<ReceizCarriedProofHistoryHeadV114>;
export declare function parseReceizBoundedProfileShowcaseCarrierV114(value: unknown): Promise<ReceizBoundedProfileShowcaseCarrierV114>;
export declare function createReceizBoundedProfileShowcaseCarrierV114(input: Readonly<{
    artifactId: `profile-showcase:${string}`;
    ownerReceizIdentity: string;
    head: Readonly<Record<string, unknown>>;
    historyHead: ReceizCarriedProofHistoryHeadV114;
}>): Promise<ReceizBoundedProfileShowcaseCarrierV114>;
export declare function parseReceizEconomyShowcaseCarrierV114(value: unknown): Promise<ReceizEconomyShowcaseCarrierV114>;
export declare function createReceizEconomyShowcaseCarrierV114(input: Readonly<{
    head: ReceizEconomyShowcaseHeadV114;
    historyHead: ReceizCarriedProofHistoryHeadV114;
}>): Promise<ReceizEconomyShowcaseCarrierV114>;
export declare function assertReceizEconomyShowcaseCarriedHeadSemanticsV114(carrierInput: unknown): Promise<void>;
export declare function assertReceizBoundedProfileShowcaseCarriedHeadSemanticsV114(carrierInput: unknown): Promise<void>;
export {};
//# sourceMappingURL=compositeProofTransport.d.ts.map