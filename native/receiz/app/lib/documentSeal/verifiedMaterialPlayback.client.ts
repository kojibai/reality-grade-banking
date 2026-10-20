"use client";

import {
  isInspectedReceizMaterialProgressiveCapability,
  type ReceizMaterialProgressiveCapability,
} from "@/app/lib/documentSeal/materialProgressiveCapability";
import {
  isVerifiedHeldMaterialBlobProjection,
  type VerifiedHeldMaterialBlobProjection,
} from "@/app/lib/documentSeal/verifiedHeldMaterialBlob.client";
import type { VerifiedMaterialRangeSource } from "@/app/lib/documentSeal/verifiedMaterialRangeSource.client";

export type VerifiedMaterialPlaybackResource = Readonly<{
  url: string;
  payloadDownloadUrl: string;
  sealedDownloadUrl?: string;
  mode: "signed-ranges" | "verified-blob";
  revoke(): void;
  authority: Readonly<{
    playbackIsProofAuthority: false;
    strongerTruth: "sealed-receiz-proof-object";
  }>;
}>;

const PLAYBACK_AUTHORITY = Object.freeze({
  playbackIsProofAuthority: false as const,
  strongerTruth: "sealed-receiz-proof-object" as const,
});
const RECEIZ_MATERIAL_PLAYBACK_PATH = "/__receiz/material-playback";
type HeldVerifiedRangePlayback = {
  source: VerifiedMaterialRangeSource;
  filename: string;
  sealedFilename?: string;
  resolveSealedArtifact?: () => Promise<Readonly<{
    blob: Blob;
    mimeType: string;
    filename: string;
  }>>;
  onFirstRangeVerified?: () => void;
  firstRangeNotified: boolean;
};
const verifiedRangePlaybackSources = new Map<string, HeldVerifiedRangePlayback>();
let serviceWorkerMessageTarget: ServiceWorkerContainer | null = null;

function parseRequestedRange(
  rangeHeader: unknown,
  total: number,
  maxResponseBytes: number,
): Readonly<{ offset: number; byteLength: number }> {
  const range = typeof rangeHeader === "string" ? rangeHeader.trim() : "";
  const match = /^bytes=(\d*)-(\d*)$/iu.exec(range);
  if (!match || (!match[1] && !match[2])) {
    return Object.freeze({ offset: 0, byteLength: Math.min(total, maxResponseBytes) });
  }
  let start: number;
  let end: number;
  if (!match[1]) {
    const suffixLength = Number.parseInt(match[2]!, 10);
    if (!Number.isSafeInteger(suffixLength) || suffixLength <= 0) {
      throw new TypeError("RECEIZ_MATERIAL_PLAYBACK_RANGE_INVALID");
    }
    const bounded = Math.min(total, suffixLength, maxResponseBytes);
    start = total - bounded;
    end = total - 1;
  } else {
    start = Number.parseInt(match[1], 10);
    const requestedEnd = match[2] ? Number.parseInt(match[2], 10) : total - 1;
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(requestedEnd)
      || start < 0 || start >= total || requestedEnd < start) {
      throw new TypeError("RECEIZ_MATERIAL_PLAYBACK_RANGE_INVALID");
    }
    end = Math.min(total - 1, requestedEnd, start + maxResponseBytes - 1);
  }
  return Object.freeze({ offset: start, byteLength: end - start + 1 });
}

function copiedArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = bytes.slice();
  return copy.buffer as ArrayBuffer;
}

async function readWholeVerifiedPayload(source: VerifiedMaterialRangeSource): Promise<ArrayBuffer> {
  const output = new Uint8Array(source.payloadByteLength);
  for (let offset = 0; offset < source.payloadByteLength; offset += source.rangeByteBoundary) {
    const byteLength = Math.min(source.rangeByteBoundary, source.payloadByteLength - offset);
    output.set(await source.readVerifiedRange({ offset, byteLength }), offset);
  }
  return output.buffer as ArrayBuffer;
}

function installVerifiedRangeMessageHandler(): ServiceWorker | null {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return null;
  const target = navigator.serviceWorker;
  const controller = target.controller;
  if (!controller) return null;
  if (serviceWorkerMessageTarget !== target) {
    target.addEventListener("message", (event: MessageEvent) => {
      const data = event.data as Readonly<Record<string, unknown>> | null;
      if (data?.type !== "RECEIZ_MATERIAL_RANGE_READ") return;
      const port = event.ports[0];
      if (!port) return;
      const resourceId = typeof data.resourceId === "string" ? data.resourceId : "";
      const held = verifiedRangePlaybackSources.get(resourceId);
      if (!held) {
        port.postMessage({ ok: false, error: "RECEIZ_MATERIAL_PLAYBACK_RESOURCE_REVOKED" });
        return;
      }
      void (async () => {
        try {
          const requestKind = data.kind === "payload" || data.kind === "sealed"
            ? data.kind
            : "media";
          if (requestKind === "payload") {
            const bytes = await readWholeVerifiedPayload(held.source);
            port.postMessage({
              ok: true,
              download: true,
              mimeType: held.source.mimeType,
              filename: held.filename,
              bytes,
            }, [bytes]);
            return;
          }
          if (requestKind === "sealed") {
            if (!held.resolveSealedArtifact) {
              throw new TypeError("RECEIZ_MATERIAL_SEALED_DOWNLOAD_UNAVAILABLE");
            }
            const sealed = await held.resolveSealedArtifact();
            const bytes = await sealed.blob.arrayBuffer();
            port.postMessage({
              ok: true,
              download: true,
              mimeType: sealed.mimeType,
              filename: sealed.filename,
              bytes,
            }, [bytes]);
            return;
          }
          const request = parseRequestedRange(
            data.range,
            held.source.payloadByteLength,
            held.source.rangeByteBoundary,
          );
          const verified = await held.source.readVerifiedRange(request);
          const bytes = copiedArrayBuffer(verified);
          port.postMessage({
            ok: true,
            start: request.offset,
            end: request.offset + request.byteLength - 1,
            total: held.source.payloadByteLength,
            mimeType: held.source.mimeType,
            filename: held.filename,
            bytes,
          }, [bytes]);
          if (!held.firstRangeNotified) {
            held.firstRangeNotified = true;
            if (held.onFirstRangeVerified) setTimeout(held.onFirstRangeVerified, 0);
          }
        } catch (error) {
          port.postMessage({
            ok: false,
            error: error instanceof Error ? error.message : "RECEIZ_MATERIAL_PLAYBACK_RANGE_REJECTED",
          });
        }
      })();
    });
    serviceWorkerMessageTarget = target;
  }
  return controller;
}

