import type {
  ReceizAdmissionAggregate,
  ReceizAdmissionCommitResult,
  ReceizAdmissionStore,
  ReceizAdmissionStoreInspection,
  ReceizAdmissionUnitOfWork,
} from "./admissionStore.js";
import {
  isReceizAdmissionPersistenceValueSafe,
  receizAdmissionTransactionRecordCount,
  validateReceizAdmissionAggregateSeed,
  validReceizAdmissionUnit,
} from "./admissionStoreValidation.js";
import type { ReceizConstitutionJson } from "./constitution.js";

const DATABASE_VERSION = 1;
const STORES = {
  aggregates: "aggregates",
  idempotency: "idempotency",
  acceptedCommands: "acceptedCommands",
  events: "events",
  resourceLedgers: "resourceLedgers",
  receipts: "receipts",
  outboxIntents: "outboxIntents",
  auditReferences: "auditReferences",
} as const;
const ALL_STORES = Object.values(STORES);

export type ReceizBrowserAdmissionStoreOptions = Readonly<{
  databaseName: string;
  namespace: string;
}>;

type InternalOptions = ReceizBrowserAdmissionStoreOptions & Readonly<{
  maxRecordsPerTransaction?: number;
  failBeforeCommit?: (unit: ReceizAdmissionUnitOfWork) => boolean;
}>;

type AggregateRecord = Readonly<{
  namespace: string;
  aggregateId: string;
  revision: number;
  headDigest: string | null;
  state: ReceizConstitutionJson;
}>;

type IdempotencyRecord = Readonly<{
  namespace: string;
  idempotencyKey: string;
  commandDigest: string;
  receipt: ReceizConstitutionJson;
}>;

function clone<T>(value: T): T {
  return structuredClone(value);
}

function validIdentifier(value: string): boolean {
  return typeof value === "string"
    && value.length >= 1
    && value.length <= 128
    && value.normalize("NFC") === value
    && /^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(value);
}

function validateOptions(options: ReceizBrowserAdmissionStoreOptions): ReceizBrowserAdmissionStoreOptions {
  const databaseName = options?.databaseName;
  const namespace = options?.namespace;
  if (!validIdentifier(databaseName)) {
    throw new TypeError("RECEIZ_ADMISSION_DATABASE_NAME_INVALID");
  }
  if (!validIdentifier(namespace)) {
    throw new TypeError("RECEIZ_ADMISSION_NAMESPACE_INVALID");
  }
  return Object.freeze({ databaseName, namespace });
}

function databaseFactory(): IDBFactory {
  if (typeof indexedDB === "undefined" || typeof indexedDB.open !== "function") {
    throw new Error("RECEIZ_ADMISSION_INDEXEDDB_UNAVAILABLE");
  }
  return indexedDB;
}

function abortQuietly(transaction: IDBTransaction): void {
  try {
    transaction.abort();
  } catch {
    // The transaction may already have been aborted by IndexedDB.
  }
}

function keyOrder(left: readonly IDBValidKey[], right: readonly IDBValidKey[]): number {
  for (let index = 0; index < Math.min(left.length, right.length); index += 1) {
    const a = left[index];
    const b = right[index];
    if (typeof a === "number" && typeof b === "number" && a !== b) return a < b ? -1 : 1;
    const aText = String(a);
    const bText = String(b);
    if (aText !== bText) return aText < bText ? -1 : 1;
  }
  return left.length - right.length;
}

