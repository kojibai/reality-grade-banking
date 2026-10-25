// @vitest-environment happy-dom
import {expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {docsArticles} from '../src/content/banking-docs.mjs';
import {docsDocument} from '../scripts/docs-app.mjs';
const parse=(html:string)=>new DOMParser().parseFromString(html.replace(/<link\b[^>]*rel="stylesheet"[^>]*>/g,''),'text/html');
const legacy=['getting-started','infrastructure','identity','funding','payments','receiving','vaults','notes','records','recovery','agents','integrations','sdk','mcp','ai-skills','market-trading','market-records'];
const depth=['trust','concepts','reserve-settlement','fees','backup','security','permissions','offline','assets','backing','publication','ownership','market-value','verification','disclosure','agent-continuity','merchant-checkout','conformance','compatibility','glossary'];
it('keeps every published article and gives each essential operation a substantive sourced reference',()=>{
 expect(docsArticles.map(p=>p.slug)).toEqual(expect.arrayContaining([...legacy,...depth]));
 expect(new Set(docsArticles.map(p=>p.slug)).size).toBe(docsArticles.length);
 for(const p of docsArticles){const doc=parse(docsDocument(p));expect(doc.querySelector('main')!.textContent!.length,p.slug).toBeGreaterThan(1800);expect(doc.querySelectorAll('main section').length,p.slug).toBeGreaterThanOrEqual(5);expect(p.sources.length,p.slug).toBeGreaterThan(0);for(const related of p.related)expect(docsArticles.some(a=>a.slug===related),p.slug+':'+related).toBe(true);}
});
it('renders steps, captioned tables, code and an explained lifecycle in static HTML',()=>{
 const doc=parse(docsDocument(docsArticles.find(p=>p.slug==='merchant-checkout')!));
 expect(doc.querySelector('ol.docs-steps')).not.toBeNull();expect(doc.querySelector('table caption')?.textContent).toBeTruthy();expect(doc.querySelector('table th[scope="col"]')).not.toBeNull();expect(doc.querySelector('pre code[data-language="ts"]')?.textContent).toContain('createReceizClient');expect(doc.querySelector('figure.docs-flow figcaption')).not.toBeNull();
 expect(doc.querySelector('link[rel="alternate"][type="text/markdown"]')?.getAttribute('href')).toBe('https://docs.bankeiz.com/merchant-checkout/index.md');
 const graph=JSON.parse(doc.querySelector('script[type="application/ld+json"]')!.textContent!);expect(graph['@type']).toBe('TechArticle');expect(graph.url).toBe('https://docs.bankeiz.com/merchant-checkout/');
});
it('searches deep article text once while retaining distinct mobile and desktop topic links',()=>{
 document.body.innerHTML=parse(docsDocument()).body.innerHTML;
 const index=document.querySelector('#docs-search-index')!;expect(index).not.toBeNull();expect(document.querySelectorAll('#docs-search-index')).toHaveLength(1);
 new Function(readFileSync('docs-app/search.js','utf8'))();const input=document.querySelector<HTMLInputElement>('[data-doc-search]')!;
 input.value='bearer credential';input.dispatchEvent(new Event('input'));
 expect([...document.querySelectorAll<HTMLElement>('[data-doc-row]')].filter(e=>!e.hidden).some(e=>e.dataset.docId==='vaults')).toBe(true);
 expect(document.querySelector('[data-doc-search-status]')?.textContent).toContain('matching');
 input.value='no-match-97869';input.dispatchEvent(new Event('input'));expect(document.querySelector('[data-doc-empty]')?.hasAttribute('hidden')).toBe(false);
 input.value='';input.dispatchEvent(new Event('input'));expect([...document.querySelectorAll<HTMLElement>('.docs-index-card')].filter(e=>!e.hidden)).toHaveLength(docsArticles.length);
 document.body.innerHTML='';
});
it('keeps precise financial, custody and disclosure boundaries in the operating manual',()=>{
 const text=(slug:string)=>parse(docsDocument(docsArticles.find(p=>p.slug===slug)!)).querySelector('main')!.textContent!;
 expect(text('reserve-settlement')).toContain('Reserve');expect(text('reserve-settlement')).toContain('Settlement');expect(text('offline')).toContain('Received Notes');expect(text('offline')).toContain('confirmed account credit');
 expect(text('merchant-checkout')).toContain('referenceId');expect(text('merchant-checkout')).toContain('idempotency');expect(text('security')).toContain('unlocked');expect(text('disclosure')).toContain('private original');expect(text('market-value')).toContain('liquidity');
 for(const p of docsArticles)expect(text(p.slug)).not.toMatch(/cannot be hacked|guaranteed liquidity|FDIC.insured|unlimited hosted computation/);
});

it('escapes authored text and code rather than executing embedded markup',()=>{
 const fixture={...docsArticles[0],title:'Title <img src=x onerror=alert(1)>',sections:[{title:'Example',blocks:[{type:'paragraph' as const,text:'<script src="https://evil.invalid/run.js"></script>'},{type:'code' as const,language:'html',text:'</code><img src=x onerror=alert(1)>',caption:'Exact code'}]}]};
 const doc=parse(docsDocument(fixture));expect(doc.querySelector('h1 img')).toBeNull();expect(doc.querySelector('script[src="https://evil.invalid/run.js"]')).toBeNull();expect(doc.querySelector('pre img')).toBeNull();expect(doc.querySelector('pre code')?.textContent).toContain('<img');
});
