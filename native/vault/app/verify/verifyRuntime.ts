import { carriedVerifierOriginal } from "./identityDisplay";
import { executeSelectedSource, unavailableSelectedSourceExecution } from "@/app/lib/documentSeal/selectedSourceExecution";
import { inflateSync } from "fflate";
import { detectDocumentFormat } from "@/app/lib/documentSeal/fileFormat";
import { coerceReceizAnchorBundle } from "@/app/utils/receizAnchorBundle";
import { embedReceizProofBundleIntoJson, parseReceizJsonProof } from "@/app/lib/documentSeal/jsonProof";
import { embedReceizProofBundleIntoPdf, extractReceizProofBundlesFromPdf, stripReceizSealUpdatesFromPdf } from "@/app/lib/documentSeal/pdfProof";
import { embedReceizProofBundleIntoSvg, parseReceizSvgProof } from "@/app/lib/documentSeal/svgProof";
import { appendReceizTrailer, parseReceizTrailer } from "@/app/lib/documentSeal/trailerProof";
import { recognizeJpegIosPwaCameraRollV6Projection } from "@/app/lib/documentSeal/jpegArtifactBasis";
import {
  classifyReceizAssetContinuity,
  verifyAndExtractReceizDocumentBytes,
  verifyReceizDocumentBytes,
  verifyReceizFolderFiles,
} from "@/app/lib/receizArtifactVerifier";
import {
  insertPngTextChunks,
  readPngTextChunk,
  readPngTextChunks,
  stripPngTextChunksByKeyword,
} from "@/app/utils/pngChunks";
import {
  coerceReceizProofBundle,
  encodeReceizProofBundle,
  RECEIZ_PROOF_BUNDLE_CHUNK_KEY,
} from "@/app/utils/receizProofBundle";
import { base64UrlDecode } from "@/app/utils/sha256";
import { verifyOfflineReceiz } from "@/app/lib/offlineReceiz";
import { pinnedReceizSignatureV4RootPublicKeysForClient } from "@/app/lib/security/receizSignatureV4Pinned";
import type { ReceizArtifactVerificationResult } from "@/app/lib/receizArtifactVerifier";
import type { ReceizSignatureV4RootPublicKey } from "@/app/lib/security/receizSignatureV4";
import type { ReceizLocalArtifactVerificationResult } from "../../packages/receiz-sdk/src/verifier/types";
import {
  verifyReceizNativeCaptureCommitmentV1,
  verifyReceizNativeCaptureV1,
  type ReceizNativeCaptureV1,
} from "../../packages/receiz-sdk/src/nativeCapture";
import {
  verifyReceizPbiProofObjectAuthorshipChainV1,
  type ReceizPbiProofObjectAuthorshipAppendV1,
} from "../../packages/receiz-sdk/src/proofObjectAuthorship";

export type ArtifactBytesInput = Readonly<{
  fileBytes: Uint8Array;
  filename?: string;
  mime?: string;
}>;

type FolderFilesInput = {
  files: { path: string; mime?: string; bytes: Uint8Array }[];
};

const LEGACY_BUNDLE_CODECS = new Set(["c1", "j0"]);
const RECEIZ_NATIVE_CAPTURE_SOURCE_CHUNK_KEY = "receiz.native_capture.source.v1";
const legacyTextDecoder = new TextDecoder();
const legacyTextEncoder = new TextEncoder();

export type ReceizVerifierProjectionResult = ReceizArtifactVerificationResult & Readonly<{
  nativeCapture: ReceizNativeCaptureV1 | null;
  pbiAuthorshipHistory: readonly ReceizPbiProofObjectAuthorshipAppendV1[];
  identitySource?: Readonly<{ state: "verified" | "invalid" | "unavailable"; result?: ReceizVerifierProjectionResult }>;
}>;

