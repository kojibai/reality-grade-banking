import {afterEach,expect,it,vi} from 'vitest';
import {loadRecordProofExport,saveRecordProofExport,loadOfflineNoteBlob,saveOfflineNoteBlob} from '../src/receiz/identity-vault';
import type {RecordProofExportCheckpoint} from '../src/receiz/record-proof-export';

// Replace only IndexedDB transport. The vault uses its real owner binding,
// AES-GCM, immutable blob hashing and optimistic checkpoint comparison.
async function vault(){
 const source=new TextEncoder().encode('synthetic-record-export-owner'),wrappingKey=await crypto.subtle.generateKey({name:'AES-GCM',length:256},false,['encrypt','decrypt']);
 const hash=async(bytes:Uint8Array)=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new Uint8Array(bytes)))].map(n=>n.toString(16).padStart(2,'0')).join('');
 const artifactIv=crypto.getRandomValues(new Uint8Array(12)),saved={wrappingKey,artifactIv,bytes:await crypto.subtle.encrypt({name:'AES-GCM',iv:artifactIv,additionalData:new TextEncoder().encode('receiz.bank.private-identity-source.v1')},wrappingKey,source)};
 const rows=new Map<string,unknown>([['identity:current',saved]]);
 const db={close(){},transaction(_stores:string|string[],_mode?:string){
  let pending=0,aborted=false;const tx:{oncomplete?:()=>void;onabort?:()=>void;abort():void;objectStore(name:string):unknown}={abort(){aborted=true;queueMicrotask(()=>tx.onabort?.());},objectStore:name=>({
   get(key:string){pending++;const request:{result:unknown;onsuccess?:()=>void}={result:rows.get(`${name}:${key}`)};queueMicrotask(()=>{if(!aborted)request.onsuccess?.();pending--;queueMicrotask(()=>{if(!pending&&!aborted)tx.oncomplete?.();});});return request;},
   put(value:unknown,key:string){rows.set(`${name}:${key}`,value);},
  })};return tx;
 }};
 vi.stubGlobal('indexedDB',{open(){const request:{result:unknown;onsuccess?:()=>void}={result:db};queueMicrotask(()=>request.onsuccess?.());return request;}});
 return{binding:{artifactSha256:await hash(source)},rows};
}
afterEach(()=>vi.unstubAllGlobals());
it('retains exact record bytes and checkpoint through existing encrypted owner custody and CAS',async()=>{
 const f=await vault(),key='a'.repeat(64),bytes=new TextEncoder().encode('exact synthetic sealed artifact bytes'),digest=await saveOfflineNoteBlob(f.binding,bytes);
 const state:RecordProofExportCheckpoint={schema:'bankeiz.local-record-export.v1',recordHash:'b'.repeat(64),payloadSha256:'c'.repeat(64),filename:'calendar.json',mimeType:'application/json',artifact:{digest,filename:'calendar.receized.json',mimeType:'application/json',size:bytes.length}};
 expect(await loadRecordProofExport(f.binding,key)).toBeNull();await saveRecordProofExport(f.binding,key,state,null);
 expect(await loadRecordProofExport(f.binding,key)).toEqual(state);expect(await loadOfflineNoteBlob(f.binding,digest)).toEqual(bytes);
 const operationRows=[...f.rows.entries()].filter(([address])=>address.startsWith('operations:'));expect(operationRows).toHaveLength(2);
 for(const [,value]of operationRows){const row=value as {bytes:ArrayBuffer};expect(new TextDecoder().decode(row.bytes)).not.toContain('calendar');expect(new TextDecoder().decode(row.bytes)).not.toContain('exact synthetic');}
 const checkpoint=operationRows.find(([address])=>address.includes('record-proof-export:'))![1];await expect(saveRecordProofExport(f.binding,key,{...state,filename:'changed.json'},null)).rejects.toThrow('BANK_NOTE_INTENT_CHANGED');expect([...f.rows.values()]).toContain(checkpoint);
 await expect(loadRecordProofExport({artifactSha256:'f'.repeat(64)},key)).rejects.toThrow('BANK_EXECUTION_IDENTITY_CHANGED');await expect(loadOfflineNoteBlob({artifactSha256:'f'.repeat(64)},digest)).rejects.toThrow('BANK_EXECUTION_IDENTITY_CHANGED');
});
it('fails closed on altered encrypted record metadata and rejects invalid private reference keys',async()=>{
 const f=await vault(),key='a'.repeat(64),state={schema:'bankeiz.local-record-export.v1'} as RecordProofExportCheckpoint;await saveRecordProofExport(f.binding,key,state,null);
 const row=[...f.rows.entries()].find(([address])=>address.includes('record-proof-export:'))![1] as {bytes:ArrayBuffer};new Uint8Array(row.bytes)[0]^=1;const changed=row.bytes.slice(0);
 await expect(loadRecordProofExport(f.binding,key)).rejects.toMatchObject({name:'OperationError'});expect(row.bytes).toEqual(changed);expect(()=>loadRecordProofExport(f.binding,'other/key')).toThrow('RECORD_PROOF_REFERENCE_INVALID');
});
