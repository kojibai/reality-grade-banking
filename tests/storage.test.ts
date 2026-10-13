import { expect, it } from 'vitest';
import { restoreDemoState } from '../src/core/storage';
import { createDemoState } from '../src/core/demo';
import { applyOperation } from '../src/core/account';
import { MAX_AMOUNT, parseAmount } from '../src/core/money';
import type { BankOperation } from '../src/core/types';
it('recovers a safe demo surface when persisted holdings are malformed', () => { const state = createDemoState(); state.holdings[0].quantityMicro = 'bad'; expect(restoreDemoState(JSON.stringify(state)).holdings[0].quantityMicro).toBe('50000000'); });
it('does not restore serialized data that claims another authority mode', () => { const state = { ...createDemoState(), mode: 'live' }; expect(restoreDemoState(JSON.stringify(state)).mode).toBe('demo'); });
it('retains operation identity across reload so funds cannot be credited twice', () => { const operation = { id: 'fund-reload', kind: 'fund', amountPhiMicro: '100000000' } as const; const saved = applyOperation(createDemoState(), operation); const restored = restoreDemoState(JSON.stringify(saved)); expect(applyOperation(restored, operation).reservePhiMicro).toBe('8300500000'); });
it('rejects a deposit that would overflow the supported stored balance before accepting it', () => { const state = createDemoState(); expect(() => applyOperation(state, { id: 'overflow', kind: 'fund', amountPhiMicro: parseAmount('999999999999999999') })).toThrow(); expect(restoreDemoState(JSON.stringify(state))).toEqual(state); });
it('round-trips an accepted deposit at the exact resulting rail limit', () => { const state = createDemoState(); const next = applyOperation(state, { id: 'limit', kind: 'fund', amountPhiMicro: (MAX_AMOUNT - BigInt(state.reservePhiMicro)).toString() }); expect(restoreDemoState(JSON.stringify(next))).toEqual(next); });
it('rejects custody valuation products beyond the supported stored event limit', () => { const state = applyOperation(createDemoState(), { id: 'huge-intake', kind: 'intake', title: 'Large collection', category: 'physical', quantityMicro: MAX_AMOUNT.toString(), estimatePhiMicro: MAX_AMOUNT.toString() }); expect(() => applyOperation(state, { id: 'huge-custody', kind: 'accept-custody', depositId: 'huge-intake' })).toThrow(); expect(restoreDemoState(JSON.stringify(state))).toEqual(state); });
it('restores every accepted transition in a full custody, trading and currency journey unchanged', () => {
  const operations: BankOperation[] = [
    { id: 'round-intake', kind: 'intake', title: 'Painting', category: 'physical', quantityMicro: '1000000', estimatePhiMicro: '2000000000' },
    { id: 'round-custody', kind: 'accept-custody', depositId: 'round-intake' },
    { id: 'round-sale', kind: 'sell', assetId: 'asset-round-intake', quantityMicro: '500000', rail: 'reserve' },
    { id: 'round-buy', kind: 'buy', assetId: 'asset-round-intake', quantityMicro: '500000', rail: 'reserve' },
    { id: 'round-redeem', kind: 'redeem', assetId: 'asset-round-intake', quantityMicro: '1000000' },
    { id: 'round-send-asset', kind: 'send-asset', assetId: 'gold', quantityMicro: '500000', recipient: 'demo_recipient' },
    { id: 'round-currency', kind: 'create-currency', name: 'Local', symbol: 'LOC', supplyMicro: '600000000000000', backingPhiMicro: '100000000', rail: 'settlement' },
    { id: 'round-currency-sale', kind: 'sell', assetId: 'round-currency', quantityMicro: '600000000000000', rail: 'settlement' },
    { id: 'round-exchange', kind: 'exchange', assetId: 'round-currency', amountPhiMicro: '10000000', rail: 'settlement' },
    { id: 'round-fund', kind: 'fund', amountPhiMicro: '10000000' },
    { id: 'round-send', kind: 'send', amountPhiMicro: '10000000', rail: 'reserve', recipient: 'demo_recipient' },
  ];
  let state = createDemoState(); for (const operation of operations) { state = applyOperation(state, operation); expect(restoreDemoState(JSON.stringify(state))).toEqual(state); }
});
