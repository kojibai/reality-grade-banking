import {readBookingOffers,selectBookingOffer} from './booking-offers';
import {readBookingPrice,readBookingSettings} from './booking-settings';
import {validCalendarTimezone} from './calendar-timezone';
import {bookingOverrides} from './booking-link';
import {organizerEvent,organizerRecord,type BookingAvailability,type PublicBookingConversation,type BookingQuestion,type BookingSchedule,type OrganizerEvent} from './organizer-types';
import type {OrganizerRequest} from './native-organizer';
const stamp=(v:unknown)=>typeof v==='string'&&v.length<=40&&Number.isFinite(Date.parse(v));
export function readBookingSchedule(raw:unknown):BookingSchedule{const v=organizerRecord(raw);if(v.timezone!==undefined&&!validCalendarTimezone(v.timezone)||v.timezoneMode!==undefined&&v.timezoneMode!=='auto'&&v.timezoneMode!=='manual')throw Error('BOOKING_SOURCE_INVALID');if(!Number.isInteger(v.slotMinutes)||Number(v.slotMinutes)<15||Number(v.slotMinutes)>180||!Number.isInteger(v.daysForward)||Number(v.daysForward)<1||Number(v.daysForward)>45||!Array.isArray(v.hourStarts)||!v.hourStarts.length||v.hourStarts.length>24||!v.hourStarts.every(n=>Number.isInteger(n)&&n>=0&&n<=23)||!Array.isArray(v.weekdayIndexes)||!v.weekdayIndexes.length||v.weekdayIndexes.length>7||!v.weekdayIndexes.every(n=>Number.isInteger(n)&&n>=0&&n<=6))throw Error('BOOKING_SOURCE_INVALID');return v as unknown as BookingSchedule;}
function questions(raw:unknown):BookingQuestion[]{if(!Array.isArray(raw)||raw.length>12||!raw.every(row=>{const q=organizerRecord(row);return typeof q.id==='string'&&q.id.length<=200&&typeof q.label==='string'&&q.label.length<=1000&&typeof q.required==='boolean';}))throw Error('BOOKING_SOURCE_INVALID');return raw;}
function bookingConversation(raw:unknown,owner:Record<string,unknown>,username:string):PublicBookingConversation|undefined{
 if(raw===undefined)return undefined;const value=organizerRecord(raw);
 if(typeof value.state!=='string'||!['ready','unavailable','unknown'].includes(value.state)||value.username!==username||typeof value.ownerUserId!=='string'||!value.ownerUserId||value.ownerUserId.length>256||/[\u0000-\u001f\u007f]/.test(value.ownerUserId)||owner.userId!==value.ownerUserId)throw Error('BOOKING_SOURCE_INVALID');
 return{state:value.state as PublicBookingConversation['state'],ownerUserId:value.ownerUserId,username};
}
export function readBookingAvailability(raw:unknown,username:string):BookingAvailability{
 const data=organizerRecord(raw),owner=organizerRecord(data.owner);
 if(data.ok!==true||owner.username!==username||typeof owner.displayName!=='string'||owner.avatarUrl!==null&&typeof owner.avatarUrl!=='string'||!Array.isArray(data.slots)||data.slots.length>10000)throw Error('BOOKING_SOURCE_INVALID');
 const conversation=bookingConversation(data.conversation,owner,username),bookingPrice=readBookingPrice(data.bookingPrice),bookingSettings=readBookingSettings(data.bookingSettings);
 const offers=data.bookingOffers===undefined?undefined:readBookingOffers(data.bookingOffers),selectedOffer=data.selectedBookingOffer===undefined?null:readBookingOffers([data.selectedBookingOffer])[0]!;
 if(offers?.length&&(!selectedOffer||JSON.stringify(selectedOffer)!==JSON.stringify(selectBookingOffer(offers,selectedOffer.id))||selectedOffer.priceUsdCents!==bookingPrice?.priceUsdCents||selectedOffer.slotMinutes!==organizerRecord(data.scheduleConfig).slotMinutes)||!offers?.length&&data.selectedBookingOffer!==undefined)throw Error('BOOKING_SOURCE_INVALID');
 const slots=data.slots.map(row=>{const value=organizerRecord(row);if(typeof value.id!=='string'||!stamp(value.startAt)||!stamp(value.endAt)||Date.parse(String(value.endAt))<=Date.parse(String(value.startAt)))throw Error('BOOKING_SOURCE_INVALID');return{id:value.id,startAt:value.startAt as string,endAt:value.endAt as string};});
 return{...(offers===undefined?{}:{bookingOffers:offers}),...(selectedOffer?{selectedBookingOffer:selectedOffer}:{}),owner:owner as unknown as BookingAvailability['owner'],scheduleConfig:readBookingSchedule(data.scheduleConfig),savedScheduleConfig:readBookingSchedule(data.savedScheduleConfig),customQuestions:questions(data.customQuestions),savedCustomQuestions:questions(data.savedCustomQuestions),...(conversation?{conversation}:{}),...(bookingPrice?{bookingPrice}:{}),...(bookingSettings?{bookingSettings}:{}),slots};
}
export interface GuestBookingInput {slotStartAt:string;name:string;email:string;timezone:string;notes:string;questions:Array<BookingQuestion&{answer:string}>}
export interface BookingConfirmation {event:OrganizerEvent;icsHref?:string;confirmationHref?:string;invitationStatus?:'delivered'|'pending'|'unknown';timezone?:string;inviteSummary?:{delivered:number}|null}
function confirmationHref(raw:unknown){if(typeof raw!=='string'||raw.length>2048)throw Error('BOOKING_OUTCOME_UNCONFIRMED');const url=new URL(raw,'https://receiz.com');if(url.origin!=='https://receiz.com'||!/^\/(?:api\/)?calendar\/confirmation\/[a-f\d-]{36}(?:\/bundle)?\/?$/.test(url.pathname))throw Error('BOOKING_OUTCOME_UNCONFIRMED');return url.href;}
export interface PublicBookingService {
 readonly username:string;linkOptions():URLSearchParams;known():BookingAvailability|null;availability(refresh?:boolean):Promise<BookingAvailability>;forOffer(id?:string):PublicBookingService;confirm(input:GuestBookingInput):Promise<BookingConfirmation>;
}
export function createPublicBooking({username,query=new URLSearchParams(),request}:{username:string;query?:URLSearchParams;request:OrganizerRequest}):PublicBookingService{
 if(!/^[a-z0-9_]{3,24}$/.test(username))throw Error('BOOKING_USERNAME_REQUIRED');
 const params=bookingOverrides(query),alternatives=new Map<string,ReturnType<typeof createPublicBooking>>(),path='/api/calendar/embed/'+username;let held:BookingAvailability|null=null,pending:Promise<BookingAvailability>|null=null,attempted=false;
 const service:PublicBookingService={get username(){return username;},linkOptions:()=>new URLSearchParams(params),known:()=>held,
  forOffer(id?:string){if((params.get('offer')??undefined)===id)return service;if(id!==undefined)selectBookingOffer(held?.bookingOffers??[],id);const key=id??'';let alternative=alternatives.get(key);if(!alternative){const next=new URLSearchParams(params);if(id===undefined)next.delete('offer');else next.set('offer',id);alternative=createPublicBooking({username,query:next,request});alternatives.set(key,alternative);}return alternative;},
  availability(refresh=false):Promise<BookingAvailability>{if(held&&!refresh)return Promise.resolve(held);if(pending)return pending;const attempt=(async()=>{const response=await request(path+(params.size?'?'+params:''));const data=await response.json();if(!response.ok)throw Error('BOOKING_UNAVAILABLE');held=readBookingAvailability(data,username);return held;})();pending=attempt;void attempt.finally(()=>{if(pending===attempt)pending=null;}).catch(()=>{});return attempt;},
  async confirm(input:GuestBookingInput):Promise<BookingConfirmation>{if(held?.bookingPrice&&held.bookingPrice.priceUsdCents!=='0')throw Error('BOOKING_PAYMENT_REQUIRED');if(attempted)throw Error('BOOKING_ALREADY_ATTEMPTED');if(!held?.slots.some(slot=>slot.startAt===input.slotStartAt))throw Error('BOOKING_SLOT_NOT_OFFERED');attempted=true;let response:Response;
   try{response=await request(path+(params.size?'?'+params:''),{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({...input,meeting:true,scheduleConfig:held.scheduleConfig})});}catch(cause){throw Error('BOOKING_OUTCOME_UNCONFIRMED',{cause});}
   let data:Record<string,unknown>;try{data=organizerRecord(await response.json());}catch(cause){throw Error('BOOKING_OUTCOME_UNCONFIRMED',{cause});}
   if(!response.ok){if(response.status<500&&response.status!==408)attempted=false;throw Error(response.status>=500||response.status===408?'BOOKING_OUTCOME_UNCONFIRMED':typeof data.error==='string'?data.error:'BOOKING_UNAVAILABLE');}
   if(data.ok!==true||data.booked!==true)throw Error('BOOKING_OUTCOME_UNCONFIRMED');const pack=organizerRecord(data.pack);let event:OrganizerEvent;try{event=organizerEvent(data.event);}catch(cause){throw Error('BOOKING_OUTCOME_UNCONFIRMED',{cause});}return{event,icsHref:confirmationHref(pack.icsPath),confirmationHref:confirmationHref(pack.confirmationPath),inviteSummary:typeof organizerRecord(data.inviteSummary).delivered==='number'?{delivered:Number(organizerRecord(data.inviteSummary).delivered)}:null};
  },
 };return service;
}
