import { bigintLike, formatPhiLabelFromMicro, formatUsdLabelFromCents } from "@/app/lib/market/shareMath";
import type { MarketDeskPredictionContractView } from "@/app/lib/market/types";
import { momentFromUTC, PULSE_MS } from "@/app/utils/kai_pulse";

export const PREDICTION_BPS_SCALE = 10_000n;
const USD_PRICE_MICROS_SCALE = 1_000_000n;
export const MARKET_PREDICTION_BINARY_MODEL_VERSION = "market-prediction-binary-v1";
export const MARKET_PREDICTION_BASE_ENTRY_FEE_BPS = 125;
export const MARKET_PREDICTION_BASE_PAYOUT_FEE_BPS = 85;
export const MARKET_PREDICTION_MAX_ENTRY_FEE_BPS = 320;
export const MARKET_PREDICTION_MAX_PAYOUT_FEE_BPS = 145;

type PredictionSide = "yes" | "no";
type PredictionReferenceSource = MarketDeskPredictionContractView["referenceSource"];

function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
}

function absBigint(value: bigint): bigint {
  return value < 0n ? -value : value;
}

function nullableString(value: unknown, maxLength = 240): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : null;
}

function numberOrNull(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return value;
}

function formatUsdLabelFromNumber(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function positiveBigintString(value: bigint | null): string | null {
  if (value == null || value <= 0n) return null;
  return value.toString();
}

function isoPulse(value: string | null | undefined): number | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.max(0, Math.trunc(momentFromUTC(new Date(parsed)).pulse));
}

function finitePulse(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : null;
}

export function usdPriceMicrosFromNumber(value: number | null | undefined): bigint | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return null;
  return BigInt(Math.round(value * Number(USD_PRICE_MICROS_SCALE)));
}

function usdPriceMicrosToNumber(value: unknown): number {
  return Number(bigintLike(value)) / Number(USD_PRICE_MICROS_SCALE);
}

function formatUsdLabelFromMicros(value: bigint): string {
  return formatUsdLabelFromNumber(usdPriceMicrosToNumber(value));
}

export function predictionReferencePriceUsdMicros(
  contract: Pick<MarketDeskPredictionContractView, "referencePriceUsdMicros" | "referencePriceUsdCents" | "referencePriceUsd"> | null | undefined,
): bigint | null {
  if (!contract) return null;
  const micros = bigintLike(contract.referencePriceUsdMicros, 0n);
  if (micros > 0n) return micros;
  if (typeof contract.referencePriceUsd === "number" && Number.isFinite(contract.referencePriceUsd) && contract.referencePriceUsd > 0) {
    return usdPriceMicrosFromNumber(contract.referencePriceUsd);
  }
  const cents = bigintLike(contract.referencePriceUsdCents, 0n);
  return cents > 0n ? cents * 10_000n : null;
}

