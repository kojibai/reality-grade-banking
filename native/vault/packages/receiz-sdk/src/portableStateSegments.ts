import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";

import {
  appendReceizCompositeMerkleLeaf,
  createEmptyReceizCompositeMerkleState,
  createReceizCompositeFibonacciState,
  digestReceizCompositeCanonical,
  serializeReceizCompositeCanonical,
  type ReceizCompositeFibonacciState,
  type ReceizCompositeMerkleState,
} from "./compositeProofKernel.js";

export const RECEIZ_PORTABLE_SEGMENT_BYTES = 1024 * 1024;
export const RECEIZ_PORTABLE_SEGMENT_SCHEMA = "receiz.account.state.segment-proof.v1" as const;
export const RECEIZ_PORTABLE_COMPOSITE_SCHEMA = "receiz.account.state.segment-composite.v1" as const;
export const RECEIZ_PORTABLE_SEGMENTED_REF_SCHEMA = "receiz.account.state.segmented-ref.v1" as const;

const HEX64_RE = /^[0-9a-f]{64}$/;
const KAI_RE = /^(0|[1-9][0-9]*)$/;
const decoder = new TextDecoder("utf-8", { fatal: true });

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

function b64u(bytes: Uint8Array): string {
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  const encoded = typeof btoa === "function"
    ? btoa(binary)
    : (globalThis as { Buffer?: { from(value: Uint8Array): { toString(encoding: string): string } } })
      .Buffer?.from(bytes).toString("base64") ?? "";
  return encoded.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromB64u(value: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]*$/.test(value)) throw new TypeError("RECEIZ_PORTABLE_SEGMENT_PAYLOAD_INVALID");
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = typeof atob === "function"
    ? atob(padded)
    : (globalThis as { Buffer?: { from(value: string, encoding: string): { length: number; readonly [index: number]: number } } })
      .Buffer?.from(padded, "base64");
  if (typeof binary === "string") return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  if (binary) return Uint8Array.from({ length: binary.length }, (_, index) => binary[index] ?? 0);
  throw new TypeError("RECEIZ_PORTABLE_SEGMENT_PAYLOAD_INVALID");
}

function segmentSignatureBasis(segment: Omit<ReceizPortableStateSegmentProof, "signatureB64u">): Uint8Array {
  return serializeReceizCompositeCanonical(segment);
}

function snapshotKaiHead(snapshot: unknown): Readonly<{ kaiPulse: string; kaiUpulse: string }> {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) return { kaiPulse: "0", kaiUpulse: "0" };
  const head = (snapshot as Record<string, unknown>).accountStateHead;
  if (!head || typeof head !== "object" || Array.isArray(head)) return { kaiPulse: "0", kaiUpulse: "0" };
  const record = head as Record<string, unknown>;
  return {
    kaiPulse: typeof record.kaiPulse === "string" && KAI_RE.test(record.kaiPulse) ? record.kaiPulse : "0",
    kaiUpulse: typeof record.kaiUpulse === "string" && KAI_RE.test(record.kaiUpulse) ? record.kaiUpulse : "0",
  };
}

function segmentArtifactDigest(segment: Omit<ReceizPortableStateSegmentProof, "signatureB64u">): string {
  return digestReceizCompositeCanonical({
    kind: "receiz.account.state.segment-proof-object.v1",
    ...segment,
  });
}

export async function segmentReceizPortableStateSnapshot(args: Readonly<{
  snapshot: unknown;
  stableArtifactId: string;
  sign: (bytes: Uint8Array) => Promise<string>;
  segmentByteBoundary?: number;
}>): Promise<ReceizPortableStateSegmentComposite> {
  const segmentByteBoundary = args.segmentByteBoundary ?? RECEIZ_PORTABLE_SEGMENT_BYTES;
  if (!Number.isSafeInteger(segmentByteBoundary) || segmentByteBoundary < 1) {
    throw new TypeError("RECEIZ_PORTABLE_SEGMENT_BOUNDARY_INVALID");
  }
  const jsonText = JSON.stringify(args.snapshot);
  if (typeof jsonText !== "string") throw new TypeError("RECEIZ_PORTABLE_STATE_NOT_JSON");
  const exactSnapshot = JSON.parse(jsonText) as unknown;
  const exactBytes = serializeReceizCompositeCanonical(exactSnapshot);
  const snapshotDigestSha256Hex = bytesToHex(sha256(exactBytes));
  const segmentCount = Math.max(1, Math.ceil(exactBytes.byteLength / segmentByteBoundary));
  const kaiHead = snapshotKaiHead(exactSnapshot);
  const segments: ReceizPortableStateSegmentProof[] = [];
  let merkle = createEmptyReceizCompositeMerkleState();
  const artifactDigests: string[] = [];
  for (let index = 0; index < segmentCount; index += 1) {
    const payload = exactBytes.subarray(index * segmentByteBoundary, Math.min(exactBytes.byteLength, (index + 1) * segmentByteBoundary));
    const basis = {
      schema: RECEIZ_PORTABLE_SEGMENT_SCHEMA,
      artifactId: `account-state-segment:${snapshotDigestSha256Hex}:${index}`,
      parentStateDigest: snapshotDigestSha256Hex,
      index,
      segmentCount,
      kaiPulse: kaiHead.kaiPulse,
      kaiUpulse: kaiHead.kaiUpulse,
      byteLength: payload.byteLength,
      payloadDigestSha256Hex: bytesToHex(sha256(payload)),
      payloadB64u: b64u(payload),
    } as const;
    const artifactDigest = segmentArtifactDigest(basis);
    const segment = Object.freeze({ ...basis, signatureB64u: await args.sign(segmentSignatureBasis(basis)) });
    segments.push(segment);
    artifactDigests.push(artifactDigest);
    merkle = appendReceizCompositeMerkleLeaf(merkle, artifactDigest);
  }
  const fibonacci = createReceizCompositeFibonacciState({
    operationCount: segmentCount,
    resolveArtifactDigest: (operationCount) => artifactDigests[operationCount]!,
  });
  return Object.freeze({
    schema: RECEIZ_PORTABLE_COMPOSITE_SCHEMA,
    stableArtifactId: args.stableArtifactId,
    snapshotDigestSha256Hex,
    byteLength: exactBytes.byteLength,
    segmentByteBoundary,
    segmentCount,
    kaiPulse: kaiHead.kaiPulse,
    kaiUpulse: kaiHead.kaiUpulse,
    merkle: Object.freeze(merkle),
    fibonacci: Object.freeze(fibonacci),
    segments: Object.freeze(segments),
  });
}

