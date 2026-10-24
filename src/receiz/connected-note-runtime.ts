import type {BankNoteImage,BankNoteInspection,BankNoteRail,BankNoteReview} from './offline-notes';
import type {ReceivedNoteSource} from './note-received-deposits';

type Transfer={requestRef:string;sourceRef?:string;imageRef?:string;purpose?:'self-deposit';creditRef?:string};
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
  for(const ref of [row.sourceRef,row.openingRef,row.imageRef,row.cancellationRef,row.cancelRequestRef,row.transfer?.requestRef,row.transfer?.sourceRef,row.transfer?.imageRef,row.transfer?.creditRef])if(ref!==undefined&&!hash(ref))fail();
  if(row.transfer?.creditRef&&(!row.transfer.sourceRef||row.transfer.purpose!=='self-deposit'))fail();
  if(row.transfer?.purpose!==undefined&&row.transfer.purpose!=='self-deposit'||row.transfer?.purpose==='self-deposit'&&row.transfer.imageRef)fail();
  if(row.phase==='issued'&&(!row.sourceRef||!row.openingRef)||row.phase==='cancelled'&&!row.cancellationRef||row.imageRef&&row.phase!=='issued'||row.transfer&&(!row.sourceRef||!row.transfer.requestRef||row.transfer.imageRef&&!row.transfer.sourceRef))fail();
 }
 return s;
}
export type SelfDepositCreditBinding={uid:string;keyId:string;noteId:string;rail:BankNoteRail;amountUsdCents:string};
type CreditAdmission={restore(ref:string):Promise<Uint8Array>;verifySelfDepositCredit(source:Uint8Array,receipt:Uint8Array,expected:SelfDepositCreditBinding):Promise<void>};
async function exactRetained(ref:string,restore:CreditAdmission['restore']){const source=await restore(ref),digest=[...new Uint8Array(await crypto.subtle.digest('SHA-256',new Uint8Array(source)))].map(b=>b.toString(16).padStart(2,'0')).join('');if(digest!==ref)fail('SOURCE_REQUIRED');return source;}
/** A confirmed marker/ref alone cannot release the receiving identity key.
 * Cold removal independently reopens the native credit and exact terminal. */
export async function hasHeldConnectedNotes(value:unknown,admission?:CreditAdmission){const s=readConnectedNoteCheckpoint(value);if(!s)return false;if(s.current)return true;for(const row of Object.values(s.notes)){
 if(row.phase==='cancelled'||row.transfer?.imageRef)continue;
 if(row.transfer?.purpose!=='self-deposit'||!row.transfer.sourceRef||!row.transfer.creditRef||!admission)return true;
 await admission.verifySelfDepositCredit(await exactRetained(row.transfer.sourceRef,admission.restore),await exactRetained(row.transfer.creditRef,admission.restore),{uid:s.uid,keyId:s.keyId,noteId:row.noteId,rail:row.rail,amountUsdCents:row.amountUsdCents});
 }return false;}


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
 /** Actual native handover/source verification, including the receiving key. */
 verifySelfDeposit?(source:Uint8Array):Promise<ReceivedNoteSource>;
 verifySelfDepositCredit?(source:Uint8Array,receipt:Uint8Array,expected:SelfDepositCreditBinding):Promise<void>;
 image(source:Uint8Array,note:BankNoteInspection):Promise<Uint8Array>;
 onIssued?():void;
}
/** The caller serializes mutations with the existing account/Notes locks. No
 * custody ceremony, polling, network display read or second wallet is added. */
