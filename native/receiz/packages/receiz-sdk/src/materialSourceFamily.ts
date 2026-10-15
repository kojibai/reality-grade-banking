import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";

import { canonicalizeReceizConstitution } from "./constitution.js";
import {
  createReceizCompositeMaterialPresentationUrl,
  readReceizMaterialCompositePackageDigest,
  reconstructReceizMaterialCompositeCapsule,
  verifyReceizMaterialCompositeManifest,
  type BuiltReceizMaterialCompositeTransport,
  type ReceizMaterialCompositeManifest,
} from "./materialCompositeTransport.js";
import { base64UrlDecode, base64UrlEncode, sha256Hex } from "./verifier/crypto.js";

export const RECEIZ_MATERIAL_MANIFEST_SOURCE_FRAGMENT_KEY = "material-manifest" as const;
export const RECEIZ_MATERIAL_SEGMENT_SOURCE_FRAGMENT_KEY = "material-source" as const;
export const RECEIZ_MATERIAL_SOURCE_TOKEN_PREFIX = "rms1" as const;

export type ReceizMaterialSourceFamily = Readonly<{
  schema: "receiz.material.source-family.v1";
  headUrl: string;
  manifestUrl: string;
  segmentUrls: readonly string[];
  packageDigest: string;
  authority: Readonly<{
    familyIsProofAuthority: false;
    locatorIsProofAuthority: false;
    storageIsProofAuthority: false;
    strongerTruth: "sealed-receiz-proof-object";
  }>;
}>;

export type ReceizVerifiedMaterialSourceSegment = Readonly<{
  index: number;
  offset: number;
  byteLength: number;
  sha256: string;
  bytes: Uint8Array;
}>;

export type ReceizVerifiedMaterialSourceParts = Readonly<{
  manifest: ReceizMaterialCompositeManifest;
  orderedSegments: readonly ReceizVerifiedMaterialSourceSegment[];
}>;

export type ReceizRawMaterialCapsuleBlobProjection = Readonly<{
  capsuleBlob: Blob;
  exactArtifactBlob: Blob;
  filename: string;
  mimeType: string;
}>;

export type ReceizRawMaterialCapsuleProjection = Readonly<{
  exactArtifactBytes: Uint8Array;
  filename: string;
  mimeType: string;
}>;

export type ReceizMaterialSourceRangeReader = Readonly<{
  manifest: ReceizMaterialCompositeManifest;
  payloadByteLength: number;
  progressiveLedger: ReceizMaterialCompositeManifest["materialProgressiveLedger"] | null;
  readPayloadRange(input: Readonly<{ offset: number; byteLength: number }>): Promise<Uint8Array>;
  authority: Readonly<{
    readerIsProofAuthority: false;
    rangeProofRequired: true;
    strongerTruth: "sealed-receiz-proof-object";
  }>;
}>;

const HEX64_RE = /^[0-9a-f]{64}$/;
const INTEGER_RE = /^(0|[1-9][0-9]*)$/;
const RAW_CAPSULE_HEADER_BYTES = 12;
const RAW_CAPSULE_MAGIC = Uint8Array.of(0x52, 0x4d, 0x41, 0x33);
const MAX_RAW_FILENAME_BYTES = 1_024;
const MAX_RAW_MIME_BYTES = 256;
const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: true });
const materialFamilies = new WeakSet<object>();
const verifiedMaterialSourceParts = new WeakSet<object>();

function fail(code: string): never {
  throw new TypeError(code);
}

function exactKeys(
  value: unknown,
  required: readonly string[],
  optional: readonly string[] = [],
): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const keys = Object.keys(value).sort();
  const allowed = new Set([...required, ...optional]);
  return required.every((key) => Object.prototype.hasOwnProperty.call(value, key))
    && keys.every((key) => allowed.has(key));
}

