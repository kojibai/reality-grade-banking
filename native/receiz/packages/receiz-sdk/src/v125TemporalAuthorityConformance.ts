import { RECEIZ_CURRENT_RELEASE_VERSION } from "./currentRelease.generated.js";
import { canonicalizeReceizV122 } from "./v122Canonical.js";
import {
  admitReceizKksV1ProofCoordinate,
  projectReceizKksV1SealedProofCoordinate,
} from "./v125KaiAuthority.js";
import { RECEIZ_V125_TEMPORAL_AUTHORITY_VALID_VECTOR } from "./v125TemporalAuthorityConformanceVector.js";
import { sha256Hex } from "./verifier/crypto.js";

export const RECEIZ_V125_TEMPORAL_AUTHORITY_CONFORMANCE_SCHEMA =
  "receiz.temporal-authority.conformance.v125" as const;

export const RECEIZ_V125_TEMPORAL_AUTHORITY_CHECK_IDS = Object.freeze([
  "valid-kaisigil-proof-admitted",
  "bare-upulse-rejected",
  "kks-lattice-binding-enforced",
  "blake3-poseidon-binding-enforced",
  "groth16-public-signal-binding-enforced",
  "groth16-proof-verification-enforced",
  "previous-head-binding-enforced",
  "strictly-monotonic-append-enforced",
  "future-coordinate-rejected",
  "chronos-authority-rejected",
  "sealed-projection-preserves-exact-upulse",
] as const);

export type ReceizV125TemporalAuthorityCheckId =
  (typeof RECEIZ_V125_TEMPORAL_AUTHORITY_CHECK_IDS)[number];

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

type CheckExecution = Readonly<{
  passed: boolean;
  outcomeCode: string;
}>;

function errorCode(error: unknown): string {
  return error instanceof Error && error.message ? error.message : "UNKNOWN_ERROR";
}

async function rejectsWith(
  operation: () => Promise<unknown>,
  expectedCode: string,
): Promise<CheckExecution> {
  try {
    await operation();
    return Object.freeze({ passed: false, outcomeCode: "EXPECTED_REJECTION_MISSING" });
  } catch (error) {
    const actual = errorCode(error);
    return Object.freeze({
      passed: actual === expectedCode,
      outcomeCode: actual,
    });
  }
}

function cloneVector(): Record<string, unknown> {
  return structuredClone(RECEIZ_V125_TEMPORAL_AUTHORITY_VALID_VECTOR) as unknown as Record<string, unknown>;
}