function failedAppendProjection(
  verification: ReceizArtifactVerificationResult,
  error?: string,
): ReceizVerifierProjectionResult {
  return {
    ...verification,
    ...(error
      ? { ok: false, errors: [...verification.errors, error] }
      : {}),
    nativeCapture: null,
    pbiAuthorshipHistory: [],
  };
}

function failedCanonicalStreamingTrailerAdmission(
  verification: ReceizLocalArtifactVerificationResult,
  error?: string,
): ReceizArtifactVerificationResult {
  const errors = error ? [...verification.errors, error] : [...verification.errors];
  return {
    ok: false,
    integrity: { ok: false, errors },
    kind: verification.kind,
    errors,
    warnings: verification.warnings,
    bundle: null,
    anchor: null,
    package: null,
    ...(verification.denial ? { denial: verification.denial } : {}),
  };
}

export async function admitCanonicalStreamingTrailerVerification(
  verification: ReceizLocalArtifactVerificationResult,
): Promise<ReceizArtifactVerificationResult> {
  if (!verification.ok || verification.integrity.ok !== true) {
    return failedCanonicalStreamingTrailerAdmission(verification);
  }

  const bundle = coerceReceizProofBundle(verification.bundle);
  const anchor = coerceReceizAnchorBundle(verification.anchor);
  if (
    verification.kind !== "trailer"
    || !bundle
    || !anchor
    || verification.package !== null
  ) {
    return failedCanonicalStreamingTrailerAdmission(
      verification,
      "Canonical streaming proof projection is invalid.",
    );
  }

  return {
    ok: true,
    integrity: { ok: true, errors: [] },
    kind: "trailer",
    errors: [],
    warnings: verification.warnings,
    bundle,
    anchor,
    package: null,
    assetContinuity: await classifyReceizAssetContinuity(new Uint8Array(), bundle),
  };
}

function nativeCaptureSourceBytes(
  bundle: NonNullable<ReceizArtifactVerificationResult["bundle"]>,
  payloadBytes: Uint8Array,
): Uint8Array {
  if (!bundle.nativeCaptureSource) return payloadBytes;
  const source = bundle.nativeCaptureSource;
  const sourceKeys = Object.keys(source);
  if (
    sourceKeys.length !== 3
    || !sourceKeys.includes("schema")
    || !sourceKeys.includes("carrier")
    || !sourceKeys.includes("sourceBytesSha256")
    || source.schema !== "receiz.native_capture_source.v1"
    || source.carrier !== "png.iTXt"
    || typeof source.sourceBytesSha256 !== "string"
  ) {
    throw new Error("native_capture_source_descriptor_invalid");
  }
  const chunks = readPngTextChunks(payloadBytes).filter(
    (entry) => entry.keyword === RECEIZ_NATIVE_CAPTURE_SOURCE_CHUNK_KEY,
  );
  if (chunks.length !== 1) throw new Error("native_capture_source_chunk_invalid");
  return base64UrlDecode(chunks[0]!.text);
}