function assertClosedManifest(value: unknown): asserts value is ReceizMaterialCompositeManifest {
  if (!exactKeys(value, [
    "schema", "packageDigest", "capsuleSha256", "capsuleByteLength",
    "sealedArtifactSha256", "sealedArtifactByteLength", "sealedFilename",
    "sealedMimeType", "verifyPath", "issuedAtKaiPulse", "issuedAtKaiUPulse",
    "predecessorPackageDigest", "segmentByteBoundary", "segmentCount", "merkle",
    "fibonacci", "segments", "authority",
  ], ["capsuleEncoding", "materialProgressiveLedger"])) fail("RECEIZ_MATERIAL_SOURCE_MANIFEST_CLOSED_SHAPE_INVALID");
  if (!exactKeys(value.merkle, ["algorithm", "root"])
    || !exactKeys(value.fibonacci, ["basis", "operationCount", "checkpoints"])
    || !exactKeys(value.authority, [
      "transportIsProofAuthority", "manifestIsProofAuthority",
      "segmentIsProofAuthority", "storageIsProofAuthority", "strongerTruth",
    ])) fail("RECEIZ_MATERIAL_SOURCE_MANIFEST_CLOSED_SHAPE_INVALID");
  const fibonacci = value.fibonacci as Record<string, unknown>;
  if (!Array.isArray(fibonacci.checkpoints)
    || fibonacci.checkpoints.some((checkpoint) => !exactKeys(
      checkpoint,
      ["distance", "operationCount", "artifactDigest"],
    ))) fail("RECEIZ_MATERIAL_SOURCE_MANIFEST_CLOSED_SHAPE_INVALID");
  if (!Array.isArray(value.segments)
    || value.segments.some((segment) => !exactKeys(
      segment,
      ["index", "offset", "byteLength", "sha256", "leafDigest"],
    ))) fail("RECEIZ_MATERIAL_SOURCE_MANIFEST_CLOSED_SHAPE_INVALID");
}

function sourceUrl(proofUrl: string, key: string, token: string): string {
  const url = new URL(proofUrl, "https://receiz.com");
  url.hash = new URLSearchParams([[key, token]]).toString();
  return url.toString();
}

function canonicalManifestBytes(manifest: ReceizMaterialCompositeManifest): Uint8Array {
  return encoder.encode(canonicalizeReceizConstitution(manifest));
}

function sameBytes(left: Uint8Array, right: Uint8Array): boolean {
  return left.byteLength === right.byteLength
    && left.every((value, index) => value === right[index]);
}

function readU16(bytes: Uint8Array, offset: number): number {
  return ((bytes[offset]! << 8) | bytes[offset + 1]!) >>> 0;
}

function readU32(bytes: Uint8Array, offset: number): number {
  return (
    bytes[offset]! * 0x1000000
    + (bytes[offset + 1]! << 16)
    + (bytes[offset + 2]! << 8)
    + bytes[offset + 3]!
  ) >>> 0;
}

function hasRawCapsuleMagic(bytes: Uint8Array): boolean {
  return RAW_CAPSULE_MAGIC.every((value, index) => bytes[index] === value);
}

function readRawCapsuleHeader(prefixBytes: Uint8Array): Readonly<{
  exactArtifactOffset: number;
  exactArtifactByteLength: number;
  filename: string;
  mimeType: string;
}> {
  if (prefixBytes.byteLength < RAW_CAPSULE_HEADER_BYTES || !hasRawCapsuleMagic(prefixBytes)) {
    fail("RECEIZ_MATERIAL_SOURCE_RAW_CAPSULE_HEADER_INVALID");
  }
  const exactArtifactByteLength = readU32(prefixBytes, 4);
  const filenameLength = readU16(prefixBytes, 8);
  const mimeLength = readU16(prefixBytes, 10);
  if (!exactArtifactByteLength) fail("RECEIZ_MATERIAL_SOURCE_RAW_CAPSULE_LENGTH_INVALID");
  if (!filenameLength || filenameLength > MAX_RAW_FILENAME_BYTES
    || !mimeLength || mimeLength > MAX_RAW_MIME_BYTES) {
    fail("RECEIZ_MATERIAL_SOURCE_RAW_CAPSULE_PROJECTION_INVALID");
  }
  const exactArtifactOffset = RAW_CAPSULE_HEADER_BYTES + filenameLength + mimeLength;
  if (prefixBytes.byteLength < exactArtifactOffset) {
    fail("RECEIZ_MATERIAL_SOURCE_RAW_CAPSULE_HEADER_TRUNCATED");
  }
  let filename: string;
  let mimeType: string;
  try {
    filename = decoder.decode(prefixBytes.subarray(
      RAW_CAPSULE_HEADER_BYTES,
      RAW_CAPSULE_HEADER_BYTES + filenameLength,
    ));
    mimeType = decoder.decode(prefixBytes.subarray(
      RAW_CAPSULE_HEADER_BYTES + filenameLength,
      exactArtifactOffset,
    ));
  } catch {
    fail("RECEIZ_MATERIAL_SOURCE_RAW_CAPSULE_PROJECTION_INVALID");
  }
  return Object.freeze({
    exactArtifactOffset,
    exactArtifactByteLength,
    filename,
    mimeType,
  });
}

