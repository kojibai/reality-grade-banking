// Controlled browser qualification. No live calendar, invitations, model,
// identity, payment, or native transport. Actual page, Sheet, parser/controller.
import {StrictMode,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {PublicBookingPage} from '../../src/features/booking/PublicBookingPage';
import {ProfileBooking} from '../../src/public-explorer/ProfileBooking';
import {createPublicBooking} from '../../src/receiz/public-booking';
import {createPublicBookingRequest} from '../../src/receiz/public-booking-request';
import '../../src/styles/tokens.css';
const query=new URLSearchParams(location.search),embedded=query.get('mode')==='sheet',ready=query.get('capability')!=='absent';
if(embedded){await import('../../src/styles/app.css');await import('../../src/styles/features.css');}
const username='controlled_host',ownerId='f9ae2d5e-7a40-46fc-80cb-8bfc064ed943';
const owner={userId:ownerId,username,displayName:'Casey Example',avatarUrl:null};
const schedule={slotMinutes:30,hourStarts:Array.from({length:24},(_,hour)=>hour),weekdayIndexes:[1,2,3,4,5],daysForward:14,timezone:'UTC',timezoneMode:'manual' as const};
const questions=Array.from({length:6},(_,index)=>({id:'topic-'+index,label:index?'Extra detail '+index:'What would you like to discuss?',required:index===0}));
const slots=Array.from({length:8},(_,day)=>schedule.hourStarts.map(hour=>{const startAt=new Date(Date.UTC(2026,10,2+day,hour)).toISOString();return{id:startAt,startAt,endAt:new Date(Date.parse(startAt)+30*60000).toISOString()};})).flat();
const calendar={ok:true,owner,scheduleConfig:schedule,savedScheduleConfig:schedule,customQuestions:questions,savedCustomQuestions:questions,slots,...(ready?{conversation:{state:'ready',ownerUserId:ownerId,username}}:{})};
const fixture={controlled:true,reads:0,manualWrites:0,messages:[] as Array<Record<string,unknown>>,unexpected:[] as string[],accepted:0,delta:()=>{},finish:()=>{},more:()=>{}};
Object.assign(window,{bookingFixture:fixture});
const encoder=new TextEncoder(),memory:Array<Record<string,unknown>>=[];
window.fetch=async(input,init)=>{
 const url=new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url,location.origin),method=init?.method??'GET';
 if(url.origin!==location.origin||!url.pathname.startsWith('/api/bank/booking/'+username)){fixture.unexpected.push(method+' '+url);throw Error('CONTROLLED_FIXTURE_REFUSED_UNEXPECTED_REQUEST');}
 if(url.pathname==='/api/bank/booking/'+username&&method==='GET'){fixture.reads++;return Response.json(calendar);}
 if(url.pathname==='/api/bank/booking/'+username&&method==='POST'){fixture.manualWrites++;throw Error('CONTROLLED_FIXTURE_NEVER_CREATES_MANUAL_BOOKINGS');}
 if(url.pathname!=='/api/bank/booking/'+username+'/conversation'||method!=='POST'){fixture.unexpected.push(method+' '+url);throw Error('CONTROLLED_FIXTURE_REFUSED_UNEXPECTED_REQUEST');}
 const payload=JSON.parse(String(init?.body));fixture.messages.push(payload);const turn=fixture.messages.length;
 if(turn>3||payload.replyToOperationId!==(turn===1?null:fixture.messages[turn-2].clientOperationId))throw Error('CONTROLLED_ACCEPTED_PARENT_MISMATCH');
 const first='I can help you find a time. These are scripted availability notes for this controlled browser check.\n\n'+Array.from({length:13},(_,i)=>`Option ${i+1}: a real offered fixture time, with room for your questions.`).join('\n');
 const message=turn===1?first:turn===2?'Please review: Casey Example · Tuesday, November 3, 4:00 PM UTC · 30 minutes. Alex Example, alex@example.test. Topic: a practical conversation. Shall I book this exact appointment?':'Your controlled appointment is confirmed. This scripted result sends no invitation and creates no live calendar event.';
 const confirmation={eventId:'c420099c-464d-4d44-97df-c945328cc7af',title:'Controlled conversation with Casey',startAt:'2026-11-03T16:00:00.000Z',endAt:'2026-11-03T16:30:00.000Z',attendeeName:'Alex Example',attendeeEmail:'alex@example.test',timezone:'UTC',location:'https://bankeiz.com/meet/c420099c-464d-4d44-97df-c945328cc7af/controlled_meeting_key_123/'};
 let closed=false;
 return new Response(new ReadableStream<Uint8Array>({start(controller){const emit=(value:unknown)=>{if(!closed)controller.enqueue(encoder.encode('data: '+JSON.stringify(value)+'\n\n'));};
  emit({type:'reply_start',messageId:payload.clientAssistantMessageId});
  fixture.delta=()=>emit({type:'reply_delta',messageId:payload.clientAssistantMessageId,delta:turn===1?first:message.slice(0,38)});
  fixture.more=()=>emit({type:'reply_delta',messageId:payload.clientAssistantMessageId,delta:'\nAdditional streamed availability detail.'});
  fixture.finish=()=>{if(closed)return;memory.push({id:payload.clientUserMessageId,role:'user',body:payload.message,scope:'thread',channel:'profile'},{id:payload.clientAssistantMessageId,role:'assistant',body:message,scope:'thread',channel:'profile'});fixture.accepted++;emit({type:'reply_done',world:{username},assistantMessage:{id:payload.clientAssistantMessageId},reply:{message,memory:[...memory],source:'controlled-scripted-native-shape',bookingProposal:turn===2?{...confirmation,eventId:undefined}:null,bookingConfirmation:turn===3?confirmation:null,performance:null}});emit({type:'done'});closed=true;controller.close();};
 },cancel(){closed=true;}}),{headers:{'content-type':'text/event-stream'}});
};
const service=createPublicBooking({username,request:createPublicBookingRequest()});
function Example(){const[opened,setOpened]=useState(false),[active,setActive]=useState(false);return <><aside data-controlled-fixture style={{padding:'8px 12px',fontSize:11,textAlign:'center'}}>Controlled scripted fixture · no live booking, email, money or Identity</aside>{embedded?<><main style={{padding:24}}><h1>Controlled profile</h1><button onClick={()=>{setOpened(true);setActive(true);}}>Open booking</button></main>{opened&&<ProfileBooking userId={ownerId} username={username} owner={owner} active={active} onClose={()=>setActive(false)}/>}</>:<PublicBookingPage service={service}/>}</>;}
createRoot(document.getElementById('root')!).render(<StrictMode><Example/></StrictMode>);
