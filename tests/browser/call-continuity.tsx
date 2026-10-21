import {useEffect,useState} from 'react';
import {createPortal} from 'react-dom';
import {requestBankNavigation} from '../../src/core/bank-navigation';
import {createRoot} from 'react-dom/client';
import {MessagesPanel} from '../../src/features/messages/MessagesPanel';
import {Sheet} from '../../src/components/Sheet';
import type {OpenIdentity} from '../../src/receiz/native-identity';
import type {NativeMessaging,ChatConversation} from '../../src/receiz/native-messaging';
import '../../src/styles/tokens.css';
import '../../src/styles/app.css';
import '../../src/styles/features.css';

declare global{interface Window{__callQaHarness?:boolean;__callQa?:{requests:{path:string;method:string;body?:unknown}[];devices:number;stops:number;stream:MediaStream|null;navigationReady:boolean}}}
// Explicit harness injection is required; this fixture cannot acquire devices,
// send a message or contact a call service when opened as an ordinary page.
if(window.__callQaHarness===true){
 const qa=window.__callQa={requests:[] as {path:string;method:string;body?:unknown}[],devices:0,stops:0,stream:null as MediaStream|null,navigationReady:false as boolean};
 history.replaceState(null,'','/#account/messages');
 const uid='33333333-3333-4333-8333-333333333333',cid='11111111-1111-4111-8111-111111111111';
 const peer={kind:'user' as const,userId:'44444444-4444-4444-8444-444444444444',username:'studio',displayName:'Studio',avatarUrl:null};
 const conversation:ChatConversation={id:cid,kind:'dm',title:'Studio',members:[peer],aiAgents:[],defaultAiId:null,unreadCount:0,previewMessage:null,createdAt:'2026-10-20T12:00:00Z',updatedAt:'2026-10-20T12:00:00Z',lastMessageAt:null};
 const other={...conversation,id:'66666666-6666-4666-8666-666666666666',title:'Alex',members:[{...peer,username:'alex',displayName:'Alex'}]};
 const call={id:'22222222-2222-4222-8222-222222222222',conversationId:cid,mode:'video',status:'active',topology:'mesh',participants:[{participantKind:'user',userId:uid,leftAt:null,displayName:'You'}],activeParticipantCount:1,viewerPermissions:{canEndCall:true}};
 const canvas=document.createElement('canvas');canvas.width=640;canvas.height=360;const context=canvas.getContext('2d')!;context.fillStyle='#e1e7ef';context.fillRect(0,0,640,360);context.fillStyle='#455f80';context.font='30px sans-serif';context.textAlign='center';context.fillText('Synthetic call · no camera',320,185);
 const audio={kind:'audio',id:'qa-audio',enabled:true,readyState:'live',stop(){qa.stops++;this.readyState='ended';}};
 Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:async()=>{qa.devices++;const stream=canvas.captureStream(10),video=stream.getVideoTracks()[0],stop=video.stop.bind(video),frames=window.setInterval(()=>context.fillRect(0,0,2,2),100);video.stop=()=>{qa.stops++;window.clearInterval(frames);stop();};Object.defineProperties(stream,{getAudioTracks:{value:()=>[audio]},getTracks:{value:()=>[video,audio]}});qa.stream=stream;return stream;}}});
 const api={accountUid:uid,twin:{readiness:()=>({status:'configured',availability:'unchecked',requires:[]})},knownConversations:()=>[conversation,other],knownMessages:()=>null,conversations:async()=>[conversation,other],messages:async(id:string)=>({conversation:id===cid?conversation:other,messages:[],hasMore:false,nextCursor:null}),callTransport:{heldFetch:async(path:string,init?:RequestInit)=>{const method=init?.method??'GET',body=init?.body?JSON.parse(String(init.body)):undefined;qa.requests.push({path,method,body});if(path.endsWith('/ice'))return Response.json({ok:true,iceServers:[{urls:'stun:synthetic.invalid'}],source:'fallback'});if(path.includes('/signals?'))return Response.json({ok:true,signals:[],lastSignalAt:null});if(method==='PATCH'&&body?.action==='end')call.status='ended';return Response.json({ok:true,call,activeCall:call,calls:[call]});}}} as unknown as NativeMessaging;
 const identity={binding:{identityOwnerReceizId:'synthetic-owner'},knownTwinAccess:()=>false,messaging:async()=>api} as unknown as OpenIdentity;
 const controls=document.createElement('aside');controls.style.cssText='padding:20px;display:flex;gap:12px;flex-wrap:wrap';controls.innerHTML='<button data-call-qa-action="messages">Open Messages</button><button data-call-qa-action="sheet">Open another sheet</button><a href="/asset/example/">Navigate to public page</a><a href="/learn/guide/">Open public guide</a>';document.body.append(controls);
 const sharedHead='<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">';
 const navigation=document.createElement('script');navigation.id='receiz-navigation';navigation.type='application/json';navigation.textContent=JSON.stringify({pages:{'/asset/example/':{head:sharedHead+'<title>Public asset fixture</title>',content:'<main><h1>Public asset fixture</h1><a href="/learn/guide/">Read the guide</a></main>'},'/learn/guide/':{head:sharedHead+'<title>Public guide fixture</title>',content:'<main><h1>Public guide fixture</h1><a href="/asset/example/">Open public asset</a></main>'}},bank:{head:sharedHead+'<title>Synthetic call continuity</title>',styles:[],entry:'/unused-fixture-bank.js'}});document.body.append(navigation);
 function Fixture(){
  const[active,setActive]=useState(true),[otherSheet,setOtherSheet]=useState(false);
  useEffect(()=>{const surface=()=>setActive(location.pathname==='/'&&location.hash==='#account/messages'),intent=(event:MouseEvent)=>{const action=(event.target as Element).closest('[data-call-qa-action]')?.getAttribute('data-call-qa-action');if(action==='messages')requestBankNavigation('#account/messages');else if(action==='sheet')setOtherSheet(true);};addEventListener('receiz-bank:surface',surface);document.addEventListener('click',intent);return()=>{removeEventListener('receiz-bank:surface',surface);document.removeEventListener('click',intent);};},[]);
  return <><main className="console" style={{padding:24,minHeight:'180vh'}}><h1 style={{fontSize:24}}>Synthetic call continuity</h1><p style={{fontSize:13,margin:'16px 0'}}>No devices, messages or remote call service.</p></main><MessagesPanel identity={identity} active={active} onClose={()=>{setActive(false);history.replaceState(null,'','/#account');}} onOpen={()=>{setOtherSheet(false);requestBankNavigation('#account/messages');}}/>{otherSheet&&createPortal(<Sheet title="Another sheet" onClose={()=>setOtherSheet(false)}><p>This modal keeps call controls available.</p></Sheet>,document.body)}</>;
 }
 createRoot(document.getElementById('root')!).render(<Fixture/>);
 const navigatorScript=document.createElement('script');navigatorScript.src='/learn/learn.js?call-continuity-fixture';navigatorScript.onload=()=>{qa.navigationReady=true;};document.head.append(navigatorScript);
}
