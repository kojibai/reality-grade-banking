import {needsHandoffProof,openWitnessedNote,type NoteHandoffWitness} from './note-handoff-witness';
import {sameNoteFundingParts} from './note-funding';
import type {BankForwardedNote,BankNoteDeposit,BankNoteDepositResult,BankNoteRail,BankNoteFundingParts} from './offline-notes';

export interface ReceivedNoteSource {forwardable?:true;predecessorSha256s?:readonly string[];rail:BankNoteRail;fundingParts?:BankNoteFundingParts;noteId:string;amountPhiMicro:string;amountUsdCents:string;receiverUserId:string;receiverKeyId:string;redemptionDigest:string;terminalArtifactSha256:string;terminalSourceBytes:Uint8Array;}
type ForwardedHead={sourceRef:string;requestRef:string;successorRef:string};
type Entry={sourceRef:string;forwarded?:ForwardedHead;history?:ForwardedHead[];originalImageRef?:string;redemptionDigest:string;terminalArtifactSha256:string;status:'received'|'confirmed'|'forwarded';creditRef?:string;submissionEntered?:boolean;submissionRef?:string;lastError?:string};
type State={schema:'bank.received-note-deposits.v1';uid:string;keyId:string;entries:Record<string,Entry>};
const sha=(v:unknown):v is string=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
/** Checkpoint validation grants no financial authority. Shared with the
 * identity-removal guard so unreadable/pending source cannot lose its key. */
export function readReceivedNoteDepositCheckpoint(value:unknown):State|null{
 if(value===null)return null;
 const state=structuredClone(value) as State;
 if(!state||state.schema!=='bank.received-note-deposits.v1'||typeof state.uid!=='string'||!state.uid||typeof state.keyId!=='string'||!state.keyId||!state.entries||typeof state.entries!=='object'||Array.isArray(state.entries)||Object.keys(state.entries).length>64)throw Error('BANK_NOTE_PRIVATE_SOURCE_INVALID');
 for(const [id,row] of Object.entries(state.entries))if(!id||!row||!sha(row.sourceRef)||row.originalImageRef!==undefined&&!sha(row.originalImageRef)||!sha(row.redemptionDigest)||!sha(row.terminalArtifactSha256)||!['received','confirmed','forwarded'].includes(row.status)||row.status==='confirmed'&&!sha(row.creditRef)||row.submissionRef!==undefined&&!sha(row.submissionRef)||row.submissionEntered!==undefined&&typeof row.submissionEntered!=='boolean')throw Error('BANK_NOTE_PRIVATE_SOURCE_INVALID');
 for(const row of Object.values(state.entries)){
  const valid=(head:unknown):head is ForwardedHead=>!!head&&typeof head==='object'&&
   ['sourceRef','requestRef','successorRef'].every(field=>sha((head as Record<string,unknown>)[field]));
  if(row.status==='forwarded'? !valid(row.forwarded)||row.forwarded.sourceRef!==row.sourceRef||row.submissionEntered!==false||row.submissionRef!==undefined : row.forwarded!==undefined)
   throw Error('BANK_NOTE_PRIVATE_SOURCE_INVALID');
  if(row.history!==undefined&&(!Array.isArray(row.history)||row.history.length>24||!row.history.every(valid)))
   throw Error('BANK_NOTE_PRIVATE_SOURCE_INVALID');
 }
 for(const row of Object.values(state.entries))if(row.lastError!==undefined&&(row.status!=='received'||typeof row.lastError!=='string'||!/^[A-Z0-9_]{1,120}$/.test(row.lastError)))throw Error('BANK_NOTE_PRIVATE_SOURCE_INVALID');
 return state;
}
/** An encrypted local receiving queue, never a replacement wallet or consumption
 * authority. The complete v129 terminal is admitted before display. Only the
 * existing native credit verifier at submit() can confirm reconciliation. */
