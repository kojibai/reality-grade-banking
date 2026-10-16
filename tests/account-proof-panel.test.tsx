// @vitest-environment happy-dom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import { ProofPortabilityPanel } from '../src/features/account/ProofPortabilityPanel';
import type { OpenIdentity } from '../src/receiz/native-identity';
import type { VerifiedAccountProof } from '../src/receiz/account-proof';
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
it('offers a separate share review without reading private backups or signing in a recipient', async () => {
  const privateBackup = vi.fn(), identity = { proofLibrary: privateBackup } as unknown as OpenIdentity;
  const host = document.createElement('div'), root = createRoot(host);
  try {
    await act(async () => root.render(<ProofPortabilityPanel identity={identity} />));
    const button = [...host.querySelectorAll('button')].find(v => v.textContent === 'Review account proof');
    expect(button).toBeDefined();
    expect(privateBackup).not.toHaveBeenCalled();
    await act(async () => button!.click());
    expect(host.textContent).toContain('A verified public account source is not available yet.');
    expect(privateBackup).not.toHaveBeenCalled();
    expect([...host.querySelectorAll('button')].some(v => v.textContent === 'Save shareable proof')).toBe(false);
    expect(host.querySelector('a[href="/verify/"]')?.textContent).toContain('Inspect a shared proof');
  } finally { act(() => root.unmount()); }
});
it('does not display a verified result or offer export for a reconstructed service result', async () => {
  const identity = { proofLibrary: vi.fn(), accountProof: vi.fn(async () => ({ verified: true, statement: { balance: '999999' } }) as unknown as VerifiedAccountProof) } as unknown as OpenIdentity;
  const host = document.createElement('div'), root = createRoot(host);
  try {
    await act(async () => root.render(<ProofPortabilityPanel identity={identity} />));
    await act(async () => [...host.querySelectorAll('button')].find(v => v.textContent === 'Review account proof')!.click());
    expect(host.textContent).not.toContain('Account source verified');
    expect(host.textContent).not.toContain('999999');
    expect(host.textContent).not.toContain('Save shareable proof');
    expect(host.textContent).toContain('could not be verified');
  } finally { act(() => root.unmount()); }
});
it('abandons a pending review when the open identity changes', async () => {
  let complete!: (value: VerifiedAccountProof) => void;
  const accountProof = vi.fn(() => new Promise<VerifiedAccountProof>(resolve => { complete = resolve; }));
  const first = { proofLibrary: vi.fn(), accountProof } as unknown as OpenIdentity, next = { proofLibrary: vi.fn() } as unknown as OpenIdentity;
  const host = document.createElement('div'), root = createRoot(host);
  try {
    await act(async () => root.render(<ProofPortabilityPanel identity={first} />));
    await act(async () => [...host.querySelectorAll('button')].find(v => v.textContent === 'Review account proof')!.click());
    expect(accountProof).toHaveBeenCalledTimes(1);
    await act(async () => root.render(<ProofPortabilityPanel identity={next} />));
    await act(async () => complete({ statement: { account: { receizId: 'wrong.receiz.id' } } } as unknown as VerifiedAccountProof));
    expect(host.textContent).not.toContain('wrong.receiz.id'); expect(host.textContent).not.toContain('could not be verified');
    expect(host.textContent).not.toContain('Save shareable proof');
  } finally { act(() => root.unmount()); }
});
