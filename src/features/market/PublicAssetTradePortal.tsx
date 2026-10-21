import {useEffect,useLayoutEffect,useRef,useState,useSyncExternalStore,type ReactNode} from 'react';
import {createPortal} from 'react-dom';
import {Entrance} from '../identity/Entrance';
import {LiveDeposit} from '../deposit/LiveDeposit';
import {LiveMarketTrade} from './LiveMarketTrade';
import {connectPublicAssetTrade, readPublicAssetTrade, subscribePublicAssetTrade, type PublicAssetTradeRequest} from '../../receiz/public-asset-trade';
import type {useNativeAccount} from '../../receiz/useNativeAccount';
import {publicPurchaseBudget, retainPublicPurchase} from '../../receiz/public-purchase-checkpoint';
import {AmountInput} from '../../components/AmountInput';
export type PublicTradeAccount = Pick<ReturnType<typeof useNativeAccount>, 'identity' | 'wallet' | 'opening' | 'openingStage' | 'busy' | 'error' | 'create' | 'importId' | 'refresh'>;

function PublicAssetTradeFlow({request, account}: {request: PublicAssetTradeRequest; account: PublicTradeAccount}) {
  const [step, setStep] = useState<'fund' | 'trade' | null>(null), [budget, setBudget] = useState(request.initialBudget ?? '');
  const requestedAccount=useRef(false);
  useLayoutEffect(() => connectPublicAssetTrade(request.id), [request.id]);
  useEffect(()=>{
    // Buy is the entry intent. Finish restoring existing custody first; an
    // absent account may then use the same ordinary creation path in place.
    // A restore error must never be treated as permission to replace an ID.
    if(request.side!=='buy'||account.identity||account.opening||account.busy||account.error||requestedAccount.current)return;
    requestedAccount.current=true;void account.create(true);
  },[request.side,account.identity,account.opening,account.busy,account.error,account.create]);
  if(!account.identity&&request.side==='buy'&&!account.error)return <div className="public-purchase-opening">
    <h1 className="sheet-hero">Buy ownership.</h1>
    <AmountInput label="Purchase amount" value={budget} onChange={setBudget} dollars/>
    <p className="body-copy small-copy" role="status">Preparing your payment…</p>
    <p className="body-copy small-copy">Your device-held account opens here. You review the amount before any payment. <a href="/learn/account-access/">Account access</a></p>
  </div>;
  if (!account.identity) return <Entrance opening={account.opening} openingStage={account.openingStage} busy={account.busy} error={account.error} onCreate={account.create} onImport={account.importId}/>;
  const funding = request.side === 'buy' && (step === 'fund' || step === null && (request.resumeSessionId || account.wallet?.totalUsdCents === '0'));
  const refresh = () => {void account.refresh();};
  if (funding) return <LiveDeposit identity={account.identity} onRefresh={refresh} onClose={() => setStep('trade')} resumeSessionId={request.resumeSessionId} funding={{initialAmount: budget, onBack: () => setStep('trade'), onCheckout: checkout => retainPublicPurchase(request, checkout, 'deposit'), onCredited: checkout => {
    retainPublicPurchase(request, checkout, 'trade'); setBudget(publicPurchaseBudget(checkout)); setStep('trade');
  }}}/>;
  return <LiveMarketTrade identity={account.identity} marketItemId={request.itemId} side={request.side} onRefresh={refresh} initialBudget={budget} onFundingRequested={request.side === 'buy' ? amount => {setBudget(amount); setStep('fund');} : undefined}/>;
}

/** Mounted once by BankApp, underneath its sole useNativeAccount owner. */
export function PublicAssetTradePortal({account, fallback = null}: {account: PublicTradeAccount; fallback?: ReactNode}) {
  const request = useSyncExternalStore(subscribePublicAssetTrade, readPublicAssetTrade, () => null);
  if (!request?.slot) return fallback;
  return createPortal(<PublicAssetTradeFlow key={request.id} request={request} account={account}/>, request.slot);
}
