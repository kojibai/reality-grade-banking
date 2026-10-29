import { createRoot } from 'react-dom/client';
import { createMeetingSession } from '../../receiz/meeting-session';
import { meetingCoordinate } from '../../receiz/meeting-links';
import { nativeFetch } from '../../receiz/native-transport';
import { MeetingPage } from './MeetingPage';
import './meeting.css';
import {StartMeetingPage} from './StartMeetingPage';
import {createInstantMeeting} from '../../receiz/instant-meeting';
const root = createRoot(document.getElementById('root')!);
type MeetingEntry=Awaited<ReturnType<typeof import('../../checkout/checkout-identity').checkoutIdentitySession>>;
let entry: MeetingEntry | null = null;
let entryPending: Promise<MeetingEntry> | null = null, closed=false;
const getEntry=()=>entryPending??=import('../../checkout/checkout-identity').then(module=>module.checkoutIdentitySession()).then(value=>{if(closed){value.close();throw Error('MEETING_CLOSED');}return entry=value;});
const coordinate = meetingCoordinate(location.pathname.endsWith('/') ? location.pathname : location.pathname + '/');
if (/^\/meet\/start\/?$/.test(location.pathname)) {
 const starter=createInstantMeeting({identity:async()=>(await getEntry()).open(),storage:{getItem:key=>sessionStorage.getItem(key),setItem:(key,value)=>sessionStorage.setItem(key,value),removeItem:key=>sessionStorage.removeItem(key)}});
 const navigate=(path:string)=>{const next=meetingCoordinate(path);if(!next)throw Error('MEETING_CREATION_UNCONFIRMED');history.replaceState(null,'',path);showMeeting(next,true);};
 root.render(<StartMeetingPage start={starter.open} navigate={navigate} entry={{importIdentity:async(file,phrase)=>(await getEntry()).import(file,phrase),recoverPbi:async()=>(await getEntry()).recoverPbi()}}/>);
 window.addEventListener('pagehide',event=>{if(!event.persisted){closed=true;entry?.close();}});
} else if (!coordinate)
 root.render(<main className="meeting-lobby"><h1>Check your meeting link.</h1><p>Your host can send you another invitation.</p></main>);
else showMeeting(coordinate,new URLSearchParams(location.search).get('pay')==='1');
function showMeeting(coordinate:NonNullable<ReturnType<typeof meetingCoordinate>>,autoJoin=false){
 const service = createMeetingSession({ ...coordinate, request: (path, init) => nativeFetch('https://receiz.com' + path, init), entry: {
  open:async()=>(await getEntry()).open(),import:async(file,phrase)=>(await getEntry()).import(file,phrase),recoverPbi:async()=>(await getEntry()).recoverPbi(),close(){closed=true;entry?.close();}
 } });
 root.render(<MeetingPage service={service} autoJoin={autoJoin}/>);
 window.addEventListener('pagehide',event=>{if(!event.persisted)void service.close();});
}
