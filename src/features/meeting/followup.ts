import type{JoinedMeeting}from'../../receiz/meeting-session';
import type{AppointmentInput}from'../../receiz/organizer-types';
import{deviceCalendarTimezone}from'../../receiz/calendar-timezone';
/** Draft only. The existing calendar operation admits the actual appointment. */
export function prepareMeetingFollowup(room:JoinedMeeting,now=Date.now()):AppointmentInput{
 const contacts=room.identity.knownOrganizer?.()?.knownContacts()??room.identity.knownOrganizerDisplay?.()?.contacts??[],messages=room.messaging.knownMessages(room.conversationId),peers=new Set((messages?.conversation.members??[]).filter(person=>person.userId!==room.viewerId).map(person=>person.userId));
 const attendees=[...new Set([...room.attendees,...contacts.filter(person=>peers.has(person.linkedUserId)).map(person=>person.email)].filter(email=>typeof email==='string'&&email.includes('@')).map(email=>email.trim()))];
 const end=Date.parse(room.meeting.endAt),start=Math.ceil((Math.max(now,Number.isFinite(end)?end:now)+30*60000)/(30*60000))*30*60000,duration=[15,20,30,45,60,90,120].find(minutes=>minutes>=Math.max(15,(end-Date.parse(room.meeting.startAt))/60000||30))??120;
 return{title:('Follow-up · '+room.meeting.title).slice(0,160),startAt:new Date(start).toISOString(),endAt:new Date(start+duration*60000).toISOString(),meeting:true,meetingRequestId:crypto.randomUUID(),attendees,note:[`Follow-up to ${room.meeting.title}.`,room.meeting.url,room.sharedContext,...(messages?.messages??[]).slice(-4).map(message=>message.body)].filter(Boolean).join('\n').slice(0,2000),metadata:{followUpOf:room.conversationId,conversationId:room.conversationId,inviteTimezone:deviceCalendarTimezone()},source:'message'};
}
