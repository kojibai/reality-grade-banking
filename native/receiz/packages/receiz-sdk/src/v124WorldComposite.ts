import {
  canonicalizeReceizV122,
  createReceizWorldIdempotencyDigestV122,
  digestReceizCanonicalV122,
} from "./v122Canonical.js";
import {
  validateReceizPrivateWorldEnvelopeV122,
  type ReceizPrivateWorldEnvelopeV122,
} from "./v122PrivateWorld.js";
import {
  planReceizWorldTransactionV122,
  type ReceizWorldTransactionV122,
} from "./v122Transactions.js";
import {
  planReceizMultiWorldTransactionV122,
  type ReceizMultiWorldTransactionV122,
} from "./v122MultiWorld.js";
import {
  validateReceizValueIntentV122,
  type ReceizWorldValueIntentV122,
} from "./v122Value.js";
import {
  validateReceizWorldAccessAppendV122,
  type ReceizWorldAccessAppendV122,
} from "./v122WorldAccess.js";
import { closedRecord, digest, freeze, text } from "./v124Contracts.js";
import { closeEphemeralPublicKeyJwk } from "./v124Domains.js";

export type ReceizWorldCompositeCommandCategoryV124 =
  | "inventory"
  | "material"
  | "ownership"
  | "subject"
  | "world";

export type ReceizWorldJsonObjectV124 = Readonly<Record<string, unknown>>;

export type ReceizWorldExecutionReceiptV124 = ReceizWorldJsonObjectV124 & Readonly<{
  authority: Readonly<{
    receiptIsProofAuthority: false;
    strongerTruth: "sealed-receiz-proof-object";
  }>;
}>;

export type ReceizWorldExecutionEventV124 = Readonly<{
  schema: "receiz.world-execution-event.v124";
  eventDigest: string;
  worldId: string;
  transactionId: string;
  ordinal: number;
  priorWorldHead: string;
  acceptedWorldHead: string;
  actorSubjectId: string;
  kind: string;
  visibilityMode: "public" | "private" | "invited";
  publicPayload: ReceizWorldJsonObjectV124;
  privateEnvelopeDigest: string | null;
  acceptedAtKai: number;
}>;

export type ReceizWorldExecutionPrivateEnvelopeV124 = Readonly<
  ReceizPrivateWorldEnvelopeV122 & { eventDigest: string }
>;

export type ReceizWorldExecutionProjectionV124 = Readonly<{
  schema: "receiz.world-execution-projection.v124";
  worldId: string;
  transactionId: string;
  idempotencyIdentityDigest: string;
  transactionDigest: string;
  expectedWorldHead: string;
  currentHeads: Readonly<Record<string, string>>;
  transaction: ReceizWorldTransactionV122;
  events: readonly ReceizWorldExecutionEventV124[];
  privateEnvelopes: readonly ReceizWorldExecutionPrivateEnvelopeV124[];
  accessAppends: readonly ReceizWorldAccessAppendV122[];
  valueIntents: readonly ReceizWorldValueIntentV122[];
  receipt: ReceizWorldExecutionReceiptV124;
  receiptDigest: string;
  acceptedWorldHead: string;
  acceptedSubjectHeads: Readonly<Record<string, string>>;
  registryDigest: string;
  reducerDigest: string;
  commandCategories: readonly ReceizWorldCompositeCommandCategoryV124[];
  projectionDigest: string;
  authority: Readonly<{
    projectionIsExecutionAuthority: false;
    strongerTruth: "sealed-receiz-proof-object";
  }>;
}>;

export type ReceizWorldExecutionProjectionInputV124 = Readonly<{
  transaction: ReceizWorldTransactionV122;
  events: readonly ReceizWorldExecutionEventV124[];
  privateEnvelopes: readonly ReceizWorldExecutionPrivateEnvelopeV124[];
  accessAppends: readonly ReceizWorldAccessAppendV122[];
  valueIntents: readonly ReceizWorldValueIntentV122[];
  receipt: ReceizWorldExecutionReceiptV124;
  acceptedWorldHead: string;
  acceptedSubjectHeads: Readonly<Record<string, string>>;
}>;

export type ReceizMultiWorldExecutionMemberV124 = Readonly<{
  ordinal: number;
  worldId: string;
  expectedWorldHead: string;
  execution: ReceizWorldExecutionProjectionV124;
}>;

