import * as implementation from "./canonicalImplementation.js";
import { createSHA256 } from "hash-wasm";
import { isRecord } from "./crypto.js";
import { recognizeReceizGroth16Structure } from "./groth16.js";
import {
  isCanonicalBase64Url,
  isCanonicalFilename,
  isCanonicalHex,
  isCanonicalKaiKlok,
  isCanonicalKaiPulse,
  isCanonicalMime,
  isCanonicalProofCode,
  isCanonicalReceizTimestamp,
  isPositiveSafeInteger,
  isSafeNonnegativeInteger,
  isVersionIdentifier,
} from "./canonicalSyntax.js";
import {
  recognizeReceizSignatureV4Structure,
  type ReceizSignatureV4RootPublicKey,
} from "./signatureV4.js";
import { receizCurrentPinnedSignatureV4Roots } from "./roots.js";
import { receizProtocolOperationalDenial } from "../verificationLimits.js";
import type {
  ReceizArtifactContinuityAssessment,
  ReceizArtifactVerification,
  ReceizLocalArtifactInput,
  ReceizLocalArtifactOpenResult,
  ReceizLocalArtifactVerificationResult,
} from "./types.js";

const SHA256_RE = /^[0-9a-f]{64}$/;

export type ReceizStructurallyCompleteBundle = Readonly<{
  envelope: Record<string, unknown>;
  manifest: Record<string, unknown>;
  proofbundle: Record<string, unknown>;
  signatureV4: Record<string, unknown>;
  certificate: Record<string, unknown>;
  groth16VersionMarker: string;
}>;

/**
 * Recognizes the suite-independent structure required by the canonical bundle
 * verifier before an unknown carrier, version, or proof suite can be reported.
 * This deliberately does not accept a partial future-looking property bag.
 */
export function recognizeStructurallyCompleteReceizBundle(
  value: unknown,
): ReceizStructurallyCompleteBundle | null {
  if (!isRecord(value) || !isRecord(value.manifest) || !isRecord(value.proofbundle)) return null;
  const manifest = value.manifest;
  const proofbundle = value.proofbundle;
  const signature = recognizeReceizSignatureV4Structure(proofbundle.signatureV4);
  const groth16 = recognizeReceizGroth16Structure(proofbundle.groth16Proof);
  if (!signature || !groth16) return null;
  const signatureV4 = signature.record;
  const certificate = signature.cert.record;

  if (
    !isVersionIdentifier(value.kind, "receiz.bundle.v")
    || !isCanonicalBase64Url(value.originalBase64)
    || !isCanonicalFilename(manifest.filename)
    || !isCanonicalMime(manifest.mime)
    || !isCanonicalHex(manifest.basisSha256, 64)
    || !isSafeNonnegativeInteger(manifest.createdAt)
    || !isPositiveSafeInteger(manifest.version)
    || proofbundle.kind !== "receiz.proof_bundle"
    || !isVersionIdentifier(proofbundle.payloadVersion, "v")
    || !isSafeNonnegativeInteger(proofbundle.createdAtMs)
    || !isCanonicalReceizTimestamp(proofbundle.ts)
    || !isCanonicalProofCode(proofbundle.code)
    || typeof proofbundle.slug !== "string"
    || typeof proofbundle.verifyPath !== "string"
    || !isCanonicalKaiPulse(proofbundle.kaiPulseEternal)
    || !isCanonicalKaiKlok(proofbundle.kaiKlok)
    || !isCanonicalHex(proofbundle.receizClaimId, 32)
    || !isCanonicalHex(proofbundle.sigilClaimSeed, 64)
    || !isCanonicalHex(proofbundle.artifactSha256Basis, 64)
    || (typeof proofbundle.signerKeyId !== "undefined" && !isCanonicalHex(proofbundle.signerKeyId, 12))
    || !isCanonicalHex(proofbundle.anchorId, 8)
    || !isCanonicalHex(proofbundle.zkPoseidonHash, 64)
    || !isCanonicalHex(proofbundle.groth16ProofDigest, 64)
    || (
      typeof proofbundle.artifactBasis !== "undefined"
      && (
        !isRecord(proofbundle.artifactBasis)
        || proofbundle.artifactBasis.algorithm !== "sha256"
        || (
          proofbundle.artifactBasis.normalization !== "jpeg-adobe-xmp-app1-v1"
          && proofbundle.artifactBasis.normalization !== "jpeg-ios-photos-carrier-v2"
          && proofbundle.artifactBasis.normalization !== "jpeg-ios-photos-carrier-v3"
          && proofbundle.artifactBasis.normalization !== "jpeg-ios-photos-carrier-v4"
          && proofbundle.artifactBasis.normalization !== "jpeg-ios-photos-carrier-v5"
          && proofbundle.artifactBasis.normalization !== "jpeg-ios-photos-carrier-v6"
        )
      )
    )
  ) return null;

  const expectedSlug = proofbundle.ts.replace(/-/g, "").replace(/:/g, "").replace(/ /g, "_");
  if (
    proofbundle.createdAtMs !== manifest.createdAt
    || proofbundle.artifactSha256Basis.toLowerCase() !== manifest.basisSha256.toLowerCase()
    || proofbundle.slug !== expectedSlug
    || proofbundle.verifyPath !== `/v/${proofbundle.slug}/${proofbundle.code}/${proofbundle.kaiPulseEternal}`
  ) return null;

  return {
    envelope: value,
    manifest,
    proofbundle,
    signatureV4,
    certificate,
    groth16VersionMarker: groth16.versionMarker,
  };
}