export function predictionBinaryFeeSchedule(args: {
  yesPoolUsdCents: bigint;
  noPoolUsdCents: bigint;
  side: PredictionSide;
  grossWagerUsdCents?: bigint;
  closeAt?: string | null;
  now?: Date;
}): {
  modelVersion: string;
  entryFeeBps: number;
  payoutFeeBps: number;
  feePressureBps: number;
  imbalancePressureBps: number;
  timePressureBps: number;
} {
  const grossWagerUsdCents = args.grossWagerUsdCents ?? 0n;
  const yesPoolUsdCents = args.yesPoolUsdCents > 0n ? args.yesPoolUsdCents : 0n;
  const noPoolUsdCents = args.noPoolUsdCents > 0n ? args.noPoolUsdCents : 0n;
  const chosenPoolUsdCents = args.side === "yes" ? yesPoolUsdCents : noPoolUsdCents;
  const opposingPoolUsdCents = args.side === "yes" ? noPoolUsdCents : yesPoolUsdCents;
  const totalPoolUsdCents = yesPoolUsdCents + noPoolUsdCents + grossWagerUsdCents;
  const safeTotalPoolUsdCents = totalPoolUsdCents > 0n ? totalPoolUsdCents : 1n;
  const imbalancePressureBps = clampInt(
    Number(((absBigint(chosenPoolUsdCents - opposingPoolUsdCents) * PREDICTION_BPS_SCALE) + safeTotalPoolUsdCents / 2n) / safeTotalPoolUsdCents),
    0,
    10_000,
  );

  let timePressureBps = 0;
  if (args.closeAt) {
    const closeAtMs = Date.parse(args.closeAt);
    const nowMs = (args.now ?? new Date()).getTime();
    if (Number.isFinite(closeAtMs) && Number.isFinite(nowMs)) {
      const remainingMs = Math.max(0, closeAtMs - nowMs);
      const horizonMs = 72 * 60 * 60 * 1000;
      timePressureBps = clampInt(((horizonMs - Math.min(remainingMs, horizonMs)) * 2_200) / horizonMs, 0, 2_200);
    }
  }

  const feePressureBps = clampInt(Math.round(imbalancePressureBps * 0.58 + timePressureBps * 0.42), 0, 2_600);
  return {
    modelVersion: MARKET_PREDICTION_BINARY_MODEL_VERSION,
    entryFeeBps: clampInt(
      MARKET_PREDICTION_BASE_ENTRY_FEE_BPS + Math.round((feePressureBps * 195) / 2_600),
      MARKET_PREDICTION_BASE_ENTRY_FEE_BPS,
      MARKET_PREDICTION_MAX_ENTRY_FEE_BPS,
    ),
    payoutFeeBps: clampInt(
      MARKET_PREDICTION_BASE_PAYOUT_FEE_BPS + Math.round((feePressureBps * 60) / 2_600),
      MARKET_PREDICTION_BASE_PAYOUT_FEE_BPS,
      MARKET_PREDICTION_MAX_PAYOUT_FEE_BPS,
    ),
    feePressureBps,
    imbalancePressureBps,
    timePressureBps,
  };
}

export function buildPredictionBinaryContractView(args: {
  underlyingAssetId: string | null;
  underlyingAssetTitle: string | null;
  expiryAt: string | null;
  redeemableAt: string | null;
  referencePriceUsdMicros: bigint | null;
  referenceSource: PredictionReferenceSource;
  feePressureBps?: number;
  imbalancePressureBps?: number;
  timePressureBps?: number;
  referencePulse?: number | null;
}): MarketDeskPredictionContractView | null {
  if (!args.underlyingAssetId && !args.underlyingAssetTitle && !args.expiryAt && !args.redeemableAt) return null;
  return {
    modelVersion: MARKET_PREDICTION_BINARY_MODEL_VERSION,
    contractType: "binary_asset",
    underlyingAssetId: args.underlyingAssetId,
    underlyingAssetTitle: args.underlyingAssetTitle,
    expiryAt: args.expiryAt,
    redeemableAt: args.redeemableAt,
    referencePriceUsd: args.referencePriceUsdMicros == null ? null : usdPriceMicrosToNumber(args.referencePriceUsdMicros),
    referencePriceUsdLabel: args.referencePriceUsdMicros == null ? null : formatUsdLabelFromMicros(args.referencePriceUsdMicros),
    referencePriceUsdMicros: positiveBigintString(args.referencePriceUsdMicros),
    referencePriceUsdCents: null,
    referencePulse: args.referencePulse ?? null,
    expiryPulse: isoPulse(args.expiryAt),
    redeemablePulse: isoPulse(args.redeemableAt),
    referenceSource: args.referenceSource,
    feePressureBps: clampInt(args.feePressureBps ?? 0, 0, 10_000),
    imbalancePressureBps: clampInt(args.imbalancePressureBps ?? 0, 0, 10_000),
    timePressureBps: clampInt(args.timePressureBps ?? 0, 0, 10_000),
  };
}

