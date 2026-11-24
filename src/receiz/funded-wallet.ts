import { createLocalFinancialSession, subscribeBrowserReconnect, type LocalFinancialSessionOptions } from './local-financial';
import { createOpticalNoteFrames } from './optical-note-frames';
import type { FinancialAction, WalletRecipient } from './local-financial-runtime';

type Session = Awaited<ReturnType<typeof createLocalFinancialSession>>;
type Entry = Readonly<{ kind:'source'|'peer'; digest:string; allocationId:string; stalledSend?:HeldSend }>;
export type WalletPairOffer=Readonly<{schema:'bankeiz.wallet.offer.v1';applicationId:string;sourceArtifactSha256:string;allocationId:string;
  conversationId:string;amountUsdCents:string;recipient:string;walletCounterMode?:'device'}>;
export type WalletPairReply=Readonly<{schema:'bankeiz.wallet.answer.v1';offer:WalletPairOffer;recipientUserId:string;scannedRecipient:unknown}>;
type SendInput = Readonly<{ recipient:string; amountUsdCents:string; note?:string; nearby:boolean; paired?:WalletPairReply }>;
type HeldSend = Readonly<{ id:string; allocationId:string; action:Extract<FinancialAction,{kind:'send'}> }>;
type Checkpoint = Readonly<{ entries:readonly Entry[]; send:HeldSend|null }>;
const empty:Checkpoint={entries:[],send:null};
export const WALLET_STALE_ALLOCATION='ACCOUNT_FINANCIAL_WALLET_STALE_ALLOCATION';
export const WALLET_RECEIPT_RETENTION_REQUIRED='BANK_WALLET_RECEIPT_RETENTION_REQUIRED';
const digestPattern=/^[a-f0-9]{64}$/u;
const handle=(value:string)=>value.trim().toLowerCase().replace(/^@/u,'').replace(/\.receiz\.id$/u,'');
const actionKey=(action:HeldSend['action'])=>JSON.stringify([action.recipientUserId,action.conversationId,action.amountUsdCents,action.note??'',!!action.nearby,action.scannedRecipient??null]);

export function readWalletPairing(bytes:Uint8Array):WalletPairOffer|WalletPairReply|null{
  if(bytes[0]!==123)return null;
  const value=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
  const offer=value?.schema==='bankeiz.wallet.answer.v1'?value.offer:value;
  const uuid=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/u;
  if(!offer||Object.keys(offer).length!==(Object.hasOwn(offer,'walletCounterMode')?8:7)
    ||Object.hasOwn(offer,'walletCounterMode')&&offer.walletCounterMode!=='device'||offer.schema!=='bankeiz.wallet.offer.v1'
    ||typeof offer.applicationId!=='string'||!/^rc_[A-Za-z0-9_-]{1,128}$/u.test(offer.applicationId)
    ||typeof offer.sourceArtifactSha256!=='string'||!digestPattern.test(offer.sourceArtifactSha256)
    ||typeof offer.allocationId!=='string'||!digestPattern.test(offer.allocationId)||!uuid.test(offer.conversationId)
    ||typeof offer.amountUsdCents!=='string'||!/^[1-9][0-9]{0,17}$/u.test(offer.amountUsdCents)
    ||typeof offer.recipient!=='string'||!offer.recipient||offer.recipient.length>120)throw Error('BANK_WALLET_PAIRING_INVALID');
  if(value.schema==='bankeiz.wallet.offer.v1')return offer;
  if(value.schema==='bankeiz.wallet.answer.v1'&&Object.keys(value).length===4&&uuid.test(value.recipientUserId)&&value.scannedRecipient)return value;
  throw Error('BANK_WALLET_PAIRING_INVALID');
}