export type ReceizPackageExecutionCapacity = Readonly<{ maxExactArtifactBytes: number; maxDecompressedArchiveBytes: number }>;

export type ReceizCanonicalVerifierInput = Readonly<{
  fileBytes: Uint8Array;
  filename?: string;
  mime?: string;
  optionalLink?: string;
  signingKey?: string;
  signatureV4RootPublicKeys?: ReadonlyMap<string, ReceizSignatureV4RootPublicKey> | null;
  packageExecutionCapacity?: ReceizPackageExecutionCapacity;
  zipGuardLimits?: Readonly<{
    maxEntries: number;
    maxEntryUncompressedBytes: number;
    maxTotalUncompressedBytes: number;
  }> | null;
  purpose?: "verified-proof-predecessor-append";
}>;

export type ReceizAssetContinuityVerification = ReceizLocalArtifactVerificationResult["assetContinuity"] extends infer Continuity
  ? Exclude<Continuity, undefined>
  : never;

export type ReceizArtifactVerificationResult = ReceizLocalArtifactVerificationResult;
export type ReceizVerifiedArtifactOpenResult = ReceizLocalArtifactOpenResult & Readonly<{
  nativeRecordSeal?: Readonly<Record<string, unknown>> | null;
}>;
/** Read-only evidence has no native/legacy append-custody discriminator. */
export type ReceizVerifiedDocumentReadResult =
  | Readonly<Omit<Extract<ReceizVerifiedArtifactOpenResult, { ok: true }>, "legacyCompatibility"> & { access: "read-only" }>
  | Extract<ReceizVerifiedArtifactOpenResult, { ok: false }>;
export type ReceizFolderPackageVerification = Readonly<Record<string, unknown>>;
export type ReceizFolderPackageItemVerification = Readonly<Record<string, unknown>>;

type CanonicalVerify = (input: ReceizCanonicalVerifierInput) => Promise<ReceizArtifactVerificationResult>;
type CanonicalOpen = (input: ReceizCanonicalVerifierInput) => Promise<ReceizVerifiedArtifactOpenResult>;

export type ReceizFolderPackageAuthority = Readonly<{ artifactPath: string; artifactBytes: Uint8Array; basisBytes: Uint8Array }>;
export type ReceizGuardedZipEntry = Readonly<{ path: string; bytes: Uint8Array; mime?: string }>;
export type ReceizGuardedZipInspectionResult =
  | Readonly<{ inspected: true; entries: readonly ReceizGuardedZipEntry[] }>
  | Readonly<{ inspected: false; error: string }>;
export type ReceizVerifiedFolderPackageReadResult =
  | Readonly<{ ok: true; access: "read-only"; sourceKind: "folder-package"; artifactBytes: Uint8Array;
      entries: readonly ReceizGuardedZipEntry[]; authority: ReceizFolderPackageAuthority; verification: ReceizArtifactVerificationResult }>
  | Readonly<{ ok: false; error: string; verification: ReceizArtifactVerificationResult }>;
