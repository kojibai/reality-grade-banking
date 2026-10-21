import type {OpenIdentity} from './native-identity';
import type {CardCheckout} from './card-deposit';
import type {MarketTrade,MarketTradeOutcome} from './market-trade';

declare const approvedPurchase:unique symbol;
export type FundedPurchaseApproval={readonly [approvedPurchase]:true};
type Funding=Pick<CardCheckout,'sessionId'|'amountUsdCents'>;
type Entry={identity:OpenIdentity;itemId:string;funding:Funding;credited:boolean;attempt?:Promise<MarketTradeOutcome>};
const approvals=new WeakMap<FundedPurchaseApproval,Entry>();
/** Ephemeral UI consent from the explicit Buy action, never financial proof.
 * It cannot be recovered from a public URL or sessionStorage purchase hint. */
export function approveFundedPurchase(identity:OpenIdentity,itemId:string,funding:Funding):FundedPurchaseApproval{
 if(!itemId||itemId.length>512||/[\s\x00-\x1f\x7f]/.test(itemId)||!/^cs_[a-zA-Z0-9_]{8,200}$/.test(funding.sessionId)||!/^\d{1,20}$/.test(funding.amountUsdCents)||BigInt(funding.amountUsdCents)<=0n)throw Error('BANK_PURCHASE_APPROVAL_INVALID');
 const approval=Object.freeze({})as FundedPurchaseApproval;
 approvals.set(approval,{identity,itemId,funding:{...funding},credited:false});return approval;
}
export function confirmPurchaseFunding(approval:FundedPurchaseApproval,identity:OpenIdentity,funding:Funding){
 const entry=approvals.get(approval);
 if(!entry||entry.identity!==identity||entry.funding.sessionId!==funding.sessionId||entry.funding.amountUsdCents!==funding.amountUsdCents)throw Error('BANK_PURCHASE_FUNDING_MISMATCH');
 entry.credited=true;
}
export async function completeFundedPurchase(approval:FundedPurchaseApproval,identity:OpenIdentity,itemId:string,api:MarketTrade){
 const entry=approvals.get(approval);
 if(!entry||!entry.credited||entry.identity!==identity||entry.itemId!==itemId)throw Error('BANK_PURCHASE_APPROVAL_REQUIRED');
 return entry.attempt??= (async()=>{
  const review=await api.prepare({marketItemId:itemId,side:'buy',amountUsdCents:entry.funding.amountUsdCents});
  const budget=BigInt(entry.funding.amountUsdCents),amount=`${budget/100n}.${String(budget%100n).padStart(2,'0')}`;
  const preview=(review.observation as {preview?:{settlementUsdCents?:unknown}})?.preview?.settlementUsdCents;
  if(review.body.marketItemId!==itemId||review.body.side!=='buy'||review.body.amountUsd!==amount||typeof preview!=='string'||!/^\d{1,20}$/.test(preview)||BigInt(preview)<=0n||BigInt(preview)>budget){api.discard(review);throw Error('BANK_PURCHASE_TERMS_CHANGED');}
  // The native adapter retains its exact nonce before submission, caps the
  // executed budget and resolves uncertain outcomes from the original record.
  return api.execute(review,review.digest);
 })();
}
