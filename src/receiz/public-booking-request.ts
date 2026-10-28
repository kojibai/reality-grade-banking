import {bookingOverrides} from './booking-link';
import type {OrganizerRequest} from './native-organizer';

/** Replaces only the existing public calendar transport, never nativeFetch. */
export function createPublicBookingRequest(request:typeof fetch=globalThis.fetch):OrganizerRequest{
 return async(path,init)=>{
  const url=new URL(path,'https://bankeiz.com');
  const route=/^\/api\/calendar\/embed\/([a-z0-9_]{3,24})$/.exec(url.pathname);
  if(!path.startsWith('/')||path.startsWith('//')||!route||url.origin!=='https://bankeiz.com'||!['GET','POST'].includes(init?.method??'GET'))throw Error('BOOKING_PATH_DENIED');
  const options=bookingOverrides(url.searchParams);
  const headers=new Headers({'Accept':'application/json'});if((init?.method??'GET')==='POST')headers.set('Content-Type','application/json');
  return request('/api/bank/booking/'+route[1]+(options.size?'?'+options:''),{method:init?.method??'GET',headers,body:init?.body,signal:init?.signal,credentials:'same-origin'});
 };
}
