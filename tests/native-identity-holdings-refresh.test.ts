import {beforeEach,afterEach,expect,it,vi} from 'vitest';
import {openCanonicalIdentity} from '../src/receiz/native-identity';
import {BANK_NATIVE_SCOPES,BANK_APPLICATION_ID} from '../src/receiz/config';
import {conformanceOfflineFixture} from './helpers/conformance-offline-sealer';

// Scheduler contract only: no financial receipt or canonical holding is
// simulated as admission. Empty portfolio responses exercise actual identity
// grant/refresh choreography while asset commitment is an isolated callback.
const p=vi.hoisted(()=>({committed:undefined as (()=>void)|undefined,request:vi.fn(),sources:vi.fn(),open:vi.fn()}));
vi.mock('../src/receiz/identity-vault',async original=>({...await original<typeof import('../src/receiz/identity-vault')>(),loadWalletObservation:async()=>null,loadAccountLedgerState:async()=>null,loadDepositSources:p.sources,loadNativePaymentState:async()=>null,loadMarketTradeState:async()=>null,loadNativeAssetState:async()=>null,loadReceivedNoteDepositState:async()=>null,loadBankOperation:async()=>null}));
vi.mock('../src/receiz/native-asset',()=>({createNativeAssets:(input:{onCommitted?:()=>void})=>{p.committed=input.onCommitted;return{recovery:{},prepare:vi.fn(),execute:vi.fn(),discard:vi.fn()};}}));
vi.mock('../src/receiz/client',()=>({loadReceiz:async()=>({...await import('@receiz/sdk'),verifyReceizArtifact:async()=>({status:'verified-artifact'}),createReceizArtifactAdmissionEngine:()=>async()=>({verdict:'canonical-identity'}),isSdkIssuedReceizArtifactAdmission:()=>true,
 readReceizIdentityPublicBinding:async()=>({keyId:'a'.repeat(64),artifactSha256:'b'.repeat(64),artifactOwnerReceizId:'sender.receiz.id'}),readReceizIdentityArtifact:async()=>({owner:{uid:'fixture-user',username:'fixture'},issuedAt:'2026-10-18T00:00:00Z',keyId:'a'.repeat(64),crypto:{}}),projectReceizIdentityAccount:async()=>({authority:'identity-only'}),receizKaiNow:()=>({pulse:100,uPulse:100000000}),
 createReceizClient:({accessToken}:{accessToken?:string}={})=>accessToken?{auth:{grantedScopes:async()=>[...BANK_NATIVE_SCOPES]},request:p.request}:{artifacts:{verifyAndOpen:p.open},identity:{continueReceizId:async()=>({ok:true,session:{uid:'fixture-user'}}),signLoginProof:async({challengeB64Url}:{challengeB64Url:string})=>({schema:'receiz.identity.login_proof.v1',keyId:'a'.repeat(64),alg:'Ed25519',challengeB64Url,signatureB64Url:'fixture-signature'}),exchangeProofAuthority:async({applicationId,scopes}:{applicationId:string;scopes:string[]})=>({applicationId,keyId:'a'.repeat(64),artifactDigest:'b'.repeat(64),grantedScopes:scopes,accessToken:'fixture-only',expiresAtKai:1000})}},
})}));
const empty={schema:'receiz.bank.native-asset-portfolio.v1',sources:[]};
beforeEach(()=>{p.committed=undefined;p.open.mockReset().mockRejectedValue(Error('CANONICAL_SOURCE_REQUIRED'));p.sources.mockReset().mockResolvedValue([]);p.request.mockReset().mockResolvedValue(empty);vi.stubGlobal('navigator',{locks:{request:async(_name:unknown,_options:unknown,operation:()=>Promise<unknown>)=>operation()}});});
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
it('reuses the exact settled held-source view until a committed asset change invalidates it',async()=>{
 const identity=await openCanonicalIdentity(new Uint8Array([1]),'','fixture.receiz',true);
 try{
  await identity.operations!();const first=await identity.listDeposits();await vi.waitFor(()=>expect(p.request).toHaveBeenCalledTimes(1));
  p.sources.mockClear();expect(await identity.listDeposits()).toBe(first);expect(p.sources).not.toHaveBeenCalled();
  p.committed!();const successor=await identity.listDeposits();expect(successor).not.toBe(first);expect(successor).toEqual([]);
 }finally{identity.dispose();}
});
it('requires a complete owner-bound vault read before settling a held inventory snapshot',async()=>{
 const identity=await openCanonicalIdentity(new Uint8Array([1]),'','fixture.receiz',true);
 try{await identity.listDeposits();expect(p.sources).toHaveBeenCalledWith(identity.binding,{requireComplete:true});}
 finally{identity.dispose();}
});
it('invalidates the held view on a source event and refuses another read after identity closure',async()=>{
 const events=new EventTarget();vi.stubGlobal('addEventListener',events.addEventListener.bind(events));
 const identity=await openCanonicalIdentity(new Uint8Array([1]),'','fixture.receiz',true);
 const first=await identity.listDeposits();await vi.waitFor(()=>expect(p.request).toHaveBeenCalledTimes(1));
 events.dispatchEvent(new Event('bankeiz:asset-sources'));
 const next=await identity.listDeposits();expect(next).not.toBe(first);expect(identity.knownDeposits?.()).toBe(next);
 identity.dispose();await expect(identity.listDeposits()).rejects.toThrow();
});
it('keeps the settled source view after a failed successor open and retries instead of caching a partial view',async()=>{
 const events=new EventTarget();vi.stubGlobal('addEventListener',events.addEventListener.bind(events));
 const identity=await openCanonicalIdentity(new Uint8Array([1]),'','fixture.receiz',true);
 try{
  const held=await identity.listDeposits();await vi.waitFor(()=>expect(p.request).toHaveBeenCalledTimes(1));
  p.sources.mockResolvedValue([{bytes:new Uint8Array([1]),filename:'unavailable.receiz'}]);events.dispatchEvent(new Event('bankeiz:asset-sources'));
  await expect(identity.listDeposits()).rejects.toThrow('CANONICAL_SOURCE_REQUIRED');expect(identity.knownDeposits?.()).toBe(held);
  p.sources.mockResolvedValue([]);expect(await identity.listDeposits()).not.toBe(held);
 }finally{identity.dispose();}
});
it('opens a canonical native-holding enclosure once and still refuses unsigned holding metadata',async()=>{
 // Actual SDK seal/open under the existing explicit ephemeral fixture root.
 // Identity/HTTP scheduler isolation above does not admit this native holding.
 const f=await conformanceOfflineFixture({account:true}),r=f.runtime;
 const admission=await r.createReceizArtifactAdmissionEngine()(await r.verifyReceizArtifact(f.identity.bytes),{profile:'identity',identityPassphrase:f.identity.phrase});
 const sealer=r.offline.createReceizOfflineSealer({ownerIdentityAdmission:admission,store:f.store,resources:f.resources,fetch:async()=>{throw Error('NETWORK_FORBIDDEN');}});
 const sealed=await sealer.seal({bytes:new TextEncoder().encode('{"schema":"receiz.bank.native-asset-holding.v1","verified":true}'),filename:'holding.json',mimeType:'application/json'});
 p.open.mockImplementation((file:File)=>r.createReceizClient().artifacts.verifyAndOpen(file));
 p.sources.mockResolvedValue([{bytes:sealed.artifactBytes,filename:sealed.filename}]);
 const identity=await openCanonicalIdentity(new Uint8Array([1]),'','fixture.receiz',true);
 try{await expect(identity.listDeposits()).rejects.toThrow('BANK_ASSET_HOLDING_UNVERIFIED');expect(p.open).toHaveBeenCalledTimes(1);expect(identity.knownDeposits?.()).toBeNull();}
 finally{identity.dispose();}
},60_000);
