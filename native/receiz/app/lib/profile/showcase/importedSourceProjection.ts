import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";
import { jcsCanonicalize } from "@/app/utils/jcs";
import { decodeReceizBundleEnvelope } from "@/app/lib/documentSeal/bundleContainer";
import { extractReceizPortableAssetPayload } from "../../../../packages/receiz-sdk/src/portableAsset";
import { projectVerifierIdentityDisplay } from "@/app/verify/identityDisplay";
import type { ProfileOriginal } from "../types";
import { parseImportedProofSourceReference, requireOpenedImportedProofSource, type ImportedProofSourceReference, type OpenedImportedProofSource } from "./importedSource";

export const IMPORTED_SOURCE_REFERENCE_MIME = "application/vnd.receiz.imported-proof-source+json";
export function encodeImportedSourceReference(reference: ImportedProofSourceReference): Uint8Array {
  return new TextEncoder().encode(jcsCanonicalize(parseImportedProofSourceReference(reference)));
}
export function decodeImportedSourceReference(bytes: Uint8Array): ImportedProofSourceReference {
  return parseImportedProofSourceReference(JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)));
}
/** Transport discovery only. Admission always verifies the enclosing child and
 * then the referenced source. Never use this helper to project product fields. */
export async function readImportedSourceTransportReference(bytes: Uint8Array): Promise<ImportedProofSourceReference | null> {
  const envelope = decodeReceizBundleEnvelope(bytes);
  if (!envelope) return null;
  let value: unknown;
  try { value = JSON.parse(new TextDecoder().decode(envelope.originalBytes)); } catch { return null; }
  if (!value || typeof value !== "object" || !("payload" in value)
    || (value as { payload?: { mimeType?: string } }).payload?.mimeType !== IMPORTED_SOURCE_REFERENCE_MIME) return null;
  const payload = await extractReceizPortableAssetPayload(value);
  if (payload.assetType !== "profile_original") throw new TypeError("IMPORTED_SOURCE_PLACEMENT_INVALID");
  return decodeImportedSourceReference(payload.bytes);
}
export function importedSourceResourcePath(reference: ImportedProofSourceReference, payload = false): string {
  return `/api/profile/showcase/imported-source?reference=${encodeURIComponent(jcsCanonicalize(reference))}${payload ? "&payload=1" : ""}`;
}
/** One source-derived projection shared by initial local admission and cold
 * canonical opening. Placement owners, sessions and upload clocks are absent. */
