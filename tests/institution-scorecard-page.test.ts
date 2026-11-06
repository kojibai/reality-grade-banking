import {existsSync} from 'node:fs';
import {Window} from 'happy-dom';
import {describe,expect,it} from 'vitest';
import coverage from '../src/conformance/coverage.json';
import bankeizCertificate from '../src/content/conformance-certificate.json';
import type {InstitutionRecord,ReviewedAssessment} from '../src/content/institution-scorecard.mjs';

async function render(records?:readonly InstitutionRecord[]) {
 expect(existsSync('scripts/institution-scorecard-page.mjs'),'the public scorecard renderer exists').toBe(true);
 const {institutionScorecardContent}=await import('../scripts/institution-scorecard-page.mjs');
 const window=new Window();
 window.document.body.innerHTML=institutionScorecardContent(records);
 return window.document;
}

const reviewedAssessment=():ReviewedAssessment=>({
 institutionId:'reviewed-receiver',reviewer:'Independent review group',reviewedOn:'2026-11-05',
 reportUrl:'https://example.org/reports/receiver-2',
 scope:{capability:'Proof-native receiving and onward transfer',buildSha256:'a'.repeat(64),environment:'Production receiving endpoint',adapter:'receiver-adapter-v2',rails:['Settlement']},
 outcome:'conforming',
 controls:coverage.requirements.map(({id})=>({id,status:'pass',evidenceUrls:['https://example.org/evidence/'+id]})),
 previousReports:['https://example.org/reports/receiver-1'],
});

const lookupFixture=()=>[
 {id:'reviewed-receiver',name:'Reviewed Receiver',aliases:['RR Bank','Récepteur'],country:'France',region:'Europe',kind:'Bank',website:'https://example.org/',assessment:reviewedAssessment()},
 {id:'unassessed',name:'Unassessed Institution',aliases:['UI'],country:'Canada',region:'North America',kind:'Credit union',website:'https://example.ca/',assessment:null},
] as InstitutionRecord[];

