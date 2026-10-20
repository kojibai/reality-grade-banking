"use client";

import { buildMarketDeskSnapshotFromTransport } from "@/app/lib/market/compose";
import { MARKET_ROUTE_FAST_ENTRY_COOKIE } from "@/app/lib/market/fastEntryCookie";
import {
  completeMarketPublicMembershipSupersedes,
  reconcileCompleteMarketPublicMembership,
} from "@/app/lib/market/publicMembership";
import type { MarketDeskItem, MarketDeskSnapshot, MarketDeskSnapshotTransport } from "@/app/lib/market/types";
import { marketSnapshotNeedsAuthoritativeHydration, preserveMarketWalletContinuity } from "@/app/lib/market/snapshotContinuity";
import {
  DURABLE_LOCAL_TRUTH_RANK,
  readDurableLocalTruthItem,
  removeDurableLocalTruthItem,
  writeDurableLocalTruthItem,
} from "@/app/lib/runtime/localTruthStore";
import { peekSessionBootstrapSnapshot } from "@/app/lib/session/bootstrapHydration";
import {
  isRuntimeCustodiedProfileShowcaseBoundedFirstPaint,
  type ProfileShowcaseBoundedFirstPaint,
} from "@/app/lib/profile/showcase/boundedEdgeVault";

export type PreparedMarketRouteTransition = {
  assetId: string | null;
  marketItemId: string | null;
  preparedAt: number;
};

const MARKET_ROUTE_TRANSITION_KEY = "receiz:market:prepared-route";
const MARKET_ROUTE_TRANSITION_MAX_AGE_MS = 5 * 60 * 1000;
const MARKET_ROUTE_SNAPSHOT_STORAGE_KEY = "receiz:market:route.snapshot.v1";
const MARKET_ROUTE_DURABLE_SNAPSHOT_STORAGE_KEY = "receiz:market:route.snapshot.durable.v1";
const MARKET_ROUTE_FAST_ENTRY_MAX_AGE_SECONDS = 20;
const MARKET_ROUTE_PUBLIC_SCOPE = "public";

export { MARKET_ROUTE_FAST_ENTRY_COOKIE };

type MarketRouteSnapshotStored = {
  version: 1;
  createdAtMs: number;
  snapshot: MarketDeskSnapshot;
};

export type MarketRouteSnapshot = MarketDeskSnapshot;
export type MarketRouteSnapshotInput = MarketDeskSnapshot;

type MarketSnapshotResponse = {
  ok?: boolean;
  error?: string;
  transport?: MarketDeskSnapshotTransport;
};

const cachedMarketRouteSnapshots = new Map<string, { snapshot: MarketRouteSnapshot; createdAtMs: number }>();
let marketRoutePrimeRequest: { scope: string; promise: Promise<boolean> } | null = null;
const marketRouteSnapshotListeners = new Set<() => void>();

function hasSessionStorage(): boolean {
  try {
    return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
  } catch {
    return false;
  }
}

function normalizeToken(value: string | null | undefined): string | null {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed ? trimmed : null;
}

function marketSnapshotViewerUserId(snapshot: MarketRouteSnapshot): string | null {
  return normalizeToken(snapshot.viewerUserId ?? null);
}

function marketRouteAccountScope(userId: string | null | undefined, username?: string | null): string | null {
  const normalizedUserId = normalizeToken(userId);
  if (normalizedUserId) return `account:${normalizedUserId}`;
  const normalizedUsername = normalizeToken(username)?.toLowerCase() ?? null;
  return normalizedUsername ? `account:username:${normalizedUsername}` : null;
}

function marketRouteSnapshotScope(snapshot: MarketRouteSnapshot): string | null {
  if (!snapshot.signedIn) return MARKET_ROUTE_PUBLIC_SCOPE;
  return marketRouteAccountScope(marketSnapshotViewerUserId(snapshot), snapshot.username);
}

function currentMarketRouteAccountScope(): string | null {
  const session = peekSessionBootstrapSnapshot(true);
  if (!session?.signedIn) return null;
  return marketRouteAccountScope(session.uid, session.username);
}

function scopedMarketRouteStorageKey(base: string, scope: string): string {
  return `${base}.${encodeURIComponent(scope)}`;
}

