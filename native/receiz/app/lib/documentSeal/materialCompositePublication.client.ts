"use client";

import type { BuiltReceizMaterialCompositeBlobTransport, BuiltReceizMaterialCompositeTransport, ReceizMaterialCompositeBlobProgress, ReceizMaterialCompositeManifest } from "@/app/lib/documentSeal/materialCompositeTransport";
import { assertReceizMaterialCompositeHeadUrl, buildReceizMaterialCompositeBlobTransport, buildReceizMaterialCompositeTransport, reconstructReceizMaterialCompositeCapsule, verifyReceizMaterialCompositeManifest } from "@/app/lib/documentSeal/materialCompositeTransport";
import { buildProofBearingReceizVPathFromBundle } from "@/app/lib/documentSeal/proofBearingVLink";
import {
  encodeReceizMaterialCapsuleBytes,
  RECEIZ_MATERIAL_CAPSULE_PREFIX,
  RECEIZ_MATERIAL_FRAGMENT_KEY,
} from "@/app/lib/documentSeal/materialCapsule";
import type { ReceizProofBundle } from "@/app/utils/receizProofBundle";
import { base64UrlEncode, sha256Hex } from "@/app/utils/sha256";
import type { ReceizMaterialProgressiveLedger } from "../../../packages/receiz-sdk/src/materialProgressiveLedger.js";

export const RECEIZ_INLINE_MATERIAL_URL_MAX_CHARS = 16 * 1024;

export async function publishReceizMaterialCompositeTransport(input: Readonly<{
  transport: BuiltReceizMaterialCompositeTransport;
  origin?: string;
  fetcher?: typeof fetch;
  onProgress?: (progress: ReceizMaterialCompositeBlobProgress) => void;
}>): Promise<string> {
  const fetcher = input.fetcher ?? fetch;
  const origin = (input.origin ?? "https://receiz.com").replace(/\/+$/, "");
  const init = await fetcher(`${origin}/api/proof-material/packages/init`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ manifest: input.transport.manifest }),
    cache: "no-store",
    credentials: "omit",
  });
  const initialized = await init.json() as {
    ok?: boolean;
    publicationId?: string;
    uploads?: readonly Readonly<{ index: number; signedUrl: string; byteLength: number; sha256: string }>[];
  };
  if (!init.ok || !initialized.ok || !initialized.publicationId || !initialized.uploads) {
    throw new Error("RECEIZ_MATERIAL_COMPOSITE_PUBLICATION_INIT_FAILED");
  }
  let uploadedBytes = 0;
  const totalBytes = input.transport.segments.reduce((sum, segment) => sum + segment.byteLength, 0);
  for (const upload of initialized.uploads) {
    const segment = input.transport.segments[upload.index];
    if (!segment || segment.byteLength !== upload.byteLength) throw new Error("RECEIZ_MATERIAL_COMPOSITE_PUBLICATION_PLAN_INVALID");
    const response = await fetcher(upload.signedUrl, {
      method: "PUT",
      headers: { "content-type": "application/octet-stream" },
      body: Uint8Array.from(segment).buffer,
      cache: "no-store",
      credentials: "omit",
    });
    if (!response.ok) throw new Error("RECEIZ_MATERIAL_COMPOSITE_SEGMENT_UPLOAD_FAILED");
    uploadedBytes += segment.byteLength;
    input.onProgress?.(Object.freeze({ loadedBytes: uploadedBytes, totalBytes }));
  }
  const finalize = await fetcher(`${origin}/api/proof-material/packages/finalize`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ publicationId: initialized.publicationId, manifest: input.transport.manifest }),
    cache: "no-store",
    credentials: "omit",
  });
  const finalized = await finalize.json() as { ok?: boolean; materialToken?: string };
  if (!finalize.ok || !finalized.ok || finalized.materialToken !== input.transport.token) {
    throw new Error("RECEIZ_MATERIAL_COMPOSITE_PUBLICATION_FINALIZE_FAILED");
  }
  return finalized.materialToken;
}

