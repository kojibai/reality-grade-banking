import {beforeEach,expect,it,vi} from 'vitest';
import {openPbiAccount,openVerifiedEmailAccount,openVerifiedInvitationAccount} from '../src/receiz/pbi-account';
const p=vi.hoisted(()=>({bridge:vi.fn(),recover:vi.fn(),admit:vi.fn(),enroll:vi.fn(),createIdentity:vi.fn(),seal:vi.fn(),append:vi.fn(),open:vi.fn(),persist:vi.fn(),prepare:vi.fn(),dispose:vi.fn(),fresh:vi.fn(),sdk:vi.fn(),resources:vi.fn()}));
const key={keyId:'key',alg:'Ed25519',issuedAt:'2026-10-24T00:00:00Z',owner:{uid:'local-device'},crypto:{publicKeyRawB64u:'public'}};
const email=vi.hoisted(()=>({load:vi.fn(),restore:vi.fn(),select:vi.fn(),activate:vi.fn(),retain:vi.fn()}));
vi.mock('../src/receiz/identity-vault',()=>({loadDeviceIdentity:email.load,prepareVerifiedEmailAccountSelection:email.select}));
vi.mock('../src/receiz/device-identity-entry',()=>({withDeviceIdentityEntry:async(run:()=>Promise<unknown>)=>run()}));
vi.mock('../src/receiz/pbi-account-inline',()=>({runPbiAccountInline:p.bridge,recoverPbiAccountInline:p.recover,closePbiAccount:async()=>{}}));
vi.mock('../src/receiz/pbi-account-source',()=>({admitPbiAccountBinding:p.admit}));
vi.mock('../src/receiz/native-identity',()=>({openCanonicalIdentity:p.open,createNativeIdentity:p.fresh,restoreNativeIdentity:email.restore}));
vi.mock('../src/receiz/proof-resource-continuity',()=>({loadBankProofResources:p.resources}));
vi.mock('../src/receiz/identity-protection',()=>({unprotectIdentityKeyFile:async(value:unknown)=>value}));
vi.mock('@receiz/sdk/offline',()=>({createReceizIndexedDbSealStore:()=>({}),createReceizOfflineSealer:()=>({enroll:p.enroll,createIdentity:p.createIdentity,seal:p.seal})}));
vi.mock('../src/receiz/client',()=>({loadReceiz:async()=>{await p.sdk();return {receizBase64UrlEncode:()=> 'random-protection',readReceizIdentityArtifact:async()=>key,verifyReceizArtifact:async()=>({status:'verified-artifact'}),createReceizArtifactAdmissionEngine:()=>async()=>({verdict:'canonical-identity'}),isSdkIssuedReceizArtifactAdmission:()=>true,readReceizIdentityPublicBinding:async()=>({keyId:'key',artifactOwnerReceizId:'local-device'}),signReceizIdentityLoginProof:async()=>({signatureB64Url:'signature'}),appendReceizIdentityPortableState:p.append,serializeReceizIdentityArtifact:()=> 'portable-original'};}}));
beforeEach(()=>{email.load.mockReset();email.restore.mockReset();email.select.mockReset();email.activate.mockReset();email.retain.mockReset();email.select.mockResolvedValue({saved:null,activateRetained:email.activate,retainRecovered:email.retain});for(const fn of Object.values(p))fn.mockReset();p.resources.mockResolvedValue({});p.recover.mockResolvedValue({accountUid:'original-account'});p.createIdentity.mockResolvedValue({artifactBytes:new Uint8Array([1])});p.bridge.mockResolvedValue({accountUid:'original-account',sourceB64u:'original-source',sourceMode:'native-history',request:{}});p.admit.mockResolvedValue({accountUid:'original-account',sourceB64u:'original-source',sourceDigest:'native-digest'});p.append.mockResolvedValue(key);p.seal.mockResolvedValue({artifactBytes:new Uint8Array([2]),filename:'same-device.receizkey'});p.prepare.mockResolvedValue({wallet:{userId:'original-account',totalUsdCents:'45123'},history:[{kaiUPulse:'0'},{kaiUPulse:'100'}]});p.open.mockResolvedValue({backup:()=>({bytes:new Uint8Array([2]),filename:'same-device.receizkey',phrase:''}),binding:{keyId:'key',artifactOwnerReceizId:'local-device'},prepareAccountView:p.prepare,persistDeviceCustody:p.persist,dispose:p.dispose});});
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

