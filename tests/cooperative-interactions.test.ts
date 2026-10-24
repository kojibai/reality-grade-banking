// @vitest-environment happy-dom
import {afterEach,expect,it,vi} from 'vitest';
import {cooperativeContent} from '../scripts/cooperative-page.mjs';
// @ts-expect-error Public enhancement is standalone ESM.
import {init} from '../public/learn/cooperatives.js';
const load=async()=>({init});
afterEach(()=>{vi.unstubAllGlobals();document.body.innerHTML='';});
it('changes the actual object and network evidence, while keeping illustrative data unverified',async()=>{
 document.body.innerHTML=cooperativeContent();const module=await load();module.init();module.init();
 (document.querySelector('[data-object-choice="energy"]') as HTMLButtonElement).click();
 expect((document.querySelector('[data-object-panel="energy"]') as HTMLElement).hidden).toBe(false);
 expect((document.querySelector('[data-object-panel="agriculture"]') as HTMLElement).hidden).toBe(true);
 expect(document.querySelector('[data-object-panel="energy"]')?.textContent).toContain('metered energy');
 (document.querySelector('[data-network-choice="grocery"]') as HTMLButtonElement).click();
 expect((document.querySelector('[data-network-panel="grocery"]') as HTMLElement).hidden).toBe(false);
 expect(document.querySelector('[data-network-choice="grocery"]')?.getAttribute('aria-pressed')).toBe('true');
});
it('advances the exchange from one scroll position beneath the existing header without visibility-callback reversals',async()=>{
 document.body.innerHTML='<header class="learn-header"></header>'+cooperativeContent();
 const root=document.querySelector('[data-process]') as HTMLElement,sticky=root.querySelector('.coop-process-sticky') as HTMLElement,steps=Array.from(root.querySelectorAll<HTMLElement>('[data-process-step]'));let offset=430;
 const box=(top:number,height:number)=>({top,bottom:top+height,height,left:0,right:390,width:390,x:0,y:top,toJSON(){return {};}});
 vi.spyOn(document.querySelector('.learn-header')!,'getBoundingClientRect').mockImplementation(()=>box(0,109));vi.spyOn(sticky,'getBoundingClientRect').mockImplementation(()=>box(121,260));vi.spyOn(root,'getBoundingClientRect').mockImplementation(()=>box(250-offset,2200));
 steps.forEach((step,i)=>vi.spyOn(step,'getBoundingClientRect').mockImplementation(()=>box(300+i*450-offset,450)));
 const frames:FrameRequestCallback[]=[];vi.stubGlobal('requestAnimationFrame',(fn:FrameRequestCallback)=>{frames.push(fn);return frames.length;});vi.stubGlobal('cancelAnimationFrame',()=>{});vi.stubGlobal('matchMedia',()=>({matches:true,addEventListener(){},removeEventListener(){}}));
 const module=await load();module.init();while(frames.length)frames.shift()!(0);
 expect(root.dataset.stage).toBe('1');const first=Number(root.style.getPropertyValue('--coop-progress'));
 offset+=100;window.dispatchEvent(new Event('scroll'));while(frames.length)frames.shift()!(0);expect(Number(root.style.getPropertyValue('--coop-progress'))).toBeGreaterThan(first);expect(root.dataset.stage).toBe('1');
 vi.restoreAllMocks();
});
