import type {OpenIdentity} from './native-identity';
import {bankMeetingPath,meetingCoordinate} from './meeting-links';
import {organizerRecord} from './organizer-types';
import {OrganizerRequestError} from './native-organizer';
import type {AppointmentInput} from './organizer-types';
import {deviceCalendarTimezone} from './calendar-timezone';
interface Intent {requestId:string;startAt:string;endAt:string;timezone:string}
export const isMeetingCalendarFailure=(cause:unknown)=>cause instanceof OrganizerRequestError&&cause.status===500&&cause.responseCode==='calendar_create_failed';
const uuid=/^[a-f\d]{8}-[a-f\d]{4}-[1-5][a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i;
function readIntent(raw:string):Intent{
 const value=JSON.parse(raw) as Intent;
 if(!value||!uuid.test(value.requestId)||!Number.isFinite(Date.parse(value.startAt))||Date.parse(value.endAt)-Date.parse(value.startAt)!==3600000||typeof value.timezone!=='string')throw Error('MEETING_START_INTENT_UNREADABLE');
 return value;
}
/** Creates through the existing organizer command. Storage holds retry intent,
 * never meeting/identity authority; only the accepted event selects the lobby. */
export function createInstantMeeting(input:{identity():Promise<OpenIdentity>;storage:Pick<Storage,'getItem'|'setItem'|'removeItem'>;now?:()=>number;newId?:()=>string;timezone?:()=>string}){
 let pending:Promise<string>|null=null;
 const open=():Promise<string>=>{
  if(pending)return pending;
  const task=(async()=>{
   const identity=await input.identity(),api=identity.knownOrganizer?.()??await identity.organizer!();
   if(!uuid.test(api.accountUid))throw Error('MEETING_IDENTITY_REQUIRED');
   const storageKey='bankeiz.meeting.start.v1:'+api.accountUid,raw=input.storage.getItem(storageKey),now=(input.now??Date.now)();
   const intent=raw?readIntent(raw):{requestId:(input.newId??(()=>crypto.randomUUID()))(),startAt:new Date(now).toISOString(),endAt:new Date(now+3600000).toISOString(),timezone:(input.timezone??deviceCalendarTimezone)()};
   input.storage.setItem(storageKey,JSON.stringify(intent));
   const command:AppointmentInput={title:'Live meeting',startAt:intent.startAt,endAt:intent.endAt,meeting:true,meetingRequestId:intent.requestId,attendees:[],metadata:{inviteTimezone:intent.timezone}};
   // Replay only the existing idempotent creation command after this transient
   // calendar failure. Accepted identity and meeting authority stay unchanged.
   const event=await api.saveEvent(command).catch(cause=>{
    if(!isMeetingCalendarFailure(cause))throw cause;
    return api.saveEvent(command);
   });
   const path=bankMeetingPath(event.location),coordinate=path?meetingCoordinate(path):null,metadata=organizerRecord(event.metadata),settings=organizerRecord(metadata.bankMeeting);
   if(!path||!coordinate||coordinate.eventId!==event.id||event.ownerUserId!==api.accountUid||metadata.bankMeetingRequestId!==intent.requestId||metadata.confirmationKey!==coordinate.key||metadata.cancelled===true||settings.schema!=='bankeiz.meeting.v1'||typeof settings.twin!=='boolean'||typeof settings.recording!=='boolean')throw Error('MEETING_CREATION_UNCONFIRMED');
   input.storage.removeItem(storageKey);return path;
  })();pending=task;void task.catch(()=>{if(pending===task)pending=null;});return task;
 };
 return{open};
}
