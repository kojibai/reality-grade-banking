import {vaultCanonical,vaultDigest,vaultObject} from './encoding';

export type VaultOperationKind='money.add'|'money.send'|'money.return'|'asset.add'|'asset.send'|'asset.return'|'card.fund';
type Intent={id:string;kind:VaultOperationKind;requestRef:string};
type Entry=Intent&{phase:'prepared'|'submitted'|'committed'|'zero-write'|'abandoned';backupRef:string|null;outcomeRef:string|null};
export type VaultJournal={schema:'bank.vault.journal.v1';vaultId:string;ownerKeyId:string;revision:number;predecessor:string|null;entries:Entry[]};
const hash=(value:unknown):value is string=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const kinds=['money.add','money.send','money.return','asset.add','asset.send','asset.return','card.fund'];
function intent(input:unknown):Intent{
 const v=vaultObject(input,['id','kind','requestRef']);
 if(typeof v.id!=='string'||!/^[A-Za-z0-9._:-]{8,160}$/.test(v.id)||typeof v.kind!=='string'||!kinds.includes(v.kind)||!hash(v.requestRef))throw Error('VAULT_OPERATION_INVALID');
 return v as Intent;
}
/** Encrypted workflow retention only: labels and hashes are not financial
 * admission, unspent-state proof, or zero-write certificates. Native outcome
 * sources must be admitted separately before settle is called. CAS retention
 * and native once-only acceptance protect against stale files and devices. */
export function readVaultJournal(input:unknown):VaultJournal{
 const v=vaultObject(input,['schema','vaultId','ownerKeyId','revision','predecessor','entries']);
 if(v.schema!=='bank.vault.journal.v1'||typeof v.vaultId!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(v.vaultId)||!hash(v.ownerKeyId)||!Number.isSafeInteger(v.revision)||Number(v.revision)<0||!Array.isArray(v.entries)||v.entries.length>4096||Number(v.revision)<v.entries.length||(v.revision===0?v.predecessor!==null:!hash(v.predecessor)))throw Error('VAULT_JOURNAL_INVALID');
 const rawEntries=v.entries,ids=new Set<string>(),entries=rawEntries.map((raw,index)=>{
  const e=vaultObject(raw,['id','kind','requestRef','phase','backupRef','outcomeRef']),i=intent({id:e.id,kind:e.kind,requestRef:e.requestRef});
  if(ids.has(i.id)||typeof e.phase!=='string'||!['prepared','submitted','committed','zero-write','abandoned'].includes(e.phase)||e.backupRef!==null&&!hash(e.backupRef)||e.outcomeRef!==null&&!hash(e.outcomeRef)||(e.phase==='prepared'||e.phase==='submitted')&&(index!==rawEntries.length-1||e.outcomeRef!==null)||e.phase==='abandoned'&&e.outcomeRef!==null||['submitted','committed','zero-write'].includes(e.phase)&&!hash(e.backupRef)||['committed','zero-write'].includes(e.phase)&&!hash(e.outcomeRef))throw Error('VAULT_JOURNAL_INVALID');
  ids.add(i.id);return{...i,phase:e.phase,backupRef:e.backupRef,outcomeRef:e.outcomeRef} as Entry;
 });
 return{schema:'bank.vault.journal.v1',vaultId:v.vaultId,ownerKeyId:v.ownerKeyId,revision:Number(v.revision),predecessor:v.predecessor as string|null,entries};
}
export function emptyVaultJournal(vaultId:string,ownerKeyId:string):VaultJournal{return readVaultJournal({schema:'bank.vault.journal.v1',vaultId,ownerKeyId,revision:0,predecessor:null,entries:[]});}
async function advance(before:VaultJournal,entries:Entry[]):Promise<VaultJournal>{return readVaultJournal({...before,revision:before.revision+1,predecessor:await vaultDigest(new TextEncoder().encode(vaultCanonical(before))),entries});}
function selected(journal:VaultJournal,id:string){const row=journal.entries.find(value=>value.id===id);if(!row)throw Error('VAULT_OPERATION_REQUIRED');return row;}
export async function prepareVaultOperation(input:VaultJournal,request:Intent):Promise<VaultJournal>{
 const journal=readVaultJournal(input),i=intent(request),previous=journal.entries.find(value=>value.id===i.id);
 if(previous){if(previous.requestRef!==i.requestRef||previous.kind!==i.kind)throw Error('VAULT_OPERATION_CONFLICT');return input;}
 if(journal.entries.some(value=>value.phase==='prepared'||value.phase==='submitted'))throw Error('VAULT_OPERATION_PENDING');
 return advance(journal,[...journal.entries,{...i,phase:'prepared',backupRef:null,outcomeRef:null}]);
}
export async function acknowledgeVaultBackup(input:VaultJournal,id:string,requestRef:string,backupRef:string):Promise<VaultJournal>{
 const journal=readVaultJournal(input),row=selected(journal,id);
 if(row.phase!=='prepared'||row.requestRef!==requestRef||!hash(backupRef))throw Error('VAULT_OPERATION_CONFLICT');
 if(row.backupRef===backupRef)return input;
 return advance(journal,journal.entries.map(value=>value.id===id?{...value,backupRef}:value));
}
export async function submitVaultOperation(input:VaultJournal,id:string):Promise<VaultJournal>{
 const journal=readVaultJournal(input),row=selected(journal,id);
 if(row.phase==='abandoned')throw Error('VAULT_OPERATION_ABANDONED');
 if(row.phase!=='prepared')return input;
 if(!row.backupRef)throw Error('VAULT_PREPARED_BACKUP_REQUIRED');
 return advance(journal,journal.entries.map(value=>value.id===id?{...value,phase:'submitted'}:value));
}
export async function settleVaultOperation(input:VaultJournal,id:string,outcome:{status:'committed'|'zero-write';sourceRef:string}):Promise<VaultJournal>{
 const journal=readVaultJournal(input),row=selected(journal,id);
 if(!['committed','zero-write'].includes(outcome.status)||!hash(outcome.sourceRef))throw Error('VAULT_OUTCOME_REQUIRED');
 if(row.phase==='prepared'||row.phase==='abandoned')throw Error('VAULT_OPERATION_NOT_SUBMITTED');
 if(row.phase!=='submitted'){if(row.phase!==outcome.status||row.outcomeRef!==outcome.sourceRef)throw Error('VAULT_OPERATION_CONFLICT');return input;}
 return advance(journal,journal.entries.map(value=>value.id===id?{...value,phase:outcome.status,outcomeRef:outcome.sourceRef}:value));
}
/** An abandoned intent is a local never-submitted request, not a financial
 * refusal or revocation. Any native source still governs its own authority. */
export async function abandonPreparedVaultOperation(input:VaultJournal,id:string):Promise<VaultJournal>{
 const journal=readVaultJournal(input),row=selected(journal,id);
 if(row.phase==='abandoned')return input;
 if(row.phase!=='prepared')throw Error('VAULT_OPERATION_PENDING');
 return advance(journal,journal.entries.map(value=>value.id===id?{...value,phase:'abandoned'}:value));
}
