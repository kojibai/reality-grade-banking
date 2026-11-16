import {readDocumentBranding,type DocumentBranding} from './document-branding';
import type {BusinessDocumentDraft,BusinessDocumentFormat} from './business-document';
import {readBusinessDocumentDraft} from './business-document';
import type {ProposalSource} from './chat-proposal';
import type {ChatMessage,NativeMessaging} from './native-messaging';
import {loadReceiz} from './client';
import {openCanonicalProofFile} from './proof-capture';
export type DocumentIssuer=Readonly<{userId:string;name:string;username:string;ownerReceizId:string}>;
export type ChatDocumentTerms=Readonly<{schema:'bankeiz.chat.document-terms.v1';id:string;conversationId:string;createdAt:string;issuer:DocumentIssuer;recipients:readonly string[];draft:BusinessDocumentDraft;source:ProposalSource;signatureRequested:boolean;branding?:DocumentBranding}>;
export type ChatDocument=Readonly<{schema:'bankeiz.chat.document.v1';id:string;conversationId:string;createdAt:string;issuer:DocumentIssuer;recipients:readonly string[];kind:'document'|'agreement';signatureRequested:boolean;title:string;summary:string;format:BusinessDocumentFormat;filename:string;mime:string;termsDigest:string;payloadSha256:string;artifactSha256:string}>;
export type ChatDocumentSignature=Readonly<{schema:'bankeiz.chat.document-signature.v1';documentId:string;conversationId:string;termsDigest:string;originalArtifactSha256:string;signatureArtifactSha256:string;signerUid:string}>;
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i,HEX=/^[a-f0-9]{64}$/,PREFIX='Bankeiz document\n',SIGNATURE='Bankeiz document signature\n';
const MIMES={pdf:'application/pdf',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',pptx:'application/vnd.openxmlformats-officedocument.presentationml.presentation'};
const invalid=():never=>{throw Error('CHAT_DOCUMENT_INVALID');};
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v)&&[Object.prototype,null].includes(Object.getPrototypeOf(v));
const text=(v:unknown,n:number,required=true):v is string=>typeof v==='string'&&v.length<=n&&(!required||!!v.trim())&&!/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(v);
function exact(v:Record<string,unknown>,keys:string[]){if(Object.keys(v).some(k=>!keys.includes(k))||keys.some(k=>!Object.hasOwn(v,k)))invalid();}
function parties(issuer:unknown,recipients:unknown){if(!object(issuer))return invalid();exact(issuer,['userId','name','username','ownerReceizId']);if(!UUID.test(String(issuer.userId))||!text(issuer.name,160)||!text(issuer.username,24)||! /^[a-z0-9_]{3,24}$/.test(issuer.username)||!text(issuer.ownerReceizId,256)||!Array.isArray(recipients)||!recipients.length||recipients.length>49||recipients.some(id=>!UUID.test(String(id))||id===issuer.userId)||new Set(recipients).size!==recipients.length)invalid();}
function base(raw:Record<string,unknown>){if(!UUID.test(String(raw.id))||!UUID.test(String(raw.conversationId))||!text(raw.createdAt,40)||!Number.isFinite(Date.parse(raw.createdAt))||new Date(raw.createdAt).toISOString()!==raw.createdAt)invalid();parties(raw.issuer,raw.recipients);}
export function readChatDocumentTerms(raw:unknown):ChatDocumentTerms{
 if(!object(raw))return invalid();exact(raw,['schema','id','conversationId','createdAt','issuer','recipients','draft','source','signatureRequested',...(Object.hasOwn(raw,'branding')?['branding']:[])]);base(raw);if(Object.hasOwn(raw,'branding'))readDocumentBranding(raw.branding);
 const draft=readBusinessDocumentDraft(raw.draft);if(raw.schema!=='bankeiz.chat.document-terms.v1'||typeof raw.signatureRequested!=='boolean'||raw.signatureRequested&&draft.kind!=='agreement')invalid();
 const source=raw.source;if(!object(source))return invalid();exact(source,['messageIds','digest','hasEarlier']);if(!Array.isArray(source.messageIds)||source.messageIds.length>300||source.messageIds.some(id=>!UUID.test(String(id)))||new Set(source.messageIds).size!==source.messageIds.length||!HEX.test(String(source.digest))||typeof source.hasEarlier!=='boolean')invalid();
 if(new TextEncoder().encode(JSON.stringify(raw)).byteLength>65536)invalid();return structuredClone({...raw,draft}) as unknown as ChatDocumentTerms;
}
export async function chatDocumentTermsDigest(terms:ChatDocumentTerms){return(await loadReceiz()).digestReceizCanonicalV122(readChatDocumentTerms(terms));}
function envelope(raw:unknown):ChatDocument{
 if(!object(raw))return invalid();exact(raw,['schema','id','conversationId','createdAt','issuer','recipients','kind','signatureRequested','title','summary','format','filename','mime','termsDigest','payloadSha256','artifactSha256']);base(raw);
 if(raw.schema!=='bankeiz.chat.document.v1'||!['document','agreement'].includes(String(raw.kind))||typeof raw.signatureRequested!=='boolean'||raw.signatureRequested&&raw.kind!=='agreement'||!text(raw.title,160)||!text(raw.summary,2000,false)||!Object.hasOwn(MIMES,String(raw.format))||raw.mime!==MIMES[raw.format as BusinessDocumentFormat]||!text(raw.filename,140)||/[\x00-\x1f\x7f/\\<>]/.test(raw.filename)||![raw.termsDigest,raw.payloadSha256,raw.artifactSha256].every(v=>HEX.test(String(v))))invalid();return structuredClone(raw) as ChatDocument;
}
function wire(prefix:string,value:unknown){const body=prefix+JSON.stringify(value);if(new TextEncoder().encode(JSON.stringify({body})).byteLength>12000)throw Error('CHAT_DOCUMENT_CAPACITY');return body;}
export const isChatDocumentBody=(body:string)=>body.startsWith(PREFIX);
export const isChatDocumentSignatureBody=(body:string)=>body.startsWith(SIGNATURE);
export function chatDocumentMessageBody(document:ChatDocument){return wire(PREFIX,envelope(document));}
export function readChatDocument(message:ChatMessage):ChatDocument|null{
 if(message.senderKind!=='user'||!isChatDocumentBody(message.body))return null;try{const value=envelope(JSON.parse(message.body.slice(PREFIX.length)));if(value.conversationId!==message.conversationId||value.issuer.userId!==message.senderUserId||message.walletTransfer?.kind!=='chat_attachment'||message.walletTransfer.sha256Hex!==value.artifactSha256)return null;return value;}catch{return null;}
}
export async function createChatDocumentEnvelope(terms:ChatDocumentTerms,payload:File,original:File):Promise<ChatDocument>{
 const value=readChatDocumentTerms(terms),opened=await openCanonicalProofFile(original),bytes=new Uint8Array(await payload.arrayBuffer()),sha=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(n=>n.toString(16).padStart(2,'0')).join('');
 if(opened.legacyCompatibility!=='current-native'||opened.sealedArtifact.continuity.ownerReceizId!==value.issuer.ownerReceizId||opened.verifiedPayload.sha256!==sha)throw Error('CHAT_DOCUMENT_ORIGINAL_MISMATCH');
 const {readBusinessDocumentMetadata}=await import('./business-document'),embedded=readChatDocumentTerms(JSON.parse(await readBusinessDocumentMetadata(opened.verifiedPayload.bytes,payload.type)));if(await chatDocumentTermsDigest(embedded)!==await chatDocumentTermsDigest(value))throw Error('CHAT_DOCUMENT_TERMS_CHANGED');
 const format=Object.entries(MIMES).find(([,mime])=>mime===payload.type)?.[0] as BusinessDocumentFormat|undefined;if(!format)invalid();
 return envelope({schema:'bankeiz.chat.document.v1',id:value.id,conversationId:value.conversationId,createdAt:value.createdAt,issuer:value.issuer,recipients:value.recipients,kind:value.draft.kind,signatureRequested:value.signatureRequested,title:value.draft.title,summary:value.draft.summary,format,filename:payload.name,mime:payload.type,termsDigest:await chatDocumentTermsDigest(value),payloadSha256:sha,artifactSha256:opened.sealedArtifact.artifactSha256});
}
const openedDocuments=new WeakMap<NativeMessaging,Map<string,Promise<{document:ChatDocument;terms:ChatDocumentTerms;payload:File;original:File;digest:string}>>>();
export async function verifyChatDocument(api:NativeMessaging,message:ChatMessage){
 const document=readChatDocument(message);if(!document)throw Error('CHAT_DOCUMENT_INVALID');let cache=openedDocuments.get(api);if(!cache){cache=new Map();openedDocuments.set(api,cache);}const key=JSON.stringify([message.id,document]);let pending=cache.get(key);
 if(!pending){pending=(async()=>{const original=await api.attachment(document.conversationId,message.id),opened=await openCanonicalProofFile(original);if(opened.legacyCompatibility!=='current-native'||opened.sealedArtifact.artifactSha256!==document.artifactSha256||opened.verifiedPayload.sha256!==document.payloadSha256||opened.sealedArtifact.continuity.ownerReceizId!==document.issuer.ownerReceizId)throw Error('CHAT_DOCUMENT_ORIGINAL_MISMATCH');const {readBusinessDocumentMetadata}=await import('./business-document'),terms=readChatDocumentTerms(JSON.parse(await readBusinessDocumentMetadata(opened.verifiedPayload.bytes,document.mime))),digest=await chatDocumentTermsDigest(terms);if(digest!==document.termsDigest||terms.id!==document.id||terms.conversationId!==document.conversationId||JSON.stringify(terms.issuer)!==JSON.stringify(document.issuer)||JSON.stringify(terms.recipients)!==JSON.stringify(document.recipients)||terms.signatureRequested!==document.signatureRequested||terms.draft.kind!==document.kind||terms.draft.title!==document.title||terms.draft.summary!==document.summary)throw Error('CHAT_DOCUMENT_TERMS_CHANGED');const payload=new File([new Uint8Array(opened.verifiedPayload.bytes)],document.filename,{type:document.mime});return{document,terms,payload,original,digest};})();cache.set(key,pending);void pending.catch(()=>{if(cache!.get(key)===pending)cache!.delete(key);});}
 return pending;
}
function signature(raw:unknown):ChatDocumentSignature{if(!object(raw))return invalid();exact(raw,['schema','documentId','conversationId','termsDigest','originalArtifactSha256','signatureArtifactSha256','signerUid']);if(raw.schema!=='bankeiz.chat.document-signature.v1'||![raw.documentId,raw.conversationId,raw.signerUid].every(v=>UUID.test(String(v)))||![raw.termsDigest,raw.originalArtifactSha256,raw.signatureArtifactSha256].every(v=>HEX.test(String(v))))invalid();return structuredClone(raw) as ChatDocumentSignature;}
export function documentSignatureMessageBody(value:ChatDocumentSignature){return wire(SIGNATURE,signature(value));}
/** Native locator only. A signature is shown as verified only after the actual
 * signer-owned Original passes document-consent's enclosing-artifact verifier. */
export function readChatDocumentSignature(message:ChatMessage,document:ChatDocument):ChatDocumentSignature|null{
 if(message.senderKind!=='user'||!isChatDocumentSignatureBody(message.body))return null;try{const value=signature(JSON.parse(message.body.slice(SIGNATURE.length)));if(message.conversationId!==document.conversationId||value.conversationId!==document.conversationId||value.documentId!==document.id||value.termsDigest!==document.termsDigest||value.originalArtifactSha256!==document.artifactSha256||value.signerUid!==message.senderUserId||![document.issuer.userId,...document.recipients].includes(value.signerUid)||message.walletTransfer?.kind!=='chat_attachment'||message.walletTransfer.sha256Hex!==value.signatureArtifactSha256)return null;return value;}catch{return null;}
}
