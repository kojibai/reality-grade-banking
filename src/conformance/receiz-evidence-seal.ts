import type {ReceizOfflineSealStore,ReceizOfflineSealResources,verifyReceizOfflineSealedFile} from '@receiz/sdk/offline';
import {openConformanceEvidenceObject,bindConformanceEvidenceHolder,type ConformanceEvidenceObject} from './evidence-object.ts';
import {canonicalJson} from './assessment.ts';
import {insertPngTextChunks,readPngTextChunks,stripPngTextChunksByKeyword} from '../../native/receiz/app/utils/pngChunks.ts';
type Offline=Pick<typeof import('@receiz/sdk/offline'),'createReceizIndexedDbSealStore'|'createReceizOfflineSealer'|'verifyReceizOfflineSealedFile'>;
type OwnerSdk=Pick<typeof import('@receiz/sdk'),'verifyReceizArtifact'|'createReceizArtifactAdmissionEngine'|'readReceizIdentityPublicBinding'>;
export type EvidenceVerification=Awaited<ReturnType<typeof verifyReceizOfflineSealedFile>>;
export type EvidenceFile={bytes:Uint8Array;filename:string;mimeType:string};
export type EvidenceIdentitySource={bytes:Uint8Array;phrase:string};
export type EvidenceSealOptions={allowEnrollment?:boolean;identitySource?:()=>Promise<EvidenceIdentitySource|null>;onStatus?:(status:string)=>void};
export type EvidenceOpenPorts={filename?:string;verifyOffline?:(input:EvidenceFile)=>Promise<EvidenceVerification>;openPayload?:(input:EvidenceFile)=>Promise<{bytes:Uint8Array;verification:EvidenceVerification}>};
export type EvidenceSealPorts=EvidenceOpenPorts&{offline?:()=>Promise<Offline>;sdk?:()=>Promise<OwnerSdk>;store?:ReceizOfflineSealStore;resources?:()=>Promise<ReceizOfflineSealResources>;render?:(svg:string)=>Promise<Uint8Array>};
export type SealedConformanceEvidence={bytes:Uint8Array;filename:string;mimeType:'image/png';object:ConformanceEvidenceObject;verification:EvidenceVerification;artifactSha256:string};
export type ConformanceEvidenceWorkspace={credential:SealedConformanceEvidence;holderReceizId:string;stillCurrent:()=>Promise<boolean>};
export class ConformanceEvidenceSealError extends Error{
 readonly code:string;
 constructor(code:string){super(code);this.code=code;this.name='ConformanceEvidenceSealError';}
}
const KEY='bankeiz.conformance.evidence.v1',MAX_BYTES=16*1024*1024,MAX_SOURCE_BYTES=4*1024*1024;
const utf8=new TextEncoder();
const fail=(code:string):never=>{throw new ConformanceEvidenceSealError(code);};
const digest=async(bytes:Uint8Array)=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new Uint8Array(bytes)))].map(value=>value.toString(16).padStart(2,'0')).join('');
const offlineDefault=()=>import('@receiz/sdk/offline');
const sdkDefault=()=>import('@receiz/sdk');
async function savedIdentity():Promise<EvidenceIdentitySource|null>{
 const saved=await(await import('../receiz/identity-vault')).loadDeviceIdentity();
 return saved?.readConsent?{bytes:saved.bytes,phrase:saved.phrase}:null;
}
function snapshotIdentity(source:EvidenceIdentitySource|null):EvidenceIdentitySource{
 if(!source||!(source.bytes instanceof Uint8Array)||!source.bytes.length||source.bytes.length>32*1024*1024||typeof source.phrase!=='string')return fail('CONFORMANCE_IDENTITY_REQUIRED');
 return{bytes:new Uint8Array(source.bytes),phrase:source.phrase};
}
async function signerStore(ports:EvidenceSealPorts,offline:Offline){return ports.store??offline.createReceizIndexedDbSealStore('receiz-bank-canonical-device-signer');}
/** Reads local custody only. Full signer/resource qualification occurs on Save. */
export async function getConformanceEvidenceSealStatus(options:EvidenceSealOptions={},ports:EvidenceSealPorts={}):Promise<{state:'identity-required'|'enrollment-required'|'signer-present'}>{
 if(!await(options.identitySource??savedIdentity)())return{state:'identity-required'};
 const offline=await(ports.offline??offlineDefault)(),store=await signerStore(ports,offline);
 return{state:await store.load()?'signer-present':'enrollment-required'};
}
async function renderSvg(svg:string):Promise<Uint8Array>{return(await import('./evidence-renderer.ts')).renderConformanceEvidencePng(svg);}
async function openPayloadDefault(input:EvidenceFile){
 // This public SDK method verifies and opens locally. Network use is denied.
 const sdk=await sdkDefault(),client=sdk.createReceizClient({fetchImpl:async()=>{throw Error('CONFORMANCE_NETWORK_NOT_PERMITTED');}});
 const opened=await client.artifacts.verifyAndOpen(new File([new Uint8Array(input.bytes)],input.filename,{type:input.mimeType}));
 return{bytes:new Uint8Array(opened.verifiedPayload.bytes),verification:opened.verification as unknown as EvidenceVerification};
}
function continuity(verification:EvidenceVerification){
 const value=verification.assetContinuity;
 if(!value||value.state!=='verified'||value.carrier!=='native_record_seal'||typeof value.ownerReceizId!=='string'||typeof value.artifactId!=='string')return fail('CONFORMANCE_CONTINUITY_REQUIRED');
 return value;
}
/** Offline verification precedes all metadata extraction or transcript opening.
 * CLI callers may supply the same canonical verifier/open ports without DOM or
 * browser custody. No signer, identity store or proving resources are loaded. */
