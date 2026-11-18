import { type ReceizCompositeFibonacciState, type ReceizCompositeMerkleState } from "./compositeProofKernel.js";
export declare const RECEIZ_PORTABLE_SEGMENT_BYTES: number;
export declare const RECEIZ_PORTABLE_SEGMENT_SCHEMA: "receiz.account.state.segment-proof.v1";
export declare const RECEIZ_PORTABLE_COMPOSITE_SCHEMA: "receiz.account.state.segment-composite.v1";
export declare const RECEIZ_PORTABLE_SEGMENTED_REF_SCHEMA: "receiz.account.state.segmented-ref.v1";
export type ReceizPortableStateSegmentProof = Readonly<{
    schema: typeof RECEIZ_PORTABLE_SEGMENT_SCHEMA;
    artifactId: string;
    parentStateDigest: string;
    index: number;
    segmentCount: number;
    kaiPulse: string;
    kaiUpulse: string;
    byteLength: number;
    payloadDigestSha256Hex: string;
    payloadB64u: string;
    signatureB64u: string;
}>;
export type ReceizPortableStateSegmentComposite = Readonly<{
    schema: typeof RECEIZ_PORTABLE_COMPOSITE_SCHEMA;
    stableArtifactId: string;
    snapshotDigestSha256Hex: string;
    byteLength: number;
    segmentByteBoundary: number;
    segmentCount: number;
    kaiPulse: string;
    kaiUpulse: string;
    merkle: ReceizCompositeMerkleState;
    fibonacci: ReceizCompositeFibonacciState;
    segments: readonly ReceizPortableStateSegmentProof[];
}>;
export type ReceizPortableStateSegmentedRef = Readonly<{
    schema: typeof RECEIZ_PORTABLE_SEGMENTED_REF_SCHEMA;
    composite: ReceizPortableStateSegmentComposite;
}>;
export declare function segmentReceizPortableStateSnapshot(args: Readonly<{
    snapshot: unknown;
    stableArtifactId: string;
    sign: (bytes: Uint8Array) => Promise<string>;
    segmentByteBoundary?: number;
}>): Promise<ReceizPortableStateSegmentComposite>;
export declare function segmentedReceizPortableStateRef(composite: ReceizPortableStateSegmentComposite): ReceizPortableStateSegmentedRef;
export declare function isSegmentedReceizPortableStateRef(value: unknown): value is ReceizPortableStateSegmentedRef;
export declare function isReceizPortableStateSegmentComposite(value: unknown): value is ReceizPortableStateSegmentComposite;
export declare function materializeReceizPortableStateRef(value: ReceizPortableStateSegmentedRef): unknown;
export declare function receizPortableSegmentSignatureBytes(segment: ReceizPortableStateSegmentProof): Uint8Array;
//# sourceMappingURL=portableStateSegments.d.ts.map