export async function publishReceizMaterialCompositeBlobTransport(input: Readonly<{
  transport: BuiltReceizMaterialCompositeBlobTransport;
  origin?: string;
  fetcher?: typeof fetch;
  onProgress?: (progress: ReceizMaterialCompositeBlobProgress) => void;
}>): Promise<string> {
  const fetcher = input.fetcher ?? fetch;
  const origin = (input.origin ?? "https://receiz.com").replace(/\/+$/, "");
  const init = await fetcher(`${origin}/api/proof-material/packages/init`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ manifest: input.transport.manifest }),
    cache: "no-store",
    credentials: "omit",
  });
  const initialized = await init.json() as {
    ok?: boolean;
    publicationId?: string;
    uploads?: readonly Readonly<{ index: number; signedUrl: string; byteLength: number; sha256: string }>[];
  };
  if (!init.ok || !initialized.ok || !initialized.publicationId || !initialized.uploads) {
    throw new Error("RECEIZ_MATERIAL_COMPOSITE_PUBLICATION_INIT_FAILED");
  }
  let uploadedBytes = 0;
  for (const upload of initialized.uploads) {
    const descriptor = input.transport.manifest.segments[upload.index];
    if (
      !descriptor
      || descriptor.byteLength !== upload.byteLength
      || descriptor.sha256 !== upload.sha256
    ) {
      throw new Error("RECEIZ_MATERIAL_COMPOSITE_PUBLICATION_PLAN_INVALID");
    }
    const segment = input.transport.capsuleBlob.slice(
      descriptor.offset,
      descriptor.offset + descriptor.byteLength,
      "application/octet-stream",
    );
    const response = await fetcher(upload.signedUrl, {
      method: "PUT",
      headers: { "content-type": "application/octet-stream" },
      body: segment,
      cache: "no-store",
      credentials: "omit",
    });
    if (!response.ok) throw new Error("RECEIZ_MATERIAL_COMPOSITE_SEGMENT_UPLOAD_FAILED");
    uploadedBytes += segment.size;
    input.onProgress?.(Object.freeze({
      loadedBytes: uploadedBytes,
      totalBytes: input.transport.capsuleBlob.size,
    }));
  }
  const finalize = await fetcher(`${origin}/api/proof-material/packages/finalize`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ publicationId: initialized.publicationId, manifest: input.transport.manifest }),
    cache: "no-store",
    credentials: "omit",
  });
  const finalized = await finalize.json() as { ok?: boolean; materialToken?: string };
  if (!finalize.ok || !finalized.ok || finalized.materialToken !== input.transport.token) {
    throw new Error("RECEIZ_MATERIAL_COMPOSITE_PUBLICATION_FINALIZE_FAILED");
  }
  return finalized.materialToken;
}

export async function resolveReceizMaterialCompositeTransport(input: Readonly<{
  packageDigest: string;
  origin?: string;
  fetcher?: typeof fetch;
}>): Promise<Readonly<{ manifest: ReceizMaterialCompositeManifest; capsuleBytes: Uint8Array }>> {
  const fetcher = input.fetcher ?? fetch;
  const origin = (input.origin ?? "https://receiz.com").replace(/\/+$/, "");
  const response = await fetcher(`${origin}/api/proof-material/packages/${input.packageDigest}/manifest`, {
    cache: "force-cache",
    credentials: "omit",
  });
  if (!response.ok) throw new Error("RECEIZ_MATERIAL_COMPOSITE_MANIFEST_UNAVAILABLE");
  const manifest = await verifyReceizMaterialCompositeManifest(await response.json());
  if (manifest.packageDigest !== input.packageDigest) throw new Error("RECEIZ_MATERIAL_COMPOSITE_PACKAGE_MISMATCH");
  const capsuleBytes = await reconstructReceizMaterialCompositeCapsule({
    manifest,
    resolveSegment: async (segment) => {
      const segmentResponse = await fetcher(
        `${origin}/api/proof-material/packages/${manifest.packageDigest}/segments/${segment.index}?sha256=${segment.sha256}`,
        { cache: "force-cache", credentials: "omit" },
      );
      if (!segmentResponse.ok) throw new Error("RECEIZ_MATERIAL_COMPOSITE_SEGMENT_UNAVAILABLE");
      return new Uint8Array(await segmentResponse.arrayBuffer());
    },
  });
  return Object.freeze({ manifest, capsuleBytes });
}

/**
 * Produces the canonical material proof URL. Small payloads remain completely
 * inline; larger payloads publish deterministic proof-object append segments
 * and carry only the composite head. In both cases the sealed artifact remains authority.
 */
