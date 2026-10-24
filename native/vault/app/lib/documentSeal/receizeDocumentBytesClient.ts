"use client";

import { generateDocumentSealGroth16ProofClient } from "@/app/lib/documentSeal/realGroth16ProofClient";
import { maybeSignReceizBundleV4 } from "@/app/lib/security/receizSignatureV4";
import type { ReceizBundleSignatureV4Signer } from "@/app/lib/security/receizSignatureV4";
import {
  activeReceizSignatureV4SignerFromEnrollment,
  enrollReceizSignatureV4DeviceFromServer,
} from "@/app/lib/security/receizSignatureV4Enrollment";
import {
  planReceizDocumentSealCoordinates,
  receizeDocumentBytesCore,
  type ReceizeDocumentSealCoordinates,
  type ReceizeDocumentResultMeta,
  type ReceizedKind,
} from "@/app/lib/documentSeal/receizeDocumentBytesCore";
import { buildReceizedDownloadName, detectDocumentFormat } from "@/app/lib/documentSeal/fileFormat";
import { readPngTextChunk } from "@/app/utils/pngChunks";
import {
  coerceReceizNativeRecordSeal,
  decodeReceizProofBundle,
  RECEIZ_PROOF_BUNDLE_CHUNK_KEY,
  type ReceizProofBundle,
} from "@/app/utils/receizProofBundle";
import type { ReceizPortableOwnershipContinuity } from "../../../packages/receiz-sdk/src/portableAsset";

const OFFLINE_SEAL_SIGNING_KEY = "receiz-offline-signing-key-v2";
const OFFLINE_SIGNATURE_V4_ENROLLMENT_REQUIRED = "offline_signature_v4_enrollment_required";
export const LEGACY_SAFARI_ONLINE_SEAL_REQUIRED = "legacy_safari_online_seal_requires_safari_17";
const DOCUMENT_SEAL_ENDPOINT = "/api/document-seal";

let nativeEd25519SupportPromise: Promise<boolean> | null = null;

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = bytes.buffer;
  if (buffer instanceof ArrayBuffer) {
    if (bytes.byteOffset === 0 && bytes.byteLength === buffer.byteLength) return buffer;
    return buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  }
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

function isSafariFamilyBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const isAppleWebKit = /AppleWebKit/i.test(ua);
  if (!isAppleWebKit) return false;
  const isAndroid = /Android/i.test(ua);
  if (isAndroid) return false;
  const isSafari = /Safari/i.test(ua) && !/(Chrome|Chromium|Edg|OPR|SamsungBrowser)/i.test(ua);
  const isIosWebKit = /\b(iPhone|iPad|iPod)\b/i.test(ua);
  return isSafari || isIosWebKit;
}

async function supportsNativeEd25519SealKeys(): Promise<boolean> {
  if (!globalThis.crypto?.subtle) return false;
  if (!nativeEd25519SupportPromise) {
    nativeEd25519SupportPromise = (async () => {
      try {
        const generated = (await crypto.subtle.generateKey({ name: "Ed25519" }, true, [
          "sign",
          "verify",
        ])) as CryptoKeyPair;
        const publicRaw = await crypto.subtle.exportKey("raw", generated.publicKey);
        const privatePkcs8 = await crypto.subtle.exportKey("pkcs8", generated.privateKey);
        if (publicRaw.byteLength !== 32 || privatePkcs8.byteLength === 0) return false;
        const privateKey = await crypto.subtle.importKey("pkcs8", privatePkcs8, { name: "Ed25519" }, false, [
          "sign",
        ]);
        const sig = await crypto.subtle.sign("Ed25519", privateKey, toArrayBuffer(new Uint8Array([1, 2, 3, 4])));
        return sig.byteLength === 64;
      } catch {
        return false;
      }
    })();
  }
  return nativeEd25519SupportPromise;
}

async function shouldUseOnlineSafariSealFallback(): Promise<boolean> {
  if (!isSafariFamilyBrowser()) return false;
  return !(await supportsNativeEd25519SealKeys());
}