export const inspectReceizZipBytesCanonical = implementation.inspectReceizZipBytes as (
  input: Omit<ReceizCanonicalVerifierInput, "purpose">,
) => Promise<ReceizGuardedZipInspectionResult>;
export const readVerifiedReceizFolderPackageBytesCanonical = implementation.readVerifiedReceizFolderPackageBytes as (
  input: Omit<ReceizCanonicalVerifierInput, "purpose">,
) => Promise<ReceizVerifiedFolderPackageReadResult>;

export const readVerifiedReceizDocumentBytesCanonical = implementation.readVerifiedReceizDocumentBytes as (
  input: Omit<ReceizCanonicalVerifierInput, "purpose">,
) => Promise<ReceizVerifiedDocumentReadResult>;
export const verifyReceizDocumentBytesCanonical = implementation.verifyReceizDocumentBytes as CanonicalVerify;
export const verifyAndExtractReceizDocumentBytesCanonical = implementation.verifyAndExtractReceizDocumentBytes as CanonicalOpen;
export const classifyReceizAssetContinuity = implementation.classifyReceizAssetContinuity as (
  originalBytes: Uint8Array,
  bundle?: Readonly<Record<string, unknown>> | null,
) => Promise<ReceizAssetContinuityVerification>;
export const verifyReceizFolderFilesCanonical = implementation.verifyReceizFolderFiles as (input: Readonly<{
  files: readonly Readonly<{ path: string; bytes: Uint8Array; mime?: string }>[];
  signingKey?: string;
  signatureV4RootPublicKeys?: ReadonlyMap<string, ReceizSignatureV4RootPublicKey> | null;
}>) => Promise<ReceizArtifactVerificationResult>;
export const verifyReceizArtifactBytesCanonical = implementation.verifyReceizArtifactBytes as (input: Readonly<{
  pngBytes: Uint8Array;
  optionalLink?: string;
  signingKey?: string;
  signatureV4RootPublicKeys?: ReadonlyMap<string, ReceizSignatureV4RootPublicKey> | null;
}>) => Promise<ReceizArtifactVerificationResult>;

const RECEIZ_TRAILER_PREFIX_BYTES = new TextEncoder().encode("\n\n--RECEIZ-TRAILER-v1--\n");
const RECEIZ_TRAILER_SUFFIX_BYTES = new TextEncoder().encode("\n--END-RECEIZ-TRAILER--\n");
const RECEIZ_STREAMING_TRAILER_TAIL_BYTES = 4 * 1024 * 1024;
const RECEIZ_STREAMING_ARTIFACT_MAX_BYTES = 500 * 1024 * 1024;
const RECEIZ_STREAMING_HASH_CHUNK_BYTES = 1024 * 1024;

function bytesMatchAt(bytes: Uint8Array, pattern: Uint8Array, offset: number): boolean {
  if (offset < 0 || offset + pattern.byteLength > bytes.byteLength) return false;
  for (let index = 0; index < pattern.byteLength; index += 1) {
    if (bytes[offset + index] !== pattern[index]) return false;
  }
  return true;
}

function lastPatternIndex(bytes: Uint8Array, pattern: Uint8Array): number {
  for (let offset = bytes.byteLength - pattern.byteLength; offset >= 0; offset -= 1) {
    if (bytesMatchAt(bytes, pattern, offset)) return offset;
  }
  return -1;
}

function countPattern(bytes: Uint8Array, pattern: Uint8Array): number {
  let count = 0;
  let offset = bytes.indexOf(pattern[0]!);
  while (offset >= 0) {
    if (bytesMatchAt(bytes, pattern, offset)) count += 1;
    offset = bytes.indexOf(pattern[0]!, offset + 1);
  }
  return count;
}

function invalidStreamingTrailer(message: string): ReceizLocalArtifactVerificationResult {
  return Object.freeze({
    ok: false,
    integrity: Object.freeze({ ok: false, errors: [message] }),
    kind: "trailer",
    errors: [message],
    warnings: [],
    bundle: null,
    anchor: null,
    package: null,
  });
}

