import { RECEIZ_CURRENT_RELEASE_VERSION } from "./currentRelease.generated.js";
export declare const RECEIZ_V125_TEMPORAL_AUTHORITY_CONFORMANCE_SCHEMA: "receiz.temporal-authority.conformance.v125";
export declare const RECEIZ_V125_TEMPORAL_AUTHORITY_CHECK_IDS: readonly ["valid-kaisigil-proof-admitted", "bare-upulse-rejected", "kks-lattice-binding-enforced", "blake3-poseidon-binding-enforced", "groth16-public-signal-binding-enforced", "groth16-proof-verification-enforced", "previous-head-binding-enforced", "strictly-monotonic-append-enforced", "future-coordinate-rejected", "chronos-authority-rejected", "sealed-projection-preserves-exact-upulse"];
export type ReceizV125TemporalAuthorityCheckId = (typeof RECEIZ_V125_TEMPORAL_AUTHORITY_CHECK_IDS)[number];
export type ReceizV125TemporalAuthorityCheck = Readonly<{
    checkId: ReceizV125TemporalAuthorityCheckId;
    passed: boolean;
    outcomeCode: string;
    evidenceDigest: string;
}>;
export type ReceizV125TemporalAuthorityConformanceReport = Readonly<{
    schema: typeof RECEIZ_V125_TEMPORAL_AUTHORITY_CONFORMANCE_SCHEMA;
    releaseVersion: typeof RECEIZ_CURRENT_RELEASE_VERSION;
    qualified: boolean;
    passedChecks: readonly ReceizV125TemporalAuthorityCheckId[];
    failedChecks: readonly ReceizV125TemporalAuthorityCheckId[];
    checks: readonly ReceizV125TemporalAuthorityCheck[];
    authority: Readonly<{
        conformanceReportIsTemporalAuthority: false;
        strongerTruth: "verified-kks-coordinate-bound-kaisigil-proof";
        createdAtAuthority: false;
        chronosRole: "descriptive-projection-derived-from-kai-only";
    }>;
    reportDigest: string;
}>;
export declare function runReceizV125TemporalAuthorityConformance(): Promise<ReceizV125TemporalAuthorityConformanceReport>;
//# sourceMappingURL=v125TemporalAuthorityConformance.d.ts.map