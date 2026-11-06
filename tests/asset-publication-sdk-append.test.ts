import {afterEach,expect,it,vi} from 'vitest';
import {IDBFactory,IDBObjectStore} from 'fake-indexeddb';
import {conformanceOfflineFixture} from './helpers/conformance-offline-sealer';

afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});

it('publishes through the installed SDK for fresh and nonempty accounts, retaining old media without fetching it on append or retry',async()=>{
 const f=await conformanceOfflineFixture({composer:true,previousComposer:true}),r=f.runtime;
 vi.stubGlobal('indexedDB',new IDBFactory());
 const values=new Map<string,string>(),events=new EventTarget();
 let rejectOutboxWrite=false;
 const storage={getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>{if(rejectOutboxWrite&&key==='receiz.local.signed-action-outbox.v1')throw Error('Quota exceeded');values.set(key,value);},removeItem:(key:string)=>{values.delete(key);},key:(i:number)=>[...values.keys()][i]??null,get length(){return values.size;}};
 vi.stubGlobal('window',{localStorage:storage,sessionStorage:storage,location:{origin:'https://bankeiz.test',pathname:'/',href:'https://bankeiz.test/'},setTimeout,clearTimeout,dispatchEvent:events.dispatchEvent.bind(events),addEventListener:events.addEventListener.bind(events),removeEventListener:events.removeEventListener.bind(events)});
 vi.stubGlobal('document',{visibilityState:'visible',addEventListener:events.addEventListener.bind(events),removeEventListener:events.removeEventListener.bind(events)});
 const identity=new File([new Uint8Array(f.identity.bytes)],'identity.png');
 const actor=await r.createReceizArtifactAdmissionEngine()(await r.verifyReceizArtifact(identity),{profile:'identity',identityPassphrase:f.identity.phrase});
 const owner=(await r.readReceizIdentityPublicBinding(actor)).artifactOwnerReceizId,username='sdk_artist',uid='sdk-account',artifactId=`profile-showcase:${owner}`;
 const enrollment=await f.store.load(),seal=await r.createBankNativeNoteSealer({enrollment,resources:f.resources});
 const blocks=new Map<string,Uint8Array>(),staged=new Map<string,Uint8Array>(),reads:string[]=[],timeline:string[]=[];
 let accepted:Record<string,unknown>={status:'unmigrated'},acceptedHead:any,finalizations=0,seals=0,finalHTTPStatus=0,interrupt=false,attemptDigest:string|undefined,active=true,switchOnUpload=false,interruptBeforeUpload=false;
 const roots=new Map(f.roots.map((root:{kid:string})=>[root.kid,root]));
 const receiverStorage=new IDBFactory(),receiverOptions={indexedDB:receiverStorage,databaseName:'retained-publication-receiver'};
 const forbiddenReceiverBlocks=new Set<string>();let auditReceiverReads=false,receiverAudits=0;
 const receiverBlock=async(ref:{sha256:string})=>{if(auditReceiverReads&&forbiddenReceiverBlocks.has(ref.sha256))throw Error('RECEIVER_REOPENED_SETTLED_BODY');return blocks.get(ref.sha256)??null;};
 let receiveActual=r.createAcceptedPublicationReceiver(r,artifactId,roots,receiverBlock,receiverOptions).admit;
 const request:typeof fetch=async(input,init)=>{
  const url=new URL(String(input),'https://bankeiz.test');
  if(url.origin==='https://storage.test'){staged.set(url.pathname.slice(1),new Uint8Array(await new Response(init?.body).arrayBuffer()));if(switchOnUpload){switchOnUpload=false;active=false;}return new Response(null,{status:200});}
  if(url.pathname==='/api/profile/showcase/accepted-source'){
   const block=url.searchParams.get('block');if(!block)return Response.json(accepted);
   const ref=JSON.parse(block);reads.push(ref.sha256);const bytes=blocks.get(ref.sha256);return new Response(bytes?.slice(),{status:bytes?200:404});
  }
  if(url.pathname===`/api/profile/${username}/originals`)return Response.json({ok:true,originals:[],page:{hasMore:false,nextCursor:null}});
  if(url.pathname!=='/api/profile/showcase/publication')return Response.json({status:'pending',code:'FIXTURE_UNRELATED_SYNC'});
  const body=JSON.parse(String(init?.body));
  if(body.action==='initialize-blocks'&&interruptBeforeUpload)return Response.json({status:'pending',code:'PROFILE_SHOWCASE_PUBLICATION_BLOCK_UPLOAD_FAILED'});
  if(body.action==='initialize-blocks')return Response.json({status:'uploads',scope:body.scope,uploads:body.references.map((reference:{sha256:string})=>({reference,alreadyStored:blocks.has(reference.sha256),signedUrl:`https://storage.test/${reference.sha256}`,stagingObjectName:reference.sha256}))});
  if(body.action==='commit-blocks'){for(const item of body.blocks){const bytes=staged.get(item.stagingObjectName);if(!bytes)throw Error('Missing staged bytes');blocks.set(item.reference.sha256,bytes);}return Response.json({status:'stored',scope:body.scope});}
  expect(body.action).toBe('finalize');finalizations++;timeline.push('finalize');
  if(finalHTTPStatus)return Response.json({error:'access_denied'},{status:finalHTTPStatus});
  let received;
  if(auditReceiverReads){
   const oldChildren=new Set(acceptedHead.visibleChildren.map((child:any)=>child.reference.childArtifactDigest)),oldReads:unknown[]=[],scans:string[]=[];
   const get=IDBObjectStore.prototype.get,all=IDBObjectStore.prototype.getAll;
   IDBObjectStore.prototype.get=function(key){if(this.transaction.db.name===receiverOptions.databaseName&&this.name==='bounded-immutable-children'&&oldChildren.has(key))oldReads.push(key);return get.call(this,key);};
   IDBObjectStore.prototype.getAll=function(...args){if(this.transaction.db.name===receiverOptions.databaseName&&['bounded-immutable-heads','bounded-immutable-history-nodes','segments'].includes(this.name))scans.push(this.name);return all.apply(this,args);};
   try{received=await receiveActual(body.transport);}finally{IDBObjectStore.prototype.get=get;IDBObjectStore.prototype.getAll=all;}
   expect(oldReads,'receiver admission reuses settled Original custody').toEqual([]);expect(scans,'receiver admission follows its exact retained SDK predecessor').toEqual([]);receiverAudits++;
  }else received=await receiveActual(body.transport);
  const {admission:admitted,sparse}=received;
  if(body.publicationSourceArtifactSha256)expect(sparse,'the actual incremental SDK publisher carries only its changed successor').toBe(true);
  expect(admitted.artifactSha256).toBe(body.transport.artifactDigest);
  if(interrupt){attemptDigest=body.transport.artifactDigest;return Response.json({status:'pending',code:'PROFILE_SHOWCASE_PUBLIC_DELIVERY_PENDING'});}
  if(attemptDigest)expect(body.transport.artifactDigest).toBe(attemptDigest);
  acceptedHead=received;
  accepted={status:'accepted',artifactId,transport:body.transport,binding:{schema:'receiz.profile-showcase.route-migration-binding.v1',status:'accepted',username,profileIdentity:uid,proofIdentity:owner,locator:{tenantId:'receiz.com',showcaseArtifactId:artifactId,acceptedArtifactDigest:body.transport.artifactDigest,acceptedImmutableObjectVersion:body.transport.artifactDigest,projectionVersion:2}}};
  return Response.json({status:'published',publicationVersion:2,scope:body.scope,artifactDigest:body.transport.artifactDigest,operationCount:admitted.proofHistoryHead.nodeCount,visibleChildCount:received.visibleChildren.length});
 };
 vi.stubGlobal('fetch',request);
 const open=(previous=false,module=r)=>(previous?module.previousConnectedComposer:module.connectedComposer).createConnectedAssetPublicationRuntime({identity:new Uint8Array(f.identity.bytes),passphrase:f.identity.phrase,account:{uid,username},assertCurrent(){if(!active)throw Error('ACCOUNT_CLOSED');},fetchImpl:request,onLocalAdmission:(value:any)=>{expect(value.original.marketPreview?.quote?.priceUsd??value.original.marketPreview).toBeDefined();timeline.push('local');},sealDocument:async(args:any)=>{seals++;return seal(args);}});
 const image=new File([Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jQmcAAAAASUVORK5CYII=','base64')],'original.png',{type:'image/png'});
 let runtime=await open();
 const prior=await runtime.prepare({kind:'image',title:'First exact image',description:'',longForm:'First full essay',files:[{id:'photo',role:'primary',file:image}]});
 const firstResult=await runtime.publish(prior.artifact);expect(firstResult.status,JSON.stringify(firstResult)).toBe('published');
 expect(timeline.indexOf('local')).toBeLessThan(timeline.indexOf('finalize'));
 const acceptedPriorHead=acceptedHead.admission.artifactSha256;
 const priorChildren=acceptedHead.visibleChildren.map((child:any)=>child.reference.childArtifactDigest),oldBodies=new Set<string>();
 for(const child of (await acceptedHead.readCompleteSource()).children)for(const [sha,bytes]of blocks)if(Buffer.from(bytes).equals(Buffer.from(child.exactSealedArtifactBytes)))oldBodies.add(sha);
 const oldMedia=r.createImportedProofSourceCustody();await oldMedia.exportBlocks(prior.reference,async(ref:{sha256:string})=>{oldBodies.add(ref.sha256);});
 for(const digest of oldBodies)forbiddenReceiverBlocks.add(digest);auditReceiverReads=true;
 // Cold app: only exact accepted transport is remote; no prior child/media is held locally.
 vi.stubGlobal('indexedDB',new IDBFactory());runtime=await open();reads.length=0;timeline.length=0;
 const next=await runtime.prepare({kind:'image',title:'Next exact image',description:'',longForm:'Next full essay '+'n'.repeat(30*1024),files:[{id:'photo',role:'primary',file:image}]});
 interrupt=true;expect((await runtime.publish(next.artifact)).status).toBe('pending');
 finalHTTPStatus=403;expect(await runtime.publish(next.artifact)).toEqual({status:'pending',code:'PROFILE_SHOWCASE_PUBLICATION_HTTP_403'});finalHTTPStatus=0;
 expect(timeline.indexOf('local')).toBeLessThan(timeline.indexOf('finalize'));
 // Later unrelated/completed transport activity cannot evict an unfinished
 // publication's exact committed association. These copies are storage fixtures,
 // never presented as verified actions or sent to the receiver.
 const outboxKey='receiz.local.signed-action-outbox.v1',container=JSON.parse(values.get(outboxKey)!),outbox=JSON.parse(container.payload);
 const pending:any=Object.values(outbox.entries).find((entry:any)=>entry.status==='pending'&&JSON.parse(entry.envelope.request.bodyReplayText??'{}').publicationSourceArtifactSha256===next.reference.artifactSha256);
 expect(pending).toBeDefined();
 for(let i=0;i<245;i++){const entry=structuredClone(pending),id=i.toString(16).padStart(64,'0');entry.actionId=id;entry.envelope.actionId=id;entry.status='propagated';entry.updatedAtMs=Date.now()+60_000;outbox.entries[id]=entry;}
 container.payload=JSON.stringify(outbox);values.set(outboxKey,JSON.stringify(container));
 r.publicationOutbox.markLocalSignedActionPending({actionId:pending.actionId,error:'retained pending fixture'});
 expect(r.publicationOutbox.readLocalSignedActionOutbox().entries[pending.actionId]).toBeDefined();
 const before={seals,reads:reads.length};interrupt=false;
 // A fresh runtime replays the durable signed append instead of constructing another one.
 const localReads:unknown[]=[],readObject=IDBObjectStore.prototype.get;
 const readSpy=vi.spyOn(IDBObjectStore.prototype,'get').mockImplementation(function(this:IDBObjectStore,key){if(this.name==='segments')localReads.push(key);return readObject.call(this,key);});
 runtime=await open();expect((await runtime.publish(next.artifact)).status).toBe('published');
 readSpy.mockRestore();
 expect(localReads.some(key=>JSON.stringify(key).includes(acceptedPriorHead)),'replaying the same committed append must not reopen an accepted historical head, even from local custody').toBe(false);
 expect(seals).toBe(before.seals);expect(reads).toHaveLength(before.reads);
 expect(reads.some(sha=>oldBodies.has(sha))).toBe(false);
 expect(acceptedHead.visibleChildren).toHaveLength(priorChildren.length+1);
 for(const digest of priorChildren)expect(acceptedHead.visibleChildren.some((child:any)=>child.reference.childArtifactDigest===digest)).toBe(true);
 const again={seals,finalizations,reads:reads.length};expect((await runtime.publish(next.artifact)).status).toBe('published');expect({seals,finalizations,reads:reads.length}).toEqual(again);
 // The receiver also restarts with no module memo. Its durable admitted proof
 // survives independently of the app's device store and complete-source audits.
 const receiverModule=await f.reloadRuntime();receiveActual=receiverModule.createAcceptedPublicationReceiver(receiverModule,artifactId,roots,receiverBlock,receiverOptions).admit;
 for(const title of ['Third exact image','Fourth exact image']){
  attemptDigest=undefined;const beforeReads=reads.length;
  const prepared=await runtime.prepare({kind:'image',title,description:'',longForm:'Complete carried essay',files:[{id:'photo',role:'primary',file:image}]});
  expect((await runtime.publish(prepared.artifact)).status).toBe('published');expect(reads).toHaveLength(beforeReads);
 }
 auditReceiverReads=false;expect(receiverAudits).toBeGreaterThanOrEqual(4);
 expect(acceptedHead.visibleChildren).toHaveLength(priorChildren.length+3);
 const other=await open();
 const fromOther=await other.prepare({kind:'image',title:'Another tab',description:'',longForm:'Same admitted account',files:[{id:'photo',role:'primary',file:image}]});
 expect((await other.publish(fromOther.artifact)).status).toBe('published');
 const afterOther=await runtime.prepare({kind:'image',title:'Continue from warm tab',description:'',longForm:'Preserve the intervening append',files:[{id:'photo',role:'primary',file:image}]});
 expect((await runtime.publish(afterOther.artifact)).status).toBe('published');expect(acceptedHead.visibleChildren).toHaveLength(priorChildren.length+5);
 const switched=await runtime.prepare({kind:'image',title:'Account switch during upload',description:'',longForm:'Never publish from a closed account',files:[{id:'photo',role:'primary',file:image}]});
 const beforeSwitch=finalizations;switchOnUpload=true;
 await expect(runtime.publish(switched.artifact)).rejects.toThrow('ACCOUNT_CLOSED');expect(finalizations).toBe(beforeSwitch);
 active=true;attemptDigest=undefined;runtime=await open();expect((await runtime.publish(switched.artifact)).status).toBe('published');
 const quota=await runtime.prepare({kind:'image',title:'Retain before commit',description:'',longForm:'A full device must preserve retry',files:[{id:'photo',role:'primary',file:image}]});
 const beforeQuota=finalizations;rejectOutboxWrite=true;
 await expect(runtime.publish(quota.artifact)).rejects.toThrow('PROFILE_SHOWCASE_PUBLICATION_ACTION_NOT_RETAINED');expect(finalizations).toBe(beforeQuota);
 rejectOutboxWrite=false;runtime=await open();expect((await runtime.publish(quota.artifact)).status).toBe('published');
 // Public source transports omit hidden child bodies while sealed membership
 // retains those members. Reproduce the actual account shape with a real SDK
 // visibility transition before the interrupted append.
 const visibilityVault=r.showcaseVault.createProfileShowcaseBoundedEdgeVault({databaseName:'visibility-fixture'});
 const beforeVisibility=await r.showcaseRetainer.retainAcceptedShowcasePredecessor({source:await acceptedHead.readCompleteSource(),artifactId,vault:visibilityVault,canonicalSignatureV4RootPublicKeys:roots});
 await visibilityVault.selectOwnerRestoreHead(beforeVisibility,null,undefined,undefined,true);
 const commitDomain={scheme:'receiz-commit-domain.v1',value:'fixture-visibility'},visibilityStore=r.showcaseTransitionStore.createReceizBrowserArtifactTransitionStore({databaseName:'visibility-transitions',namespace:'hide',commitDomain});
 await visibilityStore.ensureHead(artifactId,{algorithm:'sha-256',binds:'verified-proof-history',value:beforeVisibility.proofHistoryHead.headDigest});
 const hiddenChild=acceptedHead.visibleChildren[0].reference,authority=await r.showcaseAuthority.createProfileShowcaseVisibilityAuthority({actorAdmission:actor,predecessorAdmission:beforeVisibility,
  child:hiddenChild,visibility:'hidden',keyFile:await r.readReceizIdentityArtifact(identity),passphrase:f.identity.phrase,commitDomain,store:visibilityStore,
  sealer:r.showcaseComposerPublication.createProfileShowcaseNativeTransitionSealer(owner,visibilityVault,seal),
  persistentStateIO:await visibilityVault.createTransitionPersistentStateIO(artifactId,beforeVisibility.artifactSha256),
  resolveVerifiedHistoricalArtifactDigest:(count:number)=>visibilityVault.resolveVerifiedHistoricalArtifactDigest(artifactId,beforeVisibility.artifactSha256,count)});
 const hiddenAdmission=await r.showcaseTransitions.sealCommitAndReadmitBoundedProfileShowcaseTransition({...authority,
  resolveVerifiedHistoricalArtifactDigest:(count:number)=>visibilityVault.resolveVerifiedHistoricalArtifactDigest(artifactId,beforeVisibility.artifactSha256,count)});
 await visibilityVault.admit({showcaseAdmission:hiddenAdmission,children:authority.children,segments:authority.segments});
 const hiddenSource=await visibilityVault.exportCompleteSource(artifactId);
 const hiddenTransport=await r.showcaseTransport.writeProfileShowcaseCompleteSourceTransport(hiddenSource,async(ref:{sha256:string},bytes:Uint8Array)=>{blocks.set(ref.sha256,bytes);},{exportImportedSource:async()=>{}});
 expect((await request('/api/profile/showcase/publication',{method:'POST',body:JSON.stringify({action:'finalize',scope:{publicationVersion:2,ownerReceizId:owner,artifactId,artifactDigest:hiddenSource.artifactDigest,username,profileIdentity:uid},transport:hiddenTransport})})).ok).toBe(true);
 expect(acceptedHead.visibleChildren.some((child:any)=>child.reference.childArtifactDigest===hiddenChild.childArtifactDigest)).toBe(false);
 // Upgrade from the genuine previous publisher after commit but before any
 // finalize action exists. Its SDK commit and exact child remain on-device.
 attemptDigest=undefined;const previous=await open(true);
 const older=await previous.prepare({kind:'image',title:'Previously sealed pending image',description:'',longForm:'The exact essay survives the upgrade',files:[{id:'photo',role:'primary',file:image}]});
 interruptBeforeUpload=true;expect((await previous.publish(older.artifact)).status).toBe('pending');interruptBeforeUpload=false;
 const beforeUpgrade={seals,children:acceptedHead.visibleChildren.length};reads.length=0;
 runtime=await open();expect((await runtime.publish(older.artifact)).status).toBe('published');
 expect(seals).toBe(beforeUpgrade.seals);expect(acceptedHead.visibleChildren).toHaveLength(beforeUpgrade.children+1);
 expect(acceptedHead.visibleChildren.some((child:any)=>child.reference.childArtifactDigest===hiddenChild.childArtifactDigest)).toBe(false);
 expect(reads.some(sha=>oldBodies.has(sha))).toBe(false);
 let failedReads=0;
 const failed=await r.connectedComposer.createConnectedAssetPublicationRuntime({identity:new Uint8Array(f.identity.bytes),passphrase:f.identity.phrase,
  account:{uid:'a-current-account-with-no-cached-placement',username:'service_failure'},assertCurrent(){},sealDocument:seal,
  fetchImpl:async()=>{failedReads++;throw Error('BANK_ASSET_PUBLICATION_SERVICE_UNAVAILABLE');}});
 expect(failedReads).toBe(0);
 await expect(failed.publish(quota.artifact)).rejects.toThrow('BANK_ASSET_PUBLICATION_SERVICE_UNAVAILABLE');
 expect(failedReads).toBe(1);
 // A fresh bundled module has none of the publisher's in-memory SDK context;
 // the exact existing device vault, identity, source bytes and action outbox stay.
 const beforeReload=await open();const lastWarm=await beforeReload.prepare({kind:'image',title:'Last sparse head before reload',description:'',longForm:'The newly coherent successor must survive its publishing module',files:[{id:'photo',role:'primary',file:image}]});expect((await beforeReload.publish(lastWarm.artifact)).status).toBe('published');
 const reloadedModule=await f.reloadRuntime(),reloaded=await open(false,reloadedModule);
 const oldChildDigests=new Set(acceptedHead.visibleChildren.map((child:any)=>child.reference.childArtifactDigest));let coldOldChildReads=0,coldHistoryScans=0,coldActiveWrites=0;const put=IDBObjectStore.prototype.put,get=IDBObjectStore.prototype.get,all=IDBObjectStore.prototype.getAll;
 const coldPut=vi.spyOn(IDBObjectStore.prototype,'put').mockImplementation(function(this:IDBObjectStore,...args){if(this.name==='bounded-active-heads')coldActiveWrites++;return put.apply(this,args);});
 const coldGet=vi.spyOn(IDBObjectStore.prototype,'get').mockImplementation(function(this:IDBObjectStore,key){if(this.name==='bounded-immutable-children'&&oldChildDigests.has(key))coldOldChildReads++;return get.call(this,key);});
 const coldAll=vi.spyOn(IDBObjectStore.prototype,'getAll').mockImplementation(function(this:IDBObjectStore,...args){if(['bounded-immutable-heads','bounded-immutable-history-nodes','segments'].includes(this.name))coldHistoryScans++;return all.apply(this,args);});
 const coldAsset=await reloaded.prepare({kind:'image',title:'After actual module reload',description:'',longForm:'New input after device-held source coherence',files:[{id:'photo',role:'primary',file:image}]});
 try{const coldResult=await reloaded.publish(coldAsset.artifact);expect(coldResult.status,JSON.stringify(coldResult)).toBe('published');}finally{coldGet.mockRestore();coldAll.mockRestore();coldPut.mockRestore();}
 expect(coldActiveWrites,'retaining an accepted SDK proof never selects a partial Source as the active full presentation').toBe(0);
 expect(coldOldChildReads,'a fresh SDK module does not reopen old Original bodies to append one new source').toBe(0);expect(coldHistoryScans,'cold cohere follows retained SDK paths rather than scanning its settled history').toBe(0);
 const proofVault=reloadedModule.showcaseVault.createProfileShowcaseBoundedEdgeVault(),retainedDigest=acceptedHead.admission.artifactSha256;
 const retained=await proofVault.reopenRetainedHead(artifactId,retainedDigest);expect(retained?.artifactSha256).toBe(retainedDigest);
 expect(await proofVault.reopenRetainedHead('wrong-artifact',retainedDigest)).toBeNull();
 await expect(proofVault.createTransitionPersistentStateIO(artifactId,retainedDigest,{...retained})).rejects.toThrow();
 // Stored proof locators are never admission. A new vault must reject exact
 // byte corruption and owner substitution rather than use its small head row.
 const db=await new Promise<IDBDatabase>((resolve,reject)=>{const request=indexedDB.open('receiz-profile-showcase-bounded-edge-v114');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
 const readArtifact=()=>new Promise<any>((resolve,reject)=>{const request=db.transaction('bounded-immutable-artifacts','readonly').objectStore('bounded-immutable-artifacts').get(retainedDigest);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
 const putArtifact=(value:unknown)=>new Promise<void>((resolve,reject)=>{const tx=db.transaction('bounded-immutable-artifacts','readwrite');tx.objectStore('bounded-immutable-artifacts').put(value);tx.oncomplete=()=>resolve();tx.onabort=()=>reject(tx.error);});
 const exact=await readArtifact();
 try{
  const corrupt=structuredClone(exact);corrupt.exactSealedArtifactBytes[0]^=1;await putArtifact(corrupt);
  expect(await reloadedModule.showcaseVault.createProfileShowcaseBoundedEdgeVault().reopenRetainedHead(artifactId,retainedDigest)).toBeNull();
  await putArtifact({...exact,ownerReceizIdentity:'wrong-owner'});
  expect(await reloadedModule.showcaseVault.createProfileShowcaseBoundedEdgeVault().reopenRetainedHead(artifactId,retainedDigest)).toBeNull();
 }finally{await putArtifact(exact);db.close();}
 // Inject device failure AFTER the real atomic SDK commit, at its first
 // retained proof write. The durable signed action must survive this boundary.
 const interrupted=await reloaded.prepare({kind:'image',title:'Committed before local proof retention',description:'',longForm:'An exact durable retry must also prepare the next accepted successor',files:[{id:'photo',role:'primary',file:image}]});
 const beforeInterrupted=finalizations,previousDigest=acceptedHead.admission.artifactSha256;let proofWriteFailed=false;
 const failProof=vi.spyOn(IDBObjectStore.prototype,'put').mockImplementation(function(this:IDBObjectStore,value,...args){if(this.name==='bounded-immutable-artifacts'&&(value as any).artifactDigest!==previousDigest&&!proofWriteFailed){proofWriteFailed=true;throw Error('FIXTURE_PROOF_RETENTION_INTERRUPTED');}return put.call(this,value,...args);});
 try{await expect(reloaded.publish(interrupted.artifact)).rejects.toThrow('FIXTURE_PROOF_RETENTION_INTERRUPTED');}finally{failProof.mockRestore();}
 expect(proofWriteFailed).toBe(true);expect(finalizations).toBe(beforeInterrupted);
 const afterCommitSeals=seals,pendingModule=await f.reloadRuntime(),coldPending=await open(false,pendingModule),oldPendingChildren=new Set(acceptedHead.visibleChildren.map((child:any)=>child.reference.childArtifactDigest));
 let pendingOldReads=0,pendingScans=0,pendingActiveWrites=0;
 const pendingGet=vi.spyOn(IDBObjectStore.prototype,'get').mockImplementation(function(this:IDBObjectStore,key){if(this.name==='bounded-immutable-children'&&oldPendingChildren.has(key))pendingOldReads++;return get.call(this,key);});
 const pendingAll=vi.spyOn(IDBObjectStore.prototype,'getAll').mockImplementation(function(this:IDBObjectStore,...args){if(['bounded-immutable-heads','bounded-immutable-history-nodes','segments'].includes(this.name))pendingScans++;return all.apply(this,args);});
 const pendingPut=vi.spyOn(IDBObjectStore.prototype,'put').mockImplementation(function(this:IDBObjectStore,...args){if(this.name==='bounded-active-heads')pendingActiveWrites++;return put.apply(this,args);});
 try{
  expect((await coldPending.publish(interrupted.artifact)).status,'fresh module must replay the exact SDK-committed signed action').toBe('published');expect(seals,'retry reuses exact committed seal bytes').toBe(afterCommitSeals);
  const following=await coldPending.prepare({kind:'image',title:'After durable cold retry',description:'',longForm:'The accepted retried head remains genuine mutation input',files:[{id:'photo',role:'primary',file:image}]});
  expect((await coldPending.publish(following.artifact)).status,'replayed sparse head must retain its genuine SDK context for the next new input').toBe('published');
 }finally{pendingGet.mockRestore();pendingAll.mockRestore();pendingPut.mockRestore();}
 expect({pendingOldReads,pendingScans,pendingActiveWrites}).toEqual({pendingOldReads:0,pendingScans:0,pendingActiveWrites:0});

},60000);
