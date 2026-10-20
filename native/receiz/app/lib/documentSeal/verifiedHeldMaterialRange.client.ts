"use client";

import { inspectReceizMaterialProgressiveCapability } from "@/app/lib/documentSeal/materialProgressiveCapability";
import { decodeCompactReceizProofTokenAsync } from "@/app/lib/documentSeal/proofBearingVLink";
import {
  createVerifiedMaterialRangeSource,
  type VerifiedMaterialRangeSource,
} from "@/app/lib/documentSeal/verifiedMaterialRangeSource.client";
import {
  verifyReceizBundleSignatureV4,
  type ReceizSignatureV4RootPublicKey,
} from "@/app/lib/security/receizSignatureV4";
import {
  openReceizMaterialSourceRangeReader,
  type ReceizMaterialCompositeManifest,
} from "../../../packages/receiz-sdk/src/index.js";
import { openHeldReceizMaterialSourceRangeReader } from "@/app/lib/documentSeal/materialSourceCustody.client";

export type VerifiedHeldMaterialRangeProjection = Readonly<{
  manifest: ReceizMaterialCompositeManifest;
  rangeSource: VerifiedMaterialRangeSource;
  capability: Extract<
    ReturnType<typeof inspectReceizMaterialProgressiveCapability>,
    Readonly<{ mode: "signed-ranges" }>
  >;
  payloadFilename: string;
  payloadMimeType: string;
  payloadByteLength: number;
  payloadSha256: string;
  authority: Readonly<{
    projectionIsProofAuthority: false;
    strongerTruth: "sealed-receiz-proof-object";
  }>;
}>;

const HELD_RANGE_AUTHORITY = Object.freeze({
  projectionIsProofAuthority: false as const,
  strongerTruth: "sealed-receiz-proof-object" as const,
});

function routeCoordinates(pathname: string): Readonly<{
  slug: string;
  code: string;
  pulse: string;
}> | null {
  const match = pathname.match(/^\/v\/([^/]+)\/([^/]+)\/([^/]+)\/?$/u);
  if (!match) return null;
  return Object.freeze({
    slug: decodeURIComponent(match[1]!),
    code: decodeURIComponent(match[2]!),
    pulse: decodeURIComponent(match[3]!),
  });
}

function payloadFilenameFromManifest(sealedFilename: string): string {
  const normalized = sealedFilename.trim();
  return normalized.replace(/\.receized(?=\.[^.]+$)/iu, "") || normalized;
}

/**
 * Opens the authenticated progressive append before whole-artifact settlement.
 * Signature V4 admits the exact range ledger; every returned byte must then
 * satisfy that ledger. Full sealed-artifact verification remains the stronger
 * settlement path and can continue independently in the background.
 */
export async function openVerifiedHeldMaterialRange(input: Readonly<{
  headUrl: string;
  sourceUrls: readonly string[];
  signatureV4RootPublicKeys: ReadonlyMap<string, ReceizSignatureV4RootPublicKey>;
}>): Promise<VerifiedHeldMaterialRangeProjection> {
  const head = new URL(input.headUrl, "https://receiz.com");
  const coordinates = routeCoordinates(head.pathname);
  const compactToken = head.searchParams.get("c");
  if (!coordinates || !compactToken) {
    throw new TypeError("RECEIZ_HELD_MATERIAL_RANGE_PROOF_REQUIRED");
  }
  const proofBundle = await decodeCompactReceizProofTokenAsync(compactToken, coordinates);
  if (!proofBundle || proofBundle.verifyPath !== head.pathname) {
    throw new TypeError("RECEIZ_HELD_MATERIAL_RANGE_ROUTE_BINDING_REJECTED");
  }
  const signature = await verifyReceizBundleSignatureV4({
    bundle: proofBundle,
    rootPublicKeys: input.signatureV4RootPublicKeys,
  });
  if (signature.state !== "verified") {
    throw new TypeError("RECEIZ_HELD_MATERIAL_RANGE_SIGNATURE_REJECTED");
  }

  const nativePayload = proofBundle.nativeRecordSeal?.payload;
  const capture = proofBundle.nativeCapture as Readonly<Record<string, unknown>> | undefined;
  const progressive = capture?.materialProgressive as Readonly<Record<string, unknown>> | undefined;
  const progressiveMime = typeof progressive?.mimeType === "string"
    ? progressive.mimeType.trim().toLowerCase()
    : "";
  const payloadMimeType = nativePayload?.mimeType?.trim().toLowerCase() || progressiveMime;
  const capability = inspectReceizMaterialProgressiveCapability({
    proofBundle,
    payloadMimeType,
  });
  const signedArtifactBasis = typeof proofBundle.artifactSha256Basis === "string"
    ? proofBundle.artifactSha256Basis.trim().toLowerCase()
    : "";
  if (capability.mode !== "signed-ranges"
    || capability.payloadSha256 !== signedArtifactBasis
    || (nativePayload !== undefined && (
      nativePayload.sha256 !== capability.payloadSha256
      || nativePayload.mimeType.trim().toLowerCase() !== payloadMimeType
    ))) {
    throw new TypeError("RECEIZ_HELD_MATERIAL_SIGNED_RANGES_REQUIRED");
  }

  const reader = input.sourceUrls.length === 0
    ? await openHeldReceizMaterialSourceRangeReader({
        headUrl: input.headUrl,
        payloadByteLength: capability.byteLength,
      }) ?? await openReceizMaterialSourceRangeReader({
        headUrl: input.headUrl,
        sourceUrls: input.sourceUrls,
        payloadByteLength: capability.byteLength,
      })
    : await openReceizMaterialSourceRangeReader({
        headUrl: input.headUrl,
        sourceUrls: input.sourceUrls,
        payloadByteLength: capability.byteLength,
      });
  if (reader.manifest.sealedMimeType.trim().toLowerCase() !== payloadMimeType) {
    throw new TypeError("RECEIZ_HELD_MATERIAL_RANGE_MIME_BINDING_REJECTED");
  }
  const rangeSource = createVerifiedMaterialRangeSource({ capability, reader });
  const projectedPayloadFilename = nativePayload?.filename.trim()
    || payloadFilenameFromManifest(reader.manifest.sealedFilename);
  if (!projectedPayloadFilename) {
    throw new TypeError("RECEIZ_HELD_MATERIAL_RANGE_FILENAME_BINDING_REJECTED");
  }
  return Object.freeze({
    manifest: reader.manifest,
    rangeSource,
    capability,
    payloadFilename: projectedPayloadFilename,
    payloadMimeType,
    payloadByteLength: capability.byteLength,
    payloadSha256: capability.payloadSha256,
    authority: HELD_RANGE_AUTHORITY,
  });
}
