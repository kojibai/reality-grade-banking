// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach, expect, it} from 'vitest';
import {retainPublicPurchase, publicPurchaseAtLocation, publicPurchaseReturnLink} from '../src/receiz/public-purchase-checkpoint';
import {assetPagePath} from '../src/receiz/public-asset-page';
import {CardDepositReturn, cardResumeLink} from '../src/features/deposit/CardDepositReturn';
import {PublicAssetTradeHost} from '../src/public-explorer/PublicAssetTradeHost';
import {closePublicAssetTrade} from '../src/receiz/public-asset-trade';
Object.assign(globalThis, {IS_REACT_ACT_ENVIRONMENT: true});
const intent = {itemId: 'profile:artist:source', side: 'buy' as const, title: 'An original'};
const checkout = {sessionId: 'cs_fixture123456', amountUsdCents: '2500'};
afterEach(() => {act(() => closePublicAssetTrade()); sessionStorage.clear(); history.replaceState(null, '', '/');});

it('retains public purchase context across reload, bound to the exact saved checkout reference without a secret or authority', () => {
  retainPublicPurchase(intent, {...checkout, clientSecret: 'must-never-persist'} as typeof checkout, 'deposit');
  history.replaceState(null, '', assetPagePath(intent.itemId));
  expect(publicPurchaseAtLocation()).toEqual({...intent, ...checkout, view: 'deposit'});
  const raw = Array.from({length: sessionStorage.length}, (_, index) => sessionStorage.getItem(sessionStorage.key(index)!)).join(''); expect(raw).toContain('cs_fixture123456'); expect(raw).not.toContain('must-never-persist');
  expect(publicPurchaseReturnLink(checkout.sessionId)).toBe('/asset/profile%3Aartist%3Asource/#resumeCardSession=cs_fixture123456');
  expect(cardResumeLink(checkout.sessionId)).toBe('/asset/profile%3Aartist%3Asource/#resumeCardSession=cs_fixture123456');
  expect(cardResumeLink('cs_other12345678')).toBe('/?resumeCardSession=cs_other12345678#account/deposit');
  history.replaceState(null, '', assetPagePath('another:source')); expect(publicPurchaseAtLocation()).toBeNull();
});

it('keeps a returned asset cold and asks for an explicit native deposit check or fresh review', async () => {
  retainPublicPurchase(intent, checkout, 'deposit'); history.replaceState(null, '', assetPagePath(intent.itemId) + '#resumeCardSession=' + checkout.sessionId);
  const host = document.createElement('div'), root = createRoot(host);
  try {
    await act(async () => root.render(<PublicAssetTradeHost/>));
    expect(host.querySelector('dialog')).toBeNull(); expect(host.textContent).toContain('Check deposit and continue');
    await act(async () => {retainPublicPurchase(intent, checkout, 'trade');});
    expect(host.textContent).toContain('Continue purchase review'); expect(host.textContent).not.toContain('Payment received');
  } finally {act(() => root.unmount());}
});

it('points the provider return to the same asset without treating the return as payment success', async () => {
  retainPublicPurchase(intent, checkout, 'deposit');
  const host = document.createElement('div'), root = createRoot(host);
  try {await act(async () => root.render(<CardDepositReturn sessionId={checkout.sessionId}/>));
    expect(host.querySelector('a')?.getAttribute('href')).toBe('/asset/profile%3Aartist%3Asource/#resumeCardSession=cs_fixture123456'); expect(host.querySelector('a')?.textContent).toBe('Return to this asset'); expect(host.textContent).not.toContain('Payment received');
  } finally {act(() => root.unmount());}
});
