import { deflateSync, inflateSync } from "fflate";

import { receizBase64UrlDecode, receizBase64UrlEncode } from "./identity.js";
import { sha256Hex } from "./verifier/crypto.js";
import { verifyAndExtractReceizDocumentBytesCanonical } from "./verifier/canonical.js";
import { receizCurrentPinnedSignatureV4Roots } from "./verifier/roots.js";
import {
  readReceizMaterialCompositePackageDigest,
  resolveReceizMaterialCompositeTransport,
} from "./materialCompositeTransport.js";
import {
  decodeReceizRawMaterialCapsuleBytes,
  resolveReceizMaterialCompositeFromSources,
} from "./materialSourceFamily.js";

export const RECEIZ_MATERIAL_FRAGMENT_KEY = "material" as const;
export const RECEIZ_MATERIAL_CAPSULE_PREFIX = "rma2:" as const;
// RMA2 carries the exact length as U32. Runtime allocation, not an artificial
// 256 MiB product ceiling, determines whether an in-memory projection fits.
export const MAX_RECEIZ_MATERIAL_CAPSULE_BYTES = 0xffff_ffff;

const HEADER_BYTES = 12;
const MAGIC = Uint8Array.of(0x52, 0x4d, 0x41, 0x32);
const MAX_FILENAME_BYTES = 1_024;
const MAX_MIME_BYTES = 256;
const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: true });

export type ReceizMaterialCapsule = Readonly<{
  exactArtifactBytes: Uint8Array;
  filename: string;
  mimeType: string;
}>;

export function encodeReceizMaterialCapsuleBytes(input: Readonly<{
  exactArtifactBytes: Uint8Array;
  filename: string;
  mimeType: string;
}>): Uint8Array {
  if (!input.exactArtifactBytes.byteLength) throw new TypeError("RECEIZ_MATERIAL_CAPSULE_EMPTY");
  if (input.exactArtifactBytes.byteLength > MAX_RECEIZ_MATERIAL_CAPSULE_BYTES) {
    throw new RangeError("RECEIZ_MATERIAL_CAPSULE_ADDRESS_SPACE_EXCEEDED");
  }
  const filename = encoder.encode(input.filename.trim() || "sealed-material.bin");
  const mime = encoder.encode(input.mimeType.trim() || "application/octet-stream");
  if (!filename.byteLength || filename.byteLength > MAX_FILENAME_BYTES || !mime.byteLength || mime.byteLength > MAX_MIME_BYTES) {
    throw new RangeError("RECEIZ_MATERIAL_CAPSULE_PROJECTION_INVALID");
  }
  const payload = new Uint8Array(filename.byteLength + mime.byteLength + input.exactArtifactBytes.byteLength);
  payload.set(filename);
  payload.set(mime, filename.byteLength);
  payload.set(input.exactArtifactBytes, filename.byteLength + mime.byteLength);
  const compressed = deflateSync(payload, { level: 9 });
  const carried = new Uint8Array(HEADER_BYTES + compressed.byteLength);
  carried.set(MAGIC);
  writeU32(carried, 4, input.exactArtifactBytes.byteLength);
  writeU16(carried, 8, filename.byteLength);
  writeU16(carried, 10, mime.byteLength);
  carried.set(compressed, HEADER_BYTES);
  return carried;
}

export type ReceizPlayableMaterialKind = "image" | "audio" | "video" | "pdf" | "text" | "binary";

export type VerifiedReceizMaterialUrlProjection = Readonly<{
  exactSealedArtifactBytes: Uint8Array;
  sealedFilename: string;
  sealedMimeType: string;
  sealedArtifactSha256: string;
  payloadBytes: Uint8Array;
  payloadFilename: string;
  payloadMimeType: string;
  payloadSha256: string;
  playableKind: ReceizPlayableMaterialKind;
  canonicalReceizPath: string;
  canonicalReceizUrl: string;
  presentationUrl: string;
  authority: Readonly<{
    sdkIsProofAuthority: false;
    strongerTruth: "sealed-receiz-proof-object";
  }>;
}>;

export type OpenVerifiedReceizMaterialUrlOptions = Readonly<{
  sourceUrls?: readonly string[];
  fetcher?: typeof fetch;
  receizOrigin?: string;
}>;

function writeU32(bytes: Uint8Array, offset: number, value: number): void {
  bytes[offset] = (value >>> 24) & 0xff;
  bytes[offset + 1] = (value >>> 16) & 0xff;
  bytes[offset + 2] = (value >>> 8) & 0xff;
  bytes[offset + 3] = value & 0xff;
}

function readU32(bytes: Uint8Array, offset: number): number {
  return (bytes[offset]! * 0x1000000 + (bytes[offset + 1]! << 16) + (bytes[offset + 2]! << 8) + bytes[offset + 3]!) >>> 0;
}

function writeU16(bytes: Uint8Array, offset: number, value: number): void {
  bytes[offset] = (value >>> 8) & 0xff;
  bytes[offset + 1] = value & 0xff;
}

