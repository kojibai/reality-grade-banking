import type { ReceizCausalHistory, ReceizCausalRecord } from "./causalHistory.js";
import {
  canonicalizeReceizConstitution,
  digestReceizConstitution,
  type ReceizConstitutionJson,
} from "./constitution.js";

export type ReceizCausalProjection = Readonly<{
  aliveAssets: readonly string[];
  retiredAssets: readonly string[];
  revokedCapabilities: readonly string[];
  ownership: Readonly<Record<string, string>>;
  spending: Readonly<Record<string, number>>;
  rewardsByCause: Readonly<Record<string, Readonly<{ resourceId: string; amount: number }>>>;
  rewardTotals: Readonly<Record<string, number>>;
  injuries: Readonly<Record<string, number>>;
  liabilities: Readonly<Record<string, number>>;
  settlements: Readonly<Record<string, number>>;
  authority: Readonly<{ projectionIsProofAuthority: false; strongerTruth: "sealed-receiz-proof-object" }>;
}>;

export type ReceizCausalMergeResult =
  | Readonly<{ ok: true; projection: ReceizCausalProjection; stateDigest: string; historyRoot: string }>
  | Readonly<{ ok: false; code: "STALE_LIVING_BRANCH" | "OWNERSHIP_CONTRADICTION" | "REWARD_CAUSE_CONFLICT"; affectedAsset?: string; causeId?: string }>;

export type ReceizCausalReplayResult =
  | Readonly<{ ok: true; projection: ReceizCausalProjection; stateDigest: string; historyRoot: string; trace: readonly Readonly<{ recordDigest: string; stateDigest: string }>[] }>
  | Extract<ReceizCausalMergeResult, { ok: false }>;

export type ReceizCausalCheckpoint = Readonly<{
  schema: "receiz.causal.checkpoint.v1";
  checkpointDigest: string;
  registryDigest: string;
  historyRoot: string;
  headDigests: readonly string[];
  recordCount: number;
  stateDigest: string;
  authority: Readonly<{ checkpointIsProofAuthority: false; strongerTruth: "sealed-receiz-proof-object" }>;
}>;

export type ReceizVerifiedCausalCheckpoint = ReceizCausalCheckpoint & Readonly<{
  verifiedBy: "receiz.sdk.causal-checkpoint.v1";
}>;

const verifiedCheckpoints = new WeakSet<object>();

type MutableProjection = {
  aliveAssets: Set<string>;
  retiredAssets: Set<string>;
  revokedCapabilities: Set<string>;
  ownership: Record<string, string>;
  spending: Record<string, number>;
  rewardsByCause: Record<string, { resourceId: string; amount: number }>;
  rewardTotals: Record<string, number>;
  injuries: Record<string, number>;
  liabilities: Record<string, number>;
  settlements: Record<string, number>;
};

function add(target: Record<string, number>, key: string, amount: number): void {
  target[key] = (target[key] ?? 0) + amount;
}

function projected(state: MutableProjection): ReceizCausalProjection {
  return {
    aliveAssets: [...state.aliveAssets].filter((asset) => !state.retiredAssets.has(asset)).sort(),
    retiredAssets: [...state.retiredAssets].sort(),
    revokedCapabilities: [...state.revokedCapabilities].sort(),
    ownership: Object.fromEntries(Object.entries(state.ownership).sort(([left], [right]) => left.localeCompare(right))),
    spending: Object.fromEntries(Object.entries(state.spending).sort(([left], [right]) => left.localeCompare(right))),
    rewardsByCause: Object.fromEntries(Object.entries(state.rewardsByCause).sort(([left], [right]) => left.localeCompare(right))),
    rewardTotals: Object.fromEntries(Object.entries(state.rewardTotals).sort(([left], [right]) => left.localeCompare(right))),
    injuries: Object.fromEntries(Object.entries(state.injuries).sort(([left], [right]) => left.localeCompare(right))),
    liabilities: Object.fromEntries(Object.entries(state.liabilities).sort(([left], [right]) => left.localeCompare(right))),
    settlements: Object.fromEntries(Object.entries(state.settlements).sort(([left], [right]) => left.localeCompare(right))),
    authority: { projectionIsProofAuthority: false, strongerTruth: "sealed-receiz-proof-object" },
  };
}

function conflict(history: ReceizCausalHistory, records: ReceizCausalRecord[]): Extract<ReceizCausalMergeResult, { ok: false }> | null {
  const retirements = new Map<string, ReceizCausalRecord[]>();
  const living = new Map<string, ReceizCausalRecord[]>();
  const owners = new Map<string, ReceizCausalRecord[]>();
  const rewards = new Map<string, ReceizCausalRecord>();
  for (const item of records) {
    const event = item.event;
    if (event.type === "asset.retired") retirements.set(event.assetId, [...(retirements.get(event.assetId) ?? []), item]);
    if (event.type === "asset.alive") living.set(event.assetId, [...(living.get(event.assetId) ?? []), item]);
    if (event.type === "ownership.assigned") owners.set(event.assetId, [...(owners.get(event.assetId) ?? []), item]);
    if (event.type === "reward.granted") {
      const prior = rewards.get(event.causeId);
      if (prior && prior.event.type === "reward.granted" && (prior.event.resourceId !== event.resourceId || prior.event.amount !== event.amount)) return { ok: false, code: "REWARD_CAUSE_CONFLICT", causeId: event.causeId };
      rewards.set(event.causeId, item);
    }
  }
  for (const [assetId, retired] of retirements) {
    for (const alive of living.get(assetId) ?? []) {
      if (retired.some((retirement) => !history.isAncestor(alive.recordDigest, retirement.recordDigest))) return { ok: false, code: "STALE_LIVING_BRANCH", affectedAsset: assetId };
    }
  }
  for (const [assetId, assignments] of owners) {
    for (let leftIndex = 0; leftIndex < assignments.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < assignments.length; rightIndex += 1) {
        const left = assignments[leftIndex]!;
        const right = assignments[rightIndex]!;
        if (left.event.type !== "ownership.assigned" || right.event.type !== "ownership.assigned" || left.event.ownerId === right.event.ownerId) continue;
        if (!history.isAncestor(left.recordDigest, right.recordDigest) && !history.isAncestor(right.recordDigest, left.recordDigest)) return { ok: false, code: "OWNERSHIP_CONTRADICTION", affectedAsset: assetId };
      }
    }
  }
  return null;
}