it('loads independent proof resources while the SDK is still loading',async()=>{
 let release!:()=>void;p.sdk.mockImplementation(()=>new Promise<void>(resolve=>{release=resolve;}));
 const opening=openPbiAccount(true);await vi.waitFor(()=>expect(p.sdk).toHaveBeenCalled());
 try{expect(p.resources).toHaveBeenCalledOnce();expect(p.enroll).not.toHaveBeenCalled();}finally{release();await opening;}
});
it('reports the admitted identity checkpoint before account history preparation finishes',async()=>{
 let release!:(value:unknown)=>void;p.prepare.mockImplementation(()=>new Promise(resolve=>{release=resolve;}));
 const checkpoint=vi.fn(),opening=openPbiAccount(true,checkpoint);await vi.waitFor(()=>expect(p.prepare).toHaveBeenCalled());
 try{expect(checkpoint).toHaveBeenCalledOnce();expect(p.persist).not.toHaveBeenCalled();}finally{release({wallet:{userId:'original-account'}});await opening;}
});
it('uses the same recovered-device admission for a verified email recipient without a passkey or fresh account genesis',async()=>{
 email.load.mockResolvedValue(null);await openVerifiedEmailAccount('original-account');
 expect(p.recover).not.toHaveBeenCalled();await expect(p.bridge.mock.calls[0][2]).resolves.toEqual({accountUid:'original-account'});expect(p.prepare).toHaveBeenCalledOnce();expect(p.persist).toHaveBeenCalledWith(true);expect(p.fresh).not.toHaveBeenCalled();
});
it('reuses the exact saved recipient custody without a new key, seal or bind',async()=>{
 const held={prepareAccountView:vi.fn(async()=>({wallet:{userId:'original-account'}})),dispose:vi.fn()};email.load.mockResolvedValue({readConsent:true});email.restore.mockResolvedValue(held);
 expect(await openVerifiedEmailAccount('original-account')).toBe(held);expect(p.createIdentity).not.toHaveBeenCalled();expect(p.bridge).not.toHaveBeenCalled();expect(p.persist).not.toHaveBeenCalled();
});
it('preserves a different or unreadable held account instead of silently switching custody',async()=>{
 const held={prepareAccountView:vi.fn(async()=>({wallet:{userId:'other-account'}})),dispose:vi.fn()};email.load.mockResolvedValue({readConsent:true});email.restore.mockResolvedValue(held);
 await expect(openVerifiedEmailAccount('original-account')).rejects.toThrow('EMAIL_PAYMENT_DIFFERENT_ACCOUNT');expect(held.dispose).toHaveBeenCalledOnce();expect(p.createIdentity).not.toHaveBeenCalled();expect(p.persist).not.toHaveBeenCalled();
 email.restore.mockResolvedValue(null);await expect(openVerifiedEmailAccount('original-account')).rejects.toThrow('EMAIL_PAYMENT_SAVED_ACCOUNT_REQUIRED');expect(p.createIdentity).not.toHaveBeenCalled();
});

it('invitation recovery selects the admitted recipient without replacing custody through the default save path',async()=>{
 const held={binding:{artifactSha256:'a'.repeat(64)},prepareAccountView:vi.fn(async()=>({wallet:{userId:'other-account'}})),dispose:vi.fn()};email.load.mockResolvedValue({readConsent:true});email.restore.mockResolvedValue(held);
 await openVerifiedInvitationAccount('original-account');
 expect(email.select).toHaveBeenCalledExactlyOnceWith({accountUid:'other-account',artifactSha256:'a'.repeat(64)},'original-account');expect(held.dispose).toHaveBeenCalledOnce();
 expect(email.retain).toHaveBeenCalledExactlyOnceWith({bytes:new Uint8Array([2]),filename:'same-device.receizkey',phrase:'',readConsent:true,protectedTransport:{bytes:new Uint8Array([1]),phrase:'random-protection'}});expect(p.persist).not.toHaveBeenCalled();expect(p.fresh).not.toHaveBeenCalled();expect(p.recover).not.toHaveBeenCalled();
});
it('invitation selection reopens retained target proof and verifies its actual account before activation',async()=>{
 const held={binding:{artifactSha256:'a'.repeat(64)},prepareAccountView:vi.fn(async()=>({wallet:{userId:'other-account'}})),dispose:vi.fn()};email.load.mockResolvedValue({readConsent:true});email.restore.mockResolvedValue(held);
 const saved={bytes:new Uint8Array([7]),filename:'retained.png',phrase:'private-retained',readConsent:true,protectedTransport:{bytes:new Uint8Array([8]),phrase:'bootstrap-retained'}};email.select.mockResolvedValue({saved,activateRetained:email.activate,retainRecovered:email.retain});
 await openVerifiedInvitationAccount('original-account');expect(p.open).toHaveBeenCalledExactlyOnceWith(saved.bytes,saved.phrase,saved.filename,true,saved.protectedTransport);expect(email.activate).toHaveBeenCalledOnce();expect(p.createIdentity).not.toHaveBeenCalled();expect(email.retain).not.toHaveBeenCalled();
});
it('invitation selection cannot use a slot label or failed session as account authority',async()=>{
 const held={binding:{artifactSha256:'a'.repeat(64)},prepareAccountView:vi.fn(async()=>({wallet:{userId:'other-account'}})),dispose:vi.fn()};email.load.mockResolvedValue({readConsent:true});email.restore.mockResolvedValue(held);
 email.select.mockResolvedValue({saved:{bytes:new Uint8Array([7]),filename:'wrong.png',phrase:'',readConsent:true},activateRetained:email.activate,retainRecovered:email.retain});p.prepare.mockResolvedValue({wallet:{userId:'wrong-account'}});
 await expect(openVerifiedInvitationAccount('original-account')).rejects.toThrow('PBI_ACCOUNT_MISMATCH');expect(email.activate).not.toHaveBeenCalled();expect(email.retain).not.toHaveBeenCalled();expect(p.dispose).toHaveBeenCalledOnce();
 email.select.mockResolvedValue({saved:null,activateRetained:email.activate,retainRecovered:email.retain});p.bridge.mockRejectedValue(Error('signin_required'));
 await expect(openVerifiedInvitationAccount('original-account')).rejects.toThrow('signin_required');expect(email.retain).not.toHaveBeenCalled();expect(p.persist).not.toHaveBeenCalled();
});
it('same-account invitation entry reuses held custody without another seal, bind or inactive slot',async()=>{
 const held={prepareAccountView:vi.fn(async()=>({wallet:{userId:'original-account'}})),dispose:vi.fn()};email.load.mockResolvedValue({readConsent:true});email.restore.mockResolvedValue(held);
 expect(await openVerifiedInvitationAccount('original-account')).toBe(held);expect(email.select).not.toHaveBeenCalled();expect(p.createIdentity).not.toHaveBeenCalled();expect(p.bridge).not.toHaveBeenCalled();expect(p.persist).not.toHaveBeenCalled();
});
