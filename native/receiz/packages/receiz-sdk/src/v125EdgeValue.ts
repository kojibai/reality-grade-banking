import type { ReceizCommittedArtifactTransition } from "./artifactTransition.js";
import { receizBase64UrlDecode } from "./identity.js";
import { RECEIZ_LIVING_SUBJECT_REDUCER_DIGEST } from "./livingSubjects.js";
import { RECEIZ_CURRENT_REGISTRY_DIGEST } from "./releaseIdentity.js";
import { canonicalizeReceizV122, digestReceizCanonicalV122 } from "./v122Canonical.js";
import {
  planReceizReserveV122,
  planReceizSettlementV122,
  validateReceizValueIntentV122,
  type ReceizValueRailV122,
  type ReceizWorldValueIntentV122,
} from "./v122Value.js";
import {
  closedRecord,
  validateReceizOperationPlanV124,
  type ReceizOperationPlanV124,
} from "./v124Contracts.js";
import {
  deriveReceizRegisteredOperationCasV124,
  planAtomicOperationV124,
  type ReceizRegisteredOperationV124,
} from "./v124Execution.js";
import {
  recoverReceizPortableExecutionTransitionSetV124,
  verifyReceizPortableExecutionTransitionSetV124,
  type ReceizPortableExecutionTransitionRecoveryV124,
} from "./v124PortableAuthority.js";

const AUTHORITY = Object.freeze({
  planIsTransactionAuthority: false as const,
  transactionOccursAtEdge: true as const,
  serverIsTransactionAuthority: false as const,
  databaseIsTransactionAuthority: false as const,
  serverRole: "global-sync-only" as const,
  databaseRole: "global-sync-only" as const,
  strongerTruth: "sealed-receiz-proof-object" as const,
});

const INSPECTION_AUTHORITY = Object.freeze({
  inspectionIsTransactionAuthority: false as const,
  localVerificationRequired: true as const,
  serverIsTransactionAuthority: false as const,
  databaseIsTransactionAuthority: false as const,
  strongerTruth: "sealed-receiz-proof-object" as const,
});

export type ReceizEdgeValueTransferInputV125 = Readonly<{
  applicationId: string;
  amountPhiMicro: string;
  sourceProofObjectId: string;
  sourceValueHead: string;
  destinationSubjectId: string;
  expectedDestinationHead: string;
  usdPerPhiMicrocents: string;
  priceBasis: unknown;
  idempotencyKey?: string;
  attemptId: string;
}>;

export type ReceizEdgeValueTransferPlanV125 = Readonly<{
  schema: "receiz.edge-value-transfer-plan.v125";
  rail: ReceizValueRailV122;
  intent: ReceizWorldValueIntentV122;
  operation: ReceizRegisteredOperationV124;
  participants: readonly string[];
  expectedParticipantHeads: Readonly<Record<string, string>>;
  sourceParticipantId: string;
  destinationParticipantId: string;
  plan: ReceizOperationPlanV124;
  authority: typeof AUTHORITY;
}>;

export type ReceizEdgeValueTransferPlanInspectionV125 = Readonly<{
  schema: "receiz.edge-value-transfer-plan-inspection.v125";
  rail: ReceizValueRailV122;
  role: "sender" | "receiver";
  participantId: string;
  sourceParticipantId: string;
  destinationParticipantId: string;
  intent: ReceizWorldValueIntentV122;
  plan: ReceizOperationPlanV124;
  authority: typeof INSPECTION_AUTHORITY;
}>;

export type ReceizSettledEdgeValueTransferV125 = Readonly<{
  status: "settled-at-edge";
  rail: ReceizValueRailV122;
  role: "sender" | "receiver";
  participantId: string;
  intent: ReceizWorldValueIntentV122;
  committedTransition: ReceizCommittedArtifactTransition;
  authority: Readonly<{
    projectionIsTransactionAuthority: false;
    transactionOccursAtEdge: true;
    serverIsTransactionAuthority: false;
    databaseIsTransactionAuthority: false;
    globalSyncIsAdditive: true;
    strongerTruth: "sealed-receiz-proof-object";
  }>;
}>;

