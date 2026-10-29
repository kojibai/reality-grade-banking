// @vitest-environment happy-dom
import {act,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,expect,it,vi} from 'vitest';
import {CalendarView,type CalendarLayout} from '../src/features/messages/organizer/CalendarViews';
import type {OrganizerEvent} from '../src/receiz/native-organizer';

Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
const cleanups:Array<()=>void>=[];
afterEach(()=>{for(const cleanup of cleanups.splice(0))cleanup();});
function appointment(id:string,start:string,end:string):OrganizerEvent{
 return{id,title:id,ownerUserId:'owner',kind:'appointment',source:'manual',startAt:new Date(start).toISOString(),endAt:new Date(end).toISOString(),createdAt:'2026-10-01T00:00:00Z',updatedAt:'2026-10-01T00:00:00Z',attendees:[],location:'',note:'',metadata:{}};
}
const events=[
 appointment('Monday morning','2026-10-26T09:00:00','2026-10-26T10:00:00'),
 appointment('Monday afternoon','2026-10-26T15:00:00','2026-10-26T16:00:00'),
 appointment('Sunday into Monday','2026-10-25T23:00:00','2026-10-26T01:00:00'),
 appointment('Previous Sunday','2026-10-25T09:00:00','2026-10-25T10:00:00'),
 appointment('Next Monday','2026-11-02T09:00:00','2026-11-02T10:00:00'),
];
async function render(layout:CalendarLayout,rows:OrganizerEvent[]=events,onOpen=vi.fn()){
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
 cleanups.push(()=>{act(()=>root.unmount());host.remove();});
 function Calendar(){const[day,onDay]=useState('2026-10-26'),[view,onLayout]=useState(layout);return <CalendarView day={day} events={rows} layout={view} onLayout={onLayout} onDay={onDay} onOpen={onOpen} onAdd={vi.fn()} onLinks={vi.fn()}/>;}
 await act(async()=>root.render(<Calendar/>));
 return host;
}
it('shows the selected day from latest to earliest time, including overnight appointments',async()=>{
 const host=await render('agenda');
 expect([...host.querySelectorAll('.organizer-agenda-row strong')].map(row=>row.textContent)).toEqual(['Monday afternoon','Monday morning','Sunday into Monday']);
});
it('shows the held month, includes overnight appointments and opens all of a chosen day in Agenda',async()=>{
 const cancelled={...appointment('Cancelled appointment','2026-10-26T12:00:00','2026-10-26T13:00:00'),metadata:{cancelled:true}};
 const host=await render('month',[...events,cancelled]),monday=host.querySelector<HTMLButtonElement>('.organizer-month-grid [aria-label="Monday, October 26 · 3 appointments"]');
 expect(monday).toBeTruthy();expect(monday?.textContent).toContain('+1 more');expect(host.textContent).not.toContain('Cancelled appointment');
 await act(async()=>monday!.click());expect(host.querySelector('.organizer-month-grid')).toBeNull();
 expect([...host.querySelectorAll('.organizer-agenda-row strong')].map(row=>row.textContent)).toEqual(['Monday afternoon','Monday morning','Sunday into Monday']);
});
it('moves through the year without month-end date overflow and retains the direct date picker',async()=>{
 const host=await render('month');
 const click=async(label:string)=>act(async()=>host.querySelector<HTMLButtonElement>(`[aria-label="${label}"]`)!.click());
 for(let i=0;i<3;i++)await click('Next month');expect(host.querySelector('.organizer-month')?.textContent).toBe('January 2027');
 const date=host.querySelector<HTMLInputElement>('[aria-label="Choose calendar date"]')!;
 expect(date.type).toBe('date');expect(date.value).toBe('2027-01-01');
 await click('Previous month');expect(host.querySelector('.organizer-month')?.textContent).toBe('December 2026');
});

