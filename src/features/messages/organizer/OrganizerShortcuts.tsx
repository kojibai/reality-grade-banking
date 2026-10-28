import {Link,Video} from 'lucide-react';
import {InlineOpening} from '../../../components/InlineOpening';
export function OrganizerShortcuts({ready,busy,onMeet,onBooking}:{ready:boolean;busy:boolean;onMeet():void;onBooking():void}){
 return <div className="organizer-shortcuts"><button type="button" className="organizer-meet-now" disabled={!ready||busy} aria-busy={busy} onClick={onMeet}>{busy?<InlineOpening compact label="Preparing meeting"/>:<Video size={16}/>}<span>Meet now</span></button><button type="button" className="organizer-booking-shortcut" aria-label="Booking link" title="Booking link" onClick={onBooking}><Link size={17}/></button></div>;
}
