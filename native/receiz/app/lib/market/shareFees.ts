import { MARKET_SHARE_SCALE, shareQuantityMicroFromUsdCents, usdCentsFromShareQuantityMicro } from "@/app/lib/market/shareMath";
import { MARKET_SHARE_BASE_SPREAD_BPS } from "@/app/lib/market/shareQuoteModel";

const MARKET_SHARE_BPS_SCALE = 10_000n;

export const MARKET_SHARE_EXECUTION_SPREAD_BPS = MARKET_SHARE_BASE_SPREAD_BPS;
export const MARKET_SHARE_TRADE_FEE_BPS = MARKET_SHARE_EXECUTION_SPREAD_BPS;

type MarketShareExecutionPreview = {
  shareQuantityMicro: bigint;
  referenceNotionalUsdCents: bigint;
  executionNotionalUsdCents: bigint;
  spreadCaptureUsdCents: bigint;
  settlementUsdCents: bigint;
  executionPriceUsdCents: bigint;
};

function clampSpreadBps(value: number): number {
  if (!Number.isFinite(value)) return MARKET_SHARE_EXECUTION_SPREAD_BPS;
  return Math.max(0, Math.min(2_000, Math.trunc(value)));
}

function bigintSpreadBps(value: number): bigint {
  return BigInt(clampSpreadBps(value));
}

export function marketShareExecutionSpreadUsdCents(
  midNotionalUsdCents: bigint,
  spreadBps = MARKET_SHARE_EXECUTION_SPREAD_BPS,
): bigint {
  if (midNotionalUsdCents <= 0n) return 0n;
  const normalizedSpreadBps = bigintSpreadBps(spreadBps);
  if (normalizedSpreadBps <= 0n) return 0n;
  return (midNotionalUsdCents * normalizedSpreadBps + (MARKET_SHARE_BPS_SCALE - 1n)) / MARKET_SHARE_BPS_SCALE;
}

export function marketShareBuySettlementUsdCents(
  midNotionalUsdCents: bigint,
  spreadBps = MARKET_SHARE_EXECUTION_SPREAD_BPS,
): bigint {
  return midNotionalUsdCents + marketShareExecutionSpreadUsdCents(midNotionalUsdCents, spreadBps);
}

export function marketShareSellSettlementUsdCents(
  midNotionalUsdCents: bigint,
  spreadBps = MARKET_SHARE_EXECUTION_SPREAD_BPS,
): bigint {
  if (midNotionalUsdCents <= 0n) return 0n;
  const settlement = midNotionalUsdCents - marketShareExecutionSpreadUsdCents(midNotionalUsdCents, spreadBps);
  return settlement > 0n ? settlement : 0n;
}

export function marketShareExecutionAskUsdCents(
  midPriceUsdCentsPerShare: bigint,
  spreadBps = MARKET_SHARE_EXECUTION_SPREAD_BPS,
): bigint {
  return marketShareBuySettlementUsdCents(midPriceUsdCentsPerShare, spreadBps);
}

export function marketShareExecutionBidUsdCents(
  midPriceUsdCentsPerShare: bigint,
  spreadBps = MARKET_SHARE_EXECUTION_SPREAD_BPS,
): bigint {
  return marketShareSellSettlementUsdCents(midPriceUsdCentsPerShare, spreadBps);
}

export function marketShareBuyShareQuantityMicroFromBudgetUsdCents(
  budgetUsdCents: bigint,
  midPriceUsdCentsPerShare: bigint,
  spreadBps = MARKET_SHARE_EXECUTION_SPREAD_BPS,
): bigint {
  if (budgetUsdCents <= 0n || midPriceUsdCentsPerShare <= 0n) return 0n;
  const executionAskUsdCentsPerShare = marketShareExecutionAskUsdCents(midPriceUsdCentsPerShare, spreadBps);
  if (executionAskUsdCentsPerShare <= 0n) return 0n;
  return (budgetUsdCents * MARKET_SHARE_SCALE) / executionAskUsdCentsPerShare;
}

