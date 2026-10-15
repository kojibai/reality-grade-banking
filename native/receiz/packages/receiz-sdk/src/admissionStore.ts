import {
  canonicalizeReceizConstitution,
  type ReceizConstitutionJson,
} from "./constitution.js";
import {
  receizAdmissionTransactionRecordCount,
  validateReceizAdmissionAggregateSeed,
  validReceizAdmissionUnit,
} from "./admissionStoreValidation.js";

export type ReceizAdmissionAggregate = Readonly<{
  revision: number;
  headDigest: string | null;
  state: ReceizConstitutionJson;
}>;

export type ReceizAdmissionAggregateSeed = Readonly<{
  aggregateId: string;
  revision: number;
  headDigest: string | null;
  state: ReceizConstitutionJson;
}>;

export type ReceizAdmissionUnitOfWork = Readonly<{
  schema: "receiz.admission.unit-of-work.v1";
  aggregateId: string;
  commandDigest: string;
  idempotencyKey: string;
  expectedRevision: number;
  expectedHeadDigest: string | null;
  /** Read-only exact heads, checked in the same transaction as the accepted append. */
  readDependencies?: readonly Readonly<{ aggregateId: string; expectedHeadDigest: string }>[];
  /** Existing verified ceremony receipts consumed with this append, never before CAS. */
  consumedPbiReceiptDigests?: readonly string[];
  acceptedCommand: ReceizConstitutionJson;
  events: readonly ReceizConstitutionJson[];
  nextHead: Readonly<{ revision: number; digest: string; state: ReceizConstitutionJson }>;
  resourceEffects: Readonly<Record<string, number>>;
  receipt: ReceizConstitutionJson;
  outboxIntents: readonly ReceizConstitutionJson[];
  auditReference: ReceizConstitutionJson;
}>;

export type ReceizAdmissionCommitResult =
  | Readonly<{ status: "committed"; receipt: ReceizConstitutionJson }>
  | Readonly<{ status: "idempotent"; receipt: ReceizConstitutionJson }>
  | Readonly<{ status: "conflict"; code: "IDEMPOTENCY_CONFLICT" | "EXPECTED_REVISION_MISMATCH" | "CAUSAL_PARENT_MISMATCH" | "READ_DEPENDENCY_MISMATCH" | "PBI_RECEIPT_REPLAYED"; expectedRevision?: number; expectedHead?: string | null }>
  | Readonly<{ status: "rejected"; code: "TRANSACTION_LIMIT_EXCEEDED" | "UNIT_OF_WORK_INVALID" | "ATOMIC_GUARDS_UNSUPPORTED" }>
  | Readonly<{ status: "failed"; code: "ATOMIC_COMMIT_FAILED" }>;

export type ReceizAdmissionStoreInspection = {
  acceptedCommands: ReceizConstitutionJson[];
  events: ReceizConstitutionJson[];
  heads: ReceizConstitutionJson[];
  resourceLedgers: ReceizConstitutionJson[];
  receipts: ReceizConstitutionJson[];
  idempotencyRecords: ReceizConstitutionJson[];
  outboxIntents: ReceizConstitutionJson[];
  auditReferences: ReceizConstitutionJson[];
};

export type ReceizAdmissionStore = Readonly<{
  readAggregate(aggregateId: string): Promise<ReceizAdmissionAggregate | null>;
  readIdempotency(idempotencyKey: string): Promise<Readonly<{ commandDigest: string; receipt: ReceizConstitutionJson }> | null>;
  commit(unit: ReceizAdmissionUnitOfWork): Promise<ReceizAdmissionCommitResult>;
  seedAggregate(input: ReceizAdmissionAggregateSeed): Promise<void>;
  inspect(): Promise<ReceizAdmissionStoreInspection>;
}>;

export type ReceizAdmissionStoreConformanceFactories = Readonly<{
  create(): ReceizAdmissionStore;
  createLimited(): ReceizAdmissionStore;
  createFailing(): ReceizAdmissionStore;
}>;

export type ReceizAdmissionStoreConformanceReport = Readonly<{
  schema: "receiz.admission-store.conformance.v1";
  ok: boolean;
  checks: Readonly<{
    atomicCollections: boolean;
    optimisticConcurrency: boolean;
    idempotentRetry: boolean;
    idempotencyConflict: boolean;
    detachedReads: boolean;
    outboxCommitted: boolean;
    transactionLimits: boolean;
    crashRollback: boolean;
  }>;
}>;

function clone<T>(value: T): T {
  return structuredClone(value);
}

