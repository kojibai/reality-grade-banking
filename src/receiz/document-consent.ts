import {canonicalizeReceizConstitution,receizBase64UrlDecode,receizBase64UrlEncode,sha256ReceizBytes,type ReceizSealedArtifact} from '@receiz/sdk';
import {openCanonicalProofFile} from './proof-capture';
import {readBusinessDocumentMetadata} from './business-document';
import {readChatDocumentTerms,chatDocumentTermsDigest,type ChatDocumentTerms} from './chat-document';
import type {RecordProofExportInput} from './record-proof-export';

export const DOCUMENT_CONSENT_STATEMENT='I have reviewed the complete agreement and agree to its exact terms.';
export const DOCUMENT_CONSENT_MAX_ORIGINAL_BYTES=8*1024*1024;
const MAX_PAYLOAD=12*1024*1024,MAX_ARTIFACT=16*1024*1024;
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i,HEX=/^[a-f0-9]{64}$/;
export type DocumentConsentRequest=Readonly<{documentId:string;conversationId:string;termsDigest:string;original:File;signerUid:string;partyUids:readonly string[];statement?:string}>;
export type DocumentConsentExpected=Readonly<{documentId:string;conversationId:string;termsDigest:string;originalArtifactSha256:string;partyUids:readonly string[];signerUid?:string;signerOwnerReceizId?:string}>;
type ConsentBasis=Readonly<{schema:'bankeiz.document-consent.intent.v2';documentId:string;conversationId:string;termsDigest:string;signerUid:string;partyUids:readonly string[];statement:string;signerOwnerReceizId:string;original:Readonly<{artifactSha256:string;payloadSha256:string;filename:string;mimeType:string;byteLength:number}>}>;
type ConsentPayload=Readonly<{schema:'bankeiz.document-consent.v2';method:'receiz-native-owner';basis:ConsentBasis;consentDigest:string;terms:ChatDocumentTerms;original:Readonly<{bytesB64Url:string}>}>;
export type VerifiedDocumentConsent=Readonly<{method:'receiz-native-owner';documentId:string;conversationId:string;termsDigest:string;originalArtifactSha256:string;signerUid:string;signerOwnerReceizId:string;partyUids:readonly string[];statement:string;consentDigest:string;terms:ChatDocumentTerms;original:File;sealedArtifact:ReceizSealedArtifact}>;
export type DocumentConsentSignerPorts=Readonly<{ownerReceizId:string;accountUid:string;assertOpen():void;seal(input:RecordProofExportInput):Promise<File>;read(consentDigest:string):Promise<File|null>;retain(consentDigest:string,file:File):Promise<void>;exclusive?<T>(consentDigest:string,work:()=>Promise<T>):Promise<T>}>;

const fail=(code='DOCUMENT_CONSENT_INVALID'):never=>{throw Error(code);};
const object=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value)&&[Object.prototype,null].includes(Object.getPrototypeOf(value));
function exact(value:Record<string,unknown>,fields:readonly string[]){if(Object.keys(value).sort().join(',')!==[...fields].sort().join(','))fail();}
const text=(value:unknown,max:number):value is string=>typeof value==='string'&&!!value.trim()&&value.length<=max&&!/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value);
function parties(value:unknown):string[]{if(!Array.isArray(value)||value.length<2||value.length>50||value.some(id=>typeof id!=='string'||!UUID.test(id))||new Set(value).size!==value.length)return fail();return [...value].sort();}
function same(left:unknown,right:unknown){return canonicalizeReceizConstitution(left)===canonicalizeReceizConstitution(right);}
function owner(value:unknown):string{if(typeof value!=='string'||!value||value.length>256||/[\s\x00-\x1f\x7f]/.test(value))return fail();return value;}
function coordinates(value:{documentId:string;conversationId:string;termsDigest:string;signerUid?:string;partyUids:readonly string[]}){
 if(!UUID.test(value.documentId)||!UUID.test(value.conversationId)||!HEX.test(value.termsDigest)||value.signerUid!==undefined&&!UUID.test(value.signerUid))fail();
 return parties(value.partyUids);
}
async function digest(value:unknown){return sha256ReceizBytes(new TextEncoder().encode(canonicalizeReceizConstitution(value)));}
async function source(file:File,expected:{documentId:string;conversationId:string;termsDigest:string;partyUids:readonly string[]}){
 if(!(file instanceof File)||!file.size||file.size>DOCUMENT_CONSENT_MAX_ORIGINAL_BYTES)return fail('DOCUMENT_CONSENT_SOURCE_INVALID');
 const opened=await openCanonicalProofFile(file);
 if(opened.sealedArtifact.kind!=='receiz.native-record-seal')return fail('DOCUMENT_CONSENT_SOURCE_INVALID');
 const terms=readChatDocumentTerms(JSON.parse(await readBusinessDocumentMetadata(opened.verifiedPayload.bytes,opened.verifiedPayload.mimeType)));
 if(terms.id!==expected.documentId||terms.conversationId!==expected.conversationId||terms.draft.kind!=='agreement'||terms.signatureRequested!==true||terms.issuer.ownerReceizId!==opened.sealedArtifact.continuity.ownerReceizId||await chatDocumentTermsDigest(terms)!==expected.termsDigest||!same(parties([terms.issuer.userId,...terms.recipients]),parties(expected.partyUids)))fail('DOCUMENT_CONSENT_TERMS_CHANGED');
 return{opened,terms};
}
/** SignatureV4 covers the SDK-native owner ID and the complete consent
 * payload. No detached public-key DTO is promoted into Identity Seal admission.
 * The native message caller separately binds signerUid to its authenticated sender. */
