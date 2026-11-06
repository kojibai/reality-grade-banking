import {expect,it} from 'vitest';
import coverage from '../src/conformance/coverage.json';
import * as scorecard from '../src/content/institution-scorecard.mjs';
import {bankeizRecordedConformance,institutionRecords,institutionQualification,type InstitutionRecord,type ReviewedAssessment} from '../src/content/institution-scorecard.mjs';

const reviewed=():ReviewedAssessment=>({
 institutionId:'test-receiver',reviewer:'Independent assessor',reviewedOn:'2026-11-05',
 reportUrl:'https://assessor.example/receiving-v1',outcome:'conforming',previousReports:[],
 scope:{capability:'Proof-native receiving and onward transfer',buildSha256:'a'.repeat(64),environment:'Assessed production environment',adapter:'receiver-v1',rails:['Settlement']},
 controls:coverage.requirements.map(r=>({id:r.id,status:'pass',evidenceUrls:['https://assessor.example/evidence/'+r.id]})),
});
const institution=(assessment:ReviewedAssessment|null=null):InstitutionRecord=>({id:'test-receiver',name:'Test receiver',website:'https://receiver.example/',assessment});

it('keeps an unqualified receiver red without inventing an observed technical failure',()=>{
 expect(institutionQualification(institution())).toMatchObject({status:'FAIL',tone:'red',basis:'missing-assessment',conformance:'not-demonstrated',assessment:null});
});
it('includes Chase and Wells Fargo and gives neither a qualification exemption',()=>{
 expect(institutionRecords.find(r=>r.id==='chase')?.name).toContain('Chase');
 expect(institutionRecords.find(r=>r.id==='wells-fargo')?.name).toBe('Wells Fargo');
 expect(institutionRecords).toHaveLength(59);
 expect(institutionRecords.every(r=>r.assessment===null&&institutionQualification(r).basis==='missing-assessment'&&institutionQualification(r).status==='FAIL')).toBe(true);
});
it('applies the same receiving controls to central banks and the BIS without category exemptions',()=>{
 const centralIds=['federal-reserve','european-central-bank','bank-of-england','bank-of-japan','swiss-national-bank','peoples-bank-of-china','bank-of-canada','reserve-bank-of-india'];
 const ids=[...centralIds,'bank-for-international-settlements'];
 for(const id of ids){
  const record=institutionRecords.find(record=>record.id===id)!;
  expect(record,id).toBeDefined();
  expect(record.kind).toBe(centralIds.includes(id)?'Central bank':'International financial institution');
  expect(institutionQualification(record)).toMatchObject({status:'FAIL',basis:'missing-assessment'});
  const assessment={...reviewed(),institutionId:id};
  expect(institutionQualification({...record,assessment})).toMatchObject({status:'PASS',basis:'reviewed-pass'});
  assessment.controls=assessment.controls.slice(1);
  expect(institutionQualification({...record,assessment})).toMatchObject({status:'FAIL',basis:'incomplete-evidence'});
 }
 expect(institutionRecords.find(record=>record.id==='federal-reserve')?.aliases).toContain('The Fed');
 expect(institutionRecords.find(record=>record.id==='european-central-bank')).toMatchObject({country:'Euro area',aliases:expect.arrayContaining(['ECB'])});
});
it('retains the original subjects and supplies unique searchable records across the major regions',()=>{
 const originalIds=['chase','wells-fargo','bank-of-america','citi','goldman-sachs','hsbc','morgan-stanley','ubs','barclays','deutsche-bank','bnp-paribas','santander','standard-chartered','rbc','td-bank-group','mufg','icbc','bny'];
 expect(institutionRecords.map(record=>record.id)).toEqual(expect.arrayContaining(originalIds));
 expect(new Set(institutionRecords.map(record=>record.id)).size).toBe(59);
 expect(new Set(institutionRecords.map(record=>record.region))).toEqual(new Set(['North America','Europe','Asia Pacific','Middle East & Africa','Latin America']));
 for(const record of institutionRecords){
  expect(record.country?.trim()).toBeTruthy();
  expect(new URL(record.website).protocol).toBe('https:');
 }
 expect(institutionRecords.find(record=>record.id==='credit-agricole')?.aliases).toContain('Credit Agricole');
 expect(institutionRecords.find(record=>record.id==='dbs')).toMatchObject({country:'Singapore',region:'Asia Pacific'});
 expect(institutionRecords.find(record=>record.id==='itau-unibanco')).toMatchObject({country:'Brazil',region:'Latin America'});
});
it('preserves the existing passed Bankeiz conformance Original instead of labeling it an absent assessment',()=>{
 expect(bankeizRecordedConformance).toMatchObject({recorded:true,name:'Bankeiz',scope:'Public integration contract',cases:33,url:'/conformance/bankeiz-public-conformance.png',referenceChecks:12,referenceChecksPassed:true});
 expect(bankeizRecordedConformance.implementationBuildSha256).toMatch(/^[a-f0-9]{64}$/);
 expect(institutionRecords.find(record=>record.id==='bankeiz')).toBeUndefined();
});
it('includes the actual Bankeiz Original as a scoped PASS in directory results',()=>{
 expect(scorecard.institutionDirectoryRecords).toEqual(expect.arrayContaining([expect.objectContaining({id:'bankeiz',name:'Bankeiz',country:'Global',region:'Global',kind:'Reference implementation'})]));
 const bankeiz=scorecard.institutionDirectoryRecords.find(record=>record.id==='bankeiz')!;
 expect(institutionQualification(bankeiz)).toMatchObject({status:'PASS',tone:'green',basis:'recorded-conformance',scope:'Public integration contract',conformance:'conforming-for-assessed-capability',recordedConformance:{recorded:true,cases:33,url:'/conformance/bankeiz-public-conformance.png',artifactSha256:'42639bee60e2650d4f58901ab9e66456ed2421a88330621c88d26e4e1889d75f',referenceChecks:12,referencePassedCount:12}});
 expect(scorecard.institutionDirectoryRecords).toHaveLength(60);
 expect(new Set(scorecard.institutionDirectoryRecords.map(record=>record.id)).size).toBe(60);
 expect(scorecard.institutionDirectoryRecords.filter(record=>institutionQualification(record).status==='PASS').map(record=>record.id)).toEqual(['bankeiz']);
});
it('keeps the published Original scope independent of a different receiving assessment and separate reference checks',()=>{
 const assessment=reviewed();assessment.controls[0].status='fail';
 const record={...scorecard.institutionDirectoryRecords.find(record=>record.id==='bankeiz')!,assessment,recordedConformance:{...bankeizRecordedConformance,referenceChecksPassed:false,referencePassedCount:0}};
 expect(institutionQualification(record)).toMatchObject({status:'PASS',basis:'recorded-conformance',scope:'Public integration contract'});
});
it('does not use one institution’s conformance Original to give another institution a PASS',()=>{
 const chase={...institutionRecords.find(record=>record.id==='chase')!,recordedConformance:bankeizRecordedConformance};
 expect(institutionQualification(chase)).toMatchObject({status:'FAIL',basis:'incomplete-evidence'});
 const bankeiz=scorecard.institutionDirectoryRecords.find(record=>record.id==='bankeiz')!;
 expect(institutionQualification(bankeiz).status).toBe('PASS');
});
it('does not turn incomplete published certificate metadata into a recorded PASS',()=>{
 for(const invalid of [{recorded:false},{url:'javascript:alert(1)'},{artifactSha256:''},{evidenceSha256:''},{holderReceizId:''},{implementationBuildSha256:''},{cases:0},{scope:''}]){
  const record={...scorecard.institutionDirectoryRecords.find(record=>record.id==='bankeiz')!,recordedConformance:{...bankeizRecordedConformance,...invalid}};
  expect(institutionQualification(record)).toMatchObject({status:'FAIL',basis:'incomplete-evidence',conformance:'not-demonstrated'});
 }
});
it('turns green only for a complete independently reviewed scoped pass',()=>{
 expect(institutionQualification(institution(reviewed()))).toMatchObject({status:'PASS',tone:'green',basis:'reviewed-pass',conformance:'conforming-for-assessed-capability'});
});
it('rejects missing or duplicate controls and missing source evidence despite a claimed PASS',()=>{
 const missing=reviewed();missing.controls.pop();
 const duplicate=reviewed();duplicate.controls[1]=duplicate.controls[0];
 const evidence=reviewed();evidence.controls[0].evidenceUrls=[];
 const pending=reviewed();pending.controls[0].status='missing';
 for(const report of [missing,duplicate,evidence,pending])expect(institutionQualification(institution(report))).toMatchObject({status:'FAIL',basis:'incomplete-evidence',conformance:'not-demonstrated'});
});
it('binds qualification to the receiver, reviewer, actual build, rails and review date',()=>{
 const wrong=reviewed();wrong.institutionId='another-receiver';
 const reviewer=reviewed();reviewer.reviewer='';
 const build=reviewed();build.scope.buildSha256='';
 const rail=reviewed();rail.scope.rails=[];
 const future=reviewed();future.reviewedOn='2099-01-01';
 for(const report of [wrong,reviewer,build,rail,future])expect(institutionQualification(institution(report)).status).toBe('FAIL');
});
it('requires safe inspectable report and evidence links',()=>{
 for(const url of ['javascript:alert(1)','https://user:secret@assessor.example/report','']){
  const report=reviewed();report.reportUrl=url;expect(institutionQualification(institution(report)).status).toBe('FAIL');
  const evidence=reviewed();evidence.controls[0].evidenceUrls=[url];expect(institutionQualification(institution(evidence)).status).toBe('FAIL');
 }
});
it('keeps evidenced technical failures distinct and refuses a contradictory green conclusion',()=>{
 const report=reviewed();report.outcome='nonconforming';report.controls[0].status='fail';
 expect(institutionQualification(institution(report))).toMatchObject({status:'FAIL',basis:'documented-failure',conformance:'nonconforming-for-assessed-capability'});
 report.outcome='conforming';expect(institutionQualification(institution(report)).status).toBe('FAIL');
 report.controls[0].evidenceUrls=[];expect(institutionQualification(institution(report)).conformance).toBe('not-demonstrated');
});
it('preserves an evidenced failed requirement alongside incomplete adjacent evidence',()=>{
 const report=reviewed();report.outcome='nonconforming';report.controls[0].status='fail';
 report.controls[1].status='missing';report.controls[1].evidenceUrls=[];
 expect(institutionQualification(institution(report))).toMatchObject({status:'FAIL',basis:'documented-failure',conformance:'nonconforming-for-assessed-capability'});
});