type Options=Omit<LocalFinancialSessionOptions,'sourceBytes'|'receivedWallet'|'publish'|'publishPeerRelease'>&{
  ownerKeyId:string;
  reopen(digest:string):Promise<Uint8Array>;
  retain(bytes:Uint8Array):Promise<string>;
  read():Promise<unknown>;
  save(value:Checkpoint,previous:unknown):Promise<void>;
  lock<T>(work:()=>Promise<T>):Promise<T>;
  findSource():Promise<Uint8Array|null>;
  findWalletRecovery?(reference:NonNullable<ReturnType<Session['recoveryReference']>>):Promise<Uint8Array|null>;
  publish(allocationId:string,batch:Parameters<LocalFinancialSessionOptions['publish']>[0]):Promise<unknown>;
  publishPeerRelease:NonNullable<LocalFinancialSessionOptions['publishPeerRelease']>;
  prepareOffline?(amountUsdCents?:string):Promise<Uint8Array|null>;
  setupReceiving?(mode:'unlock'|'resume'):Promise<void>;
  answerOffer?(offer:WalletPairOffer):Promise<WalletPairReply>;
};
export type FundedWalletReview=Readonly<{
  recipientLabel:string; amountUsdCents:string; note?:string;
  quote:Readonly<{amountPhiMicro:string;settledUsdCents:string;ecosystemUsdCents:string}>;
}>;
function exactCheckpoint(raw:unknown):Checkpoint {
  if(raw==null)return empty;
  const value=raw as Checkpoint;
  if(!Array.isArray(value.entries)||value.entries.some(entry=>!entry||!['peer','source'].includes(entry.kind)||!digestPattern.test(entry.digest)||!digestPattern.test(entry.allocationId)
    ||entry.stalledSend&&(entry.allocationId!==entry.stalledSend.allocationId||typeof entry.stalledSend.id!=='string'||entry.stalledSend.action?.kind!=='send'))
    ||new Set(value.entries.map(entry=>entry.allocationId)).size!==value.entries.length||value.send!==null&&(!value.send||!value.entries.some(entry=>entry.allocationId===value.send!.allocationId)))
    throw Error('BANK_WALLET_CUSTODY_INDEX_INVALID');
  return value;
}
function withoutStalledSend(entry:Entry):Entry {
  const {stalledSend:_,...opening}=entry;
  return opening;
}
function boundRecipient(rows:readonly WalletRecipient[],recipient:string,nearby:boolean) {
  const matches=rows.filter(row=>(row.accountUid===recipient||handle(row.ownerReceizId)===handle(recipient))&&(!nearby||row.nearby));
  return matches.length===1?matches[0]:null;
}

