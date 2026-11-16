import {expect,it} from 'vitest';
import {Window} from 'happy-dom';
import {clientWorkPages} from '../src/content/client-work-library.mjs';
import {publicPages,publicPage,socialMetadata,structuredMetadata} from '../scripts/public-page-metadata.mjs';
import social from '../public/social/manifest.json';
import {renderClientWorkResource} from '../scripts/client-work-library.mjs';

it('provides the approved independent resource cohort with one owner per intent and resolvable related tasks',()=>{
 expect(clientWorkPages.filter(page=>page.kind==='template')).toHaveLength(24);expect(clientWorkPages.filter(page=>page.kind==='guide')).toHaveLength(12);expect(clientWorkPages.filter(page=>page.kind==='example')).toHaveLength(4);expect(clientWorkPages.filter(page=>page.kind==='directory')).toHaveLength(3);
 expect(new Set(clientWorkPages.map(page=>page.path)).size).toBe(43);
 const known=new Set(publicPages.map(page=>page.path));for(const page of clientWorkPages)for(const path of page.related??[])expect(known.has(path),page.path+' → '+path).toBe(true);
});

it('renders every real article with its full public text, correct canonical and a small API-independent first document',()=>{
 const window=new Window({settings:{disableJavaScriptEvaluation:true,disableJavaScriptFileLoading:true,disableCSSFileLoading:true}});
 for(const page of clientWorkPages){
  const metadata=publicPage(page.path)!,image=social.images[page.path as keyof typeof social.images],head=socialMetadata(metadata,image)+`<script type="application/ld+json">${JSON.stringify(structuredMetadata(metadata,image))}</script>`,html=renderClientWorkResource(page,{head}),document=new window.DOMParser().parseFromString(html,'text/html');
  expect(document.querySelectorAll('h1'),page.path).toHaveLength(1);expect(document.querySelector('h1')?.textContent).toBe(page.title);
  expect(document.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe('https://bankeiz.com'+page.path);
  expect(document.querySelector('main')?.textContent).toContain(page.intro);
  for(const section of page.sections??[])for(const paragraph of section.paragraphs??[])expect(document.querySelector('article')?.textContent,page.path).toContain(paragraph);
  if(page.template){expect(document.querySelectorAll('pre')).toHaveLength(2);expect(document.querySelector('pre')?.textContent).toBe(page.template);expect(document.querySelector('a[download]')?.getAttribute('href')).toBe(page.path+'template.txt');}
  expect(document.querySelector('script[src],iframe,form')).toBeNull();expect(html).not.toContain('receiz-navigation');expect(html).not.toContain('public-market-seed');expect(Buffer.byteLength(html),page.path).toBeLessThan(150000);
 }
});
