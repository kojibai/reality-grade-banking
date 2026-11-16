import type {OpenIdentity} from './native-identity';
import {normalizeEmailRecipient,type ChatConversation,type NativeMessaging} from './native-messaging';
import type {OrganizerContact} from './organizer-types';
import {assertBusinessContextText} from './business-document-context';

export type RelationshipDocumentParties=Readonly<{issuerName:string;issuerDetails:string;clientName:string;clientDetails:string}>;
export type RelationshipDocumentPartiesInput={
 identity:Pick<OpenIdentity,'username'|'knownProfile'|'knownOrganizer'|'knownOrganizerDisplay'|'walletReceivingAddress'|'confirmedAccountUsername'|'accountUsername'>;
 api:Pick<NativeMessaging,'accountUid'>;
 conversation:ChatConversation;
 isCurrent():boolean;
};
function businessText(value:unknown,max=1000):string{
 if(typeof value!=='string'||value.length>max||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value))return '';
 try{assertBusinessContextText(value);return value.trim();}catch{return '';}
}
const email=(value:unknown)=>typeof value==='string'?normalizeEmailRecipient(businessText(value,254))??'':'';
const emails=(contact:OrganizerContact)=>[...new Set([contact.email,...(Array.isArray(contact.emails)?contact.emails:[])].map(email).filter(Boolean))];
const unique=(rows:OrganizerContact[])=>rows.length===1?rows[0]:null;
function contactDetails(contact:OrganizerContact|null,correspondentEmail=''):string{
 const phones=contact?[contact.phone,...(Array.isArray(contact.phones)?contact.phones:[])].map(value=>businessText(value,200)):[];
 const addresses=contact?emails(contact):[],company=businessText(contact?.company),location=businessText(contact?.location);
 // Keep known primary delivery fields first when space is scarce. Add only
 // complete source fields; never cut an address or phone number to fit.
 const accepted=new Set<string>();let size=0;
 for(const value of [addresses[0],correspondentEmail,phones[0],company,location,...addresses.slice(1),...phones.slice(1)]){
  if(!value||accepted.has(value)||size+value.length+(accepted.size?1:0)>1200)continue;
  size+=value.length+(accepted.size?1:0);accepted.add(value);
 }
 return [...new Set([company,...addresses,correspondentEmail,...phones,location].filter(value=>accepted.has(value)))].join('\n');
}
/** Called only for explicit document creation. The native organizer currently
 * exposes a full-catalog contacts read, so missing contact details stay blank.
 * Its admitted held display is sufficient; opening organizer access or reading
 * the catalog here would add an unrelated prerequisite to document creation. */
export async function resolveRelationshipDocumentParties(input:RelationshipDocumentPartiesInput):Promise<RelationshipDocumentParties>{
 const {identity,api,conversation}=input,ownerUid=api.accountUid,conversationId=conversation.id;
 const assertCurrent=()=>{
  if(!input.isCurrent()||!ownerUid||api.accountUid!==ownerUid||input.identity!==identity||input.conversation!==conversation||conversation.id!==conversationId)throw Error('RELATIONSHIP_DOCUMENT_CONTEXT_CHANGED');
  const walletUid=identity.walletReceivingAddress?.();if(walletUid&&walletUid!==ownerUid)throw Error('RELATIONSHIP_DOCUMENT_OWNER_MISMATCH');
 };
 assertCurrent();
 const profile=identity.knownProfile?.(),organizer=identity.knownOrganizer?.(),display=identity.knownOrganizerDisplay?.(),channel=conversation.emailChannel;
 if(profile&&profile.userId!==ownerUid||organizer&&organizer.accountUid!==ownerUid||display&&display.accountUid!==ownerUid||channel&&channel.ownerUserId!==ownerUid)throw Error('RELATIONSHIP_DOCUMENT_OWNER_MISMATCH');
 assertCurrent();
 const contacts=organizer?.knownContacts()??display?.contacts??[],ownContact=unique(contacts.filter(row=>row.linkedUserId===ownerUid));
 const issuerName=businessText(profile?.displayName,160)||businessText(ownContact?.fullName,160)||businessText(profile?.username,160)||businessText(identity.confirmedAccountUsername?.(),160)||businessText(identity.accountUsername?.(),160)||businessText(identity.username,160);
 const issuerDetails=contactDetails(ownContact);
 if(conversation.kind==='group'){
  assertCurrent();return{issuerName,issuerDetails,clientName:businessText(conversation.title,160)?conversation.title:'',clientDetails:''};
 }
 const peers=[...new Map(conversation.members.filter(person=>person.kind==='user'&&person.userId!==ownerUid).map(person=>[person.userId,person])).values()];
 const supportedChannel=channel&&(channel.schema==='receiz.chat.email-channel.v1'||channel.schema==='receiz.chat.email-channel.v2')?channel:null;
 const correspondent=supportedChannel&&conversation.emailCorrespondent?.kind==='user'&&conversation.emailCorrespondent.userId!==ownerUid?conversation.emailCorrespondent:null;
 if(supportedChannel?.correspondentUserId===ownerUid||supportedChannel?.correspondentUserId&&correspondent&&supportedChannel.correspondentUserId!==correspondent.userId)throw Error('RELATIONSHIP_DOCUMENT_CONTEXT_CHANGED');
 const peer=supportedChannel?.correspondentUserId?correspondent??peers.find(person=>person.userId===supportedChannel.correspondentUserId)??null:correspondent??(peers.length===1?peers[0]:null),peerUid=supportedChannel?.correspondentUserId||peer?.userId||'',correspondentEmail=email(supportedChannel?.correspondentEmail);
 const uidMatches=peerUid?contacts.filter(row=>row.linkedUserId===peerUid):[];
 let clientContact=unique(uidMatches);
 if(!uidMatches.length&&correspondentEmail){
  // A conflicting linked native user cannot be reassigned by an email match.
  const matches=contacts.filter(row=>emails(row).includes(correspondentEmail));
  const candidate=unique(matches);
  if(candidate&&candidate.linkedUserId!==ownerUid&&(!peerUid||!candidate.linkedUserId||candidate.linkedUserId===peerUid))clientContact=candidate;
 }
 const clientName=businessText(clientContact?.fullName,160)||businessText(peer?.displayName,160)||businessText(supportedChannel?.displayName,160)||businessText(peer?.username,160)||businessText(conversation.title,160);
 const result={issuerName,issuerDetails,clientName,clientDetails:contactDetails(clientContact,correspondentEmail)};
 assertCurrent();return result;
}
