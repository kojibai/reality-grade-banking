import {StrictMode} from 'react';
import {createRoot,hydrateRoot} from 'react-dom/client';
import {createPublicBooking} from '../../receiz/public-booking';
import {createPublicBookingRequest} from '../../receiz/public-booking-request';
import {PublicBookingPage} from './PublicBookingPage';
import '../../styles/tokens.css';
const match=/^\/book\/([a-z0-9_]{3,24})\/?$/.exec(location.pathname),host=document.getElementById('root')!;
let root:ReturnType<typeof createRoot>;const render=(view:React.ReactNode)=>{if(!root&&host.hasAttribute('data-public-booking-rendered'))root=hydrateRoot(host,view,{identifierPrefix:'public-booking-'});else(root??=createRoot(host,{identifierPrefix:'public-booking-'})).render(view);};
if(!match)render(<main className="booking-page"><h1>Booking link unavailable.</h1><p>Check the link with your host.</p></main>);
else void (async()=>{try{const query=new URLSearchParams(location.search);let returned;
 if(query.has('checkoutReturn')){const {parsePaidBookingReturn}=await import('../../receiz/paid-booking');returned=parsePaidBookingReturn(location.href,location.origin)??undefined;if(!returned)throw Error('BOOKING_RETURN_INVALID');if(window.parent!==window){document.getElementById('root')!.textContent='Returning to your booking…';window.parent.postMessage({source:'receiz-bank-card-return',type:'checkout-returned',sessionId:returned.sessionId},location.origin);return;}}
 const service=createPublicBooking({username:match[1],query,request:createPublicBookingRequest()});render(<StrictMode><PublicBookingPage service={service} returned={returned}/></StrictMode>);
 }catch{render(<main className="booking-page"><h1>Booking link unavailable.</h1><p>Check the link with your host.</p></main>);}})();
