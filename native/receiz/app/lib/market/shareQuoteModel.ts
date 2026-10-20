import { bigintLike, usdCentsFromShareQuantityMicro } from "@/app/lib/market/shareMath";
import type { MarketShareQuotePressureView, MarketShareQuoteView } from "@/app/lib/market/types";

const BPS_SCALE = 10_000n;

export const MARKET_SHARE_QUOTE_MODEL_VERSION = "market-share-quote-v1";
export const MARKET_SHARE_BASE_SPREAD_BPS = 85;
export const MARKET_SHARE_MAX_SPREAD_BPS = 265;
export const MARKET_SHARE_MAX_SHIFT_BPS = 140;
export const MARKET_SHARE_RECENT_FLOW_WINDOW_HOURS = 18;

export type MarketShareQuotePressureSnapshot = {
  modelVersion: string;
  targetBudgetUsdCents: bigint;
  softCapUsdCents: bigint;
  hardCapUsdCents: bigint;
  livePositionOpenInterestUsdCents: bigint;
  certificateOpenInterestUsdCents: bigint;
  openInterestUsdCents: bigint;
  recentBuyNotionalUsdCents: bigint;
  recentSellNotionalUsdCents: bigint;
  recentGrossNotionalUsdCents: bigint;
  recentNetNotionalUsdCents: bigint;
  inventoryPressureBps: number;
  flowPressureBps: number;
  volatilityPressureBps: number;
  pressureBps: number;
};

export type MarketShareQuoteSnapshot = {
  modelVersion: string;
  referenceMidUsdCents: bigint;
  quoteMidUsdCents: bigint;
  bidPriceUsdCents: bigint;
  askPriceUsdCents: bigint;
  spreadBps: number;
  shiftBps: number;
  allowBuys: boolean;
  pressure: MarketShareQuotePressureSnapshot;
};

export type MarketShareQuoteModelArgs = {
  referenceMidUsdCents: bigint;
  targetBudgetUsdCents: bigint;
  livePositionOpenInterestUsdCents: bigint;
  certificateOpenInterestUsdCents: bigint;
  recentBuyNotionalUsdCents: bigint;
  recentSellNotionalUsdCents: bigint;
  changePctBps?: number;
};

function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.trunc(Math.round(value))));
}

