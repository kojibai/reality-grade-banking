// @vitest-environment happy-dom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import { BankConnection } from '../src/features/account/BankConnection';
import type { OpenIdentity } from '../src/receiz/native-identity';
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
it('refreshes account data immediately when a retained execution resolves to a verified commit', async () => {
  const host = document.createElement('div'), root = createRoot(host), onRefresh = vi.fn();
  const identity = { executionRecovery: () => ({ status: async () => ({ operationId: 'fixture', state: 'unknown' }), resolve: async () => ({ status: 'committed' }) }) } as unknown as OpenIdentity;
  try {
    await act(async () => root.render(<BankConnection identity={identity} onRefresh={onRefresh} />));
    await act(async () => [...host.querySelectorAll('button')].find(button => button.textContent === 'Check outcome')!.click());
    expect(onRefresh).toHaveBeenCalledTimes(1);
  } finally { act(() => root.unmount()); }
});
