import { peekProfileRouteSnapshot, peekProfileRouteHydrationSeed, peekProfileRouteSnapshotFromWholeMarketPublicProof } from "@/app/lib/profile/routeHydration";
import { projectWalletRouteSummaryFromCompleteProfile } from "@/app/signin/receizPortableStateLocalAdmission";
import {
  buildWalletValueStatesFromBalanceCents,
  buildWalletValueStatesFromSettledUsdDisplay,
  normalizeWalletValueStates,
  type WalletValueStates,
} from "@/app/lib/wallet/valueStates";
import { activeReceizAccountBindingOutranksUserId } from "@/app/lib/auth/receizAccountBindings";
import {
  DURABLE_LOCAL_TRUTH_RANK,
  readDurableLocalTruthItem,
  writeDurableLocalTruthItem,
} from "@/app/lib/runtime/localTruthStore";
import { peekSessionBootstrapSnapshot } from "@/app/lib/session/bootstrapHydration";

const WALLET_ROUTE_HYDRATION_KEY = "receiz.wallet.route.seed.v1";
const WALLET_ROUTE_DURABLE_HYDRATION_KEY = "receiz.wallet.route.seed.durable.v1";
const WALLET_ROUTE_ACTIVITY_HYDRATION_KEY = "receiz.wallet.route.activity.seed.v1";
const WALLET_ROUTE_DURABLE_ACTIVITY_HYDRATION_KEY = "receiz.wallet.route.activity.seed.durable.v1";
const WALLET_ROUTE_ACTIVITY_REGISTER_KEY = "receiz.wallet.route.activity.register.v1";
const WALLET_ROUTE_HYDRATION_MAX_AGE_MS = 12 * 60 * 60_000;
const WALLET_ROUTE_ACTIVITY_DURABLE_EVENT_LIMIT = 1000;
export const WALLET_ROUTE_FIRST_PAINT_COOKIE = "receiz_wallet_first_paint";
export const WALLET_ROUTE_ACTIVITY_FIRST_PAINT_COOKIE = "receiz_wallet_activity_first_paint";
export const WALLET_ROUTE_ACTIVITY_READY_EVENT_COUNT = 10;
const WALLET_ROUTE_FIRST_PAINT_COOKIE_MAX_AGE_SECONDS = 12 * 60 * 60;
const WALLET_ROUTE_FIRST_PAINT_COOKIE_MAX_LENGTH = 3600;
const WALLET_ROUTE_ACTIVITY_FIRST_PAINT_COOKIE_MAX_LENGTH = 3800;

export type WalletRouteHydrationSummary = {
  userId: string;
  creationSigilBenefitsEnabled?: boolean;
  creationSigilEntitlementEnabled?: boolean;
  balancePhiMicro: string;
  balancePhi: string;
  balanceUsd: string;
  valueStates?: WalletValueStates;
  quote: {
    usdPerPhi: number;
    phiPerUsd: number;
    usdPerPhiMicrocents: string;
  };
  rollup: {
    totalCreditPhiMicro: string;
    totalDebitPhiMicro: string;
    totalCreditUsdCents: string;
    totalDebitUsdCents: string;
    transferCount: number;
    noteMintCount: number;
    noteClaimCount: number;
    lastEntryAt: string | null;
    lastEntryKaiUpulse: string | null;
    lastEntryKaiPulse: string | null;
  };
  creationSigil?: {
    pulse: number;
    beat: number;
    stepIndex: number;
    chakraDay: string;
    createdAt: string;
    kaiSignature: string | null;
  } | null;
  sync?: {
    source?: "profile_plus_ledger_v1" | "account_only";
    profileProjectionKaiPulse?: number | string | null;
    lawfulActionProjectionAvailable?: boolean;
    acceptedSettlementIds?: string[];
    [key: string]: unknown;
  };
};

export type WalletSettlementDebitAppend = {
  settlementId: string;
  amountUsdCents: string | number;
  amountPhiMicro: string | number;
  balanceAfterPhiMicro: string | number;
  occurredAtMs: string | number;
  alreadyProcessed?: boolean;
};

export type WalletSettlementCreditAppend = {
  settlementId: string;
  amountUsdCents: string | number;
  amountPhiMicro: string | number;
  balanceAfterPhiMicro?: string | number | null;
  occurredAtMs: string | number;
  kaiUpulse?: string | number | null;
  kaiPulse?: string | number | null;
};

function nonNegativeBigint(value: unknown): bigint | null {
  const text = String(value ?? "").trim();
  if (!/^\d+$/.test(text)) return null;
  try {
    return BigInt(text);
  } catch {
    return null;
  }
}

function ownerScopedWalletTruthKey(base: string, userId: string): string {
  return `${base}.${encodeURIComponent(userId.trim())}`;
}

function activeWalletTruthOwner(): string | null {
  return peekSessionBootstrapSnapshot(true)?.uid?.trim() || null;
}

function usdDisplayCents(value: unknown): bigint | null {
  const text = String(value ?? "").trim().replace(/[$,\s]/g, "");
  const match = text.match(/^(\d+)(?:\.(\d{0,2}))?$/);
  if (!match) return null;
  return BigInt(match[1] ?? "0") * 100n + BigInt((match[2] ?? "").padEnd(2, "0") || "0");
}

function phiDisplayFromMicro(value: bigint): string {
  const safe = value >= 0n ? value : 0n;
  const whole = safe / 1_000_000n;
  const fraction = (safe % 1_000_000n).toString().padStart(6, "0").replace(/0+$/, "");
  return fraction ? `${whole.toString()}.${fraction}` : whole.toString();
}

function acceptedSettlementIds(summary: WalletSettlementProjection | null | undefined): string[] {
  const ids = summary?.sync && Array.isArray((summary.sync as { acceptedSettlementIds?: unknown }).acceptedSettlementIds)
    ? (summary.sync as { acceptedSettlementIds: unknown[] }).acceptedSettlementIds
    : [];
  return ids
    .map((value) => typeof value === "string" ? value.trim() : "")
    .filter(Boolean);
}

function incomingCarriesNewSettlementAppend(
  current: WalletSettlementProjection,
  incoming: WalletSettlementProjection,
): boolean {
  const currentIds = new Set(acceptedSettlementIds(current));
  return acceptedSettlementIds(incoming).some((id) => !currentIds.has(id));
}

