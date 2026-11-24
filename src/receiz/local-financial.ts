import type {LocalFinancialRuntime,FinancialExecutorOptions,FinancialCommit,FinancialAction,FinancialPublication,WalletDevice,FinancialWalletCustodyChallenge,FinancialWalletCustodyAssertion,WalletPaymentStage} from './local-financial-runtime';
import {loadReceiz} from './client';
import {createOpticalNoteFrames} from './optical-note-frames';
export type {LocalFinancialRuntime} from './local-financial-runtime';
type FinancialRuntime=LocalFinancialRuntime;
type ExecutorOptions=FinancialExecutorOptions;
let loading:Promise<FinancialRuntime>|undefined;
export function loadLocalFinancialRuntime():Promise<FinancialRuntime>{
 return loading??=import('./offline-notes').then(({loadBankNoteRuntime})=>loadBankNoteRuntime()).then(runtime=>runtime as unknown as FinancialRuntime).catch(error=>{loading=undefined;throw error;});
}
export type LocalFinancialSessionOptions=Readonly<{
 applicationId:string;accountUid:string;ownerReceizId:string;
 originals:ExecutorOptions['originals'];store?:ExecutorOptions['store'];
 signOwner:ExecutorOptions['signOwner'];signRecord:ExecutorOptions['signRecord'];
 assertWalletCustody?:ExecutorOptions['assertWalletCustody'];
 readWalletCounterEvents?:ExecutorOptions['readWalletCounterEvents'];
 bindWalletDevice?(device: WalletDevice, assert: (request:FinancialWalletCustodyChallenge)=>Promise<FinancialWalletCustodyAssertion>):NonNullable<ExecutorOptions['assertWalletCustody']>;
 publish(batch:FinancialPublication):Promise<unknown>;
 publishOwnerRelease?(input:Readonly<{allocationId:string;original:Uint8Array;financialOriginals?:readonly Uint8Array[]}>):Promise<unknown>;
 publishPeerRelease?(input:Readonly<{walletProof:Uint8Array;releaseOriginal:Uint8Array;financialOriginals?:readonly Uint8Array[]}>):Promise<unknown>;
 publishSentWalletProof?(proof:Uint8Array):Promise<unknown>;
 publishPeerPayment?(input:Readonly<{walletProof:Uint8Array;receivingAllocationId:string}>):Promise<unknown>;
 assertOpen():void;online():boolean;deferPublication?:boolean;
 /** Optional host lifecycle in place of the browser's connection events. */
 subscribeReconnect?(listener:()=>void):()=>void;
 onCommitted?(commit:FinancialCommit):void|Promise<void>;
 runtime?:FinancialRuntime;kai?:()=>string;
}>&(
 Readonly<{sourceBytes:Uint8Array;receivedWallet?:never}>
 |Readonly<{sourceBytes?:never;receivedWallet:Readonly<{proofBytes:Uint8Array;ownerKeyId:string}>}>
);
export function subscribeBrowserReconnect(listener:()=>void){
 const page=globalThis.window;
 if(!page)return;
 const resumed=()=>{if(page.document.visibilityState==='visible')listener();};
 page.addEventListener('online',listener);
 page.addEventListener('pageshow',listener);
 page.document?.addEventListener('visibilitychange',resumed);
 return()=>{
  page.removeEventListener('online',listener);
  page.removeEventListener('pageshow',listener);
  page.document?.removeEventListener('visibilitychange',resumed);
 };
}
/** Thin composition only. The SDK admits the whole funded Source and owns all
 * arithmetic, signatures, atomic commitment, recovery and publication checks.
 * No observation, callback result or queued request can report completion. */
