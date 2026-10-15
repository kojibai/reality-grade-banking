import { digestReceizCanonicalV122 } from "./v122Canonical.js";

export const RECEIZ_CONVERSATION_NAMESPACE_V1 = "receiz.chat.conversation.v1" as const;

const SHA256_RE = /^[0-9a-f]{64}$/;
const EVENT_ID_RE = /^receiz:chat-event:[0-9a-f]{64}$/;

export type ReceizConversationParticipantBindingV1 = Readonly<{
  receizId: string;
  subjectId: string;
  subjectHead: string;
  accessKeyHead: string;
  bindingDigest: string;
}>;

export type ReceizConversationEffectV1 =
  | Readonly<{ kind: "genesis"; creator: ReceizConversationParticipantBindingV1; legacyReceiptDigest: string | null }>
  | Readonly<{ kind: "invite"; invitationId: string; recipientReceizId: string; role: "admin" | "member" }>
  | Readonly<{ kind: "accept"; invitationId: string; recipient: ReceizConversationParticipantBindingV1 }>
  | Readonly<{ kind: "role"; recipientReceizId: string; role: "admin" | "member" }>
  | Readonly<{ kind: "leave"; recipientReceizId: string }>
  | Readonly<{ kind: "revoke"; recipientReceizId: string }>
  | Readonly<{ kind: "epoch"; epoch: number; grantSetDigest: string }>
  | Readonly<{
    kind: "message";
    messageId: string;
    senderReceizId: string;
    epoch: number;
    receiptDigest: string;
    originalPayloadDigest: string;
    privateEnvelopeDigest: string;
  }>;

export type ReceizConversationEventV1 = Readonly<{
  schema: "receiz.chat.conversation-event.v1";
  eventId: string;
  conversationId: string;
  predecessorEventIds: readonly string[];
  actorReceizId: string;
  kaiUPulse: number;
  effect: ReceizConversationEffectV1;
  eventDigest: string;
}>;

export type ReceizConversationProjectionV1 = Readonly<{
  conversationId: string;
  invitations: readonly Readonly<{
    invitationId: string;
    recipientReceizId: string;
    role: "admin" | "member";
    state: "invited" | "accepted";
  }>[];
  members: readonly Readonly<{
    binding: ReceizConversationParticipantBindingV1;
    role: "owner" | "admin" | "member";
    state: "active" | "left" | "revoked";
  }>[];
  activeEpoch: number;
  messages: readonly Readonly<{
    messageId: string;
    senderReceizId: string;
    epoch: number;
    receiptDigest: string;
    originalPayloadDigest: string;
    privateEnvelopeDigest: string;
  }>[];
  appliedEventIds: readonly string[];
  headEventIds: readonly string[];
  projectionDigest: string;
  authority: Readonly<{
    projectionIsProofAuthority: false;
    strongerTruth: "sealed-receiz-proof-object";
  }>;
}>;

export const RECEIZ_CONVERSATION_NAMESPACE_V2 = "receiz.chat.conversation.v2" as const;
export type ReceizConversationEffectV2 = ReceizConversationEffectV1 | Readonly<{
  kind: "close"; observedFrontierEventIds: readonly string[];
}>;
export type ReceizConversationEventV2 = Readonly<Omit<ReceizConversationEventV1, "schema" | "effect"> & {
  schema: "receiz.chat.conversation-event.v2"; effect: ReceizConversationEffectV2;
}>;
export type ReceizConversationClosureV2 = Readonly<{
  eventId: string; actorReceizId: string; observedFrontierEventIds: readonly string[]; kaiUPulse: number;
}>;
export type ReceizConversationProjectionV2 = ReceizConversationProjectionV1 & Readonly<{
  closures?: readonly ReceizConversationClosureV2[];
}>;
type ConversationEvent = ReceizConversationEventV1 | ReceizConversationEventV2;

type ConversationEventInput = Omit<
  ReceizConversationEventV1,
  "schema" | "eventId" | "eventDigest"