function clampBigint(value: bigint, min: bigint, max: bigint): bigint {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function ceilDiv(numerator: bigint, denominator: bigint): bigint {
  if (denominator <= 0n) return 0n;
  return (numerator + denominator - 1n) / denominator;
}

function applyBpsHalfUp(value: bigint, bps: number): bigint {
  if (value <= 0n) return 0n;
  const scaled = BPS_SCALE + BigInt(bps);
  if (scaled <= 0n) return 1n;
  return (value * scaled + BPS_SCALE / 2n) / BPS_SCALE;
}

function absBigint(value: bigint): bigint {
  return value < 0n ? -value : value;
}

function bigintToViewString(value: bigint): string {
  return value.toString();
}

function desiredExposureUsdCents(targetBudgetUsdCents: bigint): bigint {
  return clampBigint(targetBudgetUsdCents / 2n, 1n, targetBudgetUsdCents);
}

function pressureBpsFromExposure(openInterestUsdCents: bigint, targetBudgetUsdCents: bigint): number {
  const desiredExposure = desiredExposureUsdCents(targetBudgetUsdCents);
  if (desiredExposure <= 0n) return 0;
  const delta = openInterestUsdCents - desiredExposure;
  return clampInt(Number((delta * BPS_SCALE) / desiredExposure), -10_000, 10_000);
}

function flowPressureBpsFromRecentFlow(recentBuyNotionalUsdCents: bigint, recentSellNotionalUsdCents: bigint): number {
  const recentGrossNotionalUsdCents = recentBuyNotionalUsdCents + recentSellNotionalUsdCents;
  if (recentGrossNotionalUsdCents <= 0n) return 0;
  const recentNetNotionalUsdCents = recentBuyNotionalUsdCents - recentSellNotionalUsdCents;
  return clampInt(Number((recentNetNotionalUsdCents * BPS_SCALE) / recentGrossNotionalUsdCents), -10_000, 10_000);
}

function volatilityPressureBps(changePctBps = 0): number {
  return clampInt(Math.abs(changePctBps) / 3.5, 0, 2_500);
}

function spreadBpsForPressure(pressureBps: number, volatilityPressure = 0): number {
  const crowdingBps = Math.round((Math.abs(pressureBps) * 165) / 10_000);
  const volatilityBps = Math.round((volatilityPressure * 30) / 2_500);
  return clampInt(MARKET_SHARE_BASE_SPREAD_BPS + crowdingBps + volatilityBps, MARKET_SHARE_BASE_SPREAD_BPS, MARKET_SHARE_MAX_SPREAD_BPS);
}

function shiftBpsForPressure(pressureBps: number): number {
  return clampInt((pressureBps * MARKET_SHARE_MAX_SHIFT_BPS) / 10_000, -MARKET_SHARE_MAX_SHIFT_BPS, MARKET_SHARE_MAX_SHIFT_BPS);
}

export function marketShareQuoteCaptureUsdCents(args: {
  shareQuantityMicro: bigint;
  executionPriceUsdCents: bigint;
  referenceMidUsdCents: bigint;
}): bigint {
  const executionNotionalUsdCents = usdCentsFromShareQuantityMicro(args.shareQuantityMicro, args.executionPriceUsdCents);
  const referenceNotionalUsdCents = usdCentsFromShareQuantityMicro(args.shareQuantityMicro, args.referenceMidUsdCents);
  return absBigint(executionNotionalUsdCents - referenceNotionalUsdCents);
}

export function buildMarketShareQuoteSnapshot(args: MarketShareQuoteModelArgs): MarketShareQuoteSnapshot {
  const referenceMidUsdCents = clampBigint(args.referenceMidUsdCents, 1n, 10_000_000_000n);
  const targetBudgetUsdCents = clampBigint(args.targetBudgetUsdCents, 1n, 50_000_000_000n);
  const livePositionOpenInterestUsdCents = clampBigint(args.livePositionOpenInterestUsdCents, 0n, 50_000_000_000n);
  const certificateOpenInterestUsdCents = clampBigint(args.certificateOpenInterestUsdCents, 0n, 50_000_000_000n);
  const openInterestUsdCents = livePositionOpenInterestUsdCents + certificateOpenInterestUsdCents;
  const recentBuyNotionalUsdCents = clampBigint(args.recentBuyNotionalUsdCents, 0n, 50_000_000_000n);
  const recentSellNotionalUsdCents = clampBigint(args.recentSellNotionalUsdCents, 0n, 50_000_000_000n);
  const recentGrossNotionalUsdCents = recentBuyNotionalUsdCents + recentSellNotionalUsdCents;
  const recentNetNotionalUsdCents = recentBuyNotionalUsdCents - recentSellNotionalUsdCents;

  const inventoryPressure = pressureBpsFromExposure(openInterestUsdCents, targetBudgetUsdCents);
  const flowPressure = flowPressureBpsFromRecentFlow(recentBuyNotionalUsdCents, recentSellNotionalUsdCents);
  const volatilityPressure = volatilityPressureBps(args.changePctBps ?? 0);
  const combinedPressure = clampInt((inventoryPressure * 65 + flowPressure * 35) / 100, -10_000, 10_000);
  const shiftBps = shiftBpsForPressure(combinedPressure);
  const spreadBps = spreadBpsForPressure(combinedPressure, volatilityPressure);
  const quoteMidUsdCents = clampBigint(applyBpsHalfUp(referenceMidUsdCents, shiftBps), 1n, 10_000_000_000n);
  const halfSpreadUsdCents = clampBigint(ceilDiv(quoteMidUsdCents * BigInt(spreadBps), 2n * BPS_SCALE), 1n, 10_000_000_000n);
  const bidPriceUsdCents = clampBigint(quoteMidUsdCents - halfSpreadUsdCents, 1n, 10_000_000_000n);
  const askPriceUsdCents = clampBigint(quoteMidUsdCents + halfSpreadUsdCents, bidPriceUsdCents + 1n, 10_000_000_000n);
  const softCapUsdCents = clampBigint((targetBudgetUsdCents * 5n) / 4n, targetBudgetUsdCents, 50_000_000_000n);
  const hardCapUsdCents = clampBigint((targetBudgetUsdCents * 3n) / 2n, softCapUsdCents, 50_000_000_000n);

  return {
    modelVersion: MARKET_SHARE_QUOTE_MODEL_VERSION,
    referenceMidUsdCents,
    quoteMidUsdCents,
    bidPriceUsdCents,
    askPriceUsdCents,
    spreadBps,
    shiftBps,
    allowBuys: openInterestUsdCents < hardCapUsdCents,
    pressure: {
      modelVersion: MARKET_SHARE_QUOTE_MODEL_VERSION,
      targetBudgetUsdCents,
      softCapUsdCents,
      hardCapUsdCents,
      livePositionOpenInterestUsdCents,
      certificateOpenInterestUsdCents,
      openInterestUsdCents,
      recentBuyNotionalUsdCents,
      recentSellNotionalUsdCents,
      recentGrossNotionalUsdCents,
      recentNetNotionalUsdCents,
      inventoryPressureBps: inventoryPressure,
      flowPressureBps: flowPressure,
      volatilityPressureBps: volatilityPressure,
      pressureBps: combinedPressure,
    },
  };
}

export function marketShareQuoteAllowsProjectedBuy(args: {
  quote: MarketShareQuoteSnapshot;
  projectedExecutionNotionalUsdCents: bigint;
}): boolean {
  const nextOpenInterestUsdCents = args.quote.pressure.openInterestUsdCents + clampBigint(args.projectedExecutionNotionalUsdCents, 0n, 50_000_000_000n);
  return nextOpenInterestUsdCents <= args.quote.pressure.hardCapUsdCents;
}

export function marketShareBackedSellLiquidityUsdCents(args: {
  totalBuySettlementUsdCents: bigint;
  totalSellSettlementUsdCents: bigint;
}): bigint {
  const remaining = args.totalBuySettlementUsdCents - args.totalSellSettlementUsdCents;
  return remaining > 0n ? remaining : 0n;
}

export function marketShareQuoteAllowsProjectedSell(args: {
  backedSellLiquidityUsdCents: bigint;
  projectedSettlementUsdCents: bigint;
}): boolean {
  return args.projectedSettlementUsdCents > 0n && args.projectedSettlementUsdCents <= args.backedSellLiquidityUsdCents;
}

export function marketShareQuoteFromView(view: MarketShareQuoteView | null | undefined): MarketShareQuoteSnapshot | null {
  if (!view) return null;
  return {
    modelVersion: view.modelVersion,
    referenceMidUsdCents: bigintLike(view.referenceMidUsdCents),
    quoteMidUsdCents: bigintLike(view.quoteMidUsdCents),
    bidPriceUsdCents: bigintLike(view.bidPriceUsdCents),
    askPriceUsdCents: bigintLike(view.askPriceUsdCents),
    spreadBps: view.spreadBps,
    shiftBps: view.shiftBps,
    allowBuys: view.allowBuys,
    pressure: {
      modelVersion: view.pressure.modelVersion,
      targetBudgetUsdCents: bigintLike(view.pressure.targetBudgetUsdCents),
      softCapUsdCents: bigintLike(view.pressure.softCapUsdCents),
      hardCapUsdCents: bigintLike(view.pressure.hardCapUsdCents),
      livePositionOpenInterestUsdCents: bigintLike(view.pressure.livePositionOpenInterestUsdCents),
      certificateOpenInterestUsdCents: bigintLike(view.pressure.certificateOpenInterestUsdCents),
      openInterestUsdCents: bigintLike(view.pressure.openInterestUsdCents),
      recentBuyNotionalUsdCents: bigintLike(view.pressure.recentBuyNotionalUsdCents),
      recentSellNotionalUsdCents: bigintLike(view.pressure.recentSellNotionalUsdCents),
      recentGrossNotionalUsdCents: bigintLike(view.pressure.recentGrossNotionalUsdCents),
      recentNetNotionalUsdCents: bigintLike(view.pressure.recentNetNotionalUsdCents),
      inventoryPressureBps: view.pressure.inventoryPressureBps,
      flowPressureBps: view.pressure.flowPressureBps,
      volatilityPressureBps: view.pressure.volatilityPressureBps,
      pressureBps: view.pressure.pressureBps,
    },
  };
}

export function marketShareQuoteToView(snapshot: MarketShareQuoteSnapshot): MarketShareQuoteView {
  const pressure: MarketShareQuotePressureView = {
    modelVersion: snapshot.pressure.modelVersion,
    targetBudgetUsdCents: bigintToViewString(snapshot.pressure.targetBudgetUsdCents),
    softCapUsdCents: bigintToViewString(snapshot.pressure.softCapUsdCents),
    hardCapUsdCents: bigintToViewString(snapshot.pressure.hardCapUsdCents),
    livePositionOpenInterestUsdCents: bigintToViewString(snapshot.pressure.livePositionOpenInterestUsdCents),
    certificateOpenInterestUsdCents: bigintToViewString(snapshot.pressure.certificateOpenInterestUsdCents),
    openInterestUsdCents: bigintToViewString(snapshot.pressure.openInterestUsdCents),
    recentBuyNotionalUsdCents: bigintToViewString(snapshot.pressure.recentBuyNotionalUsdCents),
    recentSellNotionalUsdCents: bigintToViewString(snapshot.pressure.recentSellNotionalUsdCents),
    recentGrossNotionalUsdCents: bigintToViewString(snapshot.pressure.recentGrossNotionalUsdCents),
    recentNetNotionalUsdCents: bigintToViewString(snapshot.pressure.recentNetNotionalUsdCents),
    inventoryPressureBps: snapshot.pressure.inventoryPressureBps,
    flowPressureBps: snapshot.pressure.flowPressureBps,
    volatilityPressureBps: snapshot.pressure.volatilityPressureBps,
    pressureBps: snapshot.pressure.pressureBps,
  };

  return {
    modelVersion: snapshot.modelVersion,
    referenceMidUsdCents: bigintToViewString(snapshot.referenceMidUsdCents),
    quoteMidUsdCents: bigintToViewString(snapshot.quoteMidUsdCents),
    bidPriceUsdCents: bigintToViewString(snapshot.bidPriceUsdCents),
    askPriceUsdCents: bigintToViewString(snapshot.askPriceUsdCents),
    backedSellLiquidityUsdCents: "0",
    spreadBps: snapshot.spreadBps,
    shiftBps: snapshot.shiftBps,
    allowBuys: snapshot.allowBuys,
    pressure,
  };
}