export function projectWalletSettlementDebitAppend(
  current: WalletRouteHydrationSummary | null | undefined,
  append: WalletSettlementDebitAppend,
): WalletRouteHydrationSummary | null {
  if (!current || append.alreadyProcessed === true) return current ?? null;
  const settlementId = append.settlementId.trim();
  const amountUsdCents = nonNegativeBigint(append.amountUsdCents);
  const amountPhiMicro = nonNegativeBigint(append.amountPhiMicro);
  const balanceAfterPhiMicro = nonNegativeBigint(append.balanceAfterPhiMicro);
  const occurredAtMs = Number(append.occurredAtMs);
  if (!settlementId || !amountUsdCents || amountUsdCents <= 0n || amountPhiMicro === null || balanceAfterPhiMicro === null || !Number.isFinite(occurredAtMs)) {
    return current;
  }
  const existingSettlementIds = acceptedSettlementIds(current);
  if (existingSettlementIds.includes(settlementId)) return current;

  const currentBalanceUsdCents = usdDisplayCents(current.balanceUsd);
  if (currentBalanceUsdCents === null) return current;
  const nextBalanceUsdCents = currentBalanceUsdCents > amountUsdCents
    ? currentBalanceUsdCents - amountUsdCents
    : 0n;
  const currentSettledUsdCents = nonNegativeBigint(current.valueStates?.settledBalanceUsdCents) ?? 0n;
  const settledDebitUsdCents = currentSettledUsdCents > amountUsdCents ? amountUsdCents : currentSettledUsdCents;
  const nextSettledUsdCents = currentSettledUsdCents - settledDebitUsdCents;
  const nextEcosystemUsdCents = nextBalanceUsdCents > nextSettledUsdCents
    ? nextBalanceUsdCents - nextSettledUsdCents
    : 0n;
  const occurredAt = new Date(Math.trunc(occurredAtMs)).toISOString();
  const sync = current.sync ?? {};
  const transactionDeltaPhiMicro = /^-?\d+$/.test(String(sync.transactionDeltaPhiMicro ?? ""))
    ? (BigInt(String(sync.transactionDeltaPhiMicro)) - amountPhiMicro).toString()
    : sync.transactionDeltaPhiMicro;
  const transactionDeltaUsdCents = /^-?\d+$/.test(String(sync.transactionDeltaUsdCents ?? ""))
    ? (BigInt(String(sync.transactionDeltaUsdCents)) - amountUsdCents).toString()
    : sync.transactionDeltaUsdCents;

  return {
    ...current,
    balancePhiMicro: balanceAfterPhiMicro.toString(),
    balancePhi: phiDisplayFromMicro(balanceAfterPhiMicro),
    balanceUsd: formatWalletUsdCents(nextBalanceUsdCents),
    valueStates: current.valueStates ? {
      ...current.valueStates,
      settledBalanceUsd: formatWalletUsdCents(nextSettledUsdCents),
      settledBalanceUsdCents: nextSettledUsdCents.toString(),
      ecosystemBalanceUsd: formatWalletUsdCents(nextEcosystemUsdCents),
      ecosystemBalanceUsdCents: nextEcosystemUsdCents.toString(),
    } : current.valueStates,
    rollup: {
      ...current.rollup,
      totalDebitPhiMicro: ((nonNegativeBigint(current.rollup.totalDebitPhiMicro) ?? 0n) + amountPhiMicro).toString(),
      totalDebitUsdCents: ((nonNegativeBigint(current.rollup.totalDebitUsdCents) ?? 0n) + amountUsdCents).toString(),
      lastEntryAt: occurredAt,
    },
    sync: {
      ...sync,
      ...(transactionDeltaPhiMicro === undefined ? {} : { transactionDeltaPhiMicro }),
      ...(transactionDeltaUsdCents === undefined ? {} : { transactionDeltaUsdCents }),
      accountBalancePhiMicro: balanceAfterPhiMicro.toString(),
      acceptedSettlementIds: [...existingSettlementIds, settlementId].slice(-64),
    },
  };
}

export function projectWalletSettlementCreditAppend(
  current: WalletRouteHydrationSummary | null | undefined,
  append: WalletSettlementCreditAppend,
): WalletRouteHydrationSummary | null {
  if (!current) return null;
  const settlementId = append.settlementId.trim();
  const amountUsdCents = nonNegativeBigint(append.amountUsdCents);
  const amountPhiMicro = nonNegativeBigint(append.amountPhiMicro);
  const occurredAtMs = Number(append.occurredAtMs);
  if (!settlementId || !amountUsdCents || amountUsdCents <= 0n || !amountPhiMicro || amountPhiMicro <= 0n || !Number.isFinite(occurredAtMs)) {
    return current;
  }
  const existingSettlementIds = acceptedSettlementIds(current);
  if (existingSettlementIds.includes(settlementId)) return current;

  const currentBalanceUsdCents = usdDisplayCents(current.balanceUsd);
  const currentBalancePhiMicro = nonNegativeBigint(current.balancePhiMicro);
  if (currentBalanceUsdCents === null || currentBalancePhiMicro === null) return current;
  const accountBalanceBefore = nonNegativeBigint(current.sync?.accountBalancePhiMicro) ?? currentBalancePhiMicro;
  const balanceAfterPhiMicro = nonNegativeBigint(append.balanceAfterPhiMicro);
  const sourceAlreadyInAccount = balanceAfterPhiMicro !== null && accountBalanceBefore >= balanceAfterPhiMicro;
  const nextBalanceUsdCents = sourceAlreadyInAccount ? currentBalanceUsdCents : currentBalanceUsdCents + amountUsdCents;
  const nextBalancePhiMicro = sourceAlreadyInAccount ? currentBalancePhiMicro : currentBalancePhiMicro + amountPhiMicro;
  const currentSettledUsdCents = nonNegativeBigint(current.valueStates?.settledBalanceUsdCents) ?? 0n;
  const nextSettledUsdCents = currentSettledUsdCents + amountUsdCents;
  const nextValueStates = {
    ...buildWalletValueStatesFromBalanceCents(nextSettledUsdCents, nextBalanceUsdCents),
    ...(current.valueStates ?? {}),
    settledBalanceUsd: formatWalletUsdCents(nextSettledUsdCents),
    settledBalanceUsdCents: nextSettledUsdCents.toString(),
  };
  const occurredAt = new Date(Math.trunc(occurredAtMs)).toISOString();
  const sync = current.sync ?? {};
  const transactionDeltaPhiMicro = /^-?\d+$/.test(String(sync.transactionDeltaPhiMicro ?? ""))
    ? (BigInt(String(sync.transactionDeltaPhiMicro)) + amountPhiMicro).toString()
    : sync.transactionDeltaPhiMicro;
  const transactionDeltaUsdCents = /^-?\d+$/.test(String(sync.transactionDeltaUsdCents ?? ""))
    ? (BigInt(String(sync.transactionDeltaUsdCents)) + amountUsdCents).toString()
    : sync.transactionDeltaUsdCents;
  const kaiUpulse = String(append.kaiUpulse ?? "").trim();
  const kaiPulse = String(append.kaiPulse ?? "").trim();

  return {
    ...current,
    balancePhiMicro: nextBalancePhiMicro.toString(),
    balancePhi: phiDisplayFromMicro(nextBalancePhiMicro),
    balanceUsd: formatWalletUsdCents(nextBalanceUsdCents),
    valueStates: nextValueStates,
    rollup: {
      ...current.rollup,
      totalCreditPhiMicro: ((nonNegativeBigint(current.rollup.totalCreditPhiMicro) ?? 0n) + amountPhiMicro).toString(),
      totalCreditUsdCents: ((nonNegativeBigint(current.rollup.totalCreditUsdCents) ?? 0n) + amountUsdCents).toString(),
      lastEntryAt: occurredAt,
      lastEntryKaiUpulse: /^\d+$/.test(kaiUpulse) ? kaiUpulse : current.rollup.lastEntryKaiUpulse,
      lastEntryKaiPulse: /^\d+$/.test(kaiPulse) ? kaiPulse : current.rollup.lastEntryKaiPulse,
    },
    sync: {
      ...sync,
      ...(transactionDeltaPhiMicro === undefined ? {} : { transactionDeltaPhiMicro }),
      ...(transactionDeltaUsdCents === undefined ? {} : { transactionDeltaUsdCents }),
      accountBalancePhiMicro: (balanceAfterPhiMicro ?? (accountBalanceBefore + (sourceAlreadyInAccount ? 0n : amountPhiMicro))).toString(),
      acceptedSettlementIds: [...existingSettlementIds, settlementId].slice(-64),
    },
  };
}

