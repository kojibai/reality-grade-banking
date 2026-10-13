// @vitest-environment happy-dom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import App from '../src/App';
const fixture = vi.hoisted(() => ({ identity: { binding: { identityOwnerReceizId: 'receiz_device_fixture', artifactOwnerReceizId: 'fixture.receiz.id' }, localHistory: {}, listDeposits: async () => [], pendingCardDeposit: async () => null } }));
vi.mock('../src/receiz/useNativeAccount', () => ({ useNativeAccount: () => ({ identity: fixture.identity, wallet: null, opening: false, busy: false, error: null, observedAt: null, refresh: async () => {}, forget: async () => {} }) }));
vi.mock('../src/features/market/Market', () => ({ Market: () => null }));
vi.mock('../src/features/ledger/Ledger', () => ({ Ledger: () => null }));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
it('reopens Deposit after admission when returning from card checkout', async () => {
  history.replaceState(null, '', '/#account/deposit');
  const host = document.createElement('div'), root = createRoot(host);
  try {
    await act(async () => root.render(<App />));
    expect(location.hash).toBe('#account/deposit');
    expect(host.querySelector('dialog')?.textContent).toContain('Turn what you own');
  } finally { act(() => root.unmount()); history.replaceState(null, '', '/'); }
});