function verifiedSegmentBlobParts(
  orderedSegments: readonly ReceizVerifiedMaterialSourceSegment[],
): ArrayBuffer[] {
  return orderedSegments.map((segment) => segment.bytes.slice().buffer);
}

function verifyOrderedSourcePartsSync(parts: ReceizVerifiedMaterialSourceParts): void {
  const capsuleDigest = sha256.create();
  let expectedOffset = 0;
  if (parts.orderedSegments.length !== parts.manifest.segmentCount) {
    fail("RECEIZ_MATERIAL_SOURCE_FAMILY_INCOMPLETE");
  }
  for (const descriptor of parts.manifest.segments) {
    const segment = parts.orderedSegments[descriptor.index];
    if (!segment
      || segment.index !== descriptor.index
      || segment.offset !== descriptor.offset
      || segment.byteLength !== descriptor.byteLength
      || segment.sha256 !== descriptor.sha256
      || segment.bytes.byteLength !== descriptor.byteLength
      || bytesToHex(sha256(segment.bytes)) !== descriptor.sha256
      || segment.offset !== expectedOffset) {
      fail("RECEIZ_MATERIAL_SOURCE_SEGMENT_DIGEST_MISMATCH");
    }
    capsuleDigest.update(segment.bytes);
    expectedOffset += segment.byteLength;
  }
  if (expectedOffset !== parts.manifest.capsuleByteLength
    || bytesToHex(capsuleDigest.digest()) !== parts.manifest.capsuleSha256) {
    fail("RECEIZ_MATERIAL_SOURCE_CAPSULE_DIGEST_MISMATCH");
  }
}

function decodeCanonicalB64u(value: string, code: string): Uint8Array {
  let bytes: Uint8Array;
  try {
    bytes = base64UrlDecode(value);
  } catch {
    fail(code);
  }
  if (base64UrlEncode(bytes) !== value) fail(code);
  return bytes;
}

function assertKnownFragmentFields(url: URL): URLSearchParams {
  const fields = new URLSearchParams(url.hash.startsWith("#") ? url.hash.slice(1) : url.hash);
  for (const key of fields.keys()) {
    if (key !== "material"
      && key !== RECEIZ_MATERIAL_MANIFEST_SOURCE_FRAGMENT_KEY
      && key !== RECEIZ_MATERIAL_SEGMENT_SOURCE_FRAGMENT_KEY) {
      fail("RECEIZ_MATERIAL_SOURCE_LOCATOR_UNKNOWN_FIELD");
    }
  }
  return fields;
}

