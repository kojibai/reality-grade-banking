import type { ReceizDomainReplayAdditionV124 } from "./v124Replay.js";
import type { ReceizPortableSealedArtifactV124 } from "./v124PortableAuthority.js";
import { type ReceizDomainReplaySegmentSourceExpectationV124, type ReceizReadDomainReplaySegmentSourceV124 } from "./v124ReplayProofObject.js";
export type ReceizSourceCarriedReplayFamilyV124 = Readonly<{
    schema: "receiz.source-carried-replay-family.v124";
    proofObjectId: string;
    applicationId: string;
    domainId: string;
    registryDigest: string;
    reducerDigest: string;
    familySetDigest: string;
    sources: readonly ReceizReadDomainReplaySegmentSourceV124[];
    headArtifactSha256s: readonly string[];
    authority: Readonly<{
        familyIsProofAuthority: false;
        setDigestIsProofAuthority: false;
        projectionIsProofAuthority: false;
        strongerTruth: "sealed-receiz-proof-object";
    }>;
}>;
export type ReceizSourceCarriedReplayFamilyDifferenceV124 = Readonly<{
    missingFromLocal: readonly ReceizPortableSealedArtifactV124[];
    missingFromRemote: readonly ReceizPortableSealedArtifactV124[];
}>;
export type ReceizSourceCarriedReplayBranchV124 = Readonly<{
    headArtifactSha256: string;
    sourceArtifactSha256s: readonly string[];
    additions: readonly ReceizDomainReplayAdditionV124[];
}>;
export declare function openReceizSourceCarriedReplayFamilyV124(input: Readonly<{
    artifacts: readonly ReceizPortableSealedArtifactV124[];
    expected: ReceizDomainReplaySegmentSourceExpectationV124;
}>): Promise<ReceizSourceCarriedReplayFamilyV124>;
export declare function diffReceizSourceCarriedReplayFamiliesV124(input: Readonly<{
    local: ReceizSourceCarriedReplayFamilyV124;
    remote: ReceizSourceCarriedReplayFamilyV124;
}>): ReceizSourceCarriedReplayFamilyDifferenceV124;
export declare function mergeReceizSourceCarriedReplayFamiliesV124(input: Readonly<{
    families: readonly ReceizSourceCarriedReplayFamilyV124[];
    expected: ReceizDomainReplaySegmentSourceExpectationV124;
}>): Promise<ReceizSourceCarriedReplayFamilyV124>;
export declare function projectReceizSourceCarriedReplayBranchesV124(value: ReceizSourceCarriedReplayFamilyV124): readonly ReceizSourceCarriedReplayBranchV124[];
//# sourceMappingURL=sourceCarriedReplay.d.ts.map