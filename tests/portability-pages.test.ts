// @vitest-environment happy-dom
import {expect,it,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {portabilityPages} from '../src/content/portability-pages.mjs';
import {portabilityContent} from '../scripts/portability-page.mjs';
import {publicPage} from '../scripts/public-page-metadata.mjs';
import {shareCardSvg} from '../scripts/social/share-card-art.mjs';
import {siteFooterHtml} from '../scripts/site-footer.mjs';
import {canonicalPublicPath} from '../src/content/public-routes.mjs';
import {profilePageUsername,profilePagePath} from '../src/receiz/public-profile';
const parse=(html:string)=>new DOMParser().parseFromString(html,'text/html');
it('creates two distinct holder-first entrances and keeps profiles behind their existing explicit route',()=>{
 expect(portabilityPages.map(p=>p.path)).toEqual(['/crypto/','/nfts/']);
 expect(canonicalPublicPath('/nft')).toBe('/nfts/');expect(publicPage('/nft/')?.path).toBe('/nfts/');
 for(const name of ['crypto','nft','nfts']){expect(profilePageUsername('/'+name+'/')).toBeNull();expect(profilePagePath(name)).toBe('/u/'+name+'/');expect(profilePageUsername('/u/'+name+'/')).toBe(name);}
});
it.each(['crypto','nfts'])('makes %s immediately readable, visual and connected to the exact existing tools',key=>{
 const page=portabilityPages.find(p=>p.key===key)!,doc=parse(portabilityContent(page));
 expect(doc.querySelector('h1')?.textContent).toBe(page.headline.join(' '));expect(doc.querySelector('.learn-brand svg')).not.toBeNull();
 expect(doc.querySelectorAll('main [data-portability-art]')).toHaveLength(3);expect(doc.querySelector('canvas,video,iframe')).toBeNull();
 const ids=[...doc.querySelectorAll('[id]')].map(e=>e.id);expect(new Set(ids).size).toBe(ids.length);
 expect(doc.querySelectorAll('[data-coop-twin]')).toHaveLength(1);expect(doc.querySelector('[data-twin-composer] textarea')).not.toBeNull();expect(doc.querySelector('[data-twin-book-form],[data-twin-history]')).toBeNull();
 for(const link of doc.querySelectorAll('main a[href^="#"]'))expect(doc.getElementById(link.getAttribute('href')!.slice(1))).not.toBeNull();
 expect(doc.querySelector('a[href="https://receiz.com/otc"]')).not.toBeNull();expect(doc.querySelector('a[href="/proof/"]')).not.toBeNull();
 expect(doc.querySelectorAll('main details').length).toBeGreaterThanOrEqual(4);expect(doc.body.textContent).toContain('underlying');expect(doc.body.textContent).toContain('Illustrative');
 expect(doc.querySelector('main')?.textContent).not.toMatch(/guaranteed liquidity|zero gas everywhere|every blockchain|cannot be hacked/i);
 expect(doc.querySelector('.site-footer a[href="'+page.path+'"]')).toBeNull();expect(parse(siteFooterHtml('/business/')).querySelector('a[href="'+page.path+'"]')).not.toBeNull();
 expect(publicPage(page.path)?.description).toBe(page.description);
 const art=new DOMParser().parseFromString(shareCardSvg(publicPage(page.path)!),'image/svg+xml');expect(art.querySelector('parsererror')).toBeNull();expect(art.querySelector('[data-portability-share="'+key+'"]')).not.toBeNull();expect(art.documentElement.textContent).not.toMatch(/\$|149|\/month/i);
});
it('preserves no-runtime animation, reduced motion, source/transfer boundaries and explicit hosting before profile routing',()=>{
 const css=readFileSync('public/learn/portability.css','utf8');expect(css).toContain('prefers-reduced-motion');expect(css).toContain('document-hidden');expect(css).toContain('@keyframes');expect(css).not.toMatch(/url\(|backdrop-filter|animation-timeline/);
 const routes=JSON.parse(readFileSync('vercel.json','utf8')).rewrites;for(const path of ['/crypto','/crypto/','/nfts','/nfts/','/nft','/nft/'])expect(routes.find((row:{source:string})=>row.source===path)).toBeDefined();
 const text=portabilityPages.map(p=>parse(portabilityContent(p)).querySelector('main')!.textContent).join(' ');expect(text).toContain('source snapshot');expect(text).toContain('chain fees');expect(text).toContain('offline verification');expect(text).toContain('compatible');
});
it('keeps extracted social artwork transparent without filling connection paths black',()=>{
 for(const page of portabilityPages){const doc=new DOMParser().parseFromString(shareCardSvg(publicPage(page.path)!),'image/svg+xml');expect(doc.querySelector('svg[viewBox="0 0 900 610"]')?.getAttribute('fill')).toBe('none');}
});

it('starts no cold Twin request and supports two natural replies in the existing conversation',async()=>{
 const before=location.pathname;history.replaceState(null,'','/crypto/');document.body.innerHTML=portabilityContent(portabilityPages[0]);const sent:Record<string,unknown>[]=[];let reads=0;
 vi.stubGlobal('fetch',async(_url:string,init:RequestInit)=>{if(!init?.body){reads++;return Response.json({ok:true,world:{username:'bjklock'}});}const payload=JSON.parse(String(init.body));sent.push(payload);return Response.json({ok:true,world:{username:'bjklock'},reply:{message:'Fixture reply '+sent.length,source:'upstream',memory:[]}});});
 try{
  // @ts-expect-error Existing standalone public interaction module.
  const {init}=await import('../public/learn/cooperatives.js');init();expect(reads).toBe(0);expect(sent).toHaveLength(0);
  const form=document.querySelector('[data-twin-composer]') as HTMLFormElement,field=form.elements.namedItem('message') as HTMLTextAreaElement;
  for(const text of ['I hold crypto. What can I do next?','What would the recipient need?']){field.value=text;form.dispatchEvent(new Event('submit',{cancelable:true}));await vi.waitFor(()=>expect(document.querySelector('[data-twin-messages]')?.textContent).toContain('Fixture reply '+sent.length));await vi.waitFor(()=>expect((form.querySelector('button[type=submit]') as HTMLButtonElement).disabled).toBe(false));}
  expect(sent).toHaveLength(2);for(const payload of sent)expect(payload).toMatchObject({action:'message',consent:true,pagePath:'/crypto/'});expect(sent[1].replyToOperationId).toBe(sent[0].clientOperationId);
 }finally{vi.unstubAllGlobals();document.body.innerHTML='';history.replaceState(null,'',before);}
});
