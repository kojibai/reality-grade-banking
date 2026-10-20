import { detectDocumentFormat } from "@/app/lib/documentSeal/fileFormat";
import { decodeReceizBundleEnvelope } from "@/app/lib/documentSeal/bundleContainer";
import { parseReceizHeicProof } from "@/app/lib/documentSeal/heicProof";
import { parseReceizJsonProof } from "@/app/lib/documentSeal/jsonProof";
import {
  extractReceizProofBundlesFromPdf,
  stripReceizSealUpdatesFromPdf,
} from "@/app/lib/documentSeal/pdfProof";
import { parseReceizSvgProof } from "@/app/lib/documentSeal/svgProof";
import { parseReceizTrailer } from "@/app/lib/documentSeal/trailerProof";
import { readPngTextChunk } from "@/app/utils/pngChunks";
import {
  coerceReceizProofBundle,
  decodeReceizProofBundle,
  RECEIZ_PROOF_BUNDLE_CHUNK_KEY,
  stripReceizProofAugmentationChunks,
} from "@/app/utils/receizProofBundle";
import { sha256Hex } from "@/app/utils/sha256";

export type VerifiedMaterialCarrierKind =
  | "bundle"
  | "png"
  | "pdf"
  | "heic-box"
  | "trailer";

export type VerifiedMaterialProjection = Readonly<{
  bytes: Uint8Array;
  filename: string;
  mimeType: string;
  sha256: string;
}>;

function payloadFilename(sealedFilename: string): string {
  return sealedFilename.replace(/\.receized(?=\.[^.]+$)/i, "") || sealedFilename;
}

function decodedBundleBasis(encoded: string | null | undefined): string | null {
  if (!encoded) return null;
  try {
    const basis = decodeReceizProofBundle(encoded).artifactSha256Basis?.trim().toLowerCase() ?? "";
    return /^[0-9a-f]{64}$/.test(basis) ? basis : null;
  } catch {
    return null;
  }
}

function objectBundleBasis(value: unknown): string | null {
  const basis = coerceReceizProofBundle(value)?.artifactSha256Basis?.trim().toLowerCase() ?? "";
  return /^[0-9a-f]{64}$/.test(basis) ? basis : null;
}

/**
 * Reads the canonical payload binding carried by the enclosing sealed proof
 * object. This is projection metadata beneath already-admitted artifact
 * custody; it never grants admission by itself.
 */
export function readSealedMaterialPayloadBinding(input: Readonly<{
  exactArtifactBytes: Uint8Array;
  sealedFilename: string;
  mimeType: string;
  carrierKind: VerifiedMaterialCarrierKind;
}>): string | null {
  if (input.carrierKind === "bundle") {
    const parsed = decodeReceizBundleEnvelope(input.exactArtifactBytes);
    return parsed ? objectBundleBasis(parsed.envelope.proofbundle) : null;
  }
  if (input.carrierKind === "png") {
    return decodedBundleBasis(readPngTextChunk(
      input.exactArtifactBytes,
      RECEIZ_PROOF_BUNDLE_CHUNK_KEY,
    ));
  }
  if (input.carrierKind === "pdf") {
    const encoded = extractReceizProofBundlesFromPdf(input.exactArtifactBytes);
    return encoded.length === 1 ? decodedBundleBasis(encoded[0]) : null;
  }
  if (input.carrierKind === "heic-box") {
    const parsed = parseReceizHeicProof(input.exactArtifactBytes);
    return parsed.proofCount === 1 && !parsed.parseError
      ? objectBundleBasis(parsed.bundle)
      : null;
  }

  const format = detectDocumentFormat(input.exactArtifactBytes, {
    filename: input.sealedFilename,
    mime: input.mimeType,
  });
  if (format === "svg") {
    const parsed = parseReceizSvgProof(input.exactArtifactBytes);
    return parsed.proofCount === 1 && !parsed.parseError
      ? decodedBundleBasis(parsed.encodedBundle)
      : null;
  }
  if (format === "json") {
    const parsed = parseReceizJsonProof(input.exactArtifactBytes);
    return parsed.proofCount === 1 && !parsed.parseError
      ? decodedBundleBasis(parsed.encodedBundle)
      : null;
  }
  const parsed = parseReceizTrailer(input.exactArtifactBytes);
  return parsed.trailerCount === 1 && !parsed.parseError
    ? objectBundleBasis(parsed.bundle)
    : null;
}

/**
 * Projects playable/displayable bytes only after the enclosing sealed object
 * has passed canonical verification. The expected digest comes from that
 * verified object; carrier parsing never grants authority by itself.
 */
export async function projectVerifiedMaterialPayload(input: Readonly<{
  exactArtifactBytes: Uint8Array;
  sealedFilename: string;
  mimeType: string;
  carrierKind: VerifiedMaterialCarrierKind;
  expectedPayloadSha256: string;
}>): Promise<VerifiedMaterialProjection> {
  let bytes: Uint8Array | null = null;

  let filename = payloadFilename(input.sealedFilename);
  let mimeType = input.mimeType || "application/octet-stream";

  if (input.carrierKind === "bundle") {
    const parsed = decodeReceizBundleEnvelope(input.exactArtifactBytes);
    if (parsed) {
      bytes = parsed.originalBytes;
      filename = parsed.envelope.manifest.filename;
      mimeType = parsed.envelope.manifest.mime;
    }
  } else if (input.carrierKind === "png") {
    bytes = stripReceizProofAugmentationChunks(input.exactArtifactBytes);
  } else if (input.carrierKind === "pdf") {
    bytes = stripReceizSealUpdatesFromPdf(input.exactArtifactBytes).pdfBytes;
  } else if (input.carrierKind === "heic-box") {
    const parsed = parseReceizHeicProof(input.exactArtifactBytes);
    if (parsed.proofCount === 1 && !parsed.parseError && parsed.bundle) bytes = parsed.basisBytes;
  } else {
    const format = detectDocumentFormat(input.exactArtifactBytes, {
      filename: input.sealedFilename,
      mime: input.mimeType,
    });
    if (format === "svg") {
      const parsed = parseReceizSvgProof(input.exactArtifactBytes);
      if (parsed.proofCount === 1 && !parsed.parseError && parsed.encodedBundle) bytes = parsed.basisBytes;
    } else if (format === "json") {
      const parsed = parseReceizJsonProof(input.exactArtifactBytes);
      if (parsed.proofCount === 1 && !parsed.parseError && parsed.encodedBundle) bytes = parsed.basisBytes;
    } else {
      const parsed = parseReceizTrailer(input.exactArtifactBytes);
      if (parsed.trailerCount === 1 && !parsed.parseError && parsed.bundle) bytes = parsed.basisBytes;
    }
  }

  if (!bytes) throw new TypeError("VERIFIED_MATERIAL_PROJECTION_UNAVAILABLE");
  const sha256 = (await sha256Hex(bytes)).toLowerCase();
  if (sha256 !== input.expectedPayloadSha256.trim().toLowerCase()) {
    throw new TypeError("VERIFIED_MATERIAL_PAYLOAD_BINDING_FAILED");
  }
  return Object.freeze({
    bytes: bytes.slice(),
    filename,
    mimeType,
    sha256,
  });
}
