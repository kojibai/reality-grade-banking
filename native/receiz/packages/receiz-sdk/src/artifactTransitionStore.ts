import type { ReceizArtifactTransitionAtomicRequirements } from "./artifactTransitionAtomicRequirements.js";
import { createReceizInMemoryAdmissionStore, type ReceizAdmissionStore } from "./admissionStore.js";
import { sha256ReceizBytes } from "./artifacts.js";
import {
  readReceizArtifactTransitionCandidateCustody,
  type ReceizVerifiedArtifactTransitionCandidate,
} from "./artifactTransitionCandidateCustody.js";
import {
  assertReceizArtifactAppendPlanCustody,
  verifyReceizArtifactTransitionCommitCandidate,
  type ReceizArtifactAppendPlan,
  type ReceizArtifactDigest,
  type ReceizArtifactId,
  type ReceizArtifactTransitionDigest,
  type ReceizCapabilityDigest,
  type ReceizCommandDigest,
  type ReceizCommitDomainId,
  type ReceizDigest,
  type ReceizHistoryDigest,
  type ReceizIdempotencyDigest,
  type ReceizPlanDigest,
  type ReceizRegistryDigest,
} from "./artifactTransition.js";
import type { ReceizActorEvidenceDigest, ReceizActorId } from "./artifactAdmissionTypes.js";
import { digestReceizAuthority } from "./authorityEncoding.js";
import { isReceizVerifiedCapability, type ReceizVerifiedCapability } from "./capabilityAuthority.js";
import {
  isReceizTestingArtifactTransitionCommitUnit,
} from "./artifactTransitionCommitCustody.js";
import type { ReceizConstitutionJson } from "./constitution.js";

export type { ReceizVerifiedArtifactTransitionCandidate } from "./artifactTransitionCandidateCustody.js";

export type ReceizStagedCandidateReference = Readonly<{
  commitDomain: ReceizCommitDomainId;
  artifactDigest: ReceizArtifactDigest;
  transitionDigest: ReceizArtifactTransitionDigest;
  storageKeyDigest: ReceizDigest<"candidate-storage-key">;
  authority: Readonly<{
    stagingReferenceIsProofAuthority: false;
    strongerTruth: "sealed-receiz-proof-object";
  }>;
}>;

export type ReceizStagedArtifactTransition = Readonly<{
  status: "staged-transition";
  reference: ReceizStagedCandidateReference;
  exactBytes: Uint8Array;
  filename: string;
  mimeType: string;
  payloadSha256: string;
  committed: false;
}>;

export type ReceizArtifactTransitionCommitCommandBasis = Readonly<{
  atomicRequirements?: ReceizArtifactTransitionAtomicRequirements;
  planDigest: ReceizPlanDigest;
  capabilityDigest: ReceizCapabilityDigest;
  transitionDigest: ReceizArtifactTransitionDigest;
  candidateArtifactDigest: ReceizArtifactDigest;
  stagedCandidateReference: ReceizStagedCandidateReference;
  commitDomain: ReceizCommitDomainId;
}>;

export type ReceizArtifactTransitionCommitUnit = Readonly<{
  commitDomain: ReceizCommitDomainId;
  plan: ReceizArtifactAppendPlan;
  capability: ReceizVerifiedCapability;
  command: ReceizArtifactTransitionCommitCommandBasis & { commandDigest: ReceizCommandDigest };
  expectedHead: ReceizHistoryDigest;
}>;

export type ReceizReportedActorReference = Readonly<{
  actorId: ReceizActorId;
  evidenceDigest: ReceizActorEvidenceDigest;
  admissionProfile: "identity";
  registryDigest: ReceizRegistryDigest;
}>;

export type ReceizAppendReceipt = Readonly<{
  commitDomain: ReceizCommitDomainId;
  actor: ReceizReportedActorReference;
  resource: ReceizArtifactId;
  operation: "artifact.append";
  planDigest: ReceizPlanDigest;
  capabilityDigest: ReceizCapabilityDigest;
  transitionDigest: ReceizArtifactTransitionDigest;
  artifactDigest: ReceizArtifactDigest;
  priorHead: ReceizHistoryDigest;
  acceptedHead: ReceizHistoryDigest;
  commandDigest: ReceizCommandDigest;
  idempotencyIdentityDigest: ReceizIdempotencyDigest;
  authority: Readonly<{
    receiptIsProofAuthority: false;
    strongerTruth: "sealed-receiz-proof-object";
  }>;
}>;

