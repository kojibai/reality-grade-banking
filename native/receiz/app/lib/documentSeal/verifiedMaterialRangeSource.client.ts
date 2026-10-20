"use client";

import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";

import {
  isInspectedReceizMaterialProgressiveCapability,
  type ReceizMaterialProgressiveCapability,
  type ReceizSignedMaterialRange,
} from "@/app/lib/documentSeal/materialProgressiveCapability";
import type { ReceizMaterialSourceRangeReader } from "../../../packages/receiz-sdk/src/index.js";

export type VerifiedMaterialRangeSource = Readonly<{
  payloadByteLength: number;
  mimeType: string;
  rangeByteBoundary: number;
  readVerifiedRange(input: Readonly<{ offset: number; byteLength: number }>): Promise<Uint8Array>;
  authority: Readonly<{
    rangeSourceIsProofAuthority: false;
    strongerTruth: "sealed-receiz-proof-object";
  }>;
}>;

const RANGE_SOURCE_AUTHORITY = Object.freeze({
  rangeSourceIsProofAuthority: false as const,
  strongerTruth: "sealed-receiz-proof-object" as const,
});
const INITIAL_RUNWAY_SECONDS = 8;
const MAX_RUNWAY_SECONDS = 24;

function assertSafeRange(input: Readonly<{ offset: number; byteLength: number }>, total: number): void {
  if (!Number.isSafeInteger(input.offset) || input.offset < 0
    || !Number.isSafeInteger(input.byteLength) || input.byteLength <= 0
    || input.offset + input.byteLength > total) {
    throw new TypeError("RECEIZ_MATERIAL_VERIFIED_RANGE_INVALID");
  }
}

export function planReceizMaterialAdaptiveRunway(input: Readonly<{
  payloadByteLength: number;
  mediaBytesPerSecond: number;
  verifiedBytesPerSecond: number;
}>): Readonly<{ targetSeconds: number; targetBytes: number }> {
  if (!Number.isSafeInteger(input.payloadByteLength) || input.payloadByteLength <= 0
    || !Number.isFinite(input.mediaBytesPerSecond) || input.mediaBytesPerSecond <= 0
    || !Number.isFinite(input.verifiedBytesPerSecond) || input.verifiedBytesPerSecond <= 0) {
    throw new TypeError("RECEIZ_MATERIAL_RUNWAY_INPUT_INVALID");
  }
  const throughputRatio = Math.max(1, input.mediaBytesPerSecond / input.verifiedBytesPerSecond);
  const targetSeconds = Math.min(
    MAX_RUNWAY_SECONDS,
    Math.max(INITIAL_RUNWAY_SECONDS, Math.ceil(INITIAL_RUNWAY_SECONDS * throughputRatio)),
  );
  return Object.freeze({
    targetSeconds,
    targetBytes: Math.min(
      input.payloadByteLength,
      Math.ceil(targetSeconds * input.mediaBytesPerSecond),
    ),
  });
}

/**
 * Projects source-carried bytes only after their enclosing Signature-V4-bound
 * range descriptor accepts them. The source reader and this projection remain
 * mechanics beneath the sealed proof object.
 */
export function createVerifiedMaterialRangeSource(input: Readonly<{
  capability: ReceizMaterialProgressiveCapability;
  reader: ReceizMaterialSourceRangeReader;
}>): VerifiedMaterialRangeSource {
  if (!isInspectedReceizMaterialProgressiveCapability(input.capability)
    || input.capability.mode !== "signed-ranges") {
    throw new TypeError("RECEIZ_MATERIAL_SIGNED_RANGE_CAPABILITY_REQUIRED");
  }
  if (input.reader?.authority?.readerIsProofAuthority !== false
    || input.reader.authority.rangeProofRequired !== true
    || input.reader.authority.strongerTruth !== "sealed-receiz-proof-object"
    || input.reader.payloadByteLength !== input.capability.byteLength) {
    throw new TypeError("RECEIZ_MATERIAL_SOURCE_RANGE_READER_INVALID");
  }

  const capability = input.capability;
  const ledger = input.reader.progressiveLedger;
  if (!ledger
    || ledger.payloadSha256 !== capability.payloadSha256
    || ledger.byteLength !== capability.byteLength
    || ledger.mimeType !== capability.mimeType
    || ledger.rangeByteBoundary !== capability.rangeByteBoundary
    || ledger.ranges.length !== capability.rangeCount
    || ledger.segmentRoot !== capability.segmentRoot) {
    throw new TypeError("RECEIZ_MATERIAL_PROGRESSIVE_LEDGER_BINDING_REJECTED");
  }
  const verifiedRanges = new Map<number, Promise<Uint8Array>>();
  const verifyRange = (range: ReceizSignedMaterialRange): Promise<Uint8Array> => {
    const held = verifiedRanges.get(range.index);
    if (held) return held;
    const verification = input.reader.readPayloadRange({
      offset: range.offset,
      byteLength: range.byteLength,
    }).then((bytes) => {
      if (bytes.byteLength !== range.byteLength
        || bytesToHex(sha256(bytes)) !== range.sha256) {
        throw new TypeError("RECEIZ_MATERIAL_SIGNED_RANGE_DIGEST_MISMATCH");
      }
      return bytes.slice();
    });
    verifiedRanges.set(range.index, verification);
    void verification.catch(() => verifiedRanges.delete(range.index));
    return verification;
  };

  return Object.freeze({
    payloadByteLength: capability.byteLength,
    mimeType: capability.mimeType,
    rangeByteBoundary: capability.rangeByteBoundary,
    async readVerifiedRange(rangeInput: Readonly<{ offset: number; byteLength: number }>) {
      assertSafeRange(rangeInput, capability.byteLength);
      const end = rangeInput.offset + rangeInput.byteLength;
      const output = new Uint8Array(rangeInput.byteLength);
      let outputOffset = 0;
      for (const range of ledger.ranges) {
        const rangeEnd = range.offset + range.byteLength;
        const overlapStart = Math.max(range.offset, rangeInput.offset);
        const overlapEnd = Math.min(rangeEnd, end);
        if (overlapStart >= overlapEnd) continue;
        const verified = await verifyRange(range);
        const slice = verified.subarray(overlapStart - range.offset, overlapEnd - range.offset);
        output.set(slice, outputOffset);
        outputOffset += slice.byteLength;
      }
      if (outputOffset !== output.byteLength) {
        throw new TypeError("RECEIZ_MATERIAL_SIGNED_RANGE_INCOMPLETE");
      }
      return output;
    },
    authority: RANGE_SOURCE_AUTHORITY,
  });
}
