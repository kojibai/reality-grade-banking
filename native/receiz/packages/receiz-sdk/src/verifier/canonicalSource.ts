import { decodeReceizBundleEnvelope, encodeReceizBundleEnvelope } from "@/app/lib/documentSeal/bundleContainer";
import { detectDocumentFormat } from "@/app/lib/documentSeal/fileFormat";
import {
  DOCUMENT_VERIFY_SERVER_ZIP_GUARD_LIMITS,
  type DocumentVerifyZipGuardLimits,
} from "@/app/lib/security/documentLimits";
import {
  verifyReceizBundleSignatureV4,
  type ReceizSignatureV4RootPublicKey,
} from "@/app/lib/security/receizSignatureV4";
import { applyCspNonce } from "@/app/lib/security/cspNonce";
import {
  coerceReceizFolderPackageManifest,
  normalizeReceizFolderPackagePath,
  type ReceizFolderPackageManifest,
} from "@/app/lib/documentSeal/folderPackageManifest";
import {
  coerceReceizPackageRootManifest,
  type ReceizPackageRootManifest,
} from "@/app/lib/documentSeal/packageRootManifest";
import {
  embedReceizProofBundleIntoPdf,
  extractReceizProofBundlesFromPdf,
  stripReceizSealUpdatesFromPdf,
} from "@/app/lib/documentSeal/pdfProof";
import { embedReceizProofBundleIntoSvg, parseReceizSvgProof } from "@/app/lib/documentSeal/svgProof";
import { embedReceizProofBundleIntoJson, parseReceizJsonProof } from "@/app/lib/documentSeal/jsonProof";
import { appendReceizTrailer, parseReceizTrailer } from "@/app/lib/documentSeal/trailerProof";
import {
  appendReceizHeicProof,
  parseReceizHeicProof,
  RECEIZ_HEIC_PROOF_UUID,
} from "@/app/lib/documentSeal/heicProof";
void RECEIZ_HEIC_PROOF_UUID;
import {
  JPEG_ADOBE_XMP_APP1_BASIS_NORMALIZATION,
  JPEG_IOS_PHOTOS_CARRIER_V2_BASIS_NORMALIZATION,
  JPEG_IOS_PHOTOS_CARRIER_V3_BASIS_NORMALIZATION,
  JPEG_IOS_PHOTOS_CARRIER_V4_BASIS_NORMALIZATION,
  JPEG_IOS_PHOTOS_CARRIER_V5_BASIS_NORMALIZATION,
  JPEG_IOS_PHOTOS_CARRIER_V6_BASIS_NORMALIZATION,
  normalizeJpegAdobeXmpApp1Basis,
  normalizeJpegIosPhotosCarrierV2Basis,
  normalizeJpegIosPhotosCarrierV3Basis,
  normalizeJpegIosPhotosCarrierV4Basis,
  normalizeJpegIosPhotosCarrierV5Basis,
  normalizeJpegIosPhotosCarrierV6Basis,
} from "@/app/lib/documentSeal/jpegArtifactBasis";
import { buildAnchoredReceizVerifyPath } from "@/app/lib/documentSeal/verifyLink";
import { buildProofBearingReceizVPathFromBundle } from "@/app/lib/documentSeal/proofBearingVLink";
import {
  ReceizProtocolLimitError,
  assertReceizRuntimeMaterializationAvailable,
  createReceizArchiveVerificationGuard,
  detectReceizRecursiveArchiveFormat,
  receizProtocolOperationalDenial,
  type ReceizProtocolOperationalDenial,
} from "../verificationLimits";

const RECEIZ_V113_CANONICAL_ARCHIVE_GUARD_REVISION = "receiz.canonical-archive-guard.v113.2";
void RECEIZ_V113_CANONICAL_ARCHIVE_GUARD_REVISION;
import {
  decodeReceizAnchorBundle,
  RECEIZ_ANCHOR_BUNDLE_CHUNK_KEY,
  type ReceizAnchorBundle,
} from "@/app/utils/receizAnchorBundle";
import { countPngTextChunksByKeyword, insertPngTextChunks, readPngTextChunk } from "@/app/utils/pngChunks";
import {
  coerceReceizProofBundle,
  decodeReceizProofBundle,
  encodeReceizProofBundle,
  RECEIZ_PROOF_BUNDLE_CHUNK_KEY,
  stripReceizProofAugmentationChunks,
  type ReceizNativeRecordSeal,
  type ReceizProofBundle,
  verifyReceizNativeOwnershipContinuity,
  type ReceizNativeOwnershipHistoryEntry,
  type ReceizNativeProofPredecessor,
  validateReceizBundleSignature,
} from "@/app/utils/receizProofBundle";
import { base64UrlDecode, sha256Hex } from "@/app/utils/sha256";
import {
  deriveReceizPortableOwnershipContinuity,
  parseReceizPortableAssetDocument,
  ReceizPortableAssetError,
  type ReceizPortableAssetDocument,
} from "../portableAsset";
import { recognizeReceizGroth16Structure } from "./groth16";
import documentSealVerificationKey from "@/zk/document_seal_verification_key.json";

type ArtifactKind = "png" | "pdf" | "heic-box" | "trailer" | "bundle" | "folder_package" | "unknown";

type ReceizSignatureV4RootPublicKeyMap = ReadonlyMap<string, ReceizSignatureV4RootPublicKey>;

export type ReceizFolderPackageItemVerification = Readonly<{
  sourcePath: string;
  sealedPath: string;
  ok: boolean;
  kind: string;
  errors: readonly string[];
  warnings: readonly string[];
  code: string;
  pulse: string;
  ts: string;
}>;

export type ReceizFolderPackageVerification = Readonly<{
  manifest: ReceizFolderPackageManifest;
  manifestArtifactPath: string;
  manifestArtifactVerified: boolean;
  itemCount: number;
  verifiedCount: number;
  failedCount: number;
  missingCount: number;
  itemResults: readonly ReceizFolderPackageItemVerification[];
}>;

export type ReceizArtifactVerificationResult = Readonly<{
  ok: boolean;
  integrity?: Readonly<{ ok: boolean; errors: readonly string[] }>;
  kind: ArtifactKind;
  errors: readonly string[];
  warnings: readonly string[];
  bundle: ReceizProofBundle | null;
  anchor: ReceizAnchorBundle | null;
  package: ReceizFolderPackageVerification | null;
  assetContinuity?: ReceizAssetContinuityVerification;
  denial?: ReceizProtocolOperationalDenial;
}>;

export type ReceizVerifiedArtifactOpenResult =
  | Readonly<{
      ok: true;
      verification: ReceizArtifactVerificationResult & { ok: true };
      artifactBytes: Uint8Array;
      payloadBytes: Uint8Array;
      payloadFilename: string;
      payloadMimeType: string;
      nativeRecordSeal: ReceizNativeRecordSeal | null;
      legacyCompatibility: "current-native" | "verified-legacy-read" | "verified-proof-predecessor";
    }>
  | Readonly<{
      ok: false;
      verification: ReceizArtifactVerificationResult;
      error: string;
    }>;

/** Verified payload inspection only. This result does not confer append custody. */
export type ReceizVerifiedDocumentReadResult =
  | Readonly<Omit<Extract<ReceizVerifiedArtifactOpenResult, { ok: true }>, "legacyCompatibility"> & { access: "read-only" }>
  | Extract<ReceizVerifiedArtifactOpenResult, { ok: false }>;

type VerifiedDocumentExtractionResult =
  | Omit<Extract<ReceizVerifiedArtifactOpenResult, { ok: true }>, "legacyCompatibility">
  | Extract<ReceizVerifiedArtifactOpenResult, { ok: false }>;

type ReceizPackageExecutionCapacity = Readonly<{
  maxExactArtifactBytes: number;
  maxDecompressedArchiveBytes: number;
}>;

/** Per-call host resource allowance; never read from proof or transport data. */
function packageMaterializationGuard(capacity?: ReceizPackageExecutionCapacity) {
  const exact = capacity?.maxExactArtifactBytes;
  const archive = capacity?.maxDecompressedArchiveBytes;
  const invalid = capacity && (!Number.isSafeInteger(exact) || exact! < 1 || !Number.isSafeInteger(archive) || archive! < 1);
  return (resource: "exactArtifactBytes" | "decompressedArchiveBytes", observed: number): void => {
    if (invalid) throw new ReceizProtocolLimitError("VERIFICATION_RESOURCE_UNAVAILABLE", "verification-runtime");
    if (!capacity) return assertReceizRuntimeMaterializationAvailable(resource, observed);
    const maximum = (resource === "exactArtifactBytes" ? exact : archive)!;
    if (!Number.isSafeInteger(observed) || observed < 0 || observed > maximum) {
      throw new ReceizProtocolLimitError("VERIFICATION_RESOURCE_UNAVAILABLE", resource, observed, maximum);
    }
  };
}

type DocumentReadInput = Readonly<{
  fileBytes: Uint8Array;
  filename?: string;
  mime?: string;
  optionalLink?: string;
  signingKey?: string;
  signatureV4RootPublicKeys?: ReceizSignatureV4RootPublicKeyMap | null;
  zipGuardLimits?: DocumentVerifyZipGuardLimits | null;
  packageExecutionCapacity?: ReceizPackageExecutionCapacity;
}>;

export type ReceizAssetContinuityVerification =
  | Readonly<{
      state: "verified";
      carrier: "portable_asset";
      issuerKid: string | null;
      artifactId: string;
      headReference: string;
      ownerReceizId: string;
      namespace: string;
      priorHeadReference: string;
      genesisOwnerReceizId: string;
      historyDigestSha256: string;
      appendCount: number;
      history: readonly ReceizNativeOwnershipHistoryEntry[];
      historyComplete: boolean;
      proofPredecessor?: ReceizNativeProofPredecessor;
      document: ReceizPortableAssetDocument;
    }>
  | Readonly<{
      state: "verified";
      carrier: "native_record_seal";
      issuerKid: string | null;
      artifactId: string;
      headReference: string;
      ownerReceizId: string;
      namespace: string;
      priorHeadReference: string;
      genesisOwnerReceizId: string;
      historyDigestSha256: string;
      appendCount: number;
      history: readonly ReceizNativeOwnershipHistoryEntry[];
      historyComplete: boolean;
    }>
  | Readonly<{ state: "historical_missing" }>
  | Readonly<{ state: "invalid"; error: string }>
  | Readonly<{ state: "not_applicable" }>;