export function createReceizInMemoryAdmissionStore(options: {
  maxRecordsPerTransaction?: number;
  failBeforeSwap?: (unit: ReceizAdmissionUnitOfWork) => boolean;
} = {}): ReceizAdmissionStore {
  const maxRecords = options.maxRecordsPerTransaction ?? 256;
  let aggregates = new Map<string, ReceizAdmissionAggregate>();
  let idempotency = new Map<string, { commandDigest: string; receipt: ReceizConstitutionJson }>();
  let acceptedCommands: ReceizConstitutionJson[] = [];
  let events: ReceizConstitutionJson[] = [];
  let resourceLedgers: ReceizConstitutionJson[] = [];
  let receipts: ReceizConstitutionJson[] = [];
  let outboxIntents: ReceizConstitutionJson[] = [];
  let auditReferences: ReceizConstitutionJson[] = [];

  return {
    async readAggregate(aggregateId) {
      const aggregate = aggregates.get(aggregateId);
      return aggregate ? clone(aggregate) : null;
    },
    async readIdempotency(idempotencyKey) {
      const entry = idempotency.get(idempotencyKey);
      return entry ? clone(entry) : null;
    },
    async commit(unit) {
      if (!validReceizAdmissionUnit(unit)) return { status: "rejected", code: "UNIT_OF_WORK_INVALID" };
      unit = clone(unit);
      if (receizAdmissionTransactionRecordCount(unit) > maxRecords) return { status: "rejected", code: "TRANSACTION_LIMIT_EXCEEDED" };
      const duplicate = idempotency.get(unit.idempotencyKey);
      if (duplicate) return duplicate.commandDigest === unit.commandDigest
        ? { status: "idempotent", receipt: clone(duplicate.receipt) }
        : { status: "conflict", code: "IDEMPOTENCY_CONFLICT" };
      for (const receiptDigest of unit.consumedPbiReceiptDigests ?? []) {
        if (resourceLedgers.some((ledger) => ledger !== null && typeof ledger === "object" && !Array.isArray(ledger)
          && ledger.pbiReceiptDigest === receiptDigest)) {
          return { status: "conflict", code: "PBI_RECEIPT_REPLAYED" };
        }
      }
      for (const dependency of unit.readDependencies ?? []) {
        if (aggregates.get(dependency.aggregateId)?.headDigest !== dependency.expectedHeadDigest) {
          return { status: "conflict", code: "READ_DEPENDENCY_MISMATCH" };
        }
      }
      const current = aggregates.get(unit.aggregateId) ?? { revision: 0, headDigest: null, state: {} };
      if (current.revision !== unit.expectedRevision) return { status: "conflict", code: "EXPECTED_REVISION_MISMATCH", expectedRevision: current.revision };
      if (current.headDigest !== unit.expectedHeadDigest) return { status: "conflict", code: "CAUSAL_PARENT_MISMATCH", expectedHead: current.headDigest };

      const nextAggregates = new Map(aggregates);
      const nextIdempotency = new Map(idempotency);
      const nextAcceptedCommands = clone(acceptedCommands);
      const nextEvents = clone(events);
      const nextResourceLedgers = clone(resourceLedgers);
      const nextReceipts = clone(receipts);
      const nextOutboxIntents = clone(outboxIntents);
      const nextAuditReferences = clone(auditReferences);
      nextAggregates.set(unit.aggregateId, { revision: unit.nextHead.revision, headDigest: unit.nextHead.digest, state: clone(unit.nextHead.state) });
      nextIdempotency.set(unit.idempotencyKey, { commandDigest: unit.commandDigest, receipt: clone(unit.receipt) });
      nextAcceptedCommands.push(clone(unit.acceptedCommand));
      nextEvents.push(...clone(unit.events));
      nextResourceLedgers.push({ aggregateId: unit.aggregateId, effects: clone(unit.resourceEffects) });
      for (const receiptDigest of unit.consumedPbiReceiptDigests ?? []) {
        nextResourceLedgers.push({ aggregateId: unit.aggregateId, effects: { "pbi.ceremony.consume": 1 }, pbiReceiptDigest: receiptDigest });
      }
      nextReceipts.push(clone(unit.receipt));
      nextOutboxIntents.push(...clone(unit.outboxIntents));
      nextAuditReferences.push(clone(unit.auditReference));
      if (options.failBeforeSwap?.(unit)) return { status: "failed", code: "ATOMIC_COMMIT_FAILED" };

      aggregates = nextAggregates;
      idempotency = nextIdempotency;
      acceptedCommands = nextAcceptedCommands;
      events = nextEvents;
      resourceLedgers = nextResourceLedgers;
      receipts = nextReceipts;
      outboxIntents = nextOutboxIntents;
      auditReferences = nextAuditReferences;
      return { status: "committed", receipt: clone(unit.receipt) };
    },
    async seedAggregate(input) {
      validateReceizAdmissionAggregateSeed(input);
      if (aggregates.has(input.aggregateId)) {
        throw new Error("RECEIZ_ADMISSION_AGGREGATE_ALREADY_EXISTS");
      }
      aggregates.set(input.aggregateId, { revision: input.revision, headDigest: input.headDigest, state: clone(input.state) });
    },
    async inspect() {
      return clone({
        acceptedCommands,
        events,
        heads: [...aggregates.entries()].map(([aggregateId, aggregate]) => ({ aggregateId, ...aggregate })),
        resourceLedgers,
        receipts,
        idempotencyRecords: [...idempotency.entries()].map(([idempotencyKey, entry]) => ({ idempotencyKey, ...entry })),
        outboxIntents,
        auditReferences,
      });
    },
  };
}

