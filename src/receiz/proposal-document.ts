import type {PDFDict,PDFRawStream} from 'pdf-lib';
import {createChatProposal,proposalContentDigest,readChatProposal,type ChatProposal} from './chat-proposal';
import {readFixedSale} from './fixed-checkout';
import {openCanonicalProofFile} from './proof-capture';
import type {ChatMessage,NativeMessaging} from './native-messaging';
const NAME='bankeiz-proposal.json',MAX=12000;
/** Draft payload only. The existing native attachment service seals this PDF. */
export async function bindProposalDocument(bytes:Uint8Array,proposal:ChatProposal):Promise<File>{
 const p=createChatProposal(proposal);await readFixedSale(p.fixedSale);const {PDFDocument}=await import('pdf-lib'),doc=await PDFDocument.load(bytes,{updateMetadata:false});
 const terms=new TextEncoder().encode(JSON.stringify(p));if(terms.length>MAX)throw Error('PROPOSAL_MESSAGE_CAPACITY');
 await doc.attach(terms,NAME,{mimeType:'application/json',description:'Exact reviewed proposal terms',creationDate:new Date(p.createdAt),modificationDate:new Date(p.createdAt)});
 return new File([new Uint8Array(await doc.save())],`${p.draft.kind}-${p.id}.pdf`,{type:'application/pdf'});
}
/** Read only from SDK-admitted payload bytes in the receiving flow. Never use
 * PDF visible text, an unsigned display capsule or an extracted hash as proof. */
export async function readProposalDocument(bytes:Uint8Array):Promise<ChatProposal>{
 if(bytes.length>25*1024*1024)throw Error('PROPOSAL_DOCUMENT_INVALID');
 const {PDFDocument,PDFName,PDFDict,PDFArray,PDFString,PDFHexString,PDFRawStream}=await import('pdf-lib');
 const doc=await PDFDocument.load(bytes,{updateMetadata:false}),names=doc.catalog.lookupMaybe(PDFName.of('Names'),PDFDict),root=names?.lookupMaybe(PDFName.of('EmbeddedFiles'),PDFDict);
 const seen=new Set<object>();let count=0;const found:PDFRawStream[]=[];
 const visit=(node:PDFDict,depth:number)=>{if(seen.has(node)||depth>8||++count>64)throw Error('PROPOSAL_DOCUMENT_INVALID');seen.add(node);const pairs=node.lookupMaybe(PDFName.of('Names'),PDFArray);
  if(pairs){if(pairs.size()%2||pairs.size()>128)throw Error('PROPOSAL_DOCUMENT_INVALID');for(let i=0;i<pairs.size();i+=2){const key=doc.context.lookup(pairs.get(i));if(!(key instanceof PDFString)&&!(key instanceof PDFHexString))throw Error('PROPOSAL_DOCUMENT_INVALID');if(key.decodeText()!==NAME)continue;const spec=doc.context.lookup(pairs.get(i+1),PDFDict),ef=spec.lookup(PDFName.of('EF'),PDFDict),stream=ef.lookup(PDFName.of('F'));if(!(stream instanceof PDFRawStream)||stream.getContents().length>MAX*2)throw Error('PROPOSAL_DOCUMENT_INVALID');found.push(stream);}}
  const kids=node.lookupMaybe(PDFName.of('Kids'),PDFArray);if(kids){if(kids.size()>64)throw Error('PROPOSAL_DOCUMENT_INVALID');for(let i=0;i<kids.size();i++)visit(doc.context.lookup(kids.get(i),PDFDict),depth+1);}
 };
 if(root)visit(root,0);if(found.length!==1)throw Error(found.length?'PROPOSAL_DOCUMENT_AMBIGUOUS':'PROPOSAL_DOCUMENT_TERMS_MISSING');
 const stream=found[0],filter=stream.dict.lookupMaybe(PDFName.of('Filter'),PDFName);let data=stream.getContents();
 if(filter){if(filter.asString()!=='/FlateDecode'||stream.dict.has(PDFName.of('DecodeParms')))throw Error('PROPOSAL_DOCUMENT_INVALID');
  const reader=new Blob([new Uint8Array(data)]).stream().pipeThrough(new DecompressionStream('deflate')).getReader(),parts:Uint8Array[]=[];let size=0;
  try{for(;;){const part=await reader.read();if(part.done)break;size+=part.value.length;if(size>MAX)throw Error('PROPOSAL_DOCUMENT_INVALID');parts.push(part.value);}data=new Uint8Array(size);let offset=0;for(const part of parts){data.set(part,offset);offset+=part.length;}}
  finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
 }else if(data.length>MAX)throw Error('PROPOSAL_DOCUMENT_INVALID');
 const value=createChatProposal(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(data)));await readFixedSale(value.fixedSale);return value;
}
const admitted=new WeakMap<NativeMessaging,Map<string,Promise<{file:File;digest:string}>>>();
/** Cache only a genuine canonical admission, bound to immutable attachment
 * content, exact native sender/conversation and the full reviewed terms. */
export async function verifyProposalDocument(api:NativeMessaging,message:ChatMessage,proposal:ChatProposal):Promise<{file:File;digest:string}>{
 const native=readChatProposal(message),digest=await proposalContentDigest(proposal);if(!native||await proposalContentDigest(native)!==digest)throw Error('PROPOSAL_DOCUMENT_TERMS_CHANGED');
 let cache=admitted.get(api);if(!cache){cache=new Map();admitted.set(api,cache);}const key=JSON.stringify([message.conversationId,message.id,message.walletTransfer?.sha256Hex,digest]);let pending=cache.get(key);
 if(!pending){pending=(async()=>{const file=await api.attachment(message.conversationId,message.id),opened=await openCanonicalProofFile(file),terms=await readProposalDocument(opened.verifiedPayload.bytes);if(terms.issuer.ownerReceizId&&terms.issuer.ownerReceizId!==opened.sealedArtifact.continuity.ownerReceizId)throw Error('PROPOSAL_DOCUMENT_TERMS_CHANGED');if(await proposalContentDigest(terms)!==digest)throw Error('PROPOSAL_DOCUMENT_TERMS_CHANGED');return{file,digest};})();cache.set(key,pending);void pending.catch(()=>{if(cache!.get(key)===pending)cache!.delete(key);});}
 return pending;
}
