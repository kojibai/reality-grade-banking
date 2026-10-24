import {openComposerResources} from "./composerResources";
import {readBankAssetContent,type BankAssetContent} from "./bankAssetContent";
import { executeSelectedSource } from "@/app/lib/documentSeal/selectedSourceExecution";
import { parseReceizTrailer } from "@/app/lib/documentSeal/trailerProof";
import { detectReceizRecursiveArchiveFormat } from "../../../../packages/receiz-sdk/src/verificationLimits";
import type { ReceizFolderPackageAuthority } from "../../../../packages/receiz-sdk/src/verifier/canonical";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";
import { readVerifiedReceizFolderPackageBytes, readVerifiedReceizDocumentBytes, type ReceizArtifactVerificationResult } from "@/app/lib/receizArtifactVerifier";
import { admitCanonicalStreamingTrailerVerification, normalizeLegacyKaiLineArtifact, projectVerifiedV115Appends, type ReceizVerifierProjectionResult } from "@/app/verify/verifyRuntime";
import { pinnedReceizSignatureV4RootPublicKeysForClient } from "@/app/lib/security/receizSignatureV4Pinned";
import type { ReceizSignatureV4RootPublicKey } from "@/app/lib/security/receizSignatureV4";
import type { ProfileCard } from "@/app/lib/profile/types";
import { readExactByteBlocks, writeExactByteBlocks, type ExactByteBlockResolver, type ExactByteBlockWriter } from "@/app/lib/transport/exactByteBlocks";
import { createImportedSourcePrivacyInspection, rejectImportedSourceRecoveryBlob, rejectImportedSourceRecoveryBytes } from "./importedSourcePrivacy";
import { validateReceizExactByteVerification } from "../../../../packages/receiz-sdk/src/verifier/canonical";
import { decodeProfileOriginalRouteProjectionAppend } from "./routeProjectionEncoding";
import { ImportedProofSourceUnavailableError } from "./importedSourceErrors";

/** Locators and exact-byte commitments only. No owner, creator, Kai or signature
 * projection supplied by a caller may authorize the source described here. */
export type {ImportedProofSourceDescriptor,ImportedProofSourceReference} from "./importedSourceReference";
import {parseImportedProofSourceReference,type ImportedProofSourceDescriptor,type ImportedProofSourceReference} from "./importedSourceReference";
export {parseImportedProofSourceReference} from "./importedSourceReference";
export type ImportedProofSourceOptions = Readonly<{
  /** Transport supplied by the host; references never confer admission. */
  resolveSourceBlock?: ExactByteBlockResolver;
  nestedColdSpool?: (reference: ImportedProofSourceReference) => ImportedProofSourceColdSpool;
  /** Trusted host configuration, never read from the source descriptor. */
  canonicalSignatureV4RootPublicKeys?: ReadonlyMap<string, ReceizSignatureV4RootPublicKey>;
}>;
/** Trusted execution mechanics supplied by the host, never by a source reference.
 * Each returned Blob must be backed by a completed segment transaction. The
 * complete record is published only after exact binding, canonical opening and
 * actual privacy inspection. A storage receipt does not confer proof authority. */
export type ImportedProofSourceColdSpool = Readonly<{
  writeSegment(blob: Blob): Promise<Blob>;
  complete(reference: ImportedProofSourceReference): Promise<void>;
}>;
export type ImportedProofSourceColdOptions = ImportedProofSourceOptions & Readonly<{
  coldSpool?: ImportedProofSourceColdSpool;
}>;
export type ImportedProofSourceProjection = Readonly<{
  identity: Readonly<{ kind: "carried-artifact" | "exact-revision"; value: string }>;
  ownerReceizId: string | null;
  originalCreator: ProfileCard | null;
  /** Existing source-carried Original under its exact enclosing portable proof.
   * Preserves existing classification; never populated from an import wrapper. */
  carriedOriginal: Readonly<Record<string, unknown>> | null;
  bankAsset?: BankAssetContent;
  slug: string;
  code: string;
  pulse: string | null;
  verifyPath: string | null;
  verifyUrl: string | null;
  ts: string | null;
  createdAtMs: number | null;
  createdAt: string | null;
  claim: string | null;
  normalizedLegacy: boolean;
  interpretedArtifactSha256: string;
  payloadSha256: string;
  payloadByteLength: number;
  payloadFilename: string;
  payloadMimeType: string;
  pbi: Readonly<{ status: "absent" | "carried-unverified"; history: ReceizVerifierProjectionResult["pbiAuthorshipHistory"] }>;
}>;
export type OpenedImportedProofSource = Readonly<{
  descriptor: ImportedProofSourceDescriptor;
  projection: ImportedProofSourceProjection;
  exactArtifact: Blob;
  /** Exact enclosing verified payload before optional media projection. */
  sourcePayload: Blob;
  composerResources?: Readonly<Record<string,Blob>>;
  payload: Blob;
  verification: ReceizVerifierProjectionResult;
  referencedSources?: readonly OpenedImportedProofSource[];
}> & (Readonly<{ sourceKind: "document" }> | Readonly<{ sourceKind: "folder-package"; packageAuthority: ReceizFolderPackageAuthority }>);