export async function buildReceizPublishedMaterialVUrl(input: Readonly<{
  exactArtifactBytes: Uint8Array;
  filename: string;
  mimeType: string;
  proofBundle: ReceizProofBundle;
  publicOrigin?: string;
  publicationOrigin?: string;
  predecessorPackageDigest?: string | null;
  onProgress?: (progress: ReceizMaterialCompositeBlobProgress) => void;
}>): Promise<string> {
  const publicOrigin = input.publicOrigin ?? "https://receiz.com";
  const capsuleBytes = encodeReceizMaterialCapsuleBytes({
    exactArtifactBytes: input.exactArtifactBytes,
    filename: input.filename,
    mimeType: input.mimeType,
  });
  const proofPath = buildProofBearingReceizVPathFromBundle(input.proofBundle);
  const inlineUrl = new URL(proofPath, publicOrigin);
  inlineUrl.hash = new URLSearchParams({
    [RECEIZ_MATERIAL_FRAGMENT_KEY]: `${RECEIZ_MATERIAL_CAPSULE_PREFIX}${base64UrlEncode(capsuleBytes)}`,
  }).toString();
  if (inlineUrl.toString().length <= RECEIZ_INLINE_MATERIAL_URL_MAX_CHARS) {
    input.onProgress?.({ loadedBytes: 1, totalBytes: 1 });
    return inlineUrl.toString();
  }

  const pulse = String(input.proofBundle.kaiPulseEternal);
  const rawUpulse = (input.proofBundle as Record<string, unknown>).kaiUPulse
    ?? (input.proofBundle as Record<string, unknown>).kaiUpulse
    ?? (input.proofBundle as Record<string, unknown>).issuedAtKaiUPulse;
  const uPulse = typeof rawUpulse === "string" || typeof rawUpulse === "number"
    ? String(rawUpulse)
    : String(BigInt(pulse) * 1_000_000n);
  const transport = await buildReceizMaterialCompositeTransport({
    capsuleBytes,
    sealedArtifactSha256: await sha256Hex(input.exactArtifactBytes),
    sealedArtifactByteLength: input.exactArtifactBytes.byteLength,
    sealedFilename: input.filename,
    sealedMimeType: input.mimeType,
    verifyPath: input.proofBundle.verifyPath,
    issuedAtKaiPulse: pulse,
    issuedAtKaiUPulse: uPulse,
    predecessorPackageDigest: input.predecessorPackageDigest,
    onProgress: input.onProgress
      ? ({ loadedBytes, totalBytes }) => input.onProgress?.({
          loadedBytes,
          totalBytes: totalBytes * 2,
        })
      : undefined,
  });
  const materialToken = await publishReceizMaterialCompositeTransport({
    transport,
    origin: input.publicationOrigin ?? "https://receiz.com",
    onProgress: input.onProgress
      ? ({ loadedBytes, totalBytes }) => input.onProgress?.({
          loadedBytes: totalBytes + loadedBytes,
          totalBytes: totalBytes * 2,
        })
      : undefined,
  });
  const url = new URL(proofPath, publicOrigin);
  url.hash = new URLSearchParams({ material: materialToken }).toString();
  input.onProgress?.({ loadedBytes: 1, totalBytes: 1 });
  return assertReceizMaterialCompositeHeadUrl(url.toString());
}

export async function buildReceizPublishedMaterialVUrlFromBlob(input: Readonly<{
  exactArtifactBlob: Blob;
  filename: string;
  mimeType: string;
  proofBundle: ReceizProofBundle;
  publicOrigin?: string;
  publicationOrigin?: string;
  predecessorPackageDigest?: string | null;
  materialProgressiveLedger?: ReceizMaterialProgressiveLedger;
  onProgress?: (progress: ReceizMaterialCompositeBlobProgress) => void;
}>): Promise<Readonly<{
  proofObjectUrl: string;
  sealedArtifactSha256Hex: string;
}>> {
  const publicOrigin = input.publicOrigin ?? "https://receiz.com";
  const pulse = String(input.proofBundle.kaiPulseEternal);
  const rawUpulse = (input.proofBundle as Record<string, unknown>).kaiUPulse
    ?? (input.proofBundle as Record<string, unknown>).kaiUpulse
    ?? (input.proofBundle as Record<string, unknown>).issuedAtKaiUPulse;
  const uPulse = typeof rawUpulse === "string" || typeof rawUpulse === "number"
    ? String(rawUpulse)
    : String(BigInt(pulse) * 1_000_000n);
  const transport = await buildReceizMaterialCompositeBlobTransport({
    exactArtifactBlob: input.exactArtifactBlob,
    sealedFilename: input.filename,
    sealedMimeType: input.mimeType,
    verifyPath: input.proofBundle.verifyPath,
    issuedAtKaiPulse: pulse,
    issuedAtKaiUPulse: uPulse,
    predecessorPackageDigest: input.predecessorPackageDigest,
    materialProgressiveLedger: input.materialProgressiveLedger,
    onProgress: input.onProgress
      ? ({ loadedBytes, totalBytes }) => input.onProgress?.({
          loadedBytes,
          totalBytes: totalBytes * 2,
        })
      : undefined,
  });
  const materialToken = await publishReceizMaterialCompositeBlobTransport({
    transport,
    origin: input.publicationOrigin ?? "https://receiz.com",
    onProgress: input.onProgress
      ? ({ loadedBytes, totalBytes }) => input.onProgress?.({
          loadedBytes: totalBytes + loadedBytes,
          totalBytes: totalBytes * 2,
        })
      : undefined,
  });
  const proofPath = buildProofBearingReceizVPathFromBundle(input.proofBundle);
  const url = new URL(proofPath, publicOrigin);
  url.hash = new URLSearchParams({ material: materialToken }).toString();
  return Object.freeze({
    proofObjectUrl: assertReceizMaterialCompositeHeadUrl(url.toString()),
    sealedArtifactSha256Hex: transport.manifest.sealedArtifactSha256,
  });
}
