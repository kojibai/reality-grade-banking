import {BANK_APPLICATION_ID} from '../config';
import {createProofLibrary,type ProofSummary} from '../proof-library';
import type {BankNoteInspection} from '../offline-notes';
import {vaultBase64,vaultBytes,vaultCanonical,vaultDigest,vaultObject} from './encoding';

type OriginalWire={kind:'owned-source';filename:string;sha256:string;bytesB64u:string};
export type VaultNoteWire={filename:string;sha256:string;bytesB64u:string};
export type VaultNoteEntry=VaultNoteWire;
/** A private collection of existing Originals and funded Note images. Packing
 * carries their evidence; it creates neither another account nor financial title. */
export type VaultNoteSource={
 schema:'bank.vault.note-source.v1';id:string;name:string;owner:{keyId:string;receizId:string};
 originals:{schema:'bankeiz.proof-backup.v1';applicationId:string;keyId:string;ownerReceizId:string;sources:OriginalWire[]};
 notes:VaultNoteEntry[];
};
export type VaultNoteProjection=BankNoteInspection&{digest:string;filename:string};
export type VaultNoteAdmission={source:VaultNoteSource;notes:VaultNoteProjection[];originals:ProofSummary[]};
export type VaultNoteSourcePorts={
 inspectNote(bytes:Uint8Array):Promise<BankNoteInspection>;
 assertOpen?():void;
};
const MAX=32*1024*1024,MAX_ENTRIES=1000,encoder=new TextEncoder();
const checked=new WeakSet<VaultNoteSource>();
const noteAdmission=new WeakMap<VaultNoteEntry,{inspect:VaultNoteSourcePorts['inspectNote'];work:Promise<BankNoteInspection>}>();
const originalAdmission=new WeakMap<OriginalWire,Promise<ProofSummary>>();
const hash=(v:unknown):v is string=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const filename=(v:unknown):v is string=>typeof v==='string'&&v.length>0&&v.length<=240&&!/[\x00-\x1f\x7f/\\]/.test(v);
function fail(code:string):never{throw Error(`VAULT_NOTE_${code}`);}
function header(input:{id:string;name:string;owner:{keyId:string;receizId:string}}){
 if(!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(input.id)||typeof input.name!=='string'||!input.name.trim()||input.name.length>80||/[\u0000-\u001f\u007f]/.test(input.name)||!hash(input.owner.keyId)||typeof input.owner.receizId!=='string'||!/^[-A-Za-z0-9_.@]{1,180}$/.test(input.owner.receizId))fail('FORMAT_INVALID');
}
function finish(source:VaultNoteSource):VaultNoteSource{
 // Existing rows retain their reference across appends, so their accepted SDK
 // admissions can be reused within this unlocked lifetime. A file reopen creates
 // fresh rows and therefore runs the complete admission boundary once again.
 Object.freeze(source.owner);Object.freeze(source.originals.sources);Object.freeze(source.originals);
 for(const row of source.notes)Object.freeze(row);
 for(const row of source.originals.sources)Object.freeze(row);
 Object.freeze(source.notes);Object.freeze(source);
 checked.add(source);return source;
}
export function createVaultNoteSource(input:{id:string;name:string;owner:{keyId:string;receizId:string}}):VaultNoteSource{
 header(input);return finish({schema:'bank.vault.note-source.v1',id:input.id,name:input.name,owner:{...input.owner},originals:{schema:'bankeiz.proof-backup.v1',applicationId:BANK_APPLICATION_ID,keyId:input.owner.keyId,ownerReceizId:input.owner.receizId,sources:[]},notes:[]});
}
export function encodeVaultNoteSource(source:VaultNoteSource):Uint8Array{
 const bytes=encoder.encode(vaultCanonical(source));if(!bytes.length||bytes.length>MAX)fail('CAPACITY');return bytes;
}
async function readWire(value:unknown):Promise<VaultNoteWire>{
 const v=vaultObject(value,['filename','sha256','bytesB64u']);
 if(!filename(v.filename)||!hash(v.sha256)||typeof v.bytesB64u!=='string')fail('FORMAT_INVALID');
 const exact=vaultBytes(v.bytesB64u,MAX);if(!exact.length||await vaultDigest(exact)!==v.sha256)fail('SOURCE_CHANGED');
 return{filename:v.filename,sha256:v.sha256,bytesB64u:v.bytesB64u};
}
export async function readVaultNoteSource(input:Uint8Array):Promise<VaultNoteSource>{
 if(!(input instanceof Uint8Array)||!input.length||input.length>MAX)fail('CAPACITY');
 const raw=vaultObject(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(new Uint8Array(input))),['schema','id','name','owner','originals','notes']),owner=vaultObject(raw.owner,['keyId','receizId']);
 if(raw.schema!=='bank.vault.note-source.v1')fail('FORMAT_INVALID');
 const h={id:raw.id as string,name:raw.name as string,owner:owner as VaultNoteSource['owner']};header(h);
 const original=vaultObject(raw.originals,['schema','applicationId','keyId','ownerReceizId','sources']);
 if(original.schema!=='bankeiz.proof-backup.v1'||original.applicationId!==BANK_APPLICATION_ID||original.keyId!==h.owner.keyId||original.ownerReceizId!==h.owner.receizId||!Array.isArray(original.sources)||!Array.isArray(raw.notes)||original.sources.length+raw.notes.length>MAX_ENTRIES)fail('FORMAT_INVALID');
 const seen=new Set<string>(),sources:OriginalWire[]=[],notes:VaultNoteEntry[]=[];
 for(const item of original.sources){const r=vaultObject(item,['kind','filename','sha256','bytesB64u']);if(r.kind!=='owned-source')fail('ORIGINAL_KIND_INVALID');const wire=await readWire({filename:r.filename,sha256:r.sha256,bytesB64u:r.bytesB64u});if(seen.has(wire.sha256))fail('SOURCE_DUPLICATE');seen.add(wire.sha256);sources.push({kind:'owned-source',...wire});}
 for(const item of raw.notes){const wire=await readWire(item);if(seen.has(wire.sha256))fail('SOURCE_DUPLICATE');seen.add(wire.sha256);notes.push(wire);}
 return finish({...h,schema:'bank.vault.note-source.v1',originals:{schema:'bankeiz.proof-backup.v1',applicationId:BANK_APPLICATION_ID,keyId:h.owner.keyId,ownerReceizId:h.owner.receizId,sources},notes});
}
async function captured(source:VaultNoteSource){return checked.has(source)?source:readVaultNoteSource(encodeVaultNoteSource(source));}
/** Runs the existing canonical Original and Note admissions. The container's
 * schema and hashes never grant value or ownership. Recorded Note amounts are
 * evidence from those exact bytes, not a current unspent balance assertion. */
