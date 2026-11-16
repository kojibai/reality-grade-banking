import {useEffect,useId,useMemo,useReducer,useRef,useState,type FormEvent} from 'react';
import {CalendarPlus,Check,X} from 'lucide-react';
import type {OpenIdentity} from '../../receiz/native-identity';
import {OrganizerRequestError} from '../../receiz/native-organizer';
import {calendarTimezoneOptions,deviceCalendarTimezone,validCalendarTimezone} from '../../receiz/calendar-timezone';
import {findMessageAppointments,type MessageAppointmentCandidate} from '../../receiz/message-appointment';
import type {AppointmentInput,OrganizerEvent} from '../../receiz/organizer-types';
import './message-appointment.css';

export interface MessageAppointmentProps {
 message:{id:string;body:string;createdAt:string;conversationId:string};
 identity:OpenIdentity;accountUid:string;attendees:string[];title:string;
 onRecorded?:(event:OrganizerEvent)=>void;
}
type Attempt={status:'saving'|'unknown'|'recorded';input:AppointmentInput;timezone:string;event?:OrganizerEvent};
type Checkpoint={attempt?:Attempt;listeners:Set<()=>void>};
// Session UI custody only. Native organizer events remain the saved authority.
// In-flight/unknown commands survive chat unmount without becoming replayable.
const checkpoints=new WeakMap<OpenIdentity,Map<string,Checkpoint>>();
function checkpointFor(identity:OpenIdentity,key:string){let rows=checkpoints.get(identity);if(!rows){rows=new Map();checkpoints.set(identity,rows);}let value=rows.get(key);if(!value){value={listeners:new Set()};rows.set(key,value);}return value;}
function changed(checkpoint:Checkpoint){for(const notify of checkpoint.listeners)notify();}
type Draft={title:string;date:string;time:string;duration:string;timezone:string;attendees:string};
function draftFor(candidate:MessageAppointmentCandidate,title:string,attendees:string[]):Draft{
 const parts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:candidate.timezone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(candidate.startAt)).map(part=>[part.type,part.value]));
 return{title:title.trim().slice(0,160)||'Appointment',date:`${parts.year}-${parts.month}-${parts.day}`,time:`${parts.hour}:${parts.minute}`,duration:String((Date.parse(candidate.endAt)-Date.parse(candidate.startAt))/60000),timezone:candidate.timezone,attendees:attendees.join(', ')};
}
function hasMessageBinding(event:OrganizerEvent,props:MessageAppointmentProps){return event.ownerUserId===props.accountUid&&event.kind==='appointment'&&event.source==='message'&&event.metadata.conversationId===props.message.conversationId&&event.metadata.sourceMessageId===props.message.id;}
function heldAppointment(props:MessageAppointmentProps):OrganizerEvent|undefined{
 try{const api=props.identity.knownOrganizer?.();const display=api?.accountUid===props.accountUid?api.known():props.identity.knownOrganizerDisplay?.();return display?.accountUid===props.accountUid?display.events?.find(event=>hasMessageBinding(event,props)):undefined;}catch{return undefined;}
}

/** Every identity/thread/message change gets its own view lifetime. A late save
 * can update its own checkpoint, never the next chat's callback or draft. */
