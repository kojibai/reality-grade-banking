"use client";

import type { MarketWalletSummaryLike } from "@/app/lib/market/walletSummary";
import {
  admitWalletSettlementProjection,
  peekWalletRouteHydrationSeed,
  walletSummaryRequiresCompleteGlyphProjection,
} from "@/app/lib/wallet/routeHydration";

type WalletMeResponse = {
  ok?: boolean;
  wallet?: MarketWalletSummaryLike | null;
  error?: string;
};

const SHARED_WALLET_SUMMARY_CACHE_MAX_AGE_MS = 4_000;
const SHARED_WALLET_SUMMARY_FAILURE_COOLDOWN_MS = 45_000;

let cachedWalletSummaryIdentityKey = "";
let cachedWalletSummaryAtMs = 0;
let cachedWalletSummary: MarketWalletSummaryLike | null = null;
let inflightWalletSummaryIdentityKey = "";
let inflightWalletSummaryPromise: Promise<MarketWalletSummaryLike | null> | null = null;
let failedWalletSummaryIdentityKey = "";
let failedWalletSummaryAtMs = 0;

function normalizeIdentityKey(value: string | null | undefined): string {
  return value?.trim() ?? "";
}

function resetSharedWalletSummaryState(): void {
  cachedWalletSummaryIdentityKey = "";
  cachedWalletSummaryAtMs = 0;
  cachedWalletSummary = null;
  inflightWalletSummaryIdentityKey = "";
  inflightWalletSummaryPromise = null;
  failedWalletSummaryIdentityKey = "";
  failedWalletSummaryAtMs = 0;
}

export function clearSharedWalletSummaryClientCache(): void {
  resetSharedWalletSummaryState();
}

function summaryIdentityKey(summary: MarketWalletSummaryLike | null | undefined): string {
  return normalizeIdentityKey(summary?.userId);
}

function canUseSummaryForIdentity(summary: MarketWalletSummaryLike | null | undefined, identityKey: string): boolean {
  if (!summary) return false;
  const summaryKey = summaryIdentityKey(summary);
  return !identityKey || !summaryKey || summaryKey === identityKey;
}

function fetchedWalletSummaryForIdentity(
  summary: MarketWalletSummaryLike | null | undefined,
  identityKey: string,
): MarketWalletSummaryLike | null {
  if (!summary || !identityKey) return null;
  const summaryKey = summaryIdentityKey(summary);
  if (!summaryKey) return null;
  return summaryKey === identityKey ? summary : null;
}

export function writeSharedWalletSummaryClientCache(
  summary: MarketWalletSummaryLike | null | undefined,
  identityKey?: string | null,
): MarketWalletSummaryLike | null {
  if (!summary) return null;
  const normalizedIdentityKey = normalizeIdentityKey(identityKey) || summaryIdentityKey(summary);
  if (!canUseSummaryForIdentity(summary, normalizedIdentityKey)) return null;
  const routeWalletSummary = peekWalletRouteHydrationSeed() as MarketWalletSummaryLike | null;
  const knownSummary = admitWalletSettlementProjection(
    routeWalletSummary,
    cachedWalletSummary ?? undefined,
  );
  const stableSummary = admitWalletSettlementProjection(knownSummary, summary);
  if (!stableSummary) return null;
  cachedWalletSummaryIdentityKey = normalizedIdentityKey;
  cachedWalletSummary = stableSummary;
  cachedWalletSummaryAtMs = Date.now();
  return stableSummary;
}

export function peekSharedWalletSummaryClientCache(identityKey?: string | null): MarketWalletSummaryLike | null {
  const normalizedIdentityKey = normalizeIdentityKey(identityKey);
  if (!canUseSummaryForIdentity(cachedWalletSummary, normalizedIdentityKey)) return null;
  if (
    normalizedIdentityKey &&
    cachedWalletSummaryIdentityKey === normalizedIdentityKey &&
    cachedWalletSummary &&
    Date.now() - cachedWalletSummaryAtMs <= SHARED_WALLET_SUMMARY_CACHE_MAX_AGE_MS
  ) {
    return cachedWalletSummary;
  }
  return null;
}

export function seedSharedWalletSummaryClientCacheFromKnownWallet(
  identityKey?: string | null,
): MarketWalletSummaryLike | null {
  const normalizedIdentityKey = normalizeIdentityKey(identityKey);
  const walletSeed = peekWalletRouteHydrationSeed() as MarketWalletSummaryLike | null;
  if (!canUseSummaryForIdentity(walletSeed, normalizedIdentityKey)) return null;
  return writeSharedWalletSummaryClientCache(walletSeed, normalizedIdentityKey);
}

