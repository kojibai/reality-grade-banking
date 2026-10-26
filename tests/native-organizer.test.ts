import {it,expect,vi} from 'vitest';
import {createNativeOrganizer} from '../src/receiz/native-organizer';
import {readOrganizerDisplay} from '../src/receiz/organizer-types';
const uid='00000000-0000-4000-8000-000000000001',other='00000000-0000-4000-8000-000000000002';
const contact={id:'00000000-0000-4000-8000-000000000003',fullName:'Maya Chen',email:'maya@example.com',phone:'',linkedUserId:other,createdAt:'2026-10-26T12:00:00Z',updatedAt:'2026-10-26T12:00:00Z',interactions:[]};
const event={id:'00000000-0000-4000-8000-000000000004',ownerUserId:uid,title:'Lunch',kind:'appointment',source:'manual',startAt:'2026-10-28T16:00:00Z',endAt:'2026-10-28T16:30:00Z',location:'',note:'',attendees:['maya@example.com'],metadata:{},createdAt:'2026-10-26T12:00:00Z',updatedAt:'2026-10-26T12:00:00Z'};
const projection=(owner=uid,contacts:unknown[]=[contact])=>({ok:true,signedIn:true,complete:true,ownerUid:owner,projection:{schema:'receiz.contacts.composite-proof.v1',ownerUid:owner,complete:true,contacts}});
const range={start:'2026-10-01T00:00:00.000Z',end:'2026-11-01T00:00:00.000Z'};
it('does no work until a missing view is requested and shares concurrent requests',async()=>{
 const request=vi.fn(async()=>Response.json(projection()));const api=createNativeOrganizer({accountUid:uid,request});
 expect(request).not.toHaveBeenCalled();expect(api.knownContacts()).toBeNull();
 const [a,b]=await Promise.all([api.contacts(),api.contacts()]);expect(a).toBe(b);expect(request).toHaveBeenCalledTimes(1);
 expect(await api.contacts()).toBe(a);expect(request).toHaveBeenCalledTimes(1);
});
it('reuses carried account records immediately without requests or re-verification',async()=>{
 const request=vi.fn();const api=createNativeOrganizer({accountUid:uid,request,carried:{contacts:[contact],calendar:{events:[event]}}});
 expect(api.knownContacts()?.[0].fullName).toBe('Maya Chen');expect(api.knownEvents(range)?.[0].title).toBe('Lunch');expect(request).not.toHaveBeenCalled();
 expect(readOrganizerDisplay(api.known(),uid)).not.toBeNull();
});
it('keeps unrelated calendar and contact reads from invalidating each other',async()=>{
 const request=vi.fn(async(path:string)=>Response.json(path.startsWith('/api/contacts')?projection():{ok:true,signedIn:true,ownerUid:uid,complete:true,username:'bjklock',events:[event],hasMore:false,nextCursor:null}));const api=createNativeOrganizer({accountUid:uid,request});
 await Promise.all([api.contacts(),api.events(range)]);await api.contacts();await api.events(range);expect(request).toHaveBeenCalledTimes(2);
});
it('retains the existing contact fields without copying arbitrary response credentials',async()=>{
 const request=vi.fn(async()=>Response.json(projection(uid,[{...contact,accessToken:'must-not-retain'}])));const api=createNativeOrganizer({accountUid:uid,request});await api.contacts();expect(api.knownContacts()?.[0]).not.toHaveProperty('accessToken');
});
it('never replaces admitted contacts with signed-out, partial or another owner response',async()=>{
 let response:unknown=projection();const request=vi.fn(async()=>Response.json(response));const api=createNativeOrganizer({accountUid:uid,request});await api.contacts();
 for(const bad of [{ok:true,signedIn:false,complete:false,contacts:[]},projection(other),{...projection(),complete:false}]){response=bad;await expect(api.contacts(true)).rejects.toThrow();expect(api.knownContacts()).toHaveLength(1);}
});
it('keeps one admitted calendar range, merges pages and rejects foreign events',async()=>{
 let foreign=false;const request=vi.fn(async(_path:string)=>Response.json({ok:true,signedIn:true,ownerUid:uid,complete:true,events:[{...event,ownerUserId:foreign?other:uid}],hasMore:false,nextCursor:null,username:'bjklock'}));const api=createNativeOrganizer({accountUid:uid,request});
 await api.events(range);await api.events(range);expect(request).toHaveBeenCalledTimes(1);foreign=true;await expect(api.events(range,true)).rejects.toThrow();expect(api.knownEvents(range)).toHaveLength(1);
});
it('merges the exact write result without reloading the contact collection',async()=>{
 const request=vi.fn(async(_path:string,init?:RequestInit)=>Response.json(init?.method==='POST'?{ok:true,contact}:projection(uid,[])));const api=createNativeOrganizer({accountUid:uid,request});await api.contacts();await api.saveContact({fullName:'Maya Chen'});expect(api.knownContacts()?.[0].id).toBe(contact.id);expect(request).toHaveBeenCalledTimes(2);
});
it('never retries a lost write acknowledgement and stops late results after closure',async()=>{
 const request=vi.fn(async()=>{throw Error('connection lost');});let open=true;const api=createNativeOrganizer({accountUid:uid,request,assertOpen:()=>{if(!open)throw Error('IDENTITY_CLOSED');}});
 await expect(api.saveContact({fullName:'Maya'})).rejects.toThrow('ORGANIZER_WRITE_UNCONFIRMED');expect(request).toHaveBeenCalledTimes(1);open=false;await expect(api.contacts()).rejects.toThrow('IDENTITY_CLOSED');expect(request).toHaveBeenCalledTimes(1);
});
it('keeps pre-read contact writes partial, merges the complete collection and retains that distinction',async()=>{
 const older={...contact,id:'00000000-0000-4000-8000-000000000009',fullName:'Existing person'};
 const request=vi.fn(async(_path:string,init?:RequestInit)=>Response.json(init?.method==='POST'?{ok:true,contact}:projection(uid,[older]))),api=createNativeOrganizer({accountUid:uid,request});
 await api.saveContact({fullName:'Maya'});const restored=createNativeOrganizer({accountUid:uid,request,retained:api.known()});
 expect((await restored.contacts()).map(row=>row.id)).toEqual([older.id,contact.id]);expect(request).toHaveBeenCalledTimes(2);await restored.contacts();expect(request).toHaveBeenCalledTimes(2);
});
it('merges writes that complete during the initial full contact read',async()=>{
 let finish!:(value:Response)=>void;const older={...contact,id:'00000000-0000-4000-8000-000000000009',fullName:'Existing person'};
 const request=vi.fn((_path:string,init?:RequestInit)=>init?.method==='POST'?Promise.resolve(Response.json({ok:true,contact})):new Promise<Response>(resolve=>{finish=resolve;}));const api=createNativeOrganizer({accountUid:uid,request}),reading=api.contacts();await api.saveContact({fullName:'Maya'});finish(Response.json(projection(uid,[older])));expect((await reading).map(row=>row.id)).toEqual([older.id,contact.id]);await api.contacts();expect(request).toHaveBeenCalledTimes(2);
});
it('refuses incomplete or foreign empty calendar pages without caching the range',async()=>{
 let response:unknown={ok:true,events:[]};const request=vi.fn(async()=>Response.json(response)),api=createNativeOrganizer({accountUid:uid,request});
 for(const bad of [{ok:true,events:[]},{ok:true,events:[],signedIn:true,ownerUid:other,complete:true,hasMore:false,nextCursor:null},{ok:true,events:[],signedIn:true,ownerUid:uid,complete:false,hasMore:false,nextCursor:null},{ok:true,events:[],signedIn:true,ownerUid:uid,complete:true,hasMore:'false',nextCursor:null},{ok:true,events:[],signedIn:true,ownerUid:uid,complete:true,hasMore:true,nextCursor:'empty-page'}]){response=bad;await expect(api.events(range)).rejects.toThrow();expect(api.known().ranges).toHaveLength(0);}
 response={ok:true,events:[],signedIn:true,ownerUid:uid,complete:true,hasMore:false,nextCursor:null};await api.events(range);await api.events(range);expect(request).toHaveBeenCalledTimes(6);
});
