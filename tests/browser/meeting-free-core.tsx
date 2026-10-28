// Controlled presentation only: no account, real call, billing or proof issuance.
import{useState}from'react';import{createRoot}from'react-dom/client';
import{MeetingRoom}from'../../src/features/meeting/MeetingRoom';
import{StartMeetingPage}from'../../src/features/meeting/StartMeetingPage';
import '../../src/features/meeting/meeting.css';
const stats={start:0,recovery:0,end:0,ask:0};Object.assign(window,{meetingFixture:stats});
const state={call:{id:'example',status:'active',mode:'video',topology:'mesh',participants:[],viewerPermissions:{canEndCall:true}},joined:true,remoteStreams:[],localStream:null,micEnabled:false,videoEnabled:false};
const organizer={known:()=>({username:'example'}),knownContacts:()=>[],contacts:async()=>[],knownEvents:()=>[],events:async()=>[],knownAvailability:()=>null,subscribe:()=>()=>{},saveEvent:async()=>{throw Error('EXAMPLE_HAS_NO_CALENDAR_WRITE');}};
const room={isHost:true,viewerId:'example',hostId:'example',conversationId:'example',attendees:[],sharedContext:'',meeting:{title:'A little time, together.',host:{displayName:'BJ'},twin:true,recording:true,url:'https://example.invalid'},identity:{knownTwinAccess:()=>false,knownOrganizer:()=>organizer,organizer:async()=>organizer,backup:()=>({bytes:new Uint8Array([1,2,3]),filename:'example-identity.png',phrase:''})},messaging:{knownMessages:()=>null,messages:async()=>({messages:[],hasMore:false,conversation:{members:[]}}),twin:{ask:async()=>{stats.ask++;throw Error('EXAMPLE_HAS_NO_TWIN_TRANSPORT');}},callTransport:{heldFetch:async()=>{throw Error('EXAMPLE_HAS_NO_TRANSPORT');}}},controller:{getSnapshot:()=>state,subscribe:()=>()=>{},subscribeActivity:()=>()=>{},refresh:async()=>{},end:async()=>{stats.end++;},close:async()=>{}}};
const entry={importIdentity:async()=>{throw Error('EXAMPLE_HAS_NO_IDENTITY_TRANSPORT');},recoverPbi:async()=>{stats.recovery++;throw Error('passkey_cancelled');}};
function Example(){const[start,setStart]=useState(new URLSearchParams(location.search).get('view')==='start');return start?<StartMeetingPage entry={entry} start={async()=>{stats.start++;return '/illustrative-meeting';}} navigate={()=>setStart(false)}/>:<MeetingRoom room={room as never} entry={entry} path="/illustrative-meeting" initialPanel="twin" onRejoin={()=>{}}/>;}
createRoot(document.getElementById('root')!).render(<Example/>);
