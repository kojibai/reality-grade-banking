// @vitest-environment happy-dom
import {act, useEffect} from 'react';
import {createRoot} from 'react-dom/client';
import {expect, it, vi} from 'vitest';
import App from '../src/App';
import {PublicAssetTradeHost} from '../src/public-explorer/PublicAssetTradeHost';
import {beginPublicAssetTrade, closePublicAssetTrade} from '../src/receiz/public-asset-trade';
const fixture = vi.hoisted(() => ({mounts: 0, account: {identity: null, wallet: null, opening: false, openingStage: 'identity', busy: false, error: null, create: async () => {}, importId: async () => {}, refresh: async () => {}}}));
vi.mock('../src/receiz/useNativeAccount', () => ({useNativeAccount: () => {useEffect(() => {fixture.mounts++;}, []); return fixture.account;}}));
vi.mock('../src/receiz/usePublicMarket', () => ({usePublicMarket: () => ({catalog: null, status: 'loading'})}));
Object.assign(globalThis, {IS_REACT_ACT_ENVIRONMENT: true});

it('keeps one native account owner while its existing entrance moves into the public sheet and back', async () => {
  history.replaceState(null, '', '/asset/source/');
  const bank = document.createElement('div'), publicHost = document.createElement('div'); bank.id = 'root'; bank.hidden = true; bank.inert = true; document.body.append(bank, publicHost);
  const bankRoot = createRoot(bank), publicRoot = createRoot(publicHost);
  const loader = (event: Event) => {const detail = (event as CustomEvent).detail; detail.handled = true; detail.resolve();}; addEventListener('bankeiz:request-bank-runtime', loader);
  try {
    await act(async () => {bankRoot.render(<App/>); publicRoot.render(<PublicAssetTradeHost/>);});
    expect(fixture.mounts).toBe(1); expect(bank.querySelector('.identity-entrance')).not.toBeNull();
    await act(async () => {beginPublicAssetTrade({itemId: 'profile:artist:source', side: 'sell', title: 'An original'});});
    expect(publicHost.querySelector('dialog .identity-entrance')).not.toBeNull(); expect(bank.querySelector('.identity-entrance')).toBeNull(); expect(fixture.mounts).toBe(1);
    await act(async () => closePublicAssetTrade()); expect(bank.querySelector('.identity-entrance')).not.toBeNull(); expect(fixture.mounts).toBe(1);
    history.replaceState(null, '', '/'); await act(async () => dispatchEvent(new Event('receiz-bank:surface'))); expect(fixture.mounts).toBe(1);
  } finally {act(() => {publicRoot.unmount(); bankRoot.unmount();}); bank.remove(); publicHost.remove(); removeEventListener('bankeiz:request-bank-runtime', loader); history.replaceState(null, '', '/');}
});
