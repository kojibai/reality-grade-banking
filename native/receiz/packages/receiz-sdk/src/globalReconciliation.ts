import { RECEIZ_CURRENT_APPLICATION_OPERATION_MATRIX_DIGEST } from "./appContract.js";
import { RECEIZ_V114_REGISTRY_DIGEST } from "./releaseIdentity.js";
import {
  isSdkAdmittedReceizCapabilityIssuerKey,
  rederiveReceizBoundedProfileShowcaseCarrierFromAdmission,
  verifyReceizArtifactAdmission,
  verifyReceizVerifiedActorReference,
} from "./artifactAdmission.js";
import type {
  ReceizCapabilityIssuerKey,
  ReceizCapabilityIssuerResolver,
  ReceizVerifiedArtifactAdmission,
} from "./artifactAdmissionTypes.js";
import { snapshotReceizArtifactInput, type ReceizArtifactInput } from "./artifactInput.js";
import { digestReceizAuthority } from "./authorityEncoding.js";
import type { ReceizCapabilityPayload, ReceizReconciliationCapabilityPayload } from "./capabilityAuthority.js";
import {
  capabilitySigningBytes,
  isReceizVerifiedReconciliationCapability,
  signReceizCapability,
} from "./capabilityAuthority.js";
import type {
  ReceizArtifactDigest,
  ReceizCapabilityDigest,
  ReceizEffectsDigest,
  ReceizHistoryDigest,
  ReceizIdempotencyDigest,
  ReceizRegistryDigest,
} from "./artifactTransition.js";
import type { ReceizAppendReceipt } from "./artifactTransitionStore.js";
import {
  RECEIZ_V113_GLOBAL_COMMIT_DOMAIN,
  type ReceizAcceptedHeadExpectation,
  type ReceizApplicationOperationMatrixDigest,
  type ReceizOfflineReconciliationPlan,
  type ReceizOfflineReconciliationPreparationResult,
  type ReceizOwnershipHandoffAuthorityReceipt,
  type ReceizReconciliationAttemptId,
  type ReceizReconciliationCommitConfirmation,
  type ReceizReconciliationDivergence,
  type ReceizReconciliationPlanDigest,
  type ReceizReconciliationStageConfirmation,
  type ReceizVerifiedReconciliationCommitCommand,
  type ReceizTenantId,
  type ReceizVerifiedArtifact,
  type ReceizVerifiedBoundedProfileShowcaseArtifact,
  type ReceizVerifiedMergeArtifactResolver,
} from "./globalCoordinationTypes.js";
import {
  isRuntimeCustodiedReceizOfflineReconciliationPlan,
  isRuntimeCustodiedReceizStagedReconciliationReference,
  isRuntimeVerifiedReceizArtifact,
  isRuntimeVerifiedReceizReconciliationCommitCommand,
  registerRuntimeCustodiedReceizOfflineReconciliationPlan,
  registerRuntimeVerifiedReceizArtifact,
} from "./reconciliationCustody.js";
import {
  isRuntimeCustodiedReceizHistoricalIdentityKeyRevocationState,
  type ReceizHistoricalIdentityKeyRevocationState,
} from "./historicalHandoffCustody.js";
import {
  receizBase64UrlDecode,
  type ReceizKeyFile,
} from "./identity.js";
import {
  verifyReceizProofHistory,
  type ReceizProofHistoryNode,
  type ReceizVerifiedProofHistory,
} from "./proofHistory.js";
import { assertReceizReconciliationAdditionBudget } from "./verificationLimits.js";

const KAI_RE = /^(0|[1-9][0-9]*)$/;
const verifiedBoundedProfileShowcaseArtifacts = new WeakSet<object>();

function freeze<T extends object>(value: T): Readonly<T> {
  return Object.freeze(value);
}

function digest<T extends string>(binds: T, value: string) {
  return freeze({ algorithm: "sha-256" as const, binds, value });
}

function expectedHeadBasis(value: ReceizAcceptedHeadExpectation): object {
  return value.status === "unaccepted"
    ? { status: "unaccepted" }
    : { status: "accepted", head: value.head };
}

function historyDigest(value: string): ReceizHistoryDigest {
  return digest("verified-proof-history", value);
}

export async function exactVerifiedDescendantAdditions(input: Readonly<{
  history: ReceizVerifiedProofHistory;
  expected: ReceizAcceptedHeadExpectation;
  verifyMergeArtifact: ReceizVerifiedMergeArtifactResolver;
}>): Promise<readonly ReceizProofHistoryNode[] | null> {
  const { history, expected } = input;
  if (history.headDigests.length !== 1) return null;
  const byDigest = new Map(history.nodes.map((node) => [node.nodeDigest, node]));
  const stop = expected.status === "accepted" ? expected.head.value : null;
  if (stop !== null && !byDigest.has(stop)) return null;
  const state = new Map<string, "visiting" | "verified">();
  const visit = async (cursor: string): Promise<boolean> => {
    // Accepted history is already verified stronger truth. Do not rediscover
    // or re-resolve historical composite heads merely to append a linear tail.
    if (cursor === stop) return true;
    const prior = state.get(cursor);
    if (prior === "verified") return true;
    if (prior === "visiting") return false;
    state.set(cursor, "visiting");
    const node = byDigest.get(cursor);
    if (!node) return false;
    if (node.parentDigests.length > 1) {
      const mergeArtifact = await input.verifyMergeArtifact(node.nodeDigest);
      if (!isRuntimeVerifiedReceizArtifact(mergeArtifact)
        || mergeArtifact.history.artifactId !== history.artifactId
        || mergeArtifact.history.registryDigest !== history.registryDigest
        || mergeArtifact.history.headDigests.length !== 1
        || mergeArtifact.history.headDigests[0] !== node.nodeDigest) {
        return false;
      }
      const sealedNodes = new Set(mergeArtifact.history.nodes.map((candidate) => candidate.nodeDigest));
      if (!sealedNodes.has(node.nodeDigest)
        || !node.parentDigests.every((parent) => sealedNodes.has(parent))) {
        return false;
      }
    }
    const valid = node.parentDigests.length === 0
      || (await (async () => {
        for (const parent of [...node.parentDigests].sort()) {
          if (!await visit(parent)) return false;
        }
        return true;
      })());
    if (valid) state.set(cursor, "verified");
    return valid;
  };
  if (!await visit(history.headDigests[0]!)) return null;
  if (stop === null) return history.nodes;
  const acceptedClosure = new Set<string>();
  const collectAcceptedClosure = (cursor: string): void => {
    if (acceptedClosure.has(cursor)) return;
    acceptedClosure.add(cursor);
    for (const parent of byDigest.get(cursor)?.parentDigests ?? []) collectAcceptedClosure(parent);
  };
  collectAcceptedClosure(stop);
  const reachable = new Set<string>();
  const collectReachable = (cursor: string): void => {
    if (reachable.has(cursor)) return;
    reachable.add(cursor);
    for (const parent of byDigest.get(cursor)?.parentDigests ?? []) collectReachable(parent);
  };
  collectReachable(history.headDigests[0]!);
  if (!reachable.has(stop)) return null;
  return history.nodes.filter((node) => reachable.has(node.nodeDigest)
    && !acceptedClosure.has(node.nodeDigest));
}

