// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach, expect, it, vi} from 'vitest';
import {PublicAssetTradeHost} from '../src/public-explorer/PublicAssetTradeHost';
import {PublicAssetTradePortal, type PublicTradeAccount} from '../src/features/market/PublicAssetTradePortal';
import {beginPublicAssetTrade, closePublicAssetTrade} from '../src/receiz/public-asset-trade';
import type {OpenIdentity} from '../src/receiz/native-identity';
import type {MarketTradeOutcome} from '../src/receiz/market-trade';
import {retainPublicPurchase} from '../src/receiz/public-purchase-checkpoint';
import {assetPagePath} from '../src/receiz/public-asset-page';
Object.assign(globalThis, {IS_REACT_ACT_ENVIRONMENT: true});

const checkout = {sessionId: 'cs_fixture123456', clientSecret: 'synthetic-only', amountUsdCents: '2500'};
const review = {digest: 'digest', title: 'An original', body: {marketItemId:'profile:artist:source',side: 'buy', amountUsd: '25.00'}, observation: {preview: {shareQuantityMicro: '1250000', settlementUsdCents: '2500'}}};
function fixture(funded = true) {
  let status = 'settling';
  const api = {status: vi.fn<()=>Promise<null|{status:'unknown';clientNonce:string}>>(async () => null),resolve:vi.fn(), prepare: vi.fn(async () => review), execute: vi.fn<()=>Promise<MarketTradeOutcome>>(async()=>({status:'recorded',side:'buy',clientNonce:'native-nonce',tradeId:'native-trade',shareQuantityMicro:'1250000',settlementUsdCents:'2500'})), discard: vi.fn()};
  const identity = {marketTrade: async () => api, pendingCardDeposits: async () => [], beginCardDeposit: vi.fn(async () => checkout), checkCardDeposit: vi.fn(async () => ({status}))} as unknown as OpenIdentity;
  const account = {identity, wallet: {totalUsdCents: funded ? '10000' : '0'}, opening: false, openingStage: 'ready', busy: false, error: null, create: vi.fn(), importId: vi.fn(), refresh: vi.fn(async () => {})} as unknown as PublicTradeAccount;
  return {account, identity, api, credit: () => {status = 'credited';}};
}
const button = (host: HTMLElement, text: string) => [...host.querySelectorAll('button')].find(item => item.textContent?.includes(text))!;
const enterAmount = async (host: HTMLElement, amount: string) => act(async () => {const input = host.querySelector('input')!; Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, amount); input.dispatchEvent(new Event('input', {bubbles: true}));});
afterEach(() => {act(() => closePublicAssetTrade()); sessionStorage.clear(); history.replaceState(null, '', '/');});

it('opens a new buyer account in place while accepting the purchase amount, then continues to card funding without an entry screen',async()=>{
 const {account,identity,api}=fixture(false),host=document.createElement('div'),root=createRoot(host);history.replaceState(null,'','/asset/public-source/');
 try{
  await act(async()=>root.render(<><PublicAssetTradeHost/><PublicAssetTradePortal account={{...account,identity:null}}/></>));
  await act(async()=>{beginPublicAssetTrade({itemId:'profile:artist:source',side:'buy',title:'An original'});});
  const dialog=host.querySelector('dialog')!;
  expect(account.create).toHaveBeenCalledExactlyOnceWith(true);expect(dialog.querySelector('.identity-entrance')).toBeNull();
  await enterAmount(dialog,'25');
  await act(async()=>root.render(<><PublicAssetTradeHost/><PublicAssetTradePortal account={account}/></>));
  expect(dialog.querySelector('input')?.value).toBe('25');expect(account.create).toHaveBeenCalledTimes(1);
  expect(location.pathname).toBe('/asset/public-source/');expect(identity.beginCardDeposit).not.toHaveBeenCalled();expect(api.execute).not.toHaveBeenCalled();
  await act(async()=>button(dialog,'Continue to payment').click());expect(identity.beginCardDeposit).toHaveBeenCalledExactlyOnceWith('25',true);
 }finally{act(()=>root.unmount());}
});
it('finishes existing device-account restoration before considering automatic buyer account creation',async()=>{
 const {account}=fixture(),host=document.createElement('div'),root=createRoot(host);
 try{
  await act(async()=>root.render(<><PublicAssetTradeHost/><PublicAssetTradePortal account={{...account,identity:null,opening:true}}/></>));
  await act(async()=>{beginPublicAssetTrade({itemId:'profile:artist:source',side:'buy',title:'An original'});});
  expect(account.create).not.toHaveBeenCalled();
  await act(async()=>root.render(<><PublicAssetTradeHost/><PublicAssetTradePortal account={account}/></>));
  expect(account.create).not.toHaveBeenCalled();expect(host.querySelector('dialog')?.textContent).toContain('Buy ownership');
 }finally{act(()=>root.unmount());}
});

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

