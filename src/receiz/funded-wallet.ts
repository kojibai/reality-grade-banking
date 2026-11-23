import { createLocalFinancialSession, type LocalFinancialSessionOptions } from './local-financial';
import type { FinancialAction, WalletRecipient } from './local-financial-runtime';

type Session = Awaited<ReturnType<typeof createLocalFinancialSession>>;
type Entry = Readonly<{ kind:'source'|'peer'; digest:string; allocationId:string }>;
type SendInput = Readonly<{ recipient:string; amountUsdCents:string; note?:string; nearby:boolean }>;
type HeldSend = Readonly<{ id:string; allocationId:string; action:Extract<FinancialAction,{kind:'send'}> }>;
type Checkpoint = Readonly<{ entries:readonly Entry[]; send:HeldSend|null }>;
const empty:Checkpoint={entries:[],send:null};
const digestPattern=/^[a-f0-9]{64}$/u;
const handle=(value:string)=>value.trim().toLowerCase().replace(/^@/u,'').replace(/\.receiz\.id$/u,'');
const actionKey=(action:HeldSend['action'])=>JSON.stringify([action.recipientUserId,action.conversationId,action.amountUsdCents,action.note??'',!!action.nearby]);

type Options=Omit<LocalFinancialSessionOptions,'sourceBytes'|'receivedWallet'|'publish'|'publishPeerRelease'>&{
  ownerKeyId:string;
  reopen(digest:string):Promise<Uint8Array>;
  retain(bytes:Uint8Array):Promise<string>;
  read():Promise<unknown>;
  save(value:Checkpoint,previous:unknown):Promise<void>;
  lock<T>(work:()=>Promise<T>):Promise<T>;
  findSource():Promise<Uint8Array|null>;
  publish(allocationId:string,batch:Parameters<LocalFinancialSessionOptions['publish']>[0]):Promise<unknown>;
  publishPeerRelease:NonNullable<LocalFinancialSessionOptions['publishPeerRelease']>;
};
export type FundedWalletReview=Readonly<{
  recipientLabel:string; amountUsdCents:string; note?:string;
  quote:Readonly<{amountPhiMicro:string;settledUsdCents:string;ecosystemUsdCents:string}>;
}>;
function exactCheckpoint(raw:unknown):Checkpoint {
  if(raw==null)return empty;
  const value=raw as Checkpoint;
  if(!Array.isArray(value.entries)||value.entries.some(entry=>!entry||!['peer','source'].includes(entry.kind)||!digestPattern.test(entry.digest)||!digestPattern.test(entry.allocationId))
    ||new Set(value.entries.map(entry=>entry.allocationId)).size!==value.entries.length||value.send!==null&&(!value.send||!value.entries.some(entry=>entry.allocationId===value.send!.allocationId)))
    throw Error('BANK_WALLET_CUSTODY_INDEX_INVALID');
  return value;
}
function boundRecipient(rows:readonly WalletRecipient[],recipient:string,nearby:boolean) {
  const matches=rows.filter(row=>(row.accountUid===recipient||handle(row.ownerReceizId)===handle(recipient))&&(!nearby||row.nearby));
  return matches.length===1?matches[0]:null;
}

