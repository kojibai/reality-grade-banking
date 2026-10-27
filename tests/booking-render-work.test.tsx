// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {expect,it,vi} from 'vitest';
import {PublicBookingPage} from '../src/features/booking/PublicBookingPage';
import {createPublicBooking} from '../src/receiz/public-booking';
import {Sheet} from '../src/components/Sheet';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
const config={slotMinutes:30,hourStarts:[9],weekdayIndexes:[1,2,3,4,5],daysForward:45};
function source(){return{ok:true,owner:{username:'bjklock',displayName:'BJ Klock',avatarUrl:null},scheduleConfig:config,savedScheduleConfig:config,customQuestions:[],savedCustomQuestions:[],slots:Array.from({length:842},(_,i)=>{const start=Date.parse('2026-11-01T14:00:00Z')+i*30*60*1000;return{id:'slot-'+i,startAt:new Date(start).toISOString(),endAt:new Date(start+30*60*1000).toISOString()};})};}
it('prepares one timezone index instead of constructing a formatter for every offered slot, and retains the time picker on Back',async()=>{
 const request=vi.fn(async()=>Response.json(source())),service=createPublicBooking({username:'bjklock',request});await service.availability();
 const original=Intl.DateTimeFormat,formatters=vi.spyOn(Intl,'DateTimeFormat').mockImplementation(function(locales,options){return new original(locales,options);});
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
 const render=()=>root.render(<PublicBookingPage service={service} embedded/>),click=async(text:string)=>act(async()=>[...host.querySelectorAll<HTMLButtonElement>('button')].find(b=>b.textContent?.includes(text))!.click());
 try{
  await act(async()=>render());
  const preparedCount=formatters.mock.calls.length;
  expect(preparedCount).toBeLessThan(12);
  const timezone=host.querySelector('[aria-label="Your timezone"]'),first=host.querySelector<HTMLButtonElement>('[data-slot-start]');expect(first).not.toBeNull();
  await act(async()=>first!.click());await click('Continue');await click('Choose a time');
  expect(host.querySelector('[aria-label="Your timezone"]')).toBe(timezone);expect(host.querySelector('[data-slot-start]')).toBe(first);
  await act(async()=>render());
  expect(formatters.mock.calls.length).toBe(preparedCount);expect(request).toHaveBeenCalledOnce();
 }finally{act(()=>root.unmount());host.remove();formatters.mockRestore();}
});
it('returns the actual dialog scroll container to the time picker before painting Back',async()=>{
 const service=createPublicBooking({username:'bjklock',request:async()=>Response.json(source())});await service.availability();
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
 const click=async(text:string)=>act(async()=>[...host.querySelectorAll<HTMLButtonElement>('button')].find(b=>b.textContent?.includes(text))!.click());
 try{
  await act(async()=>root.render(<Sheet title="Book a time" onClose={()=>{}}><PublicBookingPage service={service} embedded/></Sheet>));
  await act(async()=>host.querySelector<HTMLButtonElement>('[data-slot-start]')!.click());await click('Continue');
  const dialog=host.querySelector('dialog')!;dialog.scrollTop=280;
  await click('Choose a time');expect(dialog.scrollTop).toBe(0);
 }finally{act(()=>root.unmount());host.remove();}
});