function marketRouteReadScopes(expectedSignedIn?: boolean): string[] {
  if (expectedSignedIn === false) return [MARKET_ROUTE_PUBLIC_SCOPE];
  const accountScope = currentMarketRouteAccountScope();
  if (expectedSignedIn === true) return accountScope ? [accountScope] : [];
  return accountScope ? [accountScope, MARKET_ROUTE_PUBLIC_SCOPE] : [MARKET_ROUTE_PUBLIC_SCOPE];
}

function marketSnapshotMatchesExpectedSignedIn(snapshot: MarketRouteSnapshot, expectedSignedIn?: boolean): boolean {
  if (expectedSignedIn !== undefined && snapshot.signedIn !== expectedSignedIn) return false;
  return true;
}

function marketSnapshotBelongsToCurrentSession(snapshot: MarketRouteSnapshot): boolean {
  if (!snapshot.signedIn) return true;

  const session = peekSessionBootstrapSnapshot(true);

  if (!session?.signedIn) return false;

  const snapshotUserId = marketSnapshotViewerUserId(snapshot);
  const sessionUserId = normalizeToken(session.uid);
  if (snapshotUserId && sessionUserId) return snapshotUserId === sessionUserId;

  const snapshotUsername = normalizeToken(snapshot.username);
  const sessionUsername = normalizeToken(session.username);

  if (snapshotUsername && sessionUsername) return snapshotUsername === sessionUsername;

  return true;
}

function marketSnapshotMatchesCurrentSession(snapshot: MarketRouteSnapshot, expectedSignedIn?: boolean): boolean {
  return marketSnapshotMatchesExpectedSignedIn(snapshot, expectedSignedIn) && marketSnapshotBelongsToCurrentSession(snapshot);
}

function parseStoredSnapshot(raw: string): MarketRouteSnapshotStored | null {
  try {
    const parsed = JSON.parse(raw) as Partial<MarketRouteSnapshotStored>;

    if (!parsed || typeof parsed !== "object") return null;
    if (parsed.version !== 1) return null;
    if (!Number.isFinite(parsed.createdAtMs)) return null;
    if (!parsed.snapshot || typeof parsed.snapshot !== "object") return null;
    if (typeof parsed.snapshot.generatedAt !== "string" || !parsed.snapshot.generatedAt.trim()) return null;
    if (typeof parsed.snapshot.signedIn !== "boolean") return null;
    if (!Array.isArray(parsed.snapshot.liveMarkets)) return null;
    if (!Array.isArray(parsed.snapshot.ownedItems)) return null;
    if (!Array.isArray(parsed.snapshot.predictionMarkets)) return null;
    if (!Array.isArray(parsed.snapshot.districts)) return null;

    return parsed as MarketRouteSnapshotStored;
  } catch {
    return null;
  }
}

function notifyMarketRouteSnapshotListeners(): void {
  for (const listener of marketRouteSnapshotListeners) {
    try {
      listener();
    } catch {
      // Ignore listener failures so route hydration stays resilient.
    }
  }
}

function writeMarketRouteFastEntryCookie(): void {
  if (typeof document === "undefined") return;

  const secure = typeof window !== "undefined" && window.location.protocol === "https:" ? "; Secure" : "";

  document.cookie = `${MARKET_ROUTE_FAST_ENTRY_COOKIE}=1; Path=/market; Max-Age=${MARKET_ROUTE_FAST_ENTRY_MAX_AGE_SECONDS}; SameSite=Lax${secure}`;
}

function clearMarketRouteFastEntryCookie(): void {
  if (typeof document === "undefined") return;

  const secure = typeof window !== "undefined" && window.location.protocol === "https:" ? "; Secure" : "";

  document.cookie = `${MARKET_ROUTE_FAST_ENTRY_COOKIE}=; Path=/market; Max-Age=0; SameSite=Lax${secure}`;
}

function marketRouteSnapshotDataDepth(snapshot: MarketRouteSnapshot): number {
  return (
    (snapshot.wallet ? 1 : 0) +
    snapshot.liveMarkets.length +
    snapshot.ownedItems.length +
    snapshot.predictionMarkets.length +
    snapshot.districts.length +
    (snapshot.predictionHistory?.length ?? 0) +
    (snapshot.shareTradeHistory?.length ?? 0)
  );
}

