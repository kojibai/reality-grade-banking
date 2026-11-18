import { type ReceizCompositeFibonacciState, type ReceizCompositeMerkleState } from "./compositeProofKernel.js";
export type ReceizSportsVaultSportV119 = "baseball" | "soccer" | "fight";
export type ReceizSportsVaultCardHeadReferenceV119 = Readonly<{
    schema: "receiz.sports-vault.card-head-reference.v119";
    collectibleId: string;
    claimHash: string;
    cardArtifactDigest: string;
    immutableVersion: string;
    historyHeadDigest: string;
    admissionEvidenceRoot: string;
    headKaiUpulse: string;
    verifierBinding: Readonly<{
        registryDigest: string;
        lawId: "receiz.sports-card-proof-object.admission.v119";
        verifierVersion: "receiz.sports-card-proof-object.verifier.v119";
    }>;
}>;
export type ReceizSportsVaultOperationV119 = Readonly<{
    schema: "receiz.sports-vault.operation.v119";
    kind: "sports-vault.card-head.append";
    parentArtifactDigest: string;
    priorCommittedCount: number;
    directDeltaPosition: number;
    kai: Readonly<{
        upulse: string;
    }>;
    card: ReceizSportsVaultCardHeadReferenceV119;
    operationDigest: string;
}>;
export type ReceizSportsVaultRecursiveHeadV119 = Readonly<{
    schema: "receiz.sports-vault.recursive-head.v119";
    artifactId: `sports-vault:${string}:${ReceizSportsVaultSportV119}`;
    ownerReceizIdentity: string;
    sport: ReceizSportsVaultSportV119;
    headKaiUpulse: string;
    parentArtifactDigests: readonly string[];
    priorOperationCount: number;
    resultingOperationCount: number;
    directOperations: readonly ReceizSportsVaultOperationV119[];
    currentStateRoot: string;
    merkle: ReceizCompositeMerkleState;
    fibonacci: ReceizCompositeFibonacciState;
    counts: Readonly<{
        operationCount: number;
        cardHeadCount: number;
    }>;
    versions: Readonly<{
        registryDigest: string;
        kernelVersion: "receiz.composite.kernel.v1";
        verifierVersion: "receiz.sports-vault.verifier.v119";
    }>;
    authority: Readonly<{
        vaultHeadIsCardProofAuthority: false;
        publicProjectionIsProofAuthority: false;
        strongerTruth: "sealed-sports-card-proof-object";
        admissionStatus: "requires-verified-card-and-sealed-vault-admission";
    }>;
}>;
export declare function assertReceizSportsVaultCardHeadReferenceV119(value: unknown): asserts value is ReceizSportsVaultCardHeadReferenceV119;
export declare function assertReceizSportsVaultRecursiveHeadV119(value: unknown): asserts value is ReceizSportsVaultRecursiveHeadV119;
export declare function deriveReceizSportsVaultCheckpointHeadV119(input: Readonly<{
    ownerReceizIdentity: string;
    sport: ReceizSportsVaultSportV119;
    predecessorArtifactDigest: string;
    headKaiUpulse: string;
    operationCount: number;
    cardHeadCount: number;
    merkle: ReceizCompositeMerkleState;
    fibonacci: ReceizCompositeFibonacciState;
    registryDigest: string;
}>): ReceizSportsVaultRecursiveHeadV119;
export declare function deriveReceizSportsVaultSuccessorHeadV119(input: Readonly<{
    predecessorHead: ReceizSportsVaultRecursiveHeadV119;
    predecessorArtifactDigest: string;
    cards: readonly ReceizSportsVaultCardHeadReferenceV119[];
    resolveCheckpoint: (operationCount: number) => string | null;
}>): Promise<ReceizSportsVaultRecursiveHeadV119>;
export declare function verifyReceizSportsVaultSuccessorV119(input: Readonly<{
    predecessorHead: ReceizSportsVaultRecursiveHeadV119;
    predecessorArtifactDigest: string;
    candidateHead: unknown;
    resolveCheckpoint: (operationCount: number) => string | null;
}>): Promise<ReceizSportsVaultRecursiveHeadV119>;
//# sourceMappingURL=sportsVaultRecursiveTransport.d.ts.map