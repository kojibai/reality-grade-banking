import {afterEach,expect,it,vi} from 'vitest';
import {IDBFactory,IDBKeyRange} from 'fake-indexeddb';
import {conformanceOfflineFixture} from './helpers/conformance-offline-sealer';
import * as adoption from '../src/receiz/asset-publication-adoption';
import type {ConnectedAssetLocalAdmission} from '../src/receiz/asset-publication-runtime';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import {projectCalendarOriginal,mergeCalendarSourceEvents} from '../src/receiz/calendar-source-projection';
import {createNativeOrganizer} from '../src/receiz/native-organizer';
import type {OrganizerEvent} from '../src/receiz/organizer-types';
import * as assetPublication from '../src/receiz/asset-publication';
import type {AssetPublicationState} from '../src/receiz/asset-publication';
import {createLocalPbiAuthorshipProof} from '../native/receiz/packages/receiz-sdk/src/pbiLocalAuthorship';
import {verifyLocalPbiAssertion} from '../native/receiz/packages/receiz-sdk/src/pbiLocalVerifier';

/** Execute the existing private host closure with its real projectors. This
 * avoids replacing native admission or adding a production test-only export. */
function calendarSourceRetention(uid:string,organizer:ReturnType<typeof createNativeOrganizer>){
 const source=readFileSync(new URL('../src/receiz/native-identity.ts',import.meta.url),'utf8'),file=ts.createSourceFile('native-identity.ts',source,ts.ScriptTarget.ES2022,true);
 let statement:string|undefined;
 function find(node:ts.Node){if(ts.isVariableDeclaration(node)&&ts.isIdentifier(node.name)&&node.name.text==='retainCalendarOriginal'&&ts.isVariableStatement(node.parent.parent))statement=node.parent.parent.getText(file);ts.forEachChild(node,find);}find(file);
 if(!statement)throw Error('EXISTING_HOST_CALENDAR_COMPOSITION_MISSING');
 const compiled=ts.transpileModule(statement,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
 return new Function('projectCalendarOriginal','mergeCalendarSourceEvents','heldOrganizer','accountUid',`const lifetime={signal:new AbortController().signal};let carriedAccountUid,knownWallet;let localCalendarEvents=[];${compiled};return{retain:retainCalendarOriginal,held:()=>localCalendarEvents};`)(projectCalendarOriginal,mergeCalendarSourceEvents,organizer,uid) as {retain(uid:string,original:unknown):void;held():OrganizerEvent[]};
}

/** Execute the actual private callback, supplying its existing module import
 * and owner checkpoint ports. Canonical Source/PBI admission stays SDK-owned. */
function signatureSourceRetention(owner:string,digest:string,ports:Parameters<typeof assetPublication.retainAssetCreationSignature>[0],noteOpen:()=>void){
 const source=readFileSync(new URL('../src/receiz/native-identity.ts',import.meta.url),'utf8'),file=ts.createSourceFile('native-identity.ts',source,ts.ScriptTarget.Latest,true);let statement='';
 function find(node:ts.Node){if(ts.isFunctionDeclaration(node)&&node.name?.text==='recordAssetSignatureAdmission')statement=node.getText(file);ts.forEachChild(node,find);}find(file);
 if(!statement.includes("await import('./asset-publication')"))throw Error('EXISTING_HOST_SIGNATURE_COMPOSITION_MISSING');
 const compiled=ts.transpileModule(statement.replace("await import('./asset-publication')",'assetPublication'),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
 const flight:{signaturePbiReceiptHash?:string}={},flights=new Map([[digest,flight]]);
 const retain=new Function('assetPublication','assetSigningFlights','assetCreationState','noteOpen','binding','waitForAssetPublicationDelivery',`${compiled};return recordAssetSignatureAdmission;`)(assetPublication,flights,()=>ports,noteOpen,{artifactOwnerReceizId:owner},assetPublication.waitForAssetPublicationDelivery) as (admission:ConnectedAssetLocalAdmission,context?:Readonly<{signing:boolean}>)=>Promise<void>;
 return{retain,flight,flights};
}

function savedSignaturePublication(input:{host:ReturnType<typeof signatureSourceRetention>;runtime:any;source:File;digest:string;owner:string;read():unknown;write(next:AssetPublicationState,previous:unknown):Promise<void>}){
 const source=readFileSync(new URL('../src/receiz/native-identity.ts',import.meta.url),'utf8'),file=ts.createSourceFile('native-identity.ts',source,ts.ScriptTarget.Latest,true);let statement='';
 function find(node:ts.Node){if(ts.isFunctionDeclaration(node)&&node.name?.text==='publishAssetSignature')statement=node.getText(file);ts.forEachChild(node,find);}find(file);
 for(const [path,module] of [['./asset-publication-adoption','adoptionModule'],['./asset-publication','assetPublication'],['./identity-vault','vault']])statement=statement.replace(`await import('${path}')`,module);
 const compiled=ts.transpileModule(statement,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
 const sdk={sha256ReceizBytes:async(bytes:Uint8Array)=>Buffer.from(await crypto.subtle.digest('SHA-256',new Uint8Array(bytes).buffer)).toString('hex')};
 const vault={loadAssetPublicationState:input.read,saveAssetPublicationState:(_binding:unknown,next:AssetPublicationState,previous:unknown)=>input.write(next,previous)};
 return new Function('assetSigningFlights','noteOpen','loadDepositSources','binding','sdk','openComposedPublisher','adoptionModule','assetPublication','vault','navigator','lifetime',`${compiled};return publishAssetSignature;`)(input.host.flights,()=>{},async()=>[{bytes:new Uint8Array(await input.source.arrayBuffer()),filename:input.source.name}],{artifactOwnerReceizId:input.owner},sdk,async()=>input.runtime,adoption,assetPublication,vault,{locks:{request:async(_name:string,_options:unknown,run:()=>Promise<unknown>)=>run()}},{signal:new AbortController().signal}) as (digest:string,resumeOnly:boolean)=>Promise<assetPublication.AssetPublicationReceipt|null>;
}

function openedSignatureRetry(input:{uid:string;owner:string;read():unknown;resume:(digest:string,retry:boolean)=>Promise<unknown>;readNative?:()=>Promise<unknown>;online?:boolean}){
 const path=new URL('../src/receiz/native-identity.ts',import.meta.url);
 const file=ts.createSourceFile(path.pathname,readFileSync(path,'utf8'),ts.ScriptTarget.Latest,true);
 let statement='';
 function find(node:ts.Node){if(ts.isFunctionDeclaration(node)&&node.name?.text==='retryAssetSignatureOnOpen')statement=node.getText(file);ts.forEachChild(node,find);}
 find(file);
 if(!statement)throw Error('SELECTED_ASSET_RETRY_MISSING');
 const compiled=ts.transpileModule(statement.replace(/import\('\.(\/[^']+)'\)/g,"modules['.$1']"),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
 const modules={'./asset-publication-adoption':adoption,'./asset-publication':assetPublication,'./identity-vault':{loadAssetPublicationState:async()=>input.read()}};
 return new Function('modules','input',`
  const openedAssetSignatureRetries=new Map(),assetSigningFlights=new Map(),lifetime=new AbortController();
  const navigator={onLine:input.online!==false},binding={artifactOwnerReceizId:input.owner,artifactSha256:'d'.repeat(64)};
  const accountUid=input.uid,presentationUsername='artist',confirmedUsername='artist',noteOpen=()=>{};
  const publicAccountUsername=value=>value,openComposedPublisher=async()=>({readSignedSource:input.readNative});
  const publishAssetSignature=input.resume;
  ${compiled}
  return (digest,source)=>{retryAssetSignatureOnOpen(digest,source);return openedAssetSignatureRetries.get(digest);};
 `)(modules,input) as (digest:string,source?:{digest:string;composerOriginal:true;bytes:Uint8Array;filename:string})=>Promise<void>|undefined;
}

afterEach(()=>{adoption.forgetAssetPublicationAdmissions();vi.restoreAllMocks();vi.unstubAllGlobals();});

it('publishes the actual canonical Source despite a display observer failure and refuses unverified Source before transport',async()=>{
 const f=await conformanceOfflineFixture({composer:true}),r=f.runtime;
 vi.stubGlobal('indexedDB',new IDBFactory());vi.stubGlobal('IDBKeyRange',IDBKeyRange);
 const values=new Map<string,string>(),events=new EventTarget();
 const storage={getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>{values.set(key,value);},removeItem:(key:string)=>{values.delete(key);}};
 vi.stubGlobal('localStorage',storage);
 vi.stubGlobal('window',{localStorage:storage,sessionStorage:storage,location:{origin:'https://bankeiz.test',pathname:'/',href:'https://bankeiz.test/'},setTimeout,clearTimeout,dispatchEvent:events.dispatchEvent.bind(events),addEventListener:events.addEventListener.bind(events),removeEventListener:events.removeEventListener.bind(events)});
 vi.stubGlobal('document',{visibilityState:'visible',addEventListener:events.addEventListener.bind(events),removeEventListener:events.removeEventListener.bind(events)});
 const identity=new File([new Uint8Array(f.identity.bytes)],'identity.png');
 const actor=await r.createReceizArtifactAdmissionEngine()(await r.verifyReceizArtifact(identity),{profile:'identity',identityPassphrase:f.identity.phrase});
 expect(actor.verdict).toBe('canonical-identity');
 const owner=(await r.readReceizIdentityPublicBinding(actor)).artifactOwnerReceizId,username='bjklock',uid='eecb99a0-9c6a-4e89-813b-f76331ea9c41',artifactId=`profile-showcase:${owner}`;
 const sealDocument=await r.createBankNativeNoteSealer({enrollment:await f.store.load(),resources:f.resources});
 const blocks=new Map<string,Uint8Array>(),staged=new Map<string,Uint8Array>();
 const roots=new Map(f.roots.map((root:{kid:string})=>[root.kid,root]));
 const receiver=r.createAcceptedPublicationReceiver(r,artifactId,roots,async(reference:{sha256:string})=>blocks.get(reference.sha256)??null,{indexedDB:new IDBFactory()});
 let calls=0,finalizations=0,localCallbacks=0,acceptedHead:any;
 const request:typeof fetch=async(input,init)=>{
  calls++;const url=new URL(String(input),'https://bankeiz.test');
  if(url.origin==='https://storage.test'){staged.set(url.pathname.slice(1),new Uint8Array(await new Response(init?.body).arrayBuffer()));return new Response(null,{status:200});}
  if(url.pathname==='/api/profile/showcase/accepted-source')return Response.json({status:'unmigrated'});
  if(url.pathname===`/api/profile/${username}/originals`)return Response.json({ok:true,originals:[],page:{hasMore:false,nextCursor:null}});
  if(url.pathname!=='/api/profile/showcase/publication')return Response.json({status:'pending',code:'FIXTURE_UNRELATED_SYNC'});
  const body=JSON.parse(String(init?.body));
  if(body.action==='initialize-blocks')return Response.json({status:'uploads',scope:body.scope,uploads:body.references.map((reference:{sha256:string})=>({reference,alreadyStored:blocks.has(reference.sha256),signedUrl:`https://storage.test/${reference.sha256}`,stagingObjectName:reference.sha256}))});
  if(body.action==='commit-blocks'){for(const item of body.blocks){const bytes=staged.get(item.stagingObjectName);if(!bytes)throw Error('EXACT_SOURCE_BLOCK_MISSING');blocks.set(item.reference.sha256,bytes);}return Response.json({status:'stored',scope:body.scope});}
  expect(body.action).toBe('finalize');expect(body.scope).toMatchObject({profileIdentity:uid,username,ownerReceizId:owner});finalizations++;acceptedHead=await receiver.admit(body.transport);
  return Response.json({status:'published',publicationVersion:2,scope:body.scope,artifactDigest:body.transport.artifactDigest,operationCount:acceptedHead.admission.proofHistoryHead.nodeCount,visibleChildCount:acceptedHead.visibleChildren.length});
 };
 vi.stubGlobal('fetch',request);
 let calendar!:ReturnType<typeof calendarSourceRetention>,calendarNotifications=0;
 const organizer=createNativeOrganizer({accountUid:uid,heldEvents:()=>calendar?.held()??[],request:async()=>{throw Error('CALENDAR_DISPLAY_MUST_NOT_OPEN_TRANSPORT');}});
 calendar=calendarSourceRetention(uid,organizer);
 const stopCalendar=organizer.subscribe(()=>{calendarNotifications++;throw Error('CALENDAR_DISPLAY_OBSERVER_FAILED');});
 const runtime=await r.connectedComposer.createConnectedAssetPublicationRuntime({identity:new Uint8Array(f.identity.bytes),passphrase:f.identity.phrase,account:{uid,username},assertCurrent(){},fetchImpl:request,sealDocument,onLocalAdmission:(admission:ConnectedAssetLocalAdmission)=>{localCallbacks++;calendar.retain(uid,admission.original);adoption.retainAssetPublicationAdmission(admission,{identityDigest:'d'.repeat(64),accountUid:uid});}});
 const prepared=await runtime.prepare({kind:'moment',title:'Accepted sealed Source',description:'The public Original is already held.',longForm:'Its source proof owns admission.',files:[]});
 let observed=0,laterObserved=0;
 const stopBroken=adoption.subscribeAssetPublicationAdmissions(()=>{observed++;throw Error('DISPLAY_OBSERVER_FAILED');});
 const stopLater=adoption.subscribeAssetPublicationAdmissions(()=>{laterObserved++;});
 try{
  const receipt=await runtime.publish(prepared.artifact);
  expect(receipt.status).toBe('published');expect(finalizations).toBe(1);expect(localCallbacks).toBe(1);expect(observed).toBeGreaterThan(0);expect(laterObserved).toBeGreaterThan(0);
  expect(acceptedHead.visibleChildren).toHaveLength(1);
  expect(calendarNotifications).toBe(1);expect(calendar.held()).toHaveLength(1);expect(organizer.known().events).toHaveLength(1);
  const digest=prepared.reference.artifactSha256,held=adoption.admittedAssetPublicationItem(digest,username,uid);
  expect(held).toMatchObject({originalDigest:digest,originalCreator:{userId:uid,username}});
  expect(values.get('bankeiz-admitted-public-assets-v1')).toContain(digest);
  expect(()=>adoption.acknowledgeAssetPublication(digest,receipt)).not.toThrow();
  expect(adoption.admittedAssetPublicationDelivery(digest,username)).toMatchObject({status:'published'});
  adoption.forgetAssetPublicationAdmissions();
  expect(()=>adoption.acknowledgeAssetPublication(digest,receipt)).not.toThrow();
  const before={calls,localCallbacks,finalizations};
  await expect(runtime.publish(new File(['{"schema":"receiz.bank.asset-content.v2"}'],'unsealed.json',{type:'application/json'}))).rejects.toThrow();
  const corrupt=new Uint8Array(await prepared.artifact.arrayBuffer());corrupt[0]^=1;
  await expect(runtime.publish(new File([corrupt],prepared.artifact.name,{type:prepared.artifact.type}))).rejects.toThrow();
  expect({calls,localCallbacks,finalizations}).toEqual(before);
 }finally{stopBroken();stopLater();stopCalendar();}
},30000);

it.each(['quota','available','receipt-quota','ack-quota'] as const)('publishes the durable canonical PBI Source when its editor checkpoint is %s, then cold-reuses that proof without another ceremony or seal',async checkpointStorage=>{
 vi.stubGlobal('indexedDB',new IDBFactory());vi.stubGlobal('IDBKeyRange',IDBKeyRange);
 const values=new Map<string,string>(),events=new EventTarget();
 const storage={getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>{values.set(key,value);},removeItem:(key:string)=>{values.delete(key);}};
 vi.stubGlobal('localStorage',storage);
 vi.stubGlobal('window',{localStorage:storage,sessionStorage:storage,location:{origin:'https://bankeiz.com',pathname:'/',href:'https://bankeiz.com/'},setTimeout,clearTimeout,dispatchEvent:events.dispatchEvent.bind(events),addEventListener:events.addEventListener.bind(events),removeEventListener:events.removeEventListener.bind(events)});
 vi.stubGlobal('document',{visibilityState:'visible',addEventListener:events.addEventListener.bind(events),removeEventListener:events.removeEventListener.bind(events)});
 const f=await conformanceOfflineFixture({composer:true}),r=f.runtime;
 const actor=await r.createReceizArtifactAdmissionEngine()(await r.verifyReceizArtifact(new File([new Uint8Array(f.identity.bytes)],'identity.png')),{profile:'identity',identityPassphrase:f.identity.phrase});
 const owner=(await r.readReceizIdentityPublicBinding(actor)).artifactOwnerReceizId,username='bjklock',uid='eecb99a0-9c6a-4e89-813b-f76331ea9c41',artifactId=`profile-showcase:${owner}`;
 const sealDocument=vi.fn(await r.createBankNativeNoteSealer({enrollment:await f.store.load(),resources:f.resources}));
 const blocks=new Map<string,Uint8Array>(),staged=new Map<string,Uint8Array>(),roots=new Map(f.roots.map((root:{kid:string})=>[root.kid,root]));
 const receiver=r.createAcceptedPublicationReceiver(r,artifactId,roots,async(reference:{sha256:string})=>blocks.get(reference.sha256)??null,{indexedDB:new IDBFactory()});
 let finalizations=0,acceptedHead:any,expectedPbi:string|undefined,writes=0,currentChecks=0,interruptedSignature=false;
 let checkpoint:AssetPublicationState;
 let host:ReturnType<typeof signatureSourceRetention>|undefined;
 const request:typeof fetch=async(input,init)=>{
  const url=new URL(String(input),'https://bankeiz.com');
  if(url.origin==='https://storage.test'){staged.set(url.pathname.slice(1),new Uint8Array(await new Response(init?.body).arrayBuffer()));return new Response(null,{status:200});}
  if(url.pathname==='/api/profile/showcase/accepted-source')return Response.json({status:'unmigrated'});
  if(url.pathname===`/api/profile/${username}/originals`)return Response.json({ok:true,originals:[],page:{hasMore:false,nextCursor:null}});
  if(url.pathname!=='/api/profile/showcase/publication')throw Error('UNRELATED_SOURCE_READ');
  const body=JSON.parse(String(init?.body));
  if(body.action==='initialize-blocks')return Response.json({status:'uploads',scope:body.scope,uploads:body.references.map((reference:{sha256:string})=>({reference,alreadyStored:blocks.has(reference.sha256),signedUrl:`https://storage.test/${reference.sha256}`,stagingObjectName:reference.sha256}))});
  if(body.action==='commit-blocks'){for(const item of body.blocks){const bytes=staged.get(item.stagingObjectName);if(!bytes)throw Error('EXACT_SOURCE_BLOCK_MISSING');blocks.set(item.reference.sha256,bytes);}return Response.json({status:'stored',scope:body.scope});}
  expect(body.action).toBe('finalize');
  if(expectedPbi){expect(writes).toBe(1);expect(host?.flight.signaturePbiReceiptHash).toBe(expectedPbi);if(checkpointStorage!=='quota')expect(checkpoint.pbiReceiptHash).toBe(expectedPbi);}
  if(expectedPbi&&checkpointStorage==='available'&&!interruptedSignature){interruptedSignature=true;return new Response(null,{status:503});}
  finalizations++;acceptedHead=await receiver.admit(body.transport);
  return Response.json({status:'published',publicationVersion:2,scope:body.scope,artifactDigest:body.transport.artifactDigest,operationCount:acceptedHead.admission.proofHistoryHead.nodeCount,visibleChildCount:acceptedHead.visibleChildren.length});
 };
 vi.stubGlobal('fetch',request);
 let signedLocal:ConnectedAssetLocalAdmission|undefined;
 const runtime=await r.connectedComposer.createConnectedAssetPublicationRuntime({identity:new Uint8Array(f.identity.bytes),passphrase:f.identity.phrase,account:{uid,username},assertCurrent(){currentChecks++;},fetchImpl:request,sealDocument,onLocalAdmission:async(admission:ConnectedAssetLocalAdmission,context?:Readonly<{signing:boolean}>)=>{
  const original=admission.original as {hasPbiSignature?:boolean;pbiReceiptHash?:string;originalCreator?:{userId?:string}};
  if(original.hasPbiSignature){signedLocal=admission;adoption.retainAssetPublicationAdmission(admission,{identityDigest:actor.artifactSha256,accountUid:uid,artwork:admission.artwork});expectedPbi=original.pbiReceiptHash!;expect(original.originalCreator?.userId).toBe(uid);await host!.retain(admission,context);}
 }});
 const prepared=await runtime.prepare({kind:'moment',title:'Durable Source before editor checkpoint',description:'The actual native proof is retained before host notification.',longForm:'An editor projection cannot veto this Source.',files:[]});
 const exact=new Uint8Array(await prepared.artifact.arrayBuffer()),digest=prepared.reference.artifactSha256;
 checkpoint={schema:'bank.asset-publication.v1',ownerReceizId:owner,intentDigest:'a'.repeat(64),sourceDigest:digest,filename:prepared.artifact.name,mimeType:prepared.artifact.type,status:'pending'};
 host=signatureSourceRetention(owner,digest,{ownerReceizId:owner,assertOpen(){currentChecks++;},lock:async run=>run(),read:async()=>checkpoint,write:async(next,previous)=>{expect(previous).toEqual(checkpoint);writes++;if(checkpointStorage==='quota')throw new DOMException('Host creation checkpoint is full','QuotaExceededError');checkpoint=structuredClone(next);}},()=>{currentChecks++;});
 let creationState:AssetPublicationState|null=null,creationWrites=0;
 const creation=assetPublication.createAssetPublication({ownerReceizId:owner,assertOpen(){currentChecks++;},lock:async run=>run(),read:async()=>creationState,write:async(next,previous)=>{expect(previous).toEqual(creationState);creationWrites++;if(checkpointStorage==='receipt-quota'&&creationWrites>1)throw new DOMException('Host receipt checkpoint is full','QuotaExceededError');creationState=structuredClone(next);},seal:async()=>prepared.artifact,retain:async()=>digest,restore:async()=>prepared.artifact,readIntent:async()=>({title:'Durable Source before editor checkpoint'}),publish:file=>runtime.publish(file)});
 expect((await creation.create({title:'Durable Source before editor checkpoint'})).publication.status).toBe('published');
 expect(creationWrites).toBe(2);
 const keys=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);
 const credential={credIdB64Url:'AQI',pubKeyPem:`-----BEGIN PUBLIC KEY-----\n${Buffer.from(await crypto.subtle.exportKey('spki',keys.publicKey)).toString('base64')}\n-----END PUBLIC KEY-----`};
 const encode=(bytes:ArrayBuffer|Uint8Array)=>Buffer.from(bytes instanceof Uint8Array?bytes:new Uint8Array(bytes)).toString('base64url');
 let ceremonies=0;
 const receipt=await runtime.publish(prepared.artifact,async(input:any)=>{
  ceremonies++;
  return createLocalPbiAuthorshipProof({input,credential,dependencies:{performAssertion:async({challengeB64Url,credIdB64Url,pubKeyPem})=>{
   const auth=new Uint8Array(37);auth.set(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode('receiz.com'))));auth[32]=5;
   const client=new TextEncoder().encode(JSON.stringify({type:'webauthn.get',challenge:challengeB64Url,origin:'https://bankeiz.com',crossOrigin:false})),payload=new Uint8Array(69);payload.set(auth);payload.set(new Uint8Array(await crypto.subtle.digest('SHA-256',client)),37);
   return{credIdB64Url,pubKeyPem,authenticatorDataB64Url:encode(auth),clientDataJSONB64Url:encode(client),signatureB64Url:encode(await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},keys.privateKey,payload))};
  },verifyAssertion:args=>verifyLocalPbiAssertion({...args,policy:{rpId:'receiz.com',originAllowList:['https://bankeiz.com'],requireUP:true,requireUV:true}})}});
 });
 expect(receipt.status).toBe(checkpointStorage==='available'?'pending':'published');expect(finalizations).toBe(checkpointStorage==='available'?1:2);expect(writes).toBe(1);expect(currentChecks).toBeGreaterThan(0);expect(ceremonies).toBe(1);
 expect(signedLocal).toBeDefined();const heldSigned=adoption.admittedAssetPublicationItem(digest,username,uid);expect(heldSigned).toMatchObject({hasPbiSignature:true,pbiReceiptHash:expectedPbi});
 await r.connectedComposer.admitConnectedComposerSource({file:prepared.artifact,ownerReceizId:owner,profileIdentity:uid,username,assertCurrent(){},onLocalAdmission:(unsigned:ConnectedAssetLocalAdmission)=>adoption.retainAssetPublicationAdmission(unsigned,{identityDigest:actor.artifactSha256,accountUid:uid,artwork:unsigned.artwork})});
 expect(adoption.admittedAssetPublicationItem(digest,username,uid)).toMatchObject({hasPbiSignature:true,pbiReceiptHash:expectedPbi,verifyUrl:heldSigned?.verifyUrl});
 let acknowledgmentWrites=0;
 const resume=savedSignaturePublication({host,runtime,source:prepared.artifact,digest,owner,read:()=>checkpoint,write:async(next,previous)=>{expect(previous).toEqual(checkpoint);acknowledgmentWrites++;if(checkpointStorage==='ack-quota')throw new DOMException('Host acknowledgment checkpoint is full','QuotaExceededError');checkpoint=structuredClone(next);}});
 host.flights.clear();
 if(checkpointStorage==='available'){
  const retry=vi.fn(resume),open=openedSignatureRetry({uid,owner,read:()=>checkpoint,resume:retry});
  await open(digest);
  expect(retry).toHaveBeenCalledExactlyOnceWith(digest,true);
  expect((await retry.mock.results[0]!.value)?.status).toBe('published');
  await open(digest);
  expect(retry).toHaveBeenCalledOnce();
 }else expect((await resume(digest,true))?.status).toBe('published');
 expect(finalizations).toBe(2);expect(acknowledgmentWrites).toBe(1);expect(ceremonies).toBe(1);
 expect(new Uint8Array(await prepared.artifact.arrayBuffer())).toEqual(exact);
 const complete=await acceptedHead.readCompleteSource(),child=complete.children.at(-1)!;
 const opened=await r.openPayload({fileBytes:child.exactSealedArtifactBytes,filename:'signed-original.receizbundle',mime:'application/vnd.receiz.bundle+json',signatureV4RootPublicKeys:roots});
 expect(opened.ok).toBe(true);expect(new TextDecoder().decode(opened.payloadBytes)).toContain(expectedPbi);
 const sealsBeforeCold=sealDocument.mock.calls.length,cold=await f.reloadRuntime();
 const forbidden=vi.fn(async()=>{throw Error('COLD_SAVED_PROOF_TRANSPORT_OR_SEAL_FORBIDDEN');});
 const reopened=await cold.connectedComposer.createConnectedAssetPublicationRuntime({identity:new Uint8Array(f.identity.bytes),passphrase:f.identity.phrase,account:{uid,username},assertCurrent(){},fetchImpl:forbidden,sealDocument:forbidden});
 expect(await reopened.readSignedSource(prepared.artifact)).toEqual({pbiReceiptHash:expectedPbi});expect(forbidden).not.toHaveBeenCalled();expect(sealDocument).toHaveBeenCalledTimes(sealsBeforeCold);expect(ceremonies).toBe(1);
},60000);

