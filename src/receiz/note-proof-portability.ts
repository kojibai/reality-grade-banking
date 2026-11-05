import {noteTitle,type NoteRail} from './note-design';
import type { ProofSource } from './proof-library';
import receiverBuild from '../../public/native/receiver-verifier.v129.manifest.json';
import type {RecordProofExportInput} from './record-proof-export';
import {hasProofCaptureCarrier,isProofPng,openCanonicalProofFile} from './proof-capture';
const noteRecordSchemas=['receiz.bank.note-deposit-receipt.v1','receiz.bank.note-redemption-source.v1','receiz.bank.note-redemption-source.v2','receiz.bank.connected-note.receipt.v1','receiz.bank.connected-note.handover-source.v1'];
/** Transport only. Existing funded PNGs and raw native sources keep their
 * existing receiver path. Only an SDK-opened capture of an existing Note
 * record unwraps; the caller must still run that receiver's full inspection. */
export async function readNoteProofImport(file:File,loadPngReceiver:()=>Promise<Pick<Receiver,'isBankConnectedNoteImage'|'openReserveNoteImage'|'inspectReserveNote'>>=receiver):Promise<Uint8Array>{
 const filename=file.name,mimeType=file.type,size=file.size;
 if(!size||size>32*1024*1024)throw Error('PROOF_SOURCE_INVALID');
 const bytes=new Uint8Array(await file.arrayBuffer());
 // A delivered Note PNG's enclosing seal carries its per-Note authority.
 // Keep that complete carrier for the existing native delivery admission.
 if(isProofPng(bytes))return bytes;
 let value:unknown;try{value=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch{/* Existing native reader handles unsupported raw bytes. */}
 if(!hasProofCaptureCarrier(bytes)&&(value as {kind?:unknown}|null)?.kind!=='receiz.bundle.v1')return bytes;
 const opened=await openCanonicalProofFile(new File([bytes],filename,{type:mimeType}));
 if(isProofPng(opened.verifiedPayload.bytes)){
  const exact=new Uint8Array(opened.verifiedPayload.bytes),native=await loadPngReceiver();
  if(await native.isBankConnectedNoteImage(exact))return exact;
  try{native.inspectReserveNote(await native.openReserveNoteImage(exact));return exact;}catch{/* An ordinary sealed PNG stays an ordinary Original. */}
 }
 let payload:unknown;try{payload=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(opened.verifiedPayload.bytes));}catch{/* An unrelated canonical Original remains unrelated to Notes. */}
 return noteRecordSchemas.includes(String((payload as {schema?:unknown}|null)?.schema))?new Uint8Array(opened.verifiedPayload.bytes):bytes;
}
/** Capture the complete already-held receipt/received terminal, including its
 * private opening. Octet-stream keeps strict native JSON byte-for-byte intact;
 * this export does not submit a deposit or acquire receiving custody. */