export type ReceizArtifactTransitionCommitResult =
  | Readonly<{ status: "committed" | "idempotent"; receipt: ReceizAppendReceipt }>
  | Readonly<{ status: "conflict"; code: "IDEMPOTENCY_CONFLICT" | "EXPECTED_HEAD_MISMATCH" }>
  | Readonly<{ status: "rejected"; code: "COMMIT_DOMAIN_MISMATCH" | "CANDIDATE_NOT_STAGED" | "CANDIDATE_VERIFICATION_FAILED" | "TRANSITION_MISMATCH" }>
  | Readonly<{ status: "failed"; code: "ATOMIC_COMMIT_FAILED" }>;

export interface ReceizArtifactTransitionStore {
  readonly atomicReadDependencies?: true;
  readonly commitDomain: ReceizCommitDomainId;
  stageCandidate(candidate: ReceizVerifiedArtifactTransitionCandidate): Promise<ReceizStagedArtifactTransition>;
  resolveCandidate(artifactDigest: ReceizArtifactDigest): Promise<ReceizStagedArtifactTransition | null>;
  commitTransition(unit: ReceizArtifactTransitionCommitUnit): Promise<ReceizArtifactTransitionCommitResult>;
}

type StoredCandidate = Readonly<{
  reference: ReceizStagedCandidateReference;
  exactBytes: Uint8Array;
  planDigest: ReceizPlanDigest;
  filename: string;
  mimeType: string;
  payloadSha256: string;
  createdAt: number;
}>;

function clone<T>(value: T): T {
  return structuredClone(value);
}

function freeze<T extends object>(value: T): Readonly<T> {
  return Object.freeze(value);
}

function digest<Binding extends string>(binds: Binding, value: string): ReceizDigest<Binding> {
  return freeze({ algorithm: "sha-256", binds, value });
}

function sameDomain(left: ReceizCommitDomainId, right: ReceizCommitDomainId): boolean {
  return left.scheme === right.scheme && left.value === right.value;
}

function sameDigest<Binding extends string>(left: ReceizDigest<Binding>, right: ReceizDigest<Binding>): boolean {
  return left.algorithm === right.algorithm && left.binds === right.binds && left.value === right.value;
}

function sameBytes(left: Uint8Array, right: Uint8Array): boolean {
  return left.byteLength === right.byteLength && left.every((byte, index) => byte === right[index]);
}

function sameStagedReference(
  left: ReceizStagedCandidateReference,
  right: ReceizStagedCandidateReference,
): boolean {
  return sameDomain(left.commitDomain, right.commitDomain)
    && sameDigest(left.artifactDigest, right.artifactDigest)
    && sameDigest(left.transitionDigest, right.transitionDigest)
    && sameDigest(left.storageKeyDigest, right.storageKeyDigest)
    && left.authority.stagingReferenceIsProofAuthority === right.authority.stagingReferenceIsProofAuthority
    && left.authority.strongerTruth === right.authority.strongerTruth;
}

function stagedSnapshot(value: StoredCandidate): ReceizStagedArtifactTransition {
  return freeze({
    status: "staged-transition",
    reference: clone(value.reference),
    exactBytes: value.exactBytes.slice(),
    filename: value.filename,
    mimeType: value.mimeType,
    payloadSha256: value.payloadSha256,
    committed: false,
  });
}