it.each(['creating', 'recovering', 'missing its display row', 'continuing after a checkpoint read fails'] as const)('resumes retained PBI even when the same Source is %s', async phase => {
 const path = new URL('../src/receiz/native-identity.ts', import.meta.url);
 const file = ts.createSourceFile(path.pathname, readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true);
 let statement = '';
 function find(node: ts.Node) {
  if (ts.isFunctionDeclaration(node) && node.name?.text === 'startAssetSignatureSync') statement = node.getText(file);
  ts.forEachChild(node, find);
 }
 find(file);
 expect(statement).toBeTruthy();
 statement = statement.replace(/import\('\.(\/[^']+)'\)/g, "modules['.$1']");
 const compiled = ts.transpileModule(statement, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
 const digest = 'a'.repeat(64), owner = 'artist.receiz.id', account = 'account-id';
 const preparedUsername = vi.fn(async () => 'artist');
 const resumeSignature = vi.fn(async () => {
  if (phase !== 'creating') expect(preparedUsername).toHaveBeenCalledOnce();
  return null;
 }), resumeSource = vi.fn(async () => undefined);
 const pendingSignatures = vi.fn((identityDigest: string, accountUid: string, username?: string) =>
  phase !== 'missing its display row' && identityDigest === digest && accountUid === account && (username === undefined || username === 'artist') ? [digest] : []);
 const modules = {
  './asset-publication-adoption': {
   retainedAssetPublicationDigests: () => [],
   pendingAssetPublicationSignatures: pendingSignatures,
   hasObservedAssetPublicationSignature: () => false,
  },
  './asset-publication': {
   readPendingAssetPublicationDigests: (_saved: unknown, _owner: string, _limit: number, after?: string) => after || phase === 'continuing after a checkpoint read fails' ? [] : [digest],
   isAssetPublicationDeliveryActive: () => false,
   readPendingAssetSignatureSources: (state: unknown) => state ? [{sourceDigest:digest,pbiReceiptHash:'e'.repeat(64)}] : [],
  },
  './identity-vault': Promise.resolve({ loadAssetPublicationState: async () => {
   if (phase === 'continuing after a checkpoint read fails') throw Error('CHECKPOINT_READ_FAILED');
   return phase === 'missing its display row' ? { sourceDigest: digest } : null;
  } }),
 };
 const run = new Function('modules', 'lifetime', 'binding', 'accountUid', 'presentationUsername', 'confirmedUsername', 'prepareReceivingUsername', 'createAsset', 'publishAssetSignature', `
  let assetSignatureSync;
  const navigator = { onLine: true }, publicAccountUsername = value => value, noteOpen = () => {};
  ${compiled}
  return source => { startAssetSignatureSync(source); return assetSignatureSync; };
 `)(modules, new AbortController(), { artifactOwnerReceizId: owner, artifactSha256: digest }, account,
  phase === 'creating' ? 'artist' : 'receiz_saved_device_name', phase === 'creating' ? 'artist' : null,
  preparedUsername, resumeSource, resumeSignature);
 await run(phase === 'creating' ? digest : undefined);
 expect(resumeSource).toHaveBeenCalledTimes(phase === 'creating' || phase === 'continuing after a checkpoint read fails' ? 0 : 1);
 expect(preparedUsername).toHaveBeenCalledTimes(phase === 'creating' ? 0 : 1);
 expect(pendingSignatures).toHaveBeenCalledExactlyOnceWith(digest, account);
 expect(resumeSignature).toHaveBeenCalledExactlyOnceWith(digest, true);
});

it('retries only the opened pending signature, joins overlapping opens, and stops after the exact acknowledgment',async()=>{
 const digest='a'.repeat(64),pbiReceiptHash='b'.repeat(64),owner='artist.receiz.id';
 let saved:AssetPublicationState={schema:'bank.asset-publication.v1',ownerReceizId:owner,sourceDigest:digest,intentDigest:'c'.repeat(64),filename:'held.receiz',mimeType:'application/json',status:'pending',pbiReceiptHash};
 const read=vi.fn(()=>saved);
 const resume=vi.fn(async()=>undefined);
 const opened=openedSignatureRetry({uid:'account-id',owner,read,resume});
 const first=opened(digest);
 expect(opened(digest)).toBe(first);
 await first;
 expect(resume).toHaveBeenCalledExactlyOnceWith(digest,true);
 await opened('e'.repeat(64));
 expect(resume).toHaveBeenCalledOnce();
 saved={...saved,status:'published',receipt:{status:'published',artifactDigest:'f'.repeat(64),operationCount:1,visibleChildCount:1},pbiDeliveryReceiptHash:pbiReceiptHash};
 await opened(digest);
 expect(resume).toHaveBeenCalledOnce();
 const offline=openedSignatureRetry({uid:'account-id',owner,read,resume,online:false});
 read.mockClear();
 await offline(digest);
 expect(read).not.toHaveBeenCalled();
});

it('opens a held native receipt when both indexes are missing and leaves an unsigned Original alone',async()=>{
 const owner='artist.receiz.id',digest='a'.repeat(64),source={digest,composerOriginal:true as const,bytes:new Uint8Array([1,2,3]),filename:'held.receiz'};
 const readNative=vi.fn<()=>Promise<unknown>>().mockResolvedValueOnce(null).mockResolvedValueOnce({pbiReceiptHash:'b'.repeat(64)});
 const resume=vi.fn(async()=>undefined);
 const opened=openedSignatureRetry({uid:'account-id',owner,read:()=>null,resume,readNative});
 await opened(digest,source);
 expect(resume).not.toHaveBeenCalled();
 await opened(digest,source);
 expect(resume).toHaveBeenCalledExactlyOnceWith(digest,true);
 expect(readNative).toHaveBeenCalledTimes(2);
});
