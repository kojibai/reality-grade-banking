export type ReceizLocalAssetContinuity = Readonly<{
  state: "verified" | "historical_missing" | "invalid" | "not_applicable";
  carrier?: "portable_asset" | "ownership_provenance" | "native_record_seal";
  issuerKid?: string | null;
  artifactId?: string;
  headReference?: string;
  ownerReceizId?: string;
  namespace?: string;
  priorHeadReference?: string;
  genesisOwnerReceizId?: string;
  historyDigestSha256?: string;
  appendCount?: number;
  history?: readonly Readonly<Record<string, unknown>>[];
  historyComplete?: boolean;
  [key: string]: unknown;
}>;

export type ReceizLocalArtifactVerificationResult = Readonly<{
  ok: boolean;
  integrity: Readonly<{ ok: boolean; errors: string[] }>;
  kind: "png" | "pdf" | "heic-box" | "trailer" | "bundle" | "folder_package" | "unknown";
  errors: string[];
  warnings: string[];
  bundle: Readonly<Record<string, unknown>> | null;
  anchor: Readonly<Record<string, unknown>> | null;
  package: Readonly<Record<string, unknown>> | null;
  assetContinuity?: ReceizLocalAssetContinuity;
  denial?: Readonly<{
    status: "operational-denial";
    code: import("../verificationLimits.js").ReceizProtocolLimitCode;
    artifactValidity: "not-evaluated";
  }>;
}>;

export type ReceizLocalArtifactOpenResult =
  | Readonly<{
      ok: true;
      verification: ReceizLocalArtifactVerificationResult & { ok: true };
      artifactBytes: Uint8Array;
      payloadBytes: Uint8Array;
      payloadFilename: string;
      payloadMimeType: string;
      legacyCompatibility: "current-native" | "verified-legacy-read" | "verified-proof-predecessor";
    }>
  | Readonly<{
      ok: false;
      verification: ReceizLocalArtifactVerificationResult;
      error: string;
    }>;

export type ReceizLocalArtifactInput = Readonly<{
  fileBytes: Uint8Array;
  filename?: string;
  mimeType?: string;
}>;

export type {
  ReceizArtifactDigest,
  ReceizDigest,
  ReceizPayloadDigest,
} from "../artifactTransition.js";

export type ReceizArtifactVerification = ReceizLocalArtifactVerificationResult & Readonly<{
  ok: true;
  integrity: Readonly<{ ok: true; errors: readonly [] }>;
  errors: readonly [];
  bundle: Readonly<Record<string, unknown>>;
}>;

export type ReceizArtifactContinuityAssessment = ReceizLocalAssetContinuity;

export type ReceizArtifactVerificationError = Readonly<{
  code:
    | "ARTIFACT_INPUT_INVALID"
    | "ARTIFACT_VERIFICATION_FAILED"
    | "ARTIFACT_INTEGRITY_FAILED"
    | "ARTIFACT_PAYLOAD_BINDING_FAILED"
    | "ARTIFACT_CONTINUITY_FAILED";
  message: string;
}>;

export type ReceizUnsupportedArtifactReason =
  | "unsupported-carrier"
  | "unsupported-version"
  | "unsupported-proof-suite";
