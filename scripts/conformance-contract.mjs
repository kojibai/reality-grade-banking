#!/usr/bin/env node
import {spawnSync} from 'node:child_process';
import {readFile,stat} from 'node:fs/promises';
import {resolve,join,basename} from 'node:path';
import {runContractAssessment,verifyContractTranscript} from '../src/conformance/contract.ts';
import {openConformanceEvidenceObject} from '../src/conformance/evidence-object.ts';
import {conformanceSourceIdentity,sha} from './conformance-reference.mjs';
const args=process.argv.slice(2);
try{
 if(args[0]==='--verify'&&args[1]){
  if((await stat(args[1])).size>16*1024*1024)throw Error('CONFORMANCE_PROOF_CAPACITY');
  const input=await readFile(args[1]),png=[137,80,78,71,13,10,26,10].every((value,index)=>input[index]===value);
  let object=null,canonicalProof;
  if(png){
   const {openSealedConformanceEvidenceObject}=await import('../src/conformance/receiz-evidence-seal.ts');
   const sealed=await openSealedConformanceEvidenceObject(new Uint8Array(input),{filename:basename(args[1])});object=sealed.object;
   canonicalProof={artifactSha256:sealed.artifactSha256,ownership:sealed.verification.assetContinuity,verifiedOffline:true,credentialHolder:object.report.credentialHolder};
  }else{if(input.length>2*1024*1024)throw Error('TRANSCRIPT_LIMIT');const text=input.toString('utf8');object=text.trimStart().startsWith('<')?await openConformanceEvidenceObject(text):null;}
  const report=object?object.verifiedReport:await verifyContractTranscript(JSON.parse(input.toString('utf8')));
  console.log(JSON.stringify({...report,...(object?{sourceObjectDigest:object.digest}:{}),...(canonicalProof?{canonicalProof}:{}),checkerIdentity:await conformanceSourceIdentity()},null,2));process.exitCode=report.assessmentPassed?0:1;
 }
 else if(args[0]==='--adapter'&&args[1]){
  const command=args[1],adapterArgs=args.slice(2);
  const candidates=command.includes('/')?[resolve(command)]:(process.env.PATH??'').split(':').map(dir=>join(dir,command));let executable;
  for(const path of candidates)try{if((await stat(path)).isFile()){executable=path;break;}}catch{}
  if(!executable)throw Error('ADAPTER_EXECUTABLE_REQUIRED');
  const identityInputs=[{path:executable,sha256:sha(await readFile(executable))}];
  for(const arg of adapterArgs)try{if((await stat(arg)).isFile())identityInputs.push({path:resolve(arg),sha256:sha(await readFile(arg))});}catch{}
  const implementation={name:[command,...adapterArgs].join(' '),buildSha256:sha(JSON.stringify(identityInputs)),identityInputs};
  const report=await runContractAssessment(async request=>{
   const result=spawnSync(executable,adapterArgs,{input:JSON.stringify(request),encoding:'utf8',timeout:10000,maxBuffer:1024*1024});
   if(result.error||result.status!==0)throw Error(result.error?.message??`ADAPTER_EXIT_${result.status}`);
   return JSON.parse(result.stdout);
  },implementation);
  console.log(JSON.stringify({...report,checkerIdentity:await conformanceSourceIdentity(),identityInputs},null,2));process.exitCode=report.assessmentPassed?0:1;
 }else{console.log('Usage: node scripts/conformance-contract.mjs --adapter executable [argument ...]\n       node scripts/conformance-contract.mjs --verify transcript.json|evidence.svg|credential.png\nRuns the explicitly selected program with isolated synthetic JSON requests. PNG credentials are canonically verified offline before their complete observations and displayed holder are checked. No Bankeiz account or network service is required. Scope: public integration contracts; production financial qualification remains separate.');}
}catch(error){console.error(error instanceof Error?error.message:'CONTRACT_RUN_FAILED');process.exitCode=1;}
