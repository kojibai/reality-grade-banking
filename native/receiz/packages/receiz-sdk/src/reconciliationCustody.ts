import type {
  ReceizOfflineReconciliationPlan,
  ReceizStagedReconciliationReference,
  ReceizStorageIntegrityDigest,
  ReceizVerifiedReconciliationCommitCommand,
  ReceizVerifiedArtifact,
} from "./globalCoordinationTypes.js";
import type { ReceizDigest } from "./artifactTransition.js";
import { digestReceizAuthority } from "./authorityEncoding.js";
import { isReceizVerifiedReconciliationCapability } from "./capabilityAuthority.js";
import { assertReceizReconciliationAdditionBudget } from "./verificationLimits.js";

const verifiedArtifacts = new WeakSet<object>();
const reconciliationPlans = new WeakSet<object>();
const stagedReferences = new WeakSet<object>();
const authenticatedStagingResults = new WeakSet<object>();
const verifiedCommitCommands = new WeakSet<object>();

export type ReceizAuthenticatedStagingResult = Readonly<{
  schema: "receiz.authenticated-staging-result.v113";
  plan: ReceizOfflineReconciliationPlan;
  byteLength: number;
  immutableObjectVersion: string;
  storageIntegrityDigest: ReceizStorageIntegrityDigest;
  storageKeyDigest: ReceizDigest<"candidate-storage-key">;
  authenticationDigest: ReceizDigest<"authenticated-staging-response">;
}>;

export type ReceizAuthenticatedStagingResultBasis = Readonly<
  Omit<ReceizAuthenticatedStagingResult, "authenticationDigest">
>;

function objectValue(value: unknown): value is object {
  return value !== null && typeof value === "object";
}

function recursivelyFreeze<T>(value: T): T {
  if (objectValue(value) && !Object.isFrozen(value)) {
    for (const nested of Object.values(value)) recursivelyFreeze(nested);
    Object.freeze(value);
  }
  return value;
}

export async function createReceizAuthenticatedStagingResultAuthenticationDigest(
  value: ReceizAuthenticatedStagingResultBasis,
): Promise<ReceizDigest<"authenticated-staging-response">> {
  return Object.freeze({
    algorithm: "sha-256" as const,
    binds: "authenticated-staging-response" as const,
    value: await digestReceizAuthority(
      "command",
      "receiz.authenticated-staging-result.v113",
      value,
    ),
  });
}

export function isRuntimeVerifiedReceizArtifact(value: unknown): value is ReceizVerifiedArtifact {
  return objectValue(value) && verifiedArtifacts.has(value);
}

export function isRuntimeCustodiedReceizOfflineReconciliationPlan(
  value: unknown,
): value is ReceizOfflineReconciliationPlan {
  return objectValue(value) && reconciliationPlans.has(value);
}

export function isRuntimeCustodiedReceizStagedReconciliationReference(
  value: unknown,
): value is ReceizStagedReconciliationReference {
  return objectValue(value) && stagedReferences.has(value);
}

/** @internal Issuance is reachable only from verified SDK reconciliation modules. */
export function registerRuntimeVerifiedReceizArtifact(value: ReceizVerifiedArtifact): void {
  verifiedArtifacts.add(value);
}

/** @internal Issuance is reachable only from deterministic SDK reconciliation planning. */
export function registerRuntimeCustodiedReceizOfflineReconciliationPlan(
  value: ReceizOfflineReconciliationPlan,
): void {
  assertReceizReconciliationAdditionBudget(value.additionCount, value.orderedAdditionDigests.length);
  reconciliationPlans.add(value);
}

/** @internal Issuance is reachable only after the remote rail returns an authenticated staged value. */
export function registerRuntimeCustodiedReceizStagedReconciliationReference(
  value: ReceizStagedReconciliationReference,
): void {
  stagedReferences.add(value);
}

/** @internal Called only after the production adapter authenticates its staging response. */
export async function registerRuntimeAuthenticatedReceizStagingResult(
  value: ReceizAuthenticatedStagingResult,
): Promise<ReceizAuthenticatedStagingResult> {
  if (!isRuntimeCustodiedReceizOfflineReconciliationPlan(value.plan)) {
    throw new TypeError("STAGING_AUTHENTICATION_REQUIRED");
  }
  const { authenticationDigest, ...basis } = value;
  const expected = await createReceizAuthenticatedStagingResultAuthenticationDigest(basis);
  if (authenticationDigest.algorithm !== expected.algorithm
    || authenticationDigest.binds !== expected.binds
    || authenticationDigest.value !== expected.value) {
    throw new TypeError("STAGING_AUTHENTICATION_MISMATCH");
  }
  const snapshot = recursivelyFreeze(structuredClone(value));
  authenticatedStagingResults.add(snapshot);
  return snapshot;
}

