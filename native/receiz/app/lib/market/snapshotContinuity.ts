import type { MarketDeskItem, MarketDeskSnapshot } from "@/app/lib/market/types";

function isoMs(value: string | null | undefined): number {
  const parsed = Date.parse(value ?? "");
  return Number.isFinite(parsed) ? parsed : 0;
}

function walletContinuityScore(snapshot: MarketDeskSnapshot | null | undefined): number {
  if (!snapshot?.signedIn || !snapshot.wallet) return 0;
  return (
    64 +
    snapshot.wallet.totalPositionCount * 4 +
    snapshot.wallet.transferCount * 2 +
    snapshot.wallet.noteCount
  );
}

function normalizePrincipal(value: string | null | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

function signedInSnapshotPrincipalsMatch(
  currentSnapshot: MarketDeskSnapshot | null | undefined,
  nextSnapshot: MarketDeskSnapshot | null | undefined,
): boolean {
  if (!currentSnapshot?.signedIn || !nextSnapshot?.signedIn) return false;

  const currentUserId = normalizePrincipal(currentSnapshot.viewerUserId ?? null);
  const nextUserId = normalizePrincipal(nextSnapshot.viewerUserId ?? null);
  if (currentUserId || nextUserId) {
    return Boolean(currentUserId && nextUserId && currentUserId === nextUserId);
  }

  const currentUsername = normalizePrincipal(currentSnapshot.username);
  const nextUsername = normalizePrincipal(nextSnapshot.username);
  if (currentUsername || nextUsername) {
    return Boolean(currentUsername && nextUsername && currentUsername === nextUsername);
  }

  return true;
}

function activeSharePositionCount(snapshot: MarketDeskSnapshot): number {
  return snapshot.ownedItems.reduce((count, item) => count + (item.position ? 1 : 0), 0);
}

function activePredictionPositionCount(snapshot: MarketDeskSnapshot): number {
  const active = new Set<string>();
  for (const item of [...snapshot.ownedItems, ...snapshot.predictionMarkets]) {
    const position = item.predictionPosition;
    if (position?.status !== "active") continue;
    active.add(position.id || item.id);
  }
  return active.size;
}

function predictionPositionKeys(item: MarketDeskItem): string[] {
  const position = item.predictionPosition;
  return Array.from(
    new Set(
      [position?.id, position?.marketItemId, item.id]
        .map((value) => (typeof value === "string" ? value.trim() : ""))
        .filter(Boolean),
    ),
  );
}

function predictionPositionLastMoveMs(item: MarketDeskItem): number {
  const position = item.predictionPosition;
  return Math.max(
    isoMs(position?.claimedAt),
    isoMs(position?.exportedAt),
    isoMs(position?.lastWagerAt),
    isoMs(position?.openedAt),
    isoMs(item.updatedAt),
  );
}

function latestLocalSettledPredictionMsByKey(
  snapshot: MarketDeskSnapshot | null | undefined,
): Map<string, number> {
  const out = new Map<string, number>();
  if (!snapshot?.signedIn) return out;

  for (const item of [...snapshot.ownedItems, ...(snapshot.predictionHistory ?? [])]) {
    const position = item.predictionPosition;
    if (!position || position.status === "active") continue;
    const movedMs = predictionPositionLastMoveMs(item);
    if (movedMs <= 0) continue;
    for (const key of predictionPositionKeys(item)) {
      const previous = out.get(key) ?? 0;
      if (movedMs > previous) out.set(key, movedMs);
    }
  }

  return out;
}

function latestSettledPredictionEventMs(snapshot: MarketDeskSnapshot | null | undefined): number {
  let latest = 0;
  for (const value of latestLocalSettledPredictionMsByKey(snapshot).values()) {
    if (value > latest) latest = value;
  }
  return latest;
}

function localSettledPredictionMsForItem(localSettledMsByKey: Map<string, number>, item: MarketDeskItem): number {
  let latest = 0;
  for (const key of predictionPositionKeys(item)) {
    const movedMs = localSettledMsByKey.get(key) ?? 0;
    if (movedMs > latest) latest = movedMs;
  }
  return latest;
}

function snapshotHasEqualOrNewerActivePredictionForLocalSettled(
  currentSnapshot: MarketDeskSnapshot | null | undefined,
  nextSnapshot: MarketDeskSnapshot,
): boolean {
  const localSettledMsByKey = latestLocalSettledPredictionMsByKey(currentSnapshot);
  if (localSettledMsByKey.size === 0) return false;

  for (const item of [...nextSnapshot.ownedItems, ...nextSnapshot.predictionMarkets]) {
    if (item.predictionPosition?.status !== "active") continue;
    const localSettledMs = localSettledPredictionMsForItem(localSettledMsByKey, item);
    if (localSettledMs <= 0) continue;
    if (predictionPositionLastMoveMs(item) >= localSettledMs) return true;
  }

  return false;
}

export function marketSnapshotCollectionsLookEmpty(snapshot: MarketDeskSnapshot | null | undefined): boolean {
  if (!snapshot?.signedIn) return false;
  const sharePositionCount = activeSharePositionCount(snapshot);
  const predictionPositionCount = activePredictionPositionCount(snapshot);
  return (
    sharePositionCount === 0 &&
    predictionPositionCount === 0 &&
    (snapshot.predictionHistory?.length ?? 0) === 0 &&
    (snapshot.shareTradeHistory?.length ?? 0) === 0
  );
}

export function marketSnapshotNeedsAuthoritativeHydration(snapshot: MarketDeskSnapshot | null | undefined): boolean {
  if (!snapshot) return true;
  if (!snapshot.signedIn) return false;
  const actorUserId = normalizePrincipal(snapshot.viewerUserId);
  const projectionActorUserId = normalizePrincipal(snapshot.privateGraphProjection?.actorUserId);
  if (
    snapshot.privateGraphProjection?.schema !== "receiz.market.private-graph-projection.v1" ||
    snapshot.privateGraphProjection.completeness !== "complete" ||
    !actorUserId ||
    projectionActorUserId !== actorUserId
  ) {
    return true;
  }
  if (!snapshot.wallet) return true;
  if (!Array.isArray(snapshot.predictionHistory) || !Array.isArray(snapshot.shareTradeHistory)) {
    return true;
  }

  const sharePositionCount = activeSharePositionCount(snapshot);
  const predictionPositionCount = activePredictionPositionCount(snapshot);
  const totalPositionCount = sharePositionCount + predictionPositionCount;

  if (snapshot.wallet.sharePositionCount > sharePositionCount) return true;
  if (snapshot.wallet.predictionPositionCount > predictionPositionCount) return true;
  if (snapshot.wallet.totalPositionCount > totalPositionCount) return true;

  return false;
}

function currentWalletStateIsNewer(
  currentSnapshot: MarketDeskSnapshot | null | undefined,
  nextSnapshot: MarketDeskSnapshot | null | undefined,
): boolean {
  if (!currentSnapshot?.signedIn || !nextSnapshot?.signedIn) return false;
  if (!signedInSnapshotPrincipalsMatch(currentSnapshot, nextSnapshot)) return false;
  if (
    currentSnapshot.wallet?.canViewPhi === true &&
    currentSnapshot.wallet.settlementProjectionSource === "profile_plus_ledger_v1" &&
    nextSnapshot.wallet?.canViewPhi === true &&
    nextSnapshot.wallet.settlementProjectionSource === "account_only"
  ) {
    return true;
  }

  const currentWalletEntryMs = isoMs(currentSnapshot.wallet?.lastEntryAt);
  const nextWalletEntryMs = isoMs(nextSnapshot.wallet?.lastEntryAt);
  if (currentWalletEntryMs !== nextWalletEntryMs) {
    return currentWalletEntryMs > nextWalletEntryMs;
  }

  if (currentSnapshot.wallet && !nextSnapshot.wallet) {
    return true;
  }

  const currentScore = walletContinuityScore(currentSnapshot);
  const nextScore = walletContinuityScore(nextSnapshot);
  if (currentScore !== nextScore) {
    return currentScore > nextScore;
  }

  return isoMs(currentSnapshot.generatedAt) > isoMs(nextSnapshot.generatedAt);
}

function preserveSignedInLocalTruth(
  currentSnapshot: MarketDeskSnapshot | null | undefined,
  nextSnapshot: MarketDeskSnapshot,
): MarketDeskSnapshot {
  if (!currentSnapshot?.signedIn || nextSnapshot.signedIn) return nextSnapshot;

  return {
    ...nextSnapshot,
    signedIn: true,
    viewerUserId: currentSnapshot.viewerUserId ?? nextSnapshot.viewerUserId ?? null,
    canViewPhi: currentSnapshot.canViewPhi || nextSnapshot.canViewPhi,
    username: currentSnapshot.username || nextSnapshot.username,
    wallet: currentSnapshot.wallet ?? nextSnapshot.wallet,
    ownedItems: currentSnapshot.ownedItems.length > 0 ? currentSnapshot.ownedItems : nextSnapshot.ownedItems,
    predictionHistory:
      (currentSnapshot.predictionHistory?.length ?? 0) > 0
        ? currentSnapshot.predictionHistory
        : nextSnapshot.predictionHistory,
    shareTradeHistory:
      (currentSnapshot.shareTradeHistory?.length ?? 0) > 0
        ? currentSnapshot.shareTradeHistory
        : nextSnapshot.shareTradeHistory,
  };
}

function shouldPreserveOwnedItems(
  currentSnapshot: MarketDeskSnapshot | null | undefined,
  nextSnapshot: MarketDeskSnapshot,
): boolean {
  if (!currentSnapshot?.signedIn || !nextSnapshot.signedIn) return false;
  if (!signedInSnapshotPrincipalsMatch(currentSnapshot, nextSnapshot)) return false;
  if (currentSnapshot.ownedItems.length === 0 || nextSnapshot.ownedItems.length > 0) return false;

  const currentPositionCount = activeSharePositionCount(currentSnapshot) + activePredictionPositionCount(currentSnapshot);
  if (currentPositionCount > 0) return true;

  const nextWalletPositionCount =
    nextSnapshot.wallet?.totalPositionCount ?? currentSnapshot.wallet?.totalPositionCount ?? 0;
  return nextWalletPositionCount > 0;
}

function shouldPreservePredictionHistory(
  currentSnapshot: MarketDeskSnapshot | null | undefined,
  nextSnapshot: MarketDeskSnapshot,
): boolean {
  if (!currentSnapshot?.signedIn || !nextSnapshot.signedIn) return false;
  if (!signedInSnapshotPrincipalsMatch(currentSnapshot, nextSnapshot)) return false;
  if ((currentSnapshot.predictionHistory?.length ?? 0) === 0) return false;
  if (snapshotHasEqualOrNewerActivePredictionForLocalSettled(currentSnapshot, nextSnapshot)) return false;
  if ((nextSnapshot.predictionHistory?.length ?? 0) === 0) return true;
  return latestSettledPredictionEventMs(currentSnapshot) > latestSettledPredictionEventMs(nextSnapshot);
}

function shouldPreserveShareTradeHistory(
  currentSnapshot: MarketDeskSnapshot | null | undefined,
  nextSnapshot: MarketDeskSnapshot,
): boolean {
  if (!currentSnapshot?.signedIn || !nextSnapshot.signedIn) return false;
  if (!signedInSnapshotPrincipalsMatch(currentSnapshot, nextSnapshot)) return false;
  const currentHistory = currentSnapshot.shareTradeHistory ?? [];
  const nextHistory = nextSnapshot.shareTradeHistory ?? [];
  if (currentHistory.length === 0) return false;
  if (nextHistory.length === 0) return true;

  const currentLatestTradeMs = currentHistory.reduce((latest, trade) => Math.max(latest, isoMs(trade.executedAt)), 0);
  const nextLatestTradeMs = nextHistory.reduce((latest, trade) => Math.max(latest, isoMs(trade.executedAt)), 0);
  return currentLatestTradeMs > nextLatestTradeMs;
}

function ownedTrackedPositionById(
  snapshot: MarketDeskSnapshot | null | undefined,
): Map<string, MarketDeskSnapshot["ownedItems"][number]> {
  const out = new Map<string, MarketDeskSnapshot["ownedItems"][number]>();
  if (!snapshot?.signedIn) return out;
  for (const item of snapshot.ownedItems) {
    if (!item.position && item.predictionPosition?.status !== "active") continue;
    out.set(item.id, item);
  }
  return out;
}

function latestLocalShareSellMsByItemId(snapshot: MarketDeskSnapshot | null | undefined): Map<string, number> {
  const out = new Map<string, number>();
  if (!snapshot?.signedIn) return out;
  for (const trade of snapshot.shareTradeHistory ?? []) {
    if (trade.side !== "sell") continue;
    const marketItemId = typeof trade.marketItemId === "string" ? trade.marketItemId.trim() : "";
    if (!marketItemId) continue;
    const executedMs = isoMs(trade.executedAt);
    if (executedMs <= 0) continue;
    const previous = out.get(marketItemId) ?? 0;
    if (executedMs > previous) out.set(marketItemId, executedMs);
  }
  return out;
}

function latestLocalShareBuyMsByItemId(snapshot: MarketDeskSnapshot | null | undefined): Map<string, number> {
  const out = new Map<string, number>();
  if (!snapshot?.signedIn) return out;
  for (const trade of snapshot.shareTradeHistory ?? []) {
    if (trade.side !== "buy") continue;
    const marketItemId = typeof trade.marketItemId === "string" ? trade.marketItemId.trim() : "";
    if (!marketItemId) continue;
    const executedMs = isoMs(trade.executedAt);
    if (executedMs <= 0) continue;
    const previous = out.get(marketItemId) ?? 0;
    if (executedMs > previous) out.set(marketItemId, executedMs);
  }
  return out;
}

function currentSnapshotHasActiveSharePositionAtOrAfter(
  currentSnapshot: MarketDeskSnapshot | null | undefined,
  marketItemId: string,
  atMs: number,
): boolean {
  if (!currentSnapshot?.signedIn) return false;
  if (atMs <= 0) return activeSharePositionByItemId(currentSnapshot).has(marketItemId);
  const currentItem = activeSharePositionByItemId(currentSnapshot).get(marketItemId);
  return Boolean(currentItem && sharePositionLastMoveMs(currentItem) >= atMs);
}

function currentSnapshotHasClosedSharePosition(
  currentSnapshot: MarketDeskSnapshot | null | undefined,
  marketItemId: string,
  latestSellMsByItemId: Map<string, number>,
): boolean {
  const latestSellMs = latestSellMsByItemId.get(marketItemId) ?? 0;
  if (latestSellMs <= 0) return false;
  if (currentSnapshotHasActiveSharePositionAtOrAfter(currentSnapshot, marketItemId, latestSellMs)) return false;

  const latestBuyMs = latestLocalShareBuyMsByItemId(currentSnapshot).get(marketItemId) ?? 0;
  return latestSellMs >= latestBuyMs;
}

function snapshotHasNewerShareBuy(
  snapshot: MarketDeskSnapshot | null | undefined,
  marketItemId: string,
  afterMs: number,
): boolean {
  if (!snapshot?.signedIn || afterMs <= 0) return false;
  return (latestLocalShareBuyMsByItemId(snapshot).get(marketItemId) ?? 0) > afterMs;
}

function sharePositionLastMoveMs(item: MarketDeskSnapshot["ownedItems"][number]): number {
  const tradeMs = isoMs(item.position?.lastTradeAt);
  if (tradeMs > 0) return tradeMs;
  const openedMs = isoMs(item.position?.openedAt);
  if (openedMs > 0) return openedMs;
  return isoMs(item.updatedAt);
}

function newerSharePositionItem(
  left: MarketDeskSnapshot["ownedItems"][number],
  right: MarketDeskSnapshot["ownedItems"][number],
): MarketDeskSnapshot["ownedItems"][number] {
  const leftMoveMs = sharePositionLastMoveMs(left);
  const rightMoveMs = sharePositionLastMoveMs(right);
  if (leftMoveMs !== rightMoveMs) return leftMoveMs > rightMoveMs ? left : right;
  return right;
}

function activeSharePositionByItemId(
  snapshot: MarketDeskSnapshot | null | undefined,
): Map<string, MarketDeskSnapshot["ownedItems"][number]> {
  const out = new Map<string, MarketDeskSnapshot["ownedItems"][number]>();
  if (!snapshot?.signedIn) return out;

  for (const item of [...snapshot.liveMarkets, ...snapshot.ownedItems]) {
    if (!item.position) continue;
    const existing = out.get(item.id);
    out.set(item.id, existing ? newerSharePositionItem(existing, item) : item);
  }

  return out;
}

function stripClosedSharePositionFromVisibleItem(
  item: MarketDeskSnapshot["ownedItems"][number],
): MarketDeskSnapshot["ownedItems"][number] {
  return {
    ...item,
    ownership: item.marketType === "asset" ? "watch" : item.ownership,
    position: null,
  };
}

function removeLocallyClosedShareResurrections(
  currentSnapshot: MarketDeskSnapshot | null | undefined,
  items: MarketDeskSnapshot["ownedItems"],
  options?: { preserveVisibleItems?: boolean; incomingSnapshot?: MarketDeskSnapshot | null },
): MarketDeskSnapshot["ownedItems"] {
  const latestSellMsByItemId = latestLocalShareSellMsByItemId(currentSnapshot);
  if (latestSellMsByItemId.size === 0) return items;

  return items.flatMap((item) => {
    if (!item.position) return [item];
    const latestSellMs = latestSellMsByItemId.get(item.id) ?? 0;
    if (latestSellMs <= 0) return [item];
    if (!currentSnapshotHasClosedSharePosition(currentSnapshot, item.id, latestSellMsByItemId)) return [item];
    if (snapshotHasNewerShareBuy(options?.incomingSnapshot, item.id, latestSellMs)) return [item];

    const incomingPositionMs = sharePositionLastMoveMs(item);
    if (incomingPositionMs > latestSellMs && snapshotHasNewerShareBuy(options?.incomingSnapshot, item.id, latestSellMs)) {
      return [item];
    }

    if (options?.preserveVisibleItems) {
      return [stripClosedSharePositionFromVisibleItem(item)];
    }
    if (item.predictionPosition?.status === "active") {
      return [{ ...item, position: null }];
    }
    return [];
  });
}

function stripSettledPredictionFromVisibleItem(
  item: MarketDeskSnapshot["ownedItems"][number],
): MarketDeskSnapshot["ownedItems"][number] {
  return {
    ...item,
    ownership: item.position ? item.ownership : "watch",
    predictionPosition: null,
  };
}

function removeLocallySettledPredictionResurrections(
  currentSnapshot: MarketDeskSnapshot | null | undefined,
  items: MarketDeskSnapshot["ownedItems"],
  options?: { preserveVisibleItems?: boolean },
): MarketDeskSnapshot["ownedItems"] {
  const localSettledMsByKey = latestLocalSettledPredictionMsByKey(currentSnapshot);
  if (localSettledMsByKey.size === 0) return items;

  return items.flatMap((item) => {
    if (item.predictionPosition?.status !== "active") return [item];
    const localSettledMs = localSettledPredictionMsForItem(localSettledMsByKey, item);
    if (localSettledMs <= 0) return [item];
    if (predictionPositionLastMoveMs(item) >= localSettledMs) return [item];

    const strippedItem = stripSettledPredictionFromVisibleItem(item);
    if (options?.preserveVisibleItems || item.position) return [strippedItem];
    return [];
  });
}

function strongerOwnedPrivateItem(
  nextItem: MarketDeskItem,
  currentItem: MarketDeskItem,
): MarketDeskItem {
  const currentShareMoveMs = currentItem.position ? sharePositionLastMoveMs(currentItem) : 0;
  const nextShareMoveMs = nextItem.position ? sharePositionLastMoveMs(nextItem) : 0;
  const currentPredictionMoveMs = currentItem.predictionPosition ? predictionPositionLastMoveMs(currentItem) : 0;
  const nextPredictionMoveMs = nextItem.predictionPosition ? predictionPositionLastMoveMs(nextItem) : 0;
  const keepCurrentSharePosition = Boolean(currentItem.position && (!nextItem.position || currentShareMoveMs > nextShareMoveMs));
  const keepCurrentPredictionPosition = Boolean(
    currentItem.predictionPosition && (!nextItem.predictionPosition || currentPredictionMoveMs > nextPredictionMoveMs),
  );
  const currentUpdatedAtMs = isoMs(currentItem.updatedAt);
  const nextUpdatedAtMs = isoMs(nextItem.updatedAt);

  return {
    ...nextItem,
    ownership:
      nextItem.ownership === "owned" ||
      currentItem.ownership === "owned" ||
      keepCurrentSharePosition ||
      keepCurrentPredictionPosition
        ? "owned"
        : nextItem.ownership,
    updatedAt: currentUpdatedAtMs > nextUpdatedAtMs ? currentItem.updatedAt : nextItem.updatedAt,
    position: keepCurrentSharePosition ? currentItem.position : nextItem.position,
    creatorReserve: nextItem.creatorReserve ?? currentItem.creatorReserve ?? null,
    predictionBook: keepCurrentPredictionPosition ? currentItem.predictionBook : nextItem.predictionBook ?? currentItem.predictionBook,
    predictionContract: keepCurrentPredictionPosition
      ? currentItem.predictionContract
      : nextItem.predictionContract ?? currentItem.predictionContract,
    predictionPosition: keepCurrentPredictionPosition ? currentItem.predictionPosition : nextItem.predictionPosition,
    proofManifestRows: nextItem.proofManifestRows ?? currentItem.proofManifestRows,
    assetMetrics: nextItem.assetMetrics ?? currentItem.assetMetrics,
    shareQuote: nextItem.shareQuote ?? currentItem.shareQuote ?? null,
  };
}

function marketItemLiveMarkMs(item: MarketDeskItem): number {
  return isoMs(item.updatedAt);
}

function withStrongerMarketItemLiveMark(
  nextItem: MarketDeskItem,
  currentItem: MarketDeskItem,
): MarketDeskItem {
  if (marketItemLiveMarkMs(currentItem) <= marketItemLiveMarkMs(nextItem)) return nextItem;

  return {
    ...nextItem,
    updatedAt: currentItem.updatedAt,
    quoteUsdPerPhi: currentItem.quoteUsdPerPhi,
    priceUsd: currentItem.priceUsd,
    pricePhi: currentItem.pricePhi,
    intrinsicPhi: currentItem.intrinsicPhi,
    changePct: currentItem.changePct,
    volumeUsd: currentItem.volumeUsd,
    liquidityUsd: currentItem.liquidityUsd,
    premiumX: currentItem.premiumX,
    momentX: currentItem.momentX,
    chart: currentItem.chart,
    yesPrice: currentItem.yesPrice,
    noPrice: currentItem.noPrice,
    shareQuote: currentItem.shareQuote ?? nextItem.shareQuote ?? null,
  };
}

function mergeOwnedPrivateGraph(
  currentSnapshot: MarketDeskSnapshot | null | undefined,
  nextSnapshot: MarketDeskSnapshot,
  primaryItems: MarketDeskSnapshot["ownedItems"],
  options?: { appendCurrentMissing?: boolean },
): MarketDeskSnapshot["ownedItems"] {
  if (!currentSnapshot?.signedIn || !nextSnapshot.signedIn) return primaryItems;
  if (!signedInSnapshotPrincipalsMatch(currentSnapshot, nextSnapshot)) return primaryItems;

  const merged = [...primaryItems];
  const indexById = new Map(merged.map((item, index) => [item.id, index]));

  for (const currentItem of currentSnapshot.ownedItems) {
    const existingIndex = indexById.get(currentItem.id);
    if (existingIndex === undefined) {
      if (!options?.appendCurrentMissing) continue;
      indexById.set(currentItem.id, merged.length);
      merged.push(currentItem);
      continue;
    }

    merged[existingIndex] = strongerOwnedPrivateItem(merged[existingIndex]!, currentItem);
  }

  let filtered = removeLocallyClosedShareResurrections(currentSnapshot, merged, { incomingSnapshot: nextSnapshot });
  filtered = removeLocallyClosedShareResurrections(nextSnapshot, filtered);
  filtered = removeLocallySettledPredictionResurrections(currentSnapshot, filtered);
  filtered = removeLocallySettledPredictionResurrections(nextSnapshot, filtered);
  return filtered;
}

function shareTradeHistoryMs(trade: NonNullable<MarketDeskSnapshot["shareTradeHistory"]>[number]): number {
  return isoMs(trade.executedAt);
}

function mergeShareTradeHistoryPrivateGraph(
  currentSnapshot: MarketDeskSnapshot | null | undefined,
  nextSnapshot: MarketDeskSnapshot,
  primaryHistory: MarketDeskSnapshot["shareTradeHistory"],
  options?: { appendCurrentMissing?: boolean },
): MarketDeskSnapshot["shareTradeHistory"] {
  if (!currentSnapshot?.signedIn || !nextSnapshot.signedIn) return primaryHistory;
  if (!signedInSnapshotPrincipalsMatch(currentSnapshot, nextSnapshot)) return primaryHistory;
  if (!options?.appendCurrentMissing) return primaryHistory;

  const merged = [...(primaryHistory ?? [])];
  const seen = new Set(merged.map((trade) => trade.id).filter(Boolean));
  for (const trade of currentSnapshot.shareTradeHistory ?? []) {
    if (seen.has(trade.id)) continue;
    seen.add(trade.id);
    merged.push(trade);
  }

  return merged.sort((left, right) => shareTradeHistoryMs(right) - shareTradeHistoryMs(left));
}

function predictionHistoryKey(item: MarketDeskItem): string {
  return item.predictionPosition?.id?.trim() || item.predictionPosition?.marketItemId?.trim() || item.id;
}

function nextSnapshotHasEqualOrNewerActivePrediction(
  nextSnapshot: MarketDeskSnapshot,
  currentItem: MarketDeskItem,
): boolean {
  const currentMoveMs = predictionPositionLastMoveMs(currentItem);
  if (currentMoveMs <= 0) return false;
  const currentKeys = new Set(predictionPositionKeys(currentItem));

  for (const nextItem of [...nextSnapshot.ownedItems, ...nextSnapshot.predictionMarkets]) {
    if (nextItem.predictionPosition?.status !== "active") continue;
    if (!predictionPositionKeys(nextItem).some((key) => currentKeys.has(key))) continue;
    if (predictionPositionLastMoveMs(nextItem) >= currentMoveMs) return true;
  }

  return false;
}

function mergePredictionHistoryPrivateGraph(
  currentSnapshot: MarketDeskSnapshot | null | undefined,
  nextSnapshot: MarketDeskSnapshot,
  primaryHistory: MarketDeskSnapshot["predictionHistory"],
  options?: { appendCurrentMissing?: boolean },
): MarketDeskSnapshot["predictionHistory"] {
  if (!currentSnapshot?.signedIn || !nextSnapshot.signedIn) return primaryHistory;
  if (!signedInSnapshotPrincipalsMatch(currentSnapshot, nextSnapshot)) return primaryHistory;
  if (!options?.appendCurrentMissing) return primaryHistory;

  const merged = [...(primaryHistory ?? [])];
  const indexByKey = new Map(merged.map((item, index) => [predictionHistoryKey(item), index]));

  for (const currentItem of currentSnapshot.predictionHistory ?? []) {
    if (nextSnapshotHasEqualOrNewerActivePrediction(nextSnapshot, currentItem)) continue;

    const key = predictionHistoryKey(currentItem);
    const existingIndex = indexByKey.get(key);
    if (existingIndex === undefined) {
      indexByKey.set(key, merged.length);
      merged.push(currentItem);
      continue;
    }

    const existingItem = merged[existingIndex]!;
    if (predictionPositionLastMoveMs(currentItem) > predictionPositionLastMoveMs(existingItem)) {
      merged[existingIndex] = currentItem;
    }
  }

  return merged.sort((left, right) => predictionPositionLastMoveMs(right) - predictionPositionLastMoveMs(left));
}

function applyOwnedSharePositionsToLiveMarkets(
  liveMarkets: MarketDeskSnapshot["liveMarkets"],
  ownedItems: MarketDeskSnapshot["ownedItems"],
): MarketDeskSnapshot["liveMarkets"] {
  const ownedPositionById = new Map<string, MarketDeskItem>();
  for (const item of ownedItems) {
    if (!item.position) continue;
    ownedPositionById.set(item.id, item);
  }
  if (ownedPositionById.size === 0) return liveMarkets;

  let changed = false;
  const merged = liveMarkets.map((item) => {
    const ownedItem = ownedPositionById.get(item.id);
    if (!ownedItem?.position) return item;
    if (item.position && sharePositionLastMoveMs(item) >= sharePositionLastMoveMs(ownedItem)) return item;

    changed = true;
    return {
      ...item,
      ownership: "owned" as const,
      position: ownedItem.position,
    };
  });

  return changed ? merged : liveMarkets;
}

function withPublicLiveMarketMark(
  ownedItem: MarketDeskItem,
  liveItem: MarketDeskItem,
): MarketDeskItem {
  return {
    ...ownedItem,
    updatedAt: liveItem.updatedAt,
    quoteUsdPerPhi: liveItem.quoteUsdPerPhi,
    priceUsd: liveItem.priceUsd,
    pricePhi: liveItem.pricePhi,
    intrinsicPhi: liveItem.intrinsicPhi,
    changePct: liveItem.changePct,
    volumeUsd: liveItem.volumeUsd,
    liquidityUsd: liveItem.liquidityUsd,
    premiumX: liveItem.premiumX,
    momentX: liveItem.momentX,
    chart: liveItem.chart,
    livePulseSeed: liveItem.livePulseSeed ?? ownedItem.livePulseSeed ?? null,
    yesPrice: liveItem.yesPrice,
    noPrice: liveItem.noPrice,
    verifyHref: liveItem.verifyHref,
    verifyPath: liveItem.verifyPath ?? ownedItem.verifyPath ?? null,
    sourceTs: liveItem.sourceTs ?? ownedItem.sourceTs ?? null,
    externalHref: liveItem.externalHref,
    canonicalHref: liveItem.canonicalHref ?? ownedItem.canonicalHref ?? null,
    originalHref: liveItem.originalHref ?? ownedItem.originalHref ?? null,
    mediaKind: liveItem.mediaKind ?? ownedItem.mediaKind ?? null,
    profileUsername: liveItem.profileUsername ?? ownedItem.profileUsername ?? null,
    profileDisplayName: liveItem.profileDisplayName ?? ownedItem.profileDisplayName ?? null,
    playbackSrc: liveItem.playbackSrc ?? ownedItem.playbackSrc ?? null,
    playbackCoverSrc: liveItem.playbackCoverSrc ?? ownedItem.playbackCoverSrc ?? null,
    mediaSrc: liveItem.mediaSrc ?? ownedItem.mediaSrc ?? null,
    mediaMime: liveItem.mediaMime ?? ownedItem.mediaMime ?? null,
    mediaName: liveItem.mediaName ?? ownedItem.mediaName ?? null,
    mediaSize: liveItem.mediaSize ?? ownedItem.mediaSize ?? null,
    artworkSrc: liveItem.artworkSrc ?? ownedItem.artworkSrc ?? null,
    audioArtist: liveItem.audioArtist ?? ownedItem.audioArtist ?? null,
    proofManifestRows: liveItem.proofManifestRows ?? ownedItem.proofManifestRows,
    assetMetrics: liveItem.assetMetrics ?? ownedItem.assetMetrics,
    shareQuote: liveItem.shareQuote ?? ownedItem.shareQuote ?? null,
  };
}

function applyPublicLiveMarketMarksToOwnedItems(
  liveMarkets: MarketDeskSnapshot["liveMarkets"],
  ownedItems: MarketDeskSnapshot["ownedItems"],
): MarketDeskSnapshot["ownedItems"] {
  const liveItemById = new Map(liveMarkets.map((item) => [item.id, item]));
  let changed = false;
  const merged = ownedItems.map((ownedItem) => {
    const liveItem = liveItemById.get(ownedItem.id);
    if (!liveItem) return ownedItem;
    changed = true;
    return withPublicLiveMarketMark(ownedItem, liveItem);
  });

  return changed ? merged : ownedItems;
}

function applyOwnedPositionsAndPublicLiveMarks(snapshot: MarketDeskSnapshot): MarketDeskSnapshot {
  const liveMarkets = applyOwnedSharePositionsToLiveMarkets(snapshot.liveMarkets, snapshot.ownedItems);
  const ownedItems = applyPublicLiveMarketMarksToOwnedItems(liveMarkets, snapshot.ownedItems);
  if (liveMarkets === snapshot.liveMarkets && ownedItems === snapshot.ownedItems) return snapshot;
  return {
    ...snapshot,
    liveMarkets,
    ownedItems,
  };
}

function shouldAppendCurrentPrivateGraph(
  currentSnapshot: MarketDeskSnapshot | null | undefined,
  nextSnapshot: MarketDeskSnapshot,
): boolean {
  if (!currentSnapshot?.signedIn || !nextSnapshot.signedIn) return false;
  return signedInSnapshotPrincipalsMatch(currentSnapshot, nextSnapshot);
}

function preserveLocallySoldSharePositionUpdates(
  currentSnapshot: MarketDeskSnapshot | null | undefined,
  items: MarketDeskSnapshot["ownedItems"],
): MarketDeskSnapshot["ownedItems"] {
  const latestSellMsByItemId = latestLocalShareSellMsByItemId(currentSnapshot);
  if (latestSellMsByItemId.size === 0) return items;

  const currentPositions = activeSharePositionByItemId(currentSnapshot);
  if (currentPositions.size === 0) return items;

  let changed = false;
  const merged = items.map((item) => {
    if (!item.position) return item;

    const latestSellMs = latestSellMsByItemId.get(item.id) ?? 0;
    if (latestSellMs <= 0) return item;

    const currentItem = currentPositions.get(item.id);
    if (!currentItem?.position) return item;

    const incomingPositionMs = sharePositionLastMoveMs(item);
    if (incomingPositionMs >= latestSellMs) return item;

    const currentPositionMs = sharePositionLastMoveMs(currentItem);
    if (currentPositionMs < latestSellMs) return item;

    changed = true;
    return {
      ...item,
      ownership: currentItem.ownership,
      position: currentItem.position,
    };
  });

  return changed ? merged : items;
}

function publicShellDepth(snapshot: MarketDeskSnapshot | null | undefined): number {
  if (!snapshot) return 0;
  return snapshot.liveMarkets.length + snapshot.predictionMarkets.length + snapshot.districts.length;
}

function stripMarketItemAccountState(item: MarketDeskItem): MarketDeskItem {
  return {
    ...item,
    ownership: item.ownership === "owned" ? "watch" : item.ownership,
    position: null,
    creatorReserve: null,
    predictionPosition: null,
  };
}

function mergeMarketItemsById(
  primaryItems: readonly MarketDeskItem[],
  fallbackItems: readonly MarketDeskItem[],
): MarketDeskItem[] {
  const nextItems = [...primaryItems];
  const indexById = new Map(primaryItems.map((item, index) => [item.id, index]));

  for (const item of fallbackItems) {
    const existingIndex = indexById.get(item.id);
    if (existingIndex !== undefined) {
      nextItems[existingIndex] = withStrongerMarketItemLiveMark(nextItems[existingIndex]!, item);
      continue;
    }
    if (item.visibility === "private") continue;
    indexById.set(item.id, nextItems.length);
    nextItems.push(stripMarketItemAccountState(item));
  }

  return nextItems;
}

function hasMissingPublicMarketItems(
  primaryItems: readonly MarketDeskItem[],
  fallbackItems: readonly MarketDeskItem[],
): boolean {
  const seen = new Set(primaryItems.map((item) => item.id));
  return fallbackItems.some((item) => item.visibility !== "private" && !seen.has(item.id));
}

function hasDeterministicPublicShellAdditions(
  currentSnapshot: MarketDeskSnapshot,
  nextSnapshot: MarketDeskSnapshot,
  options: { preserveCurrentMarketItems: boolean },
): boolean {
  if (currentSnapshot.districts.length > nextSnapshot.districts.length) return true;
  if (!options.preserveCurrentMarketItems) return false;
  return (
    hasMissingPublicMarketItems(nextSnapshot.liveMarkets, currentSnapshot.liveMarkets) ||
    hasMissingPublicMarketItems(nextSnapshot.predictionMarkets, currentSnapshot.predictionMarkets)
  );
}

function mergeDeterministicPublicShellWithPrivateGraph(
  currentSnapshot: MarketDeskSnapshot | null | undefined,
  nextSnapshot: MarketDeskSnapshot,
  options?: { preserveCurrentMarketItems?: boolean },
): MarketDeskSnapshot {
  if (!currentSnapshot) return nextSnapshot;
  if (currentSnapshot.signedIn && !signedInSnapshotPrincipalsMatch(currentSnapshot, nextSnapshot)) return nextSnapshot;

  const preserveCurrentMarketItems = options?.preserveCurrentMarketItems ?? true;
  const hasPublicAdditions = hasDeterministicPublicShellAdditions(currentSnapshot, nextSnapshot, {
    preserveCurrentMarketItems,
  });

  if (!hasPublicAdditions && publicShellDepth(currentSnapshot) <= publicShellDepth(nextSnapshot)) {
    return nextSnapshot;
  }

  return {
    ...nextSnapshot,
    quoteUsdPerPhi: nextSnapshot.quoteUsdPerPhi || currentSnapshot.quoteUsdPerPhi,
    districts:
      currentSnapshot.districts.length > nextSnapshot.districts.length
        ? currentSnapshot.districts
        : nextSnapshot.districts,
    liveMarkets: preserveCurrentMarketItems
      ? mergeMarketItemsById(nextSnapshot.liveMarkets, currentSnapshot.liveMarkets)
      : nextSnapshot.liveMarkets,
    predictionMarkets: preserveCurrentMarketItems
      ? mergeMarketItemsById(nextSnapshot.predictionMarkets, currentSnapshot.predictionMarkets)
      : nextSnapshot.predictionMarkets,
  };
}

function shouldPreserveStrongerOwnedPositionGraph(
  currentSnapshot: MarketDeskSnapshot | null | undefined,
  nextSnapshot: MarketDeskSnapshot,
): boolean {
  if (!currentSnapshot?.signedIn || !nextSnapshot.signedIn) return false;
  if (!signedInSnapshotPrincipalsMatch(currentSnapshot, nextSnapshot)) return false;

  const currentSharePositionCount = activeSharePositionCount(currentSnapshot);
  const currentPredictionPositionCount = activePredictionPositionCount(currentSnapshot);
  if (currentSharePositionCount === 0 && currentPredictionPositionCount === 0) return false;

  const nextSharePositionCount = activeSharePositionCount(nextSnapshot);
  const nextPredictionPositionCount = activePredictionPositionCount(nextSnapshot);
  const nextWalletSharePositionCount = nextSnapshot.wallet?.sharePositionCount ?? nextSnapshot.wallet?.totalPositionCount ?? 0;
  const nextWalletPredictionPositionCount = nextSnapshot.wallet?.predictionPositionCount ?? 0;
  return (
    nextWalletSharePositionCount > nextSharePositionCount ||
    nextWalletPredictionPositionCount > nextPredictionPositionCount
  );
}

function preserveStrongerOwnedPositions(
  currentSnapshot: MarketDeskSnapshot | null | undefined,
  nextSnapshot: MarketDeskSnapshot,
): MarketDeskSnapshot["ownedItems"] {
  if (!shouldPreserveStrongerOwnedPositionGraph(currentSnapshot, nextSnapshot)) return nextSnapshot.ownedItems;

  const currentPositions = ownedTrackedPositionById(currentSnapshot);
  if (currentPositions.size === 0) return nextSnapshot.ownedItems;
  const latestSellMsByItemId = latestLocalShareSellMsByItemId(currentSnapshot);

  const merged: MarketDeskSnapshot["ownedItems"] = [];
  const seen = new Set<string>();
  for (const nextItem of nextSnapshot.ownedItems) {
    seen.add(nextItem.id);
    const currentItem = currentPositions.get(nextItem.id);
    const currentSharePositionIsClosed = Boolean(
      currentItem?.position && currentSnapshotHasClosedSharePosition(currentSnapshot, currentItem.id, latestSellMsByItemId),
    );
    const shouldPreserveSharePosition = Boolean(currentItem?.position && !nextItem.position);
    const shouldPreservePredictionPosition = Boolean(
      currentItem?.predictionPosition?.status === "active" && !nextItem.predictionPosition,
    );
    const shouldApplyCurrentPrivateState = Boolean(
      currentItem &&
        ((shouldPreserveSharePosition && !currentSharePositionIsClosed) || shouldPreservePredictionPosition),
    );
    merged.push(
      currentItem && shouldApplyCurrentPrivateState
        ? {
            ...nextItem,
            ownership: "owned",
            position: shouldPreserveSharePosition && !currentSharePositionIsClosed ? currentItem.position : nextItem.position,
            predictionBook: shouldPreservePredictionPosition ? currentItem.predictionBook : nextItem.predictionBook,
            predictionContract: shouldPreservePredictionPosition ? currentItem.predictionContract : nextItem.predictionContract,
            predictionPosition: shouldPreservePredictionPosition ? currentItem.predictionPosition : nextItem.predictionPosition,
          }
        : nextItem,
    );
  }

  for (const currentItem of currentPositions.values()) {
    if (seen.has(currentItem.id)) continue;
    if (currentItem.position && currentSnapshotHasClosedSharePosition(currentSnapshot, currentItem.id, latestSellMsByItemId)) {
      continue;
    }
    merged.push(currentItem);
  }

  return merged;
}

function preserveStrongerLiveSharePositions(
  currentSnapshot: MarketDeskSnapshot | null | undefined,
  nextSnapshot: MarketDeskSnapshot,
): MarketDeskSnapshot["liveMarkets"] {
  if (!shouldPreserveStrongerOwnedPositionGraph(currentSnapshot, nextSnapshot)) return nextSnapshot.liveMarkets;

  const currentPositions = activeSharePositionByItemId(currentSnapshot);
  if (currentPositions.size === 0) return nextSnapshot.liveMarkets;
  const latestSellMsByItemId = latestLocalShareSellMsByItemId(currentSnapshot);

  let changed = false;
  const merged = nextSnapshot.liveMarkets.map((nextItem) => {
    if (nextItem.position) return nextItem;
    const currentItem = currentPositions.get(nextItem.id);
    if (!currentItem?.position) return nextItem;
    if (currentSnapshotHasClosedSharePosition(currentSnapshot, currentItem.id, latestSellMsByItemId)) return nextItem;

    changed = true;
    return {
      ...nextItem,
      ownership: currentItem.ownership,
      updatedAt: isoMs(currentItem.updatedAt) > isoMs(nextItem.updatedAt) ? currentItem.updatedAt : nextItem.updatedAt,
      position: currentItem.position,
    };
  });

  return changed ? merged : nextSnapshot.liveMarkets;
}

export function preserveMarketWalletContinuity(
  currentSnapshot: MarketDeskSnapshot | null | undefined,
  nextSnapshot: MarketDeskSnapshot,
  options?: { preserveCurrentMarketItems?: boolean },
): MarketDeskSnapshot {
  if (currentSnapshot?.signedIn && nextSnapshot.signedIn && !signedInSnapshotPrincipalsMatch(currentSnapshot, nextSnapshot)) {
    return nextSnapshot;
  }

  const incomingSnapshotWasSignedIn = nextSnapshot.signedIn;
  const preserveCurrentMarketItems =
    options?.preserveCurrentMarketItems ?? (!currentSnapshot?.signedIn || incomingSnapshotWasSignedIn);
  const signedInSnapshot = preserveSignedInLocalTruth(currentSnapshot, nextSnapshot);
  const walletSnapshot = currentWalletStateIsNewer(currentSnapshot, signedInSnapshot)
    ? {
        ...signedInSnapshot,
        wallet: currentSnapshot!.wallet,
      }
    : signedInSnapshot;
  const closedLocalShareSnapshot = {
    ...walletSnapshot,
    liveMarkets: removeLocallyClosedShareResurrections(currentSnapshot, walletSnapshot.liveMarkets, {
      preserveVisibleItems: true,
      incomingSnapshot: walletSnapshot,
    }),
    ownedItems: removeLocallyClosedShareResurrections(currentSnapshot, walletSnapshot.ownedItems, {
      incomingSnapshot: walletSnapshot,
    }),
  };
  const localSoldShareSnapshot = {
    ...closedLocalShareSnapshot,
    liveMarkets: preserveLocallySoldSharePositionUpdates(currentSnapshot, closedLocalShareSnapshot.liveMarkets),
    ownedItems: preserveLocallySoldSharePositionUpdates(currentSnapshot, closedLocalShareSnapshot.ownedItems),
  };
  const localSettledPredictionSnapshot = {
    ...localSoldShareSnapshot,
    liveMarkets: removeLocallySettledPredictionResurrections(currentSnapshot, localSoldShareSnapshot.liveMarkets, {
      preserveVisibleItems: true,
    }),
    predictionMarkets: removeLocallySettledPredictionResurrections(currentSnapshot, localSoldShareSnapshot.predictionMarkets, {
      preserveVisibleItems: true,
    }),
    ownedItems: removeLocallySettledPredictionResurrections(currentSnapshot, localSoldShareSnapshot.ownedItems),
  };
  const preserveOwned = shouldPreserveOwnedItems(currentSnapshot, localSettledPredictionSnapshot);
  const preservePredictionHistory = shouldPreservePredictionHistory(currentSnapshot, localSettledPredictionSnapshot);
  const preserveShareTradeHistory = shouldPreserveShareTradeHistory(currentSnapshot, localSettledPredictionSnapshot);
  const appendCurrentPrivateGraph = shouldAppendCurrentPrivateGraph(currentSnapshot, localSettledPredictionSnapshot);
  const baseOwnedItems = preserveOwned
    ? currentSnapshot!.ownedItems
    : preserveStrongerOwnedPositions(currentSnapshot, localSettledPredictionSnapshot);
  const ownedItems = mergeOwnedPrivateGraph(currentSnapshot, localSettledPredictionSnapshot, baseOwnedItems, {
    appendCurrentMissing: appendCurrentPrivateGraph,
  });
  const baseLiveMarkets = preserveLocallySoldSharePositionUpdates(
    currentSnapshot,
    preserveStrongerLiveSharePositions(currentSnapshot, localSettledPredictionSnapshot),
  );
  const liveMarkets = applyOwnedSharePositionsToLiveMarkets(baseLiveMarkets, ownedItems);
  const ownedItemsWithPublicLiveMarks = applyPublicLiveMarketMarksToOwnedItems(liveMarkets, ownedItems);
  const predictionHistory = preservePredictionHistory
    ? currentSnapshot!.predictionHistory
    : mergePredictionHistoryPrivateGraph(
        currentSnapshot,
        localSettledPredictionSnapshot,
        localSettledPredictionSnapshot.predictionHistory,
        { appendCurrentMissing: appendCurrentPrivateGraph },
      );
  const shareTradeHistory = preserveShareTradeHistory
    ? currentSnapshot!.shareTradeHistory
    : mergeShareTradeHistoryPrivateGraph(
        currentSnapshot,
        localSettledPredictionSnapshot,
        localSettledPredictionSnapshot.shareTradeHistory,
        { appendCurrentMissing: appendCurrentPrivateGraph },
      );
  const continuitySnapshot = {
    ...localSettledPredictionSnapshot,
    liveMarkets,
    ownedItems: ownedItemsWithPublicLiveMarks,
    predictionHistory,
    shareTradeHistory,
  };

  if (!preserveOwned && !preservePredictionHistory && !preserveShareTradeHistory) {
    const mergedSnapshot = mergeDeterministicPublicShellWithPrivateGraph(currentSnapshot, continuitySnapshot, {
      preserveCurrentMarketItems,
    });
    return applyOwnedPositionsAndPublicLiveMarks(mergedSnapshot);
  }

  const mergedSnapshot = mergeDeterministicPublicShellWithPrivateGraph(currentSnapshot, continuitySnapshot, {
    preserveCurrentMarketItems,
  });
  return applyOwnedPositionsAndPublicLiveMarks(mergedSnapshot);
}