>;

function fail(code: string): never {
  throw new TypeError(code);
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function closedRecord(
  value: unknown,
  keys: readonly string[],
  code: string,
): Record<string, unknown> {
  if (!isPlainRecord(value)) fail(code);
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    fail(code);
  }
  return value;
}

function text(value: unknown, code: string): string {
  if (typeof value !== "string" || value.length === 0 || value !== value.trim() || value.length > 512) {
    fail(code);
  }
  return value;
}

function digest(value: unknown, code: string): string {
  if (typeof value !== "string" || !SHA256_RE.test(value)) fail(code);
  return value;
}

function uint(value: unknown, code: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) fail(code);
  return value as number;
}

function role(value: unknown, code: string): "admin" | "member" {
  if (value !== "admin" && value !== "member") fail(code);
  return value;
}

export async function parseReceizConversationParticipantBindingV1(
  value: unknown,
): Promise<ReceizConversationParticipantBindingV1> {
  const code = "RECEIZ_CONVERSATION_PARTICIPANT_BINDING_INVALID";
  const record = closedRecord(
    value,
    ["receizId", "subjectId", "subjectHead", "accessKeyHead", "bindingDigest"],
    code,
  );
  const basis = Object.freeze({
    receizId: text(record.receizId, code),
    subjectId: text(record.subjectId, code),
    subjectHead: digest(record.subjectHead, code),
    accessKeyHead: digest(record.accessKeyHead, code),
  });
  const bindingDigest = digest(record.bindingDigest, code);
  if (bindingDigest !== await digestReceizCanonicalV122(basis)) fail(code);
  return Object.freeze({ ...basis, bindingDigest });
}

async function parseEffect(value: unknown): Promise<ReceizConversationEffectV1> {
  const code = "RECEIZ_CONVERSATION_EFFECT_INVALID";
  if (!isPlainRecord(value) || typeof value.kind !== "string") fail(code);
  switch (value.kind) {
    case "genesis": {
      const record = closedRecord(value, ["kind", "creator", "legacyReceiptDigest"], code);
      const legacyReceiptDigest = record.legacyReceiptDigest === null
        ? null
        : digest(record.legacyReceiptDigest, code);
      return Object.freeze({
        kind: "genesis" as const,
        creator: await parseReceizConversationParticipantBindingV1(record.creator),
        legacyReceiptDigest,
      });
    }
    case "invite": {
      const record = closedRecord(value, ["kind", "invitationId", "recipientReceizId", "role"], code);
      return Object.freeze({
        kind: "invite" as const,
        invitationId: text(record.invitationId, code),
        recipientReceizId: text(record.recipientReceizId, code),
        role: role(record.role, code),
      });
    }
    case "accept": {
      const record = closedRecord(value, ["kind", "invitationId", "recipient"], code);
      return Object.freeze({
        kind: "accept" as const,
        invitationId: text(record.invitationId, code),
        recipient: await parseReceizConversationParticipantBindingV1(record.recipient),
      });
    }
    case "role": {
      const record = closedRecord(value, ["kind", "recipientReceizId", "role"], code);
      return Object.freeze({
        kind: "role" as const,
        recipientReceizId: text(record.recipientReceizId, code),
        role: role(record.role, code),
      });
    }
    case "leave":
    case "revoke": {
      const record = closedRecord(value, ["kind", "recipientReceizId"], code);
      return Object.freeze({
        kind: value.kind,
        recipientReceizId: text(record.recipientReceizId, code),
      });
    }
    case "epoch": {
      const record = closedRecord(value, ["kind", "epoch", "grantSetDigest"], code);
      return Object.freeze({
        kind: "epoch" as const,
        epoch: uint(record.epoch, code),
        grantSetDigest: digest(record.grantSetDigest, code),
      });
    }
    case "message": {
      const record = closedRecord(
        value,
        ["kind", "messageId", "senderReceizId", "epoch", "receiptDigest", "originalPayloadDigest", "privateEnvelopeDigest"],
        code,
      );
      return Object.freeze({
        kind: "message" as const,
        messageId: text(record.messageId, code),
        senderReceizId: text(record.senderReceizId, code),
        epoch: uint(record.epoch, code),
        receiptDigest: digest(record.receiptDigest, code),
        originalPayloadDigest: digest(record.originalPayloadDigest, code),
        privateEnvelopeDigest: digest(record.privateEnvelopeDigest, code),
      });
    }
    default:
      return fail(code);
  }
}

