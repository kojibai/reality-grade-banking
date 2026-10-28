import {ArrowUp,CalendarDays,ChevronLeft,Clock,Sparkles} from 'lucide-react';
import {useEffect,useLayoutEffect,useRef,useState,useSyncExternalStore,type FormEvent,type KeyboardEvent,type ReactNode} from 'react';
import {InlineOpening} from '../../components/InlineOpening';
import {ProfileAvatar} from '../../components/ProfileAvatar';
import {bankMeetingPath} from '../../receiz/meeting-links';
import {createPublicBookingConversation} from '../../receiz/public-booking-conversation';
import type {BookingAvailability} from '../../receiz/organizer-types';
import type {createPublicBooking} from '../../receiz/public-booking';
type Service=ReturnType<typeof createPublicBooking>;
export default function BookingConversation({service,source,children}:{service:Service;source:BookingAvailability;children:ReactNode}){
 const [controller]=useState(()=>createPublicBookingConversation({username:service.username,options:service.linkOptions()}));
 const state=useSyncExternalStore(controller.subscribe,controller.known,controller.known);
 const [manual,setManual]=useState(false),transcript=useRef<HTMLDivElement>(null),composer=useRef<HTMLTextAreaElement>(null),manualPanel=useRef<HTMLElement>(null),back=useRef<HTMLButtonElement>(null),choose=useRef<HTMLButtonElement>(null),following=useRef(true),mounted=useRef(false),wasManual=useRef(false);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;queueMicrotask(()=>{if(!mounted.current)controller.dispose();});};},[controller]);
 useLayoutEffect(()=>{if(following.current&&transcript.current)transcript.current.scrollTop=transcript.current.scrollHeight;},[state.messages]);
 useLayoutEffect(()=>{if(manual)back.current?.focus();else if(wasManual.current)choose.current?.focus();wasManual.current=manual;},[manual]);
 useLayoutEffect(()=>{const field=composer.current;if(field){field.style.height='auto';field.style.height=Math.min(110,Math.max(44,field.scrollHeight))+'px';}},[state.draft]);
 const send=(event:FormEvent)=>{event.preventDefault();following.current=true;void controller.send();};
 const key=(event:KeyboardEvent<HTMLTextAreaElement>)=>{if(event.key==='Enter'&&!event.shiftKey&&!event.nativeEvent.isComposing&&event.nativeEvent.keyCode!==229)send(event);};
 const overlayKey=(event:KeyboardEvent<HTMLElement>)=>{
  if(!manual)return;
  if(event.key==='Escape'){event.preventDefault();event.stopPropagation();setManual(false);return;}
  if(event.key!=='Tab')return;
  const fields=[...manualPanel.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),textarea:not(:disabled),select:not(:disabled),a[href]')??[]].filter(field=>!field.closest('[hidden]'));
  const first=fields[0],last=fields[fields.length-1];if(!first)return;
  if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
 };
 const booking=state.bookingConfirmation,meeting=bankMeetingPath(booking?.location??'');
 const error=state.error?(state.pending?'Your reply has not been confirmed yet. Retry the same message to continue.':'That reply could not be completed. Your message is kept here.'):'';
 return <section className="booking-card bank-organizer booking-conversation-card" aria-label="Book an appointment">
  <header className="booking-conversation-owner"><ProfileAvatar src={source.owner.avatarUrl} name={source.owner.displayName}/><div><h1>{source.owner.displayName}</h1><p><Clock size={14}/>{source.scheduleConfig.slotMinutes} minutes<span>·</span>Meeting link included</p></div></header>
  <div className="booking-conversation-frame" onKeyDownCapture={overlayKey}>
   <div className="booking-chat" inert={manual} aria-hidden={manual||undefined}>
    <div className="booking-chat-heading"><span><Sparkles size={17}/>{source.owner.displayName}’s Twin</span><small>Booking</small></div>
    <div className="booking-transcript" data-booking-transcript ref={transcript} role="log" aria-label="Booking conversation" onScroll={()=>{const node=transcript.current;if(node)following.current=node.scrollHeight-node.scrollTop-node.clientHeight<36;}}>
     <p className="booking-chat-intro">When’s a good time for you and {source.owner.displayName} to speak? I’ll check the calendar.</p>
     {state.messages.map(message=><div key={message.id} className={'booking-chat-message booking-chat-message-'+message.role} data-message-status={message.status}>{message.body?<p>{message.body}</p>:message.status==='pending'&&state.busy?<InlineOpening label="Checking your request"/>:null}</div>)}
     {booking&&<div className="booking-chat-confirmation"><strong>You’re booked.</strong><p>{booking.title}</p><p>{new Intl.DateTimeFormat(undefined,{dateStyle:'medium',timeStyle:'short',...(booking.timezone?{timeZone:booking.timezone}:{})}).format(new Date(booking.startAt))}</p>{meeting&&<a href={meeting}>Join meeting ↗</a>}</div>}
     {error&&<div className="booking-chat-error" role="alert"><p>{error}</p>{state.pending&&!state.busy&&<button type="button" onClick={()=>void controller.retry()}>Retry message</button>}</div>}
    </div>
    <form className="booking-composer" onSubmit={send}><textarea ref={composer} aria-label="Your reply" placeholder="I’m free tomorrow afternoon…" rows={1} maxLength={6500} value={state.draft} onChange={event=>controller.setDraft(event.target.value)} onKeyDown={key}/><button type="submit" aria-label="Send reply" disabled={state.busy||!!state.pending||!state.draft.trim()}><ArrowUp size={20}/></button></form>
    <button ref={choose} type="button" className="booking-choose-time" onClick={()=>setManual(true)}><CalendarDays size={16}/>Choose a time</button>
   </div>
   <section ref={manualPanel} data-booking-manual hidden={!manual} className="booking-manual-layer" aria-label="Choose a time">
    <header><button ref={back} type="button" onClick={()=>setManual(false)}><ChevronLeft size={17}/>Conversation</button><span>Choose a time</span></header>
    <div className="organizer-scroll">{children}</div>
   </section>
  </div>
 </section>;
}
