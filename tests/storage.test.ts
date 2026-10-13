import { expect, it } from 'vitest';
import { restoreDemoState } from '../src/core/storage';
import { createDemoState } from '../src/core/demo';
import { applyOperation } from '../src/core/account';
it('recovers a safe demo surface when persisted holdings are malformed', () => { const state = createDemoState(); state.holdings[0].quantityMicro = 'bad'; expect(restoreDemoState(JSON.stringify(state)).holdings[0].quantityMicro).toBe('50000000'); });
it('does not restore serialized data that claims another authority mode', () => { const state = { ...createDemoState(), mode: 'live' }; expect(restoreDemoState(JSON.stringify(state)).mode).toBe('demo'); });
it('retains operation identity across reload so funds cannot be credited twice', () => { const operation = { id: 'fund-reload', kind: 'fund', amountPhiMicro: '100000000' } as const; const saved = applyOperation(createDemoState(), operation); const restored = restoreDemoState(JSON.stringify(saved)); expect(applyOperation(restored, operation).reservePhiMicro).toBe('8300500000'); });