export function createReceizMaterialSourceFamily(input: Readonly<{
  proofUrl: string;
  transport: BuiltReceizMaterialCompositeTransport;
}>): ReceizMaterialSourceFamily {
  if (!input || typeof input !== "object" || typeof input.proofUrl !== "string") {
    fail("RECEIZ_MATERIAL_SOURCE_FAMILY_INPUT_INVALID");
  }
  const { transport } = input;
  const packageDigest = transport?.manifest?.packageDigest;
  const expectedMaterialToken = transport?.manifest?.capsuleEncoding === "rma3/raw"
    ? new Set([`rmc1:${packageDigest}`, `rmc2:${packageDigest}`])
    : new Set([`rmc1:${packageDigest}`]);
  if (!HEX64_RE.test(packageDigest ?? "")
    || !expectedMaterialToken.has(transport.token)
    || transport.segments.length !== transport.manifest.segmentCount
    || !sameBytes(transport.manifestBytes, canonicalManifestBytes(transport.manifest))) {
    fail("RECEIZ_MATERIAL_SOURCE_FAMILY_INPUT_INVALID");
  }
  const headUrl = createReceizCompositeMaterialPresentationUrl({
    proofUrl: input.proofUrl,
    materialToken: transport.token,
  });
  const manifestToken = `${RECEIZ_MATERIAL_SOURCE_TOKEN_PREFIX}:${packageDigest}:${base64UrlEncode(transport.manifestBytes)}`;
  const manifestUrl = sourceUrl(input.proofUrl, RECEIZ_MATERIAL_MANIFEST_SOURCE_FRAGMENT_KEY, manifestToken);
  const segmentUrls = Object.freeze(transport.manifest.segments.map((segment) => {
    const bytes = transport.segments[segment.index];
    if (bytes === undefined || bytes.byteLength !== segment.byteLength) {
      fail("RECEIZ_MATERIAL_SOURCE_FAMILY_INPUT_INVALID");
    }
    const token = `${RECEIZ_MATERIAL_SOURCE_TOKEN_PREFIX}:${packageDigest}:${segment.index}:${segment.sha256}:${base64UrlEncode(bytes)}`;
    return sourceUrl(input.proofUrl, RECEIZ_MATERIAL_SEGMENT_SOURCE_FRAGMENT_KEY, token);
  }));
  const family = Object.freeze({
    schema: "receiz.material.source-family.v1" as const,
    headUrl,
    manifestUrl,
    segmentUrls,
    packageDigest,
    authority: Object.freeze({
      familyIsProofAuthority: false as const,
      locatorIsProofAuthority: false as const,
      storageIsProofAuthority: false as const,
      strongerTruth: "sealed-receiz-proof-object" as const,
    }),
  });
  materialFamilies.add(family);
  return family;
}

export function createReceizClosedMaterialPresentationUrl(
  family: ReceizMaterialSourceFamily,
): string {
  if (family === null || typeof family !== "object" || !materialFamilies.has(family)) {
    fail("RECEIZ_MATERIAL_SOURCE_FAMILY_NOT_CREATED");
  }
  const url = new URL(family.headUrl);
  const fields = assertKnownFragmentFields(url);
  const manifestFields = assertKnownFragmentFields(new URL(family.manifestUrl));
  const manifestToken = manifestFields.get(RECEIZ_MATERIAL_MANIFEST_SOURCE_FRAGMENT_KEY);
  if (!manifestToken) fail("RECEIZ_MATERIAL_SOURCE_MANIFEST_REQUIRED");
  fields.set(RECEIZ_MATERIAL_MANIFEST_SOURCE_FRAGMENT_KEY, manifestToken);
  for (const segmentUrl of family.segmentUrls) {
    const segmentFields = assertKnownFragmentFields(new URL(segmentUrl));
    const segmentToken = segmentFields.get(RECEIZ_MATERIAL_SEGMENT_SOURCE_FRAGMENT_KEY);
    if (!segmentToken) fail("RECEIZ_MATERIAL_SOURCE_SEGMENT_REQUIRED");
    fields.append(RECEIZ_MATERIAL_SEGMENT_SOURCE_FRAGMENT_KEY, segmentToken);
  }
  url.hash = fields.toString();
  return url.toString();
}