export type ReceizMultiWorldExecutionProjectionV124 = Readonly<{
  schema: "receiz.multi-world-execution-projection.v124";
  multiWorldTransactionId: string;
  idempotencyIdentityDigest: string;
  multiWorldDigest: string;
  currentHeads: Readonly<Record<string, string>>;
  transaction: ReceizMultiWorldTransactionV122;
  worlds: readonly ReceizMultiWorldExecutionMemberV124[];
  receipt: ReceizWorldJsonObjectV124;
  receiptDigest: string;
  registryDigest: string;
  reducerDigest: string;
  commandCategories: readonly ReceizWorldCompositeCommandCategoryV124[];
  projectionDigest: string;
  authority: Readonly<{
    projectionIsExecutionAuthority: false;
    strongerTruth: "sealed-receiz-proof-object";
  }>;
}>;

export type ReceizMultiWorldExecutionProjectionInputV124 = Readonly<{
  worlds: readonly ReceizWorldExecutionProjectionV124[];
  idempotencyKey: string;
  receipt: ReceizWorldJsonObjectV124;
}>;

const AUTHORITY = freeze({
  projectionIsExecutionAuthority: false as const,
  strongerTruth: "sealed-receiz-proof-object" as const,
});
const PRIVATE_EVENT_KEYS = /^(?:privatePayload|privateGeometry|recipientWraps|ciphertextB64u|wrappedContentKeyB64u|envelope)$/i;

function fail(code: string): never { throw new TypeError(code); }

function safeInteger(value: unknown, code: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) fail(code);
  return value as number;
}

function canonicalJson(value: unknown, code: string): unknown {
  let clone: unknown;
  try {
    clone = structuredClone(value);
    canonicalizeReceizV122(clone);
  } catch {
    return fail(code);
  }
  return freeze(clone);
}

function canonicalJsonObject(value: unknown, code: string): ReceizWorldJsonObjectV124 {
  try {
    if (value === null || typeof value !== "object" || Array.isArray(value)) fail(code);
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) fail(code);
    const descriptors = Object.getOwnPropertyDescriptors(value);
    if (Reflect.ownKeys(descriptors).some((key) => typeof key !== "string"
      || !descriptors[key]?.enumerable
      || !("value" in descriptors[key]!))) fail(code);
  } catch {
    return fail(code);
  }
  return canonicalJson(value, code) as ReceizWorldJsonObjectV124;
}

function canonicalWorldExecutionReceipt(value: unknown): ReceizWorldExecutionReceiptV124 {
  const receipt = canonicalJsonObject(value, "V124_WORLD_EXECUTION_RECEIPT_INVALID");
  const authority = closedRecord(
    receipt.authority,
    ["receiptIsProofAuthority", "strongerTruth"],
    "V124_WORLD_EXECUTION_RECEIPT_INVALID",
  );
  if (authority.receiptIsProofAuthority !== false
    || authority.strongerTruth !== "sealed-receiz-proof-object") {
    fail("V124_WORLD_EXECUTION_RECEIPT_INVALID");
  }
  return receipt as ReceizWorldExecutionReceiptV124;
}

function exactHeadMap(value: unknown, code: string): Readonly<Record<string, string>> {
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
    result[text(name, code)] = digest(descriptor.value, code);
  }
  return freeze(result);
}

function sameHeadMap(left: Readonly<Record<string, string>>, right: Readonly<Record<string, string>>): boolean {
  return canonicalizeReceizV122(left) === canonicalizeReceizV122(right);
}

function sameKeys(left: Readonly<Record<string, string>>, right: Readonly<Record<string, string>>): boolean {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  return leftKeys.length === rightKeys.length && leftKeys.every((value, index) => value === rightKeys[index]);
}

function containsPrivateEventMaterial(value: unknown, seen = new Set<object>()): boolean {
  if (!value || typeof value !== "object") return false;
  if (seen.has(value)) return false;
  seen.add(value);
  if (Array.isArray(value)) return value.some((entry) => containsPrivateEventMaterial(entry, seen));
  return Object.entries(value as Record<string, unknown>).some(([key, entry]) =>
    PRIVATE_EVENT_KEYS.test(key) || containsPrivateEventMaterial(entry, seen));
}

function containsExactBinding(value: unknown, key: string, expected: string, seen = new Set<object>()): boolean {
  if (!value || typeof value !== "object" || seen.has(value)) return false;
  seen.add(value);
  if (Array.isArray(value)) return value.some((entry) => containsExactBinding(entry, key, expected, seen));
  const objectValue = value as Record<string, unknown>;
  return objectValue[key] === expected || Object.values(objectValue).some((entry) =>
    containsExactBinding(entry, key, expected, seen));
}

