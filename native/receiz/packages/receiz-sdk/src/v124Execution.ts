import { canonicalizeReceizV122, digestReceizCanonicalV122 } from "./v122Canonical.js";
import { receizBase64UrlEncode } from "./identity.js";
import { applicationId, closedRecord, digest, domainId, freeze, text, validateReceizOperationPlanV124, type ReceizOperationPlanV124 } from "./v124Contracts.js";
import { planReceizMultiWorldTransactionV122, type ReceizMultiWorldTransactionV122 } from "./v122MultiWorld.js";
import { validateReceizValueIntentV122, type ReceizWorldValueIntentV122 } from "./v122Value.js";
import { validateReceizWorldAccessAppendV122, type ReceizWorldAccessAppendV122 } from "./v122WorldAccess.js";
import { planReceizWorldTransactionV122, type ReceizWorldTransactionV122 } from "./v122Transactions.js";
import {
  validateReceizLocatorBoundValueIntentV124,
  type ReceizLocatorBoundValueIntentV124,
} from "./v124LocatorBoundValue.js";
import {
  validateReceizMultiWorldExecutionProjectionV124,
  validateReceizWorldCompositeOperationV124,
  type ReceizWorldCompositeOperationV124,
} from "./v124WorldComposite.js";
import {
  digestReceizExecutionTransportRequestV124,
  readReceizSignedTransportEnvelopeV124,
  verifyReceizTransportBindingV124,
  type ReceizExecutionTransportRequestInputV124,
  type ReceizTransportBindingExpectationV124,
} from "./v124TransportBinding.js";
import {
  recoverReceizPortableExecutionTransitionSetV124,
  verifyReceizPortableExecutionTransitionSetV124,
  type ReceizPortableExecutionTransitionRecoveryV124,
  type ReceizPortableExecutionTransitionSetV124,
  type ReceizRecoveredPortableExecutionTransitionSetV124,
  type ReceizVerifiedPortableExecutionTransitionSetV124,
} from "./v124PortableAuthority.js";

type Authority = Readonly<{ outcomeIsProofAuthority: false; strongerTruth: "sealed-receiz-proof-object" }>;
type HandleAuthority = Readonly<{ handleIsProofAuthority: false; strongerTruth: "sealed-receiz-proof-object" }>;
type RemoteRequest = <T>(path: string, options?: Readonly<{ method?: string; body?: Record<string, unknown> }>) => Promise<T>;
const categories = ["custom", "subject", "world", "world-composite", "multi-world-composite", "inventory", "access", "ownership", "settlement", "reserve"] as const;
type Category = typeof categories[number];
type ParticipantBinding = string;
const custodiedHandles = new WeakSet<object>();
const pendingExecutionWires = new WeakSet<object>();
type ExecutionWireAdmission =
  | Readonly<{ kind: "authenticated-transport-report" }>
  | Readonly<{
    kind: "committed-transition-source";
    transitionSet: ReceizVerifiedPortableExecutionTransitionSetV124;
    recovery: ReceizRecoveredPortableExecutionTransitionSetV124;
    portableRecovery: ReceizPortableExecutionTransitionRecoveryV124;
  }>;
type PreparedExecutionHandle = Readonly<{
  rawTransitionSet: ReceizPortableExecutionTransitionSetV124;
  transitionSet: ReceizVerifiedPortableExecutionTransitionSetV124;
}>;
const admittedExecutionWires = new WeakMap<object, ExecutionWireAdmission>();
const preparedExecutionHandles = new WeakMap<object, PreparedExecutionHandle>();
const committedExecutionRecoveries = new WeakMap<object, ReceizPortableExecutionTransitionRecoveryV124>();
const TRANSPORT_REPORT_ADMISSION = freeze({ kind: "authenticated-transport-report" as const });

export type ReceizRegisteredOperationV124 = Readonly<{ operationId: string; category: Category; domainId: string; registryDigest: string; reducerDigest: string; participants: readonly string[]; payload: unknown }>;
export type ReceizRegisteredOperationBasisV124 = Readonly<Omit<ReceizRegisteredOperationV124, "participants">>;
export type ReceizRegisteredOperationCasV124 = Readonly<{
  participants: readonly string[];
  expectedParticipantHeads: Readonly<Record<string, string>>;
}>;
type RegisteredPayload = Readonly<{
  payload: unknown;
  expectedParticipantHeads: Readonly<Record<string, string>>;
  participantBindings: Readonly<Record<string, ParticipantBinding>>;
  bindingKind: "platform" | "custom";
  sourceRegistryDigest: string;
  sourceReducerDigest: string;
  expectedDomainId?: string;
}>;
export type ReceizAtomicOperationInputV124 = Readonly<{ applicationId: string; operations: readonly ReceizRegisteredOperationV124[]; participants: readonly string[]; expectedParticipantHeads: Readonly<Record<string, string>>; semanticIdempotencyKey: string; attemptId: string }>;
export type ReceizDurableExecutionHandleV124 = Readonly<{ schema: "receiz.durable-execution-handle.v124"; executionId: string; applicationId: string; domainId: string; operationKind: string; exactPlanDigest: string; semanticIdempotencyKey: string; attemptId: string; stagedAtKaiUPulse: number; handleDigest: string; authority: HandleAuthority; receiptDigest: string }>;
export type ReceizZeroWriteFailureReasonV124 = "IDEMPOTENCY_CONFLICT" | "STALE_HEAD" | "MISSING_PARTICIPANT" | "UNAUTHORIZED" | "INVALID_OPERATION" | "INSUFFICIENT_VALUE" | "UNSUPPORTED_ATOMICITY" | "ALREADY_COMMITTED" | "CANCELLED";
export type ReceizZeroWriteFailureV124 = Readonly<{ schema: "receiz.zero-write-failure.v124"; executionId: string | null; applicationId: string; domainId: string; operationKind: string; exactPlanDigest: string; semanticIdempotencyKey: string; attemptId: string; reasonCode: ReceizZeroWriteFailureReasonV124; writes: 0; failureDigest: string; authority: Readonly<{ failureIsProofAuthority: false; strongerTruth: "sealed-receiz-proof-object" }>; receiptDigest: string }>;
export type ReceizExecutionOutcomeV124 =
  | Readonly<{ schema: "receiz.execution-outcome.v124"; status: "committed"; executionId: string; applicationId: string; domainId: string; operationKind: string; exactPlanDigest: string; semanticIdempotencyKey: string; attemptId: string; terminalAtKaiUPulse: number; committedHeads: Readonly<Record<string, string>>; outcomeDigest: string; authority: Authority; receiptDigest: string }>
  | Readonly<{ schema: "receiz.execution-outcome.v124"; status: "zero-write" | "cancelled"; executionId: string; applicationId: string; domainId: string; operationKind: string; exactPlanDigest: string; semanticIdempotencyKey: string; attemptId: string; terminalAtKaiUPulse: number; reasonCode: ReceizZeroWriteFailureReasonV124; writes: 0; outcomeDigest: string; authority: Authority; receiptDigest: string }>
  | Readonly<{ schema: "receiz.execution-outcome.v124"; status: "unknown"; executionId: string; applicationId: string; domainId: string; operationKind: string; exactPlanDigest: string; semanticIdempotencyKey: string; attemptId: string; stagedAtKaiUPulse: number; plan: ReceizOperationPlanV124; authority: Authority; receiptDigest: string }>;
export type ReceizExecutionResolutionV124 = Readonly<{ applicationId: string; executionId: string }>;
export type ReceizExecutionIdempotencyCoordinatesV124 = Readonly<{ applicationId: string; domainId: string; operationKind: string; semanticIdempotencyKey: string }>;

