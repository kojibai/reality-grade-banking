import type {ReceizKeyFile,ReceizIdentityLoginProof} from '@receiz/sdk';
import type {BankNoteRail,BankNoteInspection} from '../offline-notes';
import type {ConnectedNoteModule} from '../connected-note-application';
import {selectNoteFunding} from '../note-funding';
import {inspectNativePaymentReview,nativePaymentChallenge,paymentSame,type NativePaymentPrepared,type NativePaymentReview} from '../native-payment-protocol';
import {vaultBase64,vaultBytes,vaultCanonical,vaultDigest,vaultObject} from './encoding';
import type {NativePaymentPacket} from '../native-payment';
import type {NativePaymentReceipt,NativePaymentRefusal} from '../native-payment-protocol';
import {loadVaultNative} from './runtime';
import {verifyVaultMoneySource} from './money-source';
import {verifyVaultMoneyPublicWitness,vaultMoneyHoldingChallenge} from './money-public';

export type VaultMoneyIntent={id:string;kind:'add'|'send'|'return';amountUsdCents:string;rail?:BankNoteRail;recipient?:string};
export type VaultMoneyAction='issue-owner'|'claim-child'|'transfer'|'change-reserve'|'change-settlement';
export type VaultMoneyCapacity={schema:'receiz.bank.vault-money-capacity.v1';requestSha256:string;currentNativeHead:string|null;outcomeMaxBytes:number;reservedSourceBytes:number};
type Stage={id:string;kind:VaultMoneyAction;requestRef:string;capacity:VaultMoneyCapacity;phase:'prepared'|'submitted'|'accepted';outcomeRef:string|null;backupDigest:string|null};
type Operation={intent:VaultMoneyIntent;inputNotes:string[];inputNativeRef:string|null;approvalDigest:string|null;stages:Stage[];complete:boolean;result:'committed'|'zero-write'|null};
export type VaultMoneyState={schema:'bank.vault.money.v1';vaultId:string;ownerKeyId:string;childKeyId:string;revision:number;notes:string[];nativeRef:string|null;operations:Operation[]};
export interface VaultMoneyNative{
 /** Read-only source-derived rail/value admission before any Note claim. This
  * is no financial grant; the exact native writer still admits acceptance. */
 preflightTransfer(intent:VaultMoneyIntent,originals:Uint8Array[]):Promise<void>;
 reserve(kind:VaultMoneyAction,request:Uint8Array,originals:Uint8Array[]):Promise<VaultMoneyCapacity>;
 inspectNote(original:Uint8Array):Promise<BankNoteInspection>;
 inspectRemainder(original:Uint8Array):Promise<BankNoteInspection>;
 remainder(originals:Uint8Array[]):Promise<Uint8Array|null>;
 publicWitness?(input:{notes:Uint8Array[];remainder:Uint8Array|null;nonce:string}):Promise<unknown>;
 /** Preparation is read-only. It retains the signed exact native request and
  * private Note key; null is permitted only for native-proven zero change. */
 prepare(kind:VaultMoneyAction,intent:VaultMoneyIntent,originals:Uint8Array[]):Promise<Uint8Array|null>;
 execute(kind:VaultMoneyAction,request:Uint8Array,recoverFirst:boolean,capacity?:VaultMoneyCapacity):Promise<Uint8Array>;
 /** Independently reopen complete native sources and exact private openings.
  * API status, cached amount and workflow labels are never acceptance. */
 admit(kind:VaultMoneyAction,request:Uint8Array,original:Uint8Array,expected?:{intent:VaultMoneyIntent;originals:Uint8Array[]}):Promise<{status:'committed'|'zero-write'}|void>;
}
export type VaultMoneyPorts={vaultId:string;ownerKeyId:string;childKeyId:string;ownerRecipient:string;assertCapacity(reservedSourceBytes:number):Promise<void>;assertOpen():void;lock<T>(work:()=>Promise<T>):Promise<T>;read():Promise<unknown>;write(next:VaultMoneyState,previous:unknown):Promise<void>;retain(bytes:Uint8Array):Promise<string>;restore(ref:string):Promise<Uint8Array>;backupAndReopen(expected:VaultMoneyState):Promise<VaultMoneyState>;approve(intent:VaultMoneyIntent,digest:string):Promise<void>;native:VaultMoneyNative};
const hash=(v:unknown):v is string=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const json=(v:unknown)=>new TextEncoder().encode(vaultCanonical(v));
const parse=(b:Uint8Array)=>JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(b));
function fail(code:string):never{throw Error(`VAULT_MONEY_${code}`);}
const same=(a:unknown,b:unknown)=>vaultCanonical(a)===vaultCanonical(b);
function readIntent(value:unknown):VaultMoneyIntent{
 const v=value as VaultMoneyIntent;
 if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).some(k=>!['id','kind','amountUsdCents','rail','recipient'].includes(k))||typeof v.id!=='string'||!/^[A-Za-z0-9._:-]{8,120}$/.test(v.id)||!['add','send','return'].includes(v.kind)||typeof v.amountUsdCents!=='string'||!/^[1-9]\d{0,8}$/.test(v.amountUsdCents)||BigInt(v.amountUsdCents)>100000000n||v.rail!==undefined&&!['reserve','settlement','composite'].includes(v.rail)||v.kind!=='add'&&(!['reserve','settlement'].includes(v.rail!)||typeof v.recipient!=='string'||!/^[A-Za-z0-9_@.-]{1,160}$/.test(v.recipient))||v.kind==='add'&&v.recipient!==undefined)fail('INTENT_INVALID');
 return structuredClone(v);
}
function readCapacity(value:unknown):VaultMoneyCapacity{const c=vaultObject(value,['schema','requestSha256','currentNativeHead','outcomeMaxBytes','reservedSourceBytes']) as unknown as VaultMoneyCapacity;if(c.schema!=='receiz.bank.vault-money-capacity.v1'||!hash(c.requestSha256)||c.currentNativeHead!==null&&!hash(c.currentNativeHead)||!Number.isSafeInteger(c.outcomeMaxBytes)||c.outcomeMaxBytes<=0||!Number.isSafeInteger(c.reservedSourceBytes)||c.reservedSourceBytes<c.outcomeMaxBytes)fail('CAPACITY_INVALID');return structuredClone(c);}
export function emptyVaultMoney(vaultId:string,ownerKeyId:string,childKeyId:string):VaultMoneyState{return{schema:'bank.vault.money.v1',vaultId,ownerKeyId,childKeyId,revision:0,notes:[],nativeRef:null,operations:[]};}
export function readVaultMoney(value:unknown):VaultMoneyState{
 const v=vaultObject(value,['schema','vaultId','ownerKeyId','childKeyId','revision','notes','nativeRef','operations']) as unknown as VaultMoneyState;
 if(v.schema!=='bank.vault.money.v1'||![v.vaultId,v.ownerKeyId,v.childKeyId].every(x=>typeof x==='string'&&!!x)||!Number.isSafeInteger(v.revision)||v.revision<0||!Array.isArray(v.notes)||v.notes.length>128||!v.notes.every(hash)||new Set(v.notes).size!==v.notes.length||v.nativeRef!==null&&!hash(v.nativeRef)||!Array.isArray(v.operations)||v.operations.length>512)fail('STATE_INVALID');
 const ids=new Set<string>();let pending=0;
 for(const op of v.operations){vaultObject(op,['intent','inputNotes','inputNativeRef','approvalDigest','stages','complete','result']);readIntent(op.intent);if(ids.has(op.intent.id)||!Array.isArray(op.inputNotes)||op.inputNotes.length>128||!op.inputNotes.every(hash)||new Set(op.inputNotes).size!==op.inputNotes.length||op.inputNativeRef!==null&&!hash(op.inputNativeRef)||op.approvalDigest!==null&&!hash(op.approvalDigest)||typeof op.complete!=='boolean'||!['committed','zero-write',null].includes(op.result)||op.complete&&op.result===null||!op.complete&&op.result!==null||!Array.isArray(op.stages)||op.stages.length>132)fail('STATE_INVALID');ids.add(op.intent.id);if(!op.complete)pending++;
  const stages=new Set<string>();for(const s of op.stages){vaultObject(s,['id','kind','requestRef','capacity','phase','outcomeRef','backupDigest']);if(typeof s.id!=='string'||stages.has(s.id)||!['issue-owner','claim-child','transfer','change-reserve','change-settlement'].includes(s.kind)||!hash(s.requestRef)||!['prepared','submitted','accepted'].includes(s.phase)||(s.phase==='accepted'?!hash(s.outcomeRef)||!hash(s.backupDigest):s.outcomeRef!==null||(s.phase==='submitted'?!hash(s.backupDigest):s.backupDigest!==null)))fail('STATE_INVALID');readCapacity(s.capacity);if(s.capacity.requestSha256!==s.requestRef)fail('CAPACITY_BINDING_INVALID');stages.add(s.id);}
 }
 if(pending>1||v.operations.some((o,i)=>!o.complete&&i!==v.operations.length-1))fail('STATE_INVALID');return structuredClone(v);
}
/** All state and blobs belong to the unlocked encrypted Vault. This controller
 * never reads or writes the ordinary identity, Note or account stores. */