export function createFundedWallet(input:Options) {
  const sessions=new Map<string,Session>();
  const reviews=new WeakMap<FundedWalletReview,{session:Session;action:HeldSend['action']}>();
  async function open(kind:Entry['kind'],bytes:Uint8Array) {
    let active:Session|undefined;
    const session=await createLocalFinancialSession({...input,
      ...(kind==='source'?{sourceBytes:bytes}:{receivedWallet:{proofBytes:bytes,ownerKeyId:input.ownerKeyId}}),
      publish:batch=>input.publish(batch.allocationId,batch),publishPeerRelease:input.publishPeerRelease,
    });
    const {allocationId}=session.sourceReference();
    active=sessions.get(allocationId);
    if(active){session.dispose();return active;}
    sessions.set(allocationId,session);
    return session;
  }
  async function restore(entry:Entry) {
    const found=sessions.get(entry.allocationId);
    if(found)return found;
    const session=await open(entry.kind,await input.reopen(entry.digest));
    if(session.sourceReference().allocationId!==entry.allocationId)throw Error('BANK_WALLET_CUSTODY_INDEX_INVALID');
    return session;
  }
  async function remember(kind:Entry['kind'],bytes:Uint8Array) {
    const session=await open(kind,bytes);
    const allocationId=session.sourceReference().allocationId;
    const raw=await input.read(),previous=exactCheckpoint(raw);
    if(!previous.entries.some(entry=>entry.allocationId===allocationId)) {
      const digest=await input.retain(bytes);
      input.assertOpen();
      await input.save({...previous,entries:[...previous.entries,{kind,digest,allocationId}]},raw);
    }
    return session;
  }
  async function current() {
    input.assertOpen();
    return exactCheckpoint(await input.read());
  }
  function resume() {
    return input.lock(async()=>{
      const state=await current();
      for(const entry of state.entries)await restore(entry);
      return state;
    });
  }
  async function warm() {
    const saved=await resume();
    if(saved.entries.some(entry=>entry.kind==='source')||!input.online())return;
    // Recovering a locally held proof never waits behind an external reader.
    const source=await input.findSource();
    if(source)await input.lock(()=>remember('source',source));
  }
  return Object.freeze({
    warm,
    resume,
    async receive(bytes:Uint8Array) {
      return input.lock(async()=>{
        const session=await remember('peer',bytes.slice());
        const {allocationId}=session.sourceReference();
        return {allocationId,wallet:await session.wallet()};
      });
    },
    async outgoing(){
      const state=await current(),send=state.send;
      if(!send)return null;
      const entry=state.entries.find(row=>row.allocationId===send.allocationId)!;
      const session=await restore(entry),commit=await session.resolve(send.id);
      if(!commit)return null;
      return {operationId:send.id,qr:send.action.nearby?await session.walletQr(send.id):null};
    },
    async completeOutgoing(operationId:string){
      return input.lock(async()=>{
        const raw=await input.read(),state=exactCheckpoint(raw),send=state.send;
        if(send?.id!==operationId)return;
        const entry=state.entries.find(row=>row.allocationId===send.allocationId)!;
        const session=await restore(entry);
        if(!await session.resolve(send.id))throw Error('BANK_WALLET_PREVIOUS_SEND_PENDING');
        await input.save({...state,send:null},raw);
      });
    },
    async availableReceipt(){
      const {entries}=await current();
      for(const entry of [...entries].reverse()){
        if(entry.kind!=='peer')continue;
        const session=await restore(entry),state=await session.current();
        if(state.state.sequence==='0'&&!state.release)return {allocationId:entry.allocationId,wallet:await session.wallet()};
      }
      return null;
    },
    async review(send:SendInput):Promise<FundedWalletReview>{
      const state=await current();
      let refusal:unknown;
      for(const entry of [...state.entries].reverse()){
        if(state.send&&entry.allocationId!==state.send.allocationId)continue;
        const session=await restore(entry),device=session.walletDevice();
        const nearby=send.nearby||entry.kind==='peer';
        if(!device)continue;
        const recipient=boundRecipient(device.recipients,send.recipient,nearby);
        if(!recipient)continue;
        const note=send.note?.replace(/\s+/gu,' ').trim();
        const action={kind:'send' as const,recipientUserId:recipient.accountUid,conversationId:recipient.conversationId,
          amountUsdCents:send.amountUsdCents,...(note?{note}:{}),...(nearby?{nearby:true as const}:{})};
        if(state.send&&actionKey(state.send.action)!==actionKey(action))throw Error('BANK_WALLET_PREVIOUS_SEND_PENDING');
        try{
          const {effect}=await session.preview(action);
          if(effect.kind!=='send'||effect.recipientOwnerReceizId!==recipient.ownerReceizId)throw Error('BANK_WALLET_RECIPIENT_MISMATCH');
          const {amountPhiMicro,settledUsdCents,ecosystemUsdCents}=effect;
          if(typeof amountPhiMicro!=='string'||typeof settledUsdCents!=='string'||typeof ecosystemUsdCents!=='string')throw Error('BANK_WALLET_QUOTE_INVALID');
          const review=Object.freeze({recipientLabel:recipient.ownerReceizId,amountUsdCents:send.amountUsdCents,note,quote:Object.freeze({amountPhiMicro,settledUsdCents,ecosystemUsdCents})});
          reviews.set(review,{session,action});
          return review;
        }catch(error){refusal=error;}
      }
      throw refusal??Error('BANK_WALLET_FUNDED_RECIPIENT_REQUIRED');
    },
    confirm(review:FundedWalletReview) {
      const held=reviews.get(review);
      if(!held)throw Error('BANK_WALLET_REVIEW_REQUIRED');
      return input.lock(async()=>{
        const raw=await input.read(),state=exactCheckpoint(raw),{allocationId}=held.session.sourceReference();
        const send=state.send??{id:crypto.randomUUID(),allocationId,action:held.action};
        if(send.allocationId!==allocationId||actionKey(send.action)!==actionKey(held.action))throw Error('BANK_WALLET_PREVIOUS_SEND_PENDING');
        if(!state.send){
          const {effect}=await held.session.preview(held.action);
          if(effect.amountPhiMicro!==review.quote.amountPhiMicro||effect.settledUsdCents!==review.quote.settledUsdCents
            ||effect.ecosystemUsdCents!==review.quote.ecosystemUsdCents)throw Error('BANK_WALLET_REVIEW_STALE');
          await input.save({...state,send},raw);
        }
        let result;
        try{result=await held.session.execute({operationId:send.id,action:send.action});}
        catch(error){
          if(error instanceof Error&&error.message==='ACCOUNT_FINANCIAL_WALLET_CUSTODY_CANCELLED_BEFORE_ASSERTION'){
            const previous=await input.read();await input.save({...exactCheckpoint(previous),send:null},previous);
          }
          throw error;
        }
        if(result.status!=='committed')throw Error('BANK_WALLET_PREVIOUS_SEND_PENDING');
        const qr=held.action.nearby?await held.session.walletQr(send.id):null;
        reviews.delete(review);
        return {qr,operationId:send.id};
      });
    },
    async release(allocationId:string) {
      const session=await input.lock(async()=>{
        const entry=(await current()).entries.find(row=>row.allocationId===allocationId&&row.kind==='peer');
        if(!entry)throw Error('BANK_WALLET_CUSTODY_REQUIRED');
        const session=await restore(entry),state=await session.current();
        if(state.state.sequence!=='0')throw Error('BANK_WALLET_ALREADY_FORWARDED');
        await session.releaseOriginal();
        return session;
      });
      return session.flush();
    },
    dispose(){for(const session of sessions.values())session.dispose();sessions.clear();},
  });
}
export type FundedWallet = ReturnType<typeof createFundedWallet>;
