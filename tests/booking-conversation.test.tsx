// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,expect,it,vi} from 'vitest';
import {PublicBookingPage} from '../src/features/booking/PublicBookingPage';
import {createPublicBooking} from '../src/receiz/public-booking';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
const config={slotMinutes:30,hourStarts:[9,10],weekdayIndexes:[1],daysForward:14};
const ownerId='ca7b930e-9137-41c9-8922-df2fb377c728';
const source=(state?:'ready'|'unavailable'|'unknown')=>({ok:true,owner:{userId:ownerId,username:'bjklock',displayName:'BJ Klock',avatarUrl:null},scheduleConfig:config,savedScheduleConfig:config,customQuestions:[{id:'topic',label:'Topic',required:true}],savedCustomQuestions:[],slots:[{id:'one',startAt:'2026-11-02T14:00:00.000Z',endAt:'2026-11-02T14:30:00.000Z'}],...(state?{conversation:{state,ownerUserId:ownerId,username:'bjklock'}}:{})});
const cleanups:Array<()=>void>=[];
afterEach(()=>{for(const cleanup of cleanups.splice(0))cleanup();vi.unstubAllGlobals();});
async function mount(state?:'ready'|'unavailable'|'unknown'){
 const request=vi.fn(async()=>Response.json(source(state))),service=createPublicBooking({username:'bjklock',request});
 await service.availability();const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
 cleanups.push(()=>{act(()=>root.unmount());host.remove();});await act(async()=>root.render(<PublicBookingPage service={service}/>));
 if(state==='ready')await vi.waitFor(()=>expect(host.querySelector('textarea[aria-label="Your reply"]')).not.toBeNull());
 return{host,root,service,request,button:(label:string)=>[...host.querySelectorAll<HTMLButtonElement>('button')].find(button=>button.textContent?.trim()===label)!};
}
async function fill(field:HTMLInputElement|HTMLTextAreaElement,value:string){await act(async()=>{Object.getOwnPropertyDescriptor(field.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value')!.set!.call(field,value);field.dispatchEvent(new Event('input',{bubbles:true}));field.dispatchEvent(new Event('change',{bubbles:true}));});}
it('starts a ready Business booking in a focused conversation without another read or welcome request',async()=>{
 const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);const{host,request}=await mount('ready');
 expect(host.querySelector('textarea[aria-label="Your reply"]')).not.toBeNull();
 expect(host.textContent).toContain('When’s a good time');expect(host.textContent).toContain('BJ Klock');
 expect(host.textContent).toContain('Choose a time');expect(host.querySelector('.booking-chat')?.textContent).not.toContain('Good things start');
 expect(host.querySelector('[data-booking-manual]')?.hasAttribute('hidden')).toBe(true);
 expect(request).toHaveBeenCalledOnce();expect(fetcher).not.toHaveBeenCalled();
});
it.each([undefined,'unavailable','unknown'] as const)('preserves the existing calendar for %s capability',async state=>{
 const{host,request}=await mount(state);expect(host.querySelector('textarea[aria-label="Your reply"]')).toBeNull();expect(host.querySelector('[data-slot-start]')).not.toBeNull();expect(host.textContent).toContain('Good things start');expect(request).toHaveBeenCalledOnce();
});
it('keeps the full manual calendar, questionnaire, chat draft and scroll when its overlay opens repeatedly',async()=>{
 const{host,button,request}=await mount('ready'),chat=host.querySelector<HTMLTextAreaElement>('textarea[aria-label="Your reply"]')!;
 expect(chat).not.toBeNull();await fill(chat,'Tomorrow afternoon would work.');
 const messages=host.querySelector<HTMLElement>('[data-booking-transcript]')!;messages.scrollTop=31;
 await act(async()=>button('Choose a time').click());
 const manual=host.querySelector<HTMLElement>('[data-booking-manual]')!;
 expect(manual.hidden).toBe(false);expect(chat.closest('[inert]')).not.toBeNull();
 const day=host.querySelector('[aria-label="Available days"]'),timezone=host.querySelector('[aria-label="Your timezone"]');
 await act(async()=>host.querySelector<HTMLButtonElement>('[data-slot-start]')!.click());
 const manualScroll=manual.querySelector<HTMLElement>('.organizer-scroll')!;manualScroll.scrollTop=190;
 await act(async()=>button('Continue').click());expect(manualScroll.scrollTop).toBe(0);
 await fill(host.querySelector<HTMLInputElement>('[name=name]')!,'Alex Example');await fill(host.querySelector<HTMLInputElement>('[name=email]')!,'alex@example.test');await fill(host.querySelector<HTMLInputElement>('[name="question:topic"]')!,'A practical booking');
 await act(async()=>manual.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true})));
 expect(manual.hidden).toBe(true);expect(chat.closest('[inert]')).toBeNull();expect(chat.value).toBe('Tomorrow afternoon would work.');expect(messages.scrollTop).toBe(31);
 await act(async()=>button('Choose a time').click());expect(manual.hidden).toBe(false);expect(host.querySelector<HTMLInputElement>('[name=name]')!.value).toBe('Alex Example');expect(host.querySelector<HTMLInputElement>('[name=email]')!.value).toBe('alex@example.test');expect(host.querySelector<HTMLInputElement>('[name="question:topic"]')!.value).toBe('A practical booking');expect(host.querySelector('[aria-label="Available days"]')).toBe(day);expect(host.querySelector('[aria-label="Your timezone"]')).toBe(timezone);expect(request).toHaveBeenCalledOnce();
});
it('does not replace an already settled calendar when later eligibility becomes ready',async()=>{
 const{host,root,service}=await mount('unavailable');
 const offered=host.querySelector('[data-slot-start]');const refresh=Promise.resolve({...service.known()!,conversation:{state:'ready' as const,ownerUserId:ownerId,username:'bjklock'}});
 await act(async()=>root.render(<PublicBookingPage service={service} opening={refresh}/>));
 expect(host.querySelector('textarea[aria-label="Your reply"]')).toBeNull();expect(host.querySelector('[data-slot-start]')).toBe(offered);
});