export async function canReceizeDocumentBytesClientProducePng(): Promise<boolean> {
  return !(await shouldUseOnlineSafariSealFallback());
}

function filenameFromContentDisposition(value: string | null): string | null {
  const raw = (value || "").trim();
  if (!raw) return null;
  const star = /filename\*=UTF-8''([^;]+)/i.exec(raw);
  if (star?.[1]) {
    try {
      return decodeURIComponent(star[1]).replace(/[\/\\]+/g, "_").trim() || null;
    } catch {
      return star[1].replace(/[\/\\]+/g, "_").trim() || null;
    }
  }
  const quoted = /filename="([^"]+)"/i.exec(raw);
  if (quoted?.[1]) return quoted[1].replace(/[\/\\]+/g, "_").trim() || null;
  const bare = /filename=([^;]+)/i.exec(raw);
  if (bare?.[1]) return bare[1].replace(/[\/\\]+/g, "_").trim() || null;
  return null;
}

function proofBundleFromBundleBytes(bytes: Uint8Array): ReceizProofBundle {
  const parsed = JSON.parse(new TextDecoder().decode(bytes)) as { proofbundle?: unknown; proofBundle?: unknown };
  const proofBundle = parsed.proofbundle ?? parsed.proofBundle;
  if (!proofBundle || typeof proofBundle !== "object") {
    throw new Error("legacy_safari_online_seal_invalid_bundle");
  }
  return proofBundle as ReceizProofBundle;
}

type ReceizeDocumentBytesClientOptions = {
  visualStamp?: boolean;
  forceBundleEnvelope?: boolean;
  claimSha256Hex?: string | null;
  requirePng?: boolean;
  onProgress?: (ratio: number) => void;
  nativeRecordSeal?: Readonly<{
    ownerReceizId: string;
    recordId: string;
    ownershipContinuity?: ReceizPortableOwnershipContinuity;
    verifiedPredecessor?: Readonly<{
      artifactSha256: string;
      proofBundle: ReceizProofBundle;
    }>;
  }>;
};

function isVerifiedOwnedPngPredecessor(args: {
  fileBytes: Uint8Array;
  filename: string;
  mime: string;
  options?: ReceizeDocumentBytesClientOptions;
}): boolean {
  const predecessor = args.options?.nativeRecordSeal?.verifiedPredecessor;
  if (!predecessor) return false;
  if (detectDocumentFormat(args.fileBytes, { filename: args.filename, mime: args.mime }) !== "png") {
    return false;
  }
  return Boolean(
    coerceReceizNativeRecordSeal(predecessor.proofBundle.nativeRecordSeal)?.ownershipContinuity,
  );
}

function metaFromProofBundle(args: {
  fileBytes: Uint8Array;
  filename: string;
  mime: string;
  proofBundle: ReceizProofBundle;
  note?: string;
}): ReceizeDocumentResultMeta {
  const proofBundle = args.proofBundle;
  const anchorId = typeof proofBundle.anchorId === "string" ? proofBundle.anchorId : "";
  const createdAtMs = Number.isFinite(Number(proofBundle.createdAtMs)) ? Math.trunc(Number(proofBundle.createdAtMs)) : Date.now();
  const verifyPath = typeof proofBundle.verifyPath === "string" ? proofBundle.verifyPath : "";
  const params = new URLSearchParams();
  if (anchorId) params.set("a", anchorId);
  params.set("ms", String(createdAtMs));
  const anchoredVerifyPath = verifyPath ? `${verifyPath}?${params.toString()}` : "";

  return {
    sourceFormat: detectDocumentFormat(args.fileBytes, { filename: args.filename, mime: args.mime }),
    basisSha256: typeof proofBundle.artifactSha256Basis === "string" ? proofBundle.artifactSha256Basis : "",
    strippedExistingProofs: 0,
    visualStampApplied: false,
    verifyPath,
    proofBundle,
    anchor: {
      anchorId,
      anchoredAt: new Date(createdAtMs).toISOString(),
      anchoredVerifyPath,
    },
    note: args.note,
  };
}

