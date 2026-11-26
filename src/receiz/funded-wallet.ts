import { createLocalFinancialSession, loadLocalFinancialRuntime, subscribeBrowserReconnect, type LocalFinancialSessionOptions, type WalletRecoveryFreshness, type WalletRecoveryFile } from './local-financial';
import { createOpticalNoteFrames } from './optical-note-frames';
import type { FinancialAction, WalletRecipient, WalletPaymentStage } from './local-financial-runtime';
import { encodeWalletPaymentBundle, readWalletPaymentBundle, walletPaymentConversation, walletPaymentHash, walletPaymentBundleFits, type WalletPaymentPart, type WalletPaymentOpening } from './wallet-payment-bundle';

import { encodeNearbyWalletPayment, verifyNearbyWalletPayment, type NearbyWalletPayment, type NearbyWalletSplit } from './wallet-nearby-consent';

type Session = Awaited<ReturnType<typeof createLocalFinancialSession>>;
type WalletRecovery=Readonly<{count:number;freshness:WalletRecoveryFreshness}>;

function mergeWalletRecovery(results:readonly (WalletRecovery|null)[]):WalletRecovery|null{
  const accepted=results.filter(result=>result!==null);
  if(!accepted.length)return null;
  const freshness=accepted.some(result=>result.freshness==='older')?'older'
    :results.every(result=>result?.freshness==='matches-held')?'matches-held':'unconfirmed';
  return {count:accepted.reduce((sum,result)=>sum+result.count,0),freshness};
}
type Entry = Readonly<{ kind:'source'|'peer'; digest:string; allocationId:string; stalledSend?:HeldSend; receiptBundle?:string; splitPayment?:NearbyWalletPayment }>;
export type WalletPairOffer=Readonly<{schema:'bankeiz.wallet.offer.v1';applicationId:string;sourceArtifactSha256:string;allocationId:string;
  conversationId:string;amountUsdCents:string;recipient:string;walletCounterMode?:'device'}>;
export type WalletPairReply=Readonly<{schema:'bankeiz.wallet.answer.v1';offer:WalletPairOffer;recipientUserId:string;scannedRecipient:unknown}>;
type WalletBundleOffer = Readonly<{schema:'bankeiz.wallet.offer.v2';applicationId:string;conversationId:string;amountUsdCents:string;
  recipient:string;nonce:string;connectUsdCents?:string;parts:readonly WalletPaymentPart[]}>;
type WalletBundleReply = Readonly<{schema:'bankeiz.wallet.answer.v2';offer:WalletBundleOffer;recipientUserId:string;scannedRecipients:readonly unknown[]}>;
export type WalletOffer = WalletPairOffer|WalletBundleOffer;
type WalletReply = WalletPairReply|WalletBundleReply;
type SendInput = Readonly<{ recipient:string; amountUsdCents:string; note?:string; nearby:boolean; connectRemainder?:boolean; paired?:WalletReply }>;
type HeldSend = Readonly<{ id:string; allocationId:string; action:Extract<FinancialAction,{kind:'send'}>; address?:string }>;
export type WalletDestination = Readonly<{payload:Readonly<{accountUserId:string;ownerReceizId:string}>;signature:unknown}>;
type MoveBack = Readonly<{ amountUsdCents:string; items:readonly Readonly<{id:string; allocationId:string; amountUsdCents:string}>[] }>;
type HeldBundle = Readonly<{offer:WalletBundleOffer;items:readonly HeldSend[]; remainder?:NearbyWalletPayment}>;
type Checkpoint = Readonly<{ entries:readonly Entry[]; send:HeldSend|null; moveBack?:MoveBack; bundle?:HeldBundle }>;
type BundleReview = Readonly<{offer:WalletBundleOffer;actions:readonly HeldSend['action'][]}>;
const empty:Checkpoint={entries:[],send:null};
export const WALLET_STALE_ALLOCATION='ACCOUNT_FINANCIAL_WALLET_STALE_ALLOCATION';
export const WALLET_RECEIPT_RETENTION_REQUIRED='BANK_WALLET_RECEIPT_RETENTION_REQUIRED';
const digestPattern=/^[a-f0-9]{64}$/u;
const uuidPattern=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/u;
const positiveCents=/^[1-9][0-9]{0,18}$/u;
const handle=(value:string)=>value.trim().toLowerCase().replace(/^@/u,'').replace(/\.receiz\.id$/u,'');
const actionKey=(action:HeldSend['action'])=>JSON.stringify([action.recipientUserId,action.conversationId,action.amountUsdCents,action.note??'',!!action.nearby,action.scannedRecipient??null]);

