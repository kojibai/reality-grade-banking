import {BookingIntro} from './BookingIntro';

/** Keep the held-owner frame in the profile entrance without importing the
 * booking editor or conversation. Those load together after booking intent. */
export function BookingOpening({owner,error}:{owner?:{displayName:string;avatarUrl:string|null};error?:string}){
 return <section className="booking-card bank-organizer" aria-label="Book an appointment"><div className="organizer-scroll"><BookingIntro owner={owner}/><div className="booking-time-picker"/>{error&&<p className="organizer-error" role="alert">{error}</p>}</div></section>;
}
