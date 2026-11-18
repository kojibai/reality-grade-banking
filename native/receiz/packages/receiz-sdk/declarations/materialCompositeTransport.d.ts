import { type ReceizMaterialProgressiveLedger } from "./materialProgressiveLedger.js";
export declare const RECEIZ_MATERIAL_COMPOSITE_SCHEMA: "receiz.material.url-composite.v1";
export declare const RECEIZ_MATERIAL_COMPOSITE_TOKEN_PREFIX: "rmc1:";
export declare const RECEIZ_MATERIAL_COMPOSITE_STREAMING_TOKEN_PREFIX: "rmc2:";
export declare const RECEIZ_MATERIAL_COMPOSITE_SEGMENT_BYTES: number;
export declare const RECEIZ_MATERIAL_COMPOSITE_MAX_BYTES: number;
export declare const RECEIZ_MATERIAL_COMPOSITE_HEAD_MAX_URL_CHARS = 4096;
export declare const RECEIZ_MATERIAL_COMPOSITE_AUTHORITY: Readonly<{
    transportIsProofAuthority: false;
    manifestIsProofAuthority: false;
    segmentIsProofAuthority: false;
    storageIsProofAuthority: false;
    strongerTruth: "sealed-receiz-proof-object";
}>;
export type ReceizMaterialCompositeSegment = Readonly<{
    index: number;
    offset: number;
    byteLength: number;
    sha256: string;
    leafDigest: string;
}>;
export type ReceizMaterialCompositeManifest = Readonly<{
    schema: typeof RECEIZ_MATERIAL_COMPOSITE_SCHEMA;
    capsuleEncoding?: "rma3/raw";
    packageDigest: string;
    capsuleSha256: string;
    capsuleByteLength: number;
    sealedArtifactSha256: string;
    sealedArtifactByteLength: number;
    sealedFilename: string;
    sealedMimeType: string;
    verifyPath: string;
    issuedAtKaiPulse: string;
    issuedAtKaiUPulse: string;
    predecessorPackageDigest: string | null;
    segmentByteBoundary: number;
    segmentCount: number;
    merkle: Readonly<{
        algorithm: "sha256/ordered-pair/v1";
        root: string;
    }>;
    fibonacci: Readonly<{
        basis: "sparse-checkpoint/v1";
        operationCount: number;
        checkpoints: readonly Readonly<{
            distance: number;
            operationCount: number;
            artifactDigest: string;
        }>[];
    }>;
    segments: readonly ReceizMaterialCompositeSegment[];
    materialProgressiveLedger?: ReceizMaterialProgressiveLedger;
    authority: typeof RECEIZ_MATERIAL_COMPOSITE_AUTHORITY;
}>;
export type BuiltReceizMaterialCompositeTransport = Readonly<{
    manifest: ReceizMaterialCompositeManifest;
    manifestBytes: Uint8Array;
    segments: readonly Uint8Array[];
    token: string;
}>;
export declare function buildReceizMaterialCompositeTransport(input: Readonly<{
    capsuleBytes: Uint8Array;
    sealedArtifactSha256: string;
    sealedArtifactByteLength: number;
    sealedFilename: string;
    sealedMimeType: string;
    verifyPath: string;
    issuedAtKaiPulse: string | number;
    issuedAtKaiUPulse: string | number;
    predecessorPackageDigest?: string | null;
    segmentByteBoundary?: number;
    materialProgressiveLedger?: ReceizMaterialProgressiveLedger;
}>): Promise<BuiltReceizMaterialCompositeTransport>;
export declare function verifyReceizMaterialCompositeManifest(value: unknown): Promise<ReceizMaterialCompositeManifest>;
export declare function reconstructReceizMaterialCompositeCapsule(input: Readonly<{
    manifest: unknown;
    resolveSegment: (segment: ReceizMaterialCompositeSegment) => Promise<Uint8Array>;
}>): Promise<Uint8Array>;
export declare function readReceizMaterialCompositePackageDigest(token: string): string | null;
/**
 * Enforces the public-coordinate boundary without imposing a truth boundary.
 * Exact material bytes remain in the sealed artifact and its committed append
 * segments; this function only admits a bounded presentation head.
 */
export declare function assertReceizMaterialCompositeHeadUrl(value: string): string;
export declare function publishReceizMaterialCompositeTransport(input: Readonly<{
    transport: BuiltReceizMaterialCompositeTransport;
    receizOrigin?: string;
    fetcher?: typeof fetch;
}>): Promise<string>;
export declare function resolveReceizMaterialCompositeTransport(input: Readonly<{
    packageDigest: string;
    receizOrigin?: string;
    fetcher?: typeof fetch;
}>): Promise<Readonly<{
    manifest: ReceizMaterialCompositeManifest;
    capsuleBytes: Uint8Array;
}>>;
export declare function createReceizCompositeMaterialPresentationUrl(input: Readonly<{
    proofUrl: string;
    materialToken: string;
}>): string;
//# sourceMappingURL=materialCompositeTransport.d.ts.map