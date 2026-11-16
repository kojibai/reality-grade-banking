// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {afterEach,beforeEach,it,expect,vi} from 'vitest';
import {MessageAppointment} from '../src/features/messages/MessageAppointment';
import {createNativeOrganizer} from '../src/receiz/native-organizer';
import type {OpenIdentity} from '../src/receiz/native-identity';
import type {OrganizerEvent} from '../src/receiz/organizer-types';

Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
const uid='00000000-0000-4000-8000-000000000001';
const message={id:'message-one',conversationId:'conversation-one',body:'Could we meet tomorrow at 3pm for 45 minutes?',createdAt:'2026-11-15T15:00:00Z'};
const result:OrganizerEvent={id:'00000000-0000-4000-8000-000000000004',ownerUserId:uid,title:'Confirmed by Calendar',kind:'appointment',source:'message',startAt:'2026-11-16T20:00:00Z',endAt:'2026-11-16T20:45:00Z',attendees:['maya@example.com'],location:'',note:'',metadata:{conversationId:message.conversationId,sourceMessageId:message.id,inviteTimezone:'America/New_York'},createdAt:'2026-11-15T15:00:00Z',updatedAt:'2026-11-15T15:00:00Z'};
let host:HTMLDivElement,root:Root;
beforeEach(()=>{vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(new Date('2026-11-15T16:00:00Z'));host=document.createElement('div');document.body.append(host);root=createRoot(host);vi.spyOn(Intl.DateTimeFormat.prototype,'resolvedOptions').mockReturnValue({timeZone:'America/New_York'} as Intl.ResolvedDateTimeFormatOptions);});
afterEach(()=>{act(()=>root.unmount());host.remove();vi.restoreAllMocks();vi.useRealTimers();});
function identityFor(api:ReturnType<typeof createNativeOrganizer>):OpenIdentity{return{organizer:async()=>api,knownOrganizer:()=>api,knownOrganizerDisplay:()=>api.known()} as OpenIdentity;}
async function show(identity:OpenIdentity,overrides:Partial<Parameters<typeof MessageAppointment>[0]>={}){await act(async()=>root.render(<MessageAppointment message={message} identity={identity} accountUid={uid} attendees={['maya@example.com']} title="Meet Maya" {...overrides}/>));}
async function open(){await act(async()=>host.querySelector<HTMLButtonElement>('[aria-label="Review appointment from message"]')!.click());}
async function submit(){await act(async()=>host.querySelector('form')!.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));}
async function fill(name:string,value:string){await act(async()=>{const input=host.querySelector<HTMLInputElement>(`[name="${name}"]`)!;Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(input,value);input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));});}

it('shows an action only for an explicit candidate and leaves focus where it was until requested',async()=>{
 const requests:unknown[]=[],api=createNativeOrganizer({accountUid:uid,request:async(...args)=>{requests.push(args);throw Error('unexpected');}}),identity=identityFor(api);
 await show(identity,{message:{...message,body:'Maybe next week?'}});expect(host.querySelector('button')).toBeNull();
 const typing=document.createElement('input');host.append(typing);typing.focus();await show(identity);expect(document.activeElement).toBe(typing);expect(host.querySelector('form')).toBeNull();expect(requests).toEqual([]);
});