export async function verifyReceizArtifactForReconciliation(input: Readonly<{
  sealedArtifact: ReceizArtifactInput;
  admission: unknown;
}>): Promise<ReceizVerifiedArtifact> {
  if (!input || typeof input !== "object"
    || Object.keys(input).sort().join(",") !== "admission,sealedArtifact") {
    throw new Error("ARTIFACT_VERIFICATION_FAILED");
  }
  const admissionResult = await verifyReceizArtifactAdmission(input.admission);
  if ("code" in admissionResult) throw new Error("ARTIFACT_VERIFICATION_FAILED");
  const admission = admissionResult as ReceizVerifiedArtifactAdmission;
  if (admission.proofHistory === null) throw new Error("ARTIFACT_VERIFICATION_FAILED");
  const history = await verifyReceizProofHistory(admission.proofHistory);
  const snapshot = await snapshotReceizArtifactInput(input.sealedArtifact);
  if (snapshot.artifactDigest.value !== admission.artifactSha256
    || history.artifactId !== admission.artifactId
    || (admission.profile === "profile-showcase"
      ? history.registryDigest !== RECEIZ_V114_REGISTRY_DIGEST
      : history.registryDigest !== admission.admissionProof.registryDigest)
    || admission.proofHistory.historyDigest !== history.historyDigest
    || admission.proofHistory.verification.verificationDigest !== history.verification.verificationDigest) {
    throw new Error("ARTIFACT_VERIFICATION_FAILED");
  }
  const artifact = freeze({
    get exactBytes() { return snapshot.bytes; },
    artifactDigest: snapshot.artifactDigest as ReceizArtifactDigest,
    history,
    admission,
  }) as ReceizVerifiedArtifact;
  registerRuntimeVerifiedReceizArtifact(artifact);
  return artifact;
}

/**
 * Additive bounded-history admission for profile showcase artifacts. The v113
 * coordination envelope remains byte-for-byte unchanged; only the already
 * verified v114 carried-history proof supplies its exact bounded addition.
 */
export async function verifyReceizBoundedProfileShowcaseForReconciliationV114(
  input: Readonly<{
    sealedArtifact: ReceizArtifactInput;
    admission: unknown;
  }>,
): Promise<ReceizVerifiedBoundedProfileShowcaseArtifact> {
  if (!input || typeof input !== "object"
    || Object.keys(input).sort().join(",") !== "admission,sealedArtifact") {
    throw new Error("ARTIFACT_VERIFICATION_FAILED");
  }
  const admission = await verifyReceizArtifactAdmission(input.admission);
  if ("code" in admission
    || admission.profile !== "profile-showcase"
    || admission.proofHistoryHead === null) {
    throw new Error("ARTIFACT_VERIFICATION_FAILED");
  }
  const carrier =
    await rederiveReceizBoundedProfileShowcaseCarrierFromAdmission(admission);
  const snapshot = await snapshotReceizArtifactInput(input.sealedArtifact);
  const historyHead = carrier.receizProofHistory;
  const profileIdentity = carrier["profile-showcase"].profileIdentity;
  if (
    snapshot.artifactDigest.value !== admission.artifactSha256
    || typeof profileIdentity !== "string"
    || profileIdentity.length === 0
    || historyHead.artifactId !== admission.artifactId
    || historyHead.registryDigest !== RECEIZ_V114_REGISTRY_DIGEST
    || historyHead.headDigest !== historyHead.currentNode.nodeDigest
    || historyHead.currentNode.artifactId !== historyHead.artifactId
    || historyHead.currentNode.registryDigest !== historyHead.registryDigest
  ) throw new Error("ARTIFACT_VERIFICATION_FAILED");
  const artifact = freeze({
    get exactBytes() { return snapshot.bytes; },
    artifactDigest: snapshot.artifactDigest as ReceizArtifactDigest,
    historyHead,
    profileIdentity,
    admission,
  }) as ReceizVerifiedBoundedProfileShowcaseArtifact;
  verifiedBoundedProfileShowcaseArtifacts.add(artifact);
  return artifact;
}