export function marketShareBuyPreviewFromBudgetUsdCents(
  budgetUsdCents: bigint,
  midPriceUsdCentsPerShare: bigint,
  spreadBps = MARKET_SHARE_EXECUTION_SPREAD_BPS,
): MarketShareExecutionPreview {
  const executionAskUsdCentsPerShare = marketShareExecutionAskUsdCents(
    midPriceUsdCentsPerShare,
    spreadBps,
  );
  return marketShareBuyPreviewFromBudgetUsdCentsAtAsk(
    budgetUsdCents,
    executionAskUsdCentsPerShare,
    midPriceUsdCentsPerShare,
  );
}

export function marketShareSellPreviewFromShareQuantityMicro(
  shareQuantityMicro: bigint,
  midPriceUsdCentsPerShare: bigint,
  spreadBps = MARKET_SHARE_EXECUTION_SPREAD_BPS,
): MarketShareExecutionPreview {
  const referenceNotionalUsdCents = usdCentsFromShareQuantityMicro(shareQuantityMicro, midPriceUsdCentsPerShare);
  const spreadCaptureUsdCents = marketShareExecutionSpreadUsdCents(referenceNotionalUsdCents, spreadBps);
  return {
    shareQuantityMicro,
    referenceNotionalUsdCents,
    executionNotionalUsdCents: marketShareSellSettlementUsdCents(referenceNotionalUsdCents, spreadBps),
    spreadCaptureUsdCents,
    settlementUsdCents: marketShareSellSettlementUsdCents(referenceNotionalUsdCents, spreadBps),
    executionPriceUsdCents: marketShareExecutionBidUsdCents(midPriceUsdCentsPerShare, spreadBps),
  };
}

export function marketShareSellShareQuantityMicroFromBudgetUsdCents(
  budgetUsdCents: bigint,
  bidPriceUsdCentsPerShare: bigint,
): bigint {
  return shareQuantityMicroFromUsdCents(budgetUsdCents, bidPriceUsdCentsPerShare);
}

export function marketShareBuyPreviewFromBudgetUsdCentsAtAsk(
  budgetUsdCents: bigint,
  askPriceUsdCentsPerShare: bigint,
  referenceMidUsdCentsPerShare = askPriceUsdCentsPerShare,
): MarketShareExecutionPreview {
  if (budgetUsdCents <= 0n || askPriceUsdCentsPerShare <= 0n) {
    return {
      shareQuantityMicro: 0n,
      referenceNotionalUsdCents: 0n,
      executionNotionalUsdCents: 0n,
      spreadCaptureUsdCents: 0n,
      settlementUsdCents: 0n,
      executionPriceUsdCents: askPriceUsdCentsPerShare > 0n ? askPriceUsdCentsPerShare : 0n,
    };
  }
  const shareQuantityMicro = (budgetUsdCents * MARKET_SHARE_SCALE) / askPriceUsdCentsPerShare;
  const executionNotionalUsdCents = usdCentsFromShareQuantityMicro(shareQuantityMicro, askPriceUsdCentsPerShare);
  const referenceNotionalUsdCents = usdCentsFromShareQuantityMicro(shareQuantityMicro, referenceMidUsdCentsPerShare);
  const spreadCaptureUsdCents =
    executionNotionalUsdCents > referenceNotionalUsdCents
      ? executionNotionalUsdCents - referenceNotionalUsdCents
      : referenceNotionalUsdCents - executionNotionalUsdCents;
  return {
    shareQuantityMicro,
    referenceNotionalUsdCents,
    executionNotionalUsdCents,
    spreadCaptureUsdCents,
    settlementUsdCents: executionNotionalUsdCents,
    executionPriceUsdCents: askPriceUsdCentsPerShare,
  };
}

export function marketShareSellPreviewFromShareQuantityMicroAtBid(
  shareQuantityMicro: bigint,
  bidPriceUsdCentsPerShare: bigint,
  referenceMidUsdCentsPerShare = bidPriceUsdCentsPerShare,
): MarketShareExecutionPreview {
  const executionNotionalUsdCents = usdCentsFromShareQuantityMicro(shareQuantityMicro, bidPriceUsdCentsPerShare);
  const referenceNotionalUsdCents = usdCentsFromShareQuantityMicro(shareQuantityMicro, referenceMidUsdCentsPerShare);
  const spreadCaptureUsdCents =
    executionNotionalUsdCents > referenceNotionalUsdCents
      ? executionNotionalUsdCents - referenceNotionalUsdCents
      : referenceNotionalUsdCents - executionNotionalUsdCents;
  return {
    shareQuantityMicro,
    referenceNotionalUsdCents,
    executionNotionalUsdCents,
    spreadCaptureUsdCents,
    settlementUsdCents: executionNotionalUsdCents,
    executionPriceUsdCents: bidPriceUsdCentsPerShare,
  };
}