function fail(code: string): never {
  throw new TypeError(code);
}

function record(value: unknown, code: string): Readonly<Record<string, unknown>> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) fail(code);
  return value as Readonly<Record<string, unknown>>;
}

function sorted(values: readonly string[]): readonly string[] {
  return Object.freeze([...values].sort((left, right) => left.localeCompare(right)));
}

function sameList(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function sameParticipantHeads(
  left: Readonly<Record<string, unknown>>,
  right: Readonly<Record<string, string>>,
): boolean {
  const leftKeys = sorted(Object.keys(left));
  const rightKeys = sorted(Object.keys(right));
  return sameList(leftKeys, rightKeys)
    && leftKeys.every((participantId) => left[participantId] === right[participantId]);
}

async function participantIds(intent: ReceizWorldValueIntentV122): Promise<Readonly<{
  sourceParticipantId: string;
  destinationParticipantId: string;
}>> {
  const sourceParticipantId = `receiz:cas:value-source:${await digestReceizCanonicalV122({
    schema: "receiz.value-source.participant.v124",
    rail: intent.rail,
    sourceProofObjectId: intent.sourceProofObjectId,
  })}`;
  const destinationParticipantId = `receiz:cas:value-destination:${await digestReceizCanonicalV122({
    schema: "receiz.value-destination.participant.v124",
    rail: intent.rail,
    destinationSubjectId: intent.destinationSubjectId,
  })}`;
  return Object.freeze({ sourceParticipantId, destinationParticipantId });
}

async function planReceizEdgeValueTransferV125(
  rail: ReceizValueRailV122,
  input: ReceizEdgeValueTransferInputV125,
): Promise<ReceizEdgeValueTransferPlanV125> {
  const planner = rail === "settlement" ? planReceizSettlementV122 : planReceizReserveV122;
  const intent = await planner({
    amountPhiMicro: input.amountPhiMicro,
    sourceProofObjectId: input.sourceProofObjectId,
    sourceValueHead: input.sourceValueHead,
    destinationSubjectId: input.destinationSubjectId,
    expectedDestinationHead: input.expectedDestinationHead,
    usdPerPhiMicrocents: input.usdPerPhiMicrocents,
    priceBasis: input.priceBasis,
    ...(input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : {}),
  });
  const operationBasis = Object.freeze({
    operationId: `receiz:value:${rail}:${intent.valueIntentDigest}`,
    category: rail,
    domainId: `value:${rail}`,
    registryDigest: RECEIZ_CURRENT_REGISTRY_DIGEST,
    reducerDigest: RECEIZ_LIVING_SUBJECT_REDUCER_DIGEST,
    payload: intent,
  });
  const cas = await deriveReceizRegisteredOperationCasV124(operationBasis);
  const operation = Object.freeze({ ...operationBasis, participants: cas.participants });
  const plan = await planAtomicOperationV124({
    applicationId: input.applicationId,
    operations: [operation],
    participants: cas.participants,
    expectedParticipantHeads: cas.expectedParticipantHeads,
    semanticIdempotencyKey: intent.idempotencyKey ?? `receiz:value:${intent.valueIntentDigest}`,
    attemptId: input.attemptId,
  });
  const ids = await participantIds(intent);
  if (!sameList(cas.participants, sorted([ids.sourceParticipantId, ids.destinationParticipantId]))) {
    fail("V125_EDGE_VALUE_PARTICIPANT_MISMATCH");
  }
  return Object.freeze({
    schema: "receiz.edge-value-transfer-plan.v125" as const,
    rail,
    intent,
    operation,
    participants: cas.participants,
    expectedParticipantHeads: cas.expectedParticipantHeads,
    ...ids,
    plan,
    authority: AUTHORITY,
  });
}

export function planReceizEdgeSettlementTransferV125(
  input: ReceizEdgeValueTransferInputV125,
): Promise<ReceizEdgeValueTransferPlanV125> {
  return planReceizEdgeValueTransferV125("settlement", input);
}

export function planReceizEdgeReserveTransferV125(
  input: ReceizEdgeValueTransferInputV125,
): Promise<ReceizEdgeValueTransferPlanV125> {
  return planReceizEdgeValueTransferV125("reserve", input);
}

function operationPayloadFromPlan(plan: ReceizOperationPlanV124): Readonly<{
  operation: Readonly<Record<string, unknown>>;
  participants: readonly string[];
  expectedParticipantHeads: Readonly<Record<string, unknown>>;
}> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(receizBase64UrlDecode(plan.exactPlanBytesB64u)));
  } catch {
    fail("V125_EDGE_VALUE_PLAN_INVALID");
  }
  const payload = closedRecord(parsed, [
    "schema",
    "atomicOperationId",
    "applicationId",
    "domainId",
    "operations",
    "participants",
    "expectedParticipantHeads",
    "semanticIdempotencyKey",
    "attemptId",
  ], "V125_EDGE_VALUE_PLAN_INVALID");
  if (payload.schema !== "receiz.atomic-operation.v124"
    || payload.applicationId !== plan.applicationId
    || payload.domainId !== plan.domainId
    || !Array.isArray(payload.operations)
    || payload.operations.length !== 1
    || !Array.isArray(payload.participants)
    || payload.participants.some((participant) => typeof participant !== "string")) {
    fail("V125_EDGE_VALUE_PLAN_INVALID");
  }
  return Object.freeze({
    operation: closedRecord(payload.operations[0], [
      "operationId",
      "category",
      "domainId",
      "registryDigest",
      "reducerDigest",
      "participants",
      "payload",
    ], "V125_EDGE_VALUE_PLAN_INVALID"),
    participants: Object.freeze(payload.participants as string[]),
    expectedParticipantHeads: record(payload.expectedParticipantHeads, "V125_EDGE_VALUE_PLAN_INVALID"),
  });
}

