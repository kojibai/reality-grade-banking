export declare const RECEIZ_ECONOMY_SHOWCASE_ARTIFACT_ID: "economy-showcase:receiz.com";
export declare const RECEIZ_ECONOMY_SHOWCASE_V114_TRANSPORT_LIMITS: Readonly<{
    readonly directOperations: 1024;
    readonly parentDigests: 64;
    readonly segmentCommitments: 2;
}>;
export type ReceizEconomyShowcaseHeadV114 = Readonly<{
    schema: "receiz.economy-showcase-head.v114";
    artifactId: typeof RECEIZ_ECONOMY_SHOWCASE_ARTIFACT_ID;
    headKaiUpulse: string;
    parentArtifactDigests: readonly string[];
    priorOperationCount: number;
    resultingOperationCount: number;
    directOperations: readonly ReceizEconomyShowcaseOperationV114[];
    currentStateRoot: string;
    merkle: Readonly<{
        algorithm: "sha256/binary-carry/v1";
        leafCount: number;
        root: string;
        frontier: readonly (string | null)[];
    }>;
    fibonacci: Readonly<{
        basis: "sparse-checkpoint/v1";
        operationCount: number;
        checkpoints: readonly Readonly<{
            distance: number;
            operationCount: number;
            artifactDigest: string;
        }>[];
    }>;
    segmentWindow: readonly Readonly<Record<string, unknown>>[];
    counts: Readonly<{
        operationCount: number;
        profileShowcaseCount: number;
    }>;
    versions: Readonly<{
        registryDigest: string;
        kernelVersion: "receiz.composite.kernel.v1";
        verifierVersion: "receiz.economy-showcase.verifier.v114";
    }>;
    authority: Readonly<{
        economyShowcaseIsProofAuthority: false;
        projectionIsProofAuthority: false;
        strongerTruth: "sealed-receiz-proof-object";
        admissionStatus: "requires-native-seal-and-economy-admission";
    }>;
}>;
export type ReceizEconomyProfileShowcaseReferenceV114 = Readonly<{
    artifactId: `profile-showcase:${string}`;
    artifactDigest: string;
    immutableVersion: string;
    historyHeadDigest: string;
    admissionEvidenceRoot: string;
    headKaiUpulse: string;
}>;
export type ReceizEconomyShowcaseOperationV114 = Readonly<{
    schema: "receiz.economy-showcase.operation.v1";
    kind: "economy.profile-showcase.append";
    parentArtifactDigest: string;
    priorCommittedCount: number;
    directDeltaPosition: number;
    kai: Readonly<{
        upulse: string;
    }>;
    profileShowcase: ReceizEconomyProfileShowcaseReferenceV114;
    operationDigest: string;
}>;
export declare function assertReceizEconomyShowcaseHeadV114TransportContract(input: unknown): asserts input is ReceizEconomyShowcaseHeadV114;
export declare function deriveReceizEconomyShowcaseGenesisHeadV114(input: Readonly<{
    genesisKaiUpulse: string;
    registryDigest: string;
}>): Promise<ReceizEconomyShowcaseHeadV114>;
export declare function deriveReceizEconomyShowcaseSuccessorHeadV114(input: Readonly<{
    predecessorHead: ReceizEconomyShowcaseHeadV114;
    predecessorArtifactDigest: string;
    profileShowcases: readonly ReceizEconomyProfileShowcaseReferenceV114[];
    resolveCheckpoint: (operationCount: number) => string | null;
}>): Promise<ReceizEconomyShowcaseHeadV114>;
export declare function verifyReceizEconomyShowcaseSuccessorV114(input: Readonly<{
    predecessorHead: ReceizEconomyShowcaseHeadV114;
    predecessorArtifactDigest: string;
    candidateHead: unknown;
}>): Promise<ReceizEconomyShowcaseHeadV114>;
export type ReceizEconomyShowcaseMergeParentV114 = Readonly<{
    artifactDigest: string;
    head: ReceizEconomyShowcaseHeadV114;
}>;
export declare function deriveReceizEconomyShowcaseMergeHeadV114(input: Readonly<{
    commonPredecessorHead: ReceizEconomyShowcaseHeadV114;
    commonPredecessorArtifactDigest: string;
    parents: readonly [
        ReceizEconomyShowcaseMergeParentV114,
        ReceizEconomyShowcaseMergeParentV114
    ];
}>): Promise<ReceizEconomyShowcaseHeadV114>;
export declare function verifyReceizEconomyShowcaseMergeV114(input: Readonly<{
    commonPredecessorHead: ReceizEconomyShowcaseHeadV114;
    commonPredecessorArtifactDigest: string;
    parents: readonly [
        ReceizEconomyShowcaseMergeParentV114,
        ReceizEconomyShowcaseMergeParentV114
    ];
    candidateHead: unknown;
}>): Promise<ReceizEconomyShowcaseHeadV114>;
//# sourceMappingURL=economyShowcaseTransport.d.ts.map