import type{NativeMessaging,ChatPage}from'./native-messaging';
export interface MeetingEntry {eventId:string;key:string}
const uuid=(v:unknown):v is string=>typeof v==='string'&&/^[a-f\d]{8}-[a-f\d]{4}-[1-5][a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i.test(v);
export function readMeetingEntry(search:string):MeetingEntry|null{const p=new URLSearchParams(search),eventId=p.get('meeting'),key=p.get('meetingKey');return p.getAll('meeting').length===1&&p.getAll('meetingKey').length===1&&uuid(eventId)&&key&&/^[A-Za-z0-9_-]{16,160}$/.test(key)?{eventId,key}:null;}
/** The URL is an invitation intent. Actual held Identity admits the existing
 * conversation; this path never asks for media or creates a call. */
export async function openMeetingInvitation(api:NativeMessaging,coordinate:MeetingEntry,signal:AbortSignal){
 const response=await api.callTransport.heldFetch(`/api/calendar/meetings/${coordinate.eventId}/${coordinate.key}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'conversation'}),signal});const data=await response.json();signal.throwIfAborted();
 if(!response.ok||data.ok!==true||data.viewerId!==api.accountUid||data.conversationId!==coordinate.eventId||!uuid(data.messageId))throw Error('MEETING_INVITATION_UNCONFIRMED');
 let page:ChatPage|null=api.knownMessages(coordinate.eventId);if(!page?.messages.some(v=>v.id===data.messageId))page=await api.messages(coordinate.eventId,undefined,signal);
 const seen=new Set<string>();while(!page.messages.some(v=>v.id===data.messageId)&&page.hasMore&&page.nextCursor){if(seen.has(page.nextCursor))throw Error('MEETING_INVITATION_UNCONFIRMED');seen.add(page.nextCursor);page=await api.messages(coordinate.eventId,page.nextCursor,signal);signal.throwIfAborted();}
 if(!page.messages.some(v=>v.id===data.messageId))throw Error('MEETING_INVITATION_UNCONFIRMED');return{page,messageId:data.messageId as string};
}