async function parseEventBasis(value: unknown): Promise<Readonly<{
  schema: "receiz.chat.conversation-event.v1";
  conversationId: string;
  predecessorEventIds: readonly string[];
  actorReceizId: string;
  kaiUPulse: number;
  effect: ReceizConversationEffectV1;
}>> {
  const code = "RECEIZ_CONVERSATION_EVENT_INVALID";
  const record = closedRecord(
    value,
    ["schema", "conversationId", "predecessorEventIds", "actorReceizId", "kaiUPulse", "effect"],
    code,
  );
  if (record.schema !== "receiz.chat.conversation-event.v1" || !Array.isArray(record.predecessorEventIds)) {
    fail(code);
  }
  const predecessorEventIds = record.predecessorEventIds.map((entry) => {
    if (typeof entry !== "string" || !EVENT_ID_RE.test(entry)) fail(code);
    return entry;
  });
  if (new Set(predecessorEventIds).size !== predecessorEventIds.length) fail(code);
  predecessorEventIds.sort();
  return Object.freeze({
    schema: "receiz.chat.conversation-event.v1" as const,
    conversationId: text(record.conversationId, code),
    predecessorEventIds: Object.freeze(predecessorEventIds),
    actorReceizId: text(record.actorReceizId, code),
    kaiUPulse: uint(record.kaiUPulse, code),
    effect: await parseEffect(record.effect),
  });
}

export async function createReceizConversationEventV1(
  input: ConversationEventInput,
): Promise<ReceizConversationEventV1> {
  const basis = await parseEventBasis({
    schema: "receiz.chat.conversation-event.v1",
    conversationId: input.conversationId,
    predecessorEventIds: input.predecessorEventIds,
    actorReceizId: input.actorReceizId,
    kaiUPulse: input.kaiUPulse,
    effect: input.effect,
  });
  const eventDigest = await digestReceizCanonicalV122(basis);
  return Object.freeze({
    ...basis,
    eventId: `receiz:chat-event:${eventDigest}`,
    eventDigest,
  });
}

export async function parseReceizConversationEventV1(
  value: unknown,
): Promise<ReceizConversationEventV1> {
  const record = closedRecord(
    value,
    ["schema", "eventId", "conversationId", "predecessorEventIds", "actorReceizId", "kaiUPulse", "effect", "eventDigest"],
    "RECEIZ_CONVERSATION_EVENT_CLOSED_SHAPE_INVALID",
  );
  const basis = await parseEventBasis({
    schema: record.schema,
    conversationId: record.conversationId,
    predecessorEventIds: record.predecessorEventIds,
    actorReceizId: record.actorReceizId,
    kaiUPulse: record.kaiUPulse,
    effect: record.effect,
  });
  const eventDigest = digest(record.eventDigest, "RECEIZ_CONVERSATION_EVENT_DIGEST_INVALID");
  if (eventDigest !== await digestReceizCanonicalV122(basis)) {
    fail("RECEIZ_CONVERSATION_EVENT_DIGEST_INVALID");
  }
  if (record.eventId !== `receiz:chat-event:${eventDigest}`) {
    fail("RECEIZ_CONVERSATION_EVENT_ID_INVALID");
  }
  return Object.freeze({ ...basis, eventId: record.eventId, eventDigest });
}

