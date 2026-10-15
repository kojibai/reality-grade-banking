import {
  canonicalizeReceizConstitution,
  digestReceizConstitution,
  type ReceizConstitutionJson,
} from "./constitution.js";

export type ReceizCausalEvent =
  | Readonly<{ type: "asset.retired" | "asset.alive"; assetId: string }>
  | Readonly<{ type: "capability.revoked"; capabilityDigest: string }>
  | Readonly<{ type: "ownership.assigned"; assetId: string; ownerId: string }>
  | Readonly<{ type: "resource.spent"; resourceId: string; amount: number }>
  | Readonly<{ type: "reward.granted"; causeId: string; resourceId: string; amount: number }>
  | Readonly<{ type: "injury.recorded" | "liability.recorded" | "settlement.recorded"; assetId: string; amount: number }>;

export type ReceizCausalRecord = Readonly<{
  schema: "receiz.causal.record.v1";
  recordDigest: string;
  registryDigest: string;
  aggregateId: string;
  kaiPulse: string;
  parentDigests: readonly string[];
  receiptDigest: string;
  receipt: ReceizConstitutionJson;
  event: ReceizCausalEvent;
  authority: Readonly<{ causalRecordIsProofAuthority: false; strongerTruth: "sealed-receiz-proof-object" }>;
}>;

export type ReceizCausalHistory = Readonly<{
  registryDigest: string;
  import(record: ReceizCausalRecord): Promise<void>;
  records(): ReceizCausalRecord[];
  heads(): string[];
  historyRoot(): Promise<string>;
  isAncestor(ancestorDigest: string, descendantDigest: string): boolean;
  appendToProofMemory(memory: { append(entry: { id: string; kind: string; createdAt: string | null; kaiUpulse: string; proof: null; payload: Record<string, unknown>; projection: Record<string, unknown> }): unknown }): void;
}>;

