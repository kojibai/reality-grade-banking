import {expect,it} from 'vitest';
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
