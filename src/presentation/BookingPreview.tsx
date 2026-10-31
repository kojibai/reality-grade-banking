/** Build-only source-rendered examples. No Identity, appointment, payment or
 * message is created. The local walkthrough only selects these static views. */
import {BankMark} from '../components/BankMark';
import {Sheet} from '../components/Sheet';
import {ProfileAvatar} from '../components/ProfileAvatar';
import {MessageNavigation} from '../features/messages/MessageNavigation';
import {CalendarView,AppointmentForm} from '../features/messages/organizer/CalendarViews';
import {OrganizerShortcuts} from '../features/messages/organizer/OrganizerShortcuts';
import {AvailabilityForm,BookingLinks} from '../features/messages/organizer/BookingSettings';
import {PublicBookingPage} from '../features/booking/PublicBookingPage';
import {BookingIntro} from '../features/booking/BookingIntro';
import {CalendarDays,Check,Video} from 'lucide-react';
import type {PublicBookingService} from '../receiz/public-booking';
import type {BookingAvailability,OrganizerEvent} from '../receiz/organizer-types';
const noop=()=>{};
const forbidden=async():Promise<never>=>{throw Error('BOOKING_EXAMPLE_HAS_NO_TRANSPORT');};
const uid='11111111-1111-4111-8111-111111111111';
const schedule={slotMinutes:30,hourStarts:[9,10,11,14,15],weekdayIndexes:[1,2,3,4,5],daysForward:14,timezone:'UTC',timezoneMode:'auto' as const};
const offers=[{id:'introduction',name:'A first conversation',slotMinutes:15,priceUsdCents:'0'},{id:'project-review',name:'Project review',slotMinutes:30,priceUsdCents:'7500'}];
const source:BookingAvailability={owner:{userId:uid,username:'mayaexample',displayName:'Maya Chen',avatarUrl:'/art/meeting-maya.webp'},scheduleConfig:schedule,savedScheduleConfig:schedule,customQuestions:[{id:'project',label:'What would you like to work on?',required:false}],savedCustomQuestions:[],bookingPrice:{currency:'usd',priceUsdCents:'0',feeUsdCents:'0',policyRevision:'illustrative-policy'},bookingSettings:{conversationEnabled:false,conversationAvailable:true},slots:[5,6,9].flatMap((date,index)=>[9,11,14].map(hour=>({id:`example-${date}-${hour}`,startAt:`2026-11-${String(date).padStart(2,'0')}T${String(hour).padStart(2,'0')}:00:00.000Z`,endAt:`2026-11-${String(date).padStart(2,'0')}T${String(hour).padStart(2,'0')}:30:00.000Z`,index})))};
const event:OrganizerEvent={id:'55555555-5555-4555-8555-555555555555',ownerUserId:uid,title:'Project review',kind:'appointment',source:'manual',startAt:'2026-11-05T14:00:00.000Z',endAt:'2026-11-05T14:30:00.000Z',location:'https://bankeiz.com/meet/55555555-5555-4555-8555-555555555555/illustrative_meeting_key/',note:'Review the new website and agree the next step.',attendees:['alex@example.invalid'],metadata:{bankMeeting:{schema:'bankeiz.meeting.v1'},bankMeetingPayment:{priceUsdCents:'7500'}},createdAt:'2026-11-02T12:00:00.000Z',updatedAt:'2026-11-02T12:00:00.000Z'};
const service=(value:BookingAvailability):PublicBookingService=>({username:'mayaexample',known:()=>value,linkOptions:()=>new URLSearchParams(),availability:forbidden,confirm:forbidden,forOffer:()=>service(value)});
export const bookingPreviewNames=['guest-calendar','guest-offers','guest-twin','guest-confirmed','host-calendar','host-appointment','host-link','host-settings'] as const;
export function BookingPreview({screen}:{screen:typeof bookingPreviewNames[number]}){
 let view;
 if(screen.startsWith('guest-')){
  const value=screen==='guest-offers'?{...source,bookingOffers:offers,selectedBookingOffer:offers[0],scheduleConfig:{...schedule,slotMinutes:15},bookingPrice:{...source.bookingPrice!,priceUsdCents:'0'}}:screen==='guest-twin'?{...source,conversation:{state:'ready' as const,ownerUserId:uid,username:'mayaexample'},bookingSettings:{conversationEnabled:true,conversationAvailable:true}}:source;
  view=screen==='guest-confirmed'?<section className="booking-panel"><section className="booking-card bank-organizer"><div className="organizer-scroll"><BookingIntro owner={source.owner} showLead={false}/><div className="booking-confirmed"><span><Check size={28}/></span><h1>You’re booked.</h1><p>A little time, set aside.</p></div><div className="organizer-card"><h4>Project review</h4><p>Thursday, November 5</p><p>2:00 PM – 2:30 PM · UTC</p></div><a className="organizer-primary" href={event.location}><Video size={17}/>Join meeting</a><button type="button" className="organizer-primary"><CalendarDays size={17}/>Add to calendar</button><p className="organizer-bottom-note">Your invitation and meeting link are on their way to your email.</p></div></section></section>:<PublicBookingPage service={service(value)} embedded/>;
 }else{
  const content=screen==='host-calendar'?<><div className="organizer-topline"><span className="organizer-return">Your calendar</span><OrganizerShortcuts ready busy={false} onMeet={noop} onBooking={noop}/></div><CalendarView layout="agenda" onLayout={noop} events={[event,{...event,id:'66666666-6666-4666-8666-666666666666',title:'A first conversation',startAt:'2026-11-05T11:00:00Z',endAt:'2026-11-05T11:15:00Z',metadata:{}}]} day="2026-11-05" onDay={noop} onOpen={noop} onAdd={noop} onLinks={noop}/></>:screen==='host-appointment'?<AppointmentForm day="2026-11-05" initial={{title:event.title,startAt:event.startAt,endAt:event.endAt,attendees:event.attendees,meeting:true,meetingPriceUsdCents:'7500'}} busy={false} onBack={noop} onSave={noop}/>:screen==='host-link'?<BookingLinks username="mayaexample" availability={source} onBack={noop} onSettings={noop} onCustom={noop} onError={noop}/>:<AvailabilityForm initial={{...source,bookingOffers:offers,selectedBookingOffer:offers[0]}} custom={false} busy={false} username="mayaexample" onBack={noop} onSave={noop} onError={noop}/>;
  view=<div className="booking-example-app"><header className="booking-example-brand"><BankMark/><span>Your account</span><ProfileAvatar src="/art/meeting-maya.webp" name="Maya Chen"/></header><Sheet active={false} title="Calendar" onClose={noop}><section className="bank-messaging"><MessageNavigation twinFirst={false} mode="inbox" organizing organizerView="calendar" hasOrganizer onWarmOrganizer={noop} onOrganizer={noop} onView={noop} onNew={noop}/><div className="bank-organizer"><div className="organizer-scroll">{content}</div></div></section></Sheet></div>;
 }
 return <div className="booking-guide-preview" data-booking-example={screen}>{view}</div>;
}
