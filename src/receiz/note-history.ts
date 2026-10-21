import {mergePublicRecords,type PublicRecord} from './public-network';
import {projectAccountHistoryRecords} from './account-history-direction';
import {readConnectedNoteCheckpoint} from './connected-note-runtime';
import {readReceivedNoteDepositCheckpoint} from './note-received-deposits';
import {marketPulseTime} from './market-projection/coordinates';

type Fields=Record<string,unknown>;
export interface NoteHistoryModule{
 verifyBankConnectedNoteFunding(source:Uint8Array,opening:Uint8Array):Promise<{funding:Fields}>;
 verifyBankConnectedNoteReceipt(source:Uint8Array):Promise<{kind:string;credit?:Fields;rail?:string}>;
 openBankNoteDepositReceipt(source:Uint8Array):Promise<{credit:Fields;rail:string}>;
}
type NoteHistoryInput={accountUid:string;keyId:string;readConnected():Promise<unknown>;readReceived():Promise<unknown>;restore(ref:string):Promise<Uint8Array>;module():Promise<NoteHistoryModule>};
const object=(value:unknown):Fields=>value!==null&&typeof value==='object'&&!Array.isArray(value)?value as Fields:{};
const hash=(value:unknown):value is string=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const uint=(value:unknown):value is string=>typeof value==='string'&&/^(0|[1-9]\d{0,29})$/.test(value);
function invalid():never{throw Error('BANK_NOTE_HISTORY_BINDING_MISMATCH');}
const digest=async(source:Uint8Array)=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new Uint8Array(source)))].map(value=>value.toString(16).padStart(2,'0')).join('');

/** Admission reuse is scoped to the exact retained sources and private opening.
 * Live execution can supply its already verified result; cold restore uses the
 * same native verifier once. No cache entry provides execution authority. */
export function createNoteHistoryReader(input:NoteHistoryInput){
 const funding=new Map<string,Promise<{funding:Fields}>>(),credits=new Map<string,Promise<{kind:string;credit?:Fields;rail?:string}>>();
 let current:{revision:string;records:Promise<PublicRecord[]>}|undefined;
 async function remembered<T>(cache:Map<string,Promise<T>>,key:string,verify:()=>Promise<T>){
  let value=cache.get(key);if(!value){value=verify();cache.set(key,value);void value.catch(()=>{if(cache.get(key)===value)cache.delete(key);});}return value;
 }
 return{
  async rememberFunding(source:Uint8Array,opening:Uint8Array,proof:{funding:Fields}){funding.set(`${await digest(source)}:${await digest(opening)}`,Promise.resolve({funding:structuredClone(proof.funding)}));},
  async rememberCredit(source:Uint8Array,proof:{rail?:string;credit?:Fields}){credits.set(await digest(source),Promise.resolve({kind:'credit',rail:proof.rail,credit:structuredClone(proof.credit)}));},
  async read(){
   const connected=await input.readConnected(),received=await input.readReceived();
   const revision=JSON.stringify([connected,received]);
   if(current?.revision===revision)return current.records;
   const records=readRetainedNoteHistory({...input,readConnected:async()=>connected,readReceived:async()=>received,module:async()=>{
    const native=await input.module();return{
     verifyBankConnectedNoteFunding:async(source,opening)=>remembered(funding,`${await digest(source)}:${await digest(opening)}`,()=>native.verifyBankConnectedNoteFunding(source,opening)),
     verifyBankConnectedNoteReceipt:async source=>remembered(credits,await digest(source),()=>native.verifyBankConnectedNoteReceipt(source)),
     openBankNoteDepositReceipt:native.openBankNoteDepositReceipt,
    };
   }});
   const held={revision,records};current=held;void records.catch(()=>{if(current===held)current=undefined;});return records;
  },
 };
}

/** Read-only projections of already confirmed native debits and credits. The
 * financial sources remain in their existing encrypted custody. No submissions,
 * clocks, account balances or pending receiving terminals create history rows. */
