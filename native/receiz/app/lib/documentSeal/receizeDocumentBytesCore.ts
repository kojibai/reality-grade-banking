import { formatReceizTimestampNY } from "@/app/lib/time";
import { hmacHex } from "@/app/lib/sign";
import { buildKaiKlockResponseFromPulse } from "@/app/utils/kai_pulse";
import { nextLiveProofKaiUpulse } from "@/app/lib/kai/liveProofKai";
import { insertPngTextChunks, readPngTextChunks, stripPngTextChunksByKeyword } from "@/app/utils/pngChunks";
import { sha256Hex } from "@/app/utils/sha256";
import { computeReceizLocalSealAnchorId } from "@/app/utils/receizLocalSealAnchor";
import { jcsCanonicalize } from "@/app/utils/jcs";
import {
  buildReceizCanonicalIdentity,
  buildReceizProofBundle,
  appendReceizNativeOwnershipContinuity,
  decodeReceizProofBundle,
  encodeReceizProofBundle,
  createReceizNativeOwnershipGenesis,
  coerceReceizNativeOwnershipContinuity,
  coerceReceizNativeRecordSeal,
  RECEIZ_PROOF_BUNDLE_CHUNK_KEY,
  type ReceizNativeOwnershipContinuity,
  type ReceizProofBundle,
} from "@/app/utils/receizProofBundle";
import { buildAnchoredReceizVerifyPath } from "@/app/lib/documentSeal/verifyLink";
import { RECEIZ_ANCHOR_BUNDLE_CHUNK_KEY } from "@/app/utils/receizAnchorBundle";
import { RECEIZ_OWNERSHIP_PROVENANCE_CHUNK_KEY } from "@/app/utils/receizOwnershipProvenanceBundle";
import { encodeReceizBundleEnvelope, type ReceizBundleManifest } from "@/app/lib/documentSeal/bundleContainer";
import {
  buildReceizedDownloadName,
  detectDocumentFormat,
  extensionFromFilename,
  extensionForFormat,
  type ReceizDocumentFormat,
} from "@/app/lib/documentSeal/fileFormat";
import {
  embedReceizProofBundleIntoPdf,
  extractReceizProofBundlesFromPdf,
  stripReceizSealUpdatesFromPdf,
} from "@/app/lib/documentSeal/pdfProof";
import { appendReceizTrailer, stripReceizTrailer } from "@/app/lib/documentSeal/trailerProof";
import {
  JPEG_IOS_PHOTOS_CARRIER_V6_ARTIFACT_BASIS,
  normalizeJpegIosPhotosCarrierV6Basis,
  type ReceizArtifactBasisDeclaration,
} from "@/app/lib/documentSeal/jpegArtifactBasis";
import { embedReceizProofBundleIntoSvg, parseReceizSvgProof } from "@/app/lib/documentSeal/svgProof";
import { embedReceizProofBundleIntoJson, parseReceizJsonProof } from "@/app/lib/documentSeal/jsonProof";
import { appendReceizHeicProof, parseReceizHeicProof } from "@/app/lib/documentSeal/heicProof";

const RECEIZ_GROTH16_NOTICE_CHUNK_KEY = "receiz.groth16";

function stripReceizPngProofCarriers(pngBytes: Uint8Array): {
  pngBytes: Uint8Array;
  removedProofCount: number;
} {
  const withoutProof = stripPngTextChunksByKeyword(pngBytes, RECEIZ_PROOF_BUNDLE_CHUNK_KEY);
  const withoutOwnershipProvenance = stripPngTextChunksByKeyword(
    withoutProof.pngBytes,
    RECEIZ_OWNERSHIP_PROVENANCE_CHUNK_KEY,
  );
  const withoutAnchor = stripPngTextChunksByKeyword(
    withoutOwnershipProvenance.pngBytes,
    RECEIZ_ANCHOR_BUNDLE_CHUNK_KEY,
  );
  const withoutGroth16Notice = stripPngTextChunksByKeyword(
    withoutAnchor.pngBytes,
    RECEIZ_GROTH16_NOTICE_CHUNK_KEY,
  );
  return {
    pngBytes: withoutGroth16Notice.pngBytes,
    removedProofCount: withoutProof.removedCount,
  };
}
import {
  deriveReceizPortableOwnershipContinuity,
  parseReceizPortableAssetDocument,
  type ReceizPortableOwnershipContinuity,
} from "../../../packages/receiz-sdk/src/portableAsset";

export type ReceizedKind = "png" | "pdf" | "heic-box" | "trailer" | "bundle";

