import {useEffect,useLayoutEffect,useRef,useState,useSyncExternalStore,type ReactNode} from 'react';
import {createPortal} from 'react-dom';
import {Entrance} from '../identity/Entrance';
import {LiveDeposit} from '../deposit/LiveDeposit';
import {LiveMarketTrade} from './LiveMarketTrade';
import {connectPublicAssetTrade, readPublicAssetTrade, subscribePublicAssetTrade, type PublicAssetTradeRequest} from '../../receiz/public-asset-trade';
import type {useNativeAccount} from '../../receiz/useNativeAccount';
import {publicPurchaseBudget, retainPublicPurchase} from '../../receiz/public-purchase-checkpoint';
import {AmountInput} from '../../components/AmountInput';
import {BuyAmountPresets} from './TradeAmountPresets';
import {approveFundedPurchase,confirmPurchaseFunding,type FundedPurchaseApproval} from '../../receiz/funded-purchase';
export type PublicTradeAccount = Pick<ReturnType<typeof useNativeAccount>, 'identity' | 'wallet' | 'opening' | 'openingStage' | 'busy' | 'error' | 'create' | 'importId' | 'refresh'>;

function PublicAssetTradeFlow({request, account}: {request: PublicAssetTradeRequest; account: PublicTradeAccount}) {
  const [step, setStep] = useState<'fund' | 'trade' | null>(request.resumeTradeReview ? 'trade' : null), [budget, setBudget] = useState(request.initialBudget ?? '');
  const requestedAccount=useRef(false),purchaseApproval=useRef<FundedPurchaseApproval|null>(null);
  const [approvedPurchase,setApprovedPurchase]=useState<FundedPurchaseApproval|undefined>();
  // A retained checkout keeps its recovery path. Otherwise the already-loaded
  // balance only selects the initial view; Market still authorizes the trade.
  // Missing balance data is not evidence that an account needs card funding.
  const startWithCard=request.side==='buy'&&(Boolean(request.resumeSessionId)||account.wallet?.totalUsdCents==='0');
  useLayoutEffect(()=>{if(account.identity&&step===null)setStep(startWithCard?'fund':'trade');},[account.identity,step,startWithCard]);
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
    <BuyAmountPresets value={budget} onChange={setBudget}/>
    <p className="body-copy small-copy" role="status">Preparing your payment…</p>
    <p className="body-copy small-copy">Your device-held account opens here. You review the amount before any payment. <a href="/learn/account-access/">Account access</a></p>
  </div>;
  if (!account.identity) return <Entrance opening={account.opening} openingStage={account.openingStage} busy={account.busy} error={account.error} onCreate={account.create} onImport={account.importId}/>;
  const funding = request.side === 'buy' && (step==='fund'||step===null&&startWithCard);
  const refresh = () => {void account.refresh();};
  if (funding) return <LiveDeposit identity={account.identity} onRefresh={refresh} onClose={() => setStep('trade')} resumeSessionId={request.resumeSessionId} funding={{initialAmount: budget,purchase:{itemId:request.itemId,title:request.title}, onBack: amount => {setBudget(amount);setStep('trade');}, onCheckout: checkout => {purchaseApproval.current=null;retainPublicPurchase(request, checkout, 'deposit');},onPurchaseApproved:checkout=>{purchaseApproval.current=approveFundedPurchase(account.identity!,request.itemId,checkout);}, onCredited: checkout => {
    if(purchaseApproval.current){confirmPurchaseFunding(purchaseApproval.current,account.identity!,checkout);setApprovedPurchase(purchaseApproval.current);}
    retainPublicPurchase(request, checkout, 'trade'); setBudget(publicPurchaseBudget(checkout)); setStep('trade');
  }}}/>;
  return <LiveMarketTrade identity={account.identity} marketItemId={request.itemId} side={request.side} onRefresh={refresh} initialBudget={budget} approvedPurchase={approvedPurchase} onInsufficientFunds={request.side === 'buy' ? amount => {purchaseApproval.current=null;setApprovedPurchase(undefined);setBudget(amount); setStep('fund');} : undefined}/>;
}

/** Mounted once by BankApp, underneath its sole useNativeAccount owner. */
export function PublicAssetTradePortal({account, fallback = null}: {account: PublicTradeAccount; fallback?: ReactNode}) {
  const request = useSyncExternalStore(subscribePublicAssetTrade, readPublicAssetTrade, () => null);
  if (!request?.slot) return fallback;
  return createPortal(<PublicAssetTradeFlow key={request.id} request={request} account={account}/>, request.slot);
}
