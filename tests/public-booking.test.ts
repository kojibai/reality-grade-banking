import {it,expect,vi} from 'vitest';
import {createPublicBooking} from '../src/receiz/public-booking';
const availability={ok:true,owner:{username:'bjklock',displayName:'BJ Klock',avatarUrl:null},scheduleConfig:{slotMinutes:30,hourStarts:[9],weekdayIndexes:[1],daysForward:14},savedScheduleConfig:{slotMinutes:30,hourStarts:[9],weekdayIndexes:[1],daysForward:14},customQuestions:[],savedCustomQuestions:[],slots:[{id:'exact-slot',startAt:'2026-11-02T14:00:00.000Z',endAt:'2026-11-02T14:30:00.000Z'}]};
it('reads only the public booking source once, preserving exact slot instants across timezone changes',async()=>{
 const request=vi.fn(async(_path:string)=>Response.json(availability)),api=createPublicBooking({username:'bjklock',query:new URLSearchParams('fbclid=instagram'),request});expect(request).not.toHaveBeenCalled();await Promise.all([api.availability(),api.availability()]);await api.availability();expect(request).toHaveBeenCalledTimes(1);expect(request.mock.calls[0]?.[0]).toBe('/api/calendar/embed/bjklock');expect(api.known()?.slots[0].startAt).toBe('2026-11-02T14:00:00.000Z');
});
it('does not retry or duplicate a booking after a lost acknowledgement',async()=>{
 let reads=0,writes=0;const request=vi.fn(async(_path:string,init?:RequestInit)=>{if(init?.method==='POST'){writes++;throw Error('lost response');}reads++;return Response.json(availability);});const api=createPublicBooking({username:'bjklock',request});await api.availability();const input={slotStartAt:availability.slots[0].startAt,name:'Maya',email:'maya@example.test',timezone:'America/New_York',notes:'',questions:[]};await expect(api.confirm(input)).rejects.toThrow('BOOKING_OUTCOME_UNCONFIRMED');await expect(api.confirm(input)).rejects.toThrow('BOOKING_ALREADY_ATTEMPTED');expect(writes).toBe(1);expect(reads).toBe(1);
});
it('rejects slots never offered by the source before any write',async()=>{
 const request=vi.fn(async(_path:string)=>Response.json(availability)),api=createPublicBooking({username:'bjklock',request});await api.availability();await expect(api.confirm({slotStartAt:'2026-11-02T15:00:00Z',name:'Maya',email:'maya@example.test',timezone:'UTC',notes:'',questions:[]})).rejects.toThrow('BOOKING_SLOT_NOT_OFFERED');expect(request).toHaveBeenCalledTimes(1);
});