export async function classifyReceizAssetContinuity(
  originalBytes: Uint8Array,
  bundle?: ReceizProofBundle | null,
): Promise<ReceizAssetContinuityVerification> {
  const nativeRecordSeal = bundle?.nativeRecordSeal ?? null;
  const nativeContinuity = nativeRecordSeal?.ownershipContinuity ?? null;
  if (
    nativeRecordSeal
    && nativeContinuity
    && nativeContinuity.namespace.startsWith("receiz.native-proof:")
  ) {
    const currentBasis = bundle?.artifactSha256Basis ?? "";
    if (nativeRecordSeal.payload.sha256 !== currentBasis) {
      return { state: "invalid", error: "continuity_ownership_attestation_mismatch" };
    }
    const verified = await verifyReceizNativeOwnershipContinuity({
      continuity: nativeContinuity,
      ownerReceizId: nativeRecordSeal.ownerReceizId,
      headReference: bundle?.receizClaimId ?? "",
      payloadSha256: currentBasis,
    });
    if (!verified) {
      return { state: "invalid", error: "continuity_ownership_attestation_mismatch" };
    }
    return {
      state: "verified",
      carrier: "native_record_seal",
      issuerKid: bundle?.signatureV4?.cert.issuerKid ?? null,
      artifactId: nativeContinuity.artifactId,
      headReference: nativeContinuity.headReference,
      ownerReceizId: nativeContinuity.ownerReceizId,
      namespace: nativeContinuity.namespace,
      priorHeadReference: nativeContinuity.predecessor?.headReference ?? "genesis",
      genesisOwnerReceizId: nativeContinuity.genesisOwnerReceizId,
      historyDigestSha256: nativeContinuity.historyDigestSha256,
      appendCount: nativeContinuity.appendCount,
      history: nativeContinuity.history ?? [],
      historyComplete: Boolean(nativeContinuity.history),
      ...(nativeRecordSeal.proofPredecessor
        ? { proofPredecessor: nativeRecordSeal.proofPredecessor }
        : {}),
    };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder().decode(originalBytes)) as unknown;
  } catch {
    return { state: "not_applicable" };
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return { state: "not_applicable" };
  const schema = (parsed as Record<string, unknown>).schema;
  if (schema === "receiz.asset_manifest.v1") return { state: "historical_missing" };
  if (schema !== "receiz.portable_asset.v1") return { state: "not_applicable" };
  try {
    const document = await parseReceizPortableAssetDocument(parsed);
    const continuity = await deriveReceizPortableOwnershipContinuity(document);
    const signedContinuity = nativeRecordSeal?.ownershipContinuity ?? null;
    if (nativeRecordSeal && nativeRecordSeal.ownerReceizId !== continuity.ownerReceizId) {
      return { state: "invalid", error: "continuity_identity_mismatch" };
    }
    if (continuity.appendCount > 0 && !signedContinuity) {
      return { state: "invalid", error: "continuity_ownership_attestation_missing" };
    }
    if (signedContinuity && (
      signedContinuity.artifactId !== continuity.artifactId
      || signedContinuity.namespace !== continuity.namespace
      || signedContinuity.genesisOwnerReceizId !== continuity.genesisOwnerReceizId
      || signedContinuity.ownerReceizId !== continuity.ownerReceizId
      || signedContinuity.headReference !== bundle?.receizClaimId
      || signedContinuity.historyDigestSha256 !== continuity.historyDigestSha256
      || signedContinuity.appendCount !== continuity.appendCount
    )) {
      return { state: "invalid", error: "continuity_ownership_attestation_mismatch" };
    }
    return {
      state: "verified",
      carrier: "portable_asset",
      issuerKid: bundle?.signatureV4?.cert.issuerKid ?? null,
      artifactId: document.payload.sha256,
      headReference: bundle?.receizClaimId ?? document.payload.sha256,
      ownerReceizId: continuity.ownerReceizId,
      namespace: document.provenance.root,
      priorHeadReference: document.ownership.proofRef,
      genesisOwnerReceizId: continuity.genesisOwnerReceizId,
      historyDigestSha256: continuity.historyDigestSha256,
      appendCount: continuity.appendCount,
      history: projectPortableOwnershipHistory(
        document,
        bundle?.receizClaimId ?? document.payload.sha256,
        continuity.genesisOwnerReceizId,
        continuity.historyDigestSha256,
      ),
      historyComplete: true,
      document,
    };
  } catch (error) {
    return {
      state: "invalid",
      error: error instanceof ReceizPortableAssetError ? error.code : "continuity_round_trip_failed",
    };
  }
}

function projectPortableOwnershipHistory(
  document: ReceizPortableAssetDocument,
  currentHeadReference: string,
  genesisOwnerReceizId: string,
  currentHistoryDigestSha256: string,
): readonly ReceizNativeOwnershipHistoryEntry[] {
  const ownershipAppends = document.provenance.appends.filter(
    (append) => append.type === "receiz.ownership.bearer-claim.v108",
  );
  const first = ownershipAppends[0];
  const genesisHead = typeof first?.priorHeadReference === "string"
    ? first.priorHeadReference
    : "genesis";
  const genesisDigest = typeof first?.priorHistoryDigestSha256 === "string"
    ? first.priorHistoryDigestSha256
    : currentHistoryDigestSha256;
  const history: ReceizNativeOwnershipHistoryEntry[] = [{
    schema: "receiz.native_ownership_genesis.v1",
    index: 0,
    ownerReceizId: genesisOwnerReceizId,
    headReference: genesisHead,
    historyDigestSha256: genesisDigest,
  }];
  ownershipAppends.forEach((append, index) => {
    const next = ownershipAppends[index + 1];
    history.push({
      schema: "receiz.native_ownership_transfer.v1",
      index: index + 1,
      fromOwnerReceizId: String(append.fromOwnerReceizId),
      toOwnerReceizId: String(append.toOwnerReceizId),
      priorHeadReference: String(append.priorHeadReference),
      sourceArtifactSha256: String(append.sourceArtifactSha256),
      headReference: typeof next?.priorHeadReference === "string"
        ? next.priorHeadReference
        : currentHeadReference,
      historyDigestSha256: index === ownershipAppends.length - 1
        ? currentHistoryDigestSha256
        : String(next?.priorHistoryDigestSha256),
    });
  });
  return history;
}

const REAL_G16_CODEC = "g16";
const TRUSTED_SIGNATURE_MISSING_ERROR =
  "Trusted signature is required for trusted verification (signatureV4).";
const SIGNATURE_V4_UNAVAILABLE_ERROR =
  "signatureV4 root keys are unavailable in this verifier; trusted verification cannot continue.";
const SNARKJS_PUBLIC_SCRIPT_URL = "/snarkjs.min.js";

type Groth16VerifyFn = (
  verificationKey: unknown,
  publicSignals: readonly string[],
  proof: unknown
) => Promise<boolean>;

let groth16VerifyFnPromise: Promise<Groth16VerifyFn | null> | null = null;
let snarkjsScriptLoadPromise: Promise<void> | null = null;
let groth16VerificationTail: Promise<void> = Promise.resolve();
const verifiedDeterministicGroth16Closures =
  new Map<string, Promise<boolean>>();

type ReceizGroth16CurveRuntime = Readonly<{
  terminate?: () => Promise<void>;
  tm?: Readonly<{
    singleThread?: boolean;
  }>;
}>;

async function verifyGroth16WithExactWorkerCustody(
  verifyFn: Groth16VerifyFn,
  verificationKey: unknown,
  publicSignals: readonly string[],
  proof: unknown,
): Promise<boolean> {
  const predecessor = groth16VerificationTail;
  let release!: () => void;
  groth16VerificationTail = new Promise<void>((resolve) => {
    release = resolve;
  });
  await predecessor;
  const runtime = globalThis as typeof globalThis & {
    curve_bn128?: ReceizGroth16CurveRuntime | null;
    curve_bls12381?: ReceizGroth16CurveRuntime | null;
  };
  const priorBn128 = runtime.curve_bn128;
  const priorBls12381 = runtime.curve_bls12381;
  try {
    return await verifyFn(verificationKey, publicSignals, proof);
  } finally {
    try {
      const createdCurves = [
        runtime.curve_bn128 !== priorBn128 ? runtime.curve_bn128 : null,
        runtime.curve_bls12381 !== priorBls12381
          ? runtime.curve_bls12381
          : null,
      ];
      for (const curve of createdCurves) {
        // ffjavascript may switch to its in-process task manager after curve
        // construction. That runtime has no worker array to terminate.
        if (curve?.tm?.singleThread !== true) {
          await curve?.terminate?.();
        }
      }
    } finally {
      runtime.curve_bn128 = priorBn128;
      runtime.curve_bls12381 = priorBls12381;
      release();
    }
  }
}

type WindowWithSnarkjs = Window &
  typeof globalThis & {
    snarkjs?: { groth16?: { verify?: Groth16VerifyFn } };
  };

function slugFromTs(ts: string): string {
  return ts.replace(/-/g, "").replace(/:/g, "").replace(/ /g, "_");
}

function isHex(input: string, length: number): boolean {
  return new RegExp(`^[0-9a-fA-F]{${length}}$`).test(input);
}

function asNonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function deriveAnchorBundleFromProofBundle(bundle: ReceizProofBundle): ReceizAnchorBundle | null {
  const anchorIdRaw = typeof bundle.anchorId === "string" ? bundle.anchorId.trim().toLowerCase() : "";
  if (!isHex(anchorIdRaw, 8)) return null;

  const code = asNonEmptyString(bundle.code);
  const pulse = asNonEmptyString(bundle.kaiPulseEternal);
  const verifyPath = asNonEmptyString(bundle.verifyPath);
  if (!code || !pulse || !verifyPath) return null;

  const viewUrl = buildProofBearingReceizVPathFromBundle(bundle);

  return {
    version: 1,
    parent: {
      code,
      pulse,
      viewUrl,
    },
    anchorId: anchorIdRaw,
    anchoredAt: new Date(bundle.createdAtMs).toISOString(),
  };
}

function proofBearingAnchorProjection(
  anchor: ReceizAnchorBundle | null,
  derivedAnchor: ReceizAnchorBundle | null
): ReceizAnchorBundle | null {
  if (!anchor) return derivedAnchor;
  const proofBearingViewUrl = derivedAnchor?.parent.viewUrl;
  if (!proofBearingViewUrl) return anchor;
  return {
    ...anchor,
    parent: {
      ...anchor.parent,
      viewUrl: proofBearingViewUrl,
    },
  };
}

