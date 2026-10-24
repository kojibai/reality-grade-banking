import type {BankNoteDepositResult,BankNoteImage,BankNoteInspection,BankNoteAccountModule} from './offline-notes';
import {isConnectedNote,readConnectedNote,openConnectedAccountNote,type ConnectedNoteModule} from './connected-note-application';
import type {createConnectedNoteRuntime} from './connected-note-runtime';
import type {createLocalNoteDepositQueue} from './note-received-deposits';

/** Recovery may replay an existing transfer, but never allocates a receiver. */
export async function recoverConnectedNoteDeposit(input:{noteId:string;funding:boolean;connected:ReturnType<typeof createConnectedNoteRuntime>;received:ReturnType<typeof createLocalNoteDepositQueue>;reconcile():Promise<void>}):Promise<BankNoteDepositResult|null>{
 if(input.funding&&!(await input.received.list()).some(row=>row.noteId===input.noteId)){
  const self=await input.connected.recoverSelfDeposit(input.noteId);
  if(self)await input.received.receive(self.sourceBytes);
  else{const transfer=await input.connected.recoverTransfer(input.noteId);if(transfer)await input.received.receive(transfer.image);}
 }
 await input.reconcile();const confirmed=await input.received.confirmed(input.noteId);if(confirmed)await input.connected.confirmSelfDeposit(input.noteId,confirmed.proofBytes);
 return(await input.received.list()).find(row=>row.noteId===input.noteId)??null;
}

export async function validateNativeNoteDeposit(input:{image:Uint8Array;module:BankNoteAccountModule&ConnectedNoteModule;context:{receiverUserId:string;receiverKeyId:string};connected:Pick<ReturnType<typeof createConnectedNoteRuntime>,'holdsFundingSource'>;savedNotes():Promise<BankNoteImage[]>;holdsReceivingCustody?(image:Uint8Array):Promise<boolean>;holdsLegacyReceivingCustody?(image:Uint8Array):Promise<boolean>;inspectLegacy(image:Uint8Array):Promise<BankNoteInspection>}):Promise<void>{
 const {image,module,context}=input;
 if(await isConnectedNote(module,image)){
  const held=await readConnectedNote(module,image);
  if(held.kind==='funding'){
   if(held.funding.accountUserId!==context.receiverUserId||held.funding.issuer?.keyId!==context.receiverKeyId||!await input.connected.holdsFundingSource(held.noteId,held.terminalSourceBytes))throw Error('BANK_NOTE_IDENTITY_BINDING_REQUIRED');
  }else await openConnectedAccountNote(module,image,context);
  return;
 }
 if(module.isBankNoteAccountDeposit(image)){await module.openBankNoteAccountDeposit(image,context);return;}
 const note=await input.inspectLegacy(image),held=await input.savedNotes();
 // Exact untransferred inventory preserves original custody. Incoming
 // qualified Notes instead require the independent prepared or legacy
 // receiving check below; a matching Note ID alone grants no custody.
 if(held.some(saved=>saved.noteId===note.noteId&&!saved.transferred&&!saved.transferPending&&saved.image.length===image.length&&saved.image.every((value,index)=>value===image[index])))return;
 if(await input.holdsReceivingCustody?.(image))return;
 if(await input.holdsLegacyReceivingCustody?.(image))return;
 throw Error('BANK_NOTE_RECEIVING_CUSTODY_REQUIRED');
}

/** Encrypted slot pointers grant no source authority. The receiver verifier
 * independently admits the complete Note before its commitment is matched. */
export async function holdsLegacyNoteReceivingCustody(input:{image:Uint8Array;uid:string;keyId:string;read():Promise<unknown>;inspectCommitment(image:Uint8Array):Promise<string>}):Promise<boolean>{
 const raw=await input.read();if(raw===null)return false;
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('BANK_NOTE_PRIVATE_SOURCE_INVALID');
 const state=structuredClone(raw)as Record<string,unknown>;
 if(state.schema!=='receiz.bank.offline-notes-device.v1'||state.keyId!==input.keyId||state.uid!==input.uid)throw Error('BANK_NOTE_IDENTITY_CHANGED');
 if(!state.receivers||typeof state.receivers!=='object'||Array.isArray(state.receivers))throw Error('BANK_NOTE_PRIVATE_SOURCE_INVALID');
 const receivers=state.receivers as Record<string,unknown>,prefix=`bank-receive:${input.keyId}:`;
 const ownedSlot=(value:unknown)=>typeof value==='string'&&value.startsWith(prefix)&&/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(value.slice(prefix.length));
 // No receiving slot means no extra verifier load for this legacy family.
 if(!Object.values(receivers).some(ownedSlot))return false;
 const commitment=await input.inspectCommitment(input.image);
 return ownedSlot(receivers[commitment]);
}
