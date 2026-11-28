// The DOM transport supplies the actual vendored Groth16 implementation.
// @ts-expect-error The included upstream browser bundle has no declarations.
import * as snarkjs from '../native/npm/snarkjs@0.7.6/build/browser.esm.js';
import {afterEach,expect,it,vi} from 'vitest';
import React,{act} from 'react';
import {createRoot,hydrateRoot} from 'react-dom/client';
import {renderToStaticMarkup,renderToString} from 'react-dom/server';
import {Window} from 'happy-dom';
import {parsePublicMarket} from '../src/receiz/public-market';
import {IDBFactory,IDBObjectStore} from 'fake-indexeddb';
import {mkdirSync,writeFileSync} from 'node:fs';
import {conformanceOfflineFixture} from './helpers/conformance-offline-sealer';
import * as adoption from '../src/receiz/asset-publication-adoption';
import {saveDeviceIdentity,saveDepositSource,loadDepositSources} from '../src/receiz/identity-vault';
const ports=vi.hoisted(()=>({native:null as any,work:null as Promise<any>|null,calls:0,mounts:0,releases:0}));
// Only the browser runtime loader is supplied. This is the actual canonical
// imported Source verifier with the fixture's ephemeral trusted test root.
vi.mock('../src/receiz/ledger-offline-proof',()=>({loadOfflineProofVerifier:async()=>({readArtifact:async(bytes:Uint8Array,filename:string)=>{
 const source=await ports.native.openImportedProofSource(new File([new Uint8Array(bytes)],filename));
 return{report:{schema:'bankeiz.offline-proof-inspection.v1',sdk:'129.0.0',artifactSha256:source.descriptor.artifactSha256,payloadSha256:source.projection.payloadSha256,verification:source.verification},payload:{bytes:new Uint8Array(await source.sourcePayload.arrayBuffer()),filename:source.projection.payloadFilename,mimeType:source.sourcePayload.type,sha256:source.projection.payloadSha256}};
}})}));
vi.mock('../src/receiz/asset-publication-runtime',()=>({loadAssetPublicationRuntime:async()=>({...ports.native.connectedComposer,createImportedProofSourceCustody:ports.native.createImportedProofSourceCustody,retainMountedMaterial:(...args:any[])=>{ports.mounts++;const release=ports.native.connectedComposer.retainMountedMaterial(...args);return()=>{ports.releases++;release();};},readHeldImportedProfileOriginalMaterial:(...args:any[])=>{ports.calls++;return ports.work=ports.native.connectedComposer.readHeldImportedProfileOriginalMaterial(...args);}})}));
afterEach(()=>{adoption.forgetAssetPublicationAdmissions();vi.unstubAllGlobals();vi.restoreAllMocks();});
it('renders the oldest exact Source artwork after 33 creations with no remote prerequisite',async()=>{
 const storage=new Map<string,string>();vi.stubGlobal('localStorage',{getItem:(k:string)=>storage.get(k)??null,setItem:(k:string,v:string)=>storage.set(k,v),removeItem:(k:string)=>storage.delete(k)});
 const f=await conformanceOfflineFixture({composer:true,account:true}),r=f.runtime;vi.stubGlobal('indexedDB',new IDBFactory());
 const put=IDBObjectStore.prototype.put;
 vi.spyOn(IDBObjectStore.prototype,'put').mockImplementation(function(this:IDBObjectStore,value,key){
  if(this.transaction.db.name==='receiz-imported-source-custody-v1'&&this.name==='segments'&&value.blob instanceof Blob) {
   throw new DOMException('Error preparing Blob/File data to be stored in object store','UnknownError');
  }
  return put.call(this,value,key);
 });
 const actor=await r.createReceizArtifactAdmissionEngine()(await r.verifyReceizArtifact(new File([new Uint8Array(f.identity.bytes)],'identity.png')),{profile:'identity',identityPassphrase:f.identity.phrase});
 const identity=await r.readReceizIdentityPublicBinding(actor),identityDigest=await r.sha256ReceizBytes(f.identity.bytes),owner=identity.artifactOwnerReceizId,uid='13c41d48-d844-414f-9f72-efae2db63325',username='fixture_creator';
 await saveDeviceIdentity(new Uint8Array(f.identity.bytes),'identity.png',f.identity.phrase,true);
 const forbidden=vi.fn(async()=>{throw Error('KNOWN_LOCAL_SOURCE_REQUESTED_NETWORK');});
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jQmcAAAAASUVORK5CYII=','base64');
 const sealer=r.offline.createReceizOfflineSealer({ownerIdentityAdmission:actor,store:f.store,resources:f.resources,fetch:forbidden});
 const primary=await sealer.seal({bytes:new Uint8Array(png),filename:'original.png',mimeType:'image/png'});
 const custody=r.createImportedProofSourceCustody(),sealDocument=await r.createBankNativeNoteSealer({enrollment:await f.store.load(),resources:f.resources});
 const content=await r.composer.prepareConnectedComposerContent({ownerReceizId:owner,creatorUsername:username,assertCurrent(){},writeBlock:custody.writeBlock,writeProtectedBlock:async()=>{},draft:{kind:'image',title:'Held Original 0',description:'Original bytes remain local',longForm:'Exact text remains after display overflow.',files:[{id:'preview',role:'primary',file:new File([png],'preview.png',{type:'image/png'})}],protectedOriginal:{profileIdentity:uid,file:new File([primary.artifactBytes],primary.filename,{type:primary.mimeType})},collection:{allowOriginalDownload:true,allowDerivativeDownload:false,allowMomentRecordDownload:false,gateAudioPlayback:false,originalDownloadLimit:null,derivativeDownloadLimit:null,originalDownloadPriceCents:100000,derivativeDownloadPriceCents:null}}});
 let oldest:any,oldestReference:any,oldestBytes:Uint8Array|undefined;const originalRows:unknown[]=[];
 for(let i=0;i<33;i++){
  const prepared=await r.composer.sealConnectedComposerContent({content:{...content,title:'Held Original '+i},sealDocument,assertCurrent(){},writeBlock:custody.writeBlock});
  const bytes=new Uint8Array(await prepared.artifact.arrayBuffer());
  await saveDepositSource({artifactSha256:identityDigest},bytes,prepared.artifact.name,prepared.reference.artifactSha256);
  await r.connectedComposer.admitConnectedComposerSource({file:prepared.artifact,ownerReceizId:owner,username,profileIdentity:uid,assertCurrent(){},onLocalAdmission:(value:any)=>adoption.retainAssetPublicationAdmission(value,{identityDigest,accountUid:uid,artwork:value.artwork})});
  originalRows.push(JSON.parse(storage.get('bankeiz-admitted-public-assets-v1')!).at(-1).row);
  if(i===0){oldest=parsePublicMarket({ok:true,transport:{publicOriginals:[JSON.parse(storage.get('bankeiz-admitted-public-assets-v1')!)[0].row]}}).items[0];oldestReference=prepared.reference;oldestBytes=bytes;}
 }
 expect(JSON.parse(storage.get('bankeiz-admitted-public-assets-v1')!)).toHaveLength(32);
 const latest=parsePublicMarket({ok:true,transport:{publicOriginals:[originalRows.at(-1)]}}).items[0];
 expect(adoption.retainedAssetPublicationArtwork(latest.originalDigest!,username)).toMatch(/^blob:/);
 expect(adoption.retainedAssetPublicationArtwork(latest.originalDigest!,'foreign_creator')).toBeNull();
 if(process.env.BANK_SOURCE_CUSTODY_BROWSER_EVIDENCE){
  const directory=process.env.BANK_SOURCE_CUSTODY_BROWSER_EVIDENCE;mkdirSync(directory,{recursive:true});
  const database=await new Promise<IDBDatabase>((resolve,reject)=>{const request=indexedDB.open('receiz-imported-source-custody-v1',1);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
  const rows=async(store:string)=>new Promise<any[]>((resolve,reject)=>{const request=database.transaction(store).objectStore(store).getAll();request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
  try{const sources=await rows('sources'),segments=(await rows('segments')).map(row=>({sha256:row.sha256,byteLength:row.byteLength,bytes:Buffer.from(row.exactBytes).toString('base64')}));writeFileSync(directory+'/public-source-fixture.json',JSON.stringify({roots:f.roots,oldest,oldestReference,originalRows,sources,segments,display:storage.get('bankeiz-admitted-public-assets-v1'),png:png.toString('base64')}));}finally{database.close();}
 }
 const saved=storage.get('bankeiz-admitted-public-assets-v1')!;adoption.forgetAssetPublicationAdmissions();storage.set('bankeiz-admitted-public-assets-v1',saved);vi.resetModules();
 ports.native=await f.reloadRuntime();vi.stubGlobal('fetch',forbidden);
 const cold=await import('../src/receiz/asset-publication-adoption');
 expect(cold.retainedAssetPublicationDigests(identityDigest,uid,username)).not.toContain(oldestReference.artifactSha256);
 expect(cold.retainedAssetPublicationSource(oldestReference.artifactSha256)).toBeNull();
 const [privateSource]=await loadDepositSources({artifactSha256:identityDigest},{requireComplete:true,digests:[oldestReference.artifactSha256]});expect(privateSource.bytes).toEqual(oldestBytes);
 const held=await ports.native.createImportedProofSourceCustody().readHeld(oldestReference);expect(held.descriptor.artifactSha256).toBe(oldestReference.artifactSha256);expect(new Uint8Array(await held.composerResources.preview.arrayBuffer())).toEqual(new Uint8Array(png));
 const {PublicObjectArtwork}=await import('../src/features/market/PublicObjectRow');
 const html=renderToStaticMarkup(React.createElement(PublicObjectArtwork,{item:oldest,artworkUrl:oldest.artworkUrl}));
 expect(html,'Server first paint must retain its already-carried Source image').toContain('src="https://receiz.com/api/profile/showcase/imported-source?');
 const browser=new Window({settings:{disableCSSFileLoading:true,disableIframePageLoading:true,disableJavaScriptFileLoading:true,disableComputedStyleRendering:true}});
 Object.assign(browser,{snarkjs});
 vi.stubGlobal('window',browser);vi.stubGlobal('document',browser.document);vi.stubGlobal('HTMLElement',browser.HTMLElement);vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
 try{
  await act(async()=>{root.render(React.createElement(PublicObjectArtwork,{item:oldest,artworkUrl:oldest.artworkUrl}));});
  expect(host.querySelector('img')?.getAttribute('src')??'','A held exact Source must resolve locally before a thumbnail may request its remote URL').not.toMatch(/^https:/);
  expect(ports.calls).toBe(1);expect(ports.work).toBeDefined();await act(async()=>{await ports.work;});
  expect(host.querySelector('img')?.getAttribute('src')).toMatch(/^blob:/);expect(forbidden).not.toHaveBeenCalled();
  const image=host.querySelector('img'),url=image?.getAttribute('src'),parse=JSON.parse;let repeatedParses=0;
  const parser=vi.spyOn(JSON,'parse').mockImplementation((text,...args)=>{if(typeof text==='string'&&text.includes('receiz.imported-proof-source.v1'))repeatedParses++;return parse(text,...args);});
  try{
   for(let tick=1;tick<=40;tick++)await act(()=>root.render(React.createElement(PublicObjectArtwork,{item:{...oldest,localValuationPulse:tick},artworkUrl:oldest.artworkUrl})));
   expect(repeatedParses).toBe(0);expect(ports.calls).toBe(1);expect(ports.mounts).toBe(1);expect(ports.releases).toBe(0);
   expect(host.querySelector('img')).toBe(image);expect(image?.getAttribute('src')).toBe(url);expect(forbidden).not.toHaveBeenCalled();
  }finally{parser.mockRestore();}
 }finally{await act(async()=>root.unmount());host.remove();}
 expect(ports.releases).toBe(1);
 // No local custody provider exists in this environment. It cannot suppress
 // the already-carried public coordinate or load a Native reader pointlessly.
 vi.stubGlobal('indexedDB',undefined);ports.calls=0;ports.work=null;
 const unavailable=document.createElement('div'),unavailableRoot=createRoot(unavailable);
 try{await act(async()=>unavailableRoot.render(React.createElement(PublicObjectArtwork,{item:oldest,artworkUrl:oldest.artworkUrl})));expect(unavailable.querySelector('img')?.getAttribute('src')).toBe(oldest.artworkUrl);expect(ports.calls).toBe(0);}finally{await act(async()=>unavailableRoot.unmount());}
 // A real empty/failed custody read still cannot clear a served image. These
 // are actual Native custody calls, not an admitted-Source/verifier mock.
 for(const provider of [new IDBFactory(),{open(){throw new DOMException('Storage unavailable','InvalidStateError');}}]){
  vi.stubGlobal('indexedDB',provider);ports.native=await f.reloadRuntime();ports.calls=0;ports.work=null;
  const carried=document.createElement('div');carried.innerHTML=renderToString(React.createElement(PublicObjectArtwork,{item:oldest,artworkUrl:oldest.artworkUrl}));const image=carried.querySelector('img');
  let hydrated:ReturnType<typeof hydrateRoot>|undefined;
  try{await act(async()=>{hydrated=hydrateRoot(carried,React.createElement(PublicObjectArtwork,{item:oldest,artworkUrl:oldest.artworkUrl}));});expect(ports.calls).toBe(1);await act(async()=>{await ports.work?.catch(()=>undefined);});expect(carried.querySelector('img')).toBe(image);expect(image?.getAttribute('src')).toBe(oldest.artworkUrl);}finally{await act(async()=>hydrated?.unmount());}
 }
 expect(forbidden).not.toHaveBeenCalled();
},180000);
