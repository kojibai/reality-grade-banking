import {afterEach,expect,it,vi} from 'vitest';
import {IDBFactory,IDBKeyRange} from 'fake-indexeddb';
import {conformanceOfflineFixture} from './helpers/conformance-offline-sealer';
import * as adoption from '../src/receiz/asset-publication-adoption';
import {parsePublicMarket} from '../src/receiz/public-market';
import {safeImportedSourceUrl} from '../src/receiz/imported-source-url';
import type {ConnectedAssetLocalAdmission} from '../src/receiz/asset-publication-runtime';

const uid='eecb99a0-9c6a-4e89-813b-f76331ea9c41',username='bjklock';
afterEach(()=>{adoption.forgetAssetPublicationAdmissions();vi.unstubAllGlobals();vi.restoreAllMocks();});

it('retains the verified enclosing Source and selected public creator when protected media has its own digest, including cold reopening',async()=>{
 vi.stubGlobal('indexedDB',new IDBFactory());vi.stubGlobal('IDBKeyRange',IDBKeyRange);
 const storage=new Map<string,string>();vi.stubGlobal('localStorage',{getItem:(key:string)=>storage.get(key)??null,setItem:(key:string,value:string)=>storage.set(key,value),removeItem:(key:string)=>storage.delete(key)});
 const f=await conformanceOfflineFixture({composer:true}),r=f.runtime;
 const identity=await r.createReceizArtifactAdmissionEngine()(await r.verifyReceizArtifact(new File([new Uint8Array(f.identity.bytes)],'identity.png')),{profile:'identity',identityPassphrase:f.identity.phrase});
 expect(identity.verdict).toBe('canonical-identity');
 const ownerReceizId=(await r.readReceizIdentityPublicBinding(identity)).artifactOwnerReceizId;
 const sealer=r.offline.createReceizOfflineSealer({store:f.store,resources:f.resources,ownerIdentityAdmission:identity});
 const image=new File([Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jQmcAAAAASUVORK5CYII=','base64')],'profile.png',{type:'image/png'});
 const sealedPrimary=await sealer.seal({bytes:new Uint8Array(await image.arrayBuffer()),filename:image.name,mimeType:image.type});
 expect(sealedPrimary.verification.ok).toBe(true);
 const protectedFile=new File([new Uint8Array(sealedPrimary.artifactBytes)],sealedPrimary.filename,{type:sealedPrimary.mimeType});
 const sealDocument=await r.createBankNativeNoteSealer({enrollment:await f.store.load(),resources:f.resources}),custody=r.createImportedProofSourceCustody(),protectedBlocks=new Map<string,Uint8Array>();
 const base={kind:'image',title:'THE GATE WAS NEVER THE VALUE',description:'A public Original with exact Source identity.',longForm:'',files:[{id:'primary',role:'primary',file:image}]};
 const policy={allowOriginalDownload:false,allowDerivativeDownload:false,allowMomentRecordDownload:false,gateAudioPlayback:false,originalDownloadLimit:null,derivativeDownloadLimit:null,originalDownloadPriceCents:null,derivativeDownloadPriceCents:null};
 const owner={identityDigest:'d'.repeat(64),accountUid:uid};
 for(const kind of ['protected','moment','unprotected']){
  const draft=kind==='moment'?{...base,kind:'moment',files:[]}:kind==='protected'?{...base,collection:policy,protectedOriginal:{profileIdentity:uid,file:protectedFile}}:base;
  const prepared=await r.composer.prepareConnectedComposerSource({draft,ownerReceizId,creatorUsername:username,sealDocument,writeBlock:custody.writeBlock,writeProtectedBlock:async(reference:{sha256:string},bytes:Uint8Array)=>{protectedBlocks.set(reference.sha256,bytes.slice());},assertCurrent(){}});
  const opened=await r.openImportedProofSource(prepared.artifact,{canonicalSignatureV4RootPublicKeys:new Map(f.roots.map((root:{kid:string})=>[root.kid,root])),resolveSourceBlock:custody.resolveBlock});
  expect(opened.verification.ok).toBe(true);expect(opened.projection.ownerReceizId).toBe(ownerReceizId);
  let admission!:ConnectedAssetLocalAdmission;
  await r.connectedComposer.admitConnectedComposerSource({file:prepared.artifact,ownerReceizId,username,profileIdentity:uid,assertCurrent(){},onLocalAdmission:(value:ConnectedAssetLocalAdmission)=>{admission=value;}});
  const original=admission.original as Record<string,any>,sourceDigest=prepared.reference.artifactSha256;
  expect(original.originalCreator).toMatchObject({userId:uid,username});expect(original.ownershipKind).toBe('creator');
  expect(original.importedSource.ownerReceizId).toBe(ownerReceizId);
  const media=original.media,mediaBefore=media===null?null:structuredClone(media);
  if(kind==='protected')expect(media.originalDownloadSha256Hex).not.toBe(sourceDigest);
  const raw={id:`profile:${username}:${original.id}`,receizId:original.id,title:base.title,ownerUsername:username,ownerUserId:uid,profileOriginal:original};
  const parsed=parsePublicMarket({ok:true,transport:{publicOriginals:[raw]}}).items[0];
  expect(parsed.originalDigest).toBe(sourceDigest);
  expect(parsed.originalUrl).toBe(safeImportedSourceUrl('/api/profile/showcase/imported-source?'+new URLSearchParams({reference:JSON.stringify(prepared.reference)}),'artifact'));
  expect(()=>adoption.retainAssetPublicationAdmission(admission,owner)).not.toThrow();
  const retained=adoption.admittedAssetPublicationItem(sourceDigest,username,uid)!;
  expect(retained).toMatchObject({originalDigest:sourceDigest,originalUrl:parsed.originalUrl,originalCreator:{userId:uid,username},sourceProvenance:{sourceArtifactSha256:sourceDigest},admittedOwnerUserId:uid});
  expect(original.media).toEqual(mediaBefore);
  expect(adoption.admittedAssetPublicationItem(sourceDigest,username,'different-account')).toBeNull();
  const saved=storage.get('bankeiz-admitted-public-assets-v1')!;
  const row=JSON.parse(saved)[0].row.profileOriginal;
  expect(row.importedSource).toEqual(original.importedSource);expect(row.originalCreator).toEqual(original.originalCreator);expect(row.ownershipKind).toBe('creator');expect(row.ownershipRole).toBe('creator');expect(row.media).toEqual(mediaBefore);
  adoption.forgetAssetPublicationAdmissions();storage.set('bankeiz-admitted-public-assets-v1',saved);vi.resetModules();
  const cold=await import('../src/receiz/asset-publication-adoption');
  expect(cold.admittedAssetPublicationItem(sourceDigest,username,uid)).toMatchObject({originalDigest:sourceDigest,originalCreator:{userId:uid,username},admittedOwnerUserId:uid});
  cold.forgetAssetPublicationAdmissions();
  const wrongReference={...prepared.reference,bytes:{...prepared.reference.bytes,sha256:'e'.repeat(64)}};
  expect(()=>adoption.retainAssetPublicationAdmission({...admission,sourceReference:wrongReference},owner)).not.toThrow();
  expect(adoption.admittedAssetPublicationItem(sourceDigest,username,uid)).toBeNull();
  expect(()=>adoption.retainAssetPublicationAdmission({...admission,sourceReference:{...prepared.reference,artifactSha256:'e'.repeat(64)}},owner)).not.toThrow();
  expect(adoption.admittedAssetPublicationItem('e'.repeat(64),username,uid)).toBeNull();
  await expect(r.connectedComposer.admitConnectedComposerSource({file:prepared.artifact,ownerReceizId:'foreign.receiz.id',username,profileIdentity:uid,assertCurrent(){}})).rejects.toThrow('SOURCE_OWNER_MISMATCH');
  adoption.forgetAssetPublicationAdmissions();
 }
},30000);

it('does not substitute media authority when an explicitly carried Source reference is malformed',()=>{
 const digest='a'.repeat(64),row={id:'profile:bjklock:source',receizId:'source',title:'Held Original',ownerUsername:username,profileOriginal:{media:{originalDownloadSha256Hex:digest,originalDownloadSrc:'/api/profile/originals/download?receizId=source&kind=original'}}};
 for(const importedSource of [{reference:{schema:'forged',artifactSha256:'e'.repeat(64)}},{},'forged']){
  const parsed=parsePublicMarket({ok:true,transport:{publicOriginals:[{...row,profileOriginal:{...row.profileOriginal,importedSource}}]}}).items[0];
  expect(parsed.originalDigest).toBeNull();expect(parsed.originalUrl).toBeNull();
 }
});