export async function verifyDocumentConsent(file:File,expected:DocumentConsentExpected):Promise<VerifiedDocumentConsent>{
 const expectedParties=coordinates(expected);if(!HEX.test(expected.originalArtifactSha256)||!(file instanceof File)||!file.size||file.size>MAX_ARTIFACT)return fail();
 const opened=await openCanonicalProofFile(file);
 if(opened.sealedArtifact.kind!=='receiz.native-record-seal'||opened.verifiedPayload.mimeType!=='application/json'||opened.verifiedPayload.bytes.length>MAX_PAYLOAD)return fail();
 const raw=new TextDecoder('utf-8',{fatal:true}).decode(opened.verifiedPayload.bytes),value:unknown=JSON.parse(raw);
 if(!object(value)||canonicalizeReceizConstitution(value)!==raw)return fail();exact(value,['schema','method','basis','consentDigest','terms','original']);
 if(value.schema!=='bankeiz.document-consent.v2'||value.method!=='receiz-native-owner'||!object(value.basis)||!object(value.original))return fail();
 const basis=value.basis;exact(basis,['schema','documentId','conversationId','termsDigest','signerUid','partyUids','statement','signerOwnerReceizId','original']);exact(value.original,['bytesB64Url']);
 if(basis.schema!=='bankeiz.document-consent.intent.v2'||basis.documentId!==expected.documentId||basis.conversationId!==expected.conversationId||basis.termsDigest!==expected.termsDigest||typeof basis.signerUid!=='string'||!UUID.test(basis.signerUid)||!expectedParties.includes(basis.signerUid)||expected.signerUid!==undefined&&basis.signerUid!==expected.signerUid||!same(parties(basis.partyUids),expectedParties)||basis.statement!==DOCUMENT_CONSENT_STATEMENT||!object(basis.original))return fail();
 const signerOwnerReceizId=owner(basis.signerOwnerReceizId);
 if(opened.sealedArtifact.continuity.ownerReceizId!==signerOwnerReceizId||expected.signerOwnerReceizId!==undefined&&owner(expected.signerOwnerReceizId)!==signerOwnerReceizId)return fail('DOCUMENT_CONSENT_SIGNER_MISMATCH');
 const original=basis.original;exact(original,['artifactSha256','payloadSha256','filename','mimeType','byteLength']);
 if(original.artifactSha256!==expected.originalArtifactSha256||typeof original.payloadSha256!=='string'||!HEX.test(original.payloadSha256)||!text(original.filename,240)||/[\u0000-\u001f\u007f/\\]/.test(original.filename)||!text(original.mimeType,160)||!Number.isSafeInteger(original.byteLength)||Number(original.byteLength)<=0||Number(original.byteLength)>DOCUMENT_CONSENT_MAX_ORIGINAL_BYTES||typeof value.original.bytesB64Url!=='string'||value.original.bytesB64Url.length>Math.ceil(DOCUMENT_CONSENT_MAX_ORIGINAL_BYTES*4/3)+4||!/^[A-Za-z0-9_-]+$/.test(value.original.bytesB64Url))return fail();
 const exactBytes=receizBase64UrlDecode(value.original.bytesB64Url);
 if(exactBytes.length!==original.byteLength||receizBase64UrlEncode(exactBytes)!==value.original.bytesB64Url||await sha256ReceizBytes(exactBytes)!==original.artifactSha256)return fail('DOCUMENT_CONSENT_SOURCE_CHANGED');
 const originalFile=new File([new Uint8Array(exactBytes)],original.filename,{type:original.mimeType}),reviewed=await source(originalFile,expected);
 if(reviewed.opened.verifiedPayload.sha256!==original.payloadSha256||!same(value.terms,reviewed.terms))return fail('DOCUMENT_CONSENT_TERMS_CHANGED');
 const consentBasis=basis as unknown as ConsentBasis;
 if(value.consentDigest!==await digest(consentBasis))return fail();
 return{method:'receiz-native-owner',documentId:expected.documentId,conversationId:expected.conversationId,termsDigest:expected.termsDigest,originalArtifactSha256:expected.originalArtifactSha256,signerUid:basis.signerUid,signerOwnerReceizId,partyUids:expectedParties,statement:basis.statement,consentDigest:value.consentDigest as string,terms:reviewed.terms,original:originalFile,sealedArtifact:opened.sealedArtifact};
}
/** The already admitted open identity supplies the owner-bound SDK sealer and
 * durable exact source custody. This creates no identity, session or grant. */
