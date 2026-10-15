import {
  canonicalizeReceizConstitution,
  type ReceizConstitutionJson,
} from "./constitution.js";
import { digestReceizAuthority } from "./authorityEncoding.js";
import {
  authorityFailure,
  isReceizAuthorityFailure,
  type ReceizAuthorityFailure,
} from "./authorityResults.js";
import type {
  ReceizAdmissionAssessments,
  ReceizArtifactAdmissionOptions,
  ReceizArtifactAdmissionResult,
  ReceizVerifiedArtifactAdmission,
} from "./artifactAdmissionTypes.js";
import {
  deriveReceizVerifiedProofHistoryFromAdmission,
  mergeReceizVerifiedProofHistories,
  type ReceizProofHistory,
  type ReceizVerifiedProofHistory,
} from "./proofHistory.js";
import {
  RECEIZ_CURRENT_REGISTRY_DIGEST,
} from "./releaseIdentity.js";
import type {
  ReceizAdmissionCommitResult,
  ReceizAdmissionStore,
  ReceizAdmissionUnitOfWork,
} from "./admissionStore.js";
import {
  isReceizVerifiedCapability,
  type ReceizVerifiedCapability,
} from "./capabilityAuthority.js";
import { verifyReceizArtifactAdmission } from "./artifactAdmission.js";

export type ReceizArtifactRecoveryPlan = Readonly<{
  schema: "receiz.artifact-recovery-plan.v1";
  planDigest: string;
  registryDigest: string;
  artifactDigest: string;
  admissionProofDigest: string;
  verifierContextDigest: string;
  identityBindingDigest: string | null;
  historyVerificationDigest: string;
  recoveredStateDigest: string;
  assessmentsDigest: string;
  artifactId: string;
  requiredActorId: string | null;
  verdict: ReceizVerifiedArtifactAdmission["verdict"];
  priorHeadDigest: string | null;
  nextHeadDigest: string;
  recoveredState: Readonly<Record<string, unknown>>;
  proofHistory: ReceizVerifiedProofHistory;
  assessments: ReceizAdmissionAssessments;
  commitEligible: boolean;
  requiredOperation: "recovery.commit" | null;
  writesPerformed: 0;
  authority: Readonly<{
    planIsProofAuthority: false;
    explanationIsProofAuthority: false;
    strongerTruth: "sealed-receiz-proof-object";
  }>;
}>;

export type ReceizArtifactRecoveryResult = Readonly<{
  admission: ReceizArtifactAdmissionResult;
  recoveryPlan: ReceizArtifactRecoveryPlan | ReceizAuthorityFailure | null;
}>;

export type ReceizArtifactRecoveryCommitRejectionCode =
  | "PLAN_NOT_SDK_ISSUED"
  | "PLAN_AUTHORITY_MISMATCH"
  | "PLAN_DIGEST_MISMATCH"
  | "RECOVERY_NOT_COMMIT_ELIGIBLE"
  | "IDEMPOTENCY_KEY_REQUIRED"
  | "CAPABILITY_NOT_VERIFIED"
  | "CAPABILITY_OPERATION_MISMATCH"
  | "CAPABILITY_RESOURCE_MISMATCH"
  | "CAPABILITY_REGISTRY_MISMATCH"
  | "CAPABILITY_ACTOR_MISMATCH"
  | "CAPABILITY_EFFECTS_MISMATCH";

export type ReceizArtifactRecoveryCommitResult =
  | Extract<ReceizAdmissionCommitResult, { status: "committed" | "idempotent" }>
  | ReceizAuthorityFailure;

const sdkIssuedPlans = new WeakSet<object>();

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const nested of Object.values(value as Record<string, unknown>)) deepFreeze(nested);
  }
  return value;
}

function constitutionClone<T>(value: T): T {
  return JSON.parse(canonicalizeReceizConstitution(value)) as T;
}

function singleHead(history: ReceizProofHistory): string {
  if (history.headDigests.length !== 1) throw new Error("HISTORY_CONFLICT");
  return history.headDigests[0]!;
}

