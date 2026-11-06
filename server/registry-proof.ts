import {createHash} from 'node:crypto';
import type {InstitutionRecord} from '../src/content/institution-scorecard.mjs';
import {bankeizRecordedConformance} from '../src/content/institution-scorecard.mjs';
import {REGISTRY_MAX_PROOF_BYTES,REGISTRY_PROOF_PATH,type RegistryPublication} from '../src/registry/types.js';
import {openSealedConformanceEvidenceObject,type SealedConformanceEvidence} from '../src/conformance/receiz-evidence-seal.js';

export class RegistryProofError extends Error {
 constructor(readonly code:string,readonly status=422){super(code);this.name='RegistryProofError';}
}
const refuse=(code:string,status=422):never=>{throw new RegistryProofError(code,status);};
const digest=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');
export function officialRegistryProofUrl(institution:Pick<InstitutionRecord,'website'>):string {
 const url=new URL(institution.website);
 if(url.protocol!=='https:'||url.username||url.password||url.port)return refuse('REGISTRY_OFFICIAL_ORIGIN_INVALID');
 return new URL(REGISTRY_PROOF_PATH,url.origin).href;
}
export async function boundedRegistryBytes(body:ReadableStream<Uint8Array>|null,signal?:AbortSignal):Promise<Uint8Array> {
 if(!body)return refuse('REGISTRY_PROOF_REQUIRED',400);
 const reader=body.getReader(),parts:Uint8Array[]=[];let length=0;
 const stop=()=>{void reader.cancel().catch(()=>{});};signal?.addEventListener('abort',stop,{once:true});
 try {
  for(;;){signal?.throwIfAborted();const next=await reader.read();signal?.throwIfAborted();if(next.done)break;length+=next.value.length;if(length>REGISTRY_MAX_PROOF_BYTES)return refuse('REGISTRY_PROOF_CAPACITY',413);parts.push(next.value);}
 }finally{signal?.removeEventListener('abort',stop);await reader.cancel().catch(()=>{});}
 if(!length)return refuse('REGISTRY_PROOF_REQUIRED',400);
 const bytes=new Uint8Array(length);let offset=0;for(const part of parts){bytes.set(part,offset);offset+=part.length;}return bytes;
}
export interface RegistryProofPorts {
 fetch?:typeof fetch;
 openProof?:(bytes:Uint8Array)=>Promise<SealedConformanceEvidence>;
 now?:()=>Date;
}
/** A public certificate needs no private Identity Record. Its canonical opener
 * verifies seal, native holder, transcript and artwork before any result exists.
 * The official website endorses association with an institution, not test outcome. */
export async function admitRegistryProof(institution:InstitutionRecord,bytes:Uint8Array,ports:RegistryProofPorts={}):Promise<RegistryPublication> {
 if(!bytes.length||bytes.length>REGISTRY_MAX_PROOF_BYTES)return refuse('REGISTRY_PROOF_CAPACITY',413);
 let original:SealedConformanceEvidence;
 try{original=await(ports.openProof??openSealedConformanceEvidenceObject)(bytes);}catch{return refuse('REGISTRY_PROOF_INVALID');}
 const report=original.object.report,holder=report.credentialHolder?.receizId;
 if(report.implementation.name!==institution.name)return refuse('REGISTRY_INSTITUTION_MISMATCH');
 if(!report.assessmentPassed||!original.object.verifiedReport.assessmentPassed||!holder||report.scope!=='public-integration-contracts')return refuse('REGISTRY_PASSING_PROOF_REQUIRED');
 const artifactSha256=digest(bytes);
 if(artifactSha256!==original.artifactSha256)return refuse('REGISTRY_PROOF_INVALID');
 const url=`/api/bank/registry/original/${institution.id}/${artifactSha256}`;
 const knownHolder=institution.id==='bankeiz'&&holder===bankeizRecordedConformance.holderReceizId;
 let officialProofUrl:string;
 if(knownHolder)officialProofUrl=new URL(url,'https://bankeiz.com').href;
 else {
  officialProofUrl=officialRegistryProofUrl(institution);
  let response:Response,publicBytes:Uint8Array;
  try {
   const signal=AbortSignal.timeout(15000);
   response=await(ports.fetch??fetch)(officialProofUrl,{credentials:'omit',redirect:'error',cache:'no-store',headers:{Accept:'image/png'},signal});
   if(!response.ok){await response.body?.cancel();return refuse('REGISTRY_OFFICIAL_PROOF_REQUIRED');}
   if(Number(response.headers.get('content-length'))>REGISTRY_MAX_PROOF_BYTES){await response.body?.cancel();return refuse('REGISTRY_PROOF_CAPACITY',413);}
   publicBytes=await boundedRegistryBytes(response.body,signal);
  }catch(cause){if(cause instanceof RegistryProofError)throw cause;return refuse('REGISTRY_OFFICIAL_PROOF_REQUIRED');}
  if(digest(publicBytes)!==artifactSha256)return refuse('REGISTRY_OFFICIAL_PROOF_MISMATCH');
 }
 return {schema:'bank.registry.publication.v1',institutionId:institution.id,name:institution.name,scope:'Public integration contract',cases:report.cases.length,artifactSha256,evidenceSha256:original.object.digest,holderReceizId:holder,implementationBuildSha256:report.implementation.buildSha256,officialProofUrl,acceptedAt:(ports.now??(()=>new Date()))().toISOString(),url};
}