function commandCategory(value: unknown): ReceizWorldCompositeCommandCategoryV124 {
  if (value === null || typeof value !== "object" || Array.isArray(value)) fail("V124_WORLD_COMPOSITE_COMMAND_INVALID");
  const kind = (value as { kind?: unknown }).kind;
  if (typeof kind !== "string" || kind.length === 0) fail("V124_WORLD_COMPOSITE_COMMAND_INVALID");
  if (kind.startsWith("inventory.")) return "inventory";
  if (kind.startsWith("material.")) return "material";
  if (kind === "subject.ownership.transfer") return "ownership";
  if (kind.startsWith("subject.")) return "subject";
  return "world";
}

async function exactTransaction(value: unknown): Promise<Readonly<{
  transaction: ReceizWorldTransactionV122;
  commandCategories: readonly ReceizWorldCompositeCommandCategoryV124[];
}>> {
  if (value === null || typeof value !== "object" || Array.isArray(value)
    || (value as { schema?: unknown }).schema !== "receiz.world.transaction.v122") fail("V124_WORLD_COMPOSITE_TRANSACTION_INVALID");
  const transaction = value as ReceizWorldTransactionV122;
  let replanned: ReceizWorldTransactionV122;
  try {
    replanned = await planReceizWorldTransactionV122({
      worldId: transaction.worldId,
      expectedWorldHead: transaction.expectedWorldHead,
      participantHeads: transaction.participantHeads,
      commands: transaction.commands,
      registryDigest: transaction.registryDigest,
      reducerDigest: transaction.reducerDigest,
      idempotencyKey: transaction.idempotencyKey,
    });
  } catch {
    return fail("V124_WORLD_COMPOSITE_TRANSACTION_INVALID");
  }
  if (canonicalizeReceizV122(replanned) !== canonicalizeReceizV122(transaction)) fail("V124_WORLD_COMPOSITE_TRANSACTION_INVALID");
  const commandCategories = freeze([...new Set(transaction.commands.map((command) =>
    commandCategory(command.command)))].sort()) as readonly ReceizWorldCompositeCommandCategoryV124[];
  if (!commandCategories.includes("world")
    || (!commandCategories.includes("inventory") && !commandCategories.includes("material"))) {
    fail("V124_WORLD_COMPOSITE_MIXED_COMMANDS_REQUIRED");
  }
  return freeze({ transaction: replanned, commandCategories });
}

function eventBasis(record: Readonly<Record<string, unknown>>) {
  const candidateVisibilityMode = record.visibilityMode;
  if (candidateVisibilityMode !== "public" && candidateVisibilityMode !== "private" && candidateVisibilityMode !== "invited") fail("V124_WORLD_EXECUTION_EVENT_INVALID");
  const visibilityMode: ReceizWorldExecutionEventV124["visibilityMode"] = candidateVisibilityMode;
  const privateEnvelopeDigest = record.privateEnvelopeDigest === null
    ? null
    : digest(record.privateEnvelopeDigest, "V124_WORLD_EXECUTION_EVENT_INVALID");
  if ((visibilityMode === "public") !== (privateEnvelopeDigest === null)) fail("V124_WORLD_EXECUTION_EVENT_INVALID");
  const publicPayload = canonicalJsonObject(record.publicPayload, "V124_WORLD_EXECUTION_EVENT_INVALID");
  if (containsPrivateEventMaterial(publicPayload)) fail("V124_WORLD_EXECUTION_PRIVATE_EVENT_MATERIAL_FORBIDDEN");
  return freeze({
    schema: "receiz.world-execution-event.v124" as const,
    worldId: text(record.worldId, "V124_WORLD_EXECUTION_EVENT_INVALID"),
    transactionId: text(record.transactionId, "V124_WORLD_EXECUTION_EVENT_INVALID"),
    ordinal: safeInteger(record.ordinal, "V124_WORLD_EXECUTION_EVENT_INVALID"),
    priorWorldHead: digest(record.priorWorldHead, "V124_WORLD_EXECUTION_EVENT_INVALID"),
    acceptedWorldHead: digest(record.acceptedWorldHead, "V124_WORLD_EXECUTION_EVENT_INVALID"),
    actorSubjectId: text(record.actorSubjectId, "V124_WORLD_EXECUTION_EVENT_INVALID"),
    kind: text(record.kind, "V124_WORLD_EXECUTION_EVENT_INVALID"),
    visibilityMode,
    publicPayload,
    privateEnvelopeDigest,
    acceptedAtKai: safeInteger(record.acceptedAtKai, "V124_WORLD_EXECUTION_EVENT_INVALID"),
  });
}

