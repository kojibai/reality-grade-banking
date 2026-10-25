// @vitest-environment happy-dom
import {expect,it} from 'vitest';
import {existsSync,readFileSync} from 'node:fs';
import {docsArticles,docsOrigin} from '../src/content/banking-docs.mjs';
import {docsDocument} from '../scripts/docs-app.mjs';
const parse=(s:string)=>new DOMParser().parseFromString(s.replace(/<link\b[^>]*rel="stylesheet"[^>]*>/g,''),'text/html');
it('documents the standard in seventeen task-oriented articles from repo sources',()=>{
 expect(docsArticles).toHaveLength(17);expect(docsOrigin).toBe('https://docs.bankeiz.com');
 for(const p of docsArticles){expect(p.sections.length).toBeGreaterThanOrEqual(3);expect(p.sources.length).toBeGreaterThan(0);for(const [label,href] of p.sources){expect(label).toBeTruthy();expect(href).toMatch(/^https:\/\/(?:github.com\/kojibai\/reality-grade-banking|receiz.com\/developers|docs.receiz.com)/);}}
});
it('renders independent readable first paint with a shared canonical, source links and no banking runtime',()=>{
 const page=docsArticles.find(p=>p.slug==='funding')!;
 for(const base of ['/','/docs/']){const html=docsDocument(page,{base}),doc=parse(html);expect(doc.querySelector('h1')?.textContent).toBe(page.title);expect(doc.querySelector('link[rel=canonical]')?.getAttribute('href')).toBe(docsOrigin+'/funding/');expect(doc.querySelector('a[href="https://bankeiz.com/"]')).not.toBeNull();expect(doc.querySelector('[data-doc-search]')).not.toBeNull();expect(doc.querySelector('script')?.getAttribute('src')).toBe(base+'assets/docs.js');expect(html).not.toMatch(/receiz-navigation|data-coop|serviceWorker|api\/cooperatives|type="module"/);expect(doc.querySelector('nav a[href="'+base+'payments/"]')).not.toBeNull();}
});

it('keeps every repository source link resolvable and filters documentation locally',()=>{
 for(const p of docsArticles)for(const [,href] of p.sources){const marker='/blob/6c5d582/';if(href.includes(marker))expect(existsSync(href.split(marker)[1]),href).toBe(true);}
 document.body.innerHTML=parse(docsDocument(null,{base:'/docs/'})).body.innerHTML;new Function(readFileSync('docs-app/search.js','utf8'))();const input=document.querySelector<HTMLInputElement>('[data-doc-search]')!;input.value='market nonce';input.dispatchEvent(new Event('input'));const shown=[...document.querySelectorAll<HTMLElement>('.docs-index-card')].filter(e=>!e.hidden);expect(shown.length).toBeGreaterThan(0);expect(shown.map(e=>e.getAttribute('href'))).toEqual(expect.arrayContaining(['/docs/market-trading/','/docs/market-records/']));expect(shown.every(e=>e.dataset.docSearchTerms?.includes('market')&&e.dataset.docSearchTerms?.includes('nonce'))).toBe(true);input.value='nothingmatches987';input.dispatchEvent(new Event('input'));expect(document.querySelector('[data-doc-search-status]')?.textContent).toContain('0 matching');input.value='';input.dispatchEvent(new Event('input'));expect([...document.querySelectorAll<HTMLElement>('.docs-index-card')].filter(e=>!e.hidden)).toHaveLength(17);document.body.innerHTML='';
});