function marketRouteSnapshotPublicDeskDepth(snapshot: MarketRouteSnapshot): number {
  return snapshot.liveMarkets.length + snapshot.predictionMarkets.length;
}

function marketRouteSnapshotPublicShellDepth(snapshot: MarketRouteSnapshot): number {
  return marketRouteSnapshotPublicDeskDepth(snapshot) + snapshot.districts.length;
}

function isFullMarketRouteFastEntrySnapshot(snapshot: MarketRouteSnapshot): boolean {
  return marketRouteSnapshotPublicDeskDepth(snapshot) > 1;
}

function isUsefulMarketRouteSnapshot(snapshot: MarketRouteSnapshot): boolean {
  return marketRouteSnapshotDataDepth(snapshot) > 0;
}

function marketRouteSnapshotGeneratedAtMs(snapshot: MarketRouteSnapshot): number {
  const parsed = Date.parse(snapshot.generatedAt);
  return Number.isFinite(parsed) ? parsed : 0;
}

function marketItemTruthKey(item: MarketDeskItem): string {
  const assetId = normalizeToken(item.assetId);
  return `${item.marketType}:${item.id}:${assetId ?? ""}`;
}

function marketSnapshotItemTruthKeys(snapshot: MarketRouteSnapshot): Set<string> {
  return new Set(
    [
      ...snapshot.liveMarkets,
      ...snapshot.ownedItems,
      ...snapshot.predictionMarkets,
      ...(snapshot.predictionHistory ?? []),
    ].map(marketItemTruthKey),
  );
}

function marketSnapshotDistrictTruthKeys(snapshot: MarketRouteSnapshot): Set<string> {
  return new Set(snapshot.districts.map((district) => district.id).filter(Boolean));
}

function isoMs(value: string | null | undefined): number {
  const parsed = Date.parse(value ?? "");
  return Number.isFinite(parsed) ? parsed : 0;
}

function latestShareSellMsByMarketItemId(snapshot: MarketRouteSnapshot): Map<string, number> {
  const out = new Map<string, number>();
  for (const trade of snapshot.shareTradeHistory ?? []) {
    if (trade.side !== "sell") continue;
    const marketItemId = normalizeToken(trade.marketItemId);
    if (!marketItemId) continue;
    const executedMs = isoMs(trade.executedAt);
    if (executedMs <= 0) continue;
    const previous = out.get(marketItemId) ?? 0;
    if (executedMs > previous) out.set(marketItemId, executedMs);
  }
  return out;
}

function marketSnapshotHasActiveSharePosition(snapshot: MarketRouteSnapshot, marketItemId: string): boolean {
  return [...snapshot.liveMarkets, ...snapshot.ownedItems].some(
    (item) => item.id === marketItemId && Boolean(item.position),
  );
}

function currentItemIsClosedByNextLocalSell(
  currentItem: MarketDeskItem,
  nextSnapshot: MarketRouteSnapshot,
  latestSellMsByItemId: Map<string, number>,
): boolean {
  if (!currentItem.position) return false;
  const latestSellMs = latestSellMsByItemId.get(currentItem.id) ?? 0;
  if (latestSellMs <= 0) return false;
  const currentPositionMs = Math.max(isoMs(currentItem.position.lastTradeAt), isoMs(currentItem.updatedAt));
  if (currentPositionMs > 0 && latestSellMs <= currentPositionMs) return false;
  return !marketSnapshotHasActiveSharePosition(nextSnapshot, currentItem.id);
}

function includesKnownItemTruth(
  currentSnapshot: MarketRouteSnapshot,
  nextSnapshot: MarketRouteSnapshot,
): boolean {
  const nextKeys = marketSnapshotItemTruthKeys(nextSnapshot);
  const latestSellMsByItemId = latestShareSellMsByMarketItemId(nextSnapshot);
  for (const item of [
    ...currentSnapshot.liveMarkets,
    ...currentSnapshot.ownedItems,
    ...currentSnapshot.predictionMarkets,
    ...(currentSnapshot.predictionHistory ?? []),
  ]) {
    if (nextKeys.has(marketItemTruthKey(item))) continue;
    if (currentItemIsClosedByNextLocalSell(item, nextSnapshot, latestSellMsByItemId)) continue;
    return false;
  }

  return true;
}

