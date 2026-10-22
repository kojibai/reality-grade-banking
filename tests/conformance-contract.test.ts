import {existsSync} from 'node:fs';
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
