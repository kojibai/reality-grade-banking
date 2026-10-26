// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {it,expect,vi} from 'vitest';
import {PublicBookingPage} from '../src/features/booking/PublicBookingPage';
import {createPublicBooking} from '../src/receiz/public-booking';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
it('keeps guests on the Bankeiz booking screen and never exposes private organizer controls',async()=>{
 const config={slotMinutes:30,hourStarts:[9],weekdayIndexes:[1],daysForward:14};const request=vi.fn(async()=>Response.json({ok:true,owner:{username:'bjklock',displayName:'BJ Klock',avatarUrl:null},scheduleConfig:config,savedScheduleConfig:config,customQuestions:[],savedCustomQuestions:[],slots:[{id:'slot',startAt:'2026-11-02T14:00:00.000Z',endAt:'2026-11-02T14:30:00.000Z'}]}));
 const service=createPublicBooking({username:'bjklock',request}),host=document.createElement('div');document.body.append(host);const root=createRoot(host);
 try{await act(async()=>root.render(<PublicBookingPage service={service}/>));expect(host.textContent).toContain('BJ Klock');expect(host.querySelector('[aria-label="Contacts"]')).toBeNull();expect(host.textContent).not.toContain('Your booking link');const time=host.querySelector<HTMLButtonElement>('[data-slot-start]');expect(time).not.toBeNull();await act(async()=>time!.click());await act(async()=>[...host.querySelectorAll('button')].find(b=>b.textContent==='Continue')!.click());expect(host.querySelector('[name="name"]')).not.toBeNull();expect(request).toHaveBeenCalledTimes(1);}finally{act(()=>root.unmount());host.remove();}
});
it('preserves every guest detail after a taken slot and choosing a replacement time',async()=>{
 const config={slotMinutes:30,hourStarts:[9],weekdayIndexes:[1],daysForward:14},request=vi.fn(async(_path:string,init?:RequestInit)=>Response.json(init?.method==='POST'?{ok:false,error:'calendar_booking_slot_unavailable'}:{ok:true,owner:{username:'bjklock',displayName:'BJ Klock',avatarUrl:null},scheduleConfig:config,savedScheduleConfig:config,customQuestions:[{id:'topic',label:'Topic',required:true}],savedCustomQuestions:[],slots:[{id:'one',startAt:'2026-11-02T14:00:00.000Z',endAt:'2026-11-02T14:30:00.000Z'},{id:'two',startAt:'2026-11-02T15:00:00.000Z',endAt:'2026-11-02T15:30:00.000Z'}]},{status:init?.method==='POST'?409:200}));
 const service=createPublicBooking({username:'bjklock',request}),host=document.createElement('div');document.body.append(host);const root=createRoot(host),button=(text:string)=>[...host.querySelectorAll('button')].find(b=>b.textContent?.includes(text))!;
 try{await act(async()=>root.render(<PublicBookingPage service={service}/>));await act(async()=>host.querySelector<HTMLButtonElement>('[data-slot-start]')!.click());await act(async()=>button('Continue').click());
 const values={name:'Alex Example',email:'alex@example.test',notes:'Keep this exact note','question:topic':'Launch ideas'};for(const [name,value]of Object.entries(values)){const field=host.querySelector<HTMLInputElement>('[name="'+name+'"]')!;await act(async()=>{Object.getOwnPropertyDescriptor(field.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value')!.set!.call(field,value);field.dispatchEvent(new Event('input',{bubbles:true}));field.dispatchEvent(new Event('change',{bubbles:true}));});}
 await act(async()=>host.querySelector('form')!.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));expect(host.textContent).toContain('no longer available');await act(async()=>button('Choose a time').click());await act(async()=>host.querySelectorAll<HTMLButtonElement>('[data-slot-start]')[1]!.click());await act(async()=>button('Continue').click());for(const[name,value]of Object.entries(values))expect(host.querySelector<HTMLInputElement>('[name="'+name+'"]')!.value).toBe(value);
 }finally{act(()=>root.unmount());host.remove();}
});
