"use client";

import {
  DURABLE_LOCAL_TRUTH_RANK,
  readDurableLocalTruthItem,
  removeDurableLocalTruthItem,
  writeDurableLocalTruthItem,
} from "@/app/lib/runtime/localTruthStore";
import { projectWorldBootstrapViewFromLocalSession } from "@/app/lib/profile/localProfileTruth";
import { peekSessionBootstrapSnapshot } from "@/app/lib/session/bootstrapHydration";
import { buildLocalWorldLaunchpadView } from "@/app/lib/world/localLaunchpad";
import type { WorldBootstrapView, WorldLaunchpadView } from "@/app/lib/world/types";

// Bump the cache key so stale or malformed world snapshots do not survive route-shape changes.
const WORLD_ROUTE_SNAPSHOT_STORAGE_KEY = "receiz.world.route.snapshot.v3";
const WORLD_ROUTE_DURABLE_SNAPSHOT_STORAGE_KEY = "receiz.world.route.snapshot.durable.v1";
const LEGACY_WORLD_ROUTE_SNAPSHOT_STORAGE_KEY = "receiz.world.route.snapshot.v2";
const OLDEST_WORLD_ROUTE_SNAPSHOT_STORAGE_KEY = "receiz.world.route.snapshot.v1";
const WORLD_ROUTE_NAV_INTENT_KEY = "receiz.world.route.intent.v1";
const WORLD_ROUTE_SNAPSHOT_MAX_AGE_MS = 5 * 60_000;
const WORLD_ROUTE_NAV_INTENT_MAX_AGE_MS = 15_000;
const OWNED_TWIN_OPERATION_STORAGE_PREFIX = "receiz.world.owned-twin.operation.v1";
export const WORLD_ROUTE_FAST_ENTRY_COOKIE = "receiz_world_fast_entry";
const WORLD_ROUTE_FAST_ENTRY_MAX_AGE_SECONDS = 20;

type WorldRouteSnapshotStored = {
  version: 1;
  createdAtMs: number;
  signedIn: boolean;
  data: WorldBootstrapView;
  launchpad: WorldLaunchpadView | null;
  renderedAt: string;
};

type WorldRouteNavigationIntentStored = {
  version: 1;
  createdAtMs: number;
  signedIn: boolean;
  targetPanel?: WorldRoutePanel | null;
  targetStudioTab?: WorldRouteStudioTab | null;
};

export type WorldRouteSnapshot = {
  signedIn: boolean;
  data: WorldBootstrapView;
  launchpad: WorldLaunchpadView | null;
  renderedAt: string;
};

export type WorldRouteSnapshotInput = WorldRouteSnapshot;

export type WorldRoutePanel = "overview" | "launchpad" | "forge" | "presence" | "districts" | "network" | "concierge" | "trail";
export type WorldRouteStudioTab = "avatar" | "agent" | "venture";

export type WorldRouteNavigationIntent = {
  signedIn: boolean;
  targetPanel?: WorldRoutePanel | null;
  targetStudioTab?: WorldRouteStudioTab | null;
};

export type WorldRouteNavigationIntentInput =
  | boolean
  | {
      signedIn: boolean;
      targetPanel?: WorldRoutePanel | null;
      targetStudioTab?: WorldRouteStudioTab | null;
    };
type WorldBootstrapResponse = {
  ok?: boolean;
  session?: {
    uid?: string;
  } | null;
  data?: WorldBootstrapView;
  launchpad?: WorldLaunchpadView | null;
  launchpadError?: string;
};

let cachedWorldRouteSnapshot: { snapshot: WorldRouteSnapshot; createdAtMs: number } | null = null;
let worldRoutePrimeRequest: Promise<void> | null = null;
const worldRouteSnapshotListeners = new Set<() => void>();

export type OwnedTwinClientOperation = Readonly<{
  clientOperationId: string;
  quoteExpiresAt: string;
}>;

type OwnedTwinOperationTerminalState =
  | "accepted"
  | "released"
  | "indeterminate"
  | "quote_expired"
  | "held"
  | "transport_failure";

function ownedTwinOperationStorageKey(scope: string, logicalActionId: string): string {
  return `${OWNED_TWIN_OPERATION_STORAGE_PREFIX}:${encodeURIComponent(scope)}:${encodeURIComponent(logicalActionId)}`;
}

