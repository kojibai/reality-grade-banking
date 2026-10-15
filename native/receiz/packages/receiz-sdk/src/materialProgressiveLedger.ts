import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";

import {
  appendReceizCompositeMerkleLeaf,
  createEmptyReceizCompositeMerkleState,
  digestReceizCompositeCanonical,
} from "./compositeProofKernel.js";

export const RECEIZ_MATERIAL_PROGRESSIVE_SCHEMA = "receiz.material.progressive-ranges.v1" as const;
export const RECEIZ_MATERIAL_PROGRESSIVE_MAX_RANGES = 4_096;

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

const HEX64_RE = /^[0-9a-f]{64}$/u;

function fail(code: string): never {
  throw new TypeError(code);
}

function exactKeys(value: unknown, keys: readonly string[]): value is Record<string, unknown> {
  return value !== null
    && typeof value === "object"
    && !Array.isArray(value)
    && Object.keys(value).length === keys.length
    && keys.every((key) => Object.prototype.hasOwnProperty.call(value, key));
}

function rangeLeafDigest(range: ReceizSignedMaterialRange): string {
  return digestReceizCompositeCanonical({
    schema: "receiz.material.progressive-range-leaf.v1",
    index: range.index,
    offset: range.offset,
    byteLength: range.byteLength,
    sha256: range.sha256,
  });
}

export function receizMaterialProgressiveSegmentRoot(
  ranges: readonly ReceizSignedMaterialRange[],
): string {
  let merkle = createEmptyReceizCompositeMerkleState();
  for (const range of ranges) {
    merkle = appendReceizCompositeMerkleLeaf(merkle, rangeLeafDigest(range));
  }
  return merkle.root;
}

export function coerceReceizMaterialProgressiveLedger(
  value: unknown,
): ReceizMaterialProgressiveLedger | null {
  if (!exactKeys(value, [
    "schema", "payloadSha256", "byteLength", "mimeType",
    "rangeByteBoundary", "segmentRoot", "ranges",
  ]) || value.schema !== RECEIZ_MATERIAL_PROGRESSIVE_SCHEMA) return null;
  const byteLength = Number(value.byteLength);
  const rangeByteBoundary = Number(value.rangeByteBoundary);
  const mimeType = typeof value.mimeType === "string" ? value.mimeType.trim().toLowerCase() : "";
  if (!HEX64_RE.test(String(value.payloadSha256))
    || !HEX64_RE.test(String(value.segmentRoot))
    || !Number.isSafeInteger(byteLength) || byteLength <= 0
    || !Number.isSafeInteger(rangeByteBoundary) || rangeByteBoundary <= 0
    || (!mimeType.startsWith("video/") && !mimeType.startsWith("audio/"))
    || !Array.isArray(value.ranges)
    || value.ranges.length === 0
    || value.ranges.length > RECEIZ_MATERIAL_PROGRESSIVE_MAX_RANGES) return null;
  const ranges: ReceizSignedMaterialRange[] = [];
  let expectedOffset = 0;
  for (let index = 0; index < value.ranges.length; index += 1) {
    const candidate = value.ranges[index];
    if (!exactKeys(candidate, ["index", "offset", "byteLength", "sha256"])
      || candidate.index !== index
      || candidate.offset !== expectedOffset
      || !Number.isSafeInteger(candidate.byteLength)
      || Number(candidate.byteLength) <= 0
      || Number(candidate.byteLength) > rangeByteBoundary
      || !HEX64_RE.test(String(candidate.sha256))) return null;
    const range = Object.freeze({
      index,
      offset: expectedOffset,
      byteLength: Number(candidate.byteLength),
      sha256: String(candidate.sha256),
    });
    ranges.push(range);
    expectedOffset += range.byteLength;
  }
  if (expectedOffset !== byteLength
    || ranges.slice(0, -1).some((range) => range.byteLength !== rangeByteBoundary)
    || receizMaterialProgressiveSegmentRoot(ranges) !== value.segmentRoot) return null;
  return Object.freeze({
    schema: RECEIZ_MATERIAL_PROGRESSIVE_SCHEMA,
    payloadSha256: String(value.payloadSha256),
    byteLength,
    mimeType,
    rangeByteBoundary,
    segmentRoot: String(value.segmentRoot),
    ranges: Object.freeze(ranges),
  });
}

