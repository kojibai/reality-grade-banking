import { expect, it } from 'vitest';
import { applyOperation, projectBalance } from '../src/core/account';
import { createDemoState } from '../src/core/demo';
import { quoteExchange } from '../src/features/market/exchange';

it('quotes exact spendable quantities without spending more than the input', () => expect(quoteExchange({ amountPhiMicro: '100000000', pricePhiMicro: '1020000', availableMicro: '1000000000' })).toEqual({ quantityMicro: '98039215', costPhiMicro: '99999999' }));
it('allows selling half to the platform and buying that ownership back without moving custody', () => { let state = createDemoState(); state = applyOperation(state, { id: 'sell-half', kind: 'sell', assetId: 'gold', quantityMicro: '500000', rail: 'reserve', counterparty: 'bank' }); expect(state.holdings.find(h => h.assetId === 'gold')?.quantityMicro).toBe('500000'); expect(state.reservePhiMicro).toBe('9775500000'); state = applyOperation(state, { id: 'buy-back', kind: 'buy', assetId: 'gold', quantityMicro: '500000', rail: 'reserve' }); expect(state.holdings.find(h => h.assetId === 'gold')?.quantityMicro).toBe('1000000'); expect(state.reservePhiMicro).toBe('8200500000'); expect(projectBalance(state).totalUsdCents).toBe('2468050'); expect(state.assets.find(a => a.id === 'gold')?.custody).toBe('Bank vault'); });
it('does not sell more ownership than held or buy beyond the actual available quantity', () => { const state = createDemoState(); expect(() => applyOperation(state, { id: 'over-sell', kind: 'sell', assetId: 'gold', quantityMicro: '2000000', rail: 'reserve' })).toThrow(); expect(() => applyOperation(state, { id: 'over-buy', kind: 'buy', assetId: 'gold', quantityMicro: '1000000', rail: 'reserve' })).toThrow(); });
it('prevents a fractional owner redeeming the whole physical asset', () => { const start = applyOperation(createDemoState(), { id: 'sold-half', kind: 'sell', assetId: 'gold', quantityMicro: '500000', rail: 'reserve' }); expect(() => applyOperation(start, { id: 'redeem', kind: 'redeem', assetId: 'gold', quantityMicro: '500000' })).toThrow('ownership'); });
it('retains the original quantity when whole ownership is redeemed', () => { const state = applyOperation(createDemoState(), { id: 'redeem-whole', kind: 'redeem', assetId: 'gold', quantityMicro: '1000000' }); expect(state.assets.find(a => a.id === 'gold')?.totalUnitsMicro).toBe('1000000'); expect(state.holdings.find(h => h.assetId === 'gold')?.quantityMicro).toBe('0'); expect(state.reservePhiMicro).toBe('8200500000'); });
it.each(['60000000000000', '600000000000000'])('uses exact backing ratios for large currency supply %s in preview and execution', supplyMicro => {
  let state = applyOperation(createDemoState(), { id: 'large-currency', kind: 'create-currency', name: 'Exact', symbol: 'EXA', supplyMicro, backingPhiMicro: '100000000', rail: 'reserve' });
  state = applyOperation(state, { id: 'sell-large', kind: 'sell', assetId: 'large-currency', quantityMicro: supplyMicro, rail: 'reserve' });
  const before = BigInt(state.reservePhiMicro);
  const asset = state.assets.find(a => a.id === 'large-currency')!;
  const preview = quoteExchange({ amountPhiMicro: '10000000', pricePhiMicro: asset.pricePhiMicro, availableMicro: asset.availableMicro, backingPhiMicro: '100000000', supplyMicro });
  const next = applyOperation(state, { id: 'exchange-large', kind: 'exchange', assetId: 'large-currency', amountPhiMicro: '10000000', rail: 'reserve' });
  expect(before - BigInt(next.reservePhiMicro)).toBe(10000000n);
  expect(next.events[0].amountPhiMicro).toBe(preview.costPhiMicro);
  expect(next.events[0].quantityMicro).toBe(preview.quantityMicro);
  expect(next.events[0].quantityMicro).toBe((BigInt(supplyMicro) / 10n).toString());
});
