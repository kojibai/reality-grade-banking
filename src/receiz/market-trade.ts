import {loadReceiz} from './client';
type Json=Record<string,any>;
type MarketBody={marketItemId:string;side:'buy'|'sell';amountUsd?:string;shareQuantity?:string;clientNonce:string};
type MarketClient={request(path:string,options:{method:'GET'|'POST';body?:MarketBody}):Promise<unknown>};
export type MarketTradeInput={marketItemId:string;side:'buy'|'sell';amountUsdCents?:string;shareQuantityMicro?:string};
export type MarketTradeReview=Readonly<{schema:'bank.market-review.v1';ownerReceizId:string;accountUid:string;title:string;body:Readonly<MarketBody>;observation:unknown;digest:string}>;
export type MarketTradeOutcome={status:'not-sent';clientNonce:string;reason:string}|{status:'unknown';clientNonce:string}|{status:'recorded';clientNonce:string;tradeId:string;side:'buy'|'sell';shareQuantityMicro:string;settlementUsdCents:string};
type Checkpoint={review:MarketTradeReview;body:MarketBody;status:'unknown'|'recorded'|'not-sent';reason?:string;record?:unknown};
export type MarketTradeState={schema:'bank.market-trades.v1';authority:'market-observation';current:Checkpoint;history:Checkpoint[]};
const uuid=(v:unknown):v is string=>typeof v==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(v);
const integer=(v:unknown,positive=false):v is string=>typeof v==='string'&&/^(0|[1-9]\d{0,19})$/.test(v)&&(!positive||v!=='0');
const object=(v:unknown):Json=>{if(!v||typeof v!=='object'||Array.isArray(v))throw Error('BANK_MARKET_SOURCE_INVALID');return v as Json;};
const units=(micro:string,scale=1000000n,decimals=6)=>`${BigInt(micro)/scale}.${(BigInt(micro)%scale).toString().padStart(decimals,'0')}`;
const cents=(value:unknown)=>typeof value==='string'&&/^(0|[1-9]\d{0,15})\.\d{2}$/.test(value)?BigInt(value.replace('.','')):null;
const shares=(value:unknown)=>typeof value==='string'&&/^(0|[1-9]\d{0,11})\.\d{6}$/.test(value)?BigInt(value.replace('.','')):null;
function validateBody(body:unknown):asserts body is MarketBody{
 const b=object(body),dollars=b.amountUsd!==undefined,keys=['clientNonce','marketItemId','side',dollars?'amountUsd':'shareQuantity'].sort();
 if(typeof b.marketItemId!=='string'||!b.marketItemId.length||b.marketItemId.length>512||/[\u0000-\u0020\u007f]/.test(b.marketItemId)||!uuid(b.clientNonce)||!['buy','sell'].includes(b.side)||b.side==='buy'&&!dollars||Object.keys(b).sort().join('|')!==keys.join('|')||(dollars?!(cents(b.amountUsd)!>0n):!(shares(b.shareQuantity)!>0n)))throw Error('BANK_MARKET_REQUEST_INVALID');
}
function recorded(raw:unknown,c:Checkpoint):MarketTradeOutcome{
 const r=object(raw),source=object(r.source),t=object(source.trade),p=object(source.position),b=c.body;
 if(r.ok!==true||r.authority!=='market-observation'||r.found!==true||r.recorded!==true||r.actorUserId!==c.review.accountUid)throw Error('BANK_MARKET_OUTCOME_MISMATCH');
 if(b.amountUsd!==undefined&&object(t.metadata).budgetUsdCents!==String(cents(b.amountUsd)))throw Error('BANK_MARKET_OUTCOME_MISMATCH');
 if(!uuid(t.id)||t.owner_user_id!==c.review.accountUid||t.client_nonce!==b.clientNonce||t.market_item_id!==b.marketItemId||t.market_type!=='asset'||t.side!==b.side||!uuid(t.position_id)||p.id!==t.position_id||p.owner_user_id!==c.review.accountUid||p.market_item_id!==b.marketItemId||!integer(p.share_quantity_micro)||!integer(t.share_quantity_micro,true)||!integer(t.settlement_usd_cents,true)||!integer(t.notional_usd_cents,true)||!integer(t.notional_phi_micro,true)||!integer(t.fee_usd_cents))throw Error('BANK_MARKET_OUTCOME_MISMATCH');
 if(b.amountUsd!==undefined?BigInt(t.settlement_usd_cents)>cents(b.amountUsd)!:BigInt(t.share_quantity_micro)!==shares(b.shareQuantity))throw Error('BANK_MARKET_OUTCOME_MISMATCH');
 if(b.side==='sell'&&b.amountUsd!==undefined){const owned=object(object(c.review.observation).position);if(!integer(owned.share_quantity_micro,true)||BigInt(t.share_quantity_micro)>BigInt(owned.share_quantity_micro))throw Error('BANK_MARKET_OUTCOME_MISMATCH');}
 if(!Array.isArray(source.ledgerEntries)||source.ledgerEntries.length!==1)throw Error('BANK_MARKET_ORIGINAL_UNAVAILABLE');const l=object(source.ledgerEntries[0]);
 if(!uuid(l.id)||l.user_id!==c.review.accountUid||l.idempotency_key!==`market_trade:${b.side}:${b.clientNonce}`||l.entry_kind!==`market_${b.side}`||l.direction!==(b.side==='buy'?'debit':'credit')||l.amount_usd_cents!==t.settlement_usd_cents||l.amount_phi_micro!==t.notional_phi_micro)throw Error('BANK_MARKET_ORIGINAL_UNAVAILABLE');
 return{status:'recorded',clientNonce:b.clientNonce,tradeId:t.id,side:b.side,shareQuantityMicro:t.share_quantity_micro,settlementUsdCents:t.settlement_usd_cents};
}
export async function validateMarketTradeState(raw:unknown,ownerReceizId?:string):Promise<MarketTradeState|null>{
 if(raw==null)return null;const s=object(raw),digest=async(value:unknown)=>(await loadReceiz()).digestReceizCanonicalV122(value);
 if(s.schema!=='bank.market-trades.v1'||s.authority!=='market-observation'||!Array.isArray(s.history)||s.history.length>1000)throw Error('BANK_MARKET_CHECKPOINT_INVALID');
 for(const item of [...s.history,s.current]){const c=object(item),r=object(c.review) as MarketTradeReview;validateBody(c.body);validateBody(r.body);
  if(r.schema!=='bank.market-review.v1'||typeof r.ownerReceizId!=='string'||(ownerReceizId!==undefined&&r.ownerReceizId!==ownerReceizId)||!uuid(r.accountUid)||r.digest!==await digest(Object.fromEntries(Object.entries(r).filter(([k])=>k!=='digest')))||await digest(c.body)!==await digest(r.body)||!['unknown','recorded','not-sent'].includes(c.status))throw Error('BANK_MARKET_CHECKPOINT_INVALID');
  if(c.status==='recorded')recorded(c.record,c as Checkpoint);if(c.status==='not-sent'&&!['invalid_token','insufficient_scope','access_denied'].includes(c.reason))throw Error('BANK_MARKET_CHECKPOINT_INVALID');
 }return s as MarketTradeState;
}
/** Connected Market observations retain original transaction rows. They are not
 * native receipts and do not establish irreversible Offline Note custody. */
