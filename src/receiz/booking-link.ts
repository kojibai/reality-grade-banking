import {bookingOfferId} from './booking-offers.js';
import type {BookingQuestion,BookingSchedule} from './organizer-types';
export const BOOKING_LINK_KEYS=['slotMinutes','hourStarts','weekdayIndexes','daysForward','timezone','questions','offer'] as const;
export function bookingOverrides(params:URLSearchParams){const out=new URLSearchParams();for(const key of BOOKING_LINK_KEYS){if(params.getAll(key).length>1)throw Error('BOOKING_LINK_INVALID');const value=params.get(key);if(value!==null)out.set(key,key==='offer'?bookingOfferId(value):value);}if(out.toString().length>12000)throw Error('BOOKING_LINK_INVALID');return out;}
export function bankBookingLink(username:string,options?:{scheduleConfig?:BookingSchedule;customQuestions?:BookingQuestion[];offer?:string},origin='https://bankeiz.com'){
 if(!/^[a-z0-9_]{3,24}$/.test(username))throw Error('BOOKING_USERNAME_REQUIRED');const url=new URL('/book/'+username+'/',origin);
 if(options?.scheduleConfig){const c=options.scheduleConfig;if(c.timezone)url.searchParams.set('timezone',c.timezone);url.searchParams.set('slotMinutes',String(c.slotMinutes));url.searchParams.set('hourStarts',c.hourStarts.join(','));url.searchParams.set('weekdayIndexes',c.weekdayIndexes.join(','));url.searchParams.set('daysForward',String(c.daysForward));if(options.customQuestions?.length)url.searchParams.set('questions',JSON.stringify(options.customQuestions));}
 if(options?.offer)url.searchParams.set('offer',bookingOfferId(options.offer));
 return url.href;
}
