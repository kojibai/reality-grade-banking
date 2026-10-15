import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";

import { canonicalizeReceizConstitution, type ReceizConstitutionJson } from "./constitution.js";
import {
  coerceReceizMaterialProgressiveLedger,
  type ReceizMaterialProgressiveLedger,
} from "./materialProgressiveLedger.js";

export const RECEIZ_MATERIAL_COMPOSITE_SCHEMA = "receiz.material.url-composite.v1" as const;
export const RECEIZ_MATERIAL_COMPOSITE_TOKEN_PREFIX = "rmc1:" as const;
export const RECEIZ_MATERIAL_COMPOSITE_STREAMING_TOKEN_PREFIX = "rmc2:" as const;
export const RECEIZ_MATERIAL_COMPOSITE_SEGMENT_BYTES = 1024 * 1024;
export const RECEIZ_MATERIAL_COMPOSITE_MAX_BYTES = 500 * 1024 * 1024;
export const RECEIZ_MATERIAL_COMPOSITE_HEAD_MAX_URL_CHARS = 4_096;

const HEX64_RE = /^[0-9a-f]{64}$/;
const KAI_RE = /^(0|[1-9][0-9]*)$/;
const MAX_SEGMENTS = 4096;
const encoder = new TextEncoder();

function sha256Hex(bytes: Uint8Array): string {
  return bytesToHex(sha256(bytes));
}

function jcsCanonicalize(value: unknown): string {
  return canonicalizeReceizConstitution(value as ReceizConstitutionJson);
}

export const RECEIZ_MATERIAL_COMPOSITE_AUTHORITY = Object.freeze({
  transportIsProofAuthority: false as const,
  manifestIsProofAuthority: false as const,
  segmentIsProofAuthority: false as const,
  storageIsProofAuthority: false as const,
  strongerTruth: "sealed-receiz-proof-object" as const,
});

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

function fail(code: string): never {
  throw new TypeError(code);
}

async function canonicalDigest(value: unknown): Promise<string> {
  return sha256Hex(encoder.encode(jcsCanonicalize(value)));
}

async function segmentLeafDigest(segment: Omit<ReceizMaterialCompositeSegment, "leafDigest">): Promise<string> {
  return canonicalDigest({ kind: "receiz.material.url-segment-leaf.v1", ...segment });
}

async function merkleParent(left: string, right: string): Promise<string> {
  return canonicalDigest({ kind: "receiz.material.url-segment-parent.v1", left, right });
}

async function orderedMerkleRoot(leaves: readonly string[]): Promise<string> {
  if (!leaves.length || leaves.some((value) => !HEX64_RE.test(value))) {
    fail("RECEIZ_MATERIAL_COMPOSITE_MERKLE_INVALID");
  }
  let layer = [...leaves];
  while (layer.length > 1) {
    const next: string[] = [];
    for (let index = 0; index < layer.length; index += 2) {
      next.push(await merkleParent(layer[index]!, layer[index + 1] ?? layer[index]!));
    }
    layer = next;
  }
  return layer[0]!;
}

function fibonacciDistancesUpTo(value: number): number[] {
  const distances: number[] = [];
  let current = 1;
  let next = 2;
  while (current <= value) {
    distances.push(current);
    [current, next] = [next, current + next];
  }
  return distances;
}

function fibonacciState(leaves: readonly string[]) {
  return Object.freeze({
    basis: "sparse-checkpoint/v1" as const,
    operationCount: leaves.length,
    checkpoints: Object.freeze(fibonacciDistancesUpTo(leaves.length).map((distance) => Object.freeze({
      distance,
      operationCount: leaves.length - distance,
      artifactDigest: leaves[leaves.length - distance]!,
    }))),
  });
}

function manifestBasis(manifest: Omit<ReceizMaterialCompositeManifest, "packageDigest">): unknown {
  return { kind: "receiz.material.url-composite-package.v1", ...manifest };
}

