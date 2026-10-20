import {afterEach,expect,it,vi} from 'vitest';
import {loadOfflineNoteState,loadPreparedNoteState,loadReceivedNoteDepositState,loadConnectedNoteState,loadAssetPublicationState,assertWalletSendCustody,loadWalletObservation,forgetDeviceIdentity,saveDeviceIdentity} from '../src/receiz/identity-vault';
import {atNoteStage,noteFailureStage} from '../src/receiz/note-stage';
import {BANK_STORAGE_APPLICATION_ID} from '../src/receiz/config';

// Replace only IndexedDB transport. Identity and financial checkpoint encryption
// use real AES-GCM; a corrupt record must remain byte-for-byte held and fail closed.
async function fixture(family='offline-notes',state:unknown={synthetic:true}){
 const source=new TextEncoder().encode('synthetic-not-an-identity'),wrappingKey=await crypto.subtle.generateKey({name:'AES-GCM',length:256},false,['encrypt','decrypt']);
 const digest=[...new Uint8Array(await crypto.subtle.digest('SHA-256',source))].map(v=>v.toString(16).padStart(2,'0')).join('');
 const artifactIv=crypto.getRandomValues(new Uint8Array(12)),bytes=await crypto.subtle.encrypt({name:'AES-GCM',iv:artifactIv,additionalData:new TextEncoder().encode('receiz.bank.private-identity-source.v1')},wrappingKey,source);
 const saved={bytes,artifactIv,wrappingKey},key=`${family}|${BANK_STORAGE_APPLICATION_ID}|${digest}`,iv=crypto.getRandomValues(new Uint8Array(12));
 const row={key,iv,bytes:await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:new TextEncoder().encode(key)},wrappingKey,new TextEncoder().encode(JSON.stringify(state)))};
 const writes=vi.fn(),transactions:string[]=[];
 const db={close(){},transaction(stores:string|string[],mode?:string){transactions.push(String(stores));const tx:{oncomplete?:()=>void;objectStore:(name:string)=>unknown}={objectStore:name=>({get(address:string){const request:{result:unknown;onsuccess?:()=>void}={result:name==='identity'?saved:address===key?row:undefined};queueMicrotask(()=>{request.onsuccess?.();queueMicrotask(()=>tx.oncomplete?.());});return request;},put:writes})};if(mode==='readwrite')writes();return tx;}};
 vi.stubGlobal('indexedDB',{open(){const request:{result:unknown;onsuccess?:()=>void}={result:db};queueMicrotask(()=>request.onsuccess?.());return request;}});
 return{binding:{artifactSha256:digest},saved,row,state,writes,transactions};
}
afterEach(()=>vi.unstubAllGlobals());
it.each(['offline-notes','prepared-notes','received-note-deposits'])('opens %s from one coherent read-only identity/checkpoint snapshot',async family=>{
 const f=await fixture(family),read=family==='offline-notes'?loadOfflineNoteState:family==='prepared-notes'?loadPreparedNoteState:loadReceivedNoteDepositState;
 expect(await read(f.binding)).toEqual(f.state);expect(f.transactions).toEqual(['identity,operations']);expect(f.writes).not.toHaveBeenCalled();
});
it.each(['connected-notes','asset-publication'])('opens retained %s without writes or another identity read',async family=>{
 const f=await fixture(family),read=family==='connected-notes'?loadConnectedNoteState:loadAssetPublicationState;
 expect(await read(f.binding)).toEqual(f.state);expect(f.transactions).toEqual(['identity,operations']);expect(f.writes).not.toHaveBeenCalled();
});
it('distinguishes a failed saved identity decrypt from a checkpoint failure without replacing the original exception',async()=>{
 const f=await fixture();new Uint8Array(f.saved.bytes)[0]^=1;
 const cause=await atNoteStage('saved-notes',()=>loadOfflineNoteState(f.binding)).catch(error=>error);
 expect(cause).toMatchObject({name:'OperationError'});expect(noteFailureStage(cause)).toEqual({stage:'saved-note-identity',errorName:'OperationError'});expect(f.writes).not.toHaveBeenCalled();
});
it.each(['offline-notes','prepared-notes','received-note-deposits'])('preserves unreadable %s checkpoint bytes and reports the exact local failing stage',async family=>{
 const f=await fixture(family);new Uint8Array(f.row.bytes)[0]^=1;const original=f.row.bytes.slice(0),read=family==='offline-notes'?loadOfflineNoteState:family==='prepared-notes'?loadPreparedNoteState:loadReceivedNoteDepositState;
 const cause=await atNoteStage('saved-notes',()=>read(f.binding)).catch(error=>error);
 expect(cause).toMatchObject({name:'OperationError'});expect(noteFailureStage(cause)).toEqual({stage:family==='offline-notes'?'offline-note-checkpoint':family==='prepared-notes'?'prepared-note-checkpoint':'received-note-checkpoint',errorName:'OperationError'});
 expect(f.row.bytes).toEqual(original);expect(f.writes).not.toHaveBeenCalled();expect(JSON.stringify(noteFailureStage(cause))).not.toContain(f.binding.artifactSha256);
});

