#!/usr/bin/env node
// Read-only, nonfinancial public-package audit. Run with Node 24+.
import {readFile,readdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {runInstitutionSuites} from '../src/conformance/suites.ts';
import {coverage,protocol} from '../src/conformance/assessment.ts';
import {RECEIZ_SDK_VERSION,RECEIZ_GENERATED_CURRENT_REGISTRY_DIGEST,runReceizV125TemporalAuthorityConformance} from '@receiz/sdk';
export const root=new URL('../',import.meta.url);
export const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
export async function conformanceSourceIdentity(){
 const paths=['src/receiz/note-funding.ts','src/receiz/native-asset-backing.ts','institution/receiver-profile.json','institution/conformance-protocol.json','institution/receiving-standard.md','docs/note-continuity-standard.md','docs/connected-notes-v129.md','package.json','package-lock.json','public/native/receiver-verifier.v129.manifest.json','public/native/receiver-verifier.v129.mjs'];
 for(const dir of ['src/conformance/','docs/conformance/'])for(const entry of await readdir(new URL(dir,root),{withFileTypes:true}).catch(()=>[]))if(entry.isFile()&&(dir.startsWith('src')?/\.(?:ts|tsx|css|json)$/:/\.md$/).test(entry.name))paths.push(dir+entry.name);
 for(const entry of await readdir(new URL('scripts/',root),{withFileTypes:true}))if(entry.isFile()&&/^conformance-.*\.mjs$/.test(entry.name))paths.push('scripts/'+entry.name);
 const inputs=await Promise.all([...new Set(paths)].sort().map(async path=>({path,sha256:sha(await readFile(new URL(path,root)))})));
 return {scope:'standalone-conformance-runner-contracts-and-pinned-resources',method:'sha256-path-content-v1',sourceTreeSha256:sha(JSON.stringify(inputs)),inputs};
}
export async function runReferenceAudit(){
 const startedAt=new Date().toISOString(),suites=await runInstitutionSuites(),temporal=await runReceizV125TemporalAuthorityConformance();
 const manifest=JSON.parse(await readFile(new URL('public/native/receiver-verifier.v129.manifest.json',root),'utf8'));
 const actualVerifierSha256=sha(await readFile(new URL('public/native/receiver-verifier.v129.mjs',root)));
 const identities={releaseMatches:RECEIZ_SDK_VERSION===coverage.receizVersion,registryMatches:RECEIZ_GENERATED_CURRENT_REGISTRY_DIGEST===coverage.registryDigest,verifierBytesMatch:actualVerifierSha256===manifest.moduleSha256};
 const implementationInputs=[...new Set([...coverage.requirements,...coverage.noteLaws,...coverage.capabilities].flatMap(r=>[...r.implementation,...r.tests,...r.normative].map(p=>p.split('#')[0])))].sort();
 const implementationSourceHashes=await Promise.all(implementationInputs.map(async path=>({path,sha256:sha(await readFile(new URL(path,root)))})));
 let revision=null,worktreeChanged=null;try{revision=execFileSync('git',['rev-parse','HEAD'],{cwd:fileURLToPath(root),encoding:'utf8'}).trim();worktreeChanged=execFileSync('git',['status','--porcelain','--untracked-files=all'],{cwd:fileURLToPath(root),encoding:'utf8'}).trim().length>0;}catch{}
 return {schema:'receiz.bank.standalone-reference-evidence.v1',startedAt,completedAt:new Date().toISOString(),referenceChecksPassed:Object.values(identities).every(Boolean)&&suites.every(s=>s.passed)&&temporal.qualified&&temporal.failedChecks.length===0,baselineAssessmentPassed:false,baselineOutcome:'does-not-pass-required-live-proof-missing',institutionConformance:'not-assessed',profile:protocol.profile,identities,sourceIdentity:await conformanceSourceIdentity(),repository:{revision,worktreeChanged,revisionAloneIdentifiesDirtyFiles:false},verifier:{moduleSha256:actualVerifierSha256,sourceCommit:manifest.sourceCommit},implementationSourceHashes,suites,temporal,coverage,remainingProof:coverage.requirements.map(r=>({id:r.id,status:'FAIL',reason:'required-live-proof-missing',requiredEvidence:r.requiredEvidence})),financialActionsPerformed:0,creditAuthorized:false,reportIsAuthority:false};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{const report=await runReferenceAudit();console.log(JSON.stringify(report,null,2));process.stdout.write('',()=>process.exit(report.referenceChecksPassed?0:1));}catch(error){console.error(error instanceof Error?error.message:'CONFORMANCE_AUDIT_FAILED');process.exitCode=1;}
}