// Same-process evidence reuse only; serialized descriptors still require exact
// reconstruction followed by the canonical enclosing verifier on a cold node.
const openedSources = new WeakSet<OpenedImportedProofSource>();
const HASH_CHUNK_BYTES = 1024 * 1024;
async function digestBlob(blob: Blob): Promise<string> {
  const hash = sha256.create();
  for (let offset = 0; offset < blob.size; offset += HASH_CHUNK_BYTES) {
    hash.update(new Uint8Array(await blob.slice(offset, offset + HASH_CHUNK_BYTES).arrayBuffer()));
  }
  return bytesToHex(hash.digest());
}
function requireVerified(result: ReceizArtifactVerificationResult): asserts result is ReceizArtifactVerificationResult & { bundle: NonNullable<ReceizArtifactVerificationResult["bundle"]> } {
  if (result.denial) throw new ImportedProofSourceUnavailableError(`IMPORTED_SOURCE_OPERATIONAL_DENIAL:${result.denial.code}`, result.denial.code, "not-evaluated");
  if (!result.ok || result.integrity?.ok !== true || !result.bundle) throw new TypeError("IMPORTED_SOURCE_VERIFICATION_FAILED");
  // Only an enclosing canonical result reaches this guard. Its committed basis
  // has already been recomputed from source bytes; a descriptor never supplies it.
  const exact = validateReceizExactByteVerification({
    ...result, errors: [...result.errors], warnings: [...result.warnings],
    integrity: { ok: result.integrity.ok, errors: [...result.integrity.errors] },
  }, result.bundle.artifactSha256Basis ?? "");
  if (!exact.ok) throw new TypeError("IMPORTED_SOURCE_VERIFICATION_FAILED");
}
function freezeProjection<T>(value: T): T {
  const pending: unknown[] = [value];
  const seen = new WeakSet<object>();
  while (pending.length) {
    const item = pending.pop();
    if (item !== null && typeof item === "object" && !seen.has(item)) {
      seen.add(item);
      pending.push(...Object.values(item));
      Object.freeze(item);
    }
  }
  return value;
}
function sourceOriginal(verification: ReceizVerifierProjectionResult): Readonly<Record<string, unknown>> | null {
  const continuity = verification.assetContinuity;
  if (continuity?.state !== "verified" || continuity.carrier !== "portable_asset" || continuity.document.assetType !== "profile_original") return null;
  const appends = continuity.document.provenance.appends.filter((append) => append.type === "receiz.profile-original-render.v1");
  if (!appends.length) return null;
  if (appends.length !== 1) throw new TypeError("IMPORTED_SOURCE_CARRIED_ORIGINAL_AMBIGUOUS");
  const original = decodeProfileOriginalRouteProjectionAppend(appends[0], continuity.document.payload.sha256);
  if (!original || typeof original.id !== "string" || typeof original.slug !== "string" || typeof original.code !== "string") throw new TypeError("IMPORTED_SOURCE_CARRIED_ORIGINAL_BINDING_INVALID");
  return freezeProjection(structuredClone(original));
}
function sourceCreator(original: Readonly<Record<string, unknown>> | null): ProfileCard | null {
  const value = original?.originalCreator;
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const card = value as Record<string, unknown>;
  if (typeof card.userId !== "string" || typeof card.username !== "string" || typeof card.displayName !== "string"
    || !(card.avatarUrl === null || typeof card.avatarUrl === "string") || typeof card.isPrivate !== "boolean") return null;
  return Object.freeze({ userId: card.userId, username: card.username, displayName: card.displayName, avatarUrl: card.avatarUrl, isPrivate: card.isPrivate });
}

