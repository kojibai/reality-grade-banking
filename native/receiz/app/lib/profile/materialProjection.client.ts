"use client";

import { useEffect, useLayoutEffect, useState } from "react";

import { detectDocumentFormat } from "@/app/lib/documentSeal/fileFormat";
import { decodeReceizBundleEnvelope } from "@/app/lib/documentSeal/bundleContainer";
import {
  decodeReceizMaterialCapsule,
  decodeReceizMaterialCapsuleBytes,
  type ReceizMaterialCapsule,
} from "@/app/lib/documentSeal/materialCapsule";
import { resolveReceizMaterialCompositeTransport } from "@/app/lib/documentSeal/materialCompositePublication.client";
import {
  hasHeldReceizMaterialSourceFamily,
  readHeldReceizMaterialSourceFamily,
} from "@/app/lib/documentSeal/materialSourceCustody.client";
import {
  carriesReceizHeldMaterialSources,
  decodeReceizRawMaterialCapsuleBytes,
  resolveReceizMaterialCompositeLocalFirst,
} from "@/app/lib/documentSeal/materialSourceFamily.client";
import { readReceizMaterialCompositePackageDigest } from "@/app/lib/documentSeal/materialCompositeTransport";
import { resolveReceizMaterialPresentation } from "@/app/lib/documentSeal/playableUrlCoordinate";
import {
  openAdmittedHeldMaterialBlob,
  openVerifiedHeldMaterialBlob,
  type VerifiedHeldMaterialBlobProjection,
} from "@/app/lib/documentSeal/verifiedHeldMaterialBlob.client";
import { openVerifiedHeldMaterialRange } from "@/app/lib/documentSeal/verifiedHeldMaterialRange.client";
import { createVerifiedMaterialRangePlaybackResource } from "@/app/lib/documentSeal/verifiedMaterialPlayback.client";
import {
  projectVerifiedMaterialPayload,
  readSealedMaterialPayloadBinding,
  type VerifiedMaterialCarrierKind,
} from "@/app/lib/documentSeal/verifiedMaterialProjection";
import {
  openVerifiedReceizMaterialCapsuleUrl,
  openVerifiedReceizMaterialUrl,
} from "@/app/lib/documentSeal/verifiedMaterialUrl.client";
import { verifyAndExtractReceizDocumentBytes } from "@/app/lib/receizArtifactVerifier";
import { pinnedReceizSignatureV4RootPublicKeysForClient } from "@/app/lib/security/receizSignatureV4Pinned";
import type {
  ProfileOriginal,
  ProfileOriginalMaterialCoordinate,
} from "@/app/lib/profile/types";
import { profileMaterialStreamingArtifactPath } from "@/app/lib/profile/profileVideoPresentation";
import type { ProfileShowcaseBoundedEdgeVault } from "@/app/lib/profile/showcase/boundedEdgeVault";
import type { ProfileShowcaseArtifactId } from "@/app/lib/profile/showcase/types";
import { coerceReceizProofBundle } from "@/app/utils/receizProofBundle";
import { sha256Hex } from "@/app/utils/sha256";
import { createImportedProofSourceCustody } from "./showcase/importedSourceCustody.client";
import { requireOpenedImportedProofSource, type OpenedImportedProofSource } from "./showcase/importedSource";

export type VerifiedProfileOriginalMaterialResource = Readonly<{
  proofObjectUrl: string;
  carriesMaterialCoordinate: boolean;
  sealedSourceOnly?: boolean;
  payloadBlob?: Blob;
  payloadObjectUrl: string;
  derivativeDownloadObjectUrl: string;
  sealedObjectUrl: string;
  sealedBlob?: Blob;
  payloadFilename: string;
  payloadMimeType: string;
  payloadSha256Hex: string;
  sealedFilename: string;
  sealedMimeType: string;
  sealedArtifactSha256Hex: string;
  settlement?: Promise<void>;
  revoke?: () => void;
}>;

export type VerifiedProfileOriginalMaterialProjectionState = Readonly<{
  resource: VerifiedProfileOriginalMaterialResource | null;
  status: "idle" | "pending" | "ready" | "rejected";
  errorCode: string | null;
}>;

const DIGEST_RE = /^[0-9a-f]{64}$/;
const MAX_HELD_RESOURCE_PROJECTIONS = 96;
const heldResources = new Map<string, VerifiedProfileOriginalMaterialResource>();
const pendingResources = new Map<string, Promise<VerifiedProfileOriginalMaterialResource>>();
const admittedResources = new Map<string, VerifiedProfileOriginalMaterialResource>();
const pendingAdmittedResources = new Map<string, Promise<VerifiedProfileOriginalMaterialResource>>();
const historicalResources = new Map<string, VerifiedProfileOriginalMaterialResource>();
const pendingHistoricalResources = new Map<string, Promise<VerifiedProfileOriginalMaterialResource>>();
const historicalMaterialRequestKeys = new WeakMap<VerifiedProfileOriginalMaterialResource, Set<string>>();
// Disposable media URLs remain live for every mounted proof surface using
// them. The inactive-resource limit is never permission to blank settled media.
const mountedMaterialConsumers = new Map<string, number>();
let materialResourceReleaseScheduled = false;
let historicalVaultPromise: Promise<ProfileShowcaseBoundedEdgeVault> | null = null;

type ProfileOriginalHistoricalMaterialLocator = Readonly<{
  original: ProfileOriginal;
  profileUsername: string;
}>;

