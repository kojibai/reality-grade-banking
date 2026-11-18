import { type BuiltReceizMaterialCompositeTransport, type ReceizMaterialCompositeManifest } from "./materialCompositeTransport.js";
export declare const RECEIZ_MATERIAL_MANIFEST_SOURCE_FRAGMENT_KEY: "material-manifest";
export declare const RECEIZ_MATERIAL_SEGMENT_SOURCE_FRAGMENT_KEY: "material-source";
export declare const RECEIZ_MATERIAL_SOURCE_TOKEN_PREFIX: "rms1";
export type ReceizMaterialSourceFamily = Readonly<{
    schema: "receiz.material.source-family.v1";
    headUrl: string;
    manifestUrl: string;
    segmentUrls: readonly string[];
    packageDigest: string;
    authority: Readonly<{
        familyIsProofAuthority: false;
        locatorIsProofAuthority: false;
        storageIsProofAuthority: false;
        strongerTruth: "sealed-receiz-proof-object";
    }>;
}>;
export type ReceizVerifiedMaterialSourceSegment = Readonly<{
    index: number;
    offset: number;
    byteLength: number;
    sha256: string;
    bytes: Uint8Array;
}>;
export type ReceizVerifiedMaterialSourceParts = Readonly<{
    manifest: ReceizMaterialCompositeManifest;
    orderedSegments: readonly ReceizVerifiedMaterialSourceSegment[];
}>;
export type ReceizRawMaterialCapsuleBlobProjection = Readonly<{
    capsuleBlob: Blob;
    exactArtifactBlob: Blob;
    filename: string;
    mimeType: string;
}>;
export type ReceizRawMaterialCapsuleProjection = Readonly<{
    exactArtifactBytes: Uint8Array;
    filename: string;
    mimeType: string;
}>;
export type ReceizMaterialSourceRangeReader = Readonly<{
    manifest: ReceizMaterialCompositeManifest;
    payloadByteLength: number;
    progressiveLedger: ReceizMaterialCompositeManifest["materialProgressiveLedger"] | null;
    readPayloadRange(input: Readonly<{
        offset: number;
        byteLength: number;
    }>): Promise<Uint8Array>;
    authority: Readonly<{
        readerIsProofAuthority: false;
        rangeProofRequired: true;
        strongerTruth: "sealed-receiz-proof-object";
    }>;
}>;
export declare function createReceizMaterialSourceFamily(input: Readonly<{
    proofUrl: string;
    transport: BuiltReceizMaterialCompositeTransport;
}>): ReceizMaterialSourceFamily;
export declare function createReceizClosedMaterialPresentationUrl(family: ReceizMaterialSourceFamily): string;
export declare function openReceizMaterialSourceParts(input: Readonly<{
    headUrl: string;
    sourceUrls: readonly string[];
}>): Promise<ReceizVerifiedMaterialSourceParts>;
export declare function openReceizMaterialSourceRangeReader(input: Readonly<{
    headUrl: string;
    sourceUrls: readonly string[];
    payloadByteLength: number;
}>): Promise<ReceizMaterialSourceRangeReader>;
export declare function createReceizRawMaterialCapsuleBlobFromSourceParts(parts: ReceizVerifiedMaterialSourceParts): ReceizRawMaterialCapsuleBlobProjection;
/** Projects an RMA3 raw capsule only after binding it to its verified manifest. */
export declare function decodeReceizRawMaterialCapsuleBytes(input: Readonly<{
    capsuleBytes: Uint8Array;
    manifest: ReceizMaterialCompositeManifest;
}>): ReceizRawMaterialCapsuleProjection;
export declare function resolveReceizMaterialCompositeFromSources(input: Readonly<{
    headUrl: string;
    sourceUrls: readonly string[];
}>): Promise<Readonly<{
    manifest: ReceizMaterialCompositeManifest;
    capsuleBytes: Uint8Array;
}>>;
//# sourceMappingURL=materialSourceFamily.d.ts.map