function openReceizBrowserDatabase(databaseName: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    let terminal = false;
    let request: IDBOpenDBRequest;
    try {
      request = databaseFactory().open(databaseName, DATABASE_VERSION);
    } catch (error) {
      reject(error);
      return;
    }
    request.onupgradeneeded = () => {
      if (terminal) {
        abortQuietly(request.transaction as IDBTransaction);
        return;
      }
      const database = request.result;
      for (const storeName of ALL_STORES) {
        if (!database.objectStoreNames.contains(storeName)) database.createObjectStore(storeName);
      }
    };
    request.onsuccess = () => {
      const database = request.result;
      if (terminal) {
        database.close();
        return;
      }
      let schemaIsExact = database.version === DATABASE_VERSION
        && database.objectStoreNames.length === ALL_STORES.length
        && ALL_STORES.every((name) => database.objectStoreNames.contains(name));
      if (schemaIsExact) {
        try {
          const schemaTransaction = database.transaction(ALL_STORES, "readonly");
          schemaIsExact = ALL_STORES.every((name) => {
            const store = schemaTransaction.objectStore(name);
            return store.keyPath === null && store.autoIncrement === false && store.indexNames.length === 0;
          });
        } catch {
          schemaIsExact = false;
        }
      }
      if (!schemaIsExact) {
        terminal = true;
        database.close();
        reject(new Error("RECEIZ_ADMISSION_INDEXEDDB_SCHEMA_INVALID"));
        return;
      }
      terminal = true;
      resolve(database);
    };
    request.onerror = () => {
      if (terminal) return;
      terminal = true;
      reject(request.error ?? new Error("RECEIZ_ADMISSION_INDEXEDDB_OPEN_FAILED"));
    };
    request.onblocked = () => {
      if (terminal) return;
      terminal = true;
      reject(new Error("RECEIZ_ADMISSION_INDEXEDDB_OPEN_BLOCKED"));
    };
  });
}

function completedRead<T>(
  database: IDBDatabase,
  storeNames: string | string[],
  schedule: (transaction: IDBTransaction) => IDBRequest<T>,
): Promise<T> {
  return new Promise((resolve, reject) => {
    let value!: T;
    let transaction: IDBTransaction;
    try {
      transaction = database.transaction(storeNames, "readonly");
      const request = schedule(transaction);
      request.onsuccess = () => { value = request.result; };
      request.onerror = () => abortQuietly(transaction);
    } catch (error) {
      reject(error);
      return;
    }
    transaction.oncomplete = () => resolve(clone(value));
    transaction.onabort = () => reject(transaction.error ?? new Error("RECEIZ_ADMISSION_INDEXEDDB_READ_FAILED"));
    transaction.onerror = () => undefined;
  });
}

