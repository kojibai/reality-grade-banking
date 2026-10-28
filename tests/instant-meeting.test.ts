import{OrganizerRequestError}from'../src/receiz/native-organizer';
import{it,expect,vi}from'vitest';import{createInstantMeeting}from'../src/receiz/instant-meeting';
const uid='11111111-1111-4111-8111-111111111111',id='22222222-2222-4222-8222-222222222222',path=`/meet/${id}/abcdefghijklmnop/`;
function fixture(){const rows=new Map<string,string>(),storage={getItem:(k:string)=>rows.get(k)??null,setItem:(k:string,v:string)=>{rows.set(k,v);},removeItem:(k:string)=>{rows.delete(k);}},saveEvent=vi.fn(async(_input:import('../src/receiz/organizer-types').AppointmentInput)=>({id,ownerUserId:uid,metadata:{confirmationKey:'abcdefghijklmnop',bankMeetingRequestId:id,bankMeeting:{schema:'bankeiz.meeting.v1',enabled:true,twin:true,recording:true}},location:'https://bankeiz.com'+path})),contacts=vi.fn(),events=vi.fn(),organizer=vi.fn(async()=>({accountUid:uid,saveEvent,contacts,events}));const identity=vi.fn(async()=>({organizer}));return{storage,saveEvent,contacts,events,identity,rows,create:()=>createInstantMeeting({identity:identity as never,storage,now:()=>Date.parse('2026-10-28T14:00:00Z'),newId:()=>id,timezone:()=> 'America/New_York'})};}
it('two starts create one accepted meeting without reading contacts, calendar lists or messaging',async()=>{const f=fixture(),start=f.create();expect(await Promise.all([start.open(),start.open()])).toEqual([path,path]);expect(f.saveEvent).toHaveBeenCalledOnce();expect(f.contacts).not.toHaveBeenCalled();expect(f.events).not.toHaveBeenCalled();expect(f.saveEvent).toHaveBeenCalledWith(expect.objectContaining({meeting:true,meetingRequestId:id,attendees:[]}));});
it('lost acknowledgement and reload retry the exact persisted intent',async()=>{const f=fixture();f.saveEvent.mockRejectedValueOnce(Error('response lost'));await expect(f.create().open()).rejects.toThrow('lost');const first=f.saveEvent.mock.calls[0]![0];expect(await f.create().open()).toBe(path);expect(f.saveEvent.mock.calls[1]![0]).toEqual(first);expect(f.rows.size).toBe(0);});
it('a failed selected identity creates no replacement or calendar event',async()=>{const f=fixture();f.identity.mockRejectedValue(Error('selected source unavailable'));await expect(f.create().open()).rejects.toThrow('source');expect(f.saveEvent).not.toHaveBeenCalled();});
it('does not navigate to a mismatched or external meeting result',async()=>{const f=fixture();f.saveEvent.mockResolvedValue({id,ownerUserId:uid,metadata:{confirmationKey:'abcdefghijklmnop',bankMeetingRequestId:id,bankMeeting:{schema:'bankeiz.meeting.v1',enabled:true,twin:true,recording:true}},location:'https://example.com/meet/x/y/'});await expect(f.create().open()).rejects.toThrow('MEETING_CREATION_UNCONFIRMED');expect(f.rows.size).toBe(1);});

it('rejects an internally consistent room belonging to a different creation intent',async()=>{const f=fixture();f.saveEvent.mockResolvedValue({id,ownerUserId:uid,metadata:{confirmationKey:'abcdefghijklmnop',bankMeetingRequestId:uid,bankMeeting:{schema:'bankeiz.meeting.v1',enabled:true,twin:true,recording:true}},location:'https://bankeiz.com'+path});await expect(f.create().open()).rejects.toThrow('MEETING_CREATION_UNCONFIRMED');expect(f.rows.size).toBe(1);});
it('rejects a link key that differs from the accepted event confirmation key',async()=>{const f=fixture();f.saveEvent.mockResolvedValue({id,ownerUserId:uid,metadata:{confirmationKey:'different-private-key',bankMeetingRequestId:id,bankMeeting:{schema:'bankeiz.meeting.v1',enabled:true,twin:true,recording:true}},location:'https://bankeiz.com'+path});await expect(f.create().open()).rejects.toThrow('MEETING_CREATION_UNCONFIRMED');expect(f.rows.size).toBe(1);});

it('replays a transient calendar failure once with the exact same creation command',async()=>{
 const f=fixture();f.saveEvent.mockRejectedValueOnce(new OrganizerRequestError('ORGANIZER_WRITE_UNCONFIRMED',500,undefined,'calendar_create_failed'));
 expect(await f.create().open()).toBe(path);
 expect(f.saveEvent).toHaveBeenCalledTimes(2);
 expect(f.saveEvent.mock.calls[1]![0]).toBe(f.saveEvent.mock.calls[0]![0]);
 expect(f.rows.size).toBe(0);
});
it('bounds calendar failure replay and preserves intent for a later manual retry',async()=>{
 const f=fixture(),start=f.create();f.saveEvent.mockRejectedValueOnce(new OrganizerRequestError('ORGANIZER_WRITE_UNCONFIRMED',500,undefined,'calendar_create_failed')).mockRejectedValueOnce(new OrganizerRequestError('ORGANIZER_WRITE_UNCONFIRMED',500,undefined,'calendar_create_failed'));
 await expect(start.open()).rejects.toThrow('ORGANIZER_WRITE_UNCONFIRMED');
 expect(f.saveEvent).toHaveBeenCalledTimes(2);expect(f.rows.size).toBe(1);
 expect(await start.open()).toBe(path);
 expect(f.saveEvent.mock.calls[2]![0]).toEqual(f.saveEvent.mock.calls[0]![0]);
});
it('does not retry rejected meeting authority or a changed request',async()=>{
 const f=fixture();f.saveEvent.mockRejectedValueOnce(Error('meeting_request_changed'));
 await expect(f.create().open()).rejects.toThrow('meeting_request_changed');expect(f.saveEvent).toHaveBeenCalledOnce();
});
it('replays the real calendar 500 response through the native organizer adapter',async()=>{
 const {createNativeOrganizer}=await import('../src/receiz/native-organizer');const f=fixture();
 const event={...(await f.saveEvent({title:'Live meeting',startAt:'2026-10-28T14:00:00Z',endAt:'2026-10-28T15:00:00Z'})),title:'Live meeting',kind:'appointment',source:'manual',startAt:'2026-10-28T14:00:00Z',endAt:'2026-10-28T15:00:00Z',createdAt:'2026-10-28T14:00:00Z',updatedAt:'2026-10-28T14:00:00Z',attendees:[],note:''};
 const request=vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ok:false,error:'calendar_create_failed'}),{status:500})).mockResolvedValue(new Response(JSON.stringify({ok:true,event}),{status:201}));
 const api=createNativeOrganizer({accountUid:uid,request});
 const start=createInstantMeeting({identity:async()=>({knownOrganizer:()=>api})as never,storage:f.storage,now:()=>Date.parse(event.startAt),newId:()=>id});
 expect(await start.open()).toBe(path);expect(request).toHaveBeenCalledTimes(2);
 expect(request.mock.calls[0][1].body).toBe(request.mock.calls[1][1].body);
});
