import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {BANK_APPLICATION_ID,BANK_READ_SCOPES} from '../src/receiz/config';
import {openCanonicalIdentity} from '../src/receiz/native-identity';

// Exercise the actual account-to-publication adapter. The SDK's enroll() saves
// custody and returns void; its signing key is read from the existing store.
const p=vi.hoisted(()=>({enroll:vi.fn(),load:vi.fn(),nativeSealer:vi.fn(),prepare:vi.fn(),sealDocument:vi.fn(),enrollment:null as unknown}));
const scopes=[...BANK_READ_SCOPES,'profile','receiz:record','receiz:seal'];
vi.mock('../src/receiz/client',()=>({loadReceiz:async()=>({
 verifyReceizArtifact:async()=>({status:'verified-artifact'}),
 createReceizArtifactAdmissionEngine:()=>async()=>({verdict:'canonical-identity'}),isSdkIssuedReceizArtifactAdmission:()=>true,
 readReceizIdentityPublicBinding:async()=>({keyId:'a'.repeat(64),artifactSha256:'b'.repeat(64),artifactOwnerReceizId:'owner.receiz.id'}),
 readReceizIdentityArtifact:async()=>({keyId:'a'.repeat(64),owner:{uid:'owner',username:'owner'},crypto:{publicKeyRawB64u:'public'}}),
 projectReceizIdentityAccount:async()=>({authority:'identity-only'}),receizKaiNow:()=>({pulse:100}),sha256ReceizBytes:async()=> 'b'.repeat(64),
 createReceizProofAuthorityChallenge:()=>({challenge:{},challengeB64Url:'fixture'}),
 createReceizClient:()=>({identity:{continueReceizId:async()=>({ok:true,session:{uid:'owner',username:'owner'}}),signLoginProof:async()=>({}),exchangeProofAuthority:async()=>({applicationId:BANK_APPLICATION_ID,keyId:'a'.repeat(64),artifactDigest:'b'.repeat(64),grantedScopes:scopes,accessToken:'synthetic-test-only',expiresAtKai:200})}}),
})}));
vi.mock('@receiz/sdk/offline',()=>({createReceizIndexedDbSealStore:()=>({load:p.load}),createReceizOfflineSealer:()=>({enroll:p.enroll})}));
vi.mock('../src/receiz/offline-notes',()=>({loadBankNoteRuntime:async()=>({createBankNativeNoteSealer:p.nativeSealer})}));
vi.mock('../src/receiz/asset-publication-runtime',()=>({loadAssetPublicationRuntime:async()=>({createConnectedAssetPublicationRuntime:async()=>({prepareContent:p.prepare})}),createAssetPublicationFetch:()=>vi.fn()}));
vi.mock('../src/receiz/proof-resource-continuity',()=>({loadBankProofResources:async()=>({wasm:new Uint8Array([1]),zkey:new Uint8Array([2])})}));
vi.mock('../src/receiz/identity-protection',()=>({unprotectIdentityKeyFile:async(value:unknown)=>value}));
vi.mock('../src/receiz/identity-lock',()=>({identityNeedsPhrase:()=>false}));
vi.mock('../src/receiz/identity-vault',async original=>({...await original<typeof import('../src/receiz/identity-vault')>(),loadWalletObservation:async()=>null,loadAccountLedgerState:async()=>null,loadMarketPortfolioState:async()=>null,loadMessagingDisplay:async()=>null}));
beforeEach(async()=>{
 vi.stubGlobal('location',{origin:'https://bankeiz.com'});
 p.enrollment={privateKey:(await crypto.subtle.generateKey('Ed25519',false,['sign','verify'])).privateKey,cert:{issuedAtMs:0}};
 p.enroll.mockReset().mockResolvedValue(undefined);p.load.mockReset().mockResolvedValue(p.enrollment);
 p.nativeSealer.mockReset().mockImplementation(async(input:{enrollment:{privateKey:CryptoKey}})=>{if(input.enrollment.privateKey.extractable)throw Error('extractable key');return p.sealDocument;});
 p.prepare.mockReset().mockRejectedValue(Error('PREPARED_FROM_SAVED_SIGNER'));
});
afterEach(()=>vi.unstubAllGlobals());
const definition={name:'An Original',symbol:'ORIG',units:'1000',description:'',linkedProofDigest:null};
const draft={title:'An Original',description:'',kind:'moment' as const,longForm:'A controlled test Original.',files:[]};
it('opens asset creation with the existing non-exportable enrollment, enrolling only once',async()=>{
 const identity=await openCanonicalIdentity(new Uint8Array([1]),'','synthetic.receiz',true);
 try{
  await expect(identity.createComposedAsset!(definition,draft)).rejects.toThrow('PREPARED_FROM_SAVED_SIGNER');
  expect(p.enroll).toHaveBeenCalledTimes(1);expect(p.load).toHaveBeenCalledTimes(1);
  expect(p.nativeSealer).toHaveBeenCalledExactlyOnceWith({enrollment:p.enrollment,resources:{wasm:new Uint8Array([1]),zkey:new Uint8Array([2])}});
  expect(p.prepare).toHaveBeenCalledTimes(1);
 }finally{identity.dispose();}
});
it('reports unavailable local signer custody before opening publication',async()=>{
 p.load.mockResolvedValue(null);
 const identity=await openCanonicalIdentity(new Uint8Array([1]),'','synthetic.receiz',true);
 try{
  await expect(identity.createComposedAsset!(definition,draft)).rejects.toThrow('Your device sealing key is unavailable.');
  expect(p.nativeSealer).not.toHaveBeenCalled();expect(p.prepare).not.toHaveBeenCalled();
 }finally{identity.dispose();}
});
