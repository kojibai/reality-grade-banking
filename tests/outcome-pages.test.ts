// @vitest-environment happy-dom
import {expect,it,vi} from 'vitest';
import {publicPage,publicPages} from '../scripts/public-page-metadata.mjs';
import {siteFooterHtml} from '../scripts/site-footer.mjs';
import {shareCardSvg} from '../scripts/social/share-card-art.mjs';
import {outcomePages} from '../src/content/outcome-pages.mjs';
import {outcomeContent} from '../scripts/outcome-page.mjs';
const parse=(html:string)=>new DOMParser().parseFromString(html,'text/html');
it('adds five distinct canonical outcome pages without redirecting or replacing the existing explanations',()=>{
 expect(outcomePages.map(p=>p.path)).toEqual(['/agent/','/fraud/','/recover/','/get-paid/','/proof/']);
 for(const p of outcomePages){expect(publicPage(p.path)?.id).toBe('solution-'+p.key);expect(publicPage(p.path.slice(0,-1))).toBe(publicPage(p.path));expect(parse(outcomeContent(p)).querySelector('h1')?.textContent?.trim()).toBeTruthy();}
 expect(publicPages).toHaveLength(148);for(const path of ['/id/','/protect/','/vaults/','/your-twin/','/in-action/','/learn/get-paid/','/learn/proof-objects/'])expect(publicPage(path)).toBeDefined();
});
it.each(['agent','fraud','recover','get-paid','proof'])('keeps %s useful, inspectable and discoverable with unique price-free art',key=>{
 const p=outcomePages.find(p=>p.key===key)!;expect(p.visualLabels).toHaveLength(3);expect(p).not.toHaveProperty('visual');const doc=parse(outcomeContent(p));expect(doc.querySelectorAll('main section').length).toBeGreaterThanOrEqual(6);expect(doc.querySelector('[data-outcome-art="'+key+'"]')).not.toBeNull();expect(doc.querySelector('[data-outcome-art]')?.getAttribute('viewBox')).toBe('0 0 900 680');
 expect(doc.querySelector('canvas,iframe,video')).toBeNull();expect(doc.querySelector('main')?.textContent).toContain('Illustrative');expect(doc.querySelectorAll('main details').length).toBeGreaterThanOrEqual(3);
 expect(doc.querySelector('footer a[href="'+p.path+'"]')).toBeNull();expect(parse(siteFooterHtml('/learn/')).querySelector('a[href="'+p.path+'"]')).not.toBeNull();
 const svg=new DOMParser().parseFromString(shareCardSvg(publicPage(p.path)!),'image/svg+xml');expect(svg.querySelector('parsererror')).toBeNull();expect(svg.querySelector('[data-outcome-art="'+key+'"]')).not.toBeNull();expect(svg.documentElement.textContent).not.toMatch(/\$|149|\/month/i);
});
it('agent sells continuity and reuses the exact reviewed Business and native conversation paths',()=>{
 const doc=parse(outcomeContent(outcomePages[0]));expect(doc.querySelectorAll('[data-business-checkout]').length).toBeGreaterThanOrEqual(2);for(const a of doc.querySelectorAll('[data-business-checkout]'))expect(a.getAttribute('href')).toBe('/#account/messages/business');
 expect(doc.querySelector('main[data-coop]')).not.toBeNull();expect(doc.querySelector('[data-coop-twin]')).not.toBeNull();expect(doc.querySelector('[data-twin-composer]')).not.toBeNull();expect(doc.querySelector('[data-twin-book-form]')).toBeNull();expect(doc.querySelector('main')?.textContent).toContain('compatible apps');expect(doc.querySelector('main')?.textContent).toContain('authorized');
});
it('keeps proof, fraud and recovery promises bound to existing original authority',()=>{
 const fraud=parse(outcomeContent(outcomePages[1])),recover=parse(outcomeContent(outcomePages[2])),proof=parse(outcomeContent(outcomePages[4]));
 expect(fraud.querySelector('main')?.textContent).not.toMatch(/cannot be hacked|impossible to steal|eliminates all fraud|fraud.?proof/i);expect(fraud.querySelector('a[href="/protect/"]')).not.toBeNull();
 expect(recover.querySelector('main')?.textContent).toContain('original');expect(recover.querySelector('main')?.textContent).toContain('offline Note');
 expect(proof.querySelector('a[href="https://receiz.com/verify"]')).not.toBeNull();expect(proof.querySelector('main')?.textContent).toContain('what the proof establishes');
});

it('mounts the real shared Twin composer on /agent without cold API work and carries its page context on explicit Send',async()=>{
 const before=location.pathname;history.replaceState(null,'','/agent/');document.body.innerHTML=outcomeContent(outcomePages[0]);const sent:any[]=[];let reads=0;
 vi.stubGlobal('fetch',async(_url:string,init:RequestInit)=>{if(!init?.body){reads++;return Response.json({ok:true,world:{username:'bjklock'}});}const payload=JSON.parse(String(init.body));sent.push(payload);return Response.json({ok:true,world:{username:'bjklock'},reply:{message:'Carried context',source:'upstream',memory:[]}});});
 try{
  // @ts-expect-error Existing standalone public interaction module.
  const {init}=await import('../public/learn/cooperatives.js');init();expect(reads).toBe(0);expect(sent).toHaveLength(0);
  const form=document.querySelector('[data-twin-composer]') as HTMLFormElement;(form.elements.namedItem('message') as HTMLTextAreaElement).value='Keep the context from my work';form.dispatchEvent(new Event('submit',{cancelable:true}));await vi.waitFor(()=>expect(document.querySelector('.coop-twin-reply p')?.textContent).toBe('Carried context'));expect(sent).toHaveLength(1);expect(sent[0]).toMatchObject({action:'message',consent:true,pagePath:'/agent/'});expect(reads).toBe(1);
 }finally{vi.unstubAllGlobals();document.body.innerHTML='';history.replaceState(null,'',before);}
});
