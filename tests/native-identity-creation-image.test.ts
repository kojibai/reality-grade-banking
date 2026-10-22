import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {createNativeIdentity,openCanonicalIdentity} from '../src/receiz/native-identity';
const p=vi.hoisted(()=>({image:vi.fn(),seal:vi.fn(),persist:vi.fn(),read:vi.fn()}));
const key=()=>({keyId:'a'.repeat(64),issuedAt:'2026-10-21T12:00:00Z',owner:{uid:'owner',username:'owner'},crypto:{publicKeyRawB64u:'public'},portableState:{snapshot:{}}});
vi.mock('../src/receiz/identity-image',()=>({createNewIdentityImageSource:p.image}));
vi.mock('../src/receiz/client',()=>({loadReceiz:async()=>({verifyReceizArtifact:async()=>({status:'verified-artifact'}),createReceizArtifactAdmissionEngine:()=>async()=>({verdict:'canonical-identity'}),isSdkIssuedReceizArtifactAdmission:()=>true,readReceizIdentityPublicBinding:async()=>({keyId:'a'.repeat(64),artifactSha256:'b'.repeat(64),artifactOwnerReceizId:'owner.receiz.id'}),readReceizIdentityArtifact:async()=>key(),projectReceizIdentityAccount:async()=>({authority:'identity-only'}),receizBase64UrlEncode:()=> 'synthetic-only-protection',createReceizClient:()=>({})})}));
vi.mock('@receiz/sdk/offline',()=>({createReceizIndexedDbSealStore:()=>({}),createReceizOfflineSealer:()=>({enroll:async()=>{},createIdentity:async()=>({artifactBytes:new Uint8Array([1])}),seal:p.seal})}));
vi.mock('../src/receiz/proof-resource-continuity',()=>({loadBankProofResources:async()=>({wasm:new Uint8Array([1]),zkey:new Uint8Array([2])})}));
vi.mock('../src/receiz/new-account-genesis',()=>({initializeFreshBankAccount:async(value:unknown)=>value}));
vi.mock('../src/receiz/identity-protection',()=>({unprotectIdentityKeyFile:async(value:unknown)=>value}));
vi.mock('../src/receiz/identity-lock',()=>({identityNeedsPhrase:()=>false}));
vi.mock('../src/receiz/identity-vault',async original=>({...await original<typeof import('../src/receiz/identity-vault')>(),loadDeviceIdentity:p.read,loadWalletObservation:async()=>({wallet:{userId:'owner',totalUsdCents:'0'},source:'account-genesis'}),loadAccountLedgerState:async()=>null,loadMarketPortfolioState:async()=>null,loadMessagingDisplay:async()=>null,saveDeviceIdentity:p.persist}));
beforeEach(()=>{p.read.mockReset().mockResolvedValue(null);vi.stubGlobal('navigator',{locks:{request:async(_name:string,work:()=>Promise<unknown>)=>work()}});p.image.mockReset().mockResolvedValue({bytes:new Uint8Array([137,80,78,71,13,10,26,10]),filename:'identity_record_owner.png',mimeType:'image/png'});p.seal.mockReset().mockResolvedValue({artifactBytes:new Uint8Array([2]),filename:'identity_record_owner.png',mimeType:'image/png'});p.persist.mockReset().mockResolvedValue(undefined);});
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});
it('uses the Receiz PNG as the existing single portable-identity seal for a newly created account',async()=>{
 const identity=await createNativeIdentity(true);try{expect(p.image).toHaveBeenCalledTimes(1);expect(p.seal).toHaveBeenCalledExactlyOnceWith({bytes:new Uint8Array([137,80,78,71,13,10,26,10]),filename:'identity_record_owner.png',mimeType:'image/png'});expect(identity.backup()).toMatchObject({bytes:new Uint8Array([2]),filename:'identity_record_owner.png',phrase:''});}finally{identity.dispose();}
});
it('preserves the exact uploaded identity bytes and filename, without image conversion or a new seal',async()=>{
 const bytes=new Uint8Array([8,9,10]),identity=await openCanonicalIdentity(bytes,'','original-receiz-seal.png',true);try{expect(identity.backup()).toEqual({bytes,filename:'original-receiz-seal.png',phrase:''});expect(p.image).not.toHaveBeenCalled();expect(p.seal).not.toHaveBeenCalled();}finally{identity.dispose();}
});

it('reuses the first admitted identity across simultaneous creators instead of overwriting custody',async()=>{
 let queue=Promise.resolve();vi.stubGlobal('navigator',{locks:{request:async(_name:string,work:()=>Promise<unknown>)=>{const previous=queue;let release!:()=>void;queue=new Promise(resolve=>release=resolve);await previous;try{return await work();}finally{release();}}}});
 p.persist.mockImplementation(async(bytes:Uint8Array,filename:string,phrase:string)=>{p.read.mockResolvedValue({bytes,filename,phrase,readConsent:true});});
 const [one,two]=await Promise.all([createNativeIdentity(true),createNativeIdentity(true)]);
 try{expect(p.image).toHaveBeenCalledTimes(1);expect(p.persist).toHaveBeenCalledTimes(1);expect(p.persist.mock.calls[0][5]).toBe(true);expect(two.backup().bytes).toEqual(one.backup().bytes);}finally{one.dispose();two.dispose();}
});
it('preserves unreadable saved identity custody instead of automatically creating another',async()=>{
 p.read.mockRejectedValue(Error('saved identity unavailable'));await expect(createNativeIdentity(true)).rejects.toThrow('saved identity');expect(p.image).not.toHaveBeenCalled();expect(p.persist).not.toHaveBeenCalled();
});