export type WalletRouteActivityHydrationEvent = {
  id: string;
  kind: string;
  createdAt: string;
  kaiUpulse: string;
  pulse: number;
  proofBundle: {
    proofCapsule: {
      upulse: string;
      pulse: number;
      kaiKlok: string;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

export type WalletRouteActivityHydrationSeed = {
  userId: string;
  lastEntryAt: string | null;
  lastEntryKaiUpulse: string | null;
  olderCursor?: string | null;
  olderHistoryComplete?: boolean;
  events: WalletRouteActivityHydrationEvent[];
};

export type WalletRouteActivityRegister = WalletRouteActivityHydrationSeed;

type WalletRouteHydrationStored = {
  version: 1;
  createdAtMs: number;
  wallet: WalletRouteHydrationSummary;
};

type WalletRouteActivityHydrationStored = {
  version: 1;
  createdAtMs: number;
  seed: WalletRouteActivityHydrationSeed;
};

export function walletRouteRequiresPrincipalReset(args: {
  previousPrincipalUid: string | null | undefined;
  nextPrincipalUid: string | null | undefined;
  mountedWalletUserId: string | null | undefined;
}): boolean {
  const previousPrincipalUid = args.previousPrincipalUid?.trim() ?? "";
  const nextPrincipalUid = args.nextPrincipalUid?.trim() ?? "";
  const mountedWalletUserId = args.mountedWalletUserId?.trim() ?? "";
  if (!nextPrincipalUid) return false;
  return Boolean(
    (previousPrincipalUid && previousPrincipalUid !== nextPrincipalUid) ||
      (mountedWalletUserId && mountedWalletUserId !== nextPrincipalUid),
  );
}

type WalletGlyphProjection = {
  userId?: string | null;
  creationSigilBenefitsEnabled?: boolean | null;
  valueStates?: {
    settledBalanceUsd?: string | number | null;
    ecosystemBalanceUsd?: string | number | null;
  } | null;
  sync?: {
    projectionComplete?: boolean;
    source?: "profile_plus_ledger_v1" | "account_only" | null;
    profileProjectionKaiPulse?: number | string | null;
    lawfulActionProjectionAvailable?: boolean;
  } | null;
};

type WalletSettlementProjection = WalletGlyphProjection & {
  balanceUsd?: string | number | null;
  valueStates?: object | null;
  rollup?: {
    transferCount?: string | number | null;
    noteMintCount?: string | number | null;
    noteClaimCount?: string | number | null;
    lastEntryAt?: string | null;
    lastEntryKaiUpulse?: string | null;
  } | null;
};

function incomingCarriesFundedReserveAdvancement(
  current: WalletSettlementProjection,
  incoming: WalletSettlementProjection,
): boolean {
  const currentSettled = nonNegativeBigint((current.valueStates as { settledBalanceUsdCents?: unknown } | null | undefined)?.settledBalanceUsdCents);
  const incomingSettled = nonNegativeBigint((incoming.valueStates as { settledBalanceUsdCents?: unknown } | null | undefined)?.settledBalanceUsdCents);
  if (currentSettled === null || incomingSettled === null || incomingSettled <= currentSettled) return false;
  const currentTotal = usdDisplayCents(current.balanceUsd);
  const incomingTotal = usdDisplayCents(incoming.balanceUsd);
  return currentTotal !== null && incomingTotal !== null && incomingTotal >= currentTotal;
}

type WalletProofAccountProjection = WalletGlyphProjection & {
  balanceUsd?: string | number | null;
  valueStates?: {
    settledBalanceUsdCents?: string | number | null;
    ecosystemBalanceUsdCents?: string | number | null;
  } | null;
};

function walletSettlementProjectionHead(summary: WalletSettlementProjection): bigint | null {
  const raw = summary.rollup?.lastEntryKaiUpulse?.trim() ?? "";
  if (!/^-?\d+$/.test(raw)) return null;
  try {
    return BigInt(raw);
  } catch {
    return null;
  }
}

function walletSettlementProjectionDepth(summary: WalletSettlementProjection): number {
  return (
    Math.max(0, Number(summary.rollup?.transferCount ?? 0)) +
    Math.max(0, Number(summary.rollup?.noteMintCount ?? 0)) +
    Math.max(0, Number(summary.rollup?.noteClaimCount ?? 0))
  );
}

function walletSettlementProjectionChronos(summary: WalletSettlementProjection): number {
  const parsed = Date.parse(summary.rollup?.lastEntryAt ?? "");
  return Number.isFinite(parsed) ? parsed : 0;
}

function walletProfileProjectionKaiPulse(summary: WalletSettlementProjection): bigint | null {
  if (summary.sync?.source !== "profile_plus_ledger_v1") return null;
  const raw = String(summary.sync.profileProjectionKaiPulse ?? "").trim();
  if (!/^\d+$/.test(raw)) return null;
  try {
    return BigInt(raw);
  } catch {
    return null;
  }
}

function newerCompleteGlyphProfileProjection<T extends WalletSettlementProjection>(
  current: T,
  incoming: T,
): T | null {
  if (
    current.creationSigilBenefitsEnabled !== true ||
    incoming.creationSigilBenefitsEnabled !== true ||
    current.sync?.source !== "profile_plus_ledger_v1" ||
    incoming.sync?.source !== "profile_plus_ledger_v1"
  ) {
    return null;
  }
  const currentPulse = walletProfileProjectionKaiPulse(current);
  const incomingPulse = walletProfileProjectionKaiPulse(incoming);
  if (currentPulse === null && incomingPulse === null) return null;
  if (currentPulse === null) return incoming;
  if (incomingPulse === null) return current;
  if (incomingPulse === currentPulse) return current;
  return incomingPulse > currentPulse ? incoming : current;
}

function completeGlyphSettlementUsdCents(summary: WalletSettlementProjection): bigint | null {
  if (
    summary.creationSigilBenefitsEnabled !== true ||
    summary.sync?.source !== "profile_plus_ledger_v1"
  ) {
    return null;
  }
  const valueStates = summary.valueStates as {
    settledBalanceUsdCents?: string | number | null;
    ecosystemBalanceUsdCents?: string | number | null;
  } | null | undefined;
  const settled = String(valueStates?.settledBalanceUsdCents ?? "").trim();
  const ecosystem = String(valueStates?.ecosystemBalanceUsdCents ?? "").trim();
  if (!/^\d+$/.test(settled) || !/^\d+$/.test(ecosystem)) return null;
  return BigInt(settled) + BigInt(ecosystem);
}

function equalHeadWouldEraseNonzeroGlyphSettlement(
  current: WalletSettlementProjection,
  incoming: WalletSettlementProjection,
): boolean {
  const currentHead = walletSettlementProjectionHead(current);
  const incomingHead = walletSettlementProjectionHead(incoming);
  if (currentHead === null || incomingHead === null || currentHead !== incomingHead) return false;
  const currentUsdCents = completeGlyphSettlementUsdCents(current);
  const incomingUsdCents = completeGlyphSettlementUsdCents(incoming);
  return currentUsdCents !== null && currentUsdCents > 0n && incomingUsdCents === 0n;
}

export function selectWalletFirstPaintSettlementProjection<T extends WalletSettlementProjection>(
  server: T | null | undefined,
  local: T | null | undefined,
): T | null {
  if (local && walletSummaryRequiresCompleteGlyphProjection(local)) local = null;
  if (!server) return local ?? null;
  if (walletSummaryRequiresCompleteGlyphProjection(server)) {
    return local && local.userId?.trim() === server.userId?.trim() ? local : null;
  }
  if (!local) return server;
  const serverUserId = server.userId?.trim() ?? "";
  const localUserId = local.userId?.trim() ?? "";
  if (serverUserId && localUserId && serverUserId !== localUserId) return server;

  const completeProjection = preserveCompleteGlyphSettlementProjection(local, server);
  if (completeProjection === local) return local;

  const serverHead = walletSettlementProjectionHead(server);
  const localHead = walletSettlementProjectionHead(local);
  if (serverHead !== null && localHead !== null) {
    if (serverHead === localHead) {
      if (incomingCarriesFundedReserveAdvancement(local, server)) return server;
      const profileProjection = newerCompleteGlyphProfileProjection(local, server);
      if (profileProjection) return profileProjection;
      if (equalHeadWouldEraseNonzeroGlyphSettlement(local, server)) return local;
      return local;
    }
    return localHead > serverHead ? local : server;
  }

  if (serverHead === null && localHead === null) {
    const profileProjection = newerCompleteGlyphProfileProjection(local, server);
    if (profileProjection) return profileProjection;
    if (equalHeadWouldEraseNonzeroGlyphSettlement(local, server)) return local;
  }

  const serverDepth = walletSettlementProjectionDepth(server);
  const localDepth = walletSettlementProjectionDepth(local);
  if (serverDepth !== localDepth) return localDepth > serverDepth ? local : server;

  return walletSettlementProjectionChronos(local) >= walletSettlementProjectionChronos(server)
    ? local
    : server;
}

export function admitWalletSettlementProjection<T extends WalletSettlementProjection>(
  current: T | null | undefined,
  incoming: T | null | undefined,
): T | null {
  if (current && walletSummaryRequiresCompleteGlyphProjection(current)) current = null;
  if (incoming === undefined) return current ?? null;
  if (incoming === null) return current ?? null;
  if (walletSummaryRequiresCompleteGlyphProjection(incoming)) {
    return current && current.userId?.trim() === incoming.userId?.trim() ? current : null;
  }
  if (!current) return walletSummaryRequiresCompleteGlyphProjection(incoming) ? null : incoming;

  const currentUserId = current.userId?.trim() ?? "";
  const incomingUserId = incoming.userId?.trim() ?? "";
  if (currentUserId && incomingUserId && currentUserId !== incomingUserId) return incoming;

  const completeProjection = preserveCompleteGlyphSettlementProjection(current, incoming);
  if (completeProjection === current) return current;

  const currentHead = walletSettlementProjectionHead(current);
  const incomingHead = walletSettlementProjectionHead(incoming);
  if (currentHead !== null) {
    if (incomingHead === null || incomingHead < currentHead) return current;
    if (incomingHead === currentHead) {
      if (incomingCarriesNewSettlementAppend(current, incoming)) return incoming;
      if (incomingCarriesFundedReserveAdvancement(current, incoming)) return incoming;
      const profileProjection = newerCompleteGlyphProfileProjection(current, incoming);
      if (profileProjection) return profileProjection;
      if (equalHeadWouldEraseNonzeroGlyphSettlement(current, incoming)) return current;
      return current;
    }
    return incoming;
  }
  if (incomingHead !== null) return incoming;

  const profileProjection = newerCompleteGlyphProfileProjection(current, incoming);
  if (profileProjection) return profileProjection;
  if (equalHeadWouldEraseNonzeroGlyphSettlement(current, incoming)) return current;

  const currentDepth = walletSettlementProjectionDepth(current);
  const incomingDepth = walletSettlementProjectionDepth(incoming);
  if (incomingDepth < currentDepth) return current;
  if (incomingDepth > currentDepth) return incoming;

  return walletSettlementProjectionChronos(incoming) < walletSettlementProjectionChronos(current)
    ? current
    : incoming;
}

/**
 * Appends the current authenticated account snapshot after Identity proof
 * acceptance. The carried proof paints first. A server snapshot with a farther
 * ledger head replaces it; a partial server rollup may refresh current account
 * value while retaining the carried verified ledger coordinate. A server head
 * behind the carried proof can never downgrade it.
 */
export function appendAuthenticatedWalletSnapshotAfterIdentityProof<
  T extends WalletRouteHydrationSummary,
>(
  carried: T | null | undefined,
  authenticated: T | null | undefined,
): T | null {
  if (carried && walletSummaryRequiresCompleteGlyphProjection(carried)) carried = null;
  if (!authenticated) return carried ?? null;
  if (walletSummaryRequiresCompleteGlyphProjection(authenticated)) {
    return carried && carried.userId.trim() === authenticated.userId.trim() ? carried : null;
  }
  if (!carried) return authenticated;
  if (carried.userId.trim() !== authenticated.userId.trim()) return authenticated;

  const carriedHead = walletSettlementProjectionHead(carried);
  const authenticatedHead = walletSettlementProjectionHead(authenticated);
  if (
    carriedHead !== null &&
    authenticatedHead !== null &&
    authenticatedHead < carriedHead
  ) {
    const newerProfileProjection = newerCompleteGlyphProfileProjection(
      carried,
      authenticated,
    );
    if (newerProfileProjection !== authenticated) return carried;
  }

  const acceptedIds = Array.from(new Set([
    ...acceptedSettlementIds(carried),
    ...acceptedSettlementIds(authenticated),
  ])).slice(-64);
  const retainCarriedLedgerCoordinate = carriedHead !== null && (
    authenticatedHead === null || authenticatedHead < carriedHead
  );
  return {
    ...carried,
    ...authenticated,
    creationSigil: authenticated.creationSigil ?? carried.creationSigil ?? null,
    rollup: {
      ...carried.rollup,
      ...authenticated.rollup,
      ...(retainCarriedLedgerCoordinate
        ? {
            lastEntryAt: carried.rollup.lastEntryAt,
            lastEntryKaiUpulse: carried.rollup.lastEntryKaiUpulse,
            lastEntryKaiPulse: carried.rollup.lastEntryKaiPulse,
          }
        : {}),
    },
    sync: {
      ...(carried.sync ?? {}),
      ...(authenticated.sync ?? {}),
      ...(acceptedIds.length > 0 ? { acceptedSettlementIds: acceptedIds } : {}),
    },
  };
}

function formatWalletUsdCents(cents: bigint): string {
  const safe = cents >= 0n ? cents : 0n;
  return `${(safe / 100n).toString()}.${(safe % 100n).toString().padStart(2, "0")}`;
}

export function walletProofAccountUsdDisplay(summary: WalletProofAccountProjection | null | undefined): string {
  const fallback = typeof summary?.balanceUsd === "number"
    ? (Number.isFinite(summary.balanceUsd) ? String(summary.balanceUsd) : "0.00")
    : summary?.balanceUsd?.trim() || "0.00";
  if (
    summary?.creationSigilBenefitsEnabled !== true ||
    summary.sync?.source !== "profile_plus_ledger_v1"
  ) {
    return fallback;
  }
  const settled = String(summary.valueStates?.settledBalanceUsdCents ?? "").trim();
  const ecosystem = String(summary.valueStates?.ecosystemBalanceUsdCents ?? "").trim();
  if (!/^\d+$/.test(settled) || !/^\d+$/.test(ecosystem)) return fallback;
  return formatWalletUsdCents(BigInt(settled) + BigInt(ecosystem));
}

export function walletSummaryRequiresCompleteGlyphProjection(
  summary: WalletGlyphProjection | null | undefined,
): boolean {
  const settledBalanceUsd = String(summary?.valueStates?.settledBalanceUsd ?? "").trim();
  const ecosystemBalanceUsd = String(summary?.valueStates?.ecosystemBalanceUsd ?? "").trim();
  return summary?.sync?.lawfulActionProjectionAvailable === false || (
    summary?.creationSigilBenefitsEnabled === true &&
    (
      summary.sync?.source === "account_only" ||
      summary.sync?.projectionComplete === false ||
      !settledBalanceUsd ||
      !ecosystemBalanceUsd
    )
  );
}

export function preserveCompleteGlyphSettlementProjection<T extends WalletGlyphProjection>(
  current: T | null | undefined,
  incoming: T | null | undefined,
): T | null {
  if (current && walletSummaryRequiresCompleteGlyphProjection(current)) current = null;
  if (incoming === undefined) return current ?? null;
  if (incoming === null) return null;
  if (walletSummaryRequiresCompleteGlyphProjection(incoming)) {
    return current && current.userId?.trim() === incoming.userId?.trim() ? current : null;
  }
  if (!current) return incoming;
  const currentUserId = current.userId?.trim() ?? "";
  const incomingUserId = incoming.userId?.trim() ?? "";
  if (!currentUserId || currentUserId !== incomingUserId) return incoming;
  const currentIsCompleteGlyphProjection =
    current.creationSigilBenefitsEnabled === true &&
    current.sync?.source === "profile_plus_ledger_v1";
  const incomingIsAccountOnlyFallback = walletSummaryRequiresCompleteGlyphProjection(incoming);
  return currentIsCompleteGlyphProjection && incomingIsAccountOnlyFallback
    ? current
    : incoming;
}

export function selectWalletRouteHydrationProjection<T extends WalletGlyphProjection>(args: {
  session: T | null | undefined;
  durable: T | null | undefined;
  incoming: T | null | undefined;
}): T | null {
  const held = admitWalletSettlementProjection(args.session, args.durable);
  return admitWalletSettlementProjection(held, args.incoming);
}

function hasSessionStorage(): boolean {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
}

function walletRouteFirstPaintCookieSecureSuffix(): string {
  return typeof window !== "undefined" && window.location.protocol === "https:" ? "; Secure" : "";
}

function walletMatchesCurrentSession(wallet: WalletRouteHydrationSummary): boolean {
  const session = peekSessionBootstrapSnapshot(true);
  if (session?.uid) return wallet.userId === session.uid;
  return !activeReceizAccountBindingOutranksUserId(wallet.userId);
}

function walletHasConfirmedCurrentSessionMismatch(wallet: WalletRouteHydrationSummary): boolean {
  const session = peekSessionBootstrapSnapshot(true);
  if (session?.uid) return wallet.userId !== session.uid;
  return Boolean(activeReceizAccountBindingOutranksUserId(wallet.userId));
}

function walletActivityMatchesCurrentSession(seed: WalletRouteActivityHydrationSeed): boolean {
  const session = peekSessionBootstrapSnapshot(true);
  if (session?.uid) return seed.userId === session.uid;
  return !activeReceizAccountBindingOutranksUserId(seed.userId);
}

function walletActivityHasConfirmedCurrentSessionMismatch(seed: WalletRouteActivityHydrationSeed): boolean {
  const session = peekSessionBootstrapSnapshot(true);
  if (session?.uid) return seed.userId !== session.uid;
  return Boolean(activeReceizAccountBindingOutranksUserId(seed.userId));
}

export function walletRouteTruthRank(wallet: WalletRouteHydrationSummary): number {
  const rollupDepth =
    Number(wallet.rollup.transferCount ?? 0) +
    Number(wallet.rollup.noteMintCount ?? 0) +
    Number(wallet.rollup.noteClaimCount ?? 0);
  const projectionPulse = walletProfileProjectionKaiPulse(wallet);
  if (projectionPulse !== null) {
    const maxPulseRank = BigInt(Number.MAX_SAFE_INTEGER - 1_000);
    return 1_000 + Number(projectionPulse > maxPulseRank ? maxPulseRank : projectionPulse);
  }
  return DURABLE_LOCAL_TRUTH_RANK.authenticatedSnapshot + Math.min(rollupDepth, 200);
}

function walletRouteActivityTruthRank(seed: WalletRouteActivityHydrationSeed): number {
  return DURABLE_LOCAL_TRUTH_RANK.authenticatedSnapshot + Math.min(seed.events.length, 200);
}

function walletRouteActivityRegisterTruthRank(seed: WalletRouteActivityRegister): number {
  return DURABLE_LOCAL_TRUTH_RANK.verifiedRegisterBlock + Math.min(seed.events.length, 200);
}

function walletRouteActivityEventKaiUpulse(event: WalletRouteActivityHydrationEvent): bigint {
  return BigInt(event.proofBundle.proofCapsule.upulse);
}

function compareWalletRouteActivityEvents(
  left: WalletRouteActivityHydrationEvent,
  right: WalletRouteActivityHydrationEvent,
): number {
  const kaiDelta = walletRouteActivityEventKaiUpulse(right) - walletRouteActivityEventKaiUpulse(left);
  if (kaiDelta !== 0n) return kaiDelta > 0n ? 1 : -1;
  if (left.createdAt === right.createdAt) return left.id < right.id ? 1 : -1;
  return Date.parse(right.createdAt) - Date.parse(left.createdAt);
}

function normalizeWalletRouteActivityEvents(
  events: unknown[],
  limit: number | null = WALLET_ROUTE_ACTIVITY_DURABLE_EVENT_LIMIT,
): WalletRouteActivityHydrationEvent[] {
  const byId = new Map<string, WalletRouteActivityHydrationEvent>();
  for (const value of events) {
    if (!isWalletRouteActivityHydrationEvent(value)) continue;
    const existing = byId.get(value.id);
    byId.set(value.id, existing ? { ...existing, ...value } : value);
  }
  const normalized = Array.from(byId.values()).sort(compareWalletRouteActivityEvents);
  return limit === null ? normalized : normalized.slice(0, Math.max(0, Math.trunc(limit)));
}

function newerWalletRouteActivityLastEntryAt(left: string | null, right: string | null): string | null {
  if (!left) return right ?? null;
  if (!right) return left;
  const leftMs = Date.parse(left);
  const rightMs = Date.parse(right);
  if (!Number.isFinite(leftMs)) return right;
  if (!Number.isFinite(rightMs)) return left;
  return rightMs > leftMs ? right : left;
}

function newerWalletRouteActivityKaiUpulse(left: string | null, right: string | null): string | null {
  if (!left) return right ?? null;
  if (!right) return left;
  const leftValue = BigInt(left);
  const rightValue = BigInt(right);
  return rightValue > leftValue ? right : left;
}

function normalizeWalletRouteCursorText(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, 2048) : null;
}

export function mergeWalletRouteActivityHydrationSeed(
  current: WalletRouteActivityHydrationSeed | null | undefined,
  incoming: WalletRouteActivityHydrationSeed,
): WalletRouteActivityHydrationSeed {
  const incomingEvents = normalizeWalletRouteActivityEvents(incoming.events);
  const incomingOlderCursor = normalizeWalletRouteCursorText(incoming.olderCursor);
  const incomingOlderHistoryComplete = incoming.olderHistoryComplete === true ? true : incoming.olderHistoryComplete === false ? false : undefined;
  if (!current || current.userId !== incoming.userId) {
    return {
      userId: incoming.userId,
      lastEntryAt: incoming.lastEntryAt ?? null,
      lastEntryKaiUpulse: incoming.lastEntryKaiUpulse ?? newestWalletRouteActivityEventKaiUpulse(incomingEvents),
      olderCursor: incomingOlderCursor ?? null,
      olderHistoryComplete: incoming.olderHistoryComplete === true,
      events: incomingEvents,
    };
  }
  const currentOlderCursor = normalizeWalletRouteCursorText(current.olderCursor);

  return {
    userId: incoming.userId,
    lastEntryAt: newerWalletRouteActivityLastEntryAt(current.lastEntryAt ?? null, incoming.lastEntryAt ?? null),
    lastEntryKaiUpulse: newerWalletRouteActivityKaiUpulse(
      current.lastEntryKaiUpulse ?? newestWalletRouteActivityEventKaiUpulse(current.events),
      incoming.lastEntryKaiUpulse ?? newestWalletRouteActivityEventKaiUpulse(incomingEvents),
    ),
    olderCursor: incomingOlderCursor !== undefined ? incomingOlderCursor : currentOlderCursor ?? null,
    olderHistoryComplete: incomingOlderHistoryComplete ?? current.olderHistoryComplete === true,
    events: normalizeWalletRouteActivityEvents([...current.events, ...incomingEvents]),
  };
}

export function mergeWalletRouteActivityRegister(
  current: WalletRouteActivityRegister | null | undefined,
  incoming: WalletRouteActivityHydrationSeed,
): WalletRouteActivityRegister {
  const incomingEvents = normalizeWalletRouteActivityEvents(incoming.events, null);
  const incomingOlderCursor = normalizeWalletRouteCursorText(incoming.olderCursor);
  const incomingOlderHistoryComplete = incoming.olderHistoryComplete === true ? true : incoming.olderHistoryComplete === false ? false : undefined;
  if (!current || current.userId !== incoming.userId) {
    return {
      userId: incoming.userId,
      lastEntryAt: incoming.lastEntryAt ?? null,
      lastEntryKaiUpulse: incoming.lastEntryKaiUpulse ?? newestWalletRouteActivityEventKaiUpulse(incomingEvents),
      olderCursor: incomingOlderCursor ?? null,
      olderHistoryComplete: incoming.olderHistoryComplete === true,
      events: incomingEvents,
    };
  }
  const currentOlderCursor = normalizeWalletRouteCursorText(current.olderCursor);

  return {
    userId: incoming.userId,
    lastEntryAt: newerWalletRouteActivityLastEntryAt(current.lastEntryAt ?? null, incoming.lastEntryAt ?? null),
    lastEntryKaiUpulse: newerWalletRouteActivityKaiUpulse(
      current.lastEntryKaiUpulse ?? newestWalletRouteActivityEventKaiUpulse(current.events),
      incoming.lastEntryKaiUpulse ?? newestWalletRouteActivityEventKaiUpulse(incomingEvents),
    ),
    olderCursor: incomingOlderCursor !== undefined ? incomingOlderCursor : currentOlderCursor ?? null,
    olderHistoryComplete: incomingOlderHistoryComplete ?? current.olderHistoryComplete === true,
    events: normalizeWalletRouteActivityEvents([...current.events, ...incomingEvents], null),
  };
}

function newestWalletRouteActivityEventKaiUpulse(events: WalletRouteActivityHydrationEvent[]): string | null {
  const newest = normalizeWalletRouteActivityEvents(events)[0];
  return newest?.proofBundle.proofCapsule.upulse ?? null;
}

function normalizeWalletRouteKaiHeadText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return /^-?\d+$/.test(trimmed) ? trimmed : null;
}

function parseStoredSeed(raw: string): WalletRouteHydrationStored | null {
  try {
    const parsed = JSON.parse(raw) as Partial<WalletRouteHydrationStored>;
    if (!parsed || typeof parsed !== "object") return null;
    if (parsed.version !== 1) return null;
    if (typeof parsed.createdAtMs !== "number" || !Number.isFinite(parsed.createdAtMs)) return null;
    if (!parsed.wallet || typeof parsed.wallet !== "object") return null;
    const wallet = parsed.wallet as Partial<WalletRouteHydrationSummary>;
    if (typeof wallet.userId !== "string" || !wallet.userId.trim()) return null;
    if (typeof wallet.balancePhiMicro !== "string") return null;
    if (typeof wallet.balancePhi !== "string") return null;
    if (typeof wallet.balanceUsd !== "string") return null;
    if (!wallet.quote || typeof wallet.quote !== "object") return null;
    if (!wallet.rollup || typeof wallet.rollup !== "object") return null;
    const normalizedValueStates = normalizeWalletValueStates(wallet.valueStates, wallet.balanceUsd);
    if (
      !normalizedValueStates &&
      (wallet.creationSigilBenefitsEnabled === true || wallet.creationSigilEntitlementEnabled === true)
    ) {
      return null;
    }
    const rollup = wallet.rollup as Partial<WalletRouteHydrationSummary["rollup"]>;
    const normalizedWallet: WalletRouteHydrationSummary = {
      ...(wallet as WalletRouteHydrationSummary),
      rollup: {
        ...(wallet.rollup as WalletRouteHydrationSummary["rollup"]),
        lastEntryKaiUpulse: normalizeWalletRouteKaiHeadText(rollup.lastEntryKaiUpulse),
        lastEntryKaiPulse: normalizeWalletRouteKaiHeadText(rollup.lastEntryKaiPulse),
      },
      valueStates: normalizedValueStates ?? buildWalletValueStatesFromSettledUsdDisplay(wallet.balanceUsd),
    };
    return {
      ...parsed,
      wallet: normalizedWallet,
    } as WalletRouteHydrationStored;
  } catch {
    return null;
  }
}

export function encodeWalletRouteFirstPaintCookieValue(wallet: WalletRouteHydrationSummary): string | null {
  const payload: WalletRouteHydrationStored = {
    version: 1,
    createdAtMs: Date.now(),
    wallet,
  };

  const encoded = encodeURIComponent(JSON.stringify(payload));
  return encoded.length <= WALLET_ROUTE_FIRST_PAINT_COOKIE_MAX_LENGTH ? encoded : null;
}

export function readWalletRouteFirstPaintCookie(
  cookieValueRaw: string | null | undefined,
): WalletRouteHydrationSummary | null {
  if (typeof cookieValueRaw !== "string") return null;
  const raw = cookieValueRaw.trim();
  if (!raw || raw.length > WALLET_ROUTE_FIRST_PAINT_COOKIE_MAX_LENGTH) return null;

  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    decoded = raw;
  }

  const parsed = parseStoredSeed(decoded);
  if (!parsed) return null;
  if (Date.now() - parsed.createdAtMs > WALLET_ROUTE_HYDRATION_MAX_AGE_MS) return null;
  return parsed.wallet;
}