export async function planReceizBoundedProfileShowcaseReconciliationV114(
  input: Readonly<{
    verifiedArtifact: ReceizVerifiedBoundedProfileShowcaseArtifact;
    verifiedActorEvidence: unknown;
    tenantId: ReceizTenantId;
    issuerKeyId: string;
    expectedAcceptedHead: ReceizAcceptedHeadExpectation;
    idempotencyKey: string;
    validFromKai: string;
    expiresAtKai: string;
    localReceipts?: readonly ReceizAppendReceipt[];
  }>,
): Promise<ReceizOfflineReconciliationPreparationResult> {
  if (!verifiedBoundedProfileShowcaseArtifacts.has(
    input.verifiedArtifact as object,
  )) {
    return {
      status: "rejected",
      code: "ARTIFACT_VERIFICATION_FAILED",
      warnings: [],
    };
  }
  const artifact = input.verifiedArtifact;
  const historyHead = artifact.historyHead;
  const actorAdmission = input.verifiedActorEvidence;
  if (!actorAdmission || typeof actorAdmission !== "object"
    || !("actor" in actorAdmission)) {
    return {
      status: "rejected",
      code: "IDENTITY_SEAL_MISMATCH",
      warnings: [],
    };
  }
  const actor = await verifyReceizVerifiedActorReference(
    (actorAdmission as { actor: unknown }).actor,
    actorAdmission,
  );
  if ("code" in actor || actor.actorId !== artifact.profileIdentity) {
    return {
      status: "rejected",
      code: "IDENTITY_SEAL_MISMATCH",
      warnings: [],
    };
  }
  if (!input.issuerKeyId || !input.tenantId.value || !input.idempotencyKey
    || !KAI_RE.test(input.validFromKai) || !KAI_RE.test(input.expiresAtKai)
    || BigInt(input.validFromKai) > BigInt(input.expiresAtKai)) {
    return {
      status: "rejected",
      code: "CAPABILITY_MISMATCH",
      warnings: [],
    };
  }
  const carriedDigests = new Set([
    historyHead.headDigest,
    ...historyHead.parentRefs.map((reference) => reference.nodeDigest),
  ]);
  const warnings = input.localReceipts?.some((receipt) =>
    receipt.resource !== historyHead.artifactId
    || !carriedDigests.has(receipt.acceptedHead.value))
    ? [{ code: "LOCAL_RECEIPT_INCONSISTENT" as const }]
    : [];
  let orderedAdditionDigests: readonly ReceizHistoryDigest[];
  if (input.expectedAcceptedHead.status === "accepted") {
    const expectedHeadValue = input.expectedAcceptedHead.head.value;
    if (expectedHeadValue === historyHead.headDigest) {
      orderedAdditionDigests = [];
    } else if (historyHead.parentRefs.some(
      (reference) =>
        reference.nodeDigest === expectedHeadValue,
    )) {
      orderedAdditionDigests = [historyDigest(historyHead.headDigest)];
    } else {
      return {
        status: "rejected",
        code: "NO_COMMON_PREDECESSOR",
        warnings,
      };
    }
  } else if (historyHead.nodeCount === 1
    && historyHead.parentRefs.length === 0) {
    orderedAdditionDigests = [historyDigest(historyHead.headDigest)];
  } else {
    return {
      status: "rejected",
      code: "HISTORY_VERIFICATION_FAILED",
      warnings,
    };
  }
  assertReceizReconciliationAdditionBudget(
    orderedAdditionDigests.length,
    orderedAdditionDigests.length,
  );
  const idempotencyValue = await digestReceizAuthority(
    "idempotency",
    "receiz.reconciliation-idempotency.v113",
    {
      commitDomain: RECEIZ_V113_GLOBAL_COMMIT_DOMAIN,
      tenantId: input.tenantId,
      artifactId: historyHead.artifactId,
      key: input.idempotencyKey,
    },
  );
  const idempotencyIdentityDigest = digest(
    "domain-scoped-idempotency-identity",
    idempotencyValue,
  ) as ReceizIdempotencyDigest;
  const attemptValue = await digestReceizAuthority(
    "command",
    "receiz.reconciliation-attempt.v113",
    {
      idempotencyIdentityDigest,
      expectedAcceptedHead: expectedHeadBasis(input.expectedAcceptedHead),
    },
  );
  const attemptId = freeze({
    scheme: "receiz-reconciliation-attempt.v1" as const,
    value: attemptValue,
  }) as ReceizReconciliationAttemptId;
  const operationMatrixDigest = digest(
    "application-operation-matrix",
    RECEIZ_CURRENT_APPLICATION_OPERATION_MATRIX_DIGEST,
  ) as ReceizApplicationOperationMatrixDigest;
  const maximumEffects = freeze({
    acceptedHistoryAdditions: orderedAdditionDigests.length,
  });
  const effectsDigest = digest(
    "external-operation-effects",
    await digestReceizAuthority(
      "effects",
      "receiz.reconciliation-effects.v113",
      maximumEffects,
    ),
  ) as ReceizEffectsDigest;
  const planBasis = {
    schema: "receiz.offline-reconciliation-plan.v113" as const,
    attemptId,
    commitDomain: RECEIZ_V113_GLOBAL_COMMIT_DOMAIN,
    tenantId: input.tenantId,
    actor,
    artifactId: historyHead.artifactId,
    candidateArtifactDigest: artifact.artifactDigest,
    expectedAcceptedHead: input.expectedAcceptedHead,
    proposedAcceptedHead: historyDigest(historyHead.headDigest),
    orderedAdditionDigests,
    additionCount: orderedAdditionDigests.length,
    registryDigest: digest(
      "constitution-registry",
      historyHead.registryDigest,
    ) as ReceizRegistryDigest,
    operationMatrixDigest,
    effectsDigest,
    idempotencyIdentityDigest,
    authority: freeze({
      planIsProofAuthority: false as const,
      strongerTruth: "sealed-receiz-proof-object" as const,
    }),
  };
  const plan = freeze({
    ...planBasis,
    planDigest: digest(
      "offline-reconciliation-plan",
      await digestReceizAuthority(
        "command",
        "receiz.offline-reconciliation-plan.v113",
        planBasis,
      ),
    ) as ReceizReconciliationPlanDigest,
  }) as ReceizOfflineReconciliationPlan;
  registerRuntimeCustodiedReceizOfflineReconciliationPlan(plan);
  const capabilityPayload: ReceizReconciliationCapabilityPayload = freeze({
    schema: "receiz.capability.v113.reconciliation",
    capabilityId: `reconciliation:${plan.planDigest.value}`,
    issuerKeyId: input.issuerKeyId,
    actorId: actor.actorId,
    tenantId: input.tenantId.value,
    audience: "receiz.com/global/v1",
    authorityProfile: "global-shared",
    operations: ["artifact.reconcile"],
    resourceScopes: [historyHead.artifactId],
    maximumEffects,
    registryDigest: historyHead.registryDigest,
    operationMatrixDigest,
    validFromKai: input.validFromKai,
    expiresAtKai: input.expiresAtKai,
    nonce: `reconciliation:${attemptId.value}`,
    parentDigest: null,
    delegationDepth: 0,
    maximumDelegationDepth: 0,
    offline: false,
    operationConstraints: freeze({
      planDigest: plan.planDigest,
      commitDomain: plan.commitDomain,
      expectedAcceptedHead: plan.expectedAcceptedHead,
      artifactId: historyHead.artifactId,
      attemptId,
    }),
  });
  const stageBasis = {
    schema: "receiz.reconciliation-stage-confirmation.v113" as const,
    attemptId,
    planDigest: plan.planDigest,
    candidateArtifactDigest: artifact.artifactDigest,
    commitDomain: plan.commitDomain,
    tenantId: plan.tenantId,
  };
  const stageConfirmation: ReceizReconciliationStageConfirmation = freeze({
    ...stageBasis,
    confirmationDigest: digest(
      "reconciliation-stage-confirmation",
      await digestReceizAuthority(
        "command",
        "receiz.reconciliation-stage-confirmation.v113",
        stageBasis,
      ),
    ),
  });
  return freeze({
    status: "planned",
    plan,
    capabilityPayload,
    stageConfirmation,
    warnings: freeze(warnings),
  });
}

