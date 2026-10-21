import {useEffect, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {PublicAssetTradeHost} from '../../src/public-explorer/PublicAssetTradeHost';
import {PublicAssetTradePortal, type PublicTradeAccount} from '../../src/features/market/PublicAssetTradePortal';
import {beginPublicAssetTrade} from '../../src/receiz/public-asset-trade';
import type {OpenIdentity} from '../../src/receiz/native-identity';
import '../../src/styles/tokens.css';
import '../../src/styles/app.css';
import '../../src/styles/features.css';

const fresh = new URL(location.href).searchParams.has('new');
let creditChecks = 0, preparations = 0, submissions = 0, accounts = 0;
const update = () => dispatchEvent(new Event('synthetic:public-trade'));
const checkout = {sessionId: 'cs_synthetic123456', clientSecret: 'synthetic-only-no-provider', amountUsdCents: '2500'};
const identity = {
  pendingCardDeposits: async () => sessionStorage.getItem('synthetic-public-checkout') ? [checkout] : [],
  beginCardDeposit: async () => {sessionStorage.setItem('synthetic-public-checkout', 'saved'); return checkout;},
  checkCardDeposit: async () => {const status = ++creditChecks > 1 ? 'credited' : 'settling'; if (status === 'credited') sessionStorage.removeItem('synthetic-public-checkout'); return {status};},
  marketTrade: async () => ({
    status: async () => null,
    prepare: async (body: {marketItemId:string;side: string; amountUsdCents?: string; shareQuantityMicro?: string}) => {
      preparations++; update();
      return {digest: 'synthetic-review', title: 'The Shape of Tomorrow', body: {marketItemId:body.marketItemId,side: body.side, amountUsd: '25.00', shareQuantity: '1.000000'}, observation: {preview: {shareQuantityMicro: body.side === 'sell' ? body.shareQuantityMicro : '1250000', settlementUsdCents: '2500'}}};
    },
    // Synthetic outcomes exercise presentation without an account or host.
    execute: async () => {submissions++; update(); return {status:'recorded',side:'buy',clientNonce:'synthetic-nonce',tradeId:'synthetic-trade',shareQuantityMicro:'1250000',settlementUsdCents:'2500'};},
    discard: () => {},
  }),
} as unknown as OpenIdentity;
function AccountOwner() {
  const [open, setOpen] = useState(!fresh);
  const account = {identity: open ? identity : null, wallet: {totalUsdCents: fresh ? '0' : '10000'}, opening: false, openingStage: 'ready', busy: false, error: null, create: async () => {accounts++; update(); setOpen(true);}, importId: async () => {accounts++; update(); setOpen(true);}, refresh: async () => {}} as unknown as PublicTradeAccount;
  return <PublicAssetTradePortal account={account}/>;
}
let loaded = false;
addEventListener('bankeiz:request-bank-runtime', event => {
  const request = (event as CustomEvent).detail; request.handled = true;
  if (!loaded) {loaded = true; createRoot(document.getElementById('bank-fixture')!).render(<AccountOwner/>);}
  request.resolve();
});
function Fixture() {
  const [, repaint] = useState(0);
  useEffect(() => {const change = () => repaint(value => value + 1); addEventListener('synthetic:public-trade', change); return () => removeEventListener('synthetic:public-trade', change);}, []);
  return <main style={{maxWidth: 900, margin: '30px auto', padding: 24}}><p className="body-copy small-copy">Synthetic account fixture. No account, card provider, service or money is connected.</p><h1>The Shape of Tomorrow</h1><p className="body-copy">A public asset worth $1,234,567,890.12. Choose your own purchase budget.</p><button className="primary-button" onClick={() => beginPublicAssetTrade({itemId: 'profile:artist:source', side: 'buy', title: 'The Shape of Tomorrow'})}>Buy ownership</button><button className="secondary-button" onClick={() => beginPublicAssetTrade({itemId: 'profile:artist:source', side: 'sell', title: 'The Shape of Tomorrow'})}>Sell ownership</button><PublicAssetTradeHost/><output aria-label="Synthetic verification">{`Account openings: ${accounts} · Quotes prepared: ${preparations} · Trades submitted: ${submissions}`}</output></main>;
}
createRoot(document.getElementById('public-fixture')!).render(<Fixture/>);