export async function createReceizWorldExecutionEventV124(input: Readonly<{
  worldId: string;
  transactionId: string;
  ordinal: number;
  priorWorldHead: string;
  acceptedWorldHead: string;
  actorSubjectId: string;
  kind: string;
  visibilityMode: "public" | "private" | "invited";
  publicPayload: ReceizWorldJsonObjectV124;
  privateEnvelopeDigest: string | null;
  acceptedAtKai: number;
}>): Promise<ReceizWorldExecutionEventV124> {
  const record = closedRecord(input, ["worldId", "transactionId", "ordinal", "priorWorldHead", "acceptedWorldHead", "actorSubjectId", "kind", "visibilityMode", "publicPayload", "privateEnvelopeDigest", "acceptedAtKai"], "V124_WORLD_EXECUTION_EVENT_INVALID");
  const basis = eventBasis(record);
  return freeze({ ...basis, eventDigest: await digestReceizCanonicalV122(basis) });
}

async function exactEvent(value: unknown): Promise<ReceizWorldExecutionEventV124> {
  const record = closedRecord(value, ["schema", "eventDigest", "worldId", "transactionId", "ordinal", "priorWorldHead", "acceptedWorldHead", "actorSubjectId", "kind", "visibilityMode", "publicPayload", "privateEnvelopeDigest", "acceptedAtKai"], "V124_WORLD_EXECUTION_EVENT_INVALID");
  if (record.schema !== "receiz.world-execution-event.v124") fail("V124_WORLD_EXECUTION_EVENT_INVALID");
  const basis = eventBasis(record);
  const eventDigest = digest(record.eventDigest, "V124_WORLD_EXECUTION_EVENT_INVALID");
  if (eventDigest !== await digestReceizCanonicalV122(basis)) fail("V124_WORLD_EXECUTION_EVENT_INVALID");
  return freeze({ ...basis, eventDigest });
}

async function exactPrivateEnvelope(value: unknown): Promise<ReceizWorldExecutionPrivateEnvelopeV124> {
  const record = closedRecord(value, ["schema", "worldId", "visibilityMode", "ciphertextB64u", "nonceB64u", "aadDigest", "payloadDigest", "recipientWraps", "envelopeDigest", "eventDigest"], "V124_WORLD_EXECUTION_PRIVATE_ENVELOPE_INVALID");
  const eventDigest = digest(record.eventDigest, "V124_WORLD_EXECUTION_PRIVATE_ENVELOPE_INVALID");
  const envelope = {
    schema: record.schema,
    worldId: record.worldId,
    visibilityMode: record.visibilityMode,
    ciphertextB64u: record.ciphertextB64u,
    nonceB64u: record.nonceB64u,
    aadDigest: record.aadDigest,
    payloadDigest: record.payloadDigest,
    recipientWraps: record.recipientWraps,
    envelopeDigest: record.envelopeDigest,
  } as ReceizPrivateWorldEnvelopeV122;
  if (!await validateReceizPrivateWorldEnvelopeV122(envelope)) fail("V124_WORLD_EXECUTION_PRIVATE_ENVELOPE_INVALID");
  try {
    await Promise.all(envelope.recipientWraps.map((wrap) =>
      closeEphemeralPublicKeyJwk(wrap.ephemeralPublicKeyJwk)));
  } catch {
    fail("V124_WORLD_EXECUTION_PRIVATE_ENVELOPE_INVALID");
  }
  return freeze({ ...structuredClone(envelope), eventDigest });
}

