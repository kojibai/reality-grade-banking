"use client";

import {
  clearMarketRouteFastEntryHint,
  clearMarketRouteSnapshot,
  clearPreparedMarketRouteTransition,
} from "@/app/lib/market/routeHydration";
import { clearSharedWalletSummaryClientCache } from "@/app/lib/market/walletSummaryClient";
import { clearProfileWorkspaceHydrationSeed } from "@/app/lib/profile/workspaceHydration";
import { clearWalletRouteHydrationSeed } from "@/app/lib/wallet/routeHydration";
import { clearWorldRouteFastEntryHint, clearWorldRouteSnapshot } from "@/app/lib/world/routeHydration";

export function clearAccountScopedRouteContinuity(): void {
  clearProfileWorkspaceHydrationSeed();
  clearWalletRouteHydrationSeed();
  clearSharedWalletSummaryClientCache();
  clearPreparedMarketRouteTransition();
  clearMarketRouteSnapshot();
  clearMarketRouteFastEntryHint();
  clearWorldRouteSnapshot();
  clearWorldRouteFastEntryHint();
}