export function encodeWalletRouteActivityFirstPaintCookieValue(
  seed: WalletRouteActivityHydrationSeed,
): string | null {
  const events = seed.events.filter(isWalletRouteActivityHydrationEvent);
  for (const take of [12, 8, 4, 2, 1]) {
    const payload: WalletRouteActivityHydrationStored = {
      version: 1,
      createdAtMs: Date.now(),
        seed: {
          userId: seed.userId,
          lastEntryAt: seed.lastEntryAt ?? null,
          lastEntryKaiUpulse: seed.lastEntryKaiUpulse ?? newestWalletRouteActivityEventKaiUpulse(events),
          olderCursor: normalizeWalletRouteCursorText(seed.olderCursor) ?? null,
          olderHistoryComplete: seed.olderHistoryComplete === true,
          events: events.slice(0, take),
        },
    };
    const encoded = encodeURIComponent(JSON.stringify(payload));
    if (encoded.length <= WALLET_ROUTE_ACTIVITY_FIRST_PAINT_COOKIE_MAX_LENGTH) return encoded;
  }
  return null;
}

export function readWalletRouteActivityFirstPaintCookie(
  cookieValueRaw: string | null | undefined,
): WalletRouteActivityHydrationSeed | null {
  if (typeof cookieValueRaw !== "string") return null;
  const raw = cookieValueRaw.trim();
  if (!raw || raw.length > WALLET_ROUTE_ACTIVITY_FIRST_PAINT_COOKIE_MAX_LENGTH) return null;

  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    decoded = raw;
  }

  const parsed = parseStoredActivitySeed(decoded);
  if (!parsed) return null;
  if (Date.now() - parsed.createdAtMs > WALLET_ROUTE_HYDRATION_MAX_AGE_MS) return null;
  return parsed.seed;
}