function exactMaterialCoordinate(
  value: ProfileOriginalMaterialCoordinate | null | undefined,
): value is ProfileOriginalMaterialCoordinate {
  return value?.schema === "receiz.profile-original.material.v1"
    && typeof value.proofObjectUrl === "string"
    && value.proofObjectUrl.length > 0
    && DIGEST_RE.test(value.sealedArtifactSha256Hex)
    && DIGEST_RE.test(value.payloadSha256Hex)
    && value.authority.urlIsProofAuthority === false
    && value.authority.strongerTruth === "sealed-receiz-proof-object";
}

function copiedArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

function localPayloadObjectUrls(blob: Blob): Readonly<{
  payloadBlob: Blob;
  payloadObjectUrl: string;
  derivativeDownloadObjectUrl: string;
}> {
  const payloadObjectUrl = URL.createObjectURL(blob);
  return Object.freeze({ payloadBlob: blob, payloadObjectUrl, derivativeDownloadObjectUrl: payloadObjectUrl });
}

/** Retain the admitted bytes beside their disposable presentation URL. */
function localSealedObjectUrl(blob: Blob): Readonly<{ sealedBlob: Blob; sealedObjectUrl: string }> {
  return Object.freeze({ sealedBlob: blob, sealedObjectUrl: URL.createObjectURL(blob) });
}

function isHeldRawMaterialPresentation(proofObjectUrl: string): boolean {
  try {
    const url = new URL(proofObjectUrl, "https://receiz.com");
    const token = new URLSearchParams(url.hash.slice(1)).get("material") ?? "";
    const packageDigest = readReceizMaterialCompositePackageDigest(token);
    return token.startsWith("rmc2:")
      && Boolean(packageDigest)
      && (carriesReceizHeldMaterialSources({ headUrl: proofObjectUrl })
        || hasHeldReceizMaterialSourceFamily(packageDigest!));
  } catch {
    return false;
  }
}

async function heldRawMaterialSourceUrls(
  proofObjectUrl: string,
): Promise<readonly string[] | null> {
  try {
    const url = new URL(proofObjectUrl, "https://receiz.com");
    const token = new URLSearchParams(url.hash.slice(1)).get("material") ?? "";
    const packageDigest = readReceizMaterialCompositePackageDigest(token);
    if (!token.startsWith("rmc2:") || !packageDigest) return null;
    if (carriesReceizHeldMaterialSources({ headUrl: proofObjectUrl })) return [];
    return (await readHeldReceizMaterialSourceFamily(packageDigest))?.sourceUrls ?? null;
  } catch {
    return null;
  }
}

function profileResourceFromHeldBlob(
  proofObjectUrl: string,
  opened: VerifiedHeldMaterialBlobProjection,
): VerifiedProfileOriginalMaterialResource {
  const payloadObjectUrl = URL.createObjectURL(opened.payloadBlob);
  return Object.freeze({
    proofObjectUrl,
    carriesMaterialCoordinate: true,
    payloadBlob: opened.payloadBlob,
    payloadObjectUrl,
    derivativeDownloadObjectUrl: payloadObjectUrl,
    ...localSealedObjectUrl(opened.exactSealedArtifactBlob),
    payloadFilename: opened.payloadFilename,
    payloadMimeType: opened.payloadMimeType,
    payloadSha256Hex: opened.payloadSha256,
    sealedFilename: opened.sealedFilename,
    sealedMimeType: opened.sealedMimeType,
    sealedArtifactSha256Hex: opened.sealedArtifactSha256,
  });
}

function releaseProfileMaterialResource(resource: VerifiedProfileOriginalMaterialResource): void {
  // The same disposable resource may be indexed by a material URL and a
  // historical Original coordinate. Never leave a revoked URL in either index.
  if (heldResources.get(resource.proofObjectUrl) === resource) heldResources.delete(resource.proofObjectUrl);
  if (admittedResources.get(resource.proofObjectUrl) === resource) admittedResources.delete(resource.proofObjectUrl);
  for (const key of historicalMaterialRequestKeys.get(resource) ?? []) {
    if (historicalResources.get(key) === resource) historicalResources.delete(key);
  }
  historicalMaterialRequestKeys.delete(resource);
  resource.revoke?.();
  const urls = new Set([
    resource.payloadObjectUrl,
    resource.derivativeDownloadObjectUrl,
    resource.sealedObjectUrl,
  ]);
  for (const url of urls) {
    if (url.startsWith("blob:")) URL.revokeObjectURL(url);
  }
}

function releaseUnusedMaterialResources(resources: Map<string, VerifiedProfileOriginalMaterialResource>): void {
  if (resources.size <= MAX_HELD_RESOURCE_PROJECTIONS) return;
  for (const [key, resource] of resources) {
    const historicalKeys = historicalMaterialRequestKeys.get(resource);
    if (mountedMaterialConsumers.has(key)
      || (historicalKeys && [...historicalKeys].some(requestKey => mountedMaterialConsumers.has(requestKey)))) continue;
    resources.delete(key);
    releaseProfileMaterialResource(resource);
    if (resources.size <= MAX_HELD_RESOURCE_PROJECTIONS) return;
  }
}

function rememberHistoricalMaterial(requestKey: string, resource: VerifiedProfileOriginalMaterialResource): void {
  historicalResources.set(requestKey, resource);
  const keys = historicalMaterialRequestKeys.get(resource) ?? new Set<string>();
  keys.add(requestKey);
  historicalMaterialRequestKeys.set(resource, keys);
}

function releaseOldestResourceIfNeeded(): void {
  releaseUnusedMaterialResources(heldResources);
}

function releaseOldestAdmittedResourceIfNeeded(): void {
  releaseUnusedMaterialResources(admittedResources);
}

