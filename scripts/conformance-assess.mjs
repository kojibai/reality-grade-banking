#!/usr/bin/env node
import {readFile,stat} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {pathToFileURL} from 'node:url';
import {inspectOriginalUsing} from '../src/conformance/original-inspection.ts';
import {assessImplementation} from '../src/conformance/assessment.ts';
import {conformanceSourceIdentity,root,sha} from './conformance-reference.mjs';
const args=process.argv.slice(2);
if(!args.length||args.includes('--help')){
 console.log('Usage: node scripts/conformance-assess.mjs report.json [original-file ...]\nReads local report/originals only. Exit 0: complete assessment passes; 1: malformed/invalid evidence; 2: required proof missing. No supplied code is executed and no funds move.');
}else{
 try{
  if(args.length>33)throw Error('SOURCE_LIMIT_32_FILES');
  const reportBytes=await readFile(args[0]);if(reportBytes.byteLength>2*1024*1024)throw Error('REPORT_LIMIT_2_MIB');
  const input=JSON.parse(reportBytes.toString('utf8')),files=[];let total=0;
  for(const path of args.slice(1)){const size=(await stat(path)).size;total+=size;if(size>8*1024*1024||total>32*1024*1024)throw Error('SOURCE_LIMIT_32_MIB_TOTAL_8_MIB_EACH');files.push({name:path.split(/[\\/]/).at(-1),bytes:new Uint8Array(await readFile(path))});}
  let native;
  const verifyOriginal=async bytes=>{
   if(!native){const path=new URL('public/native/receiver-verifier.v129.mjs',root),manifest=JSON.parse(await readFile(new URL('public/native/receiver-verifier.v129.manifest.json',root),'utf8'));if(sha(await readFile(path))!==manifest.moduleSha256)throw Error('VERIFIER_BUILD_MISMATCH');native=await import(pathToFileURL(fileURLToPath(path)).href);}
   return inspectOriginalUsing(bytes,native);
  };
  const assessed=await assessImplementation(input,files,verifyOriginal);
  const result={...assessed,checkerIdentity:await conformanceSourceIdentity()};
  console.log(JSON.stringify(result,null,2));
  process.stdout.write('',()=>process.exit(assessed.assessmentPassed?0:assessed.checks.some(c=>c.status==='FAIL')?1:2));
 }catch(error){console.error(error instanceof Error?error.message:'ASSESSMENT_FAILED');process.exitCode=1;}
}
