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
async function fixture(view:'contacts'|'calendar'='contacts',failedContacts=false,initialContacts=[contact]){
 const request=vi.fn(async(path:string,init?:RequestInit)=>path==='/api/contacts/import'&&init?.method==='POST'?Response.json({ok:true,importedCount:1,createdCount:1,updatedCount:0,contacts:[contact]},{status:201}):failedContacts&&path==='/api/contacts'?Response.json({ok:false,error:'contacts_load_failed',detail:'private server detail'},{status:500}):Response.json(path.startsWith('/api/calendar/events')?{ok:true,signedIn:true,complete:true,ownerUid:owner,events:[],hasMore:false,nextCursor:null}:{ok:true,signedIn:true,complete:true,ownerUid:owner,projection:{ownerUid:owner,complete:true,contacts:initialContacts}}));
 const api=createNativeOrganizer({accountUid:owner,request}),organizer=vi.fn(async()=>api),onMessage=vi.fn(),onBack=vi.fn();
 const identity={organizer,accountUsername:()=> 'bjklock'} as unknown as OpenIdentity;
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host);cleanups.push(()=>{act(()=>root.unmount());host.remove();});
 await act(async()=>root.render(<OrganizerPanel identity={identity} entry={{id:1,view}} active onBack={onBack} onMessage={onMessage}/>));
 const click=async(label:string)=>{const b=[...host.querySelectorAll('button')].find(b=>b.textContent===label||b.getAttribute('aria-label')===label);expect(b,label).toBeTruthy();await act(async()=>b!.click());};
 return{host,click,request,onMessage,onBack,organizer,api};
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
it.each([
 ['people.csv','csv','Name,Email\r\nMaya Chen,maya@example.test'],
 ['people.vcf','vcard','BEGIN:VCARD\r\nVERSION:3.0\r\nFN:Maya Chen\r\nEMAIL:maya@example.test\r\nEND:VCARD'],
 ['people.json','json',JSON.stringify({contacts:[{fullName:'Maya Chen',email:'maya@example.test'}]})],
])('imports %s into an initially empty Contacts list and displays the saved result without reloading',async(name,source,contents)=>{
 const f=await fixture('contacts',false,[]);
 expect(f.host.textContent).toContain('Add your first contact');expect(f.host.querySelector('[role="alert"]')).toBeNull();
 await f.click('Import contacts');
 const input=f.host.querySelector<HTMLInputElement>('input[type="file"]');expect(input).toBeTruthy();
 Object.defineProperty(input!,'files',{value:[new File([contents],name)],configurable:true});
 await act(async()=>input!.dispatchEvent(new Event('change',{bubbles:true})));
 expect(f.host.textContent).toContain('Contacts imported.');expect(f.host.textContent).toContain('Maya Chen');
 expect(f.request).toHaveBeenCalledTimes(2);
 const [path,init]=f.request.mock.calls[1]!;expect(path).toBe('/api/contacts/import');expect(init?.method).toBe('POST');
 expect(JSON.parse(init!.body as string)).toMatchObject({source,fileName:name,contacts:[{fullName:'Maya Chen',email:'maya@example.test'}]});
 await f.click('Maya Chen');await f.click('Contacts');expect(f.request).toHaveBeenCalledTimes(2);
});
it('offers both adding and importing on the empty Contacts screen',async()=>{
 const f=await fixture('contacts',false,[]);
 const empty=f.host.querySelector('.organizer-empty');expect(empty?.textContent).toContain('Add a contact');expect(empty?.textContent).toContain('Import contacts');
 const upload=empty?.querySelector<HTMLButtonElement>('[aria-label="Import CSV, vCard or JSON"]');expect(upload).toBeTruthy();
 await act(async()=>upload!.click());expect(f.host.querySelector('input[type="file"]')?.getAttribute('accept')).toContain('.csv');
 expect(f.request).toHaveBeenCalledTimes(1);
});

it('paints a background task’s saved contact immediately in the already-open list without another read',async()=>{
 const f=await fixture(),newContact={...contact,id:'00000000-0000-4000-8000-000000000009',fullName:'New research lead'};
 await act(async()=>f.api.mergeSavedContacts(owner,[newContact]));expect(f.host.textContent).toContain('New research lead');expect(f.request).toHaveBeenCalledTimes(1);
});

