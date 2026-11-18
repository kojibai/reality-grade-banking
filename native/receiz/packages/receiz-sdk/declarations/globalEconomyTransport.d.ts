import { type ReceizCompositeFibonacciState, type ReceizCompositeMerkleState } from "./compositeProofKernel.js";
import { RECEIZ_ECONOMY_SHOWCASE_ARTIFACT_ID, type ReceizEconomyShowcaseHeadV114 } from "./economyShowcaseTransport.js";
export declare const RECEIZ_GLOBAL_ECONOMY_V119_TRANSPORT_LIMITS: Readonly<{
    readonly directOperations: 1024;
    readonly parentDigests: 64;
    readonly childParentDigests: 64;
    readonly segmentCommitments: 2;
}>;
export type ReceizGlobalProofChildReferenceV119 = Readonly<{
    schema: "receiz.global-proof-child-reference.v119";
    namespace: `receiz.${string}`;
    artifactId: string;
    artifactDigest: string;
    immutableVersion: string;
    parentArtifactDigests: readonly string[];
    historyHeadDigest: string;
    admissionEvidenceRoot: string;
    headKaiUpulse: string;
    verifierBinding: Readonly<{
        registryDigest: string;
        lawId: string;
        verifierVersion: string;
    }>;
}>;
export type ReceizGlobalEconomyOperationV119 = Readonly<{
    schema: "receiz.global-economy.operation.v119";
    kind: "global.proof-object.append";
    parentArtifactDigest: string;
    priorCommittedCount: number;
    directDeltaPosition: number;
    kai: Readonly<{
        upulse: string;
    }>;
    child: ReceizGlobalProofChildReferenceV119;
    operationDigest: string;
}>;
export type ReceizGlobalEconomyHeadV119 = Readonly<{
    schema: "receiz.global-economy-head.v119";
    artifactId: typeof RECEIZ_ECONOMY_SHOWCASE_ARTIFACT_ID;
    headKaiUpulse: string;
    parentArtifactDigests: readonly string[];
    priorOperationCount: number;
    resultingOperationCount: number;
    directOperations: readonly ReceizGlobalEconomyOperationV119[];
    currentStateRoot: string;
    merkle: ReceizEconomyShowcaseHeadV114["merkle"];
    fibonacci: ReceizEconomyShowcaseHeadV114["fibonacci"];
    segmentWindow: readonly Readonly<Record<string, unknown>>[];
    counts: Readonly<{
        operationCount: number;
        proofObjectHeadCount: number;
        inheritedProfileShowcaseCount: number;
    }>;
    versions: Readonly<{
        registryDigest: string;
        kernelVersion: "receiz.composite.kernel.v1";
        verifierVersion: "receiz.global-economy.verifier.v119";
    }>;
    authority: Readonly<{
        globalCompositeIsChildProofAuthority: false;
        projectionIsProofAuthority: false;
        strongerTruth: "sealed-receiz-proof-object";
        admissionStatus: "requires-verified-child-and-global-admission";
    }>;
}>;
export declare function assertReceizGlobalProofChildReferenceV119(value: unknown): asserts value is ReceizGlobalProofChildReferenceV119;
export declare function assertReceizGlobalEconomyHeadV119TransportContract(input: unknown): asserts input is ReceizGlobalEconomyHeadV119;
export declare function deriveReceizGlobalEconomyUpgradeHeadV119(input: Readonly<{
    predecessorHead: ReceizEconomyShowcaseHeadV114;
    predecessorArtifactDigest: string;
    registryDigest: string;
}>): Promise<ReceizGlobalEconomyHeadV119>;
export declare function deriveReceizGlobalEconomyCheckpointHeadV119(input: Readonly<{
    predecessorArtifactDigest: string;
    headKaiUpulse: string;
    operationCount: number;
    proofObjectHeadCount: number;
    inheritedProfileShowcaseCount: number;
    merkle: ReceizCompositeMerkleState;
    fibonacci: ReceizCompositeFibonacciState;
    registryDigest: string;
}>): ReceizGlobalEconomyHeadV119;
export declare function deriveReceizGlobalEconomySuccessorHeadV119(input: Readonly<{
    predecessorHead: ReceizGlobalEconomyHeadV119;
    predecessorArtifactDigest: string;
    children: readonly ReceizGlobalProofChildReferenceV119[];
    resolveCheckpoint: (operationCount: number) => string | null;
}>): Promise<ReceizGlobalEconomyHeadV119>;
export declare function verifyReceizGlobalEconomySuccessorV119(input: Readonly<{
    predecessorHead: ReceizGlobalEconomyHeadV119;
    predecessorArtifactDigest: string;
    candidateHead: unknown;
    resolveCheckpoint: (operationCount: number) => string | null;
}>): Promise<ReceizGlobalEconomyHeadV119>;
//# sourceMappingURL=globalEconomyTransport.d.ts.map