export async function readRetainedNoteHistory(input:NoteHistoryInput):Promise<PublicRecord[]>{
 const connected=readConnectedNoteCheckpoint(await input.readConnected()),received=readReceivedNoteDepositCheckpoint(await input.readReceived());
 for(const state of [connected,received])if(state&&(state.uid!==input.accountUid||state.keyId!==input.keyId))invalid();
 const created=Object.values(connected?.notes??{}).filter(row=>row.phase==='issued');
 const deposited=Object.entries(received?.entries??{}).filter(([,row])=>row.status==='confirmed');
 if(!created.length&&!deposited.length)return [];
 const native=await input.module(),rows:Fields[]=[];
 async function original(ref:string){
  const source=await input.restore(ref);
  if(await digest(source)!==ref)throw Error('BANK_NOTE_SOURCE_REQUIRED');return source;
 }
 function row(proof:Fields,direction:'debit'|'credit',digest:string,rail:unknown){
  const ledgerId=proof[direction==='debit'?'debitLedgerId':'creditLedgerId'],pulse=proof[direction==='debit'?'fundedAtKai':'acceptedAtKai'];
  if(typeof ledgerId!=='string'||!/^[a-f0-9-]{36}$/i.test(ledgerId)||!uint(pulse)||!uint(proof.amountUsdCents)||!uint(proof.amountPhiMicro)||!['reserve','settlement','composite'].includes(String(rail)))invalid();
  const time=Number.isSafeInteger(Number(pulse))?marketPulseTime(Number(pulse)):NaN;
  rows.push({id:`wallet_ledger:${ledgerId}`,kind:'wallet_ledger_entry',ledgerEntryKind:direction==='debit'?'note_mint':'note_claim',direction,user_id:input.accountUid,pulse,
   ...(Number.isFinite(time)&&Math.abs(time)<=8.64e15?{occurredAt:new Date(time).toISOString()}:{}),
   amountUsdCents:proof.amountUsdCents,amountPhiMicro:proof.amountPhiMicro,noteId:proof.noteId,metadata:{source:direction==='debit'?'bank_connected_note_allocate':'bank_connected_note_redeem',rail},proofBundle:{artifactDigest:digest},
   noteReceipt:{...proof,rail,sourceDigest:digest,issuerKeyId:object(proof.issuer).keyId}});
 }
 for(const saved of created){
  const source=await original(saved.sourceRef!),opening=await original(saved.openingRef!),{funding}=await native.verifyBankConnectedNoteFunding(source,opening);
  if(funding.accountUserId!==input.accountUid||object(funding.issuer).keyId!==input.keyId||funding.noteId!==saved.noteId||funding.operationId!==saved.operationId||funding.rail!==saved.rail||funding.amountUsdCents!==saved.amountUsdCents)invalid();
  row(funding,'debit',saved.sourceRef!,funding.rail);
 }
 for(const [noteId,saved]of deposited){
  const stored=object(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(await original(saved.creditRef!))));
  if(stored.noteId!==noteId||!hash(stored.proofRef))invalid();
  const source=await original(stored.proofRef),format=object(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(source))).schema;
  const admitted=format==='receiz.bank.connected-note.receipt.v1'?await native.verifyBankConnectedNoteReceipt(source):await native.openBankNoteDepositReceipt(source);
  if('kind'in admitted&&admitted.kind!=='credit')invalid();
  const credit=admitted.credit;
  if(!credit||credit.receiverUserId!==input.accountUid||credit.receiverKeyId!==input.keyId||credit.noteId!==noteId||credit.amountUsdCents!==stored.amountUsdCents||credit.amountPhiMicro!==stored.amountPhiMicro||admitted.rail!==stored.rail)invalid();
  row(credit,'credit',stored.proofRef,admitted.rail);
 }
 return mergePublicRecords([],projectAccountHistoryRecords('wallet',rows,input.accountUid).map(record=>({...record,origin:'private-account' as const})));
}