export function projectImportedSourceOriginal(source: OpenedImportedProofSource, value: ImportedProofSourceReference): ProfileOriginal {
  requireOpenedImportedProofSource(source);
  const reference = parseImportedProofSourceReference(value);
  const { bytes: _bytes, ...descriptor } = reference;
  if (jcsCanonicalize(source.descriptor) !== jcsCanonicalize(descriptor)) throw new TypeError("IMPORTED_SOURCE_PLACEMENT_BINDING_INVALID");
  const p = source.projection;
  let terminal = source;
  while (terminal.referencedSources?.[0]) terminal = terminal.referencedSources[0];
  const carried = p.carriedOriginal as ProfileOriginal | null;
  const bundle = terminal.verification.bundle!;
  const continuity = terminal.verification.assetContinuity;
  const sourceIdentity = continuity?.state === "verified" ? { artifactId: continuity.artifactId,
    namespace: continuity.namespace, genesisOwnerReceizId: continuity.genesisOwnerReceizId } : null;
  // The canonical ownership genesis binds artifactId, namespace and genesis
  // owner. Genesis owner here scopes continuity; it never implies creator.
  const identity = sourceIdentity ? jcsCanonicalize(sourceIdentity) : `${p.identity.kind}:${p.identity.value}`;
  const id = `imported-${bytesToHex(sha256(new TextEncoder().encode(identity)))}`;
  const creator = p.originalCreator ?? (() => {
    if (carried?.ownershipKind !== "creator") return null;
    const actual = projectVerifierIdentityDisplay(terminal.verification).originalCreator;
    return actual.receizId && actual.username ? { userId: actual.receizId, username: actual.username,
      displayName: actual.displayName ?? actual.username, avatarUrl: null, isPrivate: false } : null;
  })();
  const mime = p.payloadMimeType;
  const kind = mime.startsWith("image/") ? "image" : mime.startsWith("video/") ? "video" : mime.startsWith("audio/") ? "audio" : mime === "application/pdf" ? "pdf" : mime === "application/epub+zip" ? "epub" : "file";
  const download = importedSourceResourcePath(reference);
  const original: ProfileOriginal = {
    ...(carried ?? {}), id, slug: p.slug, code: p.code, pulse: p.pulse,
    ownershipKind: "verified", ownershipRole: "verified-possession", originalCreator: creator,
    importedSource: { reference, identity: p.identity, ownerReceizId: p.ownerReceizId,
      interpretedArtifactSha256: p.interpretedArtifactSha256, normalizedLegacy: p.normalizedLegacy,
      payloadSha256: p.payloadSha256, payloadByteLength: p.payloadByteLength,
      payloadMimeType: p.payloadMimeType, payloadFilename: p.payloadFilename,
      sourceArtifactSha256: terminal.descriptor.artifactSha256,
      sourceIdentity,
      sourceProofHead: terminal.verification.assetContinuity?.state === "verified" ? terminal.verification.assetContinuity.headReference : null,
      pbiAppendHeads: p.pbi.history.map(append => append.appendHeadSha256) },
    contextPreset: carried?.contextPreset ?? null, claimHashHex: carried?.claimHashHex ?? null,
    claim: p.bankAsset?.description ?? p.claim ?? "",
    ...(p.bankAsset?.text ? {longForm:{title:p.bankAsset.title,text:p.bankAsset.text,sha256Hex:bytesToHex(sha256(new TextEncoder().encode(p.bankAsset.text))),wordCount:p.bankAsset.text.trim().split(/\s+/u).filter(Boolean).length}} : {}),
    ...(p.bankAsset?.files.length ? {attachments:p.bankAsset.files.map((file,index)=>({id:`bank-asset-file:${file.sha256}:${index}`,role:"source" as const,name:file.filename,mime:file.mimeType,size:file.bytes.length,sha256Hex:file.sha256,src:`${importedSourceResourcePath(reference)}&assetFile=${index}`,storage:null,downloadName:file.filename,description:null,createdAt:null}))} : {}),
    verifyPath: p.verifyPath ?? "", verifyUrl: p.verifyUrl ?? "",
    createdAt: p.createdAt ?? (p.createdAtMs === null ? "" : new Date(p.createdAtMs).toISOString()), ts: p.ts ?? "",
    showOnProfile: true, historical: carried?.historical ?? null,
    hasPbiSignature: carried?.hasPbiSignature === true, pbiReceiptHash: carried?.pbiReceiptHash ?? null,
    signedArtifactDownloadUrl: carried?.signedArtifactDownloadUrl ?? null,
    proof: carried?.proof ?? { circuit: "Groth16", groth16Id: bundle.groth16ProofDigest ?? null, poseidon: bundle.zkPoseidonHash ?? null },
    media: carried?.media ? {
      ...carried.media,
      // The enclosing canonical source verified this exact attachment. Its old
      // locator remains in the source bytes; playback projects held/public bytes.
      ...(carried.media.sha256Hex?.toLowerCase() === p.payloadSha256 ? {
        src: importedSourceResourcePath(reference, true),
        ...(["audio", "video"].includes(carried.media.kind) ? { playbackSrc: importedSourceResourcePath(reference, true) } : {}),
      } : {}),
    } : {
      kind, src: importedSourceResourcePath(reference, true), mime, name: p.payloadFilename, size: p.payloadByteLength, sha256Hex: p.payloadSha256,
      originalDownloadSrc: download, originalDownloadName: reference.filename, originalDownloadMime: "application/octet-stream",
      originalDownloadSize: reference.byteLength, originalDownloadSha256Hex: reference.artifactSha256,
      derivativeDownloadSrc: null, derivativeDownloadName: null, derivativeDownloadMime: null, derivativeDownloadSize: null, derivativeDownloadSha256Hex: null,
      receiptDownloadSrc: null, receiptDownloadName: null, receiptMs: null, receiptTzMinutesEast: null,
      allowOriginalDownload: true, allowDerivativeDownload: false, allowMomentRecordDownload: false, gateAudioPlayback: false,
      originalDownloadLimit: null, derivativeDownloadLimit: null, originalDownloadPriceCents: null, derivativeDownloadPriceCents: null,
      collectionReleaseAt: null, collectionReleasePulse: null, imageVariants: null,
      videoPosterSrc: null, videoPosterMime: null, videoPosterName: null, videoPosterImageVariants: null,
      audioCoverSrc: null, audioCoverMime: null, audioCoverName: null, audioCoverImageVariants: null,
      epubCoverSrc: null, epubCoverMime: null, epubCoverName: null, epubCoverImageVariants: null, epubMetadata: null, audioDistribution: null,
    },
  };
  if (original.originalCreator) Object.freeze(original.originalCreator);
  if (original.media) Object.freeze(original.media);
  if (sourceIdentity) Object.freeze(sourceIdentity);
  Object.freeze(original.importedSource!.pbiAppendHeads);
  Object.freeze(original.importedSource);
  return Object.freeze(original);
}
