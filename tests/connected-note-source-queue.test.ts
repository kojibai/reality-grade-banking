import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {expect,it,vi,afterEach} from 'vitest';
afterEach(()=>vi.unstubAllGlobals());
// @ts-expect-error Generated native module is typed through the application port.
import * as native from '../public/native/offline-notes.v129.mjs';
import {createLocalNoteDepositQueue} from '../src/receiz/note-received-deposits';
import {isConnectedNote,openConnectedAccountNote,prepareConnectedAccountNoteClaim,submitConnectedAccountNoteClaim,type ConnectedNoteModule} from '../src/receiz/connected-note-application';
const base=new URL('./fixtures/connected-note/',import.meta.url),metadata=JSON.parse(readFileSync(new URL('metadata.json',base),'utf8'));
const bytes=(name:string)=>new Uint8Array(gunzipSync(readFileSync(new URL(name+'.gz',base))));
const roots=new Map(metadata.issuerRootPublicKeys.map((r:{kid:string})=>[r.kid,r]));
const encode=(bytes:Uint8Array)=>Buffer.from(bytes).toString('base64url'),decode=(text:string)=>new Uint8Array(Buffer.from(text,'base64url'));
const module={...native,readBankConnectedNoteImage:(b:Uint8Array)=>native.readBankConnectedNoteImage(b,{roots}),readBankConnectedNoteSource:(b:Uint8Array)=>native.readBankConnectedNoteSource(b,{roots}),verifyBankConnectedNoteCredit:(b:Uint8Array,o:Uint8Array)=>native.verifyBankConnectedNoteCredit(b,o,{roots}),createBankConnectedNoteClaim:async()=>JSON.parse(new TextDecoder().decode(bytes('claim.json')))}as ConnectedNoteModule;
it('retains the complete connected PNG as raw source, reopens offline and confirms one exact saved claim after a lost reply',async()=>{
 vi.stubGlobal('location',{origin:'https://bankeiz.com'});
 const png=bytes('note.png'),raw=bytes('handover.receiz');expect(await isConnectedNote(module,png)).toBe(true);expect(await isConnectedNote(module,raw)).toBe(true);
 const context={receiverUserId:metadata.receiver.uid,receiverKeyId:metadata.receiver.keyId};
 const held=await openConnectedAccountNote(module,png,context);expect(held.terminalSourceBytes).toEqual(raw);
 let state:unknown=null,lost=true;const blobs=new Map<string,Uint8Array>(),requests:unknown[]=[];
 const client={uid:context.receiverUserId,identity:{keyId:context.receiverKeyId} as any,passphrase:'unused-signed-fixture',wallet:async()=>{throw Error('WALLET_READ_FORBIDDEN');},request:async(path:string,options:any)=>{requests.push({path,...options});if(lost&&options.method==='POST')throw Error('LOST_AFTER_ACCEPT');return{ok:true,found:true,source:encode(bytes('credit.receizbundle')),privateAccountOpening:encode(bytes('credit-opening.json'))};}};
 const ports={uid:context.receiverUserId,keyId:context.receiverKeyId,assertOpen(){},read:async()=>structuredClone(state),write:async(next:unknown,previous:unknown)=>{expect(previous).toEqual(state);state=structuredClone(next);},retain:async(b:Uint8Array)=>{const ref=createHash('sha256').update(b).digest('hex');blobs.set(ref,b.slice());return ref;},restore:async(ref:string)=>blobs.get(ref)!.slice(),verify:(b:Uint8Array)=>openConnectedAccountNote(module,b,context),prepare:(b:Uint8Array)=>prepareConnectedAccountNoteClaim({module,bytes:b,context:client,encode}),submit:(b:Uint8Array,o:{recoverFirst:boolean;preparedRequestBytes?:Uint8Array})=>submitConnectedAccountNoteClaim({module,bytes:b,prepared:o.preparedRequestBytes!,recoverFirst:o.recoverFirst,context:client,decode})};
 const queue=createLocalNoteDepositQueue(ports);expect((await queue.receive(png)).status).toBe('received');expect((await createLocalNoteDepositQueue(ports).list())[0].proofBytes).toEqual(raw);
 await expect(queue.reconcile()).rejects.toThrow('LOST_AFTER_ACCEPT');lost=false;
 const reopened=createLocalNoteDepositQueue(ports);await reopened.reconcile();const credit=(await reopened.list())[0];expect(credit.status).toBe('confirmed');
 expect((credit as any).reserveAfterUsdCents).toBe(metadata.accountAfter.reserveUsdCents);expect(requests.map((r:any)=>r.method)).toEqual(['POST','GET']);
 const receipt=await native.verifyBankConnectedNoteReceipt(credit.proofBytes,{roots});expect(receipt.kind).toBe('credit');expect(receipt.terminalSourceBytes).toEqual(raw);expect(receipt.accountAfter).toEqual(metadata.accountAfter);
},30000);
it('refuses altered openings, generic financial claims and a different recipient without creating credit',async()=>{
 const raw=bytes('handover.receiz');await expect(openConnectedAccountNote(module,raw,{receiverUserId:metadata.receiver.uid,receiverKeyId:'f'.repeat(64)})).rejects.toThrow('BANK_NOTE_IDENTITY_BINDING_REQUIRED');
 await expect(native.verifyBankConnectedNoteFunding(bytes('funding.receizbundle'),new TextEncoder().encode('{}'),{roots})).rejects.toThrow();
 await expect(native.verifyBankConnectedNoteCredit(bytes('credit.receizbundle'),bytes('credit-opening.json'),{roots:new Map()})).rejects.toThrow();
},30000);
