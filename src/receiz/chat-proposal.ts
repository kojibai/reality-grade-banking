import {readFixedSaleFields,type FixedSale} from './fixed-checkout';
import {loadReceiz} from './client';
import {readDocumentBranding,type DocumentBranding} from './document-branding';
import type {ChatMessage} from './native-messaging';

import {proposalTotal,readProposalDraft} from './proposal-draft';
import type {ProposalDraft} from './proposal-draft';
export {proposalTotal,readEditableProposalDraft,readProposalDraft,readGeneratedProposalDraft} from './proposal-draft';
export type {ProposalItem,ProposalDraft} from './proposal-draft';
export type ProposalSource=Readonly<{messageIds:readonly string[];digest:string;hasEarlier:boolean}>;
export type ProposalIssuer=Readonly<{userId:string;name:string;username:string;email?:string;website?:string}>;
export type ChatProposal=Readonly<{schema:'bankeiz.chat.proposal.v1';id:string;conversationId:string;createdAt:string;issuer:ProposalIssuer;recipients:readonly string[];draft:ProposalDraft;source:ProposalSource;fixedSale:FixedSale;branding?:DocumentBranding}>;
export type ProposalEvent=Readonly<{schema:'bankeiz.chat.proposal-event.v1';proposalId:string;proposalDigest:string;conversationId:string;kind:'accepted'|'declined'|'withdrawn'|'delivery'|'received';note?:string}>;
const PREFIX='Bankeiz proposal\n',EVENT='Bankeiz proposal update\n';
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i,HEX=/^[a-f0-9]{64}$/;
const fail=():never=>{throw Error('PROPOSAL_INPUT_INVALID');};
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v)&&[Object.prototype,null].includes(Object.getPrototypeOf(v));
const text=(v:unknown,max:number,required=true):v is string=>typeof v==='string'&&v.length<=max&&(!required||!!v.trim())&&!/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(v);
function exact(v:Record<string,unknown>,fields:readonly string[]){if(Object.keys(v).some(k=>!fields.includes(k)))fail();}
const instant=(v:unknown):v is string=>typeof v==='string'&&v.length<=40&&/^\d{4}-\d\d-\d\dT/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString()===v;
export function createChatProposal(input:Omit<ChatProposal,'schema'>|ChatProposal):ChatProposal{
 if(!object(input))return fail();exact(input,['schema','id','conversationId','createdAt','issuer','recipients','draft','source','fixedSale','branding']);
 if(Object.hasOwn(input,'branding'))readDocumentBranding(input.branding);
 if('schema'in input&&input.schema!==undefined&&input.schema!=='bankeiz.chat.proposal.v1'||!UUID.test(input.id)||!UUID.test(input.conversationId)||!instant(input.createdAt)||!object(input.issuer)||!UUID.test(String(input.issuer.userId))||!text(input.issuer.name,160)||!text(input.issuer.username,24)||!/^[a-z0-9_]{3,24}$/.test(input.issuer.username)||!Array.isArray(input.recipients)||!input.recipients.length||input.recipients.length>49||input.recipients.some(id=>!UUID.test(id)||id===input.issuer.userId)||new Set(input.recipients).size!==input.recipients.length)return fail();
 exact(input.issuer,['userId','name','username','email','website']);if(input.issuer.email!==undefined&&!text(input.issuer.email,254)||input.issuer.website!==undefined&&!text(input.issuer.website,2048))return fail();
 const draft=readProposalDraft(input.draft),source=input.source;if(!object(source)||!Array.isArray(source.messageIds)||source.messageIds.length>300||source.messageIds.some(id=>!UUID.test(String(id)))||new Set(source.messageIds).size!==source.messageIds.length||!HEX.test(String(source.digest))||typeof source.hasEarlier!=='boolean')return fail();exact(source,['messageIds','digest','hasEarlier']);
 if(!object(input.fixedSale)||!HEX.test(String(input.fixedSale.digest)))return fail();const {digest,...fields}=input.fixedSale;readFixedSaleFields(fields);
 if(input.fixedSale.recipientUserId!==input.issuer.userId||input.fixedSale.username!==input.issuer.username||input.fixedSale.saleId!==input.id||input.fixedSale.amountUsdCents!==proposalTotal(draft.items))return fail();
 return structuredClone({...input,schema:'bankeiz.chat.proposal.v1',draft}) as ChatProposal;
}
// Reserve room for the exact native attachment credential and metadata. The
// transport also enforces its final encoded request size before any POST.
function wire(prefix:string,value:unknown){const body=prefix+JSON.stringify(value);if(new TextEncoder().encode(JSON.stringify({body})).length>12000)throw Error('PROPOSAL_MESSAGE_CAPACITY');return body;}
export const isChatProposalBody=(body:string)=>body.startsWith(PREFIX);
export function proposalMessageBody(proposal:ChatProposal){return wire(PREFIX,createChatProposal(proposal));}
export function readChatProposal(message:ChatMessage):ChatProposal|null{
 if(!isChatProposalBody(message.body)||message.senderKind!=='user')return null;
 try{const p=createChatProposal(JSON.parse(message.body.slice(PREFIX.length)));if(p.conversationId!==message.conversationId||p.issuer.userId!==message.senderUserId)return null;return p;}catch{return null;}
}
export async function proposalContentDigest(proposal:ChatProposal){return(await loadReceiz()).digestReceizCanonicalV122(createChatProposal(proposal));}
function event(raw:unknown):ProposalEvent{
 if(!object(raw))return fail();exact(raw,['schema','proposalId','proposalDigest','conversationId','kind','note']);
 if(raw.schema!=='bankeiz.chat.proposal-event.v1'||!UUID.test(String(raw.proposalId))||!HEX.test(String(raw.proposalDigest))||!UUID.test(String(raw.conversationId))||!['accepted','declined','withdrawn','delivery','received'].includes(String(raw.kind))||raw.note!==undefined&&!text(raw.note,2000,false))return fail();return structuredClone(raw) as ProposalEvent;
}
export const isProposalEventBody=(body:string)=>body.startsWith(EVENT);
export function proposalEventBody(value:ProposalEvent){return wire(EVENT,event(value));}
export function readProposalEvent(message:ChatMessage,proposal:ChatProposal,digest:string):ProposalEvent|null{
 if(!isProposalEventBody(message.body)||message.senderKind!=='user')return null;
 try{const value=event(JSON.parse(message.body.slice(EVENT.length))),issuer=message.senderUserId===proposal.issuer.userId,recipient=proposal.recipients.includes(message.senderUserId);
  if(message.conversationId!==proposal.conversationId||value.conversationId!==proposal.conversationId||value.proposalId!==proposal.id||value.proposalDigest!==digest||Date.parse(message.createdAt)<Date.parse(proposal.createdAt))return null;
  if(['accepted','declined','received'].includes(value.kind)&&!recipient||['delivery','withdrawn'].includes(value.kind)&&!issuer||value.kind==='delivery'&&message.walletTransfer?.kind!=='chat_attachment')return null;return value;
 }catch{return null;}
}
/** UI projection of authenticated native statements, never payment authority. */
export function projectProposalEvents(proposal:ChatProposal,digest:string,messages:readonly ChatMessage[]){
 const accepted=new Set<string>(),declined=new Set<string>(),received=new Set<string>(),deliveryMessageIds:string[]=[],seen=new Set<string>();let withdrawn=false;
 for(const message of messages){if(seen.has(message.id))continue;seen.add(message.id);const value=readProposalEvent(message,proposal,digest);if(!value||message.senderKind!=='user')continue;
  if(value.kind==='accepted'){accepted.add(message.senderUserId);declined.delete(message.senderUserId);}if(value.kind==='declined'){declined.add(message.senderUserId);accepted.delete(message.senderUserId);}if(value.kind==='received')received.add(message.senderUserId);if(value.kind==='delivery')deliveryMessageIds.push(message.id);if(value.kind==='withdrawn')withdrawn=true;
 }
 return{acceptedBy:[...accepted],declinedBy:[...declined],receivedBy:[...received],deliveryMessageIds,withdrawn};
}