function writeWalletRouteFirstPaintCookie(wallet: WalletRouteHydrationSummary): void {
  if (typeof document === "undefined") return;

  const encoded = encodeWalletRouteFirstPaintCookieValue(wallet);
  if (!encoded) {
    clearWalletRouteFirstPaintCookie();
    return;
  }

  document.cookie =
    `${WALLET_ROUTE_FIRST_PAINT_COOKIE}=${encoded}; Path=/wallet; ` +
    `Max-Age=${WALLET_ROUTE_FIRST_PAINT_COOKIE_MAX_AGE_SECONDS}; SameSite=Lax${walletRouteFirstPaintCookieSecureSuffix()}`;
}

function clearWalletRouteFirstPaintCookie(): void {
  if (typeof document === "undefined") return;

  document.cookie = `${WALLET_ROUTE_FIRST_PAINT_COOKIE}=; Path=/wallet; Max-Age=0; SameSite=Lax${walletRouteFirstPaintCookieSecureSuffix()}`;
}

function writeWalletRouteActivityFirstPaintCookie(seed: WalletRouteActivityHydrationSeed): void {
  if (typeof document === "undefined") return;

  const encoded = encodeWalletRouteActivityFirstPaintCookieValue(seed);
  if (!encoded) {
    clearWalletRouteActivityFirstPaintCookie();
    return;
  }

  document.cookie =
    `${WALLET_ROUTE_ACTIVITY_FIRST_PAINT_COOKIE}=${encoded}; Path=/wallet; ` +
    `Max-Age=${WALLET_ROUTE_FIRST_PAINT_COOKIE_MAX_AGE_SECONDS}; SameSite=Lax${walletRouteFirstPaintCookieSecureSuffix()}`;
}

