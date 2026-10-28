import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {createPublicBooking} from '../../receiz/public-booking';
import {createPublicBookingRequest} from '../../receiz/public-booking-request';
import {PublicBookingPage} from './PublicBookingPage';
import '../../styles/tokens.css';
const match=/^\/book\/([a-z0-9_]{3,24})\/?$/.exec(location.pathname),root=createRoot(document.getElementById('root')!);
if(!match)root.render(<main className="booking-page"><h1>Booking link unavailable.</h1><p>Check the link with your host.</p></main>);
else void (async()=>{try{const query=new URLSearchParams(location.search);let returned;
 if(query.has('checkoutReturn')){const {parsePaidBookingReturn}=await import('../../receiz/paid-booking');returned=parsePaidBookingReturn(location.href,location.origin)??undefined;if(!returned)throw Error('BOOKING_RETURN_INVALID');if(window.parent!==window){document.getElementById('root')!.textContent='Returning to your booking…';window.parent.postMessage({source:'receiz-bank-card-return',type:'checkout-returned',sessionId:returned.sessionId},location.origin);return;}}
 const service=createPublicBooking({username:match[1],query,request:createPublicBookingRequest()});root.render(<StrictMode><PublicBookingPage service={service} returned={returned}/></StrictMode>);
 }catch{root.render(<main className="booking-page"><h1>Booking link unavailable.</h1><p>Check the link with your host.</p></main>);}})();
