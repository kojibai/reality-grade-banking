// Controlled presentation and canonical-session boundary; no production account or media.
import {createRoot} from 'react-dom/client';
import {MeetingPage} from '../../src/features/meeting/MeetingPage';
import {createMeetingSession} from '../../src/receiz/meeting-session';
import {createCheckoutIdentitySession} from '../../src/checkout/checkout-identity';
import '../../src/features/meeting/meeting.css';
const eventId='11111111-1111-4111-8111-111111111111',uid='22222222-2222-4222-8222-222222222222',key='abcdefghijklmnopqrstuvwx';
const meeting={id:eventId,title:'The next good idea.',startAt:'2026-10-28T14:00:00Z',endAt:'2026-10-28T14:30:00Z',host:{username:'bjklock',displayName:'BJ Klock'},twin:true,recording:true,url:`https://bankeiz.com/meet/${eventId}/${key}/`};
const identity={dispose(){},messaging:async()=>({accountUid:uid,callTransport:{heldFetch:async(_path:string,init:RequestInit)=>{if(new Headers(init.headers).get('content-type')!=='application/json')return Response.json({ok:false},{status:415});throw Error('Fixture stops at the media boundary.');}}})};
const entry=createCheckoutIdentitySession({restore:async()=>identity as never,create:async()=>{throw Error('Fixture uses held identity only.');},importIdentity:async()=>identity as never,recover:async()=>{throw Error('passkey_cancelled');}});
const service=createMeetingSession({eventId,key,entry,request:async()=>Response.json({ok:true,meeting})});
createRoot(document.getElementById('root')!).render(<MeetingPage service={service}/>);