function apply(state: MutableProjection, item: ReceizCausalRecord): void {
  const event = item.event;
  switch (event.type) {
    case "asset.alive": state.aliveAssets.add(event.assetId); return;
    case "asset.retired": state.retiredAssets.add(event.assetId); state.aliveAssets.delete(event.assetId); return;
    case "capability.revoked": state.revokedCapabilities.add(event.capabilityDigest); return;
    case "ownership.assigned": state.ownership[event.assetId] = event.ownerId; return;
    case "resource.spent": add(state.spending, event.resourceId, event.amount); return;
    case "reward.granted":
      if (!state.rewardsByCause[event.causeId]) {
        state.rewardsByCause[event.causeId] = { resourceId: event.resourceId, amount: event.amount };
        add(state.rewardTotals, event.resourceId, event.amount);
      }
      return;
    case "injury.recorded": add(state.injuries, event.assetId, event.amount); return;
    case "liability.recorded": add(state.liabilities, event.assetId, event.amount); return;
    case "settlement.recorded": add(state.settlements, event.assetId, event.amount); return;
  }
}

async function reduce(history: ReceizCausalHistory, includeTrace: boolean): Promise<ReceizCausalReplayResult> {
  const records = history.records();
  const denied = conflict(history, records);
  if (denied) return denied;
  const state: MutableProjection = {
    aliveAssets: new Set(), retiredAssets: new Set(), revokedCapabilities: new Set(), ownership: {}, spending: {},
    rewardsByCause: {}, rewardTotals: {}, injuries: {}, liabilities: {}, settlements: {},
  };
  const trace: { recordDigest: string; stateDigest: string }[] = [];
  for (const item of records) {
    apply(state, item);
    if (includeTrace) trace.push({ recordDigest: item.recordDigest, stateDigest: await digestReceizConstitution(projected(state) as unknown as ReceizConstitutionJson) });
  }
  const projection = projected(state);
  return {
    ok: true,
    projection,
    stateDigest: await digestReceizConstitution(projection as unknown as ReceizConstitutionJson),
    historyRoot: await history.historyRoot(),
    trace,
  };
}

export async function replayReceizCausalHistory(history: ReceizCausalHistory): Promise<ReceizCausalReplayResult> {
  return reduce(history, true);
}

export async function mergeReceizCausalHistory(history: ReceizCausalHistory): Promise<ReceizCausalMergeResult> {
  const result = await reduce(history, false);
  if (!result.ok) return result;
  return { ok: true, projection: result.projection, stateDigest: result.stateDigest, historyRoot: result.historyRoot };
}

function checkpointBasis(value: Omit<ReceizCausalCheckpoint, "checkpointDigest">): ReceizConstitutionJson {
  return value as unknown as ReceizConstitutionJson;
}

export async function createReceizCausalCheckpoint(history: ReceizCausalHistory): Promise<ReceizCausalCheckpoint> {
  const replay = await replayReceizCausalHistory(history);
  if (!replay.ok) throw new Error(replay.code);
  const basis: Omit<ReceizCausalCheckpoint, "checkpointDigest"> = {
    schema: "receiz.causal.checkpoint.v1",
    registryDigest: history.registryDigest,
    historyRoot: replay.historyRoot,
    headDigests: history.heads(),
    recordCount: history.records().length,
    stateDigest: replay.stateDigest,
    authority: { checkpointIsProofAuthority: false, strongerTruth: "sealed-receiz-proof-object" },
  };
  return { ...basis, checkpointDigest: await digestReceizConstitution(checkpointBasis(basis)) };
}

export function isReceizVerifiedCausalCheckpoint(value: unknown): value is ReceizVerifiedCausalCheckpoint {
  return typeof value === "object" && value !== null && verifiedCheckpoints.has(value);
}

export async function verifyReceizCausalCheckpoint(value: unknown, history: ReceizCausalHistory): Promise<
  | Readonly<{ ok: true; checkpoint: ReceizVerifiedCausalCheckpoint }>
  | Readonly<{ ok: false; code: "CHECKPOINT_INVALID" | "CHECKPOINT_MISMATCH" }>
> {
  if (typeof value !== "object" || value === null) return { ok: false, code: "CHECKPOINT_INVALID" };
  let supplied: string;
  try { supplied = canonicalizeReceizConstitution(value as ReceizConstitutionJson); } catch { return { ok: false, code: "CHECKPOINT_INVALID" }; }
  const expected = await createReceizCausalCheckpoint(history);
  if (supplied !== canonicalizeReceizConstitution(expected as unknown as ReceizConstitutionJson)) return { ok: false, code: "CHECKPOINT_MISMATCH" };
  const checkpoint: ReceizVerifiedCausalCheckpoint = { ...expected, verifiedBy: "receiz.sdk.causal-checkpoint.v1" };
  verifiedCheckpoints.add(checkpoint);
  return { ok: true, checkpoint };
}
