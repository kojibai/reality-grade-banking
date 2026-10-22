import {existsSync, readFileSync} from 'node:fs';
import {expect,it,vi} from 'vitest';
import profile from '../institution/receiver-profile.json';
import coverage from '../src/conformance/coverage.json';

it('keeps external caller claims missing until applicable original execution evidence is independently established', async()=>{
 const path=new URL('../src/conformance/assessment.ts',import.meta.url);
 expect(existsSync(path),'external implementation assessment engine must exist').toBe(true);
 const {assessImplementation}=await import('../src/conformance/assessment');
 const report=await assessImplementation({schema:'receiz.bank.external-assessment.v1',implementation:{name:'Independent receiver',buildSha256:'a'.repeat(64),sourceRevision:'external-r1',environment:'isolated test',adapter:'external adapter'},profile:{profileVersion:profile.profileVersion,receizVersion:profile.receizVersion,ruleset:profile.ruleset,registryDigest:profile.registryDigest,operationMatrixDigest:profile.operationMatrixDigest},scope:{capabilities:['notes'],rails:['reserve']},cases:coverage.requirements.map(r=>({id:r.id,passed:true})),institutionConformance:'conforming'},[]);
 expect(report.institutionConformance).toBe('not-demonstrated');
 expect(report.requirements).toHaveLength(16);
 expect(report.requirements.every(r=>r.status==='FAIL'&&r.reason==='missing-proof')).toBe(true);
 expect(report.assessmentPassed).toBe(false);
 expect(report.checks.some(r=>r.status==='PASS')).toBe(true);
 expect(report.financialActionsPerformed).toBe(0);
});
it('refuses changed profile, unsupported scope and mismatched source hashes with actionable retests',async()=>{
 const {assessImplementation}=await import('../src/conformance/assessment');
 const report=await assessImplementation({schema:'receiz.bank.external-assessment.v1',implementation:{name:'External',buildSha256:'bad'},profile:{...profile,registryDigest:'0'.repeat(64)},scope:{capabilities:['unknown'],rails:['composite']},sources:[{name:'original.png',sha256:'0'.repeat(64)}]},[{name:'original.png',bytes:new TextEncoder().encode('changed')}]);
 expect(report.checks.some(c=>c.id==='profile'&&c.status==='FAIL')).toBe(true);
 expect(report.checks.some(c=>c.id==='scope'&&c.status==='FAIL')).toBe(true);
 expect(report.checks.some(c=>c.id==='source:original.png'&&c.status==='FAIL')).toBe(true);
 expect(report.checks.filter(c=>c.status==='FAIL').every(c=>c.remediation.length>0)).toBe(true);
});
it('verifies exact original bytes only after matching the declared digest and keeps credit and qualification separate',async()=>{
 const {assessImplementation,sha256}=await import('../src/conformance/assessment');
 const bytes=new Uint8Array([1,2,3]),verify=vi.fn(async()=>({carriedChainVerified:true,creditAuthorized:false}));
 const report=await assessImplementation({schema:'receiz.bank.external-assessment.v1',implementation:{name:'Receiver',buildSha256:'a'.repeat(64),sourceRevision:'r1',environment:'test',adapter:'adapter'},profile:{...profile},scope:{capabilities:['notes'],rails:['reserve']},sources:[{name:'original.png',sha256:await sha256(bytes)}],cases:[]},[{name:'original.png',bytes}],verify);
 expect(verify).toHaveBeenCalledWith(bytes);
 expect(report.sources[0].status).toBe('PASS');
 expect(report.requirements.find(r=>r.id==='atomic-once-only-consumption-and-credit')?.status).toBe('FAIL');
 expect(report.institutionConformance).toBe('not-demonstrated');
});
it('publishes a language-neutral protocol with mutations, recovery, all Note paths and no asserted-success authority',()=>{
 const path=new URL('../institution/conformance-protocol.json',import.meta.url);
 expect(existsSync(path),'language-neutral adapter protocol must exist').toBe(true);
 const protocol=JSON.parse(readFileSync(path,'utf8'));
 expect(protocol.cases.length).toBeGreaterThanOrEqual(16);
 for(const r of coverage.requirements)expect(protocol.cases.some((c:{requirementId:string})=>c.requirementId===r.id)).toBe(true);
 expect(protocol.noteLifecycle).toEqual(coverage.noteLifecycle);
 expect(protocol.reportIsAuthority).toBe(false);
});
it('never accepts protocol evidence bindings to changed or duplicated original files',async()=>{
 const {assessImplementation,caseDigest,protocol}=await import('../src/conformance/assessment');
 const one=protocol.cases[0],fake='a'.repeat(64);
 const input={schema:protocol.reportSchema,implementation:{name:'Receiver',buildSha256:fake,sourceRevision:'r',environment:'e',adapter:'a'},profile:protocol.profile,scope:{capabilities:['notes'],rails:['reserve']},sources:[{name:'proof.png',sha256:fake}],cases:[{id:one.id,rail:'reserve',caseDigest:await caseDigest(one),implementationBuildSha256:fake,evidenceSha256:[fake],observed:one.expected}]};
 const result=await assessImplementation(input,[{name:'proof.png',bytes:new Uint8Array([0])}]);
 expect(result.checks.find(c=>c.id===`case:${one.id}:reserve`)?.status).toBe('FAIL');
 const duplicate=await assessImplementation(input,[{name:'proof.png',bytes:new Uint8Array([0])},{name:'proof.png',bytes:new Uint8Array([1])}]);
 expect(duplicate.checks.find(c=>c.id==='duplicate-sources')?.status).toBe('FAIL');
});
it('does not silently replace the adapter report rail scope with the reviewer selection',async()=>{
 const {assessImplementation,protocol}=await import('../src/conformance/assessment');
 const input={schema:protocol.reportSchema,implementation:{name:'Receiver',buildSha256:'a'.repeat(64),sourceRevision:'r',environment:'e',adapter:'a'},profile:protocol.profile,scope:{capabilities:['notes'],rails:['reserve']}};
 const report=await assessImplementation(input,[],undefined,{capabilities:['notes'],rails:['settlement']});
 expect(report.checks.find(c=>c.id==='requested-scope')?.status).toBe('FAIL');
});
it('distinguishes exact accepted-intent recovery from a conflicting second credit',async()=>{
 const {assessImplementation,caseDigest,protocol,sha256}=await import('../src/conformance/assessment');
 const retry=protocol.cases.find(c=>c.id==='same-intent-retry');
 expect(retry,'NOTE-04 identical accepted intent must reopen its original result').toBeDefined();
 const bytes=new Uint8Array([4,5,6]),hash=await sha256(bytes),build='a'.repeat(64);
 const observed={outcome:'idempotent',additionalCredit:'0',headAdvances:0,resultDisposition:'original'};
 const input={schema:protocol.reportSchema,implementation:{name:'Receiver',buildSha256:build,sourceRevision:'r',environment:'isolated',adapter:'adapter'},profile:protocol.profile,scope:{capabilities:['notes'],rails:['reserve']},sources:[{name:'original.png',sha256:hash}],cases:[{id:retry!.id,rail:'reserve',caseDigest:await caseDigest(retry),implementationBuildSha256:build,evidenceSha256:[hash],observed}]};
 const report=await assessImplementation(input,[{name:'original.png',bytes}]);
 expect(report.checks.find(c=>c.id==='case:same-intent-retry:reserve')?.status).toBe('PASS');
 input.cases[0].observed={...observed,additionalCredit:'1'};
 const changed=await assessImplementation(input,[{name:'original.png',bytes}]);
 expect(changed.checks.find(c=>c.id==='case:same-intent-retry:reserve')?.status).toBe('FAIL');
 expect(protocol.cases.find(c=>c.id==='replay-credit')?.action).toMatch(/different|conflicting/);
});
