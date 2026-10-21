// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach, expect, it, vi} from 'vitest';
import {PublicAssetTradeHost} from '../src/public-explorer/PublicAssetTradeHost';
import {PublicAssetTradePortal, type PublicTradeAccount} from '../src/features/market/PublicAssetTradePortal';
import {beginPublicAssetTrade, closePublicAssetTrade} from '../src/receiz/public-asset-trade';
import type {OpenIdentity} from '../src/receiz/native-identity';
import {retainPublicPurchase} from '../src/receiz/public-purchase-checkpoint';
import {assetPagePath} from '../src/receiz/public-asset-page';
Object.assign(globalThis, {IS_REACT_ACT_ENVIRONMENT: true});

const checkout = {sessionId: 'cs_fixture123456', clientSecret: 'synthetic-only', amountUsdCents: '2500'};
const review = {digest: 'digest', title: 'An original', body: {side: 'buy', amountUsd: '25.00'}, observation: {preview: {shareQuantityMicro: '1250000', settlementUsdCents: '2500'}}};
function fixture(funded = true) {
  let status = 'settling';
  const api = {status: async () => null, prepare: vi.fn(async () => review), execute: vi.fn(), discard: vi.fn()};
  const identity = {marketTrade: async () => api, pendingCardDeposits: async () => [], beginCardDeposit: vi.fn(async () => checkout), checkCardDeposit: vi.fn(async () => ({status}))} as unknown as OpenIdentity;
  const account = {identity, wallet: {totalUsdCents: funded ? '10000' : '0'}, opening: false, openingStage: 'ready', busy: false, error: null, create: vi.fn(), importId: vi.fn(), refresh: vi.fn(async () => {})} as unknown as PublicTradeAccount;
  return {account, identity, api, credit: () => {status = 'credited';}};
}
const button = (host: HTMLElement, text: string) => [...host.querySelectorAll('button')].find(item => item.textContent?.includes(text))!;
const enterAmount = async (host: HTMLElement, amount: string) => act(async () => {const input = host.querySelector('input')!; Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, amount); input.dispatchEvent(new Event('input', {bubbles: true}));});
afterEach(() => {act(() => closePublicAssetTrade()); sessionStorage.clear(); history.replaceState(null, '', '/');});

it('opens the existing sheet on intent, keeping the asset URL and head while runtime loads', async () => {
  history.replaceState(null, '', '/asset/source/'); document.title = 'An original | Bankeiz';
  const loader = vi.fn((event: Event) => {const detail = (event as CustomEvent).detail; detail.handled = true;});
  addEventListener('bankeiz:request-bank-runtime', loader);
  const host = document.createElement('div'), root = createRoot(host); document.body.append(host);
  try {
    await act(async () => root.render(<PublicAssetTradeHost/>)); expect(loader).not.toHaveBeenCalled();
    await act(async () => {beginPublicAssetTrade({itemId: 'profile:artist:source', side: 'buy', title: 'An original'});});
    expect(host.querySelector('dialog')?.open).toBe(true); expect(host.textContent).toContain('Opening your account'); expect(loader).toHaveBeenCalledOnce();
    expect(location.pathname).toBe('/asset/source/'); expect(document.title).toBe('An original | Bankeiz');
    expect(beginPublicAssetTrade({itemId: 'sports:rsc_0123456789abcdef', side: 'buy', title: 'Sports'})).toBe(false);
  } finally {act(() => root.unmount()); host.remove(); removeEventListener('bankeiz:request-bank-runtime', loader);}
});

it('portals the funded account trade into the public sheet and requires its original review and approval', async () => {
  const {account, api} = fixture(), host = document.createElement('div'), root = createRoot(host); document.body.append(host);
  try {
    await act(async () => root.render(<><PublicAssetTradeHost/><div hidden inert><PublicAssetTradePortal account={account}/></div></>));
    await act(async () => {beginPublicAssetTrade({itemId: 'profile:artist:source', side: 'buy', title: 'An original'});});
    const dialog = host.querySelector('dialog')!; expect(dialog.textContent).toContain('Buy ownership'); expect(dialog.querySelector('input')?.value).toBe('');
    await enterAmount(dialog, '25'); await act(async () => button(dialog, 'Review trade').click());
    expect(api.prepare).toHaveBeenCalledExactlyOnceWith({marketItemId: 'profile:artist:source', side: 'buy', amountUsdCents: '2500'});
    expect(dialog.textContent).toContain('Review purchase'); expect(button(dialog, 'Confirm purchase').disabled).toBe(true); expect(api.execute).not.toHaveBeenCalled();
  } finally {act(() => root.unmount()); host.remove();}
});