async function parseV2Basis(value: unknown) {
  const code = "RECEIZ_CONVERSATION_EFFECT_INVALID";
  const record = closedRecord(value, ["schema", "conversationId", "predecessorEventIds", "actorReceizId", "kaiUPulse", "effect"], "RECEIZ_CONVERSATION_EVENT_INVALID");
  if (record.schema !== "receiz.chat.conversation-event.v2") fail("RECEIZ_CONVERSATION_EVENT_INVALID");
  let effect: ReceizConversationEffectV2;
  if (isPlainRecord(record.effect) && record.effect.kind === "close") {
    const close = closedRecord(record.effect, ["kind", "observedFrontierEventIds"], code);
    if (!Array.isArray(close.observedFrontierEventIds) || !close.observedFrontierEventIds.length
      || close.observedFrontierEventIds.some((id) => typeof id !== "string" || !EVENT_ID_RE.test(id))
      || new Set(close.observedFrontierEventIds).size !== close.observedFrontierEventIds.length) fail(code);
    effect = Object.freeze({ kind: "close", observedFrontierEventIds: Object.freeze([...close.observedFrontierEventIds].sort()) });
  } else effect = await parseEffect(record.effect);
  // The existing common-field parser remains closed and its V1 effect semantics stay unchanged.
  const common = await parseEventBasis({ ...record, schema: "receiz.chat.conversation-event.v1",
    effect: { kind: "leave", recipientReceizId: record.actorReceizId } });
  return Object.freeze({ ...common, schema: "receiz.chat.conversation-event.v2" as const, effect });
}

export async function createReceizConversationEventV2(
  input: Omit<ReceizConversationEventV2, "schema" | "eventId" | "eventDigest">,
): Promise<ReceizConversationEventV2> {
  const basis = await parseV2Basis({ schema: "receiz.chat.conversation-event.v2", conversationId: input.conversationId,
    predecessorEventIds: input.predecessorEventIds, actorReceizId: input.actorReceizId, kaiUPulse: input.kaiUPulse, effect: input.effect });
  const eventDigest = await digestReceizCanonicalV122(basis);
  return Object.freeze({ ...basis, eventId: `receiz:chat-event:${eventDigest}`, eventDigest });
}

export async function parseReceizConversationEventV2(value: unknown): Promise<ReceizConversationEventV2> {
  const record = closedRecord(value, ["schema", "eventId", "conversationId", "predecessorEventIds", "actorReceizId", "kaiUPulse", "effect", "eventDigest"], "RECEIZ_CONVERSATION_EVENT_CLOSED_SHAPE_INVALID");
  const { eventId, eventDigest, ...input } = record;
  const basis = await parseV2Basis(input);
  if (digest(eventDigest, "RECEIZ_CONVERSATION_EVENT_DIGEST_INVALID") !== await digestReceizCanonicalV122(basis)) fail("RECEIZ_CONVERSATION_EVENT_DIGEST_INVALID");
  if (eventId !== `receiz:chat-event:${eventDigest}`) fail("RECEIZ_CONVERSATION_EVENT_ID_INVALID");
  return Object.freeze({ ...basis, eventId: eventId as string, eventDigest: eventDigest as string });
}

type MutableMember = {
  binding: ReceizConversationParticipantBindingV1;
  role: "owner" | "admin" | "member";
  state: "active" | "left" | "revoked";
  stateEventId: string;
};

function authorizedAdministrator(
  members: ReadonlyMap<string, MutableMember>,
  actorReceizId: string,
  causalAncestors: ReadonlySet<string>,
): MutableMember {
  const actor = members.get(actorReceizId);
  if (!actor
    || !causalAncestors.has(actor.stateEventId)
    || actor.state !== "active"
    || (actor.role !== "owner" && actor.role !== "admin")) {
    fail("RECEIZ_CONVERSATION_ACTOR_UNAUTHORIZED");
  }
  return actor;
}

