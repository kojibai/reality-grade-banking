import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";

import type { ReceizProofBundle } from "@/app/utils/receizProofBundle";
import {
  coerceReceizMaterialProgressiveCommitment,
  coerceReceizMaterialProgressiveLedger,
  createReceizMaterialProgressiveCommitment as createSdkProgressiveCommitment,
  RECEIZ_MATERIAL_PROGRESSIVE_MAX_RANGES,
  RECEIZ_MATERIAL_PROGRESSIVE_SCHEMA,
  receizMaterialProgressiveSegmentRoot,
  type ReceizMaterialProgressiveCommitment,
  type ReceizMaterialProgressiveLedger,
  type ReceizSignedMaterialRange,
} from "../../../packages/receiz-sdk/src/materialProgressiveLedger.js";

export type {
  ReceizMaterialProgressiveCommitment,
  ReceizMaterialProgressiveLedger,
  ReceizSignedMaterialRange,
};
export type ReceizMaterialProgressiveProof = ReceizMaterialProgressiveLedger;

export type ReceizMaterialProgressiveCapability =
  | Readonly<{
      mode: "signed-ranges";
      payloadSha256: string;
      byteLength: number;
      mimeType: string;
      rangeByteBoundary: number;
      rangeCount: number;
      segmentRoot: string;
    }>
  | Readonly<{
      mode: "whole-artifact-required";
      reason: "whole-payload-sha-only" | "container-unsupported" | "legacy-artifact";
    }>;

const inspectedProgressiveCapabilities = new WeakSet<object>();
const HEX64_RE = /^[0-9a-f]{64}$/u;
const DEFAULT_RANGE_BYTE_BOUNDARY = 1024 * 1024;

export function createReceizMaterialProgressiveCommitment(
  ledger: ReceizMaterialProgressiveLedger,
): ReceizMaterialProgressiveCommitment {
  return createSdkProgressiveCommitment(ledger);
}

export async function buildReceizMaterialProgressiveProof(input: Readonly<{
  payload: Blob;
  payloadSha256?: string;
  payloadMimeType: string;
  rangeByteBoundary?: number;
  onProgress?: (loadedBytes: number, totalBytes: number) => void;
}>): Promise<ReceizMaterialProgressiveLedger> {
  const mimeType = input.payloadMimeType.trim().toLowerCase();
  const rangeByteBoundary = input.rangeByteBoundary ?? DEFAULT_RANGE_BYTE_BOUNDARY;
  if (!(input.payload instanceof Blob)
    || input.payload.size <= 0
    || (typeof input.payloadSha256 !== "undefined" && !HEX64_RE.test(input.payloadSha256))
    || (!mimeType.startsWith("video/") && !mimeType.startsWith("audio/"))
    || !Number.isSafeInteger(rangeByteBoundary)
    || rangeByteBoundary <= 0
    || Math.ceil(input.payload.size / rangeByteBoundary) > RECEIZ_MATERIAL_PROGRESSIVE_MAX_RANGES) {
    throw new TypeError("RECEIZ_MATERIAL_PROGRESSIVE_PROOF_INPUT_INVALID");
  }

  const payloadDigest = sha256.create();
  const ranges: ReceizSignedMaterialRange[] = [];
  for (let offset = 0, index = 0; offset < input.payload.size;
    offset += rangeByteBoundary, index += 1) {
    const bytes = new Uint8Array(await input.payload.slice(
      offset,
      Math.min(input.payload.size, offset + rangeByteBoundary),
    ).arrayBuffer());
    payloadDigest.update(bytes);
    ranges.push(Object.freeze({
      index,
      offset,
      byteLength: bytes.byteLength,
      sha256: bytesToHex(sha256(bytes)),
    }));
    input.onProgress?.(offset + bytes.byteLength, input.payload.size);
  }
  const payloadSha256 = bytesToHex(payloadDigest.digest());
  if (input.payloadSha256 && payloadSha256 !== input.payloadSha256) {
    throw new TypeError("RECEIZ_MATERIAL_PROGRESSIVE_PAYLOAD_BINDING_REJECTED");
  }
  const ledger = coerceReceizMaterialProgressiveLedger({
    schema: RECEIZ_MATERIAL_PROGRESSIVE_SCHEMA,
    payloadSha256,
    byteLength: input.payload.size,
    mimeType,
    rangeByteBoundary,
    segmentRoot: receizMaterialProgressiveSegmentRoot(ranges),
    ranges,
  });
  if (!ledger) throw new TypeError("RECEIZ_MATERIAL_PROGRESSIVE_PROOF_INVALID");
  return ledger;
}

function inspected<T extends ReceizMaterialProgressiveCapability>(value: T): T {
  inspectedProgressiveCapabilities.add(value);
  return value;
}

export function isInspectedReceizMaterialProgressiveCapability(
  value: unknown,
): value is ReceizMaterialProgressiveCapability {
  return value !== null
    && typeof value === "object"
    && inspectedProgressiveCapabilities.has(value);
}

/**
 * A complete payload SHA, an RMA manifest, or an unknown property cannot turn
 * transport segments into independently admissible proof ranges. Only the
 * exact compact commitment inside the Signature-V4-bound native capture can
 * authorize early range projection beneath the enclosing artifact. The full
 * carried ledger must independently recompute to this signed root.
 */
export function inspectReceizMaterialProgressiveCapability(input: Readonly<{
  proofBundle: ReceizProofBundle;
  payloadMimeType: string;
}>): ReceizMaterialProgressiveCapability {
  if (input.proofBundle.kind !== "receiz.proof_bundle"
    || input.proofBundle.payloadVersion !== "v2") {
    return inspected(Object.freeze({
      mode: "whole-artifact-required" as const,
      reason: "legacy-artifact" as const,
    }));
  }
  const mimeType = input.payloadMimeType.trim().toLowerCase();
  if (!mimeType.startsWith("video/") && !mimeType.startsWith("audio/")) {
    return inspected(Object.freeze({
      mode: "whole-artifact-required" as const,
      reason: "container-unsupported" as const,
    }));
  }
  const nativeCapture = input.proofBundle.nativeCapture;
  const progressive = nativeCapture && typeof nativeCapture === "object"
    ? coerceReceizMaterialProgressiveCommitment(
        (nativeCapture as Record<string, unknown>).materialProgressive,
      )
    : null;
  if (progressive
    && progressive.payloadSha256 === input.proofBundle.artifactSha256Basis
    && progressive.mimeType === mimeType) {
    return inspected(Object.freeze({
      mode: "signed-ranges" as const,
      payloadSha256: progressive.payloadSha256,
      byteLength: progressive.byteLength,
      mimeType: progressive.mimeType,
      rangeByteBoundary: progressive.rangeByteBoundary,
      rangeCount: progressive.rangeCount,
      segmentRoot: progressive.segmentRoot,
    }));
  }
  return inspected(Object.freeze({
    mode: "whole-artifact-required" as const,
    reason: "whole-payload-sha-only" as const,
  }));
}