function retainMountedMaterial(requestKey: string): () => void {
  mountedMaterialConsumers.set(requestKey, (mountedMaterialConsumers.get(requestKey) ?? 0) + 1);
  let released = false;
  return () => {
    if (released) return;
    released = true;
    const remaining = (mountedMaterialConsumers.get(requestKey) ?? 1) - 1;
    if (remaining > 0) mountedMaterialConsumers.set(requestKey, remaining);
    else mountedMaterialConsumers.delete(requestKey);
    // React may release and retain the same media within one commit (including
    // a viewer handoff). Dispose after that commit, once all consumers settled.
    if (materialResourceReleaseScheduled) return;
    materialResourceReleaseScheduled = true;
    queueMicrotask(() => {
      materialResourceReleaseScheduled = false;
      releaseOldestResourceIfNeeded();
      releaseOldestAdmittedResourceIfNeeded();
    });
  };
}

function admittedMaterialCarrierKind(input: Readonly<{
  exactArtifactBytes: Uint8Array;
  filename: string;
  mimeType: string;
}>): VerifiedMaterialCarrierKind {
  if (decodeReceizBundleEnvelope(input.exactArtifactBytes)) return "bundle";
  const format = detectDocumentFormat(input.exactArtifactBytes, {
    filename: input.filename,
    mime: input.mimeType,
  });
  if (format === "png" || format === "pdf") return format;
  if (format === "heic") return "heic-box";
  return "trailer";
}

async function resolveProfileMaterialCapsule(
  proofObjectUrl: string,
): Promise<Readonly<{
  capsule: ReceizMaterialCapsule;
  verificationUrl: string;
  composite: boolean;
}>> {
  const presentation = await resolveReceizMaterialPresentation(proofObjectUrl);
  const packageDigest = readReceizMaterialCompositePackageDigest(
    presentation.materialToken,
  );
  if (!packageDigest) {
    return Object.freeze({
      capsule: decodeReceizMaterialCapsule(presentation.materialToken),
      verificationUrl: presentation.verificationUrl,
      composite: false,
    });
  }

  const url = new URL(proofObjectUrl, "https://receiz.com");
  const resolved = await resolveReceizMaterialCompositeLocalFirst({
    headUrl: proofObjectUrl,
    sourceUrls: [],
    resolveRemote: (coordinates) =>
      resolveReceizMaterialCompositeTransport({
        packageDigest: coordinates.packageDigest,
        origin: coordinates.origin,
      }),
  });
  if (resolved.manifest.verifyPath !== url.pathname) {
    throw new TypeError("PROFILE_ORIGINAL_MATERIAL_COMPOSITE_ROUTE_BINDING_REJECTED");
  }
  const capsule = resolved.manifest.capsuleEncoding === "rma3/raw"
    ? decodeReceizRawMaterialCapsuleBytes({
        capsuleBytes: resolved.capsuleBytes,
        manifest: resolved.manifest,
      })
    : decodeReceizMaterialCapsuleBytes(resolved.capsuleBytes);
  if (
    capsule.exactArtifactBytes.byteLength
      !== resolved.manifest.sealedArtifactByteLength
    || await sha256Hex(capsule.exactArtifactBytes)
      !== resolved.manifest.sealedArtifactSha256
  ) {
    throw new TypeError("PROFILE_ORIGINAL_MATERIAL_COMPOSITE_ARTIFACT_BINDING_REJECTED");
  }
  return Object.freeze({
    capsule,
    verificationUrl: presentation.verificationUrl,
    composite: true,
  });
}

/**
 * Material projection for a ProfileOriginal already admitted by verified
 * profile/showcase custody. This does not re-run proof verification: it opens
 * the carried exact bytes and enforces only the admitted payload coordinates.
 */
