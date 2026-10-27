import type {BookingAvailability} from './organizer-types';

type OfferedSlot=BookingAvailability['slots'][number];
export interface BookingDay {day:string;weekday:string;date:number;month:string;label:string}
export interface BookingSlot {source:OfferedSlot;day:string;time:string}
interface PreparedBookingCalendar {days:BookingDay[];byDay:Map<string,BookingSlot[]>;byStart:Map<string,BookingSlot>;dayAt:(stamp:string)=>string;timeAt:(stamp:string)=>string}
/** Presentation only. An offered instant is never changed by its display zone. */
export function prepareBookingCalendar(source:BookingAvailability,zone:string):PreparedBookingCalendar{
 const held=prepared.get(source),previous=held?.get(zone);if(previous)return previous;
 const date=new Intl.DateTimeFormat('en-US',{year:'numeric',month:'2-digit',day:'2-digit',timeZone:zone});
 const time=new Intl.DateTimeFormat(undefined,{hour:'numeric',minute:'2-digit',timeZone:zone});
 const weekday=new Intl.DateTimeFormat(undefined,{weekday:'short'}),month=new Intl.DateTimeFormat(undefined,{month:'short'}),label=new Intl.DateTimeFormat(undefined,{weekday:'long',month:'long',day:'numeric'});
 const dayAt=(stamp:string)=>{const parts=date.formatToParts(new Date(stamp)),part=(name:string)=>parts.find(p=>p.type===name)?.value;return `${part('year')}-${part('month')}-${part('day')}`;};
 const byDay=new Map<string,BookingSlot[]>(),byStart=new Map<string,BookingSlot>(),days:BookingDay[]=[];
 for(const slot of source.slots){
  const day=dayAt(slot.startAt),entry={source:slot,day,time:time.format(new Date(slot.startAt))};
  let group=byDay.get(day);if(!group){group=[];byDay.set(day,group);const noon=new Date(day+'T12:00:00');days.push({day,weekday:weekday.format(noon),date:noon.getDate(),month:month.format(noon),label:label.format(noon)});}
  group.push(entry);if(!byStart.has(slot.startAt))byStart.set(slot.startAt,entry);
 }
 const value={days,byDay,byStart,dayAt,timeAt:(stamp:string)=>time.format(new Date(stamp))};
 const zones=held??new Map<string,PreparedBookingCalendar>();zones.set(zone,value);
 // Retain the current and previous display zone, rather than every zone ever
 // selected. Calendar data stays weakly bound to its actual source revision.
 if(zones.size>2)zones.delete(zones.keys().next().value!);prepared.set(source,zones);return value;
}
const prepared=new WeakMap<BookingAvailability,Map<string,PreparedBookingCalendar>>();
