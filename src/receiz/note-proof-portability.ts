import {noteTitle} from './note-design';
import type { ProofSource } from './proof-library';
import receiverBuild from '../../public/native/receiver-verifier.v129.manifest.json';
export type LegacyNoteReceivingVerifier={
  openReserveNoteImage(bytes:Uint8Array):Promise<unknown>;
  inspectReserveNote(handle:unknown):{receivingCustodyCommitmentDigest:string};
};
type Receiver = {
  isBankConnectedNoteImage(bytes:Uint8Array):Promise<boolean>;
  isBankConnectedNoteSource(bytes:Uint8Array):Promise<boolean>;
  inspectConnectedNote(bytes:Uint8Array):Promise<{rail:string;kind:string;receiverKeyId?:string}>;
  inspectConnectedNoteReceipt(bytes:Uint8Array):Promise<{rail:string;kind:string;receiverKeyId?:string}>;
  isBankNoteAccountDeposit(bytes:Uint8Array):boolean;
  inspectAccountNoteDeposit(bytes:Uint8Array):Promise<{rail:string;receiverKeyId:string}>;
  openReserveNoteImage(bytes: Uint8Array): Promise<unknown>;
  inspectReserveNote(value: unknown): { rail: string; noteId: string; receivingCustodyCommitmentDigest:string };
  inspectNoteDepositReceipt(bytes: Uint8Array): Promise<{ rail: string; noteId: string; receiverKeyId: string }>;
  exportVerifiedNoteDepositReceipt(credit: Uint8Array, snapshot: Uint8Array, terminal: string): Promise<Uint8Array>;
};
let pending: Promise<Receiver> | undefined;
function receiver() {
  const url = new URL(`/native/receiver-verifier.v129.mjs?build=${receiverBuild.moduleSha256}`, location.origin).href;
  return pending ??= import(/* @vite-ignore */ url).catch(error => { pending = undefined; throw error; });
}
export async function inspectNoteProof(source: ProofSource, keyId: string): Promise<{ title: string }> {
  const native = await receiver();
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