export function createMarketTrade(input:{ownerReceizId:string;assertOpen():void;assertNoOtherPending():Promise<void>;onRecorded?(accountUid:string):Promise<void>;lock<T>(operation:()=>Promise<T>):Promise<T>;store:{read():Promise<unknown>;write(next:MarketTradeState,previous:unknown):Promise<void>};connect(readOnly?:boolean):Promise<{client:MarketClient;accountUid:string}>}){
 const held=new WeakSet<MarketTradeReview>(),digest=async(value:unknown)=>(await loadReceiz()).digestReceizCanonicalV122(value);
 const unsigned=(r:MarketTradeReview)=>Object.fromEntries(Object.entries(r).filter(([k])=>k!=='digest'));
 async function read(){input.assertOpen();const raw=await input.store.read();input.assertOpen();return validateMarketTradeState(raw,input.ownerReceizId);}

 const outcome=(c:Checkpoint):MarketTradeOutcome=>c.status==='recorded'?recorded(c.record,c):c.status==='not-sent'?{status:'not-sent',clientNonce:c.body.clientNonce,reason:c.reason!}:{status:'unknown',clientNonce:c.body.clientNonce};
 async function retainRecorded(s:MarketTradeState,raw:unknown,result:MarketTradeOutcome){await input.store.write({...s,current:{...s.current,status:'recorded',record:raw}},s);input.assertOpen();try{await input.onRecorded?.(s.current.review.accountUid);}catch{/* Terminal original retained even when refresh fails. */}return result;}
 async function lookup(s:MarketTradeState,context:Awaited<ReturnType<typeof input.connect>>){input.assertOpen();if(context.accountUid!==s.current.review.accountUid)throw Error('BANK_MARKET_IDENTITY_CHANGED');const raw=object(await context.client.request(`/api/connect/market/shares/trade?clientNonce=${encodeURIComponent(s.current.body.clientNonce)}`,{method:'GET'}));input.assertOpen();
  if(raw.ok===true&&raw.authority==='market-observation'&&raw.actorUserId===context.accountUid&&(raw.found===false||raw.recorded===false))return outcome(s.current);
  return retainRecorded(s,raw,recorded(raw,s.current));
 }
 return Object.freeze({
  async status(){const s=await read();return s?outcome(s.current):null;},
  async prepare(value:MarketTradeInput):Promise<MarketTradeReview>{return input.lock(async()=>{await input.assertNoOtherPending();const previous=await read();if(previous?.current.status==='unknown')throw Error('BANK_EXECUTION_PENDING');
   if(value.amountUsdCents!==undefined&&value.shareQuantityMicro!==undefined)throw Error('BANK_MARKET_REQUEST_INVALID');
   const dollars=value.side==='buy'||value.amountUsdCents!==undefined;
   const body:MarketBody={marketItemId:value.marketItemId,side:value.side,clientNonce:crypto.randomUUID(),...(dollars?{amountUsd:integer(value.amountUsdCents,true)?units(value.amountUsdCents,100n,2):''}:{shareQuantity:integer(value.shareQuantityMicro,true)?units(value.shareQuantityMicro):''})};validateBody(body);
   const context=await input.connect(true);input.assertOpen();if(!uuid(context.accountUid))throw Error('BANK_MARKET_IDENTITY_CHANGED');const query=new URLSearchParams({marketItemId:body.marketItemId,side:body.side,...(dollars?{amountUsd:body.amountUsd!}:{shareQuantity:body.shareQuantity!})});
   let raw:unknown;
   try{raw=await context.client.request(`/api/connect/market/shares/quote?${query}`,{method:'GET'});}catch(cause){const error=cause as {status?:number;payload?:Json};if(body.side==='sell'&&dollars&&error.status===400&&error.payload?.error==='market_invalid_amount')throw Object.assign(Error('BANK_MARKET_DOLLAR_SALE_UNAVAILABLE'),{status:400});throw cause;}
   const observation=object(raw);input.assertOpen();const request=object(observation.request),preview=object(observation.preview);
   if(observation.ok!==true||observation.authority!=='market-observation'||observation.actorUserId!==context.accountUid||request.marketItemId!==body.marketItemId||request.side!==body.side||(dollars?request.amountUsd!==body.amountUsd:request.shareQuantity!==body.shareQuantity)||object(observation.quote).binding!=='advisory'||object(observation.item).id!==body.marketItemId||!integer(preview.shareQuantityMicro,true)||!integer(preview.settlementUsdCents,true))throw Error('BANK_MARKET_QUOTE_INVALID');
   if(body.side==='sell'&&dollars){const position=object(observation.position);if(position.owner_user_id!==context.accountUid||position.market_item_id!==body.marketItemId||!integer(position.share_quantity_micro,true)||BigInt(preview.shareQuantityMicro)>BigInt(position.share_quantity_micro)||BigInt(preview.settlementUsdCents)>cents(body.amountUsd)!)throw Error('BANK_MARKET_QUOTE_INVALID');}
   const valueToHold={schema:'bank.market-review.v1' as const,ownerReceizId:input.ownerReceizId,accountUid:context.accountUid,title:String(observation.item.title??'Proof object').slice(0,200),body:Object.freeze(body),observation};const review=Object.freeze({...valueToHold,digest:await digest(valueToHold)});input.assertOpen();held.add(review);return review;
  });},
  async execute(review:MarketTradeReview,confirmation:string):Promise<MarketTradeOutcome>{return input.lock(async()=>{input.assertOpen();if(!held.has(review)||confirmation!==review.digest||review.digest!==await digest(unsigned(review)))throw Error('BANK_MARKET_EXACT_CONFIRMATION_REQUIRED');await input.assertNoOtherPending();const previous=await read();if(previous?.current.status==='unknown')throw Error('BANK_EXECUTION_PENDING');
   const context=await input.connect();input.assertOpen();if(context.accountUid!==review.accountUid)throw Error('BANK_MARKET_IDENTITY_CHANGED');const next:MarketTradeState={schema:'bank.market-trades.v1',authority:'market-observation',current:{review,body:{...review.body},status:'unknown'},history:previous?[...previous.history,previous.current]:[]};if(next.history.length>1000)throw Error('BANK_MARKET_CAPACITY');await input.store.write(next,previous);input.assertOpen();held.delete(review);
   let returned:unknown;
   try{returned=await context.client.request('/api/connect/market/shares/trade',{method:'POST',body:{...next.current.body}});}catch(cause){
    input.assertOpen();const e=cause as {status?:number;payload?:Json};if([401,403].includes(e.status??0)&&['invalid_token','insufficient_scope','access_denied'].includes(e.payload?.error)){try{const reason=String(e.payload!.error);await input.store.write({...next,current:{...next.current,status:'not-sent',reason}},next);return{status:'not-sent',clientNonce:next.current.body.clientNonce,reason};}catch{/* Keep unknown when the terminal refusal cannot be retained. */}}
   }input.assertOpen();
   // The normal POST already carries the exact original rows. Admit them with
   // the same binding and durable retention as recovery, without another read.
   let result:MarketTradeOutcome|undefined;try{result=recorded(returned,next.current);}catch{/* Missing or mismatching originals still need the read route. */}
   if(result){try{return await retainRecorded(next,returned,result);}catch{return outcome(next.current);}}
   try{return await lookup(next,context);}catch{return outcome(next.current);}
  });},
  async resolve(approved=false):Promise<MarketTradeOutcome|null>{return input.lock(async()=>{const s=await read();if(!s)return null;if(s.current.status!=='unknown')return outcome(s.current);if(!approved)throw Error('BANK_MARKET_RECOVERY_CONSENT_REQUIRED');return lookup(s,await input.connect(true));});},
  async exportRecord(){const s=await read();if(!s||s.current.status!=='recorded')throw Error('BANK_MARKET_RECORDED_RESULT_REQUIRED');return{bytes:new TextEncoder().encode(JSON.stringify({schema:s.schema,authority:s.authority,current:s.current})),filename:`market-${s.current.body.clientNonce}.receiz-market-observation.json`};},
  discard(review:MarketTradeReview){held.delete(review);},
 });
}
export type MarketTrade=ReturnType<typeof createMarketTrade>;
