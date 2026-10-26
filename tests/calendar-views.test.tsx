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
async function render(layout:CalendarLayout,rows:OrganizerEvent[]=events){
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
 cleanups.push(()=>{act(()=>root.unmount());host.remove();});
 function Calendar(){const[day,onDay]=useState('2026-10-26'),[view,onLayout]=useState(layout);return <CalendarView day={day} events={rows} layout={view} onLayout={onLayout} onDay={onDay} onOpen={vi.fn()} onAdd={vi.fn()} onLinks={vi.fn()}/>;}
 await act(async()=>root.render(<Calendar/>));
 return host;
}
it('includes Monday morning, afternoon and overnight appointments in the selected day',async()=>{
 const host=await render('agenda');
 expect([...host.querySelectorAll('.organizer-agenda-row strong')].map(row=>row.textContent)).toEqual(['Sunday into Monday','Monday morning','Monday afternoon']);
});
it('shows the held month, includes overnight appointments and opens all of a chosen day in Agenda',async()=>{
 const cancelled={...appointment('Cancelled appointment','2026-10-26T12:00:00','2026-10-26T13:00:00'),metadata:{cancelled:true}};
 const host=await render('month',[...events,cancelled]),monday=host.querySelector<HTMLButtonElement>('.organizer-month-grid [aria-label="Monday, October 26 · 3 appointments"]');
 expect(monday).toBeTruthy();expect(monday?.textContent).toContain('+1 more');expect(host.textContent).not.toContain('Cancelled appointment');
 await act(async()=>monday!.click());expect(host.querySelector('.organizer-month-grid')).toBeNull();
 expect([...host.querySelectorAll('.organizer-agenda-row strong')].map(row=>row.textContent)).toEqual(['Sunday into Monday','Monday morning','Monday afternoon']);
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
 expect(buttons.map(row=>row.querySelector('strong')?.textContent)).toEqual(['Sunday into Monday','Monday morning','Monday afternoon']);
 for(const button of buttons){expect(button.getAttribute('aria-label')).toContain('Monday');expect(parseFloat(button.style.top)).toBeGreaterThanOrEqual(0);}
});
it.each(['agenda','week','month'] as const)('keeps sign-in activity out of %s without hiding an appointment with a similar title',async layout=>{
 const signIn={...appointment('Signed in activity','2026-10-26T11:00:00','2026-10-26T11:10:00'),source:'system',kind:'traction',metadata:{actionKind:'auth.login.passkey',ledgerEntryId:'entry-1'}};
 const appointmentWithSimilarName={...appointment('Sign-in review meeting','2026-10-26T12:00:00','2026-10-26T13:00:00'),title:'Signed in'};
 const host=await render(layout,[signIn,appointmentWithSimilarName]);expect(host.textContent).not.toContain('Signed in activity');expect(host.textContent).toContain('Signed in');
 if(layout==='month')expect(host.querySelector('[aria-label="Monday, October 26 · 1 appointment"]')).toBeTruthy();
});