async function exactExecutionMembers(input: Readonly<{
  transaction: ReceizWorldTransactionV122;
  events: unknown;
  privateEnvelopes: unknown;
  accessAppends: unknown;
  valueIntents: unknown;
  acceptedWorldHead: unknown;
  acceptedSubjectHeads: unknown;
}>) {
  if (!Array.isArray(input.events) || input.events.length === 0) fail("V124_WORLD_EXECUTION_EVENTS_REQUIRED");
  const events = freeze(await Promise.all(input.events.map(exactEvent)));
  const participants = new Set(Object.keys(input.transaction.participantHeads));
  let prior = input.transaction.expectedWorldHead;
  for (const [index, event] of events.entries()) {
    if (event.ordinal !== index || event.worldId !== input.transaction.worldId
      || event.transactionId !== input.transaction.transactionId || event.priorWorldHead !== prior
      || !participants.has(event.actorSubjectId)) fail("V124_WORLD_EXECUTION_EVENT_BINDING_INVALID");
    prior = event.acceptedWorldHead;
  }
  const acceptedWorldHead = digest(input.acceptedWorldHead, "V124_WORLD_EXECUTION_ACCEPTED_HEAD_INVALID");
  if (prior !== acceptedWorldHead) fail("V124_WORLD_EXECUTION_EVENT_BINDING_INVALID");
  if (!Array.isArray(input.privateEnvelopes)) fail("V124_WORLD_EXECUTION_PRIVATE_ENVELOPES_INVALID");
  const privateEnvelopes = freeze(await Promise.all(input.privateEnvelopes.map(exactPrivateEnvelope)));
  if (privateEnvelopes.some((entry, index) => index > 0 && privateEnvelopes[index - 1]!.envelopeDigest.localeCompare(entry.envelopeDigest) >= 0)) fail("V124_WORLD_EXECUTION_PRIVATE_ENVELOPES_NONCANONICAL");
  const envelopeByDigest = new Map(privateEnvelopes.map((entry) => [entry.envelopeDigest, entry]));
  if (envelopeByDigest.size !== privateEnvelopes.length || events.some((event) => event.privateEnvelopeDigest !== null
    && envelopeByDigest.get(event.privateEnvelopeDigest)?.eventDigest !== event.eventDigest)
    || privateEnvelopes.some((entry) => !events.some((event) => event.eventDigest === entry.eventDigest && event.privateEnvelopeDigest === entry.envelopeDigest))) {
    fail("V124_WORLD_EXECUTION_PRIVATE_ENVELOPE_BINDING_INVALID");
  }
  if (!Array.isArray(input.accessAppends)) fail("V124_WORLD_EXECUTION_ACCESS_APPENDS_INVALID");
  const accessAppends: ReceizWorldAccessAppendV122[] = [];
  for (const value of input.accessAppends) {
    const append = structuredClone(value) as ReceizWorldAccessAppendV122;
    if (!await validateReceizWorldAccessAppendV122(append) || append.worldId !== input.transaction.worldId
      || !participants.has(append.subjectId)
      || !input.transaction.commands.some((command) => command.authorityDigest === append.authorityDigest
        && containsExactBinding(command.command, "accessAppendDigest", append.appendDigest))) {
      fail("V124_WORLD_EXECUTION_ACCESS_APPEND_INVALID");
    }
    accessAppends.push(freeze(append));
  }
  if (accessAppends.some((entry, index) => index > 0 && `${accessAppends[index - 1]!.subjectId}:${accessAppends[index - 1]!.appendDigest}`.localeCompare(`${entry.subjectId}:${entry.appendDigest}`) >= 0)) fail("V124_WORLD_EXECUTION_ACCESS_APPENDS_NONCANONICAL");
  if (!Array.isArray(input.valueIntents)) fail("V124_WORLD_EXECUTION_VALUE_INTENTS_INVALID");
  const valueIntents: ReceizWorldValueIntentV122[] = [];
  for (const value of input.valueIntents) {
    const intent = structuredClone(value) as ReceizWorldValueIntentV122;
    if (!await validateReceizValueIntentV122(intent)
      || !input.transaction.commands.some((command) => containsExactBinding(command.command, "valueIntentDigest", intent.valueIntentDigest))) {
      fail("V124_WORLD_EXECUTION_VALUE_INTENT_INVALID");
    }
    valueIntents.push(freeze(intent));
  }
  if (valueIntents.some((entry, index) => index > 0 && valueIntents[index - 1]!.valueIntentDigest.localeCompare(entry.valueIntentDigest) >= 0)) fail("V124_WORLD_EXECUTION_VALUE_INTENTS_NONCANONICAL");
  const acceptedSubjectHeads = exactHeadMap(input.acceptedSubjectHeads, "V124_WORLD_EXECUTION_ACCEPTED_SUBJECT_HEADS_INVALID");
  if (!sameKeys(input.transaction.participantHeads, acceptedSubjectHeads)) fail("V124_WORLD_EXECUTION_ACCEPTED_SUBJECT_HEADS_INVALID");
  return freeze({ events, privateEnvelopes, accessAppends: freeze(accessAppends), valueIntents: freeze(valueIntents), acceptedWorldHead, acceptedSubjectHeads });
}

function projectionAuthority(value: unknown): ReceizWorldExecutionProjectionV124["authority"] {
  const record = closedRecord(value, ["projectionIsExecutionAuthority", "strongerTruth"], "V124_WORLD_EXECUTION_PROJECTION_AUTHORITY_INVALID");
  if (record.projectionIsExecutionAuthority !== false || record.strongerTruth !== "sealed-receiz-proof-object") fail("V124_WORLD_EXECUTION_PROJECTION_AUTHORITY_INVALID");
  return AUTHORITY;
}

