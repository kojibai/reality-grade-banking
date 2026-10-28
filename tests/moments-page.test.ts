// @vitest-environment happy-dom
import {it,expect,vi} from 'vitest';
import {existsSync,readFileSync} from 'node:fs';
import {publicPage} from '../scripts/public-page-metadata.mjs';
import {profilePagePath,profilePageUsername} from '../src/receiz/public-profile';
import {siteFooterHtml} from '../scripts/site-footer.mjs';
const momentsModule='../scripts/moments-page.mjs',modelModule='../public/learn/moments-model.mjs';
const parse=(html:string)=>new DOMParser().parseFromString(html,'text/html');
it('reserves a short public moments destination while preserving the same username',()=>{
 expect(publicPage('/moments/')).toMatchObject({path:'/moments/',id:'moments'});
 expect(profilePageUsername('/moments/')).toBeNull();expect(profilePagePath('moments')).toBe('/u/moments/');expect(profilePageUsername('/u/moments/')).toBe('moments');
 const config=JSON.parse(readFileSync('vercel.json','utf8'));for(const source of ['/moments','/moments/'])expect(config.rewrites.find((r:{source:string})=>r.source===source)?.destination).toBe('/moments/index.html');
});
it('explains personal sources and relational accumulation before the architecture without account reads',async()=>{
 expect(existsSync('scripts/moments-page.mjs')).toBe(true);
 const fetch=vi.spyOn(globalThis,'fetch').mockRejectedValue(Error('NO_PUBLIC_ACCOUNT_READ'));
 try{const {momentsContent}=await import(/* @vite-ignore */ momentsModule);const doc=parse(momentsContent());
 expect(doc.querySelector('h1')?.textContent).toBe('Everyone can originate value. Nobody can originate yours.');
 for(const name of ['Farmer','Mechanic','Musician','Builder'])expect(doc.querySelector('[data-moments-story]')?.textContent).toContain(name);
 for(const phrase of ['eligible','PBI','accepted','Illustrative','same','ownership'])expect(doc.body.textContent?.toLowerCase()).toContain(phrase.toLowerCase());
 for(const href of ['/economy/','/banking/','/learn/earn-from-originals/','/learn/how-value-works/','/conformance/','/verify/'])expect(doc.querySelector('main a[href="'+href+'"]')).not.toBeNull();
 expect(doc.body.textContent).toContain('Everyone can originate.');expect(doc.body.textContent).toContain('Not everyone accumulates the same.');
 expect(doc.querySelector('[data-moments-story] svg')).not.toBeNull();expect(doc.querySelectorAll('[data-moment-person]')).toHaveLength(4);
 expect(doc.querySelector('iframe,script')).toBeNull();expect(doc.body.textContent).not.toMatch(/Glyph Economy|guaranteed income|unlimited money|\$149/);
 expect(fetch).not.toHaveBeenCalled();for(const a of doc.querySelectorAll('main a[href^="#"]'))expect(doc.getElementById(a.getAttribute('href')!.slice(1))).not.toBeNull();
 }finally{fetch.mockRestore();}
});
it('conserves already accepted funds through every illustrated transfer at one evaluation basis',async()=>{
 expect(existsSync('public/learn/moments-model.mjs')).toBe(true);
 const {momentFrame,momentFrames}=await import(/* @vite-ignore */ modelModule);
 for(let i=0;i<momentFrames.length;i++){const state=momentFrame(i);expect(state.balances.reduce((a:number,b:number)=>a+b,0)).toBe(48000);expect(state.balances.every((v:number)=>v>=0)).toBe(true);expect(state.basis).toBe('fixed-usd-reference');}
 expect(momentFrame(0).fundsVisible).toBe(false);expect(momentFrame(1).fundsVisible).toBe(true);
 expect(momentFrame(6).balances).toEqual([12500,13000,8000,14500]);expect(momentFrame(7).balances).toEqual(momentFrame(6).balances);
 expect(momentFrame(-1)).toEqual(momentFrame(0));expect(momentFrame(999)).toEqual(momentFrame(7));
});
it('connects the page to the footer, economy story and Original value explanation',async()=>{
 expect(parse(siteFooterHtml('/business/')).querySelector('a[href="/moments/"]')).not.toBeNull();expect(parse(siteFooterHtml('/moments/')).querySelector('a[href="/moments/"]')).toBeNull();
 const {economyContent}=await import('../scripts/economy-page.mjs');expect(parse(economyContent()).querySelector('main a[href="/moments/"]')).not.toBeNull();
 const originalModule='../scripts/originals-qualification-template.mjs';const {originalsQualificationContent}=await import(/* @vite-ignore */ originalModule);expect(parse(originalsQualificationContent()).querySelector('main a[href="/moments/"]')).not.toBeNull();
});
it('has custom share artwork with its own four sources and no purchase price',async()=>{
 expect(publicPage('/moments/')).toBeDefined();const {shareCardSvg}=await import('../scripts/social/share-card-art.mjs');const doc=new DOMParser().parseFromString(shareCardSvg(publicPage('/moments/')!),'image/svg+xml');expect(doc.querySelector('[data-moments-share]')).not.toBeNull();expect(doc.querySelectorAll('[data-moment-source]')).toHaveLength(4);expect(doc.documentElement.textContent).toContain('Yours to originate.');expect(doc.documentElement.textContent).not.toMatch(/149|month/);
});

