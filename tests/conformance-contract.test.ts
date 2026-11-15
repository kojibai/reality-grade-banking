import {existsSync,readFileSync} from 'node:fs';
import {expect,it} from 'vitest';
it('actively exercises a compatible adapter and derives a passing bounded contract assessment from observed outputs',async()=>{
 expect(existsSync(new URL('../src/conformance/contract.ts',import.meta.url))).toBe(true);
 const {runContractAssessment,referenceContractAdapter}=await import('../src/conformance/contract');
 const report=await runContractAssessment(referenceContractAdapter,{name:'Bankeiz public contract adapter',buildSha256:'a'.repeat(64)},'nonce-test-2026');
 expect(report.assessmentPassed,JSON.stringify(report.cases.filter(c=>!c.passed))).toBe(true);
 expect(report.cases.length).toBeGreaterThanOrEqual(20);
 expect(report.executionMode).toBe('active-adapter-run');
 expect(report.productionQualification).toBe('not-demonstrated');
 expect(report.cases.every(c=>c.expected!==undefined&&c.observed!==undefined)).toBe(true);
});
it('recomputes oracle outputs on reopen and rejects altered, missing, duplicated and caller-passed case transcripts',async()=>{
 const {runContractAssessment,verifyContractTranscript,referenceContractAdapter}=await import('../src/conformance/contract');
 const report=await runContractAssessment(referenceContractAdapter,{name:'Reference',buildSha256:'a'.repeat(64)},'nonce-replay');
 expect((await verifyContractTranscript(report)).assessmentPassed).toBe(true);
 const altered=structuredClone(report);altered.cases[0].observed='fabricated';
 expect((await verifyContractTranscript(altered)).assessmentPassed).toBe(false);
 expect((await verifyContractTranscript({...report,cases:report.cases.slice(1),assessmentPassed:true})).assessmentPassed).toBe(false);
 expect((await verifyContractTranscript({...report,cases:[...report.cases,report.cases[0]]})).assessmentPassed).toBe(false);
});
it('fails the contract when an adapter returns success booleans instead of the required raw state and values',async()=>{
 const {runContractAssessment}=await import('../src/conformance/contract');
 const report=await runContractAssessment(async()=>({passed:true}),{name:'Invalid',buildSha256:'a'.repeat(64)},'nonce-invalid');
 expect(report.assessmentPassed).toBe(false);
 expect(report.cases.every(c=>!c.passed)).toBe(true);
});
it('returns a canonical refusal as adapter output instead of crashing the adapter process',async()=>{
 const {referenceContractAdapter,contractCases}=await import('../src/conformance/contract');
 const test=(await contractCases('nonce-process')).find(c=>c.id==='changed-recovery-digest')!;
 await expect(referenceContractAdapter(test.request)).resolves.toEqual(test.expected);
});

it('reopens the unchanged sealed v1 public Original under installed 129.5 and refuses a rehashed release substitution',async()=>{
 const installed=JSON.parse(readFileSync(new URL('../node_modules/@receiz/sdk/package.json',import.meta.url),'utf8'));
 expect(installed.version).toBe('129.5.0');
 const {openSealedConformanceEvidenceObject}=await import('../src/conformance/receiz-evidence-seal');
 const {contractCases,verifyContractTranscript}=await import('../src/conformance/contract');
 const {caseDigest}=await import('../src/conformance/assessment');
 const {createConformanceEvidenceObject}=await import('../src/conformance/evidence-object');
 // No injected verifier, root policy, payload opener or reissued credential.
 const bytes=new Uint8Array(readFileSync(new URL('../public/conformance/bankeiz-public-conformance.png',import.meta.url)));
 const original=await openSealedConformanceEvidenceObject(bytes);
 expect(original.bytes).toEqual(bytes);
 expect(original.artifactSha256).toBe('42639bee60e2650d4f58901ab9e66456ed2421a88330621c88d26e4e1889d75f');
 expect(original.object.digest).toBe('379297e32c719aa0ba71131d0541f72efa1ea72cf2f80ed0a712de2289897b56');
 expect(original.verification).toMatchObject({ok:true,kind:'png',integrity:{ok:true},assetContinuity:{state:'verified',carrier:'native_record_seal',ownerReceizId:'bjklock.receiz.id'}});
 expect(original.object.report).toMatchObject({schema:'receiz.bank.contract-run.v1',scope:'public-integration-contracts',assessmentPassed:true,productionQualification:'not-demonstrated',financialActionsPerformed:0,reportIsAuthority:false,implementation:{name:'Bankeiz',buildSha256:'bb2b3a95c6f8737c207142474e74a1e9118efb84226ecff44edd9885bf700c89'},credentialHolder:{schema:'receiz.bank.conformance-holder.v1',receizId:'bjklock.receiz.id'}});
 expect(original.object.report.cases).toHaveLength(33);
 expect(original.object.verifiedReport.assessmentPassed).toBe(true);
 const id='kaisigil-kks-proof-and-causal-mutations';
 const recorded=original.object.report.cases.find(test=>test.id===id)!;
 expect(recorded.request).toEqual({operation:'temporal-vectors',input:{release:'129.0.0',coordinateAuthority:'source-bound-kaisigil-kks'}});
 expect(recorded.requestDigest).toBe('ea49dc89d271b9a171717c0921081539965f789d13878281ef11b0be5d0df6f1');
 expect(await caseDigest(recorded.request)).toBe(recorded.requestDigest);
 expect((await contractCases(original.object.report.nonce)).find(test=>test.id===id)?.request).toEqual(recorded.request);
 const substituted=structuredClone(original.object.report),changed=substituted.cases.find(test=>test.id===id)!;
 changed.request.input.release=installed.version;
 changed.requestDigest=await caseDigest(changed.request);
 expect(changed.requestDigest).not.toBe(recorded.requestDigest);
 expect(changed.requestDigest).toBe('a3bae5d6ca3fdb3dbd7eeac426443fa05b60e311d6f6e685eaad9d978d8edb4c');
 expect((await verifyContractTranscript(substituted)).assessmentPassed).toBe(false);
 await expect(createConformanceEvidenceObject(substituted)).rejects.toThrow('EVIDENCE_PASSING_CONTRACT_REQUIRED');
},30_000);
