"use client";

import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";

import { decodeCompactReceizProofTokenAsync } from "@/app/lib/documentSeal/proofBearingVLink";
import {
  inspectReceizMaterialProgressiveCapability,
  type ReceizMaterialProgressiveCapability,
} from "@/app/lib/documentSeal/materialProgressiveCapability";
import { RECEIZ_TRAILER_PREFIX, RECEIZ_TRAILER_SUFFIX } from "@/app/lib/documentSeal/trailerProof";
import type { ReceizSignatureV4RootPublicKey } from "@/app/lib/security/receizSignatureV4";
import { coerceReceizProofBundle, type ReceizProofBundle } from "@/app/utils/receizProofBundle";
import {
  createReceizRawMaterialCapsuleBlobFromSourceParts,
  openReceizMaterialSourceParts,
  type ReceizMaterialCompositeManifest,
} from "../../../packages/receiz-sdk/src/index";
import { verifyReceizTrailerFileStreaming } from "../../../packages/receiz-sdk/src/verifier/canonical";
import { openHeldReceizRawMaterialCapsuleBlob } from "@/app/lib/documentSeal/materialSourceCustody.client";

export type VerifiedHeldMaterialBlobProjection = Readonly<{
  manifest: ReceizMaterialCompositeManifest;
  exactSealedArtifactBlob: Blob;
  payloadBlob: Blob;
  sealedFilename: string;
  sealedMimeType: string;
  payloadFilename: string;
  payloadMimeType: string;
  sealedArtifactSha256: string;
  payloadSha256: string;
  progressiveCapability?: ReceizMaterialProgressiveCapability;
  authority: Readonly<{
    projectionIsProofAuthority: false;
    strongerTruth: "sealed-receiz-proof-object";
  }>;
}>;

const VERIFIED_HELD_MATERIAL_AUTHORITY = Object.freeze({
  projectionIsProofAuthority: false as const,
  strongerTruth: "sealed-receiz-proof-object" as const,
});
const verifiedHeldMaterialBlobProjections = new WeakSet<object>();
const TRAILER_PREFIX_BYTES = new TextEncoder().encode(RECEIZ_TRAILER_PREFIX);
const TRAILER_SUFFIX_BYTES = new TextEncoder().encode(RECEIZ_TRAILER_SUFFIX);
const TRAILER_TAIL_BYTES = 4 * 1024 * 1024;
const HASH_CHUNK_BYTES = 1024 * 1024;

function bytesMatchAt(bytes: Uint8Array, pattern: Uint8Array, offset: number): boolean {
  if (offset < 0 || offset + pattern.byteLength > bytes.byteLength) return false;
  return pattern.every((value, index) => bytes[offset + index] === value);
}

function lastPatternIndex(bytes: Uint8Array, pattern: Uint8Array): number {
  for (let offset = bytes.byteLength - pattern.byteLength; offset >= 0; offset -= 1) {
    if (bytesMatchAt(bytes, pattern, offset)) return offset;
  }
  return -1;
}

async function hashBlobRange(blob: Blob, end: number): Promise<string> {
  const hash = sha256.create();
  for (let offset = 0; offset < end; offset += HASH_CHUNK_BYTES) {
    hash.update(new Uint8Array(await blob.slice(
      offset,
      Math.min(end, offset + HASH_CHUNK_BYTES),
    ).arrayBuffer()));
  }
  return bytesToHex(hash.digest());
}

function routeCoordinates(pathname: string): Readonly<{
  slug: string;
  code: string;
  pulse: string;
}> | null {
  const match = pathname.match(/^\/v\/([^/]+)\/([^/]+)\/([^/]+)\/?$/);
  if (!match) return null;
  return Object.freeze({
    slug: decodeURIComponent(match[1]!),
    code: decodeURIComponent(match[2]!),
    pulse: decodeURIComponent(match[3]!),
  });
}

function sameProofAuthority(left: ReceizProofBundle, right: ReceizProofBundle): boolean {
  return left.slug === right.slug
    && left.code === right.code
    && left.kaiPulseEternal === right.kaiPulseEternal
    && left.verifyPath === right.verifyPath
    && left.artifactSha256Basis === right.artifactSha256Basis
    && left.receizClaimId === right.receizClaimId
    && left.signatureV4?.payloadHashSha256 === right.signatureV4?.payloadHashSha256;
}

