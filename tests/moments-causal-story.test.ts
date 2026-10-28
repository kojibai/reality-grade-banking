// @vitest-environment happy-dom
import {it,expect,vi} from 'vitest';
const modelPath='../public/learn/moments-model.mjs',pagePath='../scripts/moments-page.mjs';
it('keeps the separate copy/spending illustration conserved without changing the existing exchange story',async()=>{
 const model=await import(/* @vite-ignore */ modelPath);expect(model.causalFrame).toBeTypeOf('function');
 expect(model.momentFrames).toHaveLength(8);expect(model.momentFrame(6).balances).toEqual([12500,13000,8000,14500]);
 for(let i=0;i<8;i++){const s=model.causalFrame(i);expect(s.balances.reduce((a:number,b:number)=>a+b,0)).toBe(i<3?0:100);if(i>=1)expect(s.sourceCount).toBe(1);}
 expect(model.causalFrame(2)).toMatchObject({calculated:100,admitted:false,balances:[0,0,0]});
 expect(model.causalFrame(3)).toMatchObject({admitted:true,balances:[100,0,0]});
 expect(model.causalFrame(4)).toMatchObject({files:2,sourceCount:1,balances:[100,0,0]});
 expect(model.causalFrame(5)).toMatchObject({used:30,remaining:70,balances:[70,30,0],payments:1});
 expect(model.causalFrame(6)).toMatchObject({used:30,remaining:70,balances:[70,30,0],payments:1});
 expect(model.causalFrame(7)).toMatchObject({used:30,remaining:70,balances:[70,20,10],payments:2});
});
it('renders a separate source-to-receipt story with same-identity copies and no private work',async()=>{
 const {momentsContent}=await import(/* @vite-ignore */ pagePath);const doc=new DOMParser().parseFromString(momentsContent(),'text/html');expect(doc.querySelectorAll('[data-moments-story]')).toHaveLength(1);expect(doc.querySelectorAll('[data-moments-causal]')).toHaveLength(1);
 const root=doc.querySelector('[data-moments-causal]')!;expect(root.querySelectorAll('[data-causal-object]')).toHaveLength(2);expect(new Set([...root.querySelectorAll('[data-causal-object]')].map(n=>n.getAttribute('data-source-identity'))).size).toBe(1);expect(root.textContent).toContain('Illustrative');expect(root.querySelector('iframe,script,input')).toBeNull();expect(root.querySelector('a[href="/learn/earn-from-originals/#inspect-an-original"]')).not.toBeNull();
});
it('offers every causal scene manually with reduced motion and disposes on navigation',async()=>{
 const {momentsContent}=await import(/* @vite-ignore */ pagePath);document.body.innerHTML=momentsContent();vi.stubGlobal('matchMedia',()=>({matches:true,addEventListener:vi.fn(),removeEventListener:vi.fn()}));vi.useFakeTimers();const fetch=vi.spyOn(globalThis,'fetch').mockRejectedValue(Error('PRESENTATION_ONLY'));
 try{const path='../public/learn/moments.js';const {init}=await import(/* @vite-ignore */ path);init();const root=document.querySelector<HTMLElement>('[data-moments-causal]');expect(root).not.toBeNull();const next=root!.querySelector<HTMLButtonElement>('[data-causal-next]');expect(next).not.toBeNull();for(let i=1;i<8;i++){next!.click();expect(root!.dataset.frame).toBe(String(i));}expect(root!.querySelector('[data-causal-holder="0"]')?.textContent).toBe('70 Φ');expect(root!.querySelector('[data-causal-holder="1"]')?.textContent).toBe('20 Φ');expect(root!.querySelector('[data-causal-holder="2"]')?.textContent).toBe('10 Φ');expect(fetch).not.toHaveBeenCalled();root!.remove();window.dispatchEvent(new Event('receiz-learn:page'));expect(vi.getTimerCount()).toBe(0);
 }finally{document.body.innerHTML='';window.dispatchEvent(new Event('receiz-learn:page'));fetch.mockRestore();vi.useRealTimers();vi.unstubAllGlobals();}
});

