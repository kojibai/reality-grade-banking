export const RECEIZ_AUTHORITY_FAILURE_CODES = [
  "INVALID_ARTIFACT",
  "ARTIFACT_TAMPERED",
  "INVALID_CARRIER",
  "PAYLOAD_NOT_ARTIFACT",
  "ARTIFACT_RESOURCE_LIMIT",
  "ADMISSION_NOT_VERIFIED",
  "ADMISSION_PROOF_INVALID",
  "ADMISSION_PROOF_MISMATCH",
  "ADMISSION_ARTIFACT_REVALIDATION_FAILED",
  "VERIFIER_CONTEXT_MISMATCH",
  "ACTOR_NOT_VERIFIED",
  "ACTOR_ADMISSION_MISMATCH",
  "ACTOR_PROOF_MISMATCH",
  "HISTORY_NOT_VERIFIED",
  "HISTORY_IDENTITY_MISMATCH",
  "HISTORY_CONFLICT",
  "HISTORY_STALE",
  "OWNER_MISMATCH",
  "SIGNING_AUTHORITY_NOT_PROVEN",
  "PLAN_NOT_SDK_ISSUED",
  "PLAN_DIGEST_MISMATCH",
  "PLAN_AUTHORITY_MISMATCH",
  "RECOVERY_NOT_COMMIT_ELIGIBLE",
  "IDEMPOTENCY_KEY_REQUIRED",
  "EXPECTED_REVISION_MISMATCH",
  "CAUSAL_PARENT_MISMATCH",
  "TRANSACTION_LIMIT_EXCEEDED",
  "UNIT_OF_WORK_INVALID",
  "READ_DEPENDENCY_MISMATCH",
  "PBI_RECEIPT_REPLAYED",
  "ATOMIC_GUARDS_UNSUPPORTED",
  "CAPABILITY_INVALID",
  "CAPABILITY_ISSUER_UNKNOWN",
  "CAPABILITY_SIGNATURE_INVALID",
  "CAPABILITY_NOT_YET_VALID",
  "CAPABILITY_EXPIRED",
  "CAPABILITY_REVOKED",
  "CAPABILITY_AUDIENCE_MISMATCH",
  "CAPABILITY_CONTEXT_MISMATCH",
  "CAPABILITY_ATTENUATION_VIOLATION",
  "CAPABILITY_NOT_VERIFIED",
  "CAPABILITY_OPERATION_MISMATCH",
  "CAPABILITY_RESOURCE_MISMATCH",
  "CAPABILITY_REGISTRY_MISMATCH",
  "CAPABILITY_ACTOR_MISMATCH",
  "CAPABILITY_EFFECTS_MISMATCH",
  "CAPABILITY_EFFECTS_MISMATCH",
  "CONFIRMATION_NOT_PENDING",
  "CONFIRMATION_CONSUMED",
  "IDEMPOTENCY_CONFLICT",
  "ATOMIC_COMMIT_FAILED",
  "NETWORK_UNAVAILABLE",
  "UNSUPPORTED_LEGACY_FORMAT",
] as const;

export type ReceizAuthorityFailureCode = (typeof RECEIZ_AUTHORITY_FAILURE_CODES)[number];

export type ReceizAuthorityFailure = Readonly<{
  ok: false;
  code: ReceizAuthorityFailureCode;
  details: Readonly<Record<string, unknown>>;
  writesPerformed: 0;
  authority: Readonly<{
    failureIsProofAuthority: false;
    strongerTruth: "sealed-receiz-proof-object";
  }>;
}>;

function cloneAndFreeze(value: unknown, ancestors = new Set<object>()): unknown {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError("AUTHORITY_FAILURE_DETAILS_INVALID");
    return value;
  }
  if (typeof value !== "object") throw new TypeError("AUTHORITY_FAILURE_DETAILS_INVALID");
  if (ancestors.has(value)) throw new TypeError("AUTHORITY_FAILURE_DETAILS_CYCLE");
  ancestors.add(value);
  try {
    if (Array.isArray(value)) return Object.freeze(value.map((entry) => cloneAndFreeze(entry, ancestors)));
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) throw new TypeError("AUTHORITY_FAILURE_DETAILS_INVALID");
    const output: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
    for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(value))) {
      if (!descriptor.enumerable) continue;
      if (!("value" in descriptor)) throw new TypeError("AUTHORITY_FAILURE_DETAILS_INVALID");
      output[key] = cloneAndFreeze(descriptor.value, ancestors);
    }
    return Object.freeze({ ...output });
  } finally {
    ancestors.delete(value);
  }
}

export function authorityFailure(
  code: ReceizAuthorityFailureCode,
  details: Readonly<Record<string, unknown>> = {},
): ReceizAuthorityFailure {
  const result: ReceizAuthorityFailure = {
    ok: false,
    code,
    details: cloneAndFreeze(details) as Readonly<Record<string, unknown>>,
    writesPerformed: 0,
    authority: Object.freeze({
      failureIsProofAuthority: false,
      strongerTruth: "sealed-receiz-proof-object",
    }),
  };
  return Object.freeze(result);
}

export function isReceizAuthorityFailure(value: unknown): value is ReceizAuthorityFailure {
  if (value === null || typeof value !== "object") return false;
  const candidate = value as Partial<ReceizAuthorityFailure>;
  return candidate.ok === false
    && typeof candidate.code === "string"
    && RECEIZ_AUTHORITY_FAILURE_CODES.includes(candidate.code as ReceizAuthorityFailureCode)
    && candidate.writesPerformed === 0
    && candidate.authority?.failureIsProofAuthority === false
    && candidate.authority.strongerTruth === "sealed-receiz-proof-object";
}