async function realizeAdmittedMaterial(
  coordinate: ProfileOriginalMaterialCoordinate,
): Promise<VerifiedProfileOriginalMaterialResource> {
  const held = admittedResources.get(coordinate.proofObjectUrl);
  if (held) return held;
  const pending = pendingAdmittedResources.get(coordinate.proofObjectUrl);
  if (pending) return pending;
  const opening = (async () => {
    const heldSourceUrls = await heldRawMaterialSourceUrls(coordinate.proofObjectUrl);
    if (heldSourceUrls) {
      let rangedPlayback: Awaited<ReturnType<typeof createVerifiedMaterialRangePlaybackResource>> | null = null;
      try {
        const ranged = await openVerifiedHeldMaterialRange({
          headUrl: coordinate.proofObjectUrl,
          sourceUrls: heldSourceUrls,
          signatureV4RootPublicKeys: pinnedReceizSignatureV4RootPublicKeysForClient(),
        });
        if (ranged.manifest.sealedArtifactSha256 !== coordinate.sealedArtifactSha256Hex
          || ranged.payloadSha256 !== coordinate.payloadSha256Hex) {
          throw new TypeError("PROFILE_ORIGINAL_MATERIAL_RANGE_BINDING_REJECTED");
        }
        let wholeArtifactPromise: ReturnType<typeof openAdmittedHeldMaterialBlob> | null = null;
        let settlementStarted = false;
        let settleAccepted!: () => void;
        let settleRejected!: (reason: unknown) => void;
        const settlement = new Promise<void>((resolve, reject) => {
          settleAccepted = resolve;
          settleRejected = reject;
        });
        const settleWholeArtifact = () => {
          wholeArtifactPromise ??= openAdmittedHeldMaterialBlob({
            headUrl: coordinate.proofObjectUrl,
            sourceUrls: heldSourceUrls,
            expectedSealedArtifactSha256: coordinate.sealedArtifactSha256Hex,
            expectedPayloadSha256: coordinate.payloadSha256Hex,
          });
          return wholeArtifactPromise;
        };
        const beginWholeArtifactSettlement = () => {
          if (!settlementStarted) {
            settlementStarted = true;
            void settleWholeArtifact().then(
              () => settleAccepted(),
              (error) => settleRejected(error),
            );
          }
          return settleWholeArtifact();
        };
        rangedPlayback = await createVerifiedMaterialRangePlaybackResource({
          rangeSource: ranged.rangeSource,
          filename: ranged.payloadFilename,
          sealedFilename: ranged.manifest.sealedFilename,
          onFirstRangeVerified: () => { void beginWholeArtifactSettlement(); },
          resolveSealedArtifact: async () => {
            const settled = await beginWholeArtifactSettlement();
            return Object.freeze({
              blob: settled.exactSealedArtifactBlob,
              mimeType: settled.sealedMimeType,
              filename: settled.sealedFilename,
            });
          },
        });
        if (!rangedPlayback.sealedDownloadUrl) {
          throw new TypeError("PROFILE_ORIGINAL_MATERIAL_SEALED_DOWNLOAD_UNAVAILABLE");
        }
        const resource = Object.freeze({
          proofObjectUrl: coordinate.proofObjectUrl,
          carriesMaterialCoordinate: true,
          payloadObjectUrl: rangedPlayback.url,
          derivativeDownloadObjectUrl: rangedPlayback.payloadDownloadUrl,
          sealedObjectUrl: rangedPlayback.sealedDownloadUrl,
          payloadFilename: ranged.payloadFilename,
          payloadMimeType: ranged.payloadMimeType,
          payloadSha256Hex: ranged.payloadSha256,
          sealedFilename: ranged.manifest.sealedFilename,
          sealedMimeType: ranged.manifest.sealedMimeType,
          sealedArtifactSha256Hex: ranged.manifest.sealedArtifactSha256,
          settlement,
          revoke: () => rangedPlayback?.revoke(),
        });
        admittedResources.set(coordinate.proofObjectUrl, resource);
        releaseOldestAdmittedResourceIfNeeded();
        return resource;
      } catch {
        rangedPlayback?.revoke();
      }
      const opened = await openAdmittedHeldMaterialBlob({
        headUrl: coordinate.proofObjectUrl,
        sourceUrls: heldSourceUrls,
        expectedSealedArtifactSha256: coordinate.sealedArtifactSha256Hex,
        expectedPayloadSha256: coordinate.payloadSha256Hex,
      });
      const resource = profileResourceFromHeldBlob(coordinate.proofObjectUrl, opened);
      admittedResources.set(coordinate.proofObjectUrl, resource);
      releaseOldestAdmittedResourceIfNeeded();
      return resource;
    }
    const { capsule } = await resolveProfileMaterialCapsule(
      coordinate.proofObjectUrl,
    );
    const sealedArtifactSha256Hex = await sha256Hex(capsule.exactArtifactBytes);
    if (sealedArtifactSha256Hex !== coordinate.sealedArtifactSha256Hex) {
      throw new TypeError("PROFILE_ORIGINAL_MATERIAL_CUSTODY_BINDING_REJECTED");
    }
    const carrierKind = admittedMaterialCarrierKind(capsule);
    const payloadBinding = readSealedMaterialPayloadBinding({
      exactArtifactBytes: capsule.exactArtifactBytes,
      sealedFilename: capsule.filename,
      mimeType: capsule.mimeType,
      carrierKind,
    });
    if (!payloadBinding) {
      throw new TypeError("PROFILE_ORIGINAL_MATERIAL_PAYLOAD_BINDING_REQUIRED");
    }
    const projected = await projectVerifiedMaterialPayload({
      exactArtifactBytes: capsule.exactArtifactBytes,
      sealedFilename: capsule.filename,
      mimeType: capsule.mimeType,
      carrierKind,
      expectedPayloadSha256: payloadBinding,
    });
    const resource = Object.freeze({
      proofObjectUrl: coordinate.proofObjectUrl,
      carriesMaterialCoordinate: true,
      ...localPayloadObjectUrls(new Blob(
        [copiedArrayBuffer(projected.bytes)],
        { type: projected.mimeType },
      )),
      ...localSealedObjectUrl(new Blob(
        [copiedArrayBuffer(capsule.exactArtifactBytes)],
        { type: capsule.mimeType || "application/octet-stream" },
      )),
      payloadFilename: projected.filename,
      payloadMimeType: projected.mimeType,
      payloadSha256Hex: projected.sha256,
      sealedFilename: capsule.filename,
      sealedMimeType: capsule.mimeType,
      sealedArtifactSha256Hex,
    });
    admittedResources.set(coordinate.proofObjectUrl, resource);
    releaseOldestAdmittedResourceIfNeeded();
    return resource;
  })().finally(() => pendingAdmittedResources.delete(coordinate.proofObjectUrl));
  pendingAdmittedResources.set(coordinate.proofObjectUrl, opening);
  return opening;
}

