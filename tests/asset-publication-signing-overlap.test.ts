import {afterEach,expect,it,vi} from 'vitest';
import {IDBFactory} from 'fake-indexeddb';
import {conformanceOfflineFixture} from './helpers/conformance-offline-sealer';
import {createLocalPbiAuthorshipProof} from '../native/receiz/packages/receiz-sdk/src/pbiLocalAuthorship';
import {verifyLocalPbiAssertion} from '../native/receiz/packages/receiz-sdk/src/pbiLocalVerifier';
import * as publication from '../src/receiz/asset-publication';
import type {AssetPublicationReceipt,AssetPublicationState} from '../src/receiz/asset-publication';

afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});
const deferred=()=>{let resolve!:()=>void;const promise=new Promise<void>(done=>{resolve=done;});return{promise,resolve};};
const encode=(bytes:ArrayBuffer|Uint8Array)=>Buffer.from(bytes instanceof Uint8Array?bytes:new Uint8Array(bytes)).toString('base64url');

// Removing the existing Bank delivery join must fail the pre-runtime case:
// local PBI can finish before the unsigned native publisher has even opened.
it.each(['before-runtime-publish','during-finalize'] as const)('signs locally while first delivery is paused %s, then accepts both transitions in causal order',async pause=>{
 const f=await conformanceOfflineFixture({composer:true}),r=f.runtime;
 vi.stubGlobal('indexedDB',new IDBFactory());
 const values=new Map<string,string>(),events=new EventTarget();
 const storage={getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>values.set(key,value),removeItem:(key:string)=>values.delete(key),key:(index:number)=>[...values.keys()][index]??null,get length(){return values.size;}};
 vi.stubGlobal('window',{localStorage:storage,sessionStorage:storage,location:{origin:'https://bankeiz.test',pathname:'/',href:'https://bankeiz.test/'},setTimeout,clearTimeout,dispatchEvent:events.dispatchEvent.bind(events),addEventListener:events.addEventListener.bind(events),removeEventListener:events.removeEventListener.bind(events)});
 vi.stubGlobal('document',{visibilityState:'visible',addEventListener:events.addEventListener.bind(events),removeEventListener:events.removeEventListener.bind(events)});
 const identity=new File([new Uint8Array(f.identity.bytes)],'identity.png');
 const actor=await r.createReceizArtifactAdmissionEngine()(await r.verifyReceizArtifact(identity),{profile:'identity',identityPassphrase:f.identity.phrase});
 const owner=(await r.readReceizIdentityPublicBinding(actor)).artifactOwnerReceizId,username='overlap_artist',uid='overlap-account',artifactId=`profile-showcase:${owner}`;
 const enrollment=await f.store.load(),seal=await r.createBankNativeNoteSealer({enrollment,resources:f.resources});
 const blocks=new Map<string,Uint8Array>(),staged=new Map<string,Uint8Array>(),firstDelivery=deferred(),releaseDelivery=deferred(),localSignature=deferred();
 const roots=new Map(f.roots.map((root:{kid:string})=>[root.kid,root]));
 const receiver=r.createAcceptedPublicationReceiver(r,artifactId,roots,async(ref:{sha256:string})=>blocks.get(ref.sha256)??null).admit;
 let accepted:Record<string,unknown>={status:'unmigrated'},head:any,stalled=false,finalizations=0,ceremonies=0,localPbiReceipt:string|undefined;
 const order:string[]=[];
 const request:typeof fetch=async(input,init)=>{
  const url=new URL(String(input),'https://bankeiz.test');
  if(url.origin==='https://storage.test'){staged.set(url.pathname.slice(1),new Uint8Array(await new Response(init?.body).arrayBuffer()));return new Response(null,{status:200});}
  if(url.pathname==='/api/profile/showcase/accepted-source'){
   const block=url.searchParams.get('block');if(!block)return Response.json(accepted);
   const bytes=blocks.get(JSON.parse(block).sha256);return new Response(bytes?.slice(),{status:bytes?200:404});
  }
  if(url.pathname===`/api/profile/${username}/originals`)return Response.json({ok:true,originals:[],page:{hasMore:false,nextCursor:null}});
  if(url.pathname!=='/api/profile/showcase/publication')throw Error('UNRELATED_SOURCE_READ');
  const body=JSON.parse(String(init?.body));
  if(body.action==='initialize-blocks')return Response.json({status:'uploads',scope:body.scope,uploads:body.references.map((reference:{sha256:string})=>({reference,alreadyStored:blocks.has(reference.sha256),signedUrl:`https://storage.test/${reference.sha256}`,stagingObjectName:reference.sha256}))});
  if(body.action==='commit-blocks'){for(const item of body.blocks){const bytes=staged.get(item.stagingObjectName);if(!bytes)throw Error('MISSING_STAGED_BYTES');blocks.set(item.reference.sha256,bytes);}return Response.json({status:'stored',scope:body.scope});}
  expect(body.action).toBe('finalize');finalizations++;
  const next=await receiver(body.transport);
  if(pause==='during-finalize'&&!stalled&&next.visibleChildren.length){stalled=true;firstDelivery.resolve();await releaseDelivery.promise;}
  head=next;order.push(body.transport.artifactDigest);
  accepted={status:'accepted',artifactId,transport:body.transport,binding:{schema:'receiz.profile-showcase.route-migration-binding.v1',status:'accepted',username,profileIdentity:uid,proofIdentity:owner,locator:{tenantId:'receiz.com',showcaseArtifactId:artifactId,acceptedArtifactDigest:body.transport.artifactDigest,acceptedImmutableObjectVersion:body.transport.artifactDigest,projectionVersion:2}}};
  return Response.json({status:'published',publicationVersion:2,scope:body.scope,artifactDigest:body.transport.artifactDigest,operationCount:next.admission.proofHistoryHead.nodeCount,visibleChildCount:next.visibleChildren.length});
 };
 vi.stubGlobal('fetch',request);
 let sourceDigest='';
 const runtime=await r.connectedComposer.createConnectedAssetPublicationRuntime({identity:new Uint8Array(f.identity.bytes),passphrase:f.identity.phrase,account:{uid,username},assertCurrent(){},fetchImpl:request,sealDocument:seal,onLocalAdmission:(value:any,context?:{signing:boolean})=>{expect(value.original.originalCreator?.userId).toBe(uid);expect(value.original.originalCreator?.username).toBe(username);expect(value.original.ownershipKind).toBe('creator');expect(value.original.ownershipRole).toBe('creator');if(value.original.hasPbiSignature){localPbiReceipt=value.original.pbiReceiptHash;localSignature.resolve();if(context?.signing)return publication.waitForAssetPublicationDelivery?.(owner,sourceDigest);}}});
 const image=new File([Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jQmcAAAAASUVORK5CYII=','base64')],'original.png',{type:'image/png'});
 const prepared=await runtime.prepare({kind:'image',title:'One exact Original',description:'The seal is unchanged',longForm:'A complete carried essay',files:[{id:'photo',role:'primary',file:image}]});
 const exact=new Uint8Array(await prepared.artifact.arrayBuffer());
 sourceDigest=[...new Uint8Array(await crypto.subtle.digest('SHA-256',exact))].map(value=>value.toString(16).padStart(2,'0')).join('');
 let checkpoint:AssetPublicationState|null=null,unsigned!:Promise<AssetPublicationReceipt>,sourceSeals=0,publishCalls=0;
 const intent={title:'One exact Original'},api=publication.createAssetPublication({ownerReceizId:owner,assertOpen(){},lock:async run=>run(),read:async()=>checkpoint,write:async next=>{checkpoint=structuredClone(next);},seal:async()=>{sourceSeals++;return prepared.artifact;},retain:async()=>sourceDigest,restore:async()=>prepared.artifact,readIntent:async()=>intent,publish:file=>{publishCalls++;return unsigned=(async()=>{if(pause==='before-runtime-publish'){firstDelivery.resolve();await releaseDelivery.promise;}return runtime.publish(file);})().catch((cause:Error)=>{throw Error(cause.message);});}});
 const local=await api.createLocal(intent);expect(local.digest).toBe(sourceDigest);expect(local.publication.status).toBe('pending');
 await Promise.race([firstDelivery.promise,unsigned.then(()=>{throw Error('FIRST_DELIVERY_DID_NOT_ENTER_THE_CONTROLLED_RECEIVER');})]);
 const beforeSigning=finalizations;
 const keys=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']),spki=await crypto.subtle.exportKey('spki',keys.publicKey);
 const credential={credIdB64Url:'AQI',pubKeyPem:`-----BEGIN PUBLIC KEY-----\n${Buffer.from(spki).toString('base64')}\n-----END PUBLIC KEY-----`};
 const signed=runtime.publish(prepared.artifact,async(input:any)=>{
  ceremonies++;
  return createLocalPbiAuthorshipProof({input,credential,dependencies:{performAssertion:async({challengeB64Url,credIdB64Url,pubKeyPem})=>{
   const auth=new Uint8Array(37);auth.set(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode('receiz.com'))));auth[32]=5;
   const client=new TextEncoder().encode(JSON.stringify({type:'webauthn.get',challenge:challengeB64Url,origin:'https://bankeiz.com',crossOrigin:false})),payload=new Uint8Array(69);payload.set(auth);payload.set(new Uint8Array(await crypto.subtle.digest('SHA-256',client)),37);
   return{credIdB64Url,pubKeyPem,authenticatorDataB64Url:encode(auth),clientDataJSONB64Url:encode(client),signatureB64Url:encode(await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},keys.privateKey,payload))};
  },verifyAssertion:args=>verifyLocalPbiAssertion({...args,policy:{rpId:'receiz.com',originAllowList:['https://bankeiz.com'],requireUP:true,requireUV:true}})}});
 }).then((value:AssetPublicationReceipt)=>({value}),(cause:Error)=>({error:cause.message}));
 await Promise.race([localSignature.promise,signed.then((outcome:{value:AssetPublicationReceipt}|{error:string})=>{throw Error('error'in outcome?outcome.error:'SIGNATURE_WAS_NOT_ADMITTED_LOCALLY');})]);
 expect(ceremonies).toBe(1);expect(finalizations,'signing is local while delivery retains its causal lock').toBe(beforeSigning);
 releaseDelivery.resolve();
 expect((await unsigned).status).toBe('published');const signedResult=await signed;if('error'in signedResult)throw Error(signedResult.error);expect(signedResult.value.status).toBe('published');
 expect(publishCalls).toBe(1);expect(sourceSeals).toBe(1);
 expect(order).toHaveLength(new Set(order).size);
 expect(new Uint8Array(await prepared.artifact.arrayBuffer())).toEqual(exact);
 const source=await head.readCompleteSource();
 expect(source.artifactDigest).toBe(head.admission.artifactSha256);
 expect(localPbiReceipt).toMatch(/^[a-f0-9]{64}$/);
 const signedChild=source.children.at(-1)!;
 const opened=await r.openPayload({fileBytes:signedChild.exactSealedArtifactBytes,filename:'signed-original.receizbundle',mime:'application/vnd.receiz.bundle+json',signatureV4RootPublicKeys:roots});
 expect(opened.ok).toBe(true);
 expect(new TextDecoder().decode(opened.payloadBytes)).toContain(localPbiReceipt);
 expect(ceremonies).toBe(1);
 // Lost acknowledgment: the same ordinary recovery carries its saved PBI.
 // It must not join its own controller flight or create another transition.
 const beforeReplay=finalizations;
 const recorded=publication.readAssetPublicationState(checkpoint,owner);expect(recorded?.status).toBe('published');
 checkpoint={...recorded!,status:'pending',receipt:{status:'pending',code:'BANK_ASSET_PUBLICATION_DELIVERY_PENDING'}};
 const recovered=await api.resume();
 expect(recovered.publication.status).toBe('published');expect(finalizations).toBe(beforeReplay);
 expect(ceremonies).toBe(1);expect(sourceSeals).toBe(1);expect(publishCalls).toBe(2);
 // Cold read-only recovery verifies the already-saved native PBI result.
 // No authorization, head read, publication, or Source resealing is allowed.
 const readOnly=await r.connectedComposer.createConnectedAssetPublicationRuntime({identity:new Uint8Array(f.identity.bytes),passphrase:f.identity.phrase,account:{uid,username},assertCurrent(){},fetchImpl:async()=>{throw Error('RECOVERY_NETWORK_FORBIDDEN');},sealDocument:async()=>{throw Error('RECOVERY_SEAL_FORBIDDEN');}});
 expect(await readOnly.readSignedSource(prepared.artifact)).toEqual({pbiReceiptHash:localPbiReceipt});expect(ceremonies).toBe(1);
},60000);
