import { createDemoState } from './demo';
import type { BankState } from './types';
import { exactAmount } from './money';
const KEY = 'receiz-bank-demo-v1';
export function restoreDemoState(raw: string): BankState {
  try {
    const state = JSON.parse(raw) as BankState;
    if (state.schema !== 'receiz.bank.demo.v1' || state.mode !== 'demo') throw new Error('Wrong demo schema.');
    for (const amount of [state.reservePhiMicro, state.settlementPhiMicro, state.growthPhiMicro, state.usdPerPhiMicrocents]) exactAmount(amount);
    if (![state.assets, state.holdings, state.deposits, state.events, state.currencies, state.rules].every(Array.isArray)) throw new Error('Incomplete demo state.');
    for (const asset of state.assets) { if (!asset.id || typeof asset.title !== 'string' || !['proof', 'physical', 'currency', 'stock', 'property'].includes(asset.category) || typeof asset.custody !== 'string' || typeof asset.unit !== 'string' || !Array.isArray(asset.history) || !asset.history.length || !asset.history.every(Number.isFinite)) throw new Error('Malformed asset.'); exactAmount(asset.pricePhiMicro); exactAmount(asset.totalUnitsMicro, true); exactAmount(asset.availableMicro); }
    for (const holding of state.holdings) { exactAmount(holding.quantityMicro); if (!state.assets.some(a => a.id === holding.assetId)) throw new Error('Missing asset.'); }
    for (const currency of state.currencies) { exactAmount(currency.supplyMicro, true); exactAmount(currency.backingPhiMicro, true); if (!state.assets.some(a => a.id === currency.id) || !['reserve', 'settlement'].includes(currency.rail)) throw new Error('Malformed currency.'); }
    for (const event of state.events) { exactAmount(event.amountPhiMicro); if (!event.id || typeof event.title !== 'string' || typeof event.kind !== 'string' || event.source !== 'demo') throw new Error('Malformed event.'); }
    if (!state.identity || typeof state.identity.actor !== 'string' || typeof state.identity.username !== 'string' || typeof state.identity.publicName !== 'boolean' || !state.appliedOperations || typeof state.appliedOperations !== 'object' || !Object.values(state.appliedOperations).every(value => typeof value === 'string')) throw new Error('Malformed identity or operation history.');
    return state;
  } catch { return createDemoState(); }
}
export function loadState(): BankState {
  try { const raw = localStorage.getItem(KEY); return raw ? restoreDemoState(raw) : createDemoState(); } catch { return createDemoState(); }
}
export function saveState(state: BankState): void { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* A unavailable demo store never changes proof authority. */ } }