async function realizeVerifiedMaterial(
  coordinate: ProfileOriginalMaterialCoordinate,
): Promise<VerifiedProfileOriginalMaterialResource> {
  const held = heldResources.get(coordinate.proofObjectUrl);
  if (held) return held;
  const pending = pendingResources.get(coordinate.proofObjectUrl);
  if (pending) return pending;
  const opening = (async () => {
    const heldSourceUrls = await heldRawMaterialSourceUrls(coordinate.proofObjectUrl);
    if (heldSourceUrls) {
      const opened = await openVerifiedHeldMaterialBlob({
        headUrl: coordinate.proofObjectUrl,
        sourceUrls: heldSourceUrls,
        signatureV4RootPublicKeys: pinnedReceizSignatureV4RootPublicKeysForClient(),
      });
      if (opened.sealedArtifactSha256 !== coordinate.sealedArtifactSha256Hex
        || opened.payloadSha256 !== coordinate.payloadSha256Hex) {
        throw new TypeError("PROFILE_ORIGINAL_MATERIAL_BINDING_REJECTED");
      }
      return profileResourceFromHeldBlob(coordinate.proofObjectUrl, opened);
    }
    const { capsule, composite, verificationUrl } = await resolveProfileMaterialCapsule(
      coordinate.proofObjectUrl,
    );
    const opened = composite
      ? await openVerifiedReceizMaterialCapsuleUrl(verificationUrl, capsule)
      : await openVerifiedReceizMaterialUrl(coordinate.proofObjectUrl);
    if (
      opened.sealedArtifactSha256 !== coordinate.sealedArtifactSha256Hex
      || opened.payloadSha256 !== coordinate.payloadSha256Hex
    ) {
      throw new TypeError("PROFILE_ORIGINAL_MATERIAL_BINDING_REJECTED");
    }
    return Object.freeze({
      proofObjectUrl: coordinate.proofObjectUrl,
      carriesMaterialCoordinate: true,
      ...localPayloadObjectUrls(new Blob(
        [copiedArrayBuffer(opened.payloadBytes)],
        { type: opened.payloadMimeType },
      )),
      ...localSealedObjectUrl(new Blob(
        [copiedArrayBuffer(opened.exactSealedArtifactBytes)],
        { type: opened.sealedMimeType || "application/octet-stream" },
      )),
      payloadFilename: opened.payloadFilename,
      payloadMimeType: opened.payloadMimeType,
      payloadSha256Hex: opened.payloadSha256,
      sealedFilename: opened.sealedFilename,
      sealedMimeType: opened.sealedMimeType,
      sealedArtifactSha256Hex: opened.sealedArtifactSha256,
    });
  })()
    .then((resource) => {
      heldResources.set(coordinate.proofObjectUrl, resource);
      releaseOldestResourceIfNeeded();
      return resource;
    })
    .finally(() => pendingResources.delete(coordinate.proofObjectUrl));
  pendingResources.set(coordinate.proofObjectUrl, opening);
  return opening;
}

function historicalMaterialRequestKey(
  locator: ProfileOriginalHistoricalMaterialLocator | null | undefined,
): string | null {
  if (!locator?.original.media) return null;
  const username = locator.profileUsername.trim().normalize("NFC").toLowerCase();
  const originalId = locator.original.id.trim();
  if (
    !/^[a-z0-9](?:[a-z0-9._-]{0,62}[a-z0-9])?$/.test(username)
    || !originalId
  ) return null;
  return `profile-showcase:${username}.receiz.id\u0000${originalId}${locator.original.importedSource ? `\u0000${locator.original.importedSource.reference.artifactSha256}` : ""}`;
}

function importedMaterialResource(original: ProfileOriginal, source: { exactArtifact: Blob; payload: Blob; payloadFilename: string; payloadMimeType: string }): VerifiedProfileOriginalMaterialResource {
  const imported = original.importedSource!;
  const sealedSourceOnly = original.media?.sha256Hex !== imported.payloadSha256;
  return Object.freeze({ proofObjectUrl: original.verifyUrl, carriesMaterialCoordinate: false,
    ...(sealedSourceOnly ? { payloadObjectUrl: original.media?.src ?? "", derivativeDownloadObjectUrl: original.media?.derivativeDownloadSrc ?? "" } : localPayloadObjectUrls(source.payload)),
    sealedSourceOnly, ...localSealedObjectUrl(source.exactArtifact),
    payloadFilename: source.payloadFilename, payloadMimeType: source.payloadMimeType,
    payloadSha256Hex: imported.payloadSha256, sealedFilename: imported.reference.filename,
    sealedMimeType: "application/octet-stream", sealedArtifactSha256Hex: imported.reference.artifactSha256 });
}

/** Upload has already admitted this exact source. Seed the existing artifact
 * and live-player resource projection before the Original becomes visible. */
export function retainImportedProfileOriginalMaterial(original: ProfileOriginal, username: string, source: OpenedImportedProofSource): void {
  requireOpenedImportedProofSource(source);
  const key = historicalMaterialRequestKey({ original, profileUsername: username });
  if (!key || !original.importedSource || source.descriptor.artifactSha256 !== original.importedSource.reference.artifactSha256) throw new TypeError("IMPORTED_SOURCE_RESOURCE_BINDING_INVALID");
  if (!historicalResources.has(key)) rememberHistoricalMaterial(key, importedMaterialResource(original, {
    exactArtifact: source.exactArtifact, payload: source.payload, payloadFilename: source.projection.payloadFilename, payloadMimeType: source.projection.payloadMimeType,
  }));
}

/** Project the exact payload already opened beneath the original canonical
 * source. The source-carried Original supplies identity and media commitments. */
export async function retainOwnerShowcaseOriginalMaterial(username: string, originalSource: OpenedImportedProofSource, materialSource: OpenedImportedProofSource, originalId?: string): Promise<VerifiedProfileOriginalMaterialResource> {
  requireOpenedImportedProofSource(originalSource);
  requireOpenedImportedProofSource(materialSource);
  const { readOwnerSourceOriginal } = await import("./showcase/ownerSourceOriginals");
  const original = await readOwnerSourceOriginal(originalSource, originalId);
  if (!original?.media || original.media.sha256Hex !== materialSource.projection.payloadSha256) throw new TypeError("SHOWCASE_MATERIAL_SOURCE_BINDING_INVALID");
  const key = historicalMaterialRequestKey({ original, profileUsername: username });
  if (!key) throw new TypeError("SHOWCASE_MATERIAL_ORIGINAL_BINDING_INVALID");
  const held = historicalResources.get(key);
  if (held) return held;
  const resource = Object.freeze({ proofObjectUrl: original.verifyUrl, carriesMaterialCoordinate: false,
    ...localPayloadObjectUrls(materialSource.payload), ...localSealedObjectUrl(materialSource.exactArtifact),
    payloadFilename: materialSource.projection.payloadFilename, payloadMimeType: materialSource.projection.payloadMimeType,
    payloadSha256Hex: materialSource.projection.payloadSha256, sealedFilename: materialSource.descriptor.filename,
    sealedMimeType: materialSource.descriptor.mimeType, sealedArtifactSha256Hex: materialSource.descriptor.artifactSha256 });
  rememberHistoricalMaterial(key, resource);
  return resource;
}