/** @internal Omitted from the universal SDK entry point. */
export async function issueAuthenticatedReceizStagedReconciliationReference(input: Readonly<{
  plan: ReceizOfflineReconciliationPlan;
  exactBytes: Uint8Array;
  authenticatedResult: ReceizAuthenticatedStagingResult;
}>): Promise<ReceizStagedReconciliationReference> {
  if (!isRuntimeCustodiedReceizOfflineReconciliationPlan(input.plan)
    || !objectValue(input.authenticatedResult)
    || !authenticatedStagingResults.has(input.authenticatedResult)
    || input.authenticatedResult.plan.planDigest.value !== input.plan.planDigest.value) {
    throw new TypeError("STAGING_AUTHENTICATION_REQUIRED");
  }
  const bytes = input.exactBytes.slice();
  const storedDigest = Array.from(
    new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");
  const result = input.authenticatedResult;
  if (storedDigest !== input.plan.candidateArtifactDigest.value
    || result.byteLength !== bytes.byteLength
    || result.storageIntegrityDigest.value !== storedDigest
    || !result.immutableObjectVersion
    || !/^[0-9a-f]{64}$/.test(result.storageKeyDigest.value)
    || !/^[0-9a-f]{64}$/.test(result.authenticationDigest.value)) {
    throw new TypeError("STAGED_BYTES_MISMATCH");
  }
  const reference = Object.freeze({
    commitDomain: input.plan.commitDomain,
    tenantId: input.plan.tenantId,
    artifactId: input.plan.artifactId,
    artifactDigest: input.plan.candidateArtifactDigest,
    reconciliationPlanDigest: input.plan.planDigest,
    proposedAcceptedHead: input.plan.proposedAcceptedHead,
    byteLength: result.byteLength,
    immutableObjectVersion: result.immutableObjectVersion,
    storageIntegrityDigest: result.storageIntegrityDigest,
    storageKeyDigest: result.storageKeyDigest,
    authority: Object.freeze({
      stagingReferenceIsProofAuthority: false as const,
      strongerTruth: "sealed-receiz-proof-object" as const,
    }),
  });
  stagedReferences.add(reference);
  return reference;
}

export function isRuntimeVerifiedReceizReconciliationCommitCommand(
  value: unknown,
): value is ReceizVerifiedReconciliationCommitCommand {
  return objectValue(value) && verifiedCommitCommands.has(value);
}

/** @internal The authenticated remote rail issues this after re-verifying all bound inputs. */
export async function issueRuntimeVerifiedReceizReconciliationCommitCommand(input: Readonly<{
  plan: ReceizOfflineReconciliationPlan;
  stagedReference: ReceizStagedReconciliationReference;
  capability: unknown;
}>): Promise<ReceizVerifiedReconciliationCommitCommand> {
  if (!isRuntimeCustodiedReceizOfflineReconciliationPlan(input.plan)
    || !isRuntimeCustodiedReceizStagedReconciliationReference(input.stagedReference)
    || !isReceizVerifiedReconciliationCapability(input.capability)
    || input.stagedReference.reconciliationPlanDigest.value !== input.plan.planDigest.value
    || input.capability.payload.operationConstraints.planDigest.value !== input.plan.planDigest.value) {
    throw new TypeError("COMMIT_COMMAND_AUTHORITY_REQUIRED");
  }
  const stagedReferenceDigest = Object.freeze({
    algorithm: "sha-256" as const,
    binds: "staged-reconciliation-reference" as const,
    value: await digestReceizAuthority(
      "command",
      "receiz.staged-reconciliation-reference.v113",
      input.stagedReference,
    ),
  });
  const basis = {
    schema: "receiz.verified-reconciliation-commit-command.v113" as const,
    planDigest: input.plan.planDigest,
    capabilityDigest: input.capability.digest,
    stagedReferenceDigest,
    expectedAcceptedHead: input.plan.expectedAcceptedHead,
    commitDomain: input.plan.commitDomain,
    registryDigest: input.plan.registryDigest,
    operationMatrixDigest: input.plan.operationMatrixDigest,
  };
  const command = Object.freeze({
    schema: "receiz.verified-reconciliation-commit-command.v113" as const,
    plan: input.plan,
    stagedReference: input.stagedReference,
    capability: input.capability,
    stagedReferenceDigest,
    commandDigest: Object.freeze({
      algorithm: "sha-256" as const,
      binds: "artifact-transition-command" as const,
      value: await digestReceizAuthority(
        "command",
        "receiz.reconciliation-commit-command.v113",
        basis,
      ),
    }),
    authority: Object.freeze({
      commandIsProofAuthority: false as const,
      strongerTruth: "sealed-receiz-proof-object" as const,
    }),
  });
  verifiedCommitCommands.add(command);
  return command;
}
