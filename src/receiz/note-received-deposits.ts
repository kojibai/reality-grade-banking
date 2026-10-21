import {sameNoteFundingParts} from './note-funding';
import type {BankNoteDeposit,BankNoteDepositResult,BankNoteRail,BankNoteFundingParts} from './offline-notes';

export interface ReceivedNoteSource {rail:BankNoteRail;fundingParts?:BankNoteFundingParts;noteId:string;amountPhiMicro:string;amountUsdCents:string;receiverUserId:string;receiverKeyId:string;redemptionDigest:string;terminalArtifactSha256:string;terminalSourceBytes:Uint8Array;}
type Entry={sourceRef:string;redemptionDigest:string;terminalArtifactSha256:string;status:'received'|'confirmed';creditRef?:string;submissionEntered?:boolean;submissionRef?:string};
type State={schema:'bank.received-note-deposits.v1';uid:string;keyId:string;entries:Record<string,Entry>};
const sha=(v:unknown):v is string=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
/** Checkpoint validation grants no financial authority. Shared with the
 * identity-removal guard so unreadable/pending source cannot lose its key. */
export function readReceivedNoteDepositCheckpoint(value:unknown):State|null{
 if(value===null)return null;
 const state=structuredClone(value) as State;
 if(!state||state.schema!=='bank.received-note-deposits.v1'||typeof state.uid!=='string'||!state.uid||typeof state.keyId!=='string'||!state.keyId||!state.entries||typeof state.entries!=='object'||Array.isArray(state.entries)||Object.keys(state.entries).length>64)throw Error('BANK_NOTE_PRIVATE_SOURCE_INVALID');
 for(const [id,row] of Object.entries(state.entries))if(!id||!row||!sha(row.sourceRef)||!sha(row.redemptionDigest)||!sha(row.terminalArtifactSha256)||!['received','confirmed'].includes(row.status)||row.status==='confirmed'&&!sha(row.creditRef)||row.submissionRef!==undefined&&!sha(row.submissionRef)||row.submissionEntered!==undefined&&typeof row.submissionEntered!=='boolean')throw Error('BANK_NOTE_PRIVATE_SOURCE_INVALID');
 return state;
}
/** An encrypted local receiving queue, never a replacement wallet or consumption
 * authority. The complete v129 terminal is admitted before display. Only the
 * existing native credit verifier at submit() can confirm reconciliation. */