it('keeps the story accessible without autoplay and cancels motion when navigation removes it',async()=>{
 expect(existsSync('public/learn/moments.js')).toBe(true);
 const {momentsContent}=await import(/* @vite-ignore */ momentsModule);document.body.innerHTML=momentsContent();
 const callbacks:{cb:IntersectionObserverCallback,disconnect:ReturnType<typeof vi.fn>}[]=[];
 class Observer{cb:IntersectionObserverCallback;disconnect=vi.fn();constructor(cb:IntersectionObserverCallback){this.cb=cb;callbacks.push(this);}observe(){}unobserve(){}takeRecords(){return[];}}
 vi.stubGlobal('IntersectionObserver',Observer);vi.stubGlobal('matchMedia',()=>({matches:false,addEventListener:vi.fn(),removeEventListener:vi.fn()}));vi.useFakeTimers();
 const modulePath='../public/learn/moments.js';const {init}=await import(/* @vite-ignore */ modulePath);init();init();
 const root=document.querySelector<HTMLElement>('[data-moments-story]')!;expect(callbacks).toHaveLength(1);
 callbacks[0].cb([{isIntersecting:true,intersectionRatio:.8}] as IntersectionObserverEntry[],{} as IntersectionObserver);
 await vi.advanceTimersByTimeAsync(4200);expect(root.dataset.frame).toBe('1');expect(root.textContent).toContain('$120');
 const exchange=root.querySelector<HTMLButtonElement>('[data-moment-chapter="2"]')!;exchange.click();expect(root.dataset.frame).toBe('2');expect(root.querySelector('[data-moment-title]')?.textContent).toContain('Repairs paid');
 exchange.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));expect(root.dataset.frame).toBe('6');expect(root.textContent).toContain('$145');
 root.remove();window.dispatchEvent(new Event('receiz-learn:page'));expect(callbacks[0].disconnect).toHaveBeenCalledOnce();expect(root.dataset.active).toBe('false');expect(vi.getTimerCount()).toBe(0);
 vi.useRealTimers();vi.unstubAllGlobals();document.body.innerHTML='';
});

it('lets reduced-motion visitors reach signing and all four exchanges without any timer',async()=>{
 const {momentsContent}=await import(/* @vite-ignore */ momentsModule);document.body.innerHTML=momentsContent();
 vi.stubGlobal('matchMedia',()=>({matches:true,addEventListener:vi.fn(),removeEventListener:vi.fn()}));vi.useFakeTimers();
 try{const modulePath='../public/learn/moments.js';const {init}=await import(/* @vite-ignore */ modulePath);init();const root=document.querySelector<HTMLElement>('[data-moments-story]')!;
 const next=root.querySelector<HTMLButtonElement>('[data-moment-next]');expect(next).not.toBeNull();
 for(let frame=1;frame<8;frame++){next!.click();expect(root.dataset.frame).toBe(String(frame));}
 root.querySelector<HTMLButtonElement>('[data-moment-previous]')!.click();expect(root.dataset.frame).toBe('6');expect(vi.getTimerCount()).toBe(0);
 }finally{document.body.innerHTML='';window.dispatchEvent(new Event('receiz-learn:page'));vi.useRealTimers();vi.unstubAllGlobals();}
});
