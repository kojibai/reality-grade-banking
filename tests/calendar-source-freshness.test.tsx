// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,expect,it,vi} from 'vitest';
import {createNativeOrganizer,type OrganizerEvent} from '../src/receiz/native-organizer';
import {OrganizerPanel} from '../src/features/messages/organizer/OrganizerPanel';
import {calendarWindow} from '../src/features/messages/organizer/CalendarViews';
import type {OpenIdentity} from '../src/receiz/native-identity';

Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
const owner='10000000-0000-4000-8000-000000000001';
function activity(id:string,day:string,title:string):OrganizerEvent{
 const at=day+'T17:00:00.000Z';
 return{id,ownerUserId:owner,title,kind:'traction',source:'system',startAt:at,endAt:day+'T17:10:00.000Z',location:'',note:'',attendees:[],metadata:{actionKind:'receiz.record'},createdAt:at,updatedAt:at};
}
const first=activity('10000000-0000-4000-8000-000000000011','2026-11-01','Activity on November 1');
const second=activity('10000000-0000-4000-8000-000000000012','2026-11-02','Original sealed on November 2');
const third=activity('10000000-0000-4000-8000-000000000013','2026-11-03','Original signed on November 3');
const envelope=(events:OrganizerEvent[])=>({ok:true,signedIn:true,ownerUid:owner,complete:true,username:'artist',events,hasMore:false,nextCursor:null});
const roots:ReturnType<typeof createRoot>[]=[];
afterEach(()=>{for(const root of roots.splice(0))act(()=>root.unmount());vi.useRealTimers();vi.restoreAllMocks();});
async function open(api:ReturnType<typeof createNativeOrganizer>){
 const identity={binding:{keyId:'fixture',artifactOwnerReceizId:'artist.receiz.id'},accountUsername:()=> 'artist',knownOrganizer:()=>api,knownOrganizerDisplay:()=>api.known(),organizer:async()=>api}as unknown as OpenIdentity;
 const host=document.createElement('div'),root=createRoot(host);roots.push(root);
 const render=async(active=true,entryId=1)=>act(async()=>root.render(<OrganizerPanel identity={identity} entry={{id:entryId,view:'calendar'}} active={active} onBack={()=>{}}/>));
 await render();return{host,render};
}
it.each([{day:'2026-11-02',event:second},{day:'2026-11-03',event:third}])('reopens Calendar on $day with newer activity after a complete November 1 range was retained',async({day,event})=>{
 vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(new Date('2026-11-01T17:00:00.000Z'));
 let current=[first];
 const request=vi.fn(async()=>Response.json(envelope(current)));
 const old=createNativeOrganizer({accountUid:owner,request});
 await old.events(calendarWindow('2026-11-01'));expect(request).toHaveBeenCalledOnce();
 const retained=structuredClone(old.known());
 vi.setSystemTime(new Date(day+'T18:00:00.000Z'));current=[first,second,third];
 const reopened=createNativeOrganizer({accountUid:owner,request,retained}),{host}=await open(reopened);
 expect(host.querySelector<HTMLInputElement>('[aria-label="Choose calendar date"]')?.value).toBe(day);
 expect(host.textContent).toContain(event.title);
 expect(reopened.known().events?.map(row=>row.id)).toContain(first.id);
 expect(request).toHaveBeenCalledTimes(2);
});
it('renders November 3 activity from the ordinary fresh range read across the DST boundary',async()=>{
 vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(new Date('2026-11-03T18:00:00.000Z'));
 const request=vi.fn(async()=>Response.json(envelope([first,second,third]))),api=createNativeOrganizer({accountUid:owner,request}),{host}=await open(api);
 expect(host.textContent).toContain(third.title);expect(request).toHaveBeenCalledOnce();
});
it('revalidates on an explicit same-day Calendar entry and preserves the already shown rows',async()=>{
 vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(new Date('2026-11-03T18:00:00.000Z'));
 let current=[third];const request=vi.fn(async()=>Response.json(envelope(current))),api=createNativeOrganizer({accountUid:owner,request}),view=await open(api);
 expect(view.host.textContent).toContain(third.title);expect(request).toHaveBeenCalledOnce();
 const later=activity('10000000-0000-4000-8000-000000000014','2026-11-03','Later November 3 activity');
 current=[third,later];await view.render(true,2);
 expect(view.host.textContent).toContain(later.title);expect(view.host.textContent).toContain(third.title);expect(request).toHaveBeenCalledTimes(2);
});
it('keeps the known calendar visible when its explicit-entry revalidation fails',async()=>{
 vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(new Date('2026-11-03T18:00:00.000Z'));
 const request=vi.fn(async()=>Response.json(envelope([third]))),api=createNativeOrganizer({accountUid:owner,request}),view=await open(api);
 await view.render(false);request.mockResolvedValueOnce(Response.json({ok:false,error:'calendar_load_failed'},{status:500}));await view.render();
 expect(view.host.textContent).toContain(third.title);expect(view.host.querySelector('[role="alert"]')).not.toBeNull();expect(api.known().events).toEqual([third]);expect(request).toHaveBeenCalledTimes(2);
});
it('coalesces simultaneous openings into the existing range read while painting held rows immediately',async()=>{
 vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(new Date('2026-11-03T18:00:00.000Z'));
 const request=vi.fn(async()=>Response.json(envelope([third]))),api=createNativeOrganizer({accountUid:owner,request});await api.events(calendarWindow('2026-11-03'));
 let finish!:(value:Response)=>void;request.mockImplementation(()=>new Promise<Response>(resolve=>{finish=resolve;}));
 const views=[await open(api),await open(api)];
 for(const view of views)expect(view.host.textContent).toContain(third.title);expect(request).toHaveBeenCalledTimes(2);
 const later=activity('10000000-0000-4000-8000-000000000014','2026-11-03','Later November 3 activity');
 await act(async()=>finish(Response.json(envelope([third,later]))));for(const view of views)expect(view.host.textContent).toContain(later.title);
});
it('merges an exact appointment save that completes during explicit-entry revalidation',async()=>{
 vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(new Date('2026-11-03T18:00:00.000Z'));
 const request=vi.fn(async()=>Response.json(envelope([third]))),api=createNativeOrganizer({accountUid:owner,request}),view=await open(api);
 let finish!:(value:Response)=>void;const saved={...activity('10000000-0000-4000-8000-000000000014','2026-11-03','Appointment saved during revalidation'),kind:'appointment',source:'manual'};
 request.mockImplementation(async(_path?:string,init?:RequestInit)=>init?.method==='POST'?Response.json({ok:true,event:saved}):new Promise<Response>(resolve=>{finish=resolve;}));
 await view.render(false);await view.render();
 expect(request).toHaveBeenCalledTimes(2);
 await act(async()=>{await api.saveEvent({title:saved.title,startAt:saved.startAt,endAt:saved.endAt});});expect(view.host.textContent).toContain(saved.title);
 await act(async()=>finish(Response.json(envelope([third]))));
 expect(view.host.textContent).toContain(saved.title);expect(api.known().events?.map(event=>event.id)).toEqual([third.id,saved.id]);expect(request).toHaveBeenCalledTimes(3);
});
