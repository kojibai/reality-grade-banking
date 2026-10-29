import {Sheet} from '../components/Sheet';
import {BookingOpening} from '../features/booking/BookingOpening';
import type {BookingAvailability} from '../receiz/organizer-types';
import {createPublicBooking} from '../receiz/public-booking';
import {createPublicBookingRequest} from '../receiz/public-booking-request';
import {lazy,Suspense,useEffect,useMemo,useState} from 'react';

const BookingEditor=lazy(()=>import('../features/booking/PublicBookingPage').then(module=>({default:module.PublicBookingPage})));

// The same public calendar survives closing and reopening this profile panel.
// No scheduler request or code warming occurs before the visitor opens it.
export function ProfileBooking({userId,username,owner,active,onClose}:{userId:string;username:string;owner:{displayName:string;avatarUrl:string|null};active:boolean;onClose:()=>void}){
 const service=useMemo(()=>createPublicBooking({username,request:createPublicBookingRequest()}),[userId,username]);
 const [opening,setOpening]=useState<Promise<BookingAvailability>|null>(null);
 useEffect(()=>{const read=service.availability();void read.catch(()=>{});setOpening(read);},[service]);
 const frame=<section className="booking-panel" aria-busy="true"><BookingOpening owner={owner}/></section>;
 return <Sheet className="profile-booking-sheet" active={active} title="Book a time" navigation="back" onClose={onClose}>{opening?<Suspense fallback={frame}><BookingEditor service={service} opening={opening} owner={owner} embedded/></Suspense>:frame}</Sheet>;
}
