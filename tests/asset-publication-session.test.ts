import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {openCanonicalIdentity} from '../src/receiz/native-identity';
import {BANK_APPLICATION_ID} from '../src/receiz/config';

// Exercise the real open-ID publication adapter and bearer transport. Source
// verification is independently covered by the canonical composer fixture.
const p=vi.hoisted(()=>({pulse:100,generation:0,username:'owner',grants:0,publishers:[] as string[],tokens:[] as string[],errors:[] as string[],state:null as unknown,rename:undefined as undefined|(()=>void)}));
vi.mock('../src/receiz/asset-publication',async original=>{const actual=await original<typeof import('../src/receiz/asset-publication')>();return{...actual,createAssetPublication:(input:Parameters<typeof actual.createAssetPublication>[0])=>actual.createAssetPublication({...input,publish:async file=>{try{return await input.publish(file);}catch(error){p.errors.push(error instanceof Error?error.stack??error.message:String(error));throw error;}}})};});
vi.mock('../src/receiz/client',()=>({loadReceiz:async()=>({
 verifyReceizArtifact:async()=>({status:'verified-artifact'}),createReceizArtifactAdmissionEngine:()=>async()=>({verdict:'canonical-identity'}),isSdkIssuedReceizArtifactAdmission:()=>true,
 readReceizIdentityPublicBinding:async()=>({keyId:'a'.repeat(64),artifactSha256:'b'.repeat(64),artifactOwnerReceizId:'owner.receiz.id'}),
 readReceizIdentityArtifact:async()=>({keyId:'a'.repeat(64),owner:{uid:'owner',username:'owner'},crypto:{publicKeyRawB64u:'public'}}),
 projectReceizIdentityAccount:async()=>({authority:'identity-only'}),receizKaiNow:()=>({pulse:p.pulse}),sha256ReceizBytes:async()=> 'b'.repeat(64),createReceizProofAuthorityChallenge:()=>({challenge:{},challengeB64Url:'fixture'}),
 createReceizClient:()=>({identity:{continueReceizId:async()=>({ok:true,session:{uid:'owner',username:p.username}}),signLoginProof:async()=>({}),exchangeProofAuthority:async({scopes}:{scopes:string[]})=>({applicationId:BANK_APPLICATION_ID,keyId:'a'.repeat(64),artifactDigest:'b'.repeat(64),grantedScopes:scopes,accessToken:'synthetic-grant-'+(++p.grants),expiresAtKai:p.pulse+100})},artifacts:{verifyAndOpen:async(file:File)=>({sealedArtifact:{artifactSha256:[...new Uint8Array(await crypto.subtle.digest('SHA-256',await file.arrayBuffer()))].map(v=>v.toString(16).padStart(2,'0')).join(''),continuity:{ownerReceizId:'owner.receiz.id'}},verifiedPayload:{bytes:new TextEncoder().encode('{}'),filename:'original'},verification:{bundle:{kaiPulseEternal:'100'}}})}}),
})}));
vi.mock('@receiz/sdk/offline',()=>({createReceizIndexedDbSealStore:()=>({load:async()=>({privateKey:{},cert:{issuedAtMs:0}})}),createReceizOfflineSealer:()=>({enroll:async()=>{}})}));
vi.mock('../src/receiz/offline-notes',()=>({loadBankNoteRuntime:async()=>({createBankNativeNoteSealer:async()=>()=>{}})}));
vi.mock('../src/receiz/proof-resource-continuity',()=>({loadBankProofResources:async()=>({wasm:new Uint8Array([1]),zkey:new Uint8Array([2])})}));
vi.mock('../src/receiz/identity-protection',()=>({unprotectIdentityKeyFile:async(value:unknown)=>value}));
vi.mock('../src/receiz/identity-lock',()=>({identityNeedsPhrase:()=>false}));
vi.mock('../src/receiz/profile-edit',()=>({ownerProfilePresentation:()=>null,readProfileImageUpdate:()=>null,createProfileEditor:(input:{publish(value:unknown):void})=>{p.rename=()=>input.publish({profile:{profile:{username:p.username}}});return{};}}));
vi.mock('../src/receiz/public-profile',()=>({parsePublicProfile:()=>{throw Error('Public page rendering is outside this transport fixture.');},retainPublicProfile(){},forgetPublicProfile(){},forgetPublicProfilesForAccount(){}}));
vi.mock('../src/receiz/asset-publication-adoption',()=>({retainAssetPublicationSource(){},retainAssetPublicationAdmission(){},acknowledgeAssetPublication(){},refreshAssetPublicationCatalog:async()=>{}}));
vi.mock('../src/receiz/identity-vault',async original=>({...await original<typeof import('../src/receiz/identity-vault')>(),loadWalletObservation:async()=>null,loadAccountLedgerState:async()=>null,loadMarketPortfolioState:async()=>null,loadMessagingDisplay:async()=>null,loadDeviceIdentity:async()=>({bytes:new Uint8Array([1])}),saveDepositSource:async()=>{},loadAssetPublicationState:async()=>p.state,saveAssetPublicationState:async(_binding:unknown,next:unknown,previous:unknown)=>{expect(p.state).toEqual(previous);p.state=next;}}));
vi.mock('../src/receiz/asset-publication-runtime',()=>({createAssetPublicationFetch:(input:{username:string;request(path:string,init?:RequestInit):Promise<Response>})=>(_url:string,init?:RequestInit)=>input.request('/api/connect/profile/showcase/publication?applicationId='+BANK_APPLICATION_ID+'&username='+input.username,init),loadAssetPublicationRuntime:async()=>({
 prepareConnectedComposerContent:async({draft}:{draft:{title:string}})=>({schema:'controlled-composer',owner:'owner.receiz.id',title:draft.title}),sealConnectedComposerContent:async({content}:{content:{title:string}})=>({artifact:new File(['exact original '+p.generation+' '+content.title],'original.receizbundle')}),admitConnectedComposerSource:async()=>{},
 createConnectedAssetPublicationRuntime:async(input:{account:{username:string};fetchImpl:typeof fetch;assertCurrent():void})=>{p.publishers.push(input.account.username);return{publish:async()=>{try{input.assertCurrent();const response=await input.fetchImpl('/api/profile/showcase/accepted-source?username='+input.account.username);expect(response.ok).toBe(true);return{status:'published',artifactDigest:'d'.repeat(64),operationCount:1,visibleChildCount:1};}catch(error){p.errors.push(error instanceof Error?error.stack??error.message:String(error));throw error;}}};},
})}));
beforeEach(()=>{p.generation++;p.pulse=100;p.username='owner';p.grants=0;p.publishers=[];p.tokens=[];p.errors=[];p.state=null;p.rename=undefined;vi.stubGlobal('location',{origin:'https://bankeiz.com'});vi.stubGlobal('dispatchEvent',()=>true);vi.stubGlobal('navigator',{locks:{request:async(_name:string,_options:unknown,run:()=>Promise<unknown>)=>run()}});vi.stubGlobal('fetch',async(_url:unknown,init:RequestInit)=>{p.tokens.push(new Headers(init.headers).get('authorization')??'');return Response.json({ok:true});});});
afterEach(()=>vi.unstubAllGlobals());
const draft={title:'Original',description:'',kind:'moment' as const,longForm:'Exact text',files:[]};
async function create(identity:Awaited<ReturnType<typeof openCanonicalIdentity>>,name:string){const value=await identity.createComposedAsset({name,symbol:'ORIG',units:'1000',description:'',linkedProofDigest:null},{...draft,title:name});expect(value.publication?.status).toBe('pending');await vi.waitFor(()=>expect((p.state as {status:string}).status,JSON.stringify({publishers:p.publishers,errors:p.errors,tokens:p.tokens,username:identity.accountUsername?.()})).toBe('published'));}

it('reuses its native publisher but renews an expired grant before the next automatic delivery',async()=>{
 const identity=await openCanonicalIdentity(new Uint8Array([1]),'','synthetic.receiz',true);
 try{await create(identity,'First');const grants=p.grants,first=p.tokens[0];p.pulse=300;await create(identity,'Second');expect(p.publishers).toEqual(['owner']);expect(p.tokens).toEqual([first,'Bearer synthetic-grant-'+(grants+1)]);expect(p.grants).toBe(grants+1);}finally{identity.dispose();}
});
it('opens the current profile scope after a rename without reopening the Identity or losing its source',async()=>{
 const identity=await openCanonicalIdentity(new Uint8Array([1]),'','synthetic.receiz',true);
 try{await create(identity,'First');await identity.profile!();p.username='renamed';p.rename!();await vi.dynamicImportSettled();await create(identity,'Second');expect(p.publishers).toEqual(['owner','renamed']);expect(p.tokens).toHaveLength(2);expect(identity.accountUsername?.()).toBe('renamed');}finally{identity.dispose();}
});
