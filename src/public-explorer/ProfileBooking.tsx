import {Sheet} from '../components/Sheet';
import {InlineOpening} from '../components/InlineOpening';
import {BookingIntro} from '../features/booking/BookingIntro';
import type {BookingAvailability} from '../receiz/organizer-types';
import {createPublicBooking} from '../receiz/public-booking';
import {nativeFetch} from '../receiz/native-transport';
import {lazy,Suspense,useEffect,useMemo,useState} from 'react';

const BookingEditor=lazy(()=>import('../features/booking/PublicBookingPage').then(module=>({default:module.PublicBookingPage})));

// The same public calendar survives closing and reopening this profile panel.
// No scheduler request or code warming occurs before the visitor opens it.
export function ProfileBooking({userId,username,owner,active,onClose}:{userId:string;username:string;owner:{displayName:string;avatarUrl:string|null};active:boolean;onClose:()=>void}){
 const service=useMemo(()=>createPublicBooking({username,request:(path,init)=>nativeFetch('https://receiz.com'+path,init)}),[userId,username]);
 const [opening,setOpening]=useState<Promise<BookingAvailability>|null>(null);
 useEffect(()=>{const read=service.availability();void read.catch(()=>{});setOpening(read);},[service]);
 const frame=<section className="booking-panel" aria-busy="true"><section className="booking-card bank-organizer" aria-label="Book an appointment"><div className="organizer-scroll"><BookingIntro owner={owner}/><InlineOpening label="Preparing this calendar"/></div></section></section>;
 return <Sheet className="profile-booking-sheet" active={active} title="Book a time" navigation="back" onClose={onClose}>{opening?<Suspense fallback={frame}><BookingEditor service={service} opening={opening} owner={owner} embedded/></Suspense>:frame}</Sheet>;
}
