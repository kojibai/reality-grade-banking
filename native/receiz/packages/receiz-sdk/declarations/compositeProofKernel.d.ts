export type ReceizCompositeMerkleState = Readonly<{
    algorithm: "sha256/binary-carry/v1";
    leafCount: number;
    root: string;
    frontier: readonly (string | null)[];
}>;
export type ReceizCompositeFibonacciCheckpoint = Readonly<{
    distance: number;
    operationCount: number;
    artifactDigest: string;
}>;
export type ReceizCompositeFibonacciState = Readonly<{
    basis: "sparse-checkpoint/v1";
    operationCount: number;
    checkpoints: readonly ReceizCompositeFibonacciCheckpoint[];
}>;
export type ReceizCompositeMerkleSibling = Readonly<{
    side: "left" | "right";
    digest: string;
}>;
export declare function digestReceizCompositeCanonical(value: unknown): string;
export declare function serializeReceizCompositeCanonical(value: unknown): Uint8Array;
export declare function buildReceizCompositeMerkleParent(left: string, right: string): string;
export declare function receizCompositeMerkleRootFromFrontier(frontier: readonly (string | null)[]): string;
export declare function assertReceizCompositeMerkleState(value: ReceizCompositeMerkleState): void;
export declare function createEmptyReceizCompositeMerkleState(): ReceizCompositeMerkleState;
export declare function appendReceizCompositeMerkleLeaf(prior: ReceizCompositeMerkleState, leafDigest: string): ReceizCompositeMerkleState;
export declare function createReceizCompositeSyntheticMerkleState(input: Readonly<{
    leafCount: number;
    resolvePerfectSubtreeRoot: (level: number) => string;
}>): ReceizCompositeMerkleState;
export declare function receizCompositeFibonacciDistancesUpTo(value: number): number[];
export declare function createReceizCompositeFibonacciState(input: Readonly<{
    operationCount: number;
    resolveArtifactDigest: (operationCount: number) => string;
}>): ReceizCompositeFibonacciState;
export declare function updateReceizCompositeFibonacciState(input: Readonly<{
    prior: ReceizCompositeFibonacciState;
    nextOperationCount: number;
    resolveArtifactDigest: (operationCount: number) => string | null;
}>): ReceizCompositeFibonacciState;
export declare function buildReceizCompositeBoundedTree(leafDigests: readonly string[]): Readonly<{
    root: string;
    witnesses: readonly (readonly ReceizCompositeMerkleSibling[])[];
}>;
export declare function recoverReceizCompositeMerkleRoot(leafDigest: string, siblings: readonly ReceizCompositeMerkleSibling[]): string;
export declare function assertReceizCompositeHeadBasis(input: Readonly<{
    stableArtifactId: string;
    headKaiUpulse: string;
    priorOperationCount: number;
    resultingOperationCount: number;
    directDeltaLength: number;
    parentCount: number;
    segmentCount: number;
    currentStateRoot: string;
    merkle: ReceizCompositeMerkleState;
    fibonacci: ReceizCompositeFibonacciState;
}>): void;
//# sourceMappingURL=compositeProofKernel.d.ts.map