const maxCents=(1n<<63n)-1n;
const pairingError=()=>Error('BANK_WALLET_PAIRING_INVALID');
function offerCounterMode(device: NonNullable<ReturnType<Session['walletDevice']>>) {
  return device.android ? device.receivingCounterMode === 'device' : !!device.sharedWalletCounter;
}
const hasCents=(value:unknown):value is string=>typeof value==='string'&&positiveCents.test(value)&&BigInt(value)<=maxCents;
const validPeer=(recipient:unknown):recipient is string=>typeof recipient==='string'&&!!recipient&&recipient.length<=120;
const validApp=(applicationId:unknown)=>typeof applicationId==='string'&&/^rc_[A-Za-z0-9_-]{1,128}$/u.test(applicationId);
function validBundleOffer(offer:WalletBundleOffer):boolean{
  return !!offer&&offer.schema==='bankeiz.wallet.offer.v2'&&Object.keys(offer).length===(offer.connectUsdCents===undefined?7:8)&&validApp(offer.applicationId)
    &&validPeer(offer.recipient)&&uuidPattern.test(offer.conversationId)&&digestPattern.test(offer.nonce)&&hasCents(offer.amountUsdCents)
    && (offer.connectUsdCents===undefined||hasCents(offer.connectUsdCents))
    &&Array.isArray(offer.parts)&&offer.parts.length>=(offer.connectUsdCents?1:2)&&offer.parts.every(part=>part&&Object.keys(part).length===3
      &&digestPattern.test(part.allocationId)&&digestPattern.test(part.sourceArtifactSha256)&&hasCents(part.amountUsdCents))
    &&new Set(offer.parts.map(part=>part.allocationId)).size===offer.parts.length
    &&offer.parts.reduce((total,part)=>total+BigInt(part.amountUsdCents),0n)===BigInt(offer.amountUsdCents)-BigInt(offer.connectUsdCents??0);
}
export function readWalletPairing(bytes:Uint8Array):WalletOffer|WalletReply|null{
  if(bytes[0]!==123)return null;
  const value=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
  if(value?.schema==='bankeiz.wallet.offer.v2'||value?.schema==='bankeiz.wallet.answer.v2'){
    const offer=value.schema==='bankeiz.wallet.offer.v2'?value:value.offer;
    if(!validBundleOffer(offer))throw pairingError();
    if(value.schema==='bankeiz.wallet.offer.v2')return offer;
    if(Object.keys(value).length===4&&uuidPattern.test(value.recipientUserId)
      &&Array.isArray(value.scannedRecipients)&&value.scannedRecipients.length===offer.parts.length&&value.scannedRecipients.every(Boolean))return value;
    throw pairingError();
  }
  const offer=value?.schema==='bankeiz.wallet.answer.v1'?value.offer:value;
  if(!offer||Object.keys(offer).length!==(Object.hasOwn(offer,'walletCounterMode')?8:7)
    ||Object.hasOwn(offer,'walletCounterMode')&&offer.walletCounterMode!=='device'||offer.schema!=='bankeiz.wallet.offer.v1'
    ||!validApp(offer.applicationId)||typeof offer.sourceArtifactSha256!=='string'||!digestPattern.test(offer.sourceArtifactSha256)
    ||typeof offer.allocationId!=='string'||!digestPattern.test(offer.allocationId)||!uuidPattern.test(offer.conversationId)
    ||typeof offer.amountUsdCents!=='string'||!/^[1-9][0-9]{0,17}$/u.test(offer.amountUsdCents)
    ||!validPeer(offer.recipient))throw pairingError();
  if(value.schema==='bankeiz.wallet.offer.v1')return offer;
  if(value.schema==='bankeiz.wallet.answer.v1'&&Object.keys(value).length===4&&uuidPattern.test(value.recipientUserId)&&value.scannedRecipient)return value;
  throw pairingError();
}

