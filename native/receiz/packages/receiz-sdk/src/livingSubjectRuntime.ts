import { admitReceizKksV1ProofCoordinate, type ReceizKksV1ProofCoordinate, type ReceizKksV1AdmissionContext } from "./v125KaiAuthority.js";
import { digestReceizCompositeCanonical } from "./compositeProofKernel.js";
import { receizBase64UrlDecode, receizBase64UrlEncode } from "./identity.js";
import {
  RECEIZ_SUBJECT_NAMESPACE_NAMES,
  createReceizSubjectPrimaryProofObjectV1,
  createReceizSubjectProofBrain,
  decodeReceizSubjectNamespaceBytes,
  encodeReceizSubjectNamespaceBytes,
  restoreReceizSubjectProofBrain,
  type ReceizBearerCapabilityV1,
  type ReceizBearerInstrumentV1,
  type ReceizBearerTransferPlanV1,
  type ReceizBearerTransferPolicyV1,
  type ReceizBearerTransferReceiptV1,
  type ReceizLivingSubjectModel,
  type ReceizSubjectAdmissionInputV1,
  type ReceizSubjectArtifactV1,
  type ReceizSubjectCapabilityV1,
  type ReceizSubjectIntentV1,
  type ReceizSubjectInventoryItemV1,
  type ReceizSubjectInventoryV1,
  type ReceizSubjectMandatePolicyV1,
  type ReceizSubjectMandateV1,
  type ReceizSubjectMemoryEventV1,
  type ReceizSubjectMemoryProjectionV1,
  type ReceizSubjectMindArtifactV1,
  type ReceizSubjectNamespaceBytesV1,
  type ReceizSubjectPrimaryProofObjectV1,
  type ReceizSubjectProofBrain,
  type ReceizSubjectProofBrainSnapshotV1,
  type ReceizSubjectProofBrainSearchInput,
  type ReceizSubjectRelationshipV1,
  type ReceizSubjectRuntimeJobV1,
  type ReceizSubjectRuntimeTickInput,
  type ReceizSubjectTwinMessageInput,
  type ReceizSubjectTwinResultV1,
  type ReceizSubjectTwinStreamEvent,
  type ReceizSubjectV1,
  type ReceizWorldAuthorityV1,
  type ReceizWorldTransactionAuthorityV1,
  type ReceizWorldCommandInputV1,
  type ReceizWorldCommandPlanV1,
  type ReceizWorldCommandV1,
  type ReceizWorldEventV1,
  type ReceizWorldExecutionResultV1,
  type ReceizWorldReceiptV1,
  type ReceizWorldTransactionV1,
  type ReceizZeroWriteFailureV1,
} from "./livingSubjects.js";

const DIGEST_RE = /^[0-9a-f]{64}$/;
const KAI_RE = /^(0|[1-9][0-9]*)$/;
const encoder = new TextEncoder();
const decoder = new TextDecoder();

type SubjectRecord = {
  artifact: ReceizSubjectArtifactV1;
  events: ReceizWorldEventV1[];
  memories: ReceizSubjectMemoryEventV1[];
  relationships: Map<string, ReceizSubjectRelationshipV1>;
  inventory: Map<string, ReceizSubjectInventoryItemV1>;
  mandates: Map<string, ReceizSubjectMandateV1>;
  jobs: Map<string, ReceizSubjectRuntimeJobV1>;
  brain: ReceizSubjectProofBrain;
  pendingTransferId: string | null;
  priorMindHead: string | null;
  privateMemoryOwnerReceizId: string;
  privateConversationPolicy: ReceizBearerTransferPolicyV1["priorOwnerConversationPolicy"];
  runtimeExecutions: Array<Readonly<{ mandateDigest: string; kai: string; valueMinor: string }>>;
};

type StoredTransfer = {
  instrument: ReceizBearerInstrumentV1;
  status: ReceizBearerInstrumentV1["status"];
  receipt: ReceizBearerTransferReceiptV1 | null;
  claimCapabilityDigest: string | null;
};

export type ReceizLivingSubjectRuntimeSnapshotV1 = Readonly<{
  schema: "receiz.subject.runtime_snapshot.v1";
  version: "120.0.0";
  registryDigest: string;
  reducerDigest: string;
  kai: string;
  subjects: readonly Readonly<{
    artifact: ReceizSubjectArtifactV1;
    events: readonly ReceizWorldEventV1[];
    memories: readonly ReceizSubjectMemoryEventV1[];
    relationships: readonly (readonly [string, ReceizSubjectRelationshipV1])[];
    inventory: readonly (readonly [string, ReceizSubjectInventoryItemV1])[];
    mandates: readonly (readonly [string, ReceizSubjectMandateV1])[];
    jobs: readonly (readonly [string, ReceizSubjectRuntimeJobV1])[];
    brain: ReceizSubjectProofBrainSnapshotV1;
    pendingTransferId: string | null;
    priorMindHead: string | null;
    privateMemoryOwnerReceizId: string;
    privateConversationPolicy: ReceizBearerTransferPolicyV1["priorOwnerConversationPolicy"];
    runtimeExecutions: readonly Readonly<{ mandateDigest: string; kai: string; valueMinor: string }>[];
  }>[];
  worldEvents: readonly (readonly [string, readonly ReceizWorldEventV1[]])[];
  worldHeads: readonly (readonly [string, string])[];
  receipts: readonly (readonly [string, ReceizWorldReceiptV1])[];
  idempotentReceipts: readonly (readonly [string, string])[];
  transfers: readonly (readonly [string, StoredTransfer])[];
  claimedInstrumentDigests: readonly string[];
  snapshotDigest: string;
}>;

/** Opaque execution custody beneath the existing KaiSigil proof primitive.
 * A historical V120 integer is a whole-pulse projection, never proof authority. */
export type ReceizLivingSubjectTemporalExecution = Readonly<{ schema: "receiz.subject.temporal-execution.v127" }>;
const temporalExecutions = new WeakMap<ReceizLivingSubjectTemporalExecution, { coordinates: readonly ReceizKksV1ProofCoordinate[]; consumed: number; attached: boolean }>();
export async function createReceizLivingSubjectTemporalExecution(
  inputs: readonly unknown[],
  context: ReceizKksV1AdmissionContext & Readonly<{ minimumInclusiveLegacyKai: string }>,
): Promise<ReceizLivingSubjectTemporalExecution> {
  if (!inputs.length || !/^(0|[1-9][0-9]*)$/.test(context.minimumInclusiveLegacyKai)) throw new TypeError("SUBJECT_RUNTIME_TEMPORAL_PROOF_REQUIRED");
  const coordinates: ReceizKksV1ProofCoordinate[] = [];
  let previousHead = context.expectedPreviousKaiSigilProofHead;
  let minimum = context.minimumExclusiveKaiUpulse;
  for (const input of inputs) {
    const coordinate = await admitReceizKksV1ProofCoordinate(input, {
      ...(previousHead === undefined ? {} : { expectedPreviousKaiSigilProofHead: previousHead }),
      ...(minimum === undefined ? {} : { minimumExclusiveKaiUpulse: minimum }),
      ...(context.maximumInclusiveKaiUpulse === undefined ? {} : { maximumInclusiveKaiUpulse: context.maximumInclusiveKaiUpulse }),
    });
    if (BigInt(coordinate.kaiPulse) < BigInt(context.minimumInclusiveLegacyKai)) throw new TypeError("SUBJECT_RUNTIME_TEMPORAL_PROOF_BEHIND_HISTORY");
    coordinates.push(coordinate);
    previousHead = coordinate.kaiSigil.proofHead;
    minimum = coordinate.kaiUpulse;
  }
  const handle = Object.freeze({ schema: "receiz.subject.temporal-execution.v127" as const });
  temporalExecutions.set(handle, { coordinates: Object.freeze(coordinates), consumed: 0, attached: false });
  return handle;
}
export function readReceizLivingSubjectTemporalExecution(handle: ReceizLivingSubjectTemporalExecution): readonly ReceizKksV1ProofCoordinate[] {
  const state = temporalExecutions.get(handle);
  if (!state) throw new TypeError("SUBJECT_RUNTIME_TEMPORAL_CUSTODY_REQUIRED");
  return Object.freeze(state.coordinates.slice(0, Math.max(1, state.consumed)));
}

export type ReceizLivingSubjectRuntimeOptions = Readonly<{
  registryDigest: string;
  reducerDigest: string;
  initialKai?: string;
  /** Optional admitted proof execution; the default counter is the historical reference runtime only. */
  temporalExecution?: ReceizLivingSubjectTemporalExecution;
  model?: ReceizLivingSubjectModel;
  snapshot?: ReceizLivingSubjectRuntimeSnapshotV1;
}>;

