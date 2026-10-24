import {useRef,useState} from 'react';
import type {OpenIdentity} from '../../receiz/native-identity';
import type {SharedWallet} from '../../receiz/shared-wallet';
import type {PublicAssetTradeIntent} from '../../receiz/public-asset-trade';
import {retainedPublicAsset} from '../../receiz/public-asset-page';
import {publicPurchaseBudget,retainPublicPurchase} from '../../receiz/public-purchase-checkpoint';
import {approveFundedPurchase,confirmPurchaseFunding,type FundedPurchaseApproval} from '../../receiz/funded-purchase';
import {LiveOwnership} from '../assets/LiveOwnership';
import {LiveDeposit} from '../deposit/LiveDeposit';
import {LiveMarketTrade} from './LiveMarketTrade';

/** One purchase/funding path for signed-in Market and public asset entry.
 * Retained balance selects the first screen; Market still authorizes a trade. */
export function MarketTradeFlow({intent,identity,wallet,onRefresh}:{intent:PublicAssetTradeIntent;identity:OpenIdentity;wallet:SharedWallet|null;onRefresh():void}){
 // Missing balance data is not evidence that card funding is needed. Choose
 // from held data once; later balance refreshes must not reset an active trade.
 const [step,setStep]=useState<'fund'|'trade'>(()=>!intent.resumeTradeReview&&intent.side==='buy'&&(Boolean(intent.resumeSessionId)||wallet?.totalUsdCents==='0')?'fund':'trade'),[budget,setBudget]=useState(intent.initialBudget??'');
 const purchaseApproval=useRef<FundedPurchaseApproval|null>(null),[approvedPurchase,setApprovedPurchase]=useState<FundedPurchaseApproval|undefined>();
 const native=retainedPublicAsset(intent.itemId)?.nativeAsset;
 if(native)return <LiveOwnership identity={identity} mode={intent.side} initialDigest={native.headSourceSha256} nativeAssetId={native.id} onRefresh={onRefresh}/>;
 const funding=intent.side==='buy'&&step==='fund';
 if(funding)return <LiveDeposit identity={identity} onRefresh={onRefresh} onClose={()=>setStep('trade')} resumeSessionId={intent.resumeSessionId} funding={{initialAmount:budget,purchase:{itemId:intent.itemId,title:intent.title},onBack:amount=>{setBudget(amount);setStep('trade');},onCheckout:checkout=>{purchaseApproval.current=null;retainPublicPurchase(intent,checkout,'deposit');},onPurchaseApproved:checkout=>{purchaseApproval.current=approveFundedPurchase(identity,intent.itemId,checkout);},onCredited:checkout=>{
  if(purchaseApproval.current){confirmPurchaseFunding(purchaseApproval.current,identity,checkout);setApprovedPurchase(purchaseApproval.current);}
  retainPublicPurchase(intent,checkout,'trade');setBudget(publicPurchaseBudget(checkout));setStep('trade');
 }}}/>;
 return <LiveMarketTrade identity={identity} marketItemId={intent.itemId} side={intent.side} onRefresh={onRefresh} initialBudget={budget} approvedPurchase={approvedPurchase} onInsufficientFunds={intent.side==='buy'?amount=>{purchaseApproval.current=null;setApprovedPurchase(undefined);setBudget(amount);setStep('fund');}:undefined}/>;
}
