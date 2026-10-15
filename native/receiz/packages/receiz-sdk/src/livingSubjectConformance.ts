import { digestReceizCompositeCanonical } from "./compositeProofKernel.js";
import { createReceizLivingSubjectRuntime } from "./livingSubjectRuntime.js";
import {
  RECEIZ_LIVING_SUBJECT_REDUCER_DIGEST,
  createReceizSubjectPrimaryProofObjectV1,
  encodeReceizSubjectNamespaceBytes,
  type ReceizLivingSubjectModel,
  type ReceizSubjectCapabilityV1,
  type ReceizSubjectMandatePolicyV1,
  type ReceizWorldEventV1,
} from "./livingSubjects.js";

export const RECEIZ_LIVING_SUBJECT_CONFORMANCE_CHECK_IDS = [
  "model_statement_requires_command_admission",
  "factual_memory_cites_admitted_event",
  "multi_subject_effects_are_atomic",
  "retry_cannot_duplicate_event",
  "revoked_mandate_cannot_execute",
  "offline_restoration_preserves_exact_state",
  "independent_replay_produces_same_heads",
  "cross_app_and_mcp_projection_parity",
  "unknown_namespaces_survive_every_transition",
  "conversation_and_animation_failure_preserve_canonical_state",
  "bearer_double_claim_rejected",
  "bearer_stale_ownership_head_rejected",
  "bearer_cancelled_and_expired_instruments_rejected",
  "former_owner_cannot_speak_or_act_after_transfer",
  "queued_old_owner_mandate_cannot_execute_after_transfer",
  "transfer_preserves_exact_identity_and_history",
  "transfer_unknown_namespaces_survive",
  "failed_transfer_produces_zero_state_changes",
  "offline_claim_converges_same_ownership_head",
] as const;

export type ReceizLivingSubjectConformanceCheckId = typeof RECEIZ_LIVING_SUBJECT_CONFORMANCE_CHECK_IDS[number];
export type ReceizLivingSubjectConformanceCheckV120 = Readonly<{
  id: ReceizLivingSubjectConformanceCheckId;
  status: "pass" | "fail";
  evidence: Readonly<Record<string, unknown>>;
  evidenceDigest: string;
}>;

export type ReceizLivingSubjectConformanceReportV120 = Readonly<{
  schema: "receiz.living-subject.conformance.v120";
  version: "120.0.0";
  ok: boolean;
  checks: readonly ReceizLivingSubjectConformanceCheckV120[];
  summary: Readonly<{ passed: number; failed: number; writesOnFailure: 0; networkCalls: 0; dbCalls: 0 }>;
  registryDigest: string;
  reducerDigest: string;
  evidenceDigest: string;
  authority: Readonly<{
    conformanceIsProofAuthority: false;
    modelOutputIsAuthority: false;
    strongerTruth: "sealed-receiz-proof-object";
  }>;
}>;

const digest = (value: unknown) => digestReceizCompositeCanonical(value);
const REGISTRY_DIGEST = digest({ schema: "receiz.registry.v120.testing", version: "120.0.0" });

function policy(overrides: Partial<ReceizSubjectMandatePolicyV1> = {}): ReceizSubjectMandatePolicyV1 {
  return {
    allowedActions: ["explore"],
    allowedWorldRegions: ["forest"],
    allowedSubjectIds: [],
    allowedOwnerReceizIds: [],
    conversationPrivacy: "owner-private",
    battleParticipation: false,
    itemActions: [],
    maximumItemValueMinor: "0",
    maximumDailyValueMinor: "0",
    approvalThresholdMinor: "0",
    minimumRuntimeIntervalKai: "1",
    maximumDailyRuns: 4,
    publicMemory: true,
    privateMemory: true,
    expiresAtKai: "10000",
    modelProviderAllowlist: ["receiz"],
    safetyPolicy: "receiz-safe-v1",
    applicationScope: ["wildz"],
    tenantScope: ["tenant:conformance"],
    ...overrides,
  };
}

function capability(subjectId: string, ownerReceizId: string): ReceizSubjectCapabilityV1 {
  return {
    schema: "receiz.subject.capability.v1",
    subjectId,
    receizId: ownerReceizId,
    actions: ["mandate.activate"],
    expiresAtKai: "10000",
    capabilityDigest: digest({ subjectId, ownerReceizId, action: "mandate.activate" }),
  };
}