function deniedStreamingTrailer(code: "ARTIFACT_TOO_LARGE" | "VERIFICATION_RESOURCE_UNAVAILABLE" = "ARTIFACT_TOO_LARGE", warnings: string[] = []): ReceizLocalArtifactVerificationResult {
  return Object.freeze({
    ok: false,
    integrity: Object.freeze({ ok: false, errors: [] }),
    kind: "trailer",
    errors: [],
    warnings,
    bundle: null,
    anchor: null,
    package: null,
    denial: receizProtocolOperationalDenial(code),
  });
}

export type ReceizStreamingTrailerVerification = Readonly<{
  verification: ReceizLocalArtifactVerificationResult;
  artifactSha256: string | null;
  payloadSha256: string | null;
  payloadByteLength: number | null;
}>;

export type ReceizStreamingTrailerInput = Readonly<{
  file: Blob;
  optionalLink?: string;
  signatureV4RootPublicKeys?: ReadonlyMap<string, ReceizSignatureV4RootPublicKey>;
}>;

/** Historical convenience API: retains its exact 500 MiB preflight denial. */
export async function verifyReceizTrailerFileStreaming(input: ReceizStreamingTrailerInput): Promise<ReceizStreamingTrailerVerification> {
  return executeReceizTrailerFileStreaming(input, "historical");
}

/**
 * Current read-only trailer inspection without an aggregate source-size ceiling.
 * Exact bytes remain authority. IO uses bounded ranges; hashing, proof parsing,
 * native serialization and continuity stay under the canonical verifier. This
 * result does not issue native append custody or a ReceizSealedArtifact.
 */
export async function readReceizTrailerFileStreaming(input: ReceizStreamingTrailerInput): Promise<ReceizStreamingTrailerVerification> {
  return executeReceizTrailerFileStreaming(input, "current");
}

export const currentReceizVerificationRuntimeAvailable = implementation.currentReceizVerificationRuntimeAvailable;

export type ReceizCurrentCompleteExecutionReason = "declared-normalization" | "structured-reconstruction" | "legacy-interpretation" | "tail-window";
export type ReceizCurrentSourceExecution =
  | Readonly<{ execution: "streamed"; result: ReceizStreamingTrailerVerification }>
  | Readonly<{ execution: "needs-existing-full-executor"; reason: ReceizCurrentCompleteExecutionReason }>
  | Readonly<{ execution: "unavailable"; result: ReceizStreamingTrailerVerification }>;

/** Current selected-source mechanics; historical read APIs retain their shape. */
export async function executeReceizCurrentTrailerSource(input: ReceizStreamingTrailerInput): Promise<ReceizCurrentSourceExecution> {
  let completeReason: ReceizCurrentCompleteExecutionReason | null = null;
  const result = await executeReceizTrailerFileStreaming(input, "current", reason => { completeReason = reason; });
  if (completeReason) return { execution: "needs-existing-full-executor", reason: completeReason };
  return { execution: result.verification.denial ? "unavailable" : "streamed", result };
}

function unavailableStreamingTrailer(warnings: string[] = []): ReceizStreamingTrailerVerification {
  return Object.freeze({ verification: deniedStreamingTrailer("VERIFICATION_RESOURCE_UNAVAILABLE", warnings), artifactSha256: null, payloadSha256: null, payloadByteLength: null });
}

