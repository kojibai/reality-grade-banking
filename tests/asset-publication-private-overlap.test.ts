import {afterEach,beforeAll,expect,it,vi} from 'vitest';
import {IDBFactory} from 'fake-indexeddb';
import {conformanceOfflineFixture} from './helpers/conformance-offline-sealer';

const deferred=()=>{let resolve!:()=>void;const promise=new Promise<void>(done=>{resolve=done;});return{promise,resolve};};
let f:Awaited<ReturnType<typeof conformanceOfflineFixture>>;
// Build and enroll the real cryptographic fixture before timing publication.
// Keep every custody/admission guard. Publication ordering is asserted below;
// real proof work has a bounded allowance for shared CI runners.
beforeAll(async()=>{f=await conformanceOfflineFixture({composer:true});});
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});

it('overlaps exact private retention with predecessor scope, deduplicates it, and never accepts before private completion',async()=>{
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
 let initializations=0,completions=0,scopeReads=0,finalizations=0,failPrivate=true,accepted:unknown={status:'unmigrated'};
 let exactPrivate=new Uint8Array();
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
  if(body.action==='initialize-blocks')return Response.json({status:'uploads',scope:body.scope,uploads:body.references.map((reference:{sha256:string})=>({reference,alreadyStored:publicBlocks.has(reference.sha256),signedUrl:`https://storage.test/${reference.sha256}`,stagingObjectName:reference.sha256}))});
  if(body.action==='commit-blocks'){for(const item of body.blocks)publicBlocks.set(item.reference.sha256,staged.get(item.stagingObjectName)!);return Response.json({status:'stored',scope:body.scope});}
  expect(body.action).toBe('finalize');expect(failPrivate).toBe(false);expect(completions).toBeGreaterThan(0);finalizations++;
  const next=await receiver(body.transport);
  accepted={status:'accepted',artifactId,transport:body.transport,binding:{schema:'receiz.profile-showcase.route-migration-binding.v1',status:'accepted',username,profileIdentity:uid,proofIdentity:owner,locator:{tenantId:'receiz.com',showcaseArtifactId:artifactId,acceptedArtifactDigest:body.transport.artifactDigest,acceptedImmutableObjectVersion:body.transport.artifactDigest,projectionVersion:2}}};
  return Response.json({status:'published',publicationVersion:2,scope:body.scope,artifactDigest:body.transport.artifactDigest,operationCount:next.admission.proofHistoryHead.nodeCount,visibleChildCount:next.visibleChildren.length});
 };
 vi.stubGlobal('fetch',request);
 const runtime=await r.connectedComposer.createConnectedAssetPublicationRuntime({identity:new Uint8Array(f.identity.bytes),passphrase:f.identity.phrase,account:{uid,username},assertCurrent(){},fetchImpl:request,sealDocument:seal,
  writeProtectedBlock:async(ref:{sha256:string},bytes:Uint8Array)=>{privateBlocks.set(ref.sha256,bytes.slice());},resolveProtectedBlock:async(ref:{sha256:string})=>privateBlocks.get(ref.sha256)??null});
 const image=new File([Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jQmcAAAAASUVORK5CYII=','base64')],'preview.png',{type:'image/png'});
 const native=await seal({fileBytes:new Uint8Array(await image.arrayBuffer()),filename:'original.png',mime:'image/png',options:{forceBundleEnvelope:false}});
 exactPrivate=new Uint8Array(native.artifactBytes);
 const privateFile=new File([exactPrivate],native.downloadName,{type:'image/png'});
 const draft={kind:'image',title:'Private exact Original',description:'',longForm:'',files:[{id:'cover',role:'cover',file:image}],protectedOriginal:{profileIdentity:uid,file:privateFile},collection:{allowOriginalDownload:true,allowDerivativeDownload:false,allowMomentRecordDownload:false,gateAudioPlayback:false,originalDownloadLimit:2,derivativeDownloadLimit:null,originalDownloadPriceCents:100,derivativeDownloadPriceCents:null}};
 const prepared=await runtime.prepare(draft);
 phase('protected publication prepared');
 expect(initializations).toBe(0);expect(scopeReads).toBe(0);
 const first:Promise<{value:unknown}|{error:Error}>=runtime.publish(prepared.artifact).then((value:unknown)=>({value}),(error:Error)=>({error}));
 const reached=async(signal:ReturnType<typeof deferred>,stage:string)=>Promise.race([signal.promise,first.then(outcome=>{throw Error(`PUBLICATION_FINISHED_BEFORE_${stage}${'error'in outcome?': '+outcome.error.message:''}`);})]);
 try{
  await reached(scopeStarted,'PREDECESSOR_SCOPE');await new Promise<void>(resolve=>setImmediate(resolve));
  expect(initializations,'private upload must already run while accepted scope is stalled').toBe(1);
  await reached(privateStarted,'PRIVATE_UPLOAD');await reached(completeStarted,'PRIVATE_COMPLETION');
  phase('private retention overlaps predecessor scope');
  const second=runtime.publish(prepared.artifact).then((value:unknown)=>({value}),(error:Error)=>({error}));
  releaseScope.resolve();await new Promise<void>(resolve=>setImmediate(resolve));
  expect(finalizations).toBe(0);expect(initializations).toBe(1);expect(scopeReads).toBe(1);
  releasePrivate.resolve();
  for(const outcome of [await first,await second]){expect('error'in outcome).toBe(true);if('error'in outcome)expect(outcome.error.message).toContain('COMPOSER_PRIVATE_ORIGINAL_CUSTODY_PENDING');}
  expect(finalizations).toBe(0);expect(completions).toBe(1);
  phase('private failure preserved');
 }finally{releaseScope.resolve();releasePrivate.resolve();await first;}
 failPrivate=false;
 expect((await runtime.publish(prepared.artifact)).status).toBe('published');expect(initializations).toBe(2);expect(completions).toBe(2);
 phase('exact retry accepted');
 expect((await runtime.publish(prepared.artifact)).status).toBe('published');expect(initializations).toBe(2);
 const before=initializations;
 const ordinary=await runtime.prepare({kind:'image',title:'Ordinary public Original',description:'',longForm:'',files:[{id:'primary',role:'primary',file:image}]});
 expect((await runtime.publish(ordinary.artifact)).status).toBe('published');expect(initializations).toBe(before);
 phase('ordinary publication accepted');
},30_000);