export class ReceizExecutionZeroWriteErrorV124 extends Error {
  constructor(readonly failure: ReceizZeroWriteFailureV124) { super(failure.reasonCode); this.name = "ReceizExecutionZeroWriteErrorV124"; }
}

export function exportReceizCommittedExecutionRecoveryV124(
  outcome: ReceizExecutionOutcomeV124,
): ReceizPortableExecutionTransitionRecoveryV124 {
  const recovery = outcome !== null && typeof outcome === "object"
    ? committedExecutionRecoveries.get(outcome)
    : undefined;
  if (!recovery) fail("V124_EXECUTION_COMMITTED_RECOVERY_CUSTODY_REQUIRED");
  return snapshot(recovery, "V124_EXECUTION_COMMITTED_RECOVERY_INVALID");
}

function fail(code: string): never { throw new TypeError(code); }
function snapshot<T>(value: T, code: string): T {
  try { return freeze(structuredClone(value)) as T; } catch { return fail(code); }
}
function canonicalEqual(left: unknown, right: unknown): boolean {
  try { return canonicalizeReceizV122(left) === canonicalizeReceizV122(right); } catch { return false; }
}
export async function admitReceizExecutionWireV124(value: unknown): Promise<unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) fail("V124_EXECUTION_AUTHENTICATION_REQUIRED");
  if (!pendingExecutionWires.has(value)) fail("V124_EXECUTION_TRANSPORT_UNAUTHENTICATED");
  pendingExecutionWires.delete(value);
  if ((value as { schema?: unknown }).schema === "receiz.execution-transition-recovery-response.v124") {
    fail("V124_EXECUTION_COMMITTED_TRANSITION_REQUIRED");
  }
  if ((value as { schema?: unknown; status?: unknown }).schema === "receiz.execution-outcome.v124"
    && (value as { status?: unknown }).status === "committed") {
    fail("V124_EXECUTION_COMMITTED_TRANSITION_REQUIRED");
  }
  admittedExecutionWires.set(value, TRANSPORT_REPORT_ADMISSION);
  return value;
}

function signedExecutionReceiptDigest(value: object): string {
  const record = value as Record<string, unknown>;
  if (record.schema !== "receiz.execution-transition-recovery-response.v124") {
    return digest(record.receiptDigest, "V124_TRANSPORT_RECEIPT_INVALID");
  }
  const outer = closedRecord(
    value,
    ["schema", "outcome", "recovery"],
    "V124_EXECUTION_TRANSITION_RECOVERY_RESPONSE_INVALID",
  );
  if (outer.outcome === null || typeof outer.outcome !== "object" || Array.isArray(outer.outcome)) {
    fail("V124_EXECUTION_TRANSITION_RECOVERY_RESPONSE_INVALID");
  }
  return digest(
    (outer.outcome as Record<string, unknown>).receiptDigest,
    "V124_TRANSPORT_RECEIPT_INVALID",
  );
}

export async function admitReceizSignedExecutionEnvelopeV124(
  value: unknown,
  request: ReceizExecutionTransportRequestInputV124,
): Promise<unknown> {
  const envelope = readReceizSignedTransportEnvelopeV124(value);
  if (envelope.wire === null || typeof envelope.wire !== "object" || Array.isArray(envelope.wire)) {
    fail("V124_EXECUTION_AUTHENTICATION_REQUIRED");
  }
  const receiptDigest = signedExecutionReceiptDigest(envelope.wire);
  if (envelope.receipt !== receiptDigest) fail("V124_TRANSPORT_RECEIPT_INVALID");
  const wireDigest = await digestReceizCanonicalV122(envelope.wire);
  const requestDigest = await digestReceizExecutionTransportRequestV124(request);
  const expected: ReceizTransportBindingExpectationV124 = freeze({
    kind: "execution" as const,
    method: request.method,
    path: request.path,
    requestDigest,
    wireDigest,
    receiptDigest,
    applicationId: request.applicationId,
    audience: request.audience,
    revocationHead: null,
    revocationHeadAuthority: "transport-coordinate-only" as const,
    strongerTruth: "sealed-receiz-proof-object" as const,
  });
  await verifyReceizTransportBindingV124(
    envelope.transportBinding,
    envelope.transportSignature,
    expected,
  );
  pendingExecutionWires.add(envelope.wire);
  return envelope.wire;
}
function upulse(value: unknown, code: string): number { if (!Number.isSafeInteger(value) || (value as number) < 0) fail(code); return value as number; }
function exactTextList(value: unknown, code: string): readonly string[] {
  if (!Array.isArray(value) || value.length === 0) fail(code);
  const list = value.map((entry) => text(entry, code));
  if (list.some((entry, index) => index > 0 && list[index - 1]!.localeCompare(entry) >= 0)) fail(`${code}_NONCANONICAL`);
  return freeze(list);
}
function exactHeads(value: unknown, code: string): Readonly<Record<string, string>> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) fail(code);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const keys = Reflect.ownKeys(descriptors);
  if (keys.length === 0 || keys.some((key) => typeof key !== "string")) fail(code);
  const names = keys as string[];
  if (names.some((name, index) => index > 0 && names[index - 1]!.localeCompare(name) >= 0)) fail(`${code}_NONCANONICAL`);
  const result: Record<string, string> = {};
  for (const name of names) {
    const descriptor = descriptors[name];
    if (!descriptor || !descriptor.enumerable || !("value" in descriptor)) fail(code);
    Object.defineProperty(result, text(name, code), { value: digest(descriptor.value, code), enumerable: true, writable: false, configurable: false });
  }
  return freeze(result);
}
function exactSetMatch(left: readonly string[], right: readonly string[]): boolean { return left.length === right.length && left.every((item, index) => item === right[index]); }
function exactHeadEntries(value: Readonly<Record<string, string>>): Readonly<Record<string, string>> { return freeze(Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right)))); }
function exactParticipantBindings(value: Readonly<Record<string, ParticipantBinding>>): Readonly<Record<string, ParticipantBinding>> { return freeze(Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right)))); }
async function absentHead(participantId: string): Promise<string> {
  return digestReceizCanonicalV122({ schema: "receiz.absent-participant-head.v124", participantId });
}
async function casParticipant(kind: "access" | "value-source" | "value-destination" | "value-locator", coordinates: Readonly<Record<string, string>>): Promise<string> {
  return `receiz:cas:${kind}:${await digestReceizCanonicalV122({ schema: `receiz.${kind}.participant.v124`, ...coordinates })}`;
}

export async function createReceizCustomReducerBindingsV124(input: Readonly<{
  namespace: string;
  registryDigest: string;
  reducerDigest: string;
}>): Promise<Readonly<{ registryDigest: string; reducerDigest: string }>> {
  const namespace = text(input.namespace, "V124_ATOMIC_CUSTOM_PRIMITIVE_INVALID");
  if (!namespace.startsWith("custom:")) fail("V124_ATOMIC_CUSTOM_PLATFORM_MASQUERADE");
  const sourceRegistryDigest = digest(input.registryDigest, "V124_ATOMIC_CUSTOM_PRIMITIVE_INVALID");
  const sourceReducerDigest = digest(input.reducerDigest, "V124_ATOMIC_CUSTOM_PRIMITIVE_INVALID");
  return freeze({
    registryDigest: await digestReceizCanonicalV122({ schema: "receiz.custom-registry-binding.v124", namespace, sourceRegistryDigest }),
    reducerDigest: await digestReceizCanonicalV122({ schema: "receiz.custom-reducer-binding.v124", namespace, sourceReducerDigest }),
  });
}

