export declare const RECEIZ_MATERIAL_PROGRESSIVE_SCHEMA: "receiz.material.progressive-ranges.v1";
export declare const RECEIZ_MATERIAL_PROGRESSIVE_MAX_RANGES = 4096;
export type ReceizSignedMaterialRange = Readonly<{
    index: number;
    offset: number;
    byteLength: number;
    sha256: string;
}>;
export type ReceizMaterialProgressiveLedger = Readonly<{
    schema: typeof RECEIZ_MATERIAL_PROGRESSIVE_SCHEMA;
    payloadSha256: string;
    byteLength: number;
    mimeType: string;
    rangeByteBoundary: number;
    segmentRoot: string;
    ranges: readonly ReceizSignedMaterialRange[];
}>;
export type ReceizMaterialProgressiveCommitment = Readonly<{
    schema: typeof RECEIZ_MATERIAL_PROGRESSIVE_SCHEMA;
    payloadSha256: string;
    byteLength: number;
    mimeType: string;
    rangeByteBoundary: number;
    rangeCount: number;
    segmentRoot: string;
}>;
export declare function receizMaterialProgressiveSegmentRoot(ranges: readonly ReceizSignedMaterialRange[]): string;
export declare function coerceReceizMaterialProgressiveLedger(value: unknown): ReceizMaterialProgressiveLedger | null;
export declare function coerceReceizMaterialProgressiveCommitment(value: unknown): ReceizMaterialProgressiveCommitment | null;
export declare function createReceizMaterialProgressiveCommitment(ledgerInput: ReceizMaterialProgressiveLedger): ReceizMaterialProgressiveCommitment;
export declare function buildReceizMaterialProgressiveLedger(input: Readonly<{
    payloadBytes: Uint8Array;
    payloadMimeType: string;
    rangeByteBoundary: number;
}>): ReceizMaterialProgressiveLedger;
//# sourceMappingURL=materialProgressiveLedger.d.ts.map