const digestPattern = /^[a-f0-9]{64}$/;
const kaiPattern = /^(0|[1-9][0-9]*)$/;

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function nonempty(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function amount(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function assertEvent(value: unknown): asserts value is ReceizCausalEvent {
  if (!record(value) || !nonempty(value.type)) throw new Error("CAUSAL_EVENT_INVALID");
  const exact = (keys: string[]) => Object.keys(value).every((key) => keys.includes(key));
  switch (value.type) {
    case "asset.retired":
    case "asset.alive":
      if (!exact(["type", "assetId"]) || !nonempty(value.assetId)) throw new Error("CAUSAL_EVENT_INVALID");
      return;
    case "capability.revoked":
      if (!exact(["type", "capabilityDigest"]) || !digestPattern.test(String(value.capabilityDigest))) throw new Error("CAUSAL_EVENT_INVALID");
      return;
    case "ownership.assigned":
      if (!exact(["type", "assetId", "ownerId"]) || !nonempty(value.assetId) || !nonempty(value.ownerId)) throw new Error("CAUSAL_EVENT_INVALID");
      return;
    case "resource.spent":
      if (!exact(["type", "resourceId", "amount"]) || !nonempty(value.resourceId) || !amount(value.amount)) throw new Error("CAUSAL_EVENT_INVALID");
      return;
    case "reward.granted":
      if (!exact(["type", "causeId", "resourceId", "amount"]) || !nonempty(value.causeId) || !nonempty(value.resourceId) || !amount(value.amount)) throw new Error("CAUSAL_EVENT_INVALID");
      return;
    case "injury.recorded":
    case "liability.recorded":
    case "settlement.recorded":
      if (!exact(["type", "assetId", "amount"]) || !nonempty(value.assetId) || !amount(value.amount)) throw new Error("CAUSAL_EVENT_INVALID");
      return;
    default:
      throw new Error("CAUSAL_EVENT_INVALID");
  }
}

function recordBasis(value: Omit<ReceizCausalRecord, "recordDigest">): ReceizConstitutionJson {
  return value as unknown as ReceizConstitutionJson;
}

function compareCausal(left: ReceizCausalRecord, right: ReceizCausalRecord): number {
  const leftKai = BigInt(left.kaiPulse);
  const rightKai = BigInt(right.kaiPulse);
  if (leftKai < rightKai) return -1;
  if (leftKai > rightKai) return 1;
  return left.recordDigest.localeCompare(right.recordDigest);
}

function assertRecordShape(value: unknown): asserts value is ReceizCausalRecord {
  if (!record(value) || value.schema !== "receiz.causal.record.v1") throw new Error("CAUSAL_RECORD_INVALID");
  const keys = ["schema", "recordDigest", "registryDigest", "aggregateId", "kaiPulse", "parentDigests", "receiptDigest", "receipt", "event", "authority"];
  if (!Object.keys(value).every((key) => keys.includes(key))
    || !digestPattern.test(String(value.recordDigest))
    || !digestPattern.test(String(value.registryDigest))
    || !nonempty(value.aggregateId)
    || !kaiPattern.test(String(value.kaiPulse))
    || !Array.isArray(value.parentDigests)
    || value.parentDigests.some((parent) => typeof parent !== "string" || !digestPattern.test(parent))
    || new Set(value.parentDigests).size !== value.parentDigests.length
    || !digestPattern.test(String(value.receiptDigest))
    || !record(value.authority)
    || value.authority.causalRecordIsProofAuthority !== false
    || value.authority.strongerTruth !== "sealed-receiz-proof-object") throw new Error("CAUSAL_RECORD_INVALID");
  assertEvent(value.event);
  canonicalizeReceizConstitution(value.receipt);
}

export async function createReceizCausalRecord(input: {
  registryDigest: string;
  aggregateId: string;
  kaiPulse: string;
  parentDigests: readonly string[];
  receipt: ReceizConstitutionJson;
  event: ReceizCausalEvent;
}): Promise<ReceizCausalRecord> {
  if (!digestPattern.test(input.registryDigest) || !nonempty(input.aggregateId) || !kaiPattern.test(input.kaiPulse)
    || input.parentDigests.some((parent) => !digestPattern.test(parent)) || new Set(input.parentDigests).size !== input.parentDigests.length) throw new Error("CAUSAL_RECORD_INVALID");
  assertEvent(input.event);
  canonicalizeReceizConstitution(input.receipt);
  const receiptDigest = await digestReceizConstitution(input.receipt);
  const basis: Omit<ReceizCausalRecord, "recordDigest"> = {
    schema: "receiz.causal.record.v1",
    registryDigest: input.registryDigest,
    aggregateId: input.aggregateId,
    kaiPulse: input.kaiPulse,
    parentDigests: [...input.parentDigests].sort(),
    receiptDigest,
    receipt: structuredClone(input.receipt),
    event: structuredClone(input.event),
    authority: { causalRecordIsProofAuthority: false, strongerTruth: "sealed-receiz-proof-object" },
  };
  return { ...basis, recordDigest: await digestReceizConstitution(recordBasis(basis)) };
}

export function createReceizCausalHistory(options: {
  registryDigest: string;
  verifyAdmissionReceipt: (receipt: ReceizConstitutionJson, receiptDigest: string) => boolean | Promise<boolean>;
}): ReceizCausalHistory {
  if (!digestPattern.test(options.registryDigest)) throw new Error("CAUSAL_REGISTRY_INVALID");
  const byDigest = new Map<string, ReceizCausalRecord>();

  function ordered(): ReceizCausalRecord[] {
    for (const item of byDigest.values()) {
      for (const parent of item.parentDigests) if (!byDigest.has(parent)) throw new Error("CAUSAL_PARENT_MISSING");
    }
    const indegree = new Map<string, number>();
    const children = new Map<string, string[]>();
    for (const item of byDigest.values()) {
      indegree.set(item.recordDigest, item.parentDigests.length);
      for (const parent of item.parentDigests) children.set(parent, [...(children.get(parent) ?? []), item.recordDigest]);
    }
    const eligible = [...byDigest.values()].filter((item) => item.parentDigests.length === 0).sort(compareCausal);
    const result: ReceizCausalRecord[] = [];
    while (eligible.length) {
      const next = eligible.shift()!;
      result.push(next);
      for (const childDigest of children.get(next.recordDigest) ?? []) {
        const remaining = (indegree.get(childDigest) ?? 0) - 1;
        indegree.set(childDigest, remaining);
        if (remaining === 0) {
          eligible.push(byDigest.get(childDigest)!);
          eligible.sort(compareCausal);
        }
      }
    }
    if (result.length !== byDigest.size) throw new Error("CAUSAL_CYCLE_DETECTED");
    return result;
  }

  const api: ReceizCausalHistory = {
    registryDigest: options.registryDigest,
    async import(value) {
      assertRecordShape(value);
      if (value.registryDigest !== options.registryDigest) throw new Error("CAUSAL_REGISTRY_MISMATCH");
      const { recordDigest, ...basis } = value;
      if (await digestReceizConstitution(recordBasis(basis)) !== recordDigest) throw new Error("CAUSAL_RECORD_DIGEST_MISMATCH");
      if (await digestReceizConstitution(value.receipt) !== value.receiptDigest) throw new Error("CAUSAL_RECEIPT_DIGEST_MISMATCH");
      if (!await options.verifyAdmissionReceipt(value.receipt, value.receiptDigest)) throw new Error("CAUSAL_ADMISSION_UNVERIFIED");
      const existing = byDigest.get(recordDigest);
      if (existing && canonicalizeReceizConstitution(existing as unknown as ReceizConstitutionJson) !== canonicalizeReceizConstitution(value as unknown as ReceizConstitutionJson)) throw new Error("CAUSAL_RECORD_CONFLICT");
      byDigest.set(recordDigest, structuredClone(value));
    },
    records: ordered,
    heads() {
      const parents = new Set([...byDigest.values()].flatMap((item) => item.parentDigests));
      return ordered().filter((item) => !parents.has(item.recordDigest)).map((item) => item.recordDigest).sort();
    },
    async historyRoot() {
      return digestReceizConstitution({ schema: "receiz.causal.history-root.v1", registryDigest: options.registryDigest, records: ordered().map((item) => item.recordDigest), heads: api.heads() });
    },
    isAncestor(ancestorDigest, descendantDigest) {
      const visited = new Set<string>();
      const pending = [...(byDigest.get(descendantDigest)?.parentDigests ?? [])];
      while (pending.length) {
        const next = pending.pop()!;
        if (next === ancestorDigest) return true;
        if (visited.has(next)) continue;
        visited.add(next);
        pending.push(...(byDigest.get(next)?.parentDigests ?? []));
      }
      return false;
    },
    appendToProofMemory(memory) {
      for (const item of ordered()) memory.append({
        id: `causal:${item.recordDigest}`,
        kind: "admitted_causal_history",
        createdAt: null,
        kaiUpulse: item.kaiPulse,
        proof: null,
        payload: structuredClone(item) as unknown as Record<string, unknown>,
        projection: { recordDigest: item.recordDigest, parentDigests: [...item.parentDigests], causalRecordIsProofAuthority: false },
      });
    },
  };
  return api;
}