async function registeredPayload(category: Category, payload: unknown, registryDigest: string, reducerDigest: string): Promise<RegisteredPayload> {
  if (category === "settlement" || category === "reserve") {
    if ((payload as { schema?: unknown } | null)?.schema === "receiz.locator-bound-value-intent.v124") {
      const value = await validateReceizLocatorBoundValueIntentV124(payload) as ReceizLocatorBoundValueIntentV124;
      if (value.rail !== category) fail("V124_ATOMIC_VALUE_PRIMITIVE_INVALID");
      const source = await casParticipant("value-source", { rail: category, sourceProofObjectId: value.sourceProofObjectId });
      const locator = await casParticipant("value-locator", {
        rail: category,
        locatorDigest: value.recipientLocator.locatorDigest,
        purpose: value.recipientLocator.purpose,
        operationNonce: value.recipientLocator.operationNonce,
      });
      const expectedLocatorHead = await digestReceizCanonicalV122({
        schema: "receiz.public-recipient-locator-unconsumed.v124",
        rail: category,
        locatorDigest: value.recipientLocator.locatorDigest,
        purpose: value.recipientLocator.purpose,
        operationNonce: value.recipientLocator.operationNonce,
      });
      const bindingPrefix = `platform:${category}:${registryDigest}:${reducerDigest}`;
      return freeze({
        payload: value,
        expectedParticipantHeads: exactHeadEntries({ [source]: value.sourceValueHead, [locator]: expectedLocatorHead }),
        participantBindings: exactParticipantBindings({ [source]: `${bindingPrefix}:value-source`, [locator]: `${bindingPrefix}:value-locator` }),
        bindingKind: "platform",
        sourceRegistryDigest: registryDigest,
        sourceReducerDigest: reducerDigest,
      });
    }
    const value = payload as ReceizWorldValueIntentV122;
    if (!await validateReceizValueIntentV122(value) || value.rail !== category) fail("V124_ATOMIC_VALUE_PRIMITIVE_INVALID");
    const source = await casParticipant("value-source", { rail: category, sourceProofObjectId: value.sourceProofObjectId });
    const destination = await casParticipant("value-destination", { rail: category, destinationSubjectId: value.destinationSubjectId });
    const bindingPrefix = `platform:${category}:${registryDigest}:${reducerDigest}`;
    return freeze({
      payload: value,
      expectedParticipantHeads: exactHeadEntries({ [source]: value.sourceValueHead, [destination]: value.expectedDestinationHead }),
      participantBindings: exactParticipantBindings({ [source]: `${bindingPrefix}:value-source`, [destination]: `${bindingPrefix}:value-destination` }),
      bindingKind: "platform",
      sourceRegistryDigest: registryDigest,
      sourceReducerDigest: reducerDigest,
    });
  }
  if (category === "access") {
    const access = payload as ReceizWorldAccessAppendV122;
    if (!await validateReceizWorldAccessAppendV122(access)) fail("V124_ATOMIC_ACCESS_PRIMITIVE_INVALID");
    const participantId = await casParticipant("access", { worldId: access.worldId, subjectId: access.subjectId });
    return freeze({
      payload: access,
      expectedParticipantHeads: exactHeadEntries({ [participantId]: access.expectedAccessHead ?? await absentHead(participantId) }),
      participantBindings: exactParticipantBindings({ [participantId]: `platform:access:${registryDigest}:${reducerDigest}` }),
      bindingKind: "platform",
      sourceRegistryDigest: registryDigest,
      sourceReducerDigest: reducerDigest,
      expectedDomainId: access.worldId,
    });
  }
  if (category === "world-composite") {
    const composite = await validateReceizWorldCompositeOperationV124(payload) as ReceizWorldCompositeOperationV124;
    const world = composite.transaction;
    if (world.registryDigest !== registryDigest || world.reducerDigest !== reducerDigest) fail("V124_ATOMIC_WORLD_COMPOSITE_BINDING_INVALID");
    if (Object.prototype.hasOwnProperty.call(world.participantHeads, world.worldId)) fail("V124_ATOMIC_WORLD_PARTICIPANT_COORDINATE_COLLISION");
    return freeze({
      payload: composite,
      expectedParticipantHeads: exactHeadEntries({ [world.worldId]: world.expectedWorldHead, ...world.participantHeads }),
      participantBindings: exactParticipantBindings({ [world.worldId]: `platform:world:${registryDigest}:${reducerDigest}`, ...Object.fromEntries(Object.keys(world.participantHeads).map((participantId) => [participantId, `platform:subject:${registryDigest}:${reducerDigest}`])) }),
      bindingKind: "platform",
      sourceRegistryDigest: registryDigest,
      sourceReducerDigest: reducerDigest,
      expectedDomainId: world.worldId,
    });
  }
  if (category === "multi-world-composite") {
    const composite = await validateReceizMultiWorldExecutionProjectionV124(payload);
    if (composite.registryDigest !== registryDigest || composite.reducerDigest !== reducerDigest) {
      fail("V124_ATOMIC_MULTI_WORLD_COMPOSITE_BINDING_INVALID");
    }
    const worldHeads = Object.fromEntries(composite.worlds.map((member) => [member.worldId, member.expectedWorldHead]));
    const expectedParticipantHeads = exactHeadEntries({ ...worldHeads, ...composite.currentHeads });
    const bindingPrefix = `platform:multi-world:${registryDigest}:${reducerDigest}`;
    return freeze({
      payload: composite,
      expectedParticipantHeads,
      participantBindings: exactParticipantBindings({
        ...Object.fromEntries(composite.worlds.map((member) => [member.worldId, `${bindingPrefix}:world`])),
        ...Object.fromEntries(Object.keys(composite.currentHeads).map((participantId) => [participantId, `${bindingPrefix}:subject`])),
      }),
      bindingKind: "platform",
      sourceRegistryDigest: registryDigest,
      sourceReducerDigest: reducerDigest,
      expectedDomainId: `multi-world:${composite.multiWorldTransactionId}`,
    });
  }
  if (category === "world" || category === "subject" || category === "inventory" || category === "ownership") {
    const world = payload as ReceizWorldTransactionV122;
    if (!world || world.schema !== "receiz.world.transaction.v122" || world.registryDigest !== registryDigest || world.reducerDigest !== reducerDigest) fail("V124_ATOMIC_WORLD_PRIMITIVE_INVALID");
    let replanned: ReceizWorldTransactionV122;
    try {
      replanned = await planReceizWorldTransactionV122({ worldId: world.worldId, expectedWorldHead: world.expectedWorldHead, participantHeads: world.participantHeads, commands: world.commands, registryDigest: world.registryDigest, reducerDigest: world.reducerDigest, idempotencyKey: world.idempotencyKey });
    } catch {
      fail("V124_ATOMIC_WORLD_PRIMITIVE_INVALID");
    }
    if (canonicalizeReceizV122(replanned) !== canonicalizeReceizV122(world)) fail("V124_ATOMIC_WORLD_PRIMITIVE_INVALID");
    if (Object.prototype.hasOwnProperty.call(world.participantHeads, world.worldId)) fail("V124_ATOMIC_WORLD_PARTICIPANT_COORDINATE_COLLISION");
    const commandKinds = world.commands.map((command) => (command.command as Record<string, unknown>)?.kind);
    if (category === "inventory" && !commandKinds.every((kind) => typeof kind === "string" && (kind.startsWith("inventory.") || kind.startsWith("material.")))) fail("V124_ATOMIC_INVENTORY_COMMAND_INVALID");
    if (category === "subject" && !commandKinds.every((kind) => typeof kind === "string" && kind.startsWith("subject.") && kind !== "subject.ownership.transfer")) fail("V124_ATOMIC_SUBJECT_COMMAND_INVALID");
    if (category === "ownership" && !commandKinds.every((kind) => kind === "subject.ownership.transfer")) fail("V124_ATOMIC_OWNERSHIP_COMMAND_INVALID");
    if (category === "world" && commandKinds.some((kind) => typeof kind === "string" && (kind.startsWith("inventory.") || kind.startsWith("material.") || kind.startsWith("subject.")))) fail("V124_ATOMIC_WORLD_COMMAND_INVALID");
    return freeze({
      payload: world,
      expectedParticipantHeads: exactHeadEntries({ [world.worldId]: world.expectedWorldHead, ...world.participantHeads }),
      participantBindings: exactParticipantBindings({ [world.worldId]: `platform:world:${registryDigest}:${reducerDigest}`, ...Object.fromEntries(Object.keys(world.participantHeads).map((participantId) => [participantId, `platform:subject:${registryDigest}:${reducerDigest}`])) }),
      bindingKind: "platform",
      sourceRegistryDigest: registryDigest,
      sourceReducerDigest: reducerDigest,
      expectedDomainId: world.worldId,
    });
  }
  if (category === "custom") {
    const record = closedRecord(payload, ["schema", "namespace", "registryDigest", "reducerDigest", "expectedParticipantHeads", "operation"], "V124_ATOMIC_CUSTOM_PRIMITIVE_INVALID");
    const namespace = text(record.namespace, "V124_ATOMIC_CUSTOM_PRIMITIVE_INVALID");
    if (record.schema !== "receiz.custom-reducer-operation.v124" || !namespace.startsWith("custom:")) fail("V124_ATOMIC_CUSTOM_PLATFORM_MASQUERADE");
    const sourceRegistryDigest = digest(record.registryDigest, "V124_ATOMIC_CUSTOM_PRIMITIVE_INVALID");
    const sourceReducerDigest = digest(record.reducerDigest, "V124_ATOMIC_CUSTOM_PRIMITIVE_INVALID");
    const bindings = await createReceizCustomReducerBindingsV124({ namespace, registryDigest: sourceRegistryDigest, reducerDigest: sourceReducerDigest });
    if (bindings.registryDigest !== registryDigest || bindings.reducerDigest !== reducerDigest) fail("V124_ATOMIC_CUSTOM_BINDING_INVALID");
    const customHeads = exactHeads(record.expectedParticipantHeads, "V124_ATOMIC_CUSTOM_PARTICIPANT_HEADS_INVALID");
    if (record.operation !== null && typeof record.operation === "object" && !Array.isArray(record.operation)) {
      const nestedSchema = (record.operation as Record<string, unknown>).schema;
      if (typeof nestedSchema === "string" && nestedSchema.startsWith("receiz.")) fail("V124_ATOMIC_CUSTOM_PLATFORM_MASQUERADE");
    }
    return freeze({
      payload: freeze({ schema: "receiz.custom-reducer-operation.v124" as const, namespace, registryDigest: sourceRegistryDigest, reducerDigest: sourceReducerDigest, expectedParticipantHeads: customHeads, operation: record.operation }),
      expectedParticipantHeads: customHeads,
      participantBindings: exactParticipantBindings(Object.fromEntries(Object.keys(customHeads).map((participantId) => [participantId, `custom:${namespace}:${sourceRegistryDigest}:${sourceReducerDigest}`]))),
      bindingKind: "custom",
      sourceRegistryDigest,
      sourceReducerDigest,
    });
  }
  fail("V124_ATOMIC_PLATFORM_PRIMITIVE_INVALID");
}

