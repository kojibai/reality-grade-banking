import { type ReceizArtifactInput, type ReceizArtifactSnapshot } from "./artifactInput.js";
import type { ReceizSignatureV4RootPublicKey } from "./verifier/signatureV4.js";
import type { ReceizArtifactContinuityAssessment, ReceizArtifactDigest, ReceizArtifactVerification, ReceizArtifactVerificationError, ReceizPayloadDigest, ReceizUnsupportedArtifactReason } from "./verifier/types.js";
import { type ReceizProtocolLimitCode } from "./verificationLimits.js";
export type { ReceizArtifactContinuityAssessment, ReceizArtifactDigest, ReceizArtifactVerification, ReceizArtifactVerificationError, ReceizPayloadDigest, ReceizUnsupportedArtifactReason, } from "./verifier/types.js";
export type ReceizArtifactVerificationResult = Readonly<{
    status: "invalid";
    errors: readonly ReceizArtifactVerificationError[];
}> | Readonly<{
    status: "denied";
    code: ReceizProtocolLimitCode;
    artifactValidity: "not-evaluated";
}> | Readonly<{
    status: "unsupported";
    reason: ReceizUnsupportedArtifactReason;
    detectedVersion?: string;
    detectedProofSuite?: string;
}> | Readonly<{
    status: "verified-artifact";
    verification: ReceizArtifactVerification;
    artifactDigest: ReceizArtifactDigest;
    payloadDigest: ReceizPayloadDigest;
    continuity: ReceizArtifactContinuityAssessment;
    admission: "not-evaluated";
    operationAuthority: "not-evaluated";
}>;
export declare function assertRuntimeCustodiedReceizArtifactVerification(value: ReceizArtifactVerificationResult): asserts value is Extract<ReceizArtifactVerificationResult, {
    status: "verified-artifact";
}>;
export declare function readRuntimeCustodiedReceizArtifactSnapshot(value: ReceizArtifactVerificationResult): Promise<ReceizArtifactSnapshot>;
/**
 * Reuses payload bytes already extracted by the exact canonical verification
 * that issued this runtime-custodied result. It returns null when the
 * admission engine is using a different root set, forcing that engine to
 * perform a fresh canonical open under its own roots.
 */
export declare function readRuntimeCustodiedReceizArtifactCanonicalOpen(value: ReceizArtifactVerificationResult, roots: ReadonlyMap<string, ReceizSignatureV4RootPublicKey>): Promise<Readonly<{
    payloadBytes: Uint8Array;
    payloadFilename: string;
    payloadMimeType: string;
}> | null>;
/** Package-internal reuse of the verifier context that issued this exact
 * runtime. A transported root map never supplies this context. */
export declare function readRuntimeCustodiedReceizArtifactVerifierRoots(value: ReceizArtifactVerificationResult): ReadonlyMap<string, ReceizSignatureV4RootPublicKey>;
/** Package-internal verified read payload. This also retains legacy read-only
 * truth and deliberately does not change append/admission open custody. */
export declare function readRuntimeCustodiedReceizArtifactCanonicalRead(value: ReceizArtifactVerificationResult): Promise<Readonly<{
    payloadBytes: Uint8Array;
    payloadFilename: string;
    payloadMimeType: string;
}> | null>;
/**
 * INTERNAL verifier-mechanics entry for canonical fixtures whose roots are
 * supplied by the admission engine's existing dependency boundary. It is not
 * exported from the package index or package export map.
 */
export declare function verifyReceizArtifactWithCanonicalRoots(input: ReceizArtifactInput, signatureV4RootPublicKeys: ReadonlyMap<string, ReceizSignatureV4RootPublicKey>): Promise<ReceizArtifactVerificationResult>;
export declare function verifyReceizArtifact(input: ReceizArtifactInput): Promise<ReceizArtifactVerificationResult>;
/** Package-internal host execution policy. Same canonical verification and
 * runtime custody issuance; never a proof-validity or issuer override.
 * Existing public callers retain their universal 16 MiB runtime default.
 */
export declare function verifyReceizArtifactWithExecutionCapacity(input: Uint8Array, execution: Readonly<{
    maxExactArtifactBytes: number;
    maxDecompressedArchiveBytes?: number;
}>, signatureV4RootPublicKeys?: ReadonlyMap<string, ReceizSignatureV4RootPublicKey>): Promise<ReceizArtifactVerificationResult>;
//# sourceMappingURL=artifactVerification.d.ts.map