it('takes a buyer without account funds directly from amount to the existing card checkout', async () => {
  const {account, identity, api} = fixture(false), host = document.createElement('div'), root = createRoot(host); document.body.append(host);
  const market = vi.spyOn(identity, 'marketTrade').mockRejectedValue(new Error('BANK_MARKET_TERMS_UNAVAILABLE'));
  try {
    await act(async () => root.render(<><PublicAssetTradeHost/><div hidden inert><PublicAssetTradePortal account={account}/></div></>));
    await act(async () => {beginPublicAssetTrade({itemId: 'profile:artist:source', side: 'buy', title: 'An original'});});
    const dialog = host.querySelector('dialog')!; expect(dialog.textContent).toContain('Buy ownership'); expect(dialog.querySelector('input')?.value).toBe('');
    expect(dialog.textContent).not.toContain('Review trade'); expect(dialog.textContent).not.toContain('Add money for this purchase');
    expect(dialog.textContent).not.toContain('Pay with a Note'); expect(dialog.textContent).not.toContain('Back to purchase');
    await enterAmount(dialog, '25'); await act(async () => button(dialog, 'Continue to payment').click());
    expect(identity.beginCardDeposit).toHaveBeenCalledExactlyOnceWith('25', true);
    expect(dialog.querySelector('iframe')?.title).toBe('Secure card deposit');
    expect(market).not.toHaveBeenCalled(); expect(api.prepare).not.toHaveBeenCalled(); expect(api.execute).not.toHaveBeenCalled();
  } finally {act(() => root.unmount()); host.remove();}
});

it.each(['buy','sell'] as const)('uses the existing account Market flow for a standalone %s without creating card checkout',async side=>{
 const {account,identity,api}=fixture(),host=document.createElement('div'),root=createRoot(host);document.body.append(host);
 try{
  await act(async()=>root.render(<><PublicAssetTradeHost/><PublicAssetTradePortal account={account}/></>));
  await act(async()=>{beginPublicAssetTrade({itemId:'profile:artist:source',side,title:'An original'});});
  const dialog=host.querySelector('dialog')!;expect(dialog.textContent).toContain('Review trade');expect(dialog.querySelector('iframe')).toBeNull();expect(dialog.textContent).not.toContain('Add money for this purchase');
  expect(identity.beginCardDeposit).not.toHaveBeenCalled();expect(api.prepare).not.toHaveBeenCalled();
  await enterAmount(dialog,'25');await act(async()=>button(dialog,'Review trade').click());
  expect(api.prepare).toHaveBeenCalledExactlyOnceWith({marketItemId:'profile:artist:source',side,amountUsdCents:'2500'});
  expect(identity.beginCardDeposit).not.toHaveBeenCalled();expect(api.execute).not.toHaveBeenCalled();
  await act(async()=>dialog.querySelector<HTMLInputElement>('input[type=checkbox]')!.click());await act(async()=>button(dialog,side==='buy'?'Confirm purchase':'Confirm sale').click());
  expect(api.execute).toHaveBeenCalledExactlyOnceWith(review,review.digest);expect(identity.beginCardDeposit).not.toHaveBeenCalled();
  await act(async()=>root.render(<><PublicAssetTradeHost/><PublicAssetTradePortal account={{...account,wallet:{...account.wallet!,totalUsdCents:'0'}}}/></>));
  expect(host.querySelector('dialog')).toBe(dialog);expect(dialog.textContent).toContain('Trade recorded');expect(dialog.querySelector('iframe')).toBeNull();expect(identity.beginCardDeposit).not.toHaveBeenCalled();
 }finally{act(()=>root.unmount());host.remove();}
});

it('offers card funding only for an explicit insufficient-balance quote, retaining the entered purchase amount',async()=>{
 const {account,identity,api}=fixture(),host=document.createElement('div'),root=createRoot(host);
 api.prepare.mockRejectedValue(Object.assign(Error('wallet_insufficient_balance'),{status:409,payload:{error:'wallet_insufficient_balance'}}));
 try{
  await act(async()=>root.render(<><PublicAssetTradeHost/><PublicAssetTradePortal account={account}/></>));await act(async()=>{beginPublicAssetTrade({itemId:'profile:artist:source',side:'buy',title:'An original'});});
  const dialog=host.querySelector('dialog')!;await enterAmount(dialog,'25');await act(async()=>button(dialog,'Review trade').click());
  expect(dialog.textContent).toContain('Continue to payment');expect(dialog.querySelector('input')?.value).toBe('25');expect(api.prepare).toHaveBeenCalledOnce();expect(api.execute).not.toHaveBeenCalled();expect(identity.beginCardDeposit).not.toHaveBeenCalled();
  await act(async()=>button(dialog,'Continue to payment').click());expect(identity.beginCardDeposit).toHaveBeenCalledExactlyOnceWith('25',true);
 }finally{act(()=>root.unmount());}
});

