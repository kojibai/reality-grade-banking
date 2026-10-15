// @vitest-environment happy-dom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import { BankExecutionRecoveryPanel } from '../src/features/account/BankExecutionRecoveryPanel';
import type { OpenIdentity } from '../src/receiz/native-identity';
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

it('keeps account screens unchanged when no native execution is retained', async () => {
  const host = document.createElement('div'), root = createRoot(host);
  const status = vi.fn(async () => null), resolve = vi.fn();
  try {
    await act(async () => root.render(<BankExecutionRecoveryPanel identity={{ executionRecovery: () => ({ status, resolve }) } as unknown as OpenIdentity} />));
    expect(host.textContent).toBe(''); expect(resolve).not.toHaveBeenCalled();
  } finally { act(() => root.unmount()); }
});
it('resolves a retained attempt only on a user click and distinguishes zero writes from unknown', async () => {
  const host = document.createElement('div'), root = createRoot(host);
  const summary = { operationId: 'fixture-attempt', operationKind: 'fixture-check', planDigest: 'a'.repeat(64), state: 'unknown', hasRecovery: false };
  const resolve = vi.fn(async () => ({ status: 'zero-write', reasonCode: 'STALE_HEAD' }));
  try {
    await act(async () => root.render(<BankExecutionRecoveryPanel identity={{ executionRecovery: () => ({ status: async () => summary, resolve }) } as unknown as OpenIdentity} />));
    expect(host.textContent).toContain('Transaction recovery'); expect(resolve).not.toHaveBeenCalled();
    await act(async () => host.querySelector('button')!.click());
    expect(resolve).toHaveBeenCalledExactlyOnceWith(true); expect(host.textContent).toContain('This attempt made no writes'); expect(host.textContent).not.toContain('Payment sent');
  } finally { act(() => root.unmount()); }
});
it('keeps ambiguous outcomes visible without offering another submission', async () => {
  const host = document.createElement('div'), root = createRoot(host);
  try {
    await act(async () => root.render(<BankExecutionRecoveryPanel identity={{ executionRecovery: () => ({ status: async () => ({ operationId: 'fixture-attempt', operationKind: 'fixture-check', planDigest: 'a'.repeat(64), state: 'unknown', hasRecovery: false }), resolve: async () => ({ status: 'unknown', operationId: 'fixture-attempt' }) }) } as unknown as OpenIdentity} />));
    await act(async () => host.querySelector('button')!.click());
    expect(host.textContent).toContain('still being determined');
    expect([...host.querySelectorAll('button')].map(b => b.textContent)).toEqual(['Check outcome']);
  } finally { act(() => root.unmount()); }
});