export async function projectVerifiedV115Appends(
  verification: ReceizArtifactVerificationResult,
  payloadBytes: Uint8Array,
  roots: ReadonlyMap<string, ReceizSignatureV4RootPublicKey> = pinnedReceizSignatureV4RootPublicKeysForClient(),
): Promise<ReceizVerifierProjectionResult> {
  if (!verification.ok || !verification.bundle) {
    return failedAppendProjection(verification);
  }

  try {
    const bundle = verification.bundle;
    let nativeCapture: ReceizNativeCaptureV1 | null = null;
    if (typeof bundle.nativeCapture !== "undefined") {
      const sourceBytes = nativeCaptureSourceBytes(bundle, payloadBytes);
      const coordinates = {
        slug: bundle.slug,
        code: bundle.code,
        pulse: bundle.kaiPulseEternal,
        verifyPath: bundle.verifyPath,
      };
      const verifiedCameraRollProjection = (
        !bundle.nativeCaptureSource
        && bundle.artifactBasis?.normalization === "jpeg-ios-photos-carrier-v6"
        && detectDocumentFormat(payloadBytes, {}) === "jpeg"
      )
        ? await recognizeJpegIosPwaCameraRollV6Projection(payloadBytes)
        : null;
      nativeCapture = verifiedCameraRollProjection
        ? await verifyReceizNativeCaptureCommitmentV1(bundle.nativeCapture, coordinates)
        : await verifyReceizNativeCaptureV1(bundle.nativeCapture, {
            sourceBytes,
            coordinates,
          });
      if (!nativeCapture) throw new Error("native_capture_append_verification_failed");
      if (
        bundle.nativeCaptureSource
        && bundle.nativeCaptureSource.sourceBytesSha256 !== nativeCapture.sourceSha256
      ) {
        throw new Error("native_capture_source_binding_failed");
      }
    } else if (
      typeof bundle.nativeCaptureSource !== "undefined"
      || typeof bundle.nativeCaptureClaim !== "undefined"
    ) {
      throw new Error("native_capture_append_missing");
    }

    const rawHistory = bundle.pbiAuthorshipHistory;
    if (typeof rawHistory !== "undefined" && !Array.isArray(rawHistory)) {
      throw new Error("pbi_authorship_history_invalid");
    }
    const pbiAuthorshipHistory = rawHistory ?? [];
    if (!await verifyReceizPbiProofObjectAuthorshipChainV1(pbiAuthorshipHistory)) {
      throw new Error("pbi_authorship_history_verification_failed");
    }

    let identitySource: ReceizVerifierProjectionResult["identitySource"];
    const continuity = verification.assetContinuity;
    if (carriedVerifierOriginal(verification) && continuity?.state === "verified" && continuity.carrier === "portable_asset") {
      try {
        const nestedBytes = base64UrlDecode(continuity.document.payload.bytesBase64Url);
        // Exact base64 nesting strictly reduces source size; canonical opening
        // already binds these bytes to the enclosing portable payload digest.
        if (nestedBytes.byteLength >= payloadBytes.byteLength) throw new Error("nested_source_resource_unavailable");
        const nested = await verifySelectedArtifactWithHostRoots({ fileBytes: nestedBytes, mime: continuity.document.payload.mimeType }, roots);
        identitySource = { state: nested.result.denial ? "unavailable" : nested.result.ok ? "verified" : "invalid", result: nested.result };
      } catch {
        identitySource = { state: "unavailable" };
      }
    }
    return {
      ...verification,
      ...(identitySource ? { identitySource } : {}),
      nativeCapture,
      pbiAuthorshipHistory:
        pbiAuthorshipHistory as readonly ReceizPbiProofObjectAuthorshipAppendV1[],
    };
  } catch (error) {
    return failedAppendProjection(
      verification,
      error instanceof Error ? error.message : "v115_append_projection_failed",
    );
  }
}

function buildLegacyCompatibleBundle(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const kaiLine = typeof row.kaiLine === "string" ? row.kaiLine : "";
  const kaiKlok = typeof row.kaiKlok === "string" ? row.kaiKlok.trim() : "";
  if (!kaiLine || kaiKlok) return null;
  return coerceReceizProofBundle({ ...row, kaiKlok: kaiLine });
}

function decodeLegacyProofBundlePayload(encoded: string): unknown | null {
  const raw = encoded.trim();
  if (!raw) return null;

  const [codec, payload] = raw.split(":", 2);
  const normalizedCodec = codec.toLowerCase();
  if (payload && LEGACY_BUNDLE_CODECS.has(normalizedCodec)) {
    try {
      if (normalizedCodec === "c1") {
        const compressed = base64UrlDecode(payload);
        return JSON.parse(legacyTextDecoder.decode(inflateSync(compressed))) as unknown;
      }
      return JSON.parse(legacyTextDecoder.decode(base64UrlDecode(payload))) as unknown;
    } catch {
      // fall through
    }
  }

  try {
    return JSON.parse(legacyTextDecoder.decode(base64UrlDecode(raw))) as unknown;
  } catch {
    return null;
  }
}