async function inspectMaterialSourceLocators(input: Readonly<{
  headUrl: string;
  sourceUrls: readonly string[];
}>): Promise<Readonly<{
  manifest: ReceizMaterialCompositeManifest;
  segmentTokens: ReadonlyMap<number, string>;
}>> {
  if (!input || typeof input !== "object" || typeof input.headUrl !== "string"
    || !Array.isArray(input.sourceUrls)) fail("RECEIZ_MATERIAL_SOURCE_FAMILY_INPUT_INVALID");
  const head = new URL(input.headUrl, "https://receiz.com");
  const headFields = assertKnownFragmentFields(head);
  const materialTokens = headFields.getAll("material");
  if (materialTokens.length !== 1) fail("RECEIZ_MATERIAL_SOURCE_HEAD_INVALID");
  const packageDigest = readReceizMaterialCompositePackageDigest(materialTokens[0]!);
  if (!packageDigest) fail("RECEIZ_MATERIAL_SOURCE_HEAD_INVALID");

  let manifestToken: string | null = null;
  const segmentTokens = new Map<number, string>();
  const locatorUrls = [input.headUrl, ...input.sourceUrls];
  for (const locator of locatorUrls) {
    const fields = assertKnownFragmentFields(new URL(locator, "https://receiz.com"));
    for (const token of fields.getAll(RECEIZ_MATERIAL_MANIFEST_SOURCE_FRAGMENT_KEY)) {
      if (manifestToken !== null && manifestToken !== token) {
        fail("RECEIZ_MATERIAL_SOURCE_DUPLICATE_CONFLICT");
      }
      manifestToken = token;
    }
    for (const token of fields.getAll(RECEIZ_MATERIAL_SEGMENT_SOURCE_FRAGMENT_KEY)) {
      const parts = token.split(":");
      if (parts.length !== 5 || parts[0] !== RECEIZ_MATERIAL_SOURCE_TOKEN_PREFIX
        || !INTEGER_RE.test(parts[2]!) || !HEX64_RE.test(parts[3]!)) {
        fail("RECEIZ_MATERIAL_SOURCE_SEGMENT_LOCATOR_INVALID");
      }
      if (parts[1] !== packageDigest) fail("RECEIZ_MATERIAL_SOURCE_PACKAGE_MISMATCH");
      const index = Number(parts[2]);
      if (!Number.isSafeInteger(index)) fail("RECEIZ_MATERIAL_SOURCE_SEGMENT_LOCATOR_INVALID");
      const prior = segmentTokens.get(index);
      if (prior !== undefined && prior !== token) {
        fail("RECEIZ_MATERIAL_SOURCE_DUPLICATE_CONFLICT");
      }
      segmentTokens.set(index, token);
    }
  }
  if (manifestToken === null) fail("RECEIZ_MATERIAL_SOURCE_FAMILY_INCOMPLETE");
  const manifestParts = manifestToken.split(":");
  if (manifestParts.length !== 3 || manifestParts[0] !== RECEIZ_MATERIAL_SOURCE_TOKEN_PREFIX
    || !HEX64_RE.test(manifestParts[1]!)) fail("RECEIZ_MATERIAL_SOURCE_MANIFEST_LOCATOR_INVALID");
  if (manifestParts[1] !== packageDigest) fail("RECEIZ_MATERIAL_SOURCE_PACKAGE_MISMATCH");
  const manifestBytes = decodeCanonicalB64u(
    manifestParts[2]!,
    "RECEIZ_MATERIAL_SOURCE_MANIFEST_LOCATOR_INVALID",
  );
  let manifestValue: unknown;
  try {
    manifestValue = JSON.parse(decoder.decode(manifestBytes));
  } catch {
    fail("RECEIZ_MATERIAL_SOURCE_MANIFEST_LOCATOR_INVALID");
  }
  assertClosedManifest(manifestValue);
  if (!sameBytes(manifestBytes, canonicalManifestBytes(manifestValue))) {
    fail("RECEIZ_MATERIAL_SOURCE_MANIFEST_CANONICAL_INVALID");
  }
  const manifest = await verifyReceizMaterialCompositeManifest(manifestValue);
  if (manifest.packageDigest !== packageDigest) fail("RECEIZ_MATERIAL_SOURCE_PACKAGE_MISMATCH");
  const receizHost = head.hostname.toLowerCase() === "receiz.com"
    || head.hostname.toLowerCase() === "www.receiz.com";
  if (receizHost && head.pathname !== manifest.verifyPath) {
    fail("RECEIZ_MATERIAL_SOURCE_ROUTE_BINDING_REJECTED");
  }
  if (segmentTokens.size !== manifest.segmentCount
    || manifest.segments.some((segment) => !segmentTokens.has(segment.index))) {
    fail("RECEIZ_MATERIAL_SOURCE_FAMILY_INCOMPLETE");
  }
  return Object.freeze({ manifest, segmentTokens });
}