function readU16(bytes: Uint8Array, offset: number): number {
  return ((bytes[offset]! << 8) | bytes[offset + 1]!) >>> 0;
}

function playableKind(mimeType: string): ReceizPlayableMaterialKind {
  const mime = mimeType.trim().toLowerCase();
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("audio/")) return "audio";
  if (mime.startsWith("video/")) return "video";
  if (mime === "application/pdf") return "pdf";
  if (mime.startsWith("text/") || mime === "application/json" || mime === "image/svg+xml") return "text";
  return "binary";
}

export function encodeReceizMaterialCapsule(input: Readonly<{
  exactArtifactBytes: Uint8Array;
  filename: string;
  mimeType: string;
}>): string {
  const carried = encodeReceizMaterialCapsuleBytes(input);
  return `${RECEIZ_MATERIAL_CAPSULE_PREFIX}${receizBase64UrlEncode(carried)}`;
}

export function decodeReceizMaterialCapsuleBytes(carried: Uint8Array): ReceizMaterialCapsule {
  if (carried.byteLength <= HEADER_BYTES || !MAGIC.every((value, index) => carried[index] === value)) {
    throw new TypeError("RECEIZ_MATERIAL_CAPSULE_HEADER_INVALID");
  }
  const artifactLength = readU32(carried, 4);
  const filenameLength = readU16(carried, 8);
  const mimeLength = readU16(carried, 10);
  if (!artifactLength || artifactLength > MAX_RECEIZ_MATERIAL_CAPSULE_BYTES) throw new RangeError("RECEIZ_MATERIAL_CAPSULE_LENGTH_INVALID");
  if (!filenameLength || filenameLength > MAX_FILENAME_BYTES || !mimeLength || mimeLength > MAX_MIME_BYTES) {
    throw new RangeError("RECEIZ_MATERIAL_CAPSULE_PROJECTION_INVALID");
  }
  const projectedLength = artifactLength + filenameLength + mimeLength;
  const opened = inflateSync(carried.slice(HEADER_BYTES), { out: new Uint8Array(projectedLength + 1) });
  if (opened.byteLength !== projectedLength) throw new TypeError("RECEIZ_MATERIAL_CAPSULE_LENGTH_MISMATCH");
  return Object.freeze({
    exactArtifactBytes: opened.slice(filenameLength + mimeLength),
    filename: decoder.decode(opened.slice(0, filenameLength)),
    mimeType: decoder.decode(opened.slice(filenameLength, filenameLength + mimeLength)),
  });
}

export function decodeReceizMaterialCapsule(token: string): ReceizMaterialCapsule {
  const normalized = token.trim();
  if (!normalized.startsWith(RECEIZ_MATERIAL_CAPSULE_PREFIX)) throw new TypeError("RECEIZ_MATERIAL_CAPSULE_SCHEMA_INVALID");
  const carried = receizBase64UrlDecode(normalized.slice(RECEIZ_MATERIAL_CAPSULE_PREFIX.length));
  return decodeReceizMaterialCapsuleBytes(carried);
}

export function readReceizMaterialCapsuleFromUrl(materialUrl: string | URL): ReceizMaterialCapsule | null {
  const url = materialUrl instanceof URL ? materialUrl : new URL(materialUrl, "https://receiz.com");
  const token = new URLSearchParams(url.hash.startsWith("#") ? url.hash.slice(1) : url.hash).get(RECEIZ_MATERIAL_FRAGMENT_KEY);
  return token ? decodeReceizMaterialCapsule(token) : null;
}

/** Receiz-owned v/ routes bind their presented path; external domains remain projection wrappers beneath artifact truth. */
export function receizMaterialPresentedLinkForVerification(materialUrl: string | URL): string | undefined {
  const url = materialUrl instanceof URL ? materialUrl : new URL(materialUrl, "https://receiz.com");
  const host = url.hostname.toLowerCase();
  return host === "receiz.com" || host === "www.receiz.com" ? url.toString() : undefined;
}

function carriesHeldMaterialSourceFields(url: URL): boolean {
  const fields = new URLSearchParams(url.hash.startsWith("#") ? url.hash.slice(1) : url.hash);
  return fields.has("material-manifest") || fields.has("material-source");
}