async function executeReceizTrailerFileStreaming(
  input: ReceizStreamingTrailerInput, mode: "historical" | "current",
  needsComplete?: (reason: ReceizCurrentCompleteExecutionReason) => void,
): Promise<ReceizStreamingTrailerVerification> {
  try {
    const source = input.file;
    const byteLength = source instanceof Blob ? source.size : 0;
    if (!(source instanceof Blob) || !Number.isSafeInteger(byteLength) || byteLength <= 0) {
      return Object.freeze({ verification: invalidStreamingTrailer("Artifact file is invalid."), artifactSha256: null, payloadSha256: null, payloadByteLength: null });
    }
    if (mode === "historical" && byteLength > RECEIZ_STREAMING_ARTIFACT_MAX_BYTES) {
      return Object.freeze({ verification: deniedStreamingTrailer(), artifactSha256: null, payloadSha256: null, payloadByteLength: null });
    }
    // Snapshot the selected immutable byte range and trusted host configuration
    // before awaiting IO. No source property can supply a verified digest.
    const file = source.slice(0, byteLength);
    if (file.size !== byteLength) return unavailableStreamingTrailer();
    const optionalLink = input.optionalLink;
    const roots = new Map([...(input.signatureV4RootPublicKeys ?? receizCurrentPinnedSignatureV4Roots())]
      .map(([kid, root]) => [kid, Object.freeze({ ...root })]));
    return await executeSnapshot();

    async function readRange(start: number, end: number): Promise<Uint8Array> {
      if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || end < start
        || end > byteLength || end - start > RECEIZ_STREAMING_TRAILER_TAIL_BYTES) throw new Error("artifact_stream_range_invalid");
      const part = file.slice(start, end);
      if (part.size !== end - start) throw new Error("artifact_stream_short_slice");
      const bytes = new Uint8Array(await part.arrayBuffer());
      if (bytes.byteLength !== end - start) throw new Error("artifact_stream_short_read");
      return bytes;
    }

    async function executeSnapshot(): Promise<ReceizStreamingTrailerVerification> {
      const tailStart = Math.max(0, byteLength - RECEIZ_STREAMING_TRAILER_TAIL_BYTES);
      const tail = await readRange(tailStart, byteLength);
      const prefixOffset = lastPatternIndex(tail, RECEIZ_TRAILER_PREFIX_BYTES);
      if (mode === "current" && prefixOffset < 0 && tailStart > 0) {
        needsComplete?.("tail-window");
        return unavailableStreamingTrailer(["Current trailer read could not locate proof in its bounded 4 MiB tail window; the unsearched prefix is not evaluated."]);
      }
      const suffixOffset = tail.byteLength - RECEIZ_TRAILER_SUFFIX_BYTES.byteLength;
      if (
        prefixOffset < 0
        || suffixOffset <= prefixOffset + RECEIZ_TRAILER_PREFIX_BYTES.byteLength
        || !bytesMatchAt(tail, RECEIZ_TRAILER_SUFFIX_BYTES, suffixOffset)
      ) {
        return Object.freeze({ verification: invalidStreamingTrailer("Missing or malformed trailer proof bundle."), artifactSha256: null, payloadSha256: null, payloadByteLength: null });
      }

      let bundle: unknown;
      try {
        const jsonBytes = tail.subarray(prefixOffset + RECEIZ_TRAILER_PREFIX_BYTES.byteLength, suffixOffset);
        bundle = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(jsonBytes)) as unknown;
      } catch (error) {
        if (!(error instanceof SyntaxError) && !(error instanceof TypeError)) throw error;
        return Object.freeze({ verification: invalidStreamingTrailer("Trailer proof bundle is malformed."), artifactSha256: null, payloadSha256: null, payloadByteLength: null });
      }

      const payloadByteLength = tailStart + prefixOffset;
      if (needsComplete) {
        const payloadPrefix = await readRange(0, Math.min(4096, payloadByteLength));
        const reason = implementation.currentReceizTrailerCompleteExecutionReason({ bundle, payloadPrefix });
        if (reason) {
          needsComplete(reason);
          return unavailableStreamingTrailer();
        }
      }
      const payloadHash = await createSHA256();
      payloadHash.init();
      let artifactHash: Awaited<ReturnType<typeof createSHA256>> | null = null;
      let prefixCount = 0;
      let carry = new Uint8Array();
      let payloadPrefix = new Uint8Array();
      let observedBytes = 0;
      for (let offset = 0; offset < byteLength; offset += RECEIZ_STREAMING_HASH_CHUNK_BYTES) {
        const chunk = await readRange(offset, Math.min(byteLength, offset + RECEIZ_STREAMING_HASH_CHUNK_BYTES));
        observedBytes += chunk.byteLength;
        if (offset === 0) payloadPrefix = chunk.slice(0, Math.min(4096, payloadByteLength));
        if (artifactHash) {
          artifactHash.update(chunk);
        } else {
          const payloadCount = Math.min(chunk.byteLength, Math.max(0, payloadByteLength - offset));
          if (payloadCount > 0) payloadHash.update(chunk.subarray(0, payloadCount));
          if (offset + chunk.byteLength >= payloadByteLength) {
            artifactHash = await createSHA256();
            artifactHash.load(payloadHash.save());
            if (payloadCount < chunk.byteLength) artifactHash.update(chunk.subarray(payloadCount));
          }
        }
        const scan = new Uint8Array(carry.byteLength + chunk.byteLength);
        scan.set(carry);
        scan.set(chunk, carry.byteLength);
        prefixCount += countPattern(scan, RECEIZ_TRAILER_PREFIX_BYTES);
        const carryLength = Math.min(RECEIZ_TRAILER_PREFIX_BYTES.byteLength - 1, scan.byteLength);
        carry = scan.slice(scan.byteLength - carryLength);
      }
      if (prefixCount !== 1) {
        const message = prefixCount > 1 ? "Duplicate trailer proof bundles detected." : "Missing trailer proof bundle.";
        return Object.freeze({ verification: invalidStreamingTrailer(message), artifactSha256: null, payloadSha256: null, payloadByteLength: null });
      }

      if (!artifactHash || observedBytes !== byteLength) return unavailableStreamingTrailer();
      const artifactSha256 = artifactHash.digest();
      const payloadSha256 = payloadHash.digest();
      const verifyDigest = (mode === "current" ? implementation.readReceizCurrentTrailerBundleDigest : implementation.verifyReceizTrailerBundleDigest) as (args: Readonly<{
        payloadPrefix: Uint8Array;
        trailerBytes: Uint8Array;
        bundle: unknown;
        basisSha256: string;
        optionalLink?: string;
        signatureV4RootPublicKeys?: ReadonlyMap<string, ReceizSignatureV4RootPublicKey> | null;
      }>) => Promise<ReceizLocalArtifactVerificationResult>;
      const verification = await verifyDigest({
        bundle,
        basisSha256: payloadSha256,
        payloadPrefix,
        trailerBytes: tail.subarray(prefixOffset),
        ...(optionalLink ? { optionalLink } : {}),
        signatureV4RootPublicKeys: roots,
      });
      if (verification.denial) return unavailableStreamingTrailer([...verification.warnings]);
      if (mode === "current") {
        const exact = validateReceizExactByteVerification(verification, payloadSha256);
        if (!exact.ok) {
          if (exact.denial) return unavailableStreamingTrailer();
          const errors = [...exact.errors];
          return Object.freeze({
            verification: Object.freeze({ ...verification, ok: false, errors,
              integrity: Object.freeze({ ok: false, errors }) }),
            artifactSha256, payloadSha256, payloadByteLength,
          });
        }
      }
      return Object.freeze({ verification, artifactSha256, payloadSha256, payloadByteLength });
    }
  } catch {
    // Thrown IO, allocation/hash/runtime failure did not complete verification.
    // Completed canonical invalid results return normally above.
    return unavailableStreamingTrailer();
  }
}