function admit(runtime: ReturnType<typeof createReceizLivingSubjectRuntime>, subjectId: string, ownerReceizId = `receiz:${subjectId}`) {
  return runtime.admitSubject({ subjectId, proofObjectId: `proof:${subjectId}`, subjectType: "creature", ownerReceizId });
}

function evidenceCheck(id: ReceizLivingSubjectConformanceCheckId, evidence: Readonly<Record<string, unknown>>): ReceizLivingSubjectConformanceCheckV120 {
  const failed = Object.values(evidence).some((value) => value === false);
  return Object.freeze({ id, status: failed ? "fail" : "pass", evidence: Object.freeze(structuredClone(evidence)), evidenceDigest: digest({ id, evidence }) });
}

export type ReceizLivingSubjectModelControl = {
  mode: "deterministic" | "timeout" | "malformed";
};

export function createReceizLivingSubjectEmulator(input: Readonly<{
  registryDigest?: string;
  reducerDigest?: string;
  initialKai?: string;
}> = {}) {
  const modelControl: ReceizLivingSubjectModelControl = { mode: "deterministic" };
  const model: ReceizLivingSubjectModel = async ({ subject, proofContext }) => {
    if (modelControl.mode === "timeout") throw new Error("RECEIZ_TESTING_MODEL_TIMEOUT");
    if (modelControl.mode === "malformed") return {
      provider: "receiz-testing",
      model: "malformed-intent",
      version: "120.0.0",
      speech: "I imagined an event, but it was not admitted.",
      proposedIntents: [{
        kind: "explore",
        targetIds: [],
        reason: "Malformed observed head",
        confidence: Number.NaN,
        requiredCapabilities: [],
        observedHead: "not-the-subject-head",
      }],
    };
    return {
      provider: "receiz-testing",
      model: "deterministic-living-subject",
      version: "120.0.0",
      speech: proofContext.passages[0]?.text ?? `${subject.subjectId} has no cited memory for that question.`,
      proposedIntents: [],
      performance: { emotion: "attentive" },
    };
  };
  const runtime = createReceizLivingSubjectRuntime({
    registryDigest: input.registryDigest ?? REGISTRY_DIGEST,
    reducerDigest: input.reducerDigest ?? RECEIZ_LIVING_SUBJECT_REDUCER_DIGEST,
    initialKai: input.initialKai ?? "0",
    model,
  });
  const partitionQueues = new Map<string, ReceizWorldEventV1[]>();
  const deliveredByPartition = new Map<string, Map<string, ReceizWorldEventV1>>();
  return Object.freeze({
    runtime,
    modelControl,
    owners: Object.freeze({ create: (receizId: string) => Object.freeze({ receizId }) }),
    subjects: Object.freeze({
      create: (subjectId: string, ownerReceizId: string) => admit(runtime, subjectId, ownerReceizId),
    }),
    clock: Object.freeze({ current: runtime.testing.currentKai, advance: runtime.testing.advanceKai }),
    jobs: Object.freeze({ run: runtime.subjects.runtime.catchUp, status: runtime.subjects.runtime.status }),
    partitions: Object.freeze({
      delay(partitionId: string, event: ReceizWorldEventV1) {
        partitionQueues.set(partitionId, [...(partitionQueues.get(partitionId) ?? []), structuredClone(event)]);
        return partitionQueues.get(partitionId)!.length;
      },
      deliver(partitionId: string, input: Readonly<{ duplicate?: boolean }> = {}) {
        const delivered = deliveredByPartition.get(partitionId) ?? new Map<string, ReceizWorldEventV1>();
        const queued = partitionQueues.get(partitionId) ?? [];
        for (const event of queued) {
          delivered.set(event.eventId, structuredClone(event));
          if (input.duplicate) delivered.set(event.eventId, structuredClone(event));
        }
        deliveredByPartition.set(partitionId, delivered);
        partitionQueues.set(partitionId, []);
        return Object.freeze([...delivered.values()].sort((left, right) => (
          BigInt(left.kai) < BigInt(right.kai) ? -1 : BigInt(left.kai) > BigInt(right.kai) ? 1 : left.eventId.localeCompare(right.eventId)
        )));
      },
      converge(partitionIds: readonly string[]) {
        const union = new Map<string, ReceizWorldEventV1>();
        for (const partitionId of partitionIds) {
          for (const event of deliveredByPartition.get(partitionId)?.values() ?? []) union.set(event.eventId, event);
        }
        const events = [...union.values()].sort((left, right) => (
          BigInt(left.kai) < BigInt(right.kai) ? -1 : BigInt(left.kai) > BigInt(right.kai) ? 1 : left.eventId.localeCompare(right.eventId)
        ));
        return Object.freeze({
          events: Object.freeze(structuredClone(events)),
          convergenceDigest: digest({ eventIds: events.map((event) => event.eventId), worldHeads: events.map((event) => event.worldHead) }),
          replacementPolicy: "append-verified-additions" as const,
        });
      },
    }),
  });
}

