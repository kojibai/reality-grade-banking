import {lazy,Suspense} from 'react';
import {readWorkspaceFile} from '../../receiz/workspace-file-share';
import {readChatDocument,isChatDocumentBody,isChatDocumentSignatureBody} from '../../receiz/chat-document';
import {PaymentMessage} from './PaymentMessage';
import {MessageAppointment} from './MessageAppointment';
import {isChatProposalBody,isProposalEventBody,readChatProposal} from '../../receiz/chat-proposal';
import type {OpenIdentity} from '../../receiz/native-identity';
import type {ChatConversation,ChatMessage,NativeMessaging} from '../../receiz/native-messaging';
const WorkspaceFileCard=lazy(()=>import('./WorkspaceFileCard').then(m=>({default:m.WorkspaceFileCard})));
const DocumentCard=lazy(()=>import('./documents/DocumentCard').then(m=>({default:m.DocumentCard})));
const ProposalCard=lazy(()=>import('./proposals/ProposalCard').then(m=>({default:m.ProposalCard})));
export function RelationshipMessage({identity,api,message,messages,thread,accountUid,onUpdated,isCurrent}:{identity:OpenIdentity;api:NativeMessaging|null;message:ChatMessage;messages:readonly ChatMessage[];thread:ChatConversation|null;accountUid:string;onUpdated():void;isCurrent():boolean}){
 if(api&&readWorkspaceFile(message))return <Suspense fallback={<p>Shared document</p>}><WorkspaceFileCard api={api} message={message} isCurrent={isCurrent}/></Suspense>;
 const document=readChatDocument(message);
 if(document&&api)return <Suspense fallback={<p>{document.title}</p>}><DocumentCard identity={identity} api={api} message={message} messages={messages} onUpdated={onUpdated} isCurrent={isCurrent}/></Suspense>;
 if(isChatDocumentBody(message.body))return <p>This document could not be opened. Ask the sender to check it.</p>;
 if(isChatDocumentSignatureBody(message.body))return <p className="bank-proposal-activity">Agreement signature available · Open the agreement to verify</p>;
 const proposal=readChatProposal(message);
 if(proposal&&api)return <Suspense fallback={<p>{proposal.draft.title}</p>}><ProposalCard identity={identity} api={api} message={message} messages={messages} onUpdated={onUpdated} isCurrent={isCurrent}/></Suspense>;
 if(isChatProposalBody(message.body))return <p>This proposal could not be opened. Ask the sender to review it.</p>;
 // Participant statements are summarized against their exact proposal by its
 // card. This timeline label grants no acceptance, payment or proof authority.
 if(isProposalEventBody(message.body))return <p className="bank-proposal-activity">Proposal activity · See proposal details</p>;
 return <><PaymentMessage message={message} accountUid={accountUid} members={thread?.members??[]}/>{identity.organizer&&<MessageAppointment identity={identity} accountUid={accountUid} message={message} attendees={thread?.emailChannel?.correspondentEmail?[thread.emailChannel.correspondentEmail]:[]} title={thread?.title??'Appointment'}/>}</>;
}