export async function openReceizMaterialSourceParts(input: Readonly<{
  headUrl: string;
  sourceUrls: readonly string[];
}>): Promise<ReceizVerifiedMaterialSourceParts> {
  const { manifest, segmentTokens } = await inspectMaterialSourceLocators(input);
  const orderedSegments: ReceizVerifiedMaterialSourceSegment[] = [];
  const capsuleDigest = sha256.create();
  for (const descriptor of manifest.segments) {
    const token = segmentTokens.get(descriptor.index)!;
    const parts = token.split(":");
    if (parts[3] !== descriptor.sha256) {
      fail("RECEIZ_MATERIAL_SOURCE_SEGMENT_DIGEST_MISMATCH");
    }
    const bytes = decodeCanonicalB64u(
      parts[4]!,
      "RECEIZ_MATERIAL_SOURCE_SEGMENT_LOCATOR_INVALID",
    );
    if (bytes.byteLength !== descriptor.byteLength || await sha256Hex(bytes) !== descriptor.sha256) {
      fail("RECEIZ_MATERIAL_SOURCE_SEGMENT_DIGEST_MISMATCH");
    }
    capsuleDigest.update(bytes);
    orderedSegments.push(Object.freeze({
      index: descriptor.index,
      offset: descriptor.offset,
      byteLength: descriptor.byteLength,
      sha256: descriptor.sha256,
      bytes,
    }));
  }
  if (bytesToHex(capsuleDigest.digest()) !== manifest.capsuleSha256) {
    fail("RECEIZ_MATERIAL_SOURCE_CAPSULE_DIGEST_MISMATCH");
  }
  const parts = Object.freeze({
    manifest,
    orderedSegments: Object.freeze(orderedSegments),
  });
  verifiedMaterialSourceParts.add(parts);
  return parts;
}

