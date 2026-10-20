import {expect,it} from 'vitest';
import {createHash} from 'node:crypto';
import {createConnectedNoteRuntime} from '../src/receiz/connected-note-runtime';
// Orchestration only. Actual signed sources and atomic native conservation
// are exercised separately against the Receiz connected Note implementation.
function fixture(){
 let state:unknown=null,preparations=0,submissions=0,lost=false;const requests:unknown[]=[],blobs=new Map<string,Uint8Array>();
 const bytes=(text:string)=>new TextEncoder().encode(text),source=bytes('isolated-verified-funding');
 const ports={uid:'account',keyId:'a'.repeat(64),assertOpen(){},
  read:async()=>structuredClone(state),write:async(next:unknown,previous:unknown)=>{expect(previous).toEqual(state);state=structuredClone(next);},
  retain:async(value:Uint8Array)=>{const ref=createHash('sha256').update(value).digest('hex');blobs.set(ref,value.slice());return ref;},restore:async(ref:string)=>blobs.get(ref)!.slice(),
  prepare:async(amountUsdCents:string,rail:'reserve'|'settlement'='reserve')=>{preparations++;return{noteId:'note',operationId:'b'.repeat(64),rail,amountUsdCents,authorization:{operationId:'b'.repeat(64),noteId:'note',amountUsdCents,rail},noteIdentityBytes:bytes('private-note-key-only-in-encrypted-custody')};},
  issue:async(authorization:unknown,operationId:string,recoverFirst:boolean)=>{submissions++;requests.push({authorization,operationId,recoverFirst});if(lost)throw Error('RESPONSE_LOST');return{noteId:'note',rail:'reserve' as const,amountUsdCents:'200',amountPhiMicro:'1000000',sourceBytes:source,privateOpeningBytes:bytes('private-opening')};},
  inspect:async()=>({noteId:'note',rail:'reserve' as const,amountUsdCents:'200',amountPhiMicro:'1000000'}),
  handover:async(_source:Uint8Array,request:Uint8Array,key:Uint8Array)=>{expect(new TextDecoder().decode(key)).toContain('private-note-key');return bytes('signed-handover:'+new TextDecoder().decode(request));},
  image:async(value:Uint8Array)=>value.slice(),cancel:async()=>bytes('verified-native-cancellation'),
 };
 return{ports,requests,get state(){return state;},get preparations(){return preparations;},get submissions(){return submissions;},lost(value:boolean){lost=value;}};
}
it('reuses the exact retained creation request after a lost response without generating another Note key',async()=>{
 const f=fixture(),runtime=createConnectedNoteRuntime(f.ports);f.lost(true);
 await expect(runtime.create('200','reserve')).rejects.toThrow('RESPONSE_LOST');
 expect(await runtime.pending()).toMatchObject({noteId:'note',amountUsdCents:'200'});f.lost(false);
 const reopened=createConnectedNoteRuntime(f.ports),note=await reopened.create('200','reserve');
 expect(note.amountUsdCents).toBe('200');expect(f.preparations).toBe(1);expect(f.submissions).toBe(2);
 expect(f.requests).toEqual([{authorization:{operationId:'b'.repeat(64),noteId:'note',amountUsdCents:'200',rail:'reserve'},operationId:'b'.repeat(64),recoverFirst:false},{authorization:{operationId:'b'.repeat(64),noteId:'note',amountUsdCents:'200',rail:'reserve'},operationId:'b'.repeat(64),recoverFirst:true}]);
 expect(JSON.stringify(f.requests)).not.toContain('private-note-key');expect(await reopened.pending()).toBeNull();
});
it('keeps an unknown issue bound to its reviewed amount and rail',async()=>{
 const f=fixture(),runtime=createConnectedNoteRuntime(f.ports);f.lost(true);await runtime.create('200','reserve').catch(()=>{});
 await expect(runtime.create('300','reserve')).rejects.toThrow('BANK_NOTE_EXACT_RESUME_REQUIRED');
 await expect(runtime.create('200','settlement')).rejects.toThrow('BANK_NOTE_EXACT_RESUME_REQUIRED');expect(f.submissions).toBe(1);
});
it('preserves a verified funding result across image packaging failure without another issue request',async()=>{
 const f=fixture();let refused=true;const ports={...f.ports,image:async(bytes:Uint8Array)=>{if(refused)throw Error('IMAGE_SAVE_FAILED');return bytes.slice();}};
 const runtime=createConnectedNoteRuntime(ports);await expect(runtime.create('200','reserve')).rejects.toThrow('IMAGE_SAVE_FAILED');
 refused=false;expect((await createConnectedNoteRuntime(ports).create('200','reserve')).noteId).toBe('note');expect(f.submissions).toBe(1);
});
it('retains an offline handover before packaging and refuses a second recipient on that same Note',async()=>{
 const f=fixture();let failed=false;const ports={...f.ports,image:async(bytes:Uint8Array)=>{if(failed)throw Error('IMAGE_SAVE_FAILED');return bytes.slice();}};
 const runtime=createConnectedNoteRuntime(ports);await runtime.create('200','reserve');failed=true;
 const request=new TextEncoder().encode('recipient-one');await expect(runtime.transfer('note',request)).rejects.toThrow('IMAGE_SAVE_FAILED');
 failed=false;const recovered=await createConnectedNoteRuntime(ports).transfer('note');expect(new TextDecoder().decode(recovered.image)).toContain('recipient-one');
 await expect(runtime.transfer('note',new TextEncoder().encode('recipient-two'))).rejects.toThrow('BANK_NOTE_EXACT_TRANSFER_REQUIRED');expect(f.submissions).toBe(1);
});
it('cannot discard an unknown issue without retaining its verified native cancellation',async()=>{
 const f=fixture(),runtime=createConnectedNoteRuntime(f.ports);f.lost(true);await runtime.create('200','reserve').catch(()=>{});
 await createConnectedNoteRuntime({...f.ports,cancel:async()=>{throw Error('CANCEL_UNKNOWN');}}).cancelUnfunded().catch(()=>{});
 expect(await runtime.pending()).not.toBeNull();await runtime.cancelUnfunded();expect(await runtime.pending()).toBeNull();
});
it('retains one exact signed cancellation across a lost reply instead of generating another P-256 signature',async()=>{
 const f=fixture();f.lost(true);let signs=0,attempts=0;const signed=new TextEncoder().encode('non-deterministic-signature-1'),submitted:unknown[]=[];
 const ports={...f.ports,prepareCancellation:async()=>{signs++;return signed;},cancel:async(_authorization:unknown,request?:Uint8Array)=>{submitted.push(request);if(++attempts===1)throw Error('CANCEL_REPLY_LOST');return new TextEncoder().encode('verified-cancellation');}};
 const first=createConnectedNoteRuntime(ports);await first.create('200').catch(()=>{});await first.cancelUnfunded().catch(()=>{});await createConnectedNoteRuntime(ports).cancelUnfunded();
 expect(signs).toBe(1);expect(submitted).toEqual([signed,signed]);expect(await first.pending()).toBeNull();
});
it('can recover already-published funding after a cancellation is refused without submitting another issue',async()=>{
 const f=fixture();f.lost(true);let cancelled=false;const recoverModes:unknown[]=[];
 const ports={...f.ports,prepareCancellation:async()=>new TextEncoder().encode('signed-cancel'),cancel:async()=>{cancelled=true;throw Error('ALREADY_PUBLISHED');},issue:async(a:unknown,id:string,recover:boolean,allowSubmit?:boolean)=>{recoverModes.push({recover,allowSubmit});return f.ports.issue(a,id,recover);}};
 const runtime=createConnectedNoteRuntime(ports);await runtime.create('200').catch(()=>{});await runtime.cancelUnfunded().catch(()=>{});expect(cancelled).toBe(true);f.lost(false);
 expect((await runtime.create('200')).noteId).toBe('note');expect(recoverModes.at(-1)).toEqual({recover:true,allowSubmit:false});
});
