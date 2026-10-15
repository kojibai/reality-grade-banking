import {
  deriveReceizPortableOwnershipContinuity,
  parseReceizPortableAssetDocument,
  ReceizPortableAssetError,
} from "../portableAsset.js";
import { base64UrlDecode, bytesEqual, isRecord, jcsCanonicalize, sha256Hex } from "./crypto.js";
import { verifyReceizGroth16 } from "./groth16.js";
import { receizV109PinnedSignatureV4Roots } from "./roots.js";
import { verifyReceizSignatureV4, type ReceizSignatureV4RootPublicKey } from "./signatureV4.js";
import type {
  ReceizLocalArtifactInput,
  ReceizLocalArtifactOpenResult,
  ReceizLocalArtifactVerificationResult,
  ReceizLocalAssetContinuity,
} from "./types.js";

type BundleEnvelope = Readonly<{
  manifest: Readonly<{ filename: string; mime: string; basisSha256: string; createdAt: number; version: 1 }>;
  originalBase64: string;
  originalBytes: Uint8Array;
  bundle: Record<string, unknown>;
}>;

const HEX64_RE = /^[0-9a-f]{64}$/;

function invalid(kind: ReceizLocalArtifactVerificationResult["kind"], errors: string[]): ReceizLocalArtifactVerificationResult {
  return { ok: false, integrity: { ok: false, errors }, kind, errors, warnings: [], bundle: null, anchor: null, package: null };
}

