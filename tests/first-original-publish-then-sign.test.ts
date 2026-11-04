import {createLocalPbiAuthorshipProof} from '../native/receiz/packages/receiz-sdk/src/pbiLocalAuthorship.ts';
import {verifyLocalPbiAssertion} from '../native/receiz/packages/receiz-sdk/src/pbiLocalVerifier.ts';
import {afterEach,expect,it,vi} from 'vitest';
import {IDBFactory} from 'fake-indexeddb';
import {conformanceOfflineFixture} from './helpers/conformance-offline-sealer.ts';

afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});

it('publishes the first Original normally and signs its admitted head from a new Bank runtime without reading history',async()=>{
 const f=await conformanceOfflineFixture({composer:true}),r=f.runtime;
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
 let signing=false,ceremonies=0;const requests:string[]=[];
 let accepted:Record<string,unknown>={status:'unmigrated'},complete:any,finalizations=0,seals=0,finalHTTPStatus=0,interrupt=false,attemptDigest:string|undefined,active=true,switchOnUpload=false,interruptBeforeUpload=false;
 const roots=new Map(f.roots.map((root:{kid:string})=>[root.kid,root]));
 const request:typeof fetch=async(input,init)=>{
  const url=new URL(String(input),'https://bankeiz.test');requests.push(url.pathname);
  if(url.origin==='https://storage.test'){staged.set(url.pathname.slice(1),new Uint8Array(await new Response(init?.body).arrayBuffer()));if(switchOnUpload){switchOnUpload=false;active=false;}return new Response(null,{status:200});}
  if(url.pathname==='/api/profile/showcase/accepted-source'){
   const block=url.searchParams.get('block');if(!block)return Response.json(accepted);
   const ref=JSON.parse(block);reads.push(ref.sha256);const bytes=blocks.get(ref.sha256);return new Response(bytes?.slice(),{status:bytes?200:404});
  }
  if(url.pathname===`/api/profile/${username}/originals`){if(signing)throw Error('SIGNING_LEGACY_INVENTORY_FORBIDDEN');return Response.json({ok:true,originals:[],page:{hasMore:false,nextCursor:null}});}
  if(url.pathname!=='/api/profile/showcase/publication')return Response.json({status:'pending',code:'FIXTURE_UNRELATED_SYNC'});
  const body=JSON.parse(String(init?.body));
  if(body.action==='initialize-blocks'&&interruptBeforeUpload)return Response.json({status:'pending',code:'PROFILE_SHOWCASE_PUBLICATION_BLOCK_UPLOAD_FAILED'});
  if(body.action==='initialize-blocks')return Response.json({status:'uploads',scope:body.scope,uploads:body.references.map((reference:{sha256:string})=>({reference,alreadyStored:blocks.has(reference.sha256),signedUrl:`https://storage.test/${reference.sha256}`,stagingObjectName:reference.sha256}))});
  if(body.action==='commit-blocks'){for(const item of body.blocks){const bytes=staged.get(item.stagingObjectName);if(!bytes)throw Error('Missing staged bytes');blocks.set(item.reference.sha256,bytes);}return Response.json({status:'stored',scope:body.scope});}
  expect(body.action).toBe('finalize');finalizations++;timeline.push('finalize');
  if(complete&&body.scope.artifactDigest!==complete.artifactDigest&&body.publicationPredecessorArtifactDigest&&body.publicationPredecessorArtifactDigest!==complete.artifactDigest)return Response.json({status:'pending',code:'PROFILE_SHOWCASE_COMPLETE_TRANSPORT_PREDECESSOR_MISMATCH'});
  if(finalHTTPStatus)return Response.json({error:'access_denied'},{status:finalHTTPStatus});
  const source=await r.showcaseTransport.reconstructProfileShowcaseCompleteSourceTransport(body.transport,async(ref:{sha256:string})=>blocks.get(ref.sha256)??null);
  const vault=r.showcaseVault.createProfileShowcaseBoundedEdgeVault({databaseName:`independent-receiver-${finalizations}`});
  const admitted=await r.showcaseRetainer.retainAcceptedShowcasePredecessor({source,artifactId,vault,canonicalSignatureV4RootPublicKeys:roots});
  expect(admitted.artifactSha256).toBe(body.transport.artifactDigest);
  if(interrupt){attemptDigest=body.transport.artifactDigest;return Response.json({status:'pending',code:'PROFILE_SHOWCASE_PUBLIC_DELIVERY_PENDING'});}
  if(attemptDigest)expect(body.transport.artifactDigest).toBe(attemptDigest);
  complete=source;
  accepted={status:'accepted',artifactId,transport:body.transport,binding:{schema:'receiz.profile-showcase.route-migration-binding.v1',status:'accepted',username,profileIdentity:uid,proofIdentity:owner,locator:{tenantId:'receiz.com',showcaseArtifactId:artifactId,acceptedArtifactDigest:body.transport.artifactDigest,acceptedImmutableObjectVersion:body.transport.artifactDigest,projectionVersion:2}}};
  return Response.json({status:'published',publicationVersion:2,scope:body.scope,artifactDigest:body.transport.artifactDigest,operationCount:admitted.proofHistoryHead.nodeCount,visibleChildCount:source.children.length});
 };
 vi.stubGlobal('fetch',request);
 const open=(previous=false)=>(previous?r.previousConnectedComposer:r.connectedComposer).createConnectedAssetPublicationRuntime({identity:new Uint8Array(f.identity.bytes),passphrase:f.identity.phrase,account:{uid,username},assertCurrent(){if(!active)throw Error('ACCOUNT_CLOSED');},fetchImpl:request,onLocalAdmission:(value:any)=>{expect(value.original.marketPreview?.quote?.priceUsd??value.original.marketPreview).toBeDefined();timeline.push('local');},sealDocument:async(args:any)=>{seals++;return seal(args);}});
 const image=new File([Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jQmcAAAAASUVORK5CYII=','base64')],'original.png',{type:'image/png'});
 let runtime=await open();
 const next=await runtime.prepare({kind:'image',title:'First signed Original',description:'',longForm:'First complete essay',files:[{id:'photo',role:'primary',file:image}]});
 expect((await runtime.publish(next.artifact)).status).toBe('published');expect(complete.children).toHaveLength(1);
 const unsignedHead=complete.artifactDigest;
 runtime=await open();signing=true;requests.length=0;
 const encode=(v:Uint8Array|ArrayBuffer)=>Buffer.from(v instanceof Uint8Array?v:new Uint8Array(v)).toString('base64url');
 const keys=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']),spki=await crypto.subtle.exportKey('spki',keys.publicKey),credential={credIdB64Url:'AQI',pubKeyPem:`-----BEGIN PUBLIC KEY-----\n${Buffer.from(spki).toString('base64')}\n-----END PUBLIC KEY-----`};
 const authorize=async(input:any)=>{ceremonies++;expect(requests).toEqual([]);return createLocalPbiAuthorshipProof({input,credential,dependencies:{performAssertion:async({challengeB64Url,credIdB64Url,pubKeyPem})=>{
  const auth=new Uint8Array(37);auth.set(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode('receiz.com'))));auth[32]=5;
  const client=new TextEncoder().encode(JSON.stringify({type:'webauthn.get',challenge:challengeB64Url,origin:'https://bankeiz.com',crossOrigin:false})),payload=new Uint8Array(69);payload.set(auth);payload.set(new Uint8Array(await crypto.subtle.digest('SHA-256',client)),37);
  return{credIdB64Url,pubKeyPem,authenticatorDataB64Url:encode(auth),clientDataJSONB64Url:encode(client),signatureB64Url:encode(await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},keys.privateKey,payload))};
 },verifyAssertion:args=>verifyLocalPbiAssertion({...args,policy:{rpId:'receiz.com',originAllowList:['https://bankeiz.com'],requireUP:true,requireUV:true}})}});};
 const receipt=await runtime.publish(next.artifact,authorize).catch((error:Error)=>{expect(ceremonies).toBe(1);expect(requests).not.toContain(`/api/profile/${username}/originals`);throw Error(error.message);});expect(receipt.status).toBe('published');expect(receipt.artifactDigest).not.toBe(unsignedHead);expect(ceremonies).toBe(1);expect(requests).not.toContain(`/api/profile/${username}/originals`);
 const last=complete.children.at(-1),source=await r.openImportedProofSource(new File([last.exactSealedArtifactBytes],'placement.receizbundle',{type:'application/vnd.receiz.bundle+json'}),{resolveSourceBlock:r.createImportedProofSourceCustody().resolveBlock});
 expect(source.projection.carriedOriginal?.hasPbiSignature,'A successful Sign now must publish the signed placement, not acknowledge the pending unsigned placement').toBe(true);
 // Keep both completed local commits. Sign the selected second Original only
 // after a third append has advanced the globally accepted head.
 const older=await runtime.prepare({kind:'image',title:'Already public unsigned Original',description:'',longForm:'Exact selected source',files:[{id:'photo',role:'primary',file:image}]});
 expect((await runtime.publish(older.artifact)).status).toBe('published');
 const later=await runtime.prepare({kind:'image',title:'Later public Original',description:'',longForm:'Advance the accepted head',files:[{id:'photo',role:'primary',file:image}]});
 expect((await runtime.publish(later.artifact)).status).toBe('published');
 const beforeSignedRetry={ceremonies,seals};runtime=await open();requests.length=0;
 expect((await runtime.publish(older.artifact,authorize)).status).toBe('published');
 expect(ceremonies).toBe(beforeSignedRetry.ceremonies+1);
 const signedOlder=complete.children.at(-1),signedOlderSource=await r.openImportedProofSource(new File([signedOlder.exactSealedArtifactBytes],'signed-older.receizbundle',{type:'application/vnd.receiz.bundle+json'}),{resolveSourceBlock:r.createImportedProofSourceCustody().resolveBlock});
 expect(signedOlderSource.projection.carriedOriginal?.importedSource?.reference.artifactSha256).toBe(older.reference.artifactSha256);
 expect(signedOlderSource.projection.carriedOriginal?.hasPbiSignature).toBe(true);
 const beforeResume={ceremonies,seals,artifactDigest:complete.artifactDigest};runtime=await open();
 expect((await runtime.resumeSignedPublication(older.artifact))?.status).toBe('published');
 expect({ceremonies,seals,artifactDigest:complete.artifactDigest}).toEqual(beforeResume);
},60000);
