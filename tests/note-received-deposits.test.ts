import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {expect,it} from 'vitest';
import * as inventory from '../src/receiz/note-local-inventory';
// @ts-expect-error Generated composition, not a substitute verifier.
import * as native from '../public/native/offline-notes.v129.mjs';
const base=new URL('./fixtures/note-account-deposit/',import.meta.url),metadata=JSON.parse(readFileSync(new URL('metadata.json',base),'utf8'));
const terminal=new Uint8Array(gunzipSync(readFileSync(new URL('terminal.receiz.json.gz.bin',base))));
const credit=JSON.parse(gunzipSync(readFileSync(new URL('credit.json.gz.bin',base))).toString('utf8'));
const context={receiverUserId:metadata.receiverUserId,receiverKeyId:metadata.receiverKeyId,roots:new Map(metadata.roots.map((r:{kid:string})=>[r.kid,r]))};
function ports(){
 let state:unknown=null,submitted=0,fail=false;const attempts:boolean[]=[];const blobs=new Map<string,Uint8Array>();
 const input={keyId:metadata.receiverKeyId,uid:metadata.receiverUserId,assertOpen(){},read:async()=>structuredClone(state),write:async(next:unknown,previous:unknown)=>{expect(previous).toEqual(state);state=structuredClone(next);},
  retain:async(bytes:Uint8Array)=>{const key=createHash('sha256').update(bytes).digest('hex');blobs.set(key,bytes.slice());return key;},restore:async(key:string)=>blobs.get(key)!.slice(),
  verify:(bytes:Uint8Array)=>native.openBankNoteAccountDeposit(bytes,context),
  submit:async(bytes:Uint8Array,options:{recoverFirst:boolean})=>{expect(state).toMatchObject({entries:{[metadata.noteId]:{submissionEntered:true}}});submitted++;attempts.push(options.recoverFirst);if(fail)throw Error('network response lost');return native.verifyBankNoteAccountDepositCredit(credit,bytes,context);},
 };
 return {input,attempts,get submitted(){return submitted;},fail(value:boolean){fail=value;}};
}

it('retains one recipient-bound source immediately offline and survives a reopen without claiming host credit',async()=>{
 expect(typeof inventory.createLocalNoteDepositQueue).toBe('function');
 const p=ports(),queue=inventory.createLocalNoteDepositQueue(p.input);
 const first=await queue.receive(terminal),second=await queue.receive(terminal);
 expect(second).toEqual(first);expect(p.submitted).toBe(0);expect(first.status).toBe('received');
 expect('reserveAfterUsdCents' in first).toBe(false);expect(first.amountUsdCents).toBe('200');
 const reopened=inventory.createLocalNoteDepositQueue(p.input);
 expect((await reopened.list()).map((item:any)=>item.noteId)).toEqual([metadata.noteId]);
 expect(p.submitted).toBe(0);
},30000);

it('keeps the original pending after a lost response and confirms only after the native full credit proof reopens',async()=>{
 expect(typeof inventory.createLocalNoteDepositQueue).toBe('function');
 const p=ports(),queue=inventory.createLocalNoteDepositQueue(p.input);await queue.receive(terminal);
 p.fail(true);await expect(queue.reconcile()).rejects.toThrow('network response lost');expect((await queue.list())[0].status).toBe('received');
 p.fail(false);await queue.reconcile();expect((await queue.list())[0].status).toBe('confirmed');
 expect(p.attempts).toEqual([false,true]);
 const count=p.submitted;await queue.reconcile();expect(p.submitted).toBe(count);
 const repeated=await queue.receive(terminal);expect(repeated.status).toBe('confirmed');expect((await queue.list())).toHaveLength(1);
},30000);

it('never marks a different returned value as this Note’s confirmed deposit',async()=>{
 expect(typeof inventory.createLocalNoteDepositQueue).toBe('function');
 const p=ports(),queue=inventory.createLocalNoteDepositQueue({...p.input,submit:async()=>({noteId:metadata.noteId,rail:'reserve',amountUsdCents:'999',amountPhiMicro:'1000000',proofBytes:new Uint8Array([1]),reserveAfterUsdCents:'999'})});
 await queue.receive(terminal);await expect(queue.reconcile()).rejects.toThrow('BANK_NOTE_DEPOSIT_BINDING_MISMATCH');
 expect((await queue.list())[0].status).toBe('received');
},30000);

it('does not reopen confirmed proof graphs merely to check for pending received value',async()=>{
 const p=ports(),queue=inventory.createLocalNoteDepositQueue(p.input);await queue.receive(terminal);await queue.reconcile();
 let verificationCalls=0;
 const reopened=inventory.createLocalNoteDepositQueue({...p.input,verify:async(bytes:Uint8Array)=>{verificationCalls++;return p.input.verify(bytes);}});
 expect(await reopened.list({pendingOnly:true})).toEqual([]);expect(verificationCalls).toBe(0);
},30000);

it('recovers a legacy entry before submission instead of assuming an omitted marker means new',async()=>{
 const p=ports(),queue=inventory.createLocalNoteDepositQueue(p.input);await queue.receive(terminal);
 const before=await p.input.read() as {entries:Record<string,{submissionEntered?:boolean}>},legacy=structuredClone(before);
 delete legacy.entries[metadata.noteId].submissionEntered;await p.input.write(legacy,before);
 const reopened=inventory.createLocalNoteDepositQueue({...p.input,submit:async(bytes,options)=>{expect(options.recoverFirst).toBe(true);return native.verifyBankNoteAccountDepositCredit(credit,bytes,context);}});
 await reopened.reconcile();expect((await reopened.list())[0].status).toBe('confirmed');
},30000);

it('never enters native submission when its durable submission marker could not be saved',async()=>{
 const p=ports(),queue=inventory.createLocalNoteDepositQueue(p.input);await queue.receive(terminal);
 const refused=inventory.createLocalNoteDepositQueue({...p.input,write:async()=>{throw Error('CHECKPOINT_WRITE_REFUSED');}});
 await expect(refused.reconcile()).rejects.toThrow('CHECKPOINT_WRITE_REFUSED');expect(p.submitted).toBe(0);
 expect((await queue.list())[0].status).toBe('received');
},30000);

it('retains the exact signed claim before submission and reuses it after a lost response',async()=>{
 const p=ports();let preparations=0,attempts=0;
 const exact=new TextEncoder().encode('isolated-signed-claim-original');
 const input={...p.input,prepare:async()=>{preparations++;return exact.slice();},submit:async(bytes:Uint8Array,options:{recoverFirst:boolean;preparedRequestBytes?:Uint8Array})=>{
   expect(options.preparedRequestBytes).toEqual(exact);attempts++;
   if(attempts===1)throw Error('LOST_CLAIM_RESPONSE');return native.verifyBankNoteAccountDepositCredit(credit,bytes,context);
 }};
 const queue=inventory.createLocalNoteDepositQueue(input);await queue.receive(terminal);
 await expect(queue.reconcile()).rejects.toThrow('LOST_CLAIM_RESPONSE');
 await inventory.createLocalNoteDepositQueue(input).reconcile();expect(preparations).toBe(1);expect(attempts).toBe(2);
},30000);
