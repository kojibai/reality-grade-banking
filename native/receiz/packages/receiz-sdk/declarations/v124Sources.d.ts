import { type ReceizAuthenticatedRuntimeRequestV124 } from "./v124AuthenticatedRuntime.js";
import type { ReceizPortableSealedArtifactV124 } from "./v124PortableAuthority.js";
export type ReceizSealedSourcePublicationKindV124 = "subject" | "replay-segment" | "checkpoint";
export type ReceizPublishSealedSourceInputV124 = Readonly<{
    applicationId: string;
    authoritySessionHandle: string | null;
    sourceArtifact: ReceizPortableSealedArtifactV124;
}>;
export type ReceizSealedSourcePublicationResultV124 = Readonly<{
    schema: "receiz.sealed-source-publication-result.v124";
    status: "published" | "idempotent";
    sourceKind: ReceizSealedSourcePublicationKindV124;
    artifactSha256: string;
    sourceBindingDigest: string;
    authority: Readonly<{
        publicationIsProofAuthority: false;
        strongerTruth: "sealed-receiz-proof-object";
    }>;
}>;
export type ReceizV124SourcesRemoteV124 = (request: ReceizAuthenticatedRuntimeRequestV124) => Promise<Readonly<{
    wire: unknown;
    receipt: unknown;
}>>;
/**
 * Projects only an already runtime-admitted source-publication response. Raw
 * caller JSON, including self-digested JSON, has no admission and is rejected.
 */
export declare function validateReceizSealedSourcePublicationResultV124(value: unknown, expectedValue: Readonly<{
    applicationId: string;
    artifactSha256: string;
}>): Promise<ReceizSealedSourcePublicationResultV124>;
/**
 * Source-publication coordination. The result is explicitly non-authoritative;
 * exact sealed artifact bytes remain the stronger proof object.
 */
export declare function createReceizV124Sources(remote: ReceizV124SourcesRemoteV124): {
    publishSealedSourceV124: (value: ReceizPublishSealedSourceInputV124) => Promise<ReceizSealedSourcePublicationResultV124>;
    publishSealedSource: (value: ReceizPublishSealedSourceInputV124) => Promise<ReceizSealedSourcePublicationResultV124>;
};
//# sourceMappingURL=v124Sources.d.ts.map