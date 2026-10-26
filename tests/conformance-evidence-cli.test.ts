import {mkdtemp,rm,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {expect,it} from 'vitest';
import {createConformanceEvidenceObject} from '../src/conformance/evidence-object';
import {referenceContractAdapter,runContractAssessment} from '../src/conformance/contract';
it('independently reopens a saved visual evidence object with the standalone CLI',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'bank-conformance-object-'));
 try{
  const report=await runContractAssessment(referenceContractAdapter,{name:'Independent adapter',buildSha256:'a'.repeat(64)},'standalone-object-roundtrip');
  const object=await createConformanceEvidenceObject(report),path=join(dir,'evidence.svg');
  await writeFile(path,object.svg);
  const output=JSON.parse(execFileSync(process.execPath,['scripts/conformance-contract.mjs','--verify',path],{encoding:'utf8',timeout:15000}));
  expect(output.assessmentPassed).toBe(true);expect(output.sourceObjectDigest).toBe(object.digest);
  expect(output.executionMode).toBe('transcript-replay');expect(output.scope).toBe('public-integration-contracts');
  await writeFile(path,object.svg.replace('Public integration contract','Production certificate'));
  expect(()=>execFileSync(process.execPath,['scripts/conformance-contract.mjs','--verify',path],{encoding:'utf8',timeout:15000,stdio:'pipe'})).toThrow('EVIDENCE_OBJECT_DRAWING_MISMATCH');
 }finally{await rm(dir,{recursive:true,force:true});}
},45_000);
it('uses the canonical offline verifier for PNG credentials and refuses a public sealed document without credential ownership',()=>{
 expect(()=>execFileSync(process.execPath,['scripts/conformance-contract.mjs','--verify','tests/fixtures/public-essay-record.png'],{encoding:'utf8',timeout:20000,stdio:'pipe'})).toThrow('CONFORMANCE_CONTINUITY_REQUIRED');
});
