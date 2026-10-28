// @vitest-environment happy-dom
import {expect,it} from 'vitest';
import {existsSync,readFileSync} from 'node:fs';
import {docsArticles,docsOrigin,docsEdition} from '../src/content/banking-docs.mjs';
import {docsDocument} from '../scripts/docs-app.mjs';
const parse=(s:string)=>new DOMParser().parseFromString(s.replace(/<link\b[^>]*rel="stylesheet"[^>]*>/g,''),'text/html');
it('preserves seventeen published articles within the complete task-oriented manual',()=>{
 expect(docsArticles).toHaveLength(45);expect(docsOrigin).toBe('https://docs.bankeiz.com');
 for(const page of [null,...docsArticles])expect(parse(docsDocument(page)).querySelector('.docs-footer>p')?.textContent).toBe('Proof-native economy · Reality-grade banking · Reality-grade infrastructure.');
 for(const p of docsArticles){expect(p.sections.length).toBeGreaterThanOrEqual(3);expect(p.sources.length).toBeGreaterThan(0);for(const [label,href] of p.sources){expect(label).toBeTruthy();expect(href).toMatch(/^https:\/\/(?:github.com\/kojibai\/reality-grade-banking|receiz.com\/developers|docs.receiz.com)/);}}
});
it('renders independent readable first paint with a shared canonical, source links and no banking runtime',()=>{
 const page=docsArticles.find(p=>p.slug==='funding')!;
 for(const base of ['/','/docs/']){const html=docsDocument(page,{base}),doc=parse(html);expect(doc.querySelector('h1')?.textContent).toBe(page.title);expect(doc.querySelector('link[rel=canonical]')?.getAttribute('href')).toBe(docsOrigin+'/funding/');expect(doc.querySelector('a[href="https://bankeiz.com/"]')).not.toBeNull();expect(doc.querySelector('[data-doc-search]')).not.toBeNull();expect(doc.querySelector('script[src]')?.getAttribute('src')).toBe(base+'assets/docs.js');expect(html).not.toMatch(/receiz-navigation|data-coop|serviceWorker|api\/cooperatives|type="module"/);expect(doc.querySelector('nav a[href="'+base+'payments/"]')).not.toBeNull();}
});

it('keeps every repository source link resolvable and filters documentation locally',()=>{
 for(const p of docsArticles)for(const [,href] of p.sources){const marker='/blob/'+docsEdition.sourceRevision+'/';if(href.includes(marker))expect(existsSync(href.split(marker)[1]),href).toBe(true);}
 document.body.innerHTML=parse(docsDocument(null,{base:'/docs/'})).body.innerHTML;new Function(readFileSync('docs-app/search.js','utf8'))();const input=document.querySelector<HTMLInputElement>('[data-doc-search]')!;input.value='market nonce';input.dispatchEvent(new Event('input'));const shown=[...document.querySelectorAll<HTMLElement>('.docs-index-card')].filter(e=>!e.hidden);expect(shown.length).toBeGreaterThan(0);expect(shown.map(e=>e.getAttribute('href'))).toEqual(expect.arrayContaining(['/docs/market-trading/','/docs/market-records/']));const index=JSON.parse(document.querySelector('#docs-search-index')!.textContent!);expect(shown.every(e=>index[e.dataset.docId!].includes('market')&&index[e.dataset.docId!].includes('nonce'))).toBe(true);input.value='nothingmatches987';input.dispatchEvent(new Event('input'));expect(document.querySelector('[data-doc-search-status]')?.textContent).toContain('0 matching');input.value='';input.dispatchEvent(new Event('input'));expect([...document.querySelectorAll<HTMLElement>('.docs-index-card')].filter(e=>!e.hidden)).toHaveLength(docsArticles.length);document.body.innerHTML='';
});