export async function inspectReceizEdgeValueTransferPlanV125(
  value: unknown,
  input: Readonly<{ participantId: string; expectedRail: ReceizValueRailV122 }>,
): Promise<ReceizEdgeValueTransferPlanInspectionV125> {
  const plan = await validateReceizOperationPlanV124(value);
  const parsed = operationPayloadFromPlan(plan);
  if (parsed.operation.category !== "settlement" && parsed.operation.category !== "reserve") {
    fail("V125_EDGE_VALUE_PLAN_INVALID");
  }
  const rail = parsed.operation.category;
  if (rail !== input.expectedRail) fail("V125_EDGE_VALUE_RAIL_MISMATCH");
  const intent = parsed.operation.payload as ReceizWorldValueIntentV122;
  if (!await validateReceizValueIntentV122(intent) || intent.rail !== rail) {
    fail("V125_EDGE_VALUE_PLAN_INVALID");
  }
  const ids = await participantIds(intent);
  const exactParticipants = sorted([ids.sourceParticipantId, ids.destinationParticipantId]);
  if (!sameList(parsed.participants, exactParticipants)
    || !sameList(Object.keys(plan.expectedParticipantHeads), exactParticipants)
    || !sameParticipantHeads(parsed.expectedParticipantHeads, plan.expectedParticipantHeads)
    || plan.expectedParticipantHeads[ids.sourceParticipantId] !== intent.sourceValueHead
    || plan.expectedParticipantHeads[ids.destinationParticipantId] !== intent.expectedDestinationHead) {
    fail("V125_EDGE_VALUE_PARTICIPANT_MISMATCH");
  }
  const canonicalOperationBasis = Object.freeze({
    operationId: `receiz:value:${rail}:${intent.valueIntentDigest}`,
    category: rail,
    domainId: `value:${rail}`,
    registryDigest: RECEIZ_CURRENT_REGISTRY_DIGEST,
    reducerDigest: RECEIZ_LIVING_SUBJECT_REDUCER_DIGEST,
    payload: intent,
  });
  const canonicalCas = await deriveReceizRegisteredOperationCasV124(canonicalOperationBasis);
  const canonicalPlan = await planAtomicOperationV124({
    applicationId: plan.applicationId,
    operations: [Object.freeze({ ...canonicalOperationBasis, participants: canonicalCas.participants })],
    participants: canonicalCas.participants,
    expectedParticipantHeads: canonicalCas.expectedParticipantHeads,
    semanticIdempotencyKey: intent.idempotencyKey ?? `receiz:value:${intent.valueIntentDigest}`,
    attemptId: plan.attemptId,
  });
  if (canonicalizeReceizV122(canonicalPlan) !== canonicalizeReceizV122(plan)) {
    fail("V125_EDGE_VALUE_PLAN_CANONICAL_BINDING_MISMATCH");
  }
  const role = input.participantId === ids.sourceParticipantId
    ? "sender"
    : input.participantId === ids.destinationParticipantId
      ? "receiver"
      : fail("V125_EDGE_VALUE_PARTICIPANT_MISMATCH");
  return Object.freeze({
    schema: "receiz.edge-value-transfer-plan-inspection.v125" as const,
    rail,
    role,
    participantId: input.participantId,
    ...ids,
    intent,
    plan,
    authority: INSPECTION_AUTHORITY,
  });
}

