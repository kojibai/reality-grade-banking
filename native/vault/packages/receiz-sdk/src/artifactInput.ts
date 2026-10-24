import type { ReceizArtifactDigest } from "./verifier/types.js";
import {
  RECEIZ_V113_PROTOCOL_LIMITS,
  ReceizProtocolLimitError,
  assertReceizProtocolMaximum,
} from "./verificationLimits.js";

export const RECEIZ_ARTIFACT_INPUT_MAX_BYTES = RECEIZ_V113_PROTOCOL_LIMITS.exactArtifactBytes;
export const RECEIZ_ARTIFACT_SPOOL_CHUNK_BYTES = 1024 * 1024;

export type ReceizArtifactInput =
  | Blob
  | File
  | Uint8Array
  | ArrayBuffer
  | ReadableStream<Uint8Array>;

export type ReceizArtifactSnapshot = Readonly<{
  bytes: Uint8Array;
  filename: string;
  mimeType: string;
  artifactDigest: ReceizArtifactDigest;
}>;

export type ReceizArtifactInputErrorCode =
  | "ARTIFACT_INPUT_INVALID"
  | "ARTIFACT_INPUT_SHARED_BUFFER"
  | "ARTIFACT_INPUT_TOO_LARGE"
  | "ARTIFACT_INPUT_STREAM_CHUNK_INVALID";

export class ReceizArtifactInputError extends TypeError {
  constructor(readonly code: ReceizArtifactInputErrorCode) {
    super(code);
    this.name = "ReceizArtifactInputError";
  }
}

function fail(code: ReceizArtifactInputErrorCode): never {
  throw new ReceizArtifactInputError(code);
}

function isSharedBuffer(value: ArrayBufferLike): boolean {
  return typeof SharedArrayBuffer !== "undefined" && value instanceof SharedArrayBuffer;
}

function boundedLength(length: number): void {
  if (!Number.isSafeInteger(length) || length < 0) fail("ARTIFACT_INPUT_INVALID");
  if (length > RECEIZ_ARTIFACT_INPUT_MAX_BYTES) fail("ARTIFACT_INPUT_TOO_LARGE");
}

function snapshotBytes(bytes: Uint8Array): Uint8Array {
  if (isSharedBuffer(bytes.buffer)) fail("ARTIFACT_INPUT_SHARED_BUFFER");
  boundedLength(bytes.byteLength);
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy;
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

async function writeSpoolBytes(
  bytes: Uint8Array,
  sink: ReceizArtifactInputSpoolSink,
  sinkChunkBytes: number,
): Promise<void> {
  for (let offset = 0; offset < bytes.byteLength; offset += sinkChunkBytes) {
    await sink.write(bytes.slice(offset, Math.min(offset + sinkChunkBytes, bytes.byteLength)));
  }
}

/**
 * Incrementally copies exact artifact bytes into caller-owned durable or
 * temporary custody. The sink never receives the complete artifact as one
 * value and may spool to disk, OPFS, or immutable staging without retaining
 * prior chunks in SDK memory.
 */
export async function spoolReceizArtifactInput(
  input: ReceizArtifactInput,
  sink: ReceizArtifactInputSpoolSink,
  options: Readonly<{ maxBytes?: number; sinkChunkBytes?: number }> = {},
): Promise<ReceizArtifactInputSpoolResult> {
  const maxBytes = options.maxBytes ?? RECEIZ_ARTIFACT_INPUT_MAX_BYTES;
  const sinkChunkBytes = options.sinkChunkBytes ?? RECEIZ_ARTIFACT_SPOOL_CHUNK_BYTES;
  assertReceizProtocolMaximum("exactArtifactBytes", maxBytes);
  if (!Number.isSafeInteger(sinkChunkBytes) || sinkChunkBytes < 1 || sinkChunkBytes > RECEIZ_ARTIFACT_SPOOL_CHUNK_BYTES) {
    throw new ReceizProtocolLimitError(
      "VERIFICATION_RESOURCE_UNAVAILABLE",
      "verification-runtime",
      sinkChunkBytes,
      RECEIZ_ARTIFACT_SPOOL_CHUNK_BYTES,
    );
  }

  let filename = "artifact";
  let mimeType = "application/octet-stream";
  let total = 0;
  let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  try {
    let stream: ReadableStream<Uint8Array>;
    if (input instanceof Uint8Array) {
      if (isSharedBuffer(input.buffer)) fail("ARTIFACT_INPUT_SHARED_BUFFER");
      stream = new ReadableStream({ start(controller) { controller.enqueue(input); controller.close(); } });
    } else if (input instanceof ArrayBuffer) {
      stream = new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(input)); controller.close(); } });
    } else if (typeof SharedArrayBuffer !== "undefined" && input instanceof SharedArrayBuffer) {
      fail("ARTIFACT_INPUT_SHARED_BUFFER");
    } else if (input instanceof Blob) {
      if (input.size > maxBytes) {
        throw new ReceizProtocolLimitError(
          maxBytes < RECEIZ_ARTIFACT_INPUT_MAX_BYTES ? "VERIFICATION_RESOURCE_UNAVAILABLE" : "ARTIFACT_TOO_LARGE",
          maxBytes < RECEIZ_ARTIFACT_INPUT_MAX_BYTES ? "verification-runtime" : "exactArtifactBytes",
          input.size,
          maxBytes,
        );
      }
      if (typeof File !== "undefined" && input instanceof File && input.name.trim()) filename = input.name.trim();
      if (input.type.trim()) mimeType = input.type.trim().toLowerCase();
      stream = input.stream();
    } else if (input instanceof ReadableStream) {
      stream = input;
    } else {
      fail("ARTIFACT_INPUT_INVALID");
    }

    reader = stream.getReader();
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      if (!(next.value instanceof Uint8Array)) fail("ARTIFACT_INPUT_STREAM_CHUNK_INVALID");
      if (isSharedBuffer(next.value.buffer)) fail("ARTIFACT_INPUT_SHARED_BUFFER");
      const nextTotal = total + next.value.byteLength;
      if (!Number.isSafeInteger(nextTotal) || nextTotal > maxBytes) {
        throw new ReceizProtocolLimitError(
          maxBytes < RECEIZ_ARTIFACT_INPUT_MAX_BYTES ? "VERIFICATION_RESOURCE_UNAVAILABLE" : "ARTIFACT_TOO_LARGE",
          maxBytes < RECEIZ_ARTIFACT_INPUT_MAX_BYTES ? "verification-runtime" : "exactArtifactBytes",
          nextTotal,
          maxBytes,
        );
      }
      const detachedChunk = next.value.slice();
      await writeSpoolBytes(detachedChunk, sink, sinkChunkBytes);
      total = nextTotal;
    }
    await sink.close?.();
    return Object.freeze({ byteLength: total, filename, mimeType });
  } catch (error) {
    if (reader) {
      try { await reader.cancel(error); } catch { /* Cancellation cannot replace the exact denial. */ }
    }
    try { await sink.abort?.(error); } catch { /* Sink cleanup cannot replace the exact denial. */ }
    throw error;
  } finally {
    reader?.releaseLock();
  }
}

