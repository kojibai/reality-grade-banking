import {expect,it,vi,afterEach} from 'vitest';
import {IDBFactory} from 'fake-indexeddb';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import {conformanceOfflineFixture} from './helpers/conformance-offline-sealer';
import {BANK_APPLICATION_ID} from '../src/receiz/config';
import {projectHeldDeposit} from '../src/receiz/deposit-source';
import * as assetComposer from '../src/receiz/asset-composer';
import * as adoption from '../src/receiz/asset-publication-adoption';
import * as publication from '../src/receiz/asset-publication';
import {publicAccountUsername} from '../src/receiz/receiving-username';
import {validateAssetDefinition} from '../src/receiz/asset-definition';
import {parsePublicMarket,type PublicMarketCatalog} from '../src/receiz/public-market';
const blobFetch=globalThis.fetch;
const fetchOriginalPreview=async(url:string)=>{if(!url.startsWith('blob:'))throw Error('HELD_SOURCE_BLOB_REQUIRED');return new Uint8Array(await(await blobFetch(url)).arrayBuffer());};
afterEach(()=>{vi.unstubAllGlobals();adoption.forgetAssetPublicationAdmissions();});
it.each(['pending','rejected','published-retired','published-observed'] as const)('actual cold native recovery restores exact held image and text before %s transport can wait',async mode=>{
 const status=mode==='published-retired'||mode==='published-observed'?'published':mode;
 const storage=new Map<string,string>();vi.stubGlobal('localStorage',{getItem:(key:string)=>storage.get(key)??null,setItem:(key:string,value:string)=>storage.set(key,value),removeItem:(key:string)=>storage.delete(key)});
 const f=await conformanceOfflineFixture({composer:true,account:true}),r=f.runtime;vi.stubGlobal('indexedDB',new IDBFactory());
 const actor=await r.createReceizArtifactAdmissionEngine()(await r.verifyReceizArtifact(new File([new Uint8Array(f.identity.bytes)],'identity.png')),{profile:'identity',identityPassphrase:f.identity.phrase});
 const identityBinding=await r.readReceizIdentityPublicBinding(actor),owner=identityBinding.artifactOwnerReceizId,uid='13c41d48-d844-414f-9f72-efae2db63325';
 const forbidden=vi.fn(async()=>{throw Error('SOURCE_REOPEN_NETWORK_FORBIDDEN');});
 const sealer=r.offline.createReceizOfflineSealer({ownerIdentityAdmission:actor,store:f.store,resources:f.resources,fetch:forbidden});
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jQmcAAAAASUVORK5CYII=','base64');
 const primary=await sealer.seal({bytes:new Uint8Array(png),filename:'original.png',mimeType:'image/png'});
 const privateFile=new File([primary.artifactBytes],primary.filename,{type:primary.mimeType});
 const documentSeal=await r.createBankNativeNoteSealer({enrollment:await f.store.load(),resources:f.resources});
 const publicBlocks=new Map(),privateBlocks=new Map(),custody=r.createImportedProofSourceCustody();
 const content=await r.composer.prepareConnectedComposerContent({ownerReceizId:owner,creatorUsername:'fixture_creator',assertCurrent(){},
  writeBlock:async(ref:any,bytes:Uint8Array)=>{publicBlocks.set(ref.sha256,bytes.slice());await custody.writeBlock(ref,bytes);},writeProtectedBlock:async(ref:any,bytes:Uint8Array)=>privateBlocks.set(ref.sha256,bytes.slice()),
  draft:{definition:{name:'Sealed Source recovery',symbol:'COLD',units:'1000',description:'Exact priced Source',linkedProofDigest:null},kind:'image',title:'Sealed Source recovery',description:'Exact priced Source',longForm:'The exact held Original remains itself.',files:[{id:'preview',role:'primary',file:new File([png],'preview.png',{type:'image/png'})}],
   protectedOriginal:{profileIdentity:uid,file:privateFile},collection:{allowOriginalDownload:true,allowDerivativeDownload:false,allowMomentRecordDownload:false,gateAudioPlayback:false,originalDownloadLimit:null,derivativeDownloadLimit:null,originalDownloadPriceCents:100000,derivativeDownloadPriceCents:null}}});
 const prepared=await r.composer.sealConnectedComposerContent({content,sealDocument:documentSeal,assertCurrent(){},writeBlock:async(ref:any,bytes:Uint8Array)=>{publicBlocks.set(ref.sha256,bytes.slice());await custody.writeBlock(ref,bytes);}});
 const exact=new Uint8Array(await prepared.artifact.arrayBuffer());

 const username='fixture_creator',binding={...identityBinding,artifactSha256:await r.sha256ReceizBytes(f.identity.bytes)},publicOwner={identityDigest:await r.sha256ReceizBytes(f.identity.bytes),accountUid:uid};
 let admitted:any;
 await r.connectedComposer.admitConnectedComposerSource({file:prepared.artifact,ownerReceizId:owner,username,profileIdentity:uid,assertCurrent(){},onLocalAdmission:(value:any)=>{admitted=value;}}).catch((error:Error)=>{throw Error('FIXTURE_ADMISSION_SETUP:'+error.message);});

 expect(admitted.artwork).toBeInstanceOf(Blob);expect((admitted.original.longForm as any).text).toBe(content.longForm);
 adoption.retainAssetPublicationAdmission(admitted,{...publicOwner,artwork:admitted.artwork});
 let savedDisplay=storage.get('bankeiz-admitted-public-assets-v1')!;
 let state:any=null;
 const receipt:import('../src/receiz/asset-publication').AssetPublicationReceipt=status==='published'?{status,artifactDigest:'a'.repeat(64),operationCount:1,visibleChildCount:1}:{status,code:'TEST_TRANSPORT_UNAVAILABLE'};
 const ports={ownerReceizId:identityBinding.artifactOwnerReceizId,assertOpen(){},lock:async(run:any)=>run(),read:async()=>state,write:async(next:any)=>{state=structuredClone(next);},seal:async()=>prepared.artifact,retain:async()=>prepared.reference.artifactSha256,restore:async()=>prepared.artifact,readIntent:async()=>({composer:content}),publish:async()=>receipt};
 await publication.createAssetPublication(ports).create({composer:content});
 if(status==='published'){adoption.acknowledgeAssetPublication(prepared.reference.artifactSha256,receipt);savedDisplay=storage.get('bankeiz-admitted-public-assets-v1')!;}
 let observedCatalog:PublicMarketCatalog|undefined;
 if(mode==='published-observed'){
  observedCatalog=parsePublicMarket({ok:true,transport:{publicOriginals:[JSON.parse(savedDisplay)[0].row]}});
  adoption.acceptDiscoveredPublicAssets(observedCatalog);
  adoption.acceptDiscoveredProfileAssets({schema:'bankeiz.public-profile.v1',userId:uid,username,displayName:username,bio:null,location:null,websiteUrl:null,avatarUrl:null,bannerUrl:null,socialLinks:[],links:[],authorshipVerified:false,pbiReceiptHash:null,createdAt:null,stats:{originals:1,views:null,plays:null,seconds:null,completion:null},items:observedCatalog.items,nextCursor:null});
  expect(adoption.mergeAdmittedPublicAssets(observedCatalog).items).toHaveLength(1);
  savedDisplay=storage.get('bankeiz-admitted-public-assets-v1')!;
 }
 expect(publication.readPendingAssetPublicationDigests(state,identityBinding.artifactOwnerReceizId)).toEqual(status==='published'?[]:[prepared.reference.artifactSha256]);
 // Confirmed older editor coordinates retire; the exact Source remains in the
 // existing encrypted custody and the bounded owner display keeps its locator.
 const retainedCheckpoint=structuredClone(state);if(status==='published')state=null;
 vi.stubGlobal('navigator',{onLine:false,hardwareConcurrency:2,locks:{request:async(_name:string,options:unknown,run?:()=>Promise<unknown>)=>typeof options==='function'?options():run!()}});
 adoption.forgetAssetPublicationAdmissions();storage.set('bankeiz-admitted-public-assets-v1',savedDisplay);vi.resetModules();
 const coldNative=await f.reloadRuntime();vi.stubGlobal('fetch',forbidden);
 const coldAdoption=await import('../src/receiz/asset-publication-adoption');
 const coldPublication=await import('../src/receiz/asset-publication');
 expect(coldAdoption.retainedAssetPublicationDigests(publicOwner.identityDigest,uid,username)).toEqual([prepared.reference.artifactSha256]);
 expect(coldAdoption.retainedAssetPublicationDigests('f'.repeat(64),uid,username)).toEqual([]);
 expect(coldAdoption.retainedAssetPublicationDigests(publicOwner.identityDigest,'foreign-account',username)).toEqual([]);
 expect(coldAdoption.retainedAssetPublicationDigests(publicOwner.identityDigest,uid,'foreign_owner')).toEqual([]);
 const nativeSource=readFileSync(new URL('../src/receiz/native-identity.ts',import.meta.url),'utf8'),file=ts.createSourceFile('native-identity.ts',nativeSource,ts.ScriptTarget.Latest,true);let body='';
 function find(node:ts.Node){if(ts.isFunctionDeclaration(node)&&node.name?.text==='createAsset')body=node.getText(file);ts.forEachChild(node,find);}find(file);
 expect(body).toContain('async function createAsset(');
 let compiled=ts.transpileModule(body,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
 for(const [path,replacement] of [['./asset-publication','Promise.resolve(assetPublicationModule)'],['./identity-vault','Promise.resolve(vault)'],['./asset-publication-adoption','Promise.resolve(adoptionModule)'],['./asset-composer','Promise.resolve(assetComposer)'],['./asset-publication-runtime','Promise.resolve(nativeModule)']])compiled=compiled.replaceAll(`import('${path}')`,replacement);
 let atBoundary:any;let entered!:()=>void;const observed=new Promise<void>(resolve=>{entered=resolve;});
 const stalledDelivery=()=>{atBoundary=coldAdoption.admittedAssetPublicationItem(prepared.reference.artifactSha256,username,uid);entered();return new Promise(()=>{});};
 const localAdmission=vi.fn(coldNative.connectedComposer.admitConnectedComposerSource),nativeModule={loadAssetPublicationRuntime:async()=>({...coldNative.connectedComposer,admitConnectedComposerSource:localAdmission})};
 const vault={loadAssetPublicationState:async()=>state,saveAssetPublicationState:async(_binding:any,next:any)=>{state=structuredClone(next);}};
 const names=['lifetime','validateAssetDefinition','assetPublicationModule','vault','adoptionModule','nativeModule','assetComposer','binding','sdk','unsigned','projectHeldDeposit','accountUid','knownWallet','presentationUsername','keyFile','publicAccountUsername','noteOpen','loadDepositSources','openComposedPublisher','openAssetPublicationRuntime','ownedSealer','assetDocumentSealer','holdProof','projectOwnedSource','heldSourceView','retainCalendarOriginal'];
 const values=[{signal:new AbortController().signal},validateAssetDefinition,coldPublication,vault,coldAdoption,nativeModule,assetComposer,binding,r,r.createReceizClient({applicationId:BANK_APPLICATION_ID,baseUrl:'https://receiz.com',fetchImpl:forbidden}),projectHeldDeposit,uid,null,username,{owner:{username}},publicAccountUsername,()=>{},async()=>[{bytes:exact,filename:prepared.artifact.name}],stalledDelivery,stalledDelivery,forbidden,forbidden,forbidden,forbidden,{invalidate(){}},()=>{}];
 const create=new Function(...names,`${compiled};return createAsset;`)(...values);
 let repeatLocal:(()=>Promise<void>)|undefined;
 if(status==='published'){
  let syncBody='';function findSync(node:ts.Node){if(ts.isFunctionDeclaration(node)&&node.name?.text==='startAssetSignatureSync')syncBody=node.getText(file);ts.forEachChild(node,findSync);}findSync(file);
  let syncCompiled=ts.transpileModule(syncBody,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
  for(const [path,replacement]of [['./asset-publication','Promise.resolve(assetPublicationModule)'],['./identity-vault','Promise.resolve(vault)'],['./asset-publication-adoption','Promise.resolve(adoptionModule)'],['./asset-publication-runtime','Promise.resolve(nativeModule)']])syncCompiled=syncCompiled.replaceAll(`import('${path}')`,replacement);
  const load=vi.fn(async(_binding:unknown,options:{digests:readonly string[];requireComplete:boolean})=>{expect(options).toEqual({digests:[prepared.reference.artifactSha256],requireComplete:true});return[{bytes:exact,filename:prepared.artifact.name}];});
  const neverPublish=vi.fn(async()=>{throw Error('PUBLISHED_SOURCE_MUST_NOT_REENTER_TRANSPORT');});
  const syncNames=['lifetime','binding','noteOpen','accountUid','knownWallet','presentationUsername','keyFile','publicAccountUsername','adoptionModule','assetPublicationModule','vault','nativeModule','loadDepositSources','sdk','retainCalendarOriginal','createAsset','publishAssetSignature'];
  const syncValues=[{signal:new AbortController().signal},binding,()=>{},uid,null,username,{owner:{username}},publicAccountUsername,coldAdoption,coldPublication,vault,nativeModule,load,r,()=>{},neverPublish,neverPublish];
  const sync=new Function(...syncNames,`let assetSignatureSync;${syncCompiled};return{start:startAssetSignatureSync,done:()=>assetSignatureSync};`)(...syncValues);
  sync.start();await sync.done();atBoundary=observedCatalog?coldAdoption.mergeAdmittedPublicAssets(observedCatalog).items[0]:coldAdoption.admittedAssetPublicationItem(prepared.reference.artifactSha256,username,uid);
  if(observedCatalog)expect(coldAdoption.admittedAssetPublicationItem(prepared.reference.artifactSha256,username,uid)).toBeNull();
  expect(neverPublish).not.toHaveBeenCalled();
  repeatLocal=async()=>{sync.start();await sync.done();expect(load).toHaveBeenCalledOnce();expect(neverPublish).not.toHaveBeenCalled();};
 }else{
  void create(null,undefined,false,undefined,undefined,prepared.reference.artifactSha256).catch((error:Error)=>{atBoundary={error:error.message};entered();});
  await observed;
 }
 expect(atBoundary?.error).toBeUndefined();
 expect(atBoundary?.originalDigest).toBe(prepared.reference.artifactSha256);
 expect(atBoundary?.artworkUrl,'held public preview must exist before delivery can request the network').toMatch(/^blob:/);
 expect(atBoundary?.carriedText?.text,'held full text must survive the same cold Source projection').toBe(content.longForm);
 expect(localAdmission).toHaveBeenCalledOnce();
 const inspected=await localAdmission.mock.results[0].value;expect(inspected.source.projection.bankAsset.composer).toEqual(content);
 expect(inspected.source.projection.bankAsset.composer.definition.units).toBe('1000');expect(inspected.source.projection.bankAsset.composer.collection.originalDownloadPriceCents).toBe(100000);
 const image=await fetchOriginalPreview(atBoundary.artworkUrl);expect(image).toEqual(new Uint8Array(png));
 const corrupt=new Uint8Array(exact);corrupt[0]^=1;
 state=retainedCheckpoint;coldAdoption.retainAssetPublicationSource(prepared.reference.artifactSha256,new File([corrupt],prepared.artifact.name));
 const refusedValues=[...values];refusedValues[names.indexOf('loadDepositSources')]=async()=>[{bytes:corrupt,filename:prepared.artifact.name}];
 vi.resetModules();refusedValues[names.indexOf('assetPublicationModule')]=await import('../src/receiz/asset-publication');
 const corruptCreate=new Function(...names,`${compiled};return createAsset;`)(...refusedValues);
 await expect(corruptCreate(null,undefined,false,undefined,undefined,prepared.reference.artifactSha256)).rejects.toThrow('BANK_ASSET_PUBLICATION_SOURCE_UNAVAILABLE');
 expect(localAdmission).toHaveBeenCalledOnce();
 const savedState=state;state={...state,ownerReceizId:'foreign.receiz.id'};
 try{await expect(corruptCreate(null,undefined,false,undefined,undefined,prepared.reference.artifactSha256)).rejects.toThrow('BANK_ASSET_PUBLICATION_STATE_INVALID');}finally{state=savedState;}
 expect(publication.readPendingAssetPublicationDigests({...state,status:'published',receipt:{status:'published',artifactDigest:'a'.repeat(64),operationCount:1,visibleChildCount:1}},identityBinding.artifactOwnerReceizId)).toEqual([]);
 if(repeatLocal){
  const file=(localAdmission.mock.calls[0][0] as {file:File}).file;coldAdoption.retainAssetPublicationSource(prepared.reference.artifactSha256,file);await repeatLocal();
  expect(localAdmission).toHaveBeenCalledTimes(2);expect((localAdmission.mock.calls[1][0] as {file:File}).file).toBe(file);
  expect((await localAdmission.mock.results[1].value).source).toBe(inspected.source);
 }
 expect(forbidden).not.toHaveBeenCalled();expect(new Uint8Array(await prepared.artifact.arrayBuffer())).toEqual(exact);
},120000);