function topologicalEvents(events: readonly ConversationEvent[]): readonly ConversationEvent[] {
  const byId = new Map(events.map((event) => [event.eventId, event]));
  const childCount = new Map<string, number>(events.map((event) => [event.eventId, 0]));
  const pendingParents = new Map<string, number>();
  const children = new Map<string, string[]>();
  for (const event of events) {
    pendingParents.set(event.eventId, event.predecessorEventIds.length);
    for (const predecessorId of event.predecessorEventIds) {
      if (!byId.has(predecessorId)) fail("RECEIZ_CONVERSATION_PREDECESSOR_REQUIRED");
      childCount.set(predecessorId, (childCount.get(predecessorId) ?? 0) + 1);
      const list = children.get(predecessorId) ?? [];
      list.push(event.eventId);
      children.set(predecessorId, list);
    }
  }
  const ready = events
    .filter((event) => event.predecessorEventIds.length === 0)
    .map((event) => event.eventId)
    .sort();
  const ordered: ConversationEvent[] = [];
  while (ready.length > 0) {
    const eventId = ready.shift()!;
    ordered.push(byId.get(eventId)!);
    for (const childId of (children.get(eventId) ?? []).sort()) {
      const remaining = (pendingParents.get(childId) ?? 0) - 1;
      pendingParents.set(childId, remaining);
      if (remaining === 0) {
        ready.push(childId);
        ready.sort();
      }
    }
  }
  if (ordered.length !== events.length) fail("RECEIZ_CONVERSATION_EVENT_CYCLE");
  return Object.freeze(ordered);
}

export async function reduceReceizConversationEventsV1(values: readonly ReceizConversationEventV1[]): Promise<ReceizConversationProjectionV1> {
  return reduceConversationEvents(values, parseReceizConversationEventV1, "receiz.chat.conversation-projection.v1");
}
export async function reduceReceizConversationEventsV2(values: readonly ReceizConversationEventV2[]): Promise<ReceizConversationProjectionV2> {
  return reduceConversationEvents(values, parseReceizConversationEventV2, "receiz.chat.conversation-projection.v2");
}

