import {useState} from 'react';import {createRoot} from 'react-dom/client';
import {MessagesPanel} from '../../src/features/messages/MessagesPanel';import {ConsoleShell} from '../../src/components/ConsoleShell';
import {createNativeMessaging,type ChatConversation} from '../../src/receiz/native-messaging';import {createNativeTwin} from '../../src/receiz/native-twin';import type {OpenIdentity} from '../../src/receiz/native-identity';
import '../../src/styles/tokens.css';import '../../src/styles/app.css';import '../../src/styles/features.css';
// Two synthetic browser accounts exercise the production typing controller and
// messages UI. BroadcastChannel replaces only the private provider in this fixture.
// There are no external requests, credentials, stored drafts, or real recipients.
const sam='11111111-1111-4111-8111-111111111111',mira='22222222-2222-4222-8222-222222222222',id='33333333-3333-4333-8333-333333333333';
const self=new URLSearchParams(location.search).get('as')==='mira'?mira:sam,peer=self===sam?mira:sam;
const people=[{kind:'user' as const,userId:sam,username:'sam',displayName:'Sam',avatarUrl:null},{kind:'user' as const,userId:mira,username:'mira',displayName:'Mira',avatarUrl:null}];
const conversation:ChatConversation={id,kind:'dm',title:people.find(p=>p.userId===peer)!.displayName,members:people,aiAgents:[],defaultAiId:null,unreadCount:0,previewMessage:null,createdAt:'2026-10-19T12:00:00Z',updatedAt:'2026-10-19T12:00:00Z',lastMessageAt:null};
const publisher=new BroadcastChannel('bankeiz-test-only-peer-typing');
const request=async(path:string,init?:RequestInit)=>{
 if(path.endsWith('/typing/stream')){
  let listener:BroadcastChannel|undefined;
  return new Response(new ReadableStream<Uint8Array>({start(sink){const emit=(value:unknown)=>sink.enqueue(new TextEncoder().encode('data: '+JSON.stringify(value)+'\n\n'));listener=new BroadcastChannel('bankeiz-test-only-peer-typing');listener.onmessage=event=>{const v=event.data;if(v.conversationId===id)emit(v);};emit({type:'ready'});},cancel(){listener?.close();}}),{headers:{'content-type':'text/event-stream'}});
 }
 if(path.endsWith('/typing')){const input=JSON.parse(String(init?.body));publisher.postMessage({type:'typing',conversationId:id,userId:self,clientId:input.clientId,sequence:input.sequence,active:input.active,expiresInMs:input.active?6000:0});return Response.json({ok:true});}
 if(path==='/api/chat/conversations')return Response.json({ok:true,conversations:[conversation]});
 if(path.endsWith('/calls'))return Response.json({ok:true,calls:[],activeCall:null});
 if(path.includes('/messages')&&init?.method==='POST'){const input=JSON.parse(String(init.body)),message={id:crypto.randomUUID(),conversationId:id,senderUserId:self,senderKind:'user',senderAiId:null,senderDisplay:people.find(p=>p.userId===self)!.displayName,body:input.body,createdAt:new Date().toISOString(),receizedAt:new Date().toISOString(),receipt:null,sealedOriginalAvailable:false};return new Response('data: '+JSON.stringify({type:'user_message',message})+'\n\ndata: {"type":"done"}\n\n',{headers:{'content-type':'text/event-stream'}});}
 if(path.includes('/messages'))return Response.json({ok:true,conversation,messages:[],hasMore:false,nextCursor:null});
 return Response.json({ok:false},{status:404});
};
const api=Object.assign(createNativeMessaging({request,accountUid:self}),{twin:createNativeTwin({request,accountUid:self,username:self===sam?'sam':'mira',assertOpen(){}})});
const identity={messaging:async()=>api} as unknown as OpenIdentity;
function Fixture(){const[open,setOpen]=useState(true);return <ConsoleShell panel="account" onNavigate={()=>{}} onDeposit={()=>{}} onProfile={()=>{}} onMessages={()=>setOpen(true)}><p style={{fontSize:12,color:'#7d8b9d'}}>Two-account typing fixture · {self===sam?'Sam':'Mira'} · synthetic only</p><MessagesPanel identity={identity} active={open} onClose={()=>setOpen(false)}/></ConsoleShell>;}
createRoot(document.getElementById('root')!).render(<Fixture/>);