async function evidenceHistory(admission: ReceizVerifiedArtifactAdmission): Promise<ReceizVerifiedProofHistory> {
  return deriveReceizVerifiedProofHistoryFromAdmission(admission);
}

function recoveryPlanDigestBasis(plan: ReceizArtifactRecoveryPlan): unknown {
  const { planDigest: _planDigest, ...basis } = plan;
  return basis;
}

function rejected(code: ReceizArtifactRecoveryCommitRejectionCode): ReceizAuthorityFailure {
  return authorityFailure(code);
}

export async function commitReceizArtifactRecovery(
  plan: ReceizArtifactRecoveryPlan,
  capability: ReceizVerifiedCapability,
  idempotencyKey: string,
  store: ReceizAdmissionStore,
): Promise<ReceizArtifactRecoveryCommitResult> {
  if (!isSdkIssuedReceizArtifactRecoveryPlan(plan)) return rejected("PLAN_NOT_SDK_ISSUED");
  if (plan.registryDigest !== RECEIZ_CURRENT_REGISTRY_DIGEST) return rejected("PLAN_AUTHORITY_MISMATCH");
  if (await digestReceizAuthority("plan", "receiz.artifact-recovery-plan.v111", recoveryPlanDigestBasis(plan)) !== plan.planDigest) {
    return rejected("PLAN_DIGEST_MISMATCH");
  }
  if (!plan.commitEligible || plan.requiredOperation !== "recovery.commit"
    || (plan.verdict !== "canonical-identity" && plan.verdict !== "bearer-recovery")) {
    return rejected("RECOVERY_NOT_COMMIT_ELIGIBLE");
  }
  const stableIdempotencyKey = typeof idempotencyKey === "string" ? idempotencyKey.trim() : "";
  if (!stableIdempotencyKey) return rejected("IDEMPOTENCY_KEY_REQUIRED");
  if (!isReceizVerifiedCapability(capability)) return rejected("CAPABILITY_NOT_VERIFIED");
  if (!capability.payload.operations.includes("recovery.commit")) return rejected("CAPABILITY_OPERATION_MISMATCH");
  if (!capability.payload.resourceScopes.includes(plan.artifactId)) return rejected("CAPABILITY_RESOURCE_MISMATCH");
  if (capability.payload.registryDigest !== plan.registryDigest
    || plan.proofHistory.registryDigest !== plan.registryDigest) return rejected("CAPABILITY_REGISTRY_MISMATCH");
  if (plan.requiredActorId !== null && capability.payload.actorId !== plan.requiredActorId) {
    return rejected("CAPABILITY_ACTOR_MISMATCH");
  }
  if ((capability.payload.maximumEffects.recoveryCommits ?? 0) < 1) return rejected("CAPABILITY_EFFECTS_MISMATCH");

  const current = await store.readAggregate(plan.artifactId);
  const commandDigest = await digestReceizAuthority("operation", "receiz.artifact-recovery-command.v111", {
    schema: "receiz.artifact-recovery-command.v1",
    planDigest: plan.planDigest,
    artifactDigest: plan.artifactDigest,
    capabilityDigest: capability.digest,
    idempotencyKey: stableIdempotencyKey,
  });
  const operationIdentity = commandDigest;
  const receipt: ReceizConstitutionJson = {
    schema: "receiz.artifact-recovery-receipt.v1",
    operationIdentity,
    planDigest: plan.planDigest,
    artifactDigest: plan.artifactDigest,
    capabilityDigest: capability.digest,
    historyDigest: plan.proofHistory.historyDigest,
    priorHeadDigest: plan.priorHeadDigest,
    nextHeadDigest: plan.nextHeadDigest,
    authority: {
      receiptIsProofAuthority: false,
      strongerTruth: "sealed-receiz-proof-object",
    },
  };
  const unit: ReceizAdmissionUnitOfWork = {
    schema: "receiz.admission.unit-of-work.v1",
    aggregateId: plan.artifactId,
    commandDigest,
    idempotencyKey: stableIdempotencyKey,
    expectedRevision: current?.revision ?? 0,
    expectedHeadDigest: plan.priorHeadDigest,
    acceptedCommand: {
      schema: "receiz.artifact-recovery-command.v1",
      operationIdentity,
      planDigest: plan.planDigest,
      artifactDigest: plan.artifactDigest,
      actorId: capability.payload.actorId,
      capabilityDigest: capability.digest,
    },
    events: [
      {
        schema: "receiz.artifact-recovery-verification-evidence.v1",
        artifactDigest: plan.artifactDigest,
        planDigest: plan.planDigest,
        verdict: plan.verdict,
      },
      {
        schema: "receiz.artifact-recovery-projection.v1",
        recoveredState: constitutionClone(plan.recoveredState) as ReceizConstitutionJson,
      },
      {
        schema: "receiz.artifact-recovery-history.v1",
        historyDigest: plan.proofHistory.historyDigest,
        nextHeadDigest: plan.nextHeadDigest,
        proofHistory: plan.proofHistory as unknown as ReceizConstitutionJson,
      },
    ],
    nextHead: {
      revision: (current?.revision ?? 0) + 1,
      digest: plan.nextHeadDigest,
      state: constitutionClone(plan.recoveredState) as ReceizConstitutionJson,
    },
    resourceEffects: { recoveryCommits: 1 },
    receipt,
    outboxIntents: [{
      schema: "receiz.artifact-recovery-outbox.v1",
      operationIdentity,
      artifactId: plan.artifactId,
      nextHeadDigest: plan.nextHeadDigest,
    }],
    auditReference: {
      schema: "receiz.artifact-recovery-audit.v1",
      operationIdentity,
      planDigest: plan.planDigest,
      capabilityDigest: capability.digest,
    },
  };
  const result = await store.commit(unit);
  if (result.status === "committed" || result.status === "idempotent") return result;
  return authorityFailure(result.code, {
    status: result.status,
    ...(result.status === "conflict" && result.expectedRevision !== undefined
      ? { expectedRevision: result.expectedRevision }
      : {}),
    ...(result.status === "conflict" && "expectedHead" in result
      ? { expectedHead: result.expectedHead ?? null }
      : {}),
  });
}