export function createVaultMoney(input:VaultMoneyPorts){
 async function load(){input.assertOpen();const previous=await input.read();input.assertOpen();const state=previous===null?emptyVaultMoney(input.vaultId,input.ownerKeyId,input.childKeyId):readVaultMoney(previous);if(state.vaultId!==input.vaultId||state.ownerKeyId!==input.ownerKeyId||state.childKeyId!==input.childKeyId)fail('CUSTODY_CHANGED');return{state,previous};}
 async function original(ref:string){const b=await input.restore(ref);input.assertOpen();if(await vaultDigest(b)!==ref)fail('SOURCE_REQUIRED');return b;}
 async function retain(b:Uint8Array){const ref=await input.retain(b);input.assertOpen();if(!hash(ref)||ref!==await vaultDigest(b))fail('SOURCE_REQUIRED');await original(ref);return ref;}
 async function save(state:VaultMoneyState,previous:unknown){const next=readVaultMoney({...state,revision:state.revision+1});await input.write(next,previous);input.assertOpen();return load();}
 async function run(intent?:VaultMoneyIntent){
  let held=await load(),op=held.state.operations.at(-1),preflightDone=false;
  async function preflight(candidate:Operation){if(candidate.intent.kind==='add')return;if(!candidate.inputNotes.length&&!candidate.inputNativeRef)fail('FUNDS_REQUIRED');const originals=await Promise.all([...candidate.inputNotes,...(candidate.inputNativeRef?[candidate.inputNativeRef]:[])].map(original));await input.native.preflightTransfer(structuredClone(candidate.intent),originals);input.assertOpen();preflightDone=true;}

  if(intent){intent=readIntent(intent);const old=held.state.operations.find(v=>v.intent.id===intent!.id);if(old){if(!same(old.intent,intent))fail('EXACT_RESUME_REQUIRED');if(old.complete)return structuredClone(old);op=old;}else{if(op&&!op.complete)fail('OPERATION_PENDING');if(held.state.operations.length>=512)fail('CAPACITY');op={intent,inputNotes:intent.kind==='add'?[]:[...held.state.notes],inputNativeRef:intent.kind==='add'?null:held.state.nativeRef,approvalDigest:null,stages:[],complete:false,result:null};await preflight(op);const approvalDigest=await vaultDigest(json({schema:'bank.vault.money-approval.v1',vaultId:input.vaultId,ownerKeyId:input.ownerKeyId,childKeyId:input.childKeyId,intent:op.intent,sourceHeads:[...op.inputNotes,...(op.inputNativeRef?[op.inputNativeRef]:[])]}));await input.approve(structuredClone(op.intent),approvalDigest);input.assertOpen();op.approvalDigest=approvalDigest;held.state.operations.push(op);held=await save(held.state,held.previous);op=held.state.operations.at(-1)!;}}
  if(!op||op.complete)return op?structuredClone(op):null;
  const id=op.intent.id;
  const get=()=>held.state.operations.find(v=>v.intent.id===id)!;
  const checkpoint=async()=>{held=await save(held.state,held.previous);op=get();};
  if(!op.approvalDigest){const digest=await vaultDigest(json({schema:'bank.vault.money-approval.v1',vaultId:input.vaultId,ownerKeyId:input.ownerKeyId,childKeyId:input.childKeyId,intent:op.intent,sourceHeads:[...op.inputNotes,...(op.inputNativeRef?[op.inputNativeRef]:[])]}));await input.approve(structuredClone(op.intent),digest);input.assertOpen();op.approvalDigest=digest;await checkpoint();}
  async function stage(kind:VaultMoneyAction,stageId:string,originals:Uint8Array[]){
   op=get();let row=op.stages.find(v=>v.id===stageId);
   if(!row){const request=await input.native.prepare(kind,op.intent,originals);input.assertOpen();if(request===null)return null;const capacity=readCapacity(await input.native.reserve(kind,request,originals));input.assertOpen();if(capacity.requestSha256!==await vaultDigest(request))fail('CAPACITY_BINDING_INVALID');row={id:stageId,kind,requestRef:await retain(request),capacity,phase:'prepared',outcomeRef:null,backupDigest:null};op.stages.push(row);await checkpoint();row=get().stages.find(v=>v.id===stageId)!;}
   const request=await original(row.requestRef);
   if(row.phase!=='accepted'){const capacity=readCapacity(await input.native.reserve(kind,request,originals));input.assertOpen();if(capacity.requestSha256!==row.requestRef||capacity.outcomeMaxBytes!==row.capacity.outcomeMaxBytes||capacity.reservedSourceBytes!==row.capacity.reservedSourceBytes)fail('CAPACITY_BINDING_INVALID');await input.assertCapacity(capacity.reservedSourceBytes);input.assertOpen();}
   if(row.phase==='prepared'){
    const saved=await input.backupAndReopen(structuredClone(held.state));input.assertOpen();if(!same(readVaultMoney(saved),held.state))fail('PREPARED_ORIGINAL_REOPEN_REQUIRED');
    row.backupDigest=await vaultDigest(json(saved));row.phase='submitted';await checkpoint();row=get().stages.find(v=>v.id===stageId)!;
   }
   if(row.phase!=='accepted'){await input.assertCapacity(row.capacity.reservedSourceBytes);input.assertOpen();const result=await input.native.execute(kind,request,true,row.capacity);input.assertOpen();if(result.byteLength>row.capacity.outcomeMaxBytes)fail('CAPACITY_CONTRACT_VIOLATION');await input.native.admit(kind,request,result,{intent:get().intent,originals});input.assertOpen();row.outcomeRef=await retain(result);row.phase='accepted';await checkpoint();row=get().stages.find(v=>v.id===stageId)!;}
   const result=await original(row.outcomeRef!);await input.native.admit(kind,request,result,{intent:get().intent,originals});input.assertOpen();return{ref:row.outcomeRef!,bytes:result};
  }
  if(op.intent.kind==='add'){
   const added=await stage('issue-owner','funding',[]);if(!added)fail('FUNDING_SOURCE_REQUIRED');const note=await input.native.inspectNote(added.bytes);input.assertOpen();if(note.amountUsdCents!==op.intent.amountUsdCents||op.intent.rail!==undefined&&note.rail!==op.intent.rail)fail('EXACT_RESUME_REQUIRED');
   if(!held.state.notes.includes(added.ref))held.state.notes.push(added.ref);
  }else{
   if(!op.inputNotes.length&&!op.inputNativeRef)fail('FUNDS_REQUIRED');
   // A submitted claim/transfer may already have been accepted after a lost
   // reply. Recover its exact source before any new quote can block admission.
   // Later native preparation still checks current terms; failure preserves
   // these admitted credits and the unchanged pending approved intent.
   if(!preflightDone&&!op.stages.some(s=>s.kind==='transfer'||s.phase!=='prepared'))await preflight(op);
   const credits:Uint8Array[]=[];if(op.inputNativeRef){const native=await original(op.inputNativeRef);await input.native.inspectRemainder(native);credits.push(native);}
   for(const [i,ref]of op.inputNotes.entries()){const note=await original(ref);await input.native.inspectNote(note);const result=await stage('claim-child','claim-'+i,[note]);if(!result)fail('CREDIT_SOURCE_REQUIRED');credits.push(result.bytes);}
   const transfer=await stage('transfer','transfer',credits);if(!transfer)fail('TRANSFER_SOURCE_REQUIRED');
   const reserve=await stage('change-reserve','change-reserve',[transfer.bytes]);
   const settlement=await stage('change-settlement','change-settlement',reserve?[transfer.bytes,reserve.bytes]:[transfer.bytes]);
   const remainder=await input.native.remainder([transfer.bytes,...[reserve,settlement].filter(v=>v!==null).map(v=>v!.bytes)]);held.state.nativeRef=remainder?await retain(remainder):null;
   held.state.notes=held.state.notes.filter(ref=>!get().inputNotes.includes(ref));for(const change of [reserve,settlement])if(change){await input.native.inspectNote(change.bytes);held.state.notes.push(change.ref);}
  }
  get().result='committed';if(get().intent.kind!=='add'){const t=get().stages.find(v=>v.kind==='transfer')!;const admitted=await input.native.admit('transfer',await original(t.requestRef),await original(t.outcomeRef!));get().result=admitted?.status??'committed';}get().complete=true;await checkpoint();return structuredClone(get());
 }
 return Object.freeze({
  add:(request:{id:string;amountUsdCents:string;rail?:BankNoteRail})=>input.lock(()=>run({...request,kind:'add'})),
  send:(request:{id:string;amountUsdCents:string;rail:'reserve'|'settlement';recipient:string})=>input.lock(()=>run({...request,kind:'send'})),
  returnToOwner:(request:{id:string;amountUsdCents:string;rail:'reserve'|'settlement'})=>input.lock(()=>run({...request,kind:'return',recipient:input.ownerRecipient})),
  resume:()=>input.lock(()=>run()),
  async publicWitness(nonce:string){const held=await load();await admitVaultMoneyState(held.state,original,input.native);if(held.state.operations.some(v=>!v.complete))fail('OPERATION_PENDING');if(!input.native.publicWitness)fail('PUBLIC_WITNESS_UNAVAILABLE');return input.native.publicWitness({notes:await Promise.all(held.state.notes.map(original)),remainder:held.state.nativeRef?await original(held.state.nativeRef):null,nonce});},
  async holdings(){const held=await load();if(held.state.operations.some(v=>!v.complete&&v.intent.kind!=='add'))fail('OPERATION_PENDING');const ids=new Set<string>();const notes=await Promise.all(held.state.notes.map(async ref=>{const note=await input.native.inspectNote(await original(ref));if(ids.has(note.noteId))fail('DUPLICATE_SOURCE');ids.add(note.noteId);return{...note,sourceRef:ref};}));if(held.state.nativeRef)notes.push({...await input.native.inspectRemainder(await original(held.state.nativeRef)),sourceRef:held.state.nativeRef});return notes;},
 });
}

