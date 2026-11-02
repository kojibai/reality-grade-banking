// App composition adapted from Receiz 5358975b99fcee8a3ca511e5d30c438fdb085f61,
// app/lib/wallet/settlementNotes/note-delivery.ts. Native authority is unchanged.
import {canonicalizeReceizConstitution as canonical,parseReceizIdentityArtifactText,serializeReceizIdentityArtifact,verifyReceizArtifact,type ReceizKeyFile} from '@receiz/sdk';
import {insertPngTextChunks,readPngTextChunks} from '../../native/receiz/app/utils/pngChunks';
import type {BankNoteAccountModule} from './offline-notes';
import {openConnectedAccountNote,readConnectedNote,type ConnectedNoteModule} from './connected-note-application';
import {hasPublicLedgerPngProof} from './public-ledger-png';

export const NOTE_DELIVERY_KEYWORD='receiz.bank.connected-note-delivery.v1';
const schema=NOTE_DELIVERY_KEYWORD,MAX_IMAGE=8*1024*1024,MAX_AUTHORITY=16384;
const chunkOptions={keyword:NOTE_DELIVERY_KEYWORD,maxCompressedBytes:MAX_AUTHORITY*2,maxTextBytes:MAX_AUTHORITY*2};
type Source=Awaited<ReturnType<ConnectedNoteModule['readBankConnectedNoteSource']>>;
export type ConnectedNoteDelivery={source:Source;noteIdentity?:ReceizKeyFile};
type ReceivingModule=ConnectedNoteModule&Pick<BankNoteAccountModule,'createBankNoteAccountReceivingRequest'>;
const same=(a:Uint8Array,b:Uint8Array)=>a.length===b.length&&a.every((value,index)=>value===b[index]);
const fail=(code:string):never=>{throw Error(`BANK_NOTE_DELIVERY_${code}`);};
function authority(source:Source,text:string){
 if(source.kind!=='funding'||new TextEncoder().encode(text).length>MAX_AUTHORITY)fail('AUTHORITY_MISMATCH');
 const key=parseReceizIdentityArtifactText(text),expected=source.funding.noteAuthority;
 if(!expected||key.keyId!==expected.keyId||key.alg!==expected.algorithm||key.crypto.publicKeyRawB64u!==expected.publicKeyRawB64u||key.keyId===source.funding.issuer?.keyId)fail('AUTHORITY_MISMATCH');
 return key;
}

/** Add only the retained per-Note authority before the canonical image seal.
 * No account key or private account opening belongs in this transport. */
export async function attachConnectedNoteDelivery(input:{native:ConnectedNoteModule;image:Uint8Array;source:Uint8Array;noteIdentityBytes:Uint8Array}):Promise<Uint8Array>{
 if(!input.image.length||input.image.length>MAX_IMAGE||!input.noteIdentityBytes.length||input.noteIdentityBytes.length>MAX_AUTHORITY)fail('CAPACITY');
 if(hasPublicLedgerPngProof(input.image)||readPngTextChunks(input.image,chunkOptions).length)fail('ALREADY_SEALED');
 const source=await input.native.readBankConnectedNoteImage(input.image);
 if(!same(source.terminalSourceBytes,input.source))fail('SOURCE_MISMATCH');
 const key=authority(source,new TextDecoder('utf-8',{fatal:true}).decode(input.noteIdentityBytes));
 const image=insertPngTextChunks(input.image,[{keyword:NOTE_DELIVERY_KEYWORD,text:canonical({schema,noteId:source.noteId,fundingArtifactSha256:source.terminalArtifactSha256,noteIdentity:serializeReceizIdentityArtifact(key)})}]);
 if(image.length>MAX_IMAGE)fail('CAPACITY');return image;
}

/** Admit the complete enclosing image before projecting its carried authority.
 * The independently verified native funding determines the exact Note key. */
export async function openConnectedNoteDelivery(input:{native:ConnectedNoteModule;bytes:Uint8Array}):Promise<ConnectedNoteDelivery>{
 const bytes=input.bytes.slice(),png=bytes[0]===137;
 if(!bytes.length||png&&bytes.length>MAX_IMAGE)fail('CAPACITY');
 if(png){
  const proof=await verifyReceizArtifact(new File([new Uint8Array(bytes)],'settlement-note.png',{type:'image/png'}));
  if(proof.status!=='verified-artifact')throw Error('BANK_NOTE_IMAGE_SEAL_INVALID');
 }
 const source=await readConnectedNote(input.native,bytes),chunks=png?readPngTextChunks(bytes,chunkOptions):[];
 if(!chunks.length)return{source};
 if(chunks.length!==1||chunks[0].text.length>MAX_AUTHORITY*2)fail('SOURCE_MISMATCH');
 const text=chunks[0].text,value=JSON.parse(text);
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).sort().join('|')!=='fundingArtifactSha256|noteId|noteIdentity|schema'||canonical(value)!==text||value.schema!==schema||value.noteId!==source.noteId||value.fundingArtifactSha256!==source.terminalArtifactSha256||typeof value.noteIdentity!=='string')fail('SOURCE_MISMATCH');
 return{source,noteIdentity:authority(source,value.noteIdentity)};
}

/** Compose the existing signed destination and Note handover on import. Only
 * the existing receiver claim and native writer can grant account credit. */
export async function prepareConnectedNoteDelivery(input:{native:ReceivingModule;delivery:ConnectedNoteDelivery;identity:ReceizKeyFile;passphrase?:string;accountUserId:string;kai:string;retainedSource?:Uint8Array}):Promise<Uint8Array>{
 const {source,noteIdentity}=input.delivery,context={receiverUserId:input.accountUserId,receiverKeyId:input.identity.keyId};
 if(source.funding.recipientUserId!==undefined&&source.funding.recipientUserId!==input.accountUserId)throw Error('BANK_NOTE_RECIPIENT_MISMATCH');
 if(source.kind==='handover')return(await openConnectedAccountNote(input.native,source.terminalSourceBytes,context)).terminalSourceBytes.slice();
 if(input.retainedSource){
  const retained=await openConnectedAccountNote(input.native,input.retainedSource,context);
  if(retained.noteId!==source.noteId||retained.fundingArtifactSha256!==source.terminalArtifactSha256)throw Error('BANK_NOTE_EXACT_DEPOSIT_REQUIRED');
  return retained.terminalSourceBytes.slice();
 }
 if(!noteIdentity)throw Error('BANK_NOTE_COMPLETE_DELIVERY_REQUIRED');
 const receivingRequestBytes=await input.native.createBankNoteAccountReceivingRequest({identity:input.identity,passphrase:input.passphrase,accountUserId:input.accountUserId});
 return input.native.createBankConnectedNoteHandover({fundingSourceBytes:source.terminalSourceBytes,receivingRequestBytes,noteIdentity,kai:input.kai});
}

/** The existing canonical sealer must preserve the exact delivery transport. */
export function assertConnectedNoteDeliveryPreserved(before:Uint8Array,after:Uint8Array):void{
 const original=readPngTextChunks(before,chunkOptions),sealed=readPngTextChunks(after,chunkOptions);
 if(original.length!==1||sealed.length!==1||original[0].text!==sealed[0].text)fail('SOURCE_MISMATCH');
}