function conformanceUnit(sequence: number, overrides: Partial<ReceizAdmissionUnitOfWork> = {}): ReceizAdmissionUnitOfWork {
  return {
    schema: "receiz.admission.unit-of-work.v1",
    aggregateId: "conformance:aggregate",
    commandDigest: `conformance-command:${sequence}`,
    idempotencyKey: `conformance-idempotency:${sequence}`,
    expectedRevision: 0,
    expectedHeadDigest: null,
    acceptedCommand: { commandId: `conformance-command:${sequence}` },
    events: [{ type: "receiz.conformance.event", sequence }],
    nextHead: { revision: 1, digest: `conformance-head:${sequence}`, state: { sequence } },
    resourceEffects: { conformance: sequence },
    receipt: { receiptId: `conformance-receipt:${sequence}` },
    outboxIntents: [{ type: "receiz.conformance.outbox", sequence }],
    auditReference: { commandId: `conformance-command:${sequence}` },
    ...overrides,
  };
}

function inspectionIsEmpty(inspection: ReceizAdmissionStoreInspection): boolean {
  return Object.values(inspection).every((collection) => collection.length === 0);
}

/**
 * Executes the normative admission-store contract against a production adapter.
 * The caller must provide isolated normal, transaction-limited, and crash-injected
 * instances so rollback behavior is evidence supplied by the adapter itself.
 */
export async function runReceizAdmissionStoreConformance(
  factories: ReceizAdmissionStoreConformanceFactories,
): Promise<ReceizAdmissionStoreConformanceReport> {
  const store = factories.create();
  const firstUnit = conformanceUnit(1);
  const secondUnit = conformanceUnit(2);
  const [first, second] = await Promise.all([store.commit(firstUnit), store.commit(secondUnit)]);
  const inspection = await store.inspect();
  const committed = first.status === "committed" ? firstUnit : secondUnit;
  const retry = await store.commit(committed);
  const idempotencyConflict = await store.commit(conformanceUnit(3, {
    idempotencyKey: committed.idempotencyKey,
  }));

  const aggregate = await store.readAggregate(committed.aggregateId);
  if (aggregate && typeof aggregate.state === "object" && aggregate.state !== null && !Array.isArray(aggregate.state)) {
    aggregate.state.sequence = 999;
  }
  const detachedRead = await store.readAggregate(committed.aggregateId);
  const detachedInspection = await store.inspect();
  detachedInspection.events.push({ type: "forged" });

  const limited = factories.createLimited();
  const limitedResult = await limited.commit(conformanceUnit(4));
  const failing = factories.createFailing();
  const failingResult = await failing.commit(conformanceUnit(5));

  const checks = {
    atomicCollections: inspection.acceptedCommands.length === 1
      && inspection.events.length === 1
      && inspection.heads.length === 1
      && inspection.resourceLedgers.length === 1
      && inspection.receipts.length === 1
      && inspection.idempotencyRecords.length === 1
      && inspection.auditReferences.length === 1,
    optimisticConcurrency: [first.status, second.status].filter((status) => status === "committed").length === 1
      && [first.status, second.status].filter((status) => status === "conflict").length === 1,
    idempotentRetry: retry.status === "idempotent",
    idempotencyConflict: idempotencyConflict.status === "conflict" && idempotencyConflict.code === "IDEMPOTENCY_CONFLICT",
    detachedReads: detachedRead !== null
      && canonicalizeReceizConstitution(detachedRead.state) === canonicalizeReceizConstitution(committed.nextHead.state)
      && (await store.inspect()).events.length === 1,
    outboxCommitted: inspection.outboxIntents.length === 1,
    transactionLimits: limitedResult.status === "rejected"
      && limitedResult.code === "TRANSACTION_LIMIT_EXCEEDED"
      && inspectionIsEmpty(await limited.inspect()),
    crashRollback: failingResult.status === "failed"
      && failingResult.code === "ATOMIC_COMMIT_FAILED"
      && inspectionIsEmpty(await failing.inspect())
      && await failing.readAggregate("conformance:aggregate") === null
      && await failing.readIdempotency("conformance-idempotency:5") === null,
  };
  return {
    schema: "receiz.admission-store.conformance.v1",
    ok: Object.values(checks).every(Boolean),
    checks,
  };
}