export async function planReceizOfflineReconciliation(input: Readonly<{
  verifiedArtifact: ReceizVerifiedArtifact;
  verifiedActorEvidence: unknown;
  tenantId: ReceizTenantId;
  issuerKeyId: string;
  expectedAcceptedHead: ReceizAcceptedHeadExpectation;
  idempotencyKey: string;
  validFromKai: string;
  expiresAtKai: string;
  localReceipts?: readonly ReceizAppendReceipt[];
  verifyMergeArtifact?: ReceizVerifiedMergeArtifactResolver;
}>): Promise<ReceizOfflineReconciliationPreparationResult> {
  const { isRuntimeVerifiedReceizArtifact } = await import("./reconciliationCustody.js");
  if (!isRuntimeVerifiedReceizArtifact(input.verifiedArtifact)) {
    return { status: "rejected", code: "ARTIFACT_VERIFICATION_FAILED", warnings: [] };
  }
  const artifact = input.verifiedArtifact;
  const actorAdmission = input.verifiedActorEvidence;
  if (!actorAdmission || typeof actorAdmission !== "object" || !("actor" in actorAdmission)) {
    return { status: "rejected", code: "IDENTITY_SEAL_MISMATCH", warnings: [] };
  }
  const actor = await verifyReceizVerifiedActorReference(
    (actorAdmission as { actor: unknown }).actor,
    actorAdmission,
  );
  if ("code" in actor || actor.registryDigest.value !== artifact.history.registryDigest) {
    return { status: "rejected", code: "IDENTITY_SEAL_MISMATCH", warnings: [] };
  }
  if (!input.issuerKeyId || !input.tenantId.value || !input.idempotencyKey
    || !KAI_RE.test(input.validFromKai) || !KAI_RE.test(input.expiresAtKai)
    || BigInt(input.validFromKai) > BigInt(input.expiresAtKai)) {
    return { status: "rejected", code: "CAPABILITY_MISMATCH", warnings: [] };
  }

  const nodes = artifact.history.nodes;
  const nodeDigests = new Set(nodes.map((node) => node.nodeDigest));
  const warnings = input.localReceipts?.some((receipt) =>
    receipt.resource !== artifact.history.artifactId
    || !nodeDigests.has(receipt.acceptedHead.value))
    ? [{ code: "LOCAL_RECEIPT_INCONSISTENT" as const }]
    : [];
  const additionNodes = await exactVerifiedDescendantAdditions({
    history: artifact.history,
    expected: input.expectedAcceptedHead,
    verifyMergeArtifact: input.verifyMergeArtifact ?? (async () => null),
  });
  if (additionNodes === null) {
    return {
      status: "rejected",
      code: input.expectedAcceptedHead.status === "accepted"
        ? "NO_COMMON_PREDECESSOR"
        : "HISTORY_VERIFICATION_FAILED",
      warnings,
    };
  }
  const proposedHeadValue = artifact.history.headDigests[0];
  if (!proposedHeadValue) return { status: "rejected", code: "HISTORY_VERIFICATION_FAILED", warnings };
  const orderedAdditionDigests = additionNodes.map((node) => historyDigest(node.nodeDigest));
  assertReceizReconciliationAdditionBudget(orderedAdditionDigests.length, orderedAdditionDigests.length);
  const idempotencyValue = await digestReceizAuthority("idempotency", "receiz.reconciliation-idempotency.v113", {
    commitDomain: RECEIZ_V113_GLOBAL_COMMIT_DOMAIN,
    tenantId: input.tenantId,
    artifactId: artifact.history.artifactId,
    key: input.idempotencyKey,
  });
  const idempotencyIdentityDigest = digest("domain-scoped-idempotency-identity", idempotencyValue) as ReceizIdempotencyDigest;
  const attemptValue = await digestReceizAuthority("command", "receiz.reconciliation-attempt.v113", {
    idempotencyIdentityDigest,
    expectedAcceptedHead: expectedHeadBasis(input.expectedAcceptedHead),
  });
  const attemptId = freeze({
    scheme: "receiz-reconciliation-attempt.v1" as const,
    value: attemptValue,
  }) as ReceizReconciliationAttemptId;
  const operationMatrixDigest = digest(
    "application-operation-matrix",
    RECEIZ_CURRENT_APPLICATION_OPERATION_MATRIX_DIGEST,
  ) as ReceizApplicationOperationMatrixDigest;
  const maximumEffects = freeze({ acceptedHistoryAdditions: orderedAdditionDigests.length });
  const effectsValue = await digestReceizAuthority("effects", "receiz.reconciliation-effects.v113", maximumEffects);
  const effectsDigest = digest("external-operation-effects", effectsValue) as ReceizEffectsDigest;
  const planBasis = {
    schema: "receiz.offline-reconciliation-plan.v113" as const,
    attemptId,
    commitDomain: RECEIZ_V113_GLOBAL_COMMIT_DOMAIN,
    tenantId: input.tenantId,
    actor,
    artifactId: artifact.history.artifactId,
    candidateArtifactDigest: artifact.artifactDigest,
    expectedAcceptedHead: input.expectedAcceptedHead,
    proposedAcceptedHead: historyDigest(proposedHeadValue),
    orderedAdditionDigests,
    additionCount: orderedAdditionDigests.length,
    registryDigest: digest("constitution-registry", artifact.history.registryDigest) as ReceizRegistryDigest,
    operationMatrixDigest,
    effectsDigest,
    idempotencyIdentityDigest,
    authority: freeze({ planIsProofAuthority: false as const, strongerTruth: "sealed-receiz-proof-object" as const }),
  };
  const planDigestValue = await digestReceizAuthority("command", "receiz.offline-reconciliation-plan.v113", planBasis);
  const plan = freeze({
    ...planBasis,
    planDigest: digest("offline-reconciliation-plan", planDigestValue) as ReceizReconciliationPlanDigest,
  }) as ReceizOfflineReconciliationPlan;
  registerRuntimeCustodiedReceizOfflineReconciliationPlan(plan);
  const capabilityPayload: ReceizReconciliationCapabilityPayload = freeze({
    schema: "receiz.capability.v113.reconciliation",
    capabilityId: `reconciliation:${plan.planDigest.value}`,
    issuerKeyId: input.issuerKeyId,
    actorId: actor.actorId,
    tenantId: input.tenantId.value,
    audience: "receiz.com/global/v1",
    authorityProfile: "global-shared",
    operations: ["artifact.reconcile"],
    resourceScopes: [artifact.history.artifactId],
    maximumEffects,
    registryDigest: artifact.history.registryDigest,
    operationMatrixDigest,
    validFromKai: input.validFromKai,
    expiresAtKai: input.expiresAtKai,
    nonce: `reconciliation:${attemptId.value}`,
    parentDigest: null,
    delegationDepth: 0,
    maximumDelegationDepth: 0,
    offline: false,
    operationConstraints: freeze({
      planDigest: plan.planDigest,
      commitDomain: plan.commitDomain,
      expectedAcceptedHead: plan.expectedAcceptedHead,
      artifactId: artifact.history.artifactId,
      attemptId,
    }),
  });
  const stageBasis = {
    schema: "receiz.reconciliation-stage-confirmation.v113" as const,
    attemptId,
    planDigest: plan.planDigest,
    candidateArtifactDigest: artifact.artifactDigest,
    commitDomain: plan.commitDomain,
    tenantId: plan.tenantId,
  };
  const stageConfirmation: ReceizReconciliationStageConfirmation = freeze({
    ...stageBasis,
    confirmationDigest: digest(
      "reconciliation-stage-confirmation",
      await digestReceizAuthority("command", "receiz.reconciliation-stage-confirmation.v113", stageBasis),
    ),
  });
  return freeze({ status: "planned", plan, capabilityPayload, stageConfirmation, warnings: freeze(warnings) });
}

