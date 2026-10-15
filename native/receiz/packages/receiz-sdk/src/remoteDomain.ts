import { RECEIZ_CURRENT_APPLICATION_OPERATION_MATRIX_DIGEST } from "./appContract.js";
import { snapshotReceizArtifactInput } from "./artifactInput.js";
import type { ReceizCommitDomainId, ReceizHistoryDigest } from "./artifactTransition.js";
import type {
  ReceizAcceptedHeadResolutionInput,
  ReceizAcceptedHeadResolutionResult,
  ReceizEffectStatusResolutionInput,
  ReceizEffectStatusResolutionResult,
  ReceizOfflineReconciliationCommitInput,
  ReceizOfflineReconciliationConvenienceInput,
  ReceizOfflineReconciliationPlan,
  ReceizOfflineReconciliationPlanInput,
  ReceizOfflineReconciliationPreparationResult,
  ReceizOfflineReconciliationResult,
  ReceizOfflineReconciliationStageInput,
  ReceizOfflineReconciliationStageResult,
  ReceizReconciliationAttemptResolutionInput,
  ReceizReconciliationAttemptResolutionResult,
  ReceizReconciliationCommitConfirmation,
  ReceizVerifiedArtifact,
} from "./globalCoordinationTypes.js";
import { RECEIZ_V113_GLOBAL_COMMIT_DOMAIN } from "./globalCoordinationTypes.js";
import {
  createReceizGlobalCoordinationHttpTransport,
  type ReceizGlobalCoordinationTransport,
} from "./globalCoordinationProtocol.js";
import { receizBase64UrlEncode } from "./identity.js";
import {
  isRuntimeCustodiedReceizOfflineReconciliationPlan,
  issueAuthenticatedReceizStagedReconciliationReference,
  registerRuntimeAuthenticatedReceizStagingResult,
  registerRuntimeCustodiedReceizOfflineReconciliationPlan,
  type ReceizAuthenticatedStagingResult,
} from "./reconciliationCustody.js";
import { RECEIZ_CURRENT_REGISTRY_DIGEST } from "./releaseIdentity.js";
import { createReceizRemoteAdmissionStore } from "./remoteAdmissionStore.js";
import { createReceizRemoteArtifactTransitionStore } from "./remoteArtifactTransitionStore.js";
import { createReceizRemotePredecessorFetchBudget } from "./verificationLimits.js";

type RecordValue = Record<string, unknown>;

export type ReceizRemoteArtifactVerifier = (wireArtifact: unknown) => Promise<ReceizVerifiedArtifact>;

export type ReceizRemoteDomainOptions = Readonly<{
  namespace: string;
  commitDomain: ReceizCommitDomainId;
  accessToken: string;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  transport?: ReceizGlobalCoordinationTransport;
  verifyReturnedArtifact: ReceizRemoteArtifactVerifier;
}>;

export type ReceizRemoteDomain = Readonly<{
  admissionStore: ReturnType<typeof createReceizRemoteAdmissionStore>;
  transitionStore: ReturnType<typeof createReceizRemoteArtifactTransitionStore>;
  planOfflineReconciliation(input: ReceizOfflineReconciliationPlanInput): Promise<ReceizOfflineReconciliationPreparationResult>;
  stageOfflineReconciliation(input: ReceizOfflineReconciliationStageInput): Promise<ReceizOfflineReconciliationStageResult>;
  commitOfflineReconciliation(input: ReceizOfflineReconciliationCommitInput): Promise<ReceizOfflineReconciliationResult>;
  reconcileOffline(input: ReceizOfflineReconciliationConvenienceInput): Promise<ReceizOfflineReconciliationResult>;
  resolveAcceptedHead(input: ReceizAcceptedHeadResolutionInput): Promise<ReceizAcceptedHeadResolutionResult>;
  resolveReconciliationAttempt(input: ReceizReconciliationAttemptResolutionInput): Promise<ReceizReconciliationAttemptResolutionResult>;
  resolveEffectStatus(input: ReceizEffectStatusResolutionInput): Promise<ReceizEffectStatusResolutionResult>;
}>;

