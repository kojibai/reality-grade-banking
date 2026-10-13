import { exactAmount, SCALE } from './money';
export interface ExchangeInput { amountPhiMicro: string; pricePhiMicro: string; availableMicro: string; backingPhiMicro?: string; supplyMicro?: string; }
export interface ExchangeQuote { quantityMicro: string; costPhiMicro: string; }
export function quoteExchange(input: ExchangeInput): ExchangeQuote {
  const amount = exactAmount(input.amountPhiMicro, true);
  const currency = input.backingPhiMicro !== undefined || input.supplyMicro !== undefined;
  const numerator = exactAmount(currency ? input.backingPhiMicro ?? '' : input.pricePhiMicro, true);
  const denominator = currency ? exactAmount(input.supplyMicro ?? '', true) : SCALE;
  const quantity = amount * denominator / numerator;
  if (!quantity || quantity > exactAmount(input.availableMicro)) throw new Error('Not enough available exchange liquidity.');
  exactAmount(quantity.toString(), true);
  const cost = quantity * numerator / denominator;
  if (cost <= 0n || cost > amount) throw new Error('The exchange quote exceeds the requested amount.');
  return { quantityMicro: quantity.toString(), costPhiMicro: cost.toString() };
}
