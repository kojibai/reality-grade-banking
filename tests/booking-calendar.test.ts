import {expect,it,vi} from 'vitest';
import {prepareBookingCalendar} from '../src/receiz/booking-calendar';
import type {BookingAvailability} from '../src/receiz/organizer-types';

it('retains the offered instants through timezone and daylight-saving display changes',()=>{
 const slots=[{id:'before',startAt:'2026-11-01T05:30:00Z',endAt:'2026-11-01T06:00:00Z'},{id:'after',startAt:'2026-11-01T06:30:00Z',endAt:'2026-11-01T07:00:00Z'}];
 const source={slots} as BookingAvailability;
 const east=prepareBookingCalendar(source,'America/New_York'),west=prepareBookingCalendar(source,'America/Los_Angeles');
 expect(east.days.map(value=>value.day)).toEqual(['2026-11-01']);
 expect(west.days.map(value=>value.day)).toEqual(['2026-10-31']);
 expect(east.byDay.get('2026-11-01')?.map(value=>value.source)).toEqual(slots);
 expect(east.byStart.get(slots[1].startAt)?.source).toBe(slots[1]);
 expect(prepareBookingCalendar(source,'America/New_York')).toBe(east);
 expect(east.byStart.get(slots[0].startAt)?.time).toBe(east.byStart.get(slots[1].startAt)?.time);
});

it('shows midnight, noon and afternoon as AM/PM even with a default 24-hour locale',()=>{
 const Original=Intl.DateTimeFormat;
 const intl=vi.spyOn(Intl,'DateTimeFormat').mockImplementation(function(locales,options){return new Original(locales??'en-GB',options);});
 try{
  const slots=['2026-11-14T05:00:00Z','2026-11-14T17:00:00Z','2026-11-14T20:30:00Z'].map(startAt=>({id:startAt,startAt,endAt:startAt}));
  const calendar=prepareBookingCalendar({slots} as BookingAvailability,'America/New_York');
  expect(slots.map(slot=>calendar.byStart.get(slot.startAt)?.time)).toEqual(['12:00 AM','12:00 PM','3:30 PM']);
  expect(calendar.timeAt(slots[2].startAt)).toBe('3:30 PM');
  expect([...calendar.byStart.values()].map(slot=>slot.source)).toEqual(slots);
 }finally{intl.mockRestore();}
});