async function projectionBasis(input: Readonly<{
  transaction: ReceizWorldTransactionV122;
  events: unknown;
  privateEnvelopes: unknown;
  accessAppends: unknown;
  valueIntents: unknown;
  receipt: unknown;
  acceptedWorldHead: unknown;
  acceptedSubjectHeads: unknown;
}>) {
  const exact = await exactTransaction(input.transaction);
  const members = await exactExecutionMembers({ ...input, transaction: exact.transaction });
  const receipt = canonicalWorldExecutionReceipt(input.receipt);
  return freeze({
    schema: "receiz.world-execution-projection.v124" as const,
    worldId: exact.transaction.worldId,
    transactionId: exact.transaction.transactionId,
    idempotencyIdentityDigest: await createReceizWorldIdempotencyDigestV122(exact.transaction.worldId, exact.transaction.idempotencyKey),
    transactionDigest: exact.transaction.transactionDigest,
    expectedWorldHead: exact.transaction.expectedWorldHead,
    currentHeads: exact.transaction.participantHeads,
    transaction: exact.transaction,
    events: members.events,
    privateEnvelopes: members.privateEnvelopes,
    accessAppends: members.accessAppends,
    valueIntents: members.valueIntents,
    receipt,
    receiptDigest: await digestReceizCanonicalV122(receipt),
    acceptedWorldHead: members.acceptedWorldHead,
    acceptedSubjectHeads: members.acceptedSubjectHeads,
    registryDigest: exact.transaction.registryDigest,
    reducerDigest: exact.transaction.reducerDigest,
    commandCategories: exact.commandCategories,
    authority: AUTHORITY,
  });
}

export async function planReceizWorldExecutionProjectionV124(
  input: ReceizWorldExecutionProjectionInputV124,
): Promise<ReceizWorldExecutionProjectionV124> {
  const record = closedRecord(input, ["transaction", "events", "privateEnvelopes", "accessAppends", "valueIntents", "receipt", "acceptedWorldHead", "acceptedSubjectHeads"], "V124_WORLD_EXECUTION_PROJECTION_INPUT_INVALID");
  const basis = await projectionBasis(record as unknown as ReceizWorldExecutionProjectionInputV124);
  return freeze({ ...basis, projectionDigest: await digestReceizCanonicalV122(basis) });
}

export async function validateReceizWorldExecutionProjectionV124(
  value: unknown,
): Promise<ReceizWorldExecutionProjectionV124> {
  const record = closedRecord(value, ["schema", "worldId", "transactionId", "idempotencyIdentityDigest", "transactionDigest", "expectedWorldHead", "currentHeads", "transaction", "events", "privateEnvelopes", "accessAppends", "valueIntents", "receipt", "receiptDigest", "acceptedWorldHead", "acceptedSubjectHeads", "registryDigest", "reducerDigest", "commandCategories", "projectionDigest", "authority"], "V124_WORLD_EXECUTION_PROJECTION_INVALID");
  if (record.schema !== "receiz.world-execution-projection.v124") fail("V124_WORLD_EXECUTION_PROJECTION_INVALID");
  const basis = await projectionBasis({
    transaction: record.transaction as ReceizWorldTransactionV122,
    events: record.events,
    privateEnvelopes: record.privateEnvelopes,
    accessAppends: record.accessAppends,
    valueIntents: record.valueIntents,
    receipt: record.receipt,
    acceptedWorldHead: record.acceptedWorldHead,
    acceptedSubjectHeads: record.acceptedSubjectHeads,
  });
  if (record.worldId !== basis.worldId || record.transactionId !== basis.transactionId
    || record.idempotencyIdentityDigest !== basis.idempotencyIdentityDigest
    || record.transactionDigest !== basis.transactionDigest || record.expectedWorldHead !== basis.expectedWorldHead
    || !sameHeadMap(exactHeadMap(record.currentHeads, "V124_WORLD_EXECUTION_CURRENT_HEADS_INVALID"), basis.currentHeads)
    || record.receiptDigest !== basis.receiptDigest || record.registryDigest !== basis.registryDigest
    || record.reducerDigest !== basis.reducerDigest
    || canonicalizeReceizV122(record.commandCategories) !== canonicalizeReceizV122(basis.commandCategories)
    || projectionAuthority(record.authority) !== AUTHORITY) fail("V124_WORLD_EXECUTION_PROJECTION_BINDING_INVALID");
  const projectionDigest = digest(record.projectionDigest, "V124_WORLD_EXECUTION_PROJECTION_DIGEST_INVALID");
  if (projectionDigest !== await digestReceizCanonicalV122(basis)) fail("V124_WORLD_EXECUTION_PROJECTION_DIGEST_INVALID");
  return freeze({ ...basis, projectionDigest });
}

export const planReceizWorldCompositeOperationV124 = planReceizWorldExecutionProjectionV124;
export const validateReceizWorldCompositeOperationV124 = validateReceizWorldExecutionProjectionV124;
export type ReceizWorldCompositeOperationV124 = ReceizWorldExecutionProjectionV124;

