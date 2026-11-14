import type {ChatMessage} from './native-messaging';
import {containsRecipientCapability,projectEmailReplyBody,redactRecipientCapabilities} from './email-reply-body';
const object=(value:unknown):Record<string,unknown>=>value!==null&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};
const digest=(value:unknown):string|null=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value)?value:null;
/** A non-authoritative view. The exact accepted Original is never rewritten. */
export function emailReplyDisplay(message:ChatMessage):ChatMessage{
 if(message.senderKind!=='external-email')return message;
 const source=object(message.sealedOriginal),transport=object(source.transport),prior=object(message.emailReplyDisplay),receipt=object(message.receipt);
 const body=projectEmailReplyBody({text:message.body,html:null,reply:!!(transport.inReplyTo||Array.isArray(transport.references)&&transport.references.length)});
 const senderDisplay=message.senderDisplay===null?null:redactRecipientCapabilities(message.senderDisplay),subject=message.transport.subject===undefined?undefined:redactRecipientCapabilities(message.transport.subject);
 if(body===message.body&&senderDisplay===message.senderDisplay&&subject===message.transport.subject&&!containsRecipientCapability(JSON.stringify(message)))return message;
 return{id:message.id,conversationId:message.conversationId,senderKind:'external-email',senderUserId:null,senderAiId:null,walletTransfer:null,senderDisplay,body,createdAt:message.createdAt,receizedAt:message.receizedAt,receipt:null,sealedOriginalAvailable:false,
  transport:{fromEmail:redactRecipientCapabilities(message.transport.fromEmail),recipientAlias:redactRecipientCapabilities(message.transport.recipientAlias),...(subject===undefined?{}:{subject})},
  emailReplyDisplay:{schema:'receiz.chat.email-reply-display.v1',displayOnly:true,sourcePayloadDigest:digest(source.payloadDigest)||digest(prior.sourcePayloadDigest)||digest(receipt.payloadDigest),sourceReceiptDigest:digest(source.receiptDigest)||digest(prior.sourceReceiptDigest)||digest(receipt.digest),sourceMimeSha256:digest(object(source.mime).sha256)||digest(prior.sourceMimeSha256)}};
}