function includesKnownTruthKeys(currentKeys: Set<string>, nextKeys: Set<string>): boolean {
  for (const key of currentKeys) {
    if (!nextKeys.has(key)) return false;
  }

  return true;
}

function marketRouteSnapshotIncludesKnownTruth(
  currentSnapshot: MarketRouteSnapshot,
  nextSnapshot: MarketRouteSnapshot,
): boolean {
  return (
    includesKnownItemTruth(currentSnapshot, nextSnapshot) &&
    includesKnownTruthKeys(marketSnapshotDistrictTruthKeys(currentSnapshot), marketSnapshotDistrictTruthKeys(nextSnapshot))
  );
}

function marketRouteSnapshotIdentity(snapshot: MarketRouteSnapshot): string {
  return [
    snapshot.generatedAt,
    snapshot.signedIn ? "1" : "0",
    snapshot.viewerUserId ?? "",
    snapshot.canViewPhi ? "1" : "0",
    snapshot.username ?? "",
    snapshot.quoteUsdPerPhi,
    snapshot.wallet?.balanceUsdLabel ?? "",
    snapshot.wallet?.balancePhiLabel ?? "",
    snapshot.wallet?.transferCount ?? 0,
    snapshot.wallet?.noteCount ?? 0,
    snapshot.wallet?.sharePositionCount ?? 0,
    snapshot.wallet?.predictionPositionCount ?? 0,
    snapshot.wallet?.totalPositionCount ?? 0,
    snapshot.liveMarkets.length,
    snapshot.ownedItems.length,
    snapshot.predictionMarkets.length,
    snapshot.predictionHistory?.length ?? 0,
    snapshot.shareTradeHistory?.length ?? 0,
  ].join("|");
}

function marketRouteSnapshotTruthRank(snapshot: MarketRouteSnapshot): number {
  const walletDepth = snapshot.wallet
    ? Number(snapshot.wallet.transferCount ?? 0) +
      Number(snapshot.wallet.noteCount ?? 0) +
      Number(snapshot.wallet.totalPositionCount ?? 0)
    : 0;

  const marketDepth =
    snapshot.liveMarkets.length +
    snapshot.ownedItems.length +
    snapshot.predictionMarkets.length +
    (snapshot.predictionHistory?.length ?? 0) +
    (snapshot.shareTradeHistory?.length ?? 0);

  return (
    (snapshot.signedIn
      ? DURABLE_LOCAL_TRUTH_RANK.authenticatedSnapshot
      : DURABLE_LOCAL_TRUTH_RANK.deterministicSnapshot) +
    Math.min(walletDepth + marketDepth, 200)
  );
}

function selectStrongestMarketRouteSnapshot(
  currentSnapshot: MarketRouteSnapshot | null | undefined,
  nextSnapshot: MarketRouteSnapshot,
): MarketRouteSnapshot {
  if (!currentSnapshot) return nextSnapshot;
  if (currentSnapshot.signedIn !== nextSnapshot.signedIn) return nextSnapshot;
  if (completeMarketPublicMembershipSupersedes(currentSnapshot, nextSnapshot)) return nextSnapshot;
  if (!marketRouteSnapshotIncludesKnownTruth(currentSnapshot, nextSnapshot)) return currentSnapshot;

  const currentDepth = marketRouteSnapshotDataDepth(currentSnapshot);
  const nextDepth = marketRouteSnapshotDataDepth(nextSnapshot);

  if (nextDepth !== currentDepth) {
    return nextDepth > currentDepth ? nextSnapshot : currentSnapshot;
  }

  return marketRouteSnapshotGeneratedAtMs(nextSnapshot) >= marketRouteSnapshotGeneratedAtMs(currentSnapshot)
    ? nextSnapshot
    : currentSnapshot;
}

function mergeRouteMarketItemsById(
  primaryItems: readonly MarketDeskItem[],
  fallbackItems: readonly MarketDeskItem[],
): MarketDeskItem[] {
  const nextItems = [...primaryItems];
  const seen = new Set(primaryItems.map((item) => item.id));

  for (const item of fallbackItems) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    nextItems.push(item);
  }

  return nextItems;
}

