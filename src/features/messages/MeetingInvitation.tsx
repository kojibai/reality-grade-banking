import{CalendarDays,Video}from'lucide-react';import{bankMeetingPath}from'../../receiz/meeting-links';import type{ChatMessage}from'../../receiz/native-messaging';
/** Typed presentation beneath the existing enclosing chat receipt. */
export function MeetingInvitation({message}:{message:ChatMessage}){
 const v=message.walletTransfer!,url=typeof v.url==='string'?bankMeetingPath(v.url):null,start=typeof v.startAt==='string'?new Date(v.startAt):null,end=typeof v.endAt==='string'?new Date(v.endAt):null;
 if(!url||!start||!end||!Number.isFinite(start.getTime())||!Number.isFinite(end.getTime())||end<=start)return <p>{message.body}</p>;
 return <article className="bank-chat-meeting" aria-label="Meeting invitation"><span className="bank-chat-meeting-mark"><CalendarDays size={17}/><small>Appointment</small></span><strong>{typeof v.title==='string'?v.title:'Meeting'}</strong><time dateTime={start.toISOString()}>{new Intl.DateTimeFormat(undefined,{weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}).format(start)} – {new Intl.DateTimeFormat(undefined,{hour:'numeric',minute:'2-digit',timeZoneName:'short'}).format(end)}</time>{typeof v.note==='string'&&v.note&&<p>{v.note}</p>}<a href={url}><Video size={16}/>Join meeting</a></article>;
}