export function createLocalNoteDepositQueue(input:{uid:string;keyId:string;assertOpen():void;read():Promise<unknown>;write(next:unknown,previous:unknown):Promise<void>;
 retain(bytes:Uint8Array):Promise<string>;restore(ref:string):Promise<Uint8Array>;verify(bytes:Uint8Array):Promise<ReceivedNoteSource>;prepare?(bytes:Uint8Array):Promise<Uint8Array>;submit(bytes:Uint8Array,options:{recoverFirst:boolean;preparedRequestBytes?:Uint8Array}):Promise<BankNoteDeposit>}){
 const admissions=new Map<string,Promise<ReceivedNoteSource>>();
 let reconciliation:Promise<void>|undefined;
 async function load(){
  input.assertOpen();const previous=await input.read();input.assertOpen();
  const state=readReceivedNoteDepositCheckpoint(previous)??{schema:'bank.received-note-deposits.v1',uid:input.uid,keyId:input.keyId,entries:{}} as State;
  if(state.uid!==input.uid||state.keyId!==input.keyId)throw Error('BANK_NOTE_PRIVATE_SOURCE_INVALID');
  return {state,previous};
 }
 async function original(ref:string){
  let pending=admissions.get(ref);
  if(!pending){pending=(async()=>{const bytes=await input.restore(ref),digest=[...new Uint8Array(await crypto.subtle.digest('SHA-256',new Uint8Array(bytes)))].map(v=>v.toString(16).padStart(2,'0')).join('');
    if(digest!==ref)throw Error('BANK_NOTE_SOURCE_REQUIRED');return input.verify(bytes);})();admissions.set(ref,pending);void pending.catch(()=>{if(admissions.get(ref)===pending)admissions.delete(ref);});}
  const held=await pending;input.assertOpen();
  if(held.receiverUserId!==input.uid||held.receiverKeyId!==input.keyId)throw Error('BANK_NOTE_IDENTITY_BINDING_REQUIRED');return held;
 }
 async function result(id:string,row:Entry):Promise<BankNoteDepositResult>{
  const held=await original(row.sourceRef);
  if(id!==held.noteId||row.redemptionDigest!==held.redemptionDigest||row.terminalArtifactSha256!==held.terminalArtifactSha256)throw Error('BANK_NOTE_DEPOSIT_BINDING_MISMATCH');
  if(row.status==='received')return {status:'received',rail:held.rail,noteId:held.noteId,amountPhiMicro:held.amountPhiMicro,amountUsdCents:held.amountUsdCents,...(held.fundingParts?{fundingParts:structuredClone(held.fundingParts)}:{}),proofBytes:held.terminalSourceBytes.slice()};
  const saved=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(await input.restore(row.creditRef!))) as Omit<BankNoteDeposit,'proofBytes'>&{proofRef:string};
  if(saved.noteId!==held.noteId||saved.rail!==held.rail||saved.amountPhiMicro!==held.amountPhiMicro||saved.amountUsdCents!==held.amountUsdCents||!sameNoteFundingParts(saved.fundingParts,held.fundingParts)||!sha(saved.proofRef))throw Error('BANK_NOTE_DEPOSIT_BINDING_MISMATCH');
  const {proofRef,...fields}=saved;return {...fields,status:'confirmed',proofBytes:await input.restore(proofRef)};
 }
 async function list(options:{pendingOnly?:boolean}={}){const {state}=await load();return Promise.all(Object.entries(state.entries).filter(([,row])=>!options.pendingOnly||row.status==='received').map(([id,row])=>result(id,row)));}
 return {
  list,
  async confirmed(noteId:string){const {state}=await load(),row=state.entries[noteId];return row?.status==='confirmed'?result(noteId,row):null;},
  async receive(bytes:Uint8Array):Promise<BankNoteDepositResult>{
   const held=await input.verify(bytes.slice());input.assertOpen();
   if(held.receiverUserId!==input.uid||held.receiverKeyId!==input.keyId)throw Error('BANK_NOTE_IDENTITY_BINDING_REQUIRED');
   const {state,previous}=await load(),existing=state.entries[held.noteId];
   if(existing){if(existing.redemptionDigest!==held.redemptionDigest||existing.terminalArtifactSha256!==held.terminalArtifactSha256)throw Error('BANK_NOTE_EXACT_DEPOSIT_REQUIRED');return result(held.noteId,existing);}
   if(Object.keys(state.entries).length>=64)throw Error('BANK_NOTE_DEVICE_CAPACITY');
   const sourceRef=await input.retain(held.terminalSourceBytes);input.assertOpen();
   state.entries[held.noteId]={sourceRef,redemptionDigest:held.redemptionDigest,terminalArtifactSha256:held.terminalArtifactSha256,status:'received',submissionEntered:false};
   await input.write(state,previous);input.assertOpen();return result(held.noteId,state.entries[held.noteId]!);
  },
  reconcile(){
   return reconciliation??=(async()=>{
    let current=await load();
    for(const [id,row]of Object.entries(current.state.entries)){
     if(row.status==='confirmed')continue;
     const held=await original(row.sourceRef),recoverFirst=row.submissionEntered!==false;
     let submissionRef=row.submissionRef;
     if(!submissionRef&&input.prepare){submissionRef=await input.retain(await input.prepare(held.terminalSourceBytes.slice()));input.assertOpen();}
     // Persist entry into submission before the consequential request. A fresh
     // original needs one POST; unknown/reopened legacy attempts recover first.
     if(!recoverFirst||submissionRef!==row.submissionRef){current.state.entries[id]={...row,submissionEntered:true,...(submissionRef?{submissionRef}:{})};await input.write(current.state,current.previous);input.assertOpen();current=await load();}
     const preparedRequestBytes=submissionRef?await input.restore(submissionRef):undefined;
     if(preparedRequestBytes&&[...new Uint8Array(await crypto.subtle.digest('SHA-256',new Uint8Array(preparedRequestBytes)))].map(v=>v.toString(16).padStart(2,'0')).join('')!==submissionRef)throw Error('BANK_NOTE_SOURCE_REQUIRED');
     const credited=await input.submit(held.terminalSourceBytes.slice(),{recoverFirst,...(preparedRequestBytes?{preparedRequestBytes}:{})});input.assertOpen();
     if(credited.noteId!==held.noteId||credited.rail!==held.rail||credited.amountPhiMicro!==held.amountPhiMicro||credited.amountUsdCents!==held.amountUsdCents||!sameNoteFundingParts(credited.fundingParts,held.fundingParts)||!(credited.proofBytes instanceof Uint8Array)||!credited.proofBytes.length)throw Error('BANK_NOTE_DEPOSIT_BINDING_MISMATCH');
     const proofRef=await input.retain(credited.proofBytes),{proofBytes:_,...fields}=credited;
     const creditRef=await input.retain(new TextEncoder().encode(JSON.stringify({...fields,proofRef})));input.assertOpen();
     current.state.entries[id]={...row,...(submissionRef?{submissionRef}:{}),submissionEntered:true,status:'confirmed',creditRef};await input.write(current.state,current.previous);input.assertOpen();current=await load();
    }
   })().finally(()=>{reconciliation=undefined;});
  },
 };
}
