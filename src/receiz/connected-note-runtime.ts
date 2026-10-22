import type {BankNoteImage,BankNoteInspection,BankNoteRail,BankNoteReview} from './offline-notes';

type Transfer={requestRef:string;sourceRef?:string;imageRef?:string};
type Row={noteId:string;operationId:string;rail:BankNoteRail;amountUsdCents:string;authorizationRef:string;noteIdentityRef:string;phase:'prepared'|'submitted'|'issued'|'cancelled';sourceRef?:string;openingRef?:string;imageRef?:string;transfer?:Transfer;cancellationRef?:string;cancelRequestRef?:string};
type State={schema:'bank.connected-notes.v1';uid:string;keyId:string;current:string|null;notes:Record<string,Row>};
const hash=(v:unknown):v is string=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const json=(v:unknown)=>new TextEncoder().encode(JSON.stringify(v));
const parse=(v:Uint8Array)=>JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(v));
const fail=(code='PRIVATE_SOURCE_INVALID'):never=>{throw Error(`BANK_NOTE_${code}`);};
/** Checkpoint validation is retention only. Funding and credit authority always
 * come from the complete native source, never these labels or cached amounts. */
export function readConnectedNoteCheckpoint(value:unknown):State|null{
 if(value===null)return null;
 const s=structuredClone(value) as State;
 if(!s||s.schema!=='bank.connected-notes.v1'||typeof s.uid!=='string'||!s.uid||typeof s.keyId!=='string'||!s.keyId||!s.notes||typeof s.notes!=='object'||Array.isArray(s.notes)||Object.keys(s.notes).length>128||s.current!==null&&(typeof s.current!=='string'||!s.notes[s.current]))fail();
 for(const [id,row]of Object.entries(s.notes)){
  if(!row||row.noteId!==id||!id||!hash(row.operationId)||!hash(row.authorizationRef)||!hash(row.noteIdentityRef)||!['reserve','settlement','composite'].includes(row.rail)||!/^\d{1,9}$/.test(row.amountUsdCents)||BigInt(row.amountUsdCents)<=0n||BigInt(row.amountUsdCents)>100000000n||!['prepared','submitted','issued','cancelled'].includes(row.phase))fail();
  for(const ref of [row.sourceRef,row.openingRef,row.imageRef,row.cancellationRef,row.cancelRequestRef,row.transfer?.requestRef,row.transfer?.sourceRef,row.transfer?.imageRef])if(ref!==undefined&&!hash(ref))fail();
  if(row.phase==='issued'&&(!row.sourceRef||!row.openingRef)||row.phase==='cancelled'&&!row.cancellationRef||row.imageRef&&row.phase!=='issued'||row.transfer&&(!row.sourceRef||!row.transfer.requestRef||row.transfer.imageRef&&!row.transfer.sourceRef))fail();
 }
 return s;
}
export function hasHeldConnectedNotes(value:unknown){const s=readConnectedNoteCheckpoint(value);return !!s&&(!!s.current||Object.values(s.notes).some(row=>row.phase!=='cancelled'&&!row.transfer?.imageRef));}

export type ConnectedNotePreparation={noteId:string;operationId:string;rail:BankNoteRail;amountUsdCents:string;authorization:unknown;noteIdentityBytes:Uint8Array};
export type ConnectedNoteFundingResult=BankNoteInspection&{sourceBytes:Uint8Array;privateOpeningBytes:Uint8Array};
export interface ConnectedNotePorts{
 uid:string;keyId:string;assertOpen():void;read():Promise<unknown>;write(next:unknown,previous:unknown):Promise<void>;
 retain(bytes:Uint8Array):Promise<string>;restore(ref:string):Promise<Uint8Array>;
 review?(amountUsdCents:string,rail?:BankNoteRail):Promise<BankNoteReview>;
 prepare(amountUsdCents:string,rail?:BankNoteRail):Promise<ConnectedNotePreparation>;
 /** The port independently verifies complete native funding and its opening. */
 issue(authorization:unknown,operationId:string,recoverFirst:boolean,allowSubmit?:boolean):Promise<ConnectedNoteFundingResult>;
 /** The returned bytes are a verified native cancellation, not an HTTP flag. */
 prepareCancellation?(authorization:unknown):Promise<Uint8Array>;
 cancel(authorization:unknown,preparedRequest?:Uint8Array):Promise<Uint8Array>;
 inspect(source:Uint8Array):Promise<BankNoteInspection>;
 handover(source:Uint8Array,request:Uint8Array,noteIdentity:Uint8Array):Promise<Uint8Array>;
 image(source:Uint8Array,note:BankNoteInspection):Promise<Uint8Array>;
 onIssued?():void;
}
/** The caller serializes mutations with the existing account/Notes locks. No
 * custody ceremony, polling, network display read or second wallet is added. */