async function mergeKnownHistory(
  base: ReceizVerifiedProofHistory,
  knownHistory: ReceizVerifiedProofHistory | undefined,
): Promise<ReceizVerifiedProofHistory> {
  if (!knownHistory) return base;
  const trustedReceiptDigests = new Set([
    ...base.nodes.map((node) => node.receiptDigest),
    ...knownHistory.nodes.map((node) => node.receiptDigest),
  ]);
  return mergeReceizVerifiedProofHistories(
    base,
    knownHistory,
    async (_receipt, digest) => trustedReceiptDigests.has(digest),
  );
}

function projectLatestState(
  admission: ReceizVerifiedArtifactAdmission,
  history: ReceizProofHistory,
): Readonly<Record<string, unknown>> {
  let projected = constitutionClone(admission.recoveredState) as Readonly<Record<string, unknown>>;
  for (const node of history.nodes) {
    if (node.event.type === "state.append" && node.event.state && typeof node.event.state === "object" && !Array.isArray(node.event.state)) {
      projected = constitutionClone(node.event.state) as Readonly<Record<string, unknown>>;
    }
  }
  return projected;
}

export function isSdkIssuedReceizArtifactRecoveryPlan(value: unknown): value is ReceizArtifactRecoveryPlan {
  return typeof value === "object" && value !== null && sdkIssuedPlans.has(value);
}