function mergePublicMarketRouteShell(
  publicSnapshot: MarketRouteSnapshot | null | undefined,
  nextSnapshot: MarketRouteSnapshot,
): MarketRouteSnapshot {
  if (!publicSnapshot || publicSnapshot.signedIn) return nextSnapshot;
  if (marketRouteSnapshotPublicShellDepth(publicSnapshot) <= marketRouteSnapshotPublicShellDepth(nextSnapshot)) {
    return nextSnapshot;
  }

  return {
    ...nextSnapshot,
    quoteUsdPerPhi: nextSnapshot.quoteUsdPerPhi || publicSnapshot.quoteUsdPerPhi,
    districts:
      publicSnapshot.districts.length > nextSnapshot.districts.length
        ? publicSnapshot.districts
        : nextSnapshot.districts,
    liveMarkets: mergeRouteMarketItemsById(nextSnapshot.liveMarkets, publicSnapshot.liveMarkets),
    predictionMarkets: mergeRouteMarketItemsById(nextSnapshot.predictionMarkets, publicSnapshot.predictionMarkets),
    publicMembership: nextSnapshot.publicMembership ?? publicSnapshot.publicMembership,
  };
}

function readPreparedTransition(consume: boolean): PreparedMarketRouteTransition | null {
  if (!hasSessionStorage()) return null;

  try {
    const raw = window.sessionStorage.getItem(MARKET_ROUTE_TRANSITION_KEY);

    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<PreparedMarketRouteTransition> | null;
    const preparedAt = typeof parsed?.preparedAt === "number" ? parsed.preparedAt : 0;

    const normalized: PreparedMarketRouteTransition = {
      assetId: normalizeToken(parsed?.assetId ?? null),
      marketItemId: normalizeToken(parsed?.marketItemId ?? null),
      preparedAt,
    };

    const isStale = preparedAt <= 0 || Date.now() - preparedAt > MARKET_ROUTE_TRANSITION_MAX_AGE_MS;

    if (consume || isStale) {
      window.sessionStorage.removeItem(MARKET_ROUTE_TRANSITION_KEY);
    }

    if (isStale) return null;
    if (!normalized.assetId && !normalized.marketItemId) return null;

    return normalized;
  } catch {
    if (consume && hasSessionStorage()) {
      window.sessionStorage.removeItem(MARKET_ROUTE_TRANSITION_KEY);
    }

    return null;
  }
}

export function subscribeMarketRouteSnapshot(listener: () => void): () => void {
  marketRouteSnapshotListeners.add(listener);

  return () => {
    marketRouteSnapshotListeners.delete(listener);
  };
}

function persistMarketRouteSnapshot(
  snapshot: MarketRouteSnapshot,
  options: Readonly<{ allowProofAuthorizedRankDecrease?: boolean }> = {},
): boolean {
  if (!isUsefulMarketRouteSnapshot(snapshot)) return false;
  const scope = marketRouteSnapshotScope(snapshot);
  if (!scope) return false;
  if (snapshot.signedIn && !marketSnapshotBelongsToCurrentSession(snapshot)) return false;
  const createdAtMs = Date.now();
  const previousSnapshot = cachedMarketRouteSnapshots.get(scope)?.snapshot ?? null;
  const shouldNotify =
    !previousSnapshot ||
    (previousSnapshot !== snapshot &&
      marketRouteSnapshotIdentity(previousSnapshot) !== marketRouteSnapshotIdentity(snapshot));

  cachedMarketRouteSnapshots.set(scope, { snapshot, createdAtMs });

  const payload: MarketRouteSnapshotStored = {
    version: 1,
    createdAtMs,
    snapshot,
  };
  const serialized = JSON.stringify(payload);

  writeDurableLocalTruthItem(scopedMarketRouteStorageKey(MARKET_ROUTE_DURABLE_SNAPSHOT_STORAGE_KEY, scope), serialized, {
    rank: marketRouteSnapshotTruthRank(snapshot),
    source: "market-route-snapshot",
    allowDowngrade: options.allowProofAuthorizedRankDecrease === true,
    allowSameRankOverwrite: true,
  });

  if (hasSessionStorage()) {
    try {
      window.sessionStorage.setItem(scopedMarketRouteStorageKey(MARKET_ROUTE_SNAPSHOT_STORAGE_KEY, scope), serialized);
    } catch {
      // Ignore quota/storage failures.
    }
  }

  if (shouldNotify) notifyMarketRouteSnapshotListeners();
  return true;
}