/** Only thrown execution failures are classified here. Explicit canonical
 * results, including invalid proof, return unchanged and are never retried. */
async function executeImportedCanonicalRead<T>(read: () => Promise<T>): Promise<T> {
  try { return await read(); }
  catch (error) {
    if (error instanceof ImportedProofSourceUnavailableError) throw error;
    throw new ImportedProofSourceUnavailableError("IMPORTED_SOURCE_CANONICAL_RUNTIME_UNAVAILABLE", "VERIFICATION_RESOURCE_UNAVAILABLE", "not-evaluated");
  }
}

/** Shared local/cold interpretation. No uploader identity, owner constraint,
 * network lookup, signing ceremony or placement authority enters this API. */
type SourceTraversal = { remainingBlockReads: number; remainingSources: number; remainingBytes: number; active: Set<string>; opened: Map<string, OpenedImportedProofSource> };
function sourceTraversal(): SourceTraversal {
  return { remainingBlockReads: 131_072, remainingSources: 32, remainingBytes: 128 * HASH_CHUNK_BYTES, active: new Set(), opened: new Map() };
}
export async function openImportedProofSource(source: Blob, options: ImportedProofSourceOptions = {}): Promise<OpenedImportedProofSource> {
  return openImportedProofSourceWithTraversal(source, options, sourceTraversal());
}
async function openImportedProofSourceWithTraversal(
  source: Blob, options: ImportedProofSourceOptions, traversal: SourceTraversal,
): Promise<OpenedImportedProofSource> {
  const byteLength = source instanceof Blob ? source.size : 0;
  if (!(source instanceof Blob) || !Number.isSafeInteger(byteLength) || byteLength <= 0) throw new TypeError("IMPORTED_SOURCE_INPUT_INVALID");
  const filename = source instanceof File ? source.name : "proof-object";
  const mimeType = source.type || "application/octet-stream";
  let exactArtifact: Blob;
  try {
    exactArtifact = source.slice(0, byteLength, mimeType);
    if (!(exactArtifact instanceof Blob) || exactArtifact.size !== byteLength) throw new Error("source_snapshot_length_mismatch");
  } catch {
    throw new ImportedProofSourceUnavailableError("IMPORTED_SOURCE_SNAPSHOT_UNAVAILABLE", "VERIFICATION_RESOURCE_UNAVAILABLE", "not-evaluated");
  }
  const roots = new Map([...(options.canonicalSignatureV4RootPublicKeys ?? pinnedReceizSignatureV4RootPublicKeysForClient())]
    .map(([kid, root]) => [kid, Object.freeze({ ...root })]));
  let artifactSha256: string;
  let interpretedArtifactSha256: string;
  let normalizedLegacy = false;
  let payloadSha256: string;
  let payloadFilename: string;
  let payloadMimeType: string;
  let payload: Blob;
  let verification: ReceizVerifierProjectionResult;
  let packageAuthority: ReceizFolderPackageAuthority | undefined;
  let selectedArchive: ReturnType<typeof detectReceizRecursiveArchiveFormat>;
  try {
    const headerLength = Math.min(byteLength, 512);
    const header = exactArtifact.slice(0, headerLength);
    if (header.size !== headerLength) throw new Error("source_header_short_slice");
    const headerBytes = new Uint8Array(await header.arrayBuffer());
    if (headerBytes.byteLength !== headerLength) throw new Error("source_header_short_read");
    selectedArchive = detectReceizRecursiveArchiveFormat(headerBytes);
  } catch {
    throw new ImportedProofSourceUnavailableError("IMPORTED_SOURCE_READ_UNAVAILABLE", "VERIFICATION_RESOURCE_UNAVAILABLE", "not-evaluated");
  }
  const selected = await executeSelectedSource({ file: exactArtifact, filename, mime: mimeType, signatureV4RootPublicKeys: roots });
  if (selected.execution !== "complete") {
    const streamed = selected.result;
    // Selected raw trailer privacy is independent of proof admission, including
    // native fields rejected by exact canonical serialization.
    if (streamed.payloadByteLength !== null) {
      await rejectImportedSourceRecoveryBytes(new Uint8Array(await exactArtifact.slice(streamed.payloadByteLength).arrayBuffer()));
    }
    if (selectedArchive && streamed.payloadByteLength === null) {
      throw new ImportedProofSourceUnavailableError("IMPORTED_SOURCE_ARCHIVE_READER_UNAVAILABLE", "VERIFICATION_RESOURCE_UNAVAILABLE", "not-evaluated");
    }
    const admitted = await admitCanonicalStreamingTrailerVerification(streamed.verification);
    requireVerified(admitted);
    if (!streamed.artifactSha256 || !streamed.payloadSha256 || streamed.payloadByteLength === null) throw new TypeError("IMPORTED_SOURCE_STREAM_BINDING_REQUIRED");
    artifactSha256 = interpretedArtifactSha256 = streamed.artifactSha256;
    payloadSha256 = streamed.payloadSha256;
    payloadFilename = admitted.bundle.nativeRecordSeal?.payload.filename ?? filename;
    payloadMimeType = admitted.bundle.nativeRecordSeal?.payload.mimeType ?? mimeType;
    payload = exactArtifact.slice(0, streamed.payloadByteLength, payloadMimeType);
    await rejectImportedSourceRecoveryBlob(payload);
    verification = await projectVerifiedV115Appends(admitted, new Uint8Array());
  } else {
    const bytes = selected.bytes;
    artifactSha256 = bytesToHex(sha256(bytes));
    const selectedTrailer = parseReceizTrailer(bytes);
    if (selectedArchive === "zip" && !(selectedTrailer.trailerCount > 0 && !selectedTrailer.parseError)) {
      const opened = await executeImportedCanonicalRead(() => readVerifiedReceizFolderPackageBytes({ fileBytes: bytes, signatureV4RootPublicKeys: roots }));
      if (!opened.ok) {
        requireVerified(opened.verification);
        throw new ImportedProofSourceUnavailableError(`IMPORTED_SOURCE_CANONICAL_OPEN_UNAVAILABLE:${opened.error}`, opened.error, "not-evaluated");
      }
      await createImportedSourcePrivacyInspection({ bytes: opened.artifactBytes, entries: opened.entries })(bytes);
      // The selected manifest basis feeds its append projector; the exact ZIP
      // remains the public/download payload and has a separate transport digest.
      verification = await projectVerifiedV115Appends(opened.verification, opened.authority.basisBytes);
      packageAuthority = opened.authority;
      interpretedArtifactSha256 = artifactSha256;
      payloadSha256 = artifactSha256;
      payloadFilename = filename;
      payloadMimeType = "application/zip";
      payload = exactArtifact.slice(0, byteLength, payloadMimeType);
    } else {
      const inspectPrivacy = createImportedSourcePrivacyInspection();
      await inspectPrivacy(bytes);
      const normalized = await executeImportedCanonicalRead(() => normalizeLegacyKaiLineArtifact({ fileBytes: bytes, filename, mime: mimeType }));
      const opened = await executeImportedCanonicalRead(() => readVerifiedReceizDocumentBytes({ fileBytes: normalized.fileBytes, filename, mime: mimeType, signatureV4RootPublicKeys: roots }));
      if (!opened.ok) {
        requireVerified(opened.verification);
        throw new ImportedProofSourceUnavailableError(`IMPORTED_SOURCE_CANONICAL_OPEN_UNAVAILABLE:${opened.error}`, opened.error, "verified");
      }
      await inspectPrivacy(opened.payloadBytes);
      verification = await projectVerifiedV115Appends(opened.verification, opened.payloadBytes);
      normalizedLegacy = normalized.normalized;
      interpretedArtifactSha256 = bytesToHex(sha256(normalized.fileBytes));
      payloadSha256 = bytesToHex(sha256(opened.payloadBytes));
      payloadFilename = opened.payloadFilename;
      payloadMimeType = opened.payloadMimeType;
      payload = new Blob([opened.payloadBytes.slice().buffer as ArrayBuffer], { type: payloadMimeType });
    }
  }
  const sourcePayload = payload;
  verification = freezeProjection(verification);
  requireVerified(verification);
  const bundle = verification.bundle;
  const continuity = verification.assetContinuity;
  const carriedOriginal = sourceOriginal(verification);
  const bankAsset = await readBankAssetContent(sourcePayload, bundle.nativeRecordSeal?.ownerReceizId ?? null,options.canonicalSignatureV4RootPublicKeys);
  let composerResources=bankAsset?.composer?await openComposerResources(bankAsset.composer,options.resolveSourceBlock,bytes=>{
    if((traversal.remainingBytes-=bytes)<0)throw new ImportedProofSourceUnavailableError("IMPORTED_SOURCE_RESOURCE_EXECUTION_BUDGET","VERIFICATION_RESOURCE_UNAVAILABLE","verified");
  },()=>{if(--traversal.remainingBlockReads<0)throw new ImportedProofSourceUnavailableError("IMPORTED_SOURCE_RESOURCE_READ_BUDGET","VERIFICATION_RESOURCE_UNAVAILABLE","verified");}):undefined;
  const primary=bankAsset?.composer?.files.find(file=>file.role==="primary");
  if(primary&&composerResources){payload=composerResources[primary.id];payloadSha256=primary.sha256;payloadFilename=primary.name;payloadMimeType=primary.mime;}
  if(bankAsset?.files[0]) { const file=bankAsset.files[0]; payload=new Blob([file.bytes.slice().buffer as ArrayBuffer],{type:file.mimeType}); payloadSha256=file.sha256; payloadFilename=file.filename; payloadMimeType=file.mimeType; }
  // The accepted portable Original may carry its rendered child bytes. Resolve
  // that payload now, beneath the enclosing source; rendering reuses this held
  // result and never has to rediscover proof from a carried remote locator.
  if (carriedOriginal && continuity?.state === "verified" && continuity.carrier === "portable_asset"
    && continuity.document.payload.mimeType !== "application/vnd.receiz.imported-proof-source+json") {
    const media = carriedOriginal.media as { sha256Hex?: unknown; mime?: unknown; name?: unknown } | null;
    if (media && typeof media.sha256Hex === "string" && /^[0-9a-f]{64}$/.test(media.sha256Hex)) {
      const { extractReceizPortableAssetPayload } = await import("../../../../packages/receiz-sdk/src/portableAsset");
      const carried = await extractReceizPortableAssetPayload(continuity.document);
      const bytes = carried.bytes;
      const exactMediaHash = bytesToHex(sha256(bytes));
      if (exactMediaHash === media.sha256Hex) {
        payloadMimeType = typeof media.mime === "string" ? media.mime : carried.mimeType;
        payloadFilename = typeof media.name === "string" ? media.name : payloadFilename;
        payload = new Blob([bytes.slice().buffer as ArrayBuffer], { type: payloadMimeType });
        payloadSha256 = exactMediaHash;
      } else {
        if (--traversal.remainingSources < 0 || (traversal.remainingBytes -= bytes.byteLength) < 0) {
          throw new ImportedProofSourceUnavailableError("IMPORTED_SOURCE_NESTED_MEDIA_EXECUTION_BUDGET", "VERIFICATION_RESOURCE_UNAVAILABLE", "not-evaluated");
        }
        let material: OpenedImportedProofSource | null = null;
        try { material = await openImportedProofSourceWithTraversal(new File([bytes.slice().buffer as ArrayBuffer], typeof media.name === "string" ? media.name : "carried-media.receizbundle", { type: carried.mimeType }), options, traversal); }
        catch (error) {
          if (error instanceof ImportedProofSourceUnavailableError) throw error;
          // A source-carried locator is not proof of held media. Its enclosing
          // source remains valid; only matching verified media can be realized.
        }
        if (material?.projection.payloadSha256 === media.sha256Hex) {
          payload = material.payload; payloadSha256 = material.projection.payloadSha256;
          payloadFilename = material.projection.payloadFilename; payloadMimeType = material.projection.payloadMimeType;
        }
      }
    }
  }
  const carriedText = (key: string): string | null => typeof carriedOriginal?.[key] === "string" ? carriedOriginal[key] as string : null;
  let projection: ImportedProofSourceProjection = Object.freeze({
    identity: Object.freeze(continuity?.state === "verified"
      ? { kind: "carried-artifact", value: continuity.artifactId }
      : { kind: "exact-revision", value: artifactSha256 }),
    ownerReceizId: continuity?.state === "verified" ? continuity.ownerReceizId : null,
    originalCreator: sourceCreator(carriedOriginal), carriedOriginal, ...(bankAsset?{bankAsset}:{}),
    slug: carriedOriginal ? carriedOriginal.slug as string : bundle.slug,
    code: carriedOriginal ? carriedOriginal.code as string : bundle.code,
    pulse: carriedOriginal ? carriedText("pulse") : bundle.kaiPulseEternal,
    verifyPath: carriedOriginal ? carriedText("verifyPath") : bundle.verifyPath,
    verifyUrl: carriedOriginal ? carriedText("verifyUrl") : bundle.verifyUrl,
    ts: carriedOriginal ? carriedText("ts") : bundle.ts,
    createdAtMs: carriedOriginal ? null : bundle.createdAtMs,
    createdAt: carriedOriginal ? carriedText("createdAt") : null,
    claim: carriedOriginal ? carriedText("claim") : verification.anchor?.claim?.text ?? null,
    normalizedLegacy, interpretedArtifactSha256,
    payloadSha256, payloadByteLength: payload.size, payloadFilename, payloadMimeType,
    pbi: Object.freeze({ status: verification.pbiAuthorshipHistory.length ? "carried-unverified" : "absent", history: verification.pbiAuthorshipHistory }),
  });
  let referencedSources: readonly OpenedImportedProofSource[] | undefined;
  if(bankAsset?.composer?.nativeAsset){const reference=bankAsset.composer.nativeAsset.authoredSource;if(!options.resolveSourceBlock)throw new ImportedProofSourceUnavailableError('BANK_ASSET_AUTHORED_SOURCE_UNAVAILABLE','VERIFICATION_RESOURCE_UNAVAILABLE','verified');const authored=await reopenImportedProofSourceWithTraversal(reference,options.resolveSourceBlock,{...options,coldSpool:options.nestedColdSpool?.(reference)},traversal,true);
   const original=authored.projection.bankAsset?.composer,current=bankAsset.composer,{nativeAsset:_binding,...content}=current;if(authored.projection.ownerReceizId!==projection.ownerReceizId||!original||(await import("@/app/utils/jcs")).jcsCanonicalize(original)!==(await import("@/app/utils/jcs")).jcsCanonicalize(content))throw new TypeError('BANK_ASSET_AUTHORED_SOURCE_MISMATCH');referencedSources=Object.freeze([authored]);
  }
  if (continuity?.state === "verified" && continuity.carrier === "portable_asset"
    && continuity.document.payload.mimeType === "application/vnd.receiz.imported-proof-source+json") {
    if (!options.resolveSourceBlock) throw new ImportedProofSourceUnavailableError("IMPORTED_SOURCE_NESTED_CUSTODY_UNAVAILABLE", "VERIFICATION_RESOURCE_UNAVAILABLE", "not-evaluated");
    const { decodeImportedSourceReference, projectImportedSourceOriginal } = await import("./importedSourceProjection");
    const { extractReceizPortableAssetPayload } = await import("../../../../packages/receiz-sdk/src/portableAsset");
    const nestedPayload = await extractReceizPortableAssetPayload(continuity.document);
    const reference = decodeImportedSourceReference(nestedPayload.bytes);
    const nested = await reopenImportedProofSourceWithTraversal(reference, options.resolveSourceBlock, {
      ...options, coldSpool: options.nestedColdSpool?.(reference) }, traversal, true);
    const expected = projectImportedSourceOriginal(nested, reference);
    const { jcsCanonicalize } = await import("@/app/utils/jcs");
    if (!carriedOriginal || jcsCanonicalize(carriedOriginal) !== jcsCanonicalize(expected)) throw new TypeError("IMPORTED_SOURCE_NESTED_PROJECTION_INVALID");
    projection = Object.freeze({ ...nested.projection, originalCreator: expected.originalCreator ?? null });
    payload = nested.payload;
    composerResources = nested.composerResources;
    referencedSources = Object.freeze([nested]);
  }
  const result: OpenedImportedProofSource = Object.freeze({
    descriptor: Object.freeze({ schema: "receiz.imported-proof-source.v1", artifactSha256, byteLength: exactArtifact.size, filename, mimeType }),
    projection, exactArtifact, sourcePayload, payload, verification, ...(composerResources?{composerResources}:{}), ...(referencedSources ? { referencedSources } : {}),
    ...(packageAuthority ? { sourceKind: "folder-package" as const, packageAuthority } : { sourceKind: "document" as const }),
  });
  openedSources.add(result);
  return result;
}

