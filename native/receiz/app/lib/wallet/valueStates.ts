export type WalletValueStates = {
  settledBalanceUsd: string;
  settledBalanceUsdCents: string;
  ecosystemBalanceUsd: string;
  ecosystemBalanceUsdCents: string;
  livePortfolioValueUsd: string | null;
  livePortfolioValueUsdCents: string | null;
  unrealizedPnlUsd: string | null;
  unrealizedPnlUsdCents: string | null;
  withdrawableNowUsd: string | null;
  withdrawableNowUsdCents: string | null;
};

function normalizeCents(value: unknown): bigint {
  if (typeof value === "bigint") return value >= 0n ? value : 0n;
  if (typeof value === "number" && Number.isFinite(value) && Number.isInteger(value)) {
    const cents = BigInt(value);
    return cents >= 0n ? cents : 0n;
  }
  if (typeof value === "string" && /^\d+$/.test(value.trim())) {
    const cents = BigInt(value.trim());
    return cents >= 0n ? cents : 0n;
  }
  return 0n;
}

function centsFromUsdDisplay(value: unknown): bigint {
  if (typeof value !== "string" && typeof value !== "number") return 0n;
  const text = String(value).trim().replace(/[$,\s]/g, "");
  if (!text) return 0n;
  const match = text.match(/^(\d+)(?:\.(\d{0,2}))?$/);
  if (!match) return 0n;
  const dollars = BigInt(match[1] ?? "0");
  const cents = BigInt((match[2] ?? "").padEnd(2, "0") || "0");
  return dollars * 100n + cents;
}

function formatUsdFromCents(centsRaw: unknown): string {
  const cents = normalizeCents(centsRaw);
  const dollars = cents / 100n;
  const remainder = cents % 100n;
  return `${dollars.toString()}.${remainder.toString().padStart(2, "0")}`;
}

export function buildWalletValueStatesFromSettledUsdCents(settledBalanceUsdCents: unknown): WalletValueStates {
  const settledCents = normalizeCents(settledBalanceUsdCents);
  return buildWalletValueStatesFromBalanceCents(settledCents, settledCents);
}

export function buildWalletValueStatesFromBalanceCents(
  settledBalanceUsdCents: unknown,
  totalBalanceUsdCents: unknown,
): WalletValueStates {
  const settledCents = normalizeCents(settledBalanceUsdCents);
  const totalCents = normalizeCents(totalBalanceUsdCents);
  const ecosystemCents = totalCents > settledCents ? totalCents - settledCents : 0n;
  return {
    settledBalanceUsd: formatUsdFromCents(settledCents),
    settledBalanceUsdCents: settledCents.toString(),
    ecosystemBalanceUsd: formatUsdFromCents(ecosystemCents),
    ecosystemBalanceUsdCents: ecosystemCents.toString(),
    livePortfolioValueUsd: null,
    livePortfolioValueUsdCents: null,
    unrealizedPnlUsd: null,
    unrealizedPnlUsdCents: null,
    withdrawableNowUsd: null,
    withdrawableNowUsdCents: null,
  };
}

export function buildWalletValueStatesFromSettledUsdDisplay(settledBalanceUsd: unknown): WalletValueStates {
  return buildWalletValueStatesFromSettledUsdCents(centsFromUsdDisplay(settledBalanceUsd));
}

export function buildWalletValueStatesFromBalanceDisplay(
  settledBalanceUsd: unknown,
  totalBalanceUsd: unknown,
): WalletValueStates {
  return buildWalletValueStatesFromBalanceCents(centsFromUsdDisplay(settledBalanceUsd), centsFromUsdDisplay(totalBalanceUsd));
}

export function normalizeWalletValueStates(value: unknown, totalBalanceUsd?: unknown): WalletValueStates | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<Record<keyof WalletValueStates, unknown>>;
  if (typeof candidate.settledBalanceUsd !== "string" || typeof candidate.settledBalanceUsdCents !== "string") {
    return null;
  }
  if (
    !(
      (typeof candidate.livePortfolioValueUsd === "string" || candidate.livePortfolioValueUsd === null) &&
      (typeof candidate.livePortfolioValueUsdCents === "string" || candidate.livePortfolioValueUsdCents === null) &&
      (typeof candidate.unrealizedPnlUsd === "string" || candidate.unrealizedPnlUsd === null) &&
      (typeof candidate.unrealizedPnlUsdCents === "string" || candidate.unrealizedPnlUsdCents === null) &&
      (typeof candidate.withdrawableNowUsd === "string" || candidate.withdrawableNowUsd === null) &&
      (typeof candidate.withdrawableNowUsdCents === "string" || candidate.withdrawableNowUsdCents === null)
    )
  ) {
    return null;
  }

  const hasEcosystemBalance =
    typeof candidate.ecosystemBalanceUsd === "string" && typeof candidate.ecosystemBalanceUsdCents === "string";
  const fallback = buildWalletValueStatesFromBalanceDisplay(candidate.settledBalanceUsd, totalBalanceUsd ?? candidate.settledBalanceUsd);

  return {
    settledBalanceUsd: candidate.settledBalanceUsd,
    settledBalanceUsdCents: candidate.settledBalanceUsdCents,
    ecosystemBalanceUsd: hasEcosystemBalance ? (candidate.ecosystemBalanceUsd as string) : fallback.ecosystemBalanceUsd,
    ecosystemBalanceUsdCents: hasEcosystemBalance
      ? (candidate.ecosystemBalanceUsdCents as string)
      : fallback.ecosystemBalanceUsdCents,
    livePortfolioValueUsd: candidate.livePortfolioValueUsd as string | null,
    livePortfolioValueUsdCents: candidate.livePortfolioValueUsdCents as string | null,
    unrealizedPnlUsd: candidate.unrealizedPnlUsd as string | null,
    unrealizedPnlUsdCents: candidate.unrealizedPnlUsdCents as string | null,
    withdrawableNowUsd: candidate.withdrawableNowUsd as string | null,
    withdrawableNowUsdCents: candidate.withdrawableNowUsdCents as string | null,
  };
}

export function isWalletValueStates(value: unknown): value is WalletValueStates {
  return normalizeWalletValueStates(value) !== null;
}
