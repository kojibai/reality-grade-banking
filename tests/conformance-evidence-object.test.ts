import {existsSync} from 'node:fs';
import {beforeAll,expect,it} from 'vitest';
import {referenceContractAdapter,runContractAssessment,type ContractReport} from '../src/conformance/contract';
let report:ContractReport;
beforeAll(async()=>{report=await runContractAssessment(referenceContractAdapter,{name:'Example <script>alert("x")</script> & Équipe',buildSha256:'a'.repeat(64)},'evidence-object-roundtrip');});
it('creates a saveable scoped object with the full independently verified passing transcript',async()=>{
 expect(existsSync(new URL('../src/conformance/evidence-object.ts',import.meta.url))).toBe(true);
 const {createConformanceEvidenceObject,openConformanceEvidenceObject}=await import('../src/conformance/evidence-object');
 const object=await createConformanceEvidenceObject(report),opened=await openConformanceEvidenceObject(object.svg);
 expect(opened.report).toEqual(report);expect(opened.verifiedReport.assessmentPassed).toBe(true);expect(opened.digest).toBe(object.digest);
 expect(object.svg).toContain('Public integration contract');expect(object.svg).toContain(`${report.cases.length} / ${report.cases.length}`);
 expect(object.svg).toContain('Production receiving qualification not demonstrated');expect(object.svg).toContain('&lt;script&gt;');expect(object.svg).not.toContain('<script>');
});
it('refuses failed, incomplete, altered and caller-forced success reports',async()=>{
 const {createConformanceEvidenceObject}=await import('../src/conformance/evidence-object');
 const failed=structuredClone(report);failed.cases[0].observed='invented';failed.assessmentPassed=true;
 await expect(createConformanceEvidenceObject(failed)).rejects.toThrow();
 await expect(createConformanceEvidenceObject({...report,cases:report.cases.slice(1)})).rejects.toThrow();
 await expect(createConformanceEvidenceObject({...report,assessmentPassed:false})).rejects.toThrow();
});
it('refuses changed digest, missing metadata, altered artwork, active content and oversized objects on reopen',async()=>{
 const {createConformanceEvidenceObject,openConformanceEvidenceObject}=await import('../src/conformance/evidence-object');
 const object=await createConformanceEvidenceObject(report);
 for(const changed of [object.svg.replace(object.digest,'0'.repeat(64)),object.svg.replace(/<metadata[\s\S]*?<\/metadata>/,''),object.svg.replace('Public integration contract','Production certificate'),object.svg.replace('</svg>','<script>alert(1)</script></svg>'),object.svg.replace('</svg>','<image href="https://example.com/tracker"/></svg>'),'x'.repeat(2*1024*1024+1)])await expect(openConformanceEvidenceObject(changed)).rejects.toThrow();
});
it('refuses XML-invalid name characters while retaining valid Unicode names',async()=>{
 const {createConformanceEvidenceObject}=await import('../src/conformance/evidence-object');
 for(const name of ['Invalid\ufffe','Invalid\uffff','Invalid\ud800'])await expect(createConformanceEvidenceObject({...report,implementation:{...report.implementation,name}})).rejects.toThrow('EVIDENCE_PASSING_CONTRACT_REQUIRED');
 await expect(createConformanceEvidenceObject({...report,implementation:{...report.implementation,name:'Équipe 🌍'}})).resolves.toHaveProperty('digest');
});
it('uses the standard title and binds the displayed holder to a Receiz ID rather than an editable institution label',async()=>{
 const {createConformanceEvidenceObject,bindConformanceEvidenceHolder,openConformanceEvidenceObject}=await import('../src/conformance/evidence-object');
 const object=await createConformanceEvidenceObject(report),bound=await bindConformanceEvidenceHolder(object,'receiz-holder-123');
 expect(bound.svg).toContain('Reality-Grade Banking');expect(bound.svg).toContain('Certificate of Technical Conformance');
 expect(bound.svg).toContain('CREDENTIAL HOLDER');expect(bound.svg).toContain('receiz-holder-123');
 expect(bound.svg).not.toContain('Bankeiz conformance evidence object');
 expect(bound.report.credentialHolder).toEqual({schema:'receiz.bank.conformance-holder.v1',receizId:'receiz-holder-123'});
 expect((await openConformanceEvidenceObject(bound.svg)).report.credentialHolder).toEqual(bound.report.credentialHolder);
 await expect(bindConformanceEvidenceHolder(bound,'someone-else')).rejects.toThrow('EVIDENCE_HOLDER_MISMATCH');
 await expect(bindConformanceEvidenceHolder(object,'<script>')).rejects.toThrow('EVIDENCE_HOLDER_INVALID');
});
