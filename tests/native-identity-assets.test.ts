import {beforeEach,afterEach,expect,it,vi} from 'vitest';
import {openCanonicalIdentity} from '../src/receiz/native-identity';
import {BANK_APPLICATION_ID,BANK_NATIVE_SCOPES} from '../src/receiz/config';
import {nativeAssetChallenge,type NativeAssetReview} from '../src/receiz/native-asset-protocol';
import {nativePaymentChallenge,type NativePaymentReview} from '../src/receiz/native-payment-protocol';
import type {BankOperationInput} from '../src/receiz/bank-operations';

// Real asset/payment choreography; only identity admission, encrypted storage
// and authenticated transport are isolated protocol fixtures here.
const p=vi.hoisted(()=>({generic:null as unknown,payment:null as unknown,asset:null as unknown,wallet:null as unknown,note:null as unknown,storedHead:null as unknown,request:vi.fn(),qualify:vi.fn(),locks:vi.fn()}));
vi.mock('../src/receiz/identity-vault',async original=>({...await original<typeof import('../src/receiz/identity-vault')>(),
 loadOfflineNoteState:async()=>p.note,loadPreparedNoteState:async()=>null,
 loadWalletObservation:async()=>p.storedHead,assertWalletSendCustody:async()=>{if((p.storedHead as {source?:string}|null)?.source==='local-note-head')throw Error('BANK_WALLET_LOCAL_HEAD_REQUIRED');},loadAccountLedgerState:async()=>null,loadBankOperation:async()=>p.generic,
 loadNativePaymentState:async()=>p.payment,loadNativeAssetState:async()=>p.asset,loadWalletSendState:async()=>p.wallet,
 saveNativePaymentState:async(_binding:unknown,value:unknown,expected:unknown)=>{expect(p.payment).toEqual(expected);p.payment=structuredClone(value);},
 saveNativeAssetState:async(_binding:unknown,value:unknown,expected:unknown)=>{expect(p.asset).toEqual(expected);p.asset=structuredClone(value);},
}));
vi.mock('../src/receiz/client',()=>({loadReceiz:async()=>({...await import('@receiz/sdk'),
 verifyReceizArtifact:async()=>({status:'verified-artifact'}),createReceizArtifactAdmissionEngine:()=>async()=>({verdict:'canonical-identity'}),isSdkIssuedReceizArtifactAdmission:()=>true,
 readReceizIdentityPublicBinding:async()=>({keyId:'a'.repeat(64),artifactSha256:'b'.repeat(64),artifactOwnerReceizId:'sender.receiz.id'}),
 readReceizIdentityArtifact:async()=>({owner:{uid:'fixture-user',username:'fixture'},issuedAt:'2026-10-18T00:00:00Z',keyId:'a'.repeat(64),crypto:{}}),projectReceizIdentityAccount:async()=>({authority:'identity-only'}),
 receizKaiNow:()=>({pulse:100,uPulse:100000000}),
 createReceizClient:({accessToken}:{accessToken?:string}={})=>accessToken?{auth:{grantedScopes:async()=>[...BANK_NATIVE_SCOPES]},request:p.request,runtime:{qualifyV124:p.qualify}}:{identity:{
  continueReceizId:async()=>({ok:true,session:{uid:'fixture-user'}}),
  signLoginProof:async({challengeB64Url}:{challengeB64Url:string})=>({schema:'receiz.identity.login_proof.v1',keyId:'a'.repeat(64),alg:'Ed25519',challengeB64Url,signatureB64Url:'fixture-signature'}),
  exchangeProofAuthority:async({applicationId,scopes}:{applicationId:string;scopes:string[]})=>({applicationId,keyId:'a'.repeat(64),artifactDigest:'b'.repeat(64),grantedScopes:scopes,accessToken:'fixture-only',expiresAtKai:1000}),
 }},
})}));
const fund:BankOperationInput={kind:'fund-asset',rail:'reserve',amountUsdCents:'100',definition:{name:'Test asset',symbol:'TEST',units:'10',description:'Fixture only',linkedProofDigest:null}};
const send:BankOperationInput={kind:'send-value',rail:'reserve',amountUsdCents:'100',recipient:'receiver.receiz.id'};
function prepared(kind:'assets'|'payments',operation:BankOperationInput){
 const request={...operation,schema:'bankeiz.operation-request.v1' as const,applicationId:BANK_APPLICATION_ID,requestId:kind+'-fixture-0001',actorReceizId:'sender.receiz.id'};
 const review={schema:kind==='assets'?'receiz.bank.native-asset-review.v1':'receiz.bank.native-payment-review.v1',request,keyId:'a'.repeat(64),planDigest:'c'.repeat(64),terms:{debitUsdCents:'100',debitPhiMicro:'500000',creditUsdCents:'0',creditPhiMicro:'0',feeUsdCents:'0',quantityMicro:kind==='assets'?'10000000':'0',assetDigest:null,recipient:kind==='assets'?null:'receiver.receiz.id',expiresAtKaiUPulse:9000000000000000}};
 return{...review,ticket:'fixture-ticket',challengeB64Url:kind==='assets'?nativeAssetChallenge(review as NativeAssetReview):nativePaymentChallenge(review as NativePaymentReview)};
}
function unknown(kind:'assets'|'payments'){
 const value=prepared(kind,kind==='assets'?fund:send);
 return{schema:kind==='assets'?'bank.native-assets.v1':'bank.native-payments.v1',current:{prepared:value,consentProof:{schema:'receiz.identity.login_proof.v1',keyId:'a'.repeat(64),alg:'Ed25519',challengeB64Url:value.challengeB64Url,signatureB64Url:'fixture'},state:'unknown'},history:[]};
}
beforeEach(()=>{
 p.generic=null;p.payment=null;p.asset=null;p.wallet=null;p.note=null;p.storedHead=null;p.qualify.mockReset().mockRejectedValue(Error('GENERIC_RUNTIME_MUST_NOT_BE_USED'));
 const locks=new Map<string,Promise<unknown>>();
 p.locks.mockReset().mockImplementation((name:string,_options:unknown,operation:()=>Promise<unknown>)=>{const result=(locks.get(name)??Promise.resolve()).catch(()=>{}).then(operation);locks.set(name,result);return result;});
 vi.stubGlobal('navigator',{locks:{request:p.locks}});
 p.request.mockReset().mockImplementation(async(path:string,options:{body:Record<string,unknown>})=>{
  const body=options.body;
  if(path.includes('/prepare?')){
   const kind=path.includes('/assets/')?'assets':'payments',value=prepared(kind,body as BankOperationInput);
   value.request=body as typeof value.request;
   const review={schema:value.schema,request:value.request,keyId:value.keyId,planDigest:value.planDigest,terms:value.terms};
   value.challengeB64Url=kind==='assets'?nativeAssetChallenge(review as NativeAssetReview):nativePaymentChallenge(review as NativePaymentReview);return value;
  }
  if(path.includes('/execute?'))throw Error('LOST_RESPONSE');
  if(path.includes('/recover?'))return{status:'unknown'};
  throw Error('UNEXPECTED_TRANSPORT');
 });
});
afterEach(()=>vi.unstubAllGlobals());
const open=()=>openCanonicalIdentity(new Uint8Array([1]),'','fixture.receiz',true);
it('retains an approved asset intent before submission and resolves its exact nonce without re-execution',async()=>{
 const identity=await open();try{
  const api=await identity.operations!(),review=await api.prepare(fund);
  await expect(api.execute(review,'wrong-confirmation')).rejects.toThrow('EXACT_CONFIRMATION');expect(p.asset).toBeNull();
  const result=await api.execute(review,review.confirmationDigest);expect(result.status).toBe('unknown');
  expect(p.asset).toMatchObject({schema:'bank.native-assets.v1',current:{state:'unknown',prepared:{request:review.request}}});expect(p.payment).toBeNull();
  const recovery=identity.executionRecovery!();expect(await recovery.status()).toMatchObject({state:'unknown',operationKind:'asset.execution',operationId:review.request.requestId});
  await expect(recovery.resolve()).rejects.toThrow('CONSENT');expect((await recovery.resolve(true))?.status).toBe('unknown');
  expect(p.request.mock.calls.map(([path])=>path)).toEqual(['prepare','execute','recover'].map(action=>`/api/connect/bank/assets/${action}?applicationId=${BANK_APPLICATION_ID}`));
  expect(p.request.mock.calls.at(-1)?.[1]).toEqual({method:'POST',body:{nonce:review.request.requestId,planDigest:'c'.repeat(64),ticket:'fixture-ticket'}});
  expect(p.locks.mock.calls.every(([name])=>name==='receiz-bank-execution:'+'b'.repeat(64))).toBe(true);expect(p.qualify).not.toHaveBeenCalled();
 }finally{identity.dispose();}
});
it.each(['asset','payment','generic','wallet'] as const)('blocks new operations while the %s family has unresolved custody',async family=>{
 if(family==='asset')p.asset=unknown('assets');else if(family==='payment')p.payment=unknown('payments');else if(family==='wallet')p.wallet={schema:'bank.wallet-sends.v1',authority:'wallet-observation',current:{status:'unknown'},history:[]};else p.generic={state:'prepared'};
 const identity=await open();try{const api=await identity.operations!();await expect(api.prepare(family==='asset'?send:fund)).rejects.toThrow('BANK_EXECUTION_PENDING');expect(p.request).not.toHaveBeenCalled();}finally{identity.dispose();}
});
it('rechecks other families after preparation and refuses submission if another intent became unknown',async()=>{
 const identity=await open();try{const api=await identity.operations!(),review=await api.prepare(fund);p.payment=unknown('payments');await expect(api.execute(review,review.confirmationDigest)).rejects.toThrow('BANK_EXECUTION_PENDING');expect(p.asset).toBeNull();expect(p.request.mock.calls.every(([path])=>!path.includes('/execute?'))).toBe(true);}finally{identity.dispose();}
});
it.each(['asset','payment'] as const)('selects the pending %s family before verifying unrelated terminal receipts',async family=>{
 const terminal={schema:'bank.execution-checkpoint.v1',state:'committed',operationId:'generic-old',plan:{applicationId:BANK_APPLICATION_ID,attemptId:'generic-old',operationKind:'asset.execution',exactPlanDigest:'d'.repeat(64)}};
 p.generic=terminal;
 if(family==='asset'){p.asset=unknown('assets');p.payment={schema:'bank.native-payments.v1',current:{state:'committed'},history:[]};}
 else {p.payment=unknown('payments');p.asset={schema:'bank.native-assets.v1',current:{state:'committed'},history:[]};}
 const identity=await open();try{expect(await identity.executionRecovery!().status()).toMatchObject({state:'unknown',operationKind:family==='asset'?'asset.execution':'wallet.transfer'});expect(p.request).not.toHaveBeenCalled();}finally{identity.dispose();}
});
it('keeps pending asset recovery reachable when older payment metadata is damaged',async()=>{
 p.asset=unknown('assets');p.payment={schema:'damaged-terminal',current:{state:'committed'},history:[]};
 const identity=await open();try{expect(await identity.executionRecovery!().status()).toMatchObject({state:'unknown',operationKind:'asset.execution'});expect(p.request).not.toHaveBeenCalled();}finally{identity.dispose();}
});
it('refuses a new native operation when another family has malformed custody',async()=>{
 p.payment={schema:'damaged-terminal',current:{state:'committed'},history:[]};
 const identity=await open();try{await expect((await identity.operations!()).prepare(fund)).rejects.toThrow('BANK_EXECUTION_CHECKPOINT_INVALID');expect(p.asset).toBeNull();expect(p.request).not.toHaveBeenCalled();}finally{identity.dispose();}
});
it.each(['key','owner'] as const)('refuses a pending asset checkpoint for a different %s before recovery transport',async field=>{
 const saved=unknown('assets');if(field==='key')saved.current.prepared.keyId='d'.repeat(64);else saved.current.prepared.request.actorReceizId='foreign.receiz.id';p.asset=saved;
 const identity=await open();try{await expect(identity.executionRecovery!().resolve(true)).rejects.toThrow('BANK_ASSET_CHECKPOINT_INVALID');expect(p.request).not.toHaveBeenCalled();}finally{identity.dispose();}
});
it('does not submit or sign an asset review after its identity closes',async()=>{
 const identity=await open(),api=await identity.operations!(),review=await api.prepare(fund);identity.dispose();await expect(api.execute(review,review.confirmationDigest)).rejects.toThrow('CLOSED');expect(p.asset).toBeNull();expect(p.request.mock.calls.every(([path])=>!path.includes('/execute?'))).toBe(true);
});

it('refuses a new Wallet Send while a Note is preparing before its local account head exists',async()=>{
 p.note={schema:'receiz.bank.offline-notes-device.v1',keyId:'a'.repeat(64),uid:'fixture-user',create:{phase:'preparing',intent:{noteId:'held-note'},rail:'reserve',amountUsdCents:'100'},notes:{},deposits:{}};
 const identity=await open();try{await expect((await identity.walletSend!()).prepare({recipient:'receiver',amountUsdCents:'100'})).rejects.toThrow('BANK_EXECUTION_PENDING');expect(p.request).not.toHaveBeenCalled();}finally{identity.dispose();}
});

it('reopens durable Note custody before Wallet review when a different tab changed the saved local head',async()=>{
 const identity=await open();try{expect(identity.knownWallet()).toBeNull();p.storedHead={source:'local-note-head'};await expect((await identity.walletSend!()).prepare({recipient:'receiver',amountUsdCents:'100'})).rejects.toThrow('BANK_WALLET_LOCAL_HEAD_REQUIRED');expect(p.request).not.toHaveBeenCalled();}finally{identity.dispose();}
});
