import {loadReceiz} from './client';
import {parseCardCheckout,type CardCheckout,type CardDepositStatus} from './card-deposit';

type Json=Record<string,any>;
type WalletClient={request(path:string,options:{method:'GET'|'POST';body?:Record<string,unknown>}):Promise<unknown>;connect:{transfer(body:WalletTransferBody):Promise<unknown>}};
export type WalletTransferBody={conversationId:string;recipientUserId:string;unit:'usd';amountUsd:string;clientNonce:string;note?:string;noteVisibility?:'public'};
export type WalletSendQuote={amountUsdCents:string;amountPhiMicro:string;usdPerPhiMicrocents:string;settledUsdCents:string;ecosystemUsdCents:string;fundingRule:'settled_first_then_phi'};
export type WalletSendReview=Readonly<{schema:'bank.wallet-send-review.v1';ownerReceizId:string;accountUid:string;recipientUserId:string;recipientLabel:string;amountUsdCents:string;clientNonce:string;note?:string;quote:Readonly<WalletSendQuote>;digest:string}>;
type Funding={stage:'creating'|'ready'|'credited';amountUsdCents:string;checkout?:CardCheckout;refusal:{status:'not-submitted';clientNonce:string;error:'wallet_insufficient_funds'}};
export type WalletSendOutcome={status:'unknown';clientNonce:string}|{status:'recorded';clientNonce:string;transferId:string}|{status:'not-sent';clientNonce:string;reason:string}|{status:'funding';clientNonce:string;stage:Funding['stage'];amountUsdCents:string;recipientLabel:string;checkout?:CardCheckout};
type Checkpoint={review:WalletSendReview;body:WalletTransferBody;status:WalletSendOutcome['status'];record?:unknown;reason?:string;funding?:Funding};
export type WalletSendState={schema:'bank.wallet-sends.v1';authority:'wallet-observation';current:Checkpoint;history:Checkpoint[]};
const uuid=(v:unknown):v is string=>typeof v==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(v);
const integer=(v:unknown,positive=false):v is string=>typeof v==='string'&&/^(0|[1-9]\d{0,19})$/.test(v)&&(!positive||v!=='0');
const object=(v:unknown):Json=>{if(!v||typeof v!=='object'||Array.isArray(v))throw Error('BANK_WALLET_SOURCE_INVALID');return v as Json;};
const normalizeNote=(value:unknown)=>{if(value===undefined)return undefined;if(typeof value!=='string')throw Error('BANK_WALLET_NOTE_INVALID');const note=value.replace(/\s+/g,' ').trim();if(note.length>280)throw Error('Use a note of 280 characters or fewer.');return note||undefined;};
const dollars=(cents:string)=>`${BigInt(cents)/100n}.${(BigInt(cents)%100n).toString().padStart(2,'0')}`;
function quote(v:unknown,amount:string):WalletSendQuote{
 const q=object(v);for(const field of ['amountUsdCents','amountPhiMicro','usdPerPhiMicrocents','settledUsdCents','ecosystemUsdCents'])if(!integer(q[field],['amountUsdCents','amountPhiMicro','usdPerPhiMicrocents'].includes(field)))throw Error('BANK_WALLET_QUOTE_INVALID');
 if(q.amountUsdCents!==amount||q.fundingRule!=='settled_first_then_phi'||BigInt(q.settledUsdCents)+BigInt(q.ecosystemUsdCents)!==BigInt(amount)||BigInt(q.amountPhiMicro)!==(BigInt(amount)*1000000000000n+BigInt(q.usdPerPhiMicrocents)/2n)/BigInt(q.usdPerPhiMicrocents))throw Error('BANK_WALLET_QUOTE_INVALID');
 return {amountUsdCents:q.amountUsdCents,amountPhiMicro:q.amountPhiMicro,usdPerPhiMicrocents:q.usdPerPhiMicrocents,settledUsdCents:q.settledUsdCents,ecosystemUsdCents:q.ecosystemUsdCents,fundingRule:q.fundingRule};
}
function recorded(raw:unknown,c:Checkpoint){
 const r=object(raw);if(r.ok!==true||r.found!==true)throw Error('BANK_WALLET_OUTCOME_UNKNOWN');const t=object(r.transfer);
 if(!uuid(t.id)||t.clientNonce!==c.body.clientNonce||t.senderUserId!==c.review.accountUid||t.recipientUserId!==c.body.recipientUserId||t.conversationId!==c.body.conversationId||t.amountUsdCents!==c.review.amountUsdCents||!integer(t.amountPhiMicro,true)||!integer(t.usdPerPhiMicrocents,true))throw Error('BANK_WALLET_OUTCOME_MISMATCH');
 const source=object(r.source),row=object(source.transfer),message=object(source.message),original=object(message.sealed_original),receipt=object(message.receiz_receipt);
 if(!uuid(t.messageId)||row.id!==t.id||row.message_id!==t.messageId||row.client_nonce!==t.clientNonce||row.sender_user_id!==t.senderUserId||row.recipient_user_id!==t.recipientUserId||row.conversation_id!==t.conversationId||message.id!==t.messageId||message.sender_user_id!==t.senderUserId||message.conversation_id!==t.conversationId||original.primitive!=='receiz.chat.message.original.v1'||original.messageId!==t.messageId||original.conversationId!==t.conversationId||original.senderUserId!==t.senderUserId||typeof message.body!=='string'||original.body!==message.body||!['digest','payloadDigest','originDigest'].every(k=>typeof receipt[k]==='string'&&/^[a-f0-9]{64}$/.test(receipt[k])&&original[k==='digest'?'receiptDigest':k]===receipt[k]))throw Error('BANK_WALLET_ORIGINAL_UNAVAILABLE');
 for(const [field,column] of [['amountPhiMicro','amount_phi_micro'],['amountUsdCents','amount_usd_cents'],['usdPerPhiMicrocents','usd_per_phi_microcents']])if(String(row[column])!==t[field])throw Error('BANK_WALLET_OUTCOME_MISMATCH');
 for(const carried of [row.metadata,message.wallet_transfer,original.walletTransfer]){const value=object(carried);if(value.senderUserId!==t.senderUserId||value.recipientUserId!==t.recipientUserId||!['amountPhiMicro','amountUsdCents','usdPerPhiMicrocents'].every(field=>value[field]===t[field]))throw Error('BANK_WALLET_OUTCOME_MISMATCH');if(c.review.note!==undefined&&(value.note!==c.review.note||value.noteVisibility!=='public'))throw Error('BANK_WALLET_NOTE_MISMATCH');}
 return{status:'recorded' as const,clientNonce:c.body.clientNonce,transferId:t.id};
}
/** The installed SDK's connected Wallet operation. These retained HTTP originals
 * are observations, never native financial-root receipts or edge commits. */