export async function openReceizMaterialSourceRangeReader(input: Readonly<{
  headUrl: string;
  sourceUrls: readonly string[];
  payloadByteLength: number;
}>): Promise<ReceizMaterialSourceRangeReader> {
  if (!Number.isSafeInteger(input.payloadByteLength) || input.payloadByteLength <= 0) {
    fail("RECEIZ_MATERIAL_SOURCE_PAYLOAD_LENGTH_INVALID");
  }
  const { manifest, segmentTokens } = await inspectMaterialSourceLocators(input);
  if (manifest.capsuleEncoding !== "rma3/raw") {
    fail("RECEIZ_MATERIAL_SOURCE_RAW_CAPSULE_REQUIRED");
  }

  const decodedSegments = new Map<number, Promise<Uint8Array>>();
  const readSegment = (index: number): Promise<Uint8Array> => {
    const held = decodedSegments.get(index);
    if (held) return held;
    const descriptor = manifest.segments[index];
    const token = segmentTokens.get(index);
    const reading = (async () => {
      if (!descriptor || !token) fail("RECEIZ_MATERIAL_SOURCE_FAMILY_INCOMPLETE");
      const parts = token.split(":");
      if (parts.length !== 5 || parts[2] !== String(index) || parts[3] !== descriptor.sha256) {
        fail("RECEIZ_MATERIAL_SOURCE_SEGMENT_DIGEST_MISMATCH");
      }
      const bytes = decodeCanonicalB64u(
        parts[4]!,
        "RECEIZ_MATERIAL_SOURCE_SEGMENT_LOCATOR_INVALID",
      );
      if (bytes.byteLength !== descriptor.byteLength
        || await sha256Hex(bytes) !== descriptor.sha256) {
        fail("RECEIZ_MATERIAL_SOURCE_SEGMENT_DIGEST_MISMATCH");
      }
      return bytes;
    })();
    decodedSegments.set(index, reading);
    void reading.catch(() => decodedSegments.delete(index));
    return reading;
  };

  const firstSegment = await readSegment(0);
  const header = readRawCapsuleHeader(firstSegment);
  if (header.exactArtifactByteLength !== manifest.sealedArtifactByteLength
    || header.filename !== manifest.sealedFilename
    || header.mimeType !== manifest.sealedMimeType
    || input.payloadByteLength > header.exactArtifactByteLength) {
    fail("RECEIZ_MATERIAL_SOURCE_RAW_CAPSULE_BINDING_INVALID");
  }

  return Object.freeze({
    manifest,
    payloadByteLength: input.payloadByteLength,
    progressiveLedger: manifest.materialProgressiveLedger ?? null,
    async readPayloadRange(rangeInput: Readonly<{ offset: number; byteLength: number }>) {
      if (!Number.isSafeInteger(rangeInput.offset) || rangeInput.offset < 0
        || !Number.isSafeInteger(rangeInput.byteLength) || rangeInput.byteLength <= 0
        || rangeInput.offset + rangeInput.byteLength > input.payloadByteLength) {
        fail("RECEIZ_MATERIAL_SOURCE_PAYLOAD_RANGE_INVALID");
      }
      const capsuleStart = header.exactArtifactOffset + rangeInput.offset;
      const capsuleEnd = capsuleStart + rangeInput.byteLength;
      const output = new Uint8Array(rangeInput.byteLength);
      let outputOffset = 0;
      for (const descriptor of manifest.segments) {
        const segmentStart = descriptor.offset;
        const segmentEnd = descriptor.offset + descriptor.byteLength;
        const overlapStart = Math.max(segmentStart, capsuleStart);
        const overlapEnd = Math.min(segmentEnd, capsuleEnd);
        if (overlapStart >= overlapEnd) continue;
        const bytes = await readSegment(descriptor.index);
        const slice = bytes.subarray(overlapStart - segmentStart, overlapEnd - segmentStart);
        output.set(slice, outputOffset);
        outputOffset += slice.byteLength;
      }
      if (outputOffset !== output.byteLength) fail("RECEIZ_MATERIAL_SOURCE_FAMILY_INCOMPLETE");
      return output;
    },
    authority: Object.freeze({
      readerIsProofAuthority: false as const,
      rangeProofRequired: true as const,
      strongerTruth: "sealed-receiz-proof-object" as const,
    }),
  });
}

export function createReceizRawMaterialCapsuleBlobFromSourceParts(
  parts: ReceizVerifiedMaterialSourceParts,
): ReceizRawMaterialCapsuleBlobProjection {
  if (parts === null || typeof parts !== "object" || !verifiedMaterialSourceParts.has(parts)) {
    fail("RECEIZ_MATERIAL_SOURCE_PARTS_NOT_VERIFIED");
  }
  if (parts.manifest.capsuleEncoding !== "rma3/raw") {
    fail("RECEIZ_MATERIAL_SOURCE_RAW_CAPSULE_REQUIRED");
  }
  verifyOrderedSourcePartsSync(parts);
  const firstSegment = parts.orderedSegments[0];
  if (!firstSegment) fail("RECEIZ_MATERIAL_SOURCE_FAMILY_INCOMPLETE");
  const header = readRawCapsuleHeader(firstSegment.bytes);
  if (header.exactArtifactByteLength !== parts.manifest.sealedArtifactByteLength
    || header.filename !== parts.manifest.sealedFilename
    || header.mimeType !== parts.manifest.sealedMimeType
    || header.exactArtifactOffset + header.exactArtifactByteLength
      !== parts.manifest.capsuleByteLength) {
    fail("RECEIZ_MATERIAL_SOURCE_RAW_CAPSULE_BINDING_INVALID");
  }

  const exactArtifactDigest = sha256.create();
  const artifactStart = header.exactArtifactOffset;
  const artifactEnd = artifactStart + header.exactArtifactByteLength;
  for (const segment of parts.orderedSegments) {
    const segmentStart = segment.offset;
    const segmentEnd = segment.offset + segment.byteLength;
    const overlapStart = Math.max(segmentStart, artifactStart);
    const overlapEnd = Math.min(segmentEnd, artifactEnd);
    if (overlapStart < overlapEnd) {
      exactArtifactDigest.update(segment.bytes.subarray(
        overlapStart - segmentStart,
        overlapEnd - segmentStart,
      ));
    }
  }
  if (bytesToHex(exactArtifactDigest.digest()) !== parts.manifest.sealedArtifactSha256) {
    fail("RECEIZ_MATERIAL_SOURCE_RAW_ARTIFACT_DIGEST_MISMATCH");
  }

  const capsuleBlob = new Blob(verifiedSegmentBlobParts(parts.orderedSegments), {
    type: "application/vnd.receiz.material-capsule",
  });
  if (capsuleBlob.size !== parts.manifest.capsuleByteLength) {
    fail("RECEIZ_MATERIAL_SOURCE_RAW_CAPSULE_LENGTH_INVALID");
  }
  const exactArtifactBlob = capsuleBlob.slice(artifactStart, artifactEnd, header.mimeType);
  if (exactArtifactBlob.size !== header.exactArtifactByteLength) {
    fail("RECEIZ_MATERIAL_SOURCE_RAW_CAPSULE_LENGTH_INVALID");
  }
  return Object.freeze({
    capsuleBlob,
    exactArtifactBlob,
    filename: header.filename,
    mimeType: header.mimeType,
  });
}