function payloadFilename(sealedFilename: string): string {
  return sealedFilename.replace(/\.receized(?=\.[^.]+$)/iu, "") || sealedFilename;
}

function brandProjection(
  projection: VerifiedHeldMaterialBlobProjection,
): VerifiedHeldMaterialBlobProjection {
  verifiedHeldMaterialBlobProjections.add(projection);
  return projection;
}

export function isVerifiedHeldMaterialBlobProjection(
  value: unknown,
): value is VerifiedHeldMaterialBlobProjection {
  return value !== null
    && typeof value === "object"
    && verifiedHeldMaterialBlobProjections.has(value);
}

/**
 * Opens a complete held RMA3 family beneath its enclosing Signature V4 proof.
 * The URL family remains transport only; only the verified sealed Blob can
 * project the payload Blob returned to the player.
 */
export async function openVerifiedHeldMaterialBlob(input: Readonly<{
  headUrl: string;
  sourceUrls: readonly string[];
  signatureV4RootPublicKeys: ReadonlyMap<string, ReceizSignatureV4RootPublicKey>;
}>): Promise<VerifiedHeldMaterialBlobProjection> {
  const head = new URL(input.headUrl, "https://receiz.com");
  const coordinates = routeCoordinates(head.pathname);
  const compactToken = head.searchParams.get("c");
  if (!coordinates || !compactToken) {
    throw new TypeError("RECEIZ_HELD_MATERIAL_PROOF_REQUIRED");
  }

  const parts = input.sourceUrls.length === 0
    ? await openHeldReceizRawMaterialCapsuleBlob(input.headUrl)
    : null;
  const urlParts = parts ? null : await openReceizMaterialSourceParts({
    headUrl: input.headUrl,
    sourceUrls: input.sourceUrls,
  });
  const raw = parts ?? createReceizRawMaterialCapsuleBlobFromSourceParts(urlParts!);
  const manifest = parts?.manifest ?? urlParts!.manifest;
  const streamed = await verifyReceizTrailerFileStreaming({
    file: raw.exactArtifactBlob,
    optionalLink: `${head.origin}${head.pathname}`,
    signatureV4RootPublicKeys: input.signatureV4RootPublicKeys,
  });
  if (!streamed.verification.ok
    || !streamed.verification.integrity.ok
    || streamed.verification.kind !== "trailer"
    || !streamed.verification.bundle
    || !streamed.artifactSha256
    || !streamed.payloadSha256
    || streamed.payloadByteLength === null) {
    throw new TypeError("RECEIZ_HELD_MATERIAL_ARTIFACT_REJECTED");
  }
  if (streamed.artifactSha256 !== manifest.sealedArtifactSha256
    || raw.exactArtifactBlob.size !== manifest.sealedArtifactByteLength) {
    throw new TypeError("RECEIZ_HELD_MATERIAL_ARTIFACT_BINDING_REJECTED");
  }

  const artifactProofBundle = coerceReceizProofBundle(streamed.verification.bundle);
  const compactBundle = await decodeCompactReceizProofTokenAsync(compactToken, coordinates);
  if (!artifactProofBundle || !compactBundle
    || !sameProofAuthority(artifactProofBundle, compactBundle)
    || artifactProofBundle.artifactSha256Basis !== streamed.payloadSha256) {
    throw new TypeError("RECEIZ_HELD_MATERIAL_ROUTE_BINDING_REJECTED");
  }

  const nativePayload = artifactProofBundle.nativeRecordSeal?.payload;
  if (nativePayload && (nativePayload.sha256 !== streamed.payloadSha256
    || nativePayload.mimeType !== raw.mimeType)) {
    throw new TypeError("RECEIZ_HELD_MATERIAL_PAYLOAD_BINDING_REJECTED");
  }
  const payloadMimeType = nativePayload?.mimeType ?? raw.mimeType;
  const projectedPayloadFilename = nativePayload?.filename ?? payloadFilename(raw.filename);
  const payloadBlob = raw.exactArtifactBlob.slice(
    0,
    streamed.payloadByteLength,
    payloadMimeType,
  );
  if (payloadBlob.size !== streamed.payloadByteLength) {
    throw new TypeError("RECEIZ_HELD_MATERIAL_PAYLOAD_LENGTH_REJECTED");
  }
  return brandProjection(Object.freeze({
    manifest,
    exactSealedArtifactBlob: raw.exactArtifactBlob,
    payloadBlob,
    sealedFilename: raw.filename,
    sealedMimeType: raw.mimeType,
    payloadFilename: projectedPayloadFilename,
    payloadMimeType,
    sealedArtifactSha256: streamed.artifactSha256,
    payloadSha256: streamed.payloadSha256,
    progressiveCapability: inspectReceizMaterialProgressiveCapability({
      proofBundle: artifactProofBundle,
      payloadMimeType,
    }),
    authority: VERIFIED_HELD_MATERIAL_AUTHORITY,
  }));
}

