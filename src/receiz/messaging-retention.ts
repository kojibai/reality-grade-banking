import type {ChatConversation,ChatMessage,ChatPage,ChatPerson} from './native-messaging';
import {profileAvatarUrl} from './profile-avatar';

/** Optional display retention, never an artifact, grant, outbox or payment source. */
export type TwinAccessQuestion={id:string;question:string};
export interface MessagingDisplay {
  schema:'bankeiz.messaging-display.v1';accountUid:string;inbox:ChatConversation[];pages:ChatPage[];
  twinAccess?:boolean;
  twinAccessQuestions?:TwinAccessQuestion[];
}
export type MessagingDisplaySource=Pick<MessagingDisplay,'accountUid'|'inbox'|'pages'|'twinAccess'|'twinAccessQuestions'>;
export const MESSAGING_DISPLAY_MAX_BYTES=1024*1024;
const encoder=new TextEncoder();
const size=(value:unknown)=>encoder.encode(JSON.stringify(value)).byteLength;
const object=(value:unknown):Record<string,unknown>=>value!==null&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};
const text=(value:unknown,max:number)=>typeof value==='string'?value.slice(0,max):'';
function person(value:ChatPerson):ChatPerson {
  return {kind:value.kind,userId:text(value.userId,200),username:text(value.username,100)||null,displayName:text(value.displayName,200)||null,avatarUrl:profileAvatarUrl(value.avatarUrl),aiAgentId:text(value.aiAgentId,100)||null};
}
function message(value:ChatMessage,preview=false):ChatMessage {
  const payment=object(value.walletTransfer);
  const walletTransfer=payment.kind==='chat_transfer'?Object.fromEntries(['kind','senderUserId','recipientUserId','amountUsdCents','amountPhiMicro','transferId','note','transactionHref','receiptHref'].filter(key=>typeof payment[key]==='string').map(key=>[key,text(payment[key],key==='note'?280:4096)])):null;
  return {id:text(value.id,200),conversationId:value.conversationId,senderUserId:text(value.senderUserId,200),senderKind:value.senderKind,senderAiId:text(value.senderAiId,100)||null,senderDisplay:text(value.senderDisplay,200)||null,body:text(value.body,preview?1024:262144),createdAt:text(value.createdAt,50),receizedAt:text(value.receizedAt,50),receipt:null,sealedOriginalAvailable:false,walletTransfer};
}
function conversation(value:ChatConversation):ChatConversation {
  return {id:value.id,kind:value.kind,title:text(value.title,1000),members:value.members.slice(0,50).map(person),aiAgents:[],defaultAiId:text(value.defaultAiId,100)||null,unreadCount:value.unreadCount,previewMessage:value.previewMessage?message(value.previewMessage,true):null,createdAt:text(value.createdAt,50),updatedAt:text(value.updatedAt,50),lastMessageAt:text(value.lastMessageAt,50)||null};
}
// Image metadata is optional; it must never evict the conversation or messages.
function withoutAvatars(value:ChatConversation):ChatConversation{return{...value,members:value.members.map(person=>({...person,avatarUrl:null}))};}
export function projectMessagingDisplay(source:MessagingDisplaySource):MessagingDisplay {
  const questions=Array.isArray(source.twinAccessQuestions)?source.twinAccessQuestions.slice(-8).map(value=>{const row=object(value);return{id:text(row.id,200),question:text(row.question,1200)};}).filter(row=>row.id&&row.question):[];
  const display:MessagingDisplay={schema:'bankeiz.messaging-display.v1',accountUid:source.accountUid,inbox:[],pages:[],...(typeof source.twinAccess==='boolean'?{twinAccess:source.twinAccess}:{}),...(questions.length?{twinAccessQuestions:questions}:{})};
  // Budget the exact UTF-8 JSON bytes once per row. No artifacts, attachments,
  // call state, pending writes or credentials are copied into this projection.
  let remaining=MESSAGING_DISPLAY_MAX_BYTES-size(display)-64;
  for(const row of source.inbox.slice(0,256)){
    let next=conversation(row),cost=size(next)+1;if(cost>remaining/2){next=withoutAvatars(next);cost=size(next)+1;}if(cost>remaining/2)break;
    display.inbox.push(next);remaining-=cost;
  }
  for(const row of source.pages.slice(-12).reverse()){
    const next:ChatPage={conversation:conversation(row.conversation),messages:[],hasMore:row.hasMore,nextCursor:row.nextCursor};
    let base=size(next)+128;if(base>remaining){next.conversation=withoutAvatars(next.conversation);base=size(next)+128;}if(base>remaining)continue;remaining-=base;
    // Prefer the newest messages, preserving their original order and IDs.
    for(const entry of row.messages.slice(-100).reverse()){
      const retained=message(entry),cost=size(retained)+1;if(cost>remaining)break;
      next.messages.unshift(retained);remaining-=cost;
    }
    if(next.messages.length<row.messages.length){next.hasMore=true;next.nextCursor=next.messages[0]?.createdAt??row.nextCursor;}
    display.pages.unshift(next);
  }
  return display;
}
function validMessage(value:unknown,conversationId:string):value is ChatMessage {
  const v=object(value);return typeof v.id==='string'&&v.id.length<=200&&v.conversationId===conversationId&&['user','ai'].includes(String(v.senderKind))&&typeof v.body==='string'&&v.body.length<=262144&&typeof v.createdAt==='string'&&Number.isFinite(Date.parse(v.createdAt));
}
function validConversation(value:unknown):value is ChatConversation {
  const v=object(value);return typeof v.id==='string'&&/^[\da-f-]{36}$/i.test(v.id)&&['dm','group'].includes(String(v.kind))&&typeof v.title==='string'&&Array.isArray(v.members)&&v.members.length<=50&&v.members.every(p=>typeof object(p).userId==='string')&&Number.isSafeInteger(v.unreadCount)&&(!v.previewMessage||validMessage(v.previewMessage,v.id));
}
export function readMessagingDisplay(value:unknown,accountUid?:string):MessagingDisplay|null {
  try{
    const v=object(value);
    if(v.schema!=='bankeiz.messaging-display.v1'||typeof v.accountUid!=='string'||!v.accountUid||v.accountUid.length>200||accountUid&&v.accountUid!==accountUid||!Array.isArray(v.inbox)||v.inbox.length>256||!v.inbox.every(validConversation)||!Array.isArray(v.pages)||v.pages.length>12||size(value)>MESSAGING_DISPLAY_MAX_BYTES)return null;
    if(!v.pages.every(entry=>{const page=object(entry);return validConversation(page.conversation)&&Array.isArray(page.messages)&&page.messages.length<=100&&page.messages.every(m=>validMessage(m,(page.conversation as ChatConversation).id))&&typeof page.hasMore==='boolean'&&(page.nextCursor===null||typeof page.nextCursor==='string'&&Number.isFinite(Date.parse(page.nextCursor)));}))return null;
    return projectMessagingDisplay(v as unknown as MessagingDisplay);
  }catch{return null;}
}
export async function openMessagingRetention({load,save,isOpen}:{load:()=>Promise<unknown>;save:(value:MessagingDisplay,expected:unknown)=>Promise<void>;isOpen:()=>boolean}) {
  let previous:unknown=null,available=true;
  try{previous=await load();}catch{/* A later save still has to pass the vault's exact identity/revision checks. */}
  let known=readMessagingDisplay(previous),serialized=JSON.stringify(known),pending:MessagingDisplaySource|null=null,writing:Promise<void>|null=null;
  function capture(source:MessagingDisplaySource){
    if(!isOpen())return;
    const held=pending??known;
    pending={...source,...(source.twinAccessQuestions===undefined&&held?.accountUid===source.accountUid?{twinAccessQuestions:held.twinAccessQuestions}:{})};
    queueMicrotask(()=>{void flush();});
  }
  async function flush():Promise<void>{
    if(writing)return writing;
    const attempt=(async()=>{
      while(pending&&isOpen()){
        const source=pending;pending=null;
        const next=projectMessagingDisplay(source),raw=JSON.stringify(next);known=next;
        if(raw===serialized||!available)continue;
        try{await save(next,previous);previous=next;serialized=raw;}catch{available=false;}
      }
      if(!isOpen())pending=null;
    })();
    writing=attempt;try{await attempt;}finally{if(writing===attempt)writing=null;}
  }
  return {
    known:()=>isOpen()?known:null,
    capture,
    retainTwinAccessQuestions(accountUid:string,questions:readonly TwinAccessQuestion[]){
      const held=pending??known;if(held&&held.accountUid!==accountUid)return;
      capture({...held??{accountUid,inbox:[],pages:[]},twinAccessQuestions:questions.slice(-8)});
    },
    flush,
  };
}
