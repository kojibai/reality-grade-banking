import {emailReplyDisplay} from './email-reply-display';
import {accountCreationPresentation,accountPersonName} from './account-presentation';
import type {ChatConversation,ChatMessage,ChatPage,ChatPerson,ChatEmailChannel} from './native-messaging';
import {profileAvatarUrl} from './profile-avatar';
import {retainedChatAttachment} from './chat-attachment';
import {isOwnerTwinThreadKey} from './twin-conversations';

/** Optional display retention, never an artifact, grant, outbox or payment source. */
export type TwinAccessQuestion={id:string;question:string};
export type OwnerDocumentWorkDisplay={threadKey:string;value:Record<string,unknown>};
export type ProposalDraftDisplay={conversationId:string;value:Record<string,unknown>};
export const PROPOSAL_DRAFT_MAX_BYTES=32*1024,PROPOSAL_DRAFT_MAX_ENTRIES=30;
const conversationIdPattern=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
/** UI draft JSON only. Domain content is validated by the proposal editor. */
export function readProposalDraftDisplayValue(value:unknown):Record<string,unknown>|null {
 try{
  if(value===null||typeof value!=='object'||Array.isArray(value))return null;
  const ancestors=new Set<object>();let nodes=0;
  const valid=(entry:unknown,depth:number):boolean=>{
   if(++nodes>4096||depth>24)return false;
   if(entry===null||typeof entry==='string'||typeof entry==='boolean')return true;
   if(typeof entry==='number')return Number.isFinite(entry);
   if(typeof entry!=='object'||ancestors.has(entry))return false;
   const array=Array.isArray(entry),prototype=Object.getPrototypeOf(entry);
   if(array?prototype!==Array.prototype:prototype!==Object.prototype&&prototype!==null)return false;
   if(Object.getOwnPropertySymbols(entry).length)return false;
   const properties=Object.getOwnPropertyDescriptors(entry);ancestors.add(entry);
   try{
    if(array){if(entry.length>4096)return false;let bytes=entry.length>0;for(let i=0;i<entry.length;i++){const property=properties[String(i)];if(!property||!('value'in property))return false;const item=property.value;bytes=bytes&&typeof item==='number'&&Number.isInteger(item)&&item>=0&&item<=255;}if(bytes)return false;}
    for(const [key,property]of Object.entries(properties)){
     if(array&&key==='length')continue;
     if(!property.enumerable||!('value'in property)||array&&! /^(0|[1-9]\d*)$/.test(key)||/token|password|passphrase|secret|credential|authorization|privatekey|artifactbytes|filebytes|^bytes$|^file$|^constructor$|^prototype$|^proto$/.test(key.toLowerCase().replace(/[^a-z]/g,''))||!valid(property.value,depth+1))return false;
    }
    return true;
   }finally{ancestors.delete(entry);}
  };
  if(!valid(value,0))return null;const raw=JSON.stringify(value);if(new TextEncoder().encode(raw).byteLength>PROPOSAL_DRAFT_MAX_BYTES)return null;return JSON.parse(raw) as Record<string,unknown>;
 }catch{return null;}
}
function proposalDrafts(value:unknown):ProposalDraftDisplay[]|null {
 if(value===undefined)return [];
 if(!Array.isArray(value)||value.length>PROPOSAL_DRAFT_MAX_ENTRIES)return null;
 const seen=new Set<string>(),result:ProposalDraftDisplay[]=[];
 for(const entry of value){const row=object(entry),draft=readProposalDraftDisplayValue(row.value);if(typeof row.conversationId!=='string'||!conversationIdPattern.test(row.conversationId)||seen.has(row.conversationId)||!draft||draft.conversationId!==undefined&&draft.conversationId!==row.conversationId)return null;seen.add(row.conversationId);result.push({conversationId:row.conversationId,value:draft});}
 return result;
}
function ownerDocumentWork(value:unknown,ownerUid:string):OwnerDocumentWorkDisplay[]|null{
 if(value===undefined)return[];if(!Array.isArray(value)||value.length>PROPOSAL_DRAFT_MAX_ENTRIES)return null;const seen=new Set<string>(),result:OwnerDocumentWorkDisplay[]=[];
 for(const entry of value){const row=object(entry),work=readProposalDraftDisplayValue(row.value);if(!isOwnerTwinThreadKey(row.threadKey,ownerUid)||seen.has(row.threadKey)||!work||work.threadKey!==row.threadKey||work.ownerUid!==ownerUid)return null;seen.add(row.threadKey);result.push({threadKey:row.threadKey,value:work});}return result;
}
export interface MessagingDisplay {
  schema:'bankeiz.messaging-display.v1';accountUid:string;inbox:ChatConversation[];pages:ChatPage[];
  twinAccess?:boolean;
  emailConversations?:boolean;
  twinAccessQuestions?:TwinAccessQuestion[];
  proposalDrafts?:ProposalDraftDisplay[];
  ownerDocumentWork?:OwnerDocumentWorkDisplay[];
}
export type MessagingDisplaySource=Pick<MessagingDisplay,'accountUid'|'inbox'|'pages'|'twinAccess'|'twinAccessQuestions'|'emailConversations'|'proposalDrafts'|'ownerDocumentWork'>;
export const MESSAGING_DISPLAY_MAX_BYTES=1024*1024;
const encoder=new TextEncoder();
const size=(value:unknown)=>encoder.encode(JSON.stringify(value)).byteLength;
const object=(value:unknown):Record<string,unknown>=>value!==null&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};
const text=(value:unknown,max:number)=>typeof value==='string'?value.slice(0,max):'';
function person(value:ChatPerson):ChatPerson {
  return {...accountCreationPresentation(value as unknown as Record<string,unknown>),kind:value.kind,userId:text(value.userId,200),username:text(value.username,100)||null,displayName:value.kind==='user'?accountPersonName(value):text(value.displayName,200)||null,avatarUrl:profileAvatarUrl(value.avatarUrl),aiAgentId:text(value.aiAgentId,100)||null};
}
function message(value:ChatMessage,preview=false):ChatMessage {
  value=emailReplyDisplay(value);
  const payment=object(value.walletTransfer);
  const walletTransfer=payment.kind==='chat_transfer'?Object.fromEntries(['kind','senderUserId','recipientUserId','amountUsdCents','amountPhiMicro','transferId','note','transactionHref','receiptHref'].filter(key=>typeof payment[key]==='string').map(key=>[key,text(payment[key],key==='note'?280:4096)])):retainedChatAttachment(payment);
  if(value.senderKind==='external-email')return{id:text(value.id,200),conversationId:value.conversationId,senderKind:'external-email',senderUserId:null,senderAiId:null,senderDisplay:text(value.senderDisplay,200)||null,body:text(value.body,preview?1024:262144),createdAt:text(value.createdAt,50),receizedAt:text(value.receizedAt,50),receipt:null,sealedOriginalAvailable:false,walletTransfer:null,transport:{fromEmail:text(value.transport.fromEmail,254),recipientAlias:text(value.transport.recipientAlias,254),...(value.transport.subject?{subject:text(value.transport.subject,998)}:{})}};
  return {id:text(value.id,200),conversationId:value.conversationId,senderUserId:text(value.senderUserId,200),senderKind:value.senderKind,senderAiId:text(value.senderAiId,100)||null,senderDisplay:text(value.senderDisplay,200)||null,body:text(value.body,preview?1024:262144),createdAt:text(value.createdAt,50),receizedAt:text(value.receizedAt,50),receipt:null,sealedOriginalAvailable:false,walletTransfer};
}
function emailChannel(value:ChatEmailChannel|null|undefined):ChatEmailChannel|null{if(!value||!['receiz.chat.email-channel.v1','receiz.chat.email-channel.v2'].includes(value.schema))return null;return{schema:value.schema,ownerUserId:text(value.ownerUserId,200),...(value.correspondentUserId?{correspondentUserId:text(value.correspondentUserId,200)}:{}),correspondentEmail:text(value.correspondentEmail,254),displayName:text(value.displayName,200)||null,subject:text(value.subject,998)};}
function conversation(value:ChatConversation):ChatConversation {
  return {id:value.id,kind:value.kind,emailChannel:emailChannel(value.emailChannel),emailCorrespondent:value.emailCorrespondent?person(value.emailCorrespondent):null,title:text(value.title,1000),members:value.members.slice(0,50).map(person),aiAgents:[],defaultAiId:text(value.defaultAiId,100)||null,unreadCount:value.unreadCount,previewMessage:value.previewMessage?message(value.previewMessage,true):null,createdAt:text(value.createdAt,50),updatedAt:text(value.updatedAt,50),lastMessageAt:text(value.lastMessageAt,50)||null};
}
// Image metadata is optional; it must never evict the conversation or messages.
function withoutAvatars(value:ChatConversation):ChatConversation{return{...value,members:value.members.map(person=>({...person,avatarUrl:null}))};}
export function projectMessagingDisplay(source:MessagingDisplaySource):MessagingDisplay {
  const drafts=proposalDrafts(source.proposalDrafts),work=ownerDocumentWork(source.ownerDocumentWork,source.accountUid);if(!drafts||!work)throw Error('CHAT_PROPOSAL_DRAFT_INVALID');
  const questions=Array.isArray(source.twinAccessQuestions)?source.twinAccessQuestions.slice(-8).map(value=>{const row=object(value);return{id:text(row.id,200),question:text(row.question,1200)};}).filter(row=>row.id&&row.question):[];
  const display:MessagingDisplay={schema:'bankeiz.messaging-display.v1',accountUid:source.accountUid,inbox:[],pages:[],...(typeof source.emailConversations==='boolean'?{emailConversations:source.emailConversations}:{}),...(typeof source.twinAccess==='boolean'?{twinAccess:source.twinAccess}:{}),...(questions.length?{twinAccessQuestions:questions}:{}),...(drafts.length?{proposalDrafts:drafts}:{}),...(work.length?{ownerDocumentWork:work}:{})};
  // Budget the exact UTF-8 JSON bytes once per row. Only descriptive attachment
  // metadata is held; no artifacts, pending writes or credentials are copied.
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
  const v=object(value);return typeof v.id==='string'&&v.id.length<=200&&v.conversationId===conversationId&&['user','ai','external-email'].includes(String(v.senderKind))&&(v.senderKind!=='external-email'||v.senderUserId===null&&v.senderAiId===null&&v.walletTransfer===null&&typeof object(v.transport).fromEmail==='string'&&typeof object(v.transport).recipientAlias==='string')&&typeof v.body==='string'&&v.body.length<=262144&&typeof v.createdAt==='string'&&Number.isFinite(Date.parse(v.createdAt));
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
    pending={...source,...(source.twinAccessQuestions===undefined&&held?.accountUid===source.accountUid?{twinAccessQuestions:held.twinAccessQuestions}:{}),...(source.proposalDrafts===undefined&&held?.accountUid===source.accountUid?{proposalDrafts:held.proposalDrafts}:{}),...(source.ownerDocumentWork===undefined&&held?.accountUid===source.accountUid?{ownerDocumentWork:held.ownerDocumentWork}:{})};
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
    async flushRequired(){
      await flush();
      if(pending)await flush();
      // Display opening remains best effort. An explicit mutation checkpoint
      // must establish that the encrypted vault actually accepted this state.
      if(!isOpen()||!available||pending||serialized!==JSON.stringify(known))throw Error('CHAT_PROPOSAL_DRAFT_NOT_SAVED');
    },
  };
}