function upgradeLegacyEncodedProofBundle(encoded: string): string | null {
  const parsed = decodeLegacyProofBundlePayload(encoded);
  const upgraded = buildLegacyCompatibleBundle(parsed);
  if (!upgraded) return null;
  return encodeReceizProofBundle(upgraded);
}

function patchLegacyBundleEnvelopeArtifact(fileBytes: Uint8Array): Uint8Array | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(legacyTextDecoder.decode(fileBytes));
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  const row = parsed as Record<string, unknown>;
  if (row.kind !== "receiz.bundle.v1") return null;
  const patchedBundle = buildLegacyCompatibleBundle(row.proofbundle);
  if (!patchedBundle) return null;
  return legacyTextEncoder.encode(JSON.stringify({ ...row, proofbundle: patchedBundle }));
}

function patchLegacyTrailerArtifact(fileBytes: Uint8Array): Uint8Array | null {
  const parsed = parseReceizTrailer(fileBytes);
  if (parsed.trailerCount !== 1 || parsed.parseError || !parsed.bundle) return null;
  const patchedBundle = buildLegacyCompatibleBundle(parsed.bundle);
  if (!patchedBundle) return null;
  return appendReceizTrailer({ basisBytes: parsed.basisBytes, bundle: patchedBundle });
}

export async function normalizeLegacyKaiLineArtifact(
  input: ArtifactBytesInput
): Promise<{ fileBytes: Uint8Array; normalized: boolean }> {
  const envelopePatched = patchLegacyBundleEnvelopeArtifact(input.fileBytes);
  if (envelopePatched) return { fileBytes: envelopePatched, normalized: true };

  const format = detectDocumentFormat(input.fileBytes, { filename: input.filename, mime: input.mime });

  if (format === "png") {
    try {
      const encoded = readPngTextChunk(input.fileBytes, RECEIZ_PROOF_BUNDLE_CHUNK_KEY);
      if (encoded) {
        const upgraded = upgradeLegacyEncodedProofBundle(encoded);
        if (upgraded) {
          const stripped = stripPngTextChunksByKeyword(input.fileBytes, RECEIZ_PROOF_BUNDLE_CHUNK_KEY);
          const patched = insertPngTextChunks(stripped.pngBytes, [{ keyword: RECEIZ_PROOF_BUNDLE_CHUNK_KEY, text: upgraded }]);
          return { fileBytes: patched, normalized: true };
        }
      }
    } catch {
      // ignore
    }
  } else if (format === "pdf") {
    try {
      const proofBundles = extractReceizProofBundlesFromPdf(input.fileBytes);
      if (proofBundles.length === 1) {
        const upgraded = upgradeLegacyEncodedProofBundle(proofBundles[0] ?? "");
        if (upgraded) {
          const stripped = stripReceizSealUpdatesFromPdf(input.fileBytes);
          const patched = embedReceizProofBundleIntoPdf({ pdfBytes: stripped.pdfBytes, encodedBundle: upgraded });
          return { fileBytes: patched, normalized: true };
        }
      }
    } catch {
      // ignore
    }
  } else if (format === "svg") {
    try {
      const parsed = parseReceizSvgProof(input.fileBytes);
      if (parsed.proofCount === 1 && !parsed.parseError && parsed.encodedBundle) {
        const upgraded = upgradeLegacyEncodedProofBundle(parsed.encodedBundle);
        if (upgraded) {
          const patched = embedReceizProofBundleIntoSvg({ svgBytes: input.fileBytes, encodedBundle: upgraded });
          return { fileBytes: patched.svgBytes, normalized: true };
        }
      }
    } catch {
      // ignore
    }
  } else if (format === "json") {
    try {
      const parsed = parseReceizJsonProof(input.fileBytes);
      if (parsed.proofCount === 1 && !parsed.parseError && parsed.encodedBundle) {
        const upgraded = upgradeLegacyEncodedProofBundle(parsed.encodedBundle);
        if (upgraded) {
          const patched = embedReceizProofBundleIntoJson({ jsonBytes: input.fileBytes, encodedBundle: upgraded });
          return { fileBytes: patched.jsonBytes, normalized: true };
        }
      }
    } catch {
      // ignore
    }
  }

  const trailerPatched = patchLegacyTrailerArtifact(input.fileBytes);
  if (trailerPatched) return { fileBytes: trailerPatched, normalized: true };

  return { fileBytes: input.fileBytes, normalized: false };
}

