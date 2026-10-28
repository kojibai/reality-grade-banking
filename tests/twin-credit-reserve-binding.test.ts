import {readFileSync} from 'node:fs';
import {transformSync} from 'esbuild';
import {expect,it,vi} from 'vitest';
import {createTwinCreditPurchaseCoordination,readTwinCreditPurchaseIntent} from '../src/receiz/twin-credit-purchase-intent';

// Run the actual identity composition. Only encrypted custody, transport and
// display readers are injected; no purchase or native money request is made.
function fixture(){
 const source=readFileSync(new URL('../src/receiz/native-identity.ts',import.meta.url),'utf8').replaceAll("await(await import('./identity-vault')).loadShareCertificateState(binding)",'await loadShareCertificateState(binding)');
 const start=source.indexOf('  async function requestNativeTwinUpgrade('),end=source.indexOf('\n  let businessChat:',start);
 const helperStart=source.indexOf('  async function assertWalletExecutionQualification('),helperEnd=source.indexOf('  let walletSendPromise:',helperStart);
 const helpers=helperStart<0?'':source.slice(helperStart,helperEnd);
 const noteStart=source.indexOf('  async function noteLock<'),noteEnd=source.indexOf('\n  async function offlineNotes(',noteStart);
 const notesLock=source.slice(noteStart,noteEnd);
 const pendingStart=source.indexOf('  function hasPendingNative('),pendingEnd=source.indexOf('  async function withAccountExecutionLock<',pendingStart),pendingSource=source.slice(pendingStart,pendingEnd);
 const body=source.slice(start,end).replace("const {requestTwinUpgrade}=await import('./twin-upgrade');",'const {requestTwinUpgrade}=deps;');
 const state={head:false,durableHead:false,pending:false,note:false,locked:false,notesLocked:false,revisionAtRead:-1};
 const events:{type:string;detail?:unknown}[]=[],trace:string[]=[];
 const quote={schema:'receiz.usage.reserve-purchase.quote.v1',ownerUserId:'owner',clientOperationId:'approved-operation',credits:'2500',amountUsdCents:'2500',expiresAt:'2099-01-01T00:00:00Z',bankContributionUsdCents:'2500',cardShortfallUsdCents:'0',minimumCardDepositUsdCents:'50',exactCardDepositAvailable:true};
 let retained:unknown=null;
 const deps={
  loadHostedCheckoutState:async()=>null,loadShareCertificateState:async()=>null,
  lifetime:new AbortController(),initial:null,walletReading:undefined as Promise<unknown>|undefined,
  prepareTransport:async()=>{},connectClient:async()=>{},unsigned:{identity:{buildReceizIdContinueRequest:async()=>({})}},keyFile:{issuedAt:'2026-10-25',owner:{uid:'owner',username:'owner'}},transportKeyFile:{},transportPhrase:null,messagingRetention:Promise.resolve({known:()=>null,capture:()=>{}}),
  noteOpen(){},hasLocalWalletHead:()=>state.head,
  cancelUnsentNotesLocked:vi.fn(async()=>{}),
  createTwinCreditPurchaseCoordination,readTwinCreditPurchaseIntent,
  loadTwinCreditPurchaseState:async()=>structuredClone(retained),saveTwinCreditPurchaseState:async(_binding:unknown,next:unknown,previous:unknown)=>{expect(retained).toEqual(previous);retained=structuredClone(next);},
  deviceBankExecutionStore:()=>({load:async()=>state.pending?{state:'unknown'}:null}),loadNativePaymentState:async()=>null,loadNativeAssetState:async()=>null,loadWalletSendState:async()=>null,loadMarketTradeState:async()=>null,reconcileReceivedNotesLocked:vi.fn(async()=>{}),
  offlineNotes:async()=>({pending:async()=>state.note?{noteId:'held-note'}:null}),
  assertWalletSendCustody:vi.fn(async()=>{if(state.durableHead)throw Error('BANK_WALLET_LOCAL_HEAD_REQUIRED');}),
  isWalletQuoteHeld:()=>false,adoptConnectedWalletResponse:vi.fn(async()=>{}),
  readWallet:vi.fn(async()=>{trace.push('fresh-wallet');return{reserveUsdCents:'0'};}),
  dispatchEvent:(event:{type:string;detail?:unknown})=>{events.push(event);return true;},
  Event:class{constructor(readonly type:string){}},CustomEvent:class{constructor(readonly type:string,readonly options:{detail:unknown}){}get detail(){return this.options.detail;}},
  withAccountExecutionLock:async<T,>(work:()=>Promise<T>)=>{state.locked=true;trace.push('account-lock');try{return await work();}finally{state.locked=false;}},
  navigator:{locks:{request:async<T,>(_name:string,_options:unknown,work:()=>Promise<T>)=>{state.notesLocked=true;trace.push('notes-lock');try{return await work();}finally{state.notesLocked=false;}}}},
  requestTwinUpgrade:vi.fn(async(_uid:string,_proof:unknown,input:{action:string})=>{trace.push('request:'+input.action);return{accountUid:'owner',twinAccess:true,creditFunding:{quote,...(input.action==='credits-quote'?{}:{purchase:input.action==='credits-purchase-status'?{status:'ready'}:{status:'completed',amountUsdCents:'2500',purchasedCredits:'2500',bucketId:'native-bucket',walletDebitId:'native-debit',balanceAfterPhiMicro:'999999999999'}})}};}),
 };
 const code=transformSync(`function harness(deps:any){const{lifetime,prepareTransport,connectClient,unsigned,keyFile,transportKeyFile,transportPhrase,messagingRetention,noteOpen,hasLocalWalletHead,cancelUnsentNotesLocked,offlineNotes,assertWalletSendCustody,isWalletQuoteHeld,adoptConnectedWalletResponse,readWallet,navigator,dispatchEvent,CustomEvent,Event,withAccountExecutionLock,createTwinCreditPurchaseCoordination,readTwinCreditPurchaseIntent,loadTwinCreditPurchaseState,saveTwinCreditPurchaseState,deviceBankExecutionStore,loadNativePaymentState,loadNativeAssetState,loadWalletSendState,loadMarketTradeState,loadHostedCheckoutState,loadShareCertificateState,reconcileReceivedNotesLocked}=deps;const binding={artifactSha256:'identity-digest',keyId:'identity-key'},BANK_MESSAGING_SCOPES=[],BANK_MESSAGING_CONSENT='';let accountUid='owner',confirmedTwinAccess=false,walletRevision=0,knownWallet=deps.initial,walletReading=deps.walletReading;${pendingSource}${notesLock}${helpers}${body};return{run:upgradeTwin,recover:recoverTwinCreditPurchase,otherMoney:()=>assertNoOtherPending(false),revision:()=>walletRevision};}`,{loader:'ts',target:'es2022'}).code;
 return{state,deps,trace,events,quote,retained:()=>retained,open:()=>new Function(code+';return harness;')()(deps)};
}

