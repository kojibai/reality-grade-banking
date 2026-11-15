import {mkdtemp,readFile,rm,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
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
it('runs the real Node CLI over the genuine retained PNG Original with no network calls',async()=>{
 const path='public/conformance/bankeiz-public-conformance.png';
 const expected=createHash('sha256').update(await readFile(path)).digest('hex');
 const program=`
  import assert from 'node:assert/strict';
  let fetches=0;
  globalThis.fetch=async()=>{fetches++;throw Error('CONFORMANCE_CLI_MUST_REMAIN_OFFLINE');};
  process.argv=[process.execPath,'scripts/conformance-contract.mjs','--verify',${JSON.stringify(path)}];
  await import('./scripts/conformance-contract.mjs');
  assert.equal(fetches,0);
 `;
 const output=JSON.parse(execFileSync(process.execPath,['--input-type=module','-e',program],{encoding:'utf8',timeout:30000}));
 expect(output.assessmentPassed).toBe(true);
 expect(output.cases).toHaveLength(33);
 expect(output.canonicalProof.artifactSha256).toBe(expected);
 expect(output.canonicalProof.verifiedOffline).toBe(true);
 expect(output.canonicalProof.checkerRuntime.moduleSha256).toBe(createHash('sha256').update(await readFile('server/registry-runtime/conformance-reader.mjs')).digest('hex'));
 expect(output.canonicalProof.checkerRuntime.module).toBe('server/registry-runtime/conformance-reader.mjs');
 expect(output.canonicalProof.ownership.state).toBe('verified');
 expect(output.canonicalProof.credentialHolder.receizId).toBe(output.canonicalProof.ownership.ownerReceizId);
 expect(output.sourceObjectDigest).toMatch(/^[a-f0-9]{64}$/);
},35000);
it('checks the existing public certificate through plain Node without changing its Original or metadata',async()=>{
 const paths=['public/conformance/bankeiz-public-conformance.png','src/content/conformance-certificate.json'];
 const before=await Promise.all(paths.map(path=>readFile(path)));
 const program=`
  import assert from 'node:assert/strict';
  let fetches=0;
  globalThis.fetch=async()=>{fetches++;throw Error('CERTIFICATE_CHECK_MUST_REMAIN_OFFLINE');};
  process.argv=[process.execPath,'scripts/conformance-certificate.mjs','--check'];
  await import('./scripts/conformance-certificate.mjs');
  assert.equal(fetches,0);
 `;
 const output=execFileSync(process.execPath,['--input-type=module','-e',program],{encoding:'utf8',timeout:30000});
 expect(output).toContain('Verified public Bankeiz original, complete evidence, artwork and holder bjklock.receiz.id.');
 for(const [index,path]of paths.entries())expect(await readFile(path)).toEqual(before[index]);
},35000);
