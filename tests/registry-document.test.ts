import {afterEach,expect,it,vi} from 'vitest';
import {registryDocumentResponse} from '../server/registry-document';
import type {RegistryStore} from '../server/registry-store';
import type {RegistryInstitutionState,RegistryPublication} from '../src/registry/types';
import {bankeizRecordedConformance} from '../src/content/institution-scorecard.mjs';

vi.mock('node:fs/promises',async original=>{
 const actual=await original<typeof import('node:fs/promises')>();
 return {...actual,readFile:async(path:unknown,...options:unknown[])=>String(path).endsWith('/registry-runtime/document-head.html')?'<!doctype html><html lang="en"><head><title>Registry</title></head><body data-bank-surface="learn"><div id="public-learn-root">':Reflect.apply(actual.readFile,actual,[path,...options])};
});
afterEach(()=>vi.useRealTimers());
const request=()=>new Request('https://bankeiz.com/registry/');
function publication(overrides:Partial<RegistryPublication>={}):RegistryPublication {
 return {schema:'bank.registry.publication.v1',institutionId:'chase',name:'Chase · JPMorgan Chase',scope:'Public integration contract',cases:33,artifactSha256:'a'.repeat(64),evidenceSha256:'b'.repeat(64),holderReceizId:'chase.receiz.id',implementationBuildSha256:'c'.repeat(64),officialProofUrl:'https://www.jpmorganchase.com/.well-known/reality-grade-banking/conformance.png',acceptedAt:'2026-11-06T01:00:00.000Z',url:'/api/bank/registry/original/chase/'+'a'.repeat(64),...overrides};
}
const state=(current=publication(),history:RegistryPublication[]=[]):RegistryInstitutionState=>({institutionId:current.institutionId,revision:history.length+1,current,history});
function store(list:()=>Promise<RegistryInstitutionState[]>):RegistryStore {return{list,append:async()=>{throw Error('Document rendering cannot publish');},original:async()=>{throw Error('Document rendering cannot reopen Originals');}};}
const article=(html:string,id:string)=>html.match(new RegExp('<article[^>]*data-institution-id="'+id+'"[^>]*>[\\s\\S]*?</article>'))?.[0]??'';

it('renders accepted scoped PASS and updated totals in raw HTML for another visitor',async()=>{
 const response=await registryDocumentResponse(request(),store(async()=>[state()])),html=await response.text();
 expect(response.headers.get('content-type')).toContain('text/html');
 expect(article(html,'chase')).toContain('data-qualification="PASS"');
 expect(article(html,'chase')).toContain('Public integration contract · 33 / 33 cases passed');
 expect(article(html,'chase')).toContain('/api/bank/registry/original/chase/'+'a'.repeat(64));
 expect(html).toContain('data-register-count="qualified">2</dd>');
 expect(html).toContain('data-register-count="evidence-required">58</dd>');
 expect(html).toMatch(/^<!doctype html>/i);expect(html).toMatch(/<\/div><\/body><\/html>$/);
});

it('streams the carried header and hero while accepted metadata is still pending',async()=>{
 let release!:(value:RegistryInstitutionState[])=>void;
 const pending=new Promise<RegistryInstitutionState[]>(resolve=>{release=resolve;});
 const response=await registryDocumentResponse(request(),store(()=>pending)),reader=response.body!.getReader();
 const first=await reader.read(),prefix=new TextDecoder().decode(first.value);
 expect(first.done).toBe(false);expect(prefix).toContain('Can this institution receive money');
 expect(prefix).not.toContain('<section id="institution-register"');
 release([state()]);let rest='';for(;;){const part=await reader.read();if(part.done)break;rest+=new TextDecoder().decode(part.value);}
 expect(article(rest,'chase')).toContain('data-qualification="PASS"');
});

