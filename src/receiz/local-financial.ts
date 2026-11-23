import type {LocalFinancialRuntime,FinancialExecutorOptions,FinancialCommit,FinancialAction,FinancialPublication,WalletDevice,FinancialWalletCustodyChallenge,FinancialWalletCustodyAssertion} from './local-financial-runtime';
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
 bindWalletDevice?(device: WalletDevice, assert: (request:FinancialWalletCustodyChallenge)=>Promise<FinancialWalletCustodyAssertion>):NonNullable<ExecutorOptions['assertWalletCustody']>;
 publish(batch:FinancialPublication):Promise<unknown>;
 publishPeerRelease?(input:Readonly<{walletProof:Uint8Array;releaseOriginal:Uint8Array}>):Promise<unknown>;
 assertOpen():void;online():boolean;
 /** Optional host lifecycle in place of the browser's connection events. */
 subscribeReconnect?(listener:()=>void):()=>void;
 onCommitted?(commit:FinancialCommit):void|Promise<void>;
 runtime?:FinancialRuntime;kai?:()=>string;
}>&(
 Readonly<{sourceBytes:Uint8Array;receivedWallet?:never}>
 |Readonly<{sourceBytes?:never;receivedWallet:Readonly<{proofBytes:Uint8Array;ownerKeyId:string}>}>
);
function subscribeBrowserReconnect(listener:()=>void){
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
 let source;
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
 const store=input.store??(await loadReceiz()).createReceizBrowserAdmissionStore({
  databaseName:'receiz-bankeiz-wallet-admission',namespace:protectedWallet?'wallet:protected':`wallet:${source.artifactSha256}`,
 });
 input.assertOpen();
 const kai=input.kai??runtime.financialKaiNow;
 const device=input.bindWalletDevice&&runtime.bankFinancialWalletDevice?.(source);
 let assertWalletCustody=input.assertWalletCustody;
 if(input.bindWalletDevice){
  if(!device||!runtime.assertBankFinancialWalletDevice)throw Error('BANK_WALLET_DEVICE_REQUIRED');
  const assert=runtime.assertBankFinancialWalletDevice;
  assertWalletCustody=input.bindWalletDevice(device,request=>{
   open();
   if(request.credentialIdB64u!==device.credentialIdB64u)throw Error('BANK_WALLET_DEVICE_MISMATCH');
   return assert({...request,origin:device.origin,rpId:device.rpId});
  });
 }
 const executor=await runtime.createReceizAccountFinancialExecutor({source,store,originals:input.originals,signOwner:input.signOwner,signRecord:input.signRecord,assertWalletCustody,kai});
 const publisher=incoming?null:await runtime.createReceizAccountFinancialPublisher({
  source,executor,store,originals:input.originals,...(protectedWallet?{batchSize:1}:{}),
  async publish(batch){
   input.assertOpen();
   if(!input.online())throw Error('BANK_LOCAL_FINANCIAL_OFFLINE');
   if(protectedWallet){
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
 let closed=false,scheduled=false,peerPublished=false,publication:ReturnType<NonNullable<typeof publisher>['flush']>|undefined;
 const deliverPeer=input.publishPeerRelease;
 const canPublish=!!publisher||!!(heldPeerProof&&deliverPeer);
 function open(){input.assertOpen();if(closed)throw Error('BANK_LOCAL_FINANCIAL_CLOSED');}
 async function flushPeer():ReturnType<NonNullable<typeof publisher>['flush']>{
  if(peerPublished)return {status:'published'};
  if(!peerRoot||!heldPeerProof||!deliverPeer||!input.online())return {status:'pending'};
  try{
   const {release,state}=await executor.current();
   open();
   // Terminal custody must already be released locally. A reconnect never
   // requests a signature or credits a hop that has already spent onward.
   if(!release||state.sequence!=='0'||!input.online())return {status:'pending'};
   const ack=await deliverPeer({walletProof:heldPeerProof.slice(),releaseOriginal:runtime.exportReceizAccountFinancialRelease(release)});
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
 function flushPublication(){
  if(publication)return publication;
  scheduled=false;
  publication=(publisher?.flush()??flushPeer()).finally(()=>{
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
 function nudge(){
  if(!canPublish||closed||scheduled||!input.online())return;
  scheduled=true;queueMicrotask(runScheduledPublication);
 }
 const unsubscribe=canPublish?(input.subscribeReconnect??subscribeBrowserReconnect)(nudge):undefined;
 nudge();
 return Object.freeze({
  async preview(action:FinancialAction){open();const current=await executor.current();open();return runtime.projectReceizAccountFinancialAction(source,current.state,action,kai());},
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
  sourceReference(){open();return {allocationId:source.allocationId,artifactSha256:source.artifactSha256};},
  walletDevice(){open();return device||null;},
  current(){open();return executor.current();},
  async wallet(){open();const current=await executor.current();open();return runtime.financialSourceWalletAt(source,current.state,kai());},
  resolve(operationId:string){open();return executor.resolve(operationId);},
  async received(operationId:string){open();const proof=await publisher?.received(operationId);open();return proof??null;},
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
  flush(){open();return flushPublication();},
  dispose(){if(closed)return;closed=true;unsubscribe?.();publisher?.dispose();},
 });
}
