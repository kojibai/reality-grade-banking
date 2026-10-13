import { exactAmount, SCALE } from '../../core/money';
export interface ExchangeInput { amountPhiMicro: string; pricePhiMicro: string; availableMicro: string; }
export interface ExchangeQuote { quantityMicro: string; costPhiMicro: string; }
export function quoteExchange(input: ExchangeInput): ExchangeQuote {
  const amount = exactAmount(input.amountPhiMicro, true), price = exactAmount(input.pricePhiMicro, true);
  const quantity = amount * SCALE / price;
  if (!quantity || quantity > exactAmount(input.availableMicro)) throw new Error('Not enough available exchange liquidity.');
  return { quantityMicro: quantity.toString(), costPhiMicro: (quantity * price / SCALE).toString() };
}