it.each(['head','durableHead','pending','note'] as const)('Reserve purchase cannot bypass existing %s custody/pending protection',async blocked=>{
 const f=fixture();f.state[blocked]=true;const identity=f.open();
 await expect(identity.run({action:'credits-purchase',operationId:'approved-operation'})).rejects.toThrow(/BANK_(?:WALLET_LOCAL_HEAD_REQUIRED|EXECUTION_PENDING|NOTE_ATTEMPT_PENDING)/);
 expect(f.deps.requestTwinUpgrade).not.toHaveBeenCalled();
});

it('quote qualification is read-only and preserves native terms while reporting local ineligibility',async()=>{
 const f=fixture();f.state.pending=true;const result=await f.open().run({action:'credits-quote',operationId:'approved-operation',amountUsd:'25'});
 expect(result.creditsReserveEligible).toBe(false);expect(result.creditFunding.quote).toBe(f.quote);
 expect(f.deps.cancelUnsentNotesLocked).not.toHaveBeenCalled();expect(f.deps.reconcileReceivedNotesLocked).not.toHaveBeenCalled();
 expect(f.trace).not.toContain('account-lock');expect(f.events).toEqual([]);
});

it('eligible quote does not cancel notes, reconcile received value, or publish a debit',async()=>{
 const f=fixture(),identity=f.open(),result=await identity.run({action:'credits-quote',operationId:'approved-operation',amountUsd:'25'});
 expect(result.creditsReserveEligible).toBe(true);expect(result.creditFunding.quote).toBe(f.quote);
 expect(f.deps.cancelUnsentNotesLocked).not.toHaveBeenCalled();expect(f.deps.reconcileReceivedNotesLocked).not.toHaveBeenCalled();
 expect(identity.revision()).toBe(0);expect(f.deps.readWallet).not.toHaveBeenCalled();expect(f.events).toEqual([]);
});

it('Reserve eligibility from a quote cannot bypass a newly retained durable Note head',async()=>{
 const f=fixture(),identity=f.open();
 expect((await identity.run({action:'credits-quote',operationId:'approved-operation',amountUsd:'25'})).creditsReserveEligible).toBe(true);
 f.state.durableHead=true;
 await expect(identity.run({action:'credits-purchase',operationId:'approved-operation'})).rejects.toThrow('BANK_WALLET_LOCAL_HEAD_REQUIRED');
 expect(f.deps.requestTwinUpgrade.mock.calls.map(call=>call[2].action)).toEqual(['credits-quote']);
});