export type ReceizeDocumentAnchorMeta = Readonly<{
  anchorId: string;
  anchoredAt: string;
  anchoredVerifyPath: string;
}>;

export type ReceizeDocumentResultMeta = Readonly<{
  sourceFormat: ReceizDocumentFormat;
  basisSha256: string;
  strippedExistingProofs: number;
  visualStampApplied: boolean;
  verifyPath: string;
  proofBundle: ReceizProofBundle;
  anchor: ReceizeDocumentAnchorMeta;
  note?: string;
}>;

export type ReceizeDocumentProofArtifacts = Readonly<{
  zkPoseidonHash: string;
  groth16Proof: string;
  groth16ProofDigest: string;
}>;

export type ReceizeDocumentSealCoordinates = Readonly<{
  createdAtMs: number;
  kaiUpulse: string;
  ts: string;
  slug: string;
  code: string;
  pulse: string;
  kaiKlok: string;
  verifyPath: string;
  verifyUrl: string;
}>;

export type ReceizeDocumentCoreDeps = Readonly<{
  signingKey: string;
  verifyOrigin: string;
  generateProof: (args: {
    signingKey: string;
    canonicalIdentity: string;
    artifactSha256Basis: string;
    onProgress?: (ratio: number) => void;
  }) => Promise<ReceizeDocumentProofArtifacts>;
  attachTrustedSignature: (bundle: ReceizProofBundle) => Promise<ReceizProofBundle>;
  persistAnchor?: (args: {
    code: string;
    pulse: string;
    file: {
      name: string;
      size: number;
      mime: string;
      sha256Hex: string;
    };
  }) => Promise<{ anchorId: string; anchoredAt: string } | null>;
  applyVisualStampToPng?: (args: {
    pngBytes: Uint8Array;
    code: string;
    pulse: string;
    verifyPath: string;
    ts: string;
  }) => Promise<{ pngBytes: Uint8Array; applied: boolean; note?: string }>;
}>;

function mergeNotes(...notes: Array<string | undefined>): string | undefined {
  const merged = notes
    .map((note) => (note || "").trim())
    .filter((note) => note.length > 0)
    .join(" ");
  return merged.length > 0 ? merged : undefined;
}

export function receizedContentType(kind: ReceizedKind, uploadedMime: string): string {
  if (kind === "png") return "image/png";
  if (kind === "pdf") return "application/pdf";
  if (kind === "heic-box") return "image/heic";
  if (kind === "bundle") return "application/vnd.receiz.bundle+json";
  return uploadedMime || "application/octet-stream";
}

export async function planReceizDocumentSealCoordinates(args: {
  now?: number;
  kaiUpulse?: string;
  signingKey: string;
  verifyOrigin: string;
}): Promise<ReceizeDocumentSealCoordinates> {
  const createdAtMs = Number.isFinite(args.now) ? Math.trunc(args.now as number) : Date.now();
  const ts = formatReceizTimestampNY(new Date(createdAtMs));
  const kaiUpulse = args.kaiUpulse ?? nextLiveProofKaiUpulse();
  if (!/^\d+$/u.test(kaiUpulse)) throw new TypeError("DOCUMENT_SEAL_KAI_UPULSE_INVALID");
  const pulse = (BigInt(kaiUpulse) / 1_000_000n).toString();
  const kai = await buildKaiKlockResponseFromPulse(BigInt(pulse));
  const kaiKlok = kai.compressed_summary;
  const signature = await hmacHex(`receiz|${ts}|${pulse}|v2`, args.signingKey);
  const code = signature.slice(0, 8).toUpperCase();
  const slug = ts.replace(/-/g, "").replace(/:/g, "").replace(/ /g, "_");
  const verifyPath = `/v/${slug}/${code}/${pulse}`;
  const verifyOrigin = (args.verifyOrigin || "https://receiz.com").replace(/\/+$/, "");
  const verifyUrl = `${verifyOrigin}${verifyPath}`;

  return {
    createdAtMs,
    kaiUpulse,
    ts,
    slug,
    code,
    pulse,
    kaiKlok,
    verifyPath,
    verifyUrl,
  };
}

