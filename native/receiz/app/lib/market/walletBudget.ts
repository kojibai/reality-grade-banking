import {
  formatUsdLabelFromCents,
  normalizeUsdPerPhiMicrocents,
  parseShareQuantityToMicro,
} from "@/app/lib/market/shareMath";

/** Only the operands this arithmetic reads. Both existing Market views and
 * source-derived Wallet summaries can supply them without constructing a full
 * desk view or inventing unrelated position/count metadata. No source authority. */
export type MarketWalletBudgetSource = Readonly<{
  canViewPhi?: boolean;
  balanceUsd?: unknown;
  balanceUsdLabel?: unknown;
  balancePhiLabel?: unknown;
  usdPerPhi?: number;
  valueStates?: Partial<Readonly<Record<"settledBalanceUsd" | "settledBalanceUsdLabel" | "ecosystemBalanceUsd" | "ecosystemBalanceUsdLabel" | "ecosystemBalanceUsdCents", unknown>>>;
}>;

const PHI_RATE_DENOM = 1_000_000_000_000n;

function parseUsdTextToCents(raw: unknown): bigint | null {
  if (typeof raw !== "string" && typeof raw !== "number") return null;
  const text = String(raw).trim().replace(/[$,\s]/g, "");
  if (!text) return null;
  const match = text.match(/^(\d+)(?:\.(\d{0,2}))?$/);
  if (!match) return null;
  const dollars = BigInt(match[1] ?? "0");
  const cents = BigInt((match[2] ?? "").padEnd(2, "0") || "0");
  return dollars * 100n + cents;
}

function parseCentsText(raw: unknown): bigint | null {
  if (typeof raw === "bigint") return raw >= 0n ? raw : 0n;
  if (typeof raw === "number" && Number.isFinite(raw) && Number.isInteger(raw)) {
    return raw > 0 ? BigInt(raw) : 0n;
  }
  if (typeof raw === "string" && /^\d+$/.test(raw.trim())) {
    const cents = BigInt(raw.trim());
    return cents >= 0n ? cents : 0n;
  }
  return null;
}

function walletEcosystemUsdCents(wallet: MarketWalletBudgetSource | null | undefined): bigint {
  if (!wallet?.valueStates) return 0n;
  const explicitCents = parseCentsText((wallet.valueStates as { ecosystemBalanceUsdCents?: unknown }).ecosystemBalanceUsdCents);
  if ((explicitCents ?? 0n) > 0n) return explicitCents!;

  const explicitUsd = parseUsdTextToCents(wallet.valueStates.ecosystemBalanceUsdLabel ?? wallet.valueStates.ecosystemBalanceUsd ?? null);
  if ((explicitUsd ?? 0n) > 0n) return explicitUsd!;

  const totalParsed = parseUsdTextToCents(wallet.balanceUsdLabel ?? wallet.balanceUsd ?? null);
  const settledParsed = parseUsdTextToCents(wallet.valueStates.settledBalanceUsdLabel ?? wallet.valueStates.settledBalanceUsd ?? null);
  if (totalParsed != null && settledParsed != null && totalParsed > settledParsed) {
    return totalParsed - settledParsed;
  }

  return 0n;
}

export function marketWalletHasNativeEcosystemValue(wallet: MarketWalletBudgetSource | null | undefined): boolean {
  return walletEcosystemUsdCents(wallet) > 0n;
}

export function marketSpendableUsdCentsFromPhiMicro(
  phiMicro: bigint,
  usdPerPhiMicrocents: bigint,
): bigint {
  if (phiMicro <= 0n || usdPerPhiMicrocents <= 0n) return 0n;
  return (phiMicro * usdPerPhiMicrocents) / PHI_RATE_DENOM;
}

export function marketWalletUsdPerPhiMicrocents(
  wallet: MarketWalletBudgetSource | null | undefined,
  options?: { usdPerPhi?: number | null; usdPerPhiMicrocents?: bigint | null },
): bigint {
  if (options?.usdPerPhiMicrocents && options.usdPerPhiMicrocents > 0n) {
    return options.usdPerPhiMicrocents;
  }
  const quoteUsdPerPhi = options?.usdPerPhi ?? wallet?.usdPerPhi ?? 0;
  return normalizeUsdPerPhiMicrocents(quoteUsdPerPhi);
}

export function marketWalletExecutionUsdPerPhiMicrocents(
  wallet: MarketWalletBudgetSource | null | undefined,
  options?: { usdPerPhi?: number | null; usdPerPhiMicrocents?: bigint | null },
): bigint {
  const fallback = marketWalletUsdPerPhiMicrocents(wallet, options);
  if (!wallet) return fallback;

  const totalParsed = parseUsdTextToCents(wallet.balanceUsdLabel ?? wallet.balanceUsd ?? null);
  const phiMicro = parseShareQuantityToMicro(wallet.balancePhiLabel ?? "");
  if (totalParsed == null || totalParsed <= 0n || !phiMicro || phiMicro <= 0n) {
    return fallback;
  }

  const derived = (totalParsed * PHI_RATE_DENOM + phiMicro / 2n) / phiMicro;
  return derived > 0n ? derived : fallback;
}

export function marketSpendableWalletUsdCents(
  wallet: MarketWalletBudgetSource | null | undefined,
  options?: { usdPerPhi?: number | null; usdPerPhiMicrocents?: bigint | null },
): bigint {
  if (!wallet) return 0n;

  const totalParsed = parseUsdTextToCents(wallet.balanceUsdLabel ?? wallet.balanceUsd ?? null);
  if (walletEcosystemUsdCents(wallet) > 0n && totalParsed != null) {
    return totalParsed > 0n ? totalParsed : 0n;
  }

  if (wallet.canViewPhi) {
    const phiMicro = parseShareQuantityToMicro(wallet.balancePhiLabel ?? "");
    const usdPerPhiMicrocents = marketWalletUsdPerPhiMicrocents(wallet, options);
    const entitlementValueUsdCents = marketSpendableUsdCentsFromPhiMicro(phiMicro ?? 0n, usdPerPhiMicrocents);
    if (entitlementValueUsdCents > 0n) return entitlementValueUsdCents;
  }

  const settledParsed = parseUsdTextToCents(
    wallet.valueStates?.settledBalanceUsdLabel ?? wallet.valueStates?.settledBalanceUsd ?? null,
  );
  if (settledParsed != null) return settledParsed > 0n ? settledParsed : 0n;

  const parsed = parseUsdTextToCents(wallet.balanceUsdLabel ?? null);
  if (parsed != null) return parsed > 0n ? parsed : 0n;

  return 0n;
}

export function marketSpendableWalletUsdLabel(
  wallet: MarketWalletBudgetSource | null | undefined,
  options?: { usdPerPhi?: number | null; usdPerPhiMicrocents?: bigint | null },
): string | null {
  if (!wallet) return null;
  return formatUsdLabelFromCents(marketSpendableWalletUsdCents(wallet, options));
}