it('prefills review and saves only after confirmation, displaying the admitted native result without a collection read',async()=>{
 const requests:Array<{path:string;body:Record<string,unknown>}>=[],api=createNativeOrganizer({accountUid:uid,request:async(path,init)=>{requests.push({path,body:JSON.parse(String(init?.body))});return Response.json({ok:true,event:result});}}),identity=identityFor(api),recorded:OrganizerEvent[]=[];
 await show(identity,{onRecorded:event=>recorded.push(event)});await open();expect(requests).toEqual([]);
 expect(host.querySelector<HTMLInputElement>('[name="title"]')!.value).toBe('Meet Maya');
 expect(host.querySelector<HTMLInputElement>('[name="date"]')!.value).toBe('2026-11-16');expect(host.querySelector<HTMLInputElement>('[name="time"]')!.value).toBe('15:00');
 expect(host.querySelector<HTMLInputElement>('[name="timezone"]')!.value).toBe('America/New_York');expect(host.querySelector<HTMLSelectElement>('[name="duration"]')!.value).toBe('45');expect(host.querySelector<HTMLInputElement>('[name="attendees"]')!.value).toBe('maya@example.com');
 await submit();expect(requests).toHaveLength(1);expect(requests[0]).toMatchObject({path:'/api/calendar/events',body:{source:'message',title:'Meet Maya',startAt:'2026-11-16T20:00:00.000Z',endAt:'2026-11-16T20:45:00.000Z',attendees:['maya@example.com'],metadata:{conversationId:'conversation-one',sourceMessageId:'message-one',inviteTimezone:'America/New_York'}}});
 expect(host.textContent).toContain('Confirmed by Calendar');expect(host.textContent).toContain('Saved to Calendar');expect(host.querySelector('form')).toBeNull();expect(host.querySelector('a')).toBeNull();expect(recorded).toHaveLength(1);expect(recorded[0].id).toBe(result.id);expect(api.known().events?.[0].id).toBe(result.id);
});

it('retains an unknown write across unmount and never repeats its confirmation',async()=>{
 let writes=0;const api=createNativeOrganizer({accountUid:uid,request:async()=>{writes++;throw Error('connection lost after send');}}),identity=identityFor(api);
 await show(identity);await open();await submit();expect(host.textContent).toContain('not confirmed');expect(host.textContent).not.toContain('Saved to Calendar');
 expect(host.querySelector('time')?.dateTime).toBe('2026-11-16T20:00:00.000Z');expect(host.textContent).toContain('America/New_York');
 await act(async()=>root.render(null));await show(identity);expect(host.textContent).toContain('not confirmed');expect(host.querySelector('button[type="submit"]')).toBeNull();expect(writes).toBe(1);
});

it('does not let a late appointment result update another chat',async()=>{
 let finish!:(response:Response)=>void;const api=createNativeOrganizer({accountUid:uid,request:()=>new Promise(resolve=>{finish=resolve;})}),identity=identityFor(api),recorded:OrganizerEvent[]=[];
 await show(identity,{onRecorded:event=>recorded.push(event)});await open();await submit();
 await show(identity,{message:{...message,id:'message-two',conversationId:'conversation-two'}});
 await act(async()=>finish(Response.json({ok:true,event:result})));expect(host.textContent).not.toContain('Confirmed by Calendar');expect(recorded).toEqual([]);
 await show(identity);expect(host.textContent).toContain('Confirmed by Calendar');
});

it('does not deliver a late result into a reopened identity with the same message coordinates',async()=>{
 let finish!:(response:Response)=>void;const api=createNativeOrganizer({accountUid:uid,request:()=>new Promise(resolve=>{finish=resolve;})}),recorded:OrganizerEvent[]=[];
 await show(identityFor(api),{onRecorded:event=>recorded.push(event)});await open();await submit();
 const reopened=createNativeOrganizer({accountUid:uid,request:async()=>{throw Error('unexpected');}});await show(identityFor(reopened),{onRecorded:event=>recorded.push(event)});
 await act(async()=>finish(Response.json({ok:true,event:result})));expect(recorded).toEqual([]);expect(host.textContent).not.toContain('Confirmed by Calendar');expect(host.querySelector('[aria-label="Review appointment from message"]')).not.toBeNull();
});

it('keeps a pending confirmation single across repeated submits and chat remount',async()=>{
 let writes=0,finish!:(response:Response)=>void;const api=createNativeOrganizer({accountUid:uid,request:()=>{writes++;return new Promise(resolve=>{finish=resolve;});}}),identity=identityFor(api);
 await show(identity);await open();const form=host.querySelector('form')!;
 await act(async()=>{form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));});
 await act(async()=>root.render(null));await show(identity);expect(host.textContent).toContain('Saving appointment');expect(host.querySelector('form')).toBeNull();expect(writes).toBe(1);
 await act(async()=>finish(Response.json({ok:true,event:result})));expect(host.textContent).toContain('Confirmed by Calendar');expect(writes).toBe(1);
});