async function readStream(stream: ReadableStream<Uint8Array>): Promise<Uint8Array> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      if (!(next.value instanceof Uint8Array)) fail("ARTIFACT_INPUT_STREAM_CHUNK_INVALID");
      const chunk = snapshotBytes(next.value);
      total += chunk.byteLength;
      boundedLength(total);
      chunks.push(chunk);
    }
  } catch (error) {
    try {
      await reader.cancel(error);
    } catch {
      // Cancellation failure cannot replace the exact input error.
    }
    throw error;
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

async function sha256(bytes: Uint8Array): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes.slice().buffer);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function snapshotReceizArtifactInput(
  input: ReceizArtifactInput,
): Promise<ReceizArtifactSnapshot> {
  let filename = "artifact";
  let mimeType = "application/octet-stream";
  let bytes: Uint8Array;

  if (input instanceof Uint8Array) {
    bytes = snapshotBytes(input);
  } else if (input instanceof ArrayBuffer) {
    boundedLength(input.byteLength);
    bytes = new Uint8Array(input.slice(0));
  } else if (typeof SharedArrayBuffer !== "undefined" && input instanceof SharedArrayBuffer) {
    fail("ARTIFACT_INPUT_SHARED_BUFFER");
  } else if (input instanceof Blob) {
    boundedLength(input.size);
    bytes = snapshotBytes(new Uint8Array(await input.arrayBuffer()));
    if (bytes.byteLength !== input.size) fail("ARTIFACT_INPUT_INVALID");
    if (typeof File !== "undefined" && input instanceof File && input.name.trim()) filename = input.name.trim();
    if (input.type.trim()) mimeType = input.type.trim().toLowerCase();
  } else if (input instanceof ReadableStream) {
    bytes = await readStream(input);
  } else {
    fail("ARTIFACT_INPUT_INVALID");
  }

  const artifactDigest: ReceizArtifactDigest = Object.freeze({
    algorithm: "sha-256",
    binds: "exact-artifact-bytes",
    value: await sha256(bytes),
  });
  return Object.freeze({
    get bytes() {
      return bytes.slice();
    },
    filename,
    mimeType,
    artifactDigest,
  });
}
