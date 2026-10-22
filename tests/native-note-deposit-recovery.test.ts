import {createHash} from 'node:crypto';
import {expect,it,vi} from 'vitest';
import {createConnectedNoteRuntime} from '../src/receiz/connected-note-runtime';
import {createLocalNoteDepositQueue} from '../src/receiz/note-received-deposits';
import {recoverConnectedNoteDeposit} from '../src/receiz/native-note-deposit';

const bytes=(value:string)=>new TextEncoder().encode(value);
function fixture(){
 let connectedState:unknown=null,receivedState:unknown=null,failReceive=false;
 const blobs=new Map<string,Uint8Array>(),funding=bytes('verified-funding'),request=bytes('original-self-receiving-request'),handover=bytes('verified-handover:original-self-receiving-request');
 const retain=async(value:Uint8Array)=>{const ref=createHash('sha256').update(value).digest('hex');blobs.set(ref,value.slice());return ref;},restore=async(ref:string)=>blobs.get(ref)!.slice();
 // Financial admission/signing/credit are external ports; both durable state
 // machines and recovery composition below use their real implementations.
 const makeHandover=vi.fn(async(_source:Uint8Array,heldRequest:Uint8Array)=>{expect(heldRequest).toEqual(request);return handover;});
 const connected=()=>createConnectedNoteRuntime({uid:'account',keyId:'key',assertOpen(){},read:async()=>structuredClone(connectedState),write:async(next,previous)=>{expect(previous).toEqual(connectedState);connectedState=structuredClone(next);},retain,restore,
  prepare:async()=>({noteId:'note',operationId:'b'.repeat(64),rail:'reserve',amountUsdCents:'200',authorization:{noteId:'note',rail:'reserve',amountUsdCents:'200'},noteIdentityBytes:bytes('private-connected-note-identity')}),
  issue:async()=>({noteId:'note',rail:'reserve',amountUsdCents:'200',amountPhiMicro:'1000000',sourceBytes:funding,privateOpeningBytes:bytes('private-opening')}),
  inspect:async()=>({noteId:'note',rail:'reserve',amountUsdCents:'200',amountPhiMicro:'1000000'}),handover:makeHandover,image:async source=>source.slice(),cancel:async()=>bytes('cancel'),
 });
 const queue=()=>createLocalNoteDepositQueue({uid:'account',keyId:'key',assertOpen(){},read:async()=>structuredClone(receivedState),write:async(next,previous)=>{if(failReceive)throw Error('RECEIVING_QUEUE_WRITE_INTERRUPTED');expect(previous).toEqual(receivedState);receivedState=structuredClone(next);},retain,restore,
  verify:async source=>{expect(source).toEqual(handover);return{noteId:'note',rail:'reserve',amountUsdCents:'200',amountPhiMicro:'1000000',receiverUserId:'account',receiverKeyId:'key',redemptionDigest:'c'.repeat(64),terminalArtifactSha256:createHash('sha256').update(handover).digest('hex'),terminalSourceBytes:source};},
  submit:async source=>{expect(source).toEqual(handover);return{noteId:'note',rail:'reserve',amountUsdCents:'200',amountPhiMicro:'1000000',proofBytes:bytes('verified-credit'),reserveAfterUsdCents:'200'};},
 });
 return{connected,queue,request,makeHandover,failReceive(value:boolean){failReceive=value;}};
}
it('recovers the retained self-handover after a crash before the receiving queue write without creating another request or handover',async()=>{
 const f=fixture(),connected=f.connected();await connected.create('200');
 const transferred=await connected.transfer('note',f.request);f.failReceive(true);
 await expect(f.queue().receive(transferred.image)).rejects.toThrow('RECEIVING_QUEUE_WRITE_INTERRUPTED');f.failReceive(false);f.makeHandover.mockClear();
 const queue=f.queue();
 const recovered=await recoverConnectedNoteDeposit({noteId:'note',funding:true,connected:f.connected(),received:queue,reconcile:()=>queue.reconcile()});
 expect(recovered).toMatchObject({status:'confirmed',noteId:'note',amountUsdCents:'200',proofBytes:bytes('verified-credit')});
 expect((await queue.list())).toHaveLength(1);expect(f.makeHandover).not.toHaveBeenCalled();
});
it('does not allocate a transfer or receiving queue entry when the funding Note has no retained transfer',async()=>{
 const f=fixture(),connected=f.connected(),queue=f.queue();await connected.create('200');
 expect(await recoverConnectedNoteDeposit({noteId:'note',funding:true,connected,received:queue,reconcile:()=>queue.reconcile()})).toBeNull();
 expect(await queue.list()).toEqual([]);expect(f.makeHandover).not.toHaveBeenCalled();
 await expect(connected.transfer('note')).rejects.toThrow('BANK_NOTE_RECEIVING_REQUEST_REQUIRED');
});