export async function receizeDocumentBytesCore(
  args: {
    fileBytes: Uint8Array;
    filename: string;
    mime: string;
    now?: number;
    kaiUpulse?: string;
    options?: {
      visualStamp?: boolean;
      forceBundleEnvelope?: boolean;
      claimSha256Hex?: string | null;
      nativeRecordSeal?: Readonly<{
        ownerReceizId: string;
        recordId: string;
        ownershipContinuity?: ReceizPortableOwnershipContinuity;
        verifiedPredecessor?: Readonly<{
          artifactSha256: string;
          proofBundle: ReceizProofBundle;
        }>;
      }>;
      onProgress?: (ratio: number) => void;
    };
  },
  deps: ReceizeDocumentCoreDeps,
): Promise<{
  artifactBytes: Uint8Array;
  downloadName: string;
  kind: ReceizedKind;
  meta: ReceizeDocumentResultMeta;
}> {
  let reportedProgress = 0;
  const reportProgress = (ratio: number) => {
    const normalized = Math.max(reportedProgress, Math.min(1, Math.max(0, ratio)));
    if (normalized === reportedProgress && normalized !== 0) return;
    reportedProgress = normalized;
    args.options?.onProgress?.(normalized);
  };
  reportProgress(0);
  const plannedSeal = await planReceizDocumentSealCoordinates({
    now: args.now,
    kaiUpulse: args.kaiUpulse,
    signingKey: deps.signingKey,
    verifyOrigin: deps.verifyOrigin,
  });
  reportProgress(0.08);
  const { createdAtMs, ts, pulse, kaiKlok, code, slug, verifyPath, verifyUrl } = plannedSeal;
  const verifyOrigin = verifyUrl.endsWith(verifyPath)
    ? verifyUrl.slice(0, -verifyPath.length)
    : (deps.verifyOrigin || "https://receiz.com").replace(/\/+$/, "");
  const sourceFormat = detectDocumentFormat(args.fileBytes, { filename: args.filename, mime: args.mime });
  const visualStampRequested = !!args.options?.visualStamp;
  const claimSha256Hex = (() => {
    const raw = typeof args.options?.claimSha256Hex === "string" ? args.options.claimSha256Hex.trim().toLowerCase() : "";
    return /^[0-9a-f]{64}$/.test(raw) ? raw : "";
  })();
  let visualStampApplied = false;
  let visualStampRuntimeNote: string | undefined;
  const visualStampUnsupportedNote =
    visualStampRequested && sourceFormat !== "png"
      ? "Visual stamp is currently supported for PNG artifacts only; proof embedding completed without a pixel overlay."
      : undefined;
  const preferredExtension = extensionFromFilename(args.filename) ?? extensionForFormat(sourceFormat) ?? "bin";
  const sourceFilename = (args.filename || "document").trim() || "document";
  const sourceMime = (args.mime || "application/octet-stream").trim() || "application/octet-stream";
  const inputArtifactSha256 = (await sha256Hex(args.fileBytes)).toLowerCase();
  reportProgress(0.18);

  const computeSealAnchorId = async (fileSha256Hex: string): Promise<string> => {
    return computeReceizLocalSealAnchorId({ code, pulse, claimSha256Hex, artifactSha256Basis: fileSha256Hex });
  };

  const buildBundleForBasis = async (
    basisBytes: Uint8Array,
    artifactBasis?: ReceizArtifactBasisDeclaration,
  ): Promise<{
    basisSha256: string;
    proofBundle: ReceizProofBundle;
    anchor: ReceizeDocumentAnchorMeta;
  }> => {
    const basisSha256 = (await sha256Hex(basisBytes)).toLowerCase();
    reportProgress(0.26);
    let anchorId = await computeSealAnchorId(basisSha256);
    let anchoredAt = new Date(createdAtMs).toISOString();

    try {
      const persisted = await deps.persistAnchor?.({
        code,
        pulse,
        file: {
          name: sourceFilename,
          size: basisBytes.byteLength,
          mime: sourceMime,
          sha256Hex: basisSha256,
        },
      });
      if (persisted?.anchorId) {
        anchorId = persisted.anchorId;
        anchoredAt = persisted.anchoredAt || anchoredAt;
      }
    } catch {
      // Keep deterministic local anchor embedding even when shared persistence is unavailable.
    }

    const anchoredVerifyPath = `${verifyPath}?a=${anchorId}&ms=${String(createdAtMs)}`;
    const anchoredVerifyUrl = `${verifyOrigin}${anchoredVerifyPath}`;
    const canonicalIdentity = buildReceizCanonicalIdentity({
      payloadVersion: "v2",
      canonicalTs24: ts,
      slug,
      code,
      kaiPulseEternal: pulse,
    });
    const zk = await deps.generateProof({
      signingKey: deps.signingKey,
      canonicalIdentity,
      artifactSha256Basis: basisSha256,
      onProgress: (ratio) => reportProgress(0.3 + Math.min(1, Math.max(0, ratio)) * 0.5),
    });
    reportProgress(0.82);
    let unsignedProofBundle = await buildReceizProofBundle({
      payloadVersion: "v2",
      createdAtMs,
      ts,
      code,
      slug,
      verifyPath,
      verifyUrl: anchoredVerifyUrl,
      kaiPulseEternal: pulse,
      kaiKlok,
      signingKey: deps.signingKey,
      anchorId,
      zkPoseidonHash: zk.zkPoseidonHash,
      groth16Proof: zk.groth16Proof,
      groth16ProofDigest: zk.groth16ProofDigest,
      artifactSha256Basis: basisSha256,
      ...(artifactBasis ? { artifactBasis } : {}),
    });
    // Native ownership appends retain the exact admitted predecessor identity,
    // chronology, authorship and carried proof fields. Only ownership and the
    // successor signature change. The immutable basis must remain identical.
    const admittedPredecessor = args.options?.nativeRecordSeal?.verifiedPredecessor;
    if (admittedPredecessor?.proofBundle.nativeRecordSeal?.ownershipContinuity) {
      if (admittedPredecessor.artifactSha256 !== inputArtifactSha256
        || admittedPredecessor.proofBundle.artifactSha256Basis !== basisSha256) {
        throw new Error("Verified proof predecessor basis does not match the selected proof object.");
      }
      const preserved = { ...admittedPredecessor.proofBundle };
      delete preserved.signatureV3;
      delete preserved.signatureV4;
      unsignedProofBundle = preserved;
      anchorId = preserved.anchorId ?? anchorId;
      anchoredAt = new Date(preserved.createdAtMs).toISOString();
    }
    reportProgress(0.88);
    let ownershipContinuity: ReceizNativeOwnershipContinuity | null = null;
    let proofPredecessor: Readonly<{ headReference: string; artifactSha256: string }> | null = null;
    if (args.options?.nativeRecordSeal) {
      let portableContinuityFound = false;
      try {
        const parsedPayload = JSON.parse(new TextDecoder().decode(basisBytes)) as unknown;
        const portableDocument = await parseReceizPortableAssetDocument(parsedPayload);
        const derived = await deriveReceizPortableOwnershipContinuity(portableDocument);
        portableContinuityFound = true;
        const requested = args.options.nativeRecordSeal.ownershipContinuity ?? null;
        const requestedMatches = Boolean(
          requested
          && requested.artifactId === derived.artifactId
          && requested.namespace === derived.namespace
          && requested.genesisOwnerReceizId === derived.genesisOwnerReceizId
          && requested.ownerReceizId === derived.ownerReceizId
          && requested.historyDigestSha256 === derived.historyDigestSha256
          && requested.appendCount === derived.appendCount,
        );
        if (requested && !requestedMatches) {
          throw new Error("Portable ownership continuity does not match the sealed proof object.");
        }
        if (
          derived.ownerReceizId === args.options.nativeRecordSeal.ownerReceizId
          && (derived.appendCount === 0 || requestedMatches)
        ) {
          ownershipContinuity = coerceReceizNativeOwnershipContinuity({
            schema: "receiz.native_ownership_continuity.v1",
            ...derived,
            headReference: unsignedProofBundle.receizClaimId,
          });
        } else if (requested) {
          throw new Error("Portable ownership continuity owner does not match the native Record owner.");
        }
      } catch (error) {
        if (args.options.nativeRecordSeal.ownershipContinuity) throw error;
      }
      if (!portableContinuityFound) {
        const predecessorInput = args.options.nativeRecordSeal.verifiedPredecessor;
        if (predecessorInput) {
          const predecessorArtifactSha256 = predecessorInput.artifactSha256.trim().toLowerCase();
          const predecessorBundle = predecessorInput.proofBundle;
          const predecessorSeal = coerceReceizNativeRecordSeal(predecessorBundle.nativeRecordSeal);
          const predecessorContinuity = predecessorSeal?.ownershipContinuity ?? null;
          if (
            !/^[0-9a-f]{64}$/.test(predecessorArtifactSha256)
            || predecessorArtifactSha256 !== inputArtifactSha256
          ) {
            throw new Error("Verified proof predecessor does not match the selected proof object.");
          }
          proofPredecessor = {
            headReference: predecessorBundle.receizClaimId,
            artifactSha256: predecessorArtifactSha256,
          };
          if (!predecessorSeal || !predecessorContinuity) {
            ownershipContinuity = await createReceizNativeOwnershipGenesis({
              artifactId: basisSha256,
              namespace: `receiz.native-proof:${basisSha256}`,
              ownerReceizId: args.options.nativeRecordSeal.ownerReceizId,
              headReference: unsignedProofBundle.receizClaimId,
            });
          } else {
            if (
              predecessorSeal.payload.sha256 !== basisSha256
              || predecessorContinuity.artifactId !== basisSha256
              || predecessorContinuity.ownerReceizId !== predecessorSeal.ownerReceizId
              || predecessorContinuity.headReference !== predecessorBundle.receizClaimId
            ) {
              throw new Error("Verified native ownership predecessor does not match the selected proof object.");
            }
            ownershipContinuity = await appendReceizNativeOwnershipContinuity({
              predecessor: predecessorContinuity,
              predecessorArtifactSha256,
              ownerReceizId: args.options.nativeRecordSeal.ownerReceizId,
              headReference: unsignedProofBundle.receizClaimId,
            });
          }
        } else {
          ownershipContinuity = await createReceizNativeOwnershipGenesis({
            artifactId: basisSha256,
            namespace: `receiz.native-proof:${basisSha256}`,
            ownerReceizId: args.options.nativeRecordSeal.ownerReceizId,
            headReference: unsignedProofBundle.receizClaimId,
          });
        }
      }
    }
    const nativeRecordSeal = args.options?.nativeRecordSeal
      ? coerceReceizNativeRecordSeal({
          schema: "receiz.native_record_seal.v1",
          ownerReceizId: args.options.nativeRecordSeal.ownerReceizId,
          recordId: admittedPredecessor?.proofBundle.nativeRecordSeal?.recordId ?? args.options.nativeRecordSeal.recordId,
          payload: admittedPredecessor?.proofBundle.nativeRecordSeal?.payload ?? {
            filename: sourceFilename,
            mimeType: sourceMime,
            sha256: basisSha256,
          },
          ...(ownershipContinuity ? { ownershipContinuity } : {}),
          ...(proofPredecessor ? { proofPredecessor } : {}),
        })
      : null;
    if (args.options?.nativeRecordSeal && !nativeRecordSeal) {
      throw new Error("Invalid native Record seal metadata.");
    }
    const proofBundle = await deps.attachTrustedSignature({
      ...unsignedProofBundle,
      ...(nativeRecordSeal ? { nativeRecordSeal } : {}),
    });
    reportProgress(0.96);
    return {
      basisSha256,
      proofBundle,
      anchor: {
        anchorId,
        anchoredAt,
        anchoredVerifyPath,
      },
    };
  };

  const asMeta = (params: {
    basisSha256: string;
    strippedExistingProofs: number;
    proofBundle: ReceizProofBundle;
    anchor: ReceizeDocumentAnchorMeta;
    note?: string;
  }): ReceizeDocumentResultMeta => {
    const note = mergeNotes(params.note, visualStampRuntimeNote, visualStampUnsupportedNote);
    return {
      sourceFormat,
      basisSha256: params.basisSha256,
      strippedExistingProofs: params.strippedExistingProofs,
      visualStampApplied,
      verifyPath,
      proofBundle: params.proofBundle,
      anchor: params.anchor,
      ...(note ? { note } : {}),
    };
  };

  const buildBundleFallback = async (note: string): Promise<{
    artifactBytes: Uint8Array;
    downloadName: string;
    kind: "bundle";
    meta: ReceizeDocumentResultMeta;
  }> => {
    const basisBytes = args.fileBytes.slice();
    const { basisSha256, proofBundle, anchor } = await buildBundleForBasis(basisBytes);
    const manifest: ReceizBundleManifest = {
      filename: args.filename || "document.bin",
      mime: args.mime || "application/octet-stream",
      basisSha256,
      createdAt: createdAtMs,
      version: 1,
    };
    const artifactBytes = encodeReceizBundleEnvelope({
      manifest,
      originalBytes: basisBytes,
      proofbundle: proofBundle,
    });
    const downloadName = `${buildReceizedDownloadName({ filename: args.filename || "document", keepExtension: false })}.receizbundle`;
    return {
      artifactBytes,
      downloadName,
      kind: "bundle",
      meta: asMeta({ basisSha256, strippedExistingProofs: 0, proofBundle, anchor, note }),
    };
  };

  const buildTrailerResult = async (params: {
    basisBytes: Uint8Array;
    removedCount: number;
    note: string;
  }): Promise<{
    artifactBytes: Uint8Array;
    downloadName: string;
    kind: "trailer";
    meta: ReceizeDocumentResultMeta;
  }> => {
    const { basisSha256, proofBundle, anchor } = await buildBundleForBasis(params.basisBytes);
    const artifactBytes = appendReceizTrailer({ basisBytes: params.basisBytes, bundle: proofBundle });
    const downloadName = buildReceizedDownloadName({
      filename: args.filename || `document.${preferredExtension}`,
      forcedExtension: preferredExtension,
    });
    return {
      artifactBytes,
      downloadName,
      kind: "trailer",
      meta: asMeta({
        basisSha256,
        strippedExistingProofs: params.removedCount,
        proofBundle,
        anchor,
        note: params.note,
      }),
    };
  };

  const buildVerifiedOwnedPngSuccessor = async (predecessorInput: Readonly<{
    artifactSha256: string;
    proofBundle: ReceizProofBundle;
  }>): Promise<{
    artifactBytes: Uint8Array;
    downloadName: string;
    kind: "png";
    meta: ReceizeDocumentResultMeta;
  }> => {
    const predecessorArtifactSha256 = predecessorInput.artifactSha256.trim().toLowerCase();
    if (
      !/^[0-9a-f]{64}$/.test(predecessorArtifactSha256)
      || predecessorArtifactSha256 !== inputArtifactSha256
    ) {
      throw new Error("Verified proof predecessor does not match the selected proof object.");
    }

    const carriedProofs = readPngTextChunks(args.fileBytes)
      .filter((entry) => entry.keyword === RECEIZ_PROOF_BUNDLE_CHUNK_KEY);
    if (carriedProofs.length !== 1) {
      throw new Error("Canonical predecessor proof carrier count is invalid.");
    }
    const carriedPredecessor = decodeReceizProofBundle(carriedProofs[0]!.text);
    if (jcsCanonicalize(carriedPredecessor) !== jcsCanonicalize(predecessorInput.proofBundle)) {
      throw new Error("Verified predecessor bundle does not match the selected proof object.");
    }

    const exactPriorCarrier = stripPngTextChunksByKeyword(
      args.fileBytes,
      RECEIZ_PROOF_BUNDLE_CHUNK_KEY,
    );
    if (exactPriorCarrier.removedCount !== 1) {
      throw new Error("Canonical predecessor proof carrier count is invalid.");
    }
    const predecessorBundle = predecessorInput.proofBundle;
    const basisSha256 = String(predecessorBundle.artifactSha256Basis ?? "").trim().toLowerCase();
    if (
      !/^[0-9a-f]{64}$/.test(basisSha256)
      || (await sha256Hex(exactPriorCarrier.pngBytes)).toLowerCase() !== basisSha256
    ) {
      throw new Error("Verified predecessor basis does not match the selected proof object.");
    }

    const predecessorSeal = coerceReceizNativeRecordSeal(predecessorBundle.nativeRecordSeal);
    const predecessorContinuity = predecessorSeal?.ownershipContinuity ?? null;
    if (
      !predecessorSeal
      || !predecessorContinuity
      || predecessorSeal.payload.sha256 !== basisSha256
      || predecessorContinuity.artifactId !== basisSha256
      || predecessorContinuity.ownerReceizId !== predecessorSeal.ownerReceizId
      || predecessorContinuity.headReference !== predecessorBundle.receizClaimId
      || predecessorSeal.recordId !== args.options?.nativeRecordSeal?.recordId
    ) {
      throw new Error("Verified native ownership predecessor does not match the selected proof object.");
    }

    const ownershipContinuity = await appendReceizNativeOwnershipContinuity({
      predecessor: predecessorContinuity,
      predecessorArtifactSha256,
      ownerReceizId: args.options!.nativeRecordSeal!.ownerReceizId,
      headReference: predecessorBundle.receizClaimId,
    });
    const nativeRecordSeal = coerceReceizNativeRecordSeal({
      schema: "receiz.native_record_seal.v1",
      ownerReceizId: args.options!.nativeRecordSeal!.ownerReceizId,
      recordId: predecessorSeal.recordId,
      payload: predecessorSeal.payload,
      ownershipContinuity,
      proofPredecessor: {
        headReference: predecessorBundle.receizClaimId,
        artifactSha256: predecessorArtifactSha256,
      },
    });
    if (!nativeRecordSeal) throw new Error("Invalid native Record seal metadata.");

    const unsignedSuccessor = { ...predecessorBundle } as ReceizProofBundle & {
      signatureV3?: unknown;
      signatureV4?: unknown;
    };
    delete unsignedSuccessor.signatureV3;
    delete unsignedSuccessor.signatureV4;
    const canonicalUnsignedSuccessor: ReceizProofBundle = {
      ...unsignedSuccessor,
      nativeRecordSeal,
    };
    const proofBundle = await deps.attachTrustedSignature(canonicalUnsignedSuccessor);
    const signedProjection = { ...proofBundle } as ReceizProofBundle & {
      signatureV3?: unknown;
      signatureV4?: unknown;
    };
    delete signedProjection.signatureV3;
    delete signedProjection.signatureV4;
    if (jcsCanonicalize(signedProjection) !== jcsCanonicalize(canonicalUnsignedSuccessor)) {
      throw new Error("Trusted signature changed the canonical ownership successor.");
    }

    const artifactBytes = insertPngTextChunks(exactPriorCarrier.pngBytes, [{
      keyword: RECEIZ_PROOF_BUNDLE_CHUNK_KEY,
      text: encodeReceizProofBundle(proofBundle),
    }]);
    const decodedSuccessor = readPngTextChunks(artifactBytes)
      .filter((entry) => entry.keyword === RECEIZ_PROOF_BUNDLE_CHUNK_KEY);
    if (
      decodedSuccessor.length !== 1
      || jcsCanonicalize(decodeReceizProofBundle(decodedSuccessor[0]!.text)) !== jcsCanonicalize(proofBundle)
    ) {
      throw new Error("Canonical ownership successor carrier is invalid.");
    }

    const anchorId = proofBundle.anchorId ?? "";
    const anchoredVerifyPath = buildAnchoredReceizVerifyPath({
      verifyPath: proofBundle.verifyPath,
      anchorId,
      createdAtMs: proofBundle.createdAtMs,
    });
    const note = mergeNotes(
      visualStampRequested
        ? "Visual stamp was not applied because a verified proof-object append preserves the exact predecessor carrier."
        : undefined,
    );
    return {
      artifactBytes,
      downloadName: buildReceizedDownloadName({
        filename: args.filename || "document.png",
        forcedExtension: extensionForFormat("png") ?? "png",
      }),
      kind: "png",
      meta: {
        sourceFormat,
        basisSha256,
        strippedExistingProofs: 1,
        visualStampApplied: false,
        verifyPath: proofBundle.verifyPath,
        proofBundle,
        anchor: {
          anchorId,
          anchoredAt: new Date(proofBundle.createdAtMs).toISOString(),
          anchoredVerifyPath,
        },
        ...(note ? { note } : {}),
      },
    };
  };

  const verifiedPngPredecessor = sourceFormat === "png"
    ? args.options?.nativeRecordSeal?.verifiedPredecessor
    : undefined;
  if (
    verifiedPngPredecessor
    && coerceReceizNativeRecordSeal(verifiedPngPredecessor.proofBundle.nativeRecordSeal)?.ownershipContinuity
  ) {
    return buildVerifiedOwnedPngSuccessor(verifiedPngPredecessor);
  }

  if (args.options?.forceBundleEnvelope) {
    return buildBundleFallback("Wrapped in Receiz bundle envelope.");
  }

  if (sourceFormat === "png") {
    const stripped = stripReceizPngProofCarriers(args.fileBytes);
    let basisBytes = stripped.pngBytes;
    if (visualStampRequested && deps.applyVisualStampToPng) {
      const stamped = await deps.applyVisualStampToPng({
        pngBytes: basisBytes,
        code,
        pulse,
        verifyPath,
        ts,
      });
      basisBytes = stamped.pngBytes;
      visualStampApplied = stamped.applied;
      visualStampRuntimeNote = stamped.note;
    }
    const { basisSha256, proofBundle, anchor } = await buildBundleForBasis(basisBytes);
    const encodedBundle = encodeReceizProofBundle(proofBundle);
    const artifactBytes = insertPngTextChunks(basisBytes, [{ keyword: RECEIZ_PROOF_BUNDLE_CHUNK_KEY, text: encodedBundle }]);
    const downloadName = buildReceizedDownloadName({
      filename: args.filename || "document.png",
      forcedExtension: extensionForFormat("png") ?? "png",
    });
    return {
      artifactBytes,
      downloadName,
      kind: "png",
      meta: asMeta({ basisSha256, strippedExistingProofs: stripped.removedProofCount, proofBundle, anchor }),
    };
  }

  if (sourceFormat === "pdf") {
    const stripped = stripReceizSealUpdatesFromPdf(args.fileBytes);
    const basisBytes = stripped.pdfBytes;
    const remainingProofs = extractReceizProofBundlesFromPdf(basisBytes);
    if (remainingProofs.length > 0) {
      return buildTrailerResult({
        basisBytes,
        removedCount: stripped.removedCount,
        note: "Legacy PDF proof metadata remained after strip; proof was embedded as trailing Receiz marker block.",
      });
    }

    const { basisSha256, proofBundle, anchor } = await buildBundleForBasis(basisBytes);
    const encodedBundle = encodeReceizProofBundle(proofBundle);
    const artifactBytes = embedReceizProofBundleIntoPdf({ pdfBytes: basisBytes, encodedBundle });
    const downloadName = buildReceizedDownloadName({
      filename: args.filename || "document.pdf",
      forcedExtension: extensionForFormat("pdf") ?? "pdf",
    });
    return {
      artifactBytes,
      downloadName,
      kind: "pdf",
      meta: asMeta({ basisSha256, strippedExistingProofs: stripped.removedCount, proofBundle, anchor }),
    };
  }

  if (sourceFormat === "heic") {
    const parsed = parseReceizHeicProof(args.fileBytes);
    if (parsed.parseError) throw new Error(parsed.parseError);
    const { basisSha256, proofBundle, anchor } = await buildBundleForBasis(parsed.basisBytes);
    const artifactBytes = appendReceizHeicProof({ basisBytes: parsed.basisBytes, bundle: proofBundle });
    const downloadName = buildReceizedDownloadName({
      filename: args.filename || "document.heic",
      forcedExtension: extensionForFormat("heic") ?? "heic",
    });
    return {
      artifactBytes,
      downloadName,
      kind: "heic-box",
      meta: asMeta({
        basisSha256,
        strippedExistingProofs: parsed.proofCount,
        proofBundle,
        anchor,
        note: "Proof embedded in the native HEIC UUID channel.",
      }),
    };
  }

  if (sourceFormat === "svg") {
    const parsed = parseReceizSvgProof(args.fileBytes);
    const basisBytes = parsed.basisBytes;
    const { basisSha256, proofBundle, anchor } = await buildBundleForBasis(basisBytes);
    const encodedBundle = encodeReceizProofBundle(proofBundle);
    const embedded = embedReceizProofBundleIntoSvg({
      svgBytes: basisBytes,
      encodedBundle,
    });
    const downloadName = buildReceizedDownloadName({
      filename: args.filename || "document.svg",
      forcedExtension: preferredExtension,
    });
    return {
      artifactBytes: embedded.svgBytes,
      downloadName,
      kind: "trailer",
      meta: asMeta({
        basisSha256,
        strippedExistingProofs: parsed.proofCount,
        proofBundle,
        anchor,
        note: "Proof embedded in SVG metadata.",
      }),
    };
  }

  if (sourceFormat === "json") {
    const parsed = parseReceizJsonProof(args.fileBytes);
    const basisBytes = parsed.basisBytes;
    const { basisSha256, proofBundle, anchor } = await buildBundleForBasis(basisBytes);
    const encodedBundle = encodeReceizProofBundle(proofBundle);
    const embedded = embedReceizProofBundleIntoJson({
      jsonBytes: basisBytes,
      encodedBundle,
    });
    const downloadName = buildReceizedDownloadName({
      filename: args.filename || "document.json",
      forcedExtension: preferredExtension,
    });
    return {
      artifactBytes: embedded.jsonBytes,
      downloadName,
      kind: "trailer",
      meta: asMeta({
        basisSha256,
        strippedExistingProofs: parsed.proofCount,
        proofBundle,
        anchor,
        note: "Proof embedded in JSON trailing whitespace channel.",
      }),
    };
  }

  {
    const stripped = stripReceizTrailer(args.fileBytes);
    const basisBytes = stripped.basisBytes;
    const strippedExistingProofs = stripped.removedCount;
    const note =
      sourceFormat === "jpeg" || sourceFormat === "gif" || sourceFormat === "webp"
        ? "Proof embedded in trailing Receiz marker block."
        : "Proof embedded in trailing Receiz marker block while preserving original file format.";
    const jpegBasis = sourceFormat === "jpeg"
      ? await normalizeJpegIosPhotosCarrierV6Basis(basisBytes)
      : null;
    const { basisSha256, proofBundle, anchor } = await buildBundleForBasis(
      jpegBasis?.basisBytes ?? basisBytes,
      jpegBasis ? JPEG_IOS_PHOTOS_CARRIER_V6_ARTIFACT_BASIS : undefined,
    );
    const artifactBytes = appendReceizTrailer({ basisBytes, bundle: proofBundle });
    const downloadName = buildReceizedDownloadName({
      filename: args.filename || `document.${preferredExtension}`,
      forcedExtension: preferredExtension,
    });
    return {
      artifactBytes,
      downloadName,
      kind: "trailer",
      meta: asMeta({
        basisSha256,
        strippedExistingProofs,
        proofBundle,
        anchor,
        note,
      }),
    };
  }
}
