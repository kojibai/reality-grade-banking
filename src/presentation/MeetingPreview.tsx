import {MeetingStartPreview} from './MeetingStartPreview';
/** Build-only presentation source. Fictional participants and scripted rows have
 * no Identity, call, calendar, payment or proof authority. This is never mounted. */
import{renderToStaticMarkup}from'react-dom/server';
import{MeetingMoneyView}from'../features/meeting/MeetingMoneyView';
import {EventView} from '../features/messages/organizer/CalendarViews';
import type {OrganizerEvent} from '../receiz/organizer-types';
import {MeetingRoom} from '../features/meeting/MeetingRoom';
import {MeetingPage} from '../features/meeting/MeetingPage';
import type {JoinedMeeting,MeetingSession} from '../receiz/meeting-session';
const host='11111111-1111-4111-8111-111111111111',guest='22222222-2222-4222-8222-222222222222';
const meeting={id:'33333333-3333-4333-8333-333333333333',title:'The next good idea.',startAt:'2026-10-28T14:00:00.000Z',endAt:'2026-10-28T14:30:00.000Z',host:{displayName:'Alex Bennett',username:'alexb'},twin:true,recording:true,url:'https://example.invalid/illustrative-meeting'};
const call={id:'44444444-4444-4444-8444-444444444444',conversationId:meeting.id,status:'active',mode:'video',topology:'mesh',participants:[{userId:host,participantKind:'user',displayName:'Alex Bennett',leftAt:null,mediaState:{audioEnabled:true,videoEnabled:false}},{userId:guest,participantKind:'user',displayName:'Maya Chen',leftAt:null,mediaState:{audioEnabled:true,videoEnabled:true}}],viewerPermissions:{canEndCall:true}};
const snapshot={call,calls:[call],phase:'connected',joined:true,localStream:null,remoteStreams:[],micEnabled:true,videoEnabled:true,iceSource:null,error:null};
const messages=[{id:'example-question',body:'Can you keep the decisions and arrange our follow-up for Friday at 10?',senderUserId:guest,senderDisplay:'Maya Chen',createdAt:'2026-10-28T14:24:00Z'},
{id:'example-twin',body:'Friday at 10 is agreed. The follow-up keeps the project brief and today’s decisions together, so we can pick up right here.',senderUserId:host,senderDisplay:'Alex Bennett',createdAt:'2026-10-28T14:24:03Z',walletTransfer:{kind:'bankeiz.meeting.twin',displayName:'Alex’s Twin'}}];
const people=[{kind:'user',userId:host,displayName:'Alex Bennett',username:'alexb',avatarUrl:null},{kind:'user',userId:guest,displayName:'Maya Chen',username:'maya',avatarUrl:null}];
const paymentMessages=[{...messages[0],id:'example-price',body:'The project session is $125. We can get started today.'},{...messages[0],id:'example-agreement',senderUserId:host,body:'Perfect. I’ll send it here.'}];
const paidMessage={...messages[0],id:'example-payment',senderUserId:host,body:'Project session',walletTransfer:{kind:'chat_transfer',senderUserId:host,recipientUserId:guest,amountUsdCents:'12500',amountPhiMicro:'125000000',transferId:'66666666-6666-4666-8666-666666666666',note:'Project session'}};
const room={meeting,viewerId:host,hostId:host,isHost:true,conversationId:meeting.id,attendees:[],sharedContext:'Illustrative project review',identity:{knownTwinAccess:()=>true},controller:{subscribe:()=>()=>{},getSnapshot:()=>snapshot},messaging:{callTransport:{heldFetch:()=>{throw Error('ILLUSTRATIVE_SOURCE_HAS_NO_TRANSPORT');}},knownMessages:()=>({messages,conversation:{members:people},hasMore:false,nextCursor:null})}} as unknown as JoinedMeeting;
const forbidden=async()=>{throw Error('ILLUSTRATIVE_SOURCE_HAS_NO_TRANSPORT');};
const previewEntry:MeetingSession={path:'/illustrative-meeting',known:()=>meeting,read:forbidden,join:forbidden,importIdentity:forbidden,recoverPbi:forbidden,close:async()=>{}};
export const meetingPreviewNames=['join','room','chat','pay','paid','twin','record','people','followup','start-account','start-messages','start-calendar','start-event','start-join'] as const;
const followup={id:'55555555-5555-4555-8555-555555555555',title:'Launch review · next step',kind:'appointment',source:'message',startAt:'2026-10-30T10:00:00Z',endAt:'2026-10-30T10:30:00Z',location:'https://bankeiz.com/meet/55555555-5555-4555-8555-555555555555/illustrative-invitation-only/',note:'Continue The next good idea. Bring the project brief, today’s agreed direction and the remaining questions.',attendees:['maya@example.invalid'],metadata:{},createdAt:'2026-10-28T14:24:03Z',updatedAt:'2026-10-28T14:24:03Z'} as OrganizerEvent;
export function MeetingPreview({screen}:{screen:typeof meetingPreviewNames[number]}){
 let view;
 if(screen.startsWith('start-'))return <div className="meeting-preview-source" data-meeting-preview-source={screen}>{screen==='start-join'?<MeetingPage service={previewEntry}/>:<MeetingStartPreview screen={screen}/>}</div>;
 if(screen==='pay'||screen==='paid'){
  const current={...room,messaging:{...room.messaging,knownMessages:()=>({messages:screen==='paid'?[...paymentMessages,paidMessage]:paymentMessages,conversation:{members:people},hasMore:false,nextCursor:null})}} as unknown as JoinedMeeting;
  let html=renderToStaticMarkup(<MeetingRoom room={current} path="/illustrative-meeting" initialPanel="chat" onRejoin={()=>{}}/>);
  if(screen==='pay'){
   const money=renderToStaticMarkup(<MeetingMoneyView state={{ready:true,busy:false,blocked:false,error:'',context:null,outcome:null,receipt:null}} members={people.slice(1) as never} recipient={guest} amount="125.00" balance="112500" onRecipient={()=>{}} onAmount={()=>{}} onSend={()=>{}} onBack={()=>{}} onCheck={()=>{}} onCancel={()=>{}} onAnother={()=>{}} onRetry={()=>{}}/>);
   html=html.replace(/<form class="meeting-composer"[\s\S]*?<\/form>/,`<div class="meeting-money-holder">${money}</div>`);
  }
  view=<div dangerouslySetInnerHTML={{__html:html}}/>;
 }else view=screen==='followup'?<section className="bank-organizer meeting-preview-calendar"><div className="organizer-scroll"><EventView event={followup} onBack={()=>{}} onEdit={()=>{}} onCancel={()=>{}} busy={false}/></div></section>:screen==='join'?<MeetingPage service={previewEntry}/>:<MeetingRoom room={room} path="/illustrative-meeting" initialPanel={screen==='chat'||screen==='twin'||screen==='people'||screen==='record'?screen:null} initialTwinTurns={[{id:'illustrative-followup',question:messages[0].body,message:messages[1].body,working:false,private:false,receipts:[{title:'Follow-up scheduled',summary:'Friday · 10:00 · Context connected'}]}]} onRejoin={()=>{}}/>;
 return <div className="meeting-preview-source" data-meeting-preview-source={screen}>{view}</div>;
}
