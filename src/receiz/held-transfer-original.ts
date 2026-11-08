import type {PublicRecord} from './public-network';
import {readWalletTransferOriginal} from './wallet-transfer-original';

const uuid=(v:unknown):v is string=>typeof v==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(v);
export function ledgerOriginalTransferId(record:PublicRecord){
 if(record.source!=='wallet'||record.evidence.artifactDigest||!(/^(?:chat_transfer|transfer)(?:_send|_receive)?$/.test(record.kind)||record.kind==='wallet_ledger_entry'&&/^chat_transfer_(?:send|receive)$/.test(String(record.details?.ledgerEntryKind))))return null;
 const id=record.evidence.transferId??record.sourceId.replace(/^transfer:/,'');return uuid(id)?id:null;
}
export function assertTransferOriginalRecord(raw:unknown,record:PublicRecord){
 const source=readWalletTransferOriginal(raw),id=ledgerOriginalTransferId(record);
 if(!id||source.transferId!==id||record.amountUsdCents!==null&&record.amountUsdCents!==source.amountUsdCents)throw Error('SELECTED_RECORD_SOURCE_MISMATCH');
 const transfer=(raw as {transfer:Record<string,unknown>}).transfer;
 for(const key of ['amountPhiMicro','usdPerPhiMicrocents'] as const)if(record.valueOperands?.[key]!==undefined&&record.valueOperands[key]!==transfer[key])throw Error('SELECTED_RECORD_SOURCE_MISMATCH');
 return source;
}
/** Selected source read only. Accepted sends already retain these exact
 * originals. A genuinely missing source uses the existing authenticated reader
 * once and stays in the existing encrypted, identity-bound operation store. */
export function createHeldTransferOriginalReader(input:{assertOpen():void;accountUid():string|null;readSends():Promise<unknown>;readSaved(id:string):Promise<unknown>;save(id:string,source:unknown,previous:unknown):Promise<void>;readMissing(id:string):Promise<unknown>;exportOriginal(input:import('./record-proof-export').RecordProofExportInput):Promise<File>}){
 const held=new Map<string,Promise<{raw:unknown;file:File}>>();
 return async(record:PublicRecord)=>{
  input.assertOpen();const id=ledgerOriginalTransferId(record);if(!id)return null;
  let pending=held.get(id);
  if(!pending){
   pending=(async()=>{
    const uid=input.accountUid();if(!uid)throw Error('TRANSFER_ORIGINAL_ACCOUNT_REQUIRED');
    const sends=await input.readSends() as {schema?:string;current?:{status?:string;record?:unknown};history?:Array<{status?:string;record?:unknown}>}|null;input.assertOpen();
    if(sends&&(sends.schema!=='bank.wallet-sends.v1'||!Array.isArray(sends.history)||sends.history.length>1000))throw Error('BANK_WALLET_CHECKPOINT_INVALID');
    const checkpoint=sends&&[sends.current,...sends.history!].find(c=>c?.status==='recorded'&&(c.record as {transfer?:{id?:unknown}}|undefined)?.transfer?.id===id);
    const saved=checkpoint?null:await input.readSaved(id);input.assertOpen();
    const sourceValue=checkpoint?.record??saved??await input.readMissing(id);input.assertOpen();
    const exact=JSON.stringify(sourceValue),bytes=new TextEncoder().encode(exact);if(bytes.length>8*1024*1024)throw Error('TRANSFER_ORIGINAL_CAPACITY');
    const raw:unknown=JSON.parse(exact),source=assertTransferOriginalRecord(raw,record);
    if(input.accountUid()!==uid||(source.senderUserId!==uid&&source.recipientUserId!==uid))throw Error('TRANSFER_ORIGINAL_ACCOUNT_MISMATCH');
    const {inspectTransferOriginal}=await import('./transfer-original-proof');const proof=await inspectTransferOriginal(raw);input.assertOpen();
    if(input.accountUid()!==uid)throw Error('TRANSFER_ORIGINAL_ACCOUNT_MISMATCH');
    if(!checkpoint&&!saved){await input.save(id,raw,null);input.assertOpen();}
    const file=await input.exportOriginal({bytes,recordHash:proof.receiptDigest,filename:`transfer-${id}.receiz-original.json`,mimeType:'application/json'});input.assertOpen();return{raw:JSON.parse(exact),file};
   })();held.set(id,pending);while(held.size>4)held.delete(held.keys().next().value!);void pending.catch(()=>{if(held.get(id)===pending)held.delete(id);});
  }
  const value=await pending;input.assertOpen();const source=assertTransferOriginalRecord(value.raw,record),uid=input.accountUid();
  if(!uid||source.senderUserId!==uid&&source.recipientUserId!==uid)throw Error('TRANSFER_ORIGINAL_ACCOUNT_MISMATCH');return value.file;
 };
}