export async function createLocalFinancialSession(input:LocalFinancialSessionOptions){
 input.assertOpen();
 const runtime=input.runtime??await loadLocalFinancialRuntime();
 const incoming=input.receivedWallet;
 const heldPeerProof=incoming?.proofBytes.slice();
 let peerRoot:Awaited<ReturnType<FinancialRuntime['admitReceizAccountFinancialSource']>>|undefined;
 let source:Awaited<ReturnType<FinancialRuntime['admitReceizAccountFinancialSource']>>;
 if(incoming){
  const proof=runtime.readReceizAccountFinancialWalletProof(heldPeerProof!);
  const root=await runtime.admitReceizAccountFinancialSource(proof.sourceOriginal);
  peerRoot=root;
  input.assertOpen();
  if(runtime.financialSourceApplicationId(root)!==input.applicationId)throw Error('BANK_LOCAL_FINANCIAL_IDENTITY_MISMATCH');
  source=await runtime.receiveReceizAccountFinancialWalletProof({...proof,accountUserId:input.accountUid,ownerKeyId:incoming.ownerKeyId},{
   originals:{
    async retain(digest,bytes){input.assertOpen();await input.originals.retain(digest,bytes);},
    async read(digest){input.assertOpen();return input.originals.read(digest);},
   },
  });
 }else source=await runtime.admitReceizAccountFinancialSource(input.sourceBytes.slice());
 input.assertOpen();
 if(source.accountUserId!==input.accountUid||source.ownerReceizId!==input.ownerReceizId||runtime.financialSourceApplicationId(source)!==input.applicationId)throw Error('BANK_LOCAL_FINANCIAL_IDENTITY_MISMATCH');
 // Persist only SDK admission coordinates here. Complete Originals remain in
 // the existing private custody port, and financial truth still comes from them.
 const protectedWallet=source.sourceFamily==='native-wallet-reserve';
 const storeScope={
  databaseName:'receiz-bankeiz-wallet-admission',namespace:protectedWallet?'wallet:protected':`wallet:${source.artifactSha256}`,
 };
 const store=input.store??(protectedWallet&&runtime.createWalletAdmissionStore
  ?runtime.createWalletAdmissionStore(storeScope):(await loadReceiz()).createReceizBrowserAdmissionStore(storeScope));
 input.assertOpen();
 const kai=input.kai??runtime.financialKaiNow;
 const device=input.bindWalletDevice&&runtime.bankFinancialWalletDevice?.(source);
 const partialPayments=!!(device&&device.partialPayments);
 const publishExactPayments=!!(device&&(device.connectedPayments||device.setAside));
 let assertWalletCustody=input.assertWalletCustody;
 if(input.bindWalletDevice){
  if(!device||!runtime.assertBankFinancialWalletDevice)throw Error('BANK_WALLET_DEVICE_REQUIRED');
  const assert=runtime.assertBankFinancialWalletDevice;
  assertWalletCustody=input.bindWalletDevice(device,async request=>{
   open();
   if(request.credentialIdB64u!==device.credentialIdB64u)throw Error('BANK_WALLET_DEVICE_MISMATCH');
   const assertion=await assert({...request,origin:device.origin,rpId:device.rpId});
   return device.verifyAssertion?device.verifyAssertion(request,assertion):assertion;
  });
 }
 const executor=await runtime.createReceizAccountFinancialExecutor({source,store,originals:input.originals,signOwner:input.signOwner,signRecord:input.signRecord,assertWalletCustody,readWalletCounterEvents:input.readWalletCounterEvents,kai});
 const publisher=incoming&&!publishExactPayments?null:await runtime.createReceizAccountFinancialPublisher({
  source,executor,store,originals:input.originals,...(protectedWallet?{batchSize:1}:{}),
  async publish(batch){
   input.assertOpen();
   if(!input.online())throw Error('BANK_LOCAL_FINANCIAL_OFFLINE');
   if(protectedWallet&&!publishExactPayments){
    const operation=await executor.resolve(batch.originals[0]!.operationId);
    input.assertOpen();
    if(!operation)throw Error('BANK_LOCAL_FINANCIAL_ORIGINAL_REQUIRED');
    // The terminal holder reconciles nearby custody through the peer writer.
    // Ordinary publication must never credit an intermediate QR recipient.
    if(operation.operation.action.kind==='send'&&operation.operation.action.nearby)throw Error('BANK_WALLET_PEER_RELEASE_REQUIRED');
   }
   return input.publish(batch);
  },
 });
 try{input.assertOpen();}catch(error){publisher?.dispose();throw error;}
 let closed=false,scheduled=false,peerSynced=false,peerPublished=false,ownerPublished=false,publication:ReturnType<NonNullable<typeof publisher>['flush']>|undefined;
 const deliverPeer=input.publishPeerRelease,syncPeer=partialPayments?input.publishPeerPayment:undefined;
 const syncSent=partialPayments?input.publishSentWalletProof:undefined;
 let lastSentSync:string|undefined,sentSyncRunning=false,sentSyncQueued=false;
 const canPublish=!!publisher||!!(heldPeerProof&&(deliverPeer||syncPeer));
 function open(){input.assertOpen();if(closed)throw Error('BANK_LOCAL_FINANCIAL_CLOSED');}
 async function releaseContinuity(sequence:string){
  if(!partialPayments)return {};
  const commits=await executor.pending('0',64);
  if(BigInt(sequence)!==BigInt(commits.length))throw Error('BANK_LOCAL_FINANCIAL_ORIGINAL_REQUIRED');
  const financialOriginals=await Promise.all(commits.map(async ({operation})=>{
   const original=await input.originals.read(operation.artifactSha256);
   if(!original)throw Error('BANK_LOCAL_FINANCIAL_ORIGINAL_REQUIRED');
   return original;
  }));
  open();
  return {financialOriginals};
 }
 async function flushPeer():ReturnType<NonNullable<typeof publisher>['flush']>{
  if(peerPublished)return {status:'published'};
  if(!peerRoot||!heldPeerProof||!input.online())return {status:'pending'};
  try{
   if(syncPeer&&!peerSynced){
    const response=await syncPeer({walletProof:heldPeerProof.slice(),receivingAllocationId:source.allocationId});
    open();
    const ack=response as Record<string,unknown>|null;
    if(ack?.schema!=='receiz.bank.wallet-peer-sync-ack.v1'||ack.receivingAllocationId!==source.allocationId
     ||ack.paymentArtifactSha256!==source.artifactSha256||typeof ack.adoptionArtifactSha256!=='string'
     ||!/^[a-f0-9]{64}$/u.test(ack.adoptionArtifactSha256))return {status:'pending'};
    peerSynced=true;
   }
   const {release,state}=await executor.current();
   open();
   if(publisher&&(!peerSynced||(await publisher.flush()).status!=='published'))return {status:'pending'};
   if(!release)return {status:peerSynced?'published':'pending'};
   // Moving balance out of device custody still requires its signed handback.
   if(!deliverPeer||(!partialPayments&&state.sequence!=='0')||!input.online())return {status:'pending'};
   const ack=await deliverPeer({walletProof:heldPeerProof.slice(),releaseOriginal:runtime.exportReceizAccountFinancialRelease(release),
    ...await releaseContinuity(state.sequence)});
   open();
   if(!ack||typeof ack!=='object')return {status:'pending'};
   const facts=ack as Record<string,unknown>;
   if(facts.schema!=='receiz.bank.wallet-peer-release-ack.v1'||facts.allocationId!==peerRoot.allocationId
    ||facts.sourceArtifactSha256!==peerRoot.artifactSha256||facts.releaseArtifactSha256!==release.artifactSha256
    ||typeof facts.adoptionArtifactSha256!=='string'||!/^[a-f0-9]{64}$/u.test(facts.adoptionArtifactSha256))return {status:'pending'};
   peerPublished=true;
   return {status:'published'};
  }catch{return {status:'pending'};}
 }
 async function flushOwner(){
  const result=partialPayments&&!publishExactPayments?{status:'published' as const}:await publisher!.flush();
  if(result.status!=='published'||ownerPublished)return result;
  if(!input.publishOwnerRelease||!input.online())return partialPayments&&!publishExactPayments?{status:'pending' as const}:result;
  try{
   const {release,state}=await executor.current();open();if(!release)return partialPayments&&!publishExactPayments?{status:'pending' as const}:result;
   const ack=await input.publishOwnerRelease({allocationId:source.allocationId,original:runtime.exportReceizAccountFinancialRelease(release),
    ...await releaseContinuity(state.sequence)}) as {status?:string;artifactSha256?:string};
   if(ack?.status!=='released'||ack.artifactSha256!==release.artifactSha256)return {status:'pending' as const};
   ownerPublished=true;return result;
  }catch{return {status:'pending' as const};}
 }
 function flushPublication(){
  if(publication)return publication;
  scheduled=false;
  publication=(incoming?flushPeer():flushOwner()).finally(()=>{
   publication=undefined;
   runScheduledPublication();
  });
  return publication;
 }
 function runScheduledPublication(){
  // A reconnect during a failed request needs a new SDK flush after the
  // existing one settles. Joining the old flush would lose the reconnect.
  if(!scheduled||publication||closed)return;
  scheduled=false;
  if(input.online())void flushPublication();
 }
 function syncSentProof(){
  if(!syncSent||closed||!input.online())return;
  if(sentSyncRunning){sentSyncQueued=true;return;}
  sentSyncRunning=true;
  void (async()=>{
   const commits=await executor.pending('0',64);
   const latest=[...commits].reverse().find(({operation})=>operation.action.kind==='send'&&operation.action.nearby===true);
   if(!latest||latest.operation.artifactSha256===lastSentSync)return;
   open();
   if(!input.online())return;
   const proof=runtime.exportReceizAccountFinancialWalletProof(source,latest);
   const ack=await syncSent(proof) as Record<string,unknown>|null;
   open();
   if(ack?.schema==='receiz.bank.wallet-peer-sync-ack.v1'&&ack.paymentArtifactSha256===latest.operation.artifactSha256
    &&typeof ack.adoptionArtifactSha256==='string'&&/^[a-f0-9]{64}$/u.test(ack.adoptionArtifactSha256))
    lastSentSync=latest.operation.artifactSha256;
  })().catch(()=>{}).finally(()=>{
   sentSyncRunning=false;
   if(sentSyncQueued){sentSyncQueued=false;syncSentProof();}
  });
 }
 function nudge(){
  syncSentProof();
  if(!canPublish||closed||scheduled||!input.online())return;
  scheduled=true;queueMicrotask(runScheduledPublication);
 }
 let unsubscribe:(()=>void)|undefined, publicationStarted=false;
 function startPublication(){
  if(publicationStarted||closed)return;
  publicationStarted=true;
  if(canPublish||syncSent)unsubscribe=(input.subscribeReconnect??subscribeBrowserReconnect)(nudge);
  nudge();
 }
 if(!input.deferPublication)startPublication();
 return Object.freeze({
  async preview(action:FinancialAction){
   open();const current=await executor.current(),at=kai();open();
   if(action.kind==='send'&&action.scannedRecipient)await runtime.prepareReceizScannedWalletRecipient?.(source,action,at);
   open();return runtime.projectReceizAccountFinancialAction(source,current.state,action,at);
  },
  async execute(request:Parameters<typeof executor.execute>[0]){
   open();const result=await executor.execute(request);
   if(result.status==='committed'){
    // Optional presentation and delivery are subsequent to the SDK's durable
    // accepted Original. Their failure cannot turn it into another execution.
    try{void Promise.resolve(input.onCommitted?.(result)).catch(()=>{});}catch{/* Retained completion remains available through resolve. */}
    nudge();
   }
   return result;
  },
  async recoverWalletProof(proof:Uint8Array){
   open();
   if(!protectedWallet||!executor.recoverWalletProof)return null;
   const recovered=await executor.recoverWalletProof(proof);
   open();
   if(recovered)nudge();
   return recovered;
  },
  sourceReference(){open();return {allocationId:source.allocationId,artifactSha256:source.artifactSha256};},
  recoveryReference(){
   open();
   return partialPayments?{rootAllocationId:(peerRoot??source).allocationId,sourceArtifactSha256:source.artifactSha256}:null;
  },
  walletDevice(){open();return device||null;},
  incomingWalletSender(){open();return peerRoot?.accountUserId??null;},
  current(){open();return executor.current();},
  async wallet(){open();const current=await executor.current();open();return runtime.financialSourceWalletAt(source,current.state,kai());},
  resolve(operationId:string){open();return executor.resolve(operationId);},
  async received(operationId:string){open();const proof=await publisher?.received(operationId);open();return proof??null;},
  async stageWalletPayment(request:Parameters<typeof executor.execute>[0]){
   open();
   if(!executor.stageWalletPayment||!runtime.commitReceizAccountFinancialWalletPaymentBatch)throw Error('BANK_WALLET_BATCH_UNAVAILABLE');
   return executor.stageWalletPayment(request);
  },
  async commitWalletPaymentBatch(stages:readonly WalletPaymentStage[]){
   open();
   if(!runtime.commitReceizAccountFinancialWalletPaymentBatch)throw Error('BANK_WALLET_BATCH_UNAVAILABLE');
   return runtime.commitReceizAccountFinancialWalletPaymentBatch(stages);
  },
  refreshPublication(){open();nudge();},
  async walletPaymentBytes(operationId:string){
   open();const commit=await executor.resolve(operationId);open();
   return commit?runtime.exportReceizAccountFinancialWalletProof(source,commit):null;
  },
  async walletQr(operationId:string){
   open();const commit=await executor.resolve(operationId);open();
   return commit?createOpticalNoteFrames('wallet',runtime.exportReceizAccountFinancialWalletProof(source,commit)):null;
  },
  async releaseOriginal(){
   open();const release=await executor.release();open();
   const original=runtime.exportReceizAccountFinancialRelease(release);
   nudge();
   return original;
  },
  startPublication,
  flush(){open();return flushPublication();},
  dispose(){if(closed)return;closed=true;unsubscribe?.();publisher?.dispose();},
 });
}
