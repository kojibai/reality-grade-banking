import { ReceizError } from "./errors.js";
import type { DocumentVerifyResponse } from "./index.js";
declare const receizArtifactBrand: unique symbol;
export type ReceizArtifactErrorCode = "artifact_payload_missing" | "artifact_record_failed" | "artifact_seal_failed" | "artifact_verification_failed" | "artifact_integrity_failed" | "artifact_signature_v4_required" | "artifact_owner_mismatch" | "artifact_claim_mismatch" | "artifact_payload_binding_mismatch" | "artifact_not_sdk_issued" | "artifact_download_unavailable" | "artifact_download_digest_mismatch" | "artifact_extraction_failed" | "artifact_legacy_unsupported" | "artifact_custody_conflict" | "artifact_ownership_failed";
export declare class ReceizArtifactError extends ReceizError<ReceizArtifactErrorCode> {
    readonly code: ReceizArtifactErrorCode;
    constructor(code: ReceizArtifactErrorCode);
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
    integrity: Readonly<{
        ok: true;
        errors: readonly [];
    }>;
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
export declare function snapshotSuccessfulArtifactVerification(value: DocumentVerifyResponse): ReceizSuccessfulArtifactVerification;
export declare function issueCurrentNativeArtifact(args: {
    artifact: Blob;
    filename: string;
    mimeType: string;
    artifactSha256: string;
    payloadSha256: string;
    payloadFilename?: string;
    payloadMimeType?: string;
    continuity: ReceizNativeArtifactContinuity;
    verification: DocumentVerifyResponse;
}): ReceizSealedArtifact;
export declare function issueVerifiedLegacyArtifact(args: {
    artifact: Blob;
    filename: string;
    mimeType: string;
    artifactSha256: string;
    payloadSha256: string;
    continuity: ReceizVerifiedLegacyContinuity;
    verification: DocumentVerifyResponse;
}): ReceizVerifiedLegacyArtifact;
export declare function issueVerifiedPayload(args: {
    bytes: Uint8Array;
    filename: string;
    mimeType: string;
    sha256: string;
}): ReceizVerifiedPayload;
export declare function assertSdkIssuedCurrentArtifact(value: unknown): asserts value is ReceizSealedArtifact;
export declare function assertSdkIssuedReadableArtifact(value: unknown): asserts value is ReceizSealedArtifact | ReceizVerifiedLegacyArtifact;
export declare function sha256ReceizBytes(bytes: Uint8Array): Promise<string>;
export declare function filenameFromContentDisposition(value: string | null): string | null;
export declare function mimeTypeFromResponse(value: string | null): string | null;
export declare function canonicalVerifyPath(value: string | null): string | null;
export declare function downloadReceizArtifact(value: ReceizSealedArtifact): Promise<ReceizArtifactDownloadEvidence>;
export {};
//# sourceMappingURL=artifacts.d.ts.map