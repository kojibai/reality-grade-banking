import {useState} from 'react';import {createRoot} from 'react-dom/client';
import {Sheet} from '../../src/components/Sheet';import {LiveSend} from '../../src/features/account/LivePayments';
import {MessagesPanel} from '../../src/features/messages/MessagesPanel';import {ConsoleShell} from '../../src/components/ConsoleShell';
import {createNativeMessaging,type ChatConversation,type ChatMessage} from '../../src/receiz/native-messaging';import {createNativeTwin} from '../../src/receiz/native-twin';import type {OpenIdentity} from '../../src/receiz/native-identity';
import '../../src/styles/tokens.css';import '../../src/styles/app.css';import '../../src/styles/features.css';
const owner='11111111-1111-4111-8111-111111111111',peer='22222222-2222-4222-8222-222222222222',threadId='33333333-3333-4333-8333-333333333333';let approved=false;
const person={kind:'user' as const,userId:peer,username:'mira',displayName:'Mira',avatarUrl:null};
const rows:ChatMessage[]=[{id:'44444444-4444-4444-8444-444444444444',conversationId:threadId,senderUserId:peer,senderKind:'user',senderAiId:null,senderDisplay:'Mira',body:'The original stays connected to its history.',createdAt:'2026-10-19T16:15:00Z',receizedAt:'2026-10-19T16:15:00Z',receipt:{},sealedOriginalAvailable:false}];
rows.push({...rows[0],id:'66666666-6666-4666-8666-666666666666',senderUserId:owner,senderDisplay:'You',body:'Transferred $25.00 to @mira',walletTransfer:{kind:'chat_transfer',transferId:'fixture-payment',senderUserId:owner,recipientUserId:peer,amountUsdCents:'2500',amountPhiMicro:'123456',note:'Lunch',transactionHref:'/transactions/fixture-payment'}});
const conversations:ChatConversation[]=[{id:threadId,kind:'dm',title:'Mira',members:[person],aiAgents:[],defaultAiId:null,unreadCount:1,previewMessage:rows[0],createdAt:rows[0].createdAt,updatedAt:rows[0].createdAt,lastMessageAt:rows[0].createdAt}];
const json=(value:unknown)=>Response.json(value);
// Controlled HTTP-contract fixture. Production adapters and components are real;
// all data below is synthetic and there is no external network or private account.
const request=async(path:string,init?:RequestInit)=>{
 const body=typeof init?.body==='string'?JSON.parse(init.body):{};
 if(path.includes('/api/developers/twin/'))return json({ok:true,requestId:body.requestId,world:{username:'fixture_owner'},reply:{message:'The receipt keeps the recorded payment and its funding history together. Open the original record to inspect its sources.',source:'upstream',memoryScope:'relationship',actions:[],memory:[]}});
 if(path.includes('/users/search'))return json({ok:true,users:[person,{...person,userId:'55555555-5555-4555-8555-555555555555',username:'alex',displayName:'Alex'}]});
 if(path==='/api/chat/conversations'&&init?.method==='POST'){const id=crypto.randomUUID();conversations.unshift({...conversations[0],id,kind:body.kind,title:body.title||'New conversation',previewMessage:null});return json({ok:true,conversation:{id}});}
 if(path==='/api/chat/conversations')return json({ok:true,conversations});
 if(path.endsWith('/calls'))return json({ok:true,calls:[],activeCall:null});
 const thread=/conversations\/([^/]+)\//.exec(path)?.[1]??threadId;
 if(path.includes('/messages')&&init?.method==='POST'){const message={...rows[0],id:crypto.randomUUID(),conversationId:thread,senderUserId:owner,senderDisplay:'You',body:body.body,createdAt:new Date().toISOString()};rows.push(message);if(path.endsWith('/stream'))return new Response('data: '+JSON.stringify({type:'user_message',message})+'\n\ndata: {"type":"done"}\n\n',{headers:{'content-type':'text/event-stream'}});return json({ok:true,message});}
 if(path.includes('/messages'))return json({ok:true,conversation:conversations.find(c=>c.id===thread),messages:rows.filter(m=>m.conversationId===thread),hasMore:false,nextCursor:null});
 return new Response('{"ok":false,"error":"fixture_call_unavailable"}',{status:503});
};
const api=Object.assign(createNativeMessaging({request,accountUid:owner}),{twin:createNativeTwin({request,accountUid:owner,username:'fixture_owner',assertOpen(){}})});
const identity={walletSend:async()=>({status:async()=>null,prepare:async()=>{throw Error('Controlled preview: no payment executed.');}}),messaging:async(approval=false)=>{if(!approved&&!approval)throw Error('MESSAGING_CONSENT_REQUIRED');approved=true;return api;}} as unknown as OpenIdentity;
function Fixture(){const[open,setOpen]=useState(true),[payment,setPayment]=useState<{recipient?:{userId:string;username:string}}|null>(null);return<ConsoleShell panel="account" onNavigate={()=>{}} onDeposit={()=>{}} onProfile={()=>{}} onMessages={()=>setOpen(true)}><p style={{fontSize:12,color:'#7d8b9d'}}>Integration fixture · synthetic data · no real messages or calls</p><h1>Your conversations</h1><MessagesPanel identity={identity} active={open&&!payment} onPreparePayment={recipient=>setPayment({recipient})} onClose={()=>setOpen(false)} twinContextRecords={[{id:'fixture-record',title:'Recorded payment · $25.00',text:'Synthetic Bank display excerpt: a recorded $25.00 payment.'}]}/>{payment&&<Sheet title="Send" onClose={()=>setPayment(null)}><LiveSend identity={identity} wallet={null} initialRecipient={payment.recipient} onClose={()=>setPayment(null)}/></Sheet>}</ConsoleShell>;}
createRoot(document.getElementById('root')!).render(<Fixture/>);
