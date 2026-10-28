import {createRoot} from 'react-dom/client';
import {MeetingRoom} from '../../src/features/meeting/MeetingRoom';
import '../../src/styles/tokens.css';
import '../../src/styles/app.css';
import '../../src/styles/features.css';
import '../../src/features/meeting/meeting.css';
// Presentation/transport regression only: fictional meeting and opaque test ID.
// No real meeting, enrollment, signing, media permission or financial action.
const stats={end:0,seal:0,backup:0},listeners=new Set<()=>void>(),blobs=new Map<string,Uint8Array>();let capture:unknown=null;
const call={id:'controlled-call',status:'active',mode:'video',topology:'mesh',participants:[],viewerPermissions:{canEndCall:true}};
let state={call,phase:'connected',joined:true,remoteStreams:[],localStream:null,micEnabled:false,videoEnabled:false};
const archive={read:async()=>capture,write:async(_id:string,next:unknown)=>{capture=next;},retain:async(bytes:Uint8Array)=>{const key=String(blobs.size);blobs.set(key,new Uint8Array(bytes));return key;},restore:async(key:string)=>blobs.get(key)!,seal:async(bytes:Uint8Array)=>{stats.seal++;if(new URLSearchParams(location.search).has('fail')&&stats.seal===1)throw Error('Controlled temporary recording save failure');return new File([new Uint8Array(bytes)],'controlled-meeting.zip',{type:'application/zip'});}};
const room={isHost:true,viewerId:'controlled-owner',hostId:'controlled-owner',conversationId:'controlled-room',attendees:[],sharedContext:'',meeting:{title:'Launch review',host:{displayName:'Example owner'},twin:false,recording:false,url:'https://example.invalid'},identity:{knownTwinAccess:()=>false,meetingArchive:async()=>archive,backup:()=>{stats.backup++;return{bytes:new TextEncoder().encode('CONTROLLED IDENTITY RECORD'),filename:'controlled-identity.png',phrase:'NOT INCLUDED'};}},messaging:{knownMessages:()=>null,messages:async()=>({messages:[],hasMore:false,conversation:{members:[]}}),callTransport:{heldFetch:async()=>Response.json({ok:true,artifact:{call:state.call},messages:[{body:'We agreed to follow up next week.'}]})}},controller:{getSnapshot:()=>state,subscribe:(listener:()=>void)=>{listeners.add(listener);return()=>listeners.delete(listener);},subscribeActivity:()=>()=>{},refresh:async()=>{},close:async()=>{},end:async()=>{stats.end++;state={...state,joined:false,phase:'ended',call:{...state.call,status:'ended'}};listeners.forEach(listener=>listener());},leave:async()=>{}}};
Object.assign(window,{meetingDownloadFixture:stats});
createRoot(document.getElementById('root')!).render(<MeetingRoom room={room as never} path="/controlled-meeting" onRejoin={()=>{}}/>);