export function predictionBinaryContractFromMetadata(value: unknown): MarketDeskPredictionContractView | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const modelVersion = nullableString(raw.modelVersion, 120);
  const contractType = raw.contractType === "binary_asset" ? "binary_asset" : null;
  if (!modelVersion || !contractType) return null;
  const referenceSource: PredictionReferenceSource =
    raw.referenceSource === "quote_mid" || raw.referenceSource === "spot_price" ? raw.referenceSource : "unknown";
  return {
    modelVersion,
    contractType,
    underlyingAssetId: nullableString(raw.underlyingAssetId, 240),
    underlyingAssetTitle: nullableString(raw.underlyingAssetTitle, 240),
    expiryAt: nullableString(raw.expiryAt, 64),
    redeemableAt: nullableString(raw.redeemableAt, 64),
    referencePriceUsd: numberOrNull(raw.referencePriceUsd),
    referencePriceUsdLabel: nullableString(raw.referencePriceUsdLabel, 64),
    referencePriceUsdMicros: nullableString(raw.referencePriceUsdMicros, 32),
    referencePriceUsdCents: nullableString(raw.referencePriceUsdCents, 32),
    referencePulse: typeof raw.referencePulse === "number" && Number.isFinite(raw.referencePulse) ? Math.trunc(raw.referencePulse) : null,
    expiryPulse: typeof raw.expiryPulse === "number" && Number.isFinite(raw.expiryPulse) ? Math.trunc(raw.expiryPulse) : null,
    redeemablePulse: typeof raw.redeemablePulse === "number" && Number.isFinite(raw.redeemablePulse) ? Math.trunc(raw.redeemablePulse) : null,
    referenceSource,
    feePressureBps: clampInt(numberOrNull(raw.feePressureBps) ?? 0, 0, 10_000),
    imbalancePressureBps: clampInt(numberOrNull(raw.imbalancePressureBps) ?? 0, 0, 10_000),
    timePressureBps: clampInt(numberOrNull(raw.timePressureBps) ?? 0, 0, 10_000),
  };
}

export function predictionContractExpired(args: {
  expiryPulse?: number | null;
  expiryAt?: string | null;
  pulse?: number | null;
  now?: Date;
}): boolean {
  const expiryPulse = finitePulse(args.expiryPulse);
  const currentPulse = finitePulse(args.pulse);
  if (expiryPulse != null && currentPulse != null) {
    return currentPulse >= expiryPulse;
  }

  const closeAtMs = args.expiryAt ? Date.parse(args.expiryAt) : Number.NaN;
  const nowMs = (args.now ?? new Date()).getTime();
  return Number.isFinite(closeAtMs) && Number.isFinite(nowMs) && nowMs >= closeAtMs;
}

export function predictionContractRemainingMs(args: {
  expiryPulse?: number | null;
  expiryAt?: string | null;
  pulse?: number | null;
  msToNextPulse?: number | null;
  now?: Date;
}): number | null {
  const expiryPulse = finitePulse(args.expiryPulse);
  const currentPulse = finitePulse(args.pulse);
  if (expiryPulse != null && currentPulse != null) {
    if (currentPulse >= expiryPulse) return 0;
    const msToNextPulse =
      typeof args.msToNextPulse === "number" && Number.isFinite(args.msToNextPulse)
        ? Math.max(0, Math.min(PULSE_MS, Math.trunc(args.msToNextPulse)))
        : PULSE_MS;
    return (expiryPulse - currentPulse - 1) * PULSE_MS + msToNextPulse;
  }

  const closeAtMs = args.expiryAt ? Date.parse(args.expiryAt) : Number.NaN;
  if (!Number.isFinite(closeAtMs)) return null;
  return Math.max(0, closeAtMs - (args.now ?? new Date()).getTime());
}

export function predictionBinaryResolveOutcome(args: {
  referencePriceUsdMicros?: bigint | null;
  finalPriceUsdMicros?: bigint | null;
  referencePriceUsdCents?: bigint | null;
  finalPriceUsdCents?: bigint | null;
}): Exclude<PredictionSide, never> | "cancel" {
  const referencePriceUsdMicros =
    args.referencePriceUsdMicros ?? (args.referencePriceUsdCents == null ? null : args.referencePriceUsdCents * 10_000n);
  const finalPriceUsdMicros =
    args.finalPriceUsdMicros ?? (args.finalPriceUsdCents == null ? null : args.finalPriceUsdCents * 10_000n);
  if (referencePriceUsdMicros == null || finalPriceUsdMicros == null) return "cancel";
  if (finalPriceUsdMicros > referencePriceUsdMicros) return "yes";
  if (finalPriceUsdMicros < referencePriceUsdMicros) return "no";
  return "cancel";
}