function isOwnedTwinClientOperation(value: unknown): value is OwnedTwinClientOperation {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  const operationId = typeof record.clientOperationId === "string" ? record.clientOperationId.trim() : "";
  const quoteExpiresAt = typeof record.quoteExpiresAt === "string" ? record.quoteExpiresAt.trim() : "";
  return operationId.length >= 8 && operationId.length <= 160 && Number.isFinite(Date.parse(quoteExpiresAt));
}

function ownedTwinOperationStorage(storage?: Storage): Storage | null {
  if (storage) return storage;
  if (typeof window === "undefined" || typeof window.localStorage === "undefined") return null;
  return window.localStorage;
}

export function beginOwnedTwinClientOperation(
  scope: string,
  logicalActionId: string,
  storage?: Storage,
): OwnedTwinClientOperation {
  const target = ownedTwinOperationStorage(storage);
  const key = ownedTwinOperationStorageKey(scope, logicalActionId);
  if (target) {
    try {
      const existing = JSON.parse(target.getItem(key) ?? "null");
      if (isOwnedTwinClientOperation(existing)) {
        return {
          clientOperationId: existing.clientOperationId.trim(),
          quoteExpiresAt: new Date(Date.parse(existing.quoteExpiresAt)).toISOString(),
        };
      }
    } catch {
      // Replace malformed local operation state with a fresh exact pair.
    }
  }
  const operation = {
    clientOperationId: crypto.randomUUID(),
    quoteExpiresAt: new Date(Date.now() + 10 * 60_000).toISOString(),
  };
  try {
    target?.setItem(key, JSON.stringify(operation));
  } catch {
    // The request can still proceed when browser storage is unavailable.
  }
  return operation;
}

export function finishOwnedTwinClientOperation(
  scope: string,
  logicalActionId: string,
  terminalState: OwnedTwinOperationTerminalState,
  storage?: Storage,
): void {
  if (
    terminalState !== "accepted" &&
    terminalState !== "released" &&
    terminalState !== "indeterminate" &&
    terminalState !== "quote_expired"
  ) return;
  try {
    ownedTwinOperationStorage(storage)?.removeItem(ownedTwinOperationStorageKey(scope, logicalActionId));
  } catch {
    // A completed server action remains terminal even if local cleanup is unavailable.
  }
}

function isWorldRoutePanel(value: unknown): value is WorldRoutePanel {
  return value === "overview" ||
    value === "launchpad" ||
    value === "forge" ||
    value === "presence" ||
    value === "districts" ||
    value === "network" ||
    value === "concierge" ||
    value === "trail";
}

function isWorldRouteStudioTab(value: unknown): value is WorldRouteStudioTab {
  return value === "avatar" || value === "agent" || value === "venture";
}