export function marketShareSellPreviewFromBudgetUsdCents(
  budgetUsdCents: bigint,
  midPriceUsdCentsPerShare: bigint,
  spreadBps = MARKET_SHARE_EXECUTION_SPREAD_BPS,
  maxShareQuantityMicro?: bigint | null,
): MarketShareExecutionPreview {
  const executionBidUsdCentsPerShare = marketShareExecutionBidUsdCents(midPriceUsdCentsPerShare, spreadBps);
  return marketShareSellPreviewFromBudgetUsdCentsAtBid(
    budgetUsdCents,
    executionBidUsdCentsPerShare,
    midPriceUsdCentsPerShare,
    maxShareQuantityMicro,
  );
}

export function marketShareSellPreviewFromBudgetUsdCentsAtBid(
  budgetUsdCents: bigint,
  bidPriceUsdCentsPerShare: bigint,
  referenceMidUsdCentsPerShare = bidPriceUsdCentsPerShare,
  maxShareQuantityMicro?: bigint | null,
): MarketShareExecutionPreview {
  if (budgetUsdCents <= 0n || bidPriceUsdCentsPerShare <= 0n) {
    return {
      shareQuantityMicro: 0n,
      referenceNotionalUsdCents: 0n,
      executionNotionalUsdCents: 0n,
      spreadCaptureUsdCents: 0n,
      settlementUsdCents: 0n,
      executionPriceUsdCents: bidPriceUsdCentsPerShare > 0n ? bidPriceUsdCentsPerShare : 0n,
    };
  }

  const desiredShareQuantityMicro = marketShareSellShareQuantityMicroFromBudgetUsdCents(
    budgetUsdCents,
    bidPriceUsdCentsPerShare,
  );
  const shareQuantityMicro =
    typeof maxShareQuantityMicro === "bigint" && maxShareQuantityMicro > 0n && desiredShareQuantityMicro > maxShareQuantityMicro
      ? maxShareQuantityMicro
      : desiredShareQuantityMicro;

  return marketShareSellPreviewFromShareQuantityMicroAtBid(
    shareQuantityMicro,
    bidPriceUsdCentsPerShare,
    referenceMidUsdCentsPerShare,
  );
}

export function formatMarketShareExecutionSpreadRate(spreadBps = MARKET_SHARE_EXECUTION_SPREAD_BPS): string {
  return `${(clampSpreadBps(spreadBps) / 100).toFixed(2)}%`;
}

// Backward-compatible aliases for existing imports that still use fee terminology internally.
export function marketShareTradeFeeUsdCents(
  midNotionalUsdCents: bigint,
  spreadBps = MARKET_SHARE_EXECUTION_SPREAD_BPS,
): bigint {
  return marketShareExecutionSpreadUsdCents(midNotionalUsdCents, spreadBps);
}

export function marketShareTradeGrossDebitUsdCents(
  midNotionalUsdCents: bigint,
  spreadBps = MARKET_SHARE_EXECUTION_SPREAD_BPS,
): bigint {
  return marketShareBuySettlementUsdCents(midNotionalUsdCents, spreadBps);
}

export function marketShareTradeNetProceedsUsdCents(
  midNotionalUsdCents: bigint,
  spreadBps = MARKET_SHARE_EXECUTION_SPREAD_BPS,
): bigint {
  return marketShareSellSettlementUsdCents(midNotionalUsdCents, spreadBps);
}

export function formatMarketShareTradeFeeRate(spreadBps = MARKET_SHARE_EXECUTION_SPREAD_BPS): string {
  return formatMarketShareExecutionSpreadRate(spreadBps);
}