it('an approved Reserve debit rechecks under account and Notes locks and publishes the recorded source',async()=>{
 const f=fixture();let observedLocks=false;
 f.deps.requestTwinUpgrade.mockImplementation(async()=>{observedLocks=f.state.locked&&f.state.notesLocked;return{accountUid:'owner',twinAccess:true,creditFunding:{quote:f.quote,purchase:{status:'completed',amountUsdCents:'2500',purchasedCredits:'2500',bucketId:'native-bucket',walletDebitId:'native-debit',balanceAfterPhiMicro:'999999999999'}}};});
 const identity=f.open();await identity.run({action:'credits-purchase',operationId:'approved-operation'});
 expect(observedLocks).toBe(true);expect(f.deps.reconcileReceivedNotesLocked).toHaveBeenCalledOnce();
 expect(identity.revision()).toBe(1);expect(f.events).toContainEqual({type:'bankeiz:wallet-send-recorded',options:{detail:{identityDigest:'identity-digest',accountUid:'owner'}}});
 await vi.waitFor(()=>expect(f.deps.readWallet).toHaveBeenCalledOnce());
 expect(f.deps.adoptConnectedWalletResponse).not.toHaveBeenCalled();
});

it('a pre-debit wallet read drains before the fresh source read, without applying a partial balance',async()=>{
 const f=fixture();let release!:()=>void;f.deps.walletReading=new Promise(resolve=>{release=()=>resolve(null);});
 const identity=f.open();await identity.run({action:'credits-purchase',operationId:'approved-operation'});
 expect(identity.revision()).toBe(1);expect(f.deps.readWallet).not.toHaveBeenCalled();
 release();await vi.waitFor(()=>expect(f.deps.readWallet).toHaveBeenCalledOnce());
 expect(f.events.some(event=>event.type==='bankeiz:account-observation')).toBe(true);
 expect(f.deps.adoptConnectedWalletResponse).not.toHaveBeenCalled();
});

it('read-only completion recovery remains available beneath a held local Note head',async()=>{
 const f=fixture();f.state.head=true;const identity=f.open();
 f.deps.requestTwinUpgrade.mockResolvedValue({accountUid:'owner',twinAccess:true,creditFunding:{quote:f.quote,purchase:{status:'completed',amountUsdCents:'2500',purchasedCredits:'2500',bucketId:'native-bucket',walletDebitId:'native-debit',balanceAfterPhiMicro:'0'}}});
 expect((await identity.run({action:'credits-purchase-status',operationId:'approved-operation'})).creditFunding.purchase.status).toBe('completed');
 expect(f.deps.reconcileReceivedNotesLocked).not.toHaveBeenCalled();expect(f.deps.cancelUnsentNotesLocked).not.toHaveBeenCalled();
 expect(f.deps.readWallet).not.toHaveBeenCalled();
});

it('an unknown Reserve purchase blocks different money work across reopen until its native outcome resolves',async()=>{
 const f=fixture(),base=f.deps.requestTwinUpgrade.getMockImplementation()!;
 f.deps.requestTwinUpgrade.mockImplementation(async(uid,proof,input)=>{if(input.action==='credits-purchase')throw Error('response lost');return base(uid,proof,input);});
 await expect(f.open().run({action:'credits-purchase',operationId:'approved-operation'})).rejects.toThrow('response lost');
 expect(f.retained()).toMatchObject({stage:'unknown',operationId:'approved-operation'});
 const reopened=f.open();await expect(reopened.otherMoney()).rejects.toThrow('BANK_EXECUTION_PENDING');
 await expect(reopened.run({action:'credits-purchase',operationId:'different-operation'})).rejects.toThrow('BANK_EXECUTION_PENDING');
 expect(f.deps.cancelUnsentNotesLocked).toHaveBeenCalledOnce();
 const recovered=await reopened.recover();expect(recovered?.operationId).toBe('approved-operation');expect(recovered?.funding.purchase?.status).toBe('ready');expect(f.retained()).not.toBeNull();
 f.deps.requestTwinUpgrade.mockImplementation(base);
 await reopened.run({action:'credits-purchase',operationId:'approved-operation'});expect(f.retained()).toBeNull();
 await expect(reopened.otherMoney()).resolves.toBeUndefined();expect(f.events.filter(event=>event.type==='bankeiz:wallet-send-recorded')).toHaveLength(1);
});
