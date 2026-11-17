import type {OpenIdentity} from './native-identity';
import type {NativeMessaging} from './native-messaging';
import type {RecordProofExportDescriptor} from './record-proof-export';
import {openCanonicalProofFile} from './proof-capture';
import {readProposalDocument} from './proposal-document';
import {createChatProposal,proposalContentDigest,type ChatProposal} from './chat-proposal';
const ROOT='bankeiz.proposal-composer.v1',SCHEMA='bankeiz.invoice-original.v1',HEX=/^[a-f0-9]{64}$/;
export type InvoiceSource=Readonly<{original:File;proposal:ChatProposal;artifactSha256:string;payloadSha256:string;ownerReceizId:string;descriptor:RecordProofExportDescriptor;indexed?:boolean;offlineRetained?:boolean}>;
export type InvoiceDescriptor=Readonly<{schema:typeof SCHEMA;invoiceId:string;artifactSha256:string;recordHash:string;payloadSha256:string;filename:string;mimeType:string}>;
const opened=new WeakMap<File,Promise<InvoiceSource>>();
const hash=async(bytes:Uint8Array)=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new Uint8Array(bytes)))].map(n=>n.toString(16).padStart(2,'0')).join('');
function frozen<T>(value:T):T{if(value&&typeof value==='object'&&!(value instanceof File)){for(const child of Object.values(value))frozen(child);Object.freeze(value);}return value;}
/** Only an exact canonical invoice Original can supply this view. Draft JSON,
 * material coordinates and conversation projections do not admit an invoice. */
export function openInvoiceOriginal(original:File):Promise<InvoiceSource>{
 let work=opened.get(original);if(!work){work=(async()=>{
  const admitted=await openCanonicalProofFile(original),artifact=admitted.sealedArtifact;
  if(admitted.legacyCompatibility!=='current-native'||admitted.verifiedPayload.mimeType!=='application/pdf')throw Error('INVOICE_ORIGINAL_REQUIRED');
  const proposal=await readProposalDocument(admitted.verifiedPayload.bytes);
  if(proposal.draft.kind!=='invoice'||!proposal.issuer.ownerReceizId||proposal.issuer.ownerReceizId!==artifact.continuity.ownerReceizId)throw Error('INVOICE_OWNER_MISMATCH');
  const recordHash=await proposalContentDigest(proposal);
  return Object.freeze({original,proposal:frozen(proposal),artifactSha256:artifact.artifactSha256,payloadSha256:admitted.verifiedPayload.sha256,ownerReceizId:artifact.continuity.ownerReceizId,descriptor:Object.freeze({recordHash,payloadSha256:admitted.verifiedPayload.sha256,filename:admitted.verifiedPayload.filename,mimeType:admitted.verifiedPayload.mimeType})});
 })();opened.set(original,work);}return work;
}
type Context={identity:OpenIdentity;api:NativeMessaging;isCurrent():boolean};
function assertOwner(input:Context,proposal?:ChatProposal){
 if(!input.isCurrent()||!input.api.accountUid||input.identity.walletReceivingAddress?.()&&input.identity.walletReceivingAddress()!==input.api.accountUid||input.identity.knownProfile?.()&&input.identity.knownProfile!()!.userId!==input.api.accountUid)throw Error('INVOICE_CONTEXT_CHANGED');
 if(proposal&&(proposal.issuer.userId!==input.api.accountUid||proposal.issuer.ownerReceizId!==input.identity.binding.artifactOwnerReceizId))throw Error('INVOICE_OWNER_MISMATCH');
}
export function savedInvoiceDescriptor(raw:unknown):InvoiceDescriptor|null{
 if(!raw||typeof raw!=='object'||Array.isArray(raw))return null;const r=raw as Record<string,unknown>;
 if(r.schema!==SCHEMA||Object.keys(r).sort().join('|')!=='artifactSha256|filename|invoiceId|mimeType|payloadSha256|recordHash|schema'||typeof r.invoiceId!=='string'||! /^[a-f0-9-]{36}$/i.test(r.invoiceId)||![r.artifactSha256,r.payloadSha256,r.recordHash].every(v=>typeof v==='string'&&HEX.test(v))||typeof r.filename!=='string'||!r.filename||r.filename.length>240||/[\x00-\x1f\x7f/\\]/.test(r.filename)||r.mimeType!=='application/pdf')throw Error('INVOICE_SOURCE_INDEX_INVALID');
 return r as InvoiceDescriptor;
}
function currentIndex(api:NativeMessaging,conversationId:string):Record<string,unknown>{const raw=api.knownProposalDraft?.(conversationId);if(raw===null||raw===undefined)return{schema:ROOT,conversationId};if(typeof raw!=='object'||Array.isArray(raw)||(raw as Record<string,unknown>).schema!==ROOT||(raw as Record<string,unknown>).conversationId!==conversationId)throw Error('INVOICE_SOURCE_INDEX_INVALID');return raw as Record<string,unknown>;}
function pendingDescriptor(raw:unknown):Omit<InvoiceDescriptor,'artifactSha256'>|null{if(raw===null||raw===undefined)return null;const value=raw as Record<string,unknown>;const checked=savedInvoiceDescriptor({...value,artifactSha256:'0'.repeat(64)});if(!checked)throw Error('INVOICE_SOURCE_INDEX_INVALID');const {artifactSha256:_sha,...pending}=checked;return pending;}
export async function readSavedInvoice(input:Context&{conversationId:string}):Promise<InvoiceSource|null>{
 assertOwner(input);const root=currentIndex(input.api,input.conversationId),pending=pendingDescriptor(root.invoicePending),saved=savedInvoiceDescriptor(root.invoiceOriginal);if(!pending&&!saved)return null;
 if(!input.identity.readRecordExport)throw Error('INVOICE_ORIGINAL_REQUIRED');
 let descriptor:Omit<InvoiceDescriptor,'artifactSha256'>|InvoiceDescriptor=pending??saved!,original=await input.identity.readRecordExport(descriptor);assertOwner(input);
 if(!original&&pending)return null;
 if(!original)throw Error('INVOICE_ORIGINAL_REQUIRED');
 const source=await openInvoiceOriginal(original);assertOwner(input,source.proposal);
 if(source.proposal.conversationId!==input.conversationId||source.proposal.id!==descriptor.invoiceId||'artifactSha256'in descriptor&&source.artifactSha256!==descriptor.artifactSha256||Object.entries(source.descriptor).some(([key,value])=>descriptor[key as keyof typeof descriptor]!==value))throw Error('INVOICE_SOURCE_CHANGED');
 return source;
}
/** Native capture owns the one seal and durable exact-byte custody. This
 * optional view reference never replaces it or authorizes a payment. */