export function writeMarketRouteSnapshot(input: MarketRouteSnapshotInput): boolean {
  if (input.signedIn && !marketSnapshotBelongsToCurrentSession(input)) return false;
  const latestSnapshot = peekMarketRouteSnapshot(input.signedIn);
  const publicShellSnapshot = input.signedIn && !latestSnapshot ? peekMarketRouteSnapshot() : null;
  const inputWithKnownPublicShell = mergePublicMarketRouteShell(publicShellSnapshot, input);
  const continuitySnapshot: MarketRouteSnapshot = reconcileCompleteMarketPublicMembership(
    latestSnapshot,
    inputWithKnownPublicShell,
  );
  const snapshot = selectStrongestMarketRouteSnapshot(latestSnapshot, continuitySnapshot);

  if (!isUsefulMarketRouteSnapshot(snapshot)) {
    if (!latestSnapshot) {
      clearMarketRouteFastEntryHint();
    }

    return false;
  }

  return persistMarketRouteSnapshot(snapshot);
}

/**
 * Applies a projection already derived from a runtime-custodied sealed
 * profile-showcase successor. This is the only non-destructive route by which
 * a lawful hide may reduce presentation depth: the source proof authorizes the
 * atomic replacement, so the old snapshot is never cleared first.
 */
export function writeMarketRouteSnapshotFromProfileShowcaseSource(
  input: MarketRouteSnapshotInput,
  source: ProfileShowcaseBoundedFirstPaint,
): boolean {
  if (!isRuntimeCustodiedProfileShowcaseBoundedFirstPaint(source)) return false;
  if (input.signedIn && !marketSnapshotBelongsToCurrentSession(input)) return false;
  const ownerReceizIdentity = source.carrier.ownerReceizIdentity;
  if (!ownerReceizIdentity || source.carrier.artifactId !== `profile-showcase:${ownerReceizIdentity}`) {
    return false;
  }
  const latestSnapshot = peekMarketRouteSnapshot(input.signedIn);
  if (!latestSnapshot) return persistMarketRouteSnapshot(input, {
    allowProofAuthorizedRankDecrease: true,
  });
  if (latestSnapshot.signedIn !== input.signedIn) return false;
  return persistMarketRouteSnapshot(input, {
    allowProofAuthorizedRankDecrease: true,
  });
}

export function clearMarketRouteSnapshot(): void {
  const scope = currentMarketRouteAccountScope() ?? MARKET_ROUTE_PUBLIC_SCOPE;
  cachedMarketRouteSnapshots.delete(scope);

  if (hasSessionStorage()) {
    try {
      window.sessionStorage.removeItem(scopedMarketRouteStorageKey(MARKET_ROUTE_SNAPSHOT_STORAGE_KEY, scope));
      window.sessionStorage.removeItem(MARKET_ROUTE_SNAPSHOT_STORAGE_KEY);
    } catch {
      // Ignore cleanup failures.
    }
  }

  notifyMarketRouteSnapshotListeners();
}