function metaFromOnlineBundle(args: {
  fileBytes: Uint8Array;
  filename: string;
  mime: string;
  artifactBytes: Uint8Array;
}): ReceizeDocumentResultMeta {
  return metaFromProofBundle({
    ...args,
    proofBundle: proofBundleFromBundleBytes(args.artifactBytes),
    note: "This older Safari browser used online sealing. Upgrade Safari to 17+ for offline sealing on this device.",
  });
}

function metaFromOnlinePng(args: {
  fileBytes: Uint8Array;
  filename: string;
  mime: string;
  artifactBytes: Uint8Array;
}): ReceizeDocumentResultMeta {
  const encoded = readPngTextChunk(args.artifactBytes, RECEIZ_PROOF_BUNDLE_CHUNK_KEY);
  if (!encoded) throw new Error("legacy_safari_online_seal_missing_png_bundle");
  return metaFromProofBundle({
    ...args,
    proofBundle: decodeReceizProofBundle(encoded),
    note: "This older Safari browser used online PNG sealing so the image-carried Receiz proof stays inspectable.",
  });
}

async function sealOnlineForLegacySafari(args: {
  fileBytes: Uint8Array;
  filename: string;
  mime: string;
  options?: ReceizeDocumentBytesClientOptions;
}): Promise<{ artifactBytes: Uint8Array; downloadName: string; kind: ReceizedKind; meta: ReceizeDocumentResultMeta }> {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    throw new Error(LEGACY_SAFARI_ONLINE_SEAL_REQUIRED);
  }

  const preserveVerifiedOwnedPng = isVerifiedOwnedPngPredecessor(args);
  const form = new FormData();
  form.set("file", new Blob([toArrayBuffer(args.fileBytes)], { type: args.mime || "application/octet-stream" }), args.filename || "document");
  if (args.options?.forceBundleEnvelope || (!args.options?.requirePng && !preserveVerifiedOwnedPng)) {
    form.set("forceBundleEnvelope", "1");
  }
  if (args.options?.visualStamp) form.set("visualStamp", "1");
  if (args.options?.claimSha256Hex) form.set("claimSha256Hex", args.options.claimSha256Hex);
  if (args.options?.nativeRecordSeal) {
    form.set("nativeOwnership", "1");
    form.set("nativeRecordSeal", JSON.stringify(args.options.nativeRecordSeal));
  }

  let response: Response;
  try {
    response = await fetch(DOCUMENT_SEAL_ENDPOINT, {
      method: "POST",
      body: form,
      cache: "no-store",
      credentials: "same-origin",
    });
  } catch {
    throw new Error(LEGACY_SAFARI_ONLINE_SEAL_REQUIRED);
  }

  if (!response.ok) {
    const errorPayload = (await response.json().catch(() => null)) as { error?: unknown } | null;
    const reason = typeof errorPayload?.error === "string" ? errorPayload.error : "online_seal_failed";
    throw new Error(reason);
  }

  const artifactBytes = new Uint8Array(await response.arrayBuffer());
  const sealKind = response.headers.get("x-receiz-seal-kind")?.trim().toLowerCase();
  const downloadName =
    filenameFromContentDisposition(response.headers.get("content-disposition")) ||
    (sealKind === "png"
      ? buildReceizedDownloadName({ filename: args.filename || "document.png", keepExtension: true })
      : `${buildReceizedDownloadName({ filename: args.filename || "document", keepExtension: false })}.receizbundle`);

  if (args.options?.requirePng || preserveVerifiedOwnedPng) {
    if (sealKind !== "png") throw new Error("legacy_safari_online_seal_png_required");
    return {
      artifactBytes,
      downloadName,
      kind: "png",
      meta: metaFromOnlinePng({
        fileBytes: args.fileBytes,
        filename: args.filename,
        mime: args.mime,
        artifactBytes,
      }),
    };
  }

  return {
    artifactBytes,
    downloadName,
    kind: "bundle",
    meta: metaFromOnlineBundle({
      fileBytes: args.fileBytes,
      filename: args.filename,
      mime: args.mime,
      artifactBytes,
    }),
  };
}

function appOriginForVerify(): string {
  if (typeof window === "undefined") return "https://receiz.com";
  return window.location.origin;
}

