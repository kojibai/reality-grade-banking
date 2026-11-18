import { type PortableJson, type ReceizPortableAssetType, type ReceizPortableAssetDocument, type ReceizProfileShowcaseArtifactId, type ReceizProfileShowcaseCarrier, type ReceizPortableAssetInput } from "./portableAssetReader.js";
export { ReceizPortableAssetError, parseReceizPortableAssetDocument, deriveReceizPortableOwnershipContinuity } from "./portableAssetReader.js";
export type { PortableJson, ReceizPortableAssetType, ReceizPortableAssetErrorCode, ReceizPortableAssetDocument, ReceizProfileShowcaseArtifactId, ReceizProfileShowcaseCarrier, ReceizPortableOwnershipContinuity, ReceizPortableAssetInput } from "./portableAssetReader.js";
import type { ReceizProofHistory, ReceizVerifiedProofHistory } from "./proofHistory.js";
export declare function extractReceizPortableAssetPayload(value: unknown): Promise<Readonly<{
    assetType: ReceizPortableAssetType;
    mimeType: string;
    bytes: Uint8Array;
    sha256: string;
}>>;
export declare function parseReceizProfileShowcaseCarrier(value: unknown): Promise<ReceizProfileShowcaseCarrier>;
export declare function createReceizProfileShowcaseCarrier(input: Readonly<{
    artifactId: ReceizProfileShowcaseArtifactId;
    ownerReceizIdentity: string;
    showcase: Readonly<Record<string, PortableJson>>;
    proofHistory: ReceizProofHistory;
}>): Promise<ReceizProfileShowcaseCarrier>;
export declare function serializeReceizProfileShowcaseCarrier(carrier: ReceizProfileShowcaseCarrier): Uint8Array;
export declare function attachReceizProfileShowcaseProofHistoryBytes(originalBytes: Uint8Array, proofHistory: ReceizProofHistory): Promise<Uint8Array>;
export declare function attachReceizPortableProofHistory(value: unknown, history: ReceizVerifiedProofHistory): Promise<ReceizPortableAssetDocument>;
export declare function attachReceizPortableProofHistoryBytes(originalBytes: Uint8Array, history: ReceizVerifiedProofHistory): Promise<Uint8Array>;
/** Package-internal transition mechanic: writes only the carried history projection. */
export declare function replaceReceizPortableProofHistoryBytes(originalBytes: Uint8Array, proofHistory: ReceizProofHistory): Promise<Uint8Array>;
export declare function createReceizPortableAssetDocument(input: ReceizPortableAssetInput): Promise<ReceizPortableAssetDocument>;
export declare function appendReceizPortableAssetOwnership(document: ReceizPortableAssetDocument, input: Readonly<{
    ownerReceizId: string;
    priorHeadReference: string;
    sourceArtifactSha256: string;
}>): Promise<ReceizPortableAssetDocument>;
export declare function serializeReceizPortableAssetDocument(document: ReceizPortableAssetDocument): Uint8Array;
export declare function extractReceizPortableAssetDocument(artifactBytes: Uint8Array): Promise<{
    document: ReceizPortableAssetDocument;
    originalBytes: Uint8Array;
    artifactBasisSha256: string;
    proofClaimId: string;
}>;
//# sourceMappingURL=portableAsset.d.ts.map