import {
  appendReceizCompositeMerkleLeaf,
  createEmptyReceizCompositeMerkleState,
  createReceizCompositeFibonacciState,
  createReceizCompositeSyntheticMerkleState,
  digestReceizCompositeCanonical,
  updateReceizCompositeFibonacciState,
  type ReceizCompositeFibonacciState,
  type ReceizCompositeMerkleState,
} from "./compositeProofKernel.js";
import { receizBase64UrlDecode, receizBase64UrlEncode } from "./identity.js";

const DIGEST_RE = /^[0-9a-f]{64}$/;
const KAI_RE = /^(0|[1-9][0-9]*)$/;
const SUBJECT_ID_RE = /^[a-z0-9][a-z0-9._:-]{2,255}$/i;
const encoder = new TextEncoder();
const decoder = new TextDecoder();

export const RECEIZ_LIVING_SUBJECT_VERSION = "120.0.0" as const;
export const RECEIZ_LIVING_SUBJECT_REDUCER_DIGEST = digestReceizCompositeCanonical({
  schema: "receiz.living-subject.reducer.v1",
  version: RECEIZ_LIVING_SUBJECT_VERSION,
  admission: "typed-command-only",
  namespacePreservation: "byte-exact",
  modelOutputIsAuthority: false,
});
export const RECEIZ_SUBJECT_NAMESPACE_NAMES = [
  "identity",
  "canonicalState",
  "selfModel",
  "memory",
  "relationships",
  "inventory",
  "abilities",
  "condition",
  "worldPosition",
  "mandates",
  "eventHistory",
  "projections",
  "applicationNamespaces",
] as const;

export const RECEIZ_LIVING_SUBJECT_SCHEMAS = Object.freeze({
  subject: "receiz.subject.v1",
  subjectMind: "receiz.subject.mind.v1",
  subjectSelfModel: "receiz.subject.self_model.v1",
  subjectMandate: "receiz.subject.mandate.v1",
  subjectCapability: "receiz.subject.capability.v1",
  subjectIntent: "receiz.subject.intent.v1",
  subjectMemoryEvent: "receiz.subject.memory_event.v1",
  subjectMemoryProjection: "receiz.subject.memory_projection.v1",
  subjectRelationship: "receiz.subject.relationship.v1",
  subjectInteractionPolicy: "receiz.subject.interaction_policy.v1",
  subjectInventory: "receiz.subject.inventory.v1",
  subjectTradeIntent: "receiz.subject.trade_intent.v1",
  subjectTradeReceipt: "receiz.subject.trade_receipt.v1",
  subjectRuntimeJob: "receiz.subject.runtime_job.v1",
  subjectOwnershipTransition: "receiz.subject.ownership_transition.v1",
  subjectProofBrain: "receiz.subject.proof_brain.v1",
  subjectProofIndex: "receiz.subject.proof_index.v1",
  subjectProofIndexSegment: "receiz.subject.proof_index_segment.v1",
  subjectProofReference: "receiz.subject.proof_reference.v1",
  subjectProofContext: "receiz.subject.proof_context.v1",
  subjectProofRetrievalReceipt: "receiz.subject.proof_retrieval_receipt.v1",
  worldCommand: "receiz.world.command.v1",
  worldEvent: "receiz.world.event.v1",
  worldReceipt: "receiz.world.receipt.v1",
  worldCheckpoint: "receiz.world.checkpoint.v1",
  worldTransaction: "receiz.world.transaction.v1",
  bearerTransferPlan: "receiz.bearer.transfer_plan.v1",
  bearerInstrument: "receiz.bearer.instrument.v1",
  bearerClaim: "receiz.bearer.claim.v1",
  bearerTransferReceipt: "receiz.bearer.transfer_receipt.v1",
} as const);

export type ReceizLivingSubjectSchema = typeof RECEIZ_LIVING_SUBJECT_SCHEMAS[keyof typeof RECEIZ_LIVING_SUBJECT_SCHEMAS];
export type ReceizSubjectNamespaceName = typeof RECEIZ_SUBJECT_NAMESPACE_NAMES[number] | (string & {});
export type ReceizSubjectNamespaceBytesV1 = Readonly<Record<string, string>>;
export type ReceizSubjectResponseMode = "text" | "voice" | "performance";
export type ReceizSubjectMemoryType =
  | "conversation"
  | "episodic-world"
  | "relationship"
  | "battle"
  | "discovery"
  | "ownership-care"
  | "inventory-trade";

export type ReceizSubjectV1 = Readonly<{
  schema: "receiz.subject.v1";
  subjectId: string;
  proofObjectId: string;
  subjectType: string;
  ownerReceizId: string;
  identityDigest: string;
  genesisDigest: string;
  createdAtKai: string;
  head: string;
  ownershipHead: string;
  currentOwnerReceizId: string;
  namespaces: ReceizSubjectNamespaceBytesV1;
}>;

export type ReceizSubjectArtifactV1 = Readonly<{
  schema: "receiz.subject.v1";
  subject: ReceizSubjectV1;
  exactBytesB64u: string;
  artifactDigest: string;
  registryDigest: string;
  reducerDigest: string;
  authority: Readonly<{
    artifactIsProofAuthority: true;
    modelOutputIsAuthority: false;
    indexIsAuthority: false;
  }>;
}>;

export type ReceizSubjectProofTextV1 = Readonly<{
  kind: "claim" | "long-form" | "conversation" | "event" | "relationship" | "inventory" | "other";
  text: string;
  sha256Hex: string;
}>;

export type ReceizSubjectPrimaryProofObjectV1 = Readonly<{
  schema: "receiz.subject.primary-proof-object.v1";
  subjectId: string;
  proofObjectId: string;
  eventIds: readonly string[];
  kai: string;
  objectDigest: string;
  exactBytesB64u: string;
  visibility: "public" | "private";
  text: readonly ReceizSubjectProofTextV1[];
  namespaceDigests: Readonly<Record<string, string>>;
}>;