export async function planReceizDocumentBytesClientSeal(args?: {
  now?: number;
  kaiUpulse?: string;
}): Promise<ReceizeDocumentSealCoordinates> {
  return planReceizDocumentSealCoordinates({
    now: args?.now,
    kaiUpulse: args?.kaiUpulse,
    signingKey: OFFLINE_SEAL_SIGNING_KEY,
    verifyOrigin: appOriginForVerify(),
  });
}

export async function ensureTrustedSignature(bundle: ReceizProofBundle): Promise<ReceizProofBundle> {
  if (bundle.signatureV4) return bundle;

  const unsigned = { ...bundle } as ReceizProofBundle & { signatureV3?: unknown; signatureV4?: unknown };
  delete unsigned.signatureV3;
  delete unsigned.signatureV4;

  let v4Signer = await activeReceizSignatureV4SignerFromEnrollment();
  if (!v4Signer) {
    const enrollment = await enrollReceizSignatureV4DeviceFromServer().catch(() => ({
      enrolled: false, reason: "enrollment_request_failed",
    }));
    if (!enrollment.enrolled && enrollment.reason !== "already_active") {
      console.warn("receiz_signature_v4_enrollment_unavailable", enrollment.reason);
    }
    v4Signer = await activeReceizSignatureV4SignerFromEnrollment();
  }

  if (v4Signer) {
    const fromV4 = await maybeSignReceizBundleV4(unsigned, v4Signer);
    if (fromV4) {
      return { ...bundle, signatureV4: fromV4 };
    }
  }

  throw new Error(OFFLINE_SIGNATURE_V4_ENROLLMENT_REQUIRED);
}

export async function receizeDocumentBytesClient(args: {
  fileBytes: Uint8Array;
  filename: string;
  mime: string;
  now?: number;
  verifyOrigin?: string;
  kaiUpulse?: string;
  options?: ReceizeDocumentBytesClientOptions;
}): Promise<{ artifactBytes: Uint8Array; downloadName: string; kind: ReceizedKind; meta: ReceizeDocumentResultMeta }> {
  args.options?.onProgress?.(0);
  if (await shouldUseOnlineSafariSealFallback()) {
    const sealed = await sealOnlineForLegacySafari(args);
    args.options?.onProgress?.(1);
    return sealed;
  }

  const sealed = await receizeDocumentBytesCore(args, {
    signingKey: OFFLINE_SEAL_SIGNING_KEY,
    verifyOrigin: args.verifyOrigin ?? appOriginForVerify(),
    generateProof: generateDocumentSealGroth16ProofClient,
    attachTrustedSignature: ensureTrustedSignature,
  });
  args.options?.onProgress?.(1);
  return sealed;
}

export async function receizeDocumentBytesClientWithSignatureV4Signer(
  args: Parameters<typeof receizeDocumentBytesClient>[0],
  signer: ReceizBundleSignatureV4Signer,
): ReturnType<typeof receizeDocumentBytesClient> {
  if (await shouldUseOnlineSafariSealFallback()) {
    throw new Error(OFFLINE_SIGNATURE_V4_ENROLLMENT_REQUIRED);
  }
  args.options?.onProgress?.(0);
  const sealed = await receizeDocumentBytesCore(args, {
    signingKey: OFFLINE_SEAL_SIGNING_KEY,
    verifyOrigin: appOriginForVerify(),
    generateProof: generateDocumentSealGroth16ProofClient,
    attachTrustedSignature: async (bundle) => {
      if (bundle.signatureV4) return bundle;
      const unsigned = { ...bundle } as ReceizProofBundle & { signatureV3?: unknown; signatureV4?: unknown };
      delete unsigned.signatureV3;
      delete unsigned.signatureV4;
      const signatureV4 = await maybeSignReceizBundleV4(unsigned, signer);
      if (!signatureV4) throw new Error(OFFLINE_SIGNATURE_V4_ENROLLMENT_REQUIRED);
      return { ...bundle, signatureV4 };
    },
  });
  args.options?.onProgress?.(1);
  return sealed;
}