it('funds a chosen fraction budget and returns to trade only after account-bound credit, without executing', async () => {
  const {account, identity, api, credit} = fixture(false), host = document.createElement('div'), root = createRoot(host);
  try {
    await act(async () => root.render(<><PublicAssetTradeHost/><PublicAssetTradePortal account={account}/></>));
    await act(async () => {beginPublicAssetTrade({itemId: 'profile:artist:source', side: 'buy', title: 'An original'});});
    const dialog = host.querySelector('dialog')!; expect(dialog.textContent).toContain('Add to your balance'); expect(dialog.querySelector('input')?.value).toBe(''); expect(dialog.textContent).not.toContain('Wire');
    await enterAmount(dialog, '25'); await act(async () => button(dialog, 'Continue').click());
    expect(identity.beginCardDeposit).toHaveBeenCalledExactlyOnceWith('25', true); expect(dialog.querySelector('iframe')?.title).toBe('Secure card deposit');
    await act(async () => button(dialog, 'Check deposit status').click()); expect(dialog.textContent).toContain('Reserve credit is pending'); expect(api.prepare).not.toHaveBeenCalled();
    credit(); await act(async () => button(dialog, 'Check deposit status').click());
    expect(dialog.textContent).toContain('Buy ownership'); expect(dialog.querySelector('input')?.value).toBe('25.00'); expect(api.prepare).not.toHaveBeenCalled(); expect(api.execute).not.toHaveBeenCalled();
  } finally {act(() => root.unmount()); host.remove();}
});

it('portals the same account entrance before creation and takes a zero-balance sale directly to quantities', async () => {
  const {account} = fixture(false), host = document.createElement('div'), root = createRoot(host); document.body.append(host);
  try {
    await act(async () => root.render(<><PublicAssetTradeHost/><PublicAssetTradePortal account={{...account, identity: null}}/></>));
    await act(async () => {beginPublicAssetTrade({itemId: 'profile:artist:source', side: 'sell', title: 'An original'});});
    const dialog = host.querySelector('dialog')!; expect(dialog.textContent).toContain('Use existing account');
    await act(async () => button(dialog, 'Enter').click()); expect(account.create).toHaveBeenCalledExactlyOnceWith(true);
    await act(async () => root.render(<><PublicAssetTradeHost/><PublicAssetTradePortal account={account}/></>));
    expect(dialog.textContent).toContain('Sell ownership'); expect(dialog.textContent).toContain('Ownership units'); expect(dialog.querySelector('iframe')).toBeNull();
    history.pushState(null, '', '/learn/'); await act(async () => dispatchEvent(new Event('receiz-bank:surface'))); expect(host.querySelector('dialog')).toBeNull();
  } finally {act(() => root.unmount()); host.remove();}
});

it('explicitly resumes the exact native checkout after a return without starting another charge or trade', async () => {
  const {account, identity, api, credit} = fixture(), host = document.createElement('div'), root = createRoot(host);
  identity.pendingCardDeposits = async () => [checkout];
  const intent = {itemId: 'profile:artist:source', side: 'buy' as const, title: 'An original'};
  retainPublicPurchase(intent, checkout, 'deposit'); history.replaceState(null, '', assetPagePath(intent.itemId) + '#resumeCardSession=' + checkout.sessionId);
  try {
    await act(async () => root.render(<><PublicAssetTradeHost/><PublicAssetTradePortal account={account}/></>));
    expect(host.querySelector('dialog')).toBeNull(); expect(identity.checkCardDeposit).not.toHaveBeenCalled();
    await act(async () => button(host, 'Check deposit and continue').click());
    const dialog = host.querySelector('dialog')!;
    expect(identity.checkCardDeposit).toHaveBeenCalledExactlyOnceWith(checkout); expect(identity.beginCardDeposit).not.toHaveBeenCalled(); expect(dialog.textContent).toContain('Reserve credit is pending');
    credit(); await act(async () => button(dialog, 'Check deposit status').click());
    expect(dialog.querySelector('input')?.value).toBe('25.00'); expect(api.prepare).not.toHaveBeenCalled(); expect(api.execute).not.toHaveBeenCalled(); expect(identity.beginCardDeposit).not.toHaveBeenCalled();
  } finally {act(() => root.unmount());}
});