export function createFundedWallet(input:Options) {
  const sessions=new Map<string,Session>();
  const reviews=new WeakMap<FundedWalletReview,{session:Session;action:HeldSend['action']}>();
  let unlocking:Promise<void>|undefined,disposed=false;
  const recoveryInFlight=new Set<string>();
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
      if(kind==='peer'){
        // The recipient must hold a cold-readable copy of the exact payment
        // proof before this balance is offered as a received Wallet payment.
        const retained=await input.reopen(digest).catch(()=>null);
        if(!retained||retained.length!==bytes.length||retained.some((byte,index)=>byte!==bytes[index]))
          throw Error(WALLET_RECEIPT_RETENTION_REQUIRED);
      }
      input.assertOpen();
      await input.save({...previous,entries:[...previous.entries,{kind,digest,allocationId}]},raw);
    }
    return session;
  }
  async function current() {
    input.assertOpen();
    return exactCheckpoint(await input.read());
  }
  function recoverWalletProof(bytes:Uint8Array,allocationId?:string){
    const proof=bytes.slice();
    return input.lock(async()=>{
      const raw=await input.read(),state=exactCheckpoint(raw),reopened=new Set<string>();
      let recovered:number|null=null;
      for(const entry of state.entries){
        if(allocationId&&entry.allocationId!==allocationId)continue;
        const session=await restore(entry),result=await session.recoverWalletProof(proof);
        if(result===null)continue;
        recovered=(recovered??0)+result;
        // Keep any recovered, accepted send available for its receipt.
        if(result>0&&entry.stalledSend&&!await session.resolve(entry.stalledSend.id))reopened.add(entry.allocationId);
      }
      if(reopened.size)await input.save({...state,entries:state.entries.map(entry=>reopened.has(entry.allocationId)?withoutStalledSend(entry):entry)},raw);
      return recovered;
    });
  }
  function scheduleRecovery(session:Session) {
    const find=input.findWalletRecovery;
    if(!find||disposed||!input.online())return;
    const reference=session.recoveryReference(),{allocationId}=session.sourceReference();
    if(!reference||recoveryInFlight.has(allocationId))return;
    recoveryInFlight.add(allocationId);
    void Promise.resolve().then(()=>find(reference)).then(proof=>{
      if(proof&&!disposed)return recoverWalletProof(proof,allocationId);
    }).catch(()=>{}).finally(()=>{recoveryInFlight.delete(allocationId);});
  }
  async function resume() {
    const state=await input.lock(async()=>{
      const held=await current();
      for(const entry of held.entries)await restore(entry);
      return held;
    });
    for(const entry of state.entries){
      const session=sessions.get(entry.allocationId);
      if(session)scheduleRecovery(session);
    }
    return state;
  }
  const unsubscribe=input.findWalletRecovery?(input.subscribeReconnect??subscribeBrowserReconnect)(()=>{
    if(!disposed&&input.online())void resume().catch(()=>{});
  }):undefined;
  async function availableFunding(entries:readonly Entry[]){
    for(const entry of [...entries].reverse()){
      if(entry.kind!=='source'||entry.stalledSend)continue;
      const {release,state}=await (await restore(entry)).current();
      if(!release&&BigInt(state.wallet.availableUsdCents)>0n)return {allocationId:entry.allocationId};
    }
    return null;
  }
  async function restoreAndSetup(mode:'unlock'|'resume') {
    const saved=await resume();
    if(!input.online())return;
    // Recovering a locally held proof never waits behind an external reader.
    if(!await availableFunding(saved.entries)&&input.online()){
      const source=await input.findSource();
      if(source)scheduleRecovery(await input.lock(()=>remember('source',source)));
    }
    if(input.online())await input.setupReceiving?.(mode);
  }
  return Object.freeze({
    warm:()=>unlocking??restoreAndSetup('resume'),
    unlock:()=>unlocking??=(restoreAndSetup('unlock').finally(()=>{unlocking=undefined;})),
    resume,
    async prepareOffline(amountUsdCents?:string){
      if(!input.prepareOffline)throw Error('BANK_WALLET_DEVICE_REQUIRED');
      const original=await input.prepareOffline(amountUsdCents);
      if(original)await input.lock(()=>remember('source',original));
    },
    async offer(send:SendInput):Promise<WalletPairOffer|null>{
      if(!send.nearby||!/^[1-9][0-9]{0,18}$/u.test(send.amountUsdCents))return null;
      const state=await current();
      for(const entry of [...state.entries].reverse()){
        if(entry.stalledSend||state.send&&entry.allocationId!==state.send.allocationId)continue;
        const session=await restore(entry);
        const device=session.walletDevice();
        if(!device?.scanTime)continue;
        const head=await session.current();
        const available=head.state.wallet.availableUsdCents;
        if(head.release||(device.partialPayments
          ?BigInt(send.amountUsdCents)>BigInt(available)
          :head.state.sequence!=='0'||available!==send.amountUsdCents))continue;
        const sourceArtifactSha256=session.sourceReference().artifactSha256;
        const pairingKey=new TextEncoder().encode(JSON.stringify([input.applicationId,sourceArtifactSha256,entry.allocationId,send.recipient,send.amountUsdCents,
          ...(device.partialPayments?[head.headArtifactSha256]:[])]));
        const id=new Uint8Array(await crypto.subtle.digest('SHA-256',pairingKey)).slice(0,16);
        id[6]=(id[6]!&15)|0x80;id[8]=(id[8]!&63)|0x80;
        const hex=Array.from(id,byte=>byte.toString(16).padStart(2,'0')).join('');
        const conversationId=[hex.slice(0,8),hex.slice(8,12),hex.slice(12,16),hex.slice(16,20),hex.slice(20)].join('-');
        return {schema:'bankeiz.wallet.offer.v1',applicationId:input.applicationId,sourceArtifactSha256,
          allocationId:entry.allocationId,conversationId,amountUsdCents:send.amountUsdCents,recipient:send.recipient,
          ...(device.sharedWalletCounter?{walletCounterMode:'device' as const}:{})};
      }
      return null;
    },
    async answer(offer:WalletPairOffer){
      if(!input.answerOffer||offer.applicationId!==input.applicationId
        ||offer.recipient!==input.accountUid&&handle(offer.recipient)!==handle(input.ownerReceizId))throw Error('BANK_WALLET_PAIRING_INVALID');
      return input.lock(()=>input.answerOffer!(offer));
    },
    async receive(bytes:Uint8Array) {
      return input.lock(async()=>{
        const session=await remember('peer',bytes.slice());
        const {allocationId}=session.sourceReference();
        return {allocationId,wallet:await session.wallet()};
      });
    },
    recoverWalletProof:(bytes:Uint8Array)=>recoverWalletProof(bytes),
    async receiptQr(index=0){
      const entries=(await current()).entries.filter(item=>item.kind==='peer');
      const entry=entries[entries.length-1-index];
      if(!entry)return null;
      const bytes=await input.reopen(entry.digest);
      input.assertOpen();
      return createOpticalNoteFrames('wallet',bytes);
    },
    async receiptProofCount(){
      return (await current()).entries.filter(item=>item.kind==='peer').length;
    },
    async outgoing(){
      const state=await current();
      const attempts=[state.send,...state.entries.map(entry=>entry.stalledSend)];
      for(const send of attempts){
        if(!send)continue;
        const entry=state.entries.find(row=>row.allocationId===send.allocationId)!;
        const session=await restore(entry),commit=await session.resolve(send.id);
        if(commit)return {operationId:send.id,qr:send.action.nearby?await session.walletQr(send.id):null};
      }
      return null;
    },
    async completeOutgoing(operationId:string){
      return input.lock(async()=>{
        const raw=await input.read(),state=exactCheckpoint(raw),send=state.send;
        const entry=state.entries.find(row=>row.stalledSend?.id===operationId||send?.id===operationId&&row.allocationId===send.allocationId);
        if(!entry)return;
        if(!await (await restore(entry)).resolve(operationId))throw Error('BANK_WALLET_PREVIOUS_SEND_PENDING');
        const updated=send?.id===operationId?{...state,send:null}:
          {...state,entries:state.entries.map(row=>row===entry?withoutStalledSend(row):row)};
        await input.save(updated,raw);
      });
    },
    async availableReceipt(){
      const {entries}=await current();
      for(const entry of [...entries].reverse()){
        if(entry.kind!=='peer'||entry.stalledSend)continue;
        const session=await restore(entry),state=await session.current();
        if(!state.release&&(state.state.sequence==='0'||session.walletDevice()?.partialPayments)
          &&BigInt(state.state.wallet.availableUsdCents)>0n)return {allocationId:entry.allocationId,wallet:await session.wallet()};
      }
      return null;
    },
    async availableFunding(){
      return availableFunding((await current()).entries);
    },
    async review(send:SendInput):Promise<FundedWalletReview>{
      const state=await current();
      let refusal:unknown;
      for(const entry of [...state.entries].reverse()){
        if(entry.stalledSend||state.send&&entry.allocationId!==state.send.allocationId)continue;
        const session=await restore(entry),device=session.walletDevice();
        const nearby=send.nearby||entry.kind==='peer';
        if(!device)continue;
        const paired=send.paired;
        if(paired&&(!device.scanTime||paired.offer.allocationId!==entry.allocationId||paired.offer.sourceArtifactSha256!==session.sourceReference().artifactSha256
          ||paired.offer.amountUsdCents!==send.amountUsdCents||paired.offer.recipient!==send.recipient||paired.offer.applicationId!==input.applicationId
          ||(paired.offer.walletCounterMode==='device')!==!!device.sharedWalletCounter))continue;
        const recipient=paired?{accountUid:paired.recipientUserId,conversationId:paired.offer.conversationId}:boundRecipient(device.recipients,send.recipient,nearby);
        if(!recipient)continue;
        const note=send.note?.replace(/\s+/gu,' ').trim();
        const action={kind:'send' as const,recipientUserId:recipient.accountUid,conversationId:recipient.conversationId,
          amountUsdCents:send.amountUsdCents,...(note?{note}:{}),...(nearby?{nearby:true as const}:{}),...(paired?{scannedRecipient:paired.scannedRecipient}:{})};
        if(state.send&&actionKey(state.send.action)!==actionKey(action))throw Error('BANK_WALLET_PREVIOUS_SEND_PENDING');
        try{
          const {effect}=await session.preview(action);
          if(effect.kind!=='send'||typeof effect.recipientOwnerReceizId!=='string'||(paired
            ?paired.recipientUserId!==send.recipient&&handle(effect.recipientOwnerReceizId)!==handle(send.recipient)
            :effect.recipientOwnerReceizId!==('ownerReceizId' in recipient?recipient.ownerReceizId:null)))throw Error('BANK_WALLET_RECIPIENT_MISMATCH');
          const {amountPhiMicro,settledUsdCents,ecosystemUsdCents}=effect;
          if(typeof amountPhiMicro!=='string'||typeof settledUsdCents!=='string'||typeof ecosystemUsdCents!=='string')throw Error('BANK_WALLET_QUOTE_INVALID');
          const review=Object.freeze({recipientLabel:effect.recipientOwnerReceizId,amountUsdCents:send.amountUsdCents,note,quote:Object.freeze({amountPhiMicro,settledUsdCents,ecosystemUsdCents})});
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
        if(state.entries.find(entry=>entry.allocationId===allocationId)?.stalledSend)throw Error(WALLET_STALE_ALLOCATION);
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
          if(error instanceof Error&&error.message===WALLET_STALE_ALLOCATION){
            const previous=await input.read(),checkpoint=exactCheckpoint(previous);
            if(checkpoint.send?.id!==send.id)throw Error('BANK_WALLET_PREVIOUS_SEND_PENDING');
            const entries=checkpoint.entries.map(entry=>entry.allocationId===allocationId?{...entry,stalledSend:send}:entry);
            await input.save({...checkpoint,entries,send:null},previous);
          }else if(error instanceof Error&&error.message==='ACCOUNT_FINANCIAL_WALLET_CUSTODY_CANCELLED_BEFORE_ASSERTION'){
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
        const entry=(await current()).entries.find(row=>row.allocationId===allocationId);
        if(!entry)throw Error('BANK_WALLET_CUSTODY_REQUIRED');
        if(entry.stalledSend)throw Error(WALLET_STALE_ALLOCATION);
        const session=await restore(entry),state=await session.current();
        if(entry.kind==='peer'&&state.state.sequence!=='0'&&!session.walletDevice()?.partialPayments
          ||BigInt(state.state.wallet.availableUsdCents)===0n)throw Error('BANK_WALLET_ALREADY_FORWARDED');
        await session.releaseOriginal();
        return session;
      });
      return session.flush();
    },
    dispose(){disposed=true;unsubscribe?.();for(const session of sessions.values())session.dispose();sessions.clear();},
  });
}
export type FundedWallet = ReturnType<typeof createFundedWallet>;
