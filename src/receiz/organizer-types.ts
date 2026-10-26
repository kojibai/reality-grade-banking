export interface OrganizerContact {
 id:string;linkedUserId:string;fullName:string;email:string;phone:string;
 company?:string;role?:string;location?:string;notes?:string;tags?:string[];
 emails?:string[];phones?:string[];createdAt:string;updatedAt:string;
 interactions:Array<{id:string;kind:string;summary:string;detail:string;occurredAt:string}>;
 [key:string]:unknown;
}
export interface OrganizerEvent {
 id:string;ownerUserId:string;createdByUserId?:string|null;title:string;kind:string;source:string;
 startAt:string;endAt:string;location:string;note:string;attendees:string[];metadata:Record<string,unknown>;
 createdAt:string;updatedAt:string;
}
export interface CalendarRange {start:string;end:string}
export interface BookingSchedule {slotMinutes:number;hourStarts:number[];weekdayIndexes:number[];daysForward:number}
export interface BookingQuestion {id:string;label:string;required:boolean}
export interface BookingSlot {id:string;startAt:string;endAt:string}
export interface BookingAvailability {
 owner:{username:string;displayName:string;avatarUrl:string|null};scheduleConfig:BookingSchedule;savedScheduleConfig:BookingSchedule;
 customQuestions:BookingQuestion[];savedCustomQuestions:BookingQuestion[];slots:BookingSlot[];
}
export interface OrganizerDisplay {
 schema:'bankeiz.organizer-display.v1';accountUid:string;contacts:OrganizerContact[]|null;contactsComplete?:boolean;
 events:OrganizerEvent[]|null;
 ranges:Array<CalendarRange&{complete:boolean}>;
 username:string|null;
}
export interface AppointmentInput {
 title:string;startAt:string;endAt:string;location?:string;note?:string;attendees?:string[];
 metadata?:Record<string,unknown>;kind?:'appointment';source?:'manual'|'message';
}
export const organizerRecord=(v:unknown):Record<string,unknown>=>v!==null&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:{};
const text=(v:unknown)=>typeof v==='string';
const date=(v:unknown):v is string=>text(v)&&v.length<=40&&Number.isFinite(Date.parse(v));
export function organizerContact(value:unknown):OrganizerContact {
 const v=organizerRecord(value);
 if(!text(v.id)||!v.id||v.id.length>200||!text(v.fullName)||v.fullName.length>300||!text(v.email)||!text(v.phone)||!text(v.linkedUserId)||!date(v.createdAt)||!date(v.updatedAt)||!Array.isArray(v.interactions)||v.interactions.length>20000)throw Error('ORGANIZER_CONTACT_INVALID');
 const fields=['id','linkedUserId','identityKind','identitySource','visitorKey','threadKey','entityType','fullName','company','role','email','phone','emails','phones','interestTags','profileSummary','location','tags','notes','nextStep','stage','source','inviteStatus','lastMeetingOn','lastInteractionAt','ownerMessages','twinMessages','createdAt','updatedAt','interactions'];
 return Object.fromEntries(fields.filter(key=>key in v).map(key=>[key,v[key]])) as unknown as OrganizerContact;
}
export function organizerEvent(value:unknown,owner?:string):OrganizerEvent {
 const v=organizerRecord(value);
 if(!text(v.id)||!v.id||!text(v.ownerUserId)||owner&&v.ownerUserId!==owner||!text(v.title)||v.title.length>2000||!date(v.startAt)||!date(v.endAt)||Date.parse(v.endAt)<=Date.parse(v.startAt)||!text(v.location)||!text(v.note)||!Array.isArray(v.attendees)||!v.attendees.every(text)||!text(v.kind)||!text(v.source)||!date(v.createdAt)||!date(v.updatedAt))throw Error('ORGANIZER_EVENT_INVALID');
 return {...v,metadata:organizerRecord(v.metadata)} as unknown as OrganizerEvent;
}
export function calendarRange(value:CalendarRange):CalendarRange {
 if(!date(value.start)||!date(value.end)||Date.parse(value.end)<=Date.parse(value.start)||Date.parse(value.end)-Date.parse(value.start)>366*86400000)throw Error('ORGANIZER_RANGE_INVALID');
 return {start:new Date(value.start).toISOString(),end:new Date(value.end).toISOString()};
}
export function readOrganizerDisplay(value:unknown,owner:string):OrganizerDisplay|null {
 try{const v=organizerRecord(value);if(v.schema!=='bankeiz.organizer-display.v1'||v.accountUid!==owner||!Array.isArray(v.ranges)||v.ranges.length>12||v.contacts!==null&&!Array.isArray(v.contacts))return null;
  const events=v.events===null||v.events===undefined?null:Array.isArray(v.events)&&v.events.length<=20000?v.events.map(value=>organizerEvent(value,owner)):null;
  return{schema:'bankeiz.organizer-display.v1',accountUid:owner,contactsComplete:v.contactsComplete!==false&&v.contacts!==null,contacts:v.contacts===null?null:(v.contacts as unknown[]).map(organizerContact),events,ranges:v.ranges.map(value=>{const row=organizerRecord(value),range=calendarRange(row as unknown as CalendarRange);return{...range,complete:row.complete===true};}),username:typeof v.username==='string'&&/^[a-z0-9_]{3,24}$/.test(v.username)?v.username:null};
 }catch{return null;}
}