export async function deriveReceizRegisteredOperationCasV124(input: ReceizRegisteredOperationBasisV124): Promise<ReceizRegisteredOperationCasV124> {
  const record = closedRecord(input, ["operationId", "category", "domainId", "registryDigest", "reducerDigest", "payload"], "V124_ATOMIC_OPERATION_INVALID");
  const category = text(record.category, "V124_ATOMIC_OPERATION_INVALID") as Category;
  if (!categories.includes(category)) fail("V124_ATOMIC_OPERATION_CATEGORY_INVALID");
  const operationDomain = domainId(record.domainId, "V124_ATOMIC_OPERATION_INVALID");
  const operationRegistry = digest(record.registryDigest, "V124_ATOMIC_OPERATION_INVALID");
  const operationReducer = digest(record.reducerDigest, "V124_ATOMIC_OPERATION_INVALID");
  const adapted = await registeredPayload(category, record.payload, operationRegistry, operationReducer);
  if (adapted.expectedDomainId !== undefined && adapted.expectedDomainId !== operationDomain) fail("V124_ATOMIC_OPERATION_DOMAIN_BINDING_MISMATCH");
  return freeze({ participants: freeze(Object.keys(adapted.expectedParticipantHeads)), expectedParticipantHeads: adapted.expectedParticipantHeads });
}
function authority(value: unknown, field: "handleIsProofAuthority" | "outcomeIsProofAuthority" | "failureIsProofAuthority", code: string): HandleAuthority | Authority | ReceizZeroWriteFailureV124["authority"] {
  const record = closedRecord(value, [field, "strongerTruth"], code);
  if (record[field] !== false || record.strongerTruth !== "sealed-receiz-proof-object") fail(code);
  return freeze({ [field]: false, strongerTruth: "sealed-receiz-proof-object" }) as HandleAuthority & Authority & ReceizZeroWriteFailureV124["authority"];
}
function coordinates(record: Readonly<Record<string, unknown>>, prefix: string) {
  return freeze({ applicationId: applicationId(record.applicationId, `${prefix}_APPLICATION_INVALID`), domainId: domainId(record.domainId, `${prefix}_DOMAIN_INVALID`), operationKind: text(record.operationKind, `${prefix}_OPERATION_INVALID`), exactPlanDigest: digest(record.exactPlanDigest, `${prefix}_PLAN_DIGEST_INVALID`), semanticIdempotencyKey: text(record.semanticIdempotencyKey, `${prefix}_IDEMPOTENCY_INVALID`), attemptId: text(record.attemptId, `${prefix}_ATTEMPT_INVALID`) });
}
async function receiptDigest(value: Readonly<Record<string, unknown>>): Promise<string> {
  const { schema: _schema, receiptDigest: _receiptDigest, ...basis } = value;
  return digestReceizCanonicalV122({ schema: "receiz.execution-receipt.v124", ...basis });
}

