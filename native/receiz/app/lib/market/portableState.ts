import { marketSnapshotNeedsAuthoritativeHydration, preserveMarketWalletContinuity } from "@/app/lib/market/snapshotContinuity";
import type { MarketDeskSnapshot } from "@/app/lib/market/types";

export const RECEIZ_MARKET_ACCOUNT_PORTABLE_SCHEMA =
  "receiz.market.account-portable.v1" as const;

export type ReceizMarketAccountPortableState = Readonly<{
  schema: typeof RECEIZ_MARKET_ACCOUNT_PORTABLE_SCHEMA;
  ownerUserId: string;
  completeAtSealedHead: boolean;
  snapshot: MarketDeskSnapshot;
}>;

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function marketRouteSnapshotForOwner(
  value: unknown,
  ownerUserId: string,
): MarketDeskSnapshot | null {
  const snapshot = record(value);
  if (
    !snapshot
    || snapshot.signedIn !== true
    || text(snapshot.viewerUserId) !== ownerUserId
    || !text(snapshot.generatedAt)
    || !Array.isArray(snapshot.districts)
    || !Array.isArray(snapshot.liveMarkets)
    || !Array.isArray(snapshot.ownedItems)
    || !Array.isArray(snapshot.predictionMarkets)
    || (snapshot.predictionHistory !== undefined && !Array.isArray(snapshot.predictionHistory))
    || (snapshot.shareTradeHistory !== undefined && !Array.isArray(snapshot.shareTradeHistory))
  ) {
    return null;
  }
  return snapshot as unknown as MarketDeskSnapshot;
}

export function readReceizMarketRouteSnapshotFromPortableAccount(
  accountSnapshotValue: unknown,
  expectedOwnerUserId: string,
): MarketDeskSnapshot | null {
  const expectedOwner = expectedOwnerUserId.trim();
  const accountSnapshot = record(accountSnapshotValue);
  const market = record(accountSnapshot?.market);
  if (
    !expectedOwner
    || market?.schema !== RECEIZ_MARKET_ACCOUNT_PORTABLE_SCHEMA
    || text(market.ownerUserId) !== expectedOwner
  ) {
    return null;
  }
  return marketRouteSnapshotForOwner(market.snapshot, expectedOwner);
}

export function buildReceizMarketAccountPortableState(input: Readonly<{
  ownerUserId: string;
  baseAccountSnapshot?: unknown;
  currentSnapshot?: MarketDeskSnapshot | null;
}>): ReceizMarketAccountPortableState | null {
  const ownerUserId = input.ownerUserId.trim();
  if (!ownerUserId) return null;
  const carried = readReceizMarketRouteSnapshotFromPortableAccount(
    input.baseAccountSnapshot,
    ownerUserId,
  );
  const current = marketRouteSnapshotForOwner(input.currentSnapshot, ownerUserId);
  const snapshot = current
    ? preserveMarketWalletContinuity(carried, current)
    : carried;
  if (!snapshot) return null;
  return Object.freeze({
    schema: RECEIZ_MARKET_ACCOUNT_PORTABLE_SCHEMA,
    ownerUserId,
    completeAtSealedHead: !marketSnapshotNeedsAuthoritativeHydration(snapshot),
    snapshot,
  });
}
