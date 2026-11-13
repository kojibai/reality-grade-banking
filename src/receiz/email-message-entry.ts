import {openVerifiedInvitationAccount} from './pbi-account';
export type EmailMessageObservation={ok:true;recipient:{userId:string;email:string};invitation:{conversationId:string;messageId:string;callId?:string;mode?:'voice'|'video'}};
export type EmailMessageEntryState=EmailMessageObservation|{ok:true;pending:true;autoContinue:boolean}|{ok:true;invitation:false};
const base='/api/bank/native/email-message/';
const verifiedEntries=new WeakSet<object>();
export function isVerifiedEmailMessageEntry(value:unknown,accountUid?:string|null):value is EmailMessageObservation{return !!value&&typeof value==='object'&&verifiedEntries.has(value)&&(!accountUid||(value as EmailMessageObservation).recipient.userId===accountUid);}
const uuid=(value:unknown):value is string=>typeof value==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value);
async function request(operation:'state'|'open'|'adopt'){
 const mutation=operation!=='state',response=await fetch(base+operation,{method:mutation?'POST':'GET',credentials:'same-origin',redirect:'error',cache:'no-store',headers:mutation?{'Content-Type':'application/json',Accept:'application/json'}:{Accept:'application/json'},...(mutation?{body:'{}'}:{}),signal:AbortSignal.timeout(60000)});
 const value=await response.json();if(!response.ok||value?.ok!==true)throw Error('This message could not be opened. Use the original message email and try again.');return value;
}
function observation(value:EmailMessageObservation):EmailMessageObservation{
 if(value.invitation&&(value.invitation.callId!==undefined||value.invitation.mode!==undefined)&&(!uuid(value.invitation.callId)||!['voice','video'].includes(String(value.invitation.mode))))throw Error('This message could not be verified.');
 if(!uuid(value.recipient?.userId)||typeof value.recipient.email!=='string'||value.recipient.email.length>254||value.recipient.email!==value.recipient.email.trim().toLowerCase()||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.recipient.email)||!uuid(value.invitation?.conversationId)||!uuid(value.invitation?.messageId))throw Error('This message could not be verified.');
 return Object.freeze({ok:true as const,recipient:Object.freeze({userId:value.recipient.userId,email:value.recipient.email}),invitation:Object.freeze({conversationId:value.invitation.conversationId,messageId:value.invitation.messageId,...(value.invitation.callId?{callId:value.invitation.callId,mode:value.invitation.mode}:{})})});
}
export async function readEmailMessageEntry():Promise<EmailMessageEntryState>{
 const value=await request('state');
 if(value.invitation===false){if(Object.keys(value).sort().join('|')!=='invitation|ok')throw Error('This message could not be verified.');return{ok:true,invitation:false};}
 if(value.pending===true)return{ok:true,pending:true,autoContinue:value.autoContinue===true};
 return observation(value);
}
let opening:Promise<EmailMessageObservation>|null=null;
/** Email possession selects only the observed account. Canonical SDK account
 * admission and durable device custody must finish before membership adoption. */
export function openEmailMessage():Promise<EmailMessageObservation>{
 if(opening)return opening;
 const work=(async()=>{
  const value=observation(await request('open')),identity=await openVerifiedInvitationAccount(value.recipient.userId);
  try{
   const response=await request('adopt'),adopted=observation(response);
   if(response.adopted!==true||adopted.recipient.userId!==value.recipient.userId||adopted.recipient.email!==value.recipient.email||adopted.invitation.conversationId!==value.invitation.conversationId||adopted.invitation.messageId!==value.invitation.messageId||adopted.invitation.callId!==value.invitation.callId||adopted.invitation.mode!==value.invitation.mode)throw Error('This message could not be verified.');
   verifiedEntries.add(value);return value;
  }finally{identity.dispose();}
 })();
 opening=work;void work.finally(()=>{if(opening===work)opening=null;}).catch(()=>{});return work;
}
export function emailMessageResumePath(value:EmailMessageObservation):string{
 const verified=observation(value),query=new URLSearchParams({bankNotification:'1',conversation:verified.invitation.conversationId,recipient:verified.recipient.userId,message:verified.invitation.messageId,...(verified.invitation.callId?{call:verified.invitation.callId,mode:verified.invitation.mode!}:{})});return '/?'+query+'#account/messages';
}