export async function planAtomicOperationV124(input: ReceizAtomicOperationInputV124): Promise<ReceizOperationPlanV124> {
  const record = closedRecord(input, ["applicationId", "operations", "participants", "expectedParticipantHeads", "semanticIdempotencyKey", "attemptId"], "V124_ATOMIC_INPUT_INVALID");
  const app = applicationId(record.applicationId, "V124_ATOMIC_APPLICATION_INVALID");
  const participants = exactTextList(record.participants, "V124_ATOMIC_PARTICIPANTS");
  const heads = exactHeads(record.expectedParticipantHeads, "V124_ATOMIC_PARTICIPANT_HEADS");
  if (!exactSetMatch(participants, Object.keys(heads))) fail("V124_ATOMIC_PARTICIPANT_HEADS_MISMATCH");
  if (!Array.isArray(record.operations) || record.operations.length === 0) fail("V124_ATOMIC_OPERATIONS_INVALID");
  const operations: ReceizRegisteredOperationV124[] = [];
  const bindings: RegisteredPayload[] = [];
  const derivedHeads = new Map<string, string>();
  const derivedBindings = new Map<string, ParticipantBinding>();
  for (const item of record.operations) {
    const operation = closedRecord(item, ["operationId", "category", "domainId", "registryDigest", "reducerDigest", "participants", "payload"], "V124_ATOMIC_OPERATION_INVALID");
    const category = text(operation.category, "V124_ATOMIC_OPERATION_INVALID") as Category;
    if (!categories.includes(category)) fail("V124_ATOMIC_OPERATION_CATEGORY_INVALID");
    const opParticipants = exactTextList(operation.participants, "V124_ATOMIC_OPERATION_PARTICIPANTS");
    const operationDomain = domainId(operation.domainId, "V124_ATOMIC_OPERATION_INVALID"), operationRegistry = digest(operation.registryDigest, "V124_ATOMIC_OPERATION_INVALID"), operationReducer = digest(operation.reducerDigest, "V124_ATOMIC_OPERATION_INVALID");
    const adapted = await registeredPayload(category, operation.payload, operationRegistry, operationReducer);
    if (adapted.expectedDomainId !== undefined && adapted.expectedDomainId !== operationDomain) fail("V124_ATOMIC_OPERATION_DOMAIN_BINDING_MISMATCH");
    const derivedParticipants = Object.keys(adapted.expectedParticipantHeads);
    if (!exactSetMatch(opParticipants, derivedParticipants)) fail("V124_ATOMIC_OPERATION_PARTICIPANT_BINDING_MISMATCH");
    for (const [participantId, expectedHead] of Object.entries(adapted.expectedParticipantHeads)) {
      const existing = derivedHeads.get(participantId);
      if (existing !== undefined && existing !== expectedHead) fail("V124_ATOMIC_PARTICIPANT_HEAD_CONFLICT");
      const binding = adapted.participantBindings[participantId];
      if (!binding) fail("V124_ATOMIC_PARTICIPANT_BINDING_MISSING");
      const existingBinding = derivedBindings.get(participantId);
      if (existingBinding !== undefined && existingBinding !== binding) fail("V124_ATOMIC_PARTICIPANT_COORDINATE_COLLISION");
      derivedHeads.set(participantId, expectedHead);
      derivedBindings.set(participantId, binding);
    }
    bindings.push(adapted);
    operations.push(freeze({ operationId: text(operation.operationId, "V124_ATOMIC_OPERATION_INVALID"), category, domainId: operationDomain, registryDigest: operationRegistry, reducerDigest: operationReducer, participants: opParticipants, payload: adapted.payload }));
  }
  if (operations.some((operation, index) => index > 0 && operations[index - 1]!.operationId.localeCompare(operation.operationId) >= 0)) fail("V124_ATOMIC_OPERATIONS_NONCANONICAL");
  const domains = [...new Set(operations.map((operation) => operation.domainId))];
  const worldTransaction = (operation: ReceizRegisteredOperationV124): ReceizWorldTransactionV122 | null => {
    const payload = operation.payload as { schema?: unknown; transaction?: unknown };
    if (payload.schema === "receiz.world.transaction.v122") return operation.payload as ReceizWorldTransactionV122;
    if (payload.schema === "receiz.world-execution-projection.v124") return payload.transaction as ReceizWorldTransactionV122;
    return null;
  };
  const supportedMultiWorld = domains.length > 1 && operations.every((operation) => worldTransaction(operation) !== null);
  if (domains.length !== 1 && !supportedMultiWorld) fail("V124_ATOMIC_CROSS_DOMAIN_UNSUPPORTED");
  const platformRegistryDigests = new Set(bindings.filter((binding) => binding.bindingKind === "platform").map((binding) => binding.sourceRegistryDigest));
  const platformReducerDigests = new Set(bindings.filter((binding) => binding.bindingKind === "platform").map((binding) => binding.sourceReducerDigest));
  for (const binding of bindings) {
    if (binding.bindingKind === "custom" && (platformRegistryDigests.has(binding.sourceRegistryDigest) || platformReducerDigests.has(binding.sourceReducerDigest))) fail("V124_ATOMIC_CUSTOM_PLATFORM_BINDING_OVERLAP");
  }
  const exactDerivedHeads = exactHeadEntries(Object.fromEntries(derivedHeads));
  const affected = Object.keys(exactDerivedHeads);
  if (!exactSetMatch(affected, participants)) fail("V124_ATOMIC_PARTICIPANT_UNION_MISMATCH");
  if (canonicalizeReceizV122(exactDerivedHeads) !== canonicalizeReceizV122(heads)) fail("V124_ATOMIC_PARTICIPANT_HEAD_BINDING_MISMATCH");
  const semanticIdempotencyKey = text(record.semanticIdempotencyKey, "V124_ATOMIC_IDEMPOTENCY_INVALID");
  const attemptId = text(record.attemptId, "V124_ATOMIC_ATTEMPT_INVALID");
  const multiWorld: ReceizMultiWorldTransactionV122 | null = supportedMultiWorld ? await planReceizMultiWorldTransactionV122({ worlds: operations.map((operation) => { const transaction = worldTransaction(operation)!; return { worldId: operation.domainId, expectedWorldHead: transaction.expectedWorldHead, transaction }; }), idempotencyKey: semanticIdempotencyKey }) : null;
  const plannedDomain = supportedMultiWorld ? `multi-world:${multiWorld!.multiWorldTransactionId}` : domains[0]!;
  const operationIdentity = await digestReceizCanonicalV122({ schema: "receiz.atomic-operation-identity.v124", applicationId: app, domainId: plannedDomain, operations: operations.map(({ payload, ...operation }) => ({ ...operation, payload })), participants, semanticIdempotencyKey, ...(multiWorld ? { multiWorldDigest: multiWorld.multiWorldDigest } : {}) });
  const atomicOperationId = `receiz:atomic-operation:${operationIdentity}`;
  const registryDigest = await digestReceizCanonicalV122({ schema: "receiz.atomic-operation-registries.v124", registries: [...new Set(operations.map((operation) => operation.registryDigest))].sort() });
  const reducerDigest = await digestReceizCanonicalV122({ schema: "receiz.atomic-operation-reducers.v124", reducers: [...new Set(operations.map((operation) => operation.reducerDigest))].sort() });
  const payload = freeze({ schema: "receiz.atomic-operation.v124" as const, atomicOperationId, applicationId: app, domainId: plannedDomain, operations: freeze(operations), participants, expectedParticipantHeads: heads, semanticIdempotencyKey, attemptId, ...(multiWorld ? { multiWorld } : {}) });
  const exactPlanBytesB64u = receizBase64UrlEncode(new TextEncoder().encode(canonicalizeReceizV122(payload)));
  const exactPlanDigest = await digestReceizCanonicalV122(payload);
  return validateReceizOperationPlanV124({ schema: "receiz.operation_plan.v124", applicationId: app, domainId: plannedDomain, operationKind: "receiz.atomic-operation.v124", registryDigest, reducerDigest, exactPlanBytesB64u, exactPlanDigest, expectedParticipantHeads: heads, semanticIdempotencyKey, attemptId, writesOnFailure: 0 });
}