export type ReceizSubjectProofReferenceV1 = Readonly<{
  schema: "receiz.subject.proof_reference.v1";
  subjectId: string;
  subjectHead: string;
  proofObjectId: string;
  objectDigest: string;
  kai: string;
  score: number;
  matchedTerms: readonly string[];
  eventIds: readonly string[];
  membership: Readonly<{
    objectOrdinal: number;
    objectMerkleRoot: string;
    indexRoot: string;
  }>;
}>;

export type ReceizSubjectProofPassageV1 = Readonly<{
  proofObjectId: string;
  objectDigest: string;
  textDigest: string;
  kind: ReceizSubjectProofTextV1["kind"];
  start: number;
  end: number;
  text: string;
}>;

export type ReceizSubjectProofBrainHeadV1 = Readonly<{
  schema: "receiz.subject.proof_brain.v1";
  subjectId: string;
  subjectDigest: string;
  subjectHead: string;
  historyHead: string;
  indexRoot: string;
  objectMerkleRoot: string;
  objectCount: string;
  operationCount: string;
  maximumKai: string;
  priorBrainHead: string | null;
  fibonacci: ReceizCompositeFibonacciState;
  registryDigest: string;
  reducerDigest: string;
  authority: Readonly<{
    brainHeadIsProofAuthority: false;
    indexIsProofAuthority: false;
    strongerTruth: "sealed-receiz-proof-object";
  }>;
}>;

export type ReceizSubjectProofRetrievalReceiptV1 = Readonly<{
  schema: "receiz.subject.proof_retrieval_receipt.v1";
  retrievalReceiptId: string;
  subjectId: string;
  subjectHead: string;
  historyHead: string;
  indexRoot: string;
  queryDigest: string;
  referenceDigests: readonly string[];
  primaryObjectDigests: readonly string[];
  registryDigest: string;
  reducerDigest: string;
  kai: string;
  authority: Readonly<{
    receiptIsProofAuthority: false;
    primaryObjectsRequired: true;
  }>;
}>;

export type ReceizSubjectProofContextV1 = Readonly<{
  schema: "receiz.subject.proof_context.v1";
  head: ReceizSubjectProofBrainHeadV1;
  references: readonly ReceizSubjectProofReferenceV1[];
  primaryObjects: readonly ReceizSubjectPrimaryProofObjectV1[];
  passages: readonly ReceizSubjectProofPassageV1[];
  receipt: ReceizSubjectProofRetrievalReceiptV1;
}>;

export type ReceizSubjectProofBrainStreamEvent =
  | Readonly<{ type: "proof_head"; head: ReceizSubjectProofBrainHeadV1 }>
  | Readonly<{ type: "candidate_reference"; reference: ReceizSubjectProofReferenceV1 }>
  | Readonly<{ type: "primary_object"; object: ReceizSubjectPrimaryProofObjectV1 }>
  | Readonly<{ type: "primary_passage"; passage: ReceizSubjectProofPassageV1 }>
  | Readonly<{ type: "context_ready"; context: ReceizSubjectProofContextV1 }>;

export type ReceizSubjectProofBrainSearchInput = Readonly<{
  query: string;
  atHead: string;
  limit?: number;
  cursor?: string;
  visibility?: "public" | "private" | "all";
  types?: readonly ReceizSubjectProofTextV1["kind"][];
}>;

export type ReceizSubjectProofBrainAppendInput = Readonly<{
  subjectId: string;
  subjectDigest: string;
  subjectHead: string;
  historyHead: string;
  primaryObject: ReceizSubjectPrimaryProofObjectV1;
}>;

export type ReceizSubjectProofBrainSnapshotV1 = Readonly<{
  schema: "receiz.subject.proof_brain_snapshot.v1";
  genesis: Readonly<{
    subjectId: string;
    subjectDigest: string;
    subjectHead: string;
    historyHead: string;
    maximumKai: string;
    registryDigest: string;
    reducerDigest: string;
  }>;
  appends: readonly ReceizSubjectProofBrainAppendInput[];
  snapshotDigest: string;
}>;