export async function openSealedConformanceEvidenceObject(bytes:Uint8Array,ports:EvidenceOpenPorts={}):Promise<SealedConformanceEvidence>{
 if(!(bytes instanceof Uint8Array)||!bytes.length||bytes.length>MAX_BYTES)return fail('CONFORMANCE_PROOF_CAPACITY');
 const file={bytes:new Uint8Array(bytes),filename:ports.filename??'bankeiz-conformance-evidence.png',mimeType:'image/png'};
 const verification=await(ports.verifyOffline??(async input=>(await offlineDefault()).verifyReceizOfflineSealedFile(input)))(file);
 if(!verification.ok||!verification.integrity.ok||verification.kind!=='png')return fail('CONFORMANCE_PROOF_INVALID');
 const verifiedContinuity=continuity(verification),opened=await(ports.openPayload??openPayloadDefault)(file),openedContinuity=continuity(opened.verification);
 if(!opened.verification.ok||!opened.verification.integrity.ok||openedContinuity.artifactId!==verifiedContinuity.artifactId||openedContinuity.ownerReceizId!==verifiedContinuity.ownerReceizId)return fail('CONFORMANCE_PROOF_INVALID');
 const chunks=readPngTextChunks(opened.bytes,{keyword:KEY,maxCompressedBytes:MAX_SOURCE_BYTES,maxTextBytes:MAX_SOURCE_BYTES});
 if(chunks.length!==1||utf8.encode(chunks[0].text).length>MAX_SOURCE_BYTES)return fail('CONFORMANCE_SOURCE_REQUIRED');
 const source=JSON.parse(chunks[0].text)as {schema?:unknown;svg?:unknown;transcript?:unknown;evidenceDigest?:unknown};
 if(!source||Object.keys(source).sort().join('|')!=='evidenceDigest|schema|svg|transcript'||source.schema!=='bankeiz.conformance.receiz-source.v1'||typeof source.svg!=='string'||typeof source.transcript!=='string')return fail('CONFORMANCE_SOURCE_REQUIRED');
 const object=await openConformanceEvidenceObject(source.svg);
 if(source.evidenceDigest!==object.digest||source.transcript!==canonicalJson(object.report))return fail('CONFORMANCE_SOURCE_CHANGED');
 const holder=object.report.credentialHolder;
 if(!holder||holder.receizId!==verifiedContinuity.ownerReceizId||holder.receizId!==openedContinuity.ownerReceizId)return fail('CONFORMANCE_HOLDER_MISMATCH');
 const image=stripPngTextChunksByKeyword(opened.bytes,KEY).pngBytes;
 if(!await(await import('./evidence-renderer.ts')).verifyConformanceEvidenceArtwork(object.svg,image))return fail('CONFORMANCE_ARTWORK_MISMATCH');
 return{bytes:new Uint8Array(file.bytes),filename:file.filename,mimeType:'image/png',object,verification,artifactSha256:await digest(file.bytes)};
}
/** Called only by the explicit Save action. Enrollment is separately consented
 * and never implied by reading a page, checking status, rendering or import. */