function digest(value: unknown): string {
  return digestReceizCompositeCanonical(value);
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function fail(code: string): never {
  throw new TypeError(code);
}

function assertDigest(value: string, code: string): void {
  if (!DIGEST_RE.test(value)) fail(code);
}

function assertKai(value: string, code: string): void {
  if (!KAI_RE.test(value)) fail(code);
}

function freezeRecord<T>(value: Record<string, T>): Readonly<Record<string, T>> {
  return Object.freeze({ ...value });
}

function defaultNamespaces(): ReceizSubjectNamespaceBytesV1 {
  return freezeRecord(Object.fromEntries(
    RECEIZ_SUBJECT_NAMESPACE_NAMES.map((name) => [name, encodeReceizSubjectNamespaceBytes({})]),
  ));
}

function assertNamespaces(namespaces: ReceizSubjectNamespaceBytesV1): void {
  for (const required of RECEIZ_SUBJECT_NAMESPACE_NAMES) {
    if (typeof namespaces[required] !== "string") fail(`RECEIZ_SUBJECT_NAMESPACE_REQUIRED:${required}`);
  }
  for (const [name, bytes] of Object.entries(namespaces)) {
    if (!name || !bytes) fail("RECEIZ_SUBJECT_NAMESPACE_INVALID");
    receizBase64UrlDecode(bytes);
  }
}

function sealSubject(
  subjectInput: Omit<ReceizSubjectV1, "schema">,
  registryDigest: string,
  reducerDigest: string,
): ReceizSubjectArtifactV1 {
  assertNamespaces(subjectInput.namespaces);
  const subject: ReceizSubjectV1 = Object.freeze({ schema: "receiz.subject.v1", ...clone(subjectInput) });
  const exactBytesB64u = receizBase64UrlEncode(encoder.encode(JSON.stringify(subject)));
  return Object.freeze({
    schema: "receiz.subject.v1",
    subject,
    exactBytesB64u,
    artifactDigest: digest({ exactBytesB64u }),
    registryDigest,
    reducerDigest,
    authority: Object.freeze({ artifactIsProofAuthority: true, modelOutputIsAuthority: false, indexIsAuthority: false }),
  });
}

export function verifyReceizSubjectArtifactV1(artifact: ReceizSubjectArtifactV1): boolean {
  try {
    if (artifact.schema !== "receiz.subject.v1") return false;
    if (digest({ exactBytesB64u: artifact.exactBytesB64u }) !== artifact.artifactDigest) return false;
    const decoded = JSON.parse(decoder.decode(receizBase64UrlDecode(artifact.exactBytesB64u))) as ReceizSubjectV1;
    if (digest(decoded) !== digest(artifact.subject)) return false;
    assertNamespaces(decoded.namespaces);
    return decoded.schema === "receiz.subject.v1"
      && decoded.identityDigest === artifact.subject.identityDigest
      && decoded.genesisDigest === artifact.subject.genesisDigest;
  } catch {
    return false;
  }
}

function zeroWrite(input: Readonly<{
  code: string;
  commandId?: string | null;
  attemptId?: string | null;
  currentHeads?: Readonly<Record<string, string>>;
  worldHead: string;
  registryDigest: string;
  reducerDigest: string;
}>): ReceizZeroWriteFailureV1 {
  return Object.freeze({
    ok: false,
    schema: "receiz.world.zero-write-failure.v1",
    code: input.code,
    message: input.code,
    commandId: input.commandId ?? null,
    attemptId: input.attemptId ?? null,
    writes: 0,
    currentHeads: freezeRecord({ ...(input.currentHeads ?? {}) }),
    worldHead: input.worldHead,
    registryDigest: input.registryDigest,
    reducerDigest: input.reducerDigest,
  });
}

function memoryTypeFor(kind: string): ReceizSubjectMemoryEventV1["type"] {
  if (kind.includes("relationship")) return "relationship";
  if (kind.includes("battle")) return "battle";
  if (kind.includes("discover") || kind.includes("explor")) return "discovery";
  if (kind.includes("ownership") || kind.includes("care") || kind.includes("transfer")) return "ownership-care";
  if (kind.includes("inventory") || kind.includes("trade") || kind.includes("gift")) return "inventory-trade";
  if (kind.includes("conversation")) return "conversation";
  return "episodic-world";
}

function defaultModel(): ReceizLivingSubjectModel {
  return async ({ subject, message, proofContext }) => {
    const passage = proofContext.passages[0];
    const speech = passage
      ? `${passage.text}`
      : `I am ${subject.subjectId}. I do not have an admitted proof memory that answers that yet.`;
    return {
      provider: "receiz",
      model: "deterministic-proof-twin",
      version: "120.0.0",
      speech: message.message.trim() ? speech : "",
      proposedIntents: [],
    };
  };
}

export function createReceizLivingSubjectRuntime(options: ReceizLivingSubjectRuntimeOptions) {
  assertDigest(options.registryDigest, "RECEIZ_SUBJECT_REGISTRY_DIGEST_INVALID");
  assertDigest(options.reducerDigest, "RECEIZ_SUBJECT_REDUCER_DIGEST_INVALID");
  assertKai(options.snapshot?.kai ?? options.initialKai ?? "0", "RECEIZ_SUBJECT_INITIAL_KAI_INVALID");

  const subjects = new Map<string, SubjectRecord>();
  const worldEvents = new Map<string, ReceizWorldEventV1[]>();
  const worldHeads = new Map<string, string>();
  const receipts = new Map<string, ReceizWorldReceiptV1>();
  const eventsById = new Map<string, ReceizWorldEventV1>();
  const idempotentReceipts = new Map<string, string>();
  const transfers = new Map<string, StoredTransfer>();
  const claimedInstrumentDigests = new Set<string>();
  const model = options.model ?? defaultModel();
  let kai = BigInt(options.snapshot?.kai ?? options.initialKai ?? "0");

  if (options.snapshot) {
    const { snapshotDigest, ...basis } = options.snapshot;
    assertDigest(snapshotDigest, "RECEIZ_SUBJECT_RUNTIME_SNAPSHOT_DIGEST_INVALID");
    if (
      options.snapshot.schema !== "receiz.subject.runtime_snapshot.v1"
      || options.snapshot.version !== "120.0.0"
      || options.snapshot.registryDigest !== options.registryDigest
      || options.snapshot.reducerDigest !== options.reducerDigest
      || digest(basis) !== snapshotDigest
    ) fail("RECEIZ_SUBJECT_RUNTIME_SNAPSHOT_INVALID");
    for (const saved of options.snapshot.subjects) {
      if (!verifyReceizSubjectArtifactV1(saved.artifact)) fail("RECEIZ_SUBJECT_RUNTIME_SNAPSHOT_ARTIFACT_INVALID");
      const brain = restoreReceizSubjectProofBrain(saved.brain);
      const brainHead = brain.head();
      if (
        brainHead.subjectId !== saved.artifact.subject.subjectId
        || brainHead.subjectHead !== saved.artifact.subject.head
        || brainHead.registryDigest !== options.registryDigest
        || brainHead.reducerDigest !== options.reducerDigest
      ) fail("RECEIZ_SUBJECT_RUNTIME_SNAPSHOT_BRAIN_MISMATCH");
      subjects.set(saved.artifact.subject.subjectId, {
        artifact: clone(saved.artifact),
        events: clone([...saved.events]),
        memories: clone([...saved.memories]),
        relationships: new Map(clone([...saved.relationships])),
        inventory: new Map(clone([...saved.inventory])),
        mandates: new Map(clone([...saved.mandates])),
        jobs: new Map(clone([...saved.jobs])),
        brain,
        pendingTransferId: saved.pendingTransferId,
        priorMindHead: saved.priorMindHead,
        privateMemoryOwnerReceizId: saved.privateMemoryOwnerReceizId,
        privateConversationPolicy: saved.privateConversationPolicy,
        runtimeExecutions: clone([...saved.runtimeExecutions]),
      });
    }
    for (const [worldId, events] of options.snapshot.worldEvents) {
      const clonedEvents = clone([...events]);
      worldEvents.set(worldId, clonedEvents);
      for (const event of clonedEvents) eventsById.set(event.eventId, event);
    }
    for (const [worldId, head] of options.snapshot.worldHeads) worldHeads.set(worldId, head);
    for (const [receiptId, receipt] of options.snapshot.receipts) receipts.set(receiptId, clone(receipt));
    for (const [key, receiptId] of options.snapshot.idempotentReceipts) idempotentReceipts.set(key, receiptId);
    for (const [transferId, transfer] of options.snapshot.transfers) transfers.set(transferId, clone(transfer));
    for (const artifactDigest of options.snapshot.claimedInstrumentDigests) claimedInstrumentDigests.add(artifactDigest);
  }

  const temporal = options.temporalExecution ? temporalExecutions.get(options.temporalExecution) : undefined;
  if (options.temporalExecution && (!temporal || temporal.attached)) fail("SUBJECT_RUNTIME_TEMPORAL_CUSTODY_REQUIRED");
  if (temporal) {
    if (BigInt(temporal.coordinates[0]!.kaiPulse) < kai) fail("SUBJECT_RUNTIME_TEMPORAL_PROOF_BEHIND_HISTORY");
    temporal.attached = true;
    kai = BigInt(temporal.coordinates[0]!.kaiPulse);
  }
  const currentKai = () => kai.toString();
  const nextKai = () => {
    if (temporal) {
      const coordinate = temporal.coordinates[temporal.consumed++];
      if (!coordinate) fail("SUBJECT_RUNTIME_TEMPORAL_PROOF_QUEUE_EXHAUSTED");
      if (BigInt(coordinate.kaiPulse) < kai) fail("SUBJECT_RUNTIME_TEMPORAL_PROOF_BEHIND_HISTORY");
      kai = BigInt(coordinate.kaiPulse);
      return kai.toString();
    }
    kai += 1n;
    return kai.toString();
  };
  const worldHead = (worldId: string) => {
    const existing = worldHeads.get(worldId);
    if (existing) return existing;
    const genesis = digest({ kind: "receiz.world.genesis.v1", worldId, registryDigest: options.registryDigest });
    worldHeads.set(worldId, genesis);
    return genesis;
  };
  const requireSubject = (subjectId: string) => {
    const record = subjects.get(subjectId);
    if (!record) fail("RECEIZ_SUBJECT_NOT_FOUND");
    return record;
  };
  const headsFor = (subjectIds: readonly string[]) => freezeRecord(Object.fromEntries(
    [...new Set(subjectIds)].sort().map((subjectId) => [subjectId, requireSubject(subjectId).artifact.subject.head]),
  ));

  const replaceSubject = (
    record: SubjectRecord,
    changes: Partial<Pick<ReceizSubjectV1, "head" | "ownershipHead" | "currentOwnerReceizId" | "namespaces">>,
  ) => {
    const current = record.artifact.subject;
    record.artifact = sealSubject({
      subjectId: current.subjectId,
      proofObjectId: current.proofObjectId,
      subjectType: current.subjectType,
      ownerReceizId: current.ownerReceizId,
      identityDigest: current.identityDigest,
      genesisDigest: current.genesisDigest,
      createdAtKai: current.createdAtKai,
      head: changes.head ?? current.head,
      ownershipHead: changes.ownershipHead ?? current.ownershipHead,
      currentOwnerReceizId: changes.currentOwnerReceizId ?? current.currentOwnerReceizId,
      namespaces: changes.namespaces ?? current.namespaces,
    }, options.registryDigest, options.reducerDigest);
  };

  const appendProofForEvent = (record: SubjectRecord, event: ReceizWorldEventV1) => {
    const eventBytes = encoder.encode(JSON.stringify(event));
    const summary = typeof event.payload.summary === "string" ? event.payload.summary : event.kind;
    const primary = createReceizSubjectPrimaryProofObjectV1({
      subjectId: record.artifact.subject.subjectId,
      proofObjectId: `event:${event.eventId}:${record.artifact.subject.subjectId}`,
      eventIds: [event.eventId],
      kai: event.kai,
      visibility: "public",
      exactBytes: eventBytes,
      text: [{ kind: "event", text: summary }],
    });
    record.brain.append({
      subjectId: record.artifact.subject.subjectId,
      subjectDigest: record.artifact.artifactDigest,
      subjectHead: record.artifact.subject.head,
      historyHead: event.eventId,
      primaryObject: primary,
    });
    const memory: ReceizSubjectMemoryEventV1 = Object.freeze({
      schema: "receiz.subject.memory_event.v1",
      memoryId: digest({ eventId: event.eventId, subjectId: record.artifact.subject.subjectId }),
      subjectId: record.artifact.subject.subjectId,
      type: memoryTypeFor(event.kind),
      summary,
      eventIds: Object.freeze([event.eventId]),
      proofObjectIds: Object.freeze([primary.proofObjectId]),
      visibility: "public",
      head: record.artifact.subject.head,
      kai: event.kai,
    });
    record.memories.push(memory);
  };

  const applyNamespaceUpdates = (
    namespaces: ReceizSubjectNamespaceBytesV1,
    subjectId: string,
    payload: Readonly<Record<string, unknown>>,
  ): ReceizSubjectNamespaceBytesV1 => {
    const allUpdates = payload.namespaceUpdates;
    if (!allUpdates || typeof allUpdates !== "object" || Array.isArray(allUpdates)) {
      return namespaces;
    }
    const update = (allUpdates as Record<string, unknown>)[subjectId];
    if (!update || typeof update !== "object" || Array.isArray(update)) {
      return namespaces;
    }
    const next = { ...namespaces };
    for (const [name, bytes] of Object.entries(update as Record<string, unknown>)) {
      if (typeof bytes !== "string") fail("RECEIZ_SUBJECT_NAMESPACE_UPDATE_INVALID");
      receizBase64UrlDecode(bytes);
      next[name] = bytes;
    }
    assertNamespaces(next);
    return freezeRecord(next);
  };

  const applyRelationshipProjection = (event: ReceizWorldEventV1) => {
    if (!event.kind.startsWith("relationship.")) return;
    const pair = event.participantSubjectIds.slice(0, 2).sort();
    if (pair.length !== 2) return;
    const relationshipId = typeof event.payload.relationshipId === "string"
      ? event.payload.relationshipId
      : digest({ pair });
    const response = event.kind === "relationship.responded"
      ? (event.payload.response === "accept" ? "active" : "declined")
      : "proposed";
    const projection: ReceizSubjectRelationshipV1 = Object.freeze({
      schema: "receiz.subject.relationship.v1",
      relationshipId,
      subjectIds: Object.freeze([pair[0]!, pair[1]!] as [string, string]),
      status: response,
      familiarity: response === "active" ? 1 : 0,
      trust: response === "active" ? 1 : 0,
      rivalry: 0,
      affection: 0,
      mentorship: 0,
      visibility: event.payload.visibility === "private" ? "private" : "public",
      eventIds: Object.freeze([event.eventId]),
      head: event.worldHead,
    });
    for (const subjectId of pair) requireSubject(subjectId).relationships.set(relationshipId, projection);
  };

  const applyTradeProjection = (event: ReceizWorldEventV1) => {
    if (event.kind !== "inventory.trade") return;
    const fromSubjectId = String(event.payload.fromSubjectId ?? "");
    const toSubjectId = String(event.payload.toSubjectId ?? "");
    const itemId = String(event.payload.itemId ?? "");
    const from = requireSubject(fromSubjectId);
    const to = requireSubject(toSubjectId);
    const item = from.inventory.get(itemId);
    if (!item) fail("RECEIZ_SUBJECT_INVENTORY_ITEM_NOT_FOUND");
    from.inventory.delete(itemId);
    to.inventory.set(itemId, Object.freeze({ ...item, ownerSubjectId: toSubjectId }));
  };

  const admitSubject = (input: ReceizSubjectAdmissionInputV1): ReceizSubjectArtifactV1 => {
    if (subjects.has(input.subjectId)) fail("RECEIZ_SUBJECT_ALREADY_EXISTS");
    const createdAtKai = input.createdAtKai ?? nextKai();
    assertKai(createdAtKai, "RECEIZ_SUBJECT_CREATED_KAI_INVALID");
    const namespaces = freezeRecord({ ...defaultNamespaces(), ...(input.namespaces ?? {}) });
    assertNamespaces(namespaces);
    const identityDigest = input.identityDigest ?? digest({
      kind: "receiz.subject.identity.v1",
      subjectId: input.subjectId,
      proofObjectId: input.proofObjectId,
      subjectType: input.subjectType,
      createdAtKai,
    });
    assertDigest(identityDigest, "RECEIZ_SUBJECT_IDENTITY_DIGEST_INVALID");
    const genesisDigest = digest({
      schema: "receiz.subject.v1",
      subjectId: input.subjectId,
      proofObjectId: input.proofObjectId,
      subjectType: input.subjectType,
      ownerReceizId: input.ownerReceizId,
      identityDigest,
      createdAtKai,
      namespaceDigests: Object.fromEntries(Object.entries(namespaces).map(([name, bytes]) => [name, digest({ name, bytes })])),
    });
    const ownershipHead = digest({ kind: "receiz.subject.ownership.genesis.v1", identityDigest, ownerReceizId: input.ownerReceizId });
    const head = digest({ kind: "receiz.subject.head.genesis.v1", identityDigest, genesisDigest, ownershipHead });
    const artifact = sealSubject({
      subjectId: input.subjectId,
      proofObjectId: input.proofObjectId,
      subjectType: input.subjectType,
      ownerReceizId: input.ownerReceizId,
      identityDigest,
      genesisDigest,
      createdAtKai,
      head,
      ownershipHead,
      currentOwnerReceizId: input.ownerReceizId,
      namespaces,
    }, options.registryDigest, options.reducerDigest);
    const brain = createReceizSubjectProofBrain({
      subjectId: input.subjectId,
      subjectDigest: artifact.artifactDigest,
      subjectHead: head,
      historyHead: genesisDigest,
      maximumKai: createdAtKai,
      registryDigest: options.registryDigest,
      reducerDigest: options.reducerDigest,
    });
    const record: SubjectRecord = {
      artifact,
      events: [],
      memories: [],
      relationships: new Map(),
      inventory: new Map(),
      mandates: new Map(),
      jobs: new Map(),
      brain,
      pendingTransferId: null,
      priorMindHead: null,
      privateMemoryOwnerReceizId: input.ownerReceizId,
      privateConversationPolicy: "encrypted-evidence",
      runtimeExecutions: [],
    };
    subjects.set(input.subjectId, record);
    const genesisObject = createReceizSubjectPrimaryProofObjectV1({
      subjectId: input.subjectId,
      proofObjectId: input.proofObjectId,
      kai: createdAtKai,
      exactBytes: receizBase64UrlDecode(artifact.exactBytesB64u),
      text: [{ kind: "claim", text: `${input.subjectType} ${input.subjectId} genesis` }],
      namespaceDigests: Object.fromEntries(Object.entries(namespaces).map(([name, bytes]) => [name, digest({ name, bytes })])),
    });
    const primaryObjects = [genesisObject, ...(input.primaryObjects ?? [])];
    for (const primaryObject of primaryObjects) {
      record.brain.append({
        subjectId: input.subjectId,
        subjectDigest: artifact.artifactDigest,
        subjectHead: head,
        historyHead: genesisDigest,
        primaryObject,
      });
    }
    return clone(artifact);
  };

  const verifySubject = (artifact: ReceizSubjectArtifactV1) => verifyReceizSubjectArtifactV1(artifact)
    && artifact.registryDigest === options.registryDigest
    && artifact.reducerDigest === options.reducerDigest;

  const resolveSubject = (subjectId: string) => clone(requireSubject(subjectId).artifact);
  const stateSubject = (subjectId: string) => clone(requireSubject(subjectId).artifact.subject);
  const historySubject = (subjectId: string, input: Readonly<{ afterHead?: string; limit?: number }> = {}) => {
    const events = requireSubject(subjectId).events;
    const start = input.afterHead ? Math.max(0, events.findIndex((event) => event.worldHead === input.afterHead) + 1) : 0;
    const limit = Math.min(1000, Math.max(1, Math.trunc(input.limit ?? 100)));
    return clone(events.slice(start, start + limit));
  };

  const twinMessage = async (subjectId: string, input: ReceizSubjectTwinMessageInput): Promise<ReceizSubjectTwinResultV1> => {
    const record = requireSubject(subjectId);
    const subject = record.artifact.subject;
    if (input.ownerReceizId !== subject.currentOwnerReceizId) fail("RECEIZ_SUBJECT_TWIN_OWNER_FORBIDDEN");
    if (input.contextHead !== subject.head) fail("RECEIZ_SUBJECT_TWIN_STALE_CONTEXT_HEAD");
    if (input.expectedSubjectDigest !== record.artifact.artifactDigest) fail("RECEIZ_SUBJECT_TWIN_DIGEST_MISMATCH");
    const canReadPriorPrivateMemory = input.ownerReceizId === record.privateMemoryOwnerReceizId
      || record.privateConversationPolicy === "inherited";
    const proofContext = record.brain.context({
      query: input.message,
      atHead: subject.head,
      limit: 96,
      visibility: canReadPriorPrivateMemory ? "all" : "public",
    });
    let response: Awaited<ReturnType<ReceizLivingSubjectModel>>;
    try {
      response = await model({ subject: clone(subject), message: clone(input), proofContext: clone(proofContext) });
    } catch {
      response = {
        provider: "receiz",
        model: "model-failure-boundary",
        version: "120.0.0",
        speech: "I could not form a response. No world event was created.",
        proposedIntents: [],
      };
    }
    const proposedIntents = Object.freeze((response.proposedIntents ?? []).filter((intent) => (
      typeof intent.kind === "string"
      && Array.isArray(intent.targetIds)
      && typeof intent.reason === "string"
      && Number.isFinite(intent.confidence)
      && intent.observedHead === subject.head
    )).map((intent) => Object.freeze({
      ...clone(intent),
      confidence: Math.max(0, Math.min(1, intent.confidence)),
      targetIds: Object.freeze([...intent.targetIds]),
      requiredCapabilities: Object.freeze([...intent.requiredCapabilities]),
    })));
    const promptDigest = digest({ message: input.message, threadKey: input.threadKey ?? null, responseMode: input.responseMode ?? "text" });
    const contextDigest = digest(proofContext);
    const outputBasis = { speech: response.speech, proposedIntents, performance: response.performance ?? null };
    const intent: ReceizSubjectIntentV1 = Object.freeze({
      schema: "receiz.subject.intent.v1",
      speech: response.speech,
      proposedIntents,
      memoryCitations: Object.freeze(proofContext.primaryObjects.flatMap((object) => object.eventIds)),
      ...(response.performance ? { performance: clone(response.performance) } : {}),
      modelAudit: Object.freeze({
        provider: response.provider,
        model: response.model,
        version: response.version,
        promptDigest,
        contextDigest,
        outputDigest: digest(outputBasis),
        outputIsAuthority: false,
      }),
    });
    const eventIdSet = new Set(proofContext.primaryObjects.flatMap((object) => object.eventIds));
    const observedFacts = Object.freeze(proofContext.passages
      .filter((passage) => proofContext.primaryObjects.some(
        (object) => object.proofObjectId === passage.proofObjectId && object.eventIds.length > 0,
      ))
      .slice(0, 12)
      .map((passage) => Object.freeze({
        fact: passage.text,
        eventIds: Object.freeze(proofContext.primaryObjects
          .filter((object) => object.proofObjectId === passage.proofObjectId)
          .flatMap((object) => object.eventIds)),
        proofObjectIds: Object.freeze([passage.proofObjectId]),
      })));
    const proofDerivedMemories = Object.freeze(record.memories
      .filter((memory) => memory.eventIds.some((eventId) => eventIdSet.has(eventId)))
      .map((memory) => Object.freeze({ memoryId: memory.memoryId, summary: memory.summary, eventIds: memory.eventIds })));
    return Object.freeze({
      schema: "receiz.subject.twin_result.v1",
      subjectId,
      subjectHead: subject.head,
      spokenResponse: response.speech,
      proposedIntent: intent,
      observedFacts,
      proofDerivedMemories,
      performance: response.performance ? clone(response.performance) : null,
      proofContext,
      worldEventIds: Object.freeze([]) as readonly [],
      authority: Object.freeze({ modelOutputIsWorldEvent: false, deterministicAdmissionRequired: true }),
    });
  };

  const twinStream = async function* (
    subjectId: string,
    input: ReceizSubjectTwinMessageInput,
  ): AsyncGenerator<ReceizSubjectTwinStreamEvent> {
    const record = requireSubject(subjectId);
    for await (const event of record.brain.stream({ query: input.message, atHead: input.contextHead, limit: 96, visibility: "all" })) {
      yield event;
    }
    const result = await twinMessage(subjectId, input);
    const chunks = result.spokenResponse.match(/.{1,48}(?:\s+|$)/g) ?? [result.spokenResponse];
    for (const chunk of chunks) yield { type: "reply_delta", text: chunk };
    for (const intent of result.proposedIntent.proposedIntents) yield { type: "intent_proposed", intent };
    yield { type: "reply_done", result };
  };

  const streamPerformance = async function* (
    subjectId: string,
    input: ReceizSubjectTwinMessageInput,
  ): AsyncGenerator<ReceizSubjectTwinStreamEvent> {
    const result = await twinMessage(subjectId, input);
    const contextDigest = digest(result.proofContext);
    const sourceStateDigest = digest(requireSubject(subjectId).artifact.subject.namespaces.selfModel);
    const chunks = result.spokenResponse.match(/.{1,32}(?:\s+|$)/g) ?? [result.spokenResponse];
    let timingMs = 0;
    const motion = (
      type: "viseme" | "gaze" | "blink" | "breath" | "emotion" | "gesture",
      value: Readonly<Record<string, unknown>>,
      confidence = 0.8,
    ): ReceizSubjectTwinStreamEvent => ({
      type,
      timingMs,
      confidence,
      sourceStateDigest,
      contextDigest,
      reducedMotionCompatible: true,
      value,
    });
    yield motion("gaze", Object.freeze({ target: "listener", mode: "settled" }), 0.86);
    yield motion("emotion", Object.freeze({ cue: String(result.performance?.emotion ?? "attentive"), authoritative: false }), 0.72);
    for (const chunk of chunks) {
      yield { type: "reply_delta", text: chunk };
      timingMs += Math.max(80, chunk.length * 24);
      yield motion("breath", Object.freeze({ intensity: "natural", authoritative: false }));
      yield motion("gesture", Object.freeze({ cue: "speech-emphasis", amplitude: "subtle", authoritative: false }), 0.68);
    }
    yield motion("blink", Object.freeze({ durationMs: 110, authoritative: false }), 0.9);
    const audioB64u = typeof result.performance?.audioB64u === "string" ? result.performance.audioB64u : null;
    if (audioB64u) {
      yield { type: "audio_chunk", audioB64u, startMs: 0, endMs: timingMs, confidence: 1, contextDigest };
      const visemes = Array.isArray(result.performance?.visemes) ? result.performance.visemes : [];
      for (const value of visemes) {
        if (!value || typeof value !== "object") continue;
        const viseme = value as Readonly<Record<string, unknown>>;
        timingMs = typeof viseme.timingMs === "number" ? Math.max(0, viseme.timingMs) : timingMs;
        yield motion("viseme", Object.freeze({ ...viseme, authoritative: false }), 0.9);
      }
    }
    for (const intent of result.proposedIntent.proposedIntents) yield { type: "intent_proposed", intent };
    yield { type: "reply_done", result };
  };

  const exportMind = (subjectId: string): ReceizSubjectMindArtifactV1 => {
    const record = requireSubject(subjectId);
    const brainHead = record.brain.head();
    const exactObjects = record.brain.exactObjects();
    const portableWindow = exactObjects.slice(Math.max(0, exactObjects.length - 96));
    const publicMemoryIds = record.memories.filter((memory) => memory.visibility === "public").map((memory) => memory.memoryId);
    const privateMemoryIds = record.memories.filter((memory) => memory.visibility === "private").map((memory) => memory.memoryId);
    const basis = {
      schema: "receiz.subject.mind.v1" as const,
      subjectArtifact: record.artifact,
      brainHead,
      portableWindow,
      completeHistory: {
        objectCount: brainHead.objectCount,
        objectMerkleRoot: brainHead.objectMerkleRoot,
        indexRoot: brainHead.indexRoot,
        contentAddress: `receiz://subject-proof-history/${subjectId}/${brainHead.objectMerkleRoot}`,
        primaryObjectsRequiredForReasoning: true as const,
      },
      publicMemoryIds,
      privateMemoryIds,
      priorMindHead: record.priorMindHead,
      registryDigest: options.registryDigest,
      reducerDigest: options.reducerDigest,
    };
    const exactBytesB64u = receizBase64UrlEncode(encoder.encode(JSON.stringify(basis)));
    const artifact: ReceizSubjectMindArtifactV1 = Object.freeze({
      ...clone(basis),
      portableWindow: Object.freeze(clone(portableWindow)),
      publicMemoryIds: Object.freeze([...publicMemoryIds]),
      privateMemoryIds: Object.freeze([...privateMemoryIds]),
      mindDigest: digest({ exactBytesB64u }),
      exactBytesB64u,
    });
    record.priorMindHead = artifact.mindDigest;
    return artifact;
  };

  const importMind = (subjectId: string, artifact: ReceizSubjectMindArtifactV1) => {
    if (artifact.schema !== "receiz.subject.mind.v1" || digest({ exactBytesB64u: artifact.exactBytesB64u }) !== artifact.mindDigest) {
      fail("RECEIZ_SUBJECT_MIND_ARTIFACT_INVALID");
    }
    const decodedMind = JSON.parse(decoder.decode(receizBase64UrlDecode(artifact.exactBytesB64u))) as Omit<
      ReceizSubjectMindArtifactV1,
      "mindDigest" | "exactBytesB64u"
    >;
    const visibleBasis = {
      schema: artifact.schema,
      subjectArtifact: artifact.subjectArtifact,
      brainHead: artifact.brainHead,
      portableWindow: artifact.portableWindow,
      completeHistory: artifact.completeHistory,
      publicMemoryIds: artifact.publicMemoryIds,
      privateMemoryIds: artifact.privateMemoryIds,
      priorMindHead: artifact.priorMindHead,
      registryDigest: artifact.registryDigest,
      reducerDigest: artifact.reducerDigest,
    };
    if (digest(decodedMind) !== digest(visibleBasis)) fail("RECEIZ_SUBJECT_MIND_VISIBLE_PROJECTION_MISMATCH");
    if (artifact.subjectArtifact.subject.subjectId !== subjectId || !verifySubject(artifact.subjectArtifact)) {
      fail("RECEIZ_SUBJECT_MIND_IDENTITY_BINDING_INVALID");
    }
    const existing = subjects.get(subjectId);
    if (existing && existing.artifact.subject.identityDigest !== artifact.subjectArtifact.subject.identityDigest) {
      return Object.freeze({
        ok: false as const,
        code: "RECEIZ_SUBJECT_MIND_FORK_PRESERVED",
        writes: 0 as const,
        localHead: existing.artifact.subject.head,
        importedHead: artifact.subjectArtifact.subject.head,
        forkDigest: digest({ local: existing.artifact.artifactDigest, imported: artifact.mindDigest }),
      });
    }
    if (!existing) {
      const importedSubject = artifact.subjectArtifact.subject;
      const brain = createReceizSubjectProofBrain({
        subjectId,
        subjectDigest: artifact.subjectArtifact.artifactDigest,
        subjectHead: importedSubject.head,
        historyHead: importedSubject.genesisDigest,
        maximumKai: importedSubject.createdAtKai,
        registryDigest: options.registryDigest,
        reducerDigest: options.reducerDigest,
      });
      for (const primaryObject of artifact.portableWindow) {
        brain.append({
          subjectId,
          subjectDigest: artifact.subjectArtifact.artifactDigest,
          subjectHead: importedSubject.head,
          historyHead: artifact.brainHead.historyHead,
          primaryObject,
        });
      }
      if (BigInt(artifact.brainHead.objectCount) === BigInt(artifact.portableWindow.length)
        && brain.head().objectMerkleRoot !== artifact.brainHead.objectMerkleRoot) {
        fail("RECEIZ_SUBJECT_MIND_HISTORY_ROOT_MISMATCH");
      }
      subjects.set(subjectId, {
        artifact: clone(artifact.subjectArtifact),
        events: [],
        memories: [],
        relationships: new Map(),
        inventory: new Map(),
        mandates: new Map(),
        jobs: new Map(),
        brain,
        pendingTransferId: null,
        priorMindHead: artifact.mindDigest,
        privateMemoryOwnerReceizId: importedSubject.currentOwnerReceizId,
        privateConversationPolicy: "encrypted-evidence",
        runtimeExecutions: [],
      });
    } else {
      for (const object of artifact.portableWindow) {
        existing.brain.append({
          subjectId,
          subjectDigest: existing.artifact.artifactDigest,
          subjectHead: existing.artifact.subject.head,
          historyHead: artifact.brainHead.historyHead,
          primaryObject: object,
        });
      }
    }
    return Object.freeze({ ok: true as const, subjectId, mindDigest: artifact.mindDigest, head: stateSubject(subjectId).head });
  };

  const planMandate = (subjectId: string, policy: ReceizSubjectMandatePolicyV1): ReceizSubjectMandateV1 => {
    const record = requireSubject(subjectId);
    assertKai(policy.expiresAtKai, "RECEIZ_SUBJECT_MANDATE_EXPIRY_INVALID");
    assertKai(policy.minimumRuntimeIntervalKai, "RECEIZ_SUBJECT_MANDATE_INTERVAL_INVALID");
    const ownerReceizId = record.artifact.subject.currentOwnerReceizId;
    const mandateDigest = digest({ schema: "receiz.subject.mandate.v1", subjectId, ownerReceizId, policy });
    const mandate: ReceizSubjectMandateV1 = Object.freeze({
      schema: "receiz.subject.mandate.v1",
      mandateId: mandateDigest,
      subjectId,
      ownerReceizId,
      policy: clone(policy),
      mandateDigest,
      status: "planned",
      activatedCapabilityDigest: null,
      activatedAtKai: null,
      revokedAtKai: null,
    });
    record.mandates.set(mandateDigest, mandate);
    return clone(mandate);
  };

  const activateMandate = (mandate: ReceizSubjectMandateV1, capability: ReceizSubjectCapabilityV1) => {
    const record = requireSubject(mandate.subjectId);
    const stored = record.mandates.get(mandate.mandateDigest);
    if (!stored || stored.status !== "planned") fail("RECEIZ_SUBJECT_MANDATE_PLAN_INVALID");
    if (capability.subjectId !== mandate.subjectId
      || capability.receizId !== record.artifact.subject.currentOwnerReceizId
      || !capability.actions.includes("mandate.activate")
      || BigInt(capability.expiresAtKai) < kai) fail("RECEIZ_SUBJECT_OWNER_CAPABILITY_INVALID");
    const active = Object.freeze({
      ...stored,
      status: "active" as const,
      activatedCapabilityDigest: capability.capabilityDigest,
      activatedAtKai: nextKai(),
    });
    record.mandates.set(active.mandateDigest, active);
    return clone(active);
  };

  const updateMandateStatus = (subjectId: string, status: "paused" | "revoked") => {
    const record = requireSubject(subjectId);
    const updated: ReceizSubjectMandateV1[] = [];
    for (const [mandateDigest, mandate] of record.mandates) {
      if (mandate.status !== "active" && mandate.status !== "paused") continue;
      const next = Object.freeze({
        ...mandate,
        status,
        revokedAtKai: status === "revoked" ? nextKai() : mandate.revokedAtKai,
      });
      record.mandates.set(mandateDigest, next);
      updated.push(next);
    }
    if (status === "revoked") {
      for (const [jobId, job] of record.jobs) {
        if (job.status !== "queued" && job.status !== "leased") continue;
        record.jobs.set(jobId, Object.freeze({ ...job, status: "cancelled", failureCode: "RECEIZ_SUBJECT_MANDATE_REVOKED" }));
      }
    }
    return clone(updated);
  };

  const queryMemory = (subjectId: string, input: Readonly<{
    types?: readonly ReceizSubjectMemoryEventV1["type"][];
    visibility?: "public" | "private" | "all";
    afterKai?: string;
    limit?: number;
  }> = {}) => {
    const limit = Math.min(1000, Math.max(1, Math.trunc(input.limit ?? 100)));
    return clone(requireSubject(subjectId).memories.filter((memory) => (
      (!input.types?.length || input.types.includes(memory.type))
      && (!input.visibility || input.visibility === "all" || memory.visibility === input.visibility)
      && (!input.afterKai || BigInt(memory.kai) > BigInt(input.afterKai))
    )).slice(0, limit));
  };

  const projectMemory = (subjectId: string, throughHead: string): ReceizSubjectMemoryProjectionV1 => {
    const record = requireSubject(subjectId);
    const memories = record.memories.filter((memory) => {
      const event = memory.eventIds.length ? eventsById.get(memory.eventIds[0]!) : undefined;
      return !event || event.priorHeads[subjectId] === throughHead || event.nextHeads[subjectId] === throughHead
        || record.events.findIndex((candidate) => candidate.eventId === event.eventId)
          <= record.events.findIndex((candidate) => candidate.nextHeads[subjectId] === throughHead);
    });
    return Object.freeze({
      schema: "receiz.subject.memory_projection.v1",
      subjectId,
      throughHead,
      memories: Object.freeze(clone(memories)),
      projectionDigest: digest({ subjectId, throughHead, memoryIds: memories.map((memory) => memory.memoryId) }),
      rebuildable: true,
    });
  };

  const planCommand = (input: ReceizWorldCommandInputV1): ReceizWorldCommandPlanV1 => {
    if (!input.worldId || !input.actorSubjectId || !input.kind || !input.attemptId || !input.idempotencyKey) {
      fail("RECEIZ_WORLD_COMMAND_INPUT_INVALID");
    }
    const commandBasis = { schema: "receiz.world.command.v1" as const, input: clone(input) };
    const commandDigest = digest(commandBasis);
    const command: ReceizWorldCommandV1 = Object.freeze({
      schema: "receiz.world.command.v1",
      commandId: digest({ kind: "receiz.world.command-id.v1", worldId: input.worldId, idempotencyKey: input.idempotencyKey }),
      commandDigest,
      input: clone(input),
    });
    const planBasis = {
      command,
      priorHeads: freezeRecord({ ...input.expectedHeads }),
      worldHead: input.expectedWorldHead,
      registryDigest: options.registryDigest,
      reducerDigest: options.reducerDigest,
      writesOnFailure: 0 as const,
    };
    return Object.freeze({
      schema: "receiz.world.command_plan.v1",
      planId: command.commandId,
      planDigest: digest({ schema: "receiz.world.command_plan.v1", ...planBasis }),
      ...planBasis,
    });
  };

  const commandPlanIntegrityValid = (plan: ReceizWorldCommandPlanV1) => {
    const commandBasis = { schema: "receiz.world.command.v1" as const, input: plan.command.input };
    if (digest(commandBasis) !== plan.command.commandDigest) return false;
    if (digest({ kind: "receiz.world.command-id.v1", worldId: plan.command.input.worldId, idempotencyKey: plan.command.input.idempotencyKey }) !== plan.command.commandId) return false;
    const planBasis = {
      command: plan.command,
      priorHeads: plan.priorHeads,
      worldHead: plan.worldHead,
      registryDigest: plan.registryDigest,
      reducerDigest: plan.reducerDigest,
      writesOnFailure: 0 as const,
    };
    return digest({ schema: "receiz.world.command_plan.v1", ...planBasis }) === plan.planDigest;
  };

  const validateHeads = (input: Readonly<{
    worldId: string;
    expectedHeads: Readonly<Record<string, string>>;
    expectedWorldHead: string;
    commandId: string;
    attemptId: string;
  }>): ReceizZeroWriteFailureV1 | null => {
    const current = headsFor(Object.keys(input.expectedHeads));
    for (const [subjectId, expectedHead] of Object.entries(input.expectedHeads)) {
      if (current[subjectId] !== expectedHead) {
        return zeroWrite({
          code: "RECEIZ_WORLD_STALE_SUBJECT_HEAD",
          commandId: input.commandId,
          attemptId: input.attemptId,
          currentHeads: current,
          worldHead: worldHead(input.worldId),
          registryDigest: options.registryDigest,
          reducerDigest: options.reducerDigest,
        });
      }
    }
    if (worldHead(input.worldId) !== input.expectedWorldHead) {
      return zeroWrite({
        code: "RECEIZ_WORLD_STALE_WORLD_HEAD",
        commandId: input.commandId,
        attemptId: input.attemptId,
        currentHeads: current,
        worldHead: worldHead(input.worldId),
        registryDigest: options.registryDigest,
        reducerDigest: options.reducerDigest,
      });
    }
    return null;
  };

  const validateCommand = (plan: ReceizWorldCommandPlanV1) => {
    const input = plan.command.input;
    if (!commandPlanIntegrityValid(plan)
      || plan.registryDigest !== options.registryDigest
      || plan.reducerDigest !== options.reducerDigest) {
      return zeroWrite({
        code: "RECEIZ_WORLD_COMMAND_PLAN_DIGEST_INVALID",
        commandId: plan.command.commandId,
        attemptId: input.attemptId,
        worldHead: worldHead(input.worldId),
        registryDigest: options.registryDigest,
        reducerDigest: options.reducerDigest,
      });
    }
    if (!Object.hasOwn(input.expectedHeads, input.actorSubjectId)) {
      return zeroWrite({
        code: "RECEIZ_WORLD_ACTOR_HEAD_REQUIRED",
        commandId: plan.command.commandId,
        attemptId: input.attemptId,
        worldHead: worldHead(input.worldId),
        registryDigest: options.registryDigest,
        reducerDigest: options.reducerDigest,
      });
    }
    const stale = validateHeads({
      worldId: input.worldId,
      expectedHeads: input.expectedHeads,
      expectedWorldHead: input.expectedWorldHead,
      commandId: plan.command.commandId,
      attemptId: input.attemptId,
    });
    if (stale) return stale;
    return Object.freeze({
      ok: true as const,
      planId: plan.planId,
      planDigest: plan.planDigest,
      currentHeads: headsFor(Object.keys(input.expectedHeads)),
      worldHead: worldHead(input.worldId),
      writes: 0 as const,
      registryDigest: options.registryDigest,
      reducerDigest: options.reducerDigest,
    });
  };

  const authorize = (
    actorSubjectId: string,
    worldId: string,
    kind: string,
    targetIds: readonly string[],
    payload: Readonly<Record<string, unknown>>,
    mandateDigest: string | undefined,
    authority: ReceizWorldAuthorityV1,
  ): string | null => {
    const actor = requireSubject(actorSubjectId);
    if (actor.pendingTransferId && kind !== "subject.ownership.transfer") return "RECEIZ_SUBJECT_PENDING_TRANSFER_CUSTODY";
    if (authority.actorSubjectId !== actorSubjectId) return "RECEIZ_WORLD_AUTHORITY_ACTOR_MISMATCH";
    if (authority.ownerReceizId === actor.artifact.subject.currentOwnerReceizId) return null;
    const effectiveMandateDigest = authority.mandateDigest ?? mandateDigest;
    if (!effectiveMandateDigest || (mandateDigest && effectiveMandateDigest !== mandateDigest)) {
      return "RECEIZ_SUBJECT_MANDATE_REQUIRED";
    }
    const mandate = actor.mandates.get(effectiveMandateDigest);
    if (!mandate || mandate.status !== "active") return "RECEIZ_SUBJECT_MANDATE_INACTIVE";
    if (mandate.ownerReceizId !== actor.artifact.subject.currentOwnerReceizId) return "RECEIZ_SUBJECT_MANDATE_OWNER_CHANGED";
    if (BigInt(mandate.policy.expiresAtKai) <= kai) return "RECEIZ_SUBJECT_MANDATE_EXPIRED";
    if (!mandate.policy.allowedActions.includes(kind)) return "RECEIZ_SUBJECT_MANDATE_ACTION_FORBIDDEN";
    if (targetIds.some((targetId) => !mandate.policy.allowedSubjectIds.includes(targetId))) {
      return "RECEIZ_SUBJECT_MANDATE_TARGET_FORBIDDEN";
    }
    const targetOwners = targetIds.map((targetId) => requireSubject(targetId).artifact.subject.currentOwnerReceizId);
    if (mandate.policy.allowedOwnerReceizIds.length > 0
      && targetOwners.some((ownerReceizId) => !mandate.policy.allowedOwnerReceizIds.includes(ownerReceizId))) {
      return "RECEIZ_SUBJECT_MANDATE_TARGET_OWNER_FORBIDDEN";
    }
    const worldRegion = typeof payload.worldRegion === "string" ? payload.worldRegion : null;
    if (worldRegion && !mandate.policy.allowedWorldRegions.includes(worldRegion)) {
      return "RECEIZ_SUBJECT_MANDATE_WORLD_REGION_FORBIDDEN";
    }
    if (kind.includes("battle") && !mandate.policy.battleParticipation) {
      return "RECEIZ_SUBJECT_MANDATE_BATTLE_FORBIDDEN";
    }
    const itemAction = kind.includes("trade") ? "trade" : kind.includes("gift") ? "gift" : kind.includes("inventory.use") ? "use" : null;
    if (itemAction && !mandate.policy.itemActions.includes(itemAction)) {
      return "RECEIZ_SUBJECT_MANDATE_ITEM_ACTION_FORBIDDEN";
    }
    const valueMinor = typeof payload.valueMinor === "string" && /^\d+$/.test(payload.valueMinor) ? BigInt(payload.valueMinor) : 0n;
    if (valueMinor > BigInt(mandate.policy.maximumItemValueMinor)) return "RECEIZ_SUBJECT_MANDATE_ITEM_VALUE_EXCEEDED";
    if (valueMinor > BigInt(mandate.policy.approvalThresholdMinor)) return "RECEIZ_SUBJECT_OWNER_APPROVAL_REQUIRED";
    const applicationId = typeof payload.applicationId === "string" ? payload.applicationId : null;
    if (applicationId && !mandate.policy.applicationScope.includes(applicationId)) return "RECEIZ_SUBJECT_MANDATE_APPLICATION_FORBIDDEN";
    const tenantId = typeof payload.tenantId === "string" ? payload.tenantId : null;
    if (tenantId && !mandate.policy.tenantScope.includes(tenantId)) return "RECEIZ_SUBJECT_MANDATE_TENANT_FORBIDDEN";
    const recent = actor.runtimeExecutions.filter((entry) => entry.mandateDigest === mandate.mandateDigest && kai - BigInt(entry.kai) < 86_400n);
    if (recent.length >= mandate.policy.maximumDailyRuns) return "RECEIZ_SUBJECT_MANDATE_DAILY_RUN_LIMIT";
    const latest = recent.at(-1);
    if (latest && kai - BigInt(latest.kai) < BigInt(mandate.policy.minimumRuntimeIntervalKai)) {
      return "RECEIZ_SUBJECT_MANDATE_RUNTIME_FREQUENCY_LIMIT";
    }
    const dailyValue = recent.reduce((sum, entry) => sum + BigInt(entry.valueMinor), 0n);
    if (dailyValue + valueMinor > BigInt(mandate.policy.maximumDailyValueMinor)) {
      return "RECEIZ_SUBJECT_MANDATE_DAILY_VALUE_EXCEEDED";
    }
    if (!worldId.trim() || !mandate.policy.safetyPolicy.trim()) return "RECEIZ_SUBJECT_MANDATE_SAFETY_POLICY_INVALID";
    return null;
  };

  const prevalidateDerivedCommand = (command: ReceizWorldCommandV1) => {
    if (command.input.kind === "inventory.trade") {
      const fromSubjectId = String(command.input.payload.fromSubjectId ?? "");
      const toSubjectId = String(command.input.payload.toSubjectId ?? "");
      const itemId = String(command.input.payload.itemId ?? "");
      if (!command.input.expectedHeads[fromSubjectId] || !command.input.expectedHeads[toSubjectId]) {
        fail("RECEIZ_SUBJECT_TRADE_EXACT_HEADS_REQUIRED");
      }
      if (!requireSubject(fromSubjectId).inventory.has(itemId)) fail("RECEIZ_SUBJECT_INVENTORY_ITEM_NOT_FOUND");
    }
    if (command.input.kind === "inventory.use") {
      const itemId = String(command.input.payload.itemId ?? "");
      if (!requireSubject(command.input.actorSubjectId).inventory.has(itemId)) fail("RECEIZ_SUBJECT_INVENTORY_ITEM_NOT_FOUND");
    }
  };

  const applyDerivedCommands = (event: ReceizWorldEventV1, commands: readonly ReceizWorldCommandV1[]) => {
    for (const command of commands) {
      const derivedEvent: ReceizWorldEventV1 = Object.freeze({ ...event, kind: command.input.kind, payload: command.input.payload });
      applyRelationshipProjection(derivedEvent);
      applyTradeProjection(derivedEvent);
      if (command.input.kind === "inventory.use") {
        const record = requireSubject(command.input.actorSubjectId);
        const itemId = String(command.input.payload.itemId ?? "");
        const item = record.inventory.get(itemId);
        if (item) {
          const quantity = BigInt(item.quantity);
          if (quantity <= 1n) record.inventory.delete(itemId);
          else record.inventory.set(itemId, Object.freeze({ ...item, quantity: String(quantity - 1n) }));
        }
      }
    }
  };

  const commitCommands = (input: Readonly<{
    aggregateId: string;
    attemptId: string;
    idempotencyKey: string;
    worldId: string;
    actorSubjectId: string;
    participants: readonly string[];
    commands: readonly ReceizWorldCommandV1[];
    priorHeads: Readonly<Record<string, string>>;
    mandateDigest?: string;
  }>): ReceizWorldExecutionResultV1 => {
    const priorWorldHead = worldHead(input.worldId);
    const existingReceiptId = idempotentReceipts.get(`${input.worldId}:${input.idempotencyKey}`);
    if (existingReceiptId) {
      const receipt = receipts.get(existingReceiptId)!;
      return Object.freeze({ ok: true, receipt: clone(receipt), events: Object.freeze(receipt.eventIds.map((id) => clone(eventsById.get(id)!))) });
    }
    for (const command of input.commands) prevalidateDerivedCommand(command);
    const participants = [...new Set(input.participants)].sort();
    const nextHeads = freezeRecord(Object.fromEntries(participants.map((subjectId) => [subjectId, digest({
      kind: "receiz.subject.head.append.v1",
      priorHead: input.priorHeads[subjectId],
      aggregateId: input.aggregateId,
      subjectId,
      reducerDigest: options.reducerDigest,
    })])));
    // Validate and stage every affected artifact before advancing the
    // deterministic clock. Rejection must mean zero writes, including Kai.
    const stagedArtifacts = new Map<string, ReceizSubjectArtifactV1>();
    for (const subjectId of participants) {
      const record = requireSubject(subjectId);
      let namespaces = record.artifact.subject.namespaces;
      for (const command of input.commands) namespaces = applyNamespaceUpdates(namespaces, subjectId, command.input.payload);
      const current = record.artifact.subject;
      stagedArtifacts.set(subjectId, sealSubject({
        subjectId: current.subjectId,
        proofObjectId: current.proofObjectId,
        subjectType: current.subjectType,
        ownerReceizId: current.ownerReceizId,
        identityDigest: current.identityDigest,
        genesisDigest: current.genesisDigest,
        createdAtKai: current.createdAtKai,
        head: nextHeads[subjectId]!,
        ownershipHead: current.ownershipHead,
        currentOwnerReceizId: current.currentOwnerReceizId,
        namespaces,
      }, options.registryDigest, options.reducerDigest));
    }
    const eventKai = nextKai();
    const eventId = digest({
      kind: "receiz.world.event-id.v1",
      aggregateId: input.aggregateId,
      attemptId: input.attemptId,
      priorHeads: input.priorHeads,
      nextHeads,
      priorWorldHead,
      commandDigests: input.commands.map((command) => command.commandDigest),
      kai: eventKai,
    });
    const nextWorldHead = digest({ kind: "receiz.world.head.append.v1", priorWorldHead, eventId });
    const eventPayload = input.commands.length === 1
      ? input.commands[0]!.input.payload
      : Object.freeze({ commands: input.commands.map((command) => command.input) });
    const event: ReceizWorldEventV1 = Object.freeze({
      schema: "receiz.world.event.v1",
      eventId,
      commandId: input.aggregateId,
      worldId: input.worldId,
      kind: input.commands.length === 1 ? input.commands[0]!.input.kind : "world.transaction",
      actorSubjectId: input.actorSubjectId,
      participantSubjectIds: Object.freeze(participants),
      payload: clone(eventPayload),
      causalParents: Object.freeze([priorWorldHead, ...Object.values(input.priorHeads)]),
      priorHeads: freezeRecord({ ...input.priorHeads }),
      nextHeads,
      priorWorldHead,
      worldHead: nextWorldHead,
      ...(input.mandateDigest ? { mandateDigest: input.mandateDigest } : {}),
      kai: eventKai,
      registryDigest: options.registryDigest,
      reducerDigest: options.reducerDigest,
    });
    worldHeads.set(input.worldId, nextWorldHead);
    worldEvents.set(input.worldId, [...(worldEvents.get(input.worldId) ?? []), event]);
    eventsById.set(eventId, event);
    for (const subjectId of participants) {
      const record = requireSubject(subjectId);
      record.artifact = stagedArtifacts.get(subjectId)!;
      record.events.push(event);
      appendProofForEvent(record, event);
    }
    applyDerivedCommands(event, input.commands);
    const receiptBasis = {
      commandId: input.aggregateId,
      attemptId: input.attemptId,
      eventIds: [eventId],
      actorSubjectId: input.actorSubjectId,
      ...(input.mandateDigest ? { mandateDigest: input.mandateDigest } : {}),
      priorHeads: input.priorHeads,
      nextHeads,
      worldHead: nextWorldHead,
      reducerDigest: options.reducerDigest,
      registryDigest: options.registryDigest,
      kai: eventKai,
    };
    const receipt: ReceizWorldReceiptV1 = Object.freeze({
      schema: "receiz.world.receipt.v1",
      receiptId: digest({ kind: "receiz.world.receipt.v1", ...receiptBasis }),
      ...clone(receiptBasis),
      eventIds: Object.freeze([eventId]),
      priorHeads: freezeRecord({ ...input.priorHeads }),
      nextHeads,
    });
    receipts.set(receipt.receiptId, receipt);
    idempotentReceipts.set(`${input.worldId}:${input.idempotencyKey}`, receipt.receiptId);
    for (const command of input.commands) {
      if (!command.input.mandateDigest) continue;
      requireSubject(command.input.actorSubjectId).runtimeExecutions.push(Object.freeze({
        mandateDigest: command.input.mandateDigest,
        kai: eventKai,
        valueMinor: typeof command.input.payload.valueMinor === "string" && /^\d+$/.test(command.input.payload.valueMinor)
          ? command.input.payload.valueMinor
          : "0",
      }));
    }
    return Object.freeze({ ok: true, receipt: clone(receipt), events: Object.freeze([clone(event)]) });
  };

  const executeCommand = (
    plan: ReceizWorldCommandPlanV1,
    authority: ReceizWorldAuthorityV1,
  ): ReceizWorldExecutionResultV1 => {
    if (commandPlanIntegrityValid(plan)) {
      const existingReceiptId = idempotentReceipts.get(`${plan.command.input.worldId}:${plan.command.input.idempotencyKey}`);
      if (existingReceiptId) {
        const receipt = receipts.get(existingReceiptId)!;
        return Object.freeze({
          ok: true,
          receipt: clone(receipt),
          events: Object.freeze(receipt.eventIds.map((eventId) => clone(eventsById.get(eventId)!))),
        });
      }
    }
    const validation = validateCommand(plan);
    if (!validation.ok) return validation;
    const input = plan.command.input;
    const authorizationCode = authorize(
      input.actorSubjectId,
      input.worldId,
      input.kind,
      input.targetIds ?? [],
      input.payload,
      input.mandateDigest,
      authority,
    );
    if (authorizationCode) {
      return zeroWrite({
        code: authorizationCode,
        commandId: plan.command.commandId,
        attemptId: input.attemptId,
        currentHeads: headsFor(Object.keys(input.expectedHeads)),
        worldHead: worldHead(input.worldId),
        registryDigest: options.registryDigest,
        reducerDigest: options.reducerDigest,
      });
    }
    try {
      return commitCommands({
        aggregateId: plan.command.commandId,
        attemptId: input.attemptId,
        idempotencyKey: input.idempotencyKey,
        worldId: input.worldId,
        actorSubjectId: input.actorSubjectId,
        participants: Object.keys(input.expectedHeads),
        commands: [plan.command],
        priorHeads: input.expectedHeads,
        ...(input.mandateDigest ? { mandateDigest: input.mandateDigest } : {}),
      });
    } catch (error) {
      return zeroWrite({
        code: error instanceof Error ? error.message : "RECEIZ_WORLD_COMMAND_REJECTED",
        commandId: plan.command.commandId,
        attemptId: input.attemptId,
        currentHeads: headsFor(Object.keys(input.expectedHeads)),
        worldHead: worldHead(input.worldId),
        registryDigest: options.registryDigest,
        reducerDigest: options.reducerDigest,
      });
    }
  };

  const planTransaction = (input: Readonly<{
    participants: readonly string[];
    expectedHeads: Readonly<Record<string, string>>;
    commands: readonly ReceizWorldCommandV1[];
  }>): ReceizWorldTransactionV1 => {
    if (!input.commands.length || !input.participants.length) fail("RECEIZ_WORLD_TRANSACTION_EMPTY");
    const participants = Object.freeze([...new Set(input.participants)].sort());
    if (participants.some((subjectId) => !Object.hasOwn(input.expectedHeads, subjectId))) {
      fail("RECEIZ_WORLD_TRANSACTION_EXACT_HEADS_REQUIRED");
    }
    const worldId = input.commands[0]!.input.worldId;
    if (input.commands.some((command) => command.input.worldId !== worldId)) fail("RECEIZ_WORLD_TRANSACTION_WORLD_MISMATCH");
    const basis = {
      worldId,
      participants,
      expectedHeads: freezeRecord({ ...input.expectedHeads }),
      commands: Object.freeze(clone(input.commands)),
      registryDigest: options.registryDigest,
      reducerDigest: options.reducerDigest,
    };
    const transactionDigest = digest({ schema: "receiz.world.transaction.v1", ...basis });
    return Object.freeze({
      schema: "receiz.world.transaction.v1",
      transactionId: transactionDigest,
      transactionDigest,
      ...basis,
    });
  };

  const executeTransaction = (
    transaction: ReceizWorldTransactionV1,
    authority: ReceizWorldAuthorityV1 | ReceizWorldTransactionAuthorityV1,
  ): ReceizWorldExecutionResultV1 => {
    const basis = {
      worldId: transaction.worldId,
      participants: transaction.participants,
      expectedHeads: transaction.expectedHeads,
      commands: transaction.commands,
      registryDigest: transaction.registryDigest,
      reducerDigest: transaction.reducerDigest,
    };
    if (digest({ schema: "receiz.world.transaction.v1", ...basis }) !== transaction.transactionDigest
      || transaction.transactionId !== transaction.transactionDigest) {
      return zeroWrite({
        code: "RECEIZ_WORLD_TRANSACTION_DIGEST_INVALID",
        commandId: transaction.transactionId,
        worldHead: worldHead(transaction.worldId),
        registryDigest: options.registryDigest,
        reducerDigest: options.reducerDigest,
      });
    }
    const existingReceiptId = idempotentReceipts.get(`${transaction.worldId}:transaction:${transaction.transactionId}`);
    if (existingReceiptId) {
      const receipt = receipts.get(existingReceiptId)!;
      return Object.freeze({
        ok: true,
        receipt: clone(receipt),
        events: Object.freeze(receipt.eventIds.map((eventId) => clone(eventsById.get(eventId)!))),
      });
    }
    const first = transaction.commands[0]!;
    const authorityFor = (actorSubjectId: string): ReceizWorldAuthorityV1 | null => {
      if ("authorities" in authority) return authority.authorities[actorSubjectId] ?? null;
      return authority.actorSubjectId === actorSubjectId ? authority : null;
    };
    const stale = validateHeads({
      worldId: transaction.worldId,
      expectedHeads: transaction.expectedHeads,
      expectedWorldHead: first.input.expectedWorldHead,
      commandId: transaction.transactionId,
      attemptId: first.input.attemptId,
    });
    if (stale) return stale;
    for (const command of transaction.commands) {
      if (!transaction.participants.includes(command.input.actorSubjectId)) {
        return zeroWrite({
          code: "RECEIZ_WORLD_TRANSACTION_ACTOR_NOT_PARTICIPANT",
          commandId: transaction.transactionId,
          attemptId: command.input.attemptId,
          currentHeads: headsFor(transaction.participants),
          worldHead: worldHead(transaction.worldId),
          registryDigest: options.registryDigest,
          reducerDigest: options.reducerDigest,
        });
      }
      const commandAuthority = authorityFor(command.input.actorSubjectId);
      if (!commandAuthority) {
        return zeroWrite({
          code: "RECEIZ_WORLD_TRANSACTION_PARTICIPANT_AUTHORITY_REQUIRED",
          commandId: transaction.transactionId,
          attemptId: command.input.attemptId,
          currentHeads: headsFor(transaction.participants),
          worldHead: worldHead(transaction.worldId),
          registryDigest: options.registryDigest,
          reducerDigest: options.reducerDigest,
        });
      }
      const authorizationCode = authorize(
        command.input.actorSubjectId,
        command.input.worldId,
        command.input.kind,
        command.input.targetIds ?? [],
        command.input.payload,
        command.input.mandateDigest,
        commandAuthority,
      );
      if (authorizationCode) {
        return zeroWrite({
          code: authorizationCode,
          commandId: transaction.transactionId,
          attemptId: command.input.attemptId,
          currentHeads: headsFor(transaction.participants),
          worldHead: worldHead(transaction.worldId),
          registryDigest: options.registryDigest,
          reducerDigest: options.reducerDigest,
        });
      }
    }
    try {
      return commitCommands({
        aggregateId: transaction.transactionId,
        attemptId: first.input.attemptId,
        idempotencyKey: `transaction:${transaction.transactionId}`,
        worldId: transaction.worldId,
        actorSubjectId: first.input.actorSubjectId,
        participants: transaction.participants,
        commands: transaction.commands,
        priorHeads: transaction.expectedHeads,
        ...(first.input.mandateDigest ? { mandateDigest: first.input.mandateDigest } : {}),
      });
    } catch (error) {
      return zeroWrite({
        code: error instanceof Error ? error.message : "RECEIZ_WORLD_TRANSACTION_REJECTED",
        commandId: transaction.transactionId,
        attemptId: first.input.attemptId,
        currentHeads: headsFor(transaction.participants),
        worldHead: worldHead(transaction.worldId),
        registryDigest: options.registryDigest,
        reducerDigest: options.reducerDigest,
      });
    }
  };

  const enqueueTick = (input: ReceizSubjectRuntimeTickInput): ReceizSubjectRuntimeJobV1 => {
    const record = requireSubject(input.subjectId);
    assertKai(input.runAfter, "RECEIZ_SUBJECT_RUNTIME_RUN_AFTER_INVALID");
    if (input.expectedHead !== record.artifact.subject.head) fail("RECEIZ_SUBJECT_RUNTIME_STALE_HEAD");
    const mandate = record.mandates.get(input.mandateDigest);
    if (!mandate || mandate.status !== "active") fail("RECEIZ_SUBJECT_RUNTIME_MANDATE_INACTIVE");
    if (BigInt(mandate.policy.expiresAtKai) <= kai) fail("RECEIZ_SUBJECT_RUNTIME_MANDATE_EXPIRED");
    const existing = [...record.jobs.values()].find((job) => job.input.idempotencyKey === input.idempotencyKey);
    if (existing) return clone(existing);
    const jobId = digest({ schema: "receiz.subject.runtime_tick.v1", input });
    const job: ReceizSubjectRuntimeJobV1 = Object.freeze({
      jobId,
      input: clone(input),
      status: "queued",
      leaseUntilKai: null,
      attemptCount: 0,
      eventIds: Object.freeze([]),
      failureCode: null,
    });
    record.jobs.set(jobId, job);
    return clone(job);
  };

  const runtimeStatus = (jobId: string) => {
    for (const record of subjects.values()) {
      const job = record.jobs.get(jobId);
      if (job) return clone(job);
    }
    fail("RECEIZ_SUBJECT_RUNTIME_JOB_NOT_FOUND");
  };

  const pauseRuntime = (subjectId: string) => {
    const record = requireSubject(subjectId);
    const cancelled: string[] = [];
    for (const [jobId, job] of record.jobs) {
      if (job.status !== "queued" && job.status !== "leased") continue;
      record.jobs.set(jobId, Object.freeze({ ...job, status: "cancelled", failureCode: "RECEIZ_SUBJECT_RUNTIME_PAUSED" }));
      cancelled.push(jobId);
    }
    return Object.freeze({ subjectId, cancelledJobIds: Object.freeze(cancelled), writes: cancelled.length });
  };

  const catchUpRuntime = async (subjectId: string, input: Readonly<{
    maximumTicks?: number;
    throughKai?: string;
    worldId?: string;
  }> = {}) => {
    const record = requireSubject(subjectId);
    const maximumTicks = Math.min(100, Math.max(0, Math.trunc(input.maximumTicks ?? 10)));
    const throughKai = BigInt(input.throughKai ?? currentKai());
    const completed: ReceizSubjectRuntimeJobV1[] = [];
    const eligible = [...record.jobs.values()]
      .filter((job) => (
        job.status === "queued"
        || (job.status === "leased" && job.leaseUntilKai !== null && BigInt(job.leaseUntilKai) <= throughKai)
      ) && BigInt(job.input.runAfter) <= throughKai)
      .sort((left, right) => BigInt(left.input.runAfter) < BigInt(right.input.runAfter) ? -1 : 1)
      .slice(0, maximumTicks);
    for (const job of eligible) {
      const latest = requireSubject(subjectId);
      const mandate = latest.mandates.get(job.input.mandateDigest);
      let failureCode: string | null = null;
      if (!mandate || mandate.status !== "active") failureCode = "RECEIZ_SUBJECT_RUNTIME_MANDATE_INACTIVE";
      else if (BigInt(mandate.policy.expiresAtKai) <= kai) failureCode = "RECEIZ_SUBJECT_RUNTIME_MANDATE_EXPIRED";
      else if (latest.artifact.subject.head !== job.input.expectedHead) failureCode = "RECEIZ_SUBJECT_RUNTIME_STALE_HEAD";
      else if (worldHead(input.worldId ?? "world:default") !== job.input.worldHead) failureCode = "RECEIZ_SUBJECT_RUNTIME_STALE_WORLD_HEAD";
      if (failureCode) {
        const failed = Object.freeze({ ...job, status: "stale" as const, attemptCount: job.attemptCount + 1, failureCode });
        latest.jobs.set(job.jobId, failed);
        completed.push(failed);
        continue;
      }
      const executableMandate = mandate!;
      const leased = Object.freeze({
        ...job,
        status: "leased" as const,
        attemptCount: job.attemptCount + 1,
        leaseUntilKai: String(kai + 5n),
      });
      latest.jobs.set(job.jobId, leased);
      try {
        const twin = await twinMessage(subjectId, {
          message: "Autonomous tick: propose only an action permitted by the active mandate.",
          ownerReceizId: latest.artifact.subject.currentOwnerReceizId,
          contextHead: latest.artifact.subject.head,
          expectedSubjectDigest: latest.artifact.artifactDigest,
          responseMode: "text",
          clientMessageId: job.jobId,
        });
        if (twin.proposedIntent.modelAudit.model === "model-failure-boundary") {
          const failed = Object.freeze({ ...leased, status: "failed" as const, leaseUntilKai: null, eventIds: Object.freeze([]), failureCode: "RECEIZ_SUBJECT_RUNTIME_MODEL_FAILURE_ZERO_EVENTS" });
          latest.jobs.set(job.jobId, failed);
          completed.push(failed);
          continue;
        }
        if (!executableMandate.policy.modelProviderAllowlist.includes(twin.proposedIntent.modelAudit.provider)) {
          const failed = Object.freeze({ ...leased, status: "failed" as const, leaseUntilKai: null, eventIds: Object.freeze([]), failureCode: "RECEIZ_SUBJECT_RUNTIME_MODEL_PROVIDER_FORBIDDEN" });
          latest.jobs.set(job.jobId, failed);
          completed.push(failed);
          continue;
        }
        const proposal = twin.proposedIntent.proposedIntents[0];
        if (!proposal) {
          const done = Object.freeze({ ...leased, status: "completed" as const, leaseUntilKai: null, eventIds: Object.freeze([]) });
          latest.jobs.set(job.jobId, done);
          completed.push(done);
          continue;
        }
        const worldId = input.worldId ?? "world:default";
        const participantIds = [...new Set([subjectId, ...proposal.targetIds])];
        const commandPlan = planCommand({
          worldId,
          actorSubjectId: subjectId,
          kind: proposal.kind,
          targetIds: proposal.targetIds,
          payload: Object.freeze({ reason: proposal.reason, confidence: proposal.confidence, sourceIntentDigest: twin.proposedIntent.modelAudit.outputDigest }),
          expectedHeads: headsFor(participantIds),
          expectedWorldHead: worldHead(worldId),
          attemptId: `runtime:${job.jobId}:${leased.attemptCount}`,
          idempotencyKey: job.input.idempotencyKey,
          mandateDigest: job.input.mandateDigest,
        });
        const execution = executeCommand(commandPlan, { actorSubjectId: subjectId, mandateDigest: job.input.mandateDigest });
        if (!execution.ok) {
          const failed = Object.freeze({ ...leased, status: "failed" as const, leaseUntilKai: null, failureCode: execution.code });
          latest.jobs.set(job.jobId, failed);
          completed.push(failed);
        } else {
          const done = Object.freeze({
            ...leased,
            status: "completed" as const,
            leaseUntilKai: null,
            eventIds: Object.freeze([...execution.receipt.eventIds]),
            failureCode: null,
          });
          latest.jobs.set(job.jobId, done);
          completed.push(done);
        }
      } catch {
        const failed = Object.freeze({
          ...leased,
          status: "failed" as const,
          leaseUntilKai: null,
          failureCode: "RECEIZ_SUBJECT_RUNTIME_MODEL_FAILURE_ZERO_EVENTS",
        });
        latest.jobs.set(job.jobId, failed);
        completed.push(failed);
      }
    }
    return Object.freeze({ subjectId, processed: completed.length, jobs: Object.freeze(clone(completed)) });
  };

  const previewTransfer = (input: Readonly<{
    subjectId: string;
    policy: ReceizBearerTransferPolicyV1;
  }>): ReceizBearerTransferPlanV1 => {
    const record = requireSubject(input.subjectId);
    if (record.pendingTransferId) fail("RECEIZ_SUBJECT_PENDING_TRANSFER_CUSTODY");
    assertKai(input.policy.expiresAtKai, "RECEIZ_BEARER_TRANSFER_EXPIRY_INVALID");
    if (BigInt(input.policy.expiresAtKai) <= kai) fail("RECEIZ_BEARER_TRANSFER_ALREADY_EXPIRED");
    if (input.policy.openBearer === (input.policy.recipientReceizId !== null)) {
      fail("RECEIZ_BEARER_TRANSFER_RECIPIENT_MODE_INVALID");
    }
    for (const itemId of record.inventory.keys()) {
      if (!input.policy.inventoryDisposition[itemId]) fail("RECEIZ_BEARER_TRANSFER_INVENTORY_AMBIGUOUS");
    }
    const policyDigest = digest(input.policy);
    const basis = {
      subjectId: input.subjectId,
      subjectDigest: record.artifact.artifactDigest,
      expectedSubjectHead: record.artifact.subject.head,
      expectedOwnershipHead: record.artifact.subject.ownershipHead,
      currentOwnerReceizId: record.artifact.subject.currentOwnerReceizId,
      policy: clone(input.policy),
      policyDigest,
      registryDigest: options.registryDigest,
      reducerDigest: options.reducerDigest,
    };
    const transferDigest = digest({ schema: "receiz.bearer.transfer_plan.v1", ...basis });
    return Object.freeze({
      schema: "receiz.bearer.transfer_plan.v1",
      transferId: transferDigest,
      transferDigest,
      ...basis,
    });
  };

  const issueTransferInstrument = (input: Readonly<{
    plan: ReceizBearerTransferPlanV1;
    ownerCapability: ReceizBearerCapabilityV1;
  }>): ReceizBearerInstrumentV1 => {
    const record = requireSubject(input.plan.subjectId);
    const expected = previewTransfer({ subjectId: input.plan.subjectId, policy: input.plan.policy });
    if (digest(expected) !== digest(input.plan)
      || input.ownerCapability.receizId !== record.artifact.subject.currentOwnerReceizId
      || !DIGEST_RE.test(input.ownerCapability.capabilityDigest)) fail("RECEIZ_BEARER_TRANSFER_PLAN_CONFIRMATION_INVALID");
    const issuedAtKai = nextKai();
    const oneTimeClaimDigest = digest({
      kind: "receiz.bearer.one-time-claim.v1",
      transferDigest: input.plan.transferDigest,
      capabilityDigest: input.ownerCapability.capabilityDigest,
      issuedAtKai,
    });
    const exactBasis = {
      schema: "receiz.bearer.instrument.v1" as const,
      plan: input.plan,
      oneTimeClaimDigest,
      issuedAtKai,
    };
    const exactBytesB64u = receizBase64UrlEncode(encoder.encode(JSON.stringify(exactBasis)));
    const instrument: ReceizBearerInstrumentV1 = Object.freeze({
      ...clone(exactBasis),
      exactBytesB64u,
      artifactDigest: digest({ exactBytesB64u }),
      status: input.plan.policy.requiresRecipientAcceptance ? "pending-acceptance" : "issued",
    });
    record.pendingTransferId = input.plan.transferId;
    transfers.set(input.plan.transferId, { instrument, status: instrument.status, receipt: null, claimCapabilityDigest: null });
    const pendingNamespace = encodeReceizSubjectNamespaceBytes({
      transferId: input.plan.transferId,
      custody: "pending-transfer",
      policyDigest: input.plan.policyDigest,
      issuedAtKai,
    });
    const namespaces = freezeRecord({ ...record.artifact.subject.namespaces, canonicalState: pendingNamespace });
    const pendingHead = digest({
      kind: "receiz.subject.transfer.pending.v1",
      priorHead: record.artifact.subject.head,
      transferId: input.plan.transferId,
      policyDigest: input.plan.policyDigest,
    });
    replaceSubject(record, { head: pendingHead, namespaces });
    record.brain.append({
      subjectId: input.plan.subjectId,
      subjectDigest: record.artifact.artifactDigest,
      subjectHead: record.artifact.subject.head,
      historyHead: input.plan.transferDigest,
      primaryObject: createReceizSubjectPrimaryProofObjectV1({
        subjectId: input.plan.subjectId,
        proofObjectId: `transfer-instrument:${instrument.artifactDigest}`,
        kai: issuedAtKai,
        visibility: "private",
        exactBytes: receizBase64UrlDecode(instrument.exactBytesB64u),
        text: [{ kind: "event", text: "Pending bearer transfer custody" }],
      }),
    });
    return clone(instrument);
  };

  const inspectInstrument = (instrument: ReceizBearerInstrumentV1) => {
    try {
      const bytes = receizBase64UrlDecode(instrument.exactBytesB64u);
      const decoded = JSON.parse(decoder.decode(bytes)) as {
        schema: string;
        plan: ReceizBearerTransferPlanV1;
        oneTimeClaimDigest: string;
        issuedAtKai: string;
      };
      const visibleBasis = {
        schema: instrument.schema,
        plan: instrument.plan,
        oneTimeClaimDigest: instrument.oneTimeClaimDigest,
        issuedAtKai: instrument.issuedAtKai,
      };
      const planBasis = {
        subjectId: instrument.plan.subjectId,
        subjectDigest: instrument.plan.subjectDigest,
        expectedSubjectHead: instrument.plan.expectedSubjectHead,
        expectedOwnershipHead: instrument.plan.expectedOwnershipHead,
        currentOwnerReceizId: instrument.plan.currentOwnerReceizId,
        policy: instrument.plan.policy,
        policyDigest: instrument.plan.policyDigest,
        registryDigest: instrument.plan.registryDigest,
        reducerDigest: instrument.plan.reducerDigest,
      };
      const valid = decoded.schema === "receiz.bearer.instrument.v1"
        && digest({ exactBytesB64u: instrument.exactBytesB64u }) === instrument.artifactDigest
        && digest(decoded) === digest(visibleBasis)
        && instrument.plan.schema === "receiz.bearer.transfer_plan.v1"
        && digest(instrument.plan.policy) === instrument.plan.policyDigest
        && digest({ schema: "receiz.bearer.transfer_plan.v1", ...planBasis }) === instrument.plan.transferDigest
        && instrument.plan.transferId === instrument.plan.transferDigest;
      return Object.freeze({
        valid,
        offlineVerified: valid,
        instrument: clone(instrument),
        sourcePrimitive: "receiz.bearer.instrument.v1" as const,
        registryDigest: instrument.plan.registryDigest,
        reducerDigest: instrument.plan.reducerDigest,
      });
    } catch {
      return Object.freeze({
        valid: false,
        offlineVerified: false,
        instrument: clone(instrument),
        sourcePrimitive: "receiz.bearer.instrument.v1" as const,
        registryDigest: instrument.plan.registryDigest,
        reducerDigest: instrument.plan.reducerDigest,
      });
    }
  };

  const claimInstrument = (instrument: ReceizBearerInstrumentV1, recipientCapability: ReceizBearerCapabilityV1) => {
    const inspection = inspectInstrument(instrument);
    const stored = transfers.get(instrument.plan.transferId);
    if (!inspection.valid || !stored || stored.instrument.artifactDigest !== instrument.artifactDigest) {
      return Object.freeze({ ok: false as const, code: "RECEIZ_BEARER_INSTRUMENT_INVALID", writes: 0 as const });
    }
    if (stored.receipt) {
      if (stored.claimCapabilityDigest !== recipientCapability.capabilityDigest) {
        return Object.freeze({ ok: false as const, code: "RECEIZ_BEARER_INSTRUMENT_REPLAYED", writes: 0 as const });
      }
      return Object.freeze({ ok: true as const, receipt: clone(stored.receipt), idempotent: true as const });
    }
    if (claimedInstrumentDigests.has(instrument.artifactDigest)) {
      return Object.freeze({ ok: false as const, code: "RECEIZ_BEARER_INSTRUMENT_REPLAYED", writes: 0 as const });
    }
    if (stored.status === "cancelled") return Object.freeze({ ok: false as const, code: "RECEIZ_BEARER_INSTRUMENT_CANCELLED", writes: 0 as const });
    if (BigInt(instrument.plan.policy.expiresAtKai) <= kai) {
      return Object.freeze({ ok: false as const, code: "RECEIZ_BEARER_INSTRUMENT_EXPIRED", writes: 0 as const });
    }
    const record = requireSubject(instrument.plan.subjectId);
    if (record.pendingTransferId !== instrument.plan.transferId) {
      return Object.freeze({ ok: false as const, code: "RECEIZ_BEARER_PENDING_CUSTODY_MISMATCH", writes: 0 as const });
    }
    if (record.artifact.subject.ownershipHead !== instrument.plan.expectedOwnershipHead) {
      return Object.freeze({ ok: false as const, code: "RECEIZ_BEARER_STALE_OWNERSHIP_HEAD", writes: 0 as const });
    }
    const expectedPendingHead = digest({
      kind: "receiz.subject.transfer.pending.v1",
      priorHead: instrument.plan.expectedSubjectHead,
      transferId: instrument.plan.transferId,
      policyDigest: instrument.plan.policyDigest,
    });
    if (record.artifact.subject.head !== expectedPendingHead) {
      return Object.freeze({ ok: false as const, code: "RECEIZ_BEARER_STALE_SUBJECT_HEAD", writes: 0 as const });
    }
    if (!instrument.plan.policy.openBearer && instrument.plan.policy.recipientReceizId !== recipientCapability.receizId) {
      return Object.freeze({ ok: false as const, code: "RECEIZ_BEARER_RECIPIENT_MISMATCH", writes: 0 as const });
    }
    if (!DIGEST_RE.test(recipientCapability.capabilityDigest)) {
      return Object.freeze({ ok: false as const, code: "RECEIZ_BEARER_RECIPIENT_CAPABILITY_INVALID", writes: 0 as const });
    }
    const prior = record.artifact.subject;
    const transitionKai = nextKai();
    const nextOwnershipHead = digest({
      schema: "receiz.subject.ownership_transition.v1",
      priorOwnershipHead: prior.ownershipHead,
      transferId: instrument.plan.transferId,
      priorOwnerReceizId: prior.currentOwnerReceizId,
      nextOwnerReceizId: recipientCapability.receizId,
      identityDigest: prior.identityDigest,
      capabilityDigest: recipientCapability.capabilityDigest,
      kai: transitionKai,
    });
    const nextSubjectHead = digest({
      kind: "receiz.subject.head.ownership-transition.v1",
      priorHead: prior.head,
      nextOwnershipHead,
      transferId: instrument.plan.transferId,
    });
    const revokedMandateDigests: string[] = [];
    const revokedCapabilityDigests: string[] = [];
    const cancelledRuntimeJobIds: string[] = [];
    for (const [mandateDigest, mandate] of record.mandates) {
      if (mandate.status === "revoked") continue;
      record.mandates.set(mandateDigest, Object.freeze({ ...mandate, status: "revoked", revokedAtKai: transitionKai }));
      revokedMandateDigests.push(mandateDigest);
      if (mandate.activatedCapabilityDigest) revokedCapabilityDigests.push(mandate.activatedCapabilityDigest);
    }
    for (const [jobId, job] of record.jobs) {
      if (job.status !== "queued" && job.status !== "leased") continue;
      record.jobs.set(jobId, Object.freeze({ ...job, status: "cancelled", failureCode: "RECEIZ_SUBJECT_OWNERSHIP_CHANGED" }));
      cancelledRuntimeJobIds.push(jobId);
    }
    const disposedItems: Array<{ itemId: string; disposition: string }> = [];
    for (const [itemId, disposition] of Object.entries(instrument.plan.policy.inventoryDisposition)) {
      const item = record.inventory.get(itemId);
      if (!item) continue;
      disposedItems.push({ itemId, disposition });
      if (disposition !== "transfer") record.inventory.delete(itemId);
    }
    const transferProjection = {
      transferId: instrument.plan.transferId,
      custody: "owned",
      ownerReceizId: recipientCapability.receizId,
      priorOwnerReceizId: prior.currentOwnerReceizId,
      memoryPolicy: instrument.plan.policy.priorOwnerConversationPolicy,
      inventoryDisposition: disposedItems,
      kai: transitionKai,
    };
    const namespaces = freezeRecord({
      ...prior.namespaces,
      canonicalState: encodeReceizSubjectNamespaceBytes(transferProjection),
      applicationNamespaces: encodeReceizSubjectNamespaceBytes({
        prior: prior.namespaces.applicationNamespaces,
        transferPolicyDigest: instrument.plan.policyDigest,
        priorOwnerConversationPolicy: instrument.plan.policy.priorOwnerConversationPolicy,
      }),
    });
    replaceSubject(record, {
      head: nextSubjectHead,
      ownershipHead: nextOwnershipHead,
      currentOwnerReceizId: recipientCapability.receizId,
      namespaces,
    });
    record.pendingTransferId = null;
    record.privateConversationPolicy = instrument.plan.policy.priorOwnerConversationPolicy;
    const worldId = "world:ownership";
    const priorWorldHead = worldHead(worldId);
    const eventId = digest({
      schema: "receiz.subject.ownership_transition.v1",
      transferId: instrument.plan.transferId,
      subjectId: prior.subjectId,
      priorSubjectHead: prior.head,
      nextSubjectHead,
      priorOwnershipHead: prior.ownershipHead,
      nextOwnershipHead,
      kai: transitionKai,
    });
    const nextWorldHead = digest({ kind: "receiz.world.head.append.v1", priorWorldHead, eventId });
    const event: ReceizWorldEventV1 = Object.freeze({
      schema: "receiz.world.event.v1",
      eventId,
      commandId: instrument.plan.transferId,
      worldId,
      kind: "subject.ownership.transfer",
      actorSubjectId: prior.subjectId,
      participantSubjectIds: Object.freeze([prior.subjectId]),
      payload: Object.freeze({
        summary: `Ownership transferred to ${recipientCapability.receizId}`,
        priorOwnerReceizId: prior.currentOwnerReceizId,
        nextOwnerReceizId: recipientCapability.receizId,
        transferPolicyDigest: instrument.plan.policyDigest,
      }),
      causalParents: Object.freeze([priorWorldHead, prior.head, prior.ownershipHead]),
      priorHeads: freezeRecord({ [prior.subjectId]: prior.head }),
      nextHeads: freezeRecord({ [prior.subjectId]: nextSubjectHead }),
      priorWorldHead,
      worldHead: nextWorldHead,
      kai: transitionKai,
      registryDigest: options.registryDigest,
      reducerDigest: options.reducerDigest,
    });
    worldHeads.set(worldId, nextWorldHead);
    worldEvents.set(worldId, [...(worldEvents.get(worldId) ?? []), event]);
    eventsById.set(eventId, event);
    record.events.push(event);
    appendProofForEvent(record, event);
    claimedInstrumentDigests.add(instrument.artifactDigest);
    stored.status = "claimed";
    stored.claimCapabilityDigest = recipientCapability.capabilityDigest;
    const receiptBasis = {
      transferId: instrument.plan.transferId,
      instrumentDigest: instrument.artifactDigest,
      subjectId: prior.subjectId,
      identityDigest: prior.identityDigest,
      priorOwnerReceizId: prior.currentOwnerReceizId,
      nextOwnerReceizId: recipientCapability.receizId,
      priorSubjectHead: prior.head,
      nextSubjectHead,
      priorOwnershipHead: prior.ownershipHead,
      nextOwnershipHead,
      eventIds: [eventId],
      revokedMandateDigests,
      revokedCapabilityDigests,
      cancelledRuntimeJobIds,
      inventoryDispositionDigest: digest(instrument.plan.policy.inventoryDisposition),
      memoryPolicyDigest: digest({ policy: instrument.plan.policy.priorOwnerConversationPolicy }),
      sealedArtifact: record.artifact,
      kai: transitionKai,
      registryDigest: options.registryDigest,
      reducerDigest: options.reducerDigest,
    };
    const receipt: ReceizBearerTransferReceiptV1 = Object.freeze({
      schema: "receiz.bearer.transfer_receipt.v1",
      receiptId: digest({ schema: "receiz.bearer.transfer_receipt.v1", ...receiptBasis }),
      ...clone(receiptBasis),
      eventIds: Object.freeze([eventId]),
      revokedMandateDigests: Object.freeze(revokedMandateDigests),
      revokedCapabilityDigests: Object.freeze(revokedCapabilityDigests),
      cancelledRuntimeJobIds: Object.freeze(cancelledRuntimeJobIds),
    });
    stored.receipt = receipt;
    return Object.freeze({ ok: true as const, receipt: clone(receipt), idempotent: false as const });
  };

  const cancelTransfer = (transferId: string, ownerCapability: ReceizBearerCapabilityV1) => {
    const stored = transfers.get(transferId);
    if (!stored) return Object.freeze({ ok: false as const, code: "RECEIZ_BEARER_TRANSFER_NOT_FOUND", writes: 0 as const });
    if (stored.receipt) return Object.freeze({ ok: false as const, code: "RECEIZ_BEARER_TRANSFER_ALREADY_CLAIMED", writes: 0 as const });
    if (stored.status === "cancelled") return Object.freeze({ ok: true as const, transferId, status: "cancelled" as const, head: requireSubject(stored.instrument.plan.subjectId).artifact.subject.head, idempotent: true as const });
    const record = requireSubject(stored.instrument.plan.subjectId);
    if (ownerCapability.receizId !== record.artifact.subject.currentOwnerReceizId || !DIGEST_RE.test(ownerCapability.capabilityDigest)) {
      return Object.freeze({ ok: false as const, code: "RECEIZ_BEARER_OWNER_CAPABILITY_INVALID", writes: 0 as const });
    }
    if (record.pendingTransferId !== transferId) return Object.freeze({ ok: false as const, code: "RECEIZ_BEARER_PENDING_CUSTODY_MISMATCH", writes: 0 as const });
    stored.status = "cancelled";
    record.pendingTransferId = null;
    const priorHead = record.artifact.subject.head;
    const head = digest({ kind: "receiz.subject.transfer.cancelled.v1", priorHead, transferId, capabilityDigest: ownerCapability.capabilityDigest });
    replaceSubject(record, {
      head,
      namespaces: freezeRecord({
        ...record.artifact.subject.namespaces,
        canonicalState: encodeReceizSubjectNamespaceBytes({ transferId, custody: "owned", cancelled: true, kai: nextKai() }),
      }),
    });
    return Object.freeze({ ok: true as const, transferId, status: "cancelled" as const, head });
  };

  const transferStatus = (transferId: string) => {
    const stored = transfers.get(transferId);
    if (!stored) fail("RECEIZ_BEARER_TRANSFER_NOT_FOUND");
    const status = stored.status !== "claimed" && stored.status !== "cancelled" && BigInt(stored.instrument.plan.policy.expiresAtKai) <= kai
      ? "expired" as const
      : stored.status;
    return Object.freeze({
      transferId,
      status,
      subjectId: stored.instrument.plan.subjectId,
      instrumentDigest: stored.instrument.artifactDigest,
      receiptId: stored.receipt?.receiptId ?? null,
    });
  };

  const relationshipPlan = (input: Readonly<{
    subjectId: string;
    targetSubjectId: string;
    response?: "accept" | "decline";
    visibility?: "public" | "private";
    worldId?: string;
    attemptId: string;
    idempotencyKey: string;
  }>) => {
    const worldId = input.worldId ?? "world:social";
    const participantIds = [input.subjectId, input.targetSubjectId].sort();
    const relationshipId = digest({ kind: "receiz.subject.relationship-edge.v1", participantIds });
    const commandPlan = planCommand({
      worldId,
      actorSubjectId: input.subjectId,
      kind: input.response ? "relationship.responded" : "relationship.proposed",
      targetIds: [input.targetSubjectId],
      payload: Object.freeze({
        relationshipId,
        visibility: input.visibility ?? "public",
        ...(input.response ? { response: input.response } : {}),
        summary: input.response
          ? `Relationship ${input.response === "accept" ? "accepted" : "declined"}`
          : "Relationship proposed",
      }),
      expectedHeads: headsFor(participantIds),
      expectedWorldHead: worldHead(worldId),
      attemptId: input.attemptId,
      idempotencyKey: input.idempotencyKey,
    });
    return planTransaction({
      participants: participantIds,
      expectedHeads: commandPlan.priorHeads,
      commands: [commandPlan.command],
    });
  };

  const inventoryList = (subjectId: string): ReceizSubjectInventoryV1 => {
    const record = requireSubject(subjectId);
    return Object.freeze({
      schema: "receiz.subject.inventory.v1",
      subjectId,
      head: record.artifact.subject.head,
      items: Object.freeze(clone([...record.inventory.values()].sort((left, right) => left.itemId.localeCompare(right.itemId)))),
    });
  };

  const useInventory = (input: Readonly<{
    subjectId: string;
    itemId: string;
    worldId?: string;
    attemptId: string;
    idempotencyKey: string;
    authority: ReceizWorldAuthorityV1;
  }>) => {
    const worldId = input.worldId ?? "world:inventory";
    const plan = planCommand({
      worldId,
      actorSubjectId: input.subjectId,
      kind: "inventory.use",
      payload: Object.freeze({ itemId: input.itemId, summary: `Used inventory item ${input.itemId}` }),
      expectedHeads: headsFor([input.subjectId]),
      expectedWorldHead: worldHead(worldId),
      attemptId: input.attemptId,
      idempotencyKey: input.idempotencyKey,
      ...(input.authority.mandateDigest ? { mandateDigest: input.authority.mandateDigest } : {}),
    });
    return executeCommand(plan, input.authority);
  };

  const tradePreview = (input: Readonly<{
    fromSubjectId: string;
    toSubjectId: string;
    itemId: string;
    worldId?: string;
    attemptId: string;
    idempotencyKey: string;
    mandateDigest?: string;
  }>) => {
    const item = requireSubject(input.fromSubjectId).inventory.get(input.itemId);
    if (!item) fail("RECEIZ_SUBJECT_INVENTORY_ITEM_NOT_FOUND");
    const worldId = input.worldId ?? "world:inventory";
    const participantIds = [input.fromSubjectId, input.toSubjectId].sort();
    const plan = planCommand({
      worldId,
      actorSubjectId: input.fromSubjectId,
      kind: "inventory.trade",
      targetIds: [input.toSubjectId],
      payload: Object.freeze({
        fromSubjectId: input.fromSubjectId,
        toSubjectId: input.toSubjectId,
        itemId: input.itemId,
        valueMinor: item.valueMinor,
        summary: `Traded inventory item ${input.itemId}`,
      }),
      expectedHeads: headsFor(participantIds),
      expectedWorldHead: worldHead(worldId),
      attemptId: input.attemptId,
      idempotencyKey: input.idempotencyKey,
      ...(input.mandateDigest ? { mandateDigest: input.mandateDigest } : {}),
    });
    const transaction = planTransaction({ participants: participantIds, expectedHeads: plan.priorHeads, commands: [plan.command] });
    const mandate = input.mandateDigest ? requireSubject(input.fromSubjectId).mandates.get(input.mandateDigest) : undefined;
    const requiresOwnerApproval = !mandate || BigInt(item.valueMinor) > BigInt(mandate.policy.approvalThresholdMinor);
    return Object.freeze({
      transaction,
      item: clone(item),
      requiresOwnerApproval,
      exactOwnershipHeads: freezeRecord(Object.fromEntries(participantIds.map((subjectId) => [subjectId, requireSubject(subjectId).artifact.subject.ownershipHead]))),
      previewDigest: digest({ transactionDigest: transaction.transactionDigest, item, requiresOwnerApproval }),
    });
  };

  const worldReplay = (input: Readonly<{ worldId: string; throughHead?: string }>) => {
    const events = worldEvents.get(input.worldId) ?? [];
    const end = input.throughHead
      ? events.findIndex((event) => event.worldHead === input.throughHead) + 1
      : events.length;
    if (input.throughHead && end === 0 && worldHead(input.worldId) !== input.throughHead) fail("RECEIZ_WORLD_REPLAY_HEAD_NOT_FOUND");
    const replayed = events.slice(0, Math.max(0, end));
    const subjectHeads: Record<string, string> = {};
    for (const event of replayed) Object.assign(subjectHeads, event.nextHeads);
    const resolvedWorldHead = replayed.at(-1)?.worldHead ?? digest({ kind: "receiz.world.genesis.v1", worldId: input.worldId, registryDigest: options.registryDigest });
    return Object.freeze({
      schema: "receiz.world.checkpoint.v1" as const,
      worldId: input.worldId,
      throughHead: resolvedWorldHead,
      events: Object.freeze(clone(replayed)),
      subjectHeads: freezeRecord(subjectHeads),
      checkpointDigest: digest({ worldId: input.worldId, resolvedWorldHead, eventIds: replayed.map((event) => event.eventId), subjectHeads }),
      registryDigest: options.registryDigest,
      reducerDigest: options.reducerDigest,
    });
  };

  const subjectAdditions = (subjectId: string, afterHead?: string) => historySubject(
    subjectId,
    afterHead === undefined ? { limit: 1000 } : { afterHead, limit: 1000 },
  );
  const subjectSubscribe = async function* (subjectId: string, input: Readonly<{ afterHead?: string }> = {}) {
    for (const event of subjectAdditions(subjectId, input.afterHead)) yield clone(event);
  };
  const worldSubscribe = async function* (input: Readonly<{ worldId: string; afterHead?: string; types?: readonly string[] }>) {
    const events = worldEvents.get(input.worldId) ?? [];
    const start = input.afterHead ? Math.max(0, events.findIndex((event) => event.worldHead === input.afterHead) + 1) : 0;
    for (const event of events.slice(start)) {
      if (!input.types?.length || input.types.includes(event.kind)) yield clone(event);
    }
  };

  return Object.freeze({
    version: "120.0.0" as const,
    registryDigest: options.registryDigest,
    reducerDigest: options.reducerDigest,
    admitSubject,
    subjects: Object.freeze({
      resolve: resolveSubject,
      verify: verifySubject,
      state: stateSubject,
      history: historySubject,
      additions: (subjectId: string, input: Readonly<{ afterHead?: string }> = {}) => subjectAdditions(subjectId, input.afterHead),
      subscribe: subjectSubscribe,
      brain: Object.freeze({
        head: (subjectId: string) => clone(requireSubject(subjectId).brain.head()),
        search: (subjectId: string, input: ReceizSubjectProofBrainSearchInput) => clone(requireSubject(subjectId).brain.search(input)),
        resolve: (subjectId: string, references: Parameters<ReceizSubjectProofBrain["resolve"]>[0]) => clone(requireSubject(subjectId).brain.resolve(references)),
        stream: (subjectId: string, input: ReceizSubjectProofBrainSearchInput) => requireSubject(subjectId).brain.stream(input),
        append: (subjectId: string, primaryObject: ReceizSubjectPrimaryProofObjectV1) => {
          const record = requireSubject(subjectId);
          return clone(record.brain.append({
            subjectId,
            subjectDigest: record.artifact.artifactDigest,
            subjectHead: record.artifact.subject.head,
            historyHead: record.brain.head().historyHead,
            primaryObject,
          }));
        },
      }),
      twin: Object.freeze({
        profile: (subjectId: string) => {
          const record = requireSubject(subjectId);
          return Object.freeze({
            subjectId,
            subjectType: record.artifact.subject.subjectType,
            head: record.artifact.subject.head,
            selfModel: decodeReceizSubjectNamespaceBytes(record.artifact.subject.namespaces.selfModel!),
            brainHead: clone(record.brain.head()),
          });
        },
        message: twinMessage,
        stream: twinStream,
        exportMind,
        importMind,
        memorySummary: (subjectId: string) => Object.freeze({
          subjectId,
          head: requireSubject(subjectId).artifact.subject.head,
          counts: Object.freeze(Object.fromEntries([...new Set(requireSubject(subjectId).memories.map((memory) => memory.type))]
            .map((type) => [type, requireSubject(subjectId).memories.filter((memory) => memory.type === type).length]))),
          projectionDigest: digest(requireSubject(subjectId).memories.map((memory) => memory.memoryId)),
        }),
        streamPerformance,
      }),
      mandates: Object.freeze({
        get: (subjectId: string) => clone([...requireSubject(subjectId).mandates.values()]),
        plan: planMandate,
        activate: activateMandate,
        pause: (subjectId: string) => updateMandateStatus(subjectId, "paused"),
        revoke: (subjectId: string) => updateMandateStatus(subjectId, "revoked"),
        explain: (subjectId: string) => Object.freeze({
          subjectId,
          currentKai: currentKai(),
          mandates: Object.freeze(clone([...requireSubject(subjectId).mandates.values()].map((mandate) => ({
            ...mandate,
            executable: mandate.status === "active"
              && mandate.ownerReceizId === requireSubject(subjectId).artifact.subject.currentOwnerReceizId
              && BigInt(mandate.policy.expiresAtKai) > kai,
          })))),
        }),
      }),
      runtime: Object.freeze({
        enqueueTick,
        status: runtimeStatus,
        pause: pauseRuntime,
        catchUp: catchUpRuntime,
      }),
      memory: Object.freeze({
        query: queryMemory,
        project: (subjectId: string, input: Readonly<{ throughHead: string }>) => projectMemory(subjectId, input.throughHead),
        citations: (subjectId: string, memoryId: string) => {
          const memory = requireSubject(subjectId).memories.find((candidate) => candidate.memoryId === memoryId);
          if (!memory) fail("RECEIZ_SUBJECT_MEMORY_NOT_FOUND");
          return Object.freeze({ memoryId, eventIds: memory.eventIds, proofObjectIds: memory.proofObjectIds });
        },
        compact: (subjectId: string, input: Readonly<{ throughHead?: string }> = {}) => projectMemory(subjectId, input.throughHead ?? requireSubject(subjectId).artifact.subject.head),
      }),
      relationships: Object.freeze({
        list: (subjectId: string) => clone([...requireSubject(subjectId).relationships.values()]),
        propose: (input: Parameters<typeof relationshipPlan>[0]) => relationshipPlan(input),
        respond: (input: Parameters<typeof relationshipPlan>[0] & Readonly<{ response: "accept" | "decline"; authority: ReceizWorldAuthorityV1 | ReceizWorldTransactionAuthorityV1 }>) => {
          const plan = relationshipPlan(input);
          return executeTransaction(plan, input.authority);
        },
        history: (subjectId: string) => clone(requireSubject(subjectId).events.filter((event) => event.kind.startsWith("relationship."))),
      }),
      inventory: Object.freeze({
        list: inventoryList,
        use: useInventory,
      }),
      trades: Object.freeze({
        preview: tradePreview,
        execute: (preview: ReturnType<typeof tradePreview>, authority: ReceizWorldAuthorityV1 | ReceizWorldTransactionAuthorityV1) => executeTransaction(preview.transaction, authority),
      }),
    }),
    world: Object.freeze({
      planCommand,
      validateCommand,
      executeCommand,
      planTransaction,
      executeTransaction,
      receipt: (receiptId: string) => {
        const receipt = receipts.get(receiptId);
        if (!receipt) fail("RECEIZ_WORLD_RECEIPT_NOT_FOUND");
        return clone(receipt);
      },
      replay: worldReplay,
      additions: (input: Readonly<{ worldId: string; afterHead?: string; types?: readonly string[] }>) => {
        const events = worldEvents.get(input.worldId) ?? [];
        const start = input.afterHead ? Math.max(0, events.findIndex((event) => event.worldHead === input.afterHead) + 1) : 0;
        return clone(events.slice(start).filter((event) => !input.types?.length || input.types.includes(event.kind)));
      },
      subscribe: worldSubscribe,
      head: worldHead,
    }),
    bearer: Object.freeze({
      previewTransfer,
      issueTransferInstrument,
      inspectInstrument,
      claimInstrument,
      cancelTransfer,
      transferStatus,
    }),
    testing: Object.freeze({
      currentKai,
      advanceKai: (next: string) => {
        assertKai(next, "RECEIZ_SUBJECT_TESTING_KAI_INVALID");
        if (BigInt(next) < kai) fail("RECEIZ_SUBJECT_TESTING_KAI_REGRESSION");
        kai = BigInt(next);
        return currentKai();
      },
      admitInventoryItem: (subjectId: string, item: ReceizSubjectInventoryItemV1) => {
        const record = requireSubject(subjectId);
        if (item.ownerSubjectId !== subjectId) fail("RECEIZ_SUBJECT_INVENTORY_OWNER_MISMATCH");
        if (record.inventory.has(item.itemId)) fail("RECEIZ_SUBJECT_INVENTORY_ITEM_EXISTS");
        record.inventory.set(item.itemId, Object.freeze(clone(item)));
        return inventoryList(subjectId);
      },
      event: (eventId: string) => clone(eventsById.get(eventId) ?? null),
      subjectCount: () => subjects.size,
      appendCompetingOwnershipForConformance: (subjectId: string) => {
        const record = requireSubject(subjectId);
        const transitionKai = nextKai();
        const ownershipHead = digest({
          kind: "receiz.subject.testing-competing-ownership.v1",
          priorOwnershipHead: record.artifact.subject.ownershipHead,
          subjectId,
          kai: transitionKai,
        });
        const head = digest({
          kind: "receiz.subject.testing-competing-head.v1",
          priorHead: record.artifact.subject.head,
          ownershipHead,
          kai: transitionKai,
        });
        replaceSubject(record, { ownershipHead, head });
        return clone(record.artifact);
      },
      snapshot: (): ReceizLivingSubjectRuntimeSnapshotV1 => {
        const basis = {
          schema: "receiz.subject.runtime_snapshot.v1" as const,
          version: "120.0.0" as const,
          registryDigest: options.registryDigest,
          reducerDigest: options.reducerDigest,
          kai: currentKai(),
          subjects: Object.freeze([...subjects.values()]
            .sort((left, right) => left.artifact.subject.subjectId.localeCompare(right.artifact.subject.subjectId))
            .map((record) => Object.freeze({
              artifact: clone(record.artifact),
              events: Object.freeze(clone(record.events)),
              memories: Object.freeze(clone(record.memories)),
              relationships: Object.freeze(clone([...record.relationships.entries()])),
              inventory: Object.freeze(clone([...record.inventory.entries()])),
              mandates: Object.freeze(clone([...record.mandates.entries()])),
              jobs: Object.freeze(clone([...record.jobs.entries()])),
              brain: record.brain.snapshot(),
              pendingTransferId: record.pendingTransferId,
              priorMindHead: record.priorMindHead,
              privateMemoryOwnerReceizId: record.privateMemoryOwnerReceizId,
              privateConversationPolicy: record.privateConversationPolicy,
              runtimeExecutions: Object.freeze(clone(record.runtimeExecutions)),
            }))),
          worldEvents: Object.freeze(clone([...worldEvents.entries()])),
          worldHeads: Object.freeze(clone([...worldHeads.entries()])),
          receipts: Object.freeze(clone([...receipts.entries()])),
          idempotentReceipts: Object.freeze(clone([...idempotentReceipts.entries()])),
          transfers: Object.freeze(clone([...transfers.entries()])),
          claimedInstrumentDigests: Object.freeze([...claimedInstrumentDigests].sort()),
        };
        return Object.freeze({ ...basis, snapshotDigest: digest(basis) });
      },
    }),
  });
}