it('recognizes only an exact held message binding after a fresh identity object is opened',async()=>{
 let writes=0;const api=createNativeOrganizer({accountUid:uid,carried:{calendar:{events:[result]}},request:async()=>{writes++;throw Error('unexpected');}});
 await show(identityFor(api));expect(host.textContent).toContain('Confirmed by Calendar');expect(host.querySelector('form')).toBeNull();expect(writes).toBe(0);
 await show(identityFor(api),{message:{...message,id:'different-message'}});expect(host.textContent).not.toContain('Saved to Calendar');expect(host.querySelector('[aria-label="Review appointment from message"]')).not.toBeNull();
});

it('refuses a switched organizer owner before writing',async()=>{
 let writes=0;const api=createNativeOrganizer({accountUid:'different-owner',request:async()=>{writes++;throw Error('unexpected');}});
 await show(identityFor(api));await open();await submit();expect(writes).toBe(0);expect(host.textContent).toContain('account');expect(host.textContent).not.toContain('Saved to Calendar');
});

it('does not acknowledge or call back when the returned event omits the exact source message binding',async()=>{
 let writes=0;const recorded:OrganizerEvent[]=[],api=createNativeOrganizer({accountUid:uid,request:async()=>{writes++;return Response.json({ok:true,event:{...result,metadata:{}}});}});
 await show(identityFor(api),{onRecorded:event=>recorded.push(event)});await open();await submit();expect(host.textContent).toContain('not confirmed');expect(host.textContent).not.toContain('Saved to Calendar');expect(recorded).toEqual([]);expect(writes).toBe(1);
});

it('validates an edited wall time in the selected timezone before confirming it',async()=>{
 const writes:Record<string,unknown>[]=[],api=createNativeOrganizer({accountUid:uid,request:async(_path,init)=>{const body=JSON.parse(String(init?.body));writes.push(body);return Response.json({ok:true,event:{...result,...body,id:result.id,ownerUserId:uid,createdAt:result.createdAt,updatedAt:result.updatedAt,location:'',note:''}});}});
 await show(identityFor(api));await open();await fill('date','2027-03-14');await fill('time','02:30');await submit();expect(writes).toEqual([]);expect(host.getAttribute('role')).not.toBe('status');expect(host.textContent).toContain('occurs once');
 await fill('timezone','UTC');await submit();expect(writes).toHaveLength(1);expect(writes[0]).toMatchObject({startAt:'2027-03-14T02:30:00.000Z',endAt:'2027-03-14T03:15:00.000Z',metadata:{inviteTimezone:'UTC'}});expect(host.textContent).toContain('Saved to Calendar');
});

it('resolves an unknown outcome only when the existing organizer later holds its exact source message',async()=>{
 let writes=0,exact=false;const api=createNativeOrganizer({accountUid:uid,request:async(_path,init)=>{
  if(init?.method==='POST'){writes++;throw Error('lost acknowledgement');}
  return Response.json({ok:true,signedIn:true,complete:true,ownerUid:uid,events:exact?[result]:[{...result,id:'00000000-0000-4000-8000-000000000009',metadata:{...result.metadata,sourceMessageId:'another-message'}}],hasMore:false,nextCursor:null});
 }});
 await show(identityFor(api));await open();await submit();expect(host.textContent).toContain('not confirmed');
 const range={start:'2026-11-16T00:00:00Z',end:'2026-11-17T00:00:00Z'};
 await act(async()=>{await api.events(range,true);});expect(host.textContent).toContain('not confirmed');
 exact=true;await act(async()=>{await api.events(range,true);});expect(host.textContent).toContain('Confirmed by Calendar');expect(host.textContent).toContain('Saved to Calendar');expect(writes).toBe(1);
});