export async function sealConformanceEvidenceObject(input:{svg:string},options:EvidenceSealOptions={},ports:EvidenceSealPorts={}):Promise<SealedConformanceEvidence>{
 const original=await openConformanceEvidenceObject(input.svg),readIdentity=options.identitySource??savedIdentity;
 options.onStatus?.('checking-identity');
 const identity=snapshotIdentity(await readIdentity()),identityDigest=await digest(identity.bytes),sdk=await(ports.sdk??sdkDefault)();
 let admission:unknown,owner:Awaited<ReturnType<OwnerSdk['readReceizIdentityPublicBinding']>>;
 try{
  const verifiedIdentity=await sdk.verifyReceizArtifact(identity.bytes);
  if(verifiedIdentity.status!=='verified-artifact')return fail('CONFORMANCE_IDENTITY_REQUIRED');
  admission=await sdk.createReceizArtifactAdmissionEngine()(verifiedIdentity,{profile:'identity',identityPassphrase:identity.phrase});
  owner=await sdk.readReceizIdentityPublicBinding(admission);
  if(!owner.signatureVerified||!owner.artifactOwnerReceizId)return fail('CONFORMANCE_IDENTITY_REQUIRED');
 }catch{return fail('CONFORMANCE_IDENTITY_REQUIRED');}
 if(original.report.credentialHolder&&original.report.credentialHolder.receizId!==owner.artifactOwnerReceizId)return fail('CONFORMANCE_HOLDER_MISMATCH');
 const object=await bindConformanceEvidenceHolder(original,owner.artifactOwnerReceizId);
 const offline=await(ports.offline??offlineDefault)(),store=await signerStore(ports,offline);
 if(!await store.load()&&!options.allowEnrollment)return fail('CONFORMANCE_ENROLLMENT_REQUIRED');
 options.onStatus?.('loading-proof-resources');
 const [{certificateTimeSafeStore,certificateTimeSafeFetch},{nativeFetch},resources]=await Promise.all([import('../receiz/device-signer-time'),import('../receiz/native-transport'),ports.resources?ports.resources():(async()=>{const{loadBankProofResources}=await import('../receiz/proof-resource-continuity');return loadBankProofResources(fetch);})()]);
 const sealer=offline.createReceizOfflineSealer({store:certificateTimeSafeStore(store),resources,ownerIdentityAdmission:admission,fetch:certificateTimeSafeFetch(nativeFetch)});
 if(!await sealer.ready()){
  if(!options.allowEnrollment)return fail('CONFORMANCE_ENROLLMENT_REQUIRED');
  options.onStatus?.('enrolling-signer');await sealer.enroll();
 }
 options.onStatus?.('sealing');
 const rendered=await(ports.render??renderSvg)(object.svg),source=JSON.stringify({schema:'bankeiz.conformance.receiz-source.v1',evidenceDigest:object.digest,svg:object.svg,transcript:canonicalJson(object.report)});
 if(utf8.encode(source).length>MAX_SOURCE_BYTES)return fail('CONFORMANCE_PROOF_CAPACITY');
 const carried=insertPngTextChunks(stripPngTextChunksByKeyword(rendered,KEY).pngBytes,[{keyword:KEY,text:source}]);
 if(carried.length>MAX_BYTES)return fail('CONFORMANCE_PROOF_CAPACITY');
 const sealed=await sealer.seal({bytes:carried,filename:`bankeiz-conformance-evidence-${object.digest.slice(0,12)}.png`,mimeType:'image/png'});
 options.onStatus?.('verifying');
 const result=await openSealedConformanceEvidenceObject(sealed.artifactBytes,{filename:sealed.filename,verifyOffline:ports.verifyOffline??offline.verifyReceizOfflineSealedFile,openPayload:ports.openPayload});
 if(result.object.svg!==object.svg||result.object.digest!==object.digest||result.verification.assetContinuity?.ownerReceizId!==owner.artifactOwnerReceizId)return fail('CONFORMANCE_SOURCE_CHANGED');
 let current:EvidenceIdentitySource;
 try{current=snapshotIdentity(await readIdentity());}catch{return fail('CONFORMANCE_IDENTITY_CHANGED');}
 if(current.phrase!==identity.phrase||await digest(current.bytes)!==identityDigest)return fail('CONFORMANCE_IDENTITY_CHANGED');
 options.onStatus?.('verified');return result;
}
/** A public certificate is inspectable by anyone. Workspace access additionally
 * requires private admission of its holder's selected Identity Record. */
export async function openConformanceEvidenceWorkspace(bytes:Uint8Array,options:EvidenceSealOptions={},ports:EvidenceSealPorts={}):Promise<ConformanceEvidenceWorkspace>{
 const credential=await openSealedConformanceEvidenceObject(bytes,ports),readIdentity=options.identitySource??savedIdentity;
 let identity:EvidenceIdentitySource,owner:Awaited<ReturnType<OwnerSdk['readReceizIdentityPublicBinding']>>;
 try{
  identity=snapshotIdentity(await readIdentity());
  const sdk=await(ports.sdk??sdkDefault)(),verified=await sdk.verifyReceizArtifact(identity.bytes);
  if(verified.status!=='verified-artifact')return fail('CONFORMANCE_IDENTITY_REQUIRED');
  const admission=await sdk.createReceizArtifactAdmissionEngine()(verified,{profile:'identity',identityPassphrase:identity.phrase});
  owner=await sdk.readReceizIdentityPublicBinding(admission);
  if(!owner.signatureVerified||!owner.artifactOwnerReceizId)return fail('CONFORMANCE_IDENTITY_REQUIRED');
 }catch{return fail('CONFORMANCE_IDENTITY_REQUIRED');}
 const holderReceizId=credential.object.report.credentialHolder!.receizId;
 if(owner.artifactOwnerReceizId!==holderReceizId||owner.artifactOwnerReceizId!==continuity(credential.verification).ownerReceizId)return fail('CONFORMANCE_HOLDER_MISMATCH');
 const stillCurrent=async()=>{
  try{
   const current=snapshotIdentity(await readIdentity());
   return current.phrase===identity.phrase&&current.bytes.length===identity.bytes.length&&current.bytes.every((byte,index)=>byte===identity.bytes[index]);
  }catch{return false;}
 };
 if(!await stillCurrent())return fail('CONFORMANCE_IDENTITY_CHANGED');
 return{credential,holderReceizId,stillCurrent};
}
