import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {institutionScorecardContent} from '../scripts/institution-scorecard-page.mjs';
import {institutionDirectoryRecords,institutionQualification,type InstitutionRecord,type PublishedConformanceRecord} from '../src/content/institution-scorecard.mjs';
import {REGISTRY_PROOF_PATH,type RegistryInstitutionState,type RegistryPublication} from '../src/registry/types.js';
import type {RegistryStore} from './registry-store.js';

const marker='<section id="institution-register"';
const carried=institutionScorecardContent(),boundary=carried.indexOf(marker);
if(boundary<0)throw Error('REGISTRY_DOCUMENT_BOUNDARY_MISSING');
const prefix=carried.slice(0,boundary),fallback=carried.slice(boundary);
const headers={'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
const notice='<p class="isc-shell isc-count-note" data-registry-snapshot-notice role="status">Latest accepted records are temporarily unavailable. This is the published snapshot; recently accepted evidence may not yet appear.</p>';
let documentHead:Promise<string>|undefined;
function head(){return documentHead??=readFile(resolve('server/registry-runtime/document-head.html'),'utf8').catch(error=>{documentHead=undefined;throw error;});}
const digest=(value:unknown):value is string=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
function publication(value:unknown,institution:InstitutionRecord):value is RegistryPublication {
 const record=value as RegistryPublication;
 if(!record||record.schema!=='bank.registry.publication.v1'||record.institutionId!==institution.id||record.name!==institution.name||record.scope!=='Public integration contract'||!Number.isSafeInteger(record.cases)||record.cases<1||record.cases>100||!digest(record.artifactSha256)||!digest(record.evidenceSha256)||!digest(record.implementationBuildSha256)||typeof record.holderReceizId!=='string'||!/^[A-Za-z0-9][A-Za-z0-9._:@-]{0,159}$/.test(record.holderReceizId)||typeof record.acceptedAt!=='string'||record.acceptedAt.length>32||!Number.isFinite(Date.parse(record.acceptedAt))||record.url!==`/api/bank/registry/original/${institution.id}/${record.artifactSha256}`)return false;
 const baseline=institution.recordedConformance;
 if(baseline?.artifactSha256===record.artifactSha256&&(['evidenceSha256','holderReceizId','implementationBuildSha256','cases','scope'] as const).some(key=>baseline[key]!==record[key]))return false;
 try {
  const official=new URL(REGISTRY_PROOF_PATH,new URL(institution.website).origin).href;
  return record.officialProofUrl===official||(institution.id==='bankeiz'&&record.holderReceizId===baseline?.holderReceizId&&record.officialProofUrl==='https://bankeiz.com'+record.url);
 }catch{return false;}
}
function entry(value:unknown,institution:InstitutionRecord):value is RegistryInstitutionState {
 const record=value as RegistryInstitutionState;
 if(!record||record.institutionId!==institution.id||!Number.isSafeInteger(record.revision)||record.revision<1||!Array.isArray(record.history)||record.revision!==record.history.length+1||!publication(record.current,institution)||!record.history.every(value=>publication(value,institution)))return false;
 return new Set([record.current,...record.history].map(value=>value.artifactSha256)).size===record.revision;
}
/** These are saved public display inputs already admitted at publication. No
 * proof, identity, Source freshness or financial authority is opened here. */
function project(values:unknown):InstitutionRecord[] {
 if(!Array.isArray(values))throw Error('REGISTRY_SAVED_RECORDS_INVALID');
 const indexed=new Map<string,RegistryInstitutionState>();
 for(const value of values){
  const institution=institutionDirectoryRecords.find(record=>record.id===(value as RegistryInstitutionState|null)?.institutionId);
  if(!institution||!entry(value,institution))continue;
  if(indexed.has(institution.id))throw Error('REGISTRY_SAVED_RECORD_CONFLICT');
  indexed.set(institution.id,value);
 }
 return institutionDirectoryRecords.map(institution=>{
  const saved=indexed.get(institution.id);if(!saved)return institution;
  const current=saved.current,baseline=institution.recordedConformance;
  const recordedConformance:PublishedConformanceRecord=baseline?.artifactSha256===current.artifactSha256?baseline:{recorded:true,name:current.name,scope:current.scope,url:current.url,cases:current.cases,artifactSha256:current.artifactSha256,evidenceSha256:current.evidenceSha256,holderReceizId:current.holderReceizId,implementationBuildSha256:current.implementationBuildSha256,referenceChecks:0,referencePassedCount:0,referenceChecksPassed:false,referenceCompletedAt:''};
  const result={...institution,recordedConformance,registryEntry:saved,...baseline&&baseline.artifactSha256!==current.artifactSha256?{registryBaseline:baseline}:{}};
  return institutionQualification(result).status==='PASS'?result:institution;
 });
}
async function savedRecords(store:RegistryStore):Promise<InstitutionRecord[]> {
 let timeout:ReturnType<typeof setTimeout>|undefined;
 try {
  const records=await Promise.race([Promise.resolve().then(()=>store.list()),new Promise<never>((_resolve,reject)=>{timeout=setTimeout(()=>reject(Error('REGISTRY_SAVED_RECORDS_UNAVAILABLE')),2000);})]);
  return project(records);
 }finally{if(timeout!==undefined)clearTimeout(timeout);}
}

/** Send the available static header and hero before reading only the genuinely
 * missing accepted metadata. The directory itself is then complete raw HTML,
 * including scoped PASS, totals and retained evidence for non-JavaScript users. */
export async function registryDocumentResponse(request:Request,store:RegistryStore|null):Promise<Response> {
 if(request.method==='HEAD')return new Response(null,{headers});
 const opening=await head(),utf8=new TextEncoder();let active=true;
 const body=new ReadableStream<Uint8Array>({
  start(controller){
   controller.enqueue(utf8.encode(opening+prefix));
   void(async()=>{
    let content=fallback,warning='';
    if(store){try{const complete=institutionScorecardContent(await savedRecords(store));const at=complete.indexOf(marker);if(at<0)throw Error('REGISTRY_DOCUMENT_BOUNDARY_MISSING');content=complete.slice(at);}catch{warning=notice;}}
    if(active){controller.enqueue(utf8.encode(warning+content+'</div></body></html>'));controller.close();}
   })().catch(error=>{if(active)controller.error(error);});
  },
  cancel(){active=false;},
 });
 return new Response(body,{headers});
}