export async function planReceizArtifactRecovery(
  admission: ReceizArtifactAdmissionResult,
  knownHistory?: ReceizVerifiedProofHistory,
): Promise<ReceizArtifactRecoveryPlan | ReceizAuthorityFailure | null> {
  if (admission.verdict !== "canonical-identity"
    && admission.verdict !== "bearer-recovery"
    && admission.verdict !== "foreign-owner") return null;
  const verifiedAdmission = await verifyReceizArtifactAdmission(admission);
  if (isReceizAuthorityFailure(verifiedAdmission)) return verifiedAdmission;
  let history: ReceizVerifiedProofHistory;
  try {
    const baseHistory = verifiedAdmission.proofHistory ?? await evidenceHistory(verifiedAdmission);
    history = await mergeKnownHistory(baseHistory, knownHistory);
  } catch (error) {
    const code = error instanceof Error ? error.message : "HISTORY_NOT_VERIFIED";
    if (code === "HISTORY_CONFLICT") return authorityFailure("HISTORY_CONFLICT", { artifactId: verifiedAdmission.artifactId });
    if (code === "HISTORY_IDENTITY_MISMATCH") return authorityFailure("HISTORY_IDENTITY_MISMATCH", { artifactId: verifiedAdmission.artifactId });
    if (code === "STALE_HISTORY") return authorityFailure("HISTORY_STALE", { artifactId: verifiedAdmission.artifactId });
    return authorityFailure("HISTORY_NOT_VERIFIED", { artifactId: verifiedAdmission.artifactId });
  }
  const commitEligible = verifiedAdmission.verdict === "canonical-identity" || verifiedAdmission.verdict === "bearer-recovery";
  const recoveredState = projectLatestState(verifiedAdmission, history);
  const basis = {
    schema: "receiz.artifact-recovery-plan.v1" as const,
    registryDigest: verifiedAdmission.admissionProof.registryDigest,
    artifactDigest: verifiedAdmission.artifactSha256,
    admissionProofDigest: verifiedAdmission.admissionProof.admissionProofDigest,
    verifierContextDigest: verifiedAdmission.admissionProof.verifierContextDigest,
    identityBindingDigest: verifiedAdmission.admissionProof.identityBindingDigest,
    historyVerificationDigest: history.verification.verificationDigest,
    recoveredStateDigest: await digestReceizAuthority("state", "receiz.recovered-state.v111", recoveredState),
    assessmentsDigest: await digestReceizAuthority("admission", "receiz.admission-assessments.v112", verifiedAdmission.assessments),
    artifactId: verifiedAdmission.artifactId,
    requiredActorId: verifiedAdmission.profile === "identity"
      ? verifiedAdmission.actor.actorId
      : verifiedAdmission.ownerReceizId,
    verdict: verifiedAdmission.verdict,
    priorHeadDigest: knownHistory ? singleHead(knownHistory) : null,
    nextHeadDigest: singleHead(history),
    recoveredState,
    proofHistory: history,
    assessments: verifiedAdmission.assessments,
    commitEligible,
    requiredOperation: commitEligible ? "recovery.commit" as const : null,
    writesPerformed: 0 as const,
    authority: {
      planIsProofAuthority: false as const,
      explanationIsProofAuthority: false as const,
      strongerTruth: "sealed-receiz-proof-object" as const,
    },
  };
  const plan = deepFreeze({
    ...basis,
    planDigest: await digestReceizAuthority("plan", "receiz.artifact-recovery-plan.v111", basis),
  });
  sdkIssuedPlans.add(plan);
  return plan;
}

export function createReceizArtifactRecoveryCoordinator(dependencies: Readonly<{
  admit(
    verification: unknown,
    options: ReceizArtifactAdmissionOptions,
  ): Promise<ReceizArtifactAdmissionResult>;
}>) {
  return async function admitAndRecover(
    verification: unknown,
    options: ReceizArtifactAdmissionOptions,
  ): Promise<ReceizArtifactRecoveryResult> {
    const admission = await dependencies.admit(verification, options);
    const recoveryPlan = admission.verdict !== "canonical-identity"
      && admission.verdict !== "bearer-recovery"
      && admission.verdict !== "foreign-owner"
      ? null
      : await planReceizArtifactRecovery(
          admission,
          options.profile === "portable-state" ? options.verifiedHistory : undefined,
        );
    return deepFreeze({ admission, recoveryPlan });
  };
}
