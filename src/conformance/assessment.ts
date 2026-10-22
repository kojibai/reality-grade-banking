import coverage from './coverage.json' with {type:'json'};
import protocol from '../../institution/conformance-protocol.json' with {type:'json'};
export {coverage,protocol};
export type AssessmentStatus='PASS'|'FAIL'|'MISSING';
export interface AssessmentCheck {id:string;title:string;status:AssessmentStatus;expected:unknown;observed:unknown;remediation:string;}
export interface ExternalSource {name:string;bytes:Uint8Array;}
export interface AssessmentReport {
 schema:'receiz.bank.implementation-assessment.v1'; institutionConformance:'not-demonstrated'|'conforming-for-assessed-capability';
 implementation:unknown; scope:unknown; checks:AssessmentCheck[]; sources:AssessmentCheck[];
 requirements:Array<AssessmentCheck&{reason:'missing-proof'|'reported-failure-or-invalid-binding';normative:string[];implementation:string[];tests:string[]}>;
 financialActionsPerformed:0;creditAuthorized:false;reportIsAuthority:false;assessmentPassed:boolean;outcome:'passes-assessed-scope'|'does-not-pass';
}
const record=(v:unknown):Record<string,unknown>=>v!==null&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:{};
export function canonicalJson(value:unknown):string {if(Array.isArray(value))return `[${value.map(canonicalJson).join(',')}]`;if(value!==null&&typeof value==='object')return `{${Object.entries(value).sort(([a],[b])=>a<b?-1:a>b?1:0).map(([key,v])=>`${JSON.stringify(key)}:${canonicalJson(v)}`).join(',')}}`;return JSON.stringify(value);}
export async function sha256(bytes:Uint8Array):Promise<string> {return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new Uint8Array(bytes)))).map(v=>v.toString(16).padStart(2,'0')).join('');}
export const caseDigest=(value:unknown)=>sha256(new TextEncoder().encode(canonicalJson(value)));
export async function assessImplementation(input:unknown,files:ExternalSource[],verifyOriginal?:(bytes:Uint8Array)=>Promise<unknown>,requestedScope?:{capabilities:string[];rails:string[]}):Promise<AssessmentReport> {
 const report=record(input),identity=record(report.implementation),declared=record(report.profile),scope=record(report.scope);
 const checks:AssessmentCheck[]=[],sources:AssessmentCheck[]=[];
 const add=(id:string,title:string,status:AssessmentStatus,expected:unknown,observed:unknown,remediation:string)=>checks.push({id,title,status,expected,observed,remediation});
 const hash=(v:unknown)=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
 add('schema','Report contract',report.schema===protocol.reportSchema?'PASS':'FAIL',protocol.reportSchema,report.schema??null,'Use the published external-assessment report schema and language-neutral protocol.');
 const identityOk=['name','sourceRevision','environment','adapter'].every(k=>typeof identity[k]==='string'&&(identity[k] as string).trim().length>0)&&hash(identity.buildSha256);
 add('identity','Exact implementation identity',identityOk?'PASS':'FAIL','Name, SHA-256 build, source revision, environment and adapter',identity,'Hash the executable/build bytes; identify its source revision, actual adapter and assessment realm. A declared identity is a binding, not execution attestation.');
 const profileOk=Object.entries(protocol.profile).every(([key,value])=>declared[key]===value);
 add('profile','Pinned profile and trust coordinates',profileOk?'PASS':'FAIL',protocol.profile,declared,'Use these exact published profile, SDK/ruleset, registry and matrix coordinates; assess a changed standard separately. Production root admission still requires independent evidence.');
 if(requestedScope)add('requested-scope','Reviewer-selected scope matches the adapter report',canonicalJson(requestedScope)===canonicalJson(scope)?'PASS':'FAIL',requestedScope,scope,'Run the adapter for the selected capability and rail scope. Do not relabel a report from another rail or environment.');
 const assessmentScope=requestedScope??scope;
 const selected=Array.isArray(assessmentScope.capabilities)?assessmentScope.capabilities:[],rails=Array.isArray(assessmentScope.rails)?assessmentScope.rails:[];
 const scopeOk=selected.length>0&&new Set(selected).size===selected.length&&selected.every(id=>coverage.capabilities.some(c=>c.id===id))&&rails.length>0&&new Set(rails).size===rails.length&&rails.every(id=>coverage.rails.some(r=>r.id===id));
 add('scope','Capability and rail scope',scopeOk?'PASS':'FAIL',{capabilities:coverage.capabilities.map(c=>c.id),rails:coverage.rails.map(r=>r.id)},scope,'Select at least one listed capability and rail. Repeat applicable cases for every selected rail; unsupported operations stay missing.');
 const declarations=Array.isArray(report.sources)?report.sources.map(record):[];
 const matchedSourceHashes=new Set<string>();
 const duplicates=files.length!==new Set(files.map(f=>f.name)).size||declarations.length!==new Set(declarations.map(d=>d.name)).size;
 if(duplicates)add('duplicate-sources','Unambiguous source bindings','FAIL','Unique file names and source declarations',null,'Use unique source names. Never resolve a duplicated name by selecting an arbitrary file.');
 for(const item of declarations){
  const name=typeof item.name==='string'?item.name:'',matches=files.filter(f=>f.name===name),file=matches.length===1?matches[0]:undefined;
  const actual=file?await sha256(file.bytes):null;
  const matched=!duplicates&&hash(item.sha256)&&actual===item.sha256;
  if(matched)matchedSourceHashes.add(actual!);
  let status:AssessmentStatus=!file?'MISSING':matched?'PASS':'FAIL',observed:unknown={sha256:actual,canonicalSource:'not-verified'};
  let remediation='Supply the exact declared original. A file digest proves byte identity only; canonical verification and applicable live evidence remain required.';
  if(matched&&file&&verifyOriginal){
   try{const result=await verifyOriginal(file.bytes);if(record(result).carriedChainVerified!==true)throw Error('COMPLETE_CARRIED_SOURCE_NOT_VERIFIED');observed={sha256:actual,inspection:result};remediation='Carried source independently opened. This does not establish current custody, account credit, adapter execution or production qualification.';}
   catch(cause){status='FAIL';observed={sha256:actual,refusal:cause instanceof Error?cause.message.slice(0,240):'SOURCE_NOT_VERIFIED'};remediation='Supply a complete supported original with its funding/history closure under pinned roots. Unsupported formats require their matching independent verifier; do not relabel them financial evidence.';}
  } else if(matched)status='MISSING';
  const check={id:`source:${name}`,title:`Original source: ${name||'unnamed'}`,status,expected:item.sha256??null,observed,remediation};sources.push(check);checks.push(check);
 }
 if(!declarations.length)add('originals','Original evidence supplied','MISSING','Hash-bound complete admitted originals',null,'Attach original artifacts and declare their exact SHA-256. Keep private customer evidence in authorized local custody.');
 const requiredIds=new Set(coverage.capabilities.filter(c=>selected.includes(c.id)).flatMap(c=>c.requirementIds));requiredIds.add('receiver-specific-live-qualification');
 if(!scopeOk)for(const r of coverage.requirements)requiredIds.add(r.id);
 const suppliedCases=Array.isArray(report.cases)?report.cases.map(record):[];
 const requirements:AssessmentReport['requirements']=[];
 for(const r of coverage.requirements.filter(r=>requiredIds.has(r.id))){
  const expectedCases=protocol.cases.filter(c=>c.requirementId===r.id);
  let failed=false;
  for(const test of expectedCases)for(const rail of rails){
   const matches=suppliedCases.filter(c=>c.id===test.id&&c.rail===rail),result=matches.length===1?matches[0]:undefined;
   const digest=await caseDigest(test),bound=!!result&&result.caseDigest===digest&&result.implementationBuildSha256===identity.buildSha256&&Array.isArray(result.evidenceSha256)&&result.evidenceSha256.length>0&&result.evidenceSha256.every(d=>hash(d)&&matchedSourceHashes.has(d as string));
   const status:AssessmentStatus=matches.length>1?'FAIL':!result?'MISSING':!bound?'FAIL':canonicalJson(result.observed)===canonicalJson(test.expected)?'PASS':'FAIL';
   if(status==='FAIL')failed=true;
   add(`case:${test.id}:${String(rail)}`,`${test.id} · ${String(rail)}`,status,{caseDigest:digest,observed:test.expected},result??null, status==='PASS'?'Reported observation and evidence references match the protocol. Independently reproduce execution on the named adapter; matching caller outputs alone do not qualify this requirement.':`${test.action} Retest the original case on the named implementation; bind its exact case/build digests, selected rail and complete original evidence. Expected: ${JSON.stringify(test.expected)}`);
  }
  const completeIndependentEvidenceEstablished=false; // This read-only review has no durable-host, hardware or independent-assessor verifier.
  const requirementStatus:AssessmentStatus=completeIndependentEvidenceEstablished&&!failed?'PASS':'FAIL';
  requirements.push({id:r.id,title:r.title,status:requirementStatus,reason:failed?'reported-failure-or-invalid-binding':'missing-proof',expected:r.obligation,observed:failed?'Supplied adapter report conflicts with a required case or its binding.':`Required proof missing. Automated verification availability: ${r.verificationAvailability.automation}; ${r.verificationAvailability.machineLimit}`,remediation:r.remediation,normative:r.normative,implementation:r.implementation,tests:r.tests});
 }
 const assessmentPassed=requirements.length>0&&requirements.every(r=>r.status==='PASS')&&checks.every(c=>c.status==='PASS');
 return {schema:'receiz.bank.implementation-assessment.v1',institutionConformance:assessmentPassed?'conforming-for-assessed-capability':'not-demonstrated',implementation:identity,scope,checks,sources,requirements,financialActionsPerformed:0,creditAuthorized:false,reportIsAuthority:false,assessmentPassed,outcome:assessmentPassed?'passes-assessed-scope':'does-not-pass'};
}
