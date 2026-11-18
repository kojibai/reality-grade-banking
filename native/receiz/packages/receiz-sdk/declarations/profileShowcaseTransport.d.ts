import { type ReceizConstitutionJson } from "./constitution.js";
export declare const RECEIZ_PROFILE_SHOWCASE_V114_TRANSPORT_LIMITS: Readonly<{
    readonly directOperations: 1024;
    readonly parentDigests: 64;
    readonly segmentCommitments: 4096;
    readonly proofHistoryEvidenceRoots: 4096;
    readonly merkleFrontier: 64;
    readonly fibonacciCheckpoints: 128;
    readonly mergedChildren: 1024;
    readonly mergedParents: 64;
    readonly firstPaintWindowChildren: 256;
}>;
export declare function compareReceizProfileShowcaseTransitionOperationsV114(left: unknown, right: unknown): number;
/** The single v114 canonical operation form used by app folding and SDK verification. */
export declare function canonicalizeReceizProfileShowcaseTransitionOperationsV114(value: unknown): readonly ReceizConstitutionJson[];
/**
 * Validates the exact v114 operation projection carried by a sealed profile
 * history event. This is a transport mechanic; the enclosing sealed artifact
 * remains the proof authority.
 */
export declare function assertReceizProfileShowcaseTransitionOperationsV114(value: unknown): asserts value is readonly ReceizConstitutionJson[];
export declare function assertReceizProfileShowcaseV114TransportContract(value: unknown): asserts value is Readonly<Record<string, ReceizConstitutionJson>>;
export declare function assertReceizProfileShowcaseCarrierV114TransportContract(value: unknown): asserts value is Readonly<Record<string, ReceizConstitutionJson>>;
export declare function assertReceizProfileShowcaseGenesisV114TransportContract(value: unknown, input: Readonly<{
    artifactId: `profile-showcase:${string}`;
    ownerReceizIdentity: string;
    profileIdentity: string;
    actorEvidenceRoot: string;
    genesisKaiUpulse: string;
}>): asserts value is Readonly<Record<string, ReceizConstitutionJson>>;
export declare function assertReceizProfileShowcaseDescendantV114TransportContract(value: unknown, input: Readonly<{
    artifactId: `profile-showcase:${string}`;
    ownerReceizIdentity: string;
    profileIdentity: string;
    predecessorArtifactDigest: string;
    predecessorResultingOperationCount: number;
    predecessorHeadKaiUpulse: string;
    additionalParentHeadKaiUpulses?: readonly string[];
    actorEvidenceRoot: string;
}>): asserts value is Readonly<Record<string, ReceizConstitutionJson>>;
//# sourceMappingURL=profileShowcaseTransport.d.ts.map