export function createConnectedNoteRuntime(input:ConnectedNotePorts){
 async function load(){input.assertOpen();const previous=await input.read();input.assertOpen();const state=readConnectedNoteCheckpoint(previous)??{schema:'bank.connected-notes.v1',uid:input.uid,keyId:input.keyId,current:null,notes:{}} as State;if(state.uid!==input.uid||state.keyId!==input.keyId)fail('IDENTITY_CHANGED');return{state,previous};}
 async function original(ref:string){const bytes=await input.restore(ref);input.assertOpen();const d=[...new Uint8Array(await crypto.subtle.digest('SHA-256',new Uint8Array(bytes)))].map(v=>v.toString(16).padStart(2,'0')).join('');if(d!==ref)fail('SOURCE_REQUIRED');return bytes;}
 async function save(state:State,previous:unknown){await input.write(state,previous);input.assertOpen();return load();}
 const current=(state:State)=>state.current?state.notes[state.current]!:null;
 async function reviewed(row:Row){const a=parse(await original(row.authorizationRef));if(a.noteId!==row.noteId||a.amountUsdCents!==row.amountUsdCents||a.rail!==row.rail)fail('EXACT_RESUME_REQUIRED');return{noteId:row.noteId,rail:row.rail,amountUsdCents:row.amountUsdCents,...(a.amountPhiMicro?{amountPhiMicro:a.amountPhiMicro}:{}),...(a.fundingParts?{fundingParts:a.fundingParts}:{}),canCancel:row.phase!=='issued'};}
 async function note(row:Row):Promise<BankNoteImage>{
  if(!row.imageRef||!row.sourceRef)return fail('SOURCE_REQUIRED');const inspection=await input.inspect(await original(row.sourceRef));
  if(inspection.noteId!==row.noteId||inspection.amountUsdCents!==row.amountUsdCents||inspection.rail!==row.rail)fail('SOURCE_REQUIRED');
  return{...inspection,image:await original(row.transfer?.imageRef??row.imageRef),transferred:!!row.transfer?.imageRef,transferPending:!!row.transfer&&!row.transfer.imageRef};
 }
 async function transfer(id:string,request?:Uint8Array){
   let held=await load(),row=held.state.notes[id];if(!row||row.phase!=='issued'||!row.sourceRef)fail('SOURCE_REQUIRED');
   if(row.transfer){if(request){const previous=await original(row.transfer.requestRef);if(previous.length!==request.length||previous.some((v,i)=>v!==request[i]))fail('EXACT_TRANSFER_REQUIRED');}}
   else{if(!request?.length)return fail('RECEIVING_REQUEST_REQUIRED');const requestRef=await input.retain(request);row={...row,transfer:{requestRef}};held.state.notes[id]=row;held=await save(held.state,held.previous);}
   if(!row.transfer!.sourceRef){const sourceRef=await input.retain(await input.handover(await original(row.sourceRef!),await original(row.transfer!.requestRef),await original(row.noteIdentityRef)));input.assertOpen();row={...row,transfer:{...row.transfer!,sourceRef}};held.state.notes[id]=row;held=await save(held.state,held.previous);}
   if(!row.transfer!.imageRef){const source=await original(row.transfer!.sourceRef!),imageRef=await input.retain(await input.image(source,await input.inspect(source)));input.assertOpen();row={...row,transfer:{...row.transfer!,imageRef}};held.state.notes[id]=row;await save(held.state,held.previous);}
   return{noteId:id,image:await original(row.transfer!.imageRef!)};
  }
 return{
  async pending(){const row=current((await load()).state);return row&&row.phase!=='cancelled'?reviewed(row):null;},
  async review(amountUsdCents:string):Promise<BankNoteReview>{const row=current((await load()).state);if(row){if(row.amountUsdCents!==amountUsdCents)fail('EXACT_RESUME_REQUIRED');return reviewed(row);}if(!input.review)fail('REVIEW_REQUIRED');return input.review!(amountUsdCents);},
  async hasNote(id:string){const row=(await load()).state.notes[id];return !!row&&row.phase==='issued';},
  async holdsFundingSource(id:string,source:Uint8Array){
   const row=(await load()).state.notes[id];
   if(!row||row.phase!=='issued'||!row.sourceRef||row.transfer)return false;
   const held=await original(row.sourceRef);await original(row.noteIdentityRef);
   return held.length===source.length&&held.every((value,index)=>value===source[index]);
  },
  async savedNotes(){const {state}=await load();return Promise.all(Object.values(state.notes).filter(row=>row.phase==='issued'&&!!row.imageRef).map(note));},
  async create(amountUsdCents:string,rail?:BankNoteRail):Promise<BankNoteImage>{
   let held=await load(),row=current(held.state);
   if(row&&(row.amountUsdCents!==amountUsdCents||rail!==undefined&&row.rail!==rail))fail('EXACT_RESUME_REQUIRED');
   if(!row){
    if(Object.keys(held.state.notes).length>=128)fail('DEVICE_CAPACITY');
    const prepared=await input.prepare(amountUsdCents,rail);input.assertOpen();
    if(prepared.amountUsdCents!==amountUsdCents||rail!==undefined&&prepared.rail!==rail||held.state.notes[prepared.noteId]||!hash(prepared.operationId))fail('EXACT_RESUME_REQUIRED');
    const authorizationRef=await input.retain(json(prepared.authorization)),noteIdentityRef=await input.retain(prepared.noteIdentityBytes);input.assertOpen();
    row={noteId:prepared.noteId,operationId:prepared.operationId,rail:prepared.rail,amountUsdCents,authorizationRef,noteIdentityRef,phase:'prepared'};
    held.state.notes[row.noteId]=row;held.state.current=row.noteId;held=await save(held.state,held.previous);
   }
   if(row.phase==='cancelled')fail('CANCELLED');
   if(!row.sourceRef){
    const recoverFirst=row.phase!=='prepared',authorization=parse(await original(row.authorizationRef));
    if(!recoverFirst){row={...row,phase:'submitted'};held.state.notes[row.noteId]=row;held=await save(held.state,held.previous);}
    const result=await input.issue(authorization,row.operationId,recoverFirst,row.cancelRequestRef?false:undefined);input.assertOpen();
    if(result.noteId!==row.noteId||result.amountUsdCents!==row.amountUsdCents||result.rail!==row.rail)fail('EXACT_RESUME_REQUIRED');
    const sourceRef=await input.retain(result.sourceBytes),openingRef=await input.retain(result.privateOpeningBytes);input.assertOpen();
    row={...row,sourceRef,openingRef,phase:'issued'};held.state.notes[row.noteId]=row;held=await save(held.state,held.previous);input.onIssued?.();
   }
   if(!row.imageRef){const source=await original(row.sourceRef!),inspection=await input.inspect(source),imageRef=await input.retain(await input.image(source,inspection));input.assertOpen();row={...row,imageRef};held.state.notes[row.noteId]=row;held.state.current=null;await save(held.state,held.previous);}
   return note(row);
  },
  async cancelUnfunded(){
   let held=await load(),row=current(held.state);if(!row)return;if(row.phase==='issued')fail('ALLOCATION_ALREADY_ISSUED');const authorization=parse(await original(row.authorizationRef));
   if(!row.cancelRequestRef&&input.prepareCancellation){const cancelRequestRef=await input.retain(await input.prepareCancellation(authorization));input.assertOpen();row={...row,cancelRequestRef};held.state.notes[row.noteId]=row;held=await save(held.state,held.previous);}
   const proof=await input.cancel(authorization,row.cancelRequestRef?await original(row.cancelRequestRef):undefined);input.assertOpen();const cancellationRef=await input.retain(proof);held.state.notes[row.noteId]={...row,phase:'cancelled',cancellationRef};held.state.current=null;await save(held.state,held.previous);
  },
  transfer,
  async recoverTransfer(id:string){
   const row=(await load()).state.notes[id];
   return row?.phase==='issued'&&row.transfer?transfer(id):null;
  },
 };
}
