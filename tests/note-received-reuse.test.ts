import {expect,it,vi} from 'vitest';
import {createLocalNoteDepositQueue} from '../src/receiz/note-received-deposits';
import {vaultDigest} from '../src/receiz/vault/encoding';

function fixture(corrupt=false){
 let state:unknown=null;const blobs=new Map<string,Uint8Array>(),source=new TextEncoder().encode('native-admitted-terminal');
 const verify=vi.fn(async()=>({rail:'reserve' as const,noteId:'note-one',amountPhiMicro:'1000',amountUsdCents:'200',receiverUserId:'receiver',receiverKeyId:'key',redemptionDigest:'a'.repeat(64),terminalArtifactSha256:'b'.repeat(64),terminalSourceBytes:source.slice()}));
 const input={uid:'receiver',keyId:'key',assertOpen(){},read:async()=>structuredClone(state),write:async(next:unknown,previous:unknown)=>{expect(previous).toEqual(state);state=structuredClone(next);},retain:async(bytes:Uint8Array)=>{const ref=await vaultDigest(bytes);blobs.set(ref,corrupt?new Uint8Array([7]):bytes.slice());return ref;},restore:async(ref:string)=>blobs.get(ref)!.slice(),verify,submit:async()=>{throw Error('NO_NATIVE_SUBMISSION_DURING_RECEIVE');}};
 return{input,verify,source};
}
it('reuses the exact live terminal admission after verifying its durable retained bytes',async()=>{
 const f=fixture(),queue=createLocalNoteDepositQueue(f.input);
 const result=await queue.receive(f.source);expect(result.status).toBe('received');expect(f.verify).toHaveBeenCalledTimes(1);
 await queue.list();await queue.list();expect(f.verify).toHaveBeenCalledTimes(1);
 const reopened=createLocalNoteDepositQueue(f.input);await reopened.list();expect(f.verify).toHaveBeenCalledTimes(2);
});
it('never uses an admission to conceal corrupted retained source bytes',async()=>{
 const f=fixture(true),queue=createLocalNoteDepositQueue(f.input);
 await expect(queue.receive(f.source)).rejects.toThrow('BANK_NOTE_SOURCE_REQUIRED');
});
