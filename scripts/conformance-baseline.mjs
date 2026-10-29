#!/usr/bin/env node
// Convert a fresh Vitest JSON run to a public, sanitized engineering record.
import {readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {relative,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {root,sha} from './conformance-reference.mjs';
import {baselineInputs} from './conformance-sources.mjs';
const args=process.argv.slice(2),snapshotFlag=args.indexOf('--sources'),snapshotPath=snapshotFlag>=0?args[snapshotFlag+1]:undefined;
if(snapshotFlag>=0)args.splice(snapshotFlag,2);
const [input,output='src/content/conformance-baseline.json']=args;
if(input==='--snapshot'){
 if(!args[1])throw Error('SOURCE_SNAPSHOT_PATH_REQUIRED');
 // A clean checkout has no generated verifier yet. The source snapshot must
 // include the shipped runtime, independently of parallel test-file ordering.
 try{await readFile(new URL('public/proof-verifier/v129/build.json',root));}
 catch(error){if(error.code!=='ENOENT')throw error;const{buildProofVerifier}=await import('./build-proof-verifier.mjs');await buildProofVerifier();}
 const entries=await baselineInputs();
 await writeFile(args[1],JSON.stringify({schema:'receiz.bank.test-source-snapshot.v1',createdAt:Date.now(),inputs:entries.map(({path,sha256})=>({path,sha256}))}));
 console.log(JSON.stringify({output:args[1],inputs:entries.length}));
}
else if(!input){console.error('Usage: node scripts/conformance-baseline.mjs --snapshot /tmp/sources.json\nThen run Vitest and: node scripts/conformance-baseline.mjs /tmp/vitest-results.json [output.json] --sources /tmp/sources.json');process.exitCode=1;}
else try{
 const result=JSON.parse(await readFile(input,'utf8')),base=fileURLToPath(root);
 if(!Array.isArray(result.testResults)||!result.testResults.length||typeof result.startTime!=='number')throw Error('VITEST_REPORT_REQUIRED');
 const suites=[];
 for(const row of result.testResults){const path=relative(base,resolve(row.name)).replaceAll('\\','/');if(!path.startsWith('tests/')||path.includes('..')||!Array.isArray(row.assertionResults))throw Error('TEST_SOURCE_PATH_INVALID');const cases=row.assertionResults.map(test=>({name:test.fullName??test.title,status:test.status,durationMs:test.duration??null}));suites.push({path,sha256:sha(await readFile(new URL(path,root))),status:row.status,cases});}
 const entries=await baselineInputs(),inputs=entries.map(({path,sha256})=>({path,sha256}));
 if(snapshotPath){
  const snapshot=JSON.parse(await readFile(snapshotPath,'utf8'));
  if(snapshot.schema!=='receiz.bank.test-source-snapshot.v1'||!Number.isFinite(snapshot.createdAt)||snapshot.createdAt>result.startTime||JSON.stringify(snapshot.inputs)!==JSON.stringify(inputs))throw Error('TEST_SOURCE_SNAPSHOT_MISMATCH');
 }else{
  const changed=entries.find(entry=>entry.mtimeMs>result.startTime);
  if(changed)throw Error(`SOURCE_CHANGED_SINCE_TEST_START:${changed.path}; capture --snapshot before running tests`);
 }
 const summary={passed:suites.reduce((n,s)=>n+s.cases.filter(c=>c.status==='passed').length,0),failed:suites.reduce((n,s)=>n+s.cases.filter(c=>c.status==='failed').length,0),skipped:suites.reduce((n,s)=>n+s.cases.filter(c=>c.status!=='passed'&&c.status!=='failed').length,0)};
 let repositoryRevision=null;try{repositoryRevision=execFileSync('git',['rev-parse','HEAD'],{cwd:base,encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim();}catch{/* Source archives are identified by exact contents without Git. */}
 const report={schema:'receiz.bank.implementation-test-evidence.v1',recorded:true,assessmentScope:'Bankeiz implementation engineering tests',productionQualification:'not-demonstrated',startedAt:new Date(result.startTime).toISOString(),completedAt:new Date(Math.max(...result.testResults.map(r=>r.endTime??result.startTime))).toISOString(),command:'npm test -- --maxWorkers=1 --reporter=json --outputFile=<local-report>',testRunPassed:result.success===true&&summary.failed===0&&suites.every(s=>s.status==='passed'),summary,sourceIdentity:{method:'sha256-path-content-v1',sourceTreeSha256:sha(JSON.stringify(inputs)),repositoryRevision,sourceSnapshotChecked:Boolean(snapshotPath),inputs,includesUncommittedSources:true,baselineFileExcludedToAvoidSelfReference:true},suites,financialActionsPerformedByConformanceRunner:0,limitations:['The producer records a local engineering run. Reproduce the command against identical source hashes; a copied JSON report is not independent attestation.','Individual integration tests use their declared isolated fixtures and trust policies. They do not establish live admitted funding, host operation or physical custody.','Pending/skipped cases remain explicit and do not count as passed.']};
 await writeFile(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({output,testRunPassed:report.testRunPassed,summary,suiteCount:suites.length,sourceTreeSha256:report.sourceIdentity.sourceTreeSha256}));process.exitCode=report.testRunPassed?0:1;
}catch(error){console.error(error instanceof Error?error.message:'BASELINE_FAILED');process.exitCode=1;}
