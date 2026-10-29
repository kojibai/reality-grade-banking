import {appendFileSync} from 'node:fs';
import {afterEach,expect,it,vi} from 'vitest';
import {openCanonicalIdentity} from '../src/receiz/native-identity';
import {BANK_APPLICATION_ID} from '../src/receiz/config';
const p=vi.hoisted(()=>{const gate=()=>{let open!:()=>void;const value={started:false,at:0,promise:new Promise<void>(resolve=>open=resolve),open:()=>open(),begin:()=>{value.started=true;value.at=performance.now();if(process.env.BANKEIZ_LATENCY_EVIDENCE)setTimeout(open,200);}};return value;};return{business:gate(),money:gate(),profile:gate(),publication:gate(),exchange:vi.fn(),prepare:vi.fn(),enroll:vi.fn(),load:vi.fn(),nativeSealer:vi.fn(),sealCode:gate(),privatePrepare:vi.fn()};});
vi.mock('../src/receiz/business-seal-runtime',()=>({loadBusinessSealRuntime:async()=>{p.sealCode.begin();await p.sealCode.promise;return{prepareConnectedComposerSource:p.privatePrepare};}}));
vi.mock('../src/receiz/business-chat',async original=>{p.business.begin();await p.business.promise;return original();});
vi.mock('../src/receiz/money-workspace',async original=>{p.money.begin();await p.money.promise;return original();});
vi.mock('../src/receiz/profile-edit',async original=>{p.profile.begin();await p.profile.promise;return original();});
vi.mock('../src/receiz/asset-publication-runtime',async original=>{p.publication.begin();await p.publication.promise;const actual=await original<typeof import('../src/receiz/asset-publication-runtime')>();return{...actual,loadAssetPublicationRuntime:async()=>({createConnectedAssetPublicationRuntime:async()=>({prepareContent:p.prepare})})};});
vi.mock('../src/receiz/client',()=>({loadReceiz:async()=>({
 verifyReceizArtifact:async()=>({status:'verified-artifact'}),createReceizArtifactAdmissionEngine:()=>async()=>({verdict:'canonical-identity'}),isSdkIssuedReceizArtifactAdmission:()=>true,
 readReceizIdentityPublicBinding:async()=>({keyId:'a'.repeat(64),artifactSha256:'b'.repeat(64),artifactOwnerReceizId:'owner.receiz.id'}),
 readReceizIdentityArtifact:async()=>({keyId:'a'.repeat(64),owner:{uid:'11111111-1111-4111-8111-111111111111',username:'owner'},issuedAt:'2026-10-18T00:00:00Z',crypto:{publicKeyRawB64u:'public'}}),
 projectReceizIdentityAccount:async()=>({authority:'identity-only'}),receizKaiNow:()=>({pulse:100}),sha256ReceizBytes:async()=> 'b'.repeat(64),createReceizProofAuthorityChallenge:()=>({challenge:{},challengeB64Url:'fixture'}),
 createReceizClient:()=>({identity:{continueReceizId:async()=>({ok:true,session:{uid:'11111111-1111-4111-8111-111111111111',username:'owner'}}),signLoginProof:async()=>({}),exchangeProofAuthority:p.exchange}}),
})}));
vi.mock('@receiz/sdk/offline',()=>({createReceizIndexedDbSealStore:()=>({load:p.load}),createReceizOfflineSealer:()=>({enroll:p.enroll})}));
vi.mock('../src/receiz/offline-notes',()=>({loadBankNoteRuntime:async()=>({createBankNativeNoteSealer:p.nativeSealer})}));
vi.mock('../src/receiz/proof-resource-continuity',()=>({loadBankProofResources:async()=>({wasm:new Uint8Array([1]),zkey:new Uint8Array([2])})}));
vi.mock('../src/receiz/identity-protection',()=>({unprotectIdentityKeyFile:async(value:unknown)=>value}));
vi.mock('../src/receiz/identity-lock',()=>({identityNeedsPhrase:()=>false}));
vi.mock('../src/receiz/identity-vault',async original=>({...await original<typeof import('../src/receiz/identity-vault')>(),loadWalletObservation:async()=>null,loadAccountLedgerState:async()=>null,loadMarketPortfolioState:async()=>null,loadMessagingConsent:async()=>null,loadMessagingDisplay:async()=>null}));
afterEach(()=>vi.unstubAllGlobals());
const definition={name:'An Original',symbol:'ORIG',units:'1000',description:'',linkedProofDigest:null};
const draft={title:'An Original',description:'',kind:'moment' as const,longForm:'Controlled Original.',files:[]};
it.each(['business','money','profile','publication'] as const)('loads %s code while its existing owner connection is pending, without starting an action',async kind=>{
 vi.stubGlobal('location',{origin:'https://bankeiz.com'});let release!:()=>void;const connection=new Promise<void>(resolve=>release=resolve);
 p.exchange.mockReset().mockImplementation(async({scopes}:{scopes:string[]})=>{await connection;return{applicationId:BANK_APPLICATION_ID,keyId:'a'.repeat(64),artifactDigest:'b'.repeat(64),grantedScopes:scopes,accessToken:'synthetic-only',expiresAtKai:200};});
 p.prepare.mockReset().mockRejectedValue(Error('CONTENT_PREPARATION_REACHED'));p.enroll.mockReset().mockResolvedValue(undefined);p.load.mockReset().mockResolvedValue({privateKey:{},cert:{issuedAtMs:0}});p.nativeSealer.mockReset().mockResolvedValue(()=>{});
 const identity=await openCanonicalIdentity(new Uint8Array([1]),'','synthetic.receiz',true,undefined,true);
 expect(p.exchange).not.toHaveBeenCalled();
 const started=performance.now();if(process.env.BANKEIZ_LATENCY_EVIDENCE)setTimeout(release,150);
 const task=kind==='business'?identity.businessSetup!():kind==='money'?identity.moneyTools!():kind==='profile'?identity.profile!():identity.createComposedAsset!(definition,draft);
 // Preserve the expected terminal result while the explicit gates prove order.
 const result=task.then(value=>({value,error:null}),error=>({value:null,error}));
 try{if(process.env.BANKEIZ_LATENCY_EVIDENCE){await result;appendFileSync(process.env.BANKEIZ_LATENCY_EVIDENCE,JSON.stringify({path:kind+' preparation',completeMs:Math.round(performance.now()-started),codeStartMs:Math.round(p[kind].at-started),codeDelayMs:200,connectionDelayMs:150})+'\n');}await vi.waitFor(()=>expect(p[kind].started).toBe(true),{timeout:500});if(!process.env.BANKEIZ_LATENCY_EVIDENCE){expect(p.prepare).not.toHaveBeenCalled();expect(p.enroll).not.toHaveBeenCalled();}release();p[kind].open();const actual=await result;if(kind==='publication'){expect(actual.error?.message).toBe('CONTENT_PREPARATION_REACHED');expect(p.enroll).toHaveBeenCalledOnce();}else{expect(actual.error).toBeNull();expect(actual.value).toBeTruthy();}}
 finally{release();p[kind].open();await result;identity.dispose();}
});
it('refuses tool setup when its owner closes during connection, even with warmed tool code',async()=>{
 let release!:()=>void;const connection=new Promise<void>(resolve=>release=resolve);p.exchange.mockImplementation(async({scopes}:{scopes:string[]})=>{await connection;return{applicationId:BANK_APPLICATION_ID,keyId:'a'.repeat(64),artifactDigest:'b'.repeat(64),grantedScopes:scopes,accessToken:'synthetic-only',expiresAtKai:200};});const identity=await openCanonicalIdentity(new Uint8Array([1]),'','synthetic.receiz',true,undefined,true),task=identity.businessSetup!();const failed=expect(task).rejects.toThrow(/closed|consent/i);identity.dispose();release();await failed;
});
it('does not expose warmed Business tools when the existing grant refuses the required scope',async()=>{
 p.exchange.mockImplementation(async()=>({applicationId:BANK_APPLICATION_ID,keyId:'a'.repeat(64),artifactDigest:'b'.repeat(64),grantedScopes:[],accessToken:'synthetic-only',expiresAtKai:200}));const identity=await openCanonicalIdentity(new Uint8Array([1]),'','synthetic.receiz',true,undefined,true);try{await expect(identity.businessSetup!()).rejects.toThrow('did not grant');}finally{identity.dispose();}
});

