import {marketNotionalPhiMicroFromUsdCents, usdCentsFromShareQuantityMicro} from "./shareMath";

export type MarketShareAccountingWallet = Readonly<{
 balancePhiMicro: string; availableUsdCents: string; settledUsdCents: string;
}>;
export type MarketShareAccountingPosition = Readonly<{
 shareQuantityMicro: string; costBasisUsdCents: string; costBasisPhiMicro: string;
}>;
export type MarketShareAccountingInput = Readonly<{
 side: "buy" | "sell"; shareQuantityMicro: string; executionPriceUsdCents: string;
 usdPerPhiMicrocents: string; feeBps: number; nativeValueEnabled: boolean;
 wallet: MarketShareAccountingWallet; position: MarketShareAccountingPosition;
 backedSellLiquidityUsdCents: string;
}>;
export type MarketShareAccountingResult = Readonly<{
 notionalUsdCents: string; notionalPhiMicro: string; feeUsdCents: string;
 settlementUsdCents: string; settlementPhiMicro: string; settledUsdCents: string;
 ecosystemUsdCents: string; realizedCostBasisUsdCents: string;
 realizedCostBasisPhiMicro: string; realizedGainUsdCents: string;
 wallet: MarketShareAccountingWallet; position: MarketShareAccountingPosition;
}>;

const MAX = (1n << 63n) - 1n;
function fail(code: string): never {throw new Error(code);}
function integer(value: unknown, positive = false): bigint {
 if (typeof value !== "string" || !/^(0|[1-9][0-9]{0,18})$/u.test(value)) fail("market_invalid_accounting");
 const n = BigInt(value);
 if (n > MAX || n < (positive ? 1n : 0n)) fail("market_invalid_accounting");
 return n;
}
function bounded(value: bigint): string {
 if (value < 0n || value > MAX) fail("market_invalid_accounting");
 return String(value);
}

/** Exact arithmetic of the existing share writer, including its settled-first
 * classification and proportional cost-basis truncation. Inputs must already
 * be derived from admitted sources and executable terms. This function creates
 * no spending authority, exclusive hold, price, receipt or financial commit.
 * The returned dollar balance is the supplied execution denomination less/plus
 * settlement; it is not an independent wallet valuation or account source. */
export function deriveMarketShareAccounting(input: MarketShareAccountingInput): MarketShareAccountingResult {
 if (!input || !["buy", "sell"].includes(input.side) || typeof input.nativeValueEnabled !== "boolean"
  || !Number.isInteger(input.feeBps) || input.feeBps < 0 || input.feeBps > 2000) fail("market_invalid_accounting");
 const q = integer(input.shareQuantityMicro, true), price = integer(input.executionPriceUsdCents, true);
 const rate = integer(input.usdPerPhiMicrocents, true);
 const balance = integer(input.wallet.balancePhiMicro), available = integer(input.wallet.availableUsdCents);
 const settledWallet = integer(input.wallet.settledUsdCents);
 const held = integer(input.position.shareQuantityMicro), costUsd = integer(input.position.costBasisUsdCents);
 const costPhi = integer(input.position.costBasisPhiMicro), backed = integer(input.backedSellLiquidityUsdCents);
 if (settledWallet > available) fail("market_invalid_accounting");
 const notional = usdCentsFromShareQuantityMicro(q, price);
 bounded(notional);
 const notionalPhi = marketNotionalPhiMicroFromUsdCents(notional, rate);
 if (notional <= 0n || notionalPhi <= 0n) fail("market_invalid_notional");
 bounded(notionalPhi);
 const fee = (notional * BigInt(input.feeBps) + 9999n) / 10000n;
 const settlement = input.side === "buy" ? notional + fee : notional > fee ? notional - fee : 0n;
 bounded(settlement);
 const phi = marketNotionalPhiMicroFromUsdCents(settlement, rate);
 bounded(phi);
 if (input.side === "buy" && phi <= 0n) fail("market_invalid_notional");
 let nextBalance: bigint, nextAvailable: bigint, nextHeld: bigint, nextCostUsd: bigint, nextCostPhi: bigint;
 let realizedUsd = 0n, realizedPhi = 0n, settled: bigint;
 if (input.side === "buy") {
  if (settlement > available || input.nativeValueEnabled && phi > balance) fail("wallet_insufficient_balance");
  settled = settlement < settledWallet ? settlement : settledWallet;
  if (!input.nativeValueEnabled && settled < settlement) fail("wallet_insufficient_balance");
  nextAvailable = available - settlement;
  nextBalance = input.nativeValueEnabled ? balance - phi : marketNotionalPhiMicroFromUsdCents(nextAvailable, rate);
  nextHeld = held + q; nextCostUsd = costUsd + settlement; nextCostPhi = costPhi + phi;
 } else {
  if (q > held) fail("market_insufficient_shares");
  // Direct sales do not require cash liquidity: the remainder is ecosystem
  // proceeds under the existing rule, never a new fixed-dollar cash claim.
  settled = settlement < backed ? settlement : backed;
  realizedUsd = q === held ? costUsd : costUsd * q / held;
  realizedPhi = q === held ? costPhi : costPhi * q / held;
  nextAvailable = available + settlement;
  nextBalance = input.nativeValueEnabled ? balance + phi : marketNotionalPhiMicroFromUsdCents(nextAvailable, rate);
  nextHeld = held - q; nextCostUsd = costUsd - realizedUsd; nextCostPhi = costPhi - realizedPhi;
 }
 return Object.freeze({
  notionalUsdCents: bounded(notional), notionalPhiMicro: bounded(notionalPhi), feeUsdCents: bounded(fee),
  settlementUsdCents: bounded(settlement), settlementPhiMicro: bounded(phi), settledUsdCents: bounded(settled),
  ecosystemUsdCents: bounded(settlement - settled), realizedCostBasisUsdCents: bounded(realizedUsd),
  realizedCostBasisPhiMicro: bounded(realizedPhi), realizedGainUsdCents: input.side === "sell" ? String(settlement - realizedUsd) : "0",
  wallet: Object.freeze({balancePhiMicro: bounded(nextBalance), availableUsdCents: bounded(nextAvailable), settledUsdCents: bounded(input.side === "buy" ? settledWallet - settled : settledWallet + settled)}),
  position: Object.freeze({shareQuantityMicro: bounded(nextHeld), costBasisUsdCents: bounded(nextCostUsd), costBasisPhiMicro: bounded(nextCostPhi)}),
 });
}