it('does not treat an unavailable quote or an unknown balance as permission to open card funding',async()=>{
 const {account,identity,api}=fixture(),host=document.createElement('div'),root=createRoot(host);
 api.prepare.mockRejectedValue(Object.assign(Error('quote unavailable'),{status:503,payload:{error:'market_position_lookup_failed'}}));
 try{
  await act(async()=>root.render(<><PublicAssetTradeHost/><PublicAssetTradePortal account={{...account,wallet:null}}/></>));await act(async()=>{beginPublicAssetTrade({itemId:'profile:artist:source',side:'buy',title:'An original'});});
  const dialog=host.querySelector('dialog')!;expect(dialog.textContent).toContain('Review trade');await enterAmount(dialog,'25');await act(async()=>button(dialog,'Review trade').click());
  expect(dialog.textContent).toContain('HTTP 503');expect(dialog.textContent).not.toContain('Continue to payment');expect(dialog.querySelector('iframe')).toBeNull();expect(api.prepare).toHaveBeenCalledOnce();expect(identity.beginCardDeposit).not.toHaveBeenCalled();
 }finally{act(()=>root.unmount());}
});

it('continues the approved purchase automatically once account-bound card credit is confirmed', async () => {
  const {account, identity, api, credit} = fixture(false), host = document.createElement('div'), root = createRoot(host);
  try {
    await act(async () => root.render(<><PublicAssetTradeHost/><PublicAssetTradePortal account={account}/></>));
    await act(async () => {beginPublicAssetTrade({itemId: 'profile:artist:source', side: 'buy', title: 'An original'});});
    const dialog = host.querySelector('dialog')!; expect(dialog.textContent).toContain('Buy ownership'); expect(dialog.querySelector('input')?.value).toBe(''); expect(dialog.textContent).not.toContain('Wire');
    await enterAmount(dialog, '25'); await act(async () => button(dialog, 'Continue to payment').click());
    expect(identity.beginCardDeposit).toHaveBeenCalledExactlyOnceWith('25', true); expect(dialog.querySelector('iframe')?.title).toBe('Secure card deposit');
    await act(async () => button(dialog, 'Check deposit status').click()); expect(dialog.textContent).toContain('Account credit is pending'); expect(api.prepare).not.toHaveBeenCalled();
    credit(); await act(async () => button(dialog, 'Check deposit status').click());
    expect(dialog.textContent).toContain('Purchase complete');expect(api.prepare).toHaveBeenCalledExactlyOnceWith({marketItemId:'profile:artist:source',side:'buy',amountUsdCents:'2500'});expect(api.execute).toHaveBeenCalledExactlyOnceWith(review,review.digest);expect(dialog.textContent).not.toContain('Confirm purchase');
    await act(async()=>button(dialog,'Review another trade').click());expect(dialog.textContent).toContain('Review trade');expect(dialog.textContent).not.toContain('Completing your purchase');expect(api.execute).toHaveBeenCalledOnce();
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
    expect(identity.checkCardDeposit).toHaveBeenCalledExactlyOnceWith(checkout); expect(identity.beginCardDeposit).not.toHaveBeenCalled(); expect(dialog.textContent).toContain('Account credit is pending');
    credit(); await act(async () => button(dialog, 'Check deposit status').click());
    expect(dialog.querySelector('input')?.value).toBe('25.00'); expect(api.prepare).not.toHaveBeenCalled(); expect(api.execute).not.toHaveBeenCalled(); expect(identity.beginCardDeposit).not.toHaveBeenCalled();
  } finally {act(() => root.unmount());}
});

it('does not turn selecting an old checkout into fresh asset purchase approval',async()=>{
 const {account,identity,api,credit}=fixture(false),host=document.createElement('div'),root=createRoot(host);
 identity.pendingCardDeposits=async()=>[checkout];
 try{
  await act(async()=>root.render(<><PublicAssetTradeHost/><PublicAssetTradePortal account={account}/></>));
  await act(async()=>{beginPublicAssetTrade({itemId:'profile:artist:source',side:'buy',title:'An original'});});
  const dialog=host.querySelector('dialog')!;
  await act(async()=>button(dialog,'Resume secure checkout').click());
  credit();await act(async()=>button(dialog,'Check deposit status').click());
  expect(api.prepare).not.toHaveBeenCalled();expect(api.execute).not.toHaveBeenCalled();
  expect(dialog.textContent).toContain('Review trade');expect(identity.beginCardDeposit).not.toHaveBeenCalled();
 }finally{act(()=>root.unmount());}
});

