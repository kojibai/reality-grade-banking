import {createHash} from 'node:crypto';
import type {ReceizClient,ReceizPublicStoreSignedPublish} from '@receiz/sdk';
import {institutionDirectoryRecords,bankeizRecordedConformance,type InstitutionRecord} from '../src/content/institution-scorecard.mjs';
import {canonicalJson} from '../src/conformance/assessment.js';
import {openSealedConformanceEvidenceObject,type SealedConformanceEvidence} from '../src/conformance/receiz-evidence-seal.js';
import {REGISTRY_MAX_PROOF_BYTES,REGISTRY_NATIVE_PART_BYTES,REGISTRY_NATIVE_PART_NAMESPACE,REGISTRY_NATIVE_INDEX_NAMESPACE,registryNativePartId,registryNativeIndexId,registryNativeSourceUrl,type RegistryInstitutionState,type RegistryPublication,type RegistryOriginalPart,type RegistryOriginalIndex} from '../src/registry/types.js';
import {admitRegistryProof,officialRegistryProofUrl,boundedRegistryBytes,type RegistryProofPorts} from './registry-proof.js';

export class RegistryStoreError extends Error {
 constructor(readonly code:string,readonly status=422){super(code);this.name='RegistryStoreError';}
}
const refuse=(code='REGISTRY_NATIVE_SOURCE_INVALID',status=422):never=>{throw new RegistryStoreError(code,status);};
const unconfirmed=():never=>refuse('REGISTRY_NATIVE_PUBLICATION_UNCONFIRMED',503);
export interface RegistryStore {
 list():Promise<RegistryInstitutionState[]>;
 append(record:RegistryPublication,original:Uint8Array):Promise<RegistryInstitutionState>;
 original(institutionId:string,artifactSha256:string):Promise<Uint8Array|null>;
 publishPart(signed:unknown):Promise<void>;
 publishProof(signed:unknown):Promise<RegistryInstitutionState>;
}
export type RegistryNativeClient={appState:Pick<ReceizClient['appState'],'byNamespace'|'byId'>;publicStore:Pick<ReceizClient['publicStore'],'publishSigned'>};
export interface ReceizRegistryStorePorts extends RegistryProofPorts {
 client?:RegistryNativeClient|(()=>Promise<RegistryNativeClient>);
 /** Isolated test directories still use real artifact verification. */
 institutions?:readonly InstitutionRecord[];
}
const digest=(bytes:Uint8Array|string)=>createHash('sha256').update(bytes).digest('hex');
const text=(value:unknown):value is string=>typeof value==='string';
const object=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value);
const idValid=(value:unknown):value is string=>text(value)&&/^[a-z0-9][a-z0-9-]{0,99}$/.test(value);
const hashValid=(value:unknown):value is string=>text(value)&&/^[a-f0-9]{64}$/.test(value);
const publisherValid=(value:unknown):value is string=>text(value)&&/^[A-Za-z0-9][A-Za-z0-9._:@-]{0,159}$/.test(value);
const nonceValid=(value:unknown):value is string=>text(value)&&/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(value);
const same=(a:unknown,b:unknown)=>canonicalJson(a)===canonicalJson(b);
const integer=(value:unknown):value is number=>Number.isSafeInteger(value);
const completeLength=(value:unknown):value is number=>integer(value)&&value>0&&value<=REGISTRY_MAX_PROOF_BYTES;
const keys=(value:Record<string,unknown>,expected:string[])=>Object.keys(value).sort().join('|')===expected.sort().join('|');
const partCount=(length:number)=>Math.ceil(length/REGISTRY_NATIVE_PART_BYTES);
const originalKey=(institutionId:string,sha256:string)=>institutionId+':'+sha256;
function publicRecord(value:unknown):value is RegistryPublication {
 if(!object(value)||!keys(value,['schema','institutionId','name','scope','cases','artifactSha256','evidenceSha256','holderReceizId','implementationBuildSha256','officialProofUrl','acceptedAt','url']))return false;
 const row=value as unknown as RegistryPublication;
 return row.schema==='bank.registry.publication.v1'&&idValid(row.institutionId)&&text(row.name)&&row.name.trim().length>0&&row.name.length<=160&&row.scope==='Public integration contract'&&integer(row.cases)&&row.cases>0&&row.cases<=100&&hashValid(row.artifactSha256)&&hashValid(row.evidenceSha256)&&hashValid(row.implementationBuildSha256)&&text(row.holderReceizId)&&/^[A-Za-z0-9][A-Za-z0-9._:@-]{0,159}$/.test(row.holderReceizId)&&text(row.acceptedAt)&&row.acceptedAt.length<=32&&Number.isFinite(Date.parse(row.acceptedAt))&&row.url===`/api/bank/registry/original/${row.institutionId}/${row.artifactSha256}`&&text(row.officialProofUrl)&&row.officialProofUrl.startsWith('https://');
}
function part(value:unknown):RegistryOriginalPart {
 if(!object(value)||!keys(value,['schema','institutionId','artifactSha256','index','count','originalBytes','publisherReceizId','publisherKeyId','transportNonce','bytesB64u'])||value.schema!=='receiz.app.bank.registry.original-part.v1'||!idValid(value.institutionId)||!hashValid(value.artifactSha256)||!completeLength(value.originalBytes)||!integer(value.count)||value.count!==partCount(value.originalBytes)||!integer(value.index)||value.index<0||value.index>=value.count||!publisherValid(value.publisherReceizId)||!publisherValid(value.publisherKeyId)||!nonceValid(value.transportNonce)||!text(value.bytesB64u))return refuse();
 const expected=Math.min(REGISTRY_NATIVE_PART_BYTES,value.originalBytes-value.index*REGISTRY_NATIVE_PART_BYTES),bytes=decode(value.bytesB64u);
 if(bytes.length!==expected)return refuse();
 return value as unknown as RegistryOriginalPart;
}
function index(value:unknown):RegistryOriginalIndex {
 if(!object(value)||!keys(value,['schema','publication','originalBytes','partCount','publisherReceizId','publisherKeyId','transportNonce','partIds'])||value.schema!=='receiz.app.bank.registry.original-index.v1'||!publicRecord(value.publication)||!completeLength(value.originalBytes)||value.partCount!==partCount(value.originalBytes)||!publisherValid(value.publisherReceizId)||!publisherValid(value.publisherKeyId)||!nonceValid(value.transportNonce)||!Array.isArray(value.partIds)||value.partIds.length!==value.partCount)return refuse();
 const manifest=value as unknown as RegistryOriginalIndex;
 const nonces=manifest.partIds.map((id,position)=>partReferenceNonce(id,manifest,position));
 if(new Set([...nonces,manifest.transportNonce]).size!==nonces.length+1)return refuse();
 return manifest;
}
function partReferenceNonce(id:unknown,manifest:RegistryOriginalIndex,position:number){
 if(!text(id))return refuse();
 const prefix=`bank.registry.part.v2:${manifest.publication.institutionId}:${manifest.publication.artifactSha256}:${encodeURIComponent(manifest.publisherKeyId)}:`;
 if(!id.startsWith(prefix))return refuse();
 const [nonce,at,...extra]=id.slice(prefix.length).split(':');
 if(extra.length||!nonceValid(nonce)||at!==String(position)||id!==registryNativePartId(manifest.publication.institutionId,manifest.publication.artifactSha256,position,manifest.publisherKeyId,nonce))return refuse();
 return nonce;
}
function sameOriginalIndex(a:RegistryOriginalIndex,b:RegistryOriginalIndex){
 // A fresh preparation of an already-published Original may have a new display
 // time. Its exact source identity is unchanged; keep its first publication.
 return same({...a,publication:{...a.publication,acceptedAt:null}},{...b,publication:{...b.publication,acceptedAt:null}});
}
function decode(value:string):Uint8Array {
 if(value.length>Math.ceil(REGISTRY_NATIVE_PART_BYTES*4/3)+4||!value.length||!/^[A-Za-z0-9_-]+$/.test(value))return refuse();
 const bytes=new Uint8Array(Buffer.from(value,'base64url'));
 if(Buffer.from(bytes).toString('base64url')!==value)return refuse();
 return bytes;
}
function coordinates(payload:RegistryOriginalPart|RegistryOriginalIndex){
 return payload.schema==='receiz.app.bank.registry.original-part.v1'?{id:registryNativePartId(payload.institutionId,payload.artifactSha256,payload.index,payload.publisherKeyId,payload.transportNonce),namespace:REGISTRY_NATIVE_PART_NAMESPACE}:{id:registryNativeIndexId(payload.publication.institutionId,payload.publication.artifactSha256,payload.publisherKeyId,payload.transportNonce),namespace:REGISTRY_NATIVE_INDEX_NAMESPACE};
}
function projected(row:unknown,expectedId:string,namespace:string):Record<string,unknown>|null {
 if(row===null||row===undefined)return null;
 if(!object(row)||row.id!==expectedId&&row.appObjectId!==expectedId||row.sourceUrl!==registryNativeSourceUrl(expectedId)||(row.namespace??row.appNamespace)!==namespace||row.schema===undefined||row.state!=='published'||!object(row.data)||!object(row.data.storeStateRecord)||row.data.tenantHost!=='bankeiz.com'||!text(row.data.merchantReceizId))return refuse();
 if(row.schema!==row.data.storeStateRecord.schema||row.data.merchantReceizId!==row.data.storeStateRecord.publisherReceizId||row.externalCreatorId!==undefined&&row.externalCreatorId!==row.data.storeStateRecord.publisherReceizId)return refuse();
 return row.data.storeStateRecord;
}
/** Pure transport validation is followed by real SDK signature verification.
 * Neither a matching envelope nor a public projection supplies conformance. */
