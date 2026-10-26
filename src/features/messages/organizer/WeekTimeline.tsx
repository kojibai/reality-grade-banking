import {useMemo} from 'react';
import {buildDayEventLayouts} from '../../../receiz/calendar-timeline';
import type {OrganizerEvent} from '../../../receiz/native-organizer';
import {addDays,dayDate,timeLabel} from './ui';
/** Only the chosen Week view computes a layout, once per held event revision.
 * Plain positioned elements, no promoted layers or hidden parallel calendar. */
export function WeekTimeline({events,weekStart,onOpen}:{events:OrganizerEvent[];weekStart:string;onOpen(event:OrganizerEvent):void}){
 const grid=useMemo(()=>{const rows=events.map(event=>({record:event,start:new Date(event.startAt),end:new Date(event.endAt)})),overnight=rows.some(row=>row.start.toDateString()!==row.end.toDateString()),first=overnight?0:Math.min(8,...rows.map(row=>row.start.getHours())),last=overnight?24:Math.max(19,...rows.map(row=>Math.min(24,row.end.getHours()+1)));
  return{first,last,days:Array.from({length:7},(_,index)=>{const date=dayDate(addDays(weekStart,index)),end=dayDate(addDays(weekStart,index+1));return{date,items:buildDayEventLayouts(rows.filter(row=>row.end>date&&row.start<end),date,72,{minEventHeightPx:16,verticalGapPx:3})};})};},[events,weekStart]);
 const height=(grid.last-grid.first)*72;
 return <div className="organizer-week-overflow" aria-label="Weekly appointments"><div className="organizer-week-grid"><div className="organizer-week-hours" style={{height}}>{Array.from({length:grid.last-grid.first+1},(_,i)=><span key={i} style={{top:i*72}}>{(grid.first+i)%12||12}<small>{grid.first+i<12?'am':'pm'}</small></span>)}</div>{grid.days.map(({date,items})=><div key={date.toISOString()} className="organizer-week-day" style={{height}}><header>{date.toLocaleDateString(undefined,{weekday:'short'})}<strong>{date.getDate()}</strong></header>{Array.from({length:grid.last-grid.first},(_,i)=><i aria-hidden="true" key={i} style={{top:i*72}}/>)}{items.map(({event,topPx,heightPx,leftFraction,widthFraction})=><button type="button" key={event.record.id} aria-label={`${event.record.title}, ${date.toLocaleDateString(undefined,{weekday:'long'})}, ${timeLabel(event.record.startAt)}`} style={{top:topPx-grid.first*72,height:heightPx,left:`${leftFraction*100}%`,width:`${widthFraction*100}%`}} onClick={()=>onOpen(event.record)}><strong>{event.record.title}</strong><small>{timeLabel(event.record.startAt)}</small></button>)}</div>)}</div></div>;
}
