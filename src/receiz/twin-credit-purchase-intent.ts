import {creditFundingDollars,readTwinCreditFunding,type TwinCreditFunding} from './twin-credit-funding';
import type {TwinUpgradeInput,TwinUpgradeResult} from './twin-upgrade';

/** Encrypted coordination beneath the existing native quote/debit/grant. This
 * retains approved recovery coordinates; its stage never proves payment. */
export type TwinCreditPurchaseIntent={schema:'bank.twin-credit-purchase-intent.v1';ownerUid:string;identityDigest:string;operationId:string;quote:TwinCreditFunding['quote'];stage:'dispatching'|'unknown'};
export function readTwinCreditPurchaseIntent(value:unknown,identityDigest:string,ownerUid?:string):TwinCreditPurchaseIntent|null{
 if(value===null)return null;
 const intent=value as TwinCreditPurchaseIntent;
 if(!intent||typeof intent!=='object'||Object.keys(intent).sort().join('|')!=='identityDigest|operationId|ownerUid|quote|schema|stage'||intent.schema!=='bank.twin-credit-purchase-intent.v1'||intent.identityDigest!==identityDigest||typeof intent.ownerUid!=='string'||!intent.ownerUid||ownerUid!==undefined&&intent.ownerUid!==ownerUid||!['dispatching','unknown'].includes(intent.stage)||typeof intent.operationId!=='string'||!/^[A-Za-z0-9][A-Za-z0-9_-]{7,79}$/.test(intent.operationId))throw Error('BANK_CREDIT_INTENT_CHANGED');
 readTwinCreditFunding({quote:intent.quote},intent.ownerUid,intent.operationId);
 return intent;
}
export function twinCreditPurchaseIntent(ownerUid:string,identityDigest:string,operationId:string,quote:TwinCreditFunding['quote']):TwinCreditPurchaseIntent{
 const intent:TwinCreditPurchaseIntent={schema:'bank.twin-credit-purchase-intent.v1',ownerUid,identityDigest,operationId,quote:structuredClone(quote),stage:'dispatching'};
 return readTwinCreditPurchaseIntent(intent,identityDigest,ownerUid)!;
}
export function sameTwinCreditQuote(left:unknown,right:unknown):boolean{
 if(!left||!right||typeof left!=='object'||typeof right!=='object')return false;
 const a=left as Record<string,unknown>,b=right as Record<string,unknown>,keys=Object.keys(a).sort();
 return keys.join('|')===Object.keys(b).sort().join('|')&&keys.every(key=>a[key]===b[key]);
}
export type RecoveredTwinCreditPurchase={operationId:string;amountUsd:string;funding:TwinCreditFunding};
/** The caller holds the existing account/Notes locks. Native GET/POST is the
 * only outcome source; storage cannot label an intent paid or grant credits. */
export function createTwinCreditPurchaseCoordination(input:{ownerUid:string;identityDigest:string;read():Promise<unknown>;write(next:TwinCreditPurchaseIntent|null,previous:unknown):Promise<void>;request(value:Extract<TwinUpgradeInput,{action:'credits-purchase'|'credits-purchase-status'}>):Promise<TwinUpgradeResult>;onCompleted?(result:TwinUpgradeResult):Promise<void>}){
 const pending=async()=>readTwinCreditPurchaseIntent(await input.read(),input.identityDigest,input.ownerUid);
 function funding(result:TwinUpgradeResult,operationId:string){if(result.accountUid!==input.ownerUid)throw Error('BANK_CREDIT_INTENT_CHANGED');return readTwinCreditFunding(result.creditFunding,input.ownerUid,operationId);}
 async function observe(operationId:string,result:TwinUpgradeResult){
  const source=funding(result,operationId),held=await pending();
  if(held?.operationId===operationId){
   if(!sameTwinCreditQuote(held.quote,source.quote))throw Error('BANK_CREDIT_INTENT_CHANGED');
   // quote_expired is definitive only with the native quote-row serialization
   // and post-wallet-lock clock_timestamp lease check in the paired migration.
   if(source.purchase?.status==='completed'||source.purchase?.status==='quote_expired')await input.write(null,held);
  }
  if(source.purchase?.status==='completed')await input.onCompleted?.(result);
  return result;
 }
 async function status(operationId:string,fundingMode?:'balance'){const held=await pending();const mode=held?.quote.schema==='receiz.usage.balance-purchase.quote.v1'?'balance':held?undefined:fundingMode;return observe(operationId,await input.request({...(mode?{fundingMode:mode}:{}),action:'credits-purchase-status',operationId}));}
 async function execute(operationId:string,fundingMode?:'balance'){
  const held=await pending();if(held&&held.operationId!==operationId)throw Error('BANK_EXECUTION_PENDING');
  const checked=await status(operationId,fundingMode),source=funding(checked,operationId);
  if(source.purchase?.status!=='ready')return checked;
  const current=await pending();if(current&&current.operationId!==operationId)throw Error('BANK_EXECUTION_PENDING');
  if(current&&!sameTwinCreditQuote(current.quote,source.quote))throw Error('BANK_CREDIT_INTENT_CHANGED');
  const intent=current?{...current,stage:'dispatching' as const}:twinCreditPurchaseIntent(input.ownerUid,input.identityDigest,operationId,source.quote);
  await input.write(intent,current);
  try{return await observe(operationId,await input.request({action:'credits-purchase',operationId,...(source.quote.schema==='receiz.usage.balance-purchase.quote.v1'?{fundingMode:'balance' as const}:{})}));}
  catch(cause){await input.write({...intent,stage:'unknown'},intent).catch(()=>{});throw cause;}
 }
 async function recover():Promise<RecoveredTwinCreditPurchase|null>{
  const held=await pending();if(!held)return null;
  const result=await status(held.operationId);
  return{operationId:held.operationId,amountUsd:creditFundingDollars(held.quote.amountUsdCents),funding:funding(result,held.operationId)};
 }
 return{execute,status,recover};
}