export function segmentedReceizPortableStateRef(composite: ReceizPortableStateSegmentComposite): ReceizPortableStateSegmentedRef {
  return Object.freeze({ schema: RECEIZ_PORTABLE_SEGMENTED_REF_SCHEMA, composite });
}

export function isSegmentedReceizPortableStateRef(value: unknown): value is ReceizPortableStateSegmentedRef {
  return Boolean(value && typeof value === "object" && !Array.isArray(value)
    && (value as Record<string, unknown>).schema === RECEIZ_PORTABLE_SEGMENTED_REF_SCHEMA);
}

export function isReceizPortableStateSegmentComposite(value: unknown): value is ReceizPortableStateSegmentComposite {
  return Boolean(value && typeof value === "object" && !Array.isArray(value)
    && (value as Record<string, unknown>).schema === RECEIZ_PORTABLE_COMPOSITE_SCHEMA
    && Array.isArray((value as Record<string, unknown>).segments));
}

export function materializeReceizPortableStateRef(value: ReceizPortableStateSegmentedRef): unknown {
  const composite = value.composite;
  if (
    composite?.schema !== RECEIZ_PORTABLE_COMPOSITE_SCHEMA
    || !HEX64_RE.test(composite.snapshotDigestSha256Hex)
    || !Number.isSafeInteger(composite.segmentCount)
    || composite.segmentCount < 1
    || composite.segments.length !== composite.segmentCount
  ) throw new TypeError("RECEIZ_PORTABLE_SEGMENT_COMPOSITE_INVALID");
  let merkle = createEmptyReceizCompositeMerkleState();
  const artifactDigests: string[] = [];
  const payloads = composite.segments.map((segment, index) => {
    if (
      segment.schema !== RECEIZ_PORTABLE_SEGMENT_SCHEMA
      || segment.index !== index
      || segment.segmentCount !== composite.segmentCount
      || segment.parentStateDigest !== composite.snapshotDigestSha256Hex
      || segment.kaiPulse !== composite.kaiPulse
      || segment.kaiUpulse !== composite.kaiUpulse
      || !segment.signatureB64u
    ) throw new TypeError("RECEIZ_PORTABLE_SEGMENT_INVALID");
    const payload = fromB64u(segment.payloadB64u);
    if (payload.byteLength !== segment.byteLength || bytesToHex(sha256(payload)) !== segment.payloadDigestSha256Hex) {
      throw new TypeError("RECEIZ_PORTABLE_SEGMENT_PAYLOAD_INVALID");
    }
    const { signatureB64u: _signatureB64u, ...basis } = segment;
    const artifactDigest = segmentArtifactDigest(basis);
    artifactDigests.push(artifactDigest);
    merkle = appendReceizCompositeMerkleLeaf(merkle, artifactDigest);
    return payload;
  });
  if (merkle.root !== composite.merkle.root || merkle.leafCount !== composite.merkle.leafCount) {
    throw new TypeError("RECEIZ_PORTABLE_SEGMENT_MERKLE_INVALID");
  }
  const fibonacci = createReceizCompositeFibonacciState({
    operationCount: composite.segmentCount,
    resolveArtifactDigest: (operationCount) => artifactDigests[operationCount]!,
  });
  if (JSON.stringify(fibonacci) !== JSON.stringify(composite.fibonacci)) {
    throw new TypeError("RECEIZ_PORTABLE_SEGMENT_FIBONACCI_INVALID");
  }
  const exactBytes = new Uint8Array(composite.byteLength);
  let offset = 0;
  for (const payload of payloads) {
    exactBytes.set(payload, offset);
    offset += payload.byteLength;
  }
  if (offset !== composite.byteLength || bytesToHex(sha256(exactBytes)) !== composite.snapshotDigestSha256Hex) {
    throw new TypeError("RECEIZ_PORTABLE_SEGMENT_SNAPSHOT_INVALID");
  }
  return JSON.parse(decoder.decode(exactBytes)) as unknown;
}

export function receizPortableSegmentSignatureBytes(segment: ReceizPortableStateSegmentProof): Uint8Array {
  const { signatureB64u: _signatureB64u, ...basis } = segment;
  return segmentSignatureBasis(basis);
}
