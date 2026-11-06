import {
 REGISTRY_MAX_PROOF_BYTES,REGISTRY_NATIVE_PART_BYTES,REGISTRY_NATIVE_PART_NAMESPACE,REGISTRY_NATIVE_INDEX_NAMESPACE,
 registryNativePartId,registryNativeIndexId,registryNativeSourceUrl,
 type RegistryPublicationPlan,type RegistryInstitutionState,type RegistryOriginalPart,type RegistryOriginalIndex,
} from './types';
import type {ReceizPublicStoreSignedPublish,ReceizKeyFile} from '@receiz/sdk';

type PublisherSdk=Pick<typeof import('@receiz/sdk'),'verifyReceizArtifact'|'createReceizArtifactAdmissionEngine'|'readReceizIdentityPublicBinding'|'readReceizIdentityArtifact'|'verifyReceizIdentityLoginProof'|'createReceizClient'>;
export interface RegistryPublisherIdentity {bytes:Uint8Array;phrase:string;readConsent:boolean;}
export interface RegistryPublisherJournal {load(key:string):Promise<unknown>;save(key:string,value:unknown):Promise<void>;}
export interface RegistryPublisherPorts {
 sdk?:()=>Promise<PublisherSdk>;
 identitySource?:()=>Promise<RegistryPublisherIdentity|null>;
 fetch?:typeof fetch;
 journal?:RegistryPublisherJournal;
}
export interface RegistryPublishInput {institutionId:string;bytes:Uint8Array;plan:RegistryPublicationPlan;expectedPublisherReceizId?:string;onStatus?:(message:string)=>void;}
export class RegistryPublicationError extends Error {
 constructor(readonly code:string,message:string,readonly uncertain=false){super(message);this.name='RegistryPublicationError';}
}
interface Step {signed:ReceizPublicStoreSignedPublish;confirmed:boolean;}
interface TransportAddress {id:string;nonce:string;}
interface Intent {schema:'bank.registry.publish-intent.v3';institutionId:string;artifactSha256:string;credentialHolderReceizId:string;publisherReceizId:string;publisherKeyId:string;plan:RegistryPublicationPlan;parts:TransportAddress[];index:TransportAddress;steps:Record<string,Step>;}
const utf8=new TextEncoder(),hashPattern=/^[a-f0-9]{64}$/,MAX_ENVELOPE=2*1024*1024;
const identityRequired=()=>new RegistryPublicationError('REGISTRY_IDENTITY_REQUIRED','Open your existing Receiz Identity Record on this device, then retry this Original.');
const fail=(code:string,message:string,uncertain=false):never=>{throw new RegistryPublicationError(code,message,uncertain);};
const sha=async(bytes:Uint8Array)=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new Uint8Array(bytes)))].map(value=>value.toString(16).padStart(2,'0')).join('');
const canonical=(value:unknown):string=>JSON.stringify(value,(_key,item)=>item&&typeof item==='object'&&!Array.isArray(item)?Object.fromEntries(Object.keys(item).sort().map(key=>[key,item[key]])):item);
const equalBytes=(a:Uint8Array,b:Uint8Array)=>a.length===b.length&&a.every((value,index)=>value===b[index]);
function encode(bytes:Uint8Array){let text='';for(let at=0;at<bytes.length;at+=0x8000)text+=String.fromCharCode(...bytes.subarray(at,at+0x8000));return btoa(text).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
function decodeText(value:string){return new TextDecoder().decode(Uint8Array.from(atob(value.replace(/-/g,'+').replace(/_/g,'/')),value=>value.charCodeAt(0)));}
function snapshot(value:RegistryPublisherIdentity|null):RegistryPublisherIdentity {
 if(!value?.readConsent||!(value.bytes instanceof Uint8Array)||!value.bytes.length||value.bytes.length>32*1024*1024||typeof value.phrase!=='string')throw identityRequired();
 return{bytes:new Uint8Array(value.bytes),phrase:value.phrase,readConsent:true};
}
async function savedIdentity(){const saved=await(await import('../receiz/identity-vault')).loadDeviceIdentity();return saved?.readConsent?{bytes:saved.bytes,phrase:saved.phrase,readConsent:true}:null;}
function cacheJournal():RegistryPublisherJournal {
 let held:Promise<Cache>|undefined;
 const cache=()=>held??=(async()=>{if(!globalThis.caches)throw Error('CACHE_UNAVAILABLE');return globalThis.caches.open('bankeiz-registry-publication-v1');})();
 const path=(key:string)=>'/registry/native/pending/'+encodeURIComponent(key);
 return{load:async key=>{const response=await(await cache()).match(path(key));return response?response.json():null;},save:async(key,value)=>{await(await cache()).put(path(key),new Response(JSON.stringify(value),{headers:{'Content-Type':'application/json'}}));}};
}
function validAddresses(intent:Intent){
 const valid=(address:TransportAddress|undefined)=>!!address&&typeof address.nonce==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(address.nonce);
 if(!Array.isArray(intent.parts)||intent.parts.length!==intent.plan.partCount||!valid(intent.index))return false;
 return intent.parts.every((part,index)=>valid(part)&&part.id===registryNativePartId(intent.institutionId,intent.artifactSha256,index,intent.publisherKeyId,part.nonce))&&intent.index.id===registryNativeIndexId(intent.institutionId,intent.artifactSha256,intent.publisherKeyId,intent.index.nonce)&&new Set([...intent.parts.map(part=>part.nonce),intent.index.nonce]).size===intent.parts.length+1;
}
function samePlan(a:RegistryPublicationPlan,b:RegistryPublicationPlan){return a.originalBytes===b.originalBytes&&a.partCount===b.partCount&&canonical({...a.publication,acceptedAt:''})===canonical({...b.publication,acceptedAt:''});}
function returnedEntry(value:unknown,plan:RegistryPublicationPlan):value is RegistryInstitutionState {
 const entry=value as RegistryInstitutionState;
 return !!entry&&entry.institutionId===plan.publication.institutionId&&Number.isSafeInteger(entry.revision)&&entry.revision>=1&&Array.isArray(entry.history)&&entry.history.length===entry.revision-1&&[entry.current,...entry.history].some(record=>record?.artifactSha256===plan.publication.artifactSha256&&record.holderReceizId===plan.publication.holderReceizId&&record.name===plan.publication.name&&record.scope===plan.publication.scope&&record.evidenceSha256===plan.publication.evidenceSha256&&record.implementationBuildSha256===plan.publication.implementationBuildSha256);
}
async function admittedPublisher(ports:RegistryPublisherPorts){
 const readIdentity=ports.identitySource??savedIdentity;
 let identity:RegistryPublisherIdentity;
 try{identity=snapshot(await readIdentity());}catch{throw identityRequired();}
 const sdk=await(ports.sdk??(()=>import('@receiz/sdk')))();
 let owner:Awaited<ReturnType<PublisherSdk['readReceizIdentityPublicBinding']>>,keyFile:ReceizKeyFile;
 try{
  const verified=await sdk.verifyReceizArtifact(identity.bytes);if(verified.status!=='verified-artifact')throw identityRequired();
  const admission=await sdk.createReceizArtifactAdmissionEngine()(verified,{profile:'identity',identityPassphrase:identity.phrase});
  owner=await sdk.readReceizIdentityPublicBinding(admission);keyFile=await sdk.readReceizIdentityArtifact(identity.bytes);
  if(!owner.signatureVerified||!owner.artifactOwnerReceizId||owner.keyId!==keyFile.keyId||owner.publicKeyRawB64u!==keyFile.crypto.publicKeyRawB64u||owner.alg!==keyFile.alg)throw identityRequired();
 }catch{throw identityRequired();}
 let selected:RegistryPublisherIdentity;
 try{selected=snapshot(await readIdentity());}catch{return fail('REGISTRY_IDENTITY_CHANGED','The selected device identity changed. Check the publisher again before continuing.');}
 if(selected.phrase!==identity.phrase||!equalBytes(selected.bytes,identity.bytes))return fail('REGISTRY_IDENTITY_CHANGED','The selected device identity changed. Check the publisher again before continuing.');
 return{identity,readIdentity,sdk,owner,keyFile};
}
/** Read-only explicit preview. No signer, publication client, journal or network
 * operation is opened, and only the genuinely admitted public binding escapes. */
export async function inspectRegistryPublisher(ports:RegistryPublisherPorts={}):Promise<{receizId:string;keyId:string}>{
 const {owner,keyFile}=await admittedPublisher(ports);
 return{receizId:owner.artifactOwnerReceizId,keyId:keyFile.keyId};
}
/** Explicit publication only. The existing Identity Record stays inside this
 * device closure; the transport and retry journal receive public SDK envelopes.
 * The server's canonical Original verification supplies conformance admission. */
export async function publishRegistryOriginal(input:RegistryPublishInput,ports:RegistryPublisherPorts={}):Promise<RegistryInstitutionState>{
 const bytes=new Uint8Array(input.bytes),plan=structuredClone(input.plan),publication=plan?.publication;
 if(!/^[a-z0-9][a-z0-9-]{0,79}$/.test(input.institutionId)||!publication||publication.schema!=='bank.registry.publication.v1'||publication.institutionId!==input.institutionId||publication.scope!=='Public integration contract'||typeof publication.holderReceizId!=='string'||!publication.holderReceizId||!hashPattern.test(publication.artifactSha256)||plan.originalBytes!==bytes.length||!bytes.length||bytes.length>REGISTRY_MAX_PROOF_BYTES||plan.partCount!==Math.ceil(bytes.length/REGISTRY_NATIVE_PART_BYTES))return fail('REGISTRY_PLAN_INVALID','The verified publication plan does not match this institution and Original.');
 if(await sha(bytes)!==publication.artifactSha256)return fail('REGISTRY_SOURCE_CHANGED','The Original changed after verification. Choose the exact verified Original again.');
 input.onStatus?.('Verifying your existing device identity…');
 const {identity,readIdentity,sdk,owner,keyFile}=await admittedPublisher(ports);
 if(input.expectedPublisherReceizId!==undefined&&input.expectedPublisherReceizId!==owner.artifactOwnerReceizId)return fail('REGISTRY_PUBLISHER_CHANGED','The selected publisher changed. Check the publisher again before publishing this Original.');
 let indexRequested=false;
 const current=async()=>{let selected;try{selected=snapshot(await readIdentity());}catch{return fail('REGISTRY_IDENTITY_CHANGED','The selected device identity changed. Reopen the same publishing identity before continuing.',indexRequested);}if(selected.phrase!==identity.phrase||!equalBytes(selected.bytes,identity.bytes))return fail('REGISTRY_IDENTITY_CHANGED','The selected device identity changed. Reopen the same publishing identity before continuing.',indexRequested);};
 await current();
 const fetcher=ports.fetch??fetch,journal=ports.journal??cacheJournal(),intentKey=`bank.registry.intent.v3:${input.institutionId}:${publication.artifactSha256}:${encodeURIComponent(keyFile.keyId)}`;
 let intent:Intent,loaded:unknown;
 try{loaded=await journal.load(intentKey);}catch{return fail('REGISTRY_PUBLICATION_STORAGE_REQUIRED','Allow this device to retain the public publication intent, then retry. No private Identity Record is stored in that intent.');}
 await current();
 if(loaded!==null&&loaded!==undefined){
  const candidate=loaded as Intent;
  if(candidate.schema!=='bank.registry.publish-intent.v3'||candidate.institutionId!==input.institutionId||candidate.artifactSha256!==publication.artifactSha256||candidate.credentialHolderReceizId!==publication.holderReceizId||candidate.publisherReceizId!==owner.artifactOwnerReceizId||candidate.publisherKeyId!==keyFile.keyId||!candidate.plan||!samePlan(candidate.plan,plan)||!validAddresses(candidate)||!candidate.steps||typeof candidate.steps!=='object'||Array.isArray(candidate.steps)||Object.keys(candidate.steps).some(id=>![...candidate.parts.map(part=>part.id),candidate.index.id].includes(id)))return fail('REGISTRY_PUBLICATION_INTENT_INVALID','The retained publication intent does not match this Original and its publishing identity. Inspect the public Registry record before retrying.');
  intent=candidate;
  indexRequested=!!intent.steps[intent.index.id];
  // An explicit retry first reconciles the exact Original. An empty lookup is
  // discovery only and never authorizes a PASS or a different identity.
  try{const response=await fetcher('/api/bank/registry',{headers:{Accept:'application/json'},credentials:'omit',cache:'no-store',signal:AbortSignal.timeout(20000)});const value=await response.json();await current();if(response.ok&&value?.schema==='bank.registry.public.v1'&&Array.isArray(value.records)){const found=value.records.find((entry:unknown)=>returnedEntry(entry,intent.plan));if(found)return found;}}catch(cause){if(cause instanceof RegistryPublicationError)throw cause;}
 }else{
  // Independent unpredictable addresses keep the first public part from
  // revealing the remaining part IDs or the not-yet-published index address.
  const parts=Array.from({length:plan.partCount},(_,index)=>{const nonce=crypto.randomUUID();return{id:registryNativePartId(input.institutionId,publication.artifactSha256,index,keyFile.keyId,nonce),nonce};});
  const nonce=crypto.randomUUID();
  intent={schema:'bank.registry.publish-intent.v3',institutionId:input.institutionId,artifactSha256:publication.artifactSha256,credentialHolderReceizId:publication.holderReceizId,publisherReceizId:owner.artifactOwnerReceizId,publisherKeyId:keyFile.keyId,plan,parts,index:{id:registryNativeIndexId(input.institutionId,publication.artifactSha256,keyFile.keyId,nonce),nonce},steps:{}};
 }
 const save=async()=>{try{await journal.save(intentKey,intent);}catch{return fail('REGISTRY_PUBLICATION_STORAGE_REQUIRED','This device could not retain the public publication intent. Keep the same Original and retry after storage is available.',indexRequested);}await current();};
 // Retain every private-to-this-attempt public transport address before the
 // first signed part can leave this device. No identity secret enters the journal.
 await save();
 const client=sdk.createReceizClient({fetchImpl:async()=>{throw Error('REGISTRY_SIGNER_NETWORK_FORBIDDEN');}});
 async function publish(state:RegistryOriginalPart|RegistryOriginalIndex,id:string,namespace:string,index:boolean){
  await current();let step=intent.steps[id];
  if(step){
   const signed=step.signed;
   let valid=false;
   try{const challenge=JSON.parse(decodeText(signed.identityProof.challengeB64Url));valid=signed.tenantHost==='bankeiz.com'&&signed.merchantReceizId===owner.artifactOwnerReceizId&&signed.identityProof.keyId===keyFile.keyId&&canonical(signed.storeStateRecord)===canonical(state)&&challenge.tenantHost===signed.tenantHost&&challenge.merchantReceizId===signed.merchantReceizId&&canonical(challenge.feed)===canonical(signed.feed)&&challenge.feedDigestSha256Hex===await sha(utf8.encode(canonical(signed.feed)))&&await sdk.verifyReceizIdentityLoginProof({keyFile,challengeB64Url:signed.identityProof.challengeB64Url,signatureB64Url:signed.identityProof.signatureB64Url});}catch{/* Damaged public intent cannot select signing material or a replacement source. */}
   if(!valid)return fail('REGISTRY_PUBLICATION_INTENT_INVALID','The retained signed publication does not match this Original. Inspect the public Registry record before retrying.');
   // An explicit retry may restore a missing public part. Replay its retained
   // envelope unchanged rather than signing another representation or relying
   // on an earlier acknowledgement as proof of current source availability.
  }else{
   const title=state.schema==='receiz.app.bank.registry.original-part.v1'?`${publication.name} · Original part ${state.index+1} of ${state.count}`:`${publication.name} · Conformance record`;
   const signed=await client.publicStore.signPublish({tenantHost:'bankeiz.com',merchantReceizId:owner.artifactOwnerReceizId,storeStateRecord:state as unknown as Record<string,unknown>,keyFile,passphrase:identity.phrase,id,namespace,schema:state.schema,platform:'Reality-Grade Banking',title,sourceUrl:registryNativeSourceUrl(id),idempotencyKey:id});
   await current();step={signed,confirmed:false};intent.steps[id]=step;
  }
  const body=JSON.stringify({signed:step.signed});if(utf8.encode(body).length>MAX_ENVELOPE)return fail('REGISTRY_PUBLICATION_CAPACITY','The signed publication exceeds the native transport capacity. The public record has not been published.');
  // Retain the exact signed envelope before sending. Unknown outcomes are never
  // automatically re-signed; a later explicit retry uses this same envelope.
  await save();await current();if(index)indexRequested=true;
  let response:Response,value:unknown;
  try{response=await fetcher('/api/bank/registry/'+input.institutionId+(index?'':'/parts'),{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},body,credentials:'omit',cache:'no-store',signal:AbortSignal.timeout(60000)});value=await response.json();}catch{return fail('REGISTRY_PUBLICATION_UNCONFIRMED','Publication could not be confirmed. Check the public record or retry this same Original.',true);}
  await current();
  const result=value as {ok?:boolean;entry?:RegistryInstitutionState;message?:string};
  if(!response.ok||result?.ok!==true){const definitive=response.status>=400&&response.status<500&&response.status!==408;return fail(definitive?'REGISTRY_PUBLICATION_REFUSED':'REGISTRY_PUBLICATION_UNCONFIRMED',definitive&&typeof result?.message==='string'&&result.message.length<=500?result.message:'Publication could not be confirmed. Check the public record or retry this same Original.',!definitive);}
  if(index&&!returnedEntry(result.entry,intent.plan))return fail('REGISTRY_PUBLICATION_UNCONFIRMED','Publication could not be confirmed. Check the public record or retry this same Original.',true);
  step.confirmed=true;await save();return result.entry;
 }
 for(let index=0;index<intent.plan.partCount;index++){
  input.onStatus?.(`Publishing Original part ${index+1} of ${intent.plan.partCount}…`);
  const part:RegistryOriginalPart={schema:'receiz.app.bank.registry.original-part.v1',institutionId:input.institutionId,artifactSha256:publication.artifactSha256,index,count:intent.plan.partCount,originalBytes:bytes.length,publisherReceizId:intent.publisherReceizId,publisherKeyId:intent.publisherKeyId,transportNonce:intent.parts[index].nonce,bytesB64u:encode(bytes.subarray(index*REGISTRY_NATIVE_PART_BYTES,(index+1)*REGISTRY_NATIVE_PART_BYTES))};
  await publish(part,intent.parts[index].id,REGISTRY_NATIVE_PART_NAMESPACE,false);
 }
 input.onStatus?.('Publishing the verified conformance record…');
 const index:RegistryOriginalIndex={schema:'receiz.app.bank.registry.original-index.v1',publication:intent.plan.publication,originalBytes:bytes.length,partCount:intent.plan.partCount,publisherReceizId:intent.publisherReceizId,publisherKeyId:intent.publisherKeyId,transportNonce:intent.index.nonce,partIds:intent.parts.map(part=>part.id)};
 const entry=await publish(index,intent.index.id,REGISTRY_NATIVE_INDEX_NAMESPACE,true);await current();
 return entry!;
}