function record(value: unknown): RecordValue | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as RecordValue : null;
}

function sameDomain(value: unknown, expected: ReceizCommitDomainId): boolean {
  const item = record(value);
  return item?.scheme === expected.scheme && item.value === expected.value;
}

function validPlan(value: unknown, domain: ReceizCommitDomainId, artifactDigest: string): value is ReceizOfflineReconciliationPlan {
  const plan = record(value);
  return plan?.schema === "receiz.offline-reconciliation-plan.v113"
    && sameDomain(plan.commitDomain, domain)
    && record(plan.candidateArtifactDigest)?.value === artifactDigest
    && record(plan.planDigest)?.binds === "offline-reconciliation-plan"
    && record(plan.attemptId)?.scheme === "receiz-reconciliation-attempt.v1"
    && record(plan.operationMatrixDigest)?.value === RECEIZ_CURRENT_APPLICATION_OPERATION_MATRIX_DIGEST;
}

function containsHead(artifact: ReceizVerifiedArtifact, knownHead: ReceizHistoryDigest): boolean {
  return artifact.history.headDigests.includes(knownHead.value)
    || artifact.history.nodes.some((node) => node.nodeDigest === knownHead.value);
}

async function reverifyArtifactResult<T extends RecordValue>(
  value: T,
  verifier: ReceizRemoteArtifactVerifier,
): Promise<T> {
  if (!("artifact" in value)) return value;
  const artifact = await verifier(value.artifact);
  return Object.freeze({ ...value, artifact }) as T;
}