export function MessageAppointment(props:MessageAppointmentProps){
 const generation=useRef({identity:props.identity,value:0});if(generation.current.identity!==props.identity)generation.current={identity:props.identity,value:generation.current.value+1};
 return <AppointmentReview key={JSON.stringify([generation.current.value,props.accountUid,props.message.conversationId,props.message.id])} {...props}/>;
}
function AppointmentReview(props:MessageAppointmentProps){
 const {message,identity,accountUid,title,attendees,onRecorded}=props,timezone=useMemo(deviceCalendarTimezone,[]),id=useId();
 const candidates=useMemo(()=>findMessageAppointments({body:message.body,referenceAt:message.createdAt,timezone}),[message.body,message.createdAt,timezone]);
 const checkpoint=useMemo(()=>checkpointFor(identity,JSON.stringify([accountUid,message.conversationId,message.id])),[identity,accountUid,message.conversationId,message.id]);
 const [,render]=useReducer(value=>value+1,0),[open,setOpen]=useState(false),[draft,setDraft]=useState<Draft|null>(null),[error,setError]=useState('');
 const alive=useRef(false),callback=useRef(onRecorded);callback.current=onRecorded;
 useEffect(()=>{alive.current=true;checkpoint.listeners.add(render);return()=>{alive.current=false;checkpoint.listeners.delete(render);};},[checkpoint]);
 const held=heldAppointment(props),attempt=checkpoint.attempt,event=held??attempt?.event;
 useEffect(()=>{try{const api=identity.knownOrganizer?.();return api?.accountUid===accountUid?api.subscribe(render):undefined;}catch{return undefined;}},[identity,accountUid,attempt?.status]);
 const available=candidates.filter(candidate=>Date.parse(candidate.startAt)>Date.now());
 const update=(field:keyof Draft,value:string)=>{setDraft(previous=>previous?{...previous,[field]:value}:previous);setError('');};
 const review=()=>{if(!draft&&available[0])setDraft(draftFor(available[0],title,attendees));setOpen(true);};
 const confirm=async(submit:FormEvent<HTMLFormElement>)=>{
  submit.preventDefault();if(checkpoint.attempt||!draft)return;
  const cleanTitle=draft.title.trim(),minutes=Number(draft.duration),emails=[...new Set(draft.attendees.split(/[,;\n]/).map(value=>value.trim().toLowerCase()).filter(Boolean))];
  if(!cleanTitle||cleanTitle.length>160){setError('Add an appointment title.');return;}
  if(!Number.isInteger(minutes)||minutes<1||minutes>480){setError('Choose a duration from 1 to 480 minutes.');return;}
  if(emails.length>100||emails.some(email=>email.length>254||!/^\S+@[^\s@]+\.[^\s@]+$/.test(email))){setError('Use email addresses separated by commas for attendees.');return;}
  const candidate=findMessageAppointments({body:`${draft.date} at ${draft.time}`,referenceAt:new Date().toISOString(),timezone:draft.timezone})[0];
  if(!candidate){setError('Choose a future time that occurs once in this timezone.');return;}
  const input:AppointmentInput={kind:'appointment',source:'message',title:cleanTitle,startAt:candidate.startAt,endAt:new Date(Date.parse(candidate.startAt)+minutes*60000).toISOString(),attendees:emails,metadata:{conversationId:message.conversationId,sourceMessageId:message.id,sourceMessageCreatedAt:message.createdAt,inviteTimezone:draft.timezone}};
  const pending:Attempt={status:'saving',input,timezone:draft.timezone};checkpoint.attempt=pending;changed(checkpoint);setError('');let started=false,saved:OrganizerEvent|undefined;
  try{
   const api=identity.knownOrganizer?.()??await identity.organizer!();
   if(api.accountUid!==accountUid)throw Error('MESSAGE_APPOINTMENT_ACCOUNT_CHANGED');
   // A reopened native display may already carry this exact source message.
   // Matching titles or times never count as acknowledgement.
   const existing=api.known().events?.find(row=>hasMessageBinding(row,props));
   if(existing)saved=existing;
   else{started=true;saved=await api.saveEvent(input);if(!hasMessageBinding(saved,props))throw Error('MESSAGE_APPOINTMENT_UNCONFIRMED');}
   checkpoint.attempt={...pending,status:'recorded',event:saved};changed(checkpoint);
  }catch(cause){
   saved=undefined;
   const refused=cause instanceof OrganizerRequestError&&cause.status!==null&&cause.status>=400&&cause.status<500&&cause.message!=='ORGANIZER_WRITE_UNCONFIRMED';
   if(started&&!refused)checkpoint.attempt={...pending,status:'unknown'};
   else{checkpoint.attempt=undefined;if(alive.current)setError(started?'Calendar did not accept this appointment. Review its details and confirm again.':'Calendar is unavailable for this account. Reopen it and review again.');}
   changed(checkpoint);
  }
  if(saved&&alive.current)callback.current?.(saved);
 };
 if(event){
  const zone=validCalendarTimezone(event.metadata.inviteTimezone)?event.metadata.inviteTimezone:timezone;
  return <div className="bank-message-appointment bank-message-appointment-recorded" role="status"><span className="bank-message-appointment-status"><Check size={14} aria-hidden="true"/>Saved to Calendar</span><strong>{event.title}</strong><time dateTime={event.startAt}>{new Intl.DateTimeFormat(undefined,{timeZone:zone,weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}).format(new Date(event.startAt))} · {Math.round((Date.parse(event.endAt)-Date.parse(event.startAt))/60000)} min</time><small>{zone}</small></div>;
 }
 if(attempt)return <div className="bank-message-appointment bank-message-appointment-pending" role="status"><span className="bank-message-appointment-status"><CalendarPlus size={14} aria-hidden="true"/>{attempt.status==='saving'?'Saving appointment…':'Appointment not confirmed'}</span><strong>{attempt.input.title}</strong><time dateTime={attempt.input.startAt}>{new Intl.DateTimeFormat(undefined,{timeZone:attempt.timezone,weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}).format(new Date(attempt.input.startAt))} · {Math.round((Date.parse(attempt.input.endAt)-Date.parse(attempt.input.startAt))/60000)} min</time><small>{attempt.timezone}</small>{attempt.status==='unknown'&&<p>Calendar may have saved this appointment. Check Calendar before creating another. This request will not be sent again.</p>}</div>;
 if(!identity.organizer||!available.length)return null;
 if(!open||!draft)return <button type="button" className="bank-message-appointment-action" aria-label="Review appointment from message" onClick={review}><CalendarPlus size={14} aria-hidden="true"/>{available.length>1?'Review dates':'Add to Calendar'}</button>;
 return <div className="bank-message-appointment" onClick={click=>click.stopPropagation()}><div className="bank-message-appointment-heading"><span><CalendarPlus size={15} aria-hidden="true"/>Confirm appointment</span><button type="button" aria-label="Close appointment review" onClick={()=>setOpen(false)}><X size={15}/></button></div>
  {available.length>1&&<div className="bank-message-appointment-options" aria-label="Proposed times">{available.map(candidate=><button key={candidate.startAt} type="button" onClick={()=>{setDraft({...draft,...draftFor(candidate,draft.title,draft.attendees.split(/[,;]/))});setError('');}}>{candidate.label}</button>)}</div>}
  <form onSubmit={submit=>void confirm(submit)} className="bank-message-appointment-form" aria-label="Confirm appointment from message">
   <label>Title<input name="title" value={draft.title} onChange={change=>update('title',change.target.value)} maxLength={160} required/></label>
   <div className="bank-message-appointment-pair"><label>Date<input type="date" name="date" value={draft.date} onChange={change=>update('date',change.target.value)} required/></label><label>Time<input type="time" name="time" value={draft.time} onChange={change=>update('time',change.target.value)} required/></label></div>
   <div className="bank-message-appointment-pair"><label>Duration<select name="duration" value={draft.duration} onChange={change=>update('duration',change.target.value)}>{[...new Set([15,30,45,60,90,120,Number(draft.duration)])].sort((a,b)=>a-b).map(minutes=><option key={minutes} value={minutes}>{minutes} minutes</option>)}</select></label><label>Timezone<input name="timezone" list={id+'-zones'} value={draft.timezone} onChange={change=>update('timezone',change.target.value)} maxLength={80} required/><datalist id={id+'-zones'}>{calendarTimezoneOptions(timezone).map(zone=><option key={zone} value={zone}/>)}</datalist></label></div>
   <label>Attendees<input name="attendees" value={draft.attendees} onChange={change=>update('attendees',change.target.value)} placeholder="Email addresses, separated by commas" maxLength={5000} autoCapitalize="none" inputMode="email"/></label>
   <p>Saves to your Calendar. Attendees are invited when you confirm.</p>{error&&<p className="bank-message-appointment-error" role="alert">{error}</p>}
   <button type="submit" className="bank-message-appointment-confirm">Confirm appointment<Check size={15} aria-hidden="true"/></button>
  </form>
 </div>;
}
