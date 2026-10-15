import { digestReceizAuthority } from "./authorityEncoding.js";

export const RECEIZ_OFFLINE_NOTE_CUSTODY_CONFORMANCE_SCHEMA =
  "receiz.offline-note.custody-conformance.v1" as const;

export const RECEIZ_OFFLINE_NOTE_CUSTODY_CHECK_IDS = Object.freeze([
  "exact-head-consumes-once",
  "different-successor-rejected",
  "restored-pre-send-state-rejected",
  "missing-state-fails-closed",
  "repeated-state-fails-closed",
  "decreased-state-fails-closed",
  "unexpectedly-advanced-state-fails-closed",
  "backup-eligible-state-rejected",
  "crash-after-consume-never-reactivates",
  "receiver-binding-preserved",
  "whole-value-preserved",
] as const);

export type ReceizOfflineNoteCustodyCheckId =
  (typeof RECEIZ_OFFLINE_NOTE_CUSTODY_CHECK_IDS)[number];

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

const SHA256_RE = /^[0-9a-f]{64}$/;
const MISSING_EVIDENCE_DIGEST = "00".repeat(32);
const ERROR_EVIDENCE_DIGEST = "ff".repeat(32);

export async function runReceizOfflineNoteCustodyConformance(input: Readonly<{
  profileId: string;
  observedEnvironmentDigest: string;
  probes: Partial<Record<ReceizOfflineNoteCustodyCheckId, ReceizOfflineNoteCustodyProbe>>;
}>): Promise<ReceizOfflineNoteCustodyConformanceReportV1> {
  const profileId = input.profileId.trim();
  if (!profileId || !SHA256_RE.test(input.observedEnvironmentDigest)) {
    throw new TypeError("RECEIZ_OFFLINE_NOTE_CUSTODY_CONFORMANCE_INPUT_INVALID");
  }
  const checks: ReceizOfflineNoteCustodyCheckEvidence[] = [];
  for (const checkId of RECEIZ_OFFLINE_NOTE_CUSTODY_CHECK_IDS) {
    const probe = input.probes[checkId];
    if (!probe) {
      checks.push(Object.freeze({
        checkId,
        passed: false,
        evidenceDigest: MISSING_EVIDENCE_DIGEST,
        outcomeCode: "MISSING" as const,
      }));
      continue;
    }
    try {
      const result = await probe();
      if (!SHA256_RE.test(result.evidenceDigest)) {
        checks.push(Object.freeze({
          checkId,
          passed: false,
          evidenceDigest: ERROR_EVIDENCE_DIGEST,
          outcomeCode: "ERROR" as const,
        }));
        continue;
      }
      checks.push(Object.freeze({
        checkId,
        passed: result.passed,
        evidenceDigest: result.evidenceDigest,
        outcomeCode: result.passed ? "PASS" as const : "FAIL" as const,
      }));
    } catch {
      checks.push(Object.freeze({
        checkId,
        passed: false,
        evidenceDigest: ERROR_EVIDENCE_DIGEST,
        outcomeCode: "ERROR" as const,
      }));
    }
  }
  const passedChecks = checks.filter((check) => check.passed).map((check) => check.checkId);
  const failedChecks = checks.filter((check) => !check.passed).map((check) => check.checkId);
  const basis = Object.freeze({
    schema: RECEIZ_OFFLINE_NOTE_CUSTODY_CONFORMANCE_SCHEMA,
    profileId,
    observedEnvironmentDigest: input.observedEnvironmentDigest,
    qualified: failedChecks.length === 0,
    passedChecks: Object.freeze(passedChecks),
    failedChecks: Object.freeze(failedChecks),
    checks: Object.freeze(checks),
  });
  return Object.freeze({
    ...basis,
    reportDigest: await digestReceizAuthority(
      "registry",
      RECEIZ_OFFLINE_NOTE_CUSTODY_CONFORMANCE_SCHEMA,
      basis,
    ),
  });
}