it('loads private sealing code beside device preparation without signing before both are ready',async()=>{
 vi.stubGlobal('location',{origin:'https://bankeiz.com'});p.business.open();p.exchange.mockImplementation(async({scopes}:{scopes:string[]})=>({applicationId:BANK_APPLICATION_ID,keyId:'a'.repeat(64),artifactDigest:'b'.repeat(64),grantedScopes:scopes,accessToken:'synthetic-only',expiresAtKai:200}));p.enroll.mockResolvedValue({});let release!:()=>void;const device=new Promise<()=>void>(resolve=>release=()=>resolve(()=>{}));p.nativeSealer.mockReset().mockReturnValue(device);p.privatePrepare.mockReset().mockRejectedValue(Error('CONTROLLED_PRIVATE_PREPARATION'));
 const identity=await openCanonicalIdentity(new Uint8Array([1]),'','synthetic.receiz',true,undefined,true),chat=await identity.businessSetup!(),result=chat.execute('private-seal-overlap',[{tool:'business_seal_object',args:{title:'Original',description:'',longForm:'Carried text',kind:'moment'}}]);
 try{await vi.waitFor(()=>expect(p.sealCode.started).toBe(true),{timeout:500});expect(p.privatePrepare).not.toHaveBeenCalled();}finally{release();p.sealCode.open();await result;identity.dispose();}
 expect((await result)[0].status).toBe('unknown');expect(p.privatePrepare).toHaveBeenCalledOnce();
});
it('cannot prepare a private Original after its Identity closes during device preparation',async()=>{
 p.business.open(); vi.stubGlobal('location',{origin:'https://bankeiz.com'});p.exchange.mockImplementation(async({scopes}:{scopes:string[]})=>({applicationId:BANK_APPLICATION_ID,keyId:'a'.repeat(64),artifactDigest:'b'.repeat(64),grantedScopes:scopes,accessToken:'synthetic-only',expiresAtKai:200}));let release!:()=>void;const device=new Promise<()=>void>(resolve=>release=()=>resolve(()=>{}));p.nativeSealer.mockReset().mockReturnValue(device);p.privatePrepare.mockClear();p.enroll.mockResolvedValue({});
 const identity=await openCanonicalIdentity(new Uint8Array([1]),'','synthetic.receiz',true,undefined,true),chat=await identity.businessSetup!(),result=chat.execute('private-seal-closed',[{tool:'business_seal_object',args:{title:'Original',description:'',longForm:'Carried text',kind:'moment'}}]),outcome=result.catch(e=>e);
 await vi.waitFor(()=>expect(p.nativeSealer).toHaveBeenCalled());identity.dispose();release();expect((await outcome).name).toBe('AbortError');expect(p.privatePrepare).not.toHaveBeenCalled();
});
