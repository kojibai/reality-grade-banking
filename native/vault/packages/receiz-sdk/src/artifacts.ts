import { ReceizError } from "./errors.js";
import type { DocumentVerifyResponse } from "./index.js";

const receizArtifactBrand: unique symbol = Symbol("receiz.sdk.artifact.runtime-custody");
const issuedCurrentArtifacts = new WeakSet<object>();
const issuedLegacyArtifacts = new WeakSet<object>();

const SHA256_RE = /^[0-9a-f]{64}$/;

export type ReceizArtifactErrorCode =
  | "artifact_payload_missing"
  | "artifact_record_failed"
  | "artifact_seal_failed"
  | "artifact_verification_failed"
  | "artifact_integrity_failed"
  | "artifact_signature_v4_required"
  | "artifact_owner_mismatch"
  | "artifact_claim_mismatch"
  | "artifact_payload_binding_mismatch"
  | "artifact_not_sdk_issued"
  | "artifact_download_unavailable"
  | "artifact_download_digest_mismatch"
  | "artifact_extraction_failed"
  | "artifact_legacy_unsupported"
  | "artifact_custody_conflict"
  | "artifact_ownership_failed";

export class ReceizArtifactError extends ReceizError<ReceizArtifactErrorCode> {
  constructor(readonly code: ReceizArtifactErrorCode) {
    super(code, code, { rail: "proof", retryable: false });
    this.name = "ReceizArtifactError";
  }
}

export type ReceizPayload = Readonly<{
  bytes: Uint8Array;
  mimeType: string;
}>;

export type ReceizNativeArtifactContinuity = Readonly<{
  carrier: "native-record-seal";
  ownerReceizId: string;
  recordId: string;
  claimId: string;
  verifyPath: string;
  signatureVersion: 4;
}>;

export type ReceizVerifiedLegacyContinuity = Readonly<{
  carrier: "verified-legacy-read";
  ownerReceizId: string;
  claimId: string;
  verifyPath: string;
  signatureVersion: 4;
}>;

export type ReceizSuccessfulArtifactVerification = Readonly<{
  ok: true;
  integrity: Readonly<{ ok: true; errors: readonly [] }>;
  kind: string;
  errors: readonly [];
  warnings: readonly string[];
  bundle: Readonly<Record<string, unknown>>;
  assetContinuity?: Readonly<Record<string, unknown>>;
  [key: string]: unknown;
}>;

export type ReceizSealedArtifact = Readonly<{
  readonly [receizArtifactBrand]: "current-native";
  kind: "receiz.native-record-seal";
  artifact: Blob;
  filename: string;
  mimeType: string;
  artifactSha256: string;
  payloadSha256: string;
  continuity: ReceizNativeArtifactContinuity;
  verification: ReceizSuccessfulArtifactVerification;
}>;

export type ReceizVerifiedLegacyArtifact = Readonly<{
  readonly [receizArtifactBrand]: "verified-legacy-read";
  kind: "receiz.verified-legacy-artifact";
  artifact: Blob;
  filename: string;
  mimeType: string;
  artifactSha256: string;
  payloadSha256: string;
  continuity: ReceizVerifiedLegacyContinuity;
  verification: ReceizSuccessfulArtifactVerification;
}>;

export type ReceizVerifiedPayload = Readonly<{
  bytes: Uint8Array;
  filename: string;
  mimeType: string;
  sha256: string;
}>;

export type ReceizOpenedArtifact = Readonly<{
  sealedArtifact: ReceizSealedArtifact | ReceizVerifiedLegacyArtifact;
  verifiedPayload: ReceizVerifiedPayload;
  verification: DocumentVerifyResponse;
  legacyCompatibility: "current-native" | "verified-legacy-read";
}>;

export type ReceizArtifactDownloadEvidence = Readonly<{
  ok: true;
  filename: string;
  mimeType: string;
  size: number;
  artifactSha256: string;
}>;