export async function verifyReceizDocumentBytesLocal(
  input: ReceizLocalArtifactInput & { signatureV4RootPublicKeys?: ReadonlyMap<string, ReceizSignatureV4RootPublicKey>; packageExecutionCapacity?: ReceizPackageExecutionCapacity },
): Promise<ReceizLocalArtifactVerificationResult> {
  return verifyReceizDocumentBytesCanonical({
    fileBytes: input.fileBytes,
    ...(input.filename ? { filename: input.filename } : {}),
    ...(input.mimeType ? { mime: input.mimeType } : {}),
    signatureV4RootPublicKeys: input.signatureV4RootPublicKeys ?? receizCurrentPinnedSignatureV4Roots(),
    ...(input.packageExecutionCapacity ? { packageExecutionCapacity: input.packageExecutionCapacity } : {}),
  });
}

export async function verifyAndExtractReceizDocumentBytesLocal(
  input: ReceizLocalArtifactInput & {
    signatureV4RootPublicKeys?: ReadonlyMap<string, ReceizSignatureV4RootPublicKey>;
    packageExecutionCapacity?: ReceizPackageExecutionCapacity;
    purpose?: "verified-proof-predecessor-append";
  },
): Promise<ReceizVerifiedArtifactOpenResult> {
  return verifyAndExtractReceizDocumentBytesCanonical({
    fileBytes: input.fileBytes,
    ...(input.filename ? { filename: input.filename } : {}),
    ...(input.mimeType ? { mime: input.mimeType } : {}),
    ...(input.purpose ? { purpose: input.purpose } : {}),
    signatureV4RootPublicKeys: input.signatureV4RootPublicKeys ?? receizCurrentPinnedSignatureV4Roots(),
    ...(input.packageExecutionCapacity ? { packageExecutionCapacity: input.packageExecutionCapacity } : {}),
  });
}