export function createReceizRemoteDomain(options: ReceizRemoteDomainOptions): ReceizRemoteDomain {
  if (!options.namespace || !options.accessToken
    || !sameDomain(options.commitDomain, RECEIZ_V113_GLOBAL_COMMIT_DOMAIN)
    || typeof options.verifyReturnedArtifact !== "function") {
    throw new TypeError("REMOTE_DOMAIN_OPTIONS_REQUIRED");
  }
  const transport = options.transport ?? createReceizGlobalCoordinationHttpTransport({
    baseUrl: options.baseUrl ?? "https://receiz.com",
    accessToken: options.accessToken,
    ...(options.fetchImpl ? { fetchImpl: options.fetchImpl } : {}),
  });
  const common = {
    namespace: options.namespace,
    commitDomain: options.commitDomain,
    accessToken: options.accessToken,
    transport,
  };
  const admissionStore = createReceizRemoteAdmissionStore(common);
  const transitionStore = createReceizRemoteArtifactTransitionStore(common);

  const planOfflineReconciliation = async (
    input: ReceizOfflineReconciliationPlanInput,
  ): Promise<ReceizOfflineReconciliationPreparationResult> => {
    try {
      const snapshot = await snapshotReceizArtifactInput(input.sealedArtifact);
      const result = record(await transport("reconciliation.plan", {
        namespace: options.namespace,
        commitDomain: options.commitDomain,
        input: {
          ...input,
          sealedArtifact: {
            exactBytesB64u: receizBase64UrlEncode(snapshot.bytes),
            filename: snapshot.filename,
            mimeType: snapshot.mimeType,
          },
        },
      }));
      if (!result) return { status: "failed", code: "NETWORK_UNAVAILABLE" };
      if (result.status !== "planned") return await reverifyArtifactResult(result, options.verifyReturnedArtifact) as ReceizOfflineReconciliationPreparationResult;
      if (!validPlan(result.plan, options.commitDomain, snapshot.artifactDigest.value)) {
        return { status: "rejected", code: "CAPABILITY_MISMATCH", warnings: [] };
      }
      const plan = result.plan;
      if (record(result.capabilityPayload)?.registryDigest !== plan.registryDigest.value) {
        return { status: "rejected", code: "CAPABILITY_MISMATCH", warnings: [] };
      }
      const stage = record(result.stageConfirmation);
      if (stage?.schema !== "receiz.reconciliation-stage-confirmation.v113"
        || record(stage.planDigest)?.value !== plan.planDigest.value
        || record(stage.candidateArtifactDigest)?.value !== plan.candidateArtifactDigest.value) {
        return { status: "rejected", code: "CAPABILITY_MISMATCH", warnings: [] };
      }
      registerRuntimeCustodiedReceizOfflineReconciliationPlan(plan);
      return Object.freeze({ ...result, plan }) as unknown as ReceizOfflineReconciliationPreparationResult;
    } catch {
      return { status: "failed", code: "NETWORK_UNAVAILABLE" };
    }
  };

  const stageOfflineReconciliation = async (
    input: ReceizOfflineReconciliationStageInput,
  ): Promise<ReceizOfflineReconciliationStageResult> => {
    try {
      if (!isRuntimeCustodiedReceizOfflineReconciliationPlan(input.plan)
        || input.confirmation.planDigest.value !== input.plan.planDigest.value) {
        return { status: "rejected", code: "CAPABILITY_MISMATCH" };
      }
      const snapshot = await snapshotReceizArtifactInput(input.sealedArtifact);
      if (snapshot.artifactDigest.value !== input.plan.candidateArtifactDigest.value) {
        return { status: "rejected", code: "STAGED_BYTES_MISMATCH" };
      }
      const result = record(await transport("reconciliation.stage", {
        namespace: options.namespace,
        plan: input.plan,
        signedCapability: input.signedCapability,
        confirmation: input.confirmation,
        artifact: {
          exactBytesB64u: receizBase64UrlEncode(snapshot.bytes),
          filename: snapshot.filename,
          mimeType: snapshot.mimeType,
        },
      }));
      if (!result) return { status: "failed", code: "NETWORK_UNAVAILABLE" };
      if (result.status !== "staged") return result as ReceizOfflineReconciliationStageResult;
      const authenticatedWire = record(result.authenticatedResult);
      if (!authenticatedWire) return { status: "rejected", code: "STAGED_BYTES_MISMATCH" };
      const authenticated = await registerRuntimeAuthenticatedReceizStagingResult(
        Object.freeze({ ...authenticatedWire, plan: input.plan }) as ReceizAuthenticatedStagingResult,
      );
      const reference = await issueAuthenticatedReceizStagedReconciliationReference({
        plan: input.plan,
        exactBytes: snapshot.bytes,
        authenticatedResult: authenticated,
      });
      const confirmation = result.commitConfirmation as ReceizReconciliationCommitConfirmation;
      if (confirmation?.schema !== "receiz.reconciliation-commit-confirmation.v113"
        || confirmation.planDigest?.value !== input.plan.planDigest.value
        || confirmation.stagedReferenceDigest?.binds !== "staged-reconciliation-reference") {
        return { status: "rejected", code: "CAPABILITY_MISMATCH" };
      }
      return Object.freeze({ status: "staged", reference, commitConfirmation: confirmation });
    } catch {
      return { status: "failed", code: "STAGING_FAILED" };
    }
  };

  const commitOfflineReconciliation = async (
    input: ReceizOfflineReconciliationCommitInput,
  ): Promise<ReceizOfflineReconciliationResult> => {
    try {
      const result = record(await transport("reconciliation.commit", {
        namespace: options.namespace,
        ...input,
      }));
      if (!result) return { status: "failed", code: "NETWORK_UNAVAILABLE" };
      return await reverifyArtifactResult(result, options.verifyReturnedArtifact) as ReceizOfflineReconciliationResult;
    } catch {
      return { status: "indeterminate", code: "COMMIT_OUTCOME_UNKNOWN", attemptId: input.plan.attemptId, idempotencyIdentityDigest: input.plan.idempotencyIdentityDigest };
    }
  };

  const resolveAcceptedHead = async (input: ReceizAcceptedHeadResolutionInput): Promise<ReceizAcceptedHeadResolutionResult> => {
    const budget = createReceizRemotePredecessorFetchBudget();
    try {
      budget.observeFetch();
      const result = record(await transport("reconciliation.resolve-head", {
        namespace: options.namespace,
        commitDomain: options.commitDomain,
        input,
      }));
      if (!result) return { status: "failed", code: "NETWORK_UNAVAILABLE" };
      if (result.status !== "resolved") return result as ReceizAcceptedHeadResolutionResult;
      const handshake = record(result.handshake);
      if (handshake?.protocol !== "receiz.global-coordination.v113") return { status: "rejected", code: "REMOTE_PROTOCOL_MISMATCH" };
      if (!sameDomain(handshake.commitDomain, options.commitDomain)) return { status: "rejected", code: "REMOTE_DOMAIN_MISMATCH" };
      if (record(handshake.registryDigest)?.value !== RECEIZ_CURRENT_REGISTRY_DIGEST) return { status: "rejected", code: "REMOTE_REGISTRY_MISMATCH" };
      if (record(handshake.operationMatrixDigest)?.value !== RECEIZ_CURRENT_APPLICATION_OPERATION_MATRIX_DIGEST) return { status: "rejected", code: "REMOTE_OPERATION_MATRIX_MISMATCH" };
      const verified = await reverifyArtifactResult(result, options.verifyReturnedArtifact);
      if (input.knownHead && !containsHead(verified.artifact as ReceizVerifiedArtifact, input.knownHead)) {
        return { status: "rejected", code: "REMOTE_HEAD_ROLLBACK_DETECTED" };
      }
      return verified as unknown as ReceizAcceptedHeadResolutionResult;
    } catch {
      return { status: "failed", code: "NETWORK_UNAVAILABLE" };
    }
  };

  const resolveReconciliationAttempt = async (
    input: ReceizReconciliationAttemptResolutionInput,
  ): Promise<ReceizReconciliationAttemptResolutionResult> => {
    const result = record(await transport("reconciliation.resolve-attempt", { namespace: options.namespace, input }));
    if (!result) return { status: "indeterminate", attemptId: input.attemptId, idempotencyIdentityDigest: { algorithm: "sha-256", binds: "domain-scoped-idempotency-identity", value: "" } };
    return await reverifyArtifactResult(result, options.verifyReturnedArtifact) as ReceizReconciliationAttemptResolutionResult;
  };

  const domain: ReceizRemoteDomain = Object.freeze({
    admissionStore,
    transitionStore,
    planOfflineReconciliation,
    stageOfflineReconciliation,
    commitOfflineReconciliation,
    async reconcileOffline(input) {
      const prepared = await planOfflineReconciliation(input);
      if (prepared.status !== "planned") return prepared;
      const signedCapability = await input.authorize(prepared.capabilityPayload);
      const staged = await stageOfflineReconciliation({
        plan: prepared.plan,
        signedCapability,
        sealedArtifact: input.sealedArtifact,
        confirmation: prepared.stageConfirmation,
      });
      if (staged.status === "rejected") return { ...staged, warnings: prepared.warnings };
      if (staged.status === "failed") return { status: "failed", code: staged.code === "NETWORK_UNAVAILABLE" ? staged.code : "ATOMIC_COMMIT_FAILED" };
      return commitOfflineReconciliation({
        plan: prepared.plan,
        signedCapability,
        stagedReference: staged.reference,
        confirmation: staged.commitConfirmation,
      });
    },
    resolveAcceptedHead,
    resolveReconciliationAttempt,
    async resolveEffectStatus(input) {
      return await transport("reconciliation.resolve-effect", { namespace: options.namespace, input }) as ReceizEffectStatusResolutionResult;
    },
  });
  return domain;
}
