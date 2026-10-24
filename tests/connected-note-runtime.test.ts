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
it('admits each immutable funding source once across creation and repeated inventory views',async()=>{
 const f=fixture();let inspections=0;
 const runtime=createConnectedNoteRuntime({...f.ports,inspect:async()=>{inspections++;return f.ports.inspect();}});
 await runtime.create('200','reserve');await runtime.savedNotes();await runtime.savedNotes();
 expect(inspections).toBe(1);expect(f.submissions).toBe(1);
 const cold=createConnectedNoteRuntime({...f.ports,inspect:async()=>{inspections++;return f.ports.inspect();}});
 await cold.savedNotes();expect(inspections).toBe(2);
});
it('retains independent preparation originals together and waits for both before funding',async()=>{
 const f=fixture();let count=0,started!:()=>void,release!:()=>void;
 const both=new Promise<void>(resolve=>{started=resolve;}),gate=new Promise<void>(resolve=>{release=resolve;});
 const runtime=createConnectedNoteRuntime({...f.ports,retain:async(value)=>{if(++count<=2){if(count===2)started();await gate;}return f.ports.retain(value);}});
 const creating=runtime.create('200','reserve');
 const together=await Promise.race([both.then(()=>true),new Promise<false>(resolve=>setTimeout(()=>resolve(false),100))]);
 expect(f.submissions).toBe(0);release();await creating;expect(together).toBe(true);expect(f.submissions).toBe(1);
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
it('requires the exact retained funding source and private custody before admitting an owned funding Note',async()=>{
 const f=fixture(),runtime=createConnectedNoteRuntime(f.ports);
 const source=new TextEncoder().encode('isolated-verified-funding');
 expect(await runtime.holdsFundingSource('note',source)).toBe(false);
 await runtime.create('200');
 expect(await runtime.holdsFundingSource('note',source)).toBe(true);
 expect(await runtime.holdsFundingSource('note',new TextEncoder().encode('foreign-funding-with-same-note-id'))).toBe(false);
 expect(await runtime.holdsFundingSource('foreign',source)).toBe(false);
});
it('does not approve a stale funding image again once its receiving transfer has been retained',async()=>{
 const f=fixture(),runtime=createConnectedNoteRuntime(f.ports);await runtime.create('200');
 await runtime.transfer('note',new TextEncoder().encode('receiver'));
 expect(await runtime.holdsFundingSource('note',new TextEncoder().encode('isolated-verified-funding'))).toBe(false);
});
it('refuses unavailable private Note custody even when the funding image remains retained',async()=>{
 const f=fixture(),runtime=createConnectedNoteRuntime(f.ports);await runtime.create('200');
 const identityRef=createHash('sha256').update(new TextEncoder().encode('private-note-key-only-in-encrypted-custody')).digest('hex');
 const closed=createConnectedNoteRuntime({...f.ports,restore:async ref=>{if(ref===identityRef)throw Error('PRIVATE_CUSTODY_UNAVAILABLE');return f.ports.restore(ref);}});
 await expect(closed.holdsFundingSource('note',new TextEncoder().encode('isolated-verified-funding'))).rejects.toThrow('PRIVATE_CUSTODY_UNAVAILABLE');
});
it('self-deposit retains the native receiver-bound source without packaging another image and preserves saved inventory',async()=>{
 const f=fixture();let images=0;const ports={...f.ports,image:async(b:Uint8Array)=>{images++;return b.slice();},verifySelfDeposit:async(source:Uint8Array)=>({noteId:'note',rail:'reserve' as const,amountUsdCents:'200',amountPhiMicro:'1000000',receiverUserId:'account',receiverKeyId:'a'.repeat(64),redemptionDigest:'c'.repeat(64),terminalArtifactSha256:createHash('sha256').update(source).digest('hex'),terminalSourceBytes:source})},runtime=createConnectedNoteRuntime(ports),created=await runtime.create('200');
 const result=await runtime.prepareSelfDeposit('note',new TextEncoder().encode('self-receiving'));
 expect(new TextDecoder().decode(result.sourceBytes)).toContain('signed-handover:self-receiving');expect(images).toBe(1);expect((await runtime.savedNotes())[0]).toMatchObject({image:created.image,transferred:false,transferPending:false,selfDeposit:'pending'});
 const {hasHeldConnectedNotes}=await import('../src/receiz/connected-note-runtime');expect(await hasHeldConnectedNotes(f.state)).toBe(true);
 expect((await createConnectedNoteRuntime(ports).recoverSelfDeposit('note'))?.sourceBytes).toEqual(result.sourceBytes);expect(images).toBe(1);
 await expect(runtime.prepareSelfDeposit('note',new TextEncoder().encode('other-receiving'))).rejects.toThrow('EXACT_TRANSFER');await expect(runtime.transfer('note')).rejects.toThrow('EXACT_TRANSFER');
});
it('self-deposit refuses a signed terminal for another account/key and cannot relabel an outward share',async()=>{
 for(const change of [{receiverUserId:'foreign'},{receiverKeyId:'f'.repeat(64)}]){const f=fixture(),runtime=createConnectedNoteRuntime({...f.ports,verifySelfDeposit:async(source:Uint8Array)=>({noteId:'note',rail:'reserve' as const,amountUsdCents:'200',amountPhiMicro:'1000000',receiverUserId:'account',receiverKeyId:'a'.repeat(64),redemptionDigest:'c'.repeat(64),terminalArtifactSha256:createHash('sha256').update(source).digest('hex'),terminalSourceBytes:source,...change})});await runtime.create('200');await expect(runtime.prepareSelfDeposit('note',new TextEncoder().encode('self'))).rejects.toThrow('IDENTITY_BINDING');expect((f.state as any).notes.note.transfer.sourceRef).toBeUndefined();}
 const f=fixture(),runtime=createConnectedNoteRuntime(f.ports);await runtime.create('200');await runtime.transfer('note',new TextEncoder().encode('outward'));expect(await runtime.recoverSelfDeposit('note')).toBeNull();await expect(runtime.prepareSelfDeposit('note',new TextEncoder().encode('outward'))).rejects.toThrow('EXACT_TRANSFER');
});
it('releases self-deposit custody only after exact independently admitted native credit, retaining its receipt durably',async()=>{
 const f=fixture(),proof=new TextEncoder().encode('actual verified credit receipt');let selfReads=0,creditReads=0;
 const verifySelfDeposit=async(source:Uint8Array)=>{selfReads++;return{noteId:'note',rail:'reserve' as const,amountUsdCents:'200',amountPhiMicro:'1000000',receiverUserId:'account',receiverKeyId:'a'.repeat(64),redemptionDigest:'c'.repeat(64),terminalArtifactSha256:createHash('sha256').update(source).digest('hex'),terminalSourceBytes:source};},verifySelfDepositCredit=async(source:Uint8Array,receipt:Uint8Array)=>{creditReads++;expect(new TextDecoder().decode(source)).toContain('signed-handover');if(new TextDecoder().decode(receipt)!==new TextDecoder().decode(proof))throw Error('native credit not admitted');},ports={...f.ports,verifySelfDeposit,verifySelfDepositCredit},runtime=createConnectedNoteRuntime(ports);
 await runtime.create('200');await runtime.prepareSelfDeposit('note',new TextEncoder().encode('self'));const {hasHeldConnectedNotes}=await import('../src/receiz/connected-note-runtime');expect(await hasHeldConnectedNotes(f.state,{restore:ports.restore,verifySelfDepositCredit})).toBe(true);
 await expect(runtime.confirmSelfDeposit('note',new Uint8Array([1]))).rejects.toThrow('not admitted');expect(await hasHeldConnectedNotes(f.state,{restore:ports.restore,verifySelfDepositCredit})).toBe(true);
 await runtime.confirmSelfDeposit('note',proof);expect(await hasHeldConnectedNotes(f.state,{restore:ports.restore,verifySelfDepositCredit})).toBe(false);expect(await hasHeldConnectedNotes(f.state)).toBe(true);
 const before=selfReads,credits=creditReads;await runtime.savedNotes();await runtime.savedNotes();expect(selfReads-before).toBeLessThanOrEqual(1);expect(creditReads-credits).toBeLessThanOrEqual(1);const saved=(await runtime.savedNotes())[0];expect(saved).toMatchObject({selfDeposit:'confirmed',transferred:false,transferPending:false});const cold=createConnectedNoteRuntime(ports),coldBefore=selfReads;await cold.savedNotes();expect(selfReads-coldBefore).toBe(1);
});
