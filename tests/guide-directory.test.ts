import {afterEach,expect,it,vi} from 'vitest';
import {existsSync,readFileSync} from 'node:fs';
import {Window} from 'happy-dom';
const window=new Window(),document=window.document as unknown as Document;
vi.stubGlobal('document',document);
import {gzipSync} from 'node:zlib';
// @ts-expect-error Public build template is standalone ESM.
import {learningDirectoryPage} from '../scripts/learn-template.mjs';

afterEach(()=>{document.body.innerHTML='';vi.restoreAllMocks();});
const rendered=()=>{document.body.innerHTML=learningDirectoryPage();return document.querySelector<HTMLElement>('[data-guide-directory]')!;};
const visible=(root:HTMLElement)=>[...root.querySelectorAll<HTMLAnchorElement>('[data-guide-card]')].filter(a=>!a.hidden);
async function mount(){const root=rendered();expect(root,'The complete static directory exposes a selected-page enhancement root').not.toBeNull();const path='../public/learn/guide-directory.js';const module=await import(/* @vite-ignore */ path);module.init();return{root,module,input:root.querySelector<HTMLInputElement>('input[type="search"]')!};}
const query=(input:HTMLInputElement,value:string)=>{input.value=value;input.dispatchEvent(new window.Event('input',{bubbles:true}) as unknown as Event);};

it('prioritizes the standard in the shared Learn header and retains contextual Business discovery',()=>{
 const root=rendered();
 expect([...document.querySelectorAll('.learn-header .header-nav a')].map(a=>[a.textContent,a.getAttribute('href')])).toEqual([
  ['How it works','/learn/#how-it-works'],['The standard','/standards/'],['Guides','/learn/#guides'],
 ]);
 expect(document.querySelector('.learn-header .header-enter')?.getAttribute('href')).toBe('/');
 expect(root.querySelector('[data-guide-card][href="/business/"]')?.textContent).toContain('Business');
 expect(document.querySelector('.site-footer a[href="/fit/"]')?.textContent).toBe('Find your fit');
 expect(document.querySelector('.site-footer a[href="/action/"]')?.textContent).toBe('Business in action');
});

it('keeps all guide previews free of Business price advertising while retaining every contextual route',()=>{
 const root=rendered(),cards=[...root.querySelectorAll<HTMLAnchorElement>('[data-guide-card]')];
 expect(cards.map(a=>a.textContent).join(' ')).not.toContain('$149');
 expect(cards.map(a=>a.dataset.search).join(' ')).not.toContain('$149');
 expect(cards.filter(a=>a.getAttribute('href')?.startsWith('/business/for/'))).toHaveLength(30);
 expect(root.querySelector('[href="/business/for/agencies/"]')?.textContent).toContain('Follow up without rebuilding the account history.');
 expect(root.querySelector('[href="/your-twin/"]')?.textContent).toContain('Your Twin');
});

it('keeps every guide readable without JavaScript and reserves enabled-search geometry before initialization',()=>{
 const root=rendered();expect(root).not.toBeNull();
 expect(root.querySelectorAll('[data-guide-card]').length).toBeGreaterThan(120);
 expect(root.querySelectorAll('[data-guide-card][hidden]')).toHaveLength(0);
 expect(root.querySelector<HTMLElement>('[data-guide-search]')?.hidden).toBe(false);
 expect(root.querySelector<HTMLInputElement>('input')?.disabled).toBe(true);expect(root.querySelector<HTMLButtonElement>('button[type="reset"]')?.disabled).toBe(true);
 expect(root.querySelector('noscript')).toBeNull();
 expect(root.querySelector('input')?.getAttribute('aria-label')).toBe('Find a guide');
 expect(root.dataset.publicScript).toBe('guide-directory');
});