function singlePartOffer(offer:WalletBundleOffer,part:WalletPaymentPart):WalletPairOffer{
  return {schema:'bankeiz.wallet.offer.v1',applicationId:offer.applicationId,recipient:offer.recipient,conversationId:offer.conversationId,
    ...part,walletCounterMode:'device'};
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
  resolveDestination?(recipient:string):Promise<WalletDestination|null>;
  publish(allocationId:string,batch:Parameters<LocalFinancialSessionOptions['publish']>[0]):Promise<unknown>;
  publishPeerRelease:NonNullable<LocalFinancialSessionOptions['publishPeerRelease']>;
  prepareOffline?(amountUsdCents?:string):Promise<Uint8Array|null>;
  hasCashCustody?(role:'receiving'|'funding'):Promise<boolean>;
  onFundingRetained?(allocationId:string):Promise<void>;
  onWalletReceived?(opening:WalletPaymentOpening):Promise<void>;
  prepareFullBalance?():Promise<Uint8Array|null>;
  setupReceiving?(mode:'unlock'|'resume'):Promise<void>;
  answerOffer?(offer:WalletPairOffer):Promise<WalletPairReply>;
  approveRemainder?(value:{recipient:string;recipientLabel:string;amountUsdCents:string;note?:string;split:NearbyWalletSplit}):Promise<NearbyWalletPayment>;
  acceptRemainder?(payment:NearbyWalletPayment):Promise<void>;
  abandonRemainder?(conversationId:string):Promise<void>;
};
export type FundedWalletSendResult=Readonly<{
  operationId:string;qr:Awaited<ReturnType<typeof createOpticalNoteFrames>>|null;recoveryProof?:Uint8Array;
}>;
export type FundedWalletReview=Readonly<{
  recipientLabel:string; amountUsdCents:string; note?:string; connectUsdCents?:string;
  quote:Readonly<{amountPhiMicro:string;settledUsdCents:string;ecosystemUsdCents:string}>;
}>;
function exactCheckpoint(raw:unknown):Checkpoint {
  if(raw==null)return empty;
  const value=raw as Checkpoint;
  if(!Array.isArray(value.entries)||value.entries.some(entry=>!entry||!['peer','source'].includes(entry.kind)||!digestPattern.test(entry.digest)||!digestPattern.test(entry.allocationId)
    ||entry.receiptBundle&&(entry.kind!=='peer'||!digestPattern.test(entry.receiptBundle))
    ||entry.splitPayment&&(!entry.receiptBundle||!entry.splitPayment.split)
    ||entry.stalledSend&&(entry.allocationId!==entry.stalledSend.allocationId||typeof entry.stalledSend.id!=='string'||entry.stalledSend.action?.kind!=='send'))
    ||new Set(value.entries.map(entry=>entry.allocationId)).size!==value.entries.length||value.send!==null&&(!value.send||!value.entries.some(entry=>entry.allocationId===value.send!.allocationId)))
    throw Error('BANK_WALLET_CUSTODY_INDEX_INVALID');
  const request=value.moveBack;
  if(request&&(!positiveCents.test(request.amountUsdCents)||!Array.isArray(request.items)||!request.items.length
    ||request.items.some(item=>!item||!uuidPattern.test(item.id)||!positiveCents.test(item.amountUsdCents)
      ||!value.entries.some(entry=>entry.allocationId===item.allocationId))
    ||new Set(request.items.map(item=>item.allocationId)).size!==request.items.length
    ||new Set(request.items.map(item=>item.id)).size!==request.items.length
    ||request.items.reduce((sum,item)=>sum+BigInt(item.amountUsdCents),0n)!==BigInt(request.amountUsdCents)))
    throw Error('BANK_WALLET_CUSTODY_INDEX_INVALID');
  const bundle=value.bundle;
  if(bundle&&(!validBundleOffer(bundle.offer)||!!bundle.remainder!==!!bundle.offer.connectUsdCents||value.send||!Array.isArray(bundle.items)||bundle.items.length!==bundle.offer.parts.length
    ||bundle.items.some((item,index)=>!item||!uuidPattern.test(item.id)||item.allocationId!==bundle.offer.parts[index]!.allocationId
      ||!value.entries.some(entry=>entry.allocationId===item.allocationId)||item.action?.kind!=='send'
      ||item.action.nearby!==true||item.action.conversationId!==bundle.offer.conversationId
      ||item.action.amountUsdCents!==bundle.offer.parts[index]!.amountUsdCents||item.action.recipientUserId!==bundle.items[0]!.action.recipientUserId)
    ||new Set(bundle.items.map(item=>item.id)).size!==bundle.items.length))throw Error('BANK_WALLET_CUSTODY_INDEX_INVALID');
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
  const reviews=new WeakMap<FundedWalletReview,{session:Session;action:HeldSend['action'];address?:string}>();
  const bundleReviews=new WeakMap<FundedWalletReview,BundleReview>();
  let unlocking:Promise<void>|undefined,warming:Promise<void>|undefined,disposed=false;
  const recoveryInFlight=new Set<string>();
  async function open(kind:Entry['kind'],bytes:Uint8Array,deferPublication=false) {
    let active:Session|undefined;
    const session=await createLocalFinancialSession({...input,
      ...(kind==='source'?{sourceBytes:bytes}:{receivedWallet:{proofBytes:bytes,ownerKeyId:input.ownerKeyId}}),
      publish:batch=>input.publish(batch.allocationId,batch),publishPeerRelease:input.publishPeerRelease,deferPublication,
    });
    if(deferPublication)return session;
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
  async function retainExact(kind:Entry['kind'],bytes:Uint8Array){
    const digest=await input.retain(bytes);
    const retained=await input.reopen(digest).catch(()=>null);
    if(!retained||retained.length!==bytes.length||retained.some((byte,index)=>byte!==bytes[index]))
      throw Error(kind==='peer'?WALLET_RECEIPT_RETENTION_REQUIRED:'BANK_WALLET_SOURCE_RETENTION_REQUIRED');
    input.assertOpen();
    return digest;
  }
  async function remember(kind:Entry['kind'],bytes:Uint8Array) {
    const session=await open(kind,bytes);
    const allocationId=session.sourceReference().allocationId;
    const raw=await input.read(),previous=exactCheckpoint(raw);
    if(!previous.entries.some(entry=>entry.allocationId===allocationId)) {
      const digest=await retainExact(kind,bytes);
      await input.save({...previous,entries:[...previous.entries,{kind,digest,allocationId}]},raw);
    }
    if(kind==='source')await input.onFundingRetained?.(allocationId).catch(()=>{});
    else {
      const device=session.walletDevice();
      if(device?.android&&device.paymentOpening)await input.onWalletReceived?.(device.paymentOpening);
    }
    return session;
  }
  async function current() {
    input.assertOpen();
    return exactCheckpoint(await input.read());
  }
  async function recoverWithSession(session:Session,proof:Uint8Array,checkFile:boolean):Promise<WalletRecovery|null>{
    const count=await session.recoverWalletProof(proof);
    if(count===null)return null;
    return {count,freshness:checkFile?await session.walletRecoveryFreshness(proof,count):'unconfirmed'};
  }
  async function recoverWalletOpening(proof:Uint8Array,state:Checkpoint,raw:unknown,checkFile:boolean){
    const runtime=input.runtime??await loadLocalFinancialRuntime();
    const {sourceOriginal}=runtime.readReceizAccountFinancialWalletProof(proof);
    // A recipient's saved proof carries the exact funding Original. Admit
    // the owner's Source and its debit before restoring the missing index.
    const session=await open('source',sourceOriginal,true).catch(error=>{
      if(error instanceof Error&&error.message==='BANK_LOCAL_FINANCIAL_IDENTITY_MISMATCH')return null;
      throw error;
    });
    if(!session)return null;
    const {allocationId}=session.sourceReference();
    try{
      if(state.entries.some(entry=>entry.allocationId===allocationId))return null;
      const recovered=await recoverWithSession(session,proof,checkFile);
      if(recovered===null)return null;
      const digest=await retainExact('source',sourceOriginal);
      await input.save({...state,entries:[...state.entries,{kind:'source',digest,allocationId}]},raw);
      sessions.get(allocationId)?.dispose();
      sessions.set(allocationId,session);
      session.startPublication();
      return recovered;
    }finally{if(sessions.get(allocationId)!==session)session.dispose();}
  }
  function recoverWalletProof(bytes:Uint8Array,allocationId?:string,checkFile=false){
    const proof=bytes.slice();
    return input.lock(async()=>{
      const raw=await input.read(),state=exactCheckpoint(raw),reopened=new Set<string>();
      const results:WalletRecovery[]=[];
      for(const entry of state.entries){
        if(allocationId&&entry.allocationId!==allocationId)continue;
        const session=await restore(entry),result=await recoverWithSession(session,proof,checkFile);
        if(!result)continue;
        results.push(result);
        // Keep any recovered, accepted send available for its receipt.
        if(result.count>0&&entry.stalledSend&&!await session.resolve(entry.stalledSend.id))reopened.add(entry.allocationId);
      }
      if(reopened.size)await input.save({...state,entries:state.entries.map(entry=>reopened.has(entry.allocationId)?withoutStalledSend(entry):entry)},raw);
      return results.length||allocationId?mergeWalletRecovery(results):recoverWalletOpening(proof,state,raw,checkFile);
    });
  }
  async function recoverWalletCarrier(bytes:Uint8Array,checkFile=false){
    const bundle=readWalletPaymentBundle(bytes);
    if(!bundle)return recoverWalletProof(bytes,undefined,checkFile);
    const results: (WalletRecovery|null)[]=[];
    for(const proof of bundle.proofs)results.push(await recoverWalletProof(proof,undefined,checkFile));
    return mergeWalletRecovery(results);
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
    if(input.acceptRemainder){
      for(const entry of state.entries)if(entry.splitPayment)await input.acceptRemainder(entry.splitPayment).catch(()=>{});
    }
    if(state.moveBack&&input.online())void finishMoveBack(state.moveBack).catch(()=>{});
    return state;
  }
  const unsubscribe=input.findWalletRecovery?(input.subscribeReconnect??subscribeBrowserReconnect)(()=>{
    if(!disposed&&input.online())void resume().catch(()=>{});
  }):undefined;
  async function availableFunding(entries:readonly Entry[]){
    for(const entry of [...entries].reverse()){
      if(entry.kind!=='source'||entry.stalledSend)continue;
      const session=await restore(entry),{release,state}=await session.current();
      if(BigInt(state.wallet.availableUsdCents)===0n)continue;
      if(!release)return {allocationId:entry.allocationId,wallet:state.wallet};
    }
    return null;
  }
  async function offlineAllocations(state:Checkpoint){
    const available:{allocationId:string; cents:bigint}[]=[];
    for(const entry of state.entries){
      if(entry.stalledSend)continue;
      const session=await restore(entry);
      if(!session.walletDevice()?.setAside)continue;
      const current=await session.current();
      const cents=BigInt(current.state.wallet.availableUsdCents);
      if(!current.release&&cents>0n)available.push({allocationId:entry.allocationId,cents});
    }
    return available;
  }
  async function finishMoveBack(request:MoveBack){
    if(!input.online())return {status:'pending' as const};
    for(const item of request.items){
      const session=sessions.get(item.allocationId);
      if(!session||!await session.resolve(item.id)||(await session.flush()).status!=='published')return {status:'pending' as const};
    }
    await input.lock(async()=>{
      const raw=await input.read(),state=exactCheckpoint(raw);
      if(state.moveBack?.items[0]?.id!==request.items[0]?.id)return;
      const {moveBack:_,...settled}=state;
      await input.save(settled,raw);
    });
    return {status:'published' as const};
  }
  async function validateBundleOffer(offer:WalletBundleOffer){
    if(!validBundleOffer(offer)||offer.applicationId!==input.applicationId||
      await walletPaymentConversation(offer.applicationId,offer.nonce,offer.parts)!==offer.conversationId)throw pairingError();
  }
  function sessionFor(state:Checkpoint,allocationId:string){
    const entry=state.entries.find(entry=>entry.allocationId===allocationId);
    if(!entry||entry.stalledSend)throw Error(WALLET_STALE_ALLOCATION);
    return restore(entry);
  }
  async function reviewBundle(state:Checkpoint,send:SendInput,reply:WalletBundleReply):Promise<FundedWalletReview>{
    const {offer}=reply;
    await validateBundleOffer(offer);
    if(state.send||state.bundle||!send.nearby||offer.recipient!==send.recipient||offer.amountUsdCents!==send.amountUsdCents
      ||!uuidPattern.test(reply.recipientUserId)||offer.parts.length!==reply.scannedRecipients.length)throw pairingError();
    const note=send.note?.replace(/\s+/gu,' ').trim();
    const actions:HeldSend['action'][]=[];
    let label:string|undefined,phi=0n,settled=0n,ecosystem=0n;
    for(const [index,part] of offer.parts.entries()){
      const session=await sessionFor(state,part.allocationId),device=session.walletDevice();
      if(!device?.scanTime||!device.partialPayments||!device.sharedWalletCounter
        ||session.sourceReference().artifactSha256!==part.sourceArtifactSha256)throw pairingError();
      const action={kind:'send' as const,recipientUserId:reply.recipientUserId,conversationId:offer.conversationId,
        amountUsdCents:part.amountUsdCents,nearby:true as const,scannedRecipient:reply.scannedRecipients[index],...(note?{note}:{})};
      const {effect}=await session.preview(action);
      if(effect.kind!=='send'||effect.recipientUserId!==reply.recipientUserId||typeof effect.recipientOwnerReceizId!=='string'
        ||label&&label!==effect.recipientOwnerReceizId||reply.recipientUserId!==send.recipient&&handle(effect.recipientOwnerReceizId)!==handle(send.recipient))
        throw Error('BANK_WALLET_RECIPIENT_MISMATCH');
      label=effect.recipientOwnerReceizId;
      phi+=BigInt(String(effect.amountPhiMicro));settled+=BigInt(String(effect.settledUsdCents));ecosystem+=BigInt(String(effect.ecosystemUsdCents));
      actions.push(action);
    }
    const review=Object.freeze({recipientLabel:label!,amountUsdCents:offer.amountUsdCents,note,
      ...(offer.connectUsdCents?{connectUsdCents:offer.connectUsdCents}:{}),
      quote:Object.freeze({amountPhiMicro:String(phi),settledUsdCents:String(settled),ecosystemUsdCents:String(ecosystem)})});
    bundleReviews.set(review,{offer,actions});
    return review;
  }
  async function checkedRemainder(bundle:HeldBundle){
    if(!bundle.remainder)return undefined;
    const payment=await verifyNearbyWalletPayment(bundle.remainder);
    const {offer}=bundle;
    if(payment.senderUserId!==input.accountUid||payment.recipientUserId!==bundle.items[0]!.action.recipientUserId
      ||payment.applicationId!==input.applicationId||payment.amountUsdCents!==offer.connectUsdCents
      ||payment.note!==(bundle.items[0]!.action.note??null)
      ||payment.split?.conversationId!==offer.conversationId
      ||payment.split.offlineUsdCents!==String(BigInt(offer.amountUsdCents)-BigInt(payment.amountUsdCents)))throw pairingError();
    return encodeNearbyWalletPayment(payment);
  }
  async function bundleResult(state:Checkpoint,bundle:HeldBundle){
    const proofs:Uint8Array[]=[];
    for(const item of bundle.items){
      const proof=await (await sessionFor(state,item.allocationId)).walletPaymentBytes(item.id);
      if(!proof)return null;
      proofs.push(proof);
    }
    const recoveryProof=encodeWalletPaymentBundle(bundle.offer.nonce,proofs,await checkedRemainder(bundle));
    return {operationId:bundle.offer.conversationId,qr:await createOpticalNoteFrames('wallet',recoveryProof),recoveryProof};
  }
  async function executeBundle(state:Checkpoint,bundle:HeldBundle){
    const stages:WalletPaymentStage[]=[], participants:Session[]=[];
    for(const item of bundle.items){
      const session=await sessionFor(state,item.allocationId);
      try{
        stages.push(await session.stageWalletPayment({operationId:item.id,action:item.action}));
        participants.push(session);
      }catch(error){
        // A retained assertion draft is recoverable only under the same
        // intent. Drop the group only when its first part was refused before
        // any part produced an assertion or operation.
        if(!stages.length&&error instanceof Error&&(error.message===WALLET_STALE_ALLOCATION||
          error.message==='ACCOUNT_FINANCIAL_WALLET_CUSTODY_CANCELLED_BEFORE_ASSERTION')){
          const raw=await input.read(),{bundle:_,...checkpoint}=exactCheckpoint(raw);
          const entries=error.message===WALLET_STALE_ALLOCATION
            ?checkpoint.entries.map(entry=>entry.allocationId===item.allocationId?{...entry,stalledSend:item}:entry):checkpoint.entries;
          await input.save({...checkpoint,entries},raw);
          if(bundle.remainder)await input.abandonRemainder?.(bundle.offer.conversationId).catch(()=>{});
        }
        throw error;
      }
    }
    if(!walletPaymentBundleFits(stages.map(stage=>stage.proofBytes),(await checkedRemainder(bundle))?.length))throw Error('BANK_WALLET_BUNDLE_CAPACITY');
    if(stages.length===1){
      const item=bundle.items[0]!;
      const accepted=await participants[0]!.execute({operationId:item.id,action:item.action});
      if(accepted.status!=='committed')throw Error('BANK_WALLET_PREVIOUS_SEND_PENDING');
    }else await participants[0]!.commitWalletPaymentBatch(stages);
    for(const session of participants)session.refreshPublication();
    const result=await bundleResult(state,bundle);
    if(!result)throw Error('BANK_WALLET_PREVIOUS_SEND_PENDING');
    return result;
  }
  async function receiveBundle(exact:Uint8Array,bundle:NonNullable<ReturnType<typeof readWalletPaymentBundle>>){
    const staged:{session:Session;proof:Uint8Array}[]=[];
    try{
      for(const proof of bundle.proofs)staged.push({session:await open('peer',proof,true),proof});
      const openings=staged.map(({session})=>session.walletDevice()?.paymentOpening);
      if(openings.some(opening=>!opening))throw Error('BANK_WALLET_BUNDLE_INVALID');
      const parts=openings.map(opening=>opening!);
      const conversation=await walletPaymentConversation(input.applicationId,bundle.nonce,parts);
      if(parts.some(part=>part.conversationId!==conversation)||new Set(parts.map(part=>part.allocationId)).size!==parts.length)
        throw Error('BANK_WALLET_BUNDLE_INVALID');
      const remainder=bundle.remainder
        ?await verifyNearbyWalletPayment(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bundle.remainder))):undefined;
      if(remainder&&(!input.acceptRemainder||remainder.applicationId!==input.applicationId
        ||remainder.recipientUserId!==input.accountUid
        ||staged.some(({session})=>session.incomingWalletSender()!==remainder.senderUserId)
        ||remainder.split?.conversationId!==conversation
        ||remainder.split.offlineUsdCents!==String(parts.reduce((sum,part)=>sum+BigInt(part.amountUsdCents),0n))))
        throw Error('BANK_WALLET_BUNDLE_INVALID');
      const raw=await input.read(),state=exactCheckpoint(raw);
      const newEntries:Entry[]=[];
      const ids=staged.map(({session})=>session.sourceReference().allocationId);
      const receiptBundle=await retainExact('peer',exact);
      const firstId=ids[0]!;
      const priorSplit=state.entries.find(entry=>entry.allocationId===firstId)?.splitPayment;
      if(priorSplit&&remainder&&priorSplit.signatureB64Url!==remainder.signatureB64Url)throw Error('BANK_WALLET_BUNDLE_INVALID');
      for(const {session,proof} of staged){
        const {allocationId}=session.sourceReference();
        if(!state.entries.some(entry=>entry.allocationId===allocationId))
          newEntries.push({kind:'peer',allocationId,digest:await retainExact('peer',proof),receiptBundle,
            ...(remainder&&allocationId===firstId?{splitPayment:remainder}:{})});
      }
      const receivedIds=new Set(ids);
      const attachSplit=!!remainder&&!priorSplit;
      if(newEntries.length||attachSplit||state.entries.some(entry=>receivedIds.has(entry.allocationId)&&!entry.receiptBundle)){
        const retained=state.entries.map(entry=>{
          if(attachSplit&&entry.allocationId===firstId)return {...entry,receiptBundle,splitPayment:remainder};
          return receivedIds.has(entry.allocationId)&&!entry.receiptBundle?{...entry,receiptBundle}:entry;
        });
        await input.save({...state,entries:[...retained,...newEntries]},raw);
      }
      let balance=0n,available=0n,settled=0n;
      for(const {session} of staged){
        const device=session.walletDevice();
        if(device?.android&&device.paymentOpening)await input.onWalletReceived?.(device.paymentOpening);
        const allocationId=session.sourceReference().allocationId;
        const authoritative=sessions.get(allocationId);
        if(!authoritative){sessions.set(allocationId,session);session.startPublication();}
        const held=authoritative??session;
        const current=await held.current();
        if(current.release)continue;
        const wallet=await held.wallet();
        balance+=BigInt(wallet.balancePhiMicro);available+=BigInt(wallet.availableUsdCents);settled+=BigInt(wallet.settledUsdCents);
      }
      if(remainder)await input.acceptRemainder!(remainder);
      return {allocationId:ids[0]!,bundle:true as const,
        ...(remainder?{connectUsdCents:remainder.amountUsdCents}:{}),
        wallet:{balancePhiMicro:String(balance),availableUsdCents:String(available),settledUsdCents:String(settled)}};
    }finally{
      for(const {session} of staged)if(sessions.get(session.sourceReference().allocationId)!==session)session.dispose();
    }
  }
  async function sendResult(session:Session,send:HeldSend):Promise<FundedWalletSendResult>{
    const proof=send.action.nearby?await session.walletPaymentBytes(send.id):null;
    return proof?{operationId:send.id,qr:await createOpticalNoteFrames('wallet',proof),recoveryProof:proof}
      :{operationId:send.id,qr:null};
  }
  function receiptDigests(state:Checkpoint){
    return [...new Set(state.entries.filter(entry=>entry.kind==='peer').map(entry=>entry.receiptBundle??entry.digest))];
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
    const prepare=input.prepareFullBalance;
    if(prepare&&input.online())await input.lock(async()=>{
      if(!input.online()||await availableFunding((await current()).entries))return;
      const source=await prepare();
      if(source)await remember('source',source);
    });
  }
  return Object.freeze({
    warm:()=>unlocking??(warming??=restoreAndSetup('resume').finally(()=>{warming=undefined;})),
    unlock:()=>unlocking??=(restoreAndSetup('unlock').finally(()=>{unlocking=undefined;})),
    resume,
    hasReceivingCustody:()=>input.hasCashCustody?.('receiving')??Promise.resolve(false),
    async prepareOffline(amountUsdCents?:string){
      if(!input.prepareOffline)throw Error('BANK_WALLET_DEVICE_REQUIRED');
      const prepare=input.prepareOffline;
      await input.lock(async()=>{
        const held=await current();
        if(amountUsdCents&&held.moveBack)throw Error('BANK_WALLET_MOVE_BACK_PENDING');
        for(const entry of held.entries)if(entry.kind==='source')await input.onFundingRetained?.(entry.allocationId).catch(()=>{});
        const original=await prepare(amountUsdCents);
        if(amountUsdCents&&!original)throw Error('BANK_WALLET_SOURCE_RETENTION_REQUIRED');
        if(original)await remember('source',original);
      });
    },
    async offlineBalance(){
      const state=await current();
      const [available,canEnable]=await Promise.all([
        offlineAllocations(state),
        input.hasCashCustody?.('funding').catch(()=>false),
      ]);
      return {availableUsdCents:String(available.reduce((sum,item)=>sum+item.cents,0n)),movingBackUsdCents:state.moveBack?.amountUsdCents??null,
        ...(canEnable?{canEnable:true as const}:{})};
    },
    async moveBack(amountUsdCents:string){
      if(!input.online())throw Error('BANK_LOCAL_FINANCIAL_OFFLINE');
      if(!positiveCents.test(amountUsdCents))throw Error('BANK_WALLET_MOVE_BACK_AMOUNT');
      const request=await input.lock(async()=>{
        const raw=await input.read(),state=exactCheckpoint(raw);
        if(state.send||state.bundle)throw Error('BANK_WALLET_PREVIOUS_SEND_PENDING');
        let request=state.moveBack;
        if(request&&request.amountUsdCents!==amountUsdCents)throw Error('BANK_WALLET_MOVE_BACK_PENDING');
        if(!request){
          let remaining=BigInt(amountUsdCents);
          const available=await offlineAllocations(state);
          const items:MoveBack['items'][number][]=[];
          // Return smaller lots first to keep as much value as possible in a
          // single offline allocation for the next nearby payment.
          for(const allocation of available.sort((a,b)=>a.cents<b.cents?-1:a.cents>b.cents?1:0)){
            const cents=allocation.cents<remaining?allocation.cents:remaining;
            items.push({id:crypto.randomUUID(),allocationId:allocation.allocationId,amountUsdCents:String(cents)});
            remaining-=cents;
            if(remaining===0n)break;
          }
          if(remaining!==0n)throw Error('BANK_WALLET_MOVE_BACK_AMOUNT');
          request={amountUsdCents,items};
          await input.save({...state,moveBack:request},raw);
        }
        let committed=false;
        for(const item of request.items){
          const entry=state.entries.find(value=>value.allocationId===item.allocationId)!;
          const session=await restore(entry);
          if(!await session.resolve(item.id)){
            try{
              const result=await session.execute({operationId:item.id,action:{
                kind:'send',moveBack:true,recipientUserId:input.accountUid,conversationId:item.id,amountUsdCents:item.amountUsdCents,
              }});
              if(result.status!=='committed')throw Error('BANK_WALLET_MOVE_BACK_PENDING');
            }catch(error){
              if(!committed&&error instanceof Error&&error.message==='ACCOUNT_FINANCIAL_WALLET_CUSTODY_CANCELLED_BEFORE_ASSERTION'){
                const latest=await input.read(),{moveBack:_,...available}=exactCheckpoint(latest);
                await input.save(available,latest);
              }
              throw error;
            }
          }
          committed=true;
        }
        return request;
      });
      return finishMoveBack(request);
    },
    async offer(send:SendInput):Promise<WalletOffer|null>{
      if(!send.nearby||!hasCents(send.amountUsdCents)||!validPeer(send.recipient))return null;
      const state=await current();
      if(state.bundle)throw Error('BANK_WALLET_PREVIOUS_SEND_PENDING');
      const availableParts:{part:WalletPaymentPart;head:string|null}[]=[];
      let remaining=BigInt(send.amountUsdCents);
      for(const entry of [...state.entries].reverse()){
        if(entry.stalledSend||state.send&&entry.allocationId!==state.send.allocationId)continue;
        const session=await restore(entry);
        const device=session.walletDevice();
        if(!device?.scanTime)continue;
        const head=await session.current();
        const available=head.state.wallet.availableUsdCents;
        if(head.release||state.moveBack?.items.some(item=>item.allocationId===entry.allocationId))continue;
        const sourceArtifactSha256=session.sourceReference().artifactSha256;
        if(device.partialPayments?BigInt(send.amountUsdCents)>BigInt(available):head.state.sequence!=='0'||available!==send.amountUsdCents){
          if(device.partialPayments&&device.sharedWalletCounter&&remaining>0n&&BigInt(available)>0n){
            const cents=BigInt(available)<remaining?BigInt(available):remaining;
            availableParts.push({part:{allocationId:entry.allocationId,sourceArtifactSha256,amountUsdCents:String(cents)},head:head.headArtifactSha256});
            remaining-=cents;
          }
          continue;
        }
        const pairingKey=new TextEncoder().encode(JSON.stringify([input.applicationId,sourceArtifactSha256,entry.allocationId,send.recipient,send.amountUsdCents,
          ...(device.partialPayments?[head.headArtifactSha256]:[])]));
        const id=new Uint8Array(await crypto.subtle.digest('SHA-256',pairingKey)).slice(0,16);
        id[6]=(id[6]!&15)|0x80;id[8]=(id[8]!&63)|0x80;
        const hex=Array.from(id,byte=>byte.toString(16).padStart(2,'0')).join('');
        const conversationId=[hex.slice(0,8),hex.slice(8,12),hex.slice(12,16),hex.slice(16,20),hex.slice(20)].join('-');
        return {schema:'bankeiz.wallet.offer.v1',applicationId:input.applicationId,sourceArtifactSha256,
          allocationId:entry.allocationId,conversationId,amountUsdCents:send.amountUsdCents,recipient:send.recipient,
          ...(offerCounterMode(device)?{walletCounterMode:'device' as const}:{})};
      }
      if(remaining===0n?availableParts.length<2:!send.connectRemainder||!availableParts.length)return null;
      const connectUsdCents=remaining>0n?String(remaining):undefined;
      const parts=availableParts.map(({part})=>part);
      const nonce=await walletPaymentHash([send.recipient,...availableParts.map(({head})=>head),
        ...(connectUsdCents?[send.amountUsdCents,send.note?.replace(/\s+/gu,' ').trim()??'']:[])]);
      return {schema:'bankeiz.wallet.offer.v2',applicationId:input.applicationId,recipient:send.recipient,amountUsdCents:send.amountUsdCents,
        ...(connectUsdCents?{connectUsdCents}:{}),conversationId:await walletPaymentConversation(input.applicationId,nonce,parts),nonce,parts};
    },
    async answer(offer:WalletOffer):Promise<WalletReply>{
      if(!input.answerOffer||offer.applicationId!==input.applicationId
        ||offer.recipient!==input.accountUid&&handle(offer.recipient)!==handle(input.ownerReceizId))throw pairingError();
      return input.lock(async()=>{
        if(offer.schema==='bankeiz.wallet.offer.v1')return input.answerOffer!(offer);
        await validateBundleOffer(offer);
        const scannedRecipients:unknown[]=[];
        for(const part of offer.parts){
          const reply=await input.answerOffer!(singlePartOffer(offer,part));
          if(reply.recipientUserId!==input.accountUid||!reply.scannedRecipient)throw pairingError();
          scannedRecipients.push(reply.scannedRecipient);
        }
        return {schema:'bankeiz.wallet.answer.v2',offer,recipientUserId:input.accountUid,scannedRecipients};
      });
    },
    async receive(bytes:Uint8Array) {
      const exact=bytes.slice(),bundle=readWalletPaymentBundle(exact);
      return input.lock(async()=>{
        if(bundle)return receiveBundle(exact,bundle);
        const session=await remember('peer',exact);
        const {allocationId}=session.sourceReference();
        return {allocationId,wallet:await session.wallet()};
      });
    },
    async recoverWalletProof(bytes:Uint8Array){
      return (await recoverWalletCarrier(bytes))?.count??null;
    },
    restoreWalletRecoveryFile(bytes:Uint8Array){
      return recoverWalletCarrier(bytes,true);
    },
    latestRecoveryFiles(){
      return input.lock(async()=>{
        const files:WalletRecoveryFile[]=[];
        for(const entry of (await current()).entries){
          const file=await (await restore(entry)).latestRecoveryFile();
          if(file)files.push(file);
        }
        return files;
      });
    },
    async receiptQr(index=0){
      const digests=receiptDigests(await current()),digest=digests[digests.length-1-index];
      if(!digest)return null;
      const bytes=await input.reopen(digest);
      input.assertOpen();
      return createOpticalNoteFrames('wallet',bytes);
    },
    async receiptProofCount(){
      return receiptDigests(await current()).length;
    },
    async pendingBundle(){
      const state=await current();
      return state.bundle?.offer.amountUsdCents??null;
    },
    async resumeBundle(){
      return input.lock(async()=>{
        const state=await current();
        if(!state.bundle)throw Error('BANK_WALLET_REVIEW_REQUIRED');
        return executeBundle(state,state.bundle);
      });
    },
    async outgoing(){
      const state=await current();
      if(state.bundle)return bundleResult(state,state.bundle);
      const attempts=[state.send,...state.entries.map(entry=>entry.stalledSend)];
      for(const send of attempts){
        if(!send)continue;
        const entry=state.entries.find(row=>row.allocationId===send.allocationId)!;
        const session=await restore(entry),commit=await session.resolve(send.id);
        if(commit)return sendResult(session,send);
      }
      return null;
    },
    async completeOutgoing(operationId:string){
      return input.lock(async()=>{
        const raw=await input.read(),state=exactCheckpoint(raw),send=state.send;
        if(state.bundle?.offer.conversationId===operationId){
          if(!await bundleResult(state,state.bundle))throw Error('BANK_WALLET_PREVIOUS_SEND_PENDING');
          const {bundle:_,...completed}=state;
          await input.save(completed,raw);
          return;
        }
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
      if(state.bundle)throw Error(send.nearby?'BANK_WALLET_PREVIOUS_SEND_PENDING':'BANK_WALLET_FUNDED_RECIPIENT_REQUIRED');
      if(send.paired?.schema==='bankeiz.wallet.answer.v2')return reviewBundle(state,send,send.paired);
      const paired=send.paired;
      let refusal:unknown;
      let destination:WalletDestination|null|undefined;
      const note=send.note?.replace(/\s+/gu,' ').trim();
      for(const entry of [...state.entries].reverse()){
        if(entry.stalledSend||state.send&&entry.allocationId!==state.send.allocationId)continue;
        const session=await restore(entry),device=session.walletDevice();
        const nearby=send.nearby||entry.kind==='peer'&&!device?.connectedPayments;
        if(!device)continue;
        if(paired&&(!device.scanTime||paired.offer.allocationId!==entry.allocationId||paired.offer.sourceArtifactSha256!==session.sourceReference().artifactSha256
          ||paired.offer.amountUsdCents!==send.amountUsdCents||paired.offer.recipient!==send.recipient||paired.offer.applicationId!==input.applicationId
          ||(paired.offer.walletCounterMode==='device')!==offerCounterMode(device)))continue;
        let proof:unknown=paired?.scannedRecipient;
        let recipient:(Pick<WalletRecipient,'accountUid'|'conversationId'>&{ownerReceizId?:string})|null
          =paired?{accountUid:paired.recipientUserId,conversationId:paired.offer.conversationId}:boundRecipient(device.recipients,send.recipient,nearby);
        let address:string|undefined;
        if(!recipient&&!nearby&&device.connectedPayments&&input.resolveDestination){
          address=send.recipient.trim().toLowerCase();
          const head=await session.current();
          if(head.release||!/^\d+$/u.test(send.amountUsdCents)||BigInt(send.amountUsdCents)>BigInt(head.state.wallet.availableUsdCents))continue;
          if(state.send){
            if(state.send.address!==address||state.send.action.nearby||state.send.action.amountUsdCents!==send.amountUsdCents||state.send.action.note!==(note||undefined))
              throw Error('BANK_WALLET_PREVIOUS_SEND_PENDING');
            const prior=state.send.action,held=prior.scannedRecipient as {account?:WalletDestination};
            proof=prior.scannedRecipient;
            recipient={accountUid:prior.recipientUserId,conversationId:prior.conversationId,ownerReceizId:held.account?.payload?.ownerReceizId};
          }else if(input.online()){
            if(destination===undefined)destination=await input.resolveDestination(address);
            if(destination){
              proof={account:destination};
              recipient={accountUid:destination.payload.accountUserId,conversationId:crypto.randomUUID(),ownerReceizId:destination.payload.ownerReceizId};
            }
          }
        }
        if(!recipient)continue;
        const action={kind:'send' as const,recipientUserId:recipient.accountUid,conversationId:recipient.conversationId,
          amountUsdCents:send.amountUsdCents,...(note?{note}:{}),...(nearby?{nearby:true as const}:{}),...(proof?{scannedRecipient:proof}:{})};
        if(state.send&&actionKey(state.send.action)!==actionKey(action))throw Error('BANK_WALLET_PREVIOUS_SEND_PENDING');
        try{
          const {effect}=await session.preview(action);
          if(effect.kind!=='send'||typeof effect.recipientOwnerReceizId!=='string'||(paired
            ?paired.recipientUserId!==send.recipient&&handle(effect.recipientOwnerReceizId)!==handle(send.recipient)
            :effect.recipientOwnerReceizId!==recipient.ownerReceizId))throw Error('BANK_WALLET_RECIPIENT_MISMATCH');
          const {amountPhiMicro,settledUsdCents,ecosystemUsdCents}=effect;
          if(typeof amountPhiMicro!=='string'||typeof settledUsdCents!=='string'||typeof ecosystemUsdCents!=='string')throw Error('BANK_WALLET_QUOTE_INVALID');
          const review=Object.freeze({recipientLabel:effect.recipientOwnerReceizId,amountUsdCents:send.amountUsdCents,note,quote:Object.freeze({amountPhiMicro,settledUsdCents,ecosystemUsdCents})});
          reviews.set(review,{session,action,address});
          return review;
        }catch(error){refusal=error;}
      }
      throw refusal??Error('BANK_WALLET_FUNDED_RECIPIENT_REQUIRED');
    },
    confirm(review:FundedWalletReview) {
      const group=bundleReviews.get(review);
      if(group)return input.lock(async()=>{
        const raw=await input.read(),state=exactCheckpoint(raw);
        if(state.send||state.moveBack)throw Error('BANK_WALLET_PREVIOUS_SEND_PENDING');
        if(state.bundle){
          if(state.bundle.offer.conversationId!==group.offer.conversationId||
            state.bundle.items.some((item,index)=>actionKey(item.action)!==actionKey(group.actions[index]!)))
            throw Error('BANK_WALLET_PREVIOUS_SEND_PENDING');
          return executeBundle(state,state.bundle);
        }
        let phi=0n,settled=0n,ecosystem=0n;
        const items:HeldSend[]=[];
        for(const [index,part] of group.offer.parts.entries()){
          const session=await sessionFor(state,part.allocationId),action=group.actions[index]!;
          const {effect}=await session.preview(action);
          phi+=BigInt(String(effect.amountPhiMicro));settled+=BigInt(String(effect.settledUsdCents));ecosystem+=BigInt(String(effect.ecosystemUsdCents));
          items.push({allocationId:part.allocationId,id:crypto.randomUUID(),action});
        }
        if(String(phi)!==review.quote.amountPhiMicro||String(settled)!==review.quote.settledUsdCents||String(ecosystem)!==review.quote.ecosystemUsdCents)
          throw Error('BANK_WALLET_REVIEW_STALE');
        const {offer}=group;
        let remainder:NearbyWalletPayment|undefined;
        if(offer.connectUsdCents){
          if(!input.approveRemainder)throw Error('BANK_WALLET_BUNDLE_INVALID');
          remainder=await input.approveRemainder({recipient:items[0]!.action.recipientUserId,
            recipientLabel:review.recipientLabel,amountUsdCents:offer.connectUsdCents,note:review.note,
            split:{conversationId:offer.conversationId,offlineUsdCents:String(BigInt(offer.amountUsdCents)-BigInt(offer.connectUsdCents))}});
        }
        const bundle={offer,items,...(remainder?{remainder}:{})};
        await checkedRemainder(bundle);
        await input.save({...state,bundle},raw);
        return executeBundle(state,bundle);
      });
      const held=reviews.get(review);
      if(!held)throw Error('BANK_WALLET_REVIEW_REQUIRED');
      return input.lock(async()=>{
        const raw=await input.read(),state=exactCheckpoint(raw),{allocationId}=held.session.sourceReference();
        if(state.bundle)throw Error('BANK_WALLET_PREVIOUS_SEND_PENDING');
        if(state.moveBack?.items.some(item=>item.allocationId===allocationId))throw Error('BANK_WALLET_MOVE_BACK_PENDING');
        if(state.entries.find(entry=>entry.allocationId===allocationId)?.stalledSend)throw Error(WALLET_STALE_ALLOCATION);
        const send=state.send??{id:crypto.randomUUID(),allocationId,action:held.action,...(held.address?{address:held.address}:{})};
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
        const completed=await sendResult(held.session,send);
        reviews.delete(review);
        return completed;
      });
    },
    async release(allocationId:string) {
      const session=await input.lock(async()=>{
        const state=await current();
        if(state.bundle)throw Error('BANK_WALLET_PREVIOUS_SEND_PENDING');
        if(state.moveBack?.items.some(item=>item.allocationId===allocationId))throw Error('BANK_WALLET_MOVE_BACK_PENDING');
        const entry=state.entries.find(row=>row.allocationId===allocationId);
        if(!entry)throw Error('BANK_WALLET_CUSTODY_REQUIRED');
        if(entry.stalledSend)throw Error(WALLET_STALE_ALLOCATION);
        const session=await restore(entry),head=await session.current();
        if(entry.kind==='peer'&&head.state.sequence!=='0'&&!session.walletDevice()?.partialPayments
          ||BigInt(head.state.wallet.availableUsdCents)===0n)throw Error('BANK_WALLET_ALREADY_FORWARDED');
        await session.releaseOriginal();
        return session;
      });
      return session.flush();
    },
    dispose(){disposed=true;unsubscribe?.();for(const session of sessions.values())session.dispose();sessions.clear();},
  });
}
export type FundedWallet = ReturnType<typeof createFundedWallet>;