async function reduceConversationEvents(
  values: readonly ConversationEvent[], parseEvent: (value: unknown) => Promise<ConversationEvent>,
  projectionSchema: "receiz.chat.conversation-projection.v1" | "receiz.chat.conversation-projection.v2",
): Promise<ReceizConversationProjectionV2> {
  if (!Array.isArray(values) || values.length === 0) fail("RECEIZ_CONVERSATION_GENESIS_REQUIRED");
  const byId = new Map<string, ConversationEvent>();
  for (const value of values) {
    const event = await parseEvent(value);
    const prior = byId.get(event.eventId);
    if (prior && prior.eventDigest !== event.eventDigest) fail("RECEIZ_CONVERSATION_EVENT_CONFLICT");
    byId.set(event.eventId, event);
  }
  const events = topologicalEvents([...byId.values()]);
  const conversationId = events[0]!.conversationId;
  if (events.some((event) => event.conversationId !== conversationId)) {
    fail("RECEIZ_CONVERSATION_IDENTITY_MISMATCH");
  }

  const roots = events.filter((event) => event.predecessorEventIds.length === 0);
  if (roots.length !== 1 || roots[0]!.effect.kind !== "genesis") {
    fail("RECEIZ_CONVERSATION_GENESIS_INVALID");
  }
  const members = new Map<string, MutableMember>();
  const invitations = new Map<string, {
    recipientReceizId: string;
    role: "admin" | "member";
    state: "invited" | "accepted";
    eventId: string;
  }>();
  const messages: ReceizConversationProjectionV1["messages"][number][] = [];
  const messageIds = new Set<string>();
  const closures: ReceizConversationClosureV2[] = [];
  let activeEpoch = 0;
  const ancestorsByEventId = new Map<string, ReadonlySet<string>>();
  for (const event of events) {
    const ancestors = new Set<string>();
    for (const predecessorEventId of event.predecessorEventIds) {
      ancestors.add(predecessorEventId);
      for (const ancestor of ancestorsByEventId.get(predecessorEventId) ?? []) ancestors.add(ancestor);
    }
    ancestorsByEventId.set(event.eventId, ancestors);
  }

  for (const [index, event] of events.entries()) {
    const effect = event.effect;
    const causalAncestors = ancestorsByEventId.get(event.eventId)!;
    if (effect.kind === "genesis") {
      if (index !== 0 || event.actorReceizId !== effect.creator.receizId) {
        fail("RECEIZ_CONVERSATION_GENESIS_INVALID");
      }
      members.set(effect.creator.receizId, {
        binding: effect.creator,
        role: "owner",
        state: "active",
        stateEventId: event.eventId,
      });
      continue;
    }
    if (event.predecessorEventIds.length === 0) fail("RECEIZ_CONVERSATION_PREDECESSOR_REQUIRED");
    if (closures.some((closure) => causalAncestors.has(closure.eventId))) fail("RECEIZ_CONVERSATION_CLOSED");
    switch (effect.kind) {
      case "close": {
        const actor = authorizedAdministrator(members, event.actorReceizId, causalAncestors);
        if (actor.role !== "owner") fail("RECEIZ_CONVERSATION_OWNER_REQUIRED");
        if (effect.observedFrontierEventIds.join(",") !== event.predecessorEventIds.join(",")
          || event.predecessorEventIds.some((parent) => event.predecessorEventIds.some((other) => parent !== other && ancestorsByEventId.get(other)!.has(parent)))) {
          fail("RECEIZ_CONVERSATION_CLOSURE_FRONTIER_MISMATCH");
        }
        closures.push(Object.freeze({ eventId: event.eventId, actorReceizId: event.actorReceizId,
          observedFrontierEventIds: effect.observedFrontierEventIds, kaiUPulse: event.kaiUPulse }));
        break;
      }
      case "invite": {
        authorizedAdministrator(members, event.actorReceizId, causalAncestors);
        if (invitations.has(effect.invitationId)) fail("RECEIZ_CONVERSATION_INVITATION_CONFLICT");
        const current = members.get(effect.recipientReceizId);
        if (current?.state === "active") {
          fail("RECEIZ_CONVERSATION_PARTICIPANT_ALREADY_ADMITTED");
        }
        invitations.set(effect.invitationId, {
          recipientReceizId: effect.recipientReceizId,
          role: effect.role,
          state: "invited",
          eventId: event.eventId,
        });
        break;
      }
      case "accept": {
        const invitation = invitations.get(effect.invitationId);
        if (event.actorReceizId !== effect.recipient.receizId
          || invitation?.recipientReceizId !== effect.recipient.receizId
          || !causalAncestors.has(invitation.eventId)) {
          fail("RECEIZ_CONVERSATION_INVITATION_REQUIRED");
        }
        const member = members.get(effect.recipient.receizId);
        if (member?.state === "active" || invitation.state !== "invited") {
          fail("RECEIZ_CONVERSATION_INVITATION_REQUIRED");
        }
        invitation.state = "accepted";
        members.set(effect.recipient.receizId, {
          binding: effect.recipient,
          role: invitation.role,
          state: "active",
          stateEventId: event.eventId,
        });
        break;
      }
      case "role": {
        const actor = authorizedAdministrator(members, event.actorReceizId, causalAncestors);
        if (actor.role !== "owner") fail("RECEIZ_CONVERSATION_OWNER_REQUIRED");
        const member = members.get(effect.recipientReceizId);
        if (!member || !causalAncestors.has(member.stateEventId) || member.state !== "active" || member.role === "owner") {
          fail("RECEIZ_CONVERSATION_ROLE_TARGET_INVALID");
        }
        member.role = effect.role;
        member.stateEventId = event.eventId;
        break;
      }
      case "leave": {
        if (event.actorReceizId !== effect.recipientReceizId) fail("RECEIZ_CONVERSATION_ACTOR_UNAUTHORIZED");
        const member = members.get(effect.recipientReceizId);
        if (!member || !causalAncestors.has(member.stateEventId) || member.state !== "active" || member.role === "owner") {
          fail("RECEIZ_CONVERSATION_LEAVE_INVALID");
        }
        member.state = "left";
        member.stateEventId = event.eventId;
        break;
      }
      case "revoke": {
        const actor = authorizedAdministrator(members, event.actorReceizId, causalAncestors);
        const member = members.get(effect.recipientReceizId);
        if (!member || !causalAncestors.has(member.stateEventId) || member.state === "revoked" || member.role === "owner"
          || (actor.role === "admin" && member.role !== "member")) {
          fail("RECEIZ_CONVERSATION_REVOKE_INVALID");
        }
        member.state = "revoked";
        member.stateEventId = event.eventId;
        break;
      }
      case "epoch": {
        authorizedAdministrator(members, event.actorReceizId, causalAncestors);
        if (effect.epoch !== activeEpoch + 1) fail("RECEIZ_CONVERSATION_EPOCH_INVALID");
        activeEpoch = effect.epoch;
        break;
      }
      case "message": {
        if (event.actorReceizId !== effect.senderReceizId) fail("RECEIZ_CONVERSATION_ACTOR_UNAUTHORIZED");
        const sender = members.get(effect.senderReceizId);
        if (!sender || !causalAncestors.has(sender.stateEventId) || sender.state !== "active") {
          fail("RECEIZ_CONVERSATION_SENDER_INACTIVE");
        }
        if (effect.epoch !== activeEpoch) fail("RECEIZ_CONVERSATION_MESSAGE_EPOCH_INVALID");
        if (messageIds.has(effect.messageId)) fail("RECEIZ_CONVERSATION_MESSAGE_ID_CONFLICT");
        messageIds.add(effect.messageId);
        messages.push(Object.freeze({
          messageId: effect.messageId,
          senderReceizId: effect.senderReceizId,
          epoch: effect.epoch,
          receiptDigest: effect.receiptDigest,
          originalPayloadDigest: effect.originalPayloadDigest,
          privateEnvelopeDigest: effect.privateEnvelopeDigest,
        }));
        break;
      }
      default:
        fail("RECEIZ_CONVERSATION_EFFECT_INVALID");
    }
  }

  const projectedMembers = Object.freeze(
    [...members.values()]
      .sort((left, right) => left.binding.receizId.localeCompare(right.binding.receizId))
      .map(({ stateEventId: _stateEventId, ...member }) => Object.freeze(member)),
  );
  const projectedInvitations = Object.freeze(
    [...invitations.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([invitationId, invitation]) => Object.freeze({
        invitationId,
        recipientReceizId: invitation.recipientReceizId,
        role: invitation.role,
        state: invitation.state,
      })),
  );
  const appliedEventIds = Object.freeze(events.map((event) => event.eventId));
  const parentIds = new Set(events.flatMap((event) => event.predecessorEventIds));
  const headEventIds = Object.freeze(
    events.map((event) => event.eventId).filter((eventId) => !parentIds.has(eventId)).sort(),
  );
  const frozenMessages = Object.freeze(messages);
  const projectionBasis = Object.freeze({
    schema: projectionSchema,
    conversationId,
    invitations: projectedInvitations,
    members: projectedMembers,
    activeEpoch,
    messages: frozenMessages,
    appliedEventIds,
    headEventIds,
    ...(closures.length ? { closures: Object.freeze(closures) } : {}),
  });
  return Object.freeze({
    conversationId,
    invitations: projectedInvitations,
    members: projectedMembers,
    activeEpoch,
    messages: frozenMessages,
    appliedEventIds,
    headEventIds,
    ...(closures.length ? { closures: Object.freeze(closures) } : {}),
    projectionDigest: await digestReceizCanonicalV122(projectionBasis),
    authority: Object.freeze({
      projectionIsProofAuthority: false as const,
      strongerTruth: "sealed-receiz-proof-object" as const,
    }),
  });
}
