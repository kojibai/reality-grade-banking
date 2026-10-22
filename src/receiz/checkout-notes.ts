import {loadReceiz} from './client';
import {sameNoteFundingParts} from './note-funding';
import type {OpenIdentity} from './native-identity';
import type {BankNoteDepositResult,BankNoteInspection} from './offline-notes';
import type {CheckoutNoteEntry} from './checkout-state';
export function createCheckoutNotes(input:{identity:Pick<OpenIdentity,'offlineNotes'>;storeSource(bytes:Uint8Array):Promise<string>;restoreSource(digest:string):Promise<Uint8Array>;assertCurrent():void}){
 const inspected=new Map<string,BankNoteInspection>();
 const api=async()=>{input.assertCurrent();if(!input.identity.offlineNotes)throw Error('Note payments are unavailable.');const value=await input.identity.offlineNotes();input.assertCurrent();return value;};
 const same=(a:BankNoteInspection,b:{noteId:string;rail?:string;amountUsdCents:string;amountPhiMicro?:string;fundingParts?:BankNoteInspection['fundingParts']})=>a.noteId===b.noteId&&(a.rail??'reserve')===(b.rail??'reserve')&&a.amountUsdCents===b.amountUsdCents&&a.amountPhiMicro===b.amountPhiMicro&&sameNoteFundingParts(a.fundingParts,b.fundingParts);
 async function adopt(entry:CheckoutNoteEntry,result:BankNoteDepositResult):Promise<CheckoutNoteEntry>{
  input.assertCurrent();if(!same(entry.inspection,result))throw Error('BANK_NOTE_DEPOSIT_BINDING_MISMATCH');
  if(result.status==='received')return{...entry,status:'received'};
  if(!result.proofBytes?.length)throw Error('BANK_NOTE_DEPOSIT_PROOF_REQUIRED');
  const creditSourceDigest=await input.storeSource(result.proofBytes);input.assertCurrent();return{...entry,status:'confirmed',creditSourceDigest};
 }
 async function check(entry:CheckoutNoteEntry):Promise<CheckoutNoteEntry>{
  input.assertCurrent();if(entry.status==='confirmed')return entry;
  const n=await api(),rows=n.reconcileReceivedNotes?await n.reconcileReceivedNotes():await n.receivedNotes?.()??[];input.assertCurrent();
  const found=rows.find(row=>row.noteId===entry.noteId);if(found)return adopt(entry,found);
  if(n.recoverDeposit){const bytes=await input.restoreSource(entry.sourceRef);input.assertCurrent();if(await(await loadReceiz()).sha256ReceizBytes(bytes)!==entry.sourceDigest)throw Error('BANK_NOTE_SOURCE_DIGEST_MISMATCH');const recovered=await n.recoverDeposit(bytes);if(recovered)return adopt(entry,recovered);}
  return entry;
 }
 async function validate(entry:CheckoutNoteEntry){
  input.assertCurrent();if(entry.status==='confirmed')return;
  const bytes=await input.restoreSource(entry.sourceRef);input.assertCurrent();
  if(await(await loadReceiz()).sha256ReceizBytes(bytes)!==entry.sourceDigest)throw Error('BANK_NOTE_SOURCE_DIGEST_MISMATCH');
  const n=await api();if(!n.validateDeposit)throw Error('BANK_NOTE_RECEIVING_VALIDATION_REQUIRED');await n.validateDeposit(bytes);input.assertCurrent();
 }
 return{validate,
  async inspect(file:File):Promise<CheckoutNoteEntry>{
   input.assertCurrent();if(!file.size||file.size>32*1024*1024)throw Error('This original exceeds the supported Note proof capacity.');
   const bytes=new Uint8Array(await file.arrayBuffer()),n=await api(),inspection=await n.inspect(bytes);input.assertCurrent();
   if((await n.receivedNotes?.()??[]).some(row=>row.noteId===inspection.noteId&&row.status!=='received'))throw Error('BANK_NOTE_ALREADY_DEPOSITED');
   if(!n.validateDeposit)throw Error('BANK_NOTE_RECEIVING_VALIDATION_REQUIRED');await n.validateDeposit(bytes);input.assertCurrent();
   const digest=await(await loadReceiz()).sha256ReceizBytes(bytes),sourceRef=await input.storeSource(bytes);input.assertCurrent();if(sourceRef!==digest)throw Error('BANK_NOTE_SOURCE_DIGEST_MISMATCH');
   inspected.set(digest,inspection);return{sourceDigest:digest,sourceRef,noteId:inspection.noteId,rail:inspection.rail??'reserve',inspection,status:'inspected'};
  },
  async deposit(entry:CheckoutNoteEntry):Promise<CheckoutNoteEntry>{
   input.assertCurrent();if(entry.status!=='inspected')return check(entry);
   if(entry.sourceRef!==entry.sourceDigest)throw Error('BANK_NOTE_SOURCE_DIGEST_MISMATCH');
   const bytes=await input.restoreSource(entry.sourceRef);input.assertCurrent();if(await(await loadReceiz()).sha256ReceizBytes(bytes)!==entry.sourceDigest)throw Error('BANK_NOTE_SOURCE_DIGEST_MISMATCH');
   const n=await api(),actual=inspected.get(entry.sourceDigest)??await n.inspect(bytes);input.assertCurrent();if(!same(actual,entry.inspection))throw Error('BANK_NOTE_DEPOSIT_BINDING_MISMATCH');
   return adopt(entry,await n.deposit(bytes));
  },check,
 };
}
export type CheckoutNotes=ReturnType<typeof createCheckoutNotes>;
