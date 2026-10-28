import {lazy,Suspense,useLayoutEffect,useState,type ReactNode} from 'react';
import {InlineOpening} from '../../components/InlineOpening';
import {ProfileAvatar} from '../../components/ProfileAvatar';
import type {BookingAvailability} from '../../receiz/organizer-types';
import type {createPublicBooking} from '../../receiz/public-booking';
const Conversation=lazy(()=>import('./BookingConversation'));
type Service=ReturnType<typeof createPublicBooking>;
type Owner={displayName:string;avatarUrl:string|null};
export function BookingOpening({owner,error}:{owner?:Owner;error?:string}){
 return <section className="booking-card bank-organizer"><div className="organizer-scroll booking-opening">{owner&&<div className="booking-owner"><ProfileAvatar src={owner.avatarUrl} name={owner.displayName}/><span><small>Meet with</small><strong>{owner.displayName}</strong></span></div>}{error?<p className="organizer-error" role="alert">{error}</p>:<InlineOpening label="Preparing this calendar"/>}</div></section>;
}
/** The first accepted availability chooses one presentation for this lifetime.
 * Later decoration cannot replace the visitor's settled calendar or chat. */
export function BookingLayout({service,source,owner,error,children}:{service:Service;source:BookingAvailability|null;owner?:Owner;error?:string;children:ReactNode}){
 const [mode,setMode]=useState<'calendar'|'conversation'|null>(()=>source?(source.conversation?.state==='ready'?'conversation':'calendar'):null);
 useLayoutEffect(()=>{if(source)setMode(current=>current??(source.conversation?.state==='ready'?'conversation':'calendar'));},[source]);
 if(mode===null)return <BookingOpening owner={source?.owner??owner} error={error}/>;
 if(mode==='calendar')return <section className="booking-card bank-organizer" aria-label="Book an appointment"><div className="organizer-scroll">{children}</div></section>;
 return <Suspense fallback={<BookingOpening owner={source?.owner??owner}/>}><Conversation service={service} source={source!}>{children}</Conversation></Suspense>;
}
