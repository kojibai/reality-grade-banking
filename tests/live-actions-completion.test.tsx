// @vitest-environment happy-dom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import { LiveActions } from '../src/features/account/LiveActions';
import { LiveDeposit } from '../src/features/deposit/LiveDeposit';
import { CreateAsset } from '../src/features/assets/CreateAsset';
import { LiveSend } from '../src/features/account/LivePayments';
import type { OpenIdentity } from '../src/receiz/native-identity';
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const identity = { listDeposits: async () => [], pendingCardDeposit: async () => null, binding: { artifactOwnerReceizId: 'test.receiz.id' } } as unknown as OpenIdentity;
it('opens the Exchange form instead of the generic proof-source placeholder', async () => {
  const host = document.createElement('div'), root = createRoot(host);
  try {
    await act(async () => root.render(<LiveActions action={{ kind: 'exchange' }} identity={identity} wallet={null} onClose={vi.fn()} onForget={async () => {}} onRefresh={vi.fn()} />));
    expect(host.textContent).toContain('Exchange amount');
    expect(host.querySelector('select[aria-label="Exchange from"]')).not.toBeNull();
    expect(host.textContent).not.toContain('not connected yet');
  } finally { act(() => root.unmount()); }
});
it('addresses the depositor directly and keeps technical consent inside deposit details', async () => {
  const host = document.createElement('div'), root = createRoot(host);
  try {
    await act(async () => root.render(<LiveDeposit identity={identity} onClose={vi.fn()} onRefresh={vi.fn()} />));
    act(() => [...host.querySelectorAll('button')].find(button => button.textContent?.includes('Add money'))!.click());
    expect(host.textContent).toContain('Continue to add this amount to your account by card.');
    const detail = [...host.querySelectorAll('details')].find(node => node.querySelector('summary')?.textContent === 'Deposit details');
    expect(detail).toBeDefined(); expect(detail!.open).toBe(false);
    expect(detail!.textContent).toContain('This does not authorize');
  } finally { act(() => root.unmount()); }
});
it('offers funded creation through the transaction review instead of only sealing a definition', async () => {
  const host = document.createElement('div'), root = createRoot(host);
  try {
    await act(async () => root.render(<CreateAsset identity={identity} onClose={vi.fn()} onRefresh={vi.fn()} />));
    const choice = [...host.querySelectorAll('button')].find(button => button.getAttribute('aria-label') === 'Add backing');
    expect(choice).toBeDefined(); act(() => choice!.click());
    expect(host.textContent).toContain('Backing amount'); expect(host.textContent).toContain('Review asset creation');
  } finally { act(() => root.unmount()); }
});
it('opens an ownership form from Send without a permanently disabled action', async () => {
  const host = document.createElement('div'), root = createRoot(host);
  try {
    await act(async () => root.render(<LiveSend identity={identity} wallet={null} onClose={vi.fn()} />));
    await act(async () => [...host.querySelectorAll('button')].find(button => button.textContent === 'Send ownership')!.click());
    expect(host.textContent).toContain('Ownership to send'); expect(host.textContent).toContain('Review ownership transfer');
    expect(host.textContent).not.toContain('still being connected');
  } finally { act(() => root.unmount()); }
});