export function evaluateReceizHistoricalHandoffRevocation(value: unknown):
  | Readonly<{ ok: true }>
  | Readonly<{ ok: false; code: "IDENTITY_KEY_REVOKED" | "HISTORY_VERIFICATION_FAILED" }> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { ok: false, code: "HISTORY_VERIFICATION_FAILED" };
  const record = value as Record<string, unknown>;
  if (Object.keys(record).sort().join(",") !== "authorizedAtKai,revokedAtKai"
    || typeof record.authorizedAtKai !== "string" || !KAI_RE.test(record.authorizedAtKai)
    || record.revokedAtKai !== null && (typeof record.revokedAtKai !== "string" || !KAI_RE.test(record.revokedAtKai))) {
    return { ok: false, code: "HISTORY_VERIFICATION_FAILED" };
  }
  return record.revokedAtKai !== null && BigInt(record.authorizedAtKai) >= BigInt(record.revokedAtKai as string)
    ? { ok: false, code: "IDENTITY_KEY_REVOKED" }
    : { ok: true };
}

type ReceizOwnershipHandoffSignedBasis = Readonly<{
  operation: "ownership.transition";
  predecessorDigest: string;
  fromOwnerReceizId: string;
  toOwnerReceizId: string;
  actorId: string;
  successorActorId: string;
  issuerKeyId: string;
  successorIssuerKeyId: string;
  registryDigest: string;
  authorizedAtKai: string;
}>;

function deepFreezeHandoff<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const nested of Object.values(value as Record<string, unknown>)) deepFreezeHandoff(nested);
    Object.freeze(value);
  }
  return value;
}

function handoffSignedBasis(input: Readonly<{
  predecessorDigest: string;
  fromOwnerReceizId: string;
  toOwnerReceizId: string;
  actorId: string;
  successorActorId: string;
  issuerKeyId: string;
  successorIssuerKeyId: string;
  registryDigest: string;
  authorizedAtKai: string;
}>): ReceizOwnershipHandoffSignedBasis {
  return {
    operation: "ownership.transition",
    predecessorDigest: input.predecessorDigest,
    fromOwnerReceizId: input.fromOwnerReceizId,
    toOwnerReceizId: input.toOwnerReceizId,
    actorId: input.actorId,
    successorActorId: input.successorActorId,
    issuerKeyId: input.issuerKeyId,
    successorIssuerKeyId: input.successorIssuerKeyId,
    registryDigest: input.registryDigest,
    authorizedAtKai: input.authorizedAtKai,
  };
}