export function createWalletSend(input:{ownerReceizId:string;assertOpen():void;assertNoOtherPending(continuingFundingNonce?:string):Promise<void>;onRecorded?(response:unknown,accountUid:string):Promise<void>;lock<T>(operation:()=>Promise<T>):Promise<T>;store:{read():Promise<unknown>;write(next:WalletSendState,previous:unknown):Promise<void>};connect(readOnly?:boolean):Promise<{client:WalletClient;accountUid:string}>;funding?:{begin(amount:string,referenceId:string):Promise<CardCheckout>;check(checkout:CardCheckout,beforeCredit:()=>Promise<void>):Promise<CardDepositStatus>}}){
 const held=new WeakSet<WalletSendReview>();
 const digest=async(value:unknown)=>(await loadReceiz()).digestReceizCanonicalV122(value);
 const withoutDigest=(r:WalletSendReview)=>Object.fromEntries(Object.entries(r).filter(([k])=>k!=='digest'));
 async function read(){
  input.assertOpen();const raw=await input.store.read();input.assertOpen();if(raw==null)return null;const s=object(raw);
  if(s.schema!=='bank.wallet-sends.v1'||s.authority!=='wallet-observation'||!Array.isArray(s.history)||s.history.length>1000)throw Error('BANK_WALLET_CHECKPOINT_INVALID');
  for(const item of [...s.history,s.current]){const c=object(item),r=object(c.review) as WalletSendReview,b=object(c.body);
   if(r.schema!=='bank.wallet-send-review.v1'||r.ownerReceizId!==input.ownerReceizId||!uuid(r.accountUid)||!uuid(r.recipientUserId)||r.accountUid===r.recipientUserId||!uuid(r.clientNonce)||!integer(r.amountUsdCents,true)||r.digest!==await digest(withoutDigest(r))||!uuid(b.conversationId)||b.clientNonce!==r.clientNonce||b.recipientUserId!==r.recipientUserId||b.unit!=='usd'||b.amountUsd!==dollars(r.amountUsdCents)||Object.keys(b).sort().join('|')!==(r.note===undefined?'amountUsd|clientNonce|conversationId|recipientUserId|unit':'amountUsd|clientNonce|conversationId|note|noteVisibility|recipientUserId|unit')||normalizeNote(r.note)!==r.note||b.note!==r.note||(r.note!==undefined&&b.noteVisibility!=='public')||!['unknown','recorded','not-sent','funding'].includes(c.status))throw Error('BANK_WALLET_CHECKPOINT_INVALID');
   quote(r.quote,r.amountUsdCents);if(c.status==='recorded')recorded(c.record,c as Checkpoint);if(c.status==='not-sent'&&!['wallet_insufficient_funds','wallet_funding_changed','invalid_token','insufficient_scope','access_denied','public_note_unavailable','card_unpaid','card_expired','card_cancelled'].includes(c.reason))throw Error('BANK_WALLET_CHECKPOINT_INVALID');
   if(c.status==='funding'&&!c.funding)throw Error('BANK_WALLET_FUNDING_INVALID');
   if(c.funding){const f=object(c.funding),refusal=object(f.refusal);if(!['creating','ready','credited'].includes(f.stage)||f.amountUsdCents!==r.amountUsdCents||BigInt(r.amountUsdCents)<50n||BigInt(r.amountUsdCents)>10000000n||refusal.status!=='not-submitted'||refusal.clientNonce!==r.clientNonce||refusal.error!=='wallet_insufficient_funds')throw Error('BANK_WALLET_FUNDING_INVALID');if(f.stage!=='creating')parseCardCheckout({ok:true,checkout:{...object(f.checkout),mode:'embedded',currency:'usd'}},r.amountUsdCents);if(['unknown','recorded'].includes(c.status)&&f.stage!=='credited')throw Error('BANK_WALLET_FUNDING_INVALID');}
  }return s as WalletSendState;
 }
 const outcome=(c:Checkpoint):WalletSendOutcome=>c.status==='recorded'?recorded(c.record,c):c.status==='not-sent'?{status:'not-sent',clientNonce:c.body.clientNonce,reason:c.reason!}:c.status==='funding'?{status:'funding',clientNonce:c.body.clientNonce,stage:c.funding!.stage,amountUsdCents:c.review.amountUsdCents,recipientLabel:c.review.recipientLabel,...(c.funding!.checkout?{checkout:{...c.funding!.checkout}}:{})}:{status:'unknown',clientNonce:c.body.clientNonce};
 async function lookup(s:WalletSendState,context:Awaited<ReturnType<typeof input.connect>>,response?:unknown):Promise<WalletSendOutcome>{
  input.assertOpen();if(context.accountUid!==s.current.review.accountUid)throw Error('BANK_WALLET_IDENTITY_CHANGED');
  const raw=await context.client.request(`/api/connect/transfers?clientNonce=${encodeURIComponent(s.current.body.clientNonce)}`,{method:'GET'});input.assertOpen();
  if(object(raw).ok===true&&object(raw).found===false)return{status:'unknown',clientNonce:s.current.body.clientNonce};
  const result=recorded(raw,s.current);await input.store.write({...s,current:{...s.current,status:'recorded',record:raw}},s);input.assertOpen();try{await input.onRecorded?.(response,s.current.review.accountUid);}catch{/* The recorded payment remains terminal when its display refresh is unavailable. */}return result;
 }
 async function openFunding(s:WalletSendState):Promise<WalletSendOutcome>{
  // The saved approval retains the recipient, public note and original nonce.
  // Its reference locates the retained native checkout after interruption.
  try{
   const checkout=parseCardCheckout({ok:true,checkout:{...await input.funding!.begin(dollars(s.current.review.amountUsdCents),s.current.body.clientNonce),mode:'embedded',currency:'usd'}},s.current.review.amountUsdCents);input.assertOpen();
   const next:WalletSendState={...s,current:{...s.current,funding:{...s.current.funding!,stage:'ready',checkout}}};await input.store.write(next,s);return outcome(next.current);
  }catch{input.assertOpen();return outcome(s.current);}
 }
 async function submit(s:WalletSendState,context:Awaited<ReturnType<typeof input.connect>>):Promise<WalletSendOutcome>{
  const {body,review}=s.current;let acknowledgement:unknown;
  try{acknowledgement=review.note?await context.client.request('/api/connect/transfers/public-note',{method:'POST',body}):await context.client.connect.transfer(body);}catch(error){
   input.assertOpen();const e=error as {status?:number;payload?:Json},p=e.payload;
   const refused=['wallet_insufficient_funds','wallet_funding_changed'].includes(p?.error)&&p?.submission?.status==='not-submitted'&&p?.submission?.clientNonce===body.clientNonce;
   const denied=[401,403].includes(e.status??0)&&['invalid_token','insufficient_scope','access_denied'].includes(p?.error);
   const unavailable=!!review.note&&[404,405].includes(e.status??0);
   if(refused||denied||unavailable){
    if(refused&&p!.error==='wallet_insufficient_funds'&&input.funding&&!s.current.funding&&BigInt(review.amountUsdCents)>=50n&&BigInt(review.amountUsdCents)<=10000000n){
     const next:WalletSendState={...s,current:{...s.current,status:'funding',funding:{stage:'creating',amountUsdCents:review.amountUsdCents,refusal:{status:'not-submitted',clientNonce:body.clientNonce,error:'wallet_insufficient_funds'}}}};
     await input.store.write(next,s);input.assertOpen();return openFunding(next);
    }
    try{const reason=unavailable?'public_note_unavailable':String(p!.error);await input.store.write({...s,current:{...s.current,status:'not-sent',reason}},s);return{status:'not-sent',clientNonce:body.clientNonce,reason};}catch{/* Preserve unknown if the explicit refusal cannot be retained. */}
   }
  }
  input.assertOpen();try{return await lookup(s,context,acknowledgement);}catch{return{status:'unknown',clientNonce:body.clientNonce};}
 }
 return Object.freeze({
  async status(){const s=await read();return s?outcome(s.current):null;},
  async prepare(value:{recipient:string;amountUsdCents:string;note?:string}):Promise<WalletSendReview>{return input.lock(async()=>{
   const note=normalizeNote(value.note);await input.assertNoOtherPending();const state=await read();if(state&&['unknown','funding'].includes(state.current.status))throw Error('BANK_EXECUTION_PENDING');if(!integer(value.amountUsdCents,true))throw Error('Enter an amount greater than zero.');
   const alias=value.recipient.trim().replace(/\.receiz\.id$/i,'').replace(/^@/,'').toLowerCase();
   if(!/^[a-z0-9_]{3,24}$/.test(alias)&&!uuid(alias))throw Error('Enter a Receiz ID.');
   const context=await input.connect();input.assertOpen();if(!uuid(context.accountUid))throw Error('BANK_WALLET_IDENTITY_CHANGED');
   let userId=alias,label=alias;
   if(!uuid(alias)){const found=object(await context.client.request(`/api/chat/users/search?q=${encodeURIComponent(alias)}`,{method:'GET'}));input.assertOpen();
    const matches=found.ok===true&&Array.isArray(found.users)?found.users.filter((u:Json)=>u.kind==='user'&&typeof u.username==='string'&&u.username.toLowerCase()===alias&&uuid(u.userId)):[];
    if(matches.length!==1)throw Error('BANK_WALLET_RECIPIENT_UNAVAILABLE');userId=matches[0].userId;label=`@${matches[0].username}`;
   }
   if(userId===context.accountUid)throw Error('BANK_WALLET_RECIPIENT_UNAVAILABLE');
   const raw=object(await context.client.request(`/api/connect/transfers?amountUsd=${dollars(value.amountUsdCents)}`,{method:'GET'}));input.assertOpen();if(raw.ok!==true||raw.senderUserId!==context.accountUid)throw Error('BANK_WALLET_IDENTITY_CHANGED');if(note&&raw.capabilities?.publicTransferNotes!==true)throw Error('BANK_WALLET_PUBLIC_NOTE_UNAVAILABLE');
   const preview={schema:'bank.wallet-send-review.v1' as const,ownerReceizId:input.ownerReceizId,accountUid:context.accountUid,recipientUserId:userId,recipientLabel:label,amountUsdCents:value.amountUsdCents,clientNonce:crypto.randomUUID(),...(note?{note}:{}),quote:Object.freeze(quote(raw.quote,value.amountUsdCents))};
   const review=Object.freeze({...preview,digest:await digest(preview)});input.assertOpen();held.add(review);return review;
  });},
  async execute(review:WalletSendReview,confirmation:string):Promise<WalletSendOutcome>{return input.lock(async()=>{
   input.assertOpen();if(!held.has(review)||confirmation!==review.digest)throw Error('BANK_WALLET_EXACT_CONFIRMATION_REQUIRED');await input.assertNoOtherPending();const previous=await read();if(previous&&['unknown','funding'].includes(previous.current.status))throw Error('BANK_EXECUTION_PENDING');
   const context=await input.connect();input.assertOpen();if(context.accountUid!==review.accountUid)throw Error('BANK_WALLET_IDENTITY_CHANGED');
   const response=object(await context.client.request('/api/chat/conversations',{method:'POST',body:{kind:'dm',participantUserIds:[review.recipientUserId],participantEmails:[],aiAgentIds:[],defaultAiId:null,title:null}}));input.assertOpen();
   if(response.ok!==true||!uuid(response.conversation?.id))throw Error('BANK_WALLET_RECIPIENT_UNAVAILABLE');
   const body:WalletTransferBody={conversationId:response.conversation.id,recipientUserId:review.recipientUserId,unit:'usd',amountUsd:dollars(review.amountUsdCents),clientNonce:review.clientNonce,...(review.note?{note:review.note,noteVisibility:'public' as const}:{})};
   const next:WalletSendState={schema:'bank.wallet-sends.v1',authority:'wallet-observation',current:{review,body,status:'unknown'},history:previous?[...previous.history,previous.current]:[]};if(next.history.length>1000)throw Error('BANK_WALLET_CAPACITY');
   await input.store.write(next,previous);input.assertOpen();held.delete(review);
   return submit(next,context);
  });},
  async resumeFunding():Promise<WalletSendOutcome|null>{return input.lock(async()=>{
   let s=await read();if(!s)return null;if(s.current.status!=='funding')return outcome(s.current);if(!input.funding)throw Error('BANK_WALLET_FUNDING_UNAVAILABLE');
   await input.assertNoOtherPending(s.current.body.clientNonce);
   const context=await input.connect();input.assertOpen();if(context.accountUid!==s.current.review.accountUid)throw Error('BANK_WALLET_IDENTITY_CHANGED');
   if(s.current.funding!.stage==='creating')return openFunding(s);
   if(s.current.funding!.stage==='ready'){
    let credited=false;
    const status=await input.funding.check(s.current.funding!.checkout!,async()=>{
     input.assertOpen();const next:WalletSendState={...s!,current:{...s!.current,funding:{...s!.current.funding!,stage:'credited'}}};await input.store.write(next,s);s=next;credited=true;
    });input.assertOpen();
    if(status.status!=='credited'){
     if(status.status==='expired'||status.status==='unpaid'){const next:WalletSendState={...s,current:{...s.current,status:'not-sent',reason:`card_${status.status}`}};await input.store.write(next,s);return outcome(next.current);}
     return outcome(s.current);
    }
    if(!credited)throw Error('BANK_WALLET_FUNDING_CREDIT_NOT_RETAINED');
   }
   const next:WalletSendState={...s,current:{...s.current,status:'unknown'}};await input.store.write(next,s);input.assertOpen();return submit(next,context);
  });},
  async cancelFunding():Promise<void>{return input.lock(async()=>{const s=await read();if(!s||s.current.status!=='funding')throw Error('BANK_WALLET_FUNDING_NOT_PENDING');await input.store.write({...s,current:{...s.current,status:'not-sent',reason:'card_cancelled'}},s);});},
  async resolve(approved=false):Promise<WalletSendOutcome|null>{return input.lock(async()=>{const s=await read();if(!s)return null;if(s.current.status!=='unknown')return outcome(s.current);if(!approved)throw Error('BANK_WALLET_RECOVERY_CONSENT_REQUIRED');return lookup(s,await input.connect(true));});},
  async exportRecord(){const s=await read();if(!s||s.current.status!=='recorded')throw Error('BANK_WALLET_RECORDED_RESULT_REQUIRED');return{bytes:new TextEncoder().encode(JSON.stringify({schema:s.schema,authority:s.authority,current:s.current})),filename:`wallet-${s.current.body.clientNonce}.receiz-wallet-observation.json`};},
  discard(review:WalletSendReview){held.delete(review);},
 });
}
export type WalletSend=ReturnType<typeof createWalletSend>;