/** Independent private-state admission. Reopens every prepared request and
 * accepted native original, reconstructs consumed/current holdings, and checks
 * the exact source/approval lineage without transport or financial writes. */
export async function admitVaultMoneyState(value:unknown,restore:(ref:string)=>Promise<Uint8Array>,native:VaultMoneyNative){
 const state=readVaultMoney(value),notes:string[]=[];let nativeRef:string|null=null;
 async function original(ref:string){const b=await restore(ref);if(await vaultDigest(b)!==ref)fail('SOURCE_REQUIRED');return b;}
 for(const op of state.operations){
  if(!same(op.inputNotes,op.intent.kind==='add'?[]:notes)||op.inputNativeRef!==(op.intent.kind==='add'?null:nativeRef))fail('CONSUMED_SOURCE_CONTINUITY_INVALID');
  const digest=await vaultDigest(json({schema:'bank.vault.money-approval.v1',vaultId:state.vaultId,ownerKeyId:state.ownerKeyId,childKeyId:state.childKeyId,intent:op.intent,sourceHeads:[...op.inputNotes,...(op.inputNativeRef?[op.inputNativeRef]:[])]}));if(op.approvalDigest!==null&&op.approvalDigest!==digest||op.stages.length&&!op.approvalDigest)fail('APPROVAL_BINDING_INVALID');
  const accepted=new Map<string,{ref:string;bytes:Uint8Array}>(),credits:Uint8Array[]=[];if(op.inputNativeRef){const bytes=await original(op.inputNativeRef);await native.inspectRemainder(bytes);credits.push(bytes);}
  let last=-1,pending=false;
  for(const s of op.stages){
   let order:number,originals:Uint8Array[]=[];
   if(op.intent.kind==='add'){if(s.kind!=='issue-owner'||s.id!=='funding')fail('STAGE_CONTINUITY_INVALID');order=0;}
   else if(s.kind==='claim-child'){const i=op.inputNotes.findIndex((_,i)=>s.id==='claim-'+i);if(i<0)fail('STAGE_CONTINUITY_INVALID');order=i;originals=[await original(op.inputNotes[i])];await native.inspectNote(originals[0]);}
   else{order=op.inputNotes.length+['transfer','change-reserve','change-settlement'].indexOf(s.kind);if(s.id!==s.kind||order<op.inputNotes.length)fail('STAGE_CONTINUITY_INVALID');if(s.kind==='transfer')originals=credits;else{const transfer=accepted.get('transfer');if(!transfer)fail('STAGE_CONTINUITY_INVALID');originals=[transfer.bytes];const reserve=accepted.get('change-reserve');if(s.kind==='change-settlement'&&reserve)originals.push(reserve.bytes);}}
   if(order<=last||pending)fail('STAGE_CONTINUITY_INVALID');last=order;const request=await original(s.requestRef);
   if(s.phase==='accepted'){const bytes=await original(s.outcomeRef!);await native.admit(s.kind,request,bytes,{intent:op.intent,originals});accepted.set(s.id,{ref:s.outcomeRef!,bytes});if(s.kind==='claim-child')credits.push(bytes);}else pending=true;
  }
  if(op.complete){if(op.intent.kind==='add'&&op.result!=='committed')fail('OUTCOME_BINDING_INVALID');const t=op.stages.find(v=>v.kind==='transfer');if(t){const admitted=await native.admit('transfer',await original(t.requestRef),await original(t.outcomeRef!));if((admitted?.status??'committed')!==op.result)fail('OUTCOME_BINDING_INVALID');}if(pending)fail('STAGE_CONTINUITY_INVALID');if(op.intent.kind==='add'){const funding=accepted.get('funding');if(!funding)fail('FUNDING_SOURCE_REQUIRED');notes.push(funding.ref);}else{if(op.inputNotes.some((_,i)=>!accepted.has('claim-'+i))||!accepted.has('transfer'))fail('STAGE_CONTINUITY_INVALID');notes.splice(0,notes.length,...notes.filter(ref=>!op.inputNotes.includes(ref)));const changes=['change-reserve','change-settlement'].map(k=>accepted.get(k)).filter(v=>v!==undefined);for(const change of changes)notes.push(change.ref);const remainder=await native.remainder([accepted.get('transfer')!.bytes,...changes.map(c=>c.bytes)]);nativeRef=remainder?await vaultDigest(remainder):null;if(nativeRef&&!same([...await original(nativeRef)],[...remainder!]))fail('SOURCE_REQUIRED');}}
 }
 if(!same(notes,state.notes)||nativeRef!==state.nativeRef)fail('CURRENT_SOURCE_CONTINUITY_INVALID');
 const ids=new Set<string>();for(const ref of notes){const n=await native.inspectNote(await original(ref));if(ids.has(n.noteId))fail('DUPLICATE_SOURCE');ids.add(n.noteId);}if(nativeRef)await native.inspectRemainder(await original(nativeRef));return state;
}