export async function getPinnedSignatureV4RootPublicKeys(): Promise<
  ReadonlyMap<string, ReceizSignatureV4RootPublicKey>
> {
  return pinnedReceizSignatureV4RootPublicKeysForClient();
}

export async function verifyReceizDocumentBytesWithPinnedKeys(
  args: ArtifactBytesInput
): Promise<ReceizArtifactVerificationResult> {
  return verifyReceizDocumentBytes({
    ...args,
    signatureV4RootPublicKeys: pinnedReceizSignatureV4RootPublicKeysForClient(),
  });
}

export async function verifyReceizFolderFilesWithPinnedKeys(
  args: FolderFilesInput
): Promise<ReceizArtifactVerificationResult> {
  return verifyReceizFolderFiles({
    ...args,
    signatureV4RootPublicKeys: pinnedReceizSignatureV4RootPublicKeysForClient(),
  });
}

export async function verifySelectedArtifactLocally(input: ArtifactBytesInput): Promise<{
  result: ReceizVerifierProjectionResult;
  normalizedLegacy: boolean;
}> {
  return verifySelectedArtifactWithHostRoots(input, snapshotSelectedHostRoots());
}

function snapshotSelectedHostRoots(): ReadonlyMap<string, ReceizSignatureV4RootPublicKey> {
  return new Map([...pinnedReceizSignatureV4RootPublicKeysForClient()].map(([kid, root]) => [kid, Object.freeze({ ...root })]));
}

async function verifySelectedArtifactWithHostRoots(input: ArtifactBytesInput, roots: ReadonlyMap<string, ReceizSignatureV4RootPublicKey>): Promise<{
  result: ReceizVerifierProjectionResult; normalizedLegacy: boolean;
}> {
  const normalized = await normalizeLegacyKaiLineArtifact(input);
  const opened = await verifyAndExtractReceizDocumentBytes({
    ...input,
    fileBytes: normalized.fileBytes,
    signatureV4RootPublicKeys: roots,
  });
  const result = opened.ok
    ? await projectVerifiedV115Appends(opened.verification, opened.payloadBytes, roots)
    : failedAppendProjection(opened.verification);
  return {
    result,
    normalizedLegacy: normalized.normalized,
  };
}

export async function verifySelectedFileLocally(file: File): Promise<{
  result: ReceizVerifierProjectionResult;
  normalizedLegacy: boolean;
}> {
  const filename = file.name;
  const mime = file.type;
  const roots = snapshotSelectedHostRoots();
  const selected = await executeSelectedSource({ file, filename, mime, signatureV4RootPublicKeys: roots });
  if (selected.execution === "complete") {
    try {
      return await verifySelectedArtifactWithHostRoots({ fileBytes: selected.bytes, filename, mime }, roots);
    } catch {
      const unavailable = unavailableSelectedSourceExecution();
      return { result: failedAppendProjection(await admitCanonicalStreamingTrailerVerification(unavailable.result.verification)), normalizedLegacy: false };
    }
  }
  const streamed = selected.result;
  const admitted = await admitCanonicalStreamingTrailerVerification(streamed.verification);
  return {
    result: await projectVerifiedV115Appends(admitted, new Uint8Array()),
    normalizedLegacy: false,
  };
}

export function verifyOfflineReceizRecord(ts: string, code: string, pulse: string): boolean {
  return verifyOfflineReceiz(ts, code, pulse);
}