export type ReceizInMemoryArtifactTransitionStore = ReceizArtifactTransitionStore & Readonly<{
  seedHead(resource: ReceizArtifactId, head: ReceizHistoryDigest): Promise<void>;
  seedAcceptedHeadForTesting(
    resource: ReceizArtifactId,
    head: ReceizHistoryDigest,
    artifactDigest: ReceizArtifactDigest,
  ): Promise<void>;
  corruptStagedCandidateForTesting(artifactDigest: ReceizArtifactDigest, replacement: Uint8Array): void;
  collectOrphanedCandidates(input: Readonly<{ createdBefore: number }>): Promise<number>;
  inspect(): Promise<Readonly<{
    staged: readonly ReceizStagedCandidateReference[];
    heads: readonly Readonly<{ resource: ReceizArtifactId; head: ReceizHistoryDigest }>[];
    idempotency: readonly ReceizConstitutionJson[];
  }>>;
}>;

export type ReceizArtifactTransitionStoreVerificationInput = Readonly<{
  exactBytes: Uint8Array;
  staged: ReceizStagedArtifactTransition;
  plan: ReceizArtifactAppendPlan;
  capability: ReceizVerifiedCapability;
  command: ReceizArtifactTransitionCommitUnit["command"];
}>;

/**
 * Synthetic adapter mechanics for `@receiz/sdk/testing` only. The callback is
 * conformance instrumentation, never canonical artifact proof authority. The
 * universal SDK exports only the store contract; Task 7 supplies the
 * runtime-custodied canonical verification choreography.
 */
