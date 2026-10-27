import {calendarEventTitle} from '../../../receiz/calendar-labels';
import {useMemo} from 'react';
import type {OrganizerEvent} from '../../../receiz/native-organizer';
import {addDays,dayDate,dayLabel,localDay} from './ui';

/** Index the held month once. Day taps open its same records in Agenda. */
export function CalendarMonth({events,day,start,end,onDay}:{events:OrganizerEvent[]|null;day:string;start:string;end:string;onDay(day:string):void}){
 const cells=useMemo(()=>{
  const first=localDay(new Date(start)),limit=localDay(new Date(end)),byDay=new Map<string,OrganizerEvent[]>();
  for(let date=first;date<limit;date=addDays(date,1))byDay.set(date,[]);
  for(const event of [...events??[]].filter(row=>row.metadata.cancelled!==true).sort((a,b)=>a.startAt.localeCompare(b.startAt))){
   const from=localDay(new Date(event.startAt)),until=localDay(new Date(Date.parse(event.endAt)-1));
   for(let date=from<first?first:from;date<=until&&date<limit;date=addDays(date,1))byDay.get(date)?.push(event);
  }
  return [...byDay];
 },[events,start,end]);
 return <section aria-label="Monthly appointments" className="organizer-month-view"><div className="organizer-month-weekdays" aria-hidden="true">{['M','T','W','T','F','S','S'].map((label,index)=><span key={index}>{label}</span>)}</div><div className="organizer-month-grid">{cells.map(([date,rows])=><button key={date} type="button" className={`${date.slice(0,7)!==day.slice(0,7)?'outside ':''}${date===day?'active':''}`} aria-label={`${dayLabel(date)} · ${rows.length} appointment${rows.length===1?'':'s'}`} aria-pressed={date===day} onClick={()=>onDay(date)}><time dateTime={date}>{dayDate(date).getDate()}</time>{rows.slice(0,2).map(event=><span key={event.id}>{calendarEventTitle(event)}</span>)}{rows.length>2&&<small>+{rows.length-2} more</small>}</button>)}</div></section>;
}