export function createLocalNoteDepositQueue(input:{uid:string;keyId:string;assertOpen():void;read():Promise<unknown>;write(next:unknown,previous:unknown):Promise<void>;
 retain(bytes:Uint8Array):Promise<string>;restore(ref:string):Promise<Uint8Array>;verify(bytes:Uint8Array):Promise<ReceivedNoteSource>;
 handoffWitness?:NoteHandoffWitness;forward?(source:Uint8Array,request:Uint8Array):Promise<Uint8Array>;verifyForward?(source:Uint8Array,successor:Uint8Array):Promise<void>;prepare?(bytes:Uint8Array):Promise<Uint8Array>;submit(bytes:Uint8Array,options:{recoverFirst:boolean;preparedRequestBytes?:Uint8Array}):Promise<BankNoteDeposit>}){
 const digest=async(bytes:Uint8Array)=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new Uint8Array(bytes)))].map(v=>v.toString(16).padStart(2,'0')).join('');
 async function exact(ref:string){
  const bytes=await input.restore(ref);input.assertOpen();
  if(await digest(bytes)!==ref)throw Error('BANK_NOTE_SOURCE_REQUIRED');
  return bytes;
 }
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
  if(!pending){pending=(async()=>{return input.verify(await exact(ref));})();admissions.set(ref,pending);void pending.catch(()=>{if(admissions.get(ref)===pending)admissions.delete(ref);});}
  const held=await pending;input.assertOpen();
  if(held.receiverUserId!==input.uid||held.receiverKeyId!==input.keyId)throw Error('BANK_NOTE_IDENTITY_BINDING_REQUIRED');return held;
 }
 async function forwarded(held:ReceivedNoteSource,head:ForwardedHead):Promise<BankForwardedNote>{
  if(!input.verifyForward)throw Error('BANK_NOTE_FORWARD_UNAVAILABLE');
  const proofBytes=await exact(head.successorRef);
  await input.verifyForward(held.terminalSourceBytes.slice(),proofBytes.slice());input.assertOpen();
  return {status:'forwarded',noteId:held.noteId,rail:held.rail,amountPhiMicro:held.amountPhiMicro,
   amountUsdCents:held.amountUsdCents,...(held.fundingParts?{fundingParts:structuredClone(held.fundingParts)}:{}),proofBytes};
 }
 async function result(id:string,row:Entry):Promise<BankNoteDepositResult>{
  const held=await original(row.sourceRef);
  if(id!==held.noteId||row.redemptionDigest!==held.redemptionDigest||row.terminalArtifactSha256!==held.terminalArtifactSha256)throw Error('BANK_NOTE_DEPOSIT_BINDING_MISMATCH');
  const image=row.originalImageRef?{hasOriginalImage:true as const}:{};
  if(row.status==='forwarded'){
   try{return {...image,...await forwarded(held,row.forwarded!)};}
   catch(cause){if(!input.handoffWitness?.read(row.sourceRef)||!(cause instanceof Error)||cause.message!=='BANK_NOTE_EXACT_SOURCE_UNAVAILABLE')throw cause;}
  }
  if(row.status!=='confirmed')return {...image,status:'received',...(input.handoffWitness?.read(row.sourceRef)?{handoffRecovery:true as const}:held.forwardable&&row.submissionEntered===false?{forwardable:true as const}:{}),rail:held.rail,noteId:held.noteId,amountPhiMicro:held.amountPhiMicro,amountUsdCents:held.amountUsdCents,...(held.fundingParts?{fundingParts:structuredClone(held.fundingParts)}:{}),...(row.lastError?{depositError:row.lastError}:{}),proofBytes:held.terminalSourceBytes.slice()};
  const saved=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(await input.restore(row.creditRef!))) as Omit<BankNoteDeposit,'proofBytes'>&{proofRef:string};
  if(saved.noteId!==held.noteId||saved.rail!==held.rail||saved.amountPhiMicro!==held.amountPhiMicro||saved.amountUsdCents!==held.amountUsdCents||!sameNoteFundingParts(saved.fundingParts,held.fundingParts)||!sha(saved.proofRef))throw Error('BANK_NOTE_DEPOSIT_BINDING_MISMATCH');
  const {proofRef,...fields}=saved;return {...fields,...image,status:'confirmed',proofBytes:await input.restore(proofRef)};
 }
 async function list(options:{pendingOnly?:boolean}={}){const {state}=await load();return Promise.all(Object.entries(state.entries).filter(([,row])=>!options.pendingOnly||row.status==='received'&&!input.handoffWitness?.read(row.sourceRef)).map(([id,row])=>result(id,row)));}
 async function recoverHandoff(noteId:string,proof?:Uint8Array):Promise<BankForwardedNote>{
  const {state,previous}=await load(),row=state.entries[noteId];
  if(!row||row.status==='confirmed'||row.submissionEntered!==false||row.submissionRef)
   throw Error('BANK_NOTE_FORWARD_UNAVAILABLE');
  const witness=input.handoffWitness?.read(row.sourceRef);
  if(!witness)throw Error('BANK_NOTE_FORWARD_UNAVAILABLE');
  if(row.forwarded)input.handoffWitness?.record(row.sourceRef,row.forwarded);
  const bytes=await openWitnessedNote(witness,exact,proof);
  if(await digest(bytes)!==witness.successorRef)throw Error('BANK_NOTE_EXACT_TRANSFER_REQUIRED');
  const held=await original(row.sourceRef);
  if(!input.verifyForward||held.noteId!==noteId)throw Error('BANK_NOTE_FORWARD_UNAVAILABLE');
  await input.verifyForward(held.terminalSourceBytes.slice(),bytes.slice());input.assertOpen();
  if(proof&&await input.retain(bytes)!==witness.successorRef)throw Error('BANK_NOTE_SOURCE_REQUIRED');
  const head={...witness,sourceRef:row.sourceRef};
  if(!row.forwarded){
   state.entries[noteId]={...row,status:'forwarded',forwarded:head};
   await input.write(state,previous);input.assertOpen();
  }
  return forwarded(held,head);
 }
 return {
  list,recoverHandoff,
  async forward(noteId:string,request:Uint8Array):Promise<BankForwardedNote>{
   if(!input.forward||!input.verifyForward||!request.length||request.length>16384)throw Error('BANK_NOTE_FORWARD_UNAVAILABLE');
   const signedRequest=request.slice(),requestHash=await digest(signedRequest),{state,previous}=await load(),row=state.entries[noteId];
   if(!row||row.status==='confirmed'||row.submissionEntered!==false||row.submissionRef!==undefined)
    throw Error('BANK_NOTE_FORWARD_UNAVAILABLE');
   const held=await original(row.sourceRef);
   if(held.noteId!==noteId||!held.forwardable||held.terminalArtifactSha256!==row.terminalArtifactSha256||held.redemptionDigest!==row.redemptionDigest)
    throw Error('BANK_NOTE_FORWARD_UNAVAILABLE');
   const witness=input.handoffWitness?.read(row.sourceRef);
   if(witness&&witness.requestRef!==requestHash)throw Error('BANK_NOTE_EXACT_TRANSFER_REQUIRED');
   if(witness&&!row.forwarded)return recoverHandoff(noteId);
   if(row.forwarded){
    if(row.forwarded.requestRef!==requestHash)throw Error('BANK_NOTE_EXACT_TRANSFER_REQUIRED');
    const result=await forwarded(held,row.forwarded);
    input.handoffWitness?.record(row.sourceRef,row.forwarded);
    return result;
   }
   const successor=await input.forward(held.terminalSourceBytes.slice(),signedRequest.slice());
   const [requestRef,successorRef]=await Promise.all([input.retain(signedRequest),input.retain(successor)]);
   if(requestRef!==requestHash||successorRef!==await digest(successor))throw Error('BANK_NOTE_SOURCE_REQUIRED');
   await exact(requestRef);
   const head={sourceRef:row.sourceRef,requestRef,successorRef},result=await forwarded(held,head);
   state.entries[noteId]={...row,status:'forwarded',forwarded:head};
   await input.write(state,previous);input.assertOpen();
   input.handoffWitness?.record(row.sourceRef,head);
   return result;
  },
  async retainedSource(noteId:string):Promise<Uint8Array|null>{
   const {state}=await load(),row=state.entries[noteId];if(!row)return null;
   const held=await original(row.sourceRef);
   if(held.noteId!==noteId||held.redemptionDigest!==row.redemptionDigest||held.terminalArtifactSha256!==row.terminalArtifactSha256)throw Error('BANK_NOTE_DEPOSIT_BINDING_MISMATCH');
   return held.terminalSourceBytes.slice();
  },
  async confirmed(noteId:string){const {state}=await load(),row=state.entries[noteId];return row?.status==='confirmed'?result(noteId,row):null;},
  async exportOriginalImage(noteId:string):Promise<Uint8Array>{
   const {state}=await load(),ref=state.entries[noteId]?.originalImageRef;
   if(!ref)throw Error('BANK_NOTE_SOURCE_REQUIRED');
   const bytes=await input.restore(ref);input.assertOpen();
   const digest=[...new Uint8Array(await crypto.subtle.digest('SHA-256',new Uint8Array(bytes)))].map(v=>v.toString(16).padStart(2,'0')).join('');
   if(digest!==ref)throw Error('BANK_NOTE_SOURCE_REQUIRED');
   return bytes.slice();
  },
  // originalImage is the exact already admitted enclosing delivery. The queue
  // still verifies and submits only the complete recipient-bound terminal.
  async receive(bytes:Uint8Array,originalImage?:Uint8Array):Promise<BankNoteDepositResult>{
   const image=originalImage?.slice();
   const held=structuredClone(await input.verify(bytes.slice()));input.assertOpen();
   if(held.receiverUserId!==input.uid||held.receiverKeyId!==input.keyId)throw Error('BANK_NOTE_IDENTITY_BINDING_REQUIRED');
   const {state,previous}=await load(),existing=state.entries[held.noteId];
   const history=[...(existing?.history??[])];
   if(existing){
    if(existing.redemptionDigest===held.redemptionDigest&&existing.terminalArtifactSha256===held.terminalArtifactSha256)return result(held.noteId,existing);
    if(existing.status!=='forwarded'||!existing.forwarded||!held.predecessorSha256s?.includes(existing.forwarded.successorRef))
     throw Error('BANK_NOTE_EXACT_DEPOSIT_REQUIRED');
    history.push(existing.forwarded);
   }
   if(!existing&&Object.keys(state.entries).length>=64)throw Error('BANK_NOTE_DEVICE_CAPACITY');
   const [sourceRef,originalImageRef]=await Promise.all([
    input.retain(held.terminalSourceBytes.slice()),image?input.retain(image):undefined,
   ]);input.assertOpen();
   // The source was fully admitted above. Check its exact durable retention,
   // then reuse that same admission rather than verify the whole graph again
   // merely to construct the received display. A cold queue admits it anew.
   const retained=await exact(sourceRef);
   if(retained.length!==held.terminalSourceBytes.length||retained.some((v,i)=>v!==held.terminalSourceBytes[i]))throw Error('BANK_NOTE_SOURCE_REQUIRED');
   admissions.set(sourceRef,Promise.resolve(held));
   state.entries[held.noteId]={sourceRef,...(originalImageRef?{originalImageRef}:{}),redemptionDigest:held.redemptionDigest,terminalArtifactSha256:held.terminalArtifactSha256,status:'received',submissionEntered:false,...(history.length?{history}:{})};
   await input.write(state,previous);input.assertOpen();return result(held.noteId,state.entries[held.noteId]!);
  },
  reconcile(options:{retryFailed?:boolean}={}){
   return reconciliation??=(async()=>{
    let current=await load();
    for(const [id,row]of Object.entries(current.state.entries)){
     if(row.status!=='received'||row.lastError&&!options.retryFailed)continue;
     if(input.handoffWitness?.read(row.sourceRef)){
      try{await recoverHandoff(id);}catch(cause){if(!needsHandoffProof(cause))throw cause;}
      current=await load();continue;
     }
     const held=await original(row.sourceRef),recoverFirst=row.submissionEntered!==false;
     let submissionRef=row.submissionRef;
     if(!submissionRef&&input.prepare){submissionRef=await input.retain(await input.prepare(held.terminalSourceBytes.slice()));input.assertOpen();}
     // Persist entry into submission before the consequential request. A fresh
     // original needs one POST; unknown/reopened legacy attempts recover first.
     if(!recoverFirst||submissionRef!==row.submissionRef){current.state.entries[id]={...row,submissionEntered:true,...(submissionRef?{submissionRef}:{})};await input.write(current.state,current.previous);input.assertOpen();current=await load();}
     const preparedRequestBytes=submissionRef?await input.restore(submissionRef):undefined;
     if(preparedRequestBytes&&[...new Uint8Array(await crypto.subtle.digest('SHA-256',new Uint8Array(preparedRequestBytes)))].map(v=>v.toString(16).padStart(2,'0')).join('')!==submissionRef)throw Error('BANK_NOTE_SOURCE_REQUIRED');
     let credited:BankNoteDeposit;
     try{credited=await input.submit(held.terminalSourceBytes.slice(),{recoverFirst,...(preparedRequestBytes?{preparedRequestBytes}:{})});input.assertOpen();}
     catch(cause){
      input.assertOpen();
      // A failed response grants no credit and leaves this exact Source held.
      // Pause only this attempt until explicit retry so another Note progresses.
      const message=cause instanceof Error?cause.message:'';
      current.state.entries[id]={...current.state.entries[id],lastError:/^[A-Z0-9_]{1,120}$/.test(message)?message:'BANK_NOTE_DEPOSIT_UNCONFIRMED'};
      await input.write(current.state,current.previous);input.assertOpen();current=await load();continue;
     }
     if(credited.noteId!==held.noteId||credited.rail!==held.rail||credited.amountPhiMicro!==held.amountPhiMicro||credited.amountUsdCents!==held.amountUsdCents||!sameNoteFundingParts(credited.fundingParts,held.fundingParts)||!(credited.proofBytes instanceof Uint8Array)||!credited.proofBytes.length)throw Error('BANK_NOTE_DEPOSIT_BINDING_MISMATCH');
     const proofRef=await input.retain(credited.proofBytes),{proofBytes:_,...fields}=credited;
     const creditRef=await input.retain(new TextEncoder().encode(JSON.stringify({...fields,proofRef})));input.assertOpen();
     const {lastError:_lastError,...acceptedRow}=row;
     current.state.entries[id]={...acceptedRow,...(submissionRef?{submissionRef}:{}),submissionEntered:true,status:'confirmed',creditRef};await input.write(current.state,current.previous);input.assertOpen();current=await load();
    }
   })().finally(()=>{reconciliation=undefined;});
  },
 };
}
