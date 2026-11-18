export declare const RECEIZ_OFFLINE_NOTE_CUSTODY_CONFORMANCE_SCHEMA: "receiz.offline-note.custody-conformance.v1";
export declare const RECEIZ_OFFLINE_NOTE_CUSTODY_CHECK_IDS: readonly ["exact-head-consumes-once", "different-successor-rejected", "restored-pre-send-state-rejected", "missing-state-fails-closed", "repeated-state-fails-closed", "decreased-state-fails-closed", "unexpectedly-advanced-state-fails-closed", "backup-eligible-state-rejected", "crash-after-consume-never-reactivates", "receiver-binding-preserved", "whole-value-preserved"];
export type ReceizOfflineNoteCustodyCheckId = (typeof RECEIZ_OFFLINE_NOTE_CUSTODY_CHECK_IDS)[number];
export type ReceizOfflineNoteCustodyCheckEvidence = Readonly<{
    checkId: ReceizOfflineNoteCustodyCheckId;
    passed: boolean;
    evidenceDigest: string;
    outcomeCode: "PASS" | "FAIL" | "MISSING" | "ERROR";
}>;
export type ReceizOfflineNoteCustodyConformanceReportV1 = Readonly<{
    schema: typeof RECEIZ_OFFLINE_NOTE_CUSTODY_CONFORMANCE_SCHEMA;
    profileId: string;
    observedEnvironmentDigest: string;
    qualified: boolean;
    passedChecks: readonly ReceizOfflineNoteCustodyCheckId[];
    failedChecks: readonly ReceizOfflineNoteCustodyCheckId[];
    checks: readonly ReceizOfflineNoteCustodyCheckEvidence[];
    reportDigest: string;
}>;
export type ReceizOfflineNoteCustodyProbe = () => Promise<Readonly<{
    passed: boolean;
    evidenceDigest: string;
}>>;
export declare function runReceizOfflineNoteCustodyConformance(input: Readonly<{
    profileId: string;
    observedEnvironmentDigest: string;
    probes: Partial<Record<ReceizOfflineNoteCustodyCheckId, ReceizOfflineNoteCustodyProbe>>;
}>): Promise<ReceizOfflineNoteCustodyConformanceReportV1>;
//# sourceMappingURL=offlineNoteCustodyConformance.d.ts.map