/**
 * Projects held source bytes already admitted by a stronger profile/showcase
 * proof object. It verifies the exact source family and admitted digests, but
 * deliberately does not re-run settled Signature V4 admission.
 */
export async function openAdmittedHeldMaterialBlob(input: Readonly<{
  headUrl: string;
  sourceUrls: readonly string[];
  expectedSealedArtifactSha256: string;
  expectedPayloadSha256: string;
}>): Promise<VerifiedHeldMaterialBlobProjection> {
  const parts = input.sourceUrls.length === 0
    ? await openHeldReceizRawMaterialCapsuleBlob(input.headUrl)
    : null;
  const urlParts = parts ? null : await openReceizMaterialSourceParts({
    headUrl: input.headUrl,
    sourceUrls: input.sourceUrls,
  });
  const raw = parts ?? createReceizRawMaterialCapsuleBlobFromSourceParts(urlParts!);
  const manifest = parts?.manifest ?? urlParts!.manifest;
  if (manifest.sealedArtifactSha256 !== input.expectedSealedArtifactSha256
    || raw.exactArtifactBlob.size !== manifest.sealedArtifactByteLength) {
    throw new TypeError("RECEIZ_ADMITTED_HELD_MATERIAL_ARTIFACT_BINDING_REJECTED");
  }

  const tailStart = Math.max(0, raw.exactArtifactBlob.size - TRAILER_TAIL_BYTES);
  const tail = new Uint8Array(await raw.exactArtifactBlob.slice(tailStart).arrayBuffer());
  const prefixOffset = lastPatternIndex(tail, TRAILER_PREFIX_BYTES);
  const suffixOffset = tail.byteLength - TRAILER_SUFFIX_BYTES.byteLength;
  if (prefixOffset < 0
    || suffixOffset <= prefixOffset + TRAILER_PREFIX_BYTES.byteLength
    || !bytesMatchAt(tail, TRAILER_SUFFIX_BYTES, suffixOffset)) {
    throw new TypeError("RECEIZ_ADMITTED_HELD_MATERIAL_TRAILER_REJECTED");
  }
  const payloadByteLength = tailStart + prefixOffset;
  const payloadSha256 = await hashBlobRange(raw.exactArtifactBlob, payloadByteLength);
  if (payloadSha256 !== input.expectedPayloadSha256) {
    throw new TypeError("RECEIZ_ADMITTED_HELD_MATERIAL_PAYLOAD_BINDING_REJECTED");
  }
  const payloadBlob = raw.exactArtifactBlob.slice(0, payloadByteLength, raw.mimeType);
  return brandProjection(Object.freeze({
    manifest,
    exactSealedArtifactBlob: raw.exactArtifactBlob,
    payloadBlob,
    sealedFilename: raw.filename,
    sealedMimeType: raw.mimeType,
    payloadFilename: payloadFilename(raw.filename),
    payloadMimeType: raw.mimeType,
    sealedArtifactSha256: manifest.sealedArtifactSha256,
    payloadSha256,
    authority: VERIFIED_HELD_MATERIAL_AUTHORITY,
  }));
}