export type VaultMoneyAccount={userId:string;receizId:string;identity:ReceizKeyFile;passphrase:string;request(path:string,options:{method:'GET'|'POST';body?:Record<string,unknown>}):Promise<unknown>};
type NoteModule=ConnectedNoteModule&{createBankNoteAccountReceivingRequest(input:{identity:ReceizKeyFile;passphrase:string;accountUserId:string}):Promise<Uint8Array>};
type NativeSdk={createReceizIdentityKeyFile(input:{owner:{uid:string}}):Promise<{keyFile:ReceizKeyFile}>;appendReceizIdentityPortableState(input:{keyFile:ReceizKeyFile;passphrase:string;schema:string;snapshot:unknown;exportedAt:string}):Promise<ReceizKeyFile>;serializeReceizIdentityArtifact(key:ReceizKeyFile):string;parseReceizIdentityArtifactText(text:string):ReceizKeyFile;signReceizIdentityLoginProof(input:{keyFile:ReceizKeyFile;passphrase:string;challengeB64Url:string}):Promise<ReceizIdentityLoginProof>;receizKaiNow():{pulse:number}};
export type MoneyNativeInput={reservation?(input:{kind:VaultMoneyAction;request:Uint8Array;originals:readonly Uint8Array[];currentNativeHead:string|null}):Promise<VaultMoneyCapacity>;applicationId:string;vaultId:string;ownerUserId:string;owner():Promise<VaultMoneyAccount>;child():Promise<VaultMoneyAccount>;module():Promise<NoteModule>;sdk:NativeSdk;assertOpen():void;origin:string;
 /** Read-only exact-source export from the admitted child custody relation. */
 transferSource(sourceSha256:string):Promise<Uint8Array>;
 /** Reopens the existing native transfer original and all carried references,
  * verifies native root/plan/consent and exact receipt binding. The returned
  * balances are the accepted native transition, never a current wallet read. */
 verifyTransferSource?(bytes:Uint8Array,receipt:NativePaymentReceipt):Promise<{accountId:string;keyId:string;sourceSha256:string;sourceAfter:{balancePhiMicro:string;reserveUsdCents:string;reserveBackingPhiMicro:string}}>;
 verifyPayment?(packet:unknown,review:NativePaymentReview):Promise<{packet:NativePaymentPacket;receipt:NativePaymentReceipt|NativePaymentRefusal}>;
 verifyPublicWitness?(packet:unknown):Promise<{witness:Record<string,any>}>;
};
const object=(v:unknown):Record<string,any>=>{if(!v||typeof v!=='object'||Array.isArray(v))return fail('NATIVE_RESPONSE_INVALID');return v as Record<string,any>;};
const b64=(v:unknown)=>vaultBytes(v,24*1024*1024);
async function verifyMoneySource(bytes:Uint8Array,receipt:NativePaymentReceipt){
 const v=await verifyVaultMoneySource(parse(bytes)),t=v.transition,r=receipt.review;
 if(t.nativeTransferSourceSha256!==receipt.nativeTransferSourceSha256||t.requestId!==r.request.requestId||t.applicationId!==r.request.applicationId||t.keyId!==r.keyId||t.ownerReceizId!==r.request.actorReceizId||t.planDigest!==r.planDigest||t.recipient!==r.request.recipient||t.rail!==r.request.rail||t.amountUsdCents!==r.request.amountUsdCents||t.amountPhiMicro!==r.terms.debitPhiMicro||t.debitLedgerId!==receipt.transactionId||t.acceptedAtKaiUPulse!==receipt.kaiUPulse)fail('TRANSFER_BINDING_INVALID');
 return{accountId:t.accountId,keyId:t.keyId,sourceSha256:t.nativeTransferSourceSha256,sourceAfter:v.opening.after};
}
/** Existing connected Note and native-payment primitives composed with explicit
 * parent/child contexts. No active-identity substitution or ordinary storage is
 * used. Every private envelope is retained only by the encrypted controller. */