function retainKnownWalletSummaryAfterFailure(identityKey: string): MarketWalletSummaryLike | null {
  failedWalletSummaryIdentityKey = identityKey;
  failedWalletSummaryAtMs = Date.now();
  const routeWalletSummary = seedSharedWalletSummaryClientCacheFromKnownWallet(identityKey);
  if (routeWalletSummary) return routeWalletSummary;
  return canUseSummaryForIdentity(cachedWalletSummary, identityKey) ? cachedWalletSummary : null;
}

export async function loadSharedWalletSummaryClient(
  identityKey?: string | null,
  options?: {
    force?: boolean;
    completeGlyphProjectionFallback?: boolean;
    proofAcceptance?: boolean;
  },
): Promise<MarketWalletSummaryLike | null> {
  const normalizedIdentityKey = normalizeIdentityKey(identityKey);
  if (!normalizedIdentityKey) {
    resetSharedWalletSummaryState();
  } else if (
    (cachedWalletSummaryIdentityKey && cachedWalletSummaryIdentityKey !== normalizedIdentityKey) ||
    (inflightWalletSummaryIdentityKey && inflightWalletSummaryIdentityKey !== normalizedIdentityKey)
  ) {
    resetSharedWalletSummaryState();
  }

  if (
    !options?.force &&
    normalizedIdentityKey &&
    cachedWalletSummaryIdentityKey === normalizedIdentityKey &&
    cachedWalletSummary &&
    Date.now() - cachedWalletSummaryAtMs <= SHARED_WALLET_SUMMARY_CACHE_MAX_AGE_MS
  ) {
    return cachedWalletSummary;
  }

  const seededWalletSummary = seedSharedWalletSummaryClientCacheFromKnownWallet(normalizedIdentityKey);
  if (!options?.force && seededWalletSummary) {
    return seededWalletSummary;
  }
  if (
    !options?.proofAcceptance &&
    failedWalletSummaryIdentityKey === normalizedIdentityKey &&
    Date.now() - failedWalletSummaryAtMs < SHARED_WALLET_SUMMARY_FAILURE_COOLDOWN_MS
  ) {
    return seededWalletSummary
      ?? (canUseSummaryForIdentity(cachedWalletSummary, normalizedIdentityKey) ? cachedWalletSummary : null);
  }

  if (inflightWalletSummaryPromise && inflightWalletSummaryIdentityKey === normalizedIdentityKey) {
    const inflightWalletSummary = await inflightWalletSummaryPromise;
    if (
      !options?.proofAcceptance ||
      (inflightWalletSummary && !walletSummaryRequiresCompleteGlyphProjection(inflightWalletSummary))
    ) {
      return inflightWalletSummary;
    }
  }

  inflightWalletSummaryIdentityKey = normalizedIdentityKey;
  const requestIdentityKey = normalizedIdentityKey;
  const requestPromise = fetch("/api/wallet/me?loadStrategy=market_snapshot", { cache: "no-store" })
    .then(async (response) => {
      const payload = (await response.json().catch(() => null)) as WalletMeResponse | null;
      if (!response.ok || !payload?.ok || !payload.wallet) {
        return retainKnownWalletSummaryAfterFailure(requestIdentityKey);
      }
      let fetchedWalletSummary = fetchedWalletSummaryForIdentity(payload.wallet, requestIdentityKey);
      if (walletSummaryRequiresCompleteGlyphProjection(fetchedWalletSummary)) {
        if (options?.completeGlyphProjectionFallback === false) {
          return retainKnownWalletSummaryAfterFailure(requestIdentityKey);
        }
        const fullResponse = await fetch("/api/wallet/me", { cache: "no-store" });
        const fullPayload = (await fullResponse.json().catch(() => null)) as WalletMeResponse | null;
        if (!fullResponse.ok || !fullPayload?.ok || !fullPayload.wallet) {
          return retainKnownWalletSummaryAfterFailure(requestIdentityKey);
        }
        fetchedWalletSummary = fetchedWalletSummaryForIdentity(fullPayload.wallet, requestIdentityKey);
      }
      const admittedWalletSummary = writeSharedWalletSummaryClientCache(fetchedWalletSummary, requestIdentityKey);
      if (!admittedWalletSummary) {
        return retainKnownWalletSummaryAfterFailure(requestIdentityKey);
      }
      failedWalletSummaryIdentityKey = "";
      failedWalletSummaryAtMs = 0;
      return admittedWalletSummary;
    })
    .catch(() => retainKnownWalletSummaryAfterFailure(requestIdentityKey))
    .finally(() => {
      if (inflightWalletSummaryPromise === requestPromise) {
        inflightWalletSummaryPromise = null;
        inflightWalletSummaryIdentityKey = "";
      }
    });

  inflightWalletSummaryPromise = requestPromise;
  const walletSummary = await requestPromise;
  return walletSummary;
}