export function createReceizBrowserAdmissionStoreInternal(options: InternalOptions): ReceizAdmissionStore {
  const validated = validateOptions(options);
  const namespace = validated.namespace;
  const maxRecords = options.maxRecordsPerTransaction ?? 256;
  const failBeforeCommit = options.failBeforeCommit;
  let openPromise: Promise<IDBDatabase> | null = null;

  const openDatabase = (): Promise<IDBDatabase> => {
    if (openPromise) return openPromise;
    const cached = openReceizBrowserDatabase(validated.databaseName).then((database) => {
      database.onversionchange = () => {
        database.close();
        if (openPromise === cached) openPromise = null;
      };
      return database;
    }).catch((error) => {
      if (openPromise === cached) openPromise = null;
      throw error;
    });
    openPromise = cached;
    return cached;
  };

  const store: ReceizAdmissionStore = {
    async readAggregate(aggregateId) {
      const database = await openDatabase();
      const record = await completedRead(
        database,
        STORES.aggregates,
        (transaction) => transaction.objectStore(STORES.aggregates).get([namespace, aggregateId]),
      ) as AggregateRecord | undefined;
      return record
        ? clone({ revision: record.revision, headDigest: record.headDigest, state: record.state })
        : null;
    },

    async readIdempotency(idempotencyKey) {
      const database = await openDatabase();
      const record = await completedRead(
        database,
        STORES.idempotency,
        (transaction) => transaction.objectStore(STORES.idempotency).get([namespace, idempotencyKey]),
      ) as IdempotencyRecord | undefined;
      return record ? clone({ commandDigest: record.commandDigest, receipt: record.receipt }) : null;
    },

    commit(unit) {
      if (!isReceizAdmissionPersistenceValueSafe(unit) || !validReceizAdmissionUnit(unit)) {
        return Promise.resolve({ status: "rejected", code: "UNIT_OF_WORK_INVALID" });
      }
      try {
        unit = clone(unit);
      } catch {
        return Promise.resolve({ status: "rejected", code: "UNIT_OF_WORK_INVALID" });
      }
      if (!isReceizAdmissionPersistenceValueSafe(unit) || !validReceizAdmissionUnit(unit)) {
        return Promise.resolve({ status: "rejected", code: "UNIT_OF_WORK_INVALID" });
      }
      if (receizAdmissionTransactionRecordCount(unit) > maxRecords) {
        return Promise.resolve({ status: "rejected", code: "TRANSACTION_LIMIT_EXCEEDED" });
      }
      return openDatabase().then((database) => new Promise<ReceizAdmissionCommitResult>((resolve) => {
        let result: ReceizAdmissionCommitResult = { status: "failed", code: "ATOMIC_COMMIT_FAILED" };
        let settled = false;
        let transaction: IDBTransaction;
        const finish = (value: ReceizAdmissionCommitResult): void => {
          if (settled) return;
          settled = true;
          resolve(value);
        };
        try {
          transaction = database.transaction(ALL_STORES, "readwrite");
          const idempotencyStore = transaction.objectStore(STORES.idempotency);
          const duplicateRequest = idempotencyStore.get([namespace, unit.idempotencyKey]);
          duplicateRequest.onsuccess = () => {
            const duplicate = duplicateRequest.result as IdempotencyRecord | undefined;
            if (duplicate) {
              result = duplicate.commandDigest === unit.commandDigest
                ? { status: "idempotent", receipt: clone(duplicate.receipt) }
                : { status: "conflict", code: "IDEMPOTENCY_CONFLICT" };
              return;
            }
            const aggregateStore = transaction.objectStore(STORES.aggregates);
            const checkTargetAndCommit = (): void => {
            const aggregateRequest = aggregateStore.get([namespace, unit.aggregateId]);
            aggregateRequest.onsuccess = () => {
              const aggregate = aggregateRequest.result as AggregateRecord | undefined;
              const current: ReceizAdmissionAggregate = aggregate
                ? { revision: aggregate.revision, headDigest: aggregate.headDigest, state: aggregate.state }
                : { revision: 0, headDigest: null, state: {} };
              if (current.revision !== unit.expectedRevision) {
                result = { status: "conflict", code: "EXPECTED_REVISION_MISMATCH", expectedRevision: current.revision };
                return;
              }
              if (current.headDigest !== unit.expectedHeadDigest) {
                result = { status: "conflict", code: "CAUSAL_PARENT_MISMATCH", expectedHead: current.headDigest };
                return;
              }
              try {
                aggregateStore.put({
                  namespace,
                  aggregateId: unit.aggregateId,
                  revision: unit.nextHead.revision,
                  headDigest: unit.nextHead.digest,
                  state: clone(unit.nextHead.state),
                }, [namespace, unit.aggregateId]);
                idempotencyStore.add({
                  namespace,
                  idempotencyKey: unit.idempotencyKey,
                  commandDigest: unit.commandDigest,
                  receipt: clone(unit.receipt),
                }, [namespace, unit.idempotencyKey]);
                transaction.objectStore(STORES.acceptedCommands).add({
                  namespace,
                  commandDigest: unit.commandDigest,
                  value: clone(unit.acceptedCommand),
                }, [namespace, unit.commandDigest]);
                for (const [index, event] of unit.events.entries()) {
                  transaction.objectStore(STORES.events).add({ namespace, commandDigest: unit.commandDigest, index, value: clone(event) }, [namespace, unit.commandDigest, index]);
                }
                transaction.objectStore(STORES.resourceLedgers).add({
                  namespace,
                  commandDigest: unit.commandDigest,
                  aggregateId: unit.aggregateId,
                  effects: clone(unit.resourceEffects),
                }, [namespace, unit.commandDigest]);
                for (const receiptDigest of unit.consumedPbiReceiptDigests ?? []) {
                  transaction.objectStore(STORES.resourceLedgers).add({ namespace, commandDigest: unit.commandDigest,
                    aggregateId: unit.aggregateId, effects: { "pbi.ceremony.consume": 1 }, pbiReceiptDigest: receiptDigest,
                  }, [namespace, "pbi.ceremony.receipt", receiptDigest]);
                }
                transaction.objectStore(STORES.receipts).add({ namespace, commandDigest: unit.commandDigest, value: clone(unit.receipt) }, [namespace, unit.commandDigest]);
                for (const [index, intent] of unit.outboxIntents.entries()) {
                  transaction.objectStore(STORES.outboxIntents).add({ namespace, commandDigest: unit.commandDigest, index, value: clone(intent) }, [namespace, unit.commandDigest, index]);
                }
                transaction.objectStore(STORES.auditReferences).add({ namespace, commandDigest: unit.commandDigest, value: clone(unit.auditReference) }, [namespace, unit.commandDigest]);
                result = { status: "committed", receipt: clone(unit.receipt) };
                if (failBeforeCommit?.(unit)) abortQuietly(transaction);
              } catch {
                abortQuietly(transaction);
              }
            };
            aggregateRequest.onerror = () => abortQuietly(transaction);
            };
            // Keep every dependency read and the append in this same readwrite
            // transaction. No promise boundary can turn this into preflight CAS.
            const dependencies = unit.readDependencies ?? [];
            const receipts = unit.consumedPbiReceiptDigests ?? [];
            let pending = dependencies.length + receipts.length;
            let conflict = false;
            let replayed = false;
            const finishChecks = (): void => {
              if (pending !== 0) return;
              if (conflict) result = { status: "conflict", code: "READ_DEPENDENCY_MISMATCH" };
              else if (replayed) result = { status: "conflict", code: "PBI_RECEIPT_REPLAYED" };
              else checkTargetAndCommit();
            };
            finishChecks();
            for (const digest of receipts) {
              const request = transaction.objectStore(STORES.resourceLedgers).get([namespace, "pbi.ceremony.receipt", digest]);
              request.onsuccess = () => { if (request.result !== undefined) replayed = true; pending -= 1; finishChecks(); };
              request.onerror = () => abortQuietly(transaction);
            }
            for (const dependency of dependencies) {
              const request = aggregateStore.get([namespace, dependency.aggregateId]);
              request.onsuccess = () => {
                const current = request.result as AggregateRecord | undefined;
                if (!current || current.headDigest !== dependency.expectedHeadDigest) conflict = true;
                pending -= 1;
                finishChecks();
              };
              request.onerror = () => abortQuietly(transaction);
            }
          };
          duplicateRequest.onerror = () => abortQuietly(transaction);
        } catch {
          finish({ status: "failed", code: "ATOMIC_COMMIT_FAILED" });
          return;
        }
        transaction.oncomplete = () => finish(result);
        transaction.onabort = () => finish({ status: "failed", code: "ATOMIC_COMMIT_FAILED" });
        transaction.onerror = () => undefined;
      })).catch(() => ({ status: "failed", code: "ATOMIC_COMMIT_FAILED" }));
    },

    seedAggregate(input) {
      try {
        validateReceizAdmissionAggregateSeed(input);
        input = clone(input);
        validateReceizAdmissionAggregateSeed(input);
      } catch (error) {
        return Promise.reject(error);
      }
      return openDatabase().then((database) => new Promise<void>((resolve, reject) => {
        let transaction: IDBTransaction;
        let duplicate = false;
        try {
          transaction = database.transaction(STORES.aggregates, "readwrite");
          const aggregateStore = transaction.objectStore(STORES.aggregates);
          const request = aggregateStore.get([namespace, input.aggregateId]);
          request.onsuccess = () => {
            if (request.result !== undefined) {
              duplicate = true;
              abortQuietly(transaction);
              return;
            }
            try {
              aggregateStore.add({
                namespace,
                aggregateId: input.aggregateId,
                revision: input.revision,
                headDigest: input.headDigest,
                state: clone(input.state),
              }, [namespace, input.aggregateId]);
            } catch {
              abortQuietly(transaction);
            }
          };
          request.onerror = () => abortQuietly(transaction);
        } catch (error) {
          reject(error);
          return;
        }
        transaction.oncomplete = () => resolve();
        transaction.onabort = () => reject(new Error(duplicate
          ? "RECEIZ_ADMISSION_AGGREGATE_ALREADY_EXISTS"
          : "RECEIZ_ADMISSION_ATOMIC_SEED_FAILED"));
        transaction.onerror = () => undefined;
      }));
    },

    async inspect() {
      const database = await openDatabase();
      return new Promise<ReceizAdmissionStoreInspection>((resolve, reject) => {
        let transaction: IDBTransaction;
        const rows = new Map<string, Readonly<{ values: readonly unknown[]; keys: readonly IDBValidKey[] }>>();
        try {
          transaction = database.transaction(ALL_STORES, "readonly");
          for (const name of ALL_STORES) {
            const objectStore = transaction.objectStore(name);
            const valuesRequest = objectStore.getAll();
            const keysRequest = objectStore.getAllKeys();
            let values: readonly unknown[] | null = null;
            let keys: readonly IDBValidKey[] | null = null;
            const retainCompletedPair = (): void => {
              if (values && keys) rows.set(name, { values, keys });
            };
            valuesRequest.onsuccess = () => {
              values = valuesRequest.result as readonly unknown[];
              retainCompletedPair();
            };
            keysRequest.onsuccess = () => {
              keys = keysRequest.result;
              retainCompletedPair();
            };
            valuesRequest.onerror = () => abortQuietly(transaction);
            keysRequest.onerror = () => abortQuietly(transaction);
          }
        } catch (error) {
          reject(error);
          return;
        }
        transaction.oncomplete = () => {
          const namespaced = <T extends { namespace: string }>(name: string): T[] => {
            const batch = rows.get(name);
            if (!batch || batch.values.length !== batch.keys.length) return [];
            return batch.values.map((row, index) => ({ row, key: batch.keys[index] }))
              .filter((entry): entry is { row: T; key: IDBValidKey[] } => Boolean(
                Array.isArray(entry.key)
                && entry.key[0] === namespace
                && entry.row
                && typeof entry.row === "object"
                && (entry.row as T).namespace === namespace,
              ))
              .sort((a, b) => keyOrder(a.key, b.key))
              .map((entry) => entry.row);
          };
          const accepted = namespaced<{ namespace: string; commandDigest: string; value: ReceizConstitutionJson }>(STORES.acceptedCommands);
          const events = namespaced<{ namespace: string; commandDigest: string; index: number; value: ReceizConstitutionJson }>(STORES.events);
          const heads = namespaced<AggregateRecord>(STORES.aggregates);
          const ledgers = namespaced<{ namespace: string; commandDigest: string; aggregateId: string; effects: Readonly<Record<string, number>>; pbiReceiptDigest?: string }>(STORES.resourceLedgers);
          const receipts = namespaced<{ namespace: string; commandDigest: string; value: ReceizConstitutionJson }>(STORES.receipts);
          const idempotency = namespaced<IdempotencyRecord>(STORES.idempotency);
          const outbox = namespaced<{ namespace: string; commandDigest: string; index: number; value: ReceizConstitutionJson }>(STORES.outboxIntents);
          const audit = namespaced<{ namespace: string; commandDigest: string; value: ReceizConstitutionJson }>(STORES.auditReferences);
          resolve(clone({
            acceptedCommands: accepted.map((row) => row.value),
            events: events.map((row) => row.value),
            heads: heads.map((row) => ({ aggregateId: row.aggregateId, revision: row.revision, headDigest: row.headDigest, state: row.state })),
            resourceLedgers: ledgers.map((row) => ({ aggregateId: row.aggregateId, effects: row.effects,
              ...(row.pbiReceiptDigest ? { pbiReceiptDigest: row.pbiReceiptDigest } : {}) })),
            receipts: receipts.map((row) => row.value),
            idempotencyRecords: idempotency.map((row) => ({ idempotencyKey: row.idempotencyKey, commandDigest: row.commandDigest, receipt: row.receipt })),
            outboxIntents: outbox.map((row) => row.value),
            auditReferences: audit.map((row) => row.value),
          }));
        };
        transaction.onabort = () => reject(transaction.error ?? new Error("RECEIZ_ADMISSION_INDEXEDDB_INSPECTION_FAILED"));
        transaction.onerror = () => undefined;
      });
    },
  };
  return Object.freeze(store);
}

export function createReceizBrowserAdmissionStore(
  options: ReceizBrowserAdmissionStoreOptions,
): ReceizAdmissionStore {
  return createReceizBrowserAdmissionStoreInternal(options);
}