export async function captureNoteDepositProof(bytes:Uint8Array,filename:string,seal:(input:RecordProofExportInput)=>Promise<File>):Promise<File>{
  const snapshot={bytes:new Uint8Array(bytes),filename,mimeType:'application/octet-stream'};
  if(!snapshot.bytes.length||snapshot.bytes.length>32*1024*1024)throw Error('PROOF_SOURCE_INVALID');
  return seal(snapshot);
}
export type LegacyNoteReceivingVerifier={
  openReserveNoteImage(bytes:Uint8Array):Promise<unknown>;
  inspectReserveNote(handle:unknown):{receivingCustodyCommitmentDigest:string};
};
type Receiver = {
  isBankConnectedNoteImage(bytes:Uint8Array):Promise<boolean>;
  isBankConnectedNoteSource(bytes:Uint8Array):Promise<boolean>;
  inspectConnectedNote(bytes:Uint8Array):Promise<{rail:NoteRail;kind:string;receiverKeyId?:string}>;
  inspectConnectedNoteReceipt(bytes:Uint8Array):Promise<{rail:NoteRail;kind:string;receiverKeyId?:string}>;
  isBankNoteAccountDeposit(bytes:Uint8Array):boolean;
  inspectAccountNoteDeposit(bytes:Uint8Array):Promise<{rail:NoteRail;receiverKeyId:string}>;
  openReserveNoteImage(bytes: Uint8Array): Promise<unknown>;
  inspectReserveNote(value: unknown): { rail: NoteRail; noteId: string; receivingCustodyCommitmentDigest:string };
  inspectNoteDepositReceipt(bytes: Uint8Array): Promise<{ rail: NoteRail; noteId: string; receiverKeyId: string }>;
  exportVerifiedNoteDepositReceipt(credit: Uint8Array, snapshot: Uint8Array, terminal: string): Promise<Uint8Array>;
};
let pending: Promise<Receiver> | undefined;
function receiver() {
  const url = new URL(`/native/receiver-verifier.v129.mjs?build=${receiverBuild.moduleSha256}`, location.origin).href;
  return pending ??= import(/* @vite-ignore */ url).catch(error => { pending = undefined; throw error; });
}
export async function inspectNoteProof(source: ProofSource, keyId: string,load:()=>Promise<Receiver>=receiver): Promise<{ title: string }> {
  const native = await load();
  if(await native.isBankConnectedNoteImage(source.bytes)||await native.isBankConnectedNoteSource(source.bytes)){
    const note=await native.inspectConnectedNote(source.bytes);
    if(source.kind==='note-deposit'&&note.receiverKeyId!==keyId)throw Error('PROOF_RECEIPT_IDENTITY_MISMATCH');
    return{title:`${noteTitle(note.rail)} · ${note.kind==='handover'?'received proof':'funded original'}`};
  }
  if(native.isBankNoteAccountDeposit(source.bytes)){
    const received=await native.inspectAccountNoteDeposit(source.bytes);
    if(source.kind==='note-deposit'&&received.receiverKeyId!==keyId)throw Error('PROOF_RECEIPT_IDENTITY_MISMATCH');
    return {title:`${noteTitle(received.rail)} · ${source.kind==='note-image'?'completed transfer':'received'} proof`};
  }
  if (source.kind === 'note-image') {
    const note = native.inspectReserveNote(await native.openReserveNoteImage(new Uint8Array(source.bytes)));
    return { title: `${noteTitle(note.rail)} · carried proof` };
  }
  const schema=(()=>{try{return JSON.parse(new TextDecoder().decode(source.bytes))?.schema;}catch{return null;}})();
  const receipt = schema==='receiz.bank.connected-note.receipt.v1'?await native.inspectConnectedNoteReceipt(source.bytes):await native.inspectNoteDepositReceipt(new Uint8Array(source.bytes));
  if (receipt.receiverKeyId !== keyId) throw Error('PROOF_RECEIPT_IDENTITY_MISMATCH');
  return { title: `${noteTitle(receipt.rail)} deposit receipt` };
}
export async function readRetainedNoteProofs(input: { keyId: string; read(): Promise<unknown>; restore(digest: string): Promise<Uint8Array> }): Promise<ProofSource[]> {
  const state = await input.read() as { schema?: string; keyId?: string; notes?: Record<string, { imageRef?: string }>; deposits?: Record<string, { imageRef?: string; creditRef?: string; terminalRef?: string; privateCash?: string }> } | null;
  if (!state) return [];
  if (state.schema !== 'receiz.bank.offline-notes-device.v1' || state.keyId !== input.keyId) throw Error('PROOF_NOTE_IDENTITY_MISMATCH');
  const result: ProofSource[] = [], images = new Set<string>();
  const image = async (id: string, ref?: string) => {
    if (!ref || images.has(ref)) return;
    result.push({ kind: 'note-image', filename: `note-${id}.png`, bytes: await input.restore(ref) }); images.add(ref);
  };
  for (const [id, note] of Object.entries(state.notes ?? {})) await image(id, note.imageRef);
  for (const [id, deposit] of Object.entries(state.deposits ?? {})) {
    await image(id, deposit.imageRef);
    if (!deposit.creditRef) continue;
    if (!deposit.terminalRef || !deposit.privateCash) throw Error('PROOF_NOTE_RECEIPT_INCOMPLETE');
    const { loadReceiz } = await import('./client'), sdk = await loadReceiz();
    const native = await receiver();
    const bytes = await native.exportVerifiedNoteDepositReceipt(await input.restore(deposit.creditRef), sdk.receizBase64UrlDecode(deposit.privateCash), new TextDecoder('utf-8', { fatal: true }).decode(await input.restore(deposit.terminalRef)));
    result.push({ kind: 'note-deposit', filename: `note-deposit-${id}.receiz.json`, bytes });
  }
  return result;
}

/** A commitment is exposed only after complete canonical admission. The
 * default loader shares the existing lazy read-only receiver module. */
export async function inspectLegacyReceivingCommitment(bytes:Uint8Array,load:()=>Promise<LegacyNoteReceivingVerifier>=receiver):Promise<string>{
 const native=await load(),note=native.inspectReserveNote(await native.openReserveNoteImage(new Uint8Array(bytes)));
 if(!/^[a-f0-9]{64}$/.test(note.receivingCustodyCommitmentDigest))throw Error('BANK_NOTE_RECEIVING_CUSTODY_REQUIRED');
 return note.receivingCustodyCommitmentDigest;
}