async function signedEnvelope(input:unknown,kind:'part'|'index'){
 let serialized:string;
 try{serialized=canonicalJson(input);}catch{return refuse();}
 if(!text(serialized)||Buffer.byteLength(serialized)>2*1024*1024)return refuse('REGISTRY_NATIVE_SOURCE_INVALID',413);
 if(!object(input)||!keys(input,['schema','tenantHost','merchantReceizId','feed','identityProof','storeStateRecord'])||input.schema!=='receiz.public_store.signed_publish.v1'||input.tenantHost!=='bankeiz.com'||!text(input.merchantReceizId)||!/^[A-Za-z0-9][A-Za-z0-9._:@-]{0,159}$/.test(input.merchantReceizId)||!object(input.feed)||!Array.isArray(input.feed.records)||input.feed.records.length!==1||!object(input.identityProof))return refuse();
 const payload=kind==='part'?part(input.storeStateRecord):index(input.storeStateRecord),where=coordinates(payload),feed=input.feed,row=(feed.records as unknown[])[0];
 if(payload.publisherReceizId!==input.merchantReceizId||payload.publisherKeyId!==input.identityProof.keyId)return refuse('REGISTRY_NATIVE_AUTHORIZATION_REQUIRED',403);
 if(!keys(feed,['schema','namespace','externalCreatorId','records'])||feed.schema!=='receiz.app.public_store_state_registry_feed.v1'||feed.namespace!==where.namespace||feed.externalCreatorId!==input.merchantReceizId||!object(row)||!keys(row,['id','sourceUrl','externalCreatorId','title','namespace','state','platform','schema','record','data'])||row.id!==where.id||row.sourceUrl!==registryNativeSourceUrl(where.id)||row.namespace!==where.namespace||row.externalCreatorId!==input.merchantReceizId||row.schema!==payload.schema||row.state!=='published'||!text(row.title)||row.title.length>256||!text(row.platform)||row.platform.length>256||!object(row.data)||!keys(row.data,['storeStateRecord','tenantHost','merchantReceizId'])||row.data.tenantHost!=='bankeiz.com'||row.data.merchantReceizId!==input.merchantReceizId||!same(row.data.storeStateRecord,payload)||!same(row.record,payload))return refuse();
 const proof=input.identityProof,feedDigest=digest(canonicalJson(feed)),challenge={schema:'receiz.public_store.publish_challenge.v1',tenantHost:'bankeiz.com',merchantReceizId:input.merchantReceizId,feedDigestSha256Hex:feedDigest,feed};
 if(!keys(proof,['schema','keyId','alg','publicKeyRawB64u','challenge','challengeB64Url','signatureB64Url','signedAt','tenantHost','merchantReceizId','feedDigestSha256Hex'])||proof.schema!=='receiz.public_store.identity_publish_proof.v1'||proof.tenantHost!=='bankeiz.com'||proof.merchantReceizId!==input.merchantReceizId||proof.feedDigestSha256Hex!==feedDigest||!same(proof.challenge,challenge)||!text(proof.challengeB64Url)||!text(proof.signatureB64Url)||!text(proof.keyId)||!text(proof.publicKeyRawB64u)||!text(proof.signedAt)||proof.signedAt.length>32||!Number.isFinite(Date.parse(proof.signedAt))||!['Ed25519','P-256'].includes(String(proof.alg)))return refuse('REGISTRY_NATIVE_AUTHORIZATION_REQUIRED',403);
 let valid=false;
 try{
  const challengeText=Buffer.from(proof.challengeB64Url,'base64url').toString('utf8');
  if(challengeText!==canonicalJson(challenge))return refuse('REGISTRY_NATIVE_AUTHORIZATION_REQUIRED',403);
  valid=await(await import('@receiz/sdk')).verifyReceizIdentityPublicKeyProjectionSignature({keyId:proof.keyId,alg:proof.alg as 'Ed25519'|'P-256',publicKeyRawB64u:proof.publicKeyRawB64u,challengeB64Url:proof.challengeB64Url,signatureB64Url:proof.signatureB64Url});
 }catch{return refuse('REGISTRY_NATIVE_AUTHORIZATION_REQUIRED',403);}
 if(!valid)return refuse('REGISTRY_NATIVE_AUTHORIZATION_REQUIRED',403);
 return{signed:JSON.parse(serialized) as ReceizPublicStoreSignedPublish,payload,where,merchantReceizId:input.merchantReceizId};
}

