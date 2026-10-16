// @vitest-environment happy-dom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import { AccountProofInspector } from '../src/conformance/AccountProofInspector';
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
it('refuses an uploaded balance claim locally without account access, storage, or network', async () => {
  const network = vi.spyOn(globalThis, 'fetch').mockRejectedValue(Error('NETWORK_FORBIDDEN'));
  const host = document.createElement('div'), root = createRoot(host);
  try {
    await act(async () => root.render(<AccountProofInspector />));
    expect(host.textContent).toContain('No login is needed');
    const input = host.querySelector('input')!;
    Object.defineProperty(input, 'files', { value: [new File(['{"verified":true,"balance":999999}'], 'claim.json')] });
    await act(async () => input.dispatchEvent(new Event('change', { bubbles: true })));
    expect(host.textContent).toContain('could not be verified');
    expect(host.textContent).not.toContain('Account source verified');
    expect(network).not.toHaveBeenCalled();
  } finally { act(() => root.unmount()); network.mockRestore(); }
});
