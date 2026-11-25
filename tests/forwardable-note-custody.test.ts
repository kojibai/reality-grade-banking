import {createHash} from 'node:crypto';
import {expect,it} from 'vitest';
import {createLocalNoteDepositQueue} from '../src/receiz/note-received-deposits';

const bytes=(text:string)=>new TextEncoder().encode(text);
const digest=(value:Uint8Array)=>createHash('sha256').update(value).digest('hex');
const incoming=bytes('admitted A to B'), outbound=bytes('admitted B to C'), request=bytes('signed C destination');
const held={rail:'reserve' as const,noteId:'same-note',amountUsdCents:'200',amountPhiMicro:'1000000',receiverUserId:'B',receiverKeyId:'b-key',
 forwardable:true as const,redemptionDigest:digest(bytes('receipt')),terminalArtifactSha256:digest(incoming),terminalSourceBytes:incoming};
function device(){
 let state:unknown=null,submitted=0,created=0,refuse=false;
 const blobs=new Map<string,Uint8Array>();
 const input={uid:'B',keyId:'b-key',assertOpen(){},read:async()=>structuredClone(state),
  write:async(next:unknown,previous:unknown)=>{expect(previous).toEqual(state);if(refuse)throw Error('WRITE_REFUSED');state=structuredClone(next);},
  retain:async(value:Uint8Array)=>{const key=digest(value);blobs.set(key,value.slice());return key;},
  restore:async(ref:string)=>blobs.get(ref)!.slice(),
  verify:async(value:Uint8Array)=>{expect(value).toEqual(incoming);return structuredClone(held);},
  forward:async(source:Uint8Array,target:Uint8Array)=>{expect(source).toEqual(incoming);expect(target).toEqual(request);created++;return outbound.slice();},
  verifyForward:async(source:Uint8Array,successor:Uint8Array)=>{expect(source).toEqual(incoming);expect(successor).toEqual(outbound);},
  submit:async()=>{submitted++;throw Error('SUBMISSION_LOST');},
 };
 return {open:()=>createLocalNoteDepositQueue(input),get submitted(){return submitted;},get created(){return created;},refuse(){refuse=true;}};
}
it('retires the held source before exposure, reopens its exact outgoing Note, and never submits the spent head',async()=>{
 const fixture=device();await fixture.open().receive(incoming);
 const outgoing=await fixture.open().forward(held.noteId,request);
 expect(outgoing).toMatchObject({status:'forwarded',proofBytes:outbound});
 const restored=fixture.open();
 expect(await restored.forward(held.noteId,request)).toEqual(outgoing);
 expect(await restored.list({pendingOnly:true})).toEqual([]);
 await expect(restored.forward(held.noteId,bytes('another recipient'))).rejects.toThrow('BANK_NOTE_EXACT_TRANSFER_REQUIRED');
 await restored.reconcile();expect(fixture.submitted).toBe(0);expect(fixture.created).toBe(1);
});
it('keeps the source available after a failed retirement and refuses forwarding after ambiguous credit submission',async()=>{
 const a=device();await a.open().receive(incoming);a.refuse();
 await expect(a.open().forward(held.noteId,request)).rejects.toThrow('WRITE_REFUSED');
 expect((await a.open().list({pendingOnly:true}))[0].status).toBe('received');
 const b=device();await b.open().receive(incoming);await b.open().reconcile();
 await expect(b.open().forward(held.noteId,request)).rejects.toThrow('BANK_NOTE_FORWARD_UNAVAILABLE');
 expect(b.submitted).toBe(1);expect(b.created).toBe(0);
});