export type ReceizCanonicalExactByteVerification =
  | Readonly<{
      ok: true;
      verification: ReceizArtifactVerification;
      payloadSha256: string;
      continuity: ReceizArtifactContinuityAssessment;
    }>
  | Readonly<{
      ok: false;
      verification: ReceizLocalArtifactVerificationResult;
      errors: readonly string[];
      denial?: NonNullable<ReceizLocalArtifactVerificationResult["denial"]>;
    }>;

export function validateReceizExactByteVerification(
  verification: ReceizLocalArtifactVerificationResult,
  payloadSha256Input: string,
): ReceizCanonicalExactByteVerification {
  if (!verification.ok || !verification.integrity.ok || verification.errors.length > 0) {
    if (verification.denial) {
      return Object.freeze({
        ok: false,
        verification,
        errors: Object.freeze([]),
        denial: verification.denial,
      });
    }
    return Object.freeze({
      ok: false,
      verification,
      errors: Object.freeze(verification.errors.length > 0
        ? [...verification.errors]
        : [...verification.integrity.errors, "artifact_verification_failed"]),
    });
  }
  const payloadSha256 = payloadSha256Input.trim().toLowerCase();
  const bundle = verification.bundle;
  const declaredBasis = typeof bundle?.artifactSha256Basis === "string"
    ? bundle.artifactSha256Basis.trim().toLowerCase()
    : "";
  if (!bundle || !SHA256_RE.test(payloadSha256) || declaredBasis !== payloadSha256) {
    return Object.freeze({
      ok: false,
      verification,
      errors: Object.freeze(["verified_artifact_payload_binding_missing"]),
    });
  }
  const nativeRecordSeal = bundle.nativeRecordSeal;
  if (
    nativeRecordSeal
    && (
      typeof nativeRecordSeal !== "object"
      || nativeRecordSeal === null
      || typeof (nativeRecordSeal as { payload?: unknown }).payload !== "object"
      || (nativeRecordSeal as { payload: { sha256?: unknown } }).payload.sha256 !== payloadSha256
    )
  ) {
    const hasOwnershipContinuity = (
      typeof nativeRecordSeal === "object"
      && nativeRecordSeal !== null
      && typeof (nativeRecordSeal as { ownershipContinuity?: unknown }).ownershipContinuity === "object"
      && (nativeRecordSeal as { ownershipContinuity?: unknown }).ownershipContinuity !== null
    );
    return Object.freeze({
      ok: false,
      verification,
      errors: Object.freeze([hasOwnershipContinuity
        ? "continuity_ownership_attestation_mismatch"
        : "native_record_payload_hash_mismatch"]),
    });
  }
  const continuity = verification.assetContinuity ?? Object.freeze({ state: "not_applicable" as const });
  if (continuity.state === "invalid") {
    const continuityError = typeof continuity.error === "string" && continuity.error.trim()
      ? continuity.error
      : "artifact_continuity_invalid";
    return Object.freeze({
      ok: false,
      verification,
      errors: Object.freeze([continuityError]),
    });
  }
  if (continuity.state === "historical_missing") {
    return Object.freeze({
      ok: false,
      verification,
      errors: Object.freeze(["artifact_continuity_historical_missing"]),
    });
  }
  return Object.freeze({
    ok: true,
    verification: verification as ReceizArtifactVerification,
    payloadSha256,
    continuity,
  });
}

/**
 * Reuses the canonical local verifier and only projects its already-verified
 * payload binding and continuity assessment. It does not grant admission or
 * operation authority.
 */
export async function verifyReceizArtifactExactBytesCanonical(
  input: ReceizLocalArtifactInput & {
    signatureV4RootPublicKeys?: ReadonlyMap<string, ReceizSignatureV4RootPublicKey>;
    packageExecutionCapacity?: ReceizPackageExecutionCapacity;
  },
): Promise<ReceizCanonicalExactByteVerification> {
  const verification = await verifyReceizDocumentBytesLocal(input);
  const bundle = verification.bundle;
  const payloadSha256 = typeof bundle?.artifactSha256Basis === "string"
    ? bundle.artifactSha256Basis.trim().toLowerCase()
    : "";
  return validateReceizExactByteVerification(verification, payloadSha256);
}