it('keeps source identity and SVG definitions separate and names the illustrative fixed reference',async()=>{
 const model=await import(/* @vite-ignore */ modelPath);expect(model.causalFrames).toHaveLength(8);
 expect(model.causalFrame(-1)).toEqual(model.causalFrame(0));expect(model.causalFrame(999)).toEqual(model.causalFrame(7));
 for(let i=0;i<8;i++)expect(model.causalFrame(i)).toMatchObject({basis:'fixed-illustrative-phi',sourceIdentity:'illustrative-original-a'});
 const {momentsContent}=await import(/* @vite-ignore */ pagePath);const doc=new DOMParser().parseFromString(momentsContent(),'text/html'),root=doc.querySelector('[data-moments-causal]')!;
 const ids=[...root.querySelectorAll('[id]')].map(n=>n.id);expect(new Set(ids).size).toBe(ids.length);
 for(const label of ['100 Φ','not a grant','same Original'])expect(root.textContent).toContain(label);
 expect(root.querySelectorAll('[data-causal-step]')).toHaveLength(8);
});
it('runs only the visible causal story and stops on background, reduced motion and page removal',async()=>{
 const {momentsContent}=await import(/* @vite-ignore */ pagePath);document.body.innerHTML=momentsContent();
 const watchers:any[]=[],mediaListeners:Function[]=[],media={matches:false,addEventListener:vi.fn((_event:string,callback:Function)=>mediaListeners.push(callback)),removeEventListener:vi.fn()};
 class Observer{cb:IntersectionObserverCallback;root:Element|null=null;disconnect=vi.fn();constructor(cb:IntersectionObserverCallback){this.cb=cb;watchers.push(this);}observe(root:Element){this.root=root;}unobserve(){}takeRecords(){return[];}}
 vi.stubGlobal('IntersectionObserver',Observer);vi.stubGlobal('matchMedia',()=>media);vi.useFakeTimers();const fetch=vi.spyOn(globalThis,'fetch').mockRejectedValue(Error('PRESENTATION_ONLY'));
 try{const path='../public/learn/moments.js';const {init}=await import(/* @vite-ignore */ path);init();init();const root=document.querySelector<HTMLElement>('[data-moments-causal]')!,watcher=watchers.find(w=>w.root===root);expect(watcher).toBeDefined();expect(watchers).toHaveLength(2);expect(vi.getTimerCount()).toBe(0);
 watcher.cb([{isIntersecting:true,intersectionRatio:.8}],watcher);expect(vi.getTimerCount()).toBe(1);await vi.advanceTimersByTimeAsync(4200);expect(root.dataset.frame).toBe('1');
 watcher.cb([{isIntersecting:false,intersectionRatio:0}],watcher);expect(root.dataset.active).toBe('false');expect(vi.getTimerCount()).toBe(0);
 root.querySelector<HTMLButtonElement>('[data-causal-step="5"]')!.click();expect(root.dataset.frame).toBe('5');expect(root.querySelector('[data-causal-holder="0"]')?.textContent).toBe('70 Φ');expect(vi.getTimerCount()).toBe(0);
 watcher.cb([{isIntersecting:true,intersectionRatio:.8}],watcher);expect(vi.getTimerCount()).toBe(1);Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));expect(vi.getTimerCount()).toBe(0);Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));expect(vi.getTimerCount()).toBe(1);
 media.matches=true;mediaListeners.forEach(callback=>callback());expect(vi.getTimerCount()).toBe(0);root.querySelector<HTMLButtonElement>('[data-causal-step="7"]')!.click();expect(root.dataset.frame).toBe('7');expect(root.querySelector('[data-causal-step="7"]')?.getAttribute('aria-pressed')).toBe('true');expect(fetch).not.toHaveBeenCalled();
 root.remove();window.dispatchEvent(new Event('receiz-learn:page'));expect(watcher.disconnect).toHaveBeenCalledOnce();expect(root.dataset.active).toBe('false');expect(vi.getTimerCount()).toBe(0);
 }finally{delete (document as any).hidden;document.body.innerHTML='';window.dispatchEvent(new Event('receiz-learn:page'));fetch.mockRestore();vi.useRealTimers();vi.unstubAllGlobals();}
});

it('keeps causal autoplay off when viewport visibility cannot be observed',async()=>{
 const {momentsContent}=await import(/* @vite-ignore */ pagePath);document.body.innerHTML=momentsContent();document.querySelector('[data-moments-story]')!.remove();
 vi.stubGlobal('IntersectionObserver',undefined);vi.stubGlobal('matchMedia',()=>({matches:false,addEventListener:vi.fn(),removeEventListener:vi.fn()}));vi.useFakeTimers();
 try{const path='../public/learn/moments.js';const {init}=await import(/* @vite-ignore */ path);init();const root=document.querySelector<HTMLElement>('[data-moments-causal]')!;expect(root.dataset.active).toBe('false');expect(vi.getTimerCount()).toBe(0);root.querySelector<HTMLButtonElement>('[data-causal-next]')!.click();expect(root.dataset.frame).toBe('1');expect(vi.getTimerCount()).toBe(0);
 }finally{document.body.innerHTML='';window.dispatchEvent(new Event('receiz-learn:page'));vi.useRealTimers();vi.unstubAllGlobals();}
});