function exactMultiMemberRecord(
  value: unknown,
  index: number,
  previousWorldId: string | null,
): Readonly<{ execution: unknown }> {
  const record = closedRecord(
    value,
    ["ordinal", "worldId", "expectedWorldHead", "execution"],
    "V124_MULTI_WORLD_EXECUTION_MEMBER_INVALID",
  );
  const ordinal = safeInteger(record.ordinal, "V124_MULTI_WORLD_EXECUTION_MEMBER_INVALID");
  const worldId = text(record.worldId, "V124_MULTI_WORLD_EXECUTION_MEMBER_INVALID");
  digest(record.expectedWorldHead, "V124_MULTI_WORLD_EXECUTION_MEMBER_INVALID");
  if (ordinal !== index || (previousWorldId !== null && previousWorldId.localeCompare(worldId) >= 0)) {
    fail("V124_MULTI_WORLD_EXECUTION_MEMBER_INVALID");
  }
  return freeze({ execution: record.execution });
}

async function multiWorldProjectionBasis(input: Readonly<{
  worlds: unknown;
  idempotencyKey: unknown;
  receipt: unknown;
}>) {
  if (!Array.isArray(input.worlds) || input.worlds.length < 2) {
    fail("V124_MULTI_WORLD_EXECUTION_WORLDS_INVALID");
  }
  const executions = await Promise.all(input.worlds.map(validateReceizWorldExecutionProjectionV124));
  executions.sort((left, right) => left.worldId.localeCompare(right.worldId));
  if (executions.some((entry, index) => index > 0 && executions[index - 1]!.worldId === entry.worldId)) {
    fail("V124_MULTI_WORLD_EXECUTION_WORLDS_INVALID");
  }
  const registryDigest = executions[0]!.registryDigest;
  const reducerDigest = executions[0]!.reducerDigest;
  if (executions.some((execution) => execution.registryDigest !== registryDigest
    || execution.reducerDigest !== reducerDigest)) {
    fail("V124_MULTI_WORLD_EXECUTION_REGISTRY_REDUCER_MISMATCH");
  }
  const idempotencyKey = text(input.idempotencyKey, "V124_MULTI_WORLD_EXECUTION_IDEMPOTENCY_INVALID");
  let transaction: ReceizMultiWorldTransactionV122;
  try {
    transaction = await planReceizMultiWorldTransactionV122({
      worlds: executions.map((execution) => ({
        worldId: execution.worldId,
        expectedWorldHead: execution.expectedWorldHead,
        transaction: execution.transaction,
      })),
      idempotencyKey,
    });
  } catch {
    return fail("V124_MULTI_WORLD_EXECUTION_TRANSACTION_INVALID");
  }

  const initialHeads = new Map<string, string>();
  const simulatedHeads = new Map<string, string>();
  const worldIds = new Set(executions.map((execution) => execution.worldId));
  for (const execution of executions) {
    for (const [subjectId, expectedHead] of Object.entries(execution.currentHeads)) {
      if (worldIds.has(subjectId)) fail("V124_MULTI_WORLD_EXECUTION_PARTICIPANT_COLLISION");
      const simulated = simulatedHeads.get(subjectId);
      if (simulated === undefined) initialHeads.set(subjectId, expectedHead);
      else if (simulated !== expectedHead) fail("V124_MULTI_WORLD_EXECUTION_SUBJECT_CHAIN_INVALID");
      const acceptedHead = execution.acceptedSubjectHeads[subjectId];
      if (acceptedHead === undefined) fail("V124_MULTI_WORLD_EXECUTION_SUBJECT_CHAIN_INVALID");
      simulatedHeads.set(subjectId, acceptedHead);
    }
  }
  const currentHeads = exactHeadMap(
    Object.fromEntries([...initialHeads.entries()].sort(([left], [right]) => left.localeCompare(right))),
    "V124_MULTI_WORLD_EXECUTION_CURRENT_HEADS_INVALID",
  );
  const worlds = freeze(executions.map((execution, ordinal) => freeze({
    ordinal,
    worldId: execution.worldId,
    expectedWorldHead: execution.expectedWorldHead,
    execution,
  })));
  const receipt = canonicalJsonObject(input.receipt, "V124_MULTI_WORLD_EXECUTION_RECEIPT_INVALID");
  const commandCategories: readonly ReceizWorldCompositeCommandCategoryV124[] = freeze(
    [...new Set(executions.flatMap((execution) => execution.commandCategories))].sort(),
  );
  return freeze({
    schema: "receiz.multi-world-execution-projection.v124" as const,
    multiWorldTransactionId: transaction.multiWorldTransactionId,
    idempotencyIdentityDigest: await digestReceizCanonicalV122({
      schema: "receiz.multi-world-execution-idempotency.v124",
      multiWorldTransactionId: transaction.multiWorldTransactionId,
      idempotencyKey: transaction.idempotencyKey,
    }),
    multiWorldDigest: transaction.multiWorldDigest,
    currentHeads,
    transaction,
    worlds,
    receipt,
    receiptDigest: await digestReceizCanonicalV122(receipt),
    registryDigest,
    reducerDigest,
    commandCategories,
    authority: AUTHORITY,
  });
}

