import {beforeEach,afterEach,expect,it,vi} from 'vitest';
import {openCanonicalIdentity} from '../src/receiz/native-identity';
import {BANK_NATIVE_SCOPES,BANK_APPLICATION_ID} from '../src/receiz/config';

// Scheduler contract only: no financial receipt or canonical holding is
// simulated as admission. Empty portfolio responses exercise actual identity
// grant/refresh choreography while asset commitment is an isolated callback.
const p=vi.hoisted(()=>({committed:undefined as (()=>void)|undefined,request:vi.fn()}));
vi.mock('../src/receiz/identity-vault',async original=>({...await original<typeof import('../src/receiz/identity-vault')>(),loadWalletObservation:async()=>null,loadAccountLedgerState:async()=>null,loadDepositSources:async()=>[],loadNativePaymentState:async()=>null,loadNativeAssetState:async()=>null,loadBankOperation:async()=>null}));
vi.mock('../src/receiz/native-asset',()=>({createNativeAssets:(input:{onCommitted?:()=>void})=>{p.committed=input.onCommitted;return{recovery:{},prepare:vi.fn(),execute:vi.fn(),discard:vi.fn()};}}));
vi.mock('../src/receiz/client',()=>({loadReceiz:async()=>({...await import('@receiz/sdk'),verifyReceizArtifact:async()=>({status:'verified-artifact'}),createReceizArtifactAdmissionEngine:()=>async()=>({verdict:'canonical-identity'}),isSdkIssuedReceizArtifactAdmission:()=>true,
 readReceizIdentityPublicBinding:async()=>({keyId:'a'.repeat(64),artifactSha256:'b'.repeat(64),artifactOwnerReceizId:'sender.receiz.id'}),readReceizIdentityArtifact:async()=>({owner:{uid:'fixture-user',username:'fixture'},issuedAt:'2026-10-18T00:00:00Z',keyId:'a'.repeat(64),crypto:{}}),projectReceizIdentityAccount:async()=>({authority:'identity-only'}),receizKaiNow:()=>({pulse:100,uPulse:100000000}),
 createReceizClient:({accessToken}:{accessToken?:string}={})=>accessToken?{auth:{grantedScopes:async()=>[...BANK_NATIVE_SCOPES]},request:p.request}:{identity:{continueReceizId:async()=>({ok:true,session:{uid:'fixture-user'}}),signLoginProof:async({challengeB64Url}:{challengeB64Url:string})=>({schema:'receiz.identity.login_proof.v1',keyId:'a'.repeat(64),alg:'Ed25519',challengeB64Url,signatureB64Url:'fixture-signature'}),exchangeProofAuthority:async({applicationId,scopes}:{applicationId:string;scopes:string[]})=>({applicationId,keyId:'a'.repeat(64),artifactDigest:'b'.repeat(64),grantedScopes:scopes,accessToken:'fixture-only',expiresAtKai:1000})}},
})}));
const empty={schema:'receiz.bank.native-asset-portfolio.v1',sources:[]};
beforeEach(()=>{p.committed=undefined;p.request.mockReset().mockResolvedValue(empty);vi.stubGlobal('navigator',{locks:{request:async(_name:unknown,_options:unknown,operation:()=>Promise<unknown>)=>operation()}});});
afterEach(()=>vi.unstubAllGlobals());
it('coalesces commits during an old pending read into one fresh portfolio read after it settles',async()=>{
 let finish!:(value:unknown)=>void;p.request.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));
 const identity=await openCanonicalIdentity(new Uint8Array([1]),'','fixture.receiz',true);
 try{
  await identity.operations!();await identity.listDeposits();await vi.waitFor(()=>expect(p.request).toHaveBeenCalledTimes(1));
  p.committed!();p.committed!();await identity.listDeposits();expect(p.request).toHaveBeenCalledTimes(1);
  finish(empty);await vi.waitFor(()=>expect(p.request).toHaveBeenCalledTimes(2));await identity.listDeposits();
  expect(p.request).toHaveBeenCalledTimes(2);expect(p.request.mock.calls.every(([path,options])=>path===`/api/connect/bank/assets/portfolio?applicationId=${BANK_APPLICATION_ID}`&&options.method==='POST')).toBe(true);
 }finally{identity.dispose();}
});
it('does not launch a queued post-commit read after the owning identity closes',async()=>{
 let finish!:(value:unknown)=>void;p.request.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));
 const identity=await openCanonicalIdentity(new Uint8Array([1]),'','fixture.receiz',true);
 await identity.operations!();await identity.listDeposits();await vi.waitFor(()=>expect(p.request).toHaveBeenCalledTimes(1));
 p.committed!();identity.dispose();finish(empty);await new Promise(resolve=>setTimeout(resolve,30));expect(p.request).toHaveBeenCalledTimes(1);
});