it('recovers a funded purchase into its native trade check without requesting another card payment',async()=>{
 const {account,identity,api}=fixture(),host=document.createElement('div'),root=createRoot(host);
 const intent={itemId:'profile:artist:source',side:'buy' as const,title:'An original'};
 retainPublicPurchase(intent,checkout,'trade');history.replaceState(null,'',assetPagePath(intent.itemId));
 api.status.mockResolvedValue({status:'unknown',clientNonce:'funded-original-trade'});
 try{
  await act(async()=>root.render(<><PublicAssetTradeHost/><PublicAssetTradePortal account={account}/></>));
  await act(async()=>button(host,'Continue purchase review').click());
  const dialog=host.querySelector('dialog')!;
  expect(dialog.textContent).toContain('Confirming your trade');expect(dialog.textContent).toContain('Check trade outcome');
  expect(dialog.querySelector('iframe')).toBeNull();expect(identity.beginCardDeposit).not.toHaveBeenCalled();expect(api.prepare).not.toHaveBeenCalled();expect(api.execute).not.toHaveBeenCalled();
 }finally{act(()=>root.unmount());}
});

it('keeps an earlier unknown trade separate from a newly approved funded purchase',async()=>{
 const {account,api,credit}=fixture(false),host=document.createElement('div'),root=createRoot(host);
 api.status.mockResolvedValue({status:'unknown',clientNonce:'unrelated-earlier-trade'});
 api.resolve.mockResolvedValue({status:'recorded',clientNonce:'unrelated-earlier-trade',side:'sell',settlementUsdCents:'9999',shareQuantityMicro:'1'});
 try{
  await act(async()=>root.render(<><PublicAssetTradeHost/><PublicAssetTradePortal account={account}/></>));
  await act(async()=>{beginPublicAssetTrade({itemId:'profile:artist:source',side:'buy',title:'An original'});});
  const dialog=host.querySelector('dialog')!;await enterAmount(dialog,'25');await act(async()=>button(dialog,'Continue to payment').click());
  credit();await act(async()=>button(dialog,'Check deposit status').click());
  expect(dialog.textContent).toContain('Check an earlier trade');expect(api.execute).not.toHaveBeenCalled();
  await act(async()=>button(dialog,'Check earlier trade').click());
  expect(dialog.textContent).toContain('Continue your purchase');expect(dialog.textContent).not.toContain('Purchase complete');expect(api.execute).not.toHaveBeenCalled();
  await act(async()=>button(dialog,'Continue purchase').click());expect(dialog.textContent).toContain('Purchase complete');expect(api.execute).toHaveBeenCalledOnce();
 }finally{act(()=>root.unmount());}
});

it('keeps the approved purchase reference when another tab advances the current trade during recovery',async()=>{
 const {account,api,credit}=fixture(false),host=document.createElement('div'),root=createRoot(host);
 api.execute.mockResolvedValue({status:'unknown',clientNonce:'approved-purchase-nonce'});
 api.resolve.mockResolvedValueOnce({status:'recorded',clientNonce:'different-trade-nonce',side:'sell',settlementUsdCents:'9999',shareQuantityMicro:'1'}).mockResolvedValueOnce({status:'recorded',clientNonce:'approved-purchase-nonce',side:'buy',settlementUsdCents:'2500',shareQuantityMicro:'1250000'});
 try{
  await act(async()=>root.render(<><PublicAssetTradeHost/><PublicAssetTradePortal account={account}/></>));
  await act(async()=>{beginPublicAssetTrade({itemId:'profile:artist:source',side:'buy',title:'An original'});});
  const dialog=host.querySelector('dialog')!;await enterAmount(dialog,'25');await act(async()=>button(dialog,'Continue to payment').click());
  credit();await act(async()=>button(dialog,'Check deposit status').click());
  expect(dialog.textContent).toContain('Confirming your trade');
  await act(async()=>button(dialog,'Check trade outcome').click());
  expect(dialog.textContent).toContain('Confirming your trade');expect(dialog.textContent).not.toContain('Purchase complete');expect(dialog.textContent).toContain('BANK_MARKET_OUTCOME_MISMATCH');
  await act(async()=>button(dialog,'Check trade outcome').click());
  expect(dialog.textContent).toContain('Purchase complete');expect(dialog.textContent).toContain('$25.00');expect(api.execute).toHaveBeenCalledOnce();
 }finally{act(()=>root.unmount());}
});
