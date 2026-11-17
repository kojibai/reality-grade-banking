import {afterEach,beforeAll,expect,it,vi} from 'vitest';
import {IDBFactory} from 'fake-indexeddb';
import {conformanceOfflineFixture} from './helpers/conformance-offline-sealer';

import {createAssetPublication,readPendingAssetPublicationDigests,type AssetPublicationState} from '../src/receiz/asset-publication';

const deferred=()=>{let resolve!:()=>void;const promise=new Promise<void>(done=>{resolve=done;});return{promise,resolve};};
let f:Awaited<ReturnType<typeof conformanceOfflineFixture>>;
// Build and enroll the real cryptographic fixture before timing publication.
// Keep every custody/admission guard. Publication ordering is asserted below;
// real proof work has a bounded allowance for shared CI runners.
beforeAll(async()=>{f=await conformanceOfflineFixture({composer:true});});
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});

it('delivers exact known protected Source without requiring a subordinate private-copy completion acknowledgment',async()=>{
 const started=performance.now(),phase=(name:string)=>{if(process.env.CI)process.stderr.write(`[private publication] ${name} (${Math.round(performance.now()-started)}ms)\n`);};
 phase('verifying identity');
 const r=f.runtime;
 vi.stubGlobal('indexedDB',new IDBFactory());
 const values=new Map<string,string>(),events=new EventTarget();
 const storage={getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>values.set(key,value),removeItem:(key:string)=>values.delete(key),key:(index:number)=>[...values.keys()][index]??null,get length(){return values.size;}};
 vi.stubGlobal('window',{localStorage:storage,sessionStorage:storage,location:{origin:'https://bankeiz.test',pathname:'/',href:'https://bankeiz.test/'},setTimeout,clearTimeout,dispatchEvent:events.dispatchEvent.bind(events),addEventListener:events.addEventListener.bind(events),removeEventListener:events.removeEventListener.bind(events)});
 vi.stubGlobal('document',{visibilityState:'visible',addEventListener:events.addEventListener.bind(events),removeEventListener:events.removeEventListener.bind(events)});
 const actor=await r.createReceizArtifactAdmissionEngine()(await r.verifyReceizArtifact(new File([new Uint8Array(f.identity.bytes)],'identity.png')),{profile:'identity',identityPassphrase:f.identity.phrase});
 const owner=(await r.readReceizIdentityPublicBinding(actor)).artifactOwnerReceizId,username='private_overlap',uid='13c41d48-d844-414f-9f72-efae2db63325',artifactId=`profile-showcase:${owner}`;
 const seal=await r.createBankNativeNoteSealer({enrollment:await f.store.load(),resources:f.resources});
 const publicBlocks=new Map<string,Uint8Array>(),privateBlocks=new Map<string,Uint8Array>(),staged=new Map<string,Uint8Array>();
 const roots=new Map(f.roots.map((root:{kid:string})=>[root.kid,root]));
 const receiver=r.createAcceptedPublicationReceiver(r,artifactId,roots,async(ref:{sha256:string})=>publicBlocks.get(ref.sha256)??null).admit;
 const scopeStarted=deferred(),releaseScope=deferred(),privateStarted=deferred(),completeStarted=deferred(),releasePrivate=deferred();
 let initializations=0,completions=0,scopeReads=0,finalizations=0,failPrivate=false,accepted:unknown={status:'unmigrated'};
 let exactPrivate=new Uint8Array(),admissions=0,publicInitializations=0;
 const request:typeof fetch=async(input,init)=>{
  const url=new URL(String(input),'https://bankeiz.test');
  if(url.pathname==='/api/profile/showcase/accepted-source'){scopeReads++;scopeStarted.resolve();await releaseScope.promise;return Response.json(accepted);}
  if(url.pathname==='/api/profile/originals/upload-signed'){
   const body=JSON.parse(String(init?.body)),path=`originals/${uid}/${body.sha256Hex}.png`;
   const response={ok:true,provider:'crystal',upload:{name:body.filename,path,sha256Hex:body.sha256Hex,size:body.size,mime:body.mime,storage:{bucket:'receiz-profile-originals-private',path},stagingObjectName:'private-stage',signedUrl:'https://private.test/sealed-original.png'}};
   if(body.action==='complete'){completions++;completeStarted.resolve();await releasePrivate.promise;if(failPrivate)return Response.json({ok:false},{status:503});return Response.json(response);}
   initializations++;privateStarted.resolve();return Response.json(response);
  }
  if(url.origin==='https://private.test'){expect(new Uint8Array(await new Response(init?.body).arrayBuffer())).toEqual(exactPrivate);return new Response(null,{status:200});}
  if(url.origin==='https://storage.test'){staged.set(url.pathname.slice(1),new Uint8Array(await new Response(init?.body).arrayBuffer()));return new Response(null,{status:200});}
  if(url.pathname===`/api/profile/${username}/originals`)return Response.json({ok:true,originals:[],page:{hasMore:false,nextCursor:null}});
  if(url.pathname!=='/api/profile/showcase/publication')throw Error('UNRELATED_REQUEST');
  const body=JSON.parse(String(init?.body));
  if(body.action==='initialize-blocks')publicInitializations++;
  if(body.action==='initialize-blocks')return Response.json({status:'uploads',scope:body.scope,uploads:body.references.map((reference:{sha256:string})=>({reference,alreadyStored:publicBlocks.has(reference.sha256),signedUrl:`https://storage.test/${reference.sha256}`,stagingObjectName:reference.sha256}))});
  if(body.action==='commit-blocks'){for(const item of body.blocks)publicBlocks.set(item.reference.sha256,staged.get(item.stagingObjectName)!);return Response.json({status:'stored',scope:body.scope});}
  expect(body.action).toBe('finalize');finalizations++;
  const next=await receiver(body.transport);
  accepted={status:'accepted',artifactId,transport:body.transport,binding:{schema:'receiz.profile-showcase.route-migration-binding.v1',status:'accepted',username,profileIdentity:uid,proofIdentity:owner,locator:{tenantId:'receiz.com',showcaseArtifactId:artifactId,acceptedArtifactDigest:body.transport.artifactDigest,acceptedImmutableObjectVersion:body.transport.artifactDigest,projectionVersion:2}}};
  return Response.json({status:'published',publicationVersion:2,scope:body.scope,artifactDigest:body.transport.artifactDigest,operationCount:next.admission.proofHistoryHead.nodeCount,visibleChildCount:next.visibleChildren.length});
 };
 vi.stubGlobal('fetch',request);
 const runtime=await r.connectedComposer.createConnectedAssetPublicationRuntime({identity:new Uint8Array(f.identity.bytes),passphrase:f.identity.phrase,account:{uid,username},assertCurrent(){},fetchImpl:request,sealDocument:seal,onLocalAdmission:()=>{admissions++;},
  writeProtectedBlock:async(ref:{sha256:string},bytes:Uint8Array)=>{privateBlocks.set(ref.sha256,bytes.slice());},resolveProtectedBlock:async(ref:{sha256:string})=>privateBlocks.get(ref.sha256)??null});
 const image=new File([Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jQmcAAAAASUVORK5CYII=','base64')],'preview.png',{type:'image/png'});
 const png=new Uint8Array(await image.arrayBuffer()),data=new TextEncoder().encode('FixturePadding\0'+'x'.repeat(3_100_000)),chunk=new Uint8Array(data.length+12),view=new DataView(chunk.buffer);view.setUint32(0,data.length);chunk.set(new TextEncoder().encode('tEXt'),4);chunk.set(data,8);
 let crc=0xffffffff;for(const byte of chunk.subarray(4,-4)){crc^=byte;for(let n=0;n<8;n++)crc=crc&1?0xedb88320^(crc>>>1):crc>>>1;}view.setUint32(chunk.length-4,(crc^0xffffffff)>>>0);
 const padded=new Uint8Array(png.length+chunk.length);padded.set(png.subarray(0,-12));padded.set(chunk,png.length-12);padded.set(png.subarray(-12),png.length-12+chunk.length);
 const native=await seal({fileBytes:padded,filename:'original.png',mime:'image/png',options:{forceBundleEnvelope:false}});
 exactPrivate=new Uint8Array(native.artifactBytes);
 const privateFile=new File([exactPrivate],native.downloadName,{type:'image/png'});
 const draft={kind:'image',title:'Private exact Original',description:'',longForm:'',files:[{id:'cover',role:'cover',file:image}],protectedOriginal:{profileIdentity:uid,file:privateFile},collection:{allowOriginalDownload:true,allowDerivativeDownload:false,allowMomentRecordDownload:false,gateAudioPlayback:false,originalDownloadLimit:1000,derivativeDownloadLimit:null,originalDownloadPriceCents:1000,derivativeDownloadPriceCents:null}};

 releaseScope.resolve();
 const baseline=await runtime.prepare({kind:'image',title:'Already accepted predecessor',description:'',longForm:'The complete selected Source is held before this protected Original.',files:[{id:'primary',role:'primary',file:image}]});
 expect((await runtime.publish(baseline.artifact)).status).toBe('published');
 const before={publicInitializations,finalizations,admissions,scopeReads};
 const prepared=await runtime.prepare(draft),exactSource=new Uint8Array(await prepared.artifact.arrayBuffer());
 const source=await r.openImportedProofSource(prepared.artifact,{resolveSourceBlock:r.createImportedProofSourceCustody().resolveBlock});
 expect(source.projection.ownerReceizId).toBe(owner);expect(source.projection.bankAsset.composer.protectedOriginal.profileIdentity).toBe(uid);
 expect(source.projection.bankAsset.composer.collection).toMatchObject({originalDownloadLimit:1000,originalDownloadPriceCents:1000});
 expect(source.composerResources?.['protected-original']).toBeUndefined();expect(privateBlocks.size).toBeGreaterThan(0);
 let checkpoint:AssetPublicationState|null=null,checkpointTail=Promise.resolve();
 const saved=()=>checkpoint as AssetPublicationState|null;
 const controller=(selected=prepared,module=r,publisher=runtime)=>{
  let privateJob:Promise<void>|undefined;
  const intent={composer:selected.content};
  return createAssetPublication({ownerReceizId:owner,assertOpen(){},lock:async run=>{const previous=checkpointTail;let done!:()=>void;checkpointTail=new Promise<void>(resolve=>{done=resolve;});await previous;try{return await run();}finally{done();}},read:async()=>checkpoint,write:async(next,previous)=>{expect(checkpoint).toEqual(previous);checkpoint=structuredClone(next);},
   seal:async()=>selected.artifact,retain:async()=>selected.reference.artifactSha256,
   restore:async digest=>{expect(digest).toBe(selected.reference.artifactSha256);return new File([await selected.artifact.arrayBuffer()],selected.artifact.name,{type:selected.artifact.type});},readIntent:async()=>intent,
   privateOriginalDelivery:async file=>{
    const opened=await module.connectedComposer.admitConnectedComposerSource({file,ownerReceizId:owner,username,profileIdentity:uid,assertCurrent(){}});
    if(!opened.source.projection.bankAsset?.composer?.protectedOriginal)return null;
    return()=>privateJob??=publisher.deliverPrivateOriginal(file);
   },publish:file=>publisher.publish(file)});
 };
 failPrivate=true;
 const api=controller(),attempt=api.create({composer:prepared.content});
 await completeStarted.promise;
 // Withhold only completion after the exact private PUT, while the actual
 // receiver admits this same complete public Source through its ordinary path.
 const result=await attempt;
 expect(result.publication.status).toBe('published');
 expect(checkpoint).toMatchObject({sourceDigest:prepared.reference.artifactSha256,status:'published',privateOriginalDeliveryPending:true,receipt:{status:'published'}});
 expect(finalizations).toBe(before.finalizations+1);expect(initializations).toBe(1);
 releasePrivate.resolve();await expect(api.resumePrivateOriginalDelivery(result.digest)).rejects.toThrow('COMPOSER_PRIVATE_ORIGINAL_CUSTODY_PENDING');
 expect(checkpoint).toMatchObject({status:'published',privateOriginalDeliveryPending:true});
 expect(new Uint8Array(await prepared.artifact.arrayBuffer())).toEqual(exactSource);
 expect(exactPrivate.length).toBeGreaterThan(3_100_000);
 expect(privateBlocks.has(prepared.content.protectedOriginal.file.bytes.sha256)).toBe(true);
 expect([...privateBlocks.keys()].some(key=>publicBlocks.has(key))).toBe(false);
 const ordinary=await runtime.prepare({kind:'image',title:'A later Original',description:'',longForm:'The prior protected Source remains exact.',files:[{id:'primary',role:'primary',file:image}]});
 expect((await controller(ordinary).create({composer:ordinary.content})).publication.status).toBe('published');
 expect(saved()?.pendingSources).toMatchObject([{sourceDigest:result.digest,status:'published',privateOriginalDeliveryPending:true}]);
 expect(readPendingAssetPublicationDigests(checkpoint,owner)).toEqual([result.digest]);
 // A new bundled module loses every File/private-upload promise memo. Exact
 // public custody, owner-only block custody and compact checkpoint survive.
 const cold=await f.reloadRuntime();
 const reopened=await cold.connectedComposer.createConnectedAssetPublicationRuntime({identity:new Uint8Array(f.identity.bytes),passphrase:f.identity.phrase,account:{uid,username},assertCurrent(){},fetchImpl:request,sealDocument:async()=>{throw Error('PRIVATE_RECOVERY_RESEAL_FORBIDDEN');},resolveProtectedBlock:async(ref:{sha256:string})=>privateBlocks.get(ref.sha256)??null});
 const prior={scopeReads,finalizations,publicInitializations},receipt=checkpoint!.receipt;
 failPrivate=false;await controller(prepared,cold,reopened).resumePrivateOriginalDelivery(result.digest);
 expect({scopeReads,finalizations,publicInitializations}).toEqual(prior);
 expect(saved()?.sourceDigest).toBe(ordinary.reference.artifactSha256);expect(saved()?.receipt).toEqual(receipt);expect(saved()?.pendingSources).toBeUndefined();
 expect(initializations).toBe(2);expect(completions).toBe(2);
 expect(new Uint8Array(await prepared.artifact.arrayBuffer())).toEqual(exactSource);
 expect([...privateBlocks.keys()].some(key=>publicBlocks.has(key))).toBe(false);

},30_000);
