import type { ReceizArtifactDigest } from "./verifier/types.js";
export declare const RECEIZ_ARTIFACT_INPUT_MAX_BYTES: number;
export declare const RECEIZ_ARTIFACT_SPOOL_CHUNK_BYTES: number;
export type ReceizArtifactInput = Blob | File | Uint8Array | ArrayBuffer | ReadableStream<Uint8Array>;
export type ReceizArtifactSnapshot = Readonly<{
    bytes: Uint8Array;
    filename: string;
    mimeType: string;
    artifactDigest: ReceizArtifactDigest;
}>;
export type ReceizArtifactInputErrorCode = "ARTIFACT_INPUT_INVALID" | "ARTIFACT_INPUT_SHARED_BUFFER" | "ARTIFACT_INPUT_TOO_LARGE" | "ARTIFACT_INPUT_STREAM_CHUNK_INVALID";
export declare class ReceizArtifactInputError extends TypeError {
    readonly code: ReceizArtifactInputErrorCode;
    constructor(code: ReceizArtifactInputErrorCode);
}
export type ReceizArtifactInputSpoolSink = Readonly<{
    write(chunk: Uint8Array): void | Promise<void>;
    close?(): void | Promise<void>;
    abort?(reason: unknown): void | Promise<void>;
}>;
export type ReceizArtifactInputSpoolResult = Readonly<{
    byteLength: number;
    filename: string;
    mimeType: string;
}>;
/**
 * Incrementally copies exact artifact bytes into caller-owned durable or
 * temporary custody. The sink never receives the complete artifact as one
 * value and may spool to disk, OPFS, or immutable staging without retaining
 * prior chunks in SDK memory.
 */
export declare function spoolReceizArtifactInput(input: ReceizArtifactInput, sink: ReceizArtifactInputSpoolSink, options?: Readonly<{
    maxBytes?: number;
    sinkChunkBytes?: number;
}>): Promise<ReceizArtifactInputSpoolResult>;
export declare function snapshotReceizArtifactInput(input: ReceizArtifactInput): Promise<ReceizArtifactSnapshot>;
//# sourceMappingURL=artifactInput.d.ts.map