function clearWalletRouteActivityFirstPaintCookie(): void {
  if (typeof document === "undefined") return;

  document.cookie = `${WALLET_ROUTE_ACTIVITY_FIRST_PAINT_COOKIE}=; Path=/wallet; Max-Age=0; SameSite=Lax${walletRouteFirstPaintCookieSecureSuffix()}`;
}

function isWalletRouteActivityHydrationEvent(value: unknown): value is WalletRouteActivityHydrationEvent {
  if (!value || typeof value !== "object") return false;
  const event = value as Partial<WalletRouteActivityHydrationEvent>;
  if (typeof event.id !== "string" || !event.id.trim()) return false;
  if (typeof event.kind !== "string" || !event.kind.trim()) return false;
  if (typeof event.createdAt !== "string" || !event.createdAt.trim()) return false;
  if (!Number.isFinite(Date.parse(event.createdAt))) return false;
  if (!event.proofBundle || typeof event.proofBundle !== "object") return false;
  const proofBundle = event.proofBundle as { proofCapsule?: { pulse?: unknown; kaiKlok?: unknown } };
  const proofCapsule = proofBundle.proofCapsule as { pulse?: unknown; upulse?: unknown; kaiKlok?: unknown } | undefined;
  if (!proofCapsule || typeof proofCapsule !== "object") return false;
  if (typeof event.kaiUpulse !== "string" || !/^-?\d+$/.test(event.kaiUpulse.trim())) return false;
  if (typeof event.pulse !== "number" || !Number.isFinite(event.pulse)) return false;
  if (typeof proofCapsule.upulse !== "string" || !/^-?\d+$/.test(proofCapsule.upulse.trim())) return false;
  if (event.kaiUpulse.trim() !== proofCapsule.upulse.trim()) return false;
  if (typeof proofCapsule.pulse !== "number" || !Number.isFinite(proofCapsule.pulse)) return false;
  if (Math.trunc(event.pulse) !== Math.trunc(proofCapsule.pulse)) return false;
  if (typeof proofCapsule.kaiKlok !== "string" || !proofCapsule.kaiKlok.trim()) return false;
  return true;
}