async function handoffPlanDigest(basis: ReceizOwnershipHandoffSignedBasis) {
  return digest(
    "artifact-append-plan",
    await digestReceizAuthority("capability", "receiz.ownership-handoff-capability-basis.v113", basis),
  );
}

export async function createReceizOwnershipHandoffAuthorityReceipt(input: Readonly<{
  keyFile: ReceizKeyFile;
  passphrase?: string;
  predecessorDigest: string;
  fromOwnerReceizId: string;
  toOwnerReceizId: string;
  successorIssuerKeyId: string;
  registryDigest: string;
  authorizedAtKai: string;
}>): Promise<ReceizOwnershipHandoffAuthorityReceipt> {
  if (!KAI_RE.test(input.authorizedAtKai)
    || input.keyFile.owner.uid !== input.fromOwnerReceizId
    || !input.successorIssuerKeyId || !input.predecessorDigest
    || !input.fromOwnerReceizId || !input.toOwnerReceizId || !input.registryDigest) {
    throw new TypeError("HANDOFF_AUTHORITY_INVALID");
  }
  const signedBasis = handoffSignedBasis({
    ...input,
    actorId: input.fromOwnerReceizId,
    successorActorId: input.toOwnerReceizId,
    issuerKeyId: input.keyFile.keyId,
  });
  const exactHandoffPlanDigest = await handoffPlanDigest(signedBasis);
  const capabilityPayload: ReceizCapabilityPayload = {
    schema: "receiz.capability.v112",
    capabilityId: `ownership-handoff:${exactHandoffPlanDigest.value}`,
    issuerKeyId: input.keyFile.keyId,
    actorId: input.fromOwnerReceizId,
    tenantId: null,
    audience: "receiz:ownership-handoff:v113",
    authorityProfile: "artifact-local",
    operations: ["ownership.transition"],
    resourceScopes: [input.predecessorDigest],
    maximumEffects: { "ownership.transition": 1 },
    registryDigest: input.registryDigest,
    validFromKai: input.authorizedAtKai,
    expiresAtKai: input.authorizedAtKai,
    nonce: `ownership-handoff:${exactHandoffPlanDigest.value}`,
    parentDigest: null,
    delegationDepth: 0,
    maximumDelegationDepth: 0,
    offline: true,
    operationConstraints: {
      planDigest: exactHandoffPlanDigest,
      commitDomain: { scheme: "receiz-commit-domain.v1", value: "artifact:local" },
    },
  };
  const signedCapability = await signReceizCapability({
    keyFile: input.keyFile,
    ...(input.passphrase === undefined ? {} : { passphrase: input.passphrase }),
    payload: capabilityPayload,
  });
  const capabilityDigest = await digestReceizAuthority(
    "capability",
    "receiz.capability.v112",
    signedCapability.payload,
  );
  const basis = {
    schema: "receiz.ownership-handoff-authority-evidence.v113" as const,
    ...signedBasis,
    capabilityDigest,
    signedCapability,
    authority: {
      evidenceIsArtifactAuthorityAlone: false as const,
      binding: "verified-history-node-receipt" as const,
    },
  };
  return deepFreezeHandoff({
    ...structuredClone(basis),
    evidenceDigest: await digestReceizAuthority(
      "history",
      "receiz.ownership-handoff-authority-evidence.v113",
      basis,
    ),
  });
}

async function readArtifactBoundHandoffEvidence(
  value: unknown,
): Promise<ReceizOwnershipHandoffAuthorityReceipt | null> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const candidate = value as Record<string, unknown>;
  const keys = [
    "schema", "operation", "predecessorDigest", "fromOwnerReceizId", "toOwnerReceizId",
    "actorId", "successorActorId", "issuerKeyId", "successorIssuerKeyId", "capabilityDigest",
    "registryDigest", "authorizedAtKai", "signedCapability",
    "evidenceDigest", "authority",
  ];
  if (Object.keys(candidate).sort().join(",") !== keys.sort().join(",")
    || candidate.schema !== "receiz.ownership-handoff-authority-evidence.v113"
    || candidate.operation !== "ownership.transition"
    || typeof candidate.evidenceDigest !== "string") return null;
  const { evidenceDigest, ...basis } = candidate;
  return await digestReceizAuthority(
    "history",
    "receiz.ownership-handoff-authority-evidence.v113",
    basis,
  ) === evidenceDigest ? candidate as unknown as ReceizOwnershipHandoffAuthorityReceipt : null;
}

function strictArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.slice().buffer;
}

