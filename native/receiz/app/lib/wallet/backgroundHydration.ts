"use client";

import { activeReceizAccountBindingOutranksUserId } from "@/app/lib/auth/receizAccountBindings";
import type { ProfileViewData } from "@/app/lib/profile/types";
import { projectWalletRouteSummaryFromCompleteProfile } from "@/app/signin/receizPortableStateLocalAdmission";
import {
  loadSharedWalletSummaryClient,
  writeSharedWalletSummaryClientCache,
} from "@/app/lib/market/walletSummaryClient";
import {
  WALLET_ROUTE_ACTIVITY_READY_EVENT_COUNT,
  peekWalletRouteActivityHydrationSeed,
  peekWalletRouteActivityRegister,
  peekWalletRouteHydrationSeed,
  projectWalletSettlementDebitAppend,
  writeWalletRouteActivityHydrationSeed,
  writeWalletRouteHydrationSeed,
  walletSummaryRequiresCompleteGlyphProjection,
  writeAuthenticatedWalletRouteHydrationSeed,
  type WalletRouteActivityHydrationSeed,
  type WalletRouteHydrationSummary,
  type WalletSettlementDebitAppend,
} from "@/app/lib/wallet/routeHydration";

type WalletLedgerResponse = {
  ok?: boolean;
  events?: WalletRouteActivityHydrationSeed["events"];
  rollup?: {
    lastEntryAt: string | null;
    lastEntryKaiUpulse?: string | null;
  };
  error?: string;
};

const WALLET_BACKGROUND_HYDRATION_MIN_INTERVAL_MS = 45_000;

let inflightWalletHydrationIdentityKey = "";
let inflightWalletHydrationPromise: Promise<boolean> | null = null;
let lastWalletHydrationIdentityKey = "";
let lastWalletHydrationAtMs = 0;

function normalizeIdentityKey(value: string | null | undefined): string {
  return value?.trim() ?? "";
}

function walletBelongsToIdentity(wallet: WalletRouteHydrationSummary | null | undefined, identityKey: string): boolean {
  return Boolean(wallet?.userId && identityKey && wallet.userId === identityKey);
}

async function readWalletActivity(sinceKaiUpulse: string | null = null): Promise<WalletLedgerResponse | null> {
  const params = new URLSearchParams();
  params.set("limit", "80");
  params.set("includeReceiz", "0");
  if (sinceKaiUpulse) params.set("sinceKaiUpulse", sinceKaiUpulse);
  const response = await fetch(`/api/wallet/ledger?${params.toString()}`, { cache: "no-store" });
  const payload = (await response.json().catch(() => null)) as WalletLedgerResponse | null;
  if (!response.ok || !payload) return null;
  return payload;
}

function publishWalletSummary(wallet: WalletRouteHydrationSummary, identityKey: string): void {
  writeWalletRouteHydrationSeed(wallet);
  const admittedWallet = peekWalletRouteHydrationSeed() as WalletRouteHydrationSummary | null;
  if (!admittedWallet || admittedWallet.userId !== identityKey) return;
  writeSharedWalletSummaryClientCache(admittedWallet, identityKey);
  window.dispatchEvent(new CustomEvent("wallet:summary", { detail: admittedWallet }));
}

export function admitWalletProjectionLocally(
  wallet: WalletRouteHydrationSummary | null | undefined,
): WalletRouteHydrationSummary | null {
  if (typeof window === "undefined" || !wallet?.userId) return null;
  if (activeReceizAccountBindingOutranksUserId(wallet.userId)) return null;
  publishWalletSummary(wallet, wallet.userId);
  return peekWalletRouteHydrationSeed() as WalletRouteHydrationSummary | null;
}

export function admitAuthenticatedWalletProjectionAfterIdentityProof(
  wallet: WalletRouteHydrationSummary | null | undefined,
): WalletRouteHydrationSummary | null {
  if (typeof window === "undefined" || !wallet?.userId) return null;
  if (activeReceizAccountBindingOutranksUserId(wallet.userId)) return null;
  const admittedWallet = writeAuthenticatedWalletRouteHydrationSeed(wallet);
  if (!admittedWallet || admittedWallet.userId !== wallet.userId) return admittedWallet;
  writeSharedWalletSummaryClientCache(admittedWallet, admittedWallet.userId);
  window.dispatchEvent(new CustomEvent("wallet:summary", { detail: admittedWallet }));
  return admittedWallet;
}

export function admitWalletSettlementAppend(append: WalletSettlementDebitAppend): WalletRouteHydrationSummary | null {
  if (typeof window === "undefined") return null;
  const current = peekWalletRouteHydrationSeed() as WalletRouteHydrationSummary | null;
  if (!current?.userId || activeReceizAccountBindingOutranksUserId(current.userId)) return current;
  const projected = projectWalletSettlementDebitAppend(current, append);
  if (!projected || projected === current) return current;
  publishWalletSummary(projected, projected.userId);
  return peekWalletRouteHydrationSeed() as WalletRouteHydrationSummary | null;
}