type NativeRecordSeal = Readonly<{
  schema: "receiz.native_record_seal.v1";
  ownerReceizId: string;
  recordId: string;
  payload: Readonly<{
    filename: string;
    mimeType: string;
    sha256: string;
  }>;
}>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isProjectionOnlyPublicRecord(value: unknown): boolean {
  if (!isRecord(value) || !isRecord(value.authority)) return false;
  return value.authority.profile === "projection-only"
    && value.authority.projectionIsProofAuthority === false
    && value.authority.strongerTruth === "sealed-receiz-proof-object";
}

function nonempty(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizedMimeType(value: unknown): string | null {
  const normalized = nonempty(value)?.toLowerCase() ?? "";
  if (!normalized || !normalized.includes("/") || /[\r\n]/.test(normalized)) return null;
  return normalized;
}

function cloneAndFreeze(value: unknown): unknown {
  if (Array.isArray(value)) return Object.freeze(value.map((item) => cloneAndFreeze(item)));
  if (isRecord(value)) {
    const copy = Object.create(null) as Record<string, unknown>;
    for (const [key, item] of Object.entries(value)) copy[key] = cloneAndFreeze(item);
    return Object.freeze(copy);
  }
  return value;
}

function readNativeRecordSeal(bundle: Readonly<Record<string, unknown>>): NativeRecordSeal | null {
  const value = bundle.nativeRecordSeal;
  if (!isRecord(value) || value.schema !== "receiz.native_record_seal.v1") return null;
  const ownerReceizId = nonempty(value.ownerReceizId);
  const recordId = nonempty(value.recordId);
  const payload = value.payload;
  if (!ownerReceizId?.endsWith(".receiz.id") || !recordId || !isRecord(payload)) return null;
  const filename = nonempty(payload.filename);
  const mimeType = normalizedMimeType(payload.mimeType);
  const sha256 = nonempty(payload.sha256)?.toLowerCase() ?? "";
  if (!filename || !mimeType || !SHA256_RE.test(sha256)) return null;
  return Object.freeze({
    schema: "receiz.native_record_seal.v1",
    ownerReceizId,
    recordId,
    payload: Object.freeze({ filename, mimeType, sha256 }),
  });
}

function hasSignatureV4(bundle: Readonly<Record<string, unknown>>): boolean {
  const signature = bundle.signatureV4;
  return isRecord(signature) && signature.version === 1;
}

export function snapshotSuccessfulArtifactVerification(
  value: DocumentVerifyResponse,
): ReceizSuccessfulArtifactVerification {
  if (!isRecord(value) || value.ok !== true || !Array.isArray(value.errors) || value.errors.length !== 0) {
    throw new ReceizArtifactError("artifact_verification_failed");
  }
  if (
    !isRecord(value.integrity)
    || value.integrity.ok !== true
    || !Array.isArray(value.integrity.errors)
    || value.integrity.errors.length !== 0
  ) {
    throw new ReceizArtifactError("artifact_integrity_failed");
  }
  if (!isRecord(value.bundle) || !Array.isArray(value.warnings)) {
    throw new ReceizArtifactError("artifact_verification_failed");
  }
  if (!hasSignatureV4(value.bundle)) {
    throw new ReceizArtifactError("artifact_signature_v4_required");
  }
  return cloneAndFreeze(value) as ReceizSuccessfulArtifactVerification;
}

function validateArtifactMetadata(args: {
  artifact: Blob;
  filename: string;
  mimeType: string;
  artifactSha256: string;
  payloadSha256: string;
}): { filename: string; mimeType: string; artifactSha256: string; payloadSha256: string } {
  if (!(args.artifact instanceof Blob) || args.artifact.size <= 0) {
    throw new ReceizArtifactError("artifact_seal_failed");
  }
  const filename = nonempty(args.filename);
  const mimeType = normalizedMimeType(args.mimeType);
  const artifactSha256 = args.artifactSha256.trim().toLowerCase();
  const payloadSha256 = args.payloadSha256.trim().toLowerCase();
  if (!filename || !mimeType || args.artifact.type !== mimeType) {
    throw new ReceizArtifactError("artifact_seal_failed");
  }
  if (!SHA256_RE.test(artifactSha256) || !SHA256_RE.test(payloadSha256)) {
    throw new ReceizArtifactError("artifact_payload_binding_mismatch");
  }
  return { filename, mimeType, artifactSha256, payloadSha256 };
}

export function issueCurrentNativeArtifact(args: {
  artifact: Blob;
  filename: string;
  mimeType: string;
  artifactSha256: string;
  payloadSha256: string;
  payloadFilename?: string;
  payloadMimeType?: string;
  continuity: ReceizNativeArtifactContinuity;
  verification: DocumentVerifyResponse;
}): ReceizSealedArtifact {
  const metadata = validateArtifactMetadata(args);
  const verification = snapshotSuccessfulArtifactVerification(args.verification);
  const nativeRecordSeal = readNativeRecordSeal(verification.bundle);
  if (!nativeRecordSeal) throw new ReceizArtifactError("artifact_owner_mismatch");
  if (
    args.continuity.carrier !== "native-record-seal"
    || args.continuity.signatureVersion !== 4
    || nativeRecordSeal.ownerReceizId !== args.continuity.ownerReceizId
    || nativeRecordSeal.recordId !== args.continuity.recordId
  ) {
    throw new ReceizArtifactError("artifact_owner_mismatch");
  }
  if (
    verification.bundle.receizClaimId !== args.continuity.claimId
    || verification.bundle.verifyPath !== args.continuity.verifyPath
  ) {
    throw new ReceizArtifactError("artifact_claim_mismatch");
  }
  if (
    nativeRecordSeal.payload.sha256 !== metadata.payloadSha256
    || verification.bundle.artifactSha256Basis !== metadata.payloadSha256
    || (args.payloadFilename !== undefined && nativeRecordSeal.payload.filename !== args.payloadFilename)
    || (
      args.payloadMimeType !== undefined
      && nativeRecordSeal.payload.mimeType !== normalizedMimeType(args.payloadMimeType)
    )
  ) {
    throw new ReceizArtifactError("artifact_payload_binding_mismatch");
  }
  const continuity = Object.freeze({ ...args.continuity });
  const issued = {
    kind: "receiz.native-record-seal",
    artifact: args.artifact,
    ...metadata,
    continuity,
    verification,
  } as Omit<ReceizSealedArtifact, typeof receizArtifactBrand> & Partial<Pick<ReceizSealedArtifact, typeof receizArtifactBrand>>;
  Object.defineProperty(issued, receizArtifactBrand, {
    configurable: false,
    enumerable: false,
    writable: false,
    value: "current-native",
  });
  Object.freeze(issued);
  issuedCurrentArtifacts.add(issued);
  return issued as ReceizSealedArtifact;
}

export function issueVerifiedLegacyArtifact(args: {
  artifact: Blob;
  filename: string;
  mimeType: string;
  artifactSha256: string;
  payloadSha256: string;
  continuity: ReceizVerifiedLegacyContinuity;
  verification: DocumentVerifyResponse;
}): ReceizVerifiedLegacyArtifact {
  const metadata = validateArtifactMetadata(args);
  const verification = snapshotSuccessfulArtifactVerification(args.verification);
  if (readNativeRecordSeal(verification.bundle)) {
    throw new ReceizArtifactError("artifact_legacy_unsupported");
  }
  const assetContinuity = verification.assetContinuity;
  if (
    !isRecord(assetContinuity)
    || assetContinuity.state !== "verified"
    || assetContinuity.ownerReceizId !== args.continuity.ownerReceizId
    || args.continuity.carrier !== "verified-legacy-read"
    || args.continuity.signatureVersion !== 4
  ) {
    throw new ReceizArtifactError("artifact_owner_mismatch");
  }
  if (
    verification.bundle.receizClaimId !== args.continuity.claimId
    || verification.bundle.verifyPath !== args.continuity.verifyPath
  ) {
    throw new ReceizArtifactError("artifact_claim_mismatch");
  }
  if (verification.bundle.artifactSha256Basis !== metadata.payloadSha256) {
    throw new ReceizArtifactError("artifact_payload_binding_mismatch");
  }
  const continuity = Object.freeze({ ...args.continuity });
  const issued = {
    kind: "receiz.verified-legacy-artifact",
    artifact: args.artifact,
    ...metadata,
    continuity,
    verification,
  } as Omit<ReceizVerifiedLegacyArtifact, typeof receizArtifactBrand> & Partial<Pick<ReceizVerifiedLegacyArtifact, typeof receizArtifactBrand>>;
  Object.defineProperty(issued, receizArtifactBrand, {
    configurable: false,
    enumerable: false,
    writable: false,
    value: "verified-legacy-read",
  });
  Object.freeze(issued);
  issuedLegacyArtifacts.add(issued);
  return issued as ReceizVerifiedLegacyArtifact;
}

export function issueVerifiedPayload(args: {
  bytes: Uint8Array;
  filename: string;
  mimeType: string;
  sha256: string;
}): ReceizVerifiedPayload {
  const snapshot = new Uint8Array(args.bytes);
  const filename = nonempty(args.filename);
  const mimeType = normalizedMimeType(args.mimeType);
  const sha256 = args.sha256.trim().toLowerCase();
  if (!snapshot.byteLength || !filename || !mimeType || !SHA256_RE.test(sha256)) {
    throw new ReceizArtifactError("artifact_extraction_failed");
  }
  const payload = Object.defineProperties(
    { filename, mimeType, sha256 },
    {
      bytes: {
        configurable: false,
        enumerable: true,
        get: () => new Uint8Array(snapshot),
      },
    },
  ) as ReceizVerifiedPayload;
  return Object.freeze(payload);
}

export function assertSdkIssuedCurrentArtifact(value: unknown): asserts value is ReceizSealedArtifact {
  if (isRecord(value) && issuedLegacyArtifacts.has(value)) {
    throw new ReceizArtifactError("artifact_legacy_unsupported");
  }
  if (!isRecord(value) || !issuedCurrentArtifacts.has(value)) {
    throw new ReceizArtifactError("artifact_not_sdk_issued");
  }
  if (
    value.kind !== "receiz.native-record-seal"
    || Reflect.get(value, receizArtifactBrand) !== "current-native"
    || !Object.isFrozen(value)
  ) {
    throw new ReceizArtifactError("artifact_not_sdk_issued");
  }
}

export function assertSdkIssuedReadableArtifact(
  value: unknown,
): asserts value is ReceizSealedArtifact | ReceizVerifiedLegacyArtifact {
  // Projection records are locator/display data. They can never satisfy the
  // runtime custody boundary of the enclosing sealed proof object.
  if (isProjectionOnlyPublicRecord(value)) {
    throw new ReceizArtifactError("artifact_not_sdk_issued");
  }
  if (!isRecord(value) || (!issuedCurrentArtifacts.has(value) && !issuedLegacyArtifacts.has(value))) {
    throw new ReceizArtifactError("artifact_not_sdk_issued");
  }
  const current = issuedCurrentArtifacts.has(value);
  const expectedKind = current ? "receiz.native-record-seal" : "receiz.verified-legacy-artifact";
  const expectedBrand = current ? "current-native" : "verified-legacy-read";
  if (
    value.kind !== expectedKind
    || Reflect.get(value, receizArtifactBrand) !== expectedBrand
    || !Object.isFrozen(value)
  ) {
    throw new ReceizArtifactError("artifact_not_sdk_issued");
  }
}

export async function sha256ReceizBytes(bytes: Uint8Array): Promise<string> {
  const snapshot = new Uint8Array(bytes);
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) throw new ReceizArtifactError("artifact_verification_failed");
  const digest = await subtle.digest("SHA-256", snapshot.buffer);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function filenameFromContentDisposition(value: string | null): string | null {
  const header = value?.trim() ?? "";
  if (!header) return null;
  const encoded = /(?:^|;)\s*filename\*\s*=\s*(?:UTF-8'')?([^;]+)/i.exec(header)?.[1]?.trim();
  const quoted = /(?:^|;)\s*filename\s*=\s*"([^"]+)"/i.exec(header)?.[1];
  const plain = /(?:^|;)\s*filename\s*=\s*([^;]+)/i.exec(header)?.[1]?.trim();
  let filename = encoded ?? quoted ?? plain ?? "";
  if (encoded) {
    try {
      filename = decodeURIComponent(encoded.replace(/^"|"$/g, ""));
    } catch {
      return null;
    }
  }
  filename = filename.trim();
  if (!filename || filename.length > 512 || /[\u0000-\u001f\u007f\\/]/.test(filename)) return null;
  return filename;
}