export function createReceizInMemoryArtifactTransitionStore(options: Readonly<{
  commitDomain: ReceizCommitDomainId;
  verifyCandidate: (input: ReceizArtifactTransitionStoreVerificationInput) => boolean | Promise<boolean>;
  failBeforeSwap?: (unit: ReceizArtifactTransitionCommitUnit) => boolean;
  loseResponseAfterCommit?: (unit: ReceizArtifactTransitionCommitUnit) => boolean;
  observeLedgerRead?: () => void;
  now?: () => number;
  mutateRetainedCandidateBeforeVerification?: (input: Readonly<{
    exactBytes: Uint8Array;
    unit: ReceizArtifactTransitionCommitUnit;
  }>) => Uint8Array | null;
  decorateReceiptResult?: (receipt: ReceizConstitutionJson) => ReceizConstitutionJson;
  beforeIdempotencyRead?: () => void | Promise<void>;
}>): ReceizInMemoryArtifactTransitionStore {
  const commitDomain = freeze(clone(options.commitDomain));
  const now = options.now ?? Date.now;
  const staged = new Map<string, StoredCandidate>();
  const inFlightResolutions = new Map<string, number>();
  let activeCommitUnit: ReceizArtifactTransitionCommitUnit | null = null;
  const admissionStore: ReceizAdmissionStore = createReceizInMemoryAdmissionStore({
    failBeforeSwap: () => activeCommitUnit !== null && Boolean(options.failBeforeSwap?.(activeCommitUnit)),
  });

  function aggregateId(resource: ReceizArtifactId): string {
    return `${commitDomain.value}\u0000${resource}`;
  }

  function idempotencyId(plan: ReceizArtifactAppendPlan): string {
    return [
      commitDomain.value,
      plan.actor.actorId,
      plan.resource,
      plan.operation,
      plan.idempotencyKeyDigest.value,
    ].join("\u0000");
  }

  function receiptFrom(value: ReceizConstitutionJson): ReceizAppendReceipt {
    const receipt = clone(value);
    return clone(options.decorateReceiptResult?.(receipt) ?? receipt) as unknown as ReceizAppendReceipt;
  }

  const store: ReceizInMemoryArtifactTransitionStore = {
    commitDomain,
    async stageCandidate(candidate) {
      const custody = readReceizArtifactTransitionCandidateCustody(candidate);
      if (!custody || !sameDomain(custody.commitDomain, commitDomain)) throw new TypeError("CANDIDATE_VERIFICATION_FAILED");
      assertReceizArtifactAppendPlanCustody(custody.plan);
      if (!sameDigest(custody.plan.planDigest, candidate.planDigest)
        || !sameDigest(custody.plan.transitionDigest, candidate.transitionDigest)
        || !sameDomain(custody.plan.commitDomain, commitDomain)) throw new TypeError("CANDIDATE_VERIFICATION_FAILED");
      const actual = await sha256ReceizBytes(custody.exactBytes);
      if (actual !== candidate.artifactDigest.value) throw new TypeError("CANDIDATE_VERIFICATION_FAILED");
      const existing = staged.get(candidate.artifactDigest.value);
      if (existing) {
        if (!sameBytes(existing.exactBytes, custody.exactBytes)
          || !sameDigest(existing.reference.transitionDigest, candidate.transitionDigest)
          || !sameDigest(existing.planDigest, candidate.planDigest)) throw new TypeError("CANDIDATE_VERIFICATION_FAILED");
        return stagedSnapshot(existing);
      }
      const storageKeyDigest = digest(
        "candidate-storage-key",
        await digestReceizAuthority("command", "receiz.candidate-storage-key.v112", {
          commitDomain,
          artifactDigest: candidate.artifactDigest,
        }),
      );
      const reference: ReceizStagedCandidateReference = freeze({
        commitDomain,
        artifactDigest: clone(candidate.artifactDigest),
        transitionDigest: clone(candidate.transitionDigest),
        storageKeyDigest,
        authority: freeze({
          stagingReferenceIsProofAuthority: false as const,
          strongerTruth: "sealed-receiz-proof-object" as const,
        }),
      });
      const record: StoredCandidate = freeze({
        reference,
        exactBytes: custody.exactBytes.slice(),
        planDigest: clone(candidate.planDigest),
        filename: custody.filename,
        mimeType: custody.mimeType,
        payloadSha256: custody.payloadSha256,
        createdAt: now(),
      });
      staged.set(candidate.artifactDigest.value, record);
      return stagedSnapshot(record);
    },
    async resolveCandidate(artifactDigest) {
      const value = staged.get(artifactDigest.value);
      return value ? stagedSnapshot(value) : null;
    },
    atomicReadDependencies: true,
    async commitTransition(unit) {
      // Failure ordering is statute: no ledger read or authority inspection precedes this check.
      if (!sameDomain(unit.commitDomain, commitDomain)) {
        return { status: "rejected", code: "COMMIT_DOMAIN_MISMATCH" };
      }
      options.observeLedgerRead?.();
      try {
        assertReceizArtifactAppendPlanCustody(unit.plan);
      } catch {
        return { status: "rejected", code: "TRANSITION_MISMATCH" };
      }
      if (!isReceizVerifiedCapability(unit.capability)
        || !sameDomain(unit.plan.commitDomain, commitDomain)
        || !sameDomain(unit.capability.payload.operationConstraints.commitDomain, commitDomain)
        || !sameDomain(unit.command.commitDomain, commitDomain)
        || !sameDomain(unit.command.stagedCandidateReference.commitDomain, commitDomain)
        || !sameDigest(unit.command.planDigest, unit.plan.planDigest)
        || !sameDigest(unit.command.transitionDigest, unit.plan.transitionDigest)
        || !sameDigest(unit.command.stagedCandidateReference.transitionDigest, unit.plan.transitionDigest)
        || !sameDigest(unit.command.capabilityDigest, digest("verified-capability", unit.capability.digest))
        || !sameDigest(unit.capability.payload.operationConstraints.planDigest, unit.plan.planDigest)
        || unit.capability.payload.actorId !== unit.plan.actor.actorId
        || !unit.capability.payload.operations.includes("artifact.append")
        || !unit.capability.payload.resourceScopes.includes(unit.plan.resource)
        || !sameDigest(unit.expectedHead, unit.plan.transition.expectedHead)) {
        return { status: "rejected", code: "TRANSITION_MISMATCH" };
      }
      const { commandDigest: suppliedCommandDigest, ...commandBasis } = unit.command;
      const expectedCommandDigest = digest(
        "artifact-transition-command",
        await digestReceizAuthority("command", "receiz.artifact-transition-command.v112", commandBasis),
      );
      if (!sameDigest(suppliedCommandDigest, expectedCommandDigest)) {
        return { status: "rejected", code: "TRANSITION_MISMATCH" };
      }

      const stored = staged.get(unit.command.candidateArtifactDigest.value);
      if (!stored) return { status: "rejected", code: "CANDIDATE_NOT_STAGED" };
      if (!sameDigest(stored.planDigest, unit.plan.planDigest)
        || !sameDigest(stored.planDigest, unit.command.planDigest)
        || !sameDigest(stored.reference.transitionDigest, unit.plan.transitionDigest)
        || !sameDigest(stored.reference.transitionDigest, unit.command.transitionDigest)
        || !sameStagedReference(stored.reference, unit.command.stagedCandidateReference)
        || !sameDigest(stored.reference.artifactDigest, unit.command.candidateArtifactDigest)
        || !sameDigest(stored.reference.artifactDigest, unit.command.stagedCandidateReference.artifactDigest)) {
        return { status: "rejected", code: "TRANSITION_MISMATCH" };
      }
      const idemKey = idempotencyId(unit.plan);
      const candidateKey = stored.reference.artifactDigest.value;
      inFlightResolutions.set(candidateKey, (inFlightResolutions.get(candidateKey) ?? 0) + 1);
      try {
        await options.beforeIdempotencyRead?.();
        const existingIdempotency = await admissionStore.readIdempotency(idemKey);
        const replacement = options.mutateRetainedCandidateBeforeVerification?.({
          exactBytes: stored.exactBytes.slice(),
          unit,
        }) ?? null;
        const exactBytes = replacement ? replacement.slice() : stored.exactBytes.slice();
        if (await sha256ReceizBytes(exactBytes) !== stored.reference.artifactDigest.value) {
          return { status: "rejected", code: "CANDIDATE_VERIFICATION_FAILED" };
        }
        const detachedStaged = stagedSnapshot(stored);
        const verificationInput = {
          exactBytes: exactBytes.slice(),
          staged: detachedStaged,
          plan: unit.plan,
          capability: unit.capability,
          command: unit.command,
        };
        const canonicalVerified = await verifyReceizArtifactTransitionCommitCandidate(unit, verificationInput);
        const verified = canonicalVerified || (isReceizTestingArtifactTransitionCommitUnit(unit)
          ? await options.verifyCandidate(verificationInput)
          : false);
        if (!verified) return { status: "rejected", code: "CANDIDATE_VERIFICATION_FAILED" };

        if (existingIdempotency) {
          return existingIdempotency.commandDigest === unit.command.commandDigest.value
            ? { status: "idempotent", receipt: receiptFrom(existingIdempotency.receipt) }
            : { status: "conflict", code: "IDEMPOTENCY_CONFLICT" };
        }

        const aggregate = await admissionStore.readAggregate(aggregateId(unit.plan.resource));
        if (!aggregate || aggregate.headDigest !== unit.expectedHead.value) {
          return { status: "conflict", code: "EXPECTED_HEAD_MISMATCH" };
        }
        const receipt: ReceizAppendReceipt = freeze({
        commitDomain,
        actor: freeze({
          actorId: unit.plan.actor.actorId,
          evidenceDigest: clone(unit.plan.actor.evidenceDigest),
          admissionProfile: "identity" as const,
          registryDigest: clone(unit.plan.actor.registryDigest),
        }),
        resource: unit.plan.resource,
        operation: "artifact.append" as const,
        planDigest: clone(unit.plan.planDigest),
        capabilityDigest: clone(unit.command.capabilityDigest),
        transitionDigest: clone(unit.plan.transitionDigest),
        artifactDigest: clone(stored.reference.artifactDigest),
        priorHead: clone(unit.expectedHead),
        acceptedHead: clone(unit.plan.transition.proposedHistoryHead),
        commandDigest: clone(unit.command.commandDigest),
        idempotencyIdentityDigest: clone(unit.plan.idempotencyKeyDigest),
        authority: freeze({
          receiptIsProofAuthority: false as const,
          strongerTruth: "sealed-receiz-proof-object" as const,
        }),
      });
        activeCommitUnit = unit;
        const atomicPromise = admissionStore.commit({
        schema: "receiz.admission.unit-of-work.v1",
        ...(unit.command.atomicRequirements ? {
          readDependencies: unit.command.atomicRequirements.readDependencies.map((entry) => ({ aggregateId: aggregateId(entry.resource), expectedHeadDigest: entry.expectedHeadDigest })),
          consumedPbiReceiptDigests: unit.command.atomicRequirements.consumedPbiReceiptDigests,
        } : {}),
        aggregateId: aggregateId(unit.plan.resource),
        commandDigest: unit.command.commandDigest.value,
        idempotencyKey: idemKey,
        expectedRevision: aggregate.revision,
        expectedHeadDigest: unit.expectedHead.value,
        acceptedCommand: clone(unit.command) as unknown as ReceizConstitutionJson,
        events: [{
          type: "receiz.artifact-transition.accepted.v112",
          artifactDigest: stored.reference.artifactDigest.value,
          transitionDigest: unit.plan.transitionDigest.value,
        }],
        nextHead: {
          revision: aggregate.revision + 1,
          digest: unit.plan.transition.proposedHistoryHead.value,
          state: { artifactDigest: stored.reference.artifactDigest.value },
        },
        resourceEffects: { "artifact.append": 1 },
        receipt: clone(receipt) as unknown as ReceizConstitutionJson,
        outboxIntents: [],
        auditReference: { commandDigest: unit.command.commandDigest.value },
        });
        activeCommitUnit = null;
        const atomic = await atomicPromise;
        if (atomic.status === "conflict") {
          return { status: "conflict", code: atomic.code === "IDEMPOTENCY_CONFLICT"
            ? "IDEMPOTENCY_CONFLICT"
            : "EXPECTED_HEAD_MISMATCH" };
        }
        if (atomic.status === "failed") {
          return { status: "failed", code: "ATOMIC_COMMIT_FAILED" };
        }
        if (atomic.status !== "committed" && atomic.status !== "idempotent") {
          return { status: "failed", code: "ATOMIC_COMMIT_FAILED" };
        }
        if (options.loseResponseAfterCommit?.(unit)) throw new Error("SIMULATED_LOST_RESPONSE");
        return { status: atomic.status, receipt: receiptFrom(atomic.receipt) };
      } finally {
        const remaining = (inFlightResolutions.get(candidateKey) ?? 1) - 1;
        if (remaining === 0) inFlightResolutions.delete(candidateKey);
        else inFlightResolutions.set(candidateKey, remaining);
      }
    },
    seedHead(resource, head) {
      return admissionStore.seedAggregate({
        aggregateId: aggregateId(resource),
        revision: 0,
        headDigest: head.value,
        state: {},
      });
    },
    seedAcceptedHeadForTesting(resource, head, artifactDigest) {
      return admissionStore.seedAggregate({
        aggregateId: aggregateId(resource),
        revision: 1,
        headDigest: head.value,
        state: { artifactDigest: artifactDigest.value },
      });
    },
    corruptStagedCandidateForTesting(artifactDigest, replacement) {
      const value = staged.get(artifactDigest.value);
      if (!value) throw new TypeError("CANDIDATE_NOT_STAGED");
      staged.set(artifactDigest.value, freeze({
        ...value,
        exactBytes: replacement.slice(),
      }));
    },
    async collectOrphanedCandidates({ createdBefore }) {
      const inspection = await admissionStore.inspect();
      const protectedDigests = new Set<string>();
      for (const receipt of inspection.receipts) {
        const artifactDigest = (receipt as { artifactDigest?: { value?: unknown } }).artifactDigest?.value;
        if (typeof artifactDigest === "string") protectedDigests.add(artifactDigest);
      }
      for (const record of inspection.idempotencyRecords) {
        const artifactDigest = (record as { receipt?: { artifactDigest?: { value?: unknown } } }).receipt?.artifactDigest?.value;
        if (typeof artifactDigest === "string") protectedDigests.add(artifactDigest);
      }
      for (const head of inspection.heads) {
        const artifactDigest = (head as { state?: { artifactDigest?: unknown } }).state?.artifactDigest;
        if (typeof artifactDigest === "string") protectedDigests.add(artifactDigest);
      }
      let removed = 0;
      for (const [artifactDigest, value] of staged) {
        if (value.createdAt < createdBefore
          && !protectedDigests.has(artifactDigest)
          && !inFlightResolutions.has(artifactDigest)) {
          staged.delete(artifactDigest);
          removed += 1;
        }
      }
      return removed;
    },
    async inspect() {
      const inspection = await admissionStore.inspect();
      return clone({
        staged: [...staged.values()].map((value) => value.reference),
        heads: inspection.heads.map((head) => ({
          resource: String((head as { aggregateId: string }).aggregateId).split("\u0000").at(-1)!,
          head: digest("verified-proof-history", String((head as { headDigest: string }).headDigest)),
        })),
        idempotency: inspection.idempotencyRecords,
      });
    },
  };
  return store;
}