function localPresentationId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID().replaceAll("-", "");
  }
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
}

export async function createVerifiedMaterialRangePlaybackResource(input: Readonly<{
  rangeSource: VerifiedMaterialRangeSource;
  filename: string;
  sealedFilename?: string;
  resolveSealedArtifact?: () => Promise<Readonly<{
    blob: Blob;
    mimeType: string;
    filename: string;
  }>>;
  onFirstRangeVerified?: () => void;
}>): Promise<VerifiedMaterialPlaybackResource> {
  if (input.rangeSource?.authority?.rangeSourceIsProofAuthority !== false
    || input.rangeSource.authority.strongerTruth !== "sealed-receiz-proof-object"
    || !Number.isSafeInteger(input.rangeSource.payloadByteLength)
    || input.rangeSource.payloadByteLength <= 0
    || typeof input.rangeSource.readVerifiedRange !== "function") {
    throw new TypeError("RECEIZ_MATERIAL_PLAYBACK_RANGE_SOURCE_INVALID");
  }
  if (!installVerifiedRangeMessageHandler()) {
    throw new TypeError("RECEIZ_MATERIAL_PLAYBACK_SERVICE_WORKER_UNAVAILABLE");
  }
  const resourceId = localPresentationId();
  verifiedRangePlaybackSources.set(resourceId, {
    source: input.rangeSource,
    filename: input.filename,
    ...(input.sealedFilename ? { sealedFilename: input.sealedFilename } : {}),
    ...(input.resolveSealedArtifact ? { resolveSealedArtifact: input.resolveSealedArtifact } : {}),
    ...(input.onFirstRangeVerified ? { onFirstRangeVerified: input.onFirstRangeVerified } : {}),
    firstRangeNotified: false,
  });
  const filename = encodeURIComponent(input.filename || "verified-material");
  const url = `${RECEIZ_MATERIAL_PLAYBACK_PATH}/media/${resourceId}/${filename}`;
  const payloadDownloadUrl = `${RECEIZ_MATERIAL_PLAYBACK_PATH}/payload/${resourceId}/${filename}`;
  const sealedDownloadUrl = input.resolveSealedArtifact
    ? `${RECEIZ_MATERIAL_PLAYBACK_PATH}/sealed/${resourceId}/${encodeURIComponent(
        input.sealedFilename || "sealed-material.receiz",
      )}`
    : undefined;
  let revoked = false;
  return Object.freeze({
    url,
    payloadDownloadUrl,
    ...(sealedDownloadUrl ? { sealedDownloadUrl } : {}),
    mode: "signed-ranges" as const,
    revoke() {
      if (revoked) return;
      revoked = true;
      verifiedRangePlaybackSources.delete(resourceId);
    },
    authority: PLAYBACK_AUTHORITY,
  });
}

/** Creates the legacy whole-artifact browser-local fallback projection. */
export async function createVerifiedMaterialPlaybackResource(input: Readonly<{
  projection: VerifiedHeldMaterialBlobProjection;
  capability: ReceizMaterialProgressiveCapability;
}>): Promise<VerifiedMaterialPlaybackResource> {
  if (!isVerifiedHeldMaterialBlobProjection(input.projection)) {
    throw new TypeError("RECEIZ_MATERIAL_PLAYBACK_PROJECTION_NOT_VERIFIED");
  }
  if (!isInspectedReceizMaterialProgressiveCapability(input.capability)) {
    throw new TypeError("RECEIZ_MATERIAL_PLAYBACK_CAPABILITY_NOT_INSPECTED");
  }
  if (typeof URL.createObjectURL !== "function" || typeof URL.revokeObjectURL !== "function") {
    throw new TypeError("RECEIZ_MATERIAL_PLAYBACK_BLOB_URL_UNAVAILABLE");
  }
  const url = URL.createObjectURL(input.projection.payloadBlob);
  let revoked = false;
  return Object.freeze({
    url,
    payloadDownloadUrl: url,
    mode: "verified-blob" as const,
    revoke() {
      if (revoked) return;
      revoked = true;
      URL.revokeObjectURL(url);
    },
    authority: PLAYBACK_AUTHORITY,
  });
}