it('paints held Contacts on the first render without reopening its service',async()=>{
 const f=await fixture(),open=vi.fn(()=>new Promise<never>(()=>{}));
 const identity={knownOrganizer:()=>f.api,knownOrganizerDisplay:()=>f.api.known(),organizer:open,accountUsername:()=> 'bjklock'} as unknown as OpenIdentity;
 const host=document.createElement('div'),root=createRoot(host);cleanups.push(()=>act(()=>root.unmount()));
 act(()=>root.render(<OrganizerPanel identity={identity} entry={{id:2,view:'contacts'}} active onBack={()=>{}} onMessage={()=>{}}/>));
 expect(host.textContent).toContain('Maya Chen');expect(host.querySelector('[role="status"]')).toBeNull();expect(open).not.toHaveBeenCalled();expect(f.request).toHaveBeenCalledOnce();
});
it('creates a live public meeting once, then copies its exact link and invites an email on that same event',async()=>{const f=await fixture('calendar'),key='abcdefghijklmnop';let event:Record<string,unknown>|null=null;f.request.mockImplementation(async(path,init)=>{if(path==='/api/calendar/events'&&init?.method==='POST'){const input=JSON.parse(String(init.body)),now=new Date().toISOString();event={id:'55555555-5555-4555-8555-555555555555',ownerUserId:owner,createdByUserId:owner,...input,kind:'appointment',source:'manual',note:'',location:'https://bankeiz.com/meet/55555555-5555-4555-8555-555555555555/'+key+'/',metadata:{bankMeeting:{schema:'bankeiz.meeting.v1',twin:true,recording:true},confirmationKey:key},createdAt:now,updatedAt:now};return Response.json({ok:true,event});}if(init?.method==='PATCH'){const input=JSON.parse(String(init.body));event={...event,attendees:input.attendees};return Response.json({ok:true,event,inviteSummary:{status:'sent',delivered:1}});}return Response.json({ok:true,signedIn:true,complete:true,ownerUid:owner,events:[],hasMore:false,nextCursor:null});});await f.click('Meet now');expect(event).not.toBeNull();expect(f.host.querySelector('a')?.getAttribute('href')).toContain('/meet/');expect(f.host.querySelector('[aria-label="Copy meeting link"]')).not.toBeNull();const input=f.host.querySelector<HTMLInputElement>('[aria-label="Invite by email"]');expect(input).not.toBeNull();await act(async()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(input,'maya@example.test');input!.dispatchEvent(new Event('input',{bubbles:true}));});await act(async()=>input!.closest('form')!.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));expect(f.request.mock.calls.filter(([,init])=>init?.method==='POST')).toHaveLength(1);const patch=f.request.mock.calls.find(([,init])=>init?.method==='PATCH')!;expect(JSON.parse(String(patch[1]?.body))).toMatchObject({action:'invite',attendees:['maya@example.test'],inviteEmails:['maya@example.test']});expect(f.host.textContent).toContain('Invitations sent');});
it('preserves a different settled appointment while an earlier invitation completes',async()=>{const f=await fixture('calendar'),now=new Date(),startAt=now.toISOString(),endAt=new Date(now.getTime()+3600000).toISOString(),make=(id:string,title:string)=>({id,ownerUserId:owner,createdByUserId:owner,title,kind:'appointment',source:'manual',startAt,endAt,location:`https://bankeiz.com/meet/${id}/abcdefghijklmnop/`,note:'',attendees:[],metadata:{bankMeeting:{schema:'bankeiz.meeting.v1',twin:true,recording:true},confirmationKey:'abcdefghijklmnop'},createdAt:startAt,updatedAt:startAt}),a=make('66666666-6666-4666-8666-666666666666','Meeting A'),b=make('77777777-7777-4777-8777-777777777777','Meeting B');let finish!:(value:Response)=>void;const pending=new Promise<Response>(resolve=>finish=resolve);f.request.mockImplementation(async(path,init)=>init?.method==='PATCH'?pending:Response.json(path.includes('/bundle')?{ok:false,error:'fixture_no_record'}:{ok:true,signedIn:true,complete:true,ownerUid:owner,events:[a,b],hasMore:false,nextCursor:null}));const{calendarWindow}=await import('../src/features/messages/organizer/CalendarViews'),{localDay}=await import('../src/features/messages/organizer/ui');await act(async()=>{await f.api.events(calendarWindow(localDay(now)),true);});const open=async(title:string)=>{const node=[...f.host.querySelectorAll('.organizer-agenda-row strong')].find(v=>v.textContent===title);expect(node).toBeTruthy();await act(async()=>node!.closest('button')!.click());};await open('Meeting A');const input=f.host.querySelector<HTMLInputElement>('[aria-label="Invite by email"]')!;await act(async()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(input,'maya@example.test');input.dispatchEvent(new Event('input',{bubbles:true}));});await act(async()=>input.closest('form')!.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));await f.click('Calendar');await open('Meeting B');await act(async()=>finish(Response.json({ok:true,event:{...a,attendees:['maya@example.test']},inviteSummary:{status:'sent',delivered:1}})));expect(f.host.querySelector('.organizer-lead')?.textContent).toBe('Meeting B');});

it.each(['contacts','calendar'] as const)('paints retained %s in the first synchronous render while service preparation is pending',view=>{
 const now=new Date().toISOString(),event={id:'held-event',ownerUserId:owner,title:'Saved project review',kind:'appointment',source:'manual',startAt:now,endAt:new Date(Date.now()+1800000).toISOString(),location:'',note:'',attendees:[],metadata:{},createdAt:now,updatedAt:now};
 const identity={knownOrganizerDisplay:()=>({schema:'bankeiz.organizer-display.v1',accountUid:owner,contacts:[contact],events:[event],ranges:[],username:'bjklock'}),organizer:vi.fn(()=>new Promise<never>(()=>{})),accountUsername:()=> 'bjklock'} as unknown as OpenIdentity;
 const host=document.createElement('div'),root=createRoot(host);cleanups.push(()=>act(()=>root.unmount()));
 act(()=>root.render(<OrganizerPanel identity={identity} entry={{id:3,view}} active onBack={()=>{}} onMessage={()=>{}}/>));
 expect(host.textContent).toContain(view==='contacts'?'Maya Chen':'Saved project review');
 expect(host.querySelector('.inline-opening')).toBeNull();expect(identity.organizer).toHaveBeenCalledOnce();
});