async function verifyHistoricalHandoffSignature(
  evidence: ReceizOwnershipHandoffAuthorityReceipt,
  issuer: ReceizCapabilityIssuerKey,
): Promise<boolean> {
  const signed = evidence.signedCapability;
  if (!signed || signed.schema !== "receiz.signed-capability.v112" || signed.alg !== issuer.alg) return false;
  const signedBasis = handoffSignedBasis(evidence);
  const expectedPlanDigest = await handoffPlanDigest(signedBasis);
  const payload = signed.payload;
  const capabilityDigest = await digestReceizAuthority("capability", "receiz.capability.v112", payload);
  if (capabilityDigest !== evidence.capabilityDigest
    || payload.issuerKeyId !== evidence.issuerKeyId
    || payload.actorId !== evidence.actorId
    || payload.tenantId !== null
    || payload.audience !== "receiz:ownership-handoff:v113"
    || payload.authorityProfile !== "artifact-local"
    || payload.operations.length !== 1 || payload.operations[0] !== "ownership.transition"
    || payload.resourceScopes.length !== 1 || payload.resourceScopes[0] !== evidence.predecessorDigest
    || Object.keys(payload.maximumEffects).length !== 1
    || payload.maximumEffects["ownership.transition"] !== 1
    || payload.registryDigest !== evidence.registryDigest
    || payload.validFromKai !== evidence.authorizedAtKai
    || payload.expiresAtKai !== evidence.authorizedAtKai
    || payload.parentDigest !== null || payload.delegationDepth !== 0
    || payload.maximumDelegationDepth !== 0 || payload.offline !== true
    || payload.operationConstraints.planDigest.binds !== "artifact-append-plan"
    || payload.operationConstraints.planDigest.value !== expectedPlanDigest.value
    || payload.operationConstraints.commitDomain.scheme !== "receiz-commit-domain.v1"
    || payload.operationConstraints.commitDomain.value !== "artifact:local") return false;
  try {
    const publicKeyBytes = receizBase64UrlDecode(issuer.publicKeyRawB64u);
    const signature = receizBase64UrlDecode(signed.signatureB64u);
    if (signature.byteLength !== 64) return false;
    const importAlgorithm = issuer.alg === "Ed25519"
      ? { name: "Ed25519" } as const
      : { name: "ECDSA", namedCurve: "P-256" } as const;
    const verifyAlgorithm = issuer.alg === "Ed25519"
      ? "Ed25519"
      : { name: "ECDSA", hash: "SHA-256" } as const;
    const publicKey = await crypto.subtle.importKey(
      "raw",
      strictArrayBuffer(publicKeyBytes),
      importAlgorithm,
      false,
      ["verify"],
    );
    return crypto.subtle.verify(
      verifyAlgorithm,
      publicKey,
      strictArrayBuffer(signature),
      strictArrayBuffer(capabilitySigningBytes(payload)),
    );
  } catch {
    return false;
  }
}

export async function verifyReceizOwnershipHandoffSequence(input: Readonly<{
  history: unknown;
  resolveAdmittedIssuer: ReceizCapabilityIssuerResolver;
  revocationStates: readonly ReceizHistoricalIdentityKeyRevocationState[];
}>): Promise<Readonly<{ ok: true; handoffCount: number }> | Readonly<{
  ok: false;
  code: "HISTORY_VERIFICATION_FAILED" | "IDENTITY_KEY_REVOKED";
}>> {
  if (!input || typeof input !== "object"
    || Object.keys(input).sort().join(",") !== "history,resolveAdmittedIssuer,revocationStates"
    || typeof input.resolveAdmittedIssuer !== "function" || !Array.isArray(input.revocationStates)
    || input.revocationStates.some((state) =>
      !isRuntimeCustodiedReceizHistoricalIdentityKeyRevocationState(state))) {
    return { ok: false, code: "HISTORY_VERIFICATION_FAILED" };
  }
  let history: ReceizVerifiedProofHistory;
  try { history = await verifyReceizProofHistory(input.history); } catch { return { ok: false, code: "HISTORY_VERIFICATION_FAILED" }; }
  const nodes = history.nodes.filter((node) => node.event.type === "ownership.transition");
  const revocations = new Map(input.revocationStates.map((state) => [state.issuerKeyId, state]));
  for (const node of nodes) {
    const evidence = await readArtifactBoundHandoffEvidence(node.receipt);
    if (!evidence || node.event.type !== "ownership.transition"
      || node.parentDigests.length !== 1 || evidence.predecessorDigest !== node.parentDigests[0]
      || evidence.fromOwnerReceizId !== node.event.fromOwnerReceizId
      || evidence.toOwnerReceizId !== node.event.toOwnerReceizId
      || evidence.actorId !== evidence.fromOwnerReceizId
      || evidence.successorActorId !== evidence.toOwnerReceizId
      || evidence.registryDigest !== node.registryDigest
      || evidence.authorizedAtKai !== node.kaiPulse
      || !evidence.issuerKeyId || !evidence.successorIssuerKeyId || !evidence.capabilityDigest
      ) return { ok: false, code: "HISTORY_VERIFICATION_FAILED" };
    const [issuer, successorIssuer] = await Promise.all([
      input.resolveAdmittedIssuer(evidence.issuerKeyId),
      input.resolveAdmittedIssuer(evidence.successorIssuerKeyId),
    ]);
    if (!issuer || !successorIssuer
      || !isSdkAdmittedReceizCapabilityIssuerKey(issuer)
      || !isSdkAdmittedReceizCapabilityIssuerKey(successorIssuer)
      || issuer.actorId !== evidence.actorId
      || successorIssuer.actorId !== evidence.successorActorId
      || issuer.registryDigest.value !== evidence.registryDigest
      || successorIssuer.registryDigest.value !== evidence.registryDigest
      || !await verifyHistoricalHandoffSignature(evidence, issuer)) {
      return { ok: false, code: "HISTORY_VERIFICATION_FAILED" };
    }
    for (const admittedIssuer of [issuer, successorIssuer]) {
      const state = revocations.get(admittedIssuer.keyId);
      if (!state || state.actorId !== admittedIssuer.actorId
        || state.registryDigest !== admittedIssuer.registryDigest.value
        || BigInt(state.observedThroughKai) < BigInt(evidence.authorizedAtKai)) {
        return { ok: false, code: "HISTORY_VERIFICATION_FAILED" };
      }
      const revocation = evaluateReceizHistoricalHandoffRevocation({
        authorizedAtKai: evidence.authorizedAtKai,
        revokedAtKai: state.revokedAtKai,
      });
      if (!revocation.ok) return revocation;
    }
  }
  return { ok: true, handoffCount: nodes.length };
}