/** Projects an RMA3 raw capsule only after binding it to its verified manifest. */
export function decodeReceizRawMaterialCapsuleBytes(input: Readonly<{
  capsuleBytes: Uint8Array;
  manifest: ReceizMaterialCompositeManifest;
}>): ReceizRawMaterialCapsuleProjection {
  if (input.manifest.capsuleEncoding !== "rma3/raw") {
    fail("RECEIZ_MATERIAL_SOURCE_RAW_CAPSULE_REQUIRED");
  }
  const capsuleBytes = input.capsuleBytes;
  if (capsuleBytes.byteLength !== input.manifest.capsuleByteLength
    || bytesToHex(sha256(capsuleBytes)) !== input.manifest.capsuleSha256) {
    fail("RECEIZ_MATERIAL_SOURCE_CAPSULE_DIGEST_MISMATCH");
  }
  const header = readRawCapsuleHeader(capsuleBytes);
  const artifactEnd = header.exactArtifactOffset + header.exactArtifactByteLength;
  if (header.exactArtifactByteLength !== input.manifest.sealedArtifactByteLength
    || header.filename !== input.manifest.sealedFilename
    || header.mimeType !== input.manifest.sealedMimeType
    || artifactEnd !== capsuleBytes.byteLength) {
    fail("RECEIZ_MATERIAL_SOURCE_RAW_CAPSULE_BINDING_INVALID");
  }
  const exactArtifactBytes = capsuleBytes.slice(header.exactArtifactOffset, artifactEnd);
  if (bytesToHex(sha256(exactArtifactBytes)) !== input.manifest.sealedArtifactSha256) {
    fail("RECEIZ_MATERIAL_SOURCE_RAW_ARTIFACT_DIGEST_MISMATCH");
  }
  return Object.freeze({
    exactArtifactBytes,
    filename: header.filename,
    mimeType: header.mimeType,
  });
}

export async function resolveReceizMaterialCompositeFromSources(input: Readonly<{
  headUrl: string;
  sourceUrls: readonly string[];
}>): Promise<Readonly<{
  manifest: ReceizMaterialCompositeManifest;
  capsuleBytes: Uint8Array;
}>> {
  const parts = await openReceizMaterialSourceParts(input);
  const capsuleBytes = await reconstructReceizMaterialCompositeCapsule({
    manifest: parts.manifest,
    resolveSegment: async (segment) => parts.orderedSegments[segment.index]!.bytes,
  });
  return Object.freeze({ manifest: parts.manifest, capsuleBytes });
}