export function createDocumentConsentSigner(ports:DocumentConsentSignerPorts){
 type Attempt={payload?:Uint8Array;file?:File;work?:Promise<File>;retained?:boolean};const attempts=new Map<string,Attempt>();
 const signerOwnerReceizId=owner(ports.ownerReceizId);
 return async(request:DocumentConsentRequest):Promise<File>=>{
  ports.assertOpen();const input={...request,partyUids:[...request.partyUids]},partyUids=coordinates(input);
  if(input.signerUid!==ports.accountUid||!partyUids.includes(input.signerUid))return fail('DOCUMENT_CONSENT_SIGNER_MISMATCH');
  const statement=input.statement??DOCUMENT_CONSENT_STATEMENT;if(statement!==DOCUMENT_CONSENT_STATEMENT)return fail();
  const reviewed=await source(input.original,input);ports.assertOpen();
  const originalBytes=new Uint8Array(await input.original.arrayBuffer());ports.assertOpen();
  if(originalBytes.length!==input.original.size||await sha256ReceizBytes(originalBytes)!==reviewed.opened.sealedArtifact.artifactSha256)fail('DOCUMENT_CONSENT_SOURCE_CHANGED');ports.assertOpen();
  const original={artifactSha256:reviewed.opened.sealedArtifact.artifactSha256,payloadSha256:reviewed.opened.verifiedPayload.sha256,filename:input.original.name,mimeType:input.original.type||'application/octet-stream',byteLength:originalBytes.length};
  const basis:ConsentBasis={schema:'bankeiz.document-consent.intent.v2',documentId:input.documentId,conversationId:input.conversationId,termsDigest:input.termsDigest,signerUid:input.signerUid,partyUids,statement,signerOwnerReceizId,original};
  const consentDigest=await digest(basis);ports.assertOpen();let attempt=attempts.get(consentDigest);if(!attempt){attempt={};attempts.set(consentDigest,attempt);}if(attempt.work)return attempt.work;
  const selected=attempt,expected={...input,originalArtifactSha256:original.artifactSha256,signerOwnerReceizId};
  const perform=async()=>{
   ports.assertOpen();if(selected.retained&&selected.file)return selected.file;
   const saved=await ports.read(consentDigest);ports.assertOpen();
   if(saved){const verified=await verifyDocumentConsent(saved,expected);ports.assertOpen();if(verified.consentDigest!==consentDigest||verified.signerOwnerReceizId!==signerOwnerReceizId)fail();selected.file=saved;selected.retained=true;return saved;}
   if(!selected.file){
    if(!selected.payload){
     const payload:ConsentPayload={schema:'bankeiz.document-consent.v2',method:'receiz-native-owner',basis,consentDigest,terms:reviewed.terms,original:{bytesB64Url:receizBase64UrlEncode(originalBytes)}};
     const bytes=new TextEncoder().encode(canonicalizeReceizConstitution(payload));if(bytes.length>MAX_PAYLOAD)fail('DOCUMENT_CONSENT_CAPACITY');selected.payload=bytes;
    }
    const file=await ports.seal({bytes:new Uint8Array(selected.payload),filename:`signed-agreement-${input.documentId}.json`,mimeType:'application/json',recordHash:consentDigest});ports.assertOpen();
    const verified=await verifyDocumentConsent(file,expected);ports.assertOpen();if(verified.consentDigest!==consentDigest)fail();selected.file=file;
   }
   await ports.retain(consentDigest,selected.file);ports.assertOpen();selected.retained=true;
   const completed=[...attempts].filter(([,value])=>value.retained&&!value.work);while(completed.length>3){const [key]=completed.shift()!;attempts.delete(key);}
   return selected.file;
  };
  const work=ports.exclusive?ports.exclusive(consentDigest,perform):perform();selected.work=work;void work.finally(()=>{if(selected.work===work)selected.work=undefined;}).catch(()=>{});return work;
 };
}
