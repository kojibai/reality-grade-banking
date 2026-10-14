// @vitest-environment happy-dom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import { BankConnection } from '../src/features/account/BankConnection';
import type { OpenIdentity } from '../src/receiz/native-identity';
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
it('checks native connection on request without reporting the bank’s transactions enabled', async () => {
  const host = document.createElement('div'), root = createRoot(host);
  const identity = { nativeReadiness: async () => ({ status: 'permissions-needed', missingScopes: ['receiz:reserve.write'], unavailableOperations: [], readyToTransact: false }) } as unknown as OpenIdentity;
  try {
    act(() => root.render(<BankConnection identity={identity} />));
    expect(host.textContent).not.toContain('Native permissions needed');
    await act(async () => host.querySelector('button')!.click());
    expect(host.textContent).toContain('Native permissions needed');
    expect(host.textContent).toContain('receiz:reserve.write');
    expect(host.textContent).not.toContain('Ready to transact');
    expect(host.querySelector('a[href*="receiz.com/wallet"]')).toBeNull();
  } finally { act(() => root.unmount()); }
});
it('requests native access only after the person explicitly approves the displayed bank access', async () => {
  const host = document.createElement('div'), root = createRoot(host);
  const check = vi.fn(async (approved?: boolean) => approved ? { status: 'bank-domain-needed', missingScopes: [], unavailableOperations: [], readyToTransact: false } : { status: 'permissions-needed', missingScopes: ['receiz:reserve.write'], unavailableOperations: [], readyToTransact: false });
  const identity = { nativeReadiness: check } as unknown as OpenIdentity;
  try {
    act(() => root.render(<BankConnection identity={identity} />));
    await act(async () => host.querySelector('button')!.click());
    const approve = Array.from(host.querySelectorAll('button')).find(button => button.textContent === 'Approve bank access');
    expect(approve).toBeDefined(); expect(approve!.disabled).toBe(true);
    const consent = host.querySelector<HTMLInputElement>('input[type="checkbox"]')!;
    act(() => consent.click());
    await act(async () => approve!.click());
    expect(check.mock.calls[0]).toEqual([]); expect(check.mock.calls[1]).toEqual([true]);
    expect(host.textContent).toContain('Bank execution sources required');
    expect(host.textContent).not.toContain('Ready to transact');
  } finally { act(() => root.unmount()); }
});
