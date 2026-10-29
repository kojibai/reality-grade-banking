import type {PublicTwinBookingPaymentRequest} from '../../receiz/public-booking-conversation';
import {useLayoutEffect,useState,type ReactNode} from 'react';
import {BookingOpening} from './BookingOpening';
import Conversation from './BookingConversation';
import type {BookingAvailability} from '../../receiz/organizer-types';
import type {createPublicBooking} from '../../receiz/public-booking';
type Service=ReturnType<typeof createPublicBooking>;
type Owner={displayName:string;avatarUrl:string|null};
/** The first accepted availability chooses one presentation for this lifetime.
 * Later decoration cannot replace the visitor's settled calendar or chat. */
export function BookingLayout({service,source,owner,error,children,onPayment,paymentHandledId,onResume}:{service:Service;source:BookingAvailability|null;owner?:Owner;error?:string;children:ReactNode;onPayment?(request:PublicTwinBookingPaymentRequest):void;paymentHandledId?:string|null;onResume?():void}){
 const [mode,setMode]=useState<'calendar'|'conversation'|null>(()=>source?(source.conversation?.state==='ready'&&source.bookingSettings?.conversationEnabled!==false?'conversation':'calendar'):null);
 useLayoutEffect(()=>{if(source)setMode(current=>current??(source.conversation?.state==='ready'&&source.bookingSettings?.conversationEnabled!==false?'conversation':'calendar'));},[source]);
 if(mode===null)return <BookingOpening owner={source?.owner??owner} error={error}/>;
 if(mode==='calendar')return <section className="booking-card bank-organizer" aria-label="Book an appointment"><div className="organizer-scroll">{children}</div></section>;
 return <Conversation service={service} source={source!} onPayment={onPayment} paymentHandledId={paymentHandledId} onResume={onResume}>{children}</Conversation>;
}