it('answers natural signing and email questions from meaningful local terms and bounded intent aliases',async()=>{
 const {root,input}=await mount();
 query(input,'how do I sign an Original');
 expect(visible(root).map(a=>a.getAttribute('href'))).toContain('/learn/earn-from-originals/');
 query(input,'how do I get paid for originals');expect(visible(root).map(a=>a.getAttribute('href'))).toContain('/learn/earn-from-originals/');
 query(input,'how can I send money by email');
 const results=visible(root);expect(results.map(a=>a.getAttribute('href'))).toContain('/accept/#email-payments');
 const accept=results.find(a=>a.getAttribute('href')==='/accept/#email-payments')!;
 expect(accept.dataset.guideTarget).toBe('/accept/#email-payments');
 expect(accept.getAttribute('href')).toBe('/accept/#email-payments');
});

it('normalizes case, accents and punctuation, requires all meaningful words and preserves card order',async()=>{
 const {root,input}=await mount(),order=[...root.querySelectorAll<HTMLAnchorElement>('[data-guide-card]')].map(a=>a.href);
 query(input,'  PRÓOF,   ownership! ');
 const results=visible(root);expect(results.length).toBeGreaterThan(0);
 expect(results.map(a=>a.href)).toEqual(order.filter(href=>results.some(a=>a.href===href)));
 query(input,'proof impossiblexyz');expect(visible(root)).toHaveLength(0);
 expect(root.querySelector<HTMLElement>('[data-guide-empty]')?.hidden).toBe(false);
 expect(root.querySelector('[data-guide-count]')?.textContent).toBe('0 guides');
 expect([...root.querySelectorAll<HTMLElement>('[data-guide-group]')].every(section=>section.hidden)).toBe(true);
 expect([...root.querySelectorAll<HTMLElement>('[data-guide-subject]')].every(a=>a.hidden)).toBe(true);
});

it('clears results accessibly, handles filler-only questions and initializes retained/new pages only once',async()=>{
 const {root,module,input}=await mount(),all=visible(root).map(a=>a.getAttribute('href'));
 module.init();query(input,'nothing-matches-xyz');root.querySelector<HTMLFormElement>('form')!.reset();
 expect(input.value).toBe('');expect(visible(root).map(a=>a.getAttribute('href'))).toEqual(all);
 query(input,'how can I please');expect(visible(root)).toHaveLength(all.length);
 const status=root.querySelector<HTMLElement>('[data-guide-count]')!;expect(status.getAttribute('role')).toBe('status');expect(status.getAttribute('aria-live')).toBe('polite');
 expect(root.querySelector<HTMLElement>('[data-guide-search]')!.hidden).toBe(false);expect(input.disabled).toBe(false);expect(root.querySelector<HTMLButtonElement>('button[type="reset"]')?.disabled).toBe(false);
 const fresh=rendered();module.init();const next=fresh.querySelector<HTMLInputElement>('input')!;query(next,'build integrate');expect(visible(fresh).map(a=>a.getAttribute('href'))).toContain('/build/');
});

it('uses a page-only local module and keeps the shared presentation runtime unchanged',async()=>{
 expect(existsSync('public/learn/guide-directory.js')).toBe(true);
 const source=readFileSync('public/learn/guide-directory.js','utf8'),css=readFileSync('public/learn/guide-directory.css','utf8');
 expect(source).not.toMatch(/fetch\s*\(|XMLHttpRequest|localStorage|sessionStorage|@receiz|navigator\.credentials/);
 expect(gzipSync(source).length+gzipSync(css).length).toBeLessThan(2048);
 const builder=readFileSync('scripts/build-public-pages.mjs','utf8');expect(builder).toContain("page.slug==='guides'");expect(builder).toContain('data-public-page-style="guide-directory"');expect(builder).toContain('</style><noscript><style>[data-guide-search]{display:none!important}</style></noscript>');
});

it('does not carry a no-script style into the retained body template',()=>{
 const template=document.createElement('template');template.innerHTML=learningDirectoryPage();document.body.replaceChildren(template.content);
 expect(document.querySelector('[data-guide-directory] style'),'A retained page fragment must not activate a no-JavaScript suppression style').toBeNull();
});