export async function issueInvoiceOriginal(input:Context&{proposal:ChatProposal;pdf:File}):Promise<InvoiceSource>{
 const proposal=createChatProposal(input.proposal);assertOwner(input,proposal);if(proposal.draft.kind!=='invoice'||input.pdf.type!=='application/pdf')throw Error('INVOICE_ORIGINAL_REQUIRED');
 const payload=new Uint8Array(await input.pdf.arrayBuffer()),terms=await readProposalDocument(payload);assertOwner(input,proposal);
 const recordHash=await proposalContentDigest(proposal);if(await proposalContentDigest(terms)!==recordHash)throw Error('INVOICE_TERMS_CHANGED');
 const descriptor={recordHash,payloadSha256:await hash(payload),filename:input.pdf.name,mimeType:'application/pdf'};assertOwner(input,proposal);
 const held=savedInvoiceDescriptor(currentIndex(input.api,proposal.conversationId).invoiceOriginal);
 if(held?.recordHash===recordHash&&held.payloadSha256===descriptor.payloadSha256){const source=await readSavedInvoice({...input,conversationId:proposal.conversationId});if(source)return source;}
 if(!input.identity.sealRecordExport)throw Error('INVOICE_CREATION_UNAVAILABLE');
 // A descriptor is only a locator for existing native custody, never proof.
 const pendingRoot=currentIndex(input.api,proposal.conversationId);await input.api.saveProposalDraft(proposal.conversationId,{...pendingRoot,invoicePending:{schema:SCHEMA,invoiceId:proposal.id,...descriptor}});assertOwner(input,proposal);
 const original=await input.identity.sealRecordExport({...descriptor,bytes:payload});assertOwner(input,proposal);
 const source=await openInvoiceOriginal(original);assertOwner(input,proposal);
 if(source.descriptor.recordHash!==recordHash||source.payloadSha256!==descriptor.payloadSha256||source.ownerReceizId!==input.identity.binding.artifactOwnerReceizId)throw Error('INVOICE_SOURCE_CHANGED');
 let indexed=false;
 try{const {invoicePending:_pending,...root}=currentIndex(input.api,proposal.conversationId);assertOwner(input,proposal);await input.api.saveProposalDraft(proposal.conversationId,{...root,invoiceOriginal:{schema:SCHEMA,invoiceId:proposal.id,artifactSha256:source.artifactSha256,...source.descriptor}});assertOwner(input,proposal);indexed=true;}
 catch(error){assertOwner(input,proposal);/* Native record-export custody remains complete and usable. */}
 return Object.freeze({...source,indexed});
}