export async function buildReceizMaterialCompositeTransport(input: Readonly<{
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
}>): Promise<BuiltReceizMaterialCompositeTransport> {
  const segmentByteBoundary = input.segmentByteBoundary ?? RECEIZ_MATERIAL_COMPOSITE_SEGMENT_BYTES;
  const issuedAtKaiPulse = String(input.issuedAtKaiPulse);
  const issuedAtKaiUPulse = String(input.issuedAtKaiUPulse);
  if (!input.capsuleBytes.byteLength || input.capsuleBytes.byteLength > RECEIZ_MATERIAL_COMPOSITE_MAX_BYTES) {
    fail("RECEIZ_MATERIAL_COMPOSITE_CAPSULE_LENGTH_INVALID");
  }
  if (!Number.isSafeInteger(segmentByteBoundary) || segmentByteBoundary < 64 * 1024 || segmentByteBoundary > 8 * 1024 * 1024) {
    fail("RECEIZ_MATERIAL_COMPOSITE_SEGMENT_BOUNDARY_INVALID");
  }
  if (!HEX64_RE.test(input.sealedArtifactSha256) || !Number.isSafeInteger(input.sealedArtifactByteLength) || input.sealedArtifactByteLength < 1) {
    fail("RECEIZ_MATERIAL_COMPOSITE_ARTIFACT_BINDING_INVALID");
  }
  if (!KAI_RE.test(issuedAtKaiPulse) || !KAI_RE.test(issuedAtKaiUPulse)) {
    fail("RECEIZ_MATERIAL_COMPOSITE_KAI_INVALID");
  }
  if (!/^\/v\/[^/?#]+\/[^/?#]+\/[^/?#]+$/.test(input.verifyPath)) {
    fail("RECEIZ_MATERIAL_COMPOSITE_PROOF_PATH_INVALID");
  }
  const predecessorPackageDigest = input.predecessorPackageDigest ?? null;
  if (predecessorPackageDigest !== null && !HEX64_RE.test(predecessorPackageDigest)) {
    fail("RECEIZ_MATERIAL_COMPOSITE_PREDECESSOR_INVALID");
  }
  const materialProgressiveLedger = typeof input.materialProgressiveLedger === "undefined"
    ? null
    : coerceReceizMaterialProgressiveLedger(input.materialProgressiveLedger);
  if (typeof input.materialProgressiveLedger !== "undefined" && !materialProgressiveLedger) {
    fail("RECEIZ_MATERIAL_PROGRESSIVE_LEDGER_INVALID");
  }
  const segmentCount = Math.ceil(input.capsuleBytes.byteLength / segmentByteBoundary);
  if (segmentCount < 1 || segmentCount > MAX_SEGMENTS) fail("RECEIZ_MATERIAL_COMPOSITE_SEGMENT_COUNT_INVALID");

  const segments: Uint8Array[] = [];
  const descriptors: ReceizMaterialCompositeSegment[] = [];
  for (let index = 0; index < segmentCount; index += 1) {
    const offset = index * segmentByteBoundary;
    const bytes = input.capsuleBytes.slice(offset, Math.min(input.capsuleBytes.byteLength, offset + segmentByteBoundary));
    const basis = { index, offset, byteLength: bytes.byteLength, sha256: await sha256Hex(bytes) };
    segments.push(bytes);
    descriptors.push(Object.freeze({ ...basis, leafDigest: await segmentLeafDigest(basis) }));
  }
  const leaves = descriptors.map((segment) => segment.leafDigest);
  const withoutDigest = Object.freeze({
    schema: RECEIZ_MATERIAL_COMPOSITE_SCHEMA,
    capsuleSha256: await sha256Hex(input.capsuleBytes),
    capsuleByteLength: input.capsuleBytes.byteLength,
    sealedArtifactSha256: input.sealedArtifactSha256,
    sealedArtifactByteLength: input.sealedArtifactByteLength,
    sealedFilename: input.sealedFilename.trim() || "sealed-material.bin",
    sealedMimeType: input.sealedMimeType.trim() || "application/octet-stream",
    verifyPath: input.verifyPath,
    issuedAtKaiPulse,
    issuedAtKaiUPulse,
    predecessorPackageDigest,
    segmentByteBoundary,
    segmentCount,
    merkle: Object.freeze({ algorithm: "sha256/ordered-pair/v1" as const, root: await orderedMerkleRoot(leaves) }),
    fibonacci: fibonacciState(leaves),
    segments: Object.freeze(descriptors),
    ...(materialProgressiveLedger ? { materialProgressiveLedger } : {}),
    authority: RECEIZ_MATERIAL_COMPOSITE_AUTHORITY,
  });
  const packageDigest = await canonicalDigest(manifestBasis(withoutDigest));
  const manifest = Object.freeze({ ...withoutDigest, packageDigest });
  return Object.freeze({
    manifest,
    manifestBytes: encoder.encode(jcsCanonicalize(manifest)),
    segments: Object.freeze(segments),
    token: `${RECEIZ_MATERIAL_COMPOSITE_TOKEN_PREFIX}${packageDigest}`,
  });
}

export async function verifyReceizMaterialCompositeManifest(value: unknown): Promise<ReceizMaterialCompositeManifest> {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail("RECEIZ_MATERIAL_COMPOSITE_MANIFEST_INVALID");
  const manifest = value as ReceizMaterialCompositeManifest;
  if (
    manifest.schema !== RECEIZ_MATERIAL_COMPOSITE_SCHEMA
    || (manifest.capsuleEncoding !== undefined && manifest.capsuleEncoding !== "rma3/raw")
    || !HEX64_RE.test(manifest.packageDigest)
    || !HEX64_RE.test(manifest.capsuleSha256)
    || !HEX64_RE.test(manifest.sealedArtifactSha256)
    || !Number.isSafeInteger(manifest.capsuleByteLength)
    || manifest.capsuleByteLength < 1
    || manifest.capsuleByteLength > RECEIZ_MATERIAL_COMPOSITE_MAX_BYTES
    || !Number.isSafeInteger(manifest.sealedArtifactByteLength)
    || manifest.sealedArtifactByteLength < 1
    || !KAI_RE.test(manifest.issuedAtKaiPulse)
    || !KAI_RE.test(manifest.issuedAtKaiUPulse)
    || !/^\/v\/[^/?#]+\/[^/?#]+\/[^/?#]+$/.test(manifest.verifyPath)
    || (manifest.predecessorPackageDigest !== null && !HEX64_RE.test(manifest.predecessorPackageDigest))
    || !Number.isSafeInteger(manifest.segmentCount)
    || manifest.segmentCount < 1
    || manifest.segmentCount > MAX_SEGMENTS
    || !Array.isArray(manifest.segments)
    || manifest.segments.length !== manifest.segmentCount
    || (typeof manifest.materialProgressiveLedger !== "undefined"
      && !coerceReceizMaterialProgressiveLedger(manifest.materialProgressiveLedger))
    || manifest.authority?.transportIsProofAuthority !== false
    || manifest.authority?.manifestIsProofAuthority !== false
    || manifest.authority?.segmentIsProofAuthority !== false
    || manifest.authority?.storageIsProofAuthority !== false
    || manifest.authority?.strongerTruth !== "sealed-receiz-proof-object"
  ) fail("RECEIZ_MATERIAL_COMPOSITE_MANIFEST_INVALID");

  let expectedOffset = 0;
  const leaves: string[] = [];
  for (let index = 0; index < manifest.segments.length; index += 1) {
    const segment = manifest.segments[index]!;
    if (
      segment.index !== index
      || segment.offset !== expectedOffset
      || !Number.isSafeInteger(segment.byteLength)
      || segment.byteLength < 1
      || segment.byteLength > manifest.segmentByteBoundary
      || !HEX64_RE.test(segment.sha256)
      || !HEX64_RE.test(segment.leafDigest)
      || await segmentLeafDigest({ index, offset: segment.offset, byteLength: segment.byteLength, sha256: segment.sha256 }) !== segment.leafDigest
    ) fail("RECEIZ_MATERIAL_COMPOSITE_SEGMENT_INVALID");
    expectedOffset += segment.byteLength;
    leaves.push(segment.leafDigest);
  }
  if (expectedOffset !== manifest.capsuleByteLength
    || manifest.merkle?.algorithm !== "sha256/ordered-pair/v1"
    || manifest.merkle.root !== await orderedMerkleRoot(leaves)
    || jcsCanonicalize(manifest.fibonacci) !== jcsCanonicalize(fibonacciState(leaves))) {
    fail("RECEIZ_MATERIAL_COMPOSITE_COMMITMENT_INVALID");
  }
  const { packageDigest, ...withoutDigest } = manifest;
  if (await canonicalDigest(manifestBasis(withoutDigest)) !== packageDigest) {
    fail("RECEIZ_MATERIAL_COMPOSITE_PACKAGE_DIGEST_INVALID");
  }
  return Object.freeze(structuredClone(manifest));
}

export async function reconstructReceizMaterialCompositeCapsule(input: Readonly<{
  manifest: unknown;
  resolveSegment: (segment: ReceizMaterialCompositeSegment) => Promise<Uint8Array>;
}>): Promise<Uint8Array> {
  const manifest = await verifyReceizMaterialCompositeManifest(input.manifest);
  const capsule = new Uint8Array(manifest.capsuleByteLength);
  for (const descriptor of manifest.segments) {
    const bytes = await input.resolveSegment(descriptor);
    if (bytes.byteLength !== descriptor.byteLength || await sha256Hex(bytes) !== descriptor.sha256) {
      fail("RECEIZ_MATERIAL_COMPOSITE_SEGMENT_BYTES_INVALID");
    }
    capsule.set(bytes, descriptor.offset);
  }
  if (await sha256Hex(capsule) !== manifest.capsuleSha256) {
    fail("RECEIZ_MATERIAL_COMPOSITE_CAPSULE_DIGEST_INVALID");
  }
  return capsule;
}

export function readReceizMaterialCompositePackageDigest(token: string): string | null {
  const normalized = token.trim();
  const prefix = normalized.startsWith(RECEIZ_MATERIAL_COMPOSITE_TOKEN_PREFIX)
    ? RECEIZ_MATERIAL_COMPOSITE_TOKEN_PREFIX
    : normalized.startsWith(RECEIZ_MATERIAL_COMPOSITE_STREAMING_TOKEN_PREFIX)
      ? RECEIZ_MATERIAL_COMPOSITE_STREAMING_TOKEN_PREFIX
      : null;
  if (!prefix) return null;
  const digest = normalized.slice(prefix.length);
  if (!HEX64_RE.test(digest)) fail("RECEIZ_MATERIAL_COMPOSITE_TOKEN_INVALID");
  return digest;
}

/**
 * Enforces the public-coordinate boundary without imposing a truth boundary.
 * Exact material bytes remain in the sealed artifact and its committed append
 * segments; this function only admits a bounded presentation head.
 */
export function assertReceizMaterialCompositeHeadUrl(value: string): string {
  if (value.length > RECEIZ_MATERIAL_COMPOSITE_HEAD_MAX_URL_CHARS) {
    fail("RECEIZ_MATERIAL_COMPOSITE_HEAD_URL_TOO_LARGE");
  }
  let url: URL;
  try {
    url = new URL(value, "https://receiz.com");
  } catch {
    fail("RECEIZ_MATERIAL_COMPOSITE_HEAD_URL_INVALID");
  }
  const materialToken = new URLSearchParams(url.hash.slice(1)).get("material");
  if (!materialToken || readReceizMaterialCompositePackageDigest(materialToken) === null) {
    fail("RECEIZ_MATERIAL_COMPOSITE_HEAD_URL_INVALID");
  }
  return url.toString();
}

export async function publishReceizMaterialCompositeTransport(input: Readonly<{
  transport: BuiltReceizMaterialCompositeTransport;
  receizOrigin?: string;
  fetcher?: typeof fetch;
}>): Promise<string> {
  const fetcher = input.fetcher ?? fetch;
  const origin = (input.receizOrigin ?? "https://receiz.com").replace(/\/+$/, "");
  const init = await fetcher(`${origin}/api/proof-material/packages/init`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ manifest: input.transport.manifest }),
    cache: "no-store",
  });
  const initialized = await init.json() as {
    ok?: boolean;
    publicationId?: string;
    uploads?: readonly Readonly<{ index: number; signedUrl: string; byteLength: number }>[];
  };
  if (!init.ok || !initialized.ok || !initialized.publicationId || !initialized.uploads) {
    throw new Error("RECEIZ_MATERIAL_COMPOSITE_PUBLICATION_INIT_FAILED");
  }
  for (const upload of initialized.uploads) {
    const segment = input.transport.segments[upload.index];
    if (!segment || segment.byteLength !== upload.byteLength) {
      throw new Error("RECEIZ_MATERIAL_COMPOSITE_PUBLICATION_PLAN_INVALID");
    }
    const uploaded = await fetcher(upload.signedUrl, {
      method: "PUT",
      headers: { "content-type": "application/octet-stream" },
      body: new Uint8Array(segment).buffer,
      cache: "no-store",
    });
    if (!uploaded.ok) throw new Error("RECEIZ_MATERIAL_COMPOSITE_SEGMENT_UPLOAD_FAILED");
  }
  const finalized = await fetcher(`${origin}/api/proof-material/packages/finalize`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ publicationId: initialized.publicationId, manifest: input.transport.manifest }),
    cache: "no-store",
  });
  const result = await finalized.json() as { ok?: boolean; materialToken?: string };
  if (!finalized.ok || !result.ok || result.materialToken !== input.transport.token) {
    throw new Error("RECEIZ_MATERIAL_COMPOSITE_PUBLICATION_FINALIZE_FAILED");
  }
  return result.materialToken;
}