function loadHistoricalVault(): Promise<ProfileShowcaseBoundedEdgeVault> {
  if (historicalVaultPromise) return historicalVaultPromise;
  const loading = import("@/app/lib/profile/showcase/boundedEdgeVault")
    .then(({ createProfileShowcaseBoundedEdgeVault }) =>
      createProfileShowcaseBoundedEdgeVault())
    .catch((error: unknown) => {
      if (historicalVaultPromise === loading) historicalVaultPromise = null;
      throw error;
    });
  historicalVaultPromise = loading;
  return loading;
}

async function realizeHistoricalMaterial(
  requestKey: string,
  locator: ProfileOriginalHistoricalMaterialLocator,
  options: Readonly<{ alreadyAdmitted?: boolean }> = {},
): Promise<VerifiedProfileOriginalMaterialResource> {
  const held = historicalResources.get(requestKey);
  if (held) return held;
  const pending = pendingHistoricalResources.get(requestKey);
  if (pending) return pending;
  const opening = (async () => {
    if (locator.original.importedSource) {
      const imported = locator.original.importedSource;
      const source = await createImportedProofSourceCustody().readAdmittedPresentation(imported.reference, imported);
      if (!source) throw new TypeError("IMPORTED_SOURCE_LOCAL_PRESENTATION_UNAVAILABLE");
      const resource = importedMaterialResource(locator.original, source);
      rememberHistoricalMaterial(requestKey, resource);
      return resource;
    }
    const separator = requestKey.indexOf("\u0000");
    const artifactId = requestKey.slice(0, separator) as ProfileShowcaseArtifactId;
    const originalId = requestKey.slice(separator + 1);
    const vault = await loadHistoricalVault();
    const custody = await vault.resolveOriginalChildCustody(artifactId, originalId);
    if (!custody) throw new TypeError("PROFILE_ORIGINAL_MATERIAL_CUSTODY_MISSING");

    const exactArtifactBytes = custody.verifiedPayloadBytes.slice();
    const sealedArtifactSha256Hex = await sha256Hex(exactArtifactBytes);
    if (sealedArtifactSha256Hex !== custody.reference.stableChildArtifactId) {
      throw new TypeError("PROFILE_ORIGINAL_MATERIAL_CUSTODY_BINDING_REJECTED");
    }
    const media = locator.original.media;
    if (!media) throw new TypeError("PROFILE_ORIGINAL_MATERIAL_MEDIA_MISSING");
    if (media.sha256Hex === sealedArtifactSha256Hex) {
      const resource = Object.freeze({ proofObjectUrl: locator.original.verifyUrl, carriesMaterialCoordinate: false,
        ...localPayloadObjectUrls(new Blob([copiedArrayBuffer(exactArtifactBytes)], { type: custody.verifiedPayloadMimeType })),
        ...localSealedObjectUrl(new Blob([copiedArrayBuffer(custody.exactSealedArtifactBytes)], { type: "application/octet-stream" })),
        payloadFilename: media.name || "original", payloadMimeType: custody.verifiedPayloadMimeType, payloadSha256Hex: sealedArtifactSha256Hex,
        sealedFilename: media.originalDownloadName || "original.receizbundle", sealedMimeType: "application/octet-stream", sealedArtifactSha256Hex: custody.reference.childArtifactDigest });
      rememberHistoricalMaterial(requestKey, resource);
      return resource;
    }
    const sealedFilename =
      media.originalDownloadName?.trim()
      || media.name?.trim()
      || `profile-original-${locator.original.code}.receiz`;
    const sealedMimeType = custody.verifiedPayloadMimeType.trim()
      || media.originalDownloadMime?.trim()
      || "application/octet-stream";
    if (options.alreadyAdmitted) {
      const carrierKind = admittedMaterialCarrierKind({
        exactArtifactBytes,
        filename: sealedFilename,
        mimeType: sealedMimeType,
      });
      const expectedPayloadSha256 = readSealedMaterialPayloadBinding({
        exactArtifactBytes,
        sealedFilename,
        mimeType: sealedMimeType,
        carrierKind,
      });
      if (!expectedPayloadSha256 || !DIGEST_RE.test(expectedPayloadSha256)) {
        throw new TypeError("PROFILE_ORIGINAL_MATERIAL_PAYLOAD_BINDING_REQUIRED");
      }
      const projected = await projectVerifiedMaterialPayload({
        exactArtifactBytes,
        sealedFilename,
        mimeType: sealedMimeType,
        carrierKind,
        expectedPayloadSha256,
      });
      const resource = Object.freeze({
        proofObjectUrl: locator.original.verifyUrl,
        carriesMaterialCoordinate: false,
        ...localPayloadObjectUrls(new Blob(
          [copiedArrayBuffer(projected.bytes)],
          { type: projected.mimeType },
        )),
        ...localSealedObjectUrl(new Blob(
          [copiedArrayBuffer(exactArtifactBytes)],
          { type: sealedMimeType },
        )),
        payloadFilename: projected.filename,
        payloadMimeType: projected.mimeType,
        payloadSha256Hex: projected.sha256,
        sealedFilename,
        sealedMimeType,
        sealedArtifactSha256Hex,
      });
      rememberHistoricalMaterial(requestKey, resource);
      return resource;
    }
    const opened = await verifyAndExtractReceizDocumentBytes({
      fileBytes: exactArtifactBytes,
      filename: sealedFilename,
      mime: sealedMimeType,
      signatureV4RootPublicKeys: pinnedReceizSignatureV4RootPublicKeysForClient(),
    });
    if (!opened.ok) {
      throw new TypeError("PROFILE_ORIGINAL_MATERIAL_ARTIFACT_REJECTED");
    }
    const proofBundle = coerceReceizProofBundle(opened.verification.bundle);
    if (!proofBundle) throw new TypeError("PROFILE_ORIGINAL_MATERIAL_PROOF_REQUIRED");
    const payloadSha256Hex = await sha256Hex(opened.payloadBytes);
    const { buildReceizPublishedMaterialVUrl } = await import("@/app/lib/documentSeal/materialCompositePublication.client");
    const proofObjectUrl = await buildReceizPublishedMaterialVUrl({
      exactArtifactBytes,
      filename: sealedFilename,
      mimeType: sealedMimeType,
      proofBundle,
      publicOrigin: window.location.origin,
      publicationOrigin: window.location.origin,
    });
    const resource = Object.freeze({
      proofObjectUrl,
      carriesMaterialCoordinate: true,
      ...localPayloadObjectUrls(new Blob(
        [copiedArrayBuffer(opened.payloadBytes)],
        { type: opened.payloadMimeType },
      )),
      ...localSealedObjectUrl(new Blob(
        [copiedArrayBuffer(exactArtifactBytes)],
        { type: sealedMimeType },
      )),
      payloadFilename: opened.payloadFilename,
      payloadMimeType: opened.payloadMimeType,
      payloadSha256Hex,
      sealedFilename,
      sealedMimeType,
      sealedArtifactSha256Hex,
    });
    heldResources.set(proofObjectUrl, resource);
    rememberHistoricalMaterial(requestKey, resource);
    releaseOldestResourceIfNeeded();
    return resource;
  })().finally(() => pendingHistoricalResources.delete(requestKey));
  pendingHistoricalResources.set(requestKey, opening);
  return opening;
}

