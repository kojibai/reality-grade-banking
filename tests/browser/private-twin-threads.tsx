import {createRoot} from 'react-dom/client';
import {useState} from 'react';
import {MessagesPanel} from '../../src/features/messages/MessagesPanel';
import {createNativeMessaging} from '../../src/receiz/native-messaging';
import {createNativeTwin} from '../../src/receiz/native-twin';
import type {OpenIdentity} from '../../src/receiz/native-identity';
import '../../src/styles/tokens.css';import '../../src/styles/app.css';import '../../src/styles/features.css';
const owner='33333333-3333-4333-8333-333333333333',legacy=`api:${owner}`,prior=`api:${owner}:11111111-1111-4111-8111-111111111111`;
const row=(threadKey:string,role:'user'|'assistant',body:string)=>({id:crypto.randomUUID(),threadKey,role,body,scope:'relationship',channel:'profile',createdAt:new Date().toISOString()});
const memories=new Map([[legacy,[row(legacy,'user','Plan the studio week'),row(legacy,'assistant','Your studio notes stay in this private conversation.')]], [prior,[row(prior,'user','Prepare the client handover'),row(prior,'assistant','The handover has its own conversation. Exact messages remain available here.')]]]);
const request=async(path:string,init?:RequestInit)=>{
 const url=new URL(path,location.origin),body=typeof init?.body==='string'?JSON.parse(init.body):{};
 if(url.pathname.endsWith('/conversations')&&url.pathname.includes('/twin/')){const threadKey=url.searchParams.get('threadKey');if(threadKey)return Response.json({ok:true,ownerUid:owner,threadKey,entries:(memories.get(threadKey)??[]).map(value=>({...value,coordinate:`owner-twin-memory:${owner}:${value.id}`})),hasMore:false,nextCursor:null,sourceDigest:'a'.repeat(64)});return Response.json({ok:true,ownerUid:owner,threads:[...memories].map(([threadKey,entries])=>({threadKey,title:entries[0]?.body.slice(0,100)||'Conversation',preview:entries.at(-1)?.body.slice(0,180)||'',updatedAt:entries.at(-1)?.createdAt??new Date().toISOString()})),hasMore:false,nextCursor:null});}
 if(url.pathname.endsWith('/message')){const key=body.threadKey??legacy,memory=memories.get(key)??[];memory.push(row(key,'user',body.message),row(key,'assistant','We can work through this here. The exact notes stay in this conversation, separate from your other chats.'));memories.set(key,memory);return Response.json({ok:true,requestId:body.requestId,world:{username:'fixture_owner'},reply:{message:memory.at(-1)!.body,source:'upstream',memoryScope:'relationship',actions:[],memory,cognition:{frame:{owner:{ownerUserId:owner,username:'fixture_owner'},sources:[],policy:{consequentialOutput:'proposal-only'}},proposal:{proposedActions:[]}}}});}
 if(url.pathname==='/api/chat/conversations')return Response.json({ok:true,conversations:[]});
 return Response.json({ok:true,calls:[],activeCall:null,subscriptions:[],enabled:false});
};
const api=Object.assign(createNativeMessaging({accountUid:owner,request}),{twin:createNativeTwin({accountUid:owner,username:'fixture_owner',assertOpen(){},request})});
const identity={knownTwinAccess:()=>true,messaging:async()=>api}as unknown as OpenIdentity;
function Fixture(){const[active,setActive]=useState(true);return <main style={{fontFamily:'sans-serif',padding:32}}><p>Local synthetic verification · no external account or generation request</p><button onClick={()=>setActive(true)}>Open your agent</button><MessagesPanel identity={identity} active={active} onClose={()=>setActive(false)}/></main>;}
createRoot(document.getElementById('root')!).render(<Fixture/>);
