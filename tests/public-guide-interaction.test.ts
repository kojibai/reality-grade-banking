// @vitest-environment happy-dom
import{afterEach,expect,it,vi}from'vitest';
import{init as bookInit}from'../public/learn/book.js';
import{init as matterInit}from'../public/learn/matter.js';
import{openContact}from'../public/learn/contact.js';
import{matterContent}from'../scripts/matter-page.mjs';
let reduced=false,observers:Array<(rows:unknown[])=>void>=[];
function environment(){vi.useFakeTimers();observers=[];vi.stubGlobal('matchMedia',()=>({matches:reduced,addEventListener:vi.fn(),removeEventListener:vi.fn()}));vi.stubGlobal('IntersectionObserver',class{constructor(fn:(rows:unknown[])=>void){observers.push(fn);}observe(){}disconnect(){}});}
afterEach(()=>{document.body.innerHTML='';dispatchEvent(new Event('receiz-learn:page'));vi.useRealTimers();vi.unstubAllGlobals();vi.restoreAllMocks();reduced=false;});
it('runs only visible booking examples, allows direct controls and preserves manual choice without transport',()=>{
 environment();const request=vi.spyOn(globalThis,'fetch').mockRejectedValue(Error('NO_TRANSPORT'));
 const views={one:'<p>Choose a time</p><button data-booking-demo-action="two">Continue</button>',two:'<p>You’re booked.</p>'};
 document.body.innerHTML='<main data-booking-guide><template data-booking-demo-bank></template><section data-booking-walkthrough data-booking-current="one" data-booking-sequence="one,two"><button data-booking-autoplay>Pause</button><div class="book-guide-demo-view">'+views.one+'</div><button data-booking-step="one">Choose</button><button data-booking-step="two">Confirmed</button><p data-booking-copy="one">Time</p><p data-booking-copy="two" hidden>Booked</p></section></main>';
 document.querySelector<HTMLTemplateElement>('template')!.content.textContent=JSON.stringify(views);bookInit();bookInit();expect(observers).toHaveLength(1);const root=document.querySelector<HTMLElement>('[data-booking-walkthrough]')!;
 vi.advanceTimersByTime(5200);expect(root.dataset.bookingCurrent).toBe('one');observers[0]([{target:root,isIntersecting:true}]);vi.advanceTimersByTime(5200);expect(root.dataset.bookingCurrent).toBe('two');
 root.querySelector<HTMLButtonElement>('[data-booking-step="one"]')!.click();root.querySelector<HTMLButtonElement>('[data-booking-demo-action]')!.click();expect(root.dataset.bookingCurrent).toBe('two');expect(root.querySelector('[data-booking-copy="one"]')?.hasAttribute('hidden')).toBe(true);vi.advanceTimersByTime(10400);expect(root.dataset.bookingCurrent).toBe('two');expect(request).not.toHaveBeenCalled();
});
it('keeps Digital Matter animation subordinate to visibility, reduced motion and explicit inspection',()=>{
 environment();document.body.innerHTML=matterContent();matterInit();const root=document.querySelector<HTMLElement>('[data-matter-machine]')!;observers[0]([{target:root,isIntersecting:true}]);vi.advanceTimersByTime(4800);expect(root.dataset.matterCurrent).toBe('seal');document.querySelector<HTMLButtonElement>('[data-matter-stage="inspect"]')!.click();expect(root.dataset.matterCurrent).toBe('inspect');vi.advanceTimersByTime(9600);expect(root.dataset.matterCurrent).toBe('inspect');expect(root.querySelector('[data-matter-panel="inspect"]')?.hasAttribute('hidden')).toBe(false);expect(document.querySelector('a[href="/proof/"]')).not.toBeNull();
 document.body.innerHTML='';dispatchEvent(new Event('receiz-learn:page'));expect(vi.getTimerCount()).toBe(0);
});
it('does not auto-advance with reduced motion',()=>{reduced=true;environment();document.body.innerHTML=matterContent();matterInit();const root=document.querySelector<HTMLElement>('[data-matter-machine]')!;observers[0]([{target:root,isIntersecting:true}]);vi.advanceTimersByTime(20000);expect(root.dataset.matterCurrent).toBe('capture');expect(vi.getTimerCount()).toBe(0);});
it('opens the existing personal booking in place and reuses its exact document on reopening',()=>{
 vi.spyOn(HTMLDialogElement.prototype,'showModal').mockImplementation(function(this:HTMLDialogElement){this.open=true;});vi.spyOn(HTMLDialogElement.prototype,'close').mockImplementation(function(this:HTMLDialogElement){this.open=false;this.dispatchEvent(new Event('close'));});
 vi.spyOn(HTMLIFrameElement.prototype,'src','set').mockImplementation(()=>{});document.body.innerHTML='<a href="/book/bjklock/">Contact</a>';const opener=document.querySelector('a')!;const url=location.href;openContact(opener);const dialog=document.querySelector<HTMLDialogElement>('.bank-contact-sheet')!,frame=dialog.querySelector('iframe')!;expect(dialog.open).toBe(true);expect(frame.getAttribute('src')).toBe('/book/bjklock/');expect(frame.getAttribute('title')).toContain('booking and Twin');dialog.querySelector('button')!.click();expect(dialog.open).toBe(false);openContact(opener);expect(dialog.querySelector('iframe')).toBe(frame);expect(document.querySelectorAll('iframe')).toHaveLength(1);expect(location.href).toBe(url);dialog.close();
});
