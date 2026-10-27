import {Sheet} from '../components/Sheet';
import {PublicBookingPage} from '../features/booking/PublicBookingPage';
import {createPublicBooking} from '../receiz/public-booking';
import {nativeFetch} from '../receiz/native-transport';
import {useMemo} from 'react';

// The same public calendar survives closing and reopening this profile panel.
// No scheduler request or code warming occurs before the visitor opens it.
export function ProfileBooking({userId,username,active,onClose}:{userId:string;username:string;active:boolean;onClose:()=>void}){
 const service=useMemo(()=>createPublicBooking({username,request:(path,init)=>nativeFetch('https://receiz.com'+path,init)}),[userId,username]);
 return <Sheet active={active} title="Book a time" navigation="back" onClose={onClose}><PublicBookingPage service={service} embedded/></Sheet>;
}
