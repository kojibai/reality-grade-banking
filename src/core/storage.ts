import { createDemoState } from './demo';
import type { BankState } from './types';
const KEY = 'receiz-bank-demo-v1';
export function loadState(): BankState {
  try { const raw = localStorage.getItem(KEY); if (!raw) return createDemoState(); const state = JSON.parse(raw) as BankState; if (state.schema !== 'receiz.bank.demo.v1' || state.mode !== 'demo' || !Array.isArray(state.holdings) || !Array.isArray(state.assets) || !Array.isArray(state.events) || !state.appliedOperations || !/^(0|[1-9]\d*)$/.test(state.reservePhiMicro) || !/^(0|[1-9]\d*)$/.test(state.settlementPhiMicro)) return createDemoState(); return state; } catch { return createDemoState(); }
}
export function saveState(state: BankState): void { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* A unavailable demo store never changes proof authority. */ } }
