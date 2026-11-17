import {afterEach,expect,it,vi} from 'vitest';
import {IDBFactory} from 'fake-indexeddb';
import {conformanceOfflineFixture} from './helpers/conformance-offline-sealer';
import * as adoption from '../src/receiz/asset-publication-adoption';
import {saveDeviceIdentity,saveDepositSource,loadDepositSources} from '../src/receiz/identity-vault';
const ports=vi.hoisted(()=>({native:null as any}));
// Only the browser runtime loader is supplied. This is the actual canonical
// imported Source verifier with the fixture's ephemeral trusted test root.
vi.mock('../src/receiz/ledger-offline-proof',()=>({loadOfflineProofVerifier:async()=>({readArtifact:async(bytes:Uint8Array,filename:string)=>{
 const source=await ports.native.openImportedProofSource(new File([new Uint8Array(bytes)],filename));
 return{report:{schema:'bankeiz.offline-proof-inspection.v1',sdk:'129.0.0',artifactSha256:source.descriptor.artifactSha256,payloadSha256:source.projection.payloadSha256,verification:source.verification},payload:{bytes:new Uint8Array(await source.sourcePayload.arrayBuffer()),filename:source.projection.payloadFilename,mimeType:source.sourcePayload.type,sha256:source.projection.payloadSha256}};
}})}));
vi.mock('../src/receiz/asset-publication-runtime',()=>({loadAssetPublicationRuntime:async()=>({...ports.native.connectedComposer,createImportedProofSourceCustody:ports.native.createImportedProofSourceCustody})}));
afterEach(()=>{adoption.forgetAssetPublicationAdmissions();vi.unstubAllGlobals();});
it('cold shared media reuses the oldest exact Source after 33 genuine creations evict its presentation locator',async()=>{
 const storage=new Map<string,string>();vi.stubGlobal('localStorage',{getItem:(k:string)=>storage.get(k)??null,setItem:(k:string,v:string)=>storage.set(k,v),removeItem:(k:string)=>storage.delete(k)});
 const f=await conformanceOfflineFixture({composer:true,account:true}),r=f.runtime;vi.stubGlobal('indexedDB',new IDBFactory());
 const actor=await r.createReceizArtifactAdmissionEngine()(await r.verifyReceizArtifact(new File([new Uint8Array(f.identity.bytes)],'identity.png')),{profile:'identity',identityPassphrase:f.identity.phrase});
 const identity=await r.readReceizIdentityPublicBinding(actor),identityDigest=await r.sha256ReceizBytes(f.identity.bytes),owner=identity.artifactOwnerReceizId,uid='13c41d48-d844-414f-9f72-efae2db63325',username='fixture_creator';
 await saveDeviceIdentity(new Uint8Array(f.identity.bytes),'identity.png',f.identity.phrase,true);
 const forbidden=vi.fn(async()=>{throw Error('KNOWN_LOCAL_SOURCE_REQUESTED_NETWORK');});
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jQmcAAAAASUVORK5CYII=','base64');
 const sealer=r.offline.createReceizOfflineSealer({ownerIdentityAdmission:actor,store:f.store,resources:f.resources,fetch:forbidden});
 const primary=await sealer.seal({bytes:new Uint8Array(png),filename:'original.png',mimeType:'image/png'});
 const custody=r.createImportedProofSourceCustody(),sealDocument=await r.createBankNativeNoteSealer({enrollment:await f.store.load(),resources:f.resources});
 const content=await r.composer.prepareConnectedComposerContent({ownerReceizId:owner,creatorUsername:username,assertCurrent(){},writeBlock:custody.writeBlock,writeProtectedBlock:async()=>{},draft:{kind:'image',title:'Held Original 0',description:'Original bytes remain local',longForm:'Exact text remains after display overflow.',files:[{id:'preview',role:'primary',file:new File([png],'preview.png',{type:'image/png'})}],protectedOriginal:{profileIdentity:uid,file:new File([primary.artifactBytes],primary.filename,{type:primary.mimeType})},collection:{allowOriginalDownload:true,allowDerivativeDownload:false,allowMomentRecordDownload:false,gateAudioPlayback:false,originalDownloadLimit:null,derivativeDownloadLimit:null,originalDownloadPriceCents:100000,derivativeDownloadPriceCents:null}}});
 let oldest:any,oldestReference:any,oldestBytes:Uint8Array|undefined;
 for(let i=0;i<33;i++){
  const prepared=await r.composer.sealConnectedComposerContent({content:{...content,title:'Held Original '+i},sealDocument,assertCurrent(){},writeBlock:custody.writeBlock});
  const bytes=new Uint8Array(await prepared.artifact.arrayBuffer());
  await saveDepositSource({artifactSha256:identityDigest},bytes,prepared.artifact.name,prepared.reference.artifactSha256);
  await r.connectedComposer.admitConnectedComposerSource({file:prepared.artifact,ownerReceizId:owner,username,profileIdentity:uid,assertCurrent(){},onLocalAdmission:(value:any)=>adoption.retainAssetPublicationAdmission(value,{identityDigest,accountUid:uid,artwork:value.artwork})});
  if(i===0){oldest=adoption.admittedAssetPublicationItem(prepared.reference.artifactSha256,username,uid);oldestReference=prepared.reference;oldestBytes=bytes;}
 }
 expect(JSON.parse(storage.get('bankeiz-admitted-public-assets-v1')!)).toHaveLength(32);
 const saved=storage.get('bankeiz-admitted-public-assets-v1')!;adoption.forgetAssetPublicationAdmissions();storage.set('bankeiz-admitted-public-assets-v1',saved);vi.resetModules();
 ports.native=await f.reloadRuntime();vi.stubGlobal('fetch',forbidden);
 const cold=await import('../src/receiz/asset-publication-adoption');
 expect(cold.retainedAssetPublicationDigests(identityDigest,uid,username)).not.toContain(oldestReference.artifactSha256);
 expect(cold.retainedAssetPublicationSource(oldestReference.artifactSha256)).toBeNull();
 const [privateSource]=await loadDepositSources({artifactSha256:identityDigest},{requireComplete:true,digests:[oldestReference.artifactSha256]});expect(privateSource.bytes).toEqual(oldestBytes);
 const held=await ports.native.createImportedProofSourceCustody().readHeld(oldestReference);expect(held.descriptor.artifactSha256).toBe(oldestReference.artifactSha256);expect(new Uint8Array(await held.composerResources.preview.arrayBuffer())).toEqual(new Uint8Array(png));
 const media=await import('../src/receiz/proof-media');
 const opened=await media.openProofMedia({kind:'public',url:oldest.originalUrl,digest:oldestReference.artifactSha256,hasLongForm:true});
 expect(opened.files.find(file=>file.kind==='image')?.bytes).toEqual(new Uint8Array(png));
 expect(await opened.readText?.()).toMatchObject({text:content.longForm});expect(forbidden).not.toHaveBeenCalled();
 const wrong=new URL(oldest.originalUrl),reference={...oldestReference,artifactSha256:'f'.repeat(64)};wrong.searchParams.set('reference',JSON.stringify(reference));
 await expect(media.openProofMedia({kind:'public',url:wrong.href,digest:oldestReference.artifactSha256})).rejects.toThrow('does not match');
 const db=await new Promise<IDBDatabase>((resolve,reject)=>{const request=indexedDB.open('receiz-imported-source-custody-v1',1);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
 try{await new Promise<void>((resolve,reject)=>{const tx=db.transaction('segments','readwrite'),store=tx.objectStore('segments'),read=store.get(oldestReference.bytes.sha256);read.onsuccess=()=>{expect(read.result).toBeDefined();store.put({...read.result,blob:new Blob(['corrupt Source bytes'])});};tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);});}finally{db.close();}
 const retained=await media.openProofMedia({kind:'public',url:oldest.originalUrl,digest:oldestReference.artifactSha256,postUrl:'https://receiz.com/fixture_creator/verified/changed-view'});
 expect(retained.files.find(file=>file.kind==='image')?.bytes).toEqual(new Uint8Array(png));
 // A new realm has no issued Source/resource object to reuse. Its actual
 // canonical reader must refuse the now-corrupt exact custody bytes.
 ports.native=await f.reloadRuntime();vi.resetModules();const reopened=await import('../src/receiz/proof-media');
 await expect(reopened.openProofMedia({kind:'public',url:oldest.originalUrl,digest:oldestReference.artifactSha256})).rejects.toThrow('IMPORTED_SOURCE_CUSTODY_SEGMENT_INVALID');
 expect(forbidden).not.toHaveBeenCalled();
},180000);