/** Receiz distributes exact Originals. Admission remains beneath those bytes.
 * This adapter holds no private key, token, file database or alternate signer. */
export function createReceizRegistryStore(ports:ReceizRegistryStorePorts={}):RegistryStore {
 const institutions=ports.institutions??institutionDirectoryRecords;
 const institution=(id:string)=>institutions.find(value=>value.id===id)??refuse();
 let loaded:Promise<RegistryNativeClient>|undefined;
 const client=()=>loaded??=typeof ports.client==='function'?ports.client():ports.client?Promise.resolve(ports.client):import('@receiz/sdk').then(sdk=>sdk.createReceizClient({fetchImpl:(input,init)=>fetch(input,{...init,credentials:'omit',redirect:'error',signal:AbortSignal.timeout(20000)})}));
 const admitted=new Map<string,Map<string,RegistryPublication>>(),selected=new Map<string,string>(),indexes=new Map<string,RegistryOriginalIndex[]>(),verifiedGraphs=new Set<string>();
 const pendingAdmissions=new Map<string,{manifest:RegistryOriginalIndex;publication:RegistryPublication}>();
 const verified=new Map<string,Promise<SealedConformanceEvidence>>(),originals=new Map<string,Uint8Array>();let cachedBytes=0;
 const cache=(hash:string,bytes:Uint8Array)=>{
  const prior=originals.get(hash);if(prior){originals.delete(hash);cachedBytes-=prior.length;}
  originals.set(hash,new Uint8Array(bytes));cachedBytes+=bytes.length;
  while(cachedBytes>32*1024*1024){const first=originals.keys().next().value;if(!first)break;cachedBytes-=originals.get(first)!.length;originals.delete(first);}
 };
 const open=async(bytes:Uint8Array)=>{
  const hash=digest(bytes);let held=verified.get(hash);
  if(!held){held=(ports.openProof??openSealedConformanceEvidenceObject)(bytes);verified.set(hash,held);void held.catch(()=>{if(verified.get(hash)===held)verified.delete(hash);});}
  else{verified.delete(hash);verified.set(hash,held);}
  while(verified.size>8){const first=verified.keys().next().value;if(!first)break;verified.delete(first);}
  return held;
 };
 const remember=(manifest:RegistryOriginalIndex,publication:RegistryPublication,bytes:Uint8Array)=>{
  const {institutionId,artifactSha256}=publication;let records=admitted.get(institutionId);if(!records){records=new Map();admitted.set(institutionId,records);}
  if(!records.has(artifactSha256))records.set(artifactSha256,structuredClone(publication));
  const key=originalKey(institutionId,artifactSha256),copies=indexes.get(key)??[];
  if(!copies.some(copy=>coordinates(copy).id===coordinates(manifest).id))copies.push(structuredClone(manifest));
  indexes.set(key,copies);cache(artifactSha256,bytes);
 };
 const state=(id:string):RegistryInstitutionState|null=>{
  const records=admitted.get(id);if(!records?.size)return null;
  const list=[...records.values()],preferred=selected.get(id),known=id==='bankeiz'?bankeizRecordedConformance.artifactSha256:undefined;
  const current=list.find(record=>record.artifactSha256===known)??list.find(record=>record.artifactSha256===preferred)??list.sort((a,b)=>a.artifactSha256.localeCompare(b.artifactSha256))[0];
  selected.set(id,current.artifactSha256);
  return{institutionId:id,revision:records.size,current:structuredClone(current),history:list.filter(record=>record.artifactSha256!==current.artifactSha256).sort((a,b)=>a.artifactSha256.localeCompare(b.artifactSha256)).map(record=>structuredClone(record))};
 };
 const read=async(id:string,namespace:string)=>{
  let response;
  try{response=await(await client()).appState.byId(id);}catch(cause){if(object(cause)&&cause.status===404)return null;return unconfirmed();}
  if(!response||response.ok!==true)return unconfirmed();
  return projected(response.record,id,namespace);
 };
 const reconstruct=async(manifest:RegistryOriginalIndex)=>{
  const record=manifest.publication,graph=coordinates(manifest).id,held=originals.get(record.artifactSha256);
  if(held&&verifiedGraphs.has(graph)){cache(record.artifactSha256,held);return new Uint8Array(held);}
  const parts:Uint8Array[]=[];
  // Bound simultaneous native reads while preserving exact source order.
  for(let offset=0;offset<manifest.partCount;offset+=4){
   const batch=await Promise.all(Array.from({length:Math.min(4,manifest.partCount-offset)},async(_,position)=>{
    const at=offset+position,id=manifest.partIds[at],value=await read(id,REGISTRY_NATIVE_PART_NAMESPACE);
    if(!value)return refuse();
    const chunk=part(value);
    if(chunk.institutionId!==record.institutionId||chunk.artifactSha256!==record.artifactSha256||chunk.index!==at||chunk.count!==manifest.partCount||chunk.originalBytes!==manifest.originalBytes||chunk.publisherReceizId!==manifest.publisherReceizId||chunk.publisherKeyId!==manifest.publisherKeyId||chunk.transportNonce!==partReferenceNonce(id,manifest,at)||coordinates(chunk).id!==id)return refuse();
    return decode(chunk.bytesB64u);
   }));parts.push(...batch);
  }
  const bytes=new Uint8Array(manifest.originalBytes);let offset=0;for(const chunk of parts){bytes.set(chunk,offset);offset+=chunk.length;}
  if(offset!==manifest.originalBytes||digest(bytes)!==record.artifactSha256)return refuse();
  verifiedGraphs.add(graph);cache(record.artifactSha256,bytes);return bytes;
 };
 const verifyMetadata=async(manifest:RegistryOriginalIndex,bytes:Uint8Array)=>{
  const expected=manifest.publication,original=await open(bytes),report=original.object.report;
  if(original.artifactSha256!==expected.artifactSha256||report.implementation.name!==institution(expected.institutionId).name||report.scope!=='public-integration-contracts'||!report.assessmentPassed||!original.object.verifiedReport.assessmentPassed||!report.credentialHolder||report.credentialHolder.receizId!==expected.holderReceizId||report.cases.length!==expected.cases||original.object.digest!==expected.evidenceSha256||report.implementation.buildSha256!==expected.implementationBuildSha256||expected.name!==institution(expected.institutionId).name)return refuse();
  return original;
 };
 const admit=async(manifest:RegistryOriginalIndex,bytes:Uint8Array)=>{
  const expected=manifest.publication;
  const actual=await admitRegistryProof(institution(expected.institutionId),bytes,{...ports,openProof:open,now:()=>new Date(expected.acceptedAt)});
  if(!same(actual,expected))return refuse();
  return actual;
 };
 const publish=async(signed:ReceizPublicStoreSignedPublish,id:string)=>{
  let result;
  try{result=await(await client()).publicStore.publishSigned(signed,{idempotencyKey:id});}
  catch(cause){
   // A rejected native request is distinct from a response that was lost after
   // acceptance. Expose only the safe status/code, never an upstream payload.
   if(object(cause)&&integer(cause.status)&&cause.status>=400&&cause.status<500&&cause.status!==408&&cause.status!==429)return refuse('REGISTRY_NATIVE_PUBLICATION_REFUSED',cause.status);
   return unconfirmed();
  }
  if(!result||result.ok!==true)return unconfirmed();
 };
 const store:RegistryStore={
  async append(){return refuse('REGISTRY_PUBLISH_SIGNATURE_REQUIRED',428);},
  async publishPart(input){
   const envelope=await signedEnvelope(input,'part'),payload=envelope.payload as RegistryOriginalPart;institution(payload.institutionId);
   let existing:Record<string,unknown>|null;
   try{existing=await read(envelope.where.id,envelope.where.namespace);}catch(cause){if(cause instanceof RegistryStoreError&&cause.code==='REGISTRY_NATIVE_SOURCE_INVALID')return refuse('REGISTRY_NATIVE_SOURCE_CONFLICT',409);throw cause;}
   if(existing){if(!same(existing,payload))return refuse('REGISTRY_NATIVE_SOURCE_CONFLICT',409);return;}
   await publish(envelope.signed,envelope.where.id);
   let recovered;try{recovered=await read(envelope.where.id,envelope.where.namespace);}catch{return unconfirmed();}
   if(!recovered||!same(recovered,payload))return unconfirmed();
  },
  async publishProof(input){
   const envelope=await signedEnvelope(input,'index');let manifest=envelope.payload as RegistryOriginalIndex;const expected=manifest.publication;
   institution(expected.institutionId);
   let existing;try{existing=await read(envelope.where.id,envelope.where.namespace);}catch(cause){if(cause instanceof RegistryStoreError&&cause.code==='REGISTRY_NATIVE_SOURCE_INVALID')return refuse('REGISTRY_NATIVE_SOURCE_CONFLICT',409);throw cause;}
   if(existing){const prior=index(existing);if(!sameOriginalIndex(prior,manifest))return refuse('REGISTRY_NATIVE_SOURCE_CONFLICT',409);manifest=prior;}
   // A cold retry of an older accepted proof first recovers the shared current
   // selection and retained same-holder history. Retrying cannot promote it.
   if(existing&&!admitted.get(expected.institutionId)?.has(expected.artifactSha256))await store.list();
   const bytes=await reconstruct(manifest),held=admitted.get(expected.institutionId)?.get(expected.artifactSha256),actual=held??await admit(manifest,bytes);
   if(!existing){
    await publish(envelope.signed,envelope.where.id);
    let recovered;try{recovered=await read(envelope.where.id,envelope.where.namespace);}catch{return unconfirmed();}
    if(!recovered||!same(recovered,manifest))return unconfirmed();
   }
   // Readback of an individual index is necessary, but the new institution
   // result is not public-directory confirmed until lookup also locates it.
   pendingAdmissions.set(envelope.where.id,{manifest,publication:actual});
   while(pendingAdmissions.size>16){const first=pendingAdmissions.keys().next().value;if(!first)break;pendingAdmissions.delete(first);}
   const listing=await store.list(),result=listing.find(entry=>entry.institutionId===expected.institutionId);
   if(!result||![result.current,...result.history].some(record=>record.artifactSha256===expected.artifactSha256))return unconfirmed();
   return result;
  },
  async list(){
   let response;try{response=await(await client()).appState.byNamespace(REGISTRY_NATIVE_INDEX_NAMESPACE);}catch{return unconfirmed();}
   if(!response||response.ok!==true||!Array.isArray(response.records))return unconfirmed();
   const candidates=new Map<string,RegistryOriginalIndex[]>();
   for(const row of response.records){
    try{
     if(!object(row)||!object(row.data))continue;
     const manifest=index(row.data.storeStateRecord),where=coordinates(manifest);
     if(!projected(row,where.id,where.namespace))continue;
     institution(manifest.publication.institutionId);
     if(row.data.merchantReceizId!==manifest.publisherReceizId)continue;
     let group=candidates.get(manifest.publication.institutionId);if(!group){group=[];candidates.set(manifest.publication.institutionId,group);}
     if(!group.some(candidate=>coordinates(candidate).id===where.id))group.push(manifest);
    }catch{/* An untrusted projection cannot erase an admitted Original. */}
   }
   for(const[id,group]of candidates){
    for(const manifest of group){
     const where=coordinates(manifest),pending=pendingAdmissions.get(where.id);
     if(!pending||!sameOriginalIndex(pending.manifest,manifest))continue;
     const already=admitted.get(id)?.has(manifest.publication.artifactSha256)??false;
     try{
      const bytes=await reconstruct(manifest);
      remember(pending.manifest,pending.publication,bytes);
      if(!already)selected.set(id,pending.publication.artifactSha256);
      pendingAdmissions.delete(where.id);
     }catch(cause){if(cause instanceof RegistryStoreError&&cause.code==='REGISTRY_NATIVE_PUBLICATION_UNCONFIRMED')throw cause;}
    }
    const fresh=group.filter(manifest=>!admitted.get(id)?.has(manifest.publication.artifactSha256));
    if(!fresh.length)continue;
    let currentHash:string|undefined,currentHolder:string|undefined;
    if(id==='bankeiz')currentHolder=bankeizRecordedConformance.holderReceizId;
    else {
     try{
      const signal=AbortSignal.timeout(15000),response=await(ports.fetch??fetch)(officialRegistryProofUrl(institution(id)),{credentials:'omit',redirect:'error',cache:'no-store',headers:{Accept:'image/png'},signal});
      if(!response.ok){await response.body?.cancel();continue;}
      const officialBytes=await boundedRegistryBytes(response.body,signal);currentHash=digest(officialBytes);
      const expectedUrl=officialRegistryProofUrl(institution(id));let acceptedCurrent=false;
      for(const manifest of group.filter(value=>value.publication.artifactSha256===currentHash)){
       try{
        if(manifest.publication.officialProofUrl!==expectedUrl)continue;
        // The official site establishes institution association only. A public
        // Registry PASS also requires the complete native-distributed Original;
        // official bytes must never fill missing or corrupt native parts.
        const nativeBytes=await reconstruct(manifest);await verifyMetadata(manifest,nativeBytes);
        currentHolder=manifest.publication.holderReceizId;
        const already=admitted.get(id)?.has(currentHash)??false;
        remember(manifest,manifest.publication,nativeBytes);
        if(!already||!selected.has(id))selected.set(id,currentHash);
        acceptedCurrent=true;break;
       }catch(cause){if(cause instanceof RegistryStoreError&&cause.code==='REGISTRY_NATIVE_PUBLICATION_UNCONFIRMED')throw cause;}
      }
      if(!acceptedCurrent)continue;
     }catch(cause){
      if(cause instanceof RegistryStoreError&&cause.code==='REGISTRY_NATIVE_PUBLICATION_UNCONFIRMED')throw cause;
      // Unavailable official association leaves held accepted proof intact.
      continue;
     }
    }
    for(const manifest of fresh){
     try{
      if(manifest.publication.holderReceizId!==currentHolder)continue;
      const bytes=await reconstruct(manifest);await verifyMetadata(manifest,bytes);
      const expectedUrl=id==='bankeiz'?new URL(manifest.publication.url,'https://bankeiz.com').href:officialRegistryProofUrl(institution(id));
      if(manifest.publication.officialProofUrl!==expectedUrl)continue;
      remember(manifest,manifest.publication,bytes);
     }catch(cause){
      if(cause instanceof RegistryStoreError&&cause.code==='REGISTRY_NATIVE_PUBLICATION_UNCONFIRMED')throw cause;
      // Missing parts or invalid bytes never supply a PASS.
     }
    }
   }
   return [...admitted.keys()].sort().map(id=>state(id)!).filter(Boolean);
  },
  async original(id,hash){
   if(!idValid(id)||!hashValid(hash))return refuse();institution(id);
   if(!admitted.get(id)?.has(hash))await store.list();
   if(!admitted.get(id)?.has(hash))return null;
   const copies=indexes.get(originalKey(id,hash));if(!copies?.length)return null;
   const held=originals.get(hash);if(held){cache(hash,held);return new Uint8Array(held);}
   let failure:unknown;
   for(const manifest of copies){try{return new Uint8Array(await reconstruct(manifest));}catch(cause){failure=cause;}}
   if(failure)throw failure;
   return refuse();
  },
 };
 return store;
}
let defaultStore:RegistryStore|undefined;
export function registryStore():RegistryStore{return defaultStore??=createReceizRegistryStore();}