function parseStoredActivitySeed(
  raw: string,
  eventLimit: number | null = WALLET_ROUTE_ACTIVITY_DURABLE_EVENT_LIMIT,
): WalletRouteActivityHydrationStored | null {
  try {
    const parsed = JSON.parse(raw) as Partial<WalletRouteActivityHydrationStored>;
    if (!parsed || typeof parsed !== "object") return null;
    if (parsed.version !== 1) return null;
    if (typeof parsed.createdAtMs !== "number" || !Number.isFinite(parsed.createdAtMs)) return null;
    const createdAtMs = parsed.createdAtMs;
    if (!parsed.seed || typeof parsed.seed !== "object") return null;
    const seed = parsed.seed as Partial<WalletRouteActivityHydrationSeed>;
    if (typeof seed.userId !== "string" || !seed.userId.trim()) return null;
    if (seed.lastEntryAt !== null && typeof seed.lastEntryAt !== "string") return null;
    if (!Array.isArray(seed.events)) return null;
    const events = normalizeWalletRouteActivityEvents(seed.events, eventLimit);
    return {
      version: 1,
      createdAtMs,
      seed: {
        userId: seed.userId,
        lastEntryAt: seed.lastEntryAt ?? null,
        lastEntryKaiUpulse: typeof seed.lastEntryKaiUpulse === "string" && /^-?\d+$/.test(seed.lastEntryKaiUpulse)
          ? seed.lastEntryKaiUpulse
          : newestWalletRouteActivityEventKaiUpulse(events),
        olderCursor: normalizeWalletRouteCursorText(seed.olderCursor) ?? null,
        olderHistoryComplete: seed.olderHistoryComplete === true,
        events,
      },
    };
  } catch {
    return null;
  }
}

function readWalletRouteActivityRegisterSeed(): WalletRouteActivityRegister | null {
  const owner = activeWalletTruthOwner();
  if (!owner) return null;
  const ownerKey = ownerScopedWalletTruthKey(WALLET_ROUTE_ACTIVITY_REGISTER_KEY, owner);
  const durableRaw = readDurableLocalTruthItem(ownerKey)
    ?? readDurableLocalTruthItem(WALLET_ROUTE_ACTIVITY_REGISTER_KEY)
    ?? "";
  if (!durableRaw) return null;

  const parsed = parseStoredActivitySeed(durableRaw, null);
  if (!parsed) {
    return null;
  }

  if (!walletActivityMatchesCurrentSession(parsed.seed)) {
    return null;
  }

  writeDurableLocalTruthItem(ownerKey, durableRaw, {
    rank: walletRouteActivityRegisterTruthRank(parsed.seed),
    source: "wallet-route-activity-register",
    allowSameRankOverwrite: true,
  });

  return parsed.seed;
}

export function writeWalletRouteActivityRegister(seed: WalletRouteActivityHydrationSeed | null | undefined): WalletRouteActivityRegister | null {
  if (!seed || typeof seed !== "object") return null;
  if (typeof seed.userId !== "string" || !seed.userId.trim()) return null;
  if (!Array.isArray(seed.events)) return null;

  const mergedSeed = mergeWalletRouteActivityRegister(readWalletRouteActivityRegisterSeed(), {
    userId: seed.userId,
    lastEntryAt: seed.lastEntryAt ?? null,
    lastEntryKaiUpulse: seed.lastEntryKaiUpulse ?? null,
    olderCursor: normalizeWalletRouteCursorText(seed.olderCursor) ?? null,
    olderHistoryComplete: seed.olderHistoryComplete === true,
    events: normalizeWalletRouteActivityEvents(seed.events, null),
  });
  const payload: WalletRouteActivityHydrationStored = {
    version: 1,
    createdAtMs: Date.now(),
    seed: mergedSeed,
  };
  const serialized = JSON.stringify(payload);

  writeDurableLocalTruthItem(ownerScopedWalletTruthKey(WALLET_ROUTE_ACTIVITY_REGISTER_KEY, seed.userId), serialized, {
    rank: walletRouteActivityRegisterTruthRank(payload.seed),
    source: "wallet-route-activity-register",
    allowSameRankOverwrite: true,
  });

  return mergedSeed;
}

export function peekWalletRouteActivityRegister(): WalletRouteActivityRegister | null {
  return readWalletRouteActivityRegisterSeed();
}

function persistWalletRouteHydrationSeed(stableWallet: WalletRouteHydrationSummary): void {
  const payload: WalletRouteHydrationStored = {
    version: 1,
    createdAtMs: Date.now(),
    wallet: stableWallet,
  };
  const serialized = JSON.stringify(payload);

  writeDurableLocalTruthItem(ownerScopedWalletTruthKey(WALLET_ROUTE_DURABLE_HYDRATION_KEY, stableWallet.userId), serialized, {
    rank: walletRouteTruthRank(stableWallet),
    source: "wallet-route-hydration",
    allowSameRankOverwrite: true,
  });
  writeWalletRouteFirstPaintCookie(stableWallet);

  if (hasSessionStorage()) {
    try {
      window.sessionStorage.setItem(WALLET_ROUTE_HYDRATION_KEY, serialized);
    } catch {
      // Ignore storage write failures.
    }
  }
}

export function writeWalletRouteHydrationSeed(wallet: WalletRouteHydrationSummary | null | undefined): void {
  if (!wallet || typeof wallet !== "object") return;
  if (typeof wallet.userId !== "string" || !wallet.userId.trim()) return;
  const stableWallet = selectWalletRouteHydrationProjection({
    session: readSessionWalletRouteHydrationSeed(),
    durable: readDurableWalletRouteHydrationSeed(),
    incoming: wallet,
  });
  if (!stableWallet) return;
  persistWalletRouteHydrationSeed(stableWallet);
}

export function writeAuthenticatedWalletRouteHydrationSeed(
  wallet: WalletRouteHydrationSummary | null | undefined,
): WalletRouteHydrationSummary | null {
  if (!wallet?.userId?.trim()) return peekWalletRouteHydrationSeed();
  const carried = selectWalletRouteHydrationProjection({
    session: readSessionWalletRouteHydrationSeed(),
    durable: readDurableWalletRouteHydrationSeed(),
    incoming: undefined,
  }) as WalletRouteHydrationSummary | null;
  const stableWallet = appendAuthenticatedWalletSnapshotAfterIdentityProof(carried, wallet);
  if (!stableWallet) return carried?.userId.trim() === wallet.userId.trim() ? carried : null;
  persistWalletRouteHydrationSeed(stableWallet);
  return stableWallet;
}

export function writeWalletRouteActivityHydrationSeed(seed: WalletRouteActivityHydrationSeed | null | undefined): void {
  if (!seed || typeof seed !== "object") return;
  if (typeof seed.userId !== "string" || !seed.userId.trim()) return;
  if (!Array.isArray(seed.events)) return;

  const register = writeWalletRouteActivityRegister({
    userId: seed.userId,
    lastEntryAt: seed.lastEntryAt ?? null,
    lastEntryKaiUpulse: seed.lastEntryKaiUpulse ?? null,
    olderCursor: normalizeWalletRouteCursorText(seed.olderCursor) ?? undefined,
    olderHistoryComplete: seed.olderHistoryComplete,
    events: normalizeWalletRouteActivityEvents(seed.events, null),
  });
  const mergedSeed = mergeWalletRouteActivityHydrationSeed(readWalletRouteActivityHydrationSeed(), {
    userId: seed.userId,
    lastEntryAt: seed.lastEntryAt ?? null,
    lastEntryKaiUpulse: seed.lastEntryKaiUpulse ?? null,
    olderCursor: normalizeWalletRouteCursorText(seed.olderCursor) ?? undefined,
    olderHistoryComplete: seed.olderHistoryComplete,
    events: normalizeWalletRouteActivityEvents(register?.events ?? seed.events),
  });
  const payload: WalletRouteActivityHydrationStored = {
    version: 1,
    createdAtMs: Date.now(),
    seed: mergedSeed,
  };
  const serialized = JSON.stringify(payload);

  writeDurableLocalTruthItem(ownerScopedWalletTruthKey(WALLET_ROUTE_DURABLE_ACTIVITY_HYDRATION_KEY, payload.seed.userId), serialized, {
    rank: walletRouteActivityTruthRank(payload.seed),
    source: "wallet-route-activity-hydration",
    allowSameRankOverwrite: true,
  });
  writeWalletRouteActivityFirstPaintCookie(payload.seed);

  if (hasSessionStorage()) {
    try {
      window.sessionStorage.setItem(WALLET_ROUTE_ACTIVITY_HYDRATION_KEY, serialized);
    } catch {
      // Ignore storage write failures.
    }
  }
}