async function validateHandle(value: unknown): Promise<ReceizDurableExecutionHandleV124> {
  if (value === null || typeof value !== "object" || !admittedExecutionWires.has(value)) fail("V124_EXECUTION_AUTHENTICATION_REQUIRED");
  const record = closedRecord(value, ["schema", "executionId", "applicationId", "domainId", "operationKind", "exactPlanDigest", "semanticIdempotencyKey", "attemptId", "stagedAtKaiUPulse", "handleDigest", "authority", "receiptDigest"], "V124_EXECUTION_HANDLE_CLOSED_SHAPE_INVALID");
  if (record.schema !== "receiz.durable-execution-handle.v124") fail("V124_EXECUTION_HANDLE_SCHEMA_INVALID");
  const base = { schema: "receiz.durable-execution-handle.v124" as const, executionId: text(record.executionId, "V124_EXECUTION_HANDLE_INVALID"), ...coordinates(record, "V124_EXECUTION_HANDLE"), stagedAtKaiUPulse: upulse(record.stagedAtKaiUPulse, "V124_EXECUTION_HANDLE_UPULSE_INVALID"), handleDigest: digest(record.handleDigest, "V124_EXECUTION_HANDLE_INVALID"), authority: authority(record.authority, "handleIsProofAuthority", "V124_EXECUTION_HANDLE_AUTHORITY_INVALID") as HandleAuthority, receiptDigest: digest(record.receiptDigest, "V124_EXECUTION_HANDLE_INVALID") };
  if (base.handleDigest !== await digestReceizCanonicalV122({ schema: "receiz.execution-handle.v124", executionId: base.executionId, exactPlanDigest: base.exactPlanDigest, attemptId: base.attemptId }) || base.receiptDigest !== await receiptDigest(base)) fail("V124_EXECUTION_HANDLE_RECEIPT_INVALID");
  const result = freeze(base); custodiedHandles.add(result); return result;
}

export async function validateReceizExecutionOutcomeV124(value: unknown): Promise<ReceizExecutionOutcomeV124> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) fail("V124_EXECUTION_AUTHENTICATION_REQUIRED");
  const admission = admittedExecutionWires.get(value);
  if (!admission) fail("V124_EXECUTION_AUTHENTICATION_REQUIRED");
  const status = (value as Record<string, unknown>).status;
  if (status === "unknown") {
    const record = closedRecord(value, ["schema", "status", "executionId", "applicationId", "domainId", "operationKind", "exactPlanDigest", "semanticIdempotencyKey", "attemptId", "stagedAtKaiUPulse", "plan", "authority", "receiptDigest"], "V124_EXECUTION_OUTCOME_CLOSED_SHAPE_INVALID");
    if (record.schema !== "receiz.execution-outcome.v124") fail("V124_EXECUTION_OUTCOME_SCHEMA_INVALID");
    const plan = await validateReceizOperationPlanV124(record.plan);
    const base = { schema: "receiz.execution-outcome.v124" as const, status: "unknown" as const, executionId: text(record.executionId, "V124_EXECUTION_OUTCOME_INVALID"), ...coordinates(record, "V124_EXECUTION_OUTCOME"), stagedAtKaiUPulse: upulse(record.stagedAtKaiUPulse, "V124_EXECUTION_OUTCOME_UPULSE_INVALID"), plan, authority: authority(record.authority, "outcomeIsProofAuthority", "V124_EXECUTION_OUTCOME_AUTHORITY_INVALID") as Authority, receiptDigest: digest(record.receiptDigest, "V124_EXECUTION_OUTCOME_INVALID") };
    if (base.applicationId !== plan.applicationId || base.domainId !== plan.domainId || base.operationKind !== plan.operationKind || base.exactPlanDigest !== plan.exactPlanDigest || base.semanticIdempotencyKey !== plan.semanticIdempotencyKey || base.attemptId !== plan.attemptId || base.receiptDigest !== await receiptDigest(base)) fail("V124_EXECUTION_OUTCOME_RECEIPT_INVALID");
    return freeze(base);
  }
  if (status !== "committed" && status !== "zero-write" && status !== "cancelled") fail("V124_EXECUTION_OUTCOME_STATUS_INVALID");
  if (status === "committed" && admission.kind !== "committed-transition-source") {
    fail("V124_EXECUTION_COMMITTED_TRANSITION_REQUIRED");
  }
  const extra = status === "committed" ? ["terminalAtKaiUPulse", "committedHeads", "outcomeDigest"] : ["terminalAtKaiUPulse", "reasonCode", "writes", "outcomeDigest"];
  const record = closedRecord(value, ["schema", "status", "executionId", "applicationId", "domainId", "operationKind", "exactPlanDigest", "semanticIdempotencyKey", "attemptId", ...extra, "authority", "receiptDigest"], "V124_EXECUTION_OUTCOME_CLOSED_SHAPE_INVALID");
  if (record.schema !== "receiz.execution-outcome.v124") fail("V124_EXECUTION_OUTCOME_SCHEMA_INVALID");
  const common = { schema: "receiz.execution-outcome.v124" as const, status, executionId: text(record.executionId, "V124_EXECUTION_OUTCOME_INVALID"), ...coordinates(record, "V124_EXECUTION_OUTCOME"), terminalAtKaiUPulse: upulse(record.terminalAtKaiUPulse, "V124_EXECUTION_OUTCOME_UPULSE_INVALID"), authority: authority(record.authority, "outcomeIsProofAuthority", "V124_EXECUTION_OUTCOME_AUTHORITY_INVALID") as Authority, receiptDigest: digest(record.receiptDigest, "V124_EXECUTION_OUTCOME_INVALID") };
  const terminal = status === "committed"
    ? { ...common, committedHeads: exactHeads(record.committedHeads, "V124_EXECUTION_OUTCOME_COMMITTED_HEADS"), outcomeDigest: digest(record.outcomeDigest, "V124_EXECUTION_OUTCOME_INVALID") }
    : { ...common, reasonCode: (["IDEMPOTENCY_CONFLICT", "STALE_HEAD", "MISSING_PARTICIPANT", "UNAUTHORIZED", "INVALID_OPERATION", "INSUFFICIENT_VALUE", "UNSUPPORTED_ATOMICITY", "ALREADY_COMMITTED", "CANCELLED"] as const).includes(record.reasonCode as ReceizZeroWriteFailureReasonV124) ? record.reasonCode as ReceizZeroWriteFailureReasonV124 : fail("V124_EXECUTION_OUTCOME_REASON_INVALID"), writes: record.writes === 0 ? 0 as const : fail("V124_EXECUTION_OUTCOME_ZERO_WRITE_REQUIRED"), outcomeDigest: digest(record.outcomeDigest, "V124_EXECUTION_OUTCOME_INVALID") };
  const { schema: _terminalSchema, receiptDigest: terminalReceipt, outcomeDigest, ...terminalBasis } = terminal;
  if (outcomeDigest !== await digestReceizCanonicalV122({ schema: "receiz.execution-terminal.v124", ...terminalBasis }) || terminalReceipt !== await receiptDigest(terminal)) fail("V124_EXECUTION_OUTCOME_RECEIPT_INVALID");
  const result = freeze(terminal) as ReceizExecutionOutcomeV124;
  if (status === "committed" && admission.kind === "committed-transition-source") {
    committedExecutionRecoveries.set(result, admission.portableRecovery);
  }
  return result;
}

