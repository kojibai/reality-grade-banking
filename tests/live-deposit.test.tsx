// @vitest-environment happy-dom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import { LiveDeposit } from '../src/features/deposit/LiveDeposit';
import type { OpenIdentity } from '../src/receiz/native-identity';
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
it('retains the asset, dollars and proof chooser inside the app without a wallet handoff', () => {
  const host = document.createElement('div'), root = createRoot(host);
  try { act(() => root.render(<LiveDeposit identity={{} as OpenIdentity} onClose={vi.fn()} onRefresh={vi.fn()} />));
    expect(host.textContent).toContain('Turn what you own'); expect(host.textContent).toContain('An asset'); expect(host.textContent).toContain('Dollars'); expect(host.textContent).toContain('A proof object');
    expect(host.querySelector('a[href*="receiz.com/wallet"]')).toBeNull(); expect(host.textContent).not.toContain('Demo');
    act(() => [...host.querySelectorAll('button')].find(button => button.textContent?.includes('An asset'))!.click());
    expect(host.textContent).toContain('Keep the asset.'); expect(host.querySelector('input[placeholder="Jordans, a painting, gold…"]')).not.toBeNull();
  } finally { act(() => root.unmount()); }
});
it('dollar deposits show native card and wire methods, never credit money from an amount form', () => {
  const create = vi.fn(), host = document.createElement('div'), root = createRoot(host);
  try { act(() => root.render(<LiveDeposit identity={{ beginCardDeposit: create } as unknown as OpenIdentity} onClose={vi.fn()} onRefresh={vi.fn()} />));
    act(() => [...host.querySelectorAll('button')].find(button => button.textContent?.includes('Dollars'))!.click());
    expect(host.textContent).toContain('Card'); expect(host.textContent).toContain('Wire'); expect(create).not.toHaveBeenCalled(); expect(host.textContent).not.toContain('Added to your balance');
  } finally { act(() => root.unmount()); }
});