export async function classifyReceizReconciliationDivergence(input: Readonly<{
  localHistory: unknown;
  acceptedHistory: unknown;
  targetNamespace?: string;
}>): Promise<ReceizReconciliationDivergence> {
  let local: ReceizVerifiedProofHistory;
  let accepted: ReceizVerifiedProofHistory;
  try {
    [local, accepted] = await Promise.all([
      verifyReceizProofHistory(input.localHistory),
      verifyReceizProofHistory(input.acceptedHistory),
    ]);
  } catch { return { relation: "rejected", code: "HISTORY_VERIFICATION_FAILED" }; }
  if (local.artifactId !== accepted.artifactId || local.registryDigest !== accepted.registryDigest) {
    return { relation: "rejected", code: "NO_COMMON_PREDECESSOR" };
  }
  const localHeadValue = local.headDigests[0];
  const acceptedHeadValue = accepted.headDigests[0];
  if (!localHeadValue || !acceptedHeadValue) return { relation: "rejected", code: "HISTORY_VERIFICATION_FAILED" };
  const localHead = historyDigest(localHeadValue);
  const acceptedHead = historyDigest(acceptedHeadValue);
  if (localHeadValue === acceptedHeadValue) return { relation: "same", head: localHead };

  const nodeMap = new Map([...accepted.nodes, ...local.nodes].map((node) => [node.nodeDigest, node]));
  const lineage = (head: string): string[] => {
    const result: string[] = [];
    const seen = new Set<string>();
    let cursor: string | undefined = head;
    while (cursor && !seen.has(cursor)) {
      seen.add(cursor);
      result.push(cursor);
      const node = nodeMap.get(cursor);
      cursor = node?.parentDigests.length === 1 ? node.parentDigests[0] : undefined;
    }
    return result;
  };
  const localLineage = lineage(localHeadValue);
  const acceptedLineage = lineage(acceptedHeadValue);
  if (localLineage.includes(acceptedHeadValue)) {
    const additions = localLineage.slice(0, localLineage.indexOf(acceptedHeadValue)).reverse().map(historyDigest);
    return { relation: "local-descendant", commonPredecessor: acceptedHead, orderedAdditionDigests: additions };
  }
  if (acceptedLineage.includes(localHeadValue)) {
    const additionDigests = acceptedLineage.slice(0, acceptedLineage.indexOf(localHeadValue)).reverse();
    return {
      relation: "accepted-descendant",
      commonPredecessor: localHead,
      verifiedAdditions: additionDigests.map((value) => nodeMap.get(value)!).filter(Boolean),
    };
  }
  const acceptedSet = new Set(acceptedLineage);
  const commonValue = localLineage.find((value) => acceptedSet.has(value));
  if (!commonValue) return { relation: "rejected", code: "NO_COMMON_PREDECESSOR" };
  const changedTarget = (lineageValues: readonly string[]): boolean => {
    if (!input.targetNamespace) return false;
    const stop = lineageValues.indexOf(commonValue);
    return lineageValues.slice(0, stop).some((value) => Object.prototype.hasOwnProperty.call(
      nodeMap.get(value)?.namespaceData ?? {},
      input.targetNamespace!,
    ));
  };
  return {
    relation: "divergent",
    code: changedTarget(localLineage) && changedTarget(acceptedLineage)
      ? "TARGET_NAMESPACE_CONFLICT"
      : "SIBLING_BRANCHES",
    localHead,
    acceptedHead,
    commonPredecessor: historyDigest(commonValue),
  };
}

export function verifyReceizReconciliationCommitAuthorization(input: Readonly<{
  accountBound: boolean;
  tenantBound: boolean;
  tokenValid: boolean;
  identityKeyValid: boolean;
  capabilityValid: boolean;
  plannedAuthorizationEpoch: string;
  commitAuthorizationEpoch: string;
}>): Readonly<{ ok: true }> | Readonly<{ ok: false; code: "CONNECT_ACCOUNT_MISMATCH" | "TENANT_MISMATCH" | "TOKEN_REVOKED" | "IDENTITY_KEY_REVOKED" | "CAPABILITY_MISMATCH" | "AUTHORIZATION_STATE_CHANGED" }> {
  if (!input.accountBound) return { ok: false, code: "CONNECT_ACCOUNT_MISMATCH" };
  if (!input.tenantBound) return { ok: false, code: "TENANT_MISMATCH" };
  if (!input.tokenValid) return { ok: false, code: "TOKEN_REVOKED" };
  if (!input.identityKeyValid) return { ok: false, code: "IDENTITY_KEY_REVOKED" };
  if (!input.capabilityValid) return { ok: false, code: "CAPABILITY_MISMATCH" };
  if (input.plannedAuthorizationEpoch !== input.commitAuthorizationEpoch) return { ok: false, code: "AUTHORIZATION_STATE_CHANGED" };
  return { ok: true };
}

export async function createReceizReconciliationCommitConfirmation(input: Readonly<{
  plan: ReceizOfflineReconciliationPlan;
  stagedReference: import("./globalCoordinationTypes.js").ReceizStagedReconciliationReference;
  capability: unknown;
  command: ReceizVerifiedReconciliationCommitCommand;
}>): Promise<ReceizReconciliationCommitConfirmation> {
  if (!isRuntimeCustodiedReceizOfflineReconciliationPlan(input.plan)
    || !isRuntimeCustodiedReceizStagedReconciliationReference(input.stagedReference)
    || !isReceizVerifiedReconciliationCapability(input.capability)
    || !isRuntimeVerifiedReceizReconciliationCommitCommand(input.command)
    || input.command.plan !== input.plan
    || input.command.stagedReference !== input.stagedReference
    || input.command.capability !== input.capability) throw new Error("CAPABILITY_MISMATCH");
  const basis = {
    schema: "receiz.reconciliation-commit-confirmation.v113" as const,
    attemptId: input.plan.attemptId,
    planDigest: input.plan.planDigest,
    capabilityDigest: digest("verified-capability", input.capability.digest) as ReceizCapabilityDigest,
    stagedReferenceDigest: input.command.stagedReferenceDigest,
    expectedAcceptedHead: input.plan.expectedAcceptedHead,
    commandDigest: input.command.commandDigest,
    commitDomain: input.plan.commitDomain,
    registryDigest: input.plan.registryDigest,
    operationMatrixDigest: input.plan.operationMatrixDigest,
  };
  return freeze({
    ...basis,
    confirmationDigest: digest(
      "reconciliation-commit-confirmation",
      await digestReceizAuthority("command", "receiz.reconciliation-commit-confirmation.v113", basis),
    ),
  });
}