function hasSessionStorage(): boolean {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isWorldBootstrapView(value: unknown): value is WorldBootstrapView {
  if (!isRecord(value)) return false;
  if (value.profile !== null && value.profile !== undefined && !isRecord(value.profile)) return false;
  if (value.avatar !== null && value.avatar !== undefined && !isRecord(value.avatar)) return false;
  if (!Array.isArray(value.avatarHistory)) return false;
  if (value.agent !== null && value.agent !== undefined && !isRecord(value.agent)) return false;
  if (!Array.isArray(value.ventures)) return false;
  if (value.presence !== null && value.presence !== undefined && !isRecord(value.presence)) return false;
  if (!Array.isArray(value.receipts)) return false;
  if (!Array.isArray(value.districts)) return false;
  if (!Array.isArray(value.publicResidents)) return false;
  if (!Array.isArray(value.featuredVentures)) return false;
  if (value.runtimeReadiness !== null && value.runtimeReadiness !== undefined && !isRecord(value.runtimeReadiness)) return false;
  return true;
}

function isWorldLaunchpadView(value: unknown): value is WorldLaunchpadView {
  if (!isRecord(value)) return false;
  if (typeof value.generatedAt !== "string" || !value.generatedAt.trim()) return false;
  if (!Number.isFinite(value.readinessScore)) return false;
  if (typeof value.readinessLabel !== "string") return false;
  if (typeof value.readinessSummary !== "string") return false;
  if (typeof value.headline !== "string") return false;
  if (typeof value.subhead !== "string") return false;
  if (!Array.isArray(value.ventureDrafts)) return false;
  if (!Array.isArray(value.presenceDrafts)) return false;
  if (!Array.isArray(value.highlights)) return false;
  if (!Array.isArray(value.checklist)) return false;
  if (!Array.isArray(value.suggestedQuestions)) return false;
  if (!isRecord(value.avatarBrief)) return false;
  if (!isRecord(value.agentBrief)) return false;
  return true;
}

function parseStoredSnapshot(raw: string): WorldRouteSnapshotStored | null {
  try {
    const parsed = JSON.parse(raw) as Partial<WorldRouteSnapshotStored>;
    if (!parsed || typeof parsed !== "object") return null;
    if (parsed.version !== 1) return null;
    if (!Number.isFinite(parsed.createdAtMs)) return null;
    if (typeof parsed.signedIn !== "boolean") return null;
    if (!isWorldBootstrapView(parsed.data)) return null;
    if (parsed.launchpad !== null && parsed.launchpad !== undefined && !isWorldLaunchpadView(parsed.launchpad)) return null;
    if (typeof parsed.renderedAt !== "string" || !parsed.renderedAt.trim()) return null;
    return parsed as WorldRouteSnapshotStored;
  } catch {
    return null;
  }
}

function parseStoredNavigationIntent(raw: string): WorldRouteNavigationIntentStored | null {
  try {
    const parsed = JSON.parse(raw) as Partial<WorldRouteNavigationIntentStored>;
    if (!parsed || typeof parsed !== "object") return null;
    if (parsed.version !== 1) return null;
    if (!Number.isFinite(parsed.createdAtMs)) return null;
    if (typeof parsed.signedIn !== "boolean") return null;
    if (parsed.targetPanel !== undefined && parsed.targetPanel !== null && !isWorldRoutePanel(parsed.targetPanel)) return null;
    if (
      parsed.targetStudioTab !== undefined &&
      parsed.targetStudioTab !== null &&
      !isWorldRouteStudioTab(parsed.targetStudioTab)
    ) {
      return null;
    }
    return parsed as WorldRouteNavigationIntentStored;
  } catch {
    return null;
  }
}

function isExpired(createdAtMs: number, maxAgeMs: number): boolean {
  return Date.now() - createdAtMs > maxAgeMs;
}

function worldSnapshotMatchesExpectedSignedIn(snapshot: WorldRouteSnapshot, expectedSignedIn?: boolean): boolean {
  if (expectedSignedIn !== undefined && snapshot.signedIn !== expectedSignedIn) return false;
  return true;
}

function worldSnapshotBelongsToCurrentSession(snapshot: WorldRouteSnapshot): boolean {
  if (!snapshot.signedIn) return true;
  const session = peekSessionBootstrapSnapshot(true);
  if (!session?.uid) return false;
  const profileUserId = typeof snapshot.data.profile?.userId === "string" ? snapshot.data.profile.userId.trim() : "";
  return !profileUserId || profileUserId === session.uid;
}

function worldSnapshotHasConfirmedCurrentSessionMismatch(snapshot: WorldRouteSnapshot): boolean {
  if (!snapshot.signedIn) return false;
  const session = peekSessionBootstrapSnapshot(true);
  if (!session?.uid) return false;
  const profileUserId = typeof snapshot.data.profile?.userId === "string" ? snapshot.data.profile.userId.trim() : "";
  return Boolean(profileUserId && profileUserId !== session.uid);
}

function worldSnapshotMatchesCurrentSession(snapshot: WorldRouteSnapshot, expectedSignedIn?: boolean): boolean {
  return worldSnapshotMatchesExpectedSignedIn(snapshot, expectedSignedIn) && worldSnapshotBelongsToCurrentSession(snapshot);
}

function worldRouteSnapshotTruthRank(snapshot: WorldRouteSnapshot): number {
  const dataDepth = worldRouteSnapshotDataDepth(snapshot);
  return (
    (snapshot.signedIn
      ? DURABLE_LOCAL_TRUTH_RANK.authenticatedSnapshot
      : DURABLE_LOCAL_TRUTH_RANK.deterministicSnapshot) +
    Math.min(dataDepth, 200)
  );
}

function worldRouteSnapshotDataDepth(snapshot: WorldRouteSnapshot): number {
  return (
    snapshot.data.avatarHistory.length +
    snapshot.data.ventures.length +
    snapshot.data.receipts.length +
    snapshot.data.districts.length +
    snapshot.data.publicResidents.length +
    snapshot.data.featuredVentures.length +
    (snapshot.launchpad ? snapshot.launchpad.highlights.length + snapshot.launchpad.checklist.length : 0)
  );
}

function isUsefulWorldRouteSnapshot(snapshot: WorldRouteSnapshot | null | undefined): snapshot is WorldRouteSnapshot {
  if (!snapshot) return false;
  if (snapshot.signedIn) return Boolean(snapshot.data.profile);
  return worldRouteSnapshotDataDepth(snapshot) > 0;
}

function worldRouteSnapshotRefsUnchanged(
  current: WorldRouteSnapshot | null | undefined,
  next: WorldRouteSnapshotInput,
): boolean {
  if (!current) return false;
  return current.signedIn === next.signedIn &&
    current.data === next.data &&
    current.launchpad === (next.launchpad ?? null);
}

function notifyWorldRouteSnapshotListeners(): void {
  for (const listener of worldRouteSnapshotListeners) {
    try {
      listener();
    } catch {
      // Ignore listener failures so route hydration stays resilient.
    }
  }
}

export function subscribeWorldRouteSnapshot(listener: () => void): () => void {
  worldRouteSnapshotListeners.add(listener);
  return () => {
    worldRouteSnapshotListeners.delete(listener);
  };
}

function writeWorldRouteFastEntryCookie(): void {
  if (typeof document === "undefined") return;
  const secure = typeof window !== "undefined" && window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${WORLD_ROUTE_FAST_ENTRY_COOKIE}=1; Path=/world; Max-Age=${WORLD_ROUTE_FAST_ENTRY_MAX_AGE_SECONDS}; SameSite=Lax${secure}`;
}

export function writeWorldRouteSnapshot(input: WorldRouteSnapshotInput): boolean {
  const localSession = peekSessionBootstrapSnapshot(true);
  const data = projectWorldBootstrapViewFromLocalSession(input.data, localSession);
  const snapshot: WorldRouteSnapshot = {
    signedIn: input.signedIn || Boolean(localSession?.signedIn && data.profile),
    data,
    launchpad: input.launchpad ?? null,
    renderedAt: input.renderedAt || new Date().toISOString(),
  };
  if (!isUsefulWorldRouteSnapshot(snapshot)) {
    clearWorldRouteFastEntryHint();
    return false;
  }
  if (worldRouteSnapshotRefsUnchanged(cachedWorldRouteSnapshot?.snapshot, input)) {
    return true;
  }

  const createdAtMs = Date.now();

  cachedWorldRouteSnapshot = { snapshot, createdAtMs };
  writeWorldRouteFastEntryCookie();

  const payload: WorldRouteSnapshotStored = {
    version: 1,
    createdAtMs,
    signedIn: snapshot.signedIn,
    data: snapshot.data,
    launchpad: snapshot.launchpad,
    renderedAt: snapshot.renderedAt,
  };
  const serialized = JSON.stringify(payload);

  writeDurableLocalTruthItem(WORLD_ROUTE_DURABLE_SNAPSHOT_STORAGE_KEY, serialized, {
    rank: worldRouteSnapshotTruthRank(snapshot),
    source: "world-route-snapshot",
  });

  if (hasSessionStorage()) {
    try {
      window.sessionStorage.setItem(WORLD_ROUTE_SNAPSHOT_STORAGE_KEY, serialized);
    } catch {
      // Ignore quota/storage failures.
    }
  }

  notifyWorldRouteSnapshotListeners();
  return true;
}

export function clearWorldRouteSnapshot(): void {
  cachedWorldRouteSnapshot = null;

  if (hasSessionStorage()) {
    try {
      window.sessionStorage.removeItem(WORLD_ROUTE_SNAPSHOT_STORAGE_KEY);
      window.sessionStorage.removeItem(LEGACY_WORLD_ROUTE_SNAPSHOT_STORAGE_KEY);
      window.sessionStorage.removeItem(OLDEST_WORLD_ROUTE_SNAPSHOT_STORAGE_KEY);
      window.sessionStorage.removeItem(WORLD_ROUTE_NAV_INTENT_KEY);
    } catch {
      // Ignore cleanup failures.
    }
  }
  removeDurableLocalTruthItem(WORLD_ROUTE_DURABLE_SNAPSHOT_STORAGE_KEY);

  notifyWorldRouteSnapshotListeners();
}

export function peekWorldRouteSnapshot(expectedSignedIn?: boolean): WorldRouteSnapshot | null {
  if (cachedWorldRouteSnapshot) {
    if (!isExpired(cachedWorldRouteSnapshot.createdAtMs, WORLD_ROUTE_SNAPSHOT_MAX_AGE_MS)) {
      if (worldSnapshotMatchesCurrentSession(cachedWorldRouteSnapshot.snapshot, expectedSignedIn)) {
        return cachedWorldRouteSnapshot.snapshot;
      }
    } else {
      cachedWorldRouteSnapshot = null;
    }
  }

  let raw = "";
  if (hasSessionStorage()) {
    try {
      raw = window.sessionStorage.getItem(WORLD_ROUTE_SNAPSHOT_STORAGE_KEY) ?? "";
    } catch {
      raw = "";
    }
  }

  if (raw) {
    const parsed = parseStoredSnapshot(raw);
    if (parsed && !isExpired(parsed.createdAtMs, WORLD_ROUTE_SNAPSHOT_MAX_AGE_MS)) {
      const snapshot: WorldRouteSnapshot = {
        signedIn: parsed.signedIn,
        data: parsed.data,
        launchpad: parsed.launchpad ?? null,
        renderedAt: parsed.renderedAt,
      };
      if (isUsefulWorldRouteSnapshot(snapshot)) {
        if (worldSnapshotMatchesCurrentSession(snapshot, expectedSignedIn)) {
          cachedWorldRouteSnapshot = { snapshot, createdAtMs: parsed.createdAtMs };
          return snapshot;
        }
        if (!worldSnapshotMatchesExpectedSignedIn(snapshot, expectedSignedIn)) {
          return null;
        }
        if (!worldSnapshotHasConfirmedCurrentSessionMismatch(snapshot)) {
          return null;
        }
      }
    }
    try {
      window.sessionStorage.removeItem(WORLD_ROUTE_SNAPSHOT_STORAGE_KEY);
      window.sessionStorage.removeItem(LEGACY_WORLD_ROUTE_SNAPSHOT_STORAGE_KEY);
      window.sessionStorage.removeItem(OLDEST_WORLD_ROUTE_SNAPSHOT_STORAGE_KEY);
    } catch {
      // Ignore cleanup failures.
    }
  }

  const durableRaw = readDurableLocalTruthItem(WORLD_ROUTE_DURABLE_SNAPSHOT_STORAGE_KEY) ?? "";
  if (!durableRaw) return null;

  const parsed = parseStoredSnapshot(durableRaw);
  if (!parsed) {
    removeDurableLocalTruthItem(WORLD_ROUTE_DURABLE_SNAPSHOT_STORAGE_KEY);
    return null;
  }

  const snapshot: WorldRouteSnapshot = {
    signedIn: parsed.signedIn,
    data: parsed.data,
    launchpad: parsed.launchpad ?? null,
    renderedAt: parsed.renderedAt,
  };
  if (!isUsefulWorldRouteSnapshot(snapshot)) {
    removeDurableLocalTruthItem(WORLD_ROUTE_DURABLE_SNAPSHOT_STORAGE_KEY);
    return null;
  }

  if (!worldSnapshotMatchesCurrentSession(snapshot, expectedSignedIn)) {
    if (!worldSnapshotMatchesExpectedSignedIn(snapshot, expectedSignedIn)) {
      return null;
    }
    if (worldSnapshotHasConfirmedCurrentSessionMismatch(snapshot)) {
      removeDurableLocalTruthItem(WORLD_ROUTE_DURABLE_SNAPSHOT_STORAGE_KEY);
    }
    return null;
  }

  cachedWorldRouteSnapshot = { snapshot, createdAtMs: parsed.createdAtMs };
  if (hasSessionStorage()) {
    try {
      window.sessionStorage.setItem(WORLD_ROUTE_SNAPSHOT_STORAGE_KEY, durableRaw);
    } catch {
      // Ignore storage write failures.
    }
  }
  return snapshot;
}

export function prepareWorldRouteTransition(input: WorldRouteNavigationIntentInput): void {
  if (!hasSessionStorage()) return;
  const normalized = typeof input === "boolean" ? { signedIn: input } : input;

  const payload: WorldRouteNavigationIntentStored = {
    version: 1,
    createdAtMs: Date.now(),
    signedIn: normalized.signedIn,
    targetPanel: normalized.targetPanel ?? null,
    targetStudioTab: normalized.targetStudioTab ?? null,
  };

  try {
    window.sessionStorage.setItem(WORLD_ROUTE_NAV_INTENT_KEY, JSON.stringify(payload));
  } catch {
    // Ignore quota/storage failures.
  }
}

export async function primeWorldRouteSnapshot(signedIn: boolean): Promise<void> {
  const cachedWorldSnapshot = peekWorldRouteSnapshot(signedIn);
  if (cachedWorldSnapshot) {
    writeWorldRouteSnapshot(cachedWorldSnapshot);
    if (!signedIn || cachedWorldSnapshot.launchpad) {
      return;
    }
  }

  if (worldRoutePrimeRequest) {
    await worldRoutePrimeRequest;
    return;
  }

  worldRoutePrimeRequest = (async () => {
    try {
      const response = await fetch("/api/world/me", { cache: "no-store" });
      const payload = (await response.json().catch(() => null)) as WorldBootstrapResponse | null;
      if (!response.ok || !payload?.ok || !payload.data) return;
      const localSession = peekSessionBootstrapSnapshot(true);
      const data = projectWorldBootstrapViewFromLocalSession(payload.data, localSession);
      const renderedAt = new Date().toISOString();
      const localLaunchpad = buildLocalWorldLaunchpadView(data, renderedAt);
      writeWorldRouteSnapshot({
        signedIn: Boolean(payload.session?.uid) || Boolean(data.profile),
        data,
        launchpad: payload.launchpadError ? localLaunchpad : payload.launchpad ?? localLaunchpad,
        renderedAt,
      });
    } catch {
      // Keep navigation live even if world snapshot priming fails.
    } finally {
      worldRoutePrimeRequest = null;
    }
  })();

  await worldRoutePrimeRequest;
}

export function prepareWorldRouteFastEntryHint(expectedSignedIn?: boolean): boolean {
  const snapshot = peekWorldRouteSnapshot(expectedSignedIn);
  if (!snapshot) {
    clearWorldRouteFastEntryHint();
    return false;
  }
  return writeWorldRouteSnapshot(snapshot);
}

export function peekPreparedWorldRouteTransition(): WorldRouteNavigationIntent | null {
  if (!hasSessionStorage()) return null;

  let raw = "";
  try {
    raw = window.sessionStorage.getItem(WORLD_ROUTE_NAV_INTENT_KEY) ?? "";
  } catch {
    return null;
  }
  if (!raw) return null;

  const parsed = parseStoredNavigationIntent(raw);
  if (!parsed || isExpired(parsed.createdAtMs, WORLD_ROUTE_NAV_INTENT_MAX_AGE_MS)) {
    try {
      window.sessionStorage.removeItem(WORLD_ROUTE_NAV_INTENT_KEY);
    } catch {
      // Ignore cleanup failures.
    }
    return null;
  }

  return {
    signedIn: parsed.signedIn,
    targetPanel: parsed.targetPanel ?? null,
    targetStudioTab: parsed.targetStudioTab ?? null,
  };
}

export function clearPreparedWorldRouteTransition(): void {
  if (!hasSessionStorage()) return;
  try {
    window.sessionStorage.removeItem(WORLD_ROUTE_NAV_INTENT_KEY);
  } catch {
    // Ignore cleanup failures.
  }
}

export function clearWorldRouteFastEntryHint(): void {
  if (typeof document === "undefined") return;
  const secure = typeof window !== "undefined" && window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${WORLD_ROUTE_FAST_ENTRY_COOKIE}=; Path=/world; Max-Age=0; SameSite=Lax${secure}`;
}
