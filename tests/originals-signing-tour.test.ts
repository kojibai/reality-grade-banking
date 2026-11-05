// @vitest-environment happy-dom
import {afterEach,expect,it,vi} from 'vitest';
// @ts-expect-error Static page template.
import {originalsQualificationContent} from '../scripts/originals-qualification-template.mjs';
const path='../src/qualification/signing-tour';
afterEach(()=>{vi.restoreAllMocks();vi.useRealTimers();vi.unstubAllGlobals();document.body.replaceChildren();});
async function mount(reduced=false){
 vi.useFakeTimers();vi.stubGlobal('matchMedia',()=>({matches:reduced,addEventListener(){},removeEventListener(){}}));let visible!:(entries:Array<{isIntersecting:boolean}>)=>void;vi.stubGlobal('IntersectionObserver',class{constructor(callback:typeof visible){visible=callback;}observe(){}disconnect(){}});document.body.innerHTML=originalsQualificationContent();
 const root=document.querySelector<HTMLElement>('[data-originals-signing-tour]')!;expect(root).not.toBeNull();const{mountOriginalSigningTour}=await import(/* @vite-ignore */path);const dispose=mountOriginalSigningTour(root),phase=()=>root.querySelector('[data-product-panel]:not([hidden])')?.getAttribute('data-product-panel');return{root,dispose,phase,viewport:(isIntersecting:boolean)=>visible([{isIntersecting}]),button:(key:string)=>root.querySelector<HTMLButtonElement>(`[data-signing-${key}]`)!};
}
it('settles on the actual Original and supports manual approval and signed states without side effects',async()=>{
 const f=await mount(),fetch=vi.fn();vi.stubGlobal('fetch',fetch);expect(f.phase()).toBe('assets-originals');f.root.querySelector<HTMLButtonElement>('[data-product-panel="assets-originals"] [aria-label="Unlock value with PBI"]')!.click();expect(f.phase()).toBe('assets-originals-approval');f.button('next').click();expect(f.phase()).toBe('assets-originals-verifying');f.button('next').click();expect(f.phase()).toBe('assets-originals-signed');expect(fetch).not.toHaveBeenCalled();f.dispose();
});
it('plays the real states, pauses on manual input and replays without duplicate bindings',async()=>{
 const f=await mount();f.button('play').click();expect(f.phase()).toBe('account');vi.advanceTimersByTime(2000);expect(f.phase()).toBe('assets-originals');f.button('play').click();const paused=f.phase();vi.advanceTimersByTime(20000);expect(f.phase()).toBe(paused);f.button('replay').click();vi.advanceTimersByTime(12000);expect(f.phase()).toBe('assets-originals-signed');expect(f.button('play').getAttribute('aria-pressed')).toBe('false');f.dispose();
});
it('keeps reduced motion manual and stops pending playback on disposal',async()=>{
 const reduced=await mount(true);reduced.button('play').click();vi.advanceTimersByTime(20000);expect(reduced.phase()).toBe('assets-originals');reduced.button('next').click();expect(reduced.phase()).toBe('assets-originals-approval');reduced.dispose();
 const f=await mount();f.button('play').click();f.dispose();const phase=f.phase();vi.advanceTimersByTime(20000);expect(f.phase()).toBe(phase);
});

it('resumes a paused step, supports keyboard step selection and mounts only once',async()=>{
 const f=await mount(),{mountOriginalSigningTour}=await import(/* @vite-ignore */path);expect(mountOriginalSigningTour(f.root)).toBe(f.dispose);f.button('play').click();vi.advanceTimersByTime(1800);f.button('play').click();expect(f.phase()).toBe('assets-originals');f.button('play').click();vi.advanceTimersByTime(2200);expect(f.phase()).toBe('assets-originals-approval');
 const selected=f.root.querySelector<HTMLButtonElement>('[data-product-choice="assets-originals-approval"]')!;selected.dispatchEvent(new KeyboardEvent('keydown',{key:'End',bubbles:true}));expect(f.phase()).toBe('assets-originals-signed');expect(document.activeElement?.getAttribute('data-product-choice')).toBe('assets-originals-signed');f.dispose();
});

it('pauses when hidden or offscreen and never restarts without a new instruction',async()=>{
 const f=await mount();f.button('play').click();f.viewport(false);vi.advanceTimersByTime(10000);expect(f.phase()).toBe('account');expect(f.button('play').getAttribute('aria-pressed')).toBe('false');f.viewport(true);vi.advanceTimersByTime(10000);expect(f.phase()).toBe('account');
 f.button('play').click();const hidden=vi.spyOn(document,'hidden','get').mockReturnValue(true);document.dispatchEvent(new Event('visibilitychange'));vi.advanceTimersByTime(10000);expect(f.phase()).toBe('account');expect(f.button('play').getAttribute('aria-pressed')).toBe('false');hidden.mockRestore();f.dispose();
});