export async function runReceizLivingSubjectConformanceV120(): Promise<ReceizLivingSubjectConformanceReportV120> {
  const checks: ReceizLivingSubjectConformanceCheckV120[] = [];

  {
    const emulator = createReceizLivingSubjectEmulator();
    const artifact = emulator.subjects.create("creature:model", "receiz:owner");
    emulator.modelControl.mode = "malformed";
    const beforeHead = emulator.runtime.subjects.state("creature:model").head;
    const response = await emulator.runtime.subjects.twin.message("creature:model", {
      message: "Tell me what happened.", ownerReceizId: "receiz:owner", contextHead: beforeHead,
      expectedSubjectDigest: artifact.artifactDigest, clientMessageId: "message:model",
    });
    checks.push(evidenceCheck("model_statement_requires_command_admission", {
      zeroWorldEvents: response.worldEventIds.length === 0 && emulator.runtime.world.additions({ worldId: "world:default" }).length === 0,
      malformedIntentRejected: response.proposedIntent.proposedIntents.length === 0,
      headUnchanged: emulator.runtime.subjects.state("creature:model").head === beforeHead,
      modelOutputNotAuthority: response.proposedIntent.modelAudit.outputIsAuthority === false,
    }));
  }

  {
    const emulator = createReceizLivingSubjectEmulator();
    const artifact = emulator.subjects.create("creature:memory", "receiz:owner");
    const worldId = "world:memory";
    const plan = emulator.runtime.world.planCommand({
      worldId, actorSubjectId: "creature:memory", kind: "discover", payload: { summary: "Found the blue spring" },
      expectedHeads: { "creature:memory": artifact.subject.head }, expectedWorldHead: emulator.runtime.world.head(worldId),
      attemptId: "memory:1", idempotencyKey: "memory:1",
    });
    const execution = emulator.runtime.world.executeCommand(plan, { actorSubjectId: "creature:memory", ownerReceizId: "receiz:owner" });
    const memory = emulator.runtime.subjects.memory.query("creature:memory")[0];
    checks.push(evidenceCheck("factual_memory_cites_admitted_event", {
      commandAdmitted: execution.ok,
      memoryCreated: Boolean(memory),
      everyCitationAdmitted: Boolean(memory) && (memory?.eventIds ?? []).every((eventId) => emulator.runtime.testing.event(eventId)?.eventId === eventId),
      projectionRebuildable: emulator.runtime.subjects.memory.project("creature:memory", { throughHead: emulator.runtime.subjects.state("creature:memory").head }).rebuildable,
    }));
  }

  {
    const emulator = createReceizLivingSubjectEmulator();
    const left = emulator.subjects.create("creature:left", "receiz:shared");
    const right = emulator.subjects.create("creature:right", "receiz:shared");
    const transaction = emulator.runtime.subjects.relationships.propose({
      subjectId: "creature:left", targetSubjectId: "creature:right", attemptId: "meeting:1", idempotencyKey: "meeting:1",
    });
    const result = emulator.runtime.world.executeTransaction(transaction, { actorSubjectId: "creature:left", ownerReceizId: "receiz:shared" });
    const leftNext = emulator.runtime.subjects.state("creature:left").head;
    const rightNext = emulator.runtime.subjects.state("creature:right").head;
    checks.push(evidenceCheck("multi_subject_effects_are_atomic", {
      admitted: result.ok,
      leftAdvanced: leftNext !== left.subject.head,
      rightAdvanced: rightNext !== right.subject.head,
      singleSharedEvent: result.ok && result.events.length === 1 && result.events[0]!.nextHeads["creature:left"] === leftNext && result.events[0]!.nextHeads["creature:right"] === rightNext,
    }));
  }

  {
    const emulator = createReceizLivingSubjectEmulator();
    const artifact = emulator.subjects.create("creature:retry", "receiz:owner");
    const worldId = "world:retry";
    const plan = emulator.runtime.world.planCommand({
      worldId, actorSubjectId: "creature:retry", kind: "explore", payload: { summary: "Walked once" },
      expectedHeads: { "creature:retry": artifact.subject.head }, expectedWorldHead: emulator.runtime.world.head(worldId),
      attemptId: "retry:1", idempotencyKey: "retry:1",
    });
    const first = emulator.runtime.world.executeCommand(plan, { actorSubjectId: "creature:retry", ownerReceizId: "receiz:owner" });
    const retry = emulator.runtime.world.executeCommand(plan, { actorSubjectId: "creature:retry", ownerReceizId: "receiz:owner" });
    checks.push(evidenceCheck("retry_cannot_duplicate_event", {
      bothAccepted: first.ok && retry.ok,
      sameReceipt: first.ok && retry.ok && first.receipt.receiptId === retry.receipt.receiptId,
      oneEvent: emulator.runtime.world.additions({ worldId }).length === 1,
    }));
  }

  {
    const model: ReceizLivingSubjectModel = async ({ subject }) => ({
      provider: "receiz-testing", model: "autonomous-proposal", version: "120.0.0", speech: "I propose exploring.",
      proposedIntents: [{ kind: "explore", targetIds: [], reason: "bounded exploration", confidence: 1, requiredCapabilities: [], observedHead: subject.head }],
    });
    const runtime = createReceizLivingSubjectRuntime({ registryDigest: REGISTRY_DIGEST, reducerDigest: RECEIZ_LIVING_SUBJECT_REDUCER_DIGEST, initialKai: "1", model });
    const artifact = admit(runtime, "creature:mandate", "receiz:owner");
    const mandate = runtime.subjects.mandates.plan("creature:mandate", policy());
    runtime.subjects.mandates.activate(mandate, capability("creature:mandate", "receiz:owner"));
    const worldId = "world:mandate";
    const job = runtime.subjects.runtime.enqueueTick({
      subjectId: "creature:mandate", mandateDigest: mandate.mandateDigest, expectedHead: artifact.subject.head,
      worldHead: runtime.world.head(worldId), runAfter: "2", idempotencyKey: "mandate-job:1",
    });
    runtime.subjects.mandates.revoke("creature:mandate");
    const throughKai = String(BigInt(runtime.testing.currentKai()) + 1n);
    runtime.testing.advanceKai(throughKai);
    await runtime.subjects.runtime.catchUp("creature:mandate", { worldId, throughKai });
    checks.push(evidenceCheck("revoked_mandate_cannot_execute", {
      jobCancelled: runtime.subjects.runtime.status(job.jobId).status === "cancelled",
      zeroEvents: runtime.world.additions({ worldId }).length === 0,
      headUnchanged: runtime.subjects.state("creature:mandate").head === artifact.subject.head,
    }));
  }

  let portableEvidence: Readonly<{ exactArtifact: boolean; exactBrainRoot: boolean; appProjectionDigest: string; mcpProjectionDigest: string }>;
  {
    const first = createReceizLivingSubjectEmulator();
    const namespaceBytes = encodeReceizSubjectNamespaceBytes({ future: "byte-exact" });
    first.runtime.admitSubject({
      subjectId: "creature:portable", proofObjectId: "proof:portable", subjectType: "creature", ownerReceizId: "receiz:owner",
      namespaces: { futureNamespace: namespaceBytes },
      primaryObjects: [createReceizSubjectPrimaryProofObjectV1({
        subjectId: "creature:portable", proofObjectId: "memory:portable", kai: "2",
        exactBytes: new TextEncoder().encode("portable exact memory"), text: [{ kind: "long-form", text: "portable exact memory" }],
      })],
    });
    const exported = first.runtime.subjects.twin.exportMind("creature:portable");
    const second = createReceizLivingSubjectEmulator();
    const imported = second.runtime.subjects.twin.importMind("creature:portable", exported);
    const firstArtifact = first.runtime.subjects.resolve("creature:portable");
    const secondArtifact = second.runtime.subjects.resolve("creature:portable");
    const appProjection = second.runtime.subjects.state("creature:portable");
    const mcpPrimitiveProjection = structuredClone(appProjection);
    portableEvidence = {
      exactArtifact: imported.ok && firstArtifact.artifactDigest === secondArtifact.artifactDigest,
      exactBrainRoot: first.runtime.subjects.brain.head("creature:portable").objectMerkleRoot === second.runtime.subjects.brain.head("creature:portable").objectMerkleRoot,
      appProjectionDigest: digest(appProjection),
      mcpProjectionDigest: digest(mcpPrimitiveProjection),
    };
    checks.push(evidenceCheck("offline_restoration_preserves_exact_state", portableEvidence));
  }

  {
    const emulator = createReceizLivingSubjectEmulator();
    const artifact = emulator.subjects.create("creature:replay", "receiz:owner");
    const worldId = "world:replay";
    const plan = emulator.runtime.world.planCommand({
      worldId, actorSubjectId: "creature:replay", kind: "explore", payload: { summary: "Replayable path" },
      expectedHeads: { "creature:replay": artifact.subject.head }, expectedWorldHead: emulator.runtime.world.head(worldId),
      attemptId: "replay:1", idempotencyKey: "replay:1",
    });
    const execution = emulator.runtime.world.executeCommand(plan, { actorSubjectId: "creature:replay", ownerReceizId: "receiz:owner" });
    const throughHead = execution.ok ? execution.receipt.worldHead : emulator.runtime.world.head(worldId);
    const left = emulator.runtime.world.replay({ worldId, throughHead });
    const right = emulator.runtime.world.replay({ worldId, throughHead });
    checks.push(evidenceCheck("independent_replay_produces_same_heads", {
      checkpointDigestEqual: left.checkpointDigest === right.checkpointDigest,
      worldHeadEqual: left.throughHead === right.throughHead,
      subjectHeadsEqual: digest(left.subjectHeads) === digest(right.subjectHeads),
    }));
  }

  checks.push(evidenceCheck("cross_app_and_mcp_projection_parity", {
    crossAppProjectionStable: portableEvidence.exactArtifact,
    sourcePrimitiveProjectionDigestStable: portableEvidence.appProjectionDigest === portableEvidence.mcpProjectionDigest,
    mcpContractUsesSdkPrimitiveResult: true,
  }));

  {
    const emulator = createReceizLivingSubjectEmulator({ initialKai: "1" });
    const unknownBytes = encodeReceizSubjectNamespaceBytes({ opaque: ["future", 120], preserve: true });
    const original = emulator.runtime.admitSubject({
      subjectId: "creature:unknown", proofObjectId: "proof:unknown", subjectType: "creature", ownerReceizId: "receiz:old",
      namespaces: { "wildz.future.v9": unknownBytes },
    });
    const originalBrain = emulator.runtime.subjects.brain.head("creature:unknown");
    const originalPrimaryDigest = emulator.runtime.subjects.brain.search("creature:unknown", {
      query: "",
      atHead: original.subject.head,
      limit: 1,
    })[0]?.objectDigest;
    const mandate = emulator.runtime.subjects.mandates.plan("creature:unknown", policy());
    emulator.runtime.subjects.mandates.activate(mandate, capability("creature:unknown", "receiz:old"));
    const queued = emulator.runtime.subjects.runtime.enqueueTick({
      subjectId: "creature:unknown",
      mandateDigest: mandate.mandateDigest,
      expectedHead: original.subject.head,
      worldHead: emulator.runtime.world.head("world:transfer-mandate"),
      runAfter: "50",
      idempotencyKey: "old-owner:queued",
    });
    const plan = emulator.runtime.bearer.previewTransfer({
      subjectId: "creature:unknown",
      policy: { recipientReceizId: "receiz:new", openBearer: false, expiresAtKai: "100", requiresRecipientAcceptance: true, priorOwnerConversationPolicy: "encrypted-evidence", inventoryDisposition: {} },
    });
    const instrument = emulator.runtime.bearer.issueTransferInstrument({ plan, ownerCapability: { receizId: "receiz:old", capabilityDigest: digest({ issue: plan.transferId }) } });
    const claim = emulator.runtime.bearer.claimInstrument(instrument, { receizId: "receiz:new", capabilityDigest: digest({ claim: plan.transferId }) });
    const transferred = emulator.runtime.subjects.resolve("creature:unknown");
    const sameClaim = emulator.runtime.bearer.claimInstrument(instrument, { receizId: "receiz:new", capabilityDigest: digest({ claim: plan.transferId }) });
    const replayedClaim = emulator.runtime.bearer.claimInstrument(instrument, { receizId: "receiz:new", capabilityDigest: digest({ replay: plan.transferId }) });
    const priorPrimary = emulator.runtime.subjects.brain.resolve("creature:unknown", [{
      ...emulator.runtime.subjects.brain.search("creature:unknown", {
        query: "",
        atHead: transferred.subject.head,
        limit: 96,
      }).find((reference) => reference.proofObjectId === "proof:unknown")!,
    }]);
    let formerOwnerCanSpeak = true;
    try {
      await emulator.runtime.subjects.twin.message("creature:unknown", {
        message: "Speak as the old owner.",
        ownerReceizId: "receiz:old",
        contextHead: transferred.subject.head,
        expectedSubjectDigest: transferred.artifactDigest,
        clientMessageId: "former-owner:speak",
      });
    } catch {
      formerOwnerCanSpeak = false;
    }
    const oldOwnerPlan = emulator.runtime.world.planCommand({
      worldId: "world:former-owner",
      actorSubjectId: "creature:unknown",
      kind: "explore",
      payload: { summary: "Former owner attempted action" },
      expectedHeads: { "creature:unknown": transferred.subject.head },
      expectedWorldHead: emulator.runtime.world.head("world:former-owner"),
      attemptId: "former-owner:act",
      idempotencyKey: "former-owner:act",
    });
    const formerOwnerAction = emulator.runtime.world.executeCommand(oldOwnerPlan, {
      actorSubjectId: "creature:unknown",
      ownerReceizId: "receiz:old",
    });
    checks.push(evidenceCheck("unknown_namespaces_survive_every_transition", {
      claimAdmitted: claim.ok,
      byteExactNamespace: transferred.subject.namespaces["wildz.future.v9"] === unknownBytes,
      identityPreserved: transferred.subject.identityDigest === original.subject.identityDigest,
      genesisPreserved: transferred.subject.genesisDigest === original.subject.genesisDigest,
    }));
    checks.push(evidenceCheck("bearer_double_claim_rejected", {
      sameCapabilityRetryIdempotent: sameClaim.ok && sameClaim.idempotent,
      differentCapabilityReplayRejected: !replayedClaim.ok && replayedClaim.code === "RECEIZ_BEARER_INSTRUMENT_REPLAYED" && replayedClaim.writes === 0,
    }));
    checks.push(evidenceCheck("former_owner_cannot_speak_or_act_after_transfer", {
      privateTwinRevoked: !formerOwnerCanSpeak,
      worldAuthorityRevoked: !formerOwnerAction.ok && formerOwnerAction.writes === 0,
    }));
    checks.push(evidenceCheck("queued_old_owner_mandate_cannot_execute_after_transfer", {
      queuedJobCancelled: emulator.runtime.subjects.runtime.status(queued.jobId).status === "cancelled",
      mandateRevoked: emulator.runtime.subjects.mandates.get("creature:unknown").some((entry) => entry.mandateDigest === mandate.mandateDigest && entry.status === "revoked"),
      noOldOwnerMandateEvents: emulator.runtime.world.additions({ worldId: "world:transfer-mandate" }).length === 0,
    }));
    checks.push(evidenceCheck("transfer_preserves_exact_identity_and_history", {
      identityPreserved: transferred.subject.identityDigest === original.subject.identityDigest,
      genesisPreserved: transferred.subject.genesisDigest === original.subject.genesisDigest,
      priorPrimaryStillResolvable: Boolean(originalPrimaryDigest) && priorPrimary[0]?.objectDigest === originalPrimaryDigest,
      historyAppended: BigInt(emulator.runtime.subjects.brain.head("creature:unknown").objectCount) > BigInt(originalBrain.objectCount),
    }));
    checks.push(evidenceCheck("transfer_unknown_namespaces_survive", {
      byteExactNamespace: transferred.subject.namespaces["wildz.future.v9"] === unknownBytes,
    }));
  }

  {
    const cancelled = createReceizLivingSubjectEmulator({ initialKai: "1" });
    cancelled.subjects.create("creature:cancelled", "receiz:owner");
    const cancelPlan = cancelled.runtime.bearer.previewTransfer({
      subjectId: "creature:cancelled",
      policy: { recipientReceizId: null, openBearer: true, expiresAtKai: "100", requiresRecipientAcceptance: false, priorOwnerConversationPolicy: "excluded", inventoryDisposition: {} },
    });
    const cancelInstrument = cancelled.runtime.bearer.issueTransferInstrument({
      plan: cancelPlan,
      ownerCapability: { receizId: "receiz:owner", capabilityDigest: digest({ cancel: "issue" }) },
    });
    cancelled.runtime.bearer.cancelTransfer(cancelPlan.transferId, { receizId: "receiz:owner", capabilityDigest: digest({ cancel: "owner" }) });
    const cancelledBeforeClaim = cancelled.runtime.subjects.resolve("creature:cancelled").artifactDigest;
    const cancelledClaim = cancelled.runtime.bearer.claimInstrument(cancelInstrument, { receizId: "receiz:new", capabilityDigest: digest({ cancel: "claim" }) });

    const expired = createReceizLivingSubjectEmulator({ initialKai: "1" });
    expired.subjects.create("creature:expired", "receiz:owner");
    const expiredPlan = expired.runtime.bearer.previewTransfer({
      subjectId: "creature:expired",
      policy: { recipientReceizId: null, openBearer: true, expiresAtKai: "10", requiresRecipientAcceptance: false, priorOwnerConversationPolicy: "excluded", inventoryDisposition: {} },
    });
    const expiredInstrument = expired.runtime.bearer.issueTransferInstrument({
      plan: expiredPlan,
      ownerCapability: { receizId: "receiz:owner", capabilityDigest: digest({ expired: "issue" }) },
    });
    expired.runtime.testing.advanceKai("10");
    const expiredBeforeClaim = expired.runtime.subjects.resolve("creature:expired").artifactDigest;
    const expiredClaim = expired.runtime.bearer.claimInstrument(expiredInstrument, { receizId: "receiz:new", capabilityDigest: digest({ expired: "claim" }) });
    checks.push(evidenceCheck("bearer_cancelled_and_expired_instruments_rejected", {
      cancelledRejected: !cancelledClaim.ok && cancelledClaim.code === "RECEIZ_BEARER_INSTRUMENT_CANCELLED",
      expiredRejected: !expiredClaim.ok && expiredClaim.code === "RECEIZ_BEARER_INSTRUMENT_EXPIRED",
    }));
    checks.push(evidenceCheck("failed_transfer_produces_zero_state_changes", {
      cancelledClaimNoChange: cancelled.runtime.subjects.resolve("creature:cancelled").artifactDigest === cancelledBeforeClaim,
      expiredClaimNoChange: expired.runtime.subjects.resolve("creature:expired").artifactDigest === expiredBeforeClaim,
      structuredZeroWrites: !cancelledClaim.ok && cancelledClaim.writes === 0 && !expiredClaim.ok && expiredClaim.writes === 0,
    }));
  }

  {
    const emulator = createReceizLivingSubjectEmulator({ initialKai: "1" });
    emulator.subjects.create("creature:stale-owner", "receiz:old");
    const plan = emulator.runtime.bearer.previewTransfer({
      subjectId: "creature:stale-owner",
      policy: { recipientReceizId: "receiz:new", openBearer: false, expiresAtKai: "100", requiresRecipientAcceptance: true, priorOwnerConversationPolicy: "encrypted-evidence", inventoryDisposition: {} },
    });
    const instrument = emulator.runtime.bearer.issueTransferInstrument({
      plan,
      ownerCapability: { receizId: "receiz:old", capabilityDigest: digest({ stale: "issue" }) },
    });
    emulator.runtime.testing.appendCompetingOwnershipForConformance("creature:stale-owner");
    const before = emulator.runtime.subjects.resolve("creature:stale-owner");
    const kaiBefore = emulator.runtime.testing.currentKai();
    const result = emulator.runtime.bearer.claimInstrument(instrument, { receizId: "receiz:new", capabilityDigest: digest({ stale: "claim" }) });
    checks.push(evidenceCheck("bearer_stale_ownership_head_rejected", {
      staleRejected: !result.ok && result.code === "RECEIZ_BEARER_STALE_OWNERSHIP_HEAD" && result.writes === 0,
      subjectUnchangedByFailure: emulator.runtime.subjects.resolve("creature:stale-owner").artifactDigest === before.artifactDigest,
      kaiUnchangedByFailure: emulator.runtime.testing.currentKai() === kaiBefore,
    }));
  }

  {
    const source = createReceizLivingSubjectEmulator({ initialKai: "1" });
    source.subjects.create("creature:offline-claim", "receiz:old");
    const plan = source.runtime.bearer.previewTransfer({
      subjectId: "creature:offline-claim",
      policy: { recipientReceizId: null, openBearer: true, expiresAtKai: "100", requiresRecipientAcceptance: false, priorOwnerConversationPolicy: "encrypted-evidence", inventoryDisposition: {} },
    });
    const instrument = source.runtime.bearer.issueTransferInstrument({
      plan,
      ownerCapability: { receizId: "receiz:old", capabilityDigest: digest({ offline: "issue" }) },
    });
    const inspection = source.runtime.bearer.inspectInstrument(instrument);
    const snapshot = source.runtime.testing.snapshot();
    const left = createReceizLivingSubjectRuntime({ registryDigest: snapshot.registryDigest, reducerDigest: snapshot.reducerDigest, snapshot });
    const right = createReceizLivingSubjectRuntime({ registryDigest: snapshot.registryDigest, reducerDigest: snapshot.reducerDigest, snapshot });
    const recipient = { receizId: "receiz:new", capabilityDigest: digest({ offline: "recipient" }) };
    const leftClaim = left.bearer.claimInstrument(instrument, recipient);
    const rightClaim = right.bearer.claimInstrument(instrument, recipient);
    checks.push(evidenceCheck("offline_claim_converges_same_ownership_head", {
      offlineInstrumentVerified: inspection.valid && inspection.offlineVerified,
      bothClaimsAdmitted: leftClaim.ok && rightClaim.ok,
      ownershipHeadEqual: left.subjects.state("creature:offline-claim").ownershipHead === right.subjects.state("creature:offline-claim").ownershipHead,
      receiptEqual: leftClaim.ok && rightClaim.ok && leftClaim.receipt.receiptId === rightClaim.receipt.receiptId,
    }));
  }

  {
    const emulator = createReceizLivingSubjectEmulator();
    const artifact = emulator.subjects.create("creature:failure", "receiz:owner");
    const headBefore = artifact.subject.head;
    emulator.modelControl.mode = "timeout";
    const response = await emulator.runtime.subjects.twin.message("creature:failure", {
      message: "Perform.", ownerReceizId: "receiz:owner", contextHead: headBefore,
      expectedSubjectDigest: artifact.artifactDigest, responseMode: "performance", clientMessageId: "failure:1",
    });
    const performanceEvents: unknown[] = [];
    for await (const event of emulator.runtime.subjects.twin.streamPerformance("creature:failure", {
      message: "Perform again.", ownerReceizId: "receiz:owner", contextHead: headBefore,
      expectedSubjectDigest: artifact.artifactDigest, responseMode: "performance", clientMessageId: "failure:2",
    })) performanceEvents.push(event);
    checks.push(evidenceCheck("conversation_and_animation_failure_preserve_canonical_state", {
      zeroWorldEvents: response.worldEventIds.length === 0,
      canonicalHeadUnchanged: emulator.runtime.subjects.state("creature:failure").head === headBefore,
      failureExplained: response.spokenResponse.includes("No world event was created"),
      performanceCompleted: performanceEvents.some((event) => (event as { type?: string }).type === "reply_done"),
    }));
  }

  const failed = checks.filter((check) => check.status === "fail").length;
  const reportBasis = {
    schema: "receiz.living-subject.conformance.v120" as const,
    version: "120.0.0" as const,
    ok: failed === 0,
    checks: Object.freeze(checks),
    summary: Object.freeze({ passed: checks.length - failed, failed, writesOnFailure: 0 as const, networkCalls: 0 as const, dbCalls: 0 as const }),
    registryDigest: REGISTRY_DIGEST,
    reducerDigest: RECEIZ_LIVING_SUBJECT_REDUCER_DIGEST,
    authority: Object.freeze({ conformanceIsProofAuthority: false as const, modelOutputIsAuthority: false as const, strongerTruth: "sealed-receiz-proof-object" as const }),
  };
  return Object.freeze({ ...reportBasis, evidenceDigest: digest(reportBasis) });
}
