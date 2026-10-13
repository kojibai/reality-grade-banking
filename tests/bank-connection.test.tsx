// @vitest-environment happy-dom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it } from 'vitest';
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