export function coerceReceizMaterialProgressiveCommitment(
  value: unknown,
): ReceizMaterialProgressiveCommitment | null {
  if (!exactKeys(value, [
    "schema", "payloadSha256", "byteLength", "mimeType",
    "rangeByteBoundary", "rangeCount", "segmentRoot",
  ]) || value.schema !== RECEIZ_MATERIAL_PROGRESSIVE_SCHEMA) return null;
  const byteLength = Number(value.byteLength);
  const rangeByteBoundary = Number(value.rangeByteBoundary);
  const rangeCount = Number(value.rangeCount);
  const mimeType = typeof value.mimeType === "string" ? value.mimeType.trim().toLowerCase() : "";
  if (!HEX64_RE.test(String(value.payloadSha256))
    || !HEX64_RE.test(String(value.segmentRoot))
    || !Number.isSafeInteger(byteLength) || byteLength <= 0
    || !Number.isSafeInteger(rangeByteBoundary) || rangeByteBoundary <= 0
    || !Number.isSafeInteger(rangeCount) || rangeCount <= 0
    || rangeCount > RECEIZ_MATERIAL_PROGRESSIVE_MAX_RANGES
    || Math.ceil(byteLength / rangeByteBoundary) !== rangeCount
    || (!mimeType.startsWith("video/") && !mimeType.startsWith("audio/"))) return null;
  return Object.freeze({
    schema: RECEIZ_MATERIAL_PROGRESSIVE_SCHEMA,
    payloadSha256: String(value.payloadSha256),
    byteLength,
    mimeType,
    rangeByteBoundary,
    rangeCount,
    segmentRoot: String(value.segmentRoot),
  });
}

export function createReceizMaterialProgressiveCommitment(
  ledgerInput: ReceizMaterialProgressiveLedger,
): ReceizMaterialProgressiveCommitment {
  const ledger = coerceReceizMaterialProgressiveLedger(ledgerInput);
  if (!ledger) fail("RECEIZ_MATERIAL_PROGRESSIVE_LEDGER_INVALID");
  return Object.freeze({
    schema: RECEIZ_MATERIAL_PROGRESSIVE_SCHEMA,
    payloadSha256: ledger.payloadSha256,
    byteLength: ledger.byteLength,
    mimeType: ledger.mimeType,
    rangeByteBoundary: ledger.rangeByteBoundary,
    rangeCount: ledger.ranges.length,
    segmentRoot: ledger.segmentRoot,
  });
}

export function buildReceizMaterialProgressiveLedger(input: Readonly<{
  payloadBytes: Uint8Array;
  payloadMimeType: string;
  rangeByteBoundary: number;
}>): ReceizMaterialProgressiveLedger {
  const mimeType = input.payloadMimeType.trim().toLowerCase();
  if (!(input.payloadBytes instanceof Uint8Array) || input.payloadBytes.byteLength <= 0
    || !Number.isSafeInteger(input.rangeByteBoundary) || input.rangeByteBoundary <= 0
    || (!mimeType.startsWith("video/") && !mimeType.startsWith("audio/"))
    || Math.ceil(input.payloadBytes.byteLength / input.rangeByteBoundary)
      > RECEIZ_MATERIAL_PROGRESSIVE_MAX_RANGES) {
    fail("RECEIZ_MATERIAL_PROGRESSIVE_LEDGER_INPUT_INVALID");
  }
  const ranges: ReceizSignedMaterialRange[] = [];
  for (let offset = 0, index = 0; offset < input.payloadBytes.byteLength;
    offset += input.rangeByteBoundary, index += 1) {
    const bytes = input.payloadBytes.subarray(
      offset,
      Math.min(input.payloadBytes.byteLength, offset + input.rangeByteBoundary),
    );
    ranges.push(Object.freeze({
      index,
      offset,
      byteLength: bytes.byteLength,
      sha256: bytesToHex(sha256(bytes)),
    }));
  }
  return Object.freeze({
    schema: RECEIZ_MATERIAL_PROGRESSIVE_SCHEMA,
    payloadSha256: bytesToHex(sha256(input.payloadBytes)),
    byteLength: input.payloadBytes.byteLength,
    mimeType,
    rangeByteBoundary: input.rangeByteBoundary,
    segmentRoot: receizMaterialProgressiveSegmentRoot(ranges),
    ranges: Object.freeze(ranges),
  });
}