/** Verifies the enclosing proof object before projecting its exact native payload bytes. */
export async function openVerifiedReceizMaterialUrl(
  materialUrl: string | URL,
  options: OpenVerifiedReceizMaterialUrlOptions = {},
): Promise<VerifiedReceizMaterialUrlProjection> {
  const url = materialUrl instanceof URL ? new URL(materialUrl.toString()) : new URL(materialUrl, "https://receiz.com");
  const token = new URLSearchParams(url.hash.startsWith("#") ? url.hash.slice(1) : url.hash).get(RECEIZ_MATERIAL_FRAGMENT_KEY);
  if (!token) throw new TypeError("RECEIZ_MATERIAL_URL_CAPSULE_REQUIRED");
  const packageDigest = readReceizMaterialCompositePackageDigest(token);
  let capsule: ReceizMaterialCapsule;
  if (packageDigest) {
    const heldSourceUrls = options.sourceUrls ?? [];
    const heldSourcesPresented = heldSourceUrls.length > 0 || carriesHeldMaterialSourceFields(url);
    const resolved = heldSourcesPresented
      ? await resolveReceizMaterialCompositeFromSources({
          headUrl: url.toString(),
          sourceUrls: heldSourceUrls,
        })
      : await resolveReceizMaterialCompositeTransport({
          packageDigest,
          ...(options.receizOrigin === undefined ? {} : { receizOrigin: options.receizOrigin }),
          ...(options.fetcher === undefined ? {} : { fetcher: options.fetcher }),
        });
    if (
      (url.hostname.toLowerCase() === "receiz.com" || url.hostname.toLowerCase() === "www.receiz.com")
      && url.pathname !== resolved.manifest.verifyPath
    ) throw new TypeError("RECEIZ_MATERIAL_COMPOSITE_ROUTE_BINDING_REJECTED");
    capsule = resolved.manifest.capsuleEncoding === "rma3/raw"
      ? decodeReceizRawMaterialCapsuleBytes({
          capsuleBytes: resolved.capsuleBytes,
          manifest: resolved.manifest,
        })
      : decodeReceizMaterialCapsuleBytes(resolved.capsuleBytes);
    if (
      capsule.exactArtifactBytes.byteLength !== resolved.manifest.sealedArtifactByteLength
      || await sha256Hex(capsule.exactArtifactBytes) !== resolved.manifest.sealedArtifactSha256
    ) throw new TypeError("RECEIZ_MATERIAL_COMPOSITE_ARTIFACT_BINDING_REJECTED");
  } else {
    capsule = decodeReceizMaterialCapsule(token);
  }
  const presentedLink = receizMaterialPresentedLinkForVerification(url);
  const opened = await verifyAndExtractReceizDocumentBytesCanonical({
    fileBytes: capsule.exactArtifactBytes,
    filename: capsule.filename,
    mime: capsule.mimeType,
    ...(presentedLink ? { optionalLink: presentedLink } : {}),
    signatureV4RootPublicKeys: receizCurrentPinnedSignatureV4Roots(),
  });
  if (!opened.ok || !opened.verification.ok || !opened.verification.integrity.ok) {
    throw new TypeError("RECEIZ_MATERIAL_URL_ARTIFACT_REJECTED");
  }
  const verifyPath = typeof opened.verification.bundle?.verifyPath === "string"
    ? opened.verification.bundle.verifyPath
    : "";
  if (!/^\/v\/[^/?#]+\/[^/?#]+\/[^/?#]+$/.test(verifyPath)) {
    throw new TypeError("RECEIZ_MATERIAL_URL_PROOF_PATH_INVALID");
  }
  const canonicalReceizUrl = new URL(`${verifyPath}${url.hash}`, "https://receiz.com").toString();
  return Object.freeze({
    exactSealedArtifactBytes: capsule.exactArtifactBytes.slice(),
    sealedFilename: capsule.filename,
    sealedMimeType: capsule.mimeType,
    sealedArtifactSha256: await sha256Hex(capsule.exactArtifactBytes),
    payloadBytes: opened.payloadBytes.slice(),
    payloadFilename: opened.payloadFilename,
    payloadMimeType: opened.payloadMimeType,
    payloadSha256: await sha256Hex(opened.payloadBytes),
    playableKind: playableKind(opened.payloadMimeType),
    canonicalReceizPath: verifyPath,
    canonicalReceizUrl,
    presentationUrl: url.toString(),
    authority: Object.freeze({
      sdkIsProofAuthority: false as const,
      strongerTruth: "sealed-receiz-proof-object" as const,
    }),
  });
}

export function createReceizPlayableMaterialObjectUrl(
  verified: VerifiedReceizMaterialUrlProjection,
): Readonly<{ url: string; revoke: () => void; kind: ReceizPlayableMaterialKind; mimeType: string; filename: string }> {
  if (verified.authority.sdkIsProofAuthority !== false || verified.authority.strongerTruth !== "sealed-receiz-proof-object") {
    throw new TypeError("RECEIZ_MATERIAL_PROJECTION_NOT_VERIFIED");
  }
  if (typeof URL.createObjectURL !== "function" || typeof URL.revokeObjectURL !== "function") {
    throw new TypeError("RECEIZ_MATERIAL_OBJECT_URL_UNAVAILABLE");
  }
  const payloadCopy = new Uint8Array(verified.payloadBytes.byteLength);
  payloadCopy.set(verified.payloadBytes);
  const url = URL.createObjectURL(new Blob([payloadCopy.buffer], { type: verified.payloadMimeType }));
  let revoked = false;
  return Object.freeze({
    url,
    kind: verified.playableKind,
    mimeType: verified.payloadMimeType,
    filename: verified.payloadFilename,
    revoke: () => {
      if (revoked) return;
      revoked = true;
      URL.revokeObjectURL(url);
    },
  });
}