export function appendCompleteProfileWalletProjection(profile: ProfileViewData): WalletRouteHydrationSummary | null {
  if (typeof window === "undefined" || profile.originalsPage.hasMore) return null;
  const carried = peekWalletRouteHydrationSeed() as WalletRouteHydrationSummary | null;
  if (!carried || carried.userId !== profile.profile.userId) return carried;
  const projected = projectWalletRouteSummaryFromCompleteProfile(carried, profile);
  publishWalletSummary(projected, carried.userId);
  return peekWalletRouteHydrationSeed() as WalletRouteHydrationSummary | null;
}

function activitySeedIsCurrent(
  seed: WalletRouteActivityHydrationSeed | null,
  wallet: WalletRouteHydrationSummary,
): boolean {
  if (!seed?.userId || seed.userId !== wallet.userId) return false;
  const walletLastEntryAt = wallet.rollup?.lastEntryAt ?? null;
  const walletLastEntryKaiUpulse = wallet.rollup?.lastEntryKaiUpulse ?? null;
  if (walletLastEntryKaiUpulse) {
    if (seed.lastEntryKaiUpulse !== walletLastEntryKaiUpulse) return false;
  } else if (seed.lastEntryAt !== walletLastEntryAt) {
    return false;
  }
  if (!walletLastEntryKaiUpulse && !walletLastEntryAt) return true;
  return seed.events.length >= WALLET_ROUTE_ACTIVITY_READY_EVENT_COUNT;
}

async function warmWalletActivity(wallet: WalletRouteHydrationSummary): Promise<void> {
  const currentSeed = peekWalletRouteActivityHydrationSeed();
  const currentRegister = peekWalletRouteActivityRegister();
  if (activitySeedIsCurrent(currentRegister ?? currentSeed, wallet)) return;
  const activityHead = currentRegister?.userId === wallet.userId ? currentRegister.lastEntryKaiUpulse : currentSeed?.userId === wallet.userId ? currentSeed.lastEntryKaiUpulse : null;
  const sinceKaiUpulse = activityHead;
  const payload = await readWalletActivity(sinceKaiUpulse);
  if (!payload?.ok) return;
  const events = Array.isArray(payload.events) ? payload.events : [];
  writeWalletRouteActivityHydrationSeed({
    userId: wallet.userId,
    lastEntryAt: payload.rollup?.lastEntryAt ?? null,
    lastEntryKaiUpulse: payload.rollup?.lastEntryKaiUpulse ?? null,
    events,
  });
}

export async function warmWalletSettlementHydrationInBackground(
  identityKeyValue?: string | null,
  options?: { force?: boolean; proofAcceptance?: boolean },
): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  const identityKey = normalizeIdentityKey(identityKeyValue);
  if (!identityKey) return Promise.resolve(false);

  const walletSeed = peekWalletRouteHydrationSeed() as WalletRouteHydrationSummary | null;
  const walletSeedBelongsToIdentity = walletBelongsToIdentity(walletSeed, identityKey);
  if (walletSeedBelongsToIdentity) {
    writeSharedWalletSummaryClientCache(walletSeed, identityKey);
  }

  const now = Date.now();
  if (
    lastWalletHydrationIdentityKey === identityKey &&
    now - lastWalletHydrationAtMs < WALLET_BACKGROUND_HYDRATION_MIN_INTERVAL_MS &&
    walletSeedBelongsToIdentity &&
    !options?.force
  ) {
    return Promise.resolve(Boolean(walletSeed));
  }

  if (inflightWalletHydrationPromise && inflightWalletHydrationIdentityKey === identityKey) {
    const inflightResult = await inflightWalletHydrationPromise;
    const admittedAfterInflight = peekWalletRouteHydrationSeed() as WalletRouteHydrationSummary | null;
    if (
      !options?.proofAcceptance ||
      (inflightResult && !walletSummaryRequiresCompleteGlyphProjection(admittedAfterInflight))
    ) {
      return inflightResult;
    }
  }

  inflightWalletHydrationIdentityKey = identityKey;
  lastWalletHydrationIdentityKey = identityKey;
  lastWalletHydrationAtMs = now;
  inflightWalletHydrationPromise = (async () => {
    try {
      const wallet = await loadSharedWalletSummaryClient(identityKey, {
        force: true,
        proofAcceptance: options?.proofAcceptance,
      }) as WalletRouteHydrationSummary | null;
      if (!wallet) return Boolean(walletSeed);
      if (!walletBelongsToIdentity(wallet, identityKey)) return Boolean(walletSeed);
      if (activeReceizAccountBindingOutranksUserId(wallet.userId)) return Boolean(walletSeed);

      publishWalletSummary(wallet, identityKey);
      await warmWalletActivity(wallet);
      lastWalletHydrationIdentityKey = identityKey;
      lastWalletHydrationAtMs = Date.now();
      return true;
    } catch {
      return Boolean(walletSeed);
    } finally {
      inflightWalletHydrationIdentityKey = "";
      inflightWalletHydrationPromise = null;
    }
  })();

  return inflightWalletHydrationPromise;
}

export function appendCompleteWalletProjectionAfterIdentityProof(identityKey: string): void {
  if (!identityKey.trim()) return;
  void warmWalletSettlementHydrationInBackground(identityKey, {
    force: true,
    proofAcceptance: true,
  });
}
