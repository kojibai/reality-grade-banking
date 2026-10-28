import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {createPublicBooking} from '../../receiz/public-booking';
import {createPublicBookingRequest} from '../../receiz/public-booking-request';
import {PublicBookingPage} from './PublicBookingPage';
import '../../styles/tokens.css';
const match=/^\/book\/([a-z0-9_]{3,24})\/?$/.exec(location.pathname),root=createRoot(document.getElementById('root')!);
if(!match)root.render(<main className="booking-page"><h1>Booking link unavailable.</h1><p>Check the link with your host.</p></main>);
else try{const service=createPublicBooking({username:match[1],query:new URLSearchParams(location.search),request:createPublicBookingRequest()});root.render(<StrictMode><PublicBookingPage service={service}/></StrictMode>);}catch{root.render(<main className="booking-page"><h1>Booking link unavailable.</h1><p>Check the link with your host.</p></main>);}
