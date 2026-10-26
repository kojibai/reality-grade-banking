// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,it,expect,vi} from 'vitest';
import {OrganizerPanel} from '../src/features/messages/organizer/OrganizerPanel';
import {createNativeOrganizer} from '../src/receiz/native-organizer';
import type {OpenIdentity} from '../src/receiz/native-identity';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
const owner='00000000-0000-4000-8000-000000000001',peer='00000000-0000-4000-8000-000000000002';
const contact={id:'00000000-0000-4000-8000-000000000003',fullName:'Maya Chen',email:'maya@example.test',phone:'+15555550121',linkedUserId:peer,createdAt:'2026-10-26T12:00:00Z',updatedAt:'2026-10-26T12:00:00Z',interactions:[]};
const cleanups:Array<()=>void>=[];afterEach(()=>{for(const cleanup of cleanups.splice(0))cleanup();});
async function fixture(view:'contacts'|'calendar'='contacts',failedContacts=false){
 const request=vi.fn(async(path:string)=>failedContacts&&path==='/api/contacts'?Response.json({ok:false,error:'contacts_load_failed',detail:'private server detail'},{status:500}):Response.json(path.startsWith('/api/calendar/events')?{ok:true,signedIn:true,complete:true,ownerUid:owner,events:[],hasMore:false,nextCursor:null}:{ok:true,signedIn:true,complete:true,ownerUid:owner,projection:{ownerUid:owner,complete:true,contacts:[contact]}}));
 const api=createNativeOrganizer({accountUid:owner,request}),organizer=vi.fn(async()=>api),onMessage=vi.fn(),onBack=vi.fn();
 const identity={organizer,accountUsername:()=> 'bjklock'} as unknown as OpenIdentity;
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host);cleanups.push(()=>{act(()=>root.unmount());host.remove();});
 await act(async()=>root.render(<OrganizerPanel identity={identity} entry={{id:1,view}} active onBack={onBack} onMessage={onMessage}/>));
 const click=async(label:string)=>{const b=[...host.querySelectorAll('button')].find(b=>b.textContent===label||b.getAttribute('aria-label')===label);expect(b,label).toBeTruthy();await act(async()=>b!.click());};
 return{host,click,request,onMessage,onBack,organizer};
}
it('uses the same contacts and moves from person to conversation without sending anything',async()=>{
 const f=await fixture();expect(f.host.textContent).toContain('Maya Chen');expect(f.request).toHaveBeenCalledTimes(1);
 await f.click('Maya Chen');await f.click('Message');expect(f.onMessage).toHaveBeenCalledWith(expect.objectContaining({userId:peer,displayName:'Maya Chen'}));expect(f.request).toHaveBeenCalledTimes(1);
});
it('opens the appointment with the selected contact and preserves the shared read',async()=>{
 const f=await fixture();await f.click('Maya Chen');await f.click('Schedule');
 expect(f.host.querySelector<HTMLInputElement>('[name="attendees"]')?.value).toBe('maya@example.test');expect(f.host.textContent).toContain('New appointment');expect(f.request).toHaveBeenCalledTimes(1);
});
it('switches calendar views instantly from the held range and only reads a missing month once',async()=>{
 const f=await fixture('calendar');expect(f.request).toHaveBeenCalledTimes(1);
 await f.click('Week');await f.click('Month');await f.click('Agenda');await f.click('Month');expect(f.request).toHaveBeenCalledTimes(1);
 await f.click('Next month');expect(f.request).toHaveBeenCalledTimes(2);
 await f.click('Previous month');expect(f.request).toHaveBeenCalledTimes(2);
 await f.click('Next month');expect(f.request).toHaveBeenCalledTimes(2);
});
it('offers an icon-only booking shortcut above the calendar and keeps its existing bottom link',async()=>{
 const f=await fixture('calendar'),shortcut=f.host.querySelector<HTMLButtonElement>('.organizer-topline [aria-label="Booking link"]');
 expect(shortcut).toBeTruthy();expect(shortcut?.textContent).toBe('');expect(f.host.querySelector('.organizer-link-row')?.textContent).toContain('Your booking link');
 expect(f.request).toHaveBeenCalledTimes(1);
});
it('keeps Contacts failure details collapsed and exposes only its safe code and status',async()=>{
 const f=await fixture('contacts',true),details=f.host.querySelector<HTMLDetailsElement>('.organizer-error-details');
 expect(f.host.querySelector('[role="alert"]')?.textContent).toContain('Your existing records');expect(details?.open).toBe(false);
 expect(details?.textContent).toContain('contacts_load_failed');expect(details?.textContent).toContain('HTTP 500');expect(f.host.textContent).not.toContain('private server detail');
});
