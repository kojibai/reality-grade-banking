import type { ReceizArtifactAppendPlan } from "./artifactTransition.js";
/** Additional conditions of an already admitted append, enforced by the existing atomic admission store. */
export type ReceizArtifactTransitionAtomicRequirements = Readonly<{
    readDependencies: readonly Readonly<{
        resource: string;
        expectedHeadDigest: string;
    }>[];
    consumedPbiReceiptDigests: readonly string[];
}>;
/** Internal source-planner custody; never exported from the package root. */
export declare function bindReceizArtifactTransitionAtomicRequirements(plan: ReceizArtifactAppendPlan, value: ReceizArtifactTransitionAtomicRequirements): void;
export declare function readReceizArtifactTransitionAtomicRequirements(plan: ReceizArtifactAppendPlan): Readonly<{
    readDependencies: readonly Readonly<{
        resource: string;
        expectedHeadDigest: string;
    }>[];
    consumedPbiReceiptDigests: readonly string[];
}> | undefined;
//# sourceMappingURL=artifactTransitionAtomicRequirements.d.ts.map