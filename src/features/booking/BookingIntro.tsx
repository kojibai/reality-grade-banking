import {formatMoney} from '../../core/money';
import {Clock} from 'lucide-react';
import {ProfileAvatar} from '../../components/ProfileAvatar';
import './booking.css';

/** The already-carried profile can paint while its offered times arrive. */
export function BookingIntro({owner,details=false,minutes,priceUsdCents,showLead=true}:{owner?:{displayName:string;avatarUrl:string|null};details?:boolean;minutes?:number;priceUsdCents?:string;showLead?:boolean}){
 return <>{owner&&<div className="booking-owner"><ProfileAvatar src={owner.avatarUrl} name={owner.displayName}/><span><small>Meet with</small><strong>{owner.displayName}</strong></span></div>}{showLead&&<h1 className="booking-lead">{details?'A few details.\nThen it’s a date.':'Good things start\nwith a little time.'}</h1>}{minutes!==undefined&&<p className="booking-duration"><Clock size={14}/>{minutes} minutes{priceUsdCents&&priceUsdCents!=='0'&&<> · {formatMoney(priceUsdCents)}</>}</p>}</>;
}