async function settleReceizEdgeValueTransferV125(
  value: unknown,
  input: Readonly<{
    applicationId: string;
    participantId: string;
    expectedRail: ReceizValueRailV122;
    requiredRole: "sender" | "receiver";
  }>,
): Promise<ReceizSettledEdgeValueTransferV125> {
  const recoveryRecord = record(value, "V125_EDGE_VALUE_RECOVERY_INVALID");
  const transitionSet = await verifyReceizPortableExecutionTransitionSetV124(
    recoveryRecord.transitionSet,
    { audience: input.applicationId },
  );
  const inspection = await inspectReceizEdgeValueTransferPlanV125(transitionSet.operationPlan, {
    participantId: input.participantId,
    expectedRail: input.expectedRail,
  });
  if (inspection.role !== input.requiredRole) fail("V125_EDGE_VALUE_ROLE_MISMATCH");
  const recovered = await recoverReceizPortableExecutionTransitionSetV124(
    value as ReceizPortableExecutionTransitionRecoveryV124,
    { audience: input.applicationId },
  );
  const memberIndex = transitionSet.members.findIndex((member) => member.participantId === input.participantId);
  const committedTransition = memberIndex < 0 ? undefined : recovered.transitions[memberIndex];
  if (!committedTransition) fail("V125_EDGE_VALUE_PARTICIPANT_MISMATCH");
  return Object.freeze({
    status: "settled-at-edge" as const,
    rail: inspection.rail,
    role: inspection.role,
    participantId: input.participantId,
    intent: inspection.intent,
    committedTransition,
    authority: Object.freeze({
      projectionIsTransactionAuthority: false as const,
      transactionOccursAtEdge: true as const,
      serverIsTransactionAuthority: false as const,
      databaseIsTransactionAuthority: false as const,
      globalSyncIsAdditive: true as const,
      strongerTruth: "sealed-receiz-proof-object" as const,
    }),
  });
}

export function receiveReceizEdgeSettlementV125(
  recovery: unknown,
  input: Readonly<{ applicationId: string; participantId: string }>,
): Promise<ReceizSettledEdgeValueTransferV125> {
  return settleReceizEdgeValueTransferV125(recovery, { ...input, expectedRail: "settlement", requiredRole: "receiver" });
}

export function receiveReceizEdgeReserveV125(
  recovery: unknown,
  input: Readonly<{ applicationId: string; participantId: string }>,
): Promise<ReceizSettledEdgeValueTransferV125> {
  return settleReceizEdgeValueTransferV125(recovery, { ...input, expectedRail: "reserve", requiredRole: "receiver" });
}

export function confirmReceizEdgeSettlementSendV125(
  recovery: unknown,
  input: Readonly<{ applicationId: string; participantId: string }>,
): Promise<ReceizSettledEdgeValueTransferV125> {
  return settleReceizEdgeValueTransferV125(recovery, { ...input, expectedRail: "settlement", requiredRole: "sender" });
}

export function confirmReceizEdgeReserveSendV125(
  recovery: unknown,
  input: Readonly<{ applicationId: string; participantId: string }>,
): Promise<ReceizSettledEdgeValueTransferV125> {
  return settleReceizEdgeValueTransferV125(recovery, { ...input, expectedRail: "reserve", requiredRole: "sender" });
}
