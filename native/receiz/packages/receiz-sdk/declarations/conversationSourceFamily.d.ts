import { type ReceizConversationAuthorSourceSelectionV125 } from "./conversationActorSource.js";
import { type ReceizSubjectSourceFamilyV125 } from "./v125SubjectSourceFamily.js";
import { type ReceizConversationProjectionV2, type ReceizConversationProjectionV1 } from "./conversationDomain.js";
import { type ReceizSourceCarriedReplayFamilyV124 } from "./sourceCarriedReplay.js";
import type { ReceizPortableSealedArtifactV124 } from "./v124PortableAuthority.js";
import type { ReceizDomainReplaySegmentSourceExpectationV124 } from "./v124ReplayProofObject.js";
export type ReceizConversationSourceFamilyV1 = Readonly<{
    replayFamily: ReceizSourceCarriedReplayFamilyV124;
    branches: readonly Readonly<{
        headArtifactSha256: string;
        sourceArtifactSha256s: readonly string[];
        projection: ReceizConversationProjectionV1 | ReceizConversationProjectionV2;
    }>[];
    authority: Readonly<{
        familyIsProofAuthority: false;
        projectionIsProofAuthority: false;
        strongerTruth: "sealed-receiz-proof-object";
    }>;
}>;
export declare function openReceizConversationSourceFamilyV1(input: Readonly<{
    artifacts: readonly ReceizPortableSealedArtifactV124[];
    expected: ReceizDomainReplaySegmentSourceExpectationV124;
    expectedConversationId: string;
    actorSources?: Readonly<{
        subjectFamily: ReceizSubjectSourceFamilyV125;
        authors: readonly Readonly<{
            sourceArtifactSha256: string;
            selection: ReceizConversationAuthorSourceSelectionV125;
        }>[];
    }>;
}>): Promise<ReceizConversationSourceFamilyV1>;
//# sourceMappingURL=conversationSourceFamily.d.ts.map