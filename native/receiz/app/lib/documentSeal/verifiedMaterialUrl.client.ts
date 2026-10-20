"use client";

import { decodeCompactReceizProofTokenAsync } from "@/app/lib/documentSeal/proofBearingVLink";
import { decodeReceizMaterialCapsule, RECEIZ_MATERIAL_FRAGMENT_KEY, type ReceizMaterialCapsule } from "@/app/lib/documentSeal/materialCapsule";
import {
  projectVerifiedMaterialPayload,
  type VerifiedMaterialCarrierKind,
} from "@/app/lib/documentSeal/verifiedMaterialProjection";
import { verifyReceizDocumentBytes } from "@/app/lib/receizArtifactVerifier";
import { pinnedReceizSignatureV4RootPublicKeysForClient } from "@/app/lib/security/receizSignatureV4Pinned";
import { coerceReceizProofBundle, type ReceizProofBundle } from "@/app/utils/receizProofBundle";
import { sha256Hex } from "@/app/utils/sha256";

export type VerifiedReceizMaterialUrlProjection = Readonly<{
  exactSealedArtifactBytes: Uint8Array;
  sealedFilename: string;
  sealedMimeType: string;
  sealedArtifactSha256: string;
  payloadBytes: Uint8Array;
  payloadFilename: string;
  payloadMimeType: string;
  payloadSha256: string;
}>;

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

function sameProofAuthority(
  left: ReceizProofBundle,
  right: ReceizProofBundle,
): boolean {
  return left.slug === right.slug
    && left.code === right.code
    && left.kaiPulseEternal === right.kaiPulseEternal
    && left.verifyPath === right.verifyPath
    && left.artifactSha256Basis === right.artifactSha256Basis
    && left.receizClaimId === right.receizClaimId
    && left.signatureV4?.payloadHashSha256 === right.signatureV4?.payloadHashSha256;
}

/**
 * Opens a self-contained material URL by verifying the enclosing sealed proof
 * object first. Route and capsule data are transport only; payload projection
 * is admitted only beneath canonical artifact verification.
 */
export async function openVerifiedReceizMaterialUrl(
  materialUrl: string,
): Promise<VerifiedReceizMaterialUrlProjection> {
  const url = new URL(materialUrl, "https://receiz.com");
  const token = new URLSearchParams(url.hash.startsWith("#") ? url.hash.slice(1) : url.hash)
    .get(RECEIZ_MATERIAL_FRAGMENT_KEY);
  if (!token) throw new TypeError("RECEIZ_MATERIAL_URL_CAPSULE_REQUIRED");
  const capsule = decodeReceizMaterialCapsule(token);
  return openVerifiedReceizMaterialCapsuleUrl(materialUrl, capsule);
}

/** Opens already reconstructed URL-payload bytes beneath the same native artifact verifier. */
export async function openVerifiedReceizMaterialCapsuleUrl(
  materialUrl: string,
  capsule: ReceizMaterialCapsule,
): Promise<VerifiedReceizMaterialUrlProjection> {
  const url = new URL(materialUrl, "https://receiz.com");
  const coordinates = routeCoordinates(url.pathname);
  const compactToken = url.searchParams.get("c");
  if (!coordinates || !compactToken) {
    throw new TypeError("RECEIZ_MATERIAL_URL_PROOF_REQUIRED");
  }

  const verification = await verifyReceizDocumentBytes({
    fileBytes: capsule.exactArtifactBytes,
    filename: capsule.filename,
    mime: capsule.mimeType,
    signatureV4RootPublicKeys: pinnedReceizSignatureV4RootPublicKeysForClient(),
  });
  if (!verification.ok || !verification.integrity?.ok || !verification.bundle) {
    throw new TypeError("RECEIZ_MATERIAL_URL_ARTIFACT_REJECTED");
  }
  const artifactProofBundle = coerceReceizProofBundle(
    verification.bundle,
  );
  if (!artifactProofBundle) {
    throw new TypeError("RECEIZ_MATERIAL_URL_PROOF_REQUIRED");
  }
  const compactBundle = await decodeCompactReceizProofTokenAsync(
    compactToken,
    coordinates,
  );
  if (!compactBundle || !sameProofAuthority(artifactProofBundle, compactBundle)) {
    throw new TypeError("RECEIZ_MATERIAL_URL_ROUTE_BINDING_REJECTED");
  }
  const payloadBinding = artifactProofBundle.artifactSha256Basis?.trim().toLowerCase() ?? "";
  if (!/^[0-9a-f]{64}$/.test(payloadBinding)) {
    throw new TypeError("RECEIZ_MATERIAL_URL_PAYLOAD_BINDING_REQUIRED");
  }
  const carrierKind = verification.kind as VerifiedMaterialCarrierKind;
  if (!["bundle", "png", "pdf", "heic-box", "trailer"].includes(carrierKind)) {
    throw new TypeError("RECEIZ_MATERIAL_URL_PAYLOAD_UNAVAILABLE");
  }
  const projected = await projectVerifiedMaterialPayload({
    exactArtifactBytes: capsule.exactArtifactBytes,
    sealedFilename: capsule.filename,
    mimeType: capsule.mimeType,
    carrierKind,
    expectedPayloadSha256: payloadBinding,
  });
  return Object.freeze({
    exactSealedArtifactBytes: capsule.exactArtifactBytes.slice(),
    sealedFilename: capsule.filename,
    sealedMimeType: capsule.mimeType,
    sealedArtifactSha256: await sha256Hex(capsule.exactArtifactBytes),
    payloadBytes: projected.bytes.slice(),
    payloadFilename: projected.filename,
    payloadMimeType: projected.mimeType,
    payloadSha256: projected.sha256,
  });
}