function validateResolution(value: ReceizExecutionResolutionV124): ReceizExecutionResolutionV124 { const record = closedRecord(value, ["applicationId", "executionId"], "V124_EXECUTION_RESOLUTION_INVALID"); return freeze({ applicationId: applicationId(record.applicationId, "V124_EXECUTION_RESOLUTION_INVALID"), executionId: text(record.executionId, "V124_EXECUTION_RESOLUTION_INVALID") }); }
function validateIdempotency(value: ReceizExecutionIdempotencyCoordinatesV124): ReceizExecutionIdempotencyCoordinatesV124 { const record = closedRecord(value, ["applicationId", "domainId", "operationKind", "semanticIdempotencyKey"], "V124_EXECUTION_IDEMPOTENCY_INVALID"); return freeze({ applicationId: applicationId(record.applicationId, "V124_EXECUTION_IDEMPOTENCY_INVALID"), domainId: domainId(record.domainId, "V124_EXECUTION_IDEMPOTENCY_INVALID"), operationKind: text(record.operationKind, "V124_EXECUTION_IDEMPOTENCY_INVALID"), semanticIdempotencyKey: text(record.semanticIdempotencyKey, "V124_EXECUTION_IDEMPOTENCY_INVALID") }); }
async function validateFailure(value: unknown): Promise<ReceizZeroWriteFailureV124> { if (value === null || typeof value !== "object" || Array.isArray(value) || !admittedExecutionWires.has(value)) fail("V124_EXECUTION_AUTHENTICATION_REQUIRED"); const record = closedRecord(value, ["schema", "executionId", "applicationId", "domainId", "operationKind", "exactPlanDigest", "semanticIdempotencyKey", "attemptId", "reasonCode", "writes", "failureDigest", "authority", "receiptDigest"], "V124_ZERO_WRITE_FAILURE_CLOSED_SHAPE_INVALID"); if (record.schema !== "receiz.zero-write-failure.v124" || (record.executionId !== null && typeof record.executionId !== "string") || !["IDEMPOTENCY_CONFLICT", "STALE_HEAD", "MISSING_PARTICIPANT", "UNAUTHORIZED", "INVALID_OPERATION", "INSUFFICIENT_VALUE", "UNSUPPORTED_ATOMICITY", "ALREADY_COMMITTED", "CANCELLED"].includes(String(record.reasonCode)) || record.writes !== 0) fail("V124_ZERO_WRITE_FAILURE_INVALID"); const base = { schema: "receiz.zero-write-failure.v124" as const, executionId: record.executionId === null ? null : text(record.executionId, "V124_ZERO_WRITE_FAILURE_INVALID"), ...coordinates(record, "V124_ZERO_WRITE_FAILURE"), reasonCode: record.reasonCode as ReceizZeroWriteFailureReasonV124, writes: 0 as const, failureDigest: digest(record.failureDigest, "V124_ZERO_WRITE_FAILURE_INVALID"), authority: authority(record.authority, "failureIsProofAuthority", "V124_ZERO_WRITE_FAILURE_AUTHORITY_INVALID") as ReceizZeroWriteFailureV124["authority"], receiptDigest: digest(record.receiptDigest, "V124_ZERO_WRITE_FAILURE_INVALID") }; const { schema: _schema, failureDigest, receiptDigest: actualReceipt, ...basis } = base; if (failureDigest !== await digestReceizCanonicalV122({ schema: "receiz.zero-write-failure-digest.v124", ...basis }) || actualReceipt !== await digestReceizCanonicalV122({ schema: "receiz.zero-write-failure-receipt.v124", ...basis, failureDigest })) fail("V124_ZERO_WRITE_FAILURE_RECEIPT_INVALID"); return freeze(base); }
function bindsPlan(outcome: ReceizExecutionOutcomeV124, plan: ReceizOperationPlanV124, executionId?: string): void { if (outcome.applicationId !== plan.applicationId || outcome.domainId !== plan.domainId || outcome.operationKind !== plan.operationKind || outcome.exactPlanDigest !== plan.exactPlanDigest || outcome.semanticIdempotencyKey !== plan.semanticIdempotencyKey || outcome.attemptId !== plan.attemptId || (executionId !== undefined && outcome.executionId !== executionId)) fail("V124_EXECUTION_RESPONSE_COORDINATE_MISMATCH"); }
function bindsHandle(outcome: ReceizExecutionOutcomeV124, handle: ReceizDurableExecutionHandleV124): void { if (outcome.executionId !== handle.executionId || outcome.applicationId !== handle.applicationId || outcome.domainId !== handle.domainId || outcome.operationKind !== handle.operationKind || outcome.exactPlanDigest !== handle.exactPlanDigest || outcome.semanticIdempotencyKey !== handle.semanticIdempotencyKey || outcome.attemptId !== handle.attemptId) fail("V124_EXECUTION_RESPONSE_COORDINATE_MISMATCH"); }

async function admitCommittedExecutionRecoveryV124(
  value: unknown,
  audienceValue: string,
  expected?: PreparedExecutionHandle,
): Promise<ReceizExecutionOutcomeV124> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    fail("V124_EXECUTION_TRANSITION_RECOVERY_RESPONSE_INVALID");
  }
  if (!pendingExecutionWires.has(value)) fail("V124_EXECUTION_TRANSPORT_UNAUTHENTICATED");
  pendingExecutionWires.delete(value);
  const outer = closedRecord(
    value,
    ["schema", "outcome", "recovery"],
    "V124_EXECUTION_TRANSITION_RECOVERY_RESPONSE_INVALID",
  );
  if (outer.schema !== "receiz.execution-transition-recovery-response.v124"
    || outer.outcome === null || typeof outer.outcome !== "object" || Array.isArray(outer.outcome)) {
    fail("V124_EXECUTION_TRANSITION_RECOVERY_RESPONSE_INVALID");
  }
  const recovery = outer.recovery as ReceizPortableExecutionTransitionRecoveryV124;
  const recoveryRecord = closedRecord(
    recovery,
    ["schema", "transitionSet", "members", "authority"],
    "V124_EXECUTION_TRANSITION_RECOVERY_RESPONSE_INVALID",
  );
  const audience = applicationId(audienceValue, "V124_EXECUTION_TRANSITION_AUDIENCE_INVALID");
  const verified = await verifyReceizPortableExecutionTransitionSetV124(
    recoveryRecord.transitionSet,
    { audience },
  );
  if (expected
    && (!canonicalEqual(recoveryRecord.transitionSet, expected.rawTransitionSet)
      || !canonicalEqual(verified.operationPlan, expected.transitionSet.operationPlan))) {
    fail("V124_EXECUTION_TRANSITION_SOURCE_SUBSTITUTION");
  }
  const recovered = await recoverReceizPortableExecutionTransitionSetV124(recovery, { audience });
  if (recovered.transitions.length !== verified.members.length) {
    fail("V124_EXECUTION_TRANSITION_RECOVERY_PARTICIPANT_MISMATCH");
  }
  const outcomeWire = outer.outcome as object;
  const committedAdmission = freeze({
    kind: "committed-transition-source" as const,
    transitionSet: verified,
    recovery: recovered,
    portableRecovery: snapshot(recovery, "V124_EXECUTION_COMMITTED_RECOVERY_INVALID"),
  });
  admittedExecutionWires.set(outcomeWire, committedAdmission);
  try {
    const outcome = await validateReceizExecutionOutcomeV124(outcomeWire);
    if (outcome.status !== "committed") {
      fail("V124_EXECUTION_TRANSITION_RECOVERY_RESPONSE_INVALID");
    }
    bindsPlan(outcome, verified.operationPlan);
    if (!canonicalEqual(outcome.committedHeads, verified.proposedParticipantHeads)) {
      fail("V124_EXECUTION_TRANSITION_COMMITTED_HEADS_MISMATCH");
    }
    admittedExecutionWires.set(outcome, committedAdmission);
    return outcome;
  } catch (error) {
    admittedExecutionWires.delete(outcomeWire);
    throw error;
  }
}