export async function admitVaultNoteSource(value:VaultNoteSource,ports:VaultNoteSourcePorts):Promise<VaultNoteAdmission>{
 const source=await captured(value);ports.assertOpen?.();
 const originals:ProofSummary[]=[];
 for(const wire of source.originals.sources){
  let work=originalAdmission.get(wire);
  if(!work){work=(async()=>{
   const library=createProofLibrary({binding:{keyId:source.owner.keyId,artifactOwnerReceizId:source.owner.receizId},assertOpen:()=>ports.assertOpen?.(),readOwned:async()=>[],readArchive:async()=>[],readRecoveries:async()=>[],readNotes:async()=>[],commit:async()=>({added:0,alreadyHeld:0})});
   const backup={...source.originals,sources:[wire]},review=await library.inspect(new File([encoder.encode(JSON.stringify(backup))],`vault-${source.id}-originals.json`,{type:'application/json'}));
   if(review.items.length!==1||review.items[0].kind!=='owned-source'||review.items[0].digest!==wire.sha256)fail('ORIGINAL_INVALID');return Object.freeze({...review.items[0]});
  })();originalAdmission.set(wire,work);work.catch(()=>originalAdmission.delete(wire));}
  originals.push({...await work});ports.assertOpen?.();
 }
 const notes:VaultNoteProjection[]=[],noteIds=new Set<string>();
 for(const wire of source.notes){
  let work=noteAdmission.get(wire)?.inspect===ports.inspectNote?noteAdmission.get(wire)!.work:undefined;
  if(!work){work=ports.inspectNote(vaultBytes(wire.bytesB64u,MAX)).then(note=>{
   if(typeof note.noteId!=='string'||!note.noteId||note.noteId.length>240||!['reserve','settlement','composite'].includes(note.rail??'reserve')||typeof note.amountUsdCents!=='string'||!/^[1-9]\d*$/.test(note.amountUsdCents)||typeof note.amountPhiMicro!=='string'||!/^\d+$/.test(note.amountPhiMicro))fail('NOTE_INVALID');
   return Object.freeze({noteId:note.noteId,rail:note.rail,amountUsdCents:note.amountUsdCents,amountPhiMicro:note.amountPhiMicro,...(note.recipientUserId?{recipientUserId:note.recipientUserId}:{}),...(note.fundingParts?{fundingParts:structuredClone(note.fundingParts)}:{}),...(note.consumption?{consumption:note.consumption}:{})});
  });noteAdmission.set(wire,{inspect:ports.inspectNote,work});work.catch(()=>noteAdmission.delete(wire));}
  const note=await work;ports.assertOpen?.();if(noteIds.has(note.noteId))fail('NOTE_DUPLICATE');noteIds.add(note.noteId);
  notes.push({...note,digest:wire.sha256,filename:wire.filename});
 }
 return{source,notes,originals};
}
async function makeWire(file:{bytes:Uint8Array;filename:string}):Promise<VaultNoteWire>{
 const bytes=new Uint8Array(file.bytes),name=file.filename;if(!bytes.length||bytes.length>MAX||!filename(name))fail('FORMAT_INVALID');return{filename:name,sha256:await vaultDigest(bytes),bytesB64u:vaultBase64(bytes)};
}
function capacity(source:VaultNoteSource){if(source.notes.length+source.originals.sources.length>MAX_ENTRIES)fail('CAPACITY');encodeVaultNoteSource(source);return finish(source);}
export async function appendVaultNote(value:VaultNoteSource,file:{bytes:Uint8Array;filename:string}):Promise<VaultNoteSource>{
 const source=await captured(value),wire=await makeWire(file);if(source.notes.some(row=>row.sha256===wire.sha256))return source;if(source.originals.sources.some(row=>row.sha256===wire.sha256))fail('SOURCE_KIND_CONFLICT');return capacity({...source,notes:[...source.notes,wire]});
}
export async function appendVaultOriginal(value:VaultNoteSource,file:{bytes:Uint8Array;filename:string}):Promise<VaultNoteSource>{
 const source=await captured(value),wire=await makeWire(file);if(source.originals.sources.some(row=>row.sha256===wire.sha256))return source;if(source.notes.some(row=>row.sha256===wire.sha256))fail('SOURCE_KIND_CONFLICT');return capacity({...source,originals:{...source.originals,sources:[...source.originals.sources,{kind:'owned-source',...wire}]}});
}