export function createVaultMoneyNative(input:MoneyNativeInput):VaultMoneyNative{
 const notePath=`/api/connect/offline-notes/connected?origin=${encodeURIComponent(input.origin)}`;

 const verifyPayment=async(packet:unknown,review:NativePaymentReview)=>input.verifyPayment?input.verifyPayment(packet,review):(await import('../native-payment')).verifyNativePaymentSource(packet,review);
 const context=async(role:'owner'|'child')=>{const c=await input[role]();input.assertOpen();if(!c.userId||!c.identity.keyId||!c.receizId||role==='owner'&&c.userId!==input.ownerUserId)fail('CUSTODY_REQUIRED');return c;};
 const wire=(response:unknown)=>{const v=object(response);if(v.ok!==true||typeof v.source!=='string'||typeof v.privateAccountOpening!=='string'||v.cancelled===true)fail('NATIVE_RESULT_PENDING');return{source:b64(v.source),opening:b64(v.privateAccountOpening)};};
 async function note(bytes:Uint8Array){
  const v=vaultObject(parse(bytes),['schema','fundingSource','privateOpening','noteIdentity']),module=await input.module();
  if(v.schema!=='bank.vault.money-note.v1'||typeof v.noteIdentity!=='string')fail('NOTE_SOURCE_REQUIRED');
  const identity=input.sdk.parseReceizIdentityArtifactText(v.noteIdentity as string),source=b64(v.fundingSource),opening=b64(v.privateOpening),proof=await module.verifyBankConnectedNoteFunding(source,opening);
  const child=await context('child'),f=object(proof.funding);
  if(f.noteAuthority?.keyId!==identity.keyId||!(f.accountUserId===input.ownerUserId||f.accountUserId===child.userId&&f.issuer?.keyId===child.identity.keyId))fail('NOTE_CUSTODY_INVALID');
  input.assertOpen();return{v,source,opening,identity,proof};
 }
 async function credit(requestBytes:Uint8Array,resultBytes:Uint8Array){
  const r=vaultObject(parse(requestBytes),['schema','accountUserId','receiverKeyId','source','claim']),v=vaultObject(parse(resultBytes),['schema','source','opening','requestSha256','request']);
  if(r.schema!=='bank.vault.money-claim-request.v1'||v.schema!=='bank.vault.money-credit.v1'||v.requestSha256!==await vaultDigest(requestBytes)||!same(parse(b64(v.request)),parse(requestBytes)))fail('CREDIT_SOURCE_REQUIRED');
  const c=await context('child'),proof=await(await input.module()).verifyBankConnectedNoteCredit(b64(v.source),b64(v.opening)),claim=object(r.claim),p=object(proof.credit);
  if(r.accountUserId!==c.userId||r.receiverKeyId!==c.identity.keyId||claim.receiverUserId!==c.userId||claim.receiver?.keyId!==c.identity.keyId||claim.sourceSha256!==await vaultDigest(b64(r.source))||p.noteId!==claim.noteId||p.receiverUserId!==c.userId||p.receiverKeyId!==c.identity.keyId||p.redemptionDigest!==claim.claimDigest||p.terminalSourceSha256!==claim.sourceSha256)fail('CREDIT_BINDING_INVALID');
  return proof;
 }
 async function transfer(requestBytes:Uint8Array,resultBytes:Uint8Array){
  const r=vaultObject(parse(requestBytes),['schema','prepared','consentProof','credits','changeNoteIdentities']),v=vaultObject(parse(resultBytes),['schema','payment','valueSource','requestSha256','request']);
  if(r.schema!=='bank.vault.money-transfer-request.v1'||v.schema!=='bank.vault.money-transfer.v1'||v.requestSha256!==await vaultDigest(requestBytes)||!same(parse(b64(v.request)),parse(requestBytes)))fail('TRANSFER_SOURCE_REQUIRED');
  const p=object(r.prepared) as NativePaymentPrepared,c=await context('child'),review=inspectNativePaymentReview({schema:p.schema,request:p.request,keyId:p.keyId,planDigest:p.planDigest,terms:p.terms});
  if(review.keyId!==c.identity.keyId||review.request.actorReceizId!==c.receizId||review.request.applicationId!==input.applicationId||object(r.consentProof).keyId!==c.identity.keyId||object(r.consentProof).challengeB64Url!==nativePaymentChallenge(review))fail('TRANSFER_BINDING_INVALID');
  const checked=await verifyPayment(v.payment,review);
  if(checked.receipt.schema==='receiz.bank.native-payment-refusal.v1'){
   if(v.valueSource!==null||!Array.isArray(r.credits)||!r.credits.length)fail('REFUSAL_SOURCE_REQUIRED');
   let after={balancePhiMicro:'0',reserveUsdCents:'0',reserveBackingPhiMicro:'0'},sourceSha256='';
   for(const encoded of r.credits){const bytes=b64(encoded),held=object(parse(bytes));if(held.schema==='bank.vault.money-remainder.v1'){const prior=await remaining(bytes);if(sourceSha256)fail('CREDIT_CONTINUITY_INVALID');after={...prior.after};sourceSha256=prior.sourceSha256;continue;}
    const proof=await credit(b64(held.request),bytes),opening=object(parse(b64(held.opening))),f=object(proof.credit);if(opening.walletBeforePhiMicro!==after.balancePhiMicro||opening.reserveBeforeUsdCents!==after.reserveUsdCents)fail('CREDIT_CONTINUITY_INVALID');
    after={balancePhiMicro:(BigInt(after.balancePhiMicro)+BigInt(f.amountPhiMicro)).toString(),reserveUsdCents:(BigInt(after.reserveUsdCents)+(f.rail==='reserve'?BigInt(f.amountUsdCents):f.rail==='composite'?BigInt(f.fundingParts.reserve.amountUsdCents):0n)).toString(),reserveBackingPhiMicro:(BigInt(after.reserveBackingPhiMicro)+(f.rail==='reserve'?BigInt(f.amountPhiMicro):f.rail==='composite'?BigInt(f.fundingParts.reserve.amountPhiMicro):0n)).toString()};if(!same(proof.accountAfter,{balancePhiMicro:after.balancePhiMicro,reserveUsdCents:after.reserveUsdCents}))fail('CREDIT_CONTINUITY_INVALID');sourceSha256=await vaultDigest(b64(held.source));
   }
   return{status:'zero-write' as const,receipt:checked.receipt,after,sourceSha256};
  }
  const original=input.verifyTransferSource?await input.verifyTransferSource(b64(v.valueSource),checked.receipt):await verifyMoneySource(b64(v.valueSource),checked.receipt);
  if(original.accountId!==c.userId||original.keyId!==c.identity.keyId||original.sourceSha256!==checked.receipt.nativeTransferSourceSha256||!paymentSame(original.sourceAfter,checked.receipt.senderAfter))fail('TRANSFER_BINDING_INVALID');
  input.assertOpen();return{status:'committed' as const,receipt:checked.receipt,after:original.sourceAfter,sourceSha256:original.sourceSha256};
 }
 async function quote(c:VaultMoneyAccount){const v=object(await c.request(notePath+'&intent=quote',{method:'GET'})),q=object(v.quote);input.assertOpen();if(v.ok!==true||typeof q.quotePulse!=='string'||!/^\d{1,18}$/.test(q.quotePulse)||!Number.isSafeInteger(q.issuedAtMs)||!Number.isSafeInteger(q.expiresAtMs)||q.expiresAtMs-q.issuedAtMs!==300000||Date.now()>q.expiresAtMs)fail('QUOTE_INVALID');return q;}
 async function remaining(bytes:Uint8Array){
  const r=vaultObject(parse(bytes),['schema','transfer','changes']);if(r.schema!=='bank.vault.money-remainder.v1'||!Array.isArray(r.changes)||r.changes.length>2)fail('REMAINDER_SOURCE_INVALID');
  const result=b64(r.transfer),t=object(parse(result)),accepted=await transfer(b64(t.request),result),c=await context('child');let after={...accepted.after},sourceSha256=accepted.sourceSha256;
  for(const encoded of r.changes){const n=await note(b64(encoded)),f=object(n.proof.funding),opening=object(parse(n.opening));if(f.accountUserId!==c.userId||f.issuer?.keyId!==c.identity.keyId||opening.walletBeforePhiMicro!==after.balancePhiMicro||opening.reserveBeforeUsdCents!==after.reserveUsdCents)fail('CHANGE_CONTINUITY_INVALID');
   after={balancePhiMicro:(BigInt(after.balancePhiMicro)-BigInt(f.amountPhiMicro)).toString(),reserveUsdCents:(BigInt(after.reserveUsdCents)-(f.rail==='reserve'?BigInt(f.amountUsdCents):0n)).toString(),reserveBackingPhiMicro:(BigInt(after.reserveBackingPhiMicro)-(f.rail==='reserve'?BigInt(f.amountPhiMicro):0n)).toString()};
   if(!same(n.proof.accountAfter,{balancePhiMicro:after.balancePhiMicro,reserveUsdCents:after.reserveUsdCents}))fail('CHANGE_CONTINUITY_INVALID');sourceSha256=await vaultDigest(n.source);
  }
  return{after,sourceSha256,accountId:c.userId,keyId:c.identity.keyId};
 }
 async function issueRequest(c:VaultMoneyAccount,amountUsdCents:string,rail?:BankNoteRail,exact?:{phi:string;before:{balancePhiMicro:string;reserveUsdCents:string}},heldQuote?:Record<string,any>,preparedNoteIdentity?:ReceizKeyFile){
  const q=heldQuote??await quote(c);if(exact&&(q.balancePhiMicro!==exact.before.balancePhiMicro||q.reserveUsdCents!==exact.before.reserveUsdCents))fail('CHANGE_SOURCE_CONFLICT');
  const selected=selectNoteFunding(amountUsdCents,q,rail),noteIdentity=preparedNoteIdentity??(await input.sdk.createReceizIdentityKeyFile({owner:{uid:crypto.randomUUID()}})).keyFile;
  if(Date.now()>q.expiresAtMs)fail('QUOTE_EXPIRED');
  const authorization=await(await input.module()).createBankConnectedNoteIssue({identity:c.identity,passphrase:c.passphrase,accountUserId:c.userId,noteIdentity,rail:selected.rail,amountUsdCents,...(selected.rail!=='reserve'?{amountPhiMicro:exact?.phi??selected.amountPhiMicro}:{}),...(selected.fundingParts?{fundingParts:selected.fundingParts}:{}),quotePulse:q.quotePulse,nowMs:q.issuedAtMs,usdPerPhiMicrocents:q.usdPerPhiMicrocents,expectedReserveBeforeUsdCents:q.reserveUsdCents,expectedWalletBeforePhiMicro:q.balancePhiMicro});
  input.assertOpen();return json({schema:'bank.vault.money-issue-request.v1',accountUserId:c.userId,issuerKeyId:c.identity.keyId,authorization,noteIdentity:input.sdk.serializeReceizIdentityArtifact(noteIdentity)});
 }
 return{
  async preflightTransfer(intent,originals){
   if(intent.kind==='add'||!['reserve','settlement'].includes(intent.rail!)||!originals.length)fail('INTENT_INVALID');
   let balancePhiMicro=0n,reserveUsdCents=0n,reserveBackingPhiMicro=0n,hasRemainder=false;const ids=new Set<string>();
   for(const bytes of originals){const packet=object(parse(bytes));if(packet.schema==='bank.vault.money-remainder.v1'){if(hasRemainder)fail('DUPLICATE_SOURCE');hasRemainder=true;const r=await remaining(bytes);balancePhiMicro+=BigInt(r.after.balancePhiMicro);reserveUsdCents+=BigInt(r.after.reserveUsdCents);reserveBackingPhiMicro+=BigInt(r.after.reserveBackingPhiMicro);continue;}
    const n=await note(bytes),f=object(n.proof.funding);if(ids.has(n.proof.noteId))fail('DUPLICATE_SOURCE');ids.add(n.proof.noteId);balancePhiMicro+=BigInt(f.amountPhiMicro);
    if(f.rail==='reserve'){reserveUsdCents+=BigInt(f.amountUsdCents);reserveBackingPhiMicro+=BigInt(f.amountPhiMicro);}else if(f.rail==='composite'){reserveUsdCents+=BigInt(f.fundingParts.reserve.amountUsdCents);reserveBackingPhiMicro+=BigInt(f.fundingParts.reserve.amountPhiMicro);}
   }
   // The existing native wallet integer/denomination equations run beneath
   // admitted Originals. Reserve never needs a quote; absent free Settlement
   // is also an immediate local refusal. Only nonzero Settlement needs one
   // existing native quote for the current rate. Final native prepare still
   // checks its own authoritative current heads/rate before acceptance.
   const max=(1n<<63n)-1n,D=1000000000000n,cents=BigInt(intent.amountUsdCents),settlementPhiMicro=balancePhiMicro-reserveBackingPhiMicro;
   if([balancePhiMicro,reserveUsdCents,reserveBackingPhiMicro,settlementPhiMicro].some(v=>v<0n||v>max)||(reserveUsdCents===0n)!==(reserveBackingPhiMicro===0n))fail('SOURCE_AMOUNT_INVALID');
   let phi:bigint;
   if(intent.rail==='reserve'){if(cents>reserveUsdCents)fail('INSUFFICIENT_RESERVE');phi=(reserveBackingPhiMicro*cents+reserveUsdCents-1n)/reserveUsdCents;if(phi===0n||phi>balancePhiMicro||cents<reserveUsdCents&&phi===reserveBackingPhiMicro)fail('DENOMINATION_PRECISION');}
   else{if(settlementPhiMicro===0n)fail('INSUFFICIENT_SETTLEMENT');const q=await quote(await context('child')),selected=selectNoteFunding(intent.amountUsdCents,{balancePhiMicro:balancePhiMicro.toString(),reserveUsdCents:reserveUsdCents.toString(),settlementPhiMicro:settlementPhiMicro.toString(),usdPerPhiMicrocents:q.usdPerPhiMicrocents},'settlement');phi=BigInt(selected.amountPhiMicro!);}
   const rate=(cents*D+phi/2n)/phi;if(rate<1n||rate>max||(phi*rate+D/2n)/D!==cents)fail('DENOMINATION_PRECISION');input.assertOpen();
  },
  async reserve(kind,request,originals){const r=object(parse(request)),c=await context(kind==='issue-owner'?'owner':'child'),nativeKind=kind==='transfer'?'payment':kind==='claim-child'?'claim':'issue',nativeRequest=nativeKind==='payment'?{prepared:r.prepared,consentProof:r.consentProof}:nativeKind==='claim'?{claim:r.claim,source:r.source}:{authorization:r.authorization};const policy=object(await c.request(`/api/connect/vault/custody?applicationId=${encodeURIComponent(input.applicationId)}`,{method:'POST',body:{operation:'money-capacity',submission:{kind:nativeKind,request:nativeRequest}}}));input.assertOpen();if(policy.schema!=='receiz.bank.vault-money-capacity-policy.v1'||policy.requestSha256!==await vaultDigest(json(nativeRequest))||policy.proofMetadataMaxBytes!==65536||!hash(policy.currentNativeHead))fail('CAPACITY_BINDING_INVALID');const reserve=input.reservation??(await loadVaultNative()).vaultMoneySourceReservation;return reserve({kind,request,originals,currentNativeHead:policy.currentNativeHead});},
  inspectNote:async bytes=>(await note(bytes)).proof,
  async inspectRemainder(bytes){const r=await remaining(bytes),settlement=BigInt(r.after.balancePhiMicro)-BigInt(r.after.reserveBackingPhiMicro);return{noteId:'native:'+r.sourceSha256,rail:r.after.reserveUsdCents!=='0'?(settlement>0n?'composite':'reserve'):'settlement',amountPhiMicro:r.after.balancePhiMicro,amountUsdCents:r.after.reserveUsdCents};},
  async remainder(originals){const bytes=json({schema:'bank.vault.money-remainder.v1',transfer:vaultBase64(originals[0]),changes:originals.slice(1).map(vaultBase64)}),r=await remaining(bytes);return r.after.balancePhiMicro==='0'?null:bytes;},
  async publicWitness(originals){
   if(!/^[A-Za-z0-9._:-]{16,120}$/.test(originals.nonce))fail('PUBLIC_NONCE_INVALID');const c=await context('child'),notes=[],sourceHeads:string[]=[];
   for(const bytes of originals.notes){const n=await note(bytes),sourceSha256=await vaultDigest(n.source),challengeB64Url=vaultMoneyHoldingChallenge({vaultId:input.vaultId,applicationId:input.applicationId,nonce:originals.nonce,sourceSha256}),holderProof=await input.sdk.signReceizIdentityLoginProof({keyFile:n.identity,passphrase:'',challengeB64Url});notes.push({fundingSource:vaultBase64(n.source),holderProof});sourceHeads.push(sourceSha256);}
   const nativeSourceSha256=originals.remainder?(await remaining(originals.remainder)).sourceSha256:null,request={schema:'receiz.bank.vault-money-public-request.v1',vaultId:input.vaultId,applicationId:input.applicationId,nonce:originals.nonce,notes,nativeSourceSha256};
   const packet=await c.request(`/api/connect/vault/custody?applicationId=${encodeURIComponent(input.applicationId)}`,{method:'POST',body:{operation:'money-public',submission:request}}),verified=input.verifyPublicWitness?await input.verifyPublicWitness(packet):await verifyVaultMoneyPublicWitness(packet),w=verified.witness;
   if(w.vaultId!==input.vaultId||w.applicationId!==input.applicationId||w.keyId!==c.identity.keyId||w.accountId!==c.userId||w.ownerReceizId!==c.receizId||w.nonce!==originals.nonce||!same(w.notes.map((v:any)=>v.sourceSha256),sourceHeads)||(w.nativeMoney?.sourceSha256??null)!==nativeSourceSha256)fail('PUBLIC_WITNESS_BINDING_INVALID');
   return packet;
  },
  async prepare(kind,intent,originals){
   if(kind==='issue-owner')return issueRequest(await context('owner'),intent.amountUsdCents,intent.rail);
   if(kind==='claim-child'){
    if(originals.length!==1)fail('NOTE_SOURCE_REQUIRED');const n=await note(originals[0]),c=await context('child'),module=await input.module();
    const receivingIdentity=await input.sdk.appendReceizIdentityPortableState({keyFile:c.identity,passphrase:c.passphrase,schema:'receiz.account.state.v3',snapshot:{schema:'receiz.account.state.v3',account:{userId:c.userId}},exportedAt:c.identity.issuedAt});
    const receiving=await module.createBankNoteAccountReceivingRequest({identity:receivingIdentity,passphrase:c.passphrase,accountUserId:c.userId});
    const source=await module.createBankConnectedNoteHandover({fundingSourceBytes:n.source,receivingRequestBytes:receiving,noteIdentity:n.identity,kai:String(input.sdk.receizKaiNow().pulse)}),claim=await module.createBankConnectedNoteClaim({sourceBytes:source,identity:c.identity,passphrase:c.passphrase,accountUserId:c.userId});
    return json({schema:'bank.vault.money-claim-request.v1',accountUserId:c.userId,receiverKeyId:c.identity.keyId,source:vaultBase64(source),claim});
   }
   if(kind==='transfer'){
    if(!originals.length||!['reserve','settlement'].includes(intent.rail!))fail('CREDIT_SOURCE_REQUIRED');
    const c=await context('child'),request={schema:'bankeiz.operation-request.v1',applicationId:input.applicationId,requestId:intent.id,actorReceizId:c.receizId,kind:'send-value',rail:intent.rail,amountUsdCents:intent.amountUsdCents,recipient:intent.recipient};
    const last=object(parse(originals.at(-1)!));let sourceSha256:string;
    if(last.schema==='bank.vault.money-credit.v1'){await credit(b64(last.request),originals.at(-1)!);sourceSha256=await vaultDigest(b64(last.source));}
    else sourceSha256=(await remaining(originals.at(-1)!)).sourceSha256;
    const prepared=object(await c.request(`/api/connect/vault/custody?applicationId=${encodeURIComponent(input.applicationId)}`,{method:'POST',body:{operation:'money-prepare',submission:{sourceSha256,request}}})) as NativePaymentPrepared,review=inspectNativePaymentReview({schema:prepared.schema,request:prepared.request,keyId:prepared.keyId,planDigest:prepared.planDigest,terms:prepared.terms});
    if(!paymentSame(review.request,request)||review.keyId!==c.identity.keyId||prepared.challengeB64Url!==nativePaymentChallenge(review)||typeof prepared.ticket!=='string'||!prepared.ticket)fail('TRANSFER_REVIEW_INVALID');
    const consentProof=await input.sdk.signReceizIdentityLoginProof({keyFile:c.identity,passphrase:c.passphrase,challengeB64Url:prepared.challengeB64Url});input.assertOpen();
    const changeNoteIdentities=await Promise.all([0,1].map(async()=>input.sdk.serializeReceizIdentityArtifact((await input.sdk.createReceizIdentityKeyFile({owner:{uid:crypto.randomUUID()}})).keyFile)));input.assertOpen();return json({schema:'bank.vault.money-transfer-request.v1',prepared,consentProof,credits:originals.map(vaultBase64),changeNoteIdentities});
   }
   const first=object(parse(originals[0]));if(first.schema!=='bank.vault.money-transfer.v1')fail('TRANSFER_SOURCE_REQUIRED');
   const accepted=await transfer(b64(first.request),originals[0]),c=await context('child'),transferRequest=object(parse(b64(first.request)));if(!Array.isArray(transferRequest.changeNoteIdentities)||transferRequest.changeNoteIdentities.length!==2||transferRequest.changeNoteIdentities.some((v:unknown)=>typeof v!=='string'))fail('CHANGE_SOURCE_CONFLICT');const changeIdentity=input.sdk.parseReceizIdentityArtifactText(transferRequest.changeNoteIdentities[kind==='change-reserve'?0:1]);
   if(kind==='change-reserve'){
    if(accepted.after.reserveUsdCents==='0')return null;
    return issueRequest(c,accepted.after.reserveUsdCents,'reserve',{phi:accepted.after.reserveBackingPhiMicro,before:accepted.after},undefined,changeIdentity);
   }
   let before={balancePhiMicro:accepted.after.balancePhiMicro,reserveUsdCents:accepted.after.reserveUsdCents};
   if(originals.length>1){const reserve=await note(originals[1]);before=reserve.proof.accountAfter as {balancePhiMicro:string;reserveUsdCents:string};}
   if(before.reserveUsdCents!=='0')fail('RESERVE_CHANGE_REQUIRED');
   if(before.balancePhiMicro==='0')return null;
   const q=await quote(c),phi=BigInt(before.balancePhiMicro),cents=((phi*BigInt(q.usdPerPhiMicrocents)+500000000000n)/1000000000000n).toString();
   if(cents==='0')return null; // Complete native opening retains exact phi dust.
   return issueRequest(c,cents,'settlement',{phi:before.balancePhiMicro,before},q,changeIdentity);
  },
  async execute(kind,requestBytes,_recoverFirst,capacity){
   if(!capacity||capacity.requestSha256!==await vaultDigest(requestBytes)||!hash(capacity.currentNativeHead))fail('CAPACITY_BINDING_INVALID');const expectedNativeHead=capacity.currentNativeHead;
   const r=object(parse(requestBytes));
   if(kind==='issue-owner'||kind==='change-reserve'||kind==='change-settlement'){
    vaultObject(r,['schema','accountUserId','issuerKeyId','authorization','noteIdentity']);if(r.schema!=='bank.vault.money-issue-request.v1')fail('ISSUE_REQUEST_INVALID');
    const c=await context(kind==='issue-owner'?'owner':'child'),a=object(r.authorization);if(c.userId!==r.accountUserId||c.identity.keyId!==r.issuerKeyId||a.accountUserId!==c.userId||a.issuer?.keyId!==c.identity.keyId)fail('ISSUE_BINDING_INVALID');
    const response=await c.request(`/api/connect/vault/custody?applicationId=${encodeURIComponent(input.applicationId)}`,{method:'POST',body:{operation:'money-execute',submission:{kind:'issue',request:{authorization:a},expectedNativeHead}}});
    const w=wire(response),result=json({schema:'bank.vault.money-note.v1',fundingSource:vaultBase64(w.source),privateOpening:vaultBase64(w.opening),noteIdentity:r.noteIdentity});await this.admit(kind,requestBytes,result);return result;
   }
   if(kind==='claim-child'){
    vaultObject(r,['schema','accountUserId','receiverKeyId','source','claim']);const c=await context('child'),claim=object(r.claim);if(r.schema!=='bank.vault.money-claim-request.v1'||r.accountUserId!==c.userId||r.receiverKeyId!==c.identity.keyId||claim.receiverUserId!==c.userId||claim.receiver?.keyId!==c.identity.keyId||claim.sourceSha256!==await vaultDigest(b64(r.source)))fail('CLAIM_BINDING_INVALID');
    const response=await c.request(`/api/connect/vault/custody?applicationId=${encodeURIComponent(input.applicationId)}`,{method:'POST',body:{operation:'money-execute',submission:{kind:'claim',request:{claim,source:r.source},expectedNativeHead}}});
    const w=wire(response),result=json({schema:'bank.vault.money-credit.v1',source:vaultBase64(w.source),opening:vaultBase64(w.opening),requestSha256:await vaultDigest(requestBytes),request:vaultBase64(requestBytes)});await credit(requestBytes,result);return result;
   }
   vaultObject(r,['schema','prepared','consentProof','credits','changeNoteIdentities']);if(r.schema!=='bank.vault.money-transfer-request.v1')fail('TRANSFER_REQUEST_INVALID');const c=await context('child'),p=object(r.prepared) as NativePaymentPrepared;
   const response=await c.request(`/api/connect/vault/custody?applicationId=${encodeURIComponent(input.applicationId)}`,{method:'POST',body:{operation:'money-execute',submission:{kind:'payment',request:{prepared:p,consentProof:r.consentProof},expectedNativeHead}}});
   const review=inspectNativePaymentReview({schema:p.schema,request:p.request,keyId:p.keyId,planDigest:p.planDigest,terms:p.terms}),verified=await verifyPayment(response,review);
   const valueSource=verified.receipt.schema==='receiz.bank.native-payment-receipt.v1'?await input.transferSource(verified.receipt.nativeTransferSourceSha256):null,result=json({schema:'bank.vault.money-transfer.v1',payment:verified.packet,valueSource:valueSource?vaultBase64(valueSource):null,requestSha256:await vaultDigest(requestBytes),request:vaultBase64(requestBytes)});await transfer(requestBytes,result);return result;
  },
  async admit(kind,requestBytes,result,expected){
   if(kind==='claim-child'){await credit(requestBytes,result);if(expected){const n=await note(expected.originals[0]),request=object(parse(requestBytes)),handover=object(parse(b64(request.source)));if(handover.fundingSource!==vaultBase64(n.source)||object(request.claim).noteId!==n.proof.noteId)fail('CLAIM_SOURCE_SUBSTITUTED');}return;}
   if(kind==='transfer'){const admitted=await transfer(requestBytes,result);if(expected){const r=object(parse(requestBytes)),p=object(r.prepared),intent=expected.intent;if(p.request.amountUsdCents!==intent.amountUsdCents||p.request.recipient!==intent.recipient||p.request.rail!==intent.rail||p.request.requestId!==intent.id||!same(r.credits,expected.originals.map(vaultBase64)))fail('TRANSFER_INTENT_SUBSTITUTED');}return{status:admitted.status};}
   const r=object(parse(requestBytes)),n=await note(result),a=object(r.authorization),f=object(n.proof.funding);
   if(r.schema!=='bank.vault.money-issue-request.v1'||r.noteIdentity!==n.v.noteIdentity||a.operationId!==f.operationId||a.noteId!==f.noteId||a.accountUserId!==f.accountUserId||a.issuer?.keyId!==f.issuer?.keyId||a.noteAuthority?.keyId!==f.noteAuthority?.keyId||a.amountUsdCents!==f.amountUsdCents||a.rail!==f.rail||a.rail!=='reserve'&&(a.amountPhiMicro!==f.amountPhiMicro||a.usdPerPhiMicrocents!==f.usdPerPhiMicrocents)||!same(a.fundingParts??null,f.fundingParts??null))fail('ISSUE_SOURCE_SUBSTITUTED');
   if(expected&&kind==='issue-owner'&&(f.amountUsdCents!==expected.intent.amountUsdCents||expected.intent.rail!==undefined&&f.rail!==expected.intent.rail))fail('ISSUE_INTENT_SUBSTITUTED');
  },
 };
}
