import {
  deriveReceizPortableOwnershipContinuity,
  appendReceizPortableAssetOwnership,
  parseReceizPortableAssetDocument,
  serializeReceizPortableAssetDocument,
  type ReceizPortableOwnershipContinuity,
} from "../../../packages/receiz-sdk/src/portableAsset";
import {
  verifyAndExtractReceizDocumentBytesLocal,
} from "../../../packages/receiz-sdk/src/verifier/canonical";
import { sha256Hex } from "@/app/utils/sha256";
import { countPngTextChunksByKeyword } from "@/app/utils/pngChunks";
import {
  coerceReceizProofBundle,
  RECEIZ_PROOF_BUNDLE_CHUNK_KEY,
  type ReceizProofBundle,
} from "@/app/utils/receizProofBundle";
import { detectDocumentFormat } from "@/app/lib/documentSeal/fileFormat";
import { stripReceizSealUpdatesFromPdf } from "@/app/lib/documentSeal/pdfProof";
import { parseReceizHeicProof } from "@/app/lib/documentSeal/heicProof";
import { parseReceizSvgProof } from "@/app/lib/documentSeal/svgProof";
import { parseReceizJsonProof } from "@/app/lib/documentSeal/jsonProof";
import { countReceizTrailers } from "@/app/lib/documentSeal/trailerProof";

export type PreparedNativeProofObjectSeal = Readonly<{
  fileBytes: Uint8Array;
  filename: string;
  mime: string;
  nativeRecordSeal?: Readonly<{
    ownerReceizId: string;
    recordId: string;
    ownershipContinuity?: ReceizPortableOwnershipContinuity;
    verifiedPredecessor?: Readonly<{
      artifactSha256: string;
      proofBundle: ReceizProofBundle;
    }>;
  }>;
}>;

type OpenVerifiedArtifact = (
  input: Readonly<{
    fileBytes: Uint8Array;
    filename?: string;
    mimeType?: string;
    purpose?: "verified-proof-predecessor-append";
  }>,
) => ReturnType<typeof verifyAndExtractReceizDocumentBytesLocal>;

function containsReceizProofCarrier(
  args: Readonly<{
    fileBytes: Uint8Array;
    filename: string;
    mime: string;
  }>,
  opened: Awaited<ReturnType<typeof verifyAndExtractReceizDocumentBytesLocal>>,
): boolean {
  if (opened.ok || opened.verification.bundle) return true;

  const format = detectDocumentFormat(args.fileBytes, {
    filename: args.filename,
    mime: args.mime,
  });
  if (format === "png") {
    return countPngTextChunksByKeyword(
      args.fileBytes,
      RECEIZ_PROOF_BUNDLE_CHUNK_KEY,
    ) > 0;
  }
  if (format === "pdf") {
    return stripReceizSealUpdatesFromPdf(args.fileBytes).removedCount > 0;
  }
  if (format === "heic") {
    const parsed = parseReceizHeicProof(args.fileBytes);
    return parsed.proofCount > 0 || Boolean(parsed.parseError);
  }
  if (format === "svg") {
    return parseReceizSvgProof(args.fileBytes).proofCount > 0
      || countReceizTrailers(args.fileBytes) > 0;
  }
  if (format === "json") {
    return parseReceizJsonProof(args.fileBytes).proofCount > 0
      || countReceizTrailers(args.fileBytes) > 0;
  }
  return countReceizTrailers(args.fileBytes) > 0;
}

export async function prepareNativeProofObjectSeal(args: Readonly<{
  fileBytes: Uint8Array;
  filename: string;
  mime: string;
  ownerReceizId?: string;
  resolveOwnerReceizId?: () => Promise<string>;
  openVerifiedArtifact?: OpenVerifiedArtifact;
}>): Promise<PreparedNativeProofObjectSeal> {
  const openVerifiedArtifact = args.openVerifiedArtifact ?? verifyAndExtractReceizDocumentBytesLocal;
  const opened = await openVerifiedArtifact({
    fileBytes: args.fileBytes,
    filename: args.filename,
    mimeType: args.mime,
    purpose: "verified-proof-predecessor-append",
  });

  if (!opened.ok) {
    if (containsReceizProofCarrier(args, opened)) {
      throw new Error("receiz_proof_predecessor_verification_required");
    }
    const ownerReceizId = (
      args.ownerReceizId
      || (args.resolveOwnerReceizId ? await args.resolveOwnerReceizId() : "")
    ).trim().toLowerCase();
    if (!ownerReceizId) throw new Error("receiz_identity_required");
    return {
      fileBytes: args.fileBytes,
      filename: args.filename,
      mime: args.mime,
      nativeRecordSeal: {
        ownerReceizId,
        recordId: `native:${await sha256Hex(args.fileBytes)}`,
      },
    };
  }

  const ownerReceizId = (
    args.ownerReceizId
    || (args.resolveOwnerReceizId ? await args.resolveOwnerReceizId() : "")
  ).trim().toLowerCase();
  if (!ownerReceizId) throw new Error("receiz_identity_required");

  const predecessorBundle = coerceReceizProofBundle(opened.verification.bundle);
  const predecessorSeal = predecessorBundle?.nativeRecordSeal ?? null;
  if (!predecessorBundle) throw new Error("receiz_proof_predecessor_verification_required");
  const predecessorArtifactSha256 = await sha256Hex(opened.artifactBytes);

  try {
    const portableDocument = await parseReceizPortableAssetDocument(
      JSON.parse(new TextDecoder().decode(opened.payloadBytes)) as unknown,
    );
    const transferred = await appendReceizPortableAssetOwnership(portableDocument, {
      ownerReceizId,
      priorHeadReference: predecessorBundle.receizClaimId,
      sourceArtifactSha256: predecessorArtifactSha256,
    });
    return {
      fileBytes: serializeReceizPortableAssetDocument(transferred),
      filename: opened.payloadFilename,
      mime: opened.payloadMimeType,
      nativeRecordSeal: {
        ownerReceizId,
        recordId: predecessorSeal?.recordId ?? `native:${await sha256Hex(opened.payloadBytes)}`,
        ownershipContinuity: await deriveReceizPortableOwnershipContinuity(transferred),
      },
    };
  } catch (error) {
    if (
      error instanceof SyntaxError
      || (error instanceof Error && error.name === "ReceizPortableAssetError")
    ) {
      return {
        fileBytes: args.fileBytes,
        filename: args.filename,
        mime: args.mime,
        nativeRecordSeal: {
          ownerReceizId,
          recordId: predecessorSeal?.recordId ?? `native:${await sha256Hex(opened.payloadBytes)}`,
          verifiedPredecessor: {
            artifactSha256: predecessorArtifactSha256,
            proofBundle: predecessorBundle,
          },
        },
      };
    }
    throw error;
  }
}