it('places the complete Monday in its own week and excludes the next Monday',async()=>{
 const host=await render('week'),buttons=[...host.querySelectorAll<HTMLButtonElement>('.organizer-week-day>button')];
 expect(buttons.map(row=>row.querySelector('strong')?.textContent)).toEqual(['Monday afternoon','Monday morning','Sunday into Monday']);
 for(const button of buttons){expect(button.getAttribute('aria-label')).toContain('Monday');expect(parseFloat(button.style.getPropertyValue('--week-top'))).toBeGreaterThanOrEqual(0);}
});
it.each(['agenda','week','month'] as const)('keeps sign-in activity out of %s without hiding an appointment with a similar title',async layout=>{
 const signIn={...appointment('Signed in activity','2026-10-26T11:00:00','2026-10-26T11:10:00'),source:'system',kind:'traction',metadata:{actionKind:'auth.login.passkey',ledgerEntryId:'entry-1'}};
 const appointmentWithSimilarName={...appointment('Sign-in review meeting','2026-10-26T12:00:00','2026-10-26T13:00:00'),title:'Signed in'};
 const host=await render(layout,[signIn,appointmentWithSimilarName]);expect(host.textContent).not.toContain('Signed in activity');expect(host.textContent).toContain('Signed in');
 if(layout==='month')expect(host.querySelector('[aria-label="Monday, October 26 · 1 appointment"]')).toBeTruthy();
});
function touch(host:Element,type:string,x:number,y:number){const event=new Event(type,{bubbles:true,cancelable:true});Object.defineProperties(event,{touches:{value:type==='touchend'?[]:[{identifier:1,clientX:x,clientY:y}]},changedTouches:{value:[{identifier:1,clientX:x,clientY:y}]}});host.dispatchEvent(event);}
it('turns weeks on the day strip and days on Agenda while ignoring vertical scrolling and cancelled gestures',async()=>{
 const host=await render('agenda');
 const swipe=async(selector:string,dx:number,dy=0,cancel=false)=>act(async()=>{const area=host.querySelector(selector)!;touch(area,'touchstart',160,100);touch(area,'touchmove',160+dx,100+dy);touch(area,cancel?'touchcancel':'touchend',160+dx,100+dy);});
 await swipe('.organizer-agenda',-80);expect(host.querySelector('.organizer-date-heading')?.textContent).toContain('Tuesday, October 27');
 await swipe('.organizer-agenda',80);expect(host.querySelector('.organizer-date-heading')?.textContent).toContain('Monday, October 26');
 await swipe('.organizer-agenda',-80,120);expect(host.querySelector('.organizer-date-heading')?.textContent).toContain('Monday, October 26');
 await swipe('.organizer-agenda',-80,0,true);expect(host.querySelector('.organizer-date-heading')?.textContent).toContain('Monday, October 26');
 await swipe('.organizer-week-strip',-80);expect(host.querySelector('.organizer-date-heading')?.textContent).toContain('Monday, November 2');
 await swipe('.organizer-week-strip',80);expect(host.querySelector('.organizer-date-heading')?.textContent).toContain('Monday, October 26');
});

it('keeps one complete week of event controls, ordered newest day and time first and opening the held event',async()=>{
 const onOpen=vi.fn(),host=await render('week',events,onOpen),days=[...host.querySelectorAll('.organizer-week-day')];
 expect(days).toHaveLength(7);
 expect(days.map(day=>day.querySelector('time')?.getAttribute('datetime'))).toEqual(['2026-11-01','2026-10-31','2026-10-30','2026-10-29','2026-10-28','2026-10-27','2026-10-26']);
 const monday=days[6],buttons=[...monday.querySelectorAll<HTMLButtonElement>('button')];
 expect(buttons.map(button=>button.querySelector('strong')?.textContent)).toEqual(['Monday afternoon','Monday morning','Sunday into Monday']);
 expect(monday.querySelector('time')?.getAttribute('datetime')).toBe('2026-10-26');
 expect(days[1].textContent).toContain('No appointments');
 expect(host.querySelectorAll('.organizer-week-day>button')).toHaveLength(3);
 await act(async()=>buttons[0].click());expect(onOpen).toHaveBeenCalledOnce();expect(onOpen).toHaveBeenCalledWith(events[1]);
});
it('does not change the chosen day when the week content is scrolled vertically or diagonally',async()=>{
 const host=await render('week'),area=host.querySelector('.organizer-week-overflow')!;
 for(const [dx,dy] of [[0,-180],[-85,-160],[80,180]])await act(async()=>{touch(area,'touchstart',160,250);touch(area,'touchmove',160+dx,250+dy);touch(area,'touchend',160+dx,250+dy);});
 expect(host.querySelector<HTMLInputElement>('[aria-label="Choose calendar date"]')?.value).toBe('2026-10-26');
});