export function predictionEntryFeeUsdCents(grossWagerUsdCents: bigint, entryFeeBps: number): bigint {
  if (grossWagerUsdCents <= 0n || entryFeeBps <= 0) return 0n;
  return (grossWagerUsdCents * BigInt(entryFeeBps) + (PREDICTION_BPS_SCALE - 1n)) / PREDICTION_BPS_SCALE;
}

export function predictionNetStakeUsdCents(grossWagerUsdCents: bigint, entryFeeBps: number): bigint {
  return grossWagerUsdCents - predictionEntryFeeUsdCents(grossWagerUsdCents, entryFeeBps);
}

export function predictionSettlementFeeUsdCents(totalPoolUsdCents: bigint, payoutFeeBps: number): bigint {
  if (totalPoolUsdCents <= 0n || payoutFeeBps <= 0) return 0n;
  return (totalPoolUsdCents * BigInt(payoutFeeBps) + (PREDICTION_BPS_SCALE - 1n)) / PREDICTION_BPS_SCALE;
}

export function predictionImpliedProbabilities(args: {
  yesPoolUsdCents: bigint;
  noPoolUsdCents: bigint;
  smoothingUsdCents: bigint;
}): { yesProbability: number; noProbability: number } {
  const yes = Number(args.yesPoolUsdCents + args.smoothingUsdCents);
  const no = Number(args.noPoolUsdCents + args.smoothingUsdCents);
  const total = yes + no;
  if (!Number.isFinite(total) || total <= 0) {
    return { yesProbability: 0.5, noProbability: 0.5 };
  }
  const yesProbability = yes / total;
  return {
    yesProbability,
    noProbability: 1 - yesProbability,
  };
}

export function predictionReturnMultiple(args: {
  sidePoolUsdCents: bigint;
  totalPoolUsdCents: bigint;
  payoutFeeBps: number;
}): number {
  if (args.sidePoolUsdCents <= 0n || args.totalPoolUsdCents <= 0n) return 0;
  const payoutPool = args.totalPoolUsdCents - predictionSettlementFeeUsdCents(args.totalPoolUsdCents, args.payoutFeeBps);
  if (payoutPool <= 0n) return 0;
  return Number(payoutPool) / Number(args.sidePoolUsdCents);
}

export function predictionEstimatedPayoutUsdCents(args: {
  sidePoolUsdCentsAfterWager: bigint;
  totalPoolUsdCentsAfterWager: bigint;
  payoutFeeBps: number;
  netStakeUsdCents: bigint;
}): bigint {
  if (
    args.sidePoolUsdCentsAfterWager <= 0n ||
    args.totalPoolUsdCentsAfterWager <= 0n ||
    args.netStakeUsdCents <= 0n
  ) {
    return 0n;
  }
  const payoutPool = args.totalPoolUsdCentsAfterWager - predictionSettlementFeeUsdCents(args.totalPoolUsdCentsAfterWager, args.payoutFeeBps);
  if (payoutPool <= 0n) return 0n;
  return (args.netStakeUsdCents * payoutPool) / args.sidePoolUsdCentsAfterWager;
}

export function predictionClaimPayoutUsdCents(args: {
  sidePoolUsdCents: bigint;
  totalPoolUsdCents: bigint;
  payoutFeeBps: number;
  netStakeUsdCents: bigint;
}): bigint {
  if (args.sidePoolUsdCents <= 0n || args.totalPoolUsdCents <= 0n || args.netStakeUsdCents <= 0n) return 0n;
  const payoutPool = args.totalPoolUsdCents - predictionSettlementFeeUsdCents(args.totalPoolUsdCents, args.payoutFeeBps);
  if (payoutPool <= 0n) return 0n;
  return (args.netStakeUsdCents * payoutPool) / args.sidePoolUsdCents;
}

export function centsToNumber(value: unknown): number {
  return Number(bigintLike(value)) / 100;
}

export function quoteMicrocentsToNumber(value: unknown): number {
  return Number(bigintLike(value)) / 100_000_000;
}

export function phiMicroToNumber(value: unknown): number {
  return Number(bigintLike(value)) / 1_000_000;
}

export function formatPredictionUsdLabel(value: unknown): string {
  return formatUsdLabelFromCents(bigintLike(value));
}

export function formatPredictionPhiLabel(value: unknown): string {
  return formatPhiLabelFromMicro(bigintLike(value));
}
