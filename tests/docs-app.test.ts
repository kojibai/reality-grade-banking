// @vitest-environment happy-dom
import {expect,it} from 'vitest';
import {existsSync,readFileSync} from 'node:fs';
import {docsArticles,docsOrigin,docsEdition} from '../src/content/banking-docs.mjs';
import {docsDocument} from '../scripts/docs-app.mjs';
const parse=(s:string)=>new DOMParser().parseFromString(s.replace(/<link\b[^>]*rel="stylesheet"[^>]*>/g,''),'text/html');
it('preserves seventeen published articles within the complete task-oriented manual',()=>{
 expect(docsArticles).toHaveLength(48);expect(docsOrigin).toBe('https://docs.bankeiz.com');
 for(const page of [null,...docsArticles])expect(parse(docsDocument(page)).querySelector('.docs-footer-brand')?.textContent?.trim()).toBe('Bankeiz Documentation');
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

it('makes all three architecture terms direct links to distinct in-depth chapters in either docs deployment',()=>{
 for(const base of ['/','/docs/']){
  const doc=parse(docsDocument(null,{base})),architecture=doc.querySelector('.docs-architecture')!;
  for(const [title,slug] of [['Proof-native economy','economy'],['Reality-grade banking','banking'],['Reality-grade infrastructure','infrastructure']]){
   const link=architecture.querySelector<HTMLAnchorElement>('a[href="'+base+slug+'/"]');
   expect(link?.textContent).toContain(title);const page=docsArticles.find(p=>p.slug===slug)!;expect(page?.sections.length).toBeGreaterThanOrEqual(5);
   const chapter=parse(docsDocument(page,{base}));expect(chapter.querySelector('h1')?.textContent).toBe(title);expect(chapter.querySelector('link[rel=canonical]')?.getAttribute('href')).toBe(docsOrigin+'/'+slug+'/');
  }
 }
});

it('gives every docs page an accessible footer with a reading shortcut and local links in either build',()=>{
 for(const base of ['/','/docs/']){
  for(const page of [null,docsArticles.find(p=>p.slug==='funding')!]){
   const doc=parse(docsDocument(page,{base}));
   const footer=doc.querySelector('body>footer.docs-footer')!;
   expect(footer,base).not.toBeNull();
   expect(footer.querySelector('.docs-footer-menu summary')?.textContent).toContain('Links');
   const top=footer.querySelector<HTMLAnchorElement>('a[href="#docs-top"]')!;
   expect(top.textContent).toContain('Back to top');
   expect(doc.querySelector(top.getAttribute('href')!)).not.toBeNull();
   expect(footer.querySelector('nav[aria-label="Documentation resources"] a[href="'+base+'llms.txt"]')).not.toBeNull();
   expect(footer.querySelector('nav[aria-label="Policies and support"] a[href="https://bankeiz.com/terms/"]')).not.toBeNull();
  }
 }
});

it('switches the docs theme and keeps the choice in docs storage',()=>{
 const doc=parse(docsDocument(null));
 document.body.innerHTML=doc.body.innerHTML;
 localStorage.setItem('bankeiz.docs.theme','light');
 const button=document.querySelector<HTMLButtonElement>('[data-doc-theme-toggle]')!;
 try{
  expect(button).not.toBeNull();
  new Function(readFileSync('docs-app/search.js','utf8'))();
  expect(button.getAttribute('aria-label')).toBe('Switch to dark mode');
  button.click();
  expect(document.documentElement.dataset.docTheme).toBe('dark');
  expect(localStorage.getItem('bankeiz.docs.theme')).toBe('dark');
  expect(button.getAttribute('aria-label')).toBe('Switch to light mode');
  button.click();
  expect(document.documentElement.dataset.docTheme).toBe('light');
 }finally{
  localStorage.removeItem('bankeiz.docs.theme');
  delete document.documentElement.dataset.docTheme;
  document.body.innerHTML='';
 }
});