function readScopedMarketRouteSnapshot(scope: string, expectedSignedIn?: boolean): MarketRouteSnapshot | null {
  const cached = cachedMarketRouteSnapshots.get(scope);
  if (
    cached &&
    isUsefulMarketRouteSnapshot(cached.snapshot) &&
    marketSnapshotMatchesCurrentSession(cached.snapshot, expectedSignedIn)
  ) {
    return cached.snapshot;
  }
  if (cached) cachedMarketRouteSnapshots.delete(scope);

  const sessionKey = scopedMarketRouteStorageKey(MARKET_ROUTE_SNAPSHOT_STORAGE_KEY, scope);
  let sessionRaw = "";
  if (hasSessionStorage()) {
    try {
      sessionRaw = window.sessionStorage.getItem(sessionKey) ?? "";
    } catch {
      sessionRaw = "";
    }
  }

  const parsedSession = sessionRaw ? parseStoredSnapshot(sessionRaw) : null;
  if (
    parsedSession &&
    isUsefulMarketRouteSnapshot(parsedSession.snapshot) &&
    marketSnapshotMatchesCurrentSession(parsedSession.snapshot, expectedSignedIn)
  ) {
    cachedMarketRouteSnapshots.set(scope, {
      snapshot: parsedSession.snapshot,
      createdAtMs: parsedSession.createdAtMs,
    });
    return parsedSession.snapshot;
  }
  if (sessionRaw && hasSessionStorage()) {
    try {
      window.sessionStorage.removeItem(sessionKey);
    } catch {
      // Ignore cleanup failures.
    }
  }

  const durableKey = scopedMarketRouteStorageKey(MARKET_ROUTE_DURABLE_SNAPSHOT_STORAGE_KEY, scope);
  const durableRaw = readDurableLocalTruthItem(durableKey) ?? "";
  if (!durableRaw) return null;
  const parsedDurable = parseStoredSnapshot(durableRaw);
  if (
    !parsedDurable ||
    !isUsefulMarketRouteSnapshot(parsedDurable.snapshot) ||
    !marketSnapshotMatchesCurrentSession(parsedDurable.snapshot, expectedSignedIn)
  ) {
    removeDurableLocalTruthItem(durableKey);
    return null;
  }

  cachedMarketRouteSnapshots.set(scope, {
    snapshot: parsedDurable.snapshot,
    createdAtMs: parsedDurable.createdAtMs,
  });
  if (hasSessionStorage()) {
    try {
      window.sessionStorage.setItem(sessionKey, durableRaw);
    } catch {
      // Ignore storage write failures.
    }
  }
  return parsedDurable.snapshot;
}

function migrateLegacyMarketRouteSnapshot(expectedSignedIn?: boolean): MarketRouteSnapshot | null {
  let sessionRaw = "";
  if (hasSessionStorage()) {
    try {
      sessionRaw = window.sessionStorage.getItem(MARKET_ROUTE_SNAPSHOT_STORAGE_KEY) ?? "";
    } catch {
      sessionRaw = "";
    }
  }
  const durableRaw = readDurableLocalTruthItem(MARKET_ROUTE_DURABLE_SNAPSHOT_STORAGE_KEY) ?? "";

  for (const raw of [sessionRaw, durableRaw]) {
    if (!raw) continue;
    const parsed = parseStoredSnapshot(raw);
    if (!parsed || !isUsefulMarketRouteSnapshot(parsed.snapshot)) continue;
    if (!marketSnapshotMatchesCurrentSession(parsed.snapshot, expectedSignedIn)) continue;
    if (!persistMarketRouteSnapshot(parsed.snapshot)) continue;

    if (hasSessionStorage()) {
      try {
        window.sessionStorage.removeItem(MARKET_ROUTE_SNAPSHOT_STORAGE_KEY);
      } catch {
        // Ignore migration cleanup failures.
      }
    }
    removeDurableLocalTruthItem(MARKET_ROUTE_DURABLE_SNAPSHOT_STORAGE_KEY);
    return parsed.snapshot;
  }

  return null;
}

export function peekMarketRouteSnapshot(expectedSignedIn?: boolean): MarketRouteSnapshot | null {
  for (const scope of marketRouteReadScopes(expectedSignedIn)) {
    const snapshot = readScopedMarketRouteSnapshot(scope, expectedSignedIn);
    if (snapshot) return snapshot;
  }

  return migrateLegacyMarketRouteSnapshot(expectedSignedIn);
}

export function buildMarketAssetHref(args: {
  assetId?: string | null;
  marketItemId?: string | null;
}): string {
  const params = new URLSearchParams();
  const assetId = normalizeToken(args.assetId);
  const marketItemId = normalizeToken(args.marketItemId);

  if (assetId) params.set("asset", assetId);
  if (marketItemId) params.set("marketItem", marketItemId);

  const query = params.toString();

  return query ? `/market?${query}` : "/market";
}