export async function planReceizMultiWorldExecutionProjectionV124(
  input: ReceizMultiWorldExecutionProjectionInputV124,
): Promise<ReceizMultiWorldExecutionProjectionV124> {
  const record = closedRecord(
    input,
    ["worlds", "idempotencyKey", "receipt"],
    "V124_MULTI_WORLD_EXECUTION_PROJECTION_INPUT_INVALID",
  );
  const basis = await multiWorldProjectionBasis({
    worlds: record.worlds,
    idempotencyKey: record.idempotencyKey,
    receipt: record.receipt,
  });
  return freeze({ ...basis, projectionDigest: await digestReceizCanonicalV122(basis) });
}

export async function validateReceizMultiWorldExecutionProjectionV124(
  value: unknown,
): Promise<ReceizMultiWorldExecutionProjectionV124> {
  const record = closedRecord(
    value,
    ["schema", "multiWorldTransactionId", "idempotencyIdentityDigest", "multiWorldDigest", "currentHeads", "transaction", "worlds", "receipt", "receiptDigest", "registryDigest", "reducerDigest", "commandCategories", "projectionDigest", "authority"],
    "V124_MULTI_WORLD_EXECUTION_PROJECTION_INVALID",
  );
  if (record.schema !== "receiz.multi-world-execution-projection.v124"
    || !Array.isArray(record.worlds)
    || record.transaction === null
    || typeof record.transaction !== "object"
    || Array.isArray(record.transaction)) {
    fail("V124_MULTI_WORLD_EXECUTION_PROJECTION_INVALID");
  }
  const memberExecutions: unknown[] = [];
  let previousWorldId: string | null = null;
  for (const [index, value] of record.worlds.entries()) {
    const member = exactMultiMemberRecord(value, index, previousWorldId);
    previousWorldId = (value as { worldId: string }).worldId;
    memberExecutions.push(member.execution);
  }
  const carriedTransaction = record.transaction as ReceizMultiWorldTransactionV122;
  if (carriedTransaction.schema !== "receiz.multi-world-transaction.v122") {
    fail("V124_MULTI_WORLD_EXECUTION_TRANSACTION_INVALID");
  }
  const basis = await multiWorldProjectionBasis({
    worlds: memberExecutions,
    idempotencyKey: carriedTransaction.idempotencyKey,
    receipt: record.receipt,
  });
  if (canonicalizeReceizV122(record.transaction) !== canonicalizeReceizV122(basis.transaction)) {
    fail("V124_MULTI_WORLD_EXECUTION_TRANSACTION_INVALID");
  }
  if (record.multiWorldTransactionId !== basis.multiWorldTransactionId
    || record.idempotencyIdentityDigest !== basis.idempotencyIdentityDigest
    || record.multiWorldDigest !== basis.multiWorldDigest
    || canonicalizeReceizV122(record.worlds) !== canonicalizeReceizV122(basis.worlds)
    || !sameHeadMap(exactHeadMap(record.currentHeads, "V124_MULTI_WORLD_EXECUTION_CURRENT_HEADS_INVALID"), basis.currentHeads)
    || record.receiptDigest !== basis.receiptDigest
    || record.registryDigest !== basis.registryDigest
    || record.reducerDigest !== basis.reducerDigest
    || canonicalizeReceizV122(record.commandCategories) !== canonicalizeReceizV122(basis.commandCategories)
    || projectionAuthority(record.authority) !== AUTHORITY) {
    fail("V124_MULTI_WORLD_EXECUTION_PROJECTION_BINDING_INVALID");
  }
  const projectionDigest = digest(record.projectionDigest, "V124_MULTI_WORLD_EXECUTION_PROJECTION_DIGEST_INVALID");
  if (projectionDigest !== await digestReceizCanonicalV122(basis)) {
    fail("V124_MULTI_WORLD_EXECUTION_PROJECTION_DIGEST_INVALID");
  }
  return freeze({ ...basis, projectionDigest });
}

export const planReceizMultiWorldCompositeOperationV124 = planReceizMultiWorldExecutionProjectionV124;
export const validateReceizMultiWorldCompositeOperationV124 = validateReceizMultiWorldExecutionProjectionV124;
export type ReceizMultiWorldCompositeOperationV124 = ReceizMultiWorldExecutionProjectionV124;