export type ReceizArtifactTransitionStoreConformanceReport = Readonly<{
  schema: "receiz.artifact-transition-store.conformance.v112";
  ok: boolean;
  checks: Readonly<{
    immutableStaging: boolean;
    domainIsolation: boolean;
    domainFailureOrdering: boolean;
    optimisticHead: boolean;
    idempotentRetry: boolean;
    idempotencyConflict: boolean;
    crashRollback: boolean;
    acceptedBytesGcProtected: boolean;
  }>;
}>;

export async function runReceizArtifactTransitionStoreConformance(input: Readonly<{
  create(options?: Partial<Parameters<typeof createReceizInMemoryArtifactTransitionStore>[0]>): ReceizInMemoryArtifactTransitionStore;
  prepare(store: ReceizInMemoryArtifactTransitionStore): Promise<ReceizArtifactTransitionCommitUnit>;
  prepareConflict(store: ReceizInMemoryArtifactTransitionStore): Promise<ReceizArtifactTransitionCommitUnit>;
}>): Promise<ReceizArtifactTransitionStoreConformanceReport> {
  const store = input.create();
  const isolated = input.create();
  const unit = await input.prepare(store);
  const resolved = await store.resolveCandidate(unit.command.candidateArtifactDigest);
  if (resolved) resolved.exactBytes.fill(0);
  const detached = await store.resolveCandidate(unit.command.candidateArtifactDigest);
  const first = await store.commitTransition(unit);
  const retry = await store.commitTransition(unit);
  const conflict = await store.commitTransition(await input.prepareConflict(store));
  await store.collectOrphanedCandidates({ createdBefore: Number.POSITIVE_INFINITY });
  const protectedCandidate = await store.resolveCandidate(unit.command.candidateArtifactDigest);

  let mismatchReads = 0;
  const mismatchStore = input.create({ observeLedgerRead: () => { mismatchReads += 1; } });
  const mismatchUnit = await input.prepare(mismatchStore);
  const mismatch = await mismatchStore.commitTransition({
    ...mismatchUnit,
    commitDomain: freeze({ scheme: "receiz-commit-domain.v1", value: `${mismatchUnit.commitDomain.value}:other` }),
  });

  const crashing = input.create({ failBeforeSwap: () => true });
  const crashUnit = await input.prepare(crashing);
  const beforeCrash = await crashing.inspect();
  let crash: ReceizArtifactTransitionCommitResult;
  try {
    crash = await crashing.commitTransition(crashUnit);
  } catch {
    crash = { status: "failed", code: "ATOMIC_COMMIT_FAILED" };
  }
  const afterCrash = await crashing.inspect();

  const checks = {
    immutableStaging: detached !== null && detached.exactBytes.some((byte) => byte !== 0),
    domainIsolation: await isolated.resolveCandidate(unit.command.candidateArtifactDigest) === null,
    domainFailureOrdering: mismatch.status === "rejected" && mismatch.code === "COMMIT_DOMAIN_MISMATCH" && mismatchReads === 0,
    optimisticHead: first.status === "committed",
    idempotentRetry: retry.status === "idempotent",
    idempotencyConflict: conflict.status === "conflict" && conflict.code === "IDEMPOTENCY_CONFLICT",
    crashRollback: crash.status === "failed"
      && afterCrash.idempotency.length === beforeCrash.idempotency.length
      && afterCrash.heads[0]?.head.value === beforeCrash.heads[0]?.head.value,
    acceptedBytesGcProtected: protectedCandidate !== null,
  };
  return freeze({
    schema: "receiz.artifact-transition-store.conformance.v112",
    ok: Object.values(checks).every(Boolean),
    checks,
  });
}