/** A public proof control can reuse admitted custody without reopening or fetching it. */
export function peekHeldProfileOriginalMaterial(proofObjectUrl: string, sealedArtifactSha256: string): VerifiedProfileOriginalMaterialResource | null {
  const matches = (resource: VerifiedProfileOriginalMaterialResource | undefined) => resource
    && resource.sealedArtifactSha256Hex === sealedArtifactSha256 ? resource : null;
  return matches(admittedResources.get(proofObjectUrl)) ?? matches(heldResources.get(proofObjectUrl))
    ?? [...historicalResources.values()].find(resource => resource.proofObjectUrl === proofObjectUrl
      && resource.sealedArtifactSha256Hex === sealedArtifactSha256) ?? null;
}

/**
 * Resource projection only. It never clears the settled media projection while
 * verification runs and never admits URL or blob state as proof authority.
 */
export function useVerifiedProfileOriginalMaterialProjection(
  material: ProfileOriginalMaterialCoordinate | null | undefined,
  historicalOriginal?: ProfileOriginal | null,
  historicalProfileUsername?: string | null,
  options: Readonly<{ alreadyAdmitted?: boolean }> = {},
): VerifiedProfileOriginalMaterialProjectionState {
  const alreadyAdmitted = options.alreadyAdmitted === true;
  const media = historicalOriginal?.media ?? null;
  const heldVideoSource = Boolean(
    media
    && media.kind === "video"
    && media.src.startsWith("blob:")
  );
  const heldRawMaterialPresentation = Boolean(
    material?.proofObjectUrl
    && isHeldRawMaterialPresentation(material.proofObjectUrl)
  );
  const streamedVideoPresentation = Boolean(
    media?.kind === "video"
    && profileMaterialStreamingArtifactPath(material?.proofObjectUrl)
    && !heldRawMaterialPresentation
  );
  // The admitted image already paints from this exact sealed artifact path.
  // Reopening its package would retain a second full payload + sealed Blob for
  // every mounted showcase object and replace the settled responsive image.
  // Locally held source families still use their existing offline projection.
  const streamedImagePresentation = Boolean(
    alreadyAdmitted
    && media?.kind === "image"
    && !heldRawMaterialPresentation
    && media.src === profileMaterialStreamingArtifactPath(material?.proofObjectUrl)
  );
  const presentationAlreadySettled = heldVideoSource || streamedVideoPresentation || streamedImagePresentation;
  const proofObjectUrl = !presentationAlreadySettled && exactMaterialCoordinate(material)
    ? material.proofObjectUrl
    : null;
  const historicalKey = proofObjectUrl || presentationAlreadySettled ? null : historicalMaterialRequestKey(
    historicalOriginal && historicalProfileUsername
      ? { original: historicalOriginal, profileUsername: historicalProfileUsername }
      : null,
  );
  const requestKey = proofObjectUrl ?? historicalKey;
  // Commit the consumer before paint and before passive resource realization.
  // Keep this separate from realization dependencies: a profile append may
  // replace a projection reference without ending the settled media lifetime.
  useLayoutEffect(() => {
    if (!requestKey) return;
    return retainMountedMaterial(requestKey);
  }, [requestKey]);
  const [settled, setSettled] = useState<Readonly<{
    requestKey: string;
    resource: VerifiedProfileOriginalMaterialResource | null;
    errorCode: string | null;
  }> | null>(
    () => {
      if (!requestKey) return null;
      const resource = proofObjectUrl
        ? alreadyAdmitted
          ? admittedResources.get(proofObjectUrl)
          : heldResources.get(proofObjectUrl)
        : historicalResources.get(requestKey);
      return resource ? { requestKey, resource, errorCode: null } : null;
    },
  );

  useEffect(() => {
    if (!requestKey) return;
    let cancelled = false;
    const held = proofObjectUrl
      ? alreadyAdmitted
        ? admittedResources.get(proofObjectUrl)
        : heldResources.get(proofObjectUrl)
      : historicalResources.get(requestKey);
    if (held) {
      queueMicrotask(() => {
        if (!cancelled) setSettled({ requestKey, resource: held, errorCode: null });
      });
      return;
    }
    const realization = proofObjectUrl && exactMaterialCoordinate(material)
      ? alreadyAdmitted
        ? realizeAdmittedMaterial(material)
        : realizeVerifiedMaterial(material)
      : historicalKey && historicalOriginal && historicalProfileUsername
        ? realizeHistoricalMaterial(historicalKey, {
            original: historicalOriginal,
            profileUsername: historicalProfileUsername,
          }, { alreadyAdmitted })
        : null;
    if (!realization) return;
    void realization.then(
      (opened) => {
        if (cancelled) return;
        setSettled({ requestKey, resource: opened, errorCode: null });
        void opened.settlement?.catch(() => {
          opened.revoke?.();
          if (admittedResources.get(opened.proofObjectUrl) === opened) {
            admittedResources.delete(opened.proofObjectUrl);
          }
          if (cancelled) return;
          setSettled((current) => current?.resource === opened
            ? {
                requestKey,
                resource: null,
                errorCode: "PROFILE_ORIGINAL_MATERIAL_SETTLEMENT_REJECTED",
              }
            : current);
        });
      },
      (error) => {
        if (cancelled) return;
        setSettled({
          requestKey,
          resource: null,
          errorCode: error instanceof Error && error.message
            ? error.message
            : "PROFILE_ORIGINAL_MATERIAL_PROJECTION_REJECTED",
        });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [
    historicalKey,
    historicalOriginal,
    historicalProfileUsername,
    material,
    alreadyAdmitted,
    proofObjectUrl,
    requestKey,
  ]);

  if (!requestKey) {
    return Object.freeze({ resource: null, status: "idle" as const, errorCode: null });
  }
  if (settled?.requestKey !== requestKey) {
    return Object.freeze({ resource: null, status: "pending" as const, errorCode: null });
  }
  if (settled.resource) {
    return Object.freeze({ resource: settled.resource, status: "ready" as const, errorCode: null });
  }
  if (settled.errorCode) {
    return Object.freeze({ resource: null, status: "rejected" as const, errorCode: settled.errorCode });
  }
  return Object.freeze({ resource: null, status: "pending" as const, errorCode: null });
}

export function useVerifiedProfileOriginalMaterial(
  material: ProfileOriginalMaterialCoordinate | null | undefined,
  historicalOriginal?: ProfileOriginal | null,
  historicalProfileUsername?: string | null,
  options: Readonly<{ alreadyAdmitted?: boolean }> = {},
): VerifiedProfileOriginalMaterialResource | null {
  return useVerifiedProfileOriginalMaterialProjection(
    material,
    historicalOriginal,
    historicalProfileUsername,
    options,
  ).resource;
}

export function projectProfileOriginalMaterialResource(
  original: ProfileOriginal,
  resource: VerifiedProfileOriginalMaterialResource | null,
): ProfileOriginal {
  if (!resource || !original.media) return original;
  const media = original.media;
  if (resource.sealedSourceOnly) return { ...original, media: { ...media,
    originalDownloadSrc: resource.sealedObjectUrl, originalDownloadName: resource.sealedFilename,
    originalDownloadMime: resource.sealedMimeType, originalDownloadSha256Hex: resource.sealedArtifactSha256Hex } };
  const publicSealedPdfArtifactSrc = media.kind === "pdf" && resource.carriesMaterialCoordinate
    ? profileMaterialStreamingArtifactPath(resource.proofObjectUrl)
    : null;
  return {
    ...original,
    media: {
      ...media,
      material: media.material ?? (resource.carriesMaterialCoordinate ? {
        schema: "receiz.profile-original.material.v1",
        proofObjectUrl: resource.proofObjectUrl,
        sealedArtifactSha256Hex: resource.sealedArtifactSha256Hex,
        payloadSha256Hex: resource.payloadSha256Hex,
        authority: {
          urlIsProofAuthority: false,
          strongerTruth: "sealed-receiz-proof-object",
        },
      } : null),
      src: resource.payloadObjectUrl,
      mime: resource.payloadMimeType,
      sha256Hex: resource.payloadSha256Hex,
      originalDownloadSrc: publicSealedPdfArtifactSrc ?? resource.sealedObjectUrl,
      originalDownloadName: resource.sealedFilename,
      originalDownloadMime: resource.sealedMimeType,
      originalDownloadSha256Hex: resource.sealedArtifactSha256Hex,
      derivativeDownloadSrc: resource.derivativeDownloadObjectUrl,
      derivativeDownloadName: resource.payloadFilename,
      derivativeDownloadMime: resource.payloadMimeType,
      derivativeDownloadSha256Hex: resource.payloadSha256Hex,
      playbackSrc:
        media.kind === "video" || media.kind === "audio"
          ? resource.payloadObjectUrl
          : media.playbackSrc,
      imageVariants: media.kind === "image" ? null : media.imageVariants,
    },
  };
}
