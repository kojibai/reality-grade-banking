// @vitest-environment happy-dom
import {afterEach,expect,it,vi} from 'vitest';
import {init} from '../public/learn/email.js';
let reduced=false,observe:(rows:unknown[])=>void;
function setup(){vi.useFakeTimers();vi.stubGlobal('matchMedia',()=>({matches:reduced,addEventListener:vi.fn(),removeEventListener:vi.fn()}));vi.stubGlobal('IntersectionObserver',class{constructor(callback:(rows:unknown[])=>void){observe=callback;}observe(){}disconnect(){}});document.body.innerHTML='<main data-email-guide><template data-email-demo-bank></template><section data-email-walkthrough data-email-current="conversation"><div class="email-demo-view"><p>Held conversation</p></div><button data-email-play>Pause</button><button data-email-step="incoming">Incoming email</button><button data-email-step="original">Original</button></section></main>';document.querySelector<HTMLTemplateElement>('template')!.content.textContent=JSON.stringify({conversation:'<p>Held conversation</p>',incoming:'<p>Incoming actual email</p>',reply:'<p>Your reply</p>',original:'<p>Original email headers</p><button data-email-demo-action="conversation">Back</button>'});return document.querySelector<HTMLElement>('[data-email-walkthrough]')!;}
afterEach(()=>{document.body.innerHTML='';dispatchEvent(new Event('receiz-learn:page'));vi.useRealTimers();vi.unstubAllGlobals();vi.restoreAllMocks();reduced=false;});
it('keeps the held first frame visible and plays only visible local example HTML without transport',()=>{
 const root=setup(),request=vi.spyOn(globalThis,'fetch').mockRejectedValue(Error('NO_TRANSPORT'));init();init();expect(root.textContent).toContain('Held conversation');vi.advanceTimersByTime(10400);expect(root.dataset.emailCurrent).toBe('conversation');observe([{isIntersecting:true}]);vi.advanceTimersByTime(5200);expect(root.dataset.emailCurrent).toBe('incoming');root.querySelector<HTMLButtonElement>('[data-email-step="original"]')!.click();expect(root.textContent).toContain('Original email headers');vi.advanceTimersByTime(10400);expect(root.dataset.emailCurrent).toBe('original');root.querySelector<HTMLButtonElement>('[data-email-demo-action]')!.click();expect(root.dataset.emailCurrent).toBe('conversation');expect(request).not.toHaveBeenCalled();document.body.innerHTML='';dispatchEvent(new Event('receiz-learn:page'));expect(vi.getTimerCount()).toBe(0);
});
it('keeps reduced-motion playback paused while manual example controls still work',()=>{reduced=true;const root=setup();init();observe([{isIntersecting:true}]);vi.advanceTimersByTime(20000);expect(root.dataset.emailCurrent).toBe('conversation');expect(root.querySelector('[data-email-play]')?.textContent).toBe('Play');root.querySelector<HTMLButtonElement>('[data-email-step="incoming"]')!.click();expect(root.dataset.emailCurrent).toBe('incoming');expect(vi.getTimerCount()).toBe(0);});
it.each([false,true])('honors explicit Play while its control keeps focus (reduced motion: %s)',motion=>{
 reduced=motion;const root=setup();init();observe([{isIntersecting:true}]);const play=root.querySelector<HTMLButtonElement>('[data-email-play]')!;
 if(!motion)play.click();
 expect(play.textContent).toBe('Play');play.focus();play.click();expect(play.textContent).toBe('Pause');
 vi.advanceTimersByTime(5200);expect(root.dataset.emailCurrent).toBe('incoming');expect(document.activeElement).toBe(play);
 vi.advanceTimersByTime(5200);expect(root.dataset.emailCurrent).toBe('reply');
});
it('holds playback while another example input is focused and pauses after a manual step',()=>{
 const root=setup();root.querySelector('.email-demo-view')!.insertAdjacentHTML('beforeend','<input aria-label="Example reply" readonly value="Thursday works for me.">');init();observe([{isIntersecting:true}]);
 const input=root.querySelector<HTMLInputElement>('input')!;input.focus();vi.advanceTimersByTime(10400);expect(root.dataset.emailCurrent).toBe('conversation');
 input.blur();vi.advanceTimersByTime(5200);expect(root.dataset.emailCurrent).toBe('incoming');
 const original=root.querySelector<HTMLButtonElement>('[data-email-step="original"]')!;original.focus();original.click();expect(root.dataset.emailCurrent).toBe('original');expect(root.querySelector('[data-email-play]')?.textContent).toBe('Play');vi.advanceTimersByTime(10400);expect(root.dataset.emailCurrent).toBe('original');expect(vi.getTimerCount()).toBe(0);
});
it('stops timers when leaving and starts only the new visit player',()=>{
 const previous=setup();init();observe([{isIntersecting:true}]);expect(vi.getTimerCount()).toBe(1);document.body.innerHTML='';dispatchEvent(new Event('receiz-learn:page'));expect(vi.getTimerCount()).toBe(0);
 const current=setup();init();observe([{isIntersecting:true}]);expect(vi.getTimerCount()).toBe(1);vi.advanceTimersByTime(5200);expect(current.dataset.emailCurrent).toBe('incoming');expect(previous.dataset.emailCurrent).toBe('conversation');
 document.body.innerHTML='';dispatchEvent(new Event('receiz-learn:page'));vi.advanceTimersByTime(10400);expect(vi.getTimerCount()).toBe(0);expect(current.dataset.emailCurrent).toBe('incoming');
});