export function clearWalletRouteHydrationSeed(): void {
  if (hasSessionStorage()) {
    try {
      window.sessionStorage.removeItem(WALLET_ROUTE_HYDRATION_KEY);
      window.sessionStorage.removeItem(WALLET_ROUTE_ACTIVITY_HYDRATION_KEY);
    } catch {
      // Ignore cleanup failures.
    }
  }

  // Session switching clears only the active projection. Owner-scoped wallet
  // and activity proof registers remain durable until that owner proves back
  // into the account.
  clearWalletRouteFirstPaintCookie();
  clearWalletRouteActivityFirstPaintCookie();
}

function readSessionWalletRouteHydrationSeed(consume = false): WalletRouteHydrationSummary | null {
  let raw = "";
  if (hasSessionStorage()) {
    try {
      raw = window.sessionStorage.getItem(WALLET_ROUTE_HYDRATION_KEY) ?? "";
    } catch {
      raw = "";
    }
  }

  if (raw) {
    const parsed = parseStoredSeed(raw);
    if (consume) {
      try {
        window.sessionStorage.removeItem(WALLET_ROUTE_HYDRATION_KEY);
      } catch {
        // Ignore cleanup failures.
      }
    }
    if (parsed) {
      const isExpired = Date.now() - parsed.createdAtMs > WALLET_ROUTE_HYDRATION_MAX_AGE_MS;
      if (!isExpired && walletMatchesCurrentSession(parsed.wallet)) {
        return parsed.wallet;
      }
      if (isExpired || walletHasConfirmedCurrentSessionMismatch(parsed.wallet)) {
        try {
          window.sessionStorage.removeItem(WALLET_ROUTE_HYDRATION_KEY);
        } catch {
          // Ignore cleanup failures.
        }
      }
    }
  }

  return null;
}

function readDurableWalletRouteHydrationSeed(): WalletRouteHydrationSummary | null {
  const owner = activeWalletTruthOwner();
  if (!owner) return null;
  const ownerKey = ownerScopedWalletTruthKey(WALLET_ROUTE_DURABLE_HYDRATION_KEY, owner);
  const durableRaw = readDurableLocalTruthItem(ownerKey)
    ?? readDurableLocalTruthItem(WALLET_ROUTE_DURABLE_HYDRATION_KEY)
    ?? "";
  if (!durableRaw) return null;

  const parsed = parseStoredSeed(durableRaw);
  if (!parsed) {
    return null;
  }

  if (!walletMatchesCurrentSession(parsed.wallet)) {
    return null;
  }

  writeDurableLocalTruthItem(ownerKey, durableRaw, {
    rank: walletRouteTruthRank(parsed.wallet),
    source: "wallet-route-hydration",
    allowSameRankOverwrite: true,
  });

  return parsed.wallet;
}

function readWalletRouteHydrationSeed(consume: boolean): WalletRouteHydrationSummary | null {
  let sessionWallet = readSessionWalletRouteHydrationSeed(consume);
  const sessionWalletBeforeProjection = sessionWallet;
  let durableWallet = readDurableWalletRouteHydrationSeed();
  // A partial amount is not display authority, but its admitted ledger fields
  // can be composed with the complete profile proof already held on this device.
  // Reuse a complete held total directly; never await discovery to paint it.
  const completeHeld = [sessionWallet, durableWallet].some((wallet) => wallet && !walletSummaryRequiresCompleteGlyphProjection(wallet));
  if (!completeHeld && typeof window !== "undefined") {
    const identity = peekSessionBootstrapSnapshot(true);
    let profile: ReturnType<typeof peekProfileRouteHydrationSeed> = null;
    if (identity?.username) {
      const readHeldProfiles = [
        () => peekProfileRouteSnapshot(identity.username)?.profile,
        () => peekProfileRouteHydrationSeed(identity.username),
        () => peekProfileRouteSnapshotFromWholeMarketPublicProof(identity.username)?.profile,
      ];
      for (const readHeldProfile of readHeldProfiles) {
        const candidate = readHeldProfile();
        if (candidate && !candidate.originalsPage.hasMore && candidate.profile.userId === identity.uid) {
          profile = candidate;
          break;
        }
      }
    }
    if (profile && !profile.originalsPage.hasMore && profile.profile.userId === identity?.uid) {
      if (sessionWallet) sessionWallet = projectWalletRouteSummaryFromCompleteProfile(sessionWallet, profile);
      if (durableWallet) durableWallet = projectWalletRouteSummaryFromCompleteProfile(durableWallet, profile);
    }
  }
  const stableWallet = selectWalletRouteHydrationProjection({
    session: sessionWallet,
    durable: durableWallet,
    incoming: undefined,
  });
  if (!stableWallet) return null;

  if (!consume && hasSessionStorage() && stableWallet !== sessionWalletBeforeProjection) {
    try {
      window.sessionStorage.setItem(WALLET_ROUTE_HYDRATION_KEY, JSON.stringify({
        version: 1,
        createdAtMs: Date.now(),
        wallet: stableWallet,
      } satisfies WalletRouteHydrationStored));
    } catch {
      // Ignore storage write failures.
    }
  }

  return stableWallet;
}

export function peekWalletRouteHydrationSeed(): WalletRouteHydrationSummary | null {
  return readWalletRouteHydrationSeed(false);
}

export function consumeWalletRouteHydrationSeed(): WalletRouteHydrationSummary | null {
  return readWalletRouteHydrationSeed(true);
}

function readWalletRouteActivityHydrationSeed(): WalletRouteActivityHydrationSeed | null {
  let raw = "";
  if (hasSessionStorage()) {
    try {
      raw = window.sessionStorage.getItem(WALLET_ROUTE_ACTIVITY_HYDRATION_KEY) ?? "";
    } catch {
      raw = "";
    }
  }

  if (raw) {
    const parsed = parseStoredActivitySeed(raw);
    if (parsed) {
      const isExpired = Date.now() - parsed.createdAtMs > WALLET_ROUTE_HYDRATION_MAX_AGE_MS;
      if (!isExpired && walletActivityMatchesCurrentSession(parsed.seed)) {
        return parsed.seed;
      }
      if (isExpired || walletActivityHasConfirmedCurrentSessionMismatch(parsed.seed)) {
        try {
          window.sessionStorage.removeItem(WALLET_ROUTE_ACTIVITY_HYDRATION_KEY);
        } catch {
          // Ignore cleanup failures.
        }
      }
    }
  }

  const owner = activeWalletTruthOwner();
  if (!owner) return null;
  const ownerKey = ownerScopedWalletTruthKey(WALLET_ROUTE_DURABLE_ACTIVITY_HYDRATION_KEY, owner);
  const durableRaw = readDurableLocalTruthItem(ownerKey)
    ?? readDurableLocalTruthItem(WALLET_ROUTE_DURABLE_ACTIVITY_HYDRATION_KEY)
    ?? "";
  if (!durableRaw) return null;

  const parsed = parseStoredActivitySeed(durableRaw);
  if (!parsed) {
    return null;
  }

  if (!walletActivityMatchesCurrentSession(parsed.seed)) {
    return null;
  }

  writeDurableLocalTruthItem(ownerKey, durableRaw, {
    rank: walletRouteActivityTruthRank(parsed.seed),
    source: "wallet-route-activity-hydration",
    allowSameRankOverwrite: true,
  });

  if (hasSessionStorage()) {
    try {
      window.sessionStorage.setItem(WALLET_ROUTE_ACTIVITY_HYDRATION_KEY, durableRaw);
    } catch {
      // Ignore storage write failures.
    }
  }

  return parsed.seed;
}

export function peekWalletRouteActivityHydrationSeed(): WalletRouteActivityHydrationSeed | null {
  return readWalletRouteActivityHydrationSeed();
}
