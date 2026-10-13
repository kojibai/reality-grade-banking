// @vitest-environment happy-dom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import App from '../src/App';
const account = vi.hoisted(() => ({ state: { identity: null, wallet: null, opening: false, busy: false, error: null, observedAt: null, create: vi.fn(), importId: vi.fn() } }));
vi.mock('../src/receiz/useNativeAccount', () => ({ useNativeAccount: () => account.state }));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
it('opens the actual ID entrance without demo balances, while preserving explicit read consent', () => {
  localStorage.setItem('receiz-bank-demo-v1', '{"balance":99999999}');
  const host = document.createElement('div'), root = createRoot(host);
  try { act(() => root.render(<App />)); expect(host.textContent).toContain('Create my Receiz ID'); expect(host.textContent).toContain('Import my Receiz ID'); expect(host.textContent).not.toContain('Demo'); expect(host.textContent).not.toContain('99999999');
    const create = [...host.querySelectorAll('button')].find(button => button.textContent?.includes('Create my'))!;
    expect(create.disabled).toBe(true); act(() => host.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click()); expect(create.disabled).toBe(false);
  } finally { act(() => root.unmount()); localStorage.clear(); }
});
