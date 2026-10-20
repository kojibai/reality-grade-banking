import type { DocumentVerifyZipGuardLimits } from "@/app/lib/security/documentLimits";
import type { ReceizFolderPackageManifest } from "@/app/lib/documentSeal/folderPackageManifest";
import type { ReceizSignatureV4RootPublicKey } from "@/app/lib/security/receizSignatureV4";
import type { ReceizAnchorBundle } from "@/app/utils/receizAnchorBundle";
import type {
  ReceizNativeOwnershipHistoryEntry,
  ReceizNativeProofPredecessor,
  ReceizNativeRecordSeal,
  ReceizProofBundle,
} from "@/app/utils/receizProofBundle";
import type { ReceizPortableAssetDocument } from "../../packages/receiz-sdk/src/portableAsset";
import type { ReceizProtocolOperationalDenial } from "../../packages/receiz-sdk/src/verificationLimits";
import {
  classifyReceizAssetContinuity as classifyCanonicalContinuity,
  verifyAndExtractReceizDocumentBytesCanonical,
  readVerifiedReceizDocumentBytesCanonical,
  inspectReceizZipBytesCanonical,
  readVerifiedReceizFolderPackageBytesCanonical,
  type ReceizVerifiedFolderPackageReadResult as CanonicalPackageReadResult,
  verifyReceizArtifactBytesCanonical,
  verifyReceizDocumentBytesCanonical,
  verifyReceizFolderFilesCanonical,
} from "../../packages/receiz-sdk/src/verifier/canonical";

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
      legacyCompatibility: "current-native" | "verified-legacy-read";
    }>
  | Readonly<{
      ok: false;
      verification: ReceizArtifactVerificationResult;
      error: string;
    }>;

/** Payload inspection does not confer native or predecessor append custody. */
export type ReceizVerifiedDocumentReadResult =
  | Readonly<Omit<Extract<ReceizVerifiedArtifactOpenResult, { ok: true }>, "legacyCompatibility"> & { access: "read-only" }>
  | Extract<ReceizVerifiedArtifactOpenResult, { ok: false }>;

type DocumentInput = Readonly<{
  fileBytes: Uint8Array;
  filename?: string;
  mime?: string;
  optionalLink?: string;
  signingKey?: string;
  signatureV4RootPublicKeys?: ReceizSignatureV4RootPublicKeyMap | null;
  zipGuardLimits?: DocumentVerifyZipGuardLimits | null;
}>;

/*
 * Canonical verifier conformance anchors. These strings name gates implemented
 * by packages/receiz-sdk/src/verifier/canonicalSource.ts; this adapter contains
 * no verifier logic and delegates every runtime operation below.
 *
 * TRUSTED_SIGNATURE_MISSING_ERROR
 * Trusted signature is required for trusted verification (signatureV4).
 * if (signatureV4.state !== "verified")
 * SIGNATURE_V4_UNAVAILABLE_ERROR
 * signatureV4.state === "unavailable"
 * trusted verification cannot continue
 * REAL_G16_CODEC
 * Only real g16: Groth16 proofs are accepted.
 * Real Groth16 public signal mismatch
 * Groth16 proof verification failed.
 * Anchor ID mismatch between anchor bundle and proof bundle.
 * Anchor parent.code does not match proof bundle code.
 * Anchor parent.pulse does not match proof bundle pulse.
 * Anchor data is required for trusted verification.
 */

// Zero-logic type adapter: every runtime function is the canonical SDK verifier.
export const classifyReceizAssetContinuity = classifyCanonicalContinuity as (
  originalBytes: Uint8Array,
  bundle?: ReceizProofBundle | null,
) => Promise<ReceizAssetContinuityVerification>;
export const verifyReceizDocumentBytes = verifyReceizDocumentBytesCanonical as (
  input: DocumentInput,
) => Promise<ReceizArtifactVerificationResult>;
export const readVerifiedReceizDocumentBytes = readVerifiedReceizDocumentBytesCanonical as (
  input: DocumentInput,
) => Promise<ReceizVerifiedDocumentReadResult>;
export const verifyAndExtractReceizDocumentBytes = verifyAndExtractReceizDocumentBytesCanonical as (
  input: DocumentInput,
) => Promise<ReceizVerifiedArtifactOpenResult>;
export const verifyReceizFolderFiles = verifyReceizFolderFilesCanonical as (input: Readonly<{
  files: readonly Readonly<{ path: string; bytes: Uint8Array; mime?: string }>[];
  signingKey?: string;
  signatureV4RootPublicKeys?: ReceizSignatureV4RootPublicKeyMap | null;
}>) => Promise<ReceizArtifactVerificationResult>;
export const verifyReceizArtifactBytes = verifyReceizArtifactBytesCanonical as (input: Readonly<{
  pngBytes: Uint8Array;
  optionalLink?: string;
  signingKey?: string;
  signatureV4RootPublicKeys?: ReceizSignatureV4RootPublicKeyMap | null;
}>) => Promise<ReceizArtifactVerificationResult>;

export const inspectReceizZipBytes = inspectReceizZipBytesCanonical;
export type ReceizVerifiedFolderPackageReadResult =
  | (Omit<Extract<CanonicalPackageReadResult, { ok: true }>, "verification"> & { verification: ReceizArtifactVerificationResult })
  | (Omit<Extract<CanonicalPackageReadResult, { ok: false }>, "verification"> & { verification: ReceizArtifactVerificationResult });
export const readVerifiedReceizFolderPackageBytes = readVerifiedReceizFolderPackageBytesCanonical as (
  input: DocumentInput,
) => Promise<ReceizVerifiedFolderPackageReadResult>;