export async function resolveReceizMaterialCompositeTransport(input: Readonly<{
  packageDigest: string;
  receizOrigin?: string;
  fetcher?: typeof fetch;
}>): Promise<Readonly<{ manifest: ReceizMaterialCompositeManifest; capsuleBytes: Uint8Array }>> {
  const fetcher = input.fetcher ?? fetch;
  const origin = (input.receizOrigin ?? "https://receiz.com").replace(/\/+$/, "");
  const response = await fetcher(`${origin}/api/proof-material/packages/${input.packageDigest}/manifest`, { cache: "force-cache" });
  if (!response.ok) throw new Error("RECEIZ_MATERIAL_COMPOSITE_MANIFEST_UNAVAILABLE");
  const manifest = await verifyReceizMaterialCompositeManifest(await response.json());
  if (manifest.packageDigest !== input.packageDigest) throw new Error("RECEIZ_MATERIAL_COMPOSITE_PACKAGE_MISMATCH");
  const capsuleBytes = await reconstructReceizMaterialCompositeCapsule({
    manifest,
    resolveSegment: async (segment) => {
      const segmentResponse = await fetcher(
        `${origin}/api/proof-material/packages/${manifest.packageDigest}/segments/${segment.index}?sha256=${segment.sha256}`,
        { cache: "force-cache" },
      );
      if (!segmentResponse.ok) throw new Error("RECEIZ_MATERIAL_COMPOSITE_SEGMENT_UNAVAILABLE");
      return new Uint8Array(await segmentResponse.arrayBuffer());
    },
  });
  return Object.freeze({ manifest, capsuleBytes });
}

export function createReceizCompositeMaterialPresentationUrl(input: Readonly<{
  proofUrl: string;
  materialToken: string;
}>): string {
  const packageDigest = readReceizMaterialCompositePackageDigest(input.materialToken);
  if (!packageDigest) throw new TypeError("RECEIZ_MATERIAL_COMPOSITE_TOKEN_REQUIRED");
  const url = new URL(input.proofUrl, "https://receiz.com");
  url.hash = new URLSearchParams({ material: input.materialToken }).toString();
  return assertReceizMaterialCompositeHeadUrl(url.toString());
}
