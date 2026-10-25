import {beforeEach,expect,it,vi} from 'vitest';
import {openPbiAccount} from '../src/receiz/pbi-account';
const p=vi.hoisted(()=>({bridge:vi.fn(),recover:vi.fn(),admit:vi.fn(),enroll:vi.fn(),createIdentity:vi.fn(),seal:vi.fn(),append:vi.fn(),open:vi.fn(),persist:vi.fn(),prepare:vi.fn(),dispose:vi.fn(),fresh:vi.fn()}));
const key={keyId:'key',alg:'Ed25519',issuedAt:'2026-10-24T00:00:00Z',owner:{uid:'local-device'},crypto:{publicKeyRawB64u:'public'}};
vi.mock('../src/receiz/device-identity-entry',()=>({withDeviceIdentityEntry:async(run:()=>Promise<unknown>)=>run()}));
vi.mock('../src/receiz/pbi-account-inline',()=>({runPbiAccountInline:p.bridge,recoverPbiAccountInline:p.recover,closePbiAccount:async()=>{}}));
vi.mock('../src/receiz/pbi-account-source',()=>({admitPbiAccountBinding:p.admit}));
vi.mock('../src/receiz/native-identity',()=>({openCanonicalIdentity:p.open,createNativeIdentity:p.fresh}));
vi.mock('../src/receiz/proof-resource-continuity',()=>({loadBankProofResources:async()=>({})}));
vi.mock('../src/receiz/identity-protection',()=>({unprotectIdentityKeyFile:async(value:unknown)=>value}));
vi.mock('@receiz/sdk/offline',()=>({createReceizIndexedDbSealStore:()=>({}),createReceizOfflineSealer:()=>({enroll:p.enroll,createIdentity:p.createIdentity,seal:p.seal})}));
vi.mock('../src/receiz/client',()=>({loadReceiz:async()=>({receizBase64UrlEncode:()=> 'random-protection',readReceizIdentityArtifact:async()=>key,verifyReceizArtifact:async()=>({status:'verified-artifact'}),createReceizArtifactAdmissionEngine:()=>async()=>({verdict:'canonical-identity'}),isSdkIssuedReceizArtifactAdmission:()=>true,readReceizIdentityPublicBinding:async()=>({keyId:'key',artifactOwnerReceizId:'local-device'}),signReceizIdentityLoginProof:async()=>({signatureB64Url:'signature'}),appendReceizIdentityPortableState:p.append,serializeReceizIdentityArtifact:()=> 'portable-original'})}));
beforeEach(()=>{for(const fn of Object.values(p))fn.mockReset();p.recover.mockResolvedValue({accountUid:'original-account'});p.createIdentity.mockResolvedValue({artifactBytes:new Uint8Array([1])});p.bridge.mockResolvedValue({accountUid:'original-account',sourceB64u:'original-source',sourceMode:'native-history',request:{}});p.admit.mockResolvedValue({accountUid:'original-account',sourceB64u:'original-source',sourceDigest:'native-digest'});p.append.mockResolvedValue(key);p.seal.mockResolvedValue({artifactBytes:new Uint8Array([2]),filename:'same-device.receizkey'});p.prepare.mockResolvedValue({wallet:{userId:'original-account',totalUsdCents:'45123'},history:[{kaiUPulse:'0'},{kaiUPulse:'100'}]});p.open.mockResolvedValue({binding:{keyId:'key',artifactOwnerReceizId:'local-device'},prepareAccountView:p.prepare,persistDeviceCustody:p.persist,dispose:p.dispose});});
it('opens only the original recovered account after source admission and retains the original source under the new local key',async()=>{
 await openPbiAccount(true);expect(p.admit).toHaveBeenCalledOnce();expect(p.append).toHaveBeenCalledWith(expect.objectContaining({schema:'receiz.account.state.v3',snapshot:expect.objectContaining({account:{userId:'original-account'},pbiAccountBinding:expect.objectContaining({sourceB64u:'original-source'})})}));
 expect(p.prepare).toHaveBeenCalledOnce();expect(p.persist).toHaveBeenCalledWith(true);expect(p.fresh).not.toHaveBeenCalled();
});
it.each(['passkey_cancelled','PBI_ACCOUNT_SOURCE_INVALID'])('leaves ordinary account creation and retained identity untouched on %s',async error=>{
 if(error==='passkey_cancelled')p.bridge.mockRejectedValue(Error(error));else p.admit.mockRejectedValue(Error(error));
 await expect(openPbiAccount(true)).rejects.toThrow(error);expect(p.append).not.toHaveBeenCalled();expect(p.open).not.toHaveBeenCalled();expect(p.persist).not.toHaveBeenCalled();expect(p.fresh).not.toHaveBeenCalled();
});
it('refuses a wallet for any different account before retaining the local identity',async()=>{p.prepare.mockResolvedValue({wallet:{userId:'wrong-account'}});await expect(openPbiAccount(true)).rejects.toThrow('PBI_ACCOUNT_MISMATCH');expect(p.persist).not.toHaveBeenCalled();expect(p.dispose).toHaveBeenCalledOnce();});

it('requires fresh canonical account admission before retaining legacy PBI recovery',async()=>{
 p.bridge.mockResolvedValue({accountUid:'original-account',sourceMode:'legacy-sql',binding:{},request:{}});
 await openPbiAccount(true);expect(p.admit).not.toHaveBeenCalled();expect(p.prepare).toHaveBeenCalledOnce();expect(p.persist).toHaveBeenCalledWith(true);
 expect(p.append.mock.calls[0][0].snapshot.pbiAccountBinding).toBeUndefined();
});

it('starts the system ceremony without waiting for local signer enrollment',async()=>{
 let release!:()=>void;p.enroll.mockImplementation(()=>new Promise<void>(resolve=>{release=resolve;}));
 const opening=openPbiAccount(true);await vi.waitFor(()=>expect(p.enroll).toHaveBeenCalled());
 try{expect(p.recover).toHaveBeenCalledOnce();expect(p.recover.mock.invocationCallOrder[0]).toBeLessThan(p.enroll.mock.invocationCallOrder[0]);}finally{release();await opening;}
});