async function executeCheck(checkId: ReceizV125TemporalAuthorityCheckId): Promise<CheckExecution> {
  const maximumInclusiveKaiUpulse = RECEIZ_V125_TEMPORAL_AUTHORITY_VALID_VECTOR.kaiUpulse;
  switch (checkId) {
    case "valid-kaisigil-proof-admitted": {
      const admitted = await admitReceizKksV1ProofCoordinate(
        RECEIZ_V125_TEMPORAL_AUTHORITY_VALID_VECTOR,
        { maximumInclusiveKaiUpulse },
      );
      return Object.freeze({
        passed: admitted.kaiSigil.proofHead === RECEIZ_V125_TEMPORAL_AUTHORITY_VALID_VECTOR.kaiSigil.proofHead
          && admitted.kaiUpulse === maximumInclusiveKaiUpulse,
        outcomeCode: "VALID_KAISIGIL_PROOF_ADMITTED",
      });
    }
    case "bare-upulse-rejected":
      return rejectsWith(
        () => admitReceizKksV1ProofCoordinate({
          schema: "receiz.kks-v1.proof-coordinate.v1",
          kksVersion: "KKSv1.0",
          kaiPulse: "1000",
          kaiUpulse: maximumInclusiveKaiUpulse,
          source: "sealed-carried-coordinate",
        }),
        "V125_KKS_PROOF_COORDINATE_SHAPE_INVALID",
      );
    case "kks-lattice-binding-enforced": {
      const candidate = cloneVector();
      (candidate.kaiSigil as { payload: { beat: number } }).payload.beat = 3;
      return rejectsWith(
        () => admitReceizKksV1ProofCoordinate(candidate, { maximumInclusiveKaiUpulse }),
        "V125_KAI_SIGIL_KKS_LATTICE_MISMATCH",
      );
    }
    case "blake3-poseidon-binding-enforced": {
      const candidate = cloneVector();
      (candidate.kaiSigil as { payloadHashBlake3: string }).payloadHashBlake3 = "0".repeat(64);
      return rejectsWith(
        () => admitReceizKksV1ProofCoordinate(candidate, { maximumInclusiveKaiUpulse }),
        "V125_KAI_SIGIL_COMMITMENT_MISMATCH",
      );
    }
    case "groth16-public-signal-binding-enforced": {
      const candidate = cloneVector();
      const groth16 = (candidate.kaiSigil as { groth16: { publicSignals: string[] } }).groth16;
      groth16.publicSignals[0] = "0";
      return rejectsWith(
        () => admitReceizKksV1ProofCoordinate(candidate, { maximumInclusiveKaiUpulse }),
        "V125_KAI_SIGIL_GROTH16_PUBLIC_SIGNAL_MISMATCH",
      );
    }
    case "groth16-proof-verification-enforced": {
      const candidate = cloneVector();
      const proof = (candidate.kaiSigil as { groth16: { proof: { pi_a: string[] } } }).groth16.proof;
      proof.pi_a[0] = "1";
      return rejectsWith(
        () => admitReceizKksV1ProofCoordinate(candidate, { maximumInclusiveKaiUpulse }),
        "V125_KAI_SIGIL_GROTH16_VERIFICATION_FAILED",
      );
    }
    case "previous-head-binding-enforced":
      return rejectsWith(
        () => admitReceizKksV1ProofCoordinate(RECEIZ_V125_TEMPORAL_AUTHORITY_VALID_VECTOR, {
          expectedPreviousKaiSigilProofHead: "0".repeat(64),
          maximumInclusiveKaiUpulse,
        }),
        "V125_KAI_SIGIL_PREVIOUS_HEAD_MISMATCH",
      );
    case "strictly-monotonic-append-enforced":
      return rejectsWith(
        () => admitReceizKksV1ProofCoordinate(RECEIZ_V125_TEMPORAL_AUTHORITY_VALID_VECTOR, {
          minimumExclusiveKaiUpulse: maximumInclusiveKaiUpulse,
          maximumInclusiveKaiUpulse,
        }),
        "V125_KAI_SIGIL_KAI_NONCAUSAL",
      );
    case "future-coordinate-rejected":
      return rejectsWith(
        () => admitReceizKksV1ProofCoordinate(RECEIZ_V125_TEMPORAL_AUTHORITY_VALID_VECTOR, {
          maximumInclusiveKaiUpulse: "1000000003",
        }),
        "V125_KAI_SIGIL_KAI_FROM_FUTURE",
      );
    case "chronos-authority-rejected": {
      const candidate = cloneVector();
      candidate.createdAt = "2026-09-04T00:00:00.000Z";
      return rejectsWith(
        () => admitReceizKksV1ProofCoordinate(candidate, { maximumInclusiveKaiUpulse }),
        "V125_KKS_PROOF_COORDINATE_SHAPE_INVALID",
      );
    }
    case "sealed-projection-preserves-exact-upulse": {
      const projection = await projectReceizKksV1SealedProofCoordinate(
        RECEIZ_V125_TEMPORAL_AUTHORITY_VALID_VECTOR,
        { maximumInclusiveKaiUpulse },
      );
      return Object.freeze({
        passed: projection.coordinate.kaiUpulse === maximumInclusiveKaiUpulse
          && projection.moment.uPulse === Number(maximumInclusiveKaiUpulse)
          && projection.moment.authority.strongerTruth === "sealed-kai-creation-upulse",
        outcomeCode: "SEALED_EXACT_UPULSE_PRESERVED",
      });
    }
  }
}

export async function runReceizV125TemporalAuthorityConformance(): Promise<ReceizV125TemporalAuthorityConformanceReport> {
  const checks: ReceizV125TemporalAuthorityCheck[] = [];
  for (const checkId of RECEIZ_V125_TEMPORAL_AUTHORITY_CHECK_IDS) {
    let execution: CheckExecution;
    try {
      execution = await executeCheck(checkId);
    } catch (error) {
      execution = Object.freeze({ passed: false, outcomeCode: errorCode(error) });
    }
    const evidenceBasis = Object.freeze({ checkId, ...execution });
    checks.push(Object.freeze({
      ...evidenceBasis,
      evidenceDigest: await sha256Hex(canonicalizeReceizV122(evidenceBasis)),
    }));
  }
  const passedChecks = checks.filter((check) => check.passed).map((check) => check.checkId);
  const failedChecks = checks.filter((check) => !check.passed).map((check) => check.checkId);
  const basis = Object.freeze({
    schema: RECEIZ_V125_TEMPORAL_AUTHORITY_CONFORMANCE_SCHEMA,
    releaseVersion: RECEIZ_CURRENT_RELEASE_VERSION,
    qualified: failedChecks.length === 0,
    passedChecks: Object.freeze(passedChecks),
    failedChecks: Object.freeze(failedChecks),
    checks: Object.freeze(checks),
    authority: Object.freeze({
      conformanceReportIsTemporalAuthority: false as const,
      strongerTruth: "verified-kks-coordinate-bound-kaisigil-proof" as const,
      createdAtAuthority: false as const,
      chronosRole: "descriptive-projection-derived-from-kai-only" as const,
    }),
  });
  return Object.freeze({
    ...basis,
    reportDigest: await sha256Hex(canonicalizeReceizV122(basis)),
  });
}
