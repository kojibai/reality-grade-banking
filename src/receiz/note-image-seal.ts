import {hasPublicLedgerPngProof as hasCanonicalPngProof} from './public-ledger-png';
import type {BankNoteInspection} from './offline-notes';
import {atNoteStage} from './note-stage';

type SealInput={bytes:Uint8Array;filename:string;mimeType:string};
type SealOutput={artifactBytes:Uint8Array;mimeType?:string;verification:{ok:boolean}};
const MAX=8*1024*1024;
const hash=async(bytes:Uint8Array)=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new Uint8Array(bytes)))].map(v=>v.toString(16).padStart(2,'0')).join('');
const terms=(note:BankNoteInspection)=>JSON.stringify([note.noteId,note.rail,note.amountUsdCents,note.amountPhiMicro,note.fundingParts]);

/** The existing financial source remains authoritative. This adds only the
 * standard SDK document seal to its complete image carrier. Called on explicit
 * creation/handover/export, never while reading an inventory or painting a page. */
export function createNoteImageExporter(input:{
 inspect(bytes:Uint8Array):Promise<BankNoteInspection>;
 seal(input:SealInput):Promise<SealOutput>;
 verify(bytes:Uint8Array):Promise<boolean>;
 assertOpen():void;
}){
 const held=new Map<string,Promise<Uint8Array>>();
 async function exportImage(source:Uint8Array,noteId:string):Promise<Uint8Array>{
  input.assertOpen();const bytes=source.slice();
  if(!bytes.length||bytes.length>MAX)throw Error('BANK_NOTE_IMAGE_CAPACITY');
  // Identity is part of the reuse key: a completed image cannot satisfy a
  // different Note even if the caller presents the same bytes.
  const key=noteId+':'+await hash(bytes);input.assertOpen();
  let attempt=held.get(key);
  if(!attempt){
   attempt=(async()=>{
    const before=await input.inspect(bytes);input.assertOpen();
    if(before.noteId!==noteId)throw Error('BANK_NOTE_IMAGE_SOURCE_CHANGED');
    // Never erase or replace a retained invalid seal to make it appear valid.
    if(hasCanonicalPngProof(bytes)){
     if(!await input.verify(bytes))throw Error('BANK_NOTE_IMAGE_SEAL_INVALID');
     input.assertOpen();return bytes;
    }
    const sealed=await input.seal({bytes:bytes.slice(),filename:`note-${noteId}.png`,mimeType:'image/png'});input.assertOpen();
    const image=sealed.artifactBytes.slice();
    if(!image.length||image.length>MAX)throw Error('BANK_NOTE_IMAGE_CAPACITY');
    if(sealed.mimeType!=='image/png'||!sealed.verification.ok||!hasCanonicalPngProof(image))throw Error('BANK_NOTE_IMAGE_SEAL_INVALID');
    const after=await input.inspect(image);input.assertOpen();
    if(terms(before)!==terms(after))throw Error('BANK_NOTE_IMAGE_SOURCE_CHANGED');
    return image;
   })();
   held.set(key,attempt);
   while(held.size>8)held.delete(held.keys().next().value!);
   attempt.then(async image=>{
    const sealedKey=noteId+':'+await hash(image);
    if(held.get(key)===attempt){held.set(sealedKey,Promise.resolve(image));while(held.size>8)held.delete(held.keys().next().value!);}
   }).catch(()=>{if(held.get(key)===attempt)held.delete(key);});
  }
  const result=await attempt;input.assertOpen();return result.slice();
 }
 return {exportImage:(bytes:Uint8Array,noteId:string)=>atNoteStage('note-image-export',()=>exportImage(bytes,noteId))};
}