function parseVerifyInputToPath(raw: string): string | null {
  const text = raw.trim();
  if (!text) return null;

  try {
    const url = text.startsWith("/")
      ? new URL(text, "https://receiz.com")
      : new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`);
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

async function verifyDeterministicGroth16(bundle: ReceizProofBundle): Promise<string | null> {
  const zkPoseidonHash = typeof bundle.zkPoseidonHash === "string" ? bundle.zkPoseidonHash.trim() : "";
  const groth16Proof = bundle.groth16Proof;
  const groth16ProofDigestRaw = typeof bundle.groth16ProofDigest === "string" ? bundle.groth16ProofDigest.trim() : "";
  const groth16ProofDigest = groth16ProofDigestRaw.toLowerCase();

  if (!zkPoseidonHash || !groth16Proof || !groth16ProofDigestRaw) {
    return "Groth16 proof metadata is missing.";
  }

  if (!isHex(zkPoseidonHash, 64)) {
    return "zkPoseidonHash is not a 64-hex string.";
  }

  if (!isHex(groth16ProofDigestRaw, 64)) {
    return "groth16ProofDigest is not a 64-hex string.";
  }

  if (typeof groth16Proof !== "string" || groth16Proof.length === 0) {
    return "groth16Proof has invalid format.";
  }

  const [codec, payload] = groth16Proof.split(":", 2);
  if (codec !== REAL_G16_CODEC || !payload) {
    return "Only real g16: Groth16 proofs are accepted.";
  }

  let decoded: unknown;
  try {
    const raw = new TextDecoder().decode(base64UrlDecode(payload));
    decoded = JSON.parse(raw);
  } catch {
    return "Real Groth16 bundle could not be decoded.";
  }

  if (!decoded || typeof decoded !== "object") {
    return "Real Groth16 bundle payload is invalid.";
  }

  const row = decoded as Record<string, unknown>;
  if (row.v !== "receiz.g16.real.v1") {
    return "Unsupported real Groth16 bundle version.";
  }
  if (!Array.isArray(row.publicSignals) || row.publicSignals.length < 2) {
    return "Real Groth16 public signals are missing.";
  }
  const publicSignals = row.publicSignals.map((entry) => String(entry));

  const expectedDec = BigInt(`0x${zkPoseidonHash}`).toString();
  if (publicSignals[0] !== expectedDec || publicSignals[1] !== expectedDec) {
    return "Real Groth16 public signal mismatch for zkPoseidonHash.";
  }

  const digest = (await sha256Hex(groth16Proof)).toLowerCase();
  if (digest !== groth16ProofDigest) {
    return "Real Groth16 proof digest mismatch.";
  }

  const closureKey = [
    "receiz.document-seal.groth16-verifier.v1",
    groth16ProofDigest,
    zkPoseidonHash.toLowerCase(),
  ].join(":");
  let verification = verifiedDeterministicGroth16Closures.get(closureKey);
  if (!verification) {
    verification = (async () => {
      const verifyFn = await loadGroth16VerifyFn();
      return Boolean(verifyFn)
        && verifyGroth16WithExactWorkerCustody(
          verifyFn!,
          documentSealVerificationKey,
          publicSignals,
          row.proof,
        );
    })();
    verifiedDeterministicGroth16Closures.set(closureKey, verification);
  }
  try {
    const ok = await verification;
    if (!ok) {
      if (verifiedDeterministicGroth16Closures.get(closureKey) === verification) verifiedDeterministicGroth16Closures.delete(closureKey);
      return "Groth16 proof verification failed.";
    }
    return null;
  } catch (error) {
    if (verifiedDeterministicGroth16Closures.get(closureKey) === verification) verifiedDeterministicGroth16Closures.delete(closureKey);
    throw error;
  }
}

async function loadGroth16VerifyFn(): Promise<Groth16VerifyFn | null> {
  const browserFn = await browserGroth16VerifyFn();
  if (browserFn) return browserFn;

  if (!groth16VerifyFnPromise) {
    groth16VerifyFnPromise = import("snarkjs")
      .then((mod) => {
        const row = mod as unknown as Record<string, unknown>;
        const maybe = (row.groth16 ?? (row.default as Record<string, unknown> | undefined)?.groth16) as
          | { verify?: unknown }
          | undefined;
        if (!maybe || typeof maybe.verify !== "function") return null;
        return maybe.verify as Groth16VerifyFn;
      })
      .catch(() => null);
  }
  const loaded = await groth16VerifyFnPromise;
  if (!loaded) {
    groth16VerifyFnPromise = null;
  }
  return loaded;
}

function browserGroth16VerifyFromWindow(): Groth16VerifyFn | null {
  if (typeof window === "undefined") return null;
  const runtime = (window as WindowWithSnarkjs).snarkjs?.groth16;
  if (!runtime || typeof runtime.verify !== "function") return null;
  return runtime.verify.bind(runtime);
}

async function browserGroth16VerifyFn(): Promise<Groth16VerifyFn | null> {
  const fromWindow = browserGroth16VerifyFromWindow();
  if (fromWindow) return fromWindow;

  if (typeof window === "undefined" || typeof document === "undefined") return null;

  if (!snarkjsScriptLoadPromise) {
    snarkjsScriptLoadPromise = new Promise<void>((resolve, reject) => {
      const script = applyCspNonce(document.createElement("script"));
      script.src = SNARKJS_PUBLIC_SCRIPT_URL;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("snarkjs_script_load_failed"));
      document.head.appendChild(script);
    }).catch(() => undefined);
  }

  await snarkjsScriptLoadPromise;
  return browserGroth16VerifyFromWindow();
}

function buildInvalidResult(kind: ArtifactKind, errors: string[], warnings: string[]): ReceizArtifactVerificationResult {
  return {
    ok: false,
    kind,
    errors,
    warnings,
    bundle: null,
    anchor: null,
    package: null,
  };
}

function buildOperationalDenialResult(
  kind: ArtifactKind,
  code: ReceizProtocolLimitError["code"],
): ReceizArtifactVerificationResult {
  return {
    ok: false,
    kind,
    errors: [],
    warnings: [],
    bundle: null,
    anchor: null,
    package: null,
    denial: receizProtocolOperationalDenial(code),
  };
}

function zipEntryUncompressedSize(entry: unknown): number | null {
  if (!entry || typeof entry !== "object") return null;
  const data = (entry as { _data?: { uncompressedSize?: unknown } })._data;
  if (!data) return null;
  const raw = data.uncompressedSize;
  if (typeof raw === "number" && Number.isFinite(raw) && raw >= 0) return raw;
  if (typeof raw === "string") {
    const parsed = Number.parseInt(raw, 10);
    if (Number.isFinite(parsed) && parsed >= 0) return parsed;
  }
  return null;
}

async function artifactIdentityBasisBytes(
  bundle: ReceizProofBundle,
  basisBytes: Uint8Array,
): Promise<Uint8Array> {
  const declaration = bundle.artifactBasis;
  if (typeof declaration === "undefined") return basisBytes;
  if (declaration.algorithm !== "sha256") {
    throw new Error("Artifact basis normalization is unsupported.");
  }
  if (detectDocumentFormat(basisBytes, {}) !== "jpeg") {
    throw new Error("JPEG artifact basis normalization requires a JPEG proof object.");
  }
  if (declaration.normalization === JPEG_ADOBE_XMP_APP1_BASIS_NORMALIZATION) {
    return (await normalizeJpegAdobeXmpApp1Basis(basisBytes)).basisBytes;
  }
  if (declaration.normalization === JPEG_IOS_PHOTOS_CARRIER_V2_BASIS_NORMALIZATION) {
    return (await normalizeJpegIosPhotosCarrierV2Basis(basisBytes)).basisBytes;
  }
  if (declaration.normalization === JPEG_IOS_PHOTOS_CARRIER_V3_BASIS_NORMALIZATION) {
    return (await normalizeJpegIosPhotosCarrierV3Basis(basisBytes)).basisBytes;
  }
  if (declaration.normalization === JPEG_IOS_PHOTOS_CARRIER_V4_BASIS_NORMALIZATION) {
    return (await normalizeJpegIosPhotosCarrierV4Basis(basisBytes)).basisBytes;
  }
  if (declaration.normalization === JPEG_IOS_PHOTOS_CARRIER_V5_BASIS_NORMALIZATION) {
    return (await normalizeJpegIosPhotosCarrierV5Basis(basisBytes)).basisBytes;
  }
  if (declaration.normalization === JPEG_IOS_PHOTOS_CARRIER_V6_BASIS_NORMALIZATION) {
    return (await normalizeJpegIosPhotosCarrierV6Basis(basisBytes)).basisBytes;
  }
  throw new Error("Artifact basis normalization is unsupported.");
}

async function validateBundleAgainstBasis(args: {
  bundle: ReceizProofBundle;
  basisBytes?: Uint8Array;
  basisSha256?: string;
  anchor: ReceizAnchorBundle | null;
  optionalLink?: string;
  signingKey?: string;
  signatureV4RootPublicKeys?: ReceizSignatureV4RootPublicKeyMap | null;
}): Promise<{ errors: string[]; warnings: string[] }> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const bundle = args.bundle;
  const derivedAnchor = deriveAnchorBundleFromProofBundle(bundle);
  const anchor = args.anchor ?? derivedAnchor;

  const code = asNonEmptyString(bundle.code) ?? "";
  const pulse = asNonEmptyString(bundle.kaiPulseEternal) ?? "";
  const slug = asNonEmptyString(bundle.slug) ?? "";
  const ts = asNonEmptyString(bundle.ts) ?? "";
  const verifyPath = asNonEmptyString(bundle.verifyPath) ?? "";

  if (!/^[A-Z0-9]{8}$/.test(code)) {
    errors.push("Bundle code must be 8 uppercase alphanumeric characters.");
  }

  if (!/^\d+$/.test(pulse)) {
    errors.push("Bundle pulse must contain only digits.");
  }

  if (ts && slug) {
    const expectedSlug = slugFromTs(ts);
    if (slug !== expectedSlug) {
      errors.push(`Slug mismatch. expected ${expectedSlug}, got ${slug}.`);
    }
  }

  if (slug && code && pulse) {
    const expectedPath = `/v/${slug}/${code}/${pulse}`;
    if (verifyPath !== expectedPath) {
      errors.push(`verifyPath mismatch. expected ${expectedPath}, got ${verifyPath}.`);
    }
  }

  if (bundle.verifyUrl) {
    try {
      const parsed = new URL(bundle.verifyUrl);
      const fromUrl = `${parsed.pathname}${parsed.search}`;
      const acceptedVerifyUrlPaths = new Set<string>();
      if (verifyPath) acceptedVerifyUrlPaths.add(verifyPath);
      const anchoredVerifyPath = buildAnchoredReceizVerifyPath({
        verifyPath,
        anchorId: bundle.anchorId,
        createdAtMs: bundle.createdAtMs,
      });
      if (anchoredVerifyPath) acceptedVerifyUrlPaths.add(anchoredVerifyPath);
      try {
        const proofBearingVerifyPath = buildProofBearingReceizVPathFromBundle(bundle);
        if (proofBearingVerifyPath) acceptedVerifyUrlPaths.add(proofBearingVerifyPath);
      } catch {
        // Canonical verifyPath validation below remains authoritative.
      }
      if (anchor?.parent.viewUrl) acceptedVerifyUrlPaths.add(anchor.parent.viewUrl);
      if (bundle.wireproof?.verifierPath) acceptedVerifyUrlPaths.add(bundle.wireproof.verifierPath);
      if (verifyPath && !acceptedVerifyUrlPaths.has(fromUrl)) {
        warnings.push("verifyUrl path does not exactly match verifyPath.");
      }
    } catch {
      warnings.push("verifyUrl is not a valid URL.");
    }
  } else {
    warnings.push("verifyUrl is empty (path-only bundles are still valid offline).");
  }

  const artifactSha256Basis = typeof bundle.artifactSha256Basis === "string" ? bundle.artifactSha256Basis.trim().toLowerCase() : "";
  if (!artifactSha256Basis) {
    errors.push("Not an original sealed artifact (missing artifact binding). Ask for the original sealed artifact.");
  } else if (!isHex(artifactSha256Basis, 64)) {
    errors.push("Artifact binding field has invalid format.");
  } else {
    try {
      let computedBasis: string;
      if (args.basisSha256) {
        if (bundle.artifactBasis) {
          throw new Error("Precomputed artifact basis cannot bypass declared normalization.");
        }
        computedBasis = args.basisSha256.trim().toLowerCase();
        if (!isHex(computedBasis, 64)) {
          throw new Error("Precomputed artifact basis hash has invalid format.");
        }
      } else if (args.basisBytes) {
        const identityBasis = await artifactIdentityBasisBytes(bundle, args.basisBytes);
        computedBasis = (await sha256Hex(identityBasis)).toLowerCase();
      } else {
        throw new Error("Artifact basis bytes or hash are required.");
      }
      if (computedBasis !== artifactSha256Basis) {
        errors.push("Artifact binding mismatch");
      }
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "Artifact basis normalization failed.");
    }
  }

  if (args.signingKey) {
    const signatureValid = await validateReceizBundleSignature({ bundle, signingKey: args.signingKey });
    if (!signatureValid) {
      errors.push("Bundle signature mismatch.");
    }
  }

  const rawSignatureV4 = (bundle as Record<string, unknown>).signatureV4;
  const hasSignatureV4 = typeof rawSignatureV4 !== "undefined";
  const signatureV4 = await verifyReceizBundleSignatureV4({
    bundle,
    rootPublicKeys: args.signatureV4RootPublicKeys ?? null,
  });

  const invalidSignatureErrors: string[] = [];
  if (hasSignatureV4 && signatureV4.state === "invalid") {
    invalidSignatureErrors.push(signatureV4.error ?? "signatureV4 verification failed.");
  }
  if (invalidSignatureErrors.length > 0) {
    for (const message of invalidSignatureErrors) {
      errors.push(message);
    }
  } else {
    if (signatureV4.state !== "verified") {
      if (hasSignatureV4 && signatureV4.state === "unavailable") {
        errors.push(signatureV4.error ?? SIGNATURE_V4_UNAVAILABLE_ERROR);
      } else {
        errors.push(TRUSTED_SIGNATURE_MISSING_ERROR);
      }
    }
  }

  if (anchor) {
    if (derivedAnchor && anchor.anchorId !== derivedAnchor.anchorId) {
      errors.push("Anchor ID mismatch between anchor bundle and proof bundle.");
    }
    if (anchor.parent.code !== code) {
      errors.push("Anchor parent.code does not match proof bundle code.");
    }
    if (anchor.parent.pulse !== pulse) {
      errors.push("Anchor parent.pulse does not match proof bundle pulse.");
    }
  } else {
    errors.push("Anchor data is required for trusted verification.");
  }

  const groth16Error = await verifyDeterministicGroth16(bundle);
  if (groth16Error) {
    errors.push(groth16Error);
  }

  const optionalLink = args.optionalLink?.trim() ?? "";
  if (optionalLink.length > 0) {
    const linkPath = parseVerifyInputToPath(optionalLink);
    if (!linkPath) {
      errors.push("Optional link could not be parsed.");
    } else {
      const acceptedPaths = new Set<string>();
      if (verifyPath) acceptedPaths.add(verifyPath);
      const optionalAnchoredVerifyPath = buildAnchoredReceizVerifyPath({
        verifyPath,
        anchorId: bundle.anchorId,
        createdAtMs: bundle.createdAtMs,
      });
      if (optionalAnchoredVerifyPath) acceptedPaths.add(optionalAnchoredVerifyPath);
      try {
        const optionalProofBearingVerifyPath = buildProofBearingReceizVPathFromBundle(bundle);
        if (optionalProofBearingVerifyPath) acceptedPaths.add(optionalProofBearingVerifyPath);
      } catch {
        // Canonical and anchored path checks remain authoritative for malformed proof-bearing projections.
      }
      if (derivedAnchor?.parent.viewUrl) acceptedPaths.add(derivedAnchor.parent.viewUrl);
      if (anchor?.parent.viewUrl) acceptedPaths.add(anchor.parent.viewUrl);
      if (bundle.wireproof?.verifierPath) acceptedPaths.add(bundle.wireproof.verifierPath);
      if (!acceptedPaths.has(linkPath)) {
        errors.push("Optional link does not match embedded canonical path.");
      }
    }
  }

  return { errors, warnings };
}

export async function verifyReceizTrailerBundleDigest(args: {
  bundle: unknown;
  basisSha256: string;
  optionalLink?: string;
  signingKey?: string;
  signatureV4RootPublicKeys?: ReceizSignatureV4RootPublicKeyMap | null;
}): Promise<ReceizArtifactVerificationResult> {
  const bundle = coerceReceizProofBundle(args.bundle);
  if (!bundle) {
    return buildInvalidResult("trailer", ["Trailer proof bundle schema is invalid."], []);
  }
  const anchor = deriveAnchorBundleFromProofBundle(bundle);
  const checked = await validateBundleAgainstBasis({
    bundle,
    basisSha256: args.basisSha256,
    anchor,
    optionalLink: args.optionalLink,
    signingKey: args.signingKey,
    signatureV4RootPublicKeys: args.signatureV4RootPublicKeys,
  });
  const result: ReceizArtifactVerificationResult = {
    ok: checked.errors.length === 0,
    kind: "trailer",
    errors: checked.errors,
    warnings: checked.warnings,
    bundle,
    anchor,
    package: null,
    assetContinuity: await classifyReceizAssetContinuity(new Uint8Array(), bundle),
  };
  return {
    ...result,
    integrity: { ok: result.ok, errors: result.errors },
  };
}

/** Current execution readiness only, using the canonical hash and Groth16
 * loader required by every trusted complete proof. No proof verdict or roots. */
export async function currentReceizVerificationRuntimeAvailable(): Promise<boolean> {
  try {
    await sha256Hex(new Uint8Array());
    return Boolean(await loadGroth16VerifyFn());
  } catch {
    return false;
  }
}

/** Mechanics only: this cannot admit or invalidate a proof. */
export function currentReceizTrailerCompleteExecutionReason(args: {
  bundle: unknown; payloadPrefix: Uint8Array;
}): "declared-normalization" | "structured-reconstruction" | "legacy-interpretation" | null {
  if (args.bundle && typeof args.bundle === "object") {
    const raw = args.bundle as Record<string, unknown>;
    if (typeof raw.kaiLine === "string" && raw.kaiLine && !(typeof raw.kaiKlok === "string" && raw.kaiKlok.trim())) return "legacy-interpretation";
  }
  const bundle = coerceReceizProofBundle(args.bundle);
  if (!bundle) return null;
  if (bundle.artifactBasis) return "declared-normalization";
  if (bundle.nativeRecordSeal) {
    const format = detectDocumentFormat(args.payloadPrefix, {
      filename: bundle.nativeRecordSeal.payload.filename, mime: bundle.nativeRecordSeal.payload.mimeType,
    });
    if (format === "svg" || format === "json") return "structured-reconstruction";
  }
  return null;
}

/** Current stream execution composes the canonical digest verifier and native
 * trailer serialization. It grants no native/predecessor append custody. */
export async function readReceizCurrentTrailerBundleDigest(args: {
  bundle: unknown;
  basisSha256: string;
  payloadPrefix: Uint8Array;
  trailerBytes: Uint8Array;
  optionalLink?: string;
  signatureV4RootPublicKeys?: ReceizSignatureV4RootPublicKeyMap | null;
}): Promise<ReceizArtifactVerificationResult> {
  const invalid = (errors: string[]): ReceizArtifactVerificationResult => ({
    ...buildInvalidResult("trailer", errors, []), integrity: { ok: false, errors },
  });
  const bundle = coerceReceizProofBundle(args.bundle);
  if (!bundle) return invalid(["Trailer proof bundle schema is invalid."]);
  // Recognize malformed proof material before execution. Missing runtime and
  // thrown execution are not false cryptographic results.
  if (!recognizeReceizGroth16Structure(bundle.groth16Proof)) {
    return invalid(["Real Groth16 bundle payload is invalid."]);
  }
  const unavailable = (warning = "Current trailer verifier runtime is unavailable."): ReceizArtifactVerificationResult => ({
    ...invalid([]),
    warnings: [warning],
    denial: receizProtocolOperationalDenial("VERIFICATION_RESOURCE_UNAVAILABLE"),
  });
  // A raw streamed digest cannot perform the declared identity-basis
  // normalization. This execution boundary says nothing about source validity.
  if (bundle.artifactBasis) return unavailable("Current trailer read cannot compute declared artifact-basis normalization from a streamed raw digest.");
  if (!(await loadGroth16VerifyFn())) return unavailable();
  const verification = await verifyReceizTrailerBundleDigest(args);
  if (verification.errors.includes(SIGNATURE_V4_UNAVAILABLE_ERROR)) return unavailable();
  if (!verification.ok || !verification.bundle) return verification;
  const native = verification.bundle.nativeRecordSeal;
  if (!native) return verification;
  const format = detectDocumentFormat(args.payloadPrefix, {
    filename: native.payload.filename,
    mime: native.payload.mimeType,
  });
  // These native carriers require complete structured reserialization. A
  // bounded prefix must not pretend it performed that canonical operation.
  if (format === "svg" || format === "json") return unavailable("Current native trailer read cannot reconstruct structured payload serialization from a bounded prefix.");
  const canonicalTrailer = appendReceizTrailer({ basisBytes: new Uint8Array(), bundle: verification.bundle });
  if (!bytesEqual(canonicalTrailer, args.trailerBytes)) {
    return invalid(["native_record_carrier_bytes_noncanonical"]);
  }
  return verification;
}

type FolderPackageFile = Readonly<{
  path: string;
  bytes: Uint8Array;
  mime?: string;
}>;

type FolderPackageManifestCandidate = Readonly<{
  artifactPath: string;
  artifactBytes: Uint8Array;
  manifest: ReceizFolderPackageManifest;
}>;

type PackageRootManifestCandidate = Readonly<{
  artifactPath: string;
  artifactBytes: Uint8Array;
  manifest: ReceizPackageRootManifest;
}>;

function parseFolderManifestBytes(bytes: Uint8Array): ReceizFolderPackageManifest | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
  return coerceReceizFolderPackageManifest(parsed);
}

function parsePackageRootManifestBytes(bytes: Uint8Array): ReceizPackageRootManifest | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
  return coerceReceizPackageRootManifest(parsed);
}

async function portableContinuityPayloadBytes(bytes: Uint8Array): Promise<Uint8Array | null> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder().decode(bytes)) as unknown;
  } catch {
    return null;
  }
  try {
    const document = await parseReceizPortableAssetDocument(parsed);
    return base64UrlDecode(document.payload.bytesBase64Url);
  } catch {
    return null;
  }
}

function normalizePackagePath(path: string): string {
  return normalizeReceizFolderPackagePath(path || "");
}

function findPackageFileByPath(fileMap: Map<string, FolderPackageFile>, sealedPath: string): FolderPackageFile | null {
  const direct = fileMap.get(sealedPath);
  if (direct) return direct;

  let match: FolderPackageFile | null = null;
  const suffix = `/${sealedPath}`;
  for (const file of fileMap.values()) {
    if (file.path.endsWith(suffix)) {
      if (match) return null;
      match = file;
    }
  }
  return match;
}

function pickFolderManifestCandidate(
  candidates: readonly FolderPackageManifestCandidate[],
): FolderPackageManifestCandidate {
  const withScore = candidates.map((candidate) => {
    let score = 0;
    if (candidate.artifactPath.startsWith("_receiz/")) score += 200;
    if (candidate.artifactPath.includes("/_receiz/")) score += 100;
    if (candidate.artifactPath.includes("manifest")) score += 20;
    score += candidate.manifest.itemCount;
    return { candidate, score };
  });
  withScore.sort((a, b) => b.score - a.score || a.candidate.artifactPath.localeCompare(b.candidate.artifactPath));
  return withScore[0].candidate;
}

function pickPackageRootManifestCandidate(
  candidates: readonly PackageRootManifestCandidate[],
): PackageRootManifestCandidate {
  const withScore = candidates.map((candidate) => {
    let score = 0;
    if (candidate.artifactPath === "manifest.receizbundle") score += 300;
    if (!candidate.artifactPath.includes("/")) score += 120;
    if (candidate.artifactPath.includes("manifest")) score += 20;
    score += candidate.manifest.itemCount;
    return { candidate, score };
  });
  withScore.sort((a, b) => b.score - a.score || a.candidate.artifactPath.localeCompare(b.candidate.artifactPath));
  return withScore[0].candidate;
}

function findFolderManifestCandidateByPath(
  candidates: readonly FolderPackageManifestCandidate[],
  path: string,
): FolderPackageManifestCandidate | null {
  const normalized = normalizePackagePath(path);
  if (!normalized) return null;

  const direct = candidates.filter((candidate) => normalizePackagePath(candidate.artifactPath) === normalized);
  if (direct.length === 1) return direct[0] ?? null;
  if (direct.length > 1) return null;

  const suffix = `/${normalized}`;
  const suffixMatches = candidates.filter((candidate) => normalizePackagePath(candidate.artifactPath).endsWith(suffix));
  if (suffixMatches.length === 1) return suffixMatches[0] ?? null;
  return null;
}

async function tryVerifyFolderPackageFromFiles(args: {
  files: readonly FolderPackageFile[];
  onVerifiedAuthority?: (authority: ReceizFolderPackageAuthority) => void;
  signingKey?: string;
  signatureV4RootPublicKeys?: ReceizSignatureV4RootPublicKeyMap | null;
}): Promise<ReceizArtifactVerificationResult | null> {
  const fileMap = new Map<string, FolderPackageFile>();
  for (const file of args.files) {
    const normalizedPath = normalizePackagePath(file.path);
    if (!normalizedPath) continue;
    fileMap.set(normalizedPath, { ...file, path: normalizedPath });
  }
  if (fileMap.size === 0) return null;

  const manifestCandidates: FolderPackageManifestCandidate[] = [];
  const rootManifestCandidates: PackageRootManifestCandidate[] = [];
  for (const file of fileMap.values()) {
    const parsed = decodeReceizBundleEnvelope(file.bytes);
    if (!parsed) continue;
    const continuityPayload = await portableContinuityPayloadBytes(parsed.originalBytes);
    const manifestBytes = continuityPayload ?? parsed.originalBytes;
    const folderManifest = parseFolderManifestBytes(manifestBytes);
    if (folderManifest) {
      manifestCandidates.push({
        artifactPath: file.path,
        artifactBytes: file.bytes,
        manifest: folderManifest,
      });
    }
    const rootManifest = parsePackageRootManifestBytes(manifestBytes);
    if (rootManifest) {
      rootManifestCandidates.push({
        artifactPath: file.path,
        artifactBytes: file.bytes,
        manifest: rootManifest,
      });
    }
  }
  if (manifestCandidates.length === 0) return null;

  const errors: string[] = [];
  const warnings: string[] = [];

  let rootManifestCandidate: PackageRootManifestCandidate | null = null;
  let rootManifestVerification: ReceizArtifactVerificationResult | null = null;
  if (rootManifestCandidates.length > 0) {
    if (rootManifestCandidates.length > 1) {
      warnings.push("Multiple root package manifests found; using the highest-confidence manifest artifact.");
    }

    rootManifestCandidate = pickPackageRootManifestCandidate(rootManifestCandidates);
    const rootManifestResult = await verifyBundleArtifact({
      bytes: rootManifestCandidate.artifactBytes,
      signingKey: args.signingKey,
      signatureV4RootPublicKeys: args.signatureV4RootPublicKeys,
    });
    rootManifestVerification = rootManifestResult;
    if (!rootManifestResult.ok) {
      for (const err of rootManifestResult.errors) {
        errors.push(`Root manifest artifact: ${err}`);
      }
    }
    for (const warning of rootManifestResult.warnings) {
      warnings.push(`Root manifest artifact: ${warning}`);
    }

    const declaredRootPaths = new Set(rootManifestCandidate.manifest.entries.map((entry) => normalizePackagePath(entry.path)));
    const matchedRootPaths = new Set<string>();
    for (const entry of rootManifestCandidate.manifest.entries) {
      const declaredPath = normalizePackagePath(entry.path);
      const file = findPackageFileByPath(fileMap, declaredPath);
      if (!file) {
        errors.push(`Root manifest missing file: ${declaredPath}`);
        continue;
      }
      matchedRootPaths.add(file.path);

      if (file.bytes.byteLength !== entry.size) {
        errors.push(`Root manifest size mismatch for ${declaredPath}. expected ${entry.size}, got ${file.bytes.byteLength}.`);
      }
      const digest = (await sha256Hex(file.bytes)).toLowerCase();
      if (digest !== entry.sha256.toLowerCase()) {
        errors.push(`Root manifest hash mismatch for ${declaredPath}.`);
      }
    }

    for (const file of fileMap.values()) {
      if (normalizePackagePath(file.path) === normalizePackagePath(rootManifestCandidate.artifactPath)) continue;
      if (!declaredRootPaths.has(file.path) && !matchedRootPaths.has(file.path)) {
        warnings.push(`Extra file not listed in root manifest: ${file.path}`);
      }
    }
  } else {
    warnings.push("Root package manifest proof bundle is missing (expected manifest.receizbundle).");
  }

  let candidate: FolderPackageManifestCandidate;
  if (rootManifestCandidate) {
    const declaredFolderManifestPath = normalizePackagePath(rootManifestCandidate.manifest.folderManifestPath);
    const declaredMatch = findFolderManifestCandidateByPath(manifestCandidates, declaredFolderManifestPath);
    if (!declaredFolderManifestPath) {
      errors.push("Root manifest folderManifestPath is empty.");
      candidate = pickFolderManifestCandidate(manifestCandidates);
    } else if (!declaredMatch) {
      errors.push(`Root manifest folderManifestPath does not match a sealed folder manifest artifact: ${declaredFolderManifestPath}`);
      candidate = pickFolderManifestCandidate(manifestCandidates);
    } else {
      candidate = declaredMatch;
    }
  } else {
    if (manifestCandidates.length > 1) {
      warnings.push("Multiple package manifests found; using the highest-confidence manifest artifact.");
    }
    candidate = pickFolderManifestCandidate(manifestCandidates);
  }

  const manifestResult = await verifyBundleArtifact({
    bytes: candidate.artifactBytes,
    signingKey: args.signingKey,
      signatureV4RootPublicKeys: args.signatureV4RootPublicKeys,
  });

  if (!manifestResult.ok) {
    for (const err of manifestResult.errors) errors.push(`Manifest artifact: ${err}`);
  }
  for (const warning of manifestResult.warnings) warnings.push(`Manifest artifact: ${warning}`);

  const itemResults: ReceizFolderPackageItemVerification[] = [];
  let verifiedCount = 0;
  let failedCount = 0;
  let missingCount = 0;
  const matchedPaths = new Set<string>();

  for (const manifestEntry of candidate.manifest.entries) {
    const sealedPath = normalizePackagePath(manifestEntry.sealedPath);
    const sourcePath = normalizePackagePath(manifestEntry.sourcePath);
    const sealedFile = findPackageFileByPath(fileMap, sealedPath);
    const itemErrors: string[] = [];
    const itemWarnings: string[] = [];

    if (!sealedFile) {
      missingCount += 1;
      itemErrors.push(`Missing sealed artifact: ${sealedPath}`);
      errors.push(`Missing sealed artifact listed in manifest: ${sealedPath}`);
      itemResults.push({
        sourcePath,
        sealedPath,
        ok: false,
        kind: "missing",
        errors: itemErrors,
        warnings: itemWarnings,
        code: manifestEntry.code,
        pulse: manifestEntry.pulse,
        ts: manifestEntry.ts,
      });
      continue;
    }

    matchedPaths.add(sealedFile.path);

    const sealedSha256 = (await sha256Hex(sealedFile.bytes)).toLowerCase();
    if (sealedSha256 !== manifestEntry.sealedSha256.toLowerCase()) {
      itemErrors.push("Sealed artifact hash mismatch against package manifest.");
    }
    if (sealedFile.bytes.byteLength !== manifestEntry.sealedSize) {
      itemErrors.push(
        `Sealed artifact size mismatch. expected ${manifestEntry.sealedSize}, got ${sealedFile.bytes.byteLength}.`,
      );
    }

    const sealedVerify = await verifyNativeReceizProofContinuity({
      fileBytes: sealedFile.bytes,
      filename: manifestEntry.sealedFilename,
      mime: sealedFile.mime ?? manifestEntry.sealedContentType,
      signingKey: args.signingKey,
      signatureV4RootPublicKeys: args.signatureV4RootPublicKeys,
    });

    if (sealedVerify.kind === "folder_package") {
      itemErrors.push("Nested folder packages are not valid sealed artifacts.");
    } else if (!sealedVerify.ok) {
      for (const err of sealedVerify.errors) itemErrors.push(err);
    }
    for (const warning of sealedVerify.warnings) itemWarnings.push(warning);

    const bundle = sealedVerify.bundle;
    if (!bundle) {
      itemErrors.push("Missing proof bundle in sealed artifact.");
    } else {
      if ((bundle.code || "").toUpperCase() !== manifestEntry.code.toUpperCase()) {
        itemErrors.push(`Bundle code mismatch for ${sealedPath}.`);
      }
      if ((bundle.kaiPulseEternal || "") !== manifestEntry.pulse) {
        itemErrors.push(`Bundle pulse mismatch for ${sealedPath}.`);
      }
      if ((bundle.ts || "") !== manifestEntry.ts) {
        itemErrors.push(`Bundle timestamp mismatch for ${sealedPath}.`);
      }
      if ((bundle.verifyPath || "") !== manifestEntry.verifyPath) {
        itemErrors.push(`Bundle verifyPath mismatch for ${sealedPath}.`);
      }
      if ((bundle.artifactSha256Basis || "").toLowerCase() !== manifestEntry.basisSha256.toLowerCase()) {
        itemErrors.push(`Bundle artifact basis mismatch for ${sealedPath}.`);
      }
    }

    const itemOk = itemErrors.length === 0;
    if (itemOk) {
      verifiedCount += 1;
    } else {
      failedCount += 1;
      for (const err of itemErrors) errors.push(`${sealedPath}: ${err}`);
    }

    itemResults.push({
      sourcePath,
      sealedPath,
      ok: itemOk,
      kind: sealedVerify.kind,
      errors: itemErrors,
      warnings: itemWarnings,
      code: manifestEntry.code,
      pulse: manifestEntry.pulse,
      ts: manifestEntry.ts,
    });
  }

  const declaredPaths = new Set(candidate.manifest.entries.map((entry) => normalizePackagePath(entry.sealedPath)));
  for (const file of fileMap.values()) {
    if (!file.path.startsWith("sealed/")) continue;
    if (!declaredPaths.has(file.path) && !matchedPaths.has(file.path)) {
      warnings.push(`Extra sealed artifact not listed in manifest: ${file.path}`);
    }
  }

  const packageSummary: ReceizFolderPackageVerification = {
    manifest: candidate.manifest,
    manifestArtifactPath: candidate.artifactPath,
    manifestArtifactVerified: manifestResult.ok,
    itemCount: candidate.manifest.itemCount,
    verifiedCount,
    failedCount,
    missingCount,
    itemResults,
  };

  if (errors.length === 0 && args.onVerifiedAuthority) {
    const selected = rootManifestCandidate ?? candidate;
    // Selection and verification occurred above; retain the exact selected
    // enclosure and basis, never reconstruct them from package summaries.
    args.onVerifiedAuthority({ artifactPath: selected.artifactPath,
      artifactBytes: selected.artifactBytes,
      basisBytes: decodeReceizBundleEnvelope(selected.artifactBytes)!.originalBytes });
  }

  return {
    ok: errors.length === 0,
    kind: "folder_package",
    errors,
    warnings,
    bundle: rootManifestVerification?.bundle ?? manifestResult.bundle,
    anchor: null,
    package: packageSummary,
    assetContinuity: rootManifestVerification?.assetContinuity ?? manifestResult.assetContinuity,
  };
}

async function extractGuardedZipEntries(args: {
  bytes: Uint8Array;
  signingKey?: string;
  signatureV4RootPublicKeys?: ReceizSignatureV4RootPublicKeyMap | null;
  zipGuardLimits?: DocumentVerifyZipGuardLimits | null;
  packageExecutionCapacity?: ReceizPackageExecutionCapacity;
}): Promise<FolderPackageFile[] | ReceizArtifactVerificationResult | null> {
  const assertMaterialization = packageMaterializationGuard(args.packageExecutionCapacity);
  try { assertMaterialization("exactArtifactBytes", args.bytes.byteLength); } catch (error) {
    if (error instanceof ReceizProtocolLimitError) return buildOperationalDenialResult("folder_package", error.code);
    throw error;
  }
  const { default: JSZip } = await import("jszip");
  let zip: InstanceType<typeof JSZip>;
  try {
    zip = await JSZip.loadAsync(args.bytes);
  } catch {
    return null;
  }

  const files: FolderPackageFile[] = [];
  const paths = Object.keys(zip.files);
  const zipGuards = args.zipGuardLimits ?? DOCUMENT_VERIFY_SERVER_ZIP_GUARD_LIMITS;
  if (paths.length > zipGuards.maxEntries) {
    return buildOperationalDenialResult("folder_package", "ARCHIVE_LIMIT_EXCEEDED");
  }

  const protocolGuard = createReceizArchiveVerificationGuard();
  let materializedArchiveBytes = 0;
  let totalUncompressedBytes = 0;
  for (const path of paths) {
    const zipEntry = zip.files[path];
    if (!zipEntry) continue;

    const unsafeOriginalName = typeof (zipEntry as { unsafeOriginalName?: unknown }).unsafeOriginalName === "string"
      ? (zipEntry as { unsafeOriginalName: string }).unsafeOriginalName
      : path;
    const unixPermissions = (zipEntry as { unixPermissions?: number | string | null }).unixPermissions;
    const unixMode = typeof unixPermissions === "string"
      ? Number.parseInt(unixPermissions, 8)
      : typeof unixPermissions === "number" ? unixPermissions : 0;
    const entryKind = zipEntry.dir ? "directory" as const
      : (unixMode & 0o170000) === 0o120000 ? "symlink" as const : "file" as const;

    const declaredUncompressedSize = zipEntryUncompressedSize(zipEntry);
    try {
      protocolGuard.beginEntry({
        path: unsafeOriginalName,
        compressedBytes: Number((zipEntry as { _data?: { compressedSize?: unknown } })._data?.compressedSize ?? 0),
        ...(declaredUncompressedSize === null ? {} : { declaredDecompressedBytes: declaredUncompressedSize }),
        kind: entryKind,
        manifest: /(?:^|\/)manifest(?:\.[^/]*)?$/iu.test(unsafeOriginalName),
      });
      if (declaredUncompressedSize !== null) {
        assertMaterialization(
          "decompressedArchiveBytes",
          materializedArchiveBytes + declaredUncompressedSize,
        );
      }
    } catch (error) {
      if (error instanceof ReceizProtocolLimitError) return buildOperationalDenialResult("folder_package", error.code);
      throw error;
    }
    if (zipEntry.dir) {
      protocolGuard.endEntry();
      continue;
    }
    if (declaredUncompressedSize !== null && declaredUncompressedSize > zipGuards.maxEntryUncompressedBytes) {
      return buildOperationalDenialResult("folder_package", "ARCHIVE_LIMIT_EXCEEDED");
    }

    if (declaredUncompressedSize !== null) {
      totalUncompressedBytes += declaredUncompressedSize;
      if (totalUncompressedBytes > zipGuards.maxTotalUncompressedBytes) {
        return buildOperationalDenialResult("folder_package", "ARCHIVE_LIMIT_EXCEEDED");
      }
    }

    let bytes: Uint8Array;
    try {
      const chunks: Uint8Array[] = [];
      let extractedBytes = 0;
      bytes = await new Promise<Uint8Array>((resolve, reject) => {
        const stream = zipEntry.internalStream("uint8array");
        stream.on("data", (chunk: Uint8Array) => {
          try {
            assertMaterialization(
              "decompressedArchiveBytes",
              materializedArchiveBytes + chunk.byteLength,
            );
            protocolGuard.observeDecompressedChunk(chunk.byteLength);
            chunks.push(chunk.slice());
            extractedBytes += chunk.byteLength;
            materializedArchiveBytes += chunk.byteLength;
          } catch (error) {
            stream.pause();
            reject(error);
          }
        });
        stream.on("error", reject);
        stream.on("end", () => {
          const extracted = new Uint8Array(extractedBytes);
          let offset = 0;
          for (const chunk of chunks) {
            extracted.set(chunk, offset);
            offset += chunk.byteLength;
          }
          resolve(extracted);
        });
        stream.resume();
      });
      protocolGuard.endEntry();
    } catch (error) {
      if (error instanceof ReceizProtocolLimitError) return buildOperationalDenialResult("folder_package", error.code);
      throw error;
    }
    if (detectReceizRecursiveArchiveFormat(bytes)) {
      return buildOperationalDenialResult("folder_package", "ARCHIVE_RECURSION_FORBIDDEN");
    }
    if (bytes.byteLength > zipGuards.maxEntryUncompressedBytes) {
      return buildOperationalDenialResult("folder_package", "ARCHIVE_LIMIT_EXCEEDED");
    }

    if (declaredUncompressedSize === null) {
      totalUncompressedBytes += bytes.byteLength;
    } else {
      totalUncompressedBytes += Math.max(0, bytes.byteLength - declaredUncompressedSize);
    }
    if (totalUncompressedBytes > zipGuards.maxTotalUncompressedBytes) {
      return buildOperationalDenialResult("folder_package", "ARCHIVE_LIMIT_EXCEEDED");
    }

    files.push({
      path: normalizePackagePath(path),
      bytes,
      mime: undefined,
    });
  }

  return files;
}

export type ReceizFolderPackageAuthority = Readonly<{
  artifactPath: string; artifactBytes: Uint8Array; basisBytes: Uint8Array;
}>;
export type ReceizGuardedZipInspectionResult =
  | Readonly<{ inspected: true; entries: readonly FolderPackageFile[] }>
  | Readonly<{ inspected: false; error: string }>;
export type ReceizVerifiedFolderPackageReadResult =
  | Readonly<{ ok: true; access: "read-only"; sourceKind: "folder-package";
      artifactBytes: Uint8Array; entries: readonly FolderPackageFile[];
      authority: ReceizFolderPackageAuthority; verification: ReceizArtifactVerificationResult }>
  | Readonly<{ ok: false; error: string; verification: ReceizArtifactVerificationResult }>;

async function tryVerifyFolderPackageZipArtifact(args: {
  bytes: Uint8Array; signingKey?: string;
  signatureV4RootPublicKeys?: ReceizSignatureV4RootPublicKeyMap | null;
  zipGuardLimits?: DocumentVerifyZipGuardLimits | null;
  packageExecutionCapacity?: ReceizPackageExecutionCapacity;
}): Promise<ReceizArtifactVerificationResult | null> {
  const extracted = await extractGuardedZipEntries(args);
  if (!Array.isArray(extracted)) return extracted;
  return tryVerifyFolderPackageFromFiles({ ...args, files: extracted });
}

/** Inspection only. Entries do not establish proof admission or membership. */
export async function inspectReceizZipBytes(args: DocumentReadInput): Promise<ReceizGuardedZipInspectionResult> {
  args = { ...args, packageExecutionCapacity: args.packageExecutionCapacity && Object.freeze({ ...args.packageExecutionCapacity }) };
  try {
    packageMaterializationGuard(args.packageExecutionCapacity)("exactArtifactBytes", args.fileBytes.byteLength);
    const extracted = await extractGuardedZipEntries({ ...args, bytes: new Uint8Array(args.fileBytes) });
    if (Array.isArray(extracted)) return { inspected: true, entries: extracted };
    return { inspected: false, error: extracted?.denial?.code ?? "ARCHIVE_PRIVACY_INSPECTION_UNAVAILABLE" };
  } catch (error) {
    return { inspected: false, error: error instanceof ReceizProtocolLimitError ? error.code : "ARCHIVE_PRIVACY_INSPECTION_UNAVAILABLE" };
  }
}

/** Dedicated package reader. A ZIP transport digest is never its manifest basis. */
export async function readVerifiedReceizFolderPackageBytes(args: DocumentReadInput): Promise<ReceizVerifiedFolderPackageReadResult> {
  args = { ...args, packageExecutionCapacity: args.packageExecutionCapacity && Object.freeze({ ...args.packageExecutionCapacity }) };
  let artifactBytes: Uint8Array;
  let extracted: Awaited<ReturnType<typeof extractGuardedZipEntries>>;
  try {
    packageMaterializationGuard(args.packageExecutionCapacity)("exactArtifactBytes", args.fileBytes.byteLength);
    artifactBytes = new Uint8Array(args.fileBytes);
    // Native ZIP enclosure has precedence and belongs to the document reader.
    const trailer = parseReceizTrailer(artifactBytes);
    if (trailer.trailerCount > 0 && !trailer.parseError) {
      return { ok: false, error: "enclosing_document_reader_required", verification: await verifyReceizDocumentBytes({ ...args, fileBytes: artifactBytes }) };
    }
    extracted = await extractGuardedZipEntries({ ...args, bytes: artifactBytes });
  } catch (error) {
    const verification = buildOperationalDenialResult("folder_package", error instanceof ReceizProtocolLimitError ? error.code : "VERIFICATION_RESOURCE_UNAVAILABLE");
    return { ok: false, error: verification.denial!.code, verification };
  }
  if (!Array.isArray(extracted)) {
    const verification = extracted ?? buildInvalidResult("unknown", ["No sealed package manifest found."], []);
    return { ok: false, error: verification.denial?.code ?? "folder_package_verification_failed", verification };
  }
  let authority: ReceizFolderPackageAuthority | undefined;
  const result = await tryVerifyFolderPackageFromFiles({ ...args, files: extracted, onVerifiedAuthority: value => { authority = value; } });
  const verification = result ? { ...result, integrity: { ok: result.ok, errors: result.errors } }
    : buildInvalidResult("unknown", ["No sealed package manifest found."], []);
  if (!verification.ok || !authority) return { ok: false, error: "folder_package_verification_failed", verification };
  return { ok: true, access: "read-only", sourceKind: "folder-package", artifactBytes, entries: extracted, authority, verification };
}

async function verifyPngArtifact(args: {
  pngBytes: Uint8Array;
  optionalLink?: string;
  signingKey?: string;
  signatureV4RootPublicKeys?: ReceizSignatureV4RootPublicKeyMap | null;
}): Promise<ReceizArtifactVerificationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  let proofChunkCount = 0;
  let proofEncoded: string | null = null;
  let anchorRaw: string | null = null;

  try {
    proofChunkCount = countPngTextChunksByKeyword(args.pngBytes, RECEIZ_PROOF_BUNDLE_CHUNK_KEY);
    proofEncoded = readPngTextChunk(args.pngBytes, RECEIZ_PROOF_BUNDLE_CHUNK_KEY);
    anchorRaw = readPngTextChunk(args.pngBytes, RECEIZ_ANCHOR_BUNDLE_CHUNK_KEY);
  } catch {
    return buildInvalidResult("png", ["Invalid PNG. Upload the original sealed artifact."], warnings);
  }

  if (proofChunkCount !== 1) {
    errors.push(
      proofChunkCount > 1
        ? "Duplicate proof bundles detected (proof bundle chunk count > 1)."
        : "Missing proof bundle chunk (likely not the original sealed artifact)."
    );
  }

  if (!proofEncoded) {
    if (proofChunkCount === 1) {
      errors.push("Proof bundle chunk could not be read.");
    }
    return buildInvalidResult("png", errors, warnings);
  }

  let bundle: ReceizProofBundle;
  try {
    bundle = decodeReceizProofBundle(proofEncoded);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return buildInvalidResult("png", [...errors, `Proof bundle decode failed: ${message}`], warnings);
  }

  const chunkAnchor = anchorRaw ? decodeReceizAnchorBundle(anchorRaw) : null;
  if (anchorRaw && !chunkAnchor) {
    errors.push("Anchor bundle chunk exists but is invalid JSON/shape.");
  }
  const derivedAnchor = deriveAnchorBundleFromProofBundle(bundle);
  const anchor = proofBearingAnchorProjection(chunkAnchor, derivedAnchor);

  const basisBytes = stripReceizProofAugmentationChunks(args.pngBytes);
  const checked = await validateBundleAgainstBasis({
    bundle,
    basisBytes,
    anchor,
    optionalLink: args.optionalLink,
    signingKey: args.signingKey,
      signatureV4RootPublicKeys: args.signatureV4RootPublicKeys,
  });

  return {
    ok: errors.length === 0 && checked.errors.length === 0,
    kind: "png",
    errors: [...errors, ...checked.errors],
    warnings: [...warnings, ...checked.warnings],
    bundle,
    anchor,
    package: null,
  };
}

async function verifyPdfArtifact(args: {
  pdfBytes: Uint8Array;
  optionalLink?: string;
  signingKey?: string;
  signatureV4RootPublicKeys?: ReceizSignatureV4RootPublicKeyMap | null;
}): Promise<ReceizArtifactVerificationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  const proofBundles = extractReceizProofBundlesFromPdf(args.pdfBytes);
  if (proofBundles.length !== 1) {
    errors.push(
      proofBundles.length > 1
        ? "Duplicate proof bundles detected in PDF metadata."
        : "Missing embedded PDF proof bundle."
    );
    return buildInvalidResult("pdf", errors, warnings);
  }

  let bundle: ReceizProofBundle;
  try {
    bundle = decodeReceizProofBundle(proofBundles[0] ?? "");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return buildInvalidResult("pdf", [...errors, `Proof bundle decode failed: ${message}`], warnings);
  }

  const anchor = deriveAnchorBundleFromProofBundle(bundle);
  const stripped = stripReceizSealUpdatesFromPdf(args.pdfBytes);
  const checked = await validateBundleAgainstBasis({
    bundle,
    basisBytes: stripped.pdfBytes,
    anchor,
    optionalLink: args.optionalLink,
    signingKey: args.signingKey,
      signatureV4RootPublicKeys: args.signatureV4RootPublicKeys,
  });

  return {
    ok: errors.length === 0 && checked.errors.length === 0,
    kind: "pdf",
    errors: [...errors, ...checked.errors],
    warnings: [...warnings, ...checked.warnings],
    bundle,
    anchor,
    package: null,
  };
}

async function verifyHeicArtifact(args: {
  heicBytes: Uint8Array;
  optionalLink?: string;
  signingKey?: string;
  signatureV4RootPublicKeys?: ReceizSignatureV4RootPublicKeyMap | null;
}): Promise<ReceizArtifactVerificationResult> {
  const parsed = parseReceizHeicProof(args.heicBytes);
  if (parsed.parseError || parsed.proofCount !== 1 || !parsed.bundle) {
    return buildInvalidResult("heic-box", [
      parsed.proofCount > 1
        ? "Duplicate HEIC proof bundles detected."
        : parsed.parseError
          ? "HEIC proof bundle is malformed."
          : "Missing embedded HEIC proof bundle.",
    ], []);
  }
  const bundle = coerceReceizProofBundle(parsed.bundle);
  if (!bundle) {
    return buildInvalidResult("heic-box", ["HEIC proof bundle schema is invalid."], []);
  }
  const anchor = deriveAnchorBundleFromProofBundle(bundle);
  const checked = await validateBundleAgainstBasis({
    bundle,
    basisBytes: parsed.basisBytes,
    anchor,
    optionalLink: args.optionalLink,
    signingKey: args.signingKey,
    signatureV4RootPublicKeys: args.signatureV4RootPublicKeys,
  });
  return {
    ok: checked.errors.length === 0,
    kind: "heic-box",
    errors: checked.errors,
    warnings: checked.warnings,
    bundle,
    anchor,
    package: null,
  };
}

async function verifySvgArtifact(args: {
  svgBytes: Uint8Array;
  optionalLink?: string;
  signingKey?: string;
  signatureV4RootPublicKeys?: ReceizSignatureV4RootPublicKeyMap | null;
}): Promise<ReceizArtifactVerificationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const parsed = parseReceizSvgProof(args.svgBytes);
  const trailerFallback =
    parsed.proofCount !== 1 || parsed.parseError || !parsed.encodedBundle ? parseReceizTrailer(args.svgBytes) : null;
  if (trailerFallback && trailerFallback.trailerCount > 0 && !trailerFallback.parseError) {
    const fallback = await verifyTrailerArtifact({
      bytes: args.svgBytes,
      optionalLink: args.optionalLink,
      signingKey: args.signingKey,
      signatureV4RootPublicKeys: args.signatureV4RootPublicKeys,
    });
    return {
      ...fallback,
      warnings: ["Used trailer proof fallback for SVG artifact.", ...fallback.warnings],
    };
  }

  if (parsed.proofCount !== 1) {
    errors.push(
      parsed.proofCount > 1
        ? "Duplicate proof bundles detected in SVG metadata."
        : "Missing embedded SVG proof bundle."
    );
    return buildInvalidResult("trailer", errors, warnings);
  }

  if (parsed.parseError || !parsed.encodedBundle) {
    errors.push("SVG proof bundle is malformed.");
    return buildInvalidResult("trailer", errors, warnings);
  }

  let bundle: ReceizProofBundle;
  try {
    bundle = decodeReceizProofBundle(parsed.encodedBundle);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return buildInvalidResult("trailer", [...errors, `Proof bundle decode failed: ${message}`], warnings);
  }

  const anchor = deriveAnchorBundleFromProofBundle(bundle);
  const checked = await validateBundleAgainstBasis({
    bundle,
    basisBytes: parsed.basisBytes,
    anchor,
    optionalLink: args.optionalLink,
    signingKey: args.signingKey,
      signatureV4RootPublicKeys: args.signatureV4RootPublicKeys,
  });

  return {
    ok: errors.length === 0 && checked.errors.length === 0,
    kind: "trailer",
    errors: [...errors, ...checked.errors],
    warnings: [...warnings, ...checked.warnings],
    bundle,
    anchor,
    package: null,
  };
}

async function verifyJsonArtifact(args: {
  jsonBytes: Uint8Array;
  optionalLink?: string;
  signingKey?: string;
  signatureV4RootPublicKeys?: ReceizSignatureV4RootPublicKeyMap | null;
}): Promise<ReceizArtifactVerificationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const parsed = parseReceizJsonProof(args.jsonBytes);
  const trailerFallback =
    parsed.proofCount !== 1 || parsed.parseError || !parsed.encodedBundle ? parseReceizTrailer(args.jsonBytes) : null;
  if (trailerFallback && trailerFallback.trailerCount > 0 && !trailerFallback.parseError) {
    const fallback = await verifyTrailerArtifact({
      bytes: args.jsonBytes,
      optionalLink: args.optionalLink,
      signingKey: args.signingKey,
      signatureV4RootPublicKeys: args.signatureV4RootPublicKeys,
    });
    return {
      ...fallback,
      warnings: ["Used trailer proof fallback for JSON artifact.", ...fallback.warnings],
    };
  }

  if (parsed.proofCount !== 1) {
    errors.push(
      parsed.proofCount > 1
        ? "Duplicate proof bundles detected in JSON whitespace channel."
        : "Missing embedded JSON proof bundle."
    );
    return buildInvalidResult("trailer", errors, warnings);
  }

  if (parsed.parseError || !parsed.encodedBundle) {
    errors.push("JSON proof bundle is malformed.");
    return buildInvalidResult("trailer", errors, warnings);
  }

  let bundle: ReceizProofBundle;
  try {
    bundle = decodeReceizProofBundle(parsed.encodedBundle);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return buildInvalidResult("trailer", [...errors, `Proof bundle decode failed: ${message}`], warnings);
  }

  const anchor = deriveAnchorBundleFromProofBundle(bundle);
  const checked = await validateBundleAgainstBasis({
    bundle,
    basisBytes: parsed.basisBytes,
    anchor,
    optionalLink: args.optionalLink,
    signingKey: args.signingKey,
      signatureV4RootPublicKeys: args.signatureV4RootPublicKeys,
  });

  return {
    ok: errors.length === 0 && checked.errors.length === 0,
    kind: "trailer",
    errors: [...errors, ...checked.errors],
    warnings: [...warnings, ...checked.warnings],
    bundle,
    anchor,
    package: null,
  };
}

async function verifyTrailerArtifact(args: {
  bytes: Uint8Array;
  optionalLink?: string;
  signingKey?: string;
  signatureV4RootPublicKeys?: ReceizSignatureV4RootPublicKeyMap | null;
}): Promise<ReceizArtifactVerificationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const parsed = parseReceizTrailer(args.bytes);

  if (parsed.trailerCount !== 1) {
    errors.push(
      parsed.trailerCount > 1
        ? "Duplicate trailer proof bundles detected."
        : "Missing trailer proof bundle."
    );
    return buildInvalidResult("trailer", errors, warnings);
  }

  if (parsed.parseError || !parsed.bundle) {
    errors.push("Trailer proof bundle is malformed.");
    return buildInvalidResult("trailer", errors, warnings);
  }

  const bundle = coerceReceizProofBundle(parsed.bundle);
  if (!bundle) {
    errors.push("Trailer proof bundle schema is invalid.");
    return buildInvalidResult("trailer", errors, warnings);
  }

  const anchor = deriveAnchorBundleFromProofBundle(bundle);
  const checked = await validateBundleAgainstBasis({
    bundle,
    basisBytes: parsed.basisBytes,
    anchor,
    optionalLink: args.optionalLink,
    signingKey: args.signingKey,
      signatureV4RootPublicKeys: args.signatureV4RootPublicKeys,
  });

  return {
    ok: errors.length === 0 && checked.errors.length === 0,
    kind: "trailer",
    errors: [...errors, ...checked.errors],
    warnings: [...warnings, ...checked.warnings],
    bundle,
    anchor,
    package: null,
  };
}

async function verifyBundleArtifact(args: {
  bytes: Uint8Array;
  optionalLink?: string;
  signingKey?: string;
  signatureV4RootPublicKeys?: ReceizSignatureV4RootPublicKeyMap | null;
}): Promise<ReceizArtifactVerificationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  const parsed = decodeReceizBundleEnvelope(args.bytes);
  if (!parsed) {
    return buildInvalidResult("bundle", ["Invalid .receizbundle container."], warnings);
  }

  const manifestBasis = (await sha256Hex(parsed.originalBytes)).toLowerCase();
  if (manifestBasis !== parsed.envelope.manifest.basisSha256.toLowerCase()) {
    errors.push("Bundle manifest basis hash mismatch.");
  }
  if ((parsed.envelope.proofbundle.artifactSha256Basis ?? "").toLowerCase() !== manifestBasis) {
    errors.push("Proof bundle artifact binding does not match container original bytes.");
  }

  const anchor = deriveAnchorBundleFromProofBundle(parsed.envelope.proofbundle);
  const checked = await validateBundleAgainstBasis({
    bundle: parsed.envelope.proofbundle,
    basisBytes: parsed.originalBytes,
    anchor,
    optionalLink: args.optionalLink,
    signingKey: args.signingKey,
      signatureV4RootPublicKeys: args.signatureV4RootPublicKeys,
  });
  const assetContinuity = await classifyReceizAssetContinuity(parsed.originalBytes, parsed.envelope.proofbundle);

  return {
    ok: errors.length === 0 && checked.errors.length === 0,
    kind: "bundle",
    errors: [...errors, ...checked.errors],
    warnings: [...warnings, ...checked.warnings],
    bundle: parsed.envelope.proofbundle,
    anchor,
    package: null,
    assetContinuity,
  };
}

async function verifyNativeReceizProofContinuity(args: {
  fileBytes: Uint8Array;
  filename?: string;
  mime?: string;
  optionalLink?: string;
  signingKey?: string;
  signatureV4RootPublicKeys?: ReceizSignatureV4RootPublicKeyMap | null;
  zipGuardLimits?: DocumentVerifyZipGuardLimits | null;
  packageExecutionCapacity?: ReceizPackageExecutionCapacity;
}): Promise<ReceizArtifactVerificationResult> {
  const bundleParsed = decodeReceizBundleEnvelope(args.fileBytes);
  if (bundleParsed) {
    return verifyBundleArtifact({
      bytes: args.fileBytes,
      optionalLink: args.optionalLink,
      signingKey: args.signingKey,
      signatureV4RootPublicKeys: args.signatureV4RootPublicKeys,
    });
  }

  const kind = detectDocumentFormat(args.fileBytes, { filename: args.filename, mime: args.mime });
  if (kind === "png") {
    return verifyPngArtifact({
      pngBytes: args.fileBytes,
      optionalLink: args.optionalLink,
      signingKey: args.signingKey,
      signatureV4RootPublicKeys: args.signatureV4RootPublicKeys,
    });
  }
  if (kind === "pdf") {
    return verifyPdfArtifact({
      pdfBytes: args.fileBytes,
      optionalLink: args.optionalLink,
      signingKey: args.signingKey,
      signatureV4RootPublicKeys: args.signatureV4RootPublicKeys,
    });
  }
  if (kind === "heic") {
    return verifyHeicArtifact({
      heicBytes: args.fileBytes,
      optionalLink: args.optionalLink,
      signingKey: args.signingKey,
      signatureV4RootPublicKeys: args.signatureV4RootPublicKeys,
    });
  }
  if (kind === "svg") {
    return verifySvgArtifact({
      svgBytes: args.fileBytes,
      optionalLink: args.optionalLink,
      signingKey: args.signingKey,
      signatureV4RootPublicKeys: args.signatureV4RootPublicKeys,
    });
  }
  if (kind === "json") {
    return verifyJsonArtifact({
      jsonBytes: args.fileBytes,
      optionalLink: args.optionalLink,
      signingKey: args.signingKey,
      signatureV4RootPublicKeys: args.signatureV4RootPublicKeys,
    });
  }
  if (kind === "zip") {
    const zipTrailerParsed = parseReceizTrailer(args.fileBytes);
    if (zipTrailerParsed.trailerCount > 0 && !zipTrailerParsed.parseError) {
      return verifyTrailerArtifact({
        bytes: args.fileBytes,
        optionalLink: args.optionalLink,
        signingKey: args.signingKey,
      signatureV4RootPublicKeys: args.signatureV4RootPublicKeys,
      });
    }
    const packageResult = await tryVerifyFolderPackageZipArtifact({
      bytes: args.fileBytes,
      signingKey: args.signingKey,
      signatureV4RootPublicKeys: args.signatureV4RootPublicKeys,
      zipGuardLimits: args.zipGuardLimits,
      packageExecutionCapacity: args.packageExecutionCapacity,
    });
    if (packageResult) return packageResult;
    return buildInvalidResult(
      "unknown",
      ["Unsupported ZIP artifact. Upload a sealed ZIP/package artifact or upload individual sealed artifacts."],
      [],
    );
  }
  const trailerParsed = parseReceizTrailer(args.fileBytes);
  if (trailerParsed.trailerCount > 0) {
    return verifyTrailerArtifact({
      bytes: args.fileBytes,
      optionalLink: args.optionalLink,
      signingKey: args.signingKey,
      signatureV4RootPublicKeys: args.signatureV4RootPublicKeys,
    });
  }
  return buildInvalidResult(
    "unknown",
    ["Unsupported artifact format. Upload a sealed file, .receizbundle, or sealed package ZIP."],
    []
  );
}

export async function verifyReceizDocumentBytes(args: {
  fileBytes: Uint8Array;
  filename?: string;
  mime?: string;
  optionalLink?: string;
  signingKey?: string;
  signatureV4RootPublicKeys?: ReceizSignatureV4RootPublicKeyMap | null;
  zipGuardLimits?: DocumentVerifyZipGuardLimits | null;
  packageExecutionCapacity?: ReceizPackageExecutionCapacity;
}): Promise<ReceizArtifactVerificationResult> {
  args = { ...args, packageExecutionCapacity: args.packageExecutionCapacity && Object.freeze({ ...args.packageExecutionCapacity }) };
  const continuityResult = await verifyNativeReceizProofContinuity(args);
  let projectedResult = continuityResult;
  if (continuityResult.ok && continuityResult.bundle) {
    const extracted = extractVerifiedBasisBytes({
      fileBytes: args.fileBytes,
      filename: args.filename,
      mime: args.mime,
      verification: continuityResult,
    });
    if (extracted) {
      projectedResult = {
        ...continuityResult,
        assetContinuity: await classifyReceizAssetContinuity(
          extracted.payloadBytes,
          continuityResult.bundle,
        ),
      };
    }
  }
  return {
    ...projectedResult,
    integrity: { ok: projectedResult.ok, errors: projectedResult.errors },
  };
}

function failedArtifactOpen(
  verification: ReceizArtifactVerificationResult,
  error: string,
): Extract<ReceizVerifiedArtifactOpenResult, { ok: false }> {
  return { ok: false, verification, error };
}

function extractVerifiedBasisBytes(args: {
  fileBytes: Uint8Array;
  filename?: string;
  mime?: string;
  verification: ReceizArtifactVerificationResult;
}): { payloadBytes: Uint8Array; payloadFilename: string; payloadMimeType: string } | null {
  if (args.verification.kind === "bundle") {
    const parsed = decodeReceizBundleEnvelope(args.fileBytes);
    if (!parsed) return null;
    return {
      payloadBytes: parsed.originalBytes,
      payloadFilename: parsed.envelope.manifest.filename,
      payloadMimeType: parsed.envelope.manifest.mime,
    };
  }
  if (args.verification.kind === "png") {
    return {
      payloadBytes: stripReceizProofAugmentationChunks(args.fileBytes),
      payloadFilename: args.filename || "artifact.png",
      payloadMimeType: args.mime || "image/png",
    };
  }
  if (args.verification.kind === "pdf") {
    return {
      payloadBytes: stripReceizSealUpdatesFromPdf(args.fileBytes).pdfBytes,
      payloadFilename: args.filename || "artifact.pdf",
      payloadMimeType: args.mime || "application/pdf",
    };
  }
  if (args.verification.kind === "heic-box") {
    const parsed = parseReceizHeicProof(args.fileBytes);
    if (parsed.proofCount !== 1 || parsed.parseError || !parsed.bundle) return null;
    return {
      payloadBytes: parsed.basisBytes,
      payloadFilename: args.filename || "artifact.heic",
      payloadMimeType: "image/heic",
    };
  }
  if (args.verification.kind !== "trailer") return null;

  const format = detectDocumentFormat(args.fileBytes, { filename: args.filename, mime: args.mime });
  if (format === "svg") {
    const parsed = parseReceizSvgProof(args.fileBytes);
    if (parsed.proofCount === 1 && !parsed.parseError && parsed.encodedBundle) {
      return {
        payloadBytes: parsed.basisBytes,
        payloadFilename: args.filename || "artifact.svg",
        payloadMimeType: args.mime || "image/svg+xml",
      };
    }
  }
  if (format === "json") {
    const parsed = parseReceizJsonProof(args.fileBytes);
    if (parsed.proofCount === 1 && !parsed.parseError && parsed.encodedBundle) {
      return {
        payloadBytes: parsed.basisBytes,
        payloadFilename: args.filename || "artifact.json",
        payloadMimeType: args.mime || "application/json",
      };
    }
  }
  const parsed = parseReceizTrailer(args.fileBytes);
  if (parsed.trailerCount !== 1 || parsed.parseError || !parsed.bundle) return null;
  return {
    payloadBytes: parsed.basisBytes,
    payloadFilename: args.filename || "artifact",
    payloadMimeType: args.mime || "application/octet-stream",
  };
}

function bytesEqual(left: Uint8Array, right: Uint8Array): boolean {
  if (left.byteLength !== right.byteLength) return false;
  for (let index = 0; index < left.byteLength; index += 1) {
    if (left[index] !== right[index]) return false;
  }
  return true;
}

function rebuildCanonicalCurrentNativeArtifact(args: {
  payloadBytes: Uint8Array;
  verification: ReceizArtifactVerificationResult;
  nativeRecordSeal: ReceizNativeRecordSeal;
}): Uint8Array | null {
  const bundle = args.verification.bundle;
  if (!bundle) return null;
  if (args.verification.kind === "bundle") {
    return encodeReceizBundleEnvelope({
      manifest: {
        filename: args.nativeRecordSeal.payload.filename,
        mime: args.nativeRecordSeal.payload.mimeType,
        basisSha256: args.nativeRecordSeal.payload.sha256,
        createdAt: bundle.createdAtMs,
        version: 1,
      },
      originalBytes: args.payloadBytes,
      proofbundle: bundle,
    });
  }

  const encodedBundle = encodeReceizProofBundle(bundle);
  if (args.verification.kind === "png") {
    return insertPngTextChunks(args.payloadBytes, [
      { keyword: RECEIZ_PROOF_BUNDLE_CHUNK_KEY, text: encodedBundle },
    ]);
  }
  if (args.verification.kind === "pdf") {
    return embedReceizProofBundleIntoPdf({ pdfBytes: args.payloadBytes, encodedBundle });
  }
  if (args.verification.kind === "heic-box") {
    return appendReceizHeicProof({ basisBytes: args.payloadBytes, bundle });
  }
  if (args.verification.kind !== "trailer") return null;

  const format = detectDocumentFormat(args.payloadBytes, {
    filename: args.nativeRecordSeal.payload.filename,
    mime: args.nativeRecordSeal.payload.mimeType,
  });
  if (format === "svg") {
    return embedReceizProofBundleIntoSvg({ svgBytes: args.payloadBytes, encodedBundle }).svgBytes;
  }
  if (format === "json") {
    return embedReceizProofBundleIntoJson({ jsonBytes: args.payloadBytes, encodedBundle }).jsonBytes;
  }
  return appendReceizTrailer({ basisBytes: args.payloadBytes, bundle });
}

// Shared enclosing verification, extraction and exact native carrier gate. Neither
// caller descriptors nor an extracted payload's self-hash can admit a source.
async function extractVerifiedReceizDocument(args: DocumentReadInput): Promise<VerifiedDocumentExtractionResult> {
  const artifactBytes = new Uint8Array(args.fileBytes);
  let verification = await verifyReceizDocumentBytes({ ...args, fileBytes: artifactBytes });
  if (!verification.ok || !verification.integrity?.ok) {
    return failedArtifactOpen(verification, verification.errors[0] || "artifact_verification_failed");
  }
  if (!verification.bundle) {
    return failedArtifactOpen(verification, "verified_artifact_bundle_missing");
  }

  const extracted = extractVerifiedBasisBytes({
    fileBytes: artifactBytes,
    filename: args.filename,
    mime: args.mime,
    verification,
  });
  if (!extracted) {
    return failedArtifactOpen(verification, "verified_artifact_basis_extraction_failed");
  }

  const identityBasisBytes = await artifactIdentityBasisBytes(verification.bundle, extracted.payloadBytes);
  const basisSha256 = (await sha256Hex(identityBasisBytes)).toLowerCase();
  if (basisSha256 !== (verification.bundle.artifactSha256Basis || "").toLowerCase()) {
    return failedArtifactOpen(verification, "verified_artifact_basis_hash_mismatch");
  }

  const nativeRecordSeal = verification.bundle.nativeRecordSeal ?? null;
  const assetContinuity = await classifyReceizAssetContinuity(extracted.payloadBytes, verification.bundle);
  verification = { ...verification, assetContinuity };
  let payloadFilename = extracted.payloadFilename;
  let payloadMimeType = extracted.payloadMimeType;
  if (nativeRecordSeal) {
    if (nativeRecordSeal.payload.sha256 !== basisSha256) {
      return failedArtifactOpen(verification, "native_record_payload_hash_mismatch");
    }
    const canonicalArtifact = rebuildCanonicalCurrentNativeArtifact({
      payloadBytes: extracted.payloadBytes,
      verification,
      nativeRecordSeal,
    });
    if (!canonicalArtifact || !bytesEqual(canonicalArtifact, artifactBytes)) {
      return failedArtifactOpen(verification, "native_record_carrier_bytes_noncanonical");
    }
    payloadFilename = nativeRecordSeal.payload.filename;
    payloadMimeType = nativeRecordSeal.payload.mimeType;
  }

  return {
    ok: true,
    verification: verification as ReceizArtifactVerificationResult & { ok: true },
    artifactBytes,
    payloadBytes: extracted.payloadBytes,
    payloadFilename,
    payloadMimeType,
    nativeRecordSeal,
  };
}

export async function readVerifiedReceizDocumentBytes(args: DocumentReadInput): Promise<ReceizVerifiedDocumentReadResult> {
  const extracted = await extractVerifiedReceizDocument(args);
  if (!extracted.ok) return extracted;
  return { ...extracted, access: "read-only" };
}

export async function verifyAndExtractReceizDocumentBytes(args: DocumentReadInput & {
  purpose?: "verified-proof-predecessor-append";
}): Promise<ReceizVerifiedArtifactOpenResult> {
  const extracted = await extractVerifiedReceizDocument(args);
  if (!extracted.ok) return extracted;
  const continuityVerified = extracted.verification.assetContinuity?.state === "verified";
  if (!extracted.nativeRecordSeal && !continuityVerified && args.purpose !== "verified-proof-predecessor-append") {
    return failedArtifactOpen(extracted.verification, "native_record_seal_required");
  }
  return {
    ...extracted,
    legacyCompatibility: extracted.nativeRecordSeal ? "current-native"
      : continuityVerified ? "verified-legacy-read" : "verified-proof-predecessor",
  };
}

export async function verifyReceizFolderFiles(args: {
  files: readonly {
    path: string;
    bytes: Uint8Array;
    mime?: string;
  }[];
  signingKey?: string;
  signatureV4RootPublicKeys?: ReceizSignatureV4RootPublicKeyMap | null;
}): Promise<ReceizArtifactVerificationResult> {
  const result = await tryVerifyFolderPackageFromFiles({
    files: args.files,
    signingKey: args.signingKey,
      signatureV4RootPublicKeys: args.signatureV4RootPublicKeys,
  });
  if (result) {
    return {
      ...result,
      integrity: { ok: result.ok, errors: result.errors },
    };
  }
  return buildInvalidResult(
    "unknown",
    ["No valid sealed package manifest found. Upload a sealed package ZIP or folder with its sealed manifest artifact."],
    [],
  );
}

export async function verifyReceizArtifactBytes(args: {
  pngBytes: Uint8Array;
  optionalLink?: string;
  signingKey?: string;
  signatureV4RootPublicKeys?: ReceizSignatureV4RootPublicKeyMap | null;
}): Promise<ReceizArtifactVerificationResult> {
  return verifyReceizDocumentBytes({
    fileBytes: args.pngBytes,
    filename: "artifact.png",
    mime: "image/png",
    optionalLink: args.optionalLink,
    signingKey: args.signingKey,
    signatureV4RootPublicKeys: args.signatureV4RootPublicKeys,
  });
}