it('a missing optional display observation does not invent local Note custody',async()=>{
 const f=await fixture();await expect(assertWalletSendCustody({...f.binding,keyId:'fixture-key'})).resolves.toBeUndefined();expect(f.writes).not.toHaveBeenCalled();
});
it.each([true,false])('strict Send custody rejects an unreadable saved observation, including durable marker=%s, without changing display restoration',async marked=>{
 const f=await fixture(),binding={...f.binding,keyId:'fixture-key'};
 Object.assign(f.saved,{walletObservation:{iv:crypto.getRandomValues(new Uint8Array(12)),bytes:new Uint8Array(16).buffer,binding,...(marked?{localHeadDigest:'a'.repeat(64)}:{})}});
 expect(await loadWalletObservation(binding)).toBeNull();
 await expect(assertWalletSendCustody(binding)).rejects.toThrow(marked?'BANK_WALLET_LOCAL_HEAD_REQUIRED':'operation');expect(f.writes).not.toHaveBeenCalled();
});

const receivingState={schema:'bank.received-note-deposits.v1',uid:'receiver',keyId:'a'.repeat(64),entries:{incoming:{sourceRef:'b'.repeat(64),redemptionDigest:'c'.repeat(64),terminalArtifactSha256:'d'.repeat(64),status:'received'}}};
it('preserves unreconciled received Notes when removing or replacing their identity',async()=>{
 const f=await fixture('received-note-deposits',receivingState),original=f.row.bytes.slice(0);
 await expect(forgetDeviceIdentity()).rejects.toThrow('received Notes');
 await expect(saveDeviceIdentity(new TextEncoder().encode('different test identity'),'test.bin','',true)).rejects.toThrow('received Notes');
 expect(f.row.bytes).toEqual(original);expect(f.writes).not.toHaveBeenCalled();
});
it.each([{}, {...receivingState,entries:{incoming:{status:'confirmed'}}}])('refuses malformed received-Note state instead of discarding its wrapping key',async invalid=>{
 const f=await fixture('received-note-deposits',invalid);
 await expect(forgetDeviceIdentity()).rejects.toThrow('BANK_NOTE_PRIVATE_SOURCE_INVALID');expect(f.writes).not.toHaveBeenCalled();
});
it('retains the private authority of an issued connected Note when removing the ID',async()=>{
 const state={schema:'bank.connected-notes.v1',uid:'receiver',keyId:'a'.repeat(64),current:null,notes:{note:{noteId:'note',operationId:'b'.repeat(64),rail:'reserve',amountUsdCents:'200',authorizationRef:'c'.repeat(64),noteIdentityRef:'d'.repeat(64),phase:'issued',sourceRef:'e'.repeat(64),openingRef:'f'.repeat(64),imageRef:'1'.repeat(64)}}};
 const f=await fixture('connected-notes',state);await expect(forgetDeviceIdentity()).rejects.toThrow('connected Notes');expect(f.writes).not.toHaveBeenCalled();
});
it('retains an unknown public asset publication and its exact source when replacing the ID',async()=>{
 const state={schema:'bank.asset-publication.v1',ownerReceizId:'synthetic.receiz.id',intentDigest:'a'.repeat(64),sourceDigest:'b'.repeat(64),filename:'asset.receiz.json',mimeType:'application/json',status:'pending'};
 const f=await fixture('asset-publication',state);await expect(forgetDeviceIdentity()).rejects.toThrow('asset publication');expect(f.writes).not.toHaveBeenCalled();
});