export function prepareMarketRouteTransition(args: {
  assetId?: string | null;
  marketItemId?: string | null;
}): void {
  if (!hasSessionStorage()) return;

  const payload: PreparedMarketRouteTransition = {
    assetId: normalizeToken(args.assetId),
    marketItemId: normalizeToken(args.marketItemId),
    preparedAt: Date.now(),
  };

  if (!payload.assetId && !payload.marketItemId) return;

  try {
    window.sessionStorage.setItem(MARKET_ROUTE_TRANSITION_KEY, JSON.stringify(payload));
  } catch {
    // Best effort only.
  }
}

export function peekPreparedMarketRouteTransition(): PreparedMarketRouteTransition | null {
  return readPreparedTransition(false);
}

export function consumePreparedMarketRouteTransition(): PreparedMarketRouteTransition | null {
  return readPreparedTransition(true);
}

export function clearPreparedMarketRouteTransition(): void {
  if (!hasSessionStorage()) return;

  try {
    window.sessionStorage.removeItem(MARKET_ROUTE_TRANSITION_KEY);
  } catch {
    // Ignore cleanup failures.
  }
}

export async function primeMarketRouteSnapshot(signedIn: boolean): Promise<boolean> {
  const latestMarketSnapshot = peekMarketRouteSnapshot(signedIn);
  const requestScope = signedIn ? currentMarketRouteAccountScope() : MARKET_ROUTE_PUBLIC_SCOPE;
  if (!requestScope) return Boolean(latestMarketSnapshot);

  if (latestMarketSnapshot) {
    writeMarketRouteSnapshot(latestMarketSnapshot);
    prepareMarketRouteFastEntryHint(signedIn);
  }

  const needsAuthoritativePrime = !latestMarketSnapshot || marketSnapshotNeedsAuthoritativeHydration(latestMarketSnapshot);

  if (!needsAuthoritativePrime) return true;

  if (marketRoutePrimeRequest?.scope === requestScope) {
    return await marketRoutePrimeRequest.promise;
  }

  let request: typeof marketRoutePrimeRequest = null;
  const promise = (async () => {
    try {
      const snapshotPath = signedIn ? "/api/market/private-graph" : "/api/market/snapshot";
      const response = await fetch(snapshotPath, { cache: "no-store", credentials: "same-origin" });
      const sessionState = response.headers.get("x-receiz-session-state");
      const responseActorUserId = normalizeToken(response.headers.get("x-receiz-actor-user"));
      const payload = (await response.json().catch(() => null)) as MarketSnapshotResponse | null;

      if (!response.ok || !payload?.ok || !payload.transport) {
        return Boolean(latestMarketSnapshot);
      }

      if (signedIn && sessionState !== "authenticated") {
        return Boolean(latestMarketSnapshot);
      }
      if (signedIn && responseActorUserId !== requestScope.slice("account:".length)) {
        return Boolean(latestMarketSnapshot);
      }
      if (signedIn && currentMarketRouteAccountScope() !== requestScope) {
        return Boolean(latestMarketSnapshot);
      }

      const snapshot = preserveMarketWalletContinuity(
        latestMarketSnapshot,
        buildMarketDeskSnapshotFromTransport(payload.transport),
      );
      if (signedIn && !snapshot.signedIn) {
        return Boolean(latestMarketSnapshot);
      }
      if (marketRouteSnapshotScope(snapshot) !== requestScope) {
        return Boolean(latestMarketSnapshot);
      }

      return writeMarketRouteSnapshot(snapshot);
    } catch {
      return Boolean(latestMarketSnapshot);
    } finally {
      if (marketRoutePrimeRequest === request) {
        marketRoutePrimeRequest = null;
      }
    }
  })();
  request = {
    scope: requestScope,
    promise,
  };
  marketRoutePrimeRequest = request;

  return await promise;
}

export function prepareMarketRouteFastEntryHint(expectedSignedIn?: boolean): boolean {
  const snapshot = peekMarketRouteSnapshot(expectedSignedIn);

  if (!snapshot || !isFullMarketRouteFastEntrySnapshot(snapshot)) {
    clearMarketRouteFastEntryCookie();
    return false;
  }

  writeMarketRouteFastEntryCookie();

  return true;
}

export function clearMarketRouteFastEntryHint(): void {
  clearMarketRouteFastEntryCookie();
}
