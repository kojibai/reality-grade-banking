import type { ReceizVerifiedIdentityArtifactAdmission } from "./artifactAdmissionTypes.js";
export type ReceizVerifiedHistoricalIdentityKeyStateEvidence = Readonly<{
    schema: "receiz.verified-historical-identity-key-state-evidence.v113";
    issuerKeyId: string;
    actorId: string;
    registryDigest: string;
    observedThroughKai: string;
    revokedAtKai: string | null;
    identityArtifactDigest: string;
    admissionDigest: string;
    verifierEvidenceDigest: string;
}>;
export type ReceizHistoricalIdentityKeyRevocationState = Readonly<{
    schema: "receiz.historical-identity-key-revocation-state.v113";
    issuerKeyId: string;
    actorId: string;
    registryDigest: string;
    observedThroughKai: string;
    revokedAtKai: string | null;
    verifierEvidenceDigest: string;
    priorSnapshotDigest: string | null;
    snapshotDigest: string;
}>;
export declare function isRuntimeCustodiedReceizVerifiedHistoricalIdentityKeyStateEvidence(value: unknown): value is ReceizVerifiedHistoricalIdentityKeyStateEvidence;
export declare function isRuntimeCustodiedReceizHistoricalIdentityKeyRevocationState(value: unknown): value is ReceizHistoricalIdentityKeyRevocationState;
/**
 * Reopens an SDK-custodied identity admission and verifies the signed key-state
 * snapshot carried by the exact sealed Identity artifact. Neither a registry
 * effective Kai nor a caller-supplied revoked-key set can create this evidence.
 */
export declare function verifyReceizIdentityKeyStateArtifactAdmission(admission: ReceizVerifiedIdentityArtifactAdmission): Promise<ReceizVerifiedHistoricalIdentityKeyStateEvidence>;
/**
 * @internal Advances one monotonic historical key-state snapshot from exact,
 * runtime-custodied Identity artifact evidence. Kai facts are never accepted
 * directly from a caller.
 */
export declare function observeReceizHistoricalIdentityKeyState(input: Readonly<{
    keyStateEvidence: ReceizVerifiedHistoricalIdentityKeyStateEvidence;
    previous?: ReceizHistoricalIdentityKeyRevocationState;
}>): Promise<ReceizHistoricalIdentityKeyRevocationState>;
//# sourceMappingURL=historicalHandoffCustody.d.ts.map