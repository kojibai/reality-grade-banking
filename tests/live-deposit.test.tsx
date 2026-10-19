// @vitest-environment happy-dom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import { LiveDeposit } from '../src/features/deposit/LiveDeposit';
import { LiveAssetDetail } from '../src/features/assets/LiveAssets';
import type { OpenIdentity } from '../src/receiz/native-identity';
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
it('starts blank after reopening and resumes a retained checkout only when explicitly selected', async () => {
  const checkout = { sessionId: 'cs_fixture123456', clientSecret: 'cs_fixture123456_secret_fixture', amountUsdCents: '25000' };
  const begin = vi.fn(), identity = { pendingCardDeposit: async () => checkout, beginCardDeposit: begin } as unknown as OpenIdentity;
  const host = document.createElement('div'), root = createRoot(host);
  const click = (text: string) => [...host.querySelectorAll('button')].find(button => button.textContent?.includes(text))!.click();
  try {
    await act(async () => root.render(<LiveDeposit identity={identity} onClose={() => {}} onRefresh={() => {}} />));
    expect(host.textContent).toContain('Choose what you’re depositing.'); expect(host.querySelector('iframe')).toBeNull();
    act(() => click('Dollars'));
    expect(host.querySelector('input')?.value).toBe(''); expect(host.querySelector('iframe')).toBeNull();
    act(() => click('Resume secure checkout'));
    expect(host.querySelector('iframe')?.getAttribute('src')).toContain('cs_fixture123456');
    act(() => click('All deposits')); act(() => click('Dollars'));
    expect(host.querySelector('input')?.value).toBe(''); expect(host.querySelector('iframe')).toBeNull(); expect(begin).not.toHaveBeenCalled();
  } finally { act(() => root.unmount()); }
});
it('retains the asset, dollars and proof chooser inside the app without a wallet handoff', () => {
  const host = document.createElement('div'), root = createRoot(host);
  try { act(() => root.render(<LiveDeposit identity={{} as OpenIdentity} onClose={vi.fn()} onRefresh={vi.fn()} />));
    expect(host.textContent).toContain('Turn what you own'); expect(host.textContent).toContain('A physical asset'); expect(host.textContent).toContain('Dollars'); expect(host.textContent).toContain('A proof object');
    expect(host.querySelector('a[href*="receiz.com/wallet"]')).toBeNull(); expect(host.textContent).not.toContain('Demo');
    act(() => [...host.querySelectorAll('button')].find(button => button.textContent?.includes('A physical asset'))!.click());
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
it('shows Receiz shipping instructions and the carried reference after saving a physical request', async () => {
  const identity = { startAssetIntake: async () => ({ kind: 'intake', title: 'Fixture Jordans', intake: { quantity: '1' }, delivery: { schema: 'receiz.bank.delivery-instructions.v1', recipient: 'Receiz', publicAlias: 'receiz', addressLines: ['1270 Ave of the Americas, 7th Fl', 'New York, NY 10020', 'United States'], reference: 'fef806e9-82bd-44a8-9bb4-f6b5afc9aef0' } }) } as unknown as OpenIdentity;
  const host = document.createElement('div'), root = createRoot(host);
  try {
    act(() => root.render(<LiveDeposit identity={identity} onClose={() => {}} onRefresh={() => {}} />));
    act(() => [...host.querySelectorAll('button')].find(button => button.textContent?.includes('A physical asset'))!.click());
    await act(async () => [...host.querySelectorAll('button')].find(button => button.textContent?.includes('Continue'))!.click());
    expect(host.textContent).toContain('1270 Ave of the Americas, 7th Fl');
    expect(host.textContent).toContain('fef806e9-82bd-44a8-9bb4-f6b5afc9aef0');
    expect(host.textContent).toContain('Awaiting verified receipt');
    expect(host.textContent).not.toContain('Added to your balance');
  } finally { act(() => root.unmount()); }
});
it('retains the carried delivery destination in Assets with its actual artifact owner', async () => {
  const identity = { binding: { identityOwnerReceizId: 'receiz_device_fixture', artifactOwnerReceizId: 'fixture.receiz.id' }, listDeposits: async () => [{ digest: 'fixture', title: 'Fixture Jordans', kind: 'intake', delivery: { recipient: 'Receiz', addressLines: ['Saved destination, preserved'], reference: 'fef806e9-82bd-44a8-9bb4-f6b5afc9aef0' } }] } as unknown as OpenIdentity;
  const host = document.createElement('div'), root = createRoot(host);
  try {
    await act(async () => root.render(<LiveAssetDetail identity={identity} digest="fixture" />));
    expect(host.textContent).toContain('Saved destination, preserved');
    expect(host.textContent).toContain('fixture.receiz.id');
    expect(host.textContent).not.toContain('receiz_device_fixture');
    expect(host.textContent).toContain('Awaiting verified receipt');
    expect([...host.querySelectorAll('button')].find(button => button.textContent === 'Sell a share')?.disabled).toBe(true);
  } finally { act(() => root.unmount()); }
});
it.each(['credited', 'expired', 'unpaid'])('returns to a new amount after a confirmed terminal %s checkout', async status => {
  const checkout = { sessionId: 'cs_fixture123456', clientSecret: 'cs_fixture123456_secret_fixture', amountUsdCents: '25000' };
  const identity = { pendingCardDeposit: async () => checkout, checkCardDeposit: async () => ({ status }) } as unknown as OpenIdentity;
  const host = document.createElement('div'), root = createRoot(host);
  try {
    await act(async () => root.render(<LiveDeposit identity={identity} onClose={() => {}} onRefresh={() => {}} />));
    act(() => [...host.querySelectorAll('button')].find(button => button.textContent?.includes('Dollars'))!.click());
    act(() => [...host.querySelectorAll('button')].find(button => button.textContent?.includes('Resume secure checkout'))!.click());
    await act(async () => [...host.querySelectorAll('button')].find(button => button.textContent?.includes('Check deposit status'))!.click());
    act(() => [...host.querySelectorAll('button')].find(button => button.textContent?.includes('All deposits'))!.click());
    act(() => [...host.querySelectorAll('button')].find(button => button.textContent?.includes('Dollars'))!.click());
    expect(host.querySelector('iframe')).toBeNull(); expect(host.textContent).toContain('Add to your balance.');
  } finally { act(() => root.unmount()); }
});
it('a delayed initial resume list cannot erase a checkout created while the read was pending', async () => {
  let restore!: (value: unknown[]) => void;
  const checkout = { sessionId: 'cs_fixture_new123', clientSecret: 'private-test-only', amountUsdCents: '10000' };
  const identity = { pendingCardDeposits: () => new Promise(resolve => { restore = resolve; }), beginCardDeposit: async () => checkout } as unknown as OpenIdentity;
  const host = document.createElement('div'), root = createRoot(host), click = (text: string) => [...host.querySelectorAll('button')].find(button => button.textContent?.includes(text))!.click();
  try {
    await act(async () => root.render(<LiveDeposit identity={identity} onClose={() => {}} onRefresh={() => {}} />));
    act(() => click('Dollars')); await act(async () => click('Continue')); act(() => click('All deposits')); act(() => click('Dollars'));
    expect(host.textContent).toContain('Resume secure checkout');
    await act(async () => restore([])); expect(host.textContent).toContain('Resume secure checkout');
  } finally { act(() => root.unmount()); }
});
