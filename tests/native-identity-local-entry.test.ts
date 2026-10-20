import {beforeEach,expect,it,vi} from 'vitest';
import {BANK_APPLICATION_ID,BANK_READ_SCOPES} from '../src/receiz/config';
import {openCanonicalIdentity} from '../src/receiz/native-identity';
// Transport/entry sequencing only; canonical admission is covered separately.
const p=vi.hoisted(()=>({enroll:vi.fn(),seal:vi.fn(),continueId:vi.fn(),grant:vi.fn(),persist:vi.fn(),foreign:false}));
const original=()=>({owner:{uid:'fixture-owner',username:'fixture'},issuedAt:'2026-10-13T00:00:00Z',keyId:'fixture-key',alg:'Ed25519',crypto:{privateKeyPkcs8B64u:'private-device-only',publicKeyRawB64u:'fixture-public'}});
vi.mock('../src/receiz/identity-vault',async original=>({...await original<typeof import('../src/receiz/identity-vault')>(),loadWalletObservation:async()=>null,loadOfflineNoteState:async()=>null,loadPreparedNoteState:async()=>null,loadConnectedNoteState:async()=>null,saveProtectedIdentityTransport:p.persist}));
vi.mock('../src/receiz/proof-resource-continuity',()=>({loadBankProofResources:async()=>({wasm:new Uint8Array([1]),zkey:new Uint8Array([1])})}));
vi.mock('../src/receiz/identity-protection',()=>({protectIdentityKeyFile:async(key:ReturnType<typeof original>)=>({...key,crypto:{...key.crypto,privateKeyPkcs8B64u:null}})}));
vi.mock('@receiz/sdk/offline',()=>({createReceizIndexedDbSealStore:()=>({}),createReceizOfflineSealer:()=>({enroll:p.enroll,seal:p.seal})}));
vi.mock('../src/receiz/client',()=>({loadReceiz:async()=>({
 verifyReceizArtifact:async(bytes:Uint8Array)=>({status:'verified-artifact',marker:bytes[0]}),createReceizArtifactAdmissionEngine:()=>async(v:{marker:number})=>({verdict:'canonical-identity',marker:v.marker}),isSdkIssuedReceizArtifactAdmission:()=>true,
 readReceizIdentityPublicBinding:async(v:{marker:number})=>({keyId:v.marker===2&&p.foreign?'foreign-key':'fixture-key',artifactSha256:(v.marker===2?'b':'a').repeat(64),identityOwnerReceizId:'fixture-owner'}),
 readReceizIdentityArtifact:async(bytes:Uint8Array)=>{const key=original();return bytes[0]===2?{...key,crypto:{...key.crypto,privateKeyPkcs8B64u:null}}:key;},projectReceizIdentityAccount:async()=>({authority:'identity-only'}),
 receizKaiNow:()=>({pulse:100}),receizBase64UrlEncode:()=> 'local-random-protection-phrase',serializeReceizIdentityArtifact:()=> 'protected-fixture',sha256ReceizBytes:async()=> 'a'.repeat(64),createReceizProofAuthorityChallenge:()=>({challenge:{},challengeB64Url:'fixture'}),
 createReceizClient:({accessToken}:{accessToken?:string}={})=>accessToken?{auth:{grantedScopes:async()=>[...BANK_READ_SCOPES]},connect:{wallet:async()=>({ok:true,wallet:{userId:'fixture-owner',balanceUsd:'3.00',balancePhiMicro:'2',valueStates:{settledBalanceUsdCents:'100',ecosystemBalanceUsdCents:'200'},sync:{},rollup:{}}})}}:{identity:{continueReceizId:p.continueId,signLoginProof:async()=>({}),exchangeProofAuthority:p.grant}},
})}));
beforeEach(()=>{p.foreign=false;p.enroll.mockReset().mockResolvedValue(undefined);p.seal.mockReset().mockResolvedValue({artifactBytes:new Uint8Array([2])});p.persist.mockReset().mockResolvedValue(undefined);p.continueId.mockReset().mockResolvedValue({ok:true,session:{uid:'fixture-owner'}});p.grant.mockReset().mockResolvedValue({applicationId:BANK_APPLICATION_ID,keyId:'fixture-key',artifactDigest:'b'.repeat(64),grantedScopes:[...BANK_READ_SCOPES],accessToken:'test-only',expiresAtKai:200});});
it.each([{plan:'free',entitlementPlan:'free',want:false},{plan:'premium',entitlementPlan:'business',want:true}])('reuses the existing sign-in entitlement for Twin ordering without another account request: $entitlementPlan',async({plan,entitlementPlan,want})=>{
 p.continueId.mockResolvedValue({ok:true,session:{uid:'fixture-owner',plan,entitlementPlan}});
 const identity=await openCanonicalIdentity(new Uint8Array([1]),'','fixture.receiz',true);
 try{await identity.readWallet();expect(identity.knownTwinAccess?.()).toBe(want);expect(p.continueId).toHaveBeenCalledTimes(1);expect(p.grant).toHaveBeenCalledTimes(1);}finally{identity.dispose();}
});
it('opens the already verified local identity without enrolling or reaching a server',async()=>{
 p.enroll.mockRejectedValue(Error('SOURCE_UNAVAILABLE'));
 const identity=await openCanonicalIdentity(new Uint8Array([1]),'','fixture.receiz',true);
 try{expect(identity.binding.keyId).toBe('fixture-key');expect(p.enroll).not.toHaveBeenCalled();expect(p.continueId).not.toHaveBeenCalled();await expect(identity.readWallet()).rejects.toThrow('SOURCE_UNAVAILABLE');expect(p.continueId).not.toHaveBeenCalled();expect(p.grant).not.toHaveBeenCalled();}
 finally{identity.dispose();}
});
it('opens empty Notes from a clear original without protecting, sealing or connecting the identity',async()=>{
 p.enroll.mockRejectedValue(new DOMException('operation failed','OperationError'));
 const identity=await openCanonicalIdentity(new Uint8Array([1]),'','fixture.receiz',true);
 try{const notes=await identity.offlineNotes!();expect(await notes.savedNotes()).toEqual([]);expect(await notes.pending()).toBeNull();expect(p.enroll).not.toHaveBeenCalled();expect(p.seal).not.toHaveBeenCalled();expect(p.continueId).not.toHaveBeenCalled();expect(p.persist).not.toHaveBeenCalled();}finally{identity.dispose();}
});
it('still protects, seals and admits the same identity before any account transport',async()=>{
 const identity=await openCanonicalIdentity(new Uint8Array([1]),'','fixture.receiz',true);
 try{const wallets=await Promise.all([identity.readWallet(),identity.readWallet()]);expect(wallets[0].totalUsdCents).toBe('300');expect(p.enroll).toHaveBeenCalledTimes(1);expect(p.continueId).toHaveBeenCalledTimes(1);expect(p.continueId.mock.calls[0][0].keyFile.crypto.privateKeyPkcs8B64u).toBeNull();expect(p.grant.mock.calls[0][0].artifact).toEqual(new Uint8Array([2]));expect(p.persist).toHaveBeenCalledTimes(1);expect(identity.backup().bytes).toEqual(new Uint8Array([1]));}
 finally{identity.dispose();}
});
it('refuses a substituted protected identity before continuation or grant exchange',async()=>{
 const identity=await openCanonicalIdentity(new Uint8Array([1]),'','fixture.receiz',true);p.foreign=true;
 try{await expect(identity.readWallet()).rejects.toThrow('same identity');expect(p.continueId).not.toHaveBeenCalled();expect(p.grant).not.toHaveBeenCalled();expect(p.persist).not.toHaveBeenCalled();}
 finally{identity.dispose();}
});
