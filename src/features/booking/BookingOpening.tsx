import {InlineOpening} from '../../components/InlineOpening';
import {ProfileAvatar} from '../../components/ProfileAvatar';

/** Keep the held-owner frame in the profile entrance without importing the
 * booking editor or conversation. Those load together after booking intent. */
export function BookingOpening({owner,error}:{owner?:{displayName:string;avatarUrl:string|null};error?:string}){
 return <section className="booking-card bank-organizer"><div className="organizer-scroll booking-opening">{owner&&<div className="booking-owner"><ProfileAvatar src={owner.avatarUrl} name={owner.displayName}/><span><small>Meet with</small><strong>{owner.displayName}</strong></span></div>}{error?<p className="organizer-error" role="alert">{error}</p>:<InlineOpening label="Preparing this calendar"/>}</div></section>;
}
