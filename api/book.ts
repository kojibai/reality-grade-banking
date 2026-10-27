import {handleBookingPreview} from '../server/booking-runtime/booking-preview.mjs';
// Public booking invitation only. No account, calendar write or identity entry.
export default{fetch(request:Request):Promise<Response>{return handleBookingPreview(request);}};