describe('Reality-Grade Banking conformance register',()=>{
 it('delivers the entire directory without JavaScript and labels progressively enhanced lookup controls',async()=>{
  const document=await render(lookupFixture());
  expect(document.querySelectorAll('h1')).toHaveLength(1);
  expect(document.querySelector('h1')?.textContent).toBe('Conformance Register.');
  expect(document.querySelector('.isc-hero .isc-eyebrow')?.textContent).toBe('Reality-Grade Banking');
  expect(document.querySelector('.isc-hero-lede')?.textContent).toBe('Can this institution receive money and keep its original proof, provenance, ownership and complete history intact through the next transfer?');
  expect(document.querySelector('main')?.getAttribute('data-public-script')).toBe('institution-scorecard');
  const directory=document.querySelector('[data-institution-directory]');
  expect(directory).not.toBeNull();
  const records=[...directory!.querySelectorAll('[data-directory-record]')];
  expect(records).toHaveLength(2);
  expect(records.every(record=>!record.hasAttribute('hidden'))).toBe(true);
  expect(directory?.querySelector('[data-directory-controls]')?.hasAttribute('hidden')).toBe(true);
  for(const selector of ['[data-directory-query]','[data-directory-region-filter]','[data-directory-country-filter]','[data-directory-status-filter]','[data-directory-sort]']){
   const control=directory!.querySelector(selector)!;
   expect(control).not.toBeNull();
   const label=document.querySelector('label[for="'+control.id+'"]');
   expect(label?.textContent?.trim()).not.toBe('');
   expect(label).not.toBeNull();
  }
  expect(directory?.querySelector('[data-directory-query]')?.getAttribute('type')).toBe('search');
  expect(directory?.querySelector('.isc-query-input svg')?.getAttribute('aria-hidden')).toBe('true');
  expect(directory?.querySelector('.isc-query-input svg')?.classList.contains('lucide-search')).toBe(true);
  expect([...directory!.querySelectorAll('[data-directory-region-filter] option')].map(option=>[option.getAttribute('value'),option.textContent])).toEqual([['all','All regions'],['Europe','Europe'],['North America','North America']]);
  expect([...directory!.querySelectorAll('[data-directory-country-filter] option')].map(option=>[option.getAttribute('value'),option.textContent])).toEqual([['all','All countries'],['Canada','Canada'],['France','France']]);
  expect([...directory!.querySelectorAll('[data-directory-status-filter] option')].map(option=>option.getAttribute('value'))).toEqual(['all','pass','fail']);
  expect([...directory!.querySelectorAll('[data-directory-sort] option')].map(option=>option.getAttribute('value'))).toEqual(['default','name-asc','name-desc','pass-first']);
  expect(directory?.querySelector('[data-directory-record-list]')?.querySelectorAll(':scope > [data-directory-record]')).toHaveLength(2);
  expect(directory?.querySelector('[data-directory-clear]')?.getAttribute('type')).toBe('button');
  expect(directory?.querySelector('[data-directory-results]')?.getAttribute('aria-live')).toBe('polite');
  expect(directory?.querySelector('[data-directory-results]')?.getAttribute('aria-atomic')).toBe('true');
  expect(directory?.querySelector('[data-directory-results]')?.textContent).toContain('2 institutions');
  expect(directory?.querySelector('[data-directory-empty]')?.hasAttribute('hidden')).toBe(true);
  const reviewed=directory?.querySelector('[data-institution-id="reviewed-receiver"]');
  expect(reviewed?.getAttribute('data-directory-region')).toBe('Europe');
  expect(reviewed?.getAttribute('data-directory-country')).toBe('France');
  expect(reviewed?.getAttribute('data-directory-name')).toBe('Reviewed Receiver');
  for(const term of ['Reviewed Receiver','RR Bank','Récepteur','France','Europe','Bank'])expect(reviewed?.getAttribute('data-directory-search')).toContain(term);
  expect(document.querySelectorAll('main script')).toHaveLength(0);
 });

 it('pairs compact total labels with the institution, pass and evidence counts',async()=>{
  const document=await render(lookupFixture());
  const totals=[...document.querySelectorAll('.isc-register-counts > div')];
  expect(totals.map(total=>[total.querySelector('dt')?.textContent,total.querySelector('dd')?.textContent])).toEqual([['Institutions','2'],['Passed','1'],['Evidence required','1']]);
 });

 it('indexes a broad roster and keeps unassessed institutions red with their evidence basis beside each verdict',async()=>{
  const document=await render();
  const records=[...document.querySelectorAll('[data-directory-record]')];
  expect(records.length).toBeGreaterThanOrEqual(51);
  const external=records.filter(record=>record.getAttribute('data-institution-id')!=='bankeiz');
  expect(external.length).toBeGreaterThanOrEqual(50);
  for(const record of external){
   expect(record.getAttribute('data-qualification')).toBe('FAIL');
   expect(record.querySelector('[data-qualification-verdict]')?.textContent).toBe('FAIL');
   expect(record.querySelector('[data-qualification-context]')?.textContent).toContain('Conformance not demonstrated');
   expect(record.querySelector('[data-qualification-context]')?.textContent).toMatch(/assessment/i);
   expect(record.querySelector('details > summary')?.textContent).toContain(record.querySelector('h3')?.textContent);
  }
  for(const name of ['Chase · JPMorgan Chase','Wells Fargo','Bank of America','Citi','Goldman Sachs','HSBC','Morgan Stanley','UBS','Barclays','Deutsche Bank','BNP Paribas','Santander','Standard Chartered','Royal Bank of Canada','TD Bank Group','MUFG','ICBC','BNY'])expect(external.some(record=>record.querySelector('h3')?.textContent===name),name).toBe(true);
  expect(document.querySelector('[data-register-count="listed"]')?.textContent).toBe(String(records.length));
  expect(document.querySelector('[data-register-count="qualified"]')?.textContent).toBe('1');
  expect(document.querySelector('[data-register-count="evidence-required"]')?.textContent).toBe(String(external.length));
  expect(document.querySelector('#institution-register')?.textContent).toMatch(/does not report.*trial/i);
 });

 it('renders a local logo asset for each institution while preserving its accessible name',async()=>{
  const document=await render();
  const records=[...document.querySelectorAll('[data-directory-record]')];
  for(const record of records){
   const image=record.querySelector('.isc-logo img');
   expect(image,record.getAttribute('data-institution-id')??'institution').not.toBeNull();
   expect(image?.getAttribute('alt')).toBe('');
   expect(image?.getAttribute('width')).toBe('40');
   expect(image?.getAttribute('height')).toBe('40');
   expect(image?.getAttribute('loading')).toBe('lazy');
   const src=image?.getAttribute('src')??'';
   expect(src.startsWith('/')).toBe(true);
   expect(existsSync('public'+src),src).toBe(true);
   expect(record.querySelector('h3')?.textContent?.trim()).not.toBe('');
  }
  expect(document.querySelector('[data-institution-id="bankeiz"] .isc-logo img')?.getAttribute('src')).toBe('/icon.svg');
 });

 it('keeps one verified Bankeiz PASS in the directory with its original and complete evidence',async()=>{
  const document=await render();
  const panel=document.querySelector('[data-bankeiz-recorded-conformance]');
  const row=document.querySelector('[data-directory-record][data-institution-id="bankeiz"]');
  expect(panel).toBeNull();
  expect(document.querySelectorAll('[data-qualification="PASS"]')).toHaveLength(1);
  expect(row?.getAttribute('data-qualification')).toBe('PASS');
  expect(row?.getAttribute('data-directory-search')).toContain('Bankeiz');
  expect(row?.querySelector('[data-qualification-context]')?.textContent).toContain('Public integration contract');
  expect(row?.querySelector('[data-qualification-context]')?.textContent).toContain('33 / 33');
  expect(row?.textContent).toContain('12 / 12');
  expect(row?.textContent).toMatch(/reference checks/i);
  for(const element of [row]){
   expect(element?.querySelector('a[href="/conformance/bankeiz-public-conformance.png"]')).not.toBeNull();
   for(const value of [bankeizCertificate.artifactSha256,bankeizCertificate.evidenceSha256,bankeizCertificate.implementationBuildSha256,bankeizCertificate.holderReceizId])expect(element?.querySelector('details')?.textContent).toContain(value);
   expect(element?.querySelector('details')?.textContent).not.toContain('Missing qualifying assessment');
  }
 });

 it('renders a reviewed pass with a visible capability and retains its exact report scope and history',async()=>{
  const document=await render(lookupFixture().slice(0,1));
  const record=document.querySelector('[data-institution-id="reviewed-receiver"]');
  expect(record?.getAttribute('data-qualification')).toBe('PASS');
  expect(record?.querySelector('[data-qualification-verdict]')?.textContent).toBe('PASS');
  expect(record?.textContent).toContain('Conforming for the assessed capability');
  expect(record?.querySelector('[data-qualification-context]')?.textContent).toContain('Proof-native receiving and onward transfer');
  for(const field of ['Production receiving endpoint','receiver-adapter-v2','Settlement','a'.repeat(64),'Independent review group'])expect(record?.textContent).toContain(field);
  expect(record?.querySelector('a[href="https://example.org/reports/receiver-2"]')).not.toBeNull();
  expect(record?.querySelector('a[href="https://example.org/reports/receiver-1"]')).not.toBeNull();
  expect(record?.textContent).toContain('Exact scope');
  expect(document.querySelector('[data-register-count="qualified"]')?.textContent).toBe('1');
  expect(document.querySelector('[data-register-count="evidence-required"]')?.textContent).toBe('0');
 });

 it('does not turn an incomplete assessment green or hide missing control evidence',async()=>{
  const assessment=reviewedAssessment();
  assessment.controls[0]={...assessment.controls[0],status:'missing',evidenceUrls:[]};
  const document=await render([{id:'reviewed-receiver',name:'Incomplete Receiver',website:'https://example.org/',assessment}]);
  const record=document.querySelector('[data-institution-id="reviewed-receiver"]');
  expect(record?.getAttribute('data-qualification')).toBe('FAIL');
  expect(record?.querySelector('[data-qualification-verdict]')?.textContent).toBe('FAIL');
  expect(record?.querySelector('[data-control-id="exact-enclosing-source-verification"]')?.textContent).toMatch(/missing/i);
  expect(document.querySelector('[data-register-count="qualified"]')?.textContent).toBe('0');
 });

 it('renders malformed control evidence as incomplete FAIL instead of aborting the public page',async()=>{
  const assessment=reviewedAssessment();assessment.controls=[null] as unknown as ReviewedAssessment['controls'];
  const document=await render([{id:'reviewed-receiver',name:'Incomplete receiver',website:'https://example.org/',assessment}]);
  expect(document.querySelector('[data-institution-id]')?.getAttribute('data-qualification')).toBe('FAIL');
  expect(document.querySelector('[data-institution-id]')?.textContent).toContain('Control evidence missing.');
 });

 it('preserves the common public header and concrete standard and evidence links',async()=>{
  const document=await render();
  // @ts-expect-error Existing public template is authored as JavaScript without declarations.
  const {learnHeader}=await import('../scripts/learn-template.mjs');
  const headerDocument=new Window().document;
  headerDocument.body.innerHTML=learnHeader();
  expect(document.querySelector('.learn-header')?.outerHTML).toBe(headerDocument.querySelector('.learn-header')?.outerHTML);
  expect(document.querySelector('footer')).not.toBeNull();
  expect(document.querySelectorAll('[data-continuity-requirement]')).toHaveLength(5);
  expect([...document.querySelectorAll('.isc-requirement-number')].map(number=>number.textContent)).toEqual(['01','02','03','04','05']);
  for(const href of ['/conformance/#assess','/build/','/institutions/'])expect(document.querySelector('main a[href="'+href+'"]')).not.toBeNull();
  expect([...document.querySelectorAll('main a')].some(a=>a.getAttribute('href')?.endsWith('/docs/conformance/independent-assessment-procedure.md'))).toBe(true);
  for(const a of document.querySelectorAll('main a[href^="#"]'))expect(document.getElementById(a.getAttribute('href')!.slice(1))).not.toBeNull();
  expect(document.querySelector('main')?.textContent).toContain('Conformance under Reality-Grade Banking');
  expect(document.querySelector('main')?.textContent).toContain('Evidence belongs with the verdict.');
 });

 it('escapes lookup metadata and keeps executable URLs out of evidence links',async()=>{
  const assessment=reviewedAssessment();
  assessment.reportUrl='javascript:alert(1)';
  assessment.previousReports=['javascript:alert(2)'];
  const records=[{id:'quoted" id',name:'Receiver <script>alert(1)</script>',aliases:['Alias" data-break="yes'],country:'<France>',region:'Europe" onclick="alert(4)',kind:'<Bank>',website:'javascript:alert(3)',assessment}] as InstitutionRecord[];
  const document=await render(records);
  const record=document.querySelector('[data-directory-record]');
  expect(record?.getAttribute('data-institution-id')).toBe('quoted" id');
  expect(record?.querySelector('h3')?.textContent).toBe('Receiver <script>alert(1)</script>');
  expect(record?.getAttribute('data-directory-search')).toContain('Alias" data-break="yes');
  expect(record?.getAttribute('data-directory-region')).toBe('Europe" onclick="alert(4)');
  expect(record?.getAttribute('data-directory-country')).toBe('<France>');
  expect(record?.getAttribute('data-directory-name')).toBe('Receiver <script>alert(1)</script>');
  expect(document.querySelectorAll('main script, main a[href^="javascript:"], main [onclick], main [data-break]')).toHaveLength(0);
 });
});