export async function writeImportedProofSourceReference(
  source: OpenedImportedProofSource, writeBlock: ExactByteBlockWriter,
): Promise<ImportedProofSourceReference> {
  if (!openedSources.has(source)) throw new TypeError("IMPORTED_SOURCE_CANONICAL_OPEN_REQUIRED");
  const bytes = await writeExactByteBlocks(source.exactArtifact, writeBlock);
  return Object.freeze({ ...source.descriptor, bytes });
}

/** Checks in-process canonical evidence; serialized objects cannot claim it. */
export function requireOpenedImportedProofSource(source: OpenedImportedProofSource): void {
  if (!openedSources.has(source)) throw new TypeError("IMPORTED_SOURCE_CANONICAL_OPEN_REQUIRED");
}

export async function reopenImportedProofSource(
  value: ImportedProofSourceReference, resolveBlock: ExactByteBlockResolver,
  options: ImportedProofSourceColdOptions = {},
): Promise<OpenedImportedProofSource> {
  return reopenImportedProofSourceWithTraversal(value, resolveBlock, options, sourceTraversal());
}
async function reopenImportedProofSourceWithTraversal(
  value: ImportedProofSourceReference, resolveBlock: ExactByteBlockResolver,
  options: ImportedProofSourceColdOptions, traversal: SourceTraversal, nested = false,
): Promise<OpenedImportedProofSource> {
  const descriptor = parseImportedProofSourceReference(value);
  const key = JSON.stringify(descriptor);
  const held = traversal.opened.get(key);
  if (held) return held;
  if (traversal.active.has(descriptor.artifactSha256) || --traversal.remainingSources < 0
    || (nested && (traversal.remainingBytes -= descriptor.byteLength) < 0)) {
    throw new ImportedProofSourceUnavailableError("IMPORTED_SOURCE_NESTED_EXECUTION_BUDGET", "VERIFICATION_RESOURCE_UNAVAILABLE", "not-evaluated");
  }
  traversal.active.add(descriptor.artifactSha256);
  const spool = options.coldSpool;
  // Compatibility materialization is explicitly bounded. Generic/server callers
  // must opt into an actual source-backed host spool for larger cold sources.
  if (!spool && descriptor.byteLength > 16 * HASH_CHUNK_BYTES) {
    throw new ImportedProofSourceUnavailableError("IMPORTED_SOURCE_COLD_STORAGE_REQUIRED", "IMPORTED_SOURCE_COLD_STORAGE_REQUIRED", "not-evaluated");
  }
  const chunks: Blob[] = [];
  const hash = sha256.create();
  let byteLength = 0;
  for await (const bytes of readExactByteBlocks(descriptor.bytes, async ref => {
    if (--traversal.remainingBlockReads < 0) throw new ImportedProofSourceUnavailableError("IMPORTED_SOURCE_NESTED_BLOCK_READ_BUDGET", "VERIFICATION_RESOURCE_UNAVAILABLE", "not-evaluated");
    return resolveBlock(ref);
  }, { component: "imported source canonical reconstruction", maxContentBytes: descriptor.byteLength, maxBlockReads: 131_072 })) {
    hash.update(bytes);
    byteLength += bytes.byteLength;
    if (byteLength > descriptor.byteLength) throw new TypeError("IMPORTED_SOURCE_EXACT_BINDING_MISMATCH");
    const detached = new Blob([bytes.slice().buffer as ArrayBuffer]);
    // Await durable completion before requesting the next exact byte block.
    const held = spool ? await spool.writeSegment(detached) : detached;
    if (!(held instanceof Blob) || held.size !== bytes.byteLength) throw new TypeError("IMPORTED_SOURCE_EXACT_BINDING_MISMATCH");
    chunks.push(held);
  }
  if (byteLength !== descriptor.byteLength || bytesToHex(hash.digest()) !== descriptor.artifactSha256) throw new TypeError("IMPORTED_SOURCE_EXACT_BINDING_MISMATCH");
  const source = new File(chunks, descriptor.filename, { type: descriptor.mimeType });
  // Read the actual returned storage handles: successful writes are not evidence
  // that a faulty host returned the same bytes it was asked to hold.
  if (source.size !== descriptor.byteLength || await digestBlob(source) !== descriptor.artifactSha256) throw new TypeError("IMPORTED_SOURCE_EXACT_BINDING_MISMATCH");
  const opened = await openImportedProofSourceWithTraversal(source, { ...options, resolveSourceBlock: resolveBlock }, traversal);
  if (opened.descriptor.artifactSha256 !== descriptor.artifactSha256) throw new TypeError("IMPORTED_SOURCE_EXACT_BINDING_MISMATCH");
  await spool?.complete(descriptor);
  traversal.active.delete(descriptor.artifactSha256);
  traversal.opened.set(key, opened);
  return opened;
}