it('keeps the carried snapshot visible with an honest notice when configured storage fails',async()=>{
 const html=await(await registryDocumentResponse(request(),store(async()=>{throw Error('private backend error');}))).text();
 expect(article(html,'chase')).toContain('data-qualification="FAIL"');
 expect(article(html,'bankeiz')).toContain('data-qualification="PASS"');
 expect(html).toContain('data-registry-snapshot-notice');expect(html).toContain('published snapshot');
 expect(html).not.toContain('private backend error');
});

it('bounds a stalled saved-metadata read without holding the available document',async()=>{
 vi.useFakeTimers();
 const response=await registryDocumentResponse(request(),store(()=>new Promise(()=>{}))),html=response.text();
 await vi.advanceTimersByTimeAsync(2100);
 expect(await html).toContain('data-registry-snapshot-notice');
});

it('renders static records without inventing a publication failure when no durable store is configured',async()=>{
 const html=await(await registryDocumentResponse(request(),null)).text();
 expect(article(html,'chase')).toContain('data-qualification="FAIL"');
 expect(article(html,'bankeiz')).toContain('data-qualification="PASS"');
 expect(html).not.toContain('data-registry-snapshot-notice');
});

it('ignores forged names, invalid bindings and unknown IDs instead of inserting their markup or granting PASS',async()=>{
 const forged=publication({name:'<img src=x onerror=alert(1)>'}),unknown=publication({institutionId:'unlisted',url:'/api/bank/registry/original/unlisted/'+'a'.repeat(64)});
 const html=await(await registryDocumentResponse(request(),store(async()=>[state(forged),state(unknown),state(publication({officialProofUrl:'https://attacker.example/proof.png'}))]))).text();
 expect(article(html,'chase')).toContain('data-qualification="FAIL"');
 expect(html).not.toContain('<img src=x');expect(html).not.toContain('attacker.example');
});

it('preserves Bankeiz’s recorded reference evidence when the accepted Original is unchanged',async()=>{
 const recorded=bankeizRecordedConformance;
 const current=publication({institutionId:'bankeiz',name:'Bankeiz',artifactSha256:recorded.artifactSha256,evidenceSha256:recorded.evidenceSha256,holderReceizId:recorded.holderReceizId,implementationBuildSha256:recorded.implementationBuildSha256,url:'/api/bank/registry/original/bankeiz/'+recorded.artifactSha256,officialProofUrl:'https://bankeiz.com/api/bank/registry/original/bankeiz/'+recorded.artifactSha256});
 const html=await(await registryDocumentResponse(request(),store(async()=>[state(current)]))).text();
 expect(article(html,'bankeiz')).toContain('12 / 12 checks passed');
 expect(article(html,'bankeiz')).toContain(recorded.url);
});

it('carries earlier accepted Originals and the revision in the rendered institution evidence',async()=>{
 const previous=publication({artifactSha256:'d'.repeat(64),url:'/api/bank/registry/original/chase/'+'d'.repeat(64),acceptedAt:'2026-11-05T01:00:00.000Z'});
 const html=await(await registryDocumentResponse(request(),store(async()=>[state(publication(),[previous])]))).text(),row=article(html,'chase');
 expect(row).toContain('data-qualification="PASS"');expect(row).toContain('Previous accepted Originals');
 expect(row).toContain(previous.url);expect(row).toContain('data-registry-revision="2"');
});

it('keeps Bankeiz’s earlier certificate and reference evidence alongside an accepted replacement',async()=>{
 const next=publication({institutionId:'bankeiz',name:'Bankeiz',holderReceizId:bankeizRecordedConformance.holderReceizId,url:'/api/bank/registry/original/bankeiz/'+'a'.repeat(64),officialProofUrl:'https://bankeiz.com/api/bank/registry/original/bankeiz/'+'a'.repeat(64)});
 const html=await(await registryDocumentResponse(request(),store(async()=>[state(next)]))).text(),row=article(html,'bankeiz');
 expect(row).toContain('data-qualification="PASS"');expect(row).toContain(next.url);
 expect(row).toContain(bankeizRecordedConformance.url);expect(row).toContain('12 / 12 checks passed');
});