export function createConnectedNoteRuntime(input:ConnectedNotePorts){
 // Read-only admission reuse is local to this account/runtime and exact source
 // digest. Financial handover/submission still reopens its actual originals.
 const inspections=new Map<string,Promise<BankNoteInspection>>(),selfAdmissions=new Map<string,Promise<ReceivedNoteSource>>(),creditAdmissions=new Map<string,Promise<void>>();
 async function inspectSource(ref:string){
  input.assertOpen();let pending=inspections.get(ref);
  if(!pending){pending=(async()=>structuredClone(await input.inspect(await original(ref))))();inspections.set(ref,pending);void pending.catch(()=>{if(inspections.get(ref)===pending)inspections.delete(ref);});}
  const result=await pending;input.assertOpen();return structuredClone(result);
 }
 async function load(){input.assertOpen();const previous=await input.read();input.assertOpen();const state=readConnectedNoteCheckpoint(previous)??{schema:'bank.connected-notes.v1',uid:input.uid,keyId:input.keyId,current:null,notes:{}} as State;if(state.uid!==input.uid||state.keyId!==input.keyId)fail('IDENTITY_CHANGED');return{state,previous};}
 async function original(ref:string){const bytes=await input.restore(ref);input.assertOpen();const d=[...new Uint8Array(await crypto.subtle.digest('SHA-256',new Uint8Array(bytes)))].map(v=>v.toString(16).padStart(2,'0')).join('');if(d!==ref)fail('SOURCE_REQUIRED');return bytes;}
 async function save(state:State,previous:unknown){await input.write(state,previous);input.assertOpen();return load();}
 const current=(state:State)=>state.current?state.notes[state.current]!:null;
 async function reviewed(row:Row){const a=parse(await original(row.authorizationRef));if(a.noteId!==row.noteId||a.amountUsdCents!==row.amountUsdCents||a.rail!==row.rail)fail('EXACT_RESUME_REQUIRED');return{noteId:row.noteId,rail:row.rail,amountUsdCents:row.amountUsdCents,...(a.amountPhiMicro?{amountPhiMicro:a.amountPhiMicro}:{}),...(a.fundingParts?{fundingParts:a.fundingParts}:{}),canCancel:row.phase!=='issued'};}
 async function note(row:Row):Promise<BankNoteImage>{
  if(!row.imageRef||!row.sourceRef)return fail('SOURCE_REQUIRED');const inspection=await inspectSource(row.sourceRef);
  if(inspection.noteId!==row.noteId||inspection.amountUsdCents!==row.amountUsdCents||inspection.rail!==row.rail)fail('SOURCE_REQUIRED');
  const self=!!row.transfer?.sourceRef&&row.transfer.purpose==='self-deposit';if(self){const source=await original(row.transfer!.sourceRef!);await selfSource(row,source);if(row.transfer!.creditRef)await selfCredit(row,source,await original(row.transfer!.creditRef!),true);}
  return{...inspection,image:await original(row.transfer?.imageRef??row.imageRef),transferred:!!row.transfer?.imageRef,transferPending:!!row.transfer&&!row.transfer.imageRef&&!self,...(self?{selfDeposit:row.transfer!.creditRef?'confirmed' as const:'pending' as const}:{})};
 }
 async function selfSource(row:Row,source:Uint8Array){
  if(!input.verifySelfDeposit)fail('SELF_DEPOSIT_SOURCE_REQUIRED');const ref=[...new Uint8Array(await crypto.subtle.digest('SHA-256',new Uint8Array(source)))].map(v=>v.toString(16).padStart(2,'0')).join('');let pending=selfAdmissions.get(ref);if(!pending){pending=input.verifySelfDeposit!(source.slice());selfAdmissions.set(ref,pending);void pending.catch(()=>{if(selfAdmissions.get(ref)===pending)selfAdmissions.delete(ref);});}const held=await pending;input.assertOpen();
  if(held.receiverUserId!==input.uid||held.receiverKeyId!==input.keyId)fail('IDENTITY_BINDING_REQUIRED');
  if(held.noteId!==row.noteId||held.rail!==row.rail||held.amountUsdCents!==row.amountUsdCents||!held.redemptionDigest||!hash(held.terminalArtifactSha256)||held.terminalSourceBytes.length!==source.length||held.terminalSourceBytes.some((b,i)=>b!==source[i]))fail('SOURCE_REQUIRED');return held.terminalSourceBytes.slice();
 }
 async function selfCredit(row:Row,source:Uint8Array,receipt:Uint8Array,memo=false){
  if(!input.verifySelfDepositCredit)fail('SELF_DEPOSIT_CREDIT_REQUIRED');const expected={uid:input.uid,keyId:input.keyId,noteId:row.noteId,rail:row.rail,amountUsdCents:row.amountUsdCents},key=JSON.stringify([row.transfer!.sourceRef,row.transfer!.creditRef,expected]);let pending=memo?creditAdmissions.get(key):undefined;
  if(!pending){pending=input.verifySelfDepositCredit!(source.slice(),receipt.slice(),expected);if(memo){creditAdmissions.set(key,pending);void pending.catch(()=>{if(creditAdmissions.get(key)===pending)creditAdmissions.delete(key);});}}await pending;input.assertOpen();
 }
 async function confirmSelfDeposit(id:string,receipt:Uint8Array){let held=await load(),row=held.state.notes[id];if(row?.transfer?.purpose!=='self-deposit'||!row.transfer.sourceRef)return false;const source=await original(row.transfer.sourceRef);await selfSource(row,source);await selfCredit(row,source,receipt);const creditRef=await input.retain(receipt.slice());input.assertOpen();await original(creditRef);if(row.transfer.creditRef){if(row.transfer.creditRef!==creditRef)fail('EXACT_DEPOSIT_REQUIRED');return true;}row={...row,transfer:{...row.transfer,creditRef}};held.state.notes[id]=row;await save(held.state,held.previous);creditAdmissions.set(JSON.stringify([row.transfer!.sourceRef,creditRef,{uid:input.uid,keyId:input.keyId,noteId:row.noteId,rail:row.rail,amountUsdCents:row.amountUsdCents}]),Promise.resolve());return true;}
 async function retainedTransfer(id:string,request?:Uint8Array,purpose?:'self-deposit'){
  let held=await load(),row=held.state.notes[id];if(!row||row.phase!=='issued'||!row.sourceRef)fail('SOURCE_REQUIRED');if(row.transfer&&row.transfer.purpose!==purpose)fail('EXACT_TRANSFER_REQUIRED');if(purpose&&!input.verifySelfDeposit)fail('SELF_DEPOSIT_SOURCE_REQUIRED');
  if(row.transfer){if(row.transfer.purpose!==purpose)fail('EXACT_TRANSFER_REQUIRED');if(request){const previous=await original(row.transfer.requestRef);if(previous.length!==request.length||previous.some((v,i)=>v!==request[i]))fail('EXACT_TRANSFER_REQUIRED');}}
  else{if(!request?.length)return fail('RECEIVING_REQUEST_REQUIRED');const requestRef=await input.retain(request);input.assertOpen();row={...row,transfer:{requestRef,...(purpose?{purpose}:{})}};held.state.notes[id]=row;held=await save(held.state,held.previous);}
  if(!row.transfer!.sourceRef){const source=await input.handover(await original(row.sourceRef!),await original(row.transfer!.requestRef),await original(row.noteIdentityRef));input.assertOpen();if(purpose)await selfSource(row,source);const sourceRef=await input.retain(source);input.assertOpen();row={...row,transfer:{...row.transfer!,sourceRef}};held.state.notes[id]=row;held=await save(held.state,held.previous);}
  return {held,row};
 }
 async function transfer(id:string,request?:Uint8Array){
  const {held,row:before}=await retainedTransfer(id,request);let row=before;
  if(!row.transfer!.imageRef){const source=await original(row.transfer!.sourceRef!),imageRef=await input.retain(await input.image(source,await input.inspect(source)));input.assertOpen();row={...row,transfer:{...row.transfer!,imageRef}};held.state.notes[id]=row;await save(held.state,held.previous);}
  return{noteId:id,image:await original(row.transfer!.imageRef!)};
 }
 async function prepareSelfDeposit(id:string,request?:Uint8Array){const {row}=await retainedTransfer(id,request,'self-deposit');return{noteId:id,sourceBytes:await selfSource(row,await original(row.transfer!.sourceRef!))};}

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
    const [authorizationRef,noteIdentityRef]=await Promise.all([input.retain(json(prepared.authorization)),input.retain(prepared.noteIdentityBytes)]);input.assertOpen();
    row={noteId:prepared.noteId,operationId:prepared.operationId,rail:prepared.rail,amountUsdCents,authorizationRef,noteIdentityRef,phase:'prepared'};
    held.state.notes[row.noteId]=row;held.state.current=row.noteId;held=await save(held.state,held.previous);
   }
   if(row.phase==='cancelled')fail('CANCELLED');
   if(!row.sourceRef){
    const recoverFirst=row.phase!=='prepared',authorization=parse(await original(row.authorizationRef));
    if(!recoverFirst){row={...row,phase:'submitted'};held.state.notes[row.noteId]=row;held=await save(held.state,held.previous);}
    const result=await input.issue(authorization,row.operationId,recoverFirst,row.cancelRequestRef?false:undefined);input.assertOpen();
    if(result.noteId!==row.noteId||result.amountUsdCents!==row.amountUsdCents||result.rail!==row.rail)fail('EXACT_RESUME_REQUIRED');
    const [sourceRef,openingRef]=await Promise.all([input.retain(result.sourceBytes),input.retain(result.privateOpeningBytes)]);input.assertOpen();
    row={...row,sourceRef,openingRef,phase:'issued'};held.state.notes[row.noteId]=row;held=await save(held.state,held.previous);input.onIssued?.();
   }
   if(!row.imageRef){const source=await original(row.sourceRef!),inspection=await inspectSource(row.sourceRef!),imageRef=await input.retain(await input.image(source,inspection));input.assertOpen();row={...row,imageRef};held.state.notes[row.noteId]=row;held.state.current=null;await save(held.state,held.previous);}
   return note(row);
  },
  async cancelUnfunded(){
   let held=await load(),row=current(held.state);if(!row)return;if(row.phase==='issued')fail('ALLOCATION_ALREADY_ISSUED');const authorization=parse(await original(row.authorizationRef));
   if(!row.cancelRequestRef&&input.prepareCancellation){const cancelRequestRef=await input.retain(await input.prepareCancellation(authorization));input.assertOpen();row={...row,cancelRequestRef};held.state.notes[row.noteId]=row;held=await save(held.state,held.previous);}
   const proof=await input.cancel(authorization,row.cancelRequestRef?await original(row.cancelRequestRef):undefined);input.assertOpen();const cancellationRef=await input.retain(proof);held.state.notes[row.noteId]={...row,phase:'cancelled',cancellationRef};held.state.current=null;await save(held.state,held.previous);
  },
  transfer,prepareSelfDeposit,confirmSelfDeposit,
  async pendingSelfDeposits(){const {state}=await load();return Object.values(state.notes).filter(row=>row.transfer?.purpose==='self-deposit'&&!row.transfer.creditRef).map(row=>row.noteId);},
  async recoverSelfDeposit(id:string){const row=(await load()).state.notes[id];return row?.phase==='issued'&&row.transfer?.purpose==='self-deposit'?prepareSelfDeposit(id):null;},
  async recoverTransfer(id:string){
   const row=(await load()).state.notes[id];
   return row?.phase==='issued'&&row.transfer?transfer(id):null;
  },
 };
}