export function mimeTypeFromResponse(value: string | null): string | null {
  return normalizedMimeType(value);
}

export function canonicalVerifyPath(value: string | null): string | null {
  const path = value?.trim() ?? "";
  if (!path.startsWith("/v/") || path.includes("#")) return null;
  try {
    const parsed = new URL(path, "https://receiz.invalid");
    return parsed.origin === "https://receiz.invalid" && parsed.pathname.startsWith("/v/")
      ? parsed.pathname
      : null;
  } catch {
    return null;
  }
}

export async function downloadReceizArtifact(
  value: ReceizSealedArtifact,
): Promise<ReceizArtifactDownloadEvidence> {
  assertSdkIssuedCurrentArtifact(value);
  const verification = snapshotSuccessfulArtifactVerification(value.verification as unknown as DocumentVerifyResponse);
  const nativeRecordSeal = readNativeRecordSeal(verification.bundle);
  if (
    value.continuity.carrier !== "native-record-seal"
    || value.continuity.signatureVersion !== 4
    || !nativeRecordSeal
    || nativeRecordSeal.ownerReceizId !== value.continuity.ownerReceizId
    || nativeRecordSeal.recordId !== value.continuity.recordId
  ) {
    throw new ReceizArtifactError("artifact_owner_mismatch");
  }
  if (
    !(value.artifact instanceof Blob)
    || value.artifact.type !== value.mimeType
    || (typeof File !== "undefined" && value.artifact instanceof File && value.artifact.name !== value.filename)
  ) {
    throw new ReceizArtifactError("artifact_download_digest_mismatch");
  }
  const artifactBytes = new Uint8Array(await value.artifact.arrayBuffer());
  const digest = await sha256ReceizBytes(artifactBytes);
  if (digest !== value.artifactSha256 || value.artifact.size !== artifactBytes.byteLength) {
    throw new ReceizArtifactError("artifact_download_digest_mismatch");
  }

  const browserDocument = globalThis.document;
  if (
    !browserDocument
    || typeof browserDocument.createElement !== "function"
    || typeof URL.createObjectURL !== "function"
    || typeof URL.revokeObjectURL !== "function"
  ) {
    throw new ReceizArtifactError("artifact_download_unavailable");
  }
  let objectUrl = "";
  let anchor: HTMLAnchorElement | null = null;
  try {
    objectUrl = URL.createObjectURL(value.artifact);
    anchor = browserDocument.createElement("a");
    anchor.href = objectUrl;
    anchor.download = value.filename;
    anchor.click();
  } catch {
    throw new ReceizArtifactError("artifact_download_unavailable");
  } finally {
    try {
      anchor?.remove();
    } catch {
      // Cleanup cannot replace the explicit download result/error contract.
    }
    if (objectUrl) {
      try {
        URL.revokeObjectURL(objectUrl);
      } catch {
        // Cleanup cannot replace the explicit download result/error contract.
      }
    }
  }
  return Object.freeze({
    ok: true,
    filename: value.filename,
    mimeType: value.mimeType,
    size: value.artifact.size,
    artifactSha256: value.artifactSha256,
  });
}