function fail(code: string): never {
  throw new TypeError(code);
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function canonicalDigest(value: unknown): string {
  return digestReceizCompositeCanonical(value);
}

function assertDigest(value: string, code: string): void {
  if (!DIGEST_RE.test(value)) fail(code);
}

function assertKai(value: string, code: string): void {
  if (!KAI_RE.test(value)) fail(code);
}

function assertSubjectId(value: string): void {
  if (!SUBJECT_ID_RE.test(value)) fail("RECEIZ_SUBJECT_ID_INVALID");
}

function normalizeWords(value: string): string[] {
  return [...new Set(value
    .normalize("NFKC")
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .map((word) => word.trim())
    .filter((word) => word.length >= 2 && word.length <= 96))];
}

function assertExactBytes(input: ReceizSubjectPrimaryProofObjectV1): void {
  assertSubjectId(input.subjectId);
  if (!input.proofObjectId.trim()) fail("RECEIZ_SUBJECT_PRIMARY_OBJECT_ID_REQUIRED");
  assertKai(input.kai, "RECEIZ_SUBJECT_PRIMARY_OBJECT_KAI_INVALID");
  assertDigest(input.objectDigest, "RECEIZ_SUBJECT_PRIMARY_OBJECT_DIGEST_INVALID");
  const bytes = receizBase64UrlDecode(input.exactBytesB64u);
  if (bytes.byteLength === 0 || canonicalDigest({ bytesB64u: input.exactBytesB64u }) !== input.objectDigest) {
    fail("RECEIZ_SUBJECT_PRIMARY_OBJECT_BYTES_MISMATCH");
  }
  for (const item of input.text) {
    assertDigest(item.sha256Hex, "RECEIZ_SUBJECT_PRIMARY_TEXT_DIGEST_INVALID");
    if (canonicalDigest({ text: item.text }) !== item.sha256Hex) {
      fail("RECEIZ_SUBJECT_PRIMARY_TEXT_DIGEST_MISMATCH");
    }
  }
}

function passageCandidates(object: ReceizSubjectPrimaryProofObjectV1, query: string): ReceizSubjectProofPassageV1[] {
  const terms = normalizeWords(query);
  const candidates: Array<ReceizSubjectProofPassageV1 & { score: number }> = [];
  for (const source of object.text) {
    const paragraphs = source.text
      .replace(/\r\n?/g, "\n")
      .split(/\n\s*\n+/g);
    let searchFrom = 0;
    for (const raw of paragraphs) {
      const paragraph = raw.trim();
      if (!paragraph) continue;
      const start = source.text.indexOf(paragraph, searchFrom);
      if (start < 0) continue;
      const end = start + paragraph.length;
      searchFrom = end;
      const lowered = paragraph.toLowerCase();
      const score = terms.reduce((total, term) => total + (lowered.includes(term) ? 1 : 0), 0);
      candidates.push({
        proofObjectId: object.proofObjectId,
        objectDigest: object.objectDigest,
        textDigest: source.sha256Hex,
        kind: source.kind,
        start,
        end,
        text: paragraph,
        score,
      });
    }
  }
  return candidates
    .sort((left, right) => right.score - left.score || left.start - right.start)
    .slice(0, 6)
    .sort((left, right) => left.start - right.start)
    .map(({ score: _score, ...passage }) => passage);
}

export function createReceizSubjectPrimaryProofObjectV1(input: Readonly<{
  subjectId: string;
  proofObjectId: string;
  eventIds?: readonly string[];
  kai: string;
  visibility?: "public" | "private";
  exactBytes: Uint8Array;
  text?: readonly Readonly<{ kind: ReceizSubjectProofTextV1["kind"]; text: string }>[];
  namespaceDigests?: Readonly<Record<string, string>>;
}>): ReceizSubjectPrimaryProofObjectV1 {
  assertSubjectId(input.subjectId);
  assertKai(input.kai, "RECEIZ_SUBJECT_PRIMARY_OBJECT_KAI_INVALID");
  if (!(input.exactBytes instanceof Uint8Array) || input.exactBytes.byteLength === 0) {
    fail("RECEIZ_SUBJECT_PRIMARY_OBJECT_BYTES_REQUIRED");
  }
  const exactBytesB64u = receizBase64UrlEncode(input.exactBytes);
  const text = Object.freeze((input.text ?? []).map((item) => Object.freeze({
    kind: item.kind,
    text: item.text,
    sha256Hex: canonicalDigest({ text: item.text }),
  })));
  const object: ReceizSubjectPrimaryProofObjectV1 = Object.freeze({
    schema: "receiz.subject.primary-proof-object.v1",
    subjectId: input.subjectId,
    proofObjectId: input.proofObjectId,
    eventIds: Object.freeze([...(input.eventIds ?? [])]),
    kai: input.kai,
    objectDigest: canonicalDigest({ bytesB64u: exactBytesB64u }),
    exactBytesB64u,
    visibility: input.visibility ?? "public",
    text,
    namespaceDigests: Object.freeze({ ...(input.namespaceDigests ?? {}) }),
  });
  assertExactBytes(object);
  return object;
}

export function createReceizSubjectProofBrain(input: Readonly<{
  subjectId: string;
  subjectDigest: string;
  subjectHead: string;
  historyHead: string;
  maximumKai: string;
  registryDigest: string;
  reducerDigest: string;
}>) {
  assertSubjectId(input.subjectId);
  [input.subjectDigest, input.subjectHead, input.historyHead, input.registryDigest, input.reducerDigest]
    .forEach((digest) => assertDigest(digest, "RECEIZ_SUBJECT_PROOF_BRAIN_DIGEST_INVALID"));
  assertKai(input.maximumKai, "RECEIZ_SUBJECT_PROOF_BRAIN_KAI_INVALID");

  const objects = new Map<string, ReceizSubjectPrimaryProofObjectV1>();
  const objectOrdinals = new Map<string, number>();
  const postings = new Map<string, Map<string, number>>();
  const headDigestsByCount = new Map<number, string>();
  const appendLog: ReceizSubjectProofBrainAppendInput[] = [];
  let objectMerkle: ReceizCompositeMerkleState = createEmptyReceizCompositeMerkleState();
  let maximumKai = input.maximumKai;
  let subjectDigest = input.subjectDigest;
  let subjectHead = input.subjectHead;
  let historyHead = input.historyHead;
  let indexRoot = canonicalDigest({ kind: "receiz.subject.proof-index.empty.v1", subjectId: input.subjectId });
  let currentHeadDigest = canonicalDigest({
    kind: "receiz.subject.proof-brain.genesis.v1",
    subjectId: input.subjectId,
    subjectDigest,
    subjectHead,
    historyHead,
    indexRoot,
    objectMerkleRoot: objectMerkle.root,
  });
  headDigestsByCount.set(0, currentHeadDigest);
  let fibonacci = createReceizCompositeFibonacciState({
    operationCount: 0,
    resolveArtifactDigest: () => currentHeadDigest,
  });

  const head = (): ReceizSubjectProofBrainHeadV1 => Object.freeze({
    schema: "receiz.subject.proof_brain.v1",
    subjectId: input.subjectId,
    subjectDigest,
    subjectHead,
    historyHead,
    indexRoot,
    objectMerkleRoot: objectMerkle.root,
    objectCount: String(objects.size),
    operationCount: String(objects.size),
    maximumKai,
    priorBrainHead: objects.size === 0 ? null : headDigestsByCount.get(objects.size - 1) ?? null,
    fibonacci: clone(fibonacci),
    registryDigest: input.registryDigest,
    reducerDigest: input.reducerDigest,
    authority: Object.freeze({
      brainHeadIsProofAuthority: false,
      indexIsProofAuthority: false,
      strongerTruth: "sealed-receiz-proof-object",
    }),
  });

  const append = (appendInput: ReceizSubjectProofBrainAppendInput): ReceizSubjectProofBrainHeadV1 => {
    if (appendInput.subjectId !== input.subjectId) fail("RECEIZ_SUBJECT_PROOF_BRAIN_SUBJECT_MISMATCH");
    assertExactBytes(appendInput.primaryObject);
    if (appendInput.primaryObject.subjectId !== input.subjectId) fail("RECEIZ_SUBJECT_PRIMARY_OBJECT_SUBJECT_MISMATCH");
    const existing = objects.get(appendInput.primaryObject.proofObjectId);
    if (existing) {
      if (existing.objectDigest !== appendInput.primaryObject.objectDigest) {
        fail("RECEIZ_SUBJECT_PRIMARY_OBJECT_ID_CONFLICT");
      }
      return head();
    }
    const priorHead = currentHeadDigest;
    const ordinal = objects.size;
    const object = clone(appendInput.primaryObject);
    appendLog.push(Object.freeze(clone(appendInput)));
    objects.set(object.proofObjectId, object);
    objectOrdinals.set(object.proofObjectId, ordinal);
    const termFrequency = new Map<string, number>();
    for (const source of object.text) {
      for (const term of normalizeWords(source.text)) {
        termFrequency.set(term, (termFrequency.get(term) ?? 0) + 1);
      }
    }
    for (const [term, frequency] of termFrequency) {
      const byObject = postings.get(term) ?? new Map<string, number>();
      byObject.set(object.proofObjectId, frequency);
      postings.set(term, byObject);
    }
    objectMerkle = appendReceizCompositeMerkleLeaf(objectMerkle, object.objectDigest);
    indexRoot = canonicalDigest({
      kind: "receiz.subject.proof-index.append.v1",
      priorIndexRoot: indexRoot,
      ordinal,
      proofObjectId: object.proofObjectId,
      objectDigest: object.objectDigest,
      termDigest: canonicalDigest([...termFrequency.entries()].sort(([left], [right]) => left.localeCompare(right))),
    });
    subjectDigest = appendInput.subjectDigest;
    subjectHead = appendInput.subjectHead;
    historyHead = appendInput.historyHead;
    if (BigInt(object.kai) > BigInt(maximumKai)) maximumKai = object.kai;
    currentHeadDigest = canonicalDigest({
      kind: "receiz.subject.proof-brain.head.v1",
      priorHead,
      subjectId: input.subjectId,
      subjectDigest,
      subjectHead,
      historyHead,
      indexRoot,
      objectMerkleRoot: objectMerkle.root,
      objectCount: objects.size,
      maximumKai,
      registryDigest: input.registryDigest,
      reducerDigest: input.reducerDigest,
    });
    headDigestsByCount.set(objects.size, currentHeadDigest);
    fibonacci = updateReceizCompositeFibonacciState({
      prior: fibonacci,
      nextOperationCount: objects.size,
      resolveArtifactDigest: (operationCount) => headDigestsByCount.get(operationCount) ?? null,
    });
    return head();
  };

  const search = (searchInput: ReceizSubjectProofBrainSearchInput): ReceizSubjectProofReferenceV1[] => {
    if (searchInput.atHead !== subjectHead) fail("RECEIZ_SUBJECT_PROOF_BRAIN_STALE_HEAD");
    const limit = Math.min(96, Math.max(1, Math.trunc(searchInput.limit ?? 96)));
    const terms = normalizeWords(searchInput.query).slice(0, 64);
    const scores = new Map<string, { score: number; terms: Set<string> }>();
    for (const term of terms) {
      for (const [proofObjectId, frequency] of postings.get(term) ?? []) {
        const value = scores.get(proofObjectId) ?? { score: 0, terms: new Set<string>() };
        value.score += 1 + Math.log2(1 + frequency);
        value.terms.add(term);
        scores.set(proofObjectId, value);
      }
    }
    const candidateIds = scores.size > 0
      ? [...scores.keys()]
      : [...objects.keys()].slice(Math.max(0, objects.size - limit)).reverse();
    return candidateIds
      .map((proofObjectId) => {
        const object = objects.get(proofObjectId)!;
        const scored = scores.get(proofObjectId) ?? { score: 0, terms: new Set<string>() };
        return { object, scored, ordinal: objectOrdinals.get(proofObjectId) ?? 0 };
      })
      .filter(({ object }) => (
        (searchInput.visibility === undefined || searchInput.visibility === "all" || object.visibility === searchInput.visibility)
        && (!searchInput.types?.length || object.text.some((source) => searchInput.types!.includes(source.kind)))
      ))
      .sort((left, right) => (
        right.scored.score - left.scored.score
        || (BigInt(right.object.kai) > BigInt(left.object.kai)
          ? 1
          : BigInt(right.object.kai) < BigInt(left.object.kai)
            ? -1
            : left.object.proofObjectId.localeCompare(right.object.proofObjectId))
      ))
      .slice(0, limit)
      .map(({ object, scored, ordinal }): ReceizSubjectProofReferenceV1 => Object.freeze({
        schema: "receiz.subject.proof_reference.v1",
        subjectId: input.subjectId,
        subjectHead,
        proofObjectId: object.proofObjectId,
        objectDigest: object.objectDigest,
        kai: object.kai,
        score: scored.score,
        matchedTerms: Object.freeze([...scored.terms].sort()),
        eventIds: Object.freeze([...object.eventIds]),
        membership: Object.freeze({
          objectOrdinal: ordinal,
          objectMerkleRoot: objectMerkle.root,
          indexRoot,
        }),
      }));
  };

  const resolve = (references: readonly ReceizSubjectProofReferenceV1[]): ReceizSubjectPrimaryProofObjectV1[] => references.map((reference) => {
    if (reference.subjectId !== input.subjectId || reference.subjectHead !== subjectHead) {
      fail("RECEIZ_SUBJECT_PROOF_REFERENCE_HEAD_MISMATCH");
    }
    const object = objects.get(reference.proofObjectId);
    if (!object || object.objectDigest !== reference.objectDigest) {
      fail("RECEIZ_SUBJECT_PRIMARY_OBJECT_RESOLUTION_FAILED");
    }
    assertExactBytes(object);
    return clone(object);
  });

  const resolvedContext = (references: readonly ReceizSubjectProofReferenceV1[], query: string, queryDigest: string): ReceizSubjectProofContextV1 => {
    const primaryObjects = resolve(references);
    const passages = primaryObjects.flatMap((object) => passageCandidates(object, query));
    const receiptBasis = {
      subjectId: input.subjectId,
      subjectHead,
      historyHead,
      indexRoot,
      queryDigest,
      referenceDigests: references.map((reference) => canonicalDigest(reference)),
      primaryObjectDigests: primaryObjects.map((object) => object.objectDigest),
      registryDigest: input.registryDigest,
      reducerDigest: input.reducerDigest,
      kai: maximumKai,
    };
    const receipt: ReceizSubjectProofRetrievalReceiptV1 = Object.freeze({
      schema: "receiz.subject.proof_retrieval_receipt.v1",
      retrievalReceiptId: canonicalDigest({ kind: "receiz.subject.proof-retrieval-receipt.v1", ...receiptBasis }),
      ...receiptBasis,
      referenceDigests: Object.freeze(receiptBasis.referenceDigests),
      primaryObjectDigests: Object.freeze(receiptBasis.primaryObjectDigests),
      authority: Object.freeze({ receiptIsProofAuthority: false, primaryObjectsRequired: true }),
    });
    return Object.freeze({
      schema: "receiz.subject.proof_context.v1",
      head: head(),
      references: Object.freeze(clone(references)),
      primaryObjects: Object.freeze(primaryObjects),
      passages: Object.freeze(passages),
      receipt,
    });
  };

  const context = (searchInput: ReceizSubjectProofBrainSearchInput): ReceizSubjectProofContextV1 => resolvedContext(
    search(searchInput), searchInput.query, canonicalDigest({
      query: searchInput.query, atHead: searchInput.atHead,
      limit: Math.min(96, Math.max(1, Math.trunc(searchInput.limit ?? 96))),
      visibility: searchInput.visibility ?? "all", types: searchInput.types ?? [],
    }),
  );
  const resolveContext = (request: Readonly<{ atHead: string; references: readonly ReceizSubjectProofReferenceV1[] }>): ReceizSubjectProofContextV1 => {
    if (request.atHead !== subjectHead) fail("RECEIZ_SUBJECT_PROOF_BRAIN_STALE_HEAD");
    return resolvedContext(request.references, "", canonicalDigest({ atHead: request.atHead, references: request.references }));
  };

  const stream = async function* (searchInput: ReceizSubjectProofBrainSearchInput): AsyncGenerator<ReceizSubjectProofBrainStreamEvent> {
    const resolvedHead = head();
    yield { type: "proof_head", head: resolvedHead };
    const references = search(searchInput);
    for (const reference of references) yield { type: "candidate_reference", reference };
    const primaryObjects = resolve(references);
    for (const object of primaryObjects) {
      yield { type: "primary_object", object };
      for (const passage of passageCandidates(object, searchInput.query)) {
        yield { type: "primary_passage", passage };
      }
    }
    yield { type: "context_ready", context: context(searchInput) };
  };

  return Object.freeze({
    append,
    head,
    search,
    resolve,
    resolveContext,
    context,
    stream,
    objectCount: () => objects.size,
    exactObject: (proofObjectId: string) => clone(objects.get(proofObjectId) ?? null),
    exactObjects: () => clone([...objects.values()]),
    snapshot: (): ReceizSubjectProofBrainSnapshotV1 => {
      const basis = {
        schema: "receiz.subject.proof_brain_snapshot.v1" as const,
        genesis: Object.freeze(clone(input)),
        appends: Object.freeze(clone(appendLog)),
      };
      return Object.freeze({ ...basis, snapshotDigest: canonicalDigest(basis) });
    },
  });
}

export type ReceizSubjectProofBrain = ReturnType<typeof createReceizSubjectProofBrain>;

export function restoreReceizSubjectProofBrain(snapshot: ReceizSubjectProofBrainSnapshotV1): ReceizSubjectProofBrain {
  const { snapshotDigest, ...basis } = snapshot;
  assertDigest(snapshotDigest, "RECEIZ_SUBJECT_PROOF_BRAIN_SNAPSHOT_DIGEST_INVALID");
  if (snapshot.schema !== "receiz.subject.proof_brain_snapshot.v1" || canonicalDigest(basis) !== snapshotDigest) {
    fail("RECEIZ_SUBJECT_PROOF_BRAIN_SNAPSHOT_INVALID");
  }
  const brain = createReceizSubjectProofBrain(snapshot.genesis);
  for (const append of snapshot.appends) brain.append(append);
  return brain;
}

export type ReceizSubjectProofIndexSegmentV1 = Readonly<{
  schema: "receiz.subject.proof_index_segment.v1";
  subjectId: string;
  segmentOrdinal: string;
  firstObjectOrdinal: string;
  objectCount: string;
  minimumKai: string;
  maximumKai: string;
  objectRoot: string;
  lexiconRoot: string;
  segmentDigest: string;
  contentAddress: string;
}>;

export function createReceizSubjectProofIndexSegmentV1(input: Readonly<{
  subjectId: string;
  segmentOrdinal: number;
  firstObjectOrdinal: number;
  objectCount: number;
  minimumKai: string;
  maximumKai: string;
  objectRoot: string;
  lexiconRoot: string;
}>): ReceizSubjectProofIndexSegmentV1 {
  assertSubjectId(input.subjectId);
  if (![input.segmentOrdinal, input.firstObjectOrdinal, input.objectCount]
    .every((value) => Number.isSafeInteger(value) && value >= 0)) {
    fail("RECEIZ_SUBJECT_PROOF_INDEX_SEGMENT_RANGE_INVALID");
  }
  assertKai(input.minimumKai, "RECEIZ_SUBJECT_PROOF_INDEX_SEGMENT_KAI_INVALID");
  assertKai(input.maximumKai, "RECEIZ_SUBJECT_PROOF_INDEX_SEGMENT_KAI_INVALID");
  assertDigest(input.objectRoot, "RECEIZ_SUBJECT_PROOF_INDEX_SEGMENT_ROOT_INVALID");
  assertDigest(input.lexiconRoot, "RECEIZ_SUBJECT_PROOF_INDEX_SEGMENT_ROOT_INVALID");
  const basis = {
    schema: "receiz.subject.proof_index_segment.v1" as const,
    subjectId: input.subjectId,
    segmentOrdinal: String(input.segmentOrdinal),
    firstObjectOrdinal: String(input.firstObjectOrdinal),
    objectCount: String(input.objectCount),
    minimumKai: input.minimumKai,
    maximumKai: input.maximumKai,
    objectRoot: input.objectRoot,
    lexiconRoot: input.lexiconRoot,
  };
  const segmentDigest = canonicalDigest(basis);
  return Object.freeze({
    ...basis,
    segmentDigest,
    contentAddress: `receiz://subject-proof-index/${input.subjectId}/${segmentDigest}`,
  });
}

export function createReceizSubjectProofScaleCommitmentV1(input: Readonly<{
  subjectId: string;
  subjectDigest: string;
  subjectHead: string;
  historyHead: string;
  objectCount: number;
  maximumKai: string;
  registryDigest: string;
  reducerDigest: string;
  resolvePerfectSubtreeRoot: (level: number) => string;
  resolveArtifactDigest: (operationCount: number) => string;
}>): ReceizSubjectProofBrainHeadV1 {
  assertSubjectId(input.subjectId);
  if (!Number.isSafeInteger(input.objectCount) || input.objectCount < 0) {
    fail("RECEIZ_SUBJECT_PROOF_SCALE_COUNT_INVALID");
  }
  [input.subjectDigest, input.subjectHead, input.historyHead, input.registryDigest, input.reducerDigest]
    .forEach((digest) => assertDigest(digest, "RECEIZ_SUBJECT_PROOF_SCALE_DIGEST_INVALID"));
  assertKai(input.maximumKai, "RECEIZ_SUBJECT_PROOF_SCALE_KAI_INVALID");
  const merkle = createReceizCompositeSyntheticMerkleState({
    leafCount: input.objectCount,
    resolvePerfectSubtreeRoot: input.resolvePerfectSubtreeRoot,
  });
  const fibonacci = createReceizCompositeFibonacciState({
    operationCount: input.objectCount,
    resolveArtifactDigest: input.resolveArtifactDigest,
  });
  const indexRoot = canonicalDigest({
    kind: "receiz.subject.proof-index.segmented-root.v1",
    subjectId: input.subjectId,
    objectCount: input.objectCount,
    objectMerkleRoot: merkle.root,
    maximumKai: input.maximumKai,
  });
  return Object.freeze({
    schema: "receiz.subject.proof_brain.v1",
    subjectId: input.subjectId,
    subjectDigest: input.subjectDigest,
    subjectHead: input.subjectHead,
    historyHead: input.historyHead,
    indexRoot,
    objectMerkleRoot: merkle.root,
    objectCount: String(input.objectCount),
    operationCount: String(input.objectCount),
    maximumKai: input.maximumKai,
    priorBrainHead: input.objectCount === 0 ? null : input.resolveArtifactDigest(input.objectCount - 1),
    fibonacci,
    registryDigest: input.registryDigest,
    reducerDigest: input.reducerDigest,
    authority: Object.freeze({
      brainHeadIsProofAuthority: false,
      indexIsProofAuthority: false,
      strongerTruth: "sealed-receiz-proof-object",
    }),
  });
}

export function encodeReceizSubjectNamespaceBytes(value: unknown): string {
  return receizBase64UrlEncode(encoder.encode(JSON.stringify(value)));
}

export function decodeReceizSubjectNamespaceBytes<T = unknown>(value: string): T {
  return JSON.parse(decoder.decode(receizBase64UrlDecode(value))) as T;
}

export type ReceizSubjectIntentV1 = Readonly<{
  schema: "receiz.subject.intent.v1";
  speech?: string;
  proposedIntents: readonly Readonly<{
    kind: string;
    targetIds: readonly string[];
    reason: string;
    confidence: number;
    requiredCapabilities: readonly string[];
    observedHead: string;
  }>[];
  memoryCitations: readonly string[];
  performance?: Readonly<Record<string, unknown>>;
  modelAudit: Readonly<{
    provider: string;
    model: string;
    version: string;
    promptDigest: string;
    contextDigest: string;
    outputDigest: string;
    outputIsAuthority: false;
  }>;
}>;

export type ReceizSubjectTwinMessageInput = Readonly<{
  message: string;
  ownerReceizId: string;
  threadKey?: string;
  contextHead: string;
  expectedSubjectDigest: string;
  responseMode?: ReceizSubjectResponseMode;
  clientMessageId: string;
}>;

export type ReceizSubjectTwinResultV1 = Readonly<{
  schema: "receiz.subject.twin_result.v1";
  subjectId: string;
  subjectHead: string;
  spokenResponse: string;
  proposedIntent: ReceizSubjectIntentV1;
  observedFacts: readonly Readonly<{ fact: string; eventIds: readonly string[]; proofObjectIds: readonly string[] }>[];
  proofDerivedMemories: readonly Readonly<{ memoryId: string; summary: string; eventIds: readonly string[] }>[];
  performance: Readonly<Record<string, unknown>> | null;
  proofContext: ReceizSubjectProofContextV1;
  worldEventIds: readonly [];
  authority: Readonly<{
    modelOutputIsWorldEvent: false;
    deterministicAdmissionRequired: true;
  }>;
}>;

export type ReceizSubjectTwinStreamEvent =
  | ReceizSubjectProofBrainStreamEvent
  | Readonly<{ type: "reply_delta"; text: string }>
  | Readonly<{ type: "audio_chunk"; audioB64u: string; startMs: number; endMs: number; confidence: number; contextDigest: string }>
  | Readonly<{ type: "viseme" | "gaze" | "blink" | "breath" | "emotion" | "gesture"; timingMs: number; confidence: number; sourceStateDigest: string; contextDigest: string; reducedMotionCompatible: boolean; value: Readonly<Record<string, unknown>> }>
  | Readonly<{ type: "intent_proposed"; intent: ReceizSubjectIntentV1["proposedIntents"][number] }>
  | Readonly<{ type: "reply_done"; result: ReceizSubjectTwinResultV1 }>;

export type ReceizWorldCommandInputV1 = Readonly<{
  worldId: string;
  actorSubjectId: string;
  kind: string;
  targetIds?: readonly string[];
  payload: Readonly<Record<string, unknown>>;
  expectedHeads: Readonly<Record<string, string>>;
  expectedWorldHead: string;
  attemptId: string;
  idempotencyKey: string;
  mandateDigest?: string;
}>;

export type ReceizWorldCommandV1 = Readonly<{
  schema: "receiz.world.command.v1";
  commandId: string;
  commandDigest: string;
  input: ReceizWorldCommandInputV1;
}>;

export type ReceizWorldCommandPlanV1 = Readonly<{
  schema: "receiz.world.command_plan.v1";
  planId: string;
  planDigest: string;
  command: ReceizWorldCommandV1;
  priorHeads: Readonly<Record<string, string>>;
  worldHead: string;
  registryDigest: string;
  reducerDigest: string;
  writesOnFailure: 0;
}>;

export type ReceizWorldAuthorityV1 = Readonly<{
  actorSubjectId: string;
  ownerReceizId?: string;
  capabilityDigest?: string;
  mandateDigest?: string;
}>;

export type ReceizWorldTransactionAuthorityV1 = Readonly<{
  authorities: Readonly<Record<string, ReceizWorldAuthorityV1>>;
}>;

export type ReceizWorldEventV1 = Readonly<{
  schema: "receiz.world.event.v1";
  eventId: string;
  commandId: string;
  worldId: string;
  kind: string;
  actorSubjectId: string;
  participantSubjectIds: readonly string[];
  payload: Readonly<Record<string, unknown>>;
  causalParents: readonly string[];
  priorHeads: Readonly<Record<string, string>>;
  nextHeads: Readonly<Record<string, string>>;
  priorWorldHead: string;
  worldHead: string;
  mandateDigest?: string;
  kai: string;
  registryDigest: string;
  reducerDigest: string;
}>;

export type ReceizWorldReceiptV1 = Readonly<{
  schema: "receiz.world.receipt.v1";
  receiptId: string;
  commandId: string;
  attemptId: string;
  eventIds: readonly string[];
  actorSubjectId: string;
  mandateDigest?: string;
  priorHeads: Readonly<Record<string, string>>;
  nextHeads: Readonly<Record<string, string>>;
  worldHead: string;
  reducerDigest: string;
  registryDigest: string;
  kai: string;
}>;

export type ReceizZeroWriteFailureV1 = Readonly<{
  ok: false;
  schema: "receiz.world.zero-write-failure.v1";
  code: string;
  message: string;
  commandId: string | null;
  attemptId: string | null;
  writes: 0;
  currentHeads: Readonly<Record<string, string>>;
  worldHead: string;
  registryDigest: string;
  reducerDigest: string;
}>;

export type ReceizWorldExecutionResultV1 =
  | Readonly<{ ok: true; receipt: ReceizWorldReceiptV1; events: readonly ReceizWorldEventV1[] }>
  | ReceizZeroWriteFailureV1;

export type ReceizWorldTransactionV1 = Readonly<{
  schema: "receiz.world.transaction.v1";
  transactionId: string;
  transactionDigest: string;
  worldId: string;
  participants: readonly string[];
  expectedHeads: Readonly<Record<string, string>>;
  commands: readonly ReceizWorldCommandV1[];
  registryDigest: string;
  reducerDigest: string;
}>;

export type ReceizSubjectMandatePolicyV1 = Readonly<{
  allowedActions: readonly string[];
  allowedWorldRegions: readonly string[];
  allowedSubjectIds: readonly string[];
  allowedOwnerReceizIds: readonly string[];
  conversationPrivacy: "public" | "relationship" | "owner-private";
  battleParticipation: boolean;
  itemActions: readonly ("use" | "gift" | "trade")[];
  maximumItemValueMinor: string;
  maximumDailyValueMinor: string;
  approvalThresholdMinor: string;
  minimumRuntimeIntervalKai: string;
  maximumDailyRuns: number;
  publicMemory: boolean;
  privateMemory: boolean;
  expiresAtKai: string;
  modelProviderAllowlist: readonly string[];
  safetyPolicy: string;
  applicationScope: readonly string[];
  tenantScope: readonly string[];
}>;

export type ReceizSubjectMandateV1 = Readonly<{
  schema: "receiz.subject.mandate.v1";
  mandateId: string;
  subjectId: string;
  ownerReceizId: string;
  policy: ReceizSubjectMandatePolicyV1;
  mandateDigest: string;
  status: "planned" | "active" | "paused" | "revoked" | "expired";
  activatedCapabilityDigest: string | null;
  activatedAtKai: string | null;
  revokedAtKai: string | null;
}>;

export type ReceizSubjectMemoryEventV1 = Readonly<{
  schema: "receiz.subject.memory_event.v1";
  memoryId: string;
  subjectId: string;
  type: ReceizSubjectMemoryType;
  summary: string;
  eventIds: readonly string[];
  proofObjectIds: readonly string[];
  visibility: "public" | "private";
  head: string;
  kai: string;
}>;

export type ReceizSubjectMemoryProjectionV1 = Readonly<{
  schema: "receiz.subject.memory_projection.v1";
  subjectId: string;
  throughHead: string;
  memories: readonly ReceizSubjectMemoryEventV1[];
  projectionDigest: string;
  rebuildable: true;
}>;

export type ReceizSubjectRelationshipV1 = Readonly<{
  schema: "receiz.subject.relationship.v1";
  relationshipId: string;
  subjectIds: readonly [string, string];
  status: "proposed" | "active" | "declined" | "blocked";
  familiarity: number;
  trust: number;
  rivalry: number;
  affection: number;
  mentorship: number;
  visibility: "public" | "private";
  eventIds: readonly string[];
  head: string;
}>;

export type ReceizSubjectInventoryItemV1 = Readonly<{
  itemId: string;
  proofObjectId: string;
  ownerSubjectId: string;
  quantity: string;
  valueMinor: string;
  namespaceBytes: string;
}>;

export type ReceizSubjectInventoryV1 = Readonly<{
  schema: "receiz.subject.inventory.v1";
  subjectId: string;
  head: string;
  items: readonly ReceizSubjectInventoryItemV1[];
}>;

export type ReceizSubjectRuntimeTickInput = Readonly<{
  subjectId: string;
  mandateDigest: string;
  expectedHead: string;
  worldHead: string;
  runAfter: string;
  idempotencyKey: string;
}>;

export type ReceizSubjectRuntimeJobV1 = Readonly<{
  jobId: string;
  input: ReceizSubjectRuntimeTickInput;
  status: "queued" | "leased" | "completed" | "failed" | "cancelled" | "stale";
  leaseUntilKai: string | null;
  attemptCount: number;
  eventIds: readonly string[];
  failureCode: string | null;
}>;

export type ReceizBearerTransferPolicyV1 = Readonly<{
  recipientReceizId: string | null;
  openBearer: boolean;
  expiresAtKai: string;
  requiresRecipientAcceptance: boolean;
  priorOwnerConversationPolicy: "encrypted-evidence" | "inherited" | "excluded";
  inventoryDisposition: Readonly<Record<string, "transfer" | "retain" | "detach">>;
}>;

export type ReceizBearerTransferPlanV1 = Readonly<{
  schema: "receiz.bearer.transfer_plan.v1";
  transferId: string;
  transferDigest: string;
  subjectId: string;
  subjectDigest: string;
  expectedSubjectHead: string;
  expectedOwnershipHead: string;
  currentOwnerReceizId: string;
  policy: ReceizBearerTransferPolicyV1;
  policyDigest: string;
  registryDigest: string;
  reducerDigest: string;
}>;

export type ReceizBearerInstrumentV1 = Readonly<{
  schema: "receiz.bearer.instrument.v1";
  plan: ReceizBearerTransferPlanV1;
  oneTimeClaimDigest: string;
  issuedAtKai: string;
  exactBytesB64u: string;
  artifactDigest: string;
  status: "issued" | "pending-acceptance" | "claimed" | "cancelled" | "expired";
}>;

export type ReceizBearerTransferReceiptV1 = Readonly<{
  schema: "receiz.bearer.transfer_receipt.v1";
  receiptId: string;
  transferId: string;
  instrumentDigest: string;
  subjectId: string;
  identityDigest: string;
  priorOwnerReceizId: string;
  nextOwnerReceizId: string;
  priorSubjectHead: string;
  nextSubjectHead: string;
  priorOwnershipHead: string;
  nextOwnershipHead: string;
  eventIds: readonly string[];
  revokedMandateDigests: readonly string[];
  revokedCapabilityDigests: readonly string[];
  cancelledRuntimeJobIds: readonly string[];
  inventoryDispositionDigest: string;
  memoryPolicyDigest: string;
  sealedArtifact: ReceizSubjectArtifactV1;
  kai: string;
  registryDigest: string;
  reducerDigest: string;
}>;

export type ReceizLivingSubjectModel = (input: Readonly<{
  subject: ReceizSubjectV1;
  message: ReceizSubjectTwinMessageInput;
  proofContext: ReceizSubjectProofContextV1;
}>) => Promise<Readonly<{
  provider: string;
  model: string;
  version: string;
  speech: string;
  proposedIntents?: ReceizSubjectIntentV1["proposedIntents"];
  performance?: Readonly<Record<string, unknown>>;
}>>;

export type ReceizSubjectMindArtifactV1 = Readonly<{
  schema: "receiz.subject.mind.v1";
  subjectArtifact: ReceizSubjectArtifactV1;
  brainHead: ReceizSubjectProofBrainHeadV1;
  portableWindow: readonly ReceizSubjectPrimaryProofObjectV1[];
  completeHistory: Readonly<{
    objectCount: string;
    objectMerkleRoot: string;
    indexRoot: string;
    contentAddress: string;
    primaryObjectsRequiredForReasoning: true;
  }>;
  publicMemoryIds: readonly string[];
  privateMemoryIds: readonly string[];
  priorMindHead: string | null;
  mindDigest: string;
  exactBytesB64u: string;
  registryDigest: string;
  reducerDigest: string;
}>;

export type ReceizSubjectCapabilityV1 = Readonly<{
  schema: "receiz.subject.capability.v1";
  subjectId: string;
  receizId: string;
  actions: readonly string[];
  expiresAtKai: string;
  capabilityDigest: string;
}>;

export type ReceizSubjectAdmissionInputV1 = Readonly<{
  subjectId: string;
  proofObjectId: string;
  subjectType: string;
  ownerReceizId: string;
  createdAtKai?: string;
  identityDigest?: string;
  namespaces?: ReceizSubjectNamespaceBytesV1;
  primaryObjects?: readonly ReceizSubjectPrimaryProofObjectV1[];
}>;

export type ReceizBearerCapabilityV1 = Readonly<{
  receizId: string;
  capabilityDigest: string;
}>;
