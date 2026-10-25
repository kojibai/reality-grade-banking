import {readFixedSale,type FixedSale} from './fixed-checkout';
import {inspectMerchantPayment,type MerchantPaymentEvidence} from './merchant-receive';
export interface MerchantSale{request:FixedSale;identityDigest:string;createdAt:string;receipts:MerchantPaymentEvidence[];}
export interface MerchantSaleArchive{request:FixedSale;identityDigest:string;createdAt:string;sourceRef:string;}
export interface MerchantCounterState{schema:'bank.merchant-counter.v1';identityDigest:string;accountUid:string;revision:number;activeSaleId:string|null;sales:MerchantSale[];archives?:MerchantSaleArchive[];}
export async function readMerchantCounterState(raw:unknown,identityDigest:string,accountUid:string):Promise<MerchantCounterState|null>{
 if(raw==null)return null;const state=raw as MerchantCounterState,fail=():never=>{throw Error('MERCHANT_STATE_INVALID');};
 if(!/^[a-f0-9]{64}$/.test(identityDigest)||state.schema!=='bank.merchant-counter.v1'||state.identityDigest!==identityDigest||state.accountUid!==accountUid||!Number.isSafeInteger(state.revision)||state.revision<0||!Array.isArray(state.sales)||state.sales.length>1000)fail();
 const ids=new Set<string>(),payments=new Set<string>();for(const sale of state.sales){
  if(!sale||sale.identityDigest!==identityDigest||!Number.isFinite(Date.parse(sale.createdAt))||!Array.isArray(sale.receipts))fail();
  const request=await readFixedSale(sale.request);if(request.recipientUserId!==accountUid||ids.has(request.saleId))fail();ids.add(request.saleId);
  for(const receipt of sale.receipts){const actual=await inspectMerchantPayment(receipt.source,request,accountUid);if(payments.has(actual.transferId)||(['transferId','clientNonce','senderUserId','recipientUserId','amountUsdCents','conversationId','messageId','recordedAt']as const).some(key=>receipt[key]!==actual[key]))fail();payments.add(actual.transferId);}
 }
 if(state.archives!==undefined&&!Array.isArray(state.archives))fail();for(const entry of state.archives??[]){
  if(!entry||entry.identityDigest!==identityDigest||!Number.isFinite(Date.parse(entry.createdAt))||!/^[a-f0-9]{64}$/.test(entry.sourceRef))fail();const request=await readFixedSale(entry.request);if(request.recipientUserId!==accountUid||ids.has(request.saleId))fail();ids.add(request.saleId);
 }
 if(state.activeSaleId!==null&&!state.sales.some(sale=>sale.request.saleId===state.activeSaleId))fail();return state;
}