export function createReceizV124Execution(request: RemoteRequest) {
  const admitResponse = async (
    response: unknown,
    options?: Readonly<{ method?: string; body?: Record<string, unknown> }>,
    expected?: PreparedExecutionHandle,
    expectedAudience?: string,
  ) => {
    if ((response as { schema?: unknown } | null)?.schema === "receiz.execution-transition-recovery-response.v124") {
      const audience = expected?.transitionSet.operationPlan.applicationId
        ?? (options?.body?.handle as { applicationId?: unknown } | undefined)?.applicationId
        ?? options?.body?.applicationId
        ?? expectedAudience;
      return admitCommittedExecutionRecoveryV124(
        response,
        applicationId(audience, "V124_EXECUTION_TRANSITION_AUDIENCE_INVALID"),
        expected,
      );
    }
    return admitReceizExecutionWireV124(response);
  };
  const wire = async (
    path: string,
    options?: Readonly<{ method?: string; body?: Record<string, unknown> }>,
    expected?: PreparedExecutionHandle,
    expectedAudience?: string,
  ) => admitResponse(await request<unknown>(path, options), options, expected, expectedAudience);
  const resolve = async (input: ReceizExecutionResolutionV124) => {
    const coordinates = validateResolution(input);
    const outcome = await wire(
      `/api/sdk/v1/execution/${encodeURIComponent(coordinates.applicationId)}/${encodeURIComponent(coordinates.executionId)}`,
      undefined,
      undefined,
      coordinates.applicationId,
    ) as ReceizExecutionOutcomeV124;
    const validated = await validateReceizExecutionOutcomeV124(outcome);
    if (validated.applicationId !== coordinates.applicationId || validated.executionId !== coordinates.executionId) fail("V124_EXECUTION_RESPONSE_COORDINATE_MISMATCH");
    return validated;
  };
  const resolveByIdempotency = async (
    input: ReceizExecutionIdempotencyCoordinatesV124,
    expected?: PreparedExecutionHandle,
  ) => {
    const coordinates = validateIdempotency(input);
    const outcome = await wire(
      `/api/sdk/v1/execution/by-idempotency/${encodeURIComponent(coordinates.applicationId)}/${encodeURIComponent(coordinates.domainId)}/${encodeURIComponent(coordinates.operationKind)}/${encodeURIComponent(coordinates.semanticIdempotencyKey)}`,
      undefined,
      expected,
      coordinates.applicationId,
    ) as ReceizExecutionOutcomeV124;
    const validated = await validateReceizExecutionOutcomeV124(outcome);
    if (validated.applicationId !== coordinates.applicationId || validated.domainId !== coordinates.domainId || validated.operationKind !== coordinates.operationKind || validated.semanticIdempotencyKey !== coordinates.semanticIdempotencyKey) fail("V124_EXECUTION_RESPONSE_COORDINATE_MISMATCH");
    return validated;
  };
  const resolveByIdempotencyKey = (input: ReceizExecutionIdempotencyCoordinatesV124) => resolveByIdempotency(input);
  const stage = async (planInput: ReceizOperationPlanV124) => { const plan = await validateReceizOperationPlanV124(planInput); const response = await wire("/api/sdk/v1/execution/stage", { method: "POST", body: { applicationId: plan.applicationId, plan } }); if ((response as Record<string, unknown>).schema === "receiz.zero-write-failure.v124") { const rejected = await validateFailure(response); if (rejected.applicationId !== plan.applicationId || rejected.domainId !== plan.domainId || rejected.operationKind !== plan.operationKind || rejected.exactPlanDigest !== plan.exactPlanDigest || rejected.semanticIdempotencyKey !== plan.semanticIdempotencyKey || rejected.attemptId !== plan.attemptId) fail("V124_EXECUTION_RESPONSE_COORDINATE_MISMATCH"); throw new ReceizExecutionZeroWriteErrorV124(rejected); } const handle = await validateHandle(response); if (handle.applicationId !== plan.applicationId || handle.domainId !== plan.domainId || handle.operationKind !== plan.operationKind || handle.exactPlanDigest !== plan.exactPlanDigest || handle.semanticIdempotencyKey !== plan.semanticIdempotencyKey || handle.attemptId !== plan.attemptId) fail("V124_EXECUTION_STAGE_BINDING_INVALID"); return handle; };
  const stagePrepared = async (
    planInput: ReceizOperationPlanV124,
    transitionSetInput: ReceizPortableExecutionTransitionSetV124,
  ) => {
    const plan = await validateReceizOperationPlanV124(planInput);
    const rawTransitionSet = snapshot(
      transitionSetInput,
      "V124_EXECUTION_TRANSITION_SOURCE_INVALID",
    );
    const transitionSet = await verifyReceizPortableExecutionTransitionSetV124(
      rawTransitionSet,
      { audience: plan.applicationId },
    );
    if (!canonicalEqual(transitionSet.operationPlan, plan)) {
      fail("V124_EXECUTION_TRANSITION_PLAN_MISMATCH");
    }
    const handle = await stage(plan);
    preparedExecutionHandles.set(handle, freeze({ rawTransitionSet, transitionSet }));
    return handle;
  };
  const execute = async (handle: ReceizDurableExecutionHandleV124, authoritySession: unknown) => {
    if (!custodiedHandles.has(handle)) fail("V124_EXECUTION_HANDLE_CUSTODY_REQUIRED");
    const prepared = preparedExecutionHandles.get(handle);
    if (!prepared) fail("V124_EXECUTION_TRANSITION_SOURCE_REQUIRED");
    const options = {
      method: "POST" as const,
      body: {
        applicationId: handle.applicationId,
        handle,
        authoritySession,
        transitionSet: prepared.rawTransitionSet,
      },
    };
    let received: unknown;
    try {
      received = await request<unknown>("/api/sdk/v1/execution/execute", options);
    } catch (error) {
      if (error instanceof TypeError && /^V124_/.test(error.message)) throw error;
      return resolveByIdempotency({
        applicationId: handle.applicationId,
        domainId: handle.domainId,
        operationKind: handle.operationKind,
        semanticIdempotencyKey: handle.semanticIdempotencyKey,
      }, prepared);
    }
    const response = await admitResponse(received, options, prepared);
    const outcome = await validateReceizExecutionOutcomeV124(response);
    bindsHandle(outcome, handle);
    return outcome;
  };
  const cancel = async (handle: ReceizDurableExecutionHandleV124, authoritySession: unknown): Promise<ReceizZeroWriteFailureV124> => {
    if (!custodiedHandles.has(handle)) fail("V124_EXECUTION_HANDLE_CUSTODY_REQUIRED");
    const requestCancellation = () => wire("/api/sdk/v1/execution/cancel", { method: "POST", body: { applicationId: handle.applicationId, handle, authoritySession } });
    let response: unknown;
    try {
      response = await requestCancellation();
    } catch (error) {
      if (error instanceof TypeError && /V124_EXECUTION_/.test(error.message)) throw error;
      const current = await resolveByIdempotencyKey({ applicationId: handle.applicationId, domainId: handle.domainId, operationKind: handle.operationKind, semanticIdempotencyKey: handle.semanticIdempotencyKey });
      bindsHandle(current, handle);
      response = await requestCancellation();
    }
    const rejected = await validateFailure(response);
    if (rejected.executionId !== handle.executionId || rejected.applicationId !== handle.applicationId || rejected.domainId !== handle.domainId || rejected.operationKind !== handle.operationKind || rejected.exactPlanDigest !== handle.exactPlanDigest || rejected.semanticIdempotencyKey !== handle.semanticIdempotencyKey || rejected.attemptId !== handle.attemptId) fail("V124_EXECUTION_RESPONSE_COORDINATE_MISMATCH");
    return rejected;
  };
  return freeze({
    stage,
    stagePrepared,
    execute,
    resolve,
    resolveByIdempotencyKey,
    cancel,
    exportCommittedRecovery: exportReceizCommittedExecutionRecoveryV124,
    planAtomicOperationV124,
    planAtomicMutation: planAtomicOperationV124,
  });
}