function nonempty(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function parseBundleEnvelope(bytes: Uint8Array): BundleEnvelope | null {
  let value: unknown;
  try {
    value = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
  if (!isRecord(value) || value.kind !== "receiz.bundle.v1" || !isRecord(value.manifest) || !isRecord(value.proofbundle)) return null;
  const filename = nonempty(value.manifest.filename);
  const mime = nonempty(value.manifest.mime)?.toLowerCase() ?? null;
  const basisSha256 = nonempty(value.manifest.basisSha256)?.toLowerCase() ?? null;
  const createdAt = Number(value.manifest.createdAt);
  if (!filename || !mime?.includes("/") || !basisSha256 || !HEX64_RE.test(basisSha256) || !Number.isSafeInteger(createdAt) || value.manifest.version !== 1 || typeof value.originalBase64 !== "string") return null;
  let originalBytes: Uint8Array;
  try {
    originalBytes = base64UrlDecode(value.originalBase64);
  } catch {
    return null;
  }
  return {
    manifest: { filename, mime, basisSha256, createdAt, version: 1 },
    originalBase64: value.originalBase64,
    originalBytes,
    bundle: value.proofbundle,
  };
}

function nativeRecordSeal(bundle: Record<string, unknown>): Record<string, unknown> | null {
  const seal = bundle.nativeRecordSeal;
  if (!isRecord(seal) || seal.schema !== "receiz.native_record_seal.v1" || !isRecord(seal.payload)) return null;
  const ownerReceizId = nonempty(seal.ownerReceizId);
  const recordId = nonempty(seal.recordId);
  const filename = nonempty(seal.payload.filename);
  const mimeType = nonempty(seal.payload.mimeType)?.toLowerCase() ?? null;
  const sha256 = nonempty(seal.payload.sha256)?.toLowerCase() ?? null;
  if (!ownerReceizId?.endsWith(".receiz.id") || !recordId || !filename || !mimeType?.includes("/") || !sha256 || !HEX64_RE.test(sha256)) return null;
  return seal;
}

async function classifyContinuity(bytes: Uint8Array, bundle: Record<string, unknown>): Promise<ReceizLocalAssetContinuity> {
  let value: unknown;
  try {
    value = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return { state: "not_applicable" };
  }
  if (!isRecord(value)) return { state: "not_applicable" };
  if (value.schema === "receiz.asset_manifest.v1") return { state: "historical_missing" };
  if (value.schema !== "receiz.portable_asset.v1") return { state: "not_applicable" };
  try {
    const document = await parseReceizPortableAssetDocument(value);
    const continuity = await deriveReceizPortableOwnershipContinuity(document);
    const seal = nativeRecordSeal(bundle);
    const signedContinuity = seal && isRecord(seal.ownershipContinuity) ? seal.ownershipContinuity : null;
    if (seal && seal.ownerReceizId !== continuity.ownerReceizId) return { state: "invalid", error: "continuity_identity_mismatch" };
    if (continuity.appendCount > 0 && !signedContinuity) return { state: "invalid", error: "continuity_ownership_attestation_missing" };
    if (signedContinuity && (
      signedContinuity.artifactId !== continuity.artifactId
      || signedContinuity.namespace !== continuity.namespace
      || signedContinuity.genesisOwnerReceizId !== continuity.genesisOwnerReceizId
      || signedContinuity.ownerReceizId !== continuity.ownerReceizId
      || signedContinuity.headReference !== bundle.receizClaimId
      || signedContinuity.historyDigestSha256 !== continuity.historyDigestSha256
      || signedContinuity.appendCount !== continuity.appendCount
    )) return { state: "invalid", error: "continuity_ownership_attestation_mismatch" };
    const signature = isRecord(bundle.signatureV4) && isRecord(bundle.signatureV4.cert) ? bundle.signatureV4.cert : null;
    return {
      state: "verified",
      carrier: "portable_asset",
      issuerKid: signature && typeof signature.issuerKid === "string" ? signature.issuerKid : null,
      artifactId: document.payload.sha256,
      headReference: typeof bundle.receizClaimId === "string" ? bundle.receizClaimId : document.payload.sha256,
      ownerReceizId: continuity.ownerReceizId,
      namespace: continuity.namespace,
      priorHeadReference: document.ownership.proofRef,
      genesisOwnerReceizId: continuity.genesisOwnerReceizId,
      historyDigestSha256: continuity.historyDigestSha256,
      appendCount: continuity.appendCount,
    };
  } catch (error) {
    return { state: "invalid", error: error instanceof ReceizPortableAssetError ? error.code : "continuity_round_trip_failed" };
  }
}

function validateBundleShape(bundle: Record<string, unknown>, envelope: BundleEnvelope): string[] {
  const errors: string[] = [];
  if (bundle.kind !== "receiz.proof_bundle" || (bundle.payloadVersion !== "v1" && bundle.payloadVersion !== "v2")) errors.push("Proof bundle schema is invalid.");
  const code = nonempty(bundle.code) ?? "";
  const pulse = nonempty(bundle.kaiPulseEternal) ?? "";
  const slug = nonempty(bundle.slug) ?? "";
  const verifyPath = nonempty(bundle.verifyPath) ?? "";
  if (!/^[A-Z0-9]{8}$/.test(code)) errors.push("Bundle code must be 8 uppercase alphanumeric characters.");
  if (!/^\d+$/.test(pulse)) errors.push("Bundle pulse must contain only digits.");
  if (slug && code && pulse && verifyPath !== `/v/${slug}/${code}/${pulse}`) errors.push("verifyPath does not match the embedded proof identity.");
  const basis = nonempty(bundle.artifactSha256Basis)?.toLowerCase() ?? "";
  if (!HEX64_RE.test(basis) || basis !== envelope.manifest.basisSha256) errors.push("Artifact binding field does not match the bundle manifest.");
  if (Number(bundle.createdAtMs) !== envelope.manifest.createdAt) errors.push("Bundle creation time does not match the carrier manifest.");
  return errors;
}

function anchorProjection(bundle: Record<string, unknown>): Readonly<Record<string, unknown>> | null {
  const anchorId = nonempty(bundle.anchorId);
  const code = nonempty(bundle.code);
  const pulse = nonempty(bundle.kaiPulseEternal);
  const verifyPath = nonempty(bundle.verifyPath);
  if (!anchorId || !code || !pulse || !verifyPath) return null;
  return { anchorId, parent: { code, pulse, viewUrl: verifyPath } };
}

export async function verifyReceizDocumentBytesLocal(
  input: ReceizLocalArtifactInput & { signatureV4RootPublicKeys?: ReadonlyMap<string, ReceizSignatureV4RootPublicKey> },
): Promise<ReceizLocalArtifactVerificationResult> {
  if (!(input.fileBytes instanceof Uint8Array) || input.fileBytes.byteLength === 0) return invalid("unknown", ["No complete Receiz proof object was found in the supplied bytes."]);
  const envelope = parseBundleEnvelope(input.fileBytes);
  if (!envelope) return invalid("unknown", ["Unsupported artifact format. Supply a complete Receiz proof object."]);
  const errors = validateBundleShape(envelope.bundle, envelope);
  const basisSha256 = await sha256Hex(envelope.originalBytes);
  if (basisSha256 !== envelope.manifest.basisSha256 || basisSha256 !== nonempty(envelope.bundle.artifactSha256Basis)?.toLowerCase()) errors.push("Artifact binding mismatch.");
  const signatureError = await verifyReceizSignatureV4(envelope.bundle, input.signatureV4RootPublicKeys ?? receizV109PinnedSignatureV4Roots());
  if (signatureError) errors.push(signatureError);
  const groth16Error = await verifyReceizGroth16({ zkPoseidonHash: envelope.bundle.zkPoseidonHash, groth16Proof: envelope.bundle.groth16Proof, groth16ProofDigest: envelope.bundle.groth16ProofDigest });
  if (groth16Error) errors.push(groth16Error);
  const anchor = anchorProjection(envelope.bundle);
  if (!anchor) errors.push("Anchor data is required for trusted verification.");
  const assetContinuity = await classifyContinuity(envelope.originalBytes, envelope.bundle);
  if (assetContinuity.state === "invalid") errors.push(typeof assetContinuity.error === "string" ? assetContinuity.error : "asset_continuity_invalid");
  const ok = errors.length === 0;
  return {
    ok,
    integrity: { ok, errors },
    kind: "bundle",
    errors,
    warnings: [],
    bundle: envelope.bundle,
    anchor,
    package: null,
    assetContinuity,
  };
}

export async function verifyAndExtractReceizDocumentBytesLocal(
  input: ReceizLocalArtifactInput & { signatureV4RootPublicKeys?: ReadonlyMap<string, ReceizSignatureV4RootPublicKey> },
): Promise<ReceizLocalArtifactOpenResult> {
  const artifactBytes = new Uint8Array(input.fileBytes);
  const verification = await verifyReceizDocumentBytesLocal({ ...input, fileBytes: artifactBytes });
  if (!verification.ok || !verification.integrity.ok || !verification.bundle) return { ok: false, verification, error: verification.errors[0] ?? "artifact_verification_failed" };
  const envelope = parseBundleEnvelope(artifactBytes);
  if (!envelope) return { ok: false, verification, error: "verified_artifact_basis_extraction_failed" };
  const seal = nativeRecordSeal(envelope.bundle);
  let legacyCompatibility: "current-native" | "verified-legacy-read";
  let payloadFilename = envelope.manifest.filename;
  let payloadMimeType = envelope.manifest.mime;
  if (seal) {
    const payload = seal.payload as Record<string, unknown>;
    if (payload.sha256 !== envelope.manifest.basisSha256) return { ok: false, verification, error: "native_record_payload_hash_mismatch" };
    const canonical = new TextEncoder().encode(jcsCanonicalize({ kind: "receiz.bundle.v1", manifest: envelope.manifest, originalBase64: envelope.originalBase64, proofbundle: envelope.bundle }));
    if (!bytesEqual(canonical, artifactBytes)) return { ok: false, verification, error: "native_record_carrier_bytes_noncanonical" };
    payloadFilename = String(payload.filename);
    payloadMimeType = String(payload.mimeType).toLowerCase();
    legacyCompatibility = "current-native";
  } else {
    if (verification.assetContinuity?.state !== "verified") return { ok: false, verification, error: "native_record_seal_required" };
    legacyCompatibility = "verified-legacy-read";
  }
  return { ok: true, verification: verification as ReceizLocalArtifactVerificationResult & { ok: true }, artifactBytes, payloadBytes: envelope.originalBytes, payloadFilename, payloadMimeType, legacyCompatibility };
}
