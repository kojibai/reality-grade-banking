import {expect,it} from 'vitest';
import {emptyVaultJournal,prepareVaultOperation,acknowledgeVaultBackup,submitVaultOperation,settleVaultOperation,abandonPreparedVaultOperation,readVaultJournal} from '../src/receiz/vault/journal';

const vaultId='401f57d2-4b86-40d2-b6af-b7f8b855cf64',ownerKeyId='a'.repeat(64),request='b'.repeat(64),backup='c'.repeat(64),outcome='d'.repeat(64);
const operation={id:'original-native-request',kind:'money.add' as const,requestRef:request};
it('retains the exact original request before submission and refuses a second pending operation',async()=>{
 const initial=emptyVaultJournal(vaultId,ownerKeyId),prepared=await prepareVaultOperation(initial,operation);
 expect(prepared.entries).toEqual([{...operation,phase:'prepared',backupRef:null,outcomeRef:null}]);
 expect(await prepareVaultOperation(prepared,operation)).toBe(prepared);
 await expect(prepareVaultOperation(prepared,{...operation,requestRef:'e'.repeat(64)})).rejects.toThrow('VAULT_OPERATION_CONFLICT');
 await expect(prepareVaultOperation(prepared,{...operation,id:'another-native-request'})).rejects.toThrow('VAULT_OPERATION_PENDING');
});
it('requires a reopened exact prepared backup before an irreversible submission',async()=>{
 const prepared=await prepareVaultOperation(emptyVaultJournal(vaultId,ownerKeyId),operation);
 await expect(submitVaultOperation(prepared,operation.id)).rejects.toThrow('VAULT_PREPARED_BACKUP_REQUIRED');
 const saved=await acknowledgeVaultBackup(prepared,operation.id,request,backup),submitted=await submitVaultOperation(saved,operation.id);
 expect(submitted.entries[0]).toEqual({...operation,phase:'submitted',backupRef:backup,outcomeRef:null});
 expect(await submitVaultOperation(submitted,operation.id)).toBe(submitted);
 await expect(acknowledgeVaultBackup(prepared,operation.id,'e'.repeat(64),backup)).rejects.toThrow('VAULT_OPERATION_CONFLICT');
});
it('adopts the same native outcome once and never reopens a settled source from an older operation',async()=>{
 const prepared=await prepareVaultOperation(emptyVaultJournal(vaultId,ownerKeyId),operation),saved=await acknowledgeVaultBackup(prepared,operation.id,request,backup),submitted=await submitVaultOperation(saved,operation.id);
 const settled=await settleVaultOperation(submitted,operation.id,{status:'committed',sourceRef:outcome});
 expect(settled.entries[0]).toMatchObject({phase:'committed',outcomeRef:outcome});
 expect(await settleVaultOperation(settled,operation.id,{status:'committed',sourceRef:outcome})).toBe(settled);
 expect(await prepareVaultOperation(settled,operation)).toBe(settled);
 await expect(settleVaultOperation(settled,operation.id,{status:'committed',sourceRef:'e'.repeat(64)})).rejects.toThrow('VAULT_OPERATION_CONFLICT');
 const next=await prepareVaultOperation(settled,{...operation,id:'next-original-request'});
 expect(next.entries).toHaveLength(2);expect(next.predecessor).not.toBeNull();
});
it('does not call a missing or unsigned outcome zero-write and rejects unknown recovery state',async()=>{
 const prepared=await prepareVaultOperation(emptyVaultJournal(vaultId,ownerKeyId),operation);
 await expect(settleVaultOperation(prepared,operation.id,{status:'zero-write',sourceRef:outcome})).rejects.toThrow('VAULT_OPERATION_NOT_SUBMITTED');
 expect(()=>readVaultJournal({...prepared,entries:[{...prepared.entries[0],phase:'cancelled'}]})).toThrow();
 expect(()=>readVaultJournal({...prepared,entries:[...prepared.entries,...prepared.entries]})).toThrow();
 expect(()=>readVaultJournal({...prepared,token:'not-a-private-checkpoint-field'})).toThrow();
});
it('can leave setup before submission but never abandons an operation already submitted',async()=>{
 const prepared=await prepareVaultOperation(emptyVaultJournal(vaultId,ownerKeyId),operation),abandoned=await abandonPreparedVaultOperation(prepared,operation.id);
 expect(abandoned.entries[0]).toMatchObject({phase:'abandoned',outcomeRef:null});
 expect((await prepareVaultOperation(abandoned,{...operation,id:'next-original-request'})).entries).toHaveLength(2);
 await expect(submitVaultOperation(abandoned,operation.id)).rejects.toThrow('VAULT_OPERATION_ABANDONED');
 const submitted=await submitVaultOperation(await acknowledgeVaultBackup(prepared,operation.id,request,backup),operation.id);
 await expect(abandonPreparedVaultOperation(submitted,operation.id)).rejects.toThrow('VAULT_OPERATION_PENDING');
});
