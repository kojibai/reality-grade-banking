import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {expect,it} from 'vitest';
// @ts-expect-error Generated native module is typed through the application port.
import * as native from '../public/native/offline-notes.v129.mjs';
import {validateNativeNoteDeposit} from '../src/receiz/native-note-deposit';
import {createConnectedNoteRuntime} from '../src/receiz/connected-note-runtime';
import {createLocalNoteInventory} from '../src/receiz/note-local-inventory';
import type {ConnectedNoteModule} from '../src/receiz/connected-note-application';
import type {BankNoteAccountModule} from '../src/receiz/offline-notes';

const base=new URL('./fixtures/connected-note/',import.meta.url),metadata=JSON.parse(readFileSync(new URL('metadata.json',base),'utf8'));
const bytes=(name:string)=>new Uint8Array(gunzipSync(readFileSync(new URL(name+'.gz',base))));
const roots=new Map(metadata.issuerRootPublicKeys.map((root:{kid:string})=>[root.kid,root]));
const depositBase=new URL('./fixtures/note-account-deposit/',import.meta.url),depositMetadata=JSON.parse(readFileSync(new URL('metadata.json',depositBase),'utf8'));
const terminal=new Uint8Array(gunzipSync(readFileSync(new URL('terminal.receiz.json.gz.bin',depositBase))));
const depositRoots=new Map(depositMetadata.roots.map((root:{kid:string})=>[root.kid,root]));
const module={...native,readBankConnectedNoteImage:(source:Uint8Array)=>native.readBankConnectedNoteImage(source,{roots}),readBankConnectedNoteSource:(source:Uint8Array)=>native.readBankConnectedNoteSource(source,{roots}),openBankNoteAccountDeposit:(source:Uint8Array,context:unknown)=>native.openBankNoteAccountDeposit(source,{...context as object,roots:depositRoots})}as BankNoteAccountModule&ConnectedNoteModule;
const fundingImage=()=>native.exportBankConnectedNoteImage(bytes('funding.receizbundle'),new Uint8Array(readFileSync(new URL('../public/icon-192.png',import.meta.url))),{roots});
function custody(){
 let state:unknown=null;const blobs=new Map<string,Uint8Array>();
 return createConnectedNoteRuntime({uid:metadata.sender.uid,keyId:metadata.sender.keyId,assertOpen(){},read:async()=>structuredClone(state),write:async(next,previous)=>{expect(previous).toEqual(state);state=structuredClone(next);},
  retain:async(value:Uint8Array)=>{const ref=createHash('sha256').update(value).digest('hex');blobs.set(ref,value.slice());return ref;},restore:async(ref:string)=>blobs.get(ref)!.slice(),
  prepare:async()=>({noteId:metadata.noteId,operationId:'b'.repeat(64),rail:'reserve',amountUsdCents:'200',authorization:{noteId:metadata.noteId,rail:'reserve',amountUsdCents:'200'},noteIdentityBytes:new TextEncoder().encode('external-private-custody-port')}),
  issue:async()=>({...await native.readBankConnectedNoteSource(bytes('funding.receizbundle'),{roots}),sourceBytes:bytes('funding.receizbundle'),privateOpeningBytes:bytes('funding-opening.json')}),
  inspect:source=>native.readBankConnectedNoteSource(source,{roots}),handover:async()=>{throw Error('PREFLIGHT_MUST_NOT_HANDOVER');},image:async source=>source,cancel:async()=>{throw Error('PREFLIGHT_MUST_NOT_CANCEL');},
 });
}
function input(image:Uint8Array,context={receiverUserId:metadata.receiver.uid,receiverKeyId:metadata.receiver.keyId}){
 return{image,module,context,connected:custody(),savedNotes:async()=>[],inspectLegacy:async()=>{throw Error('CONNECTED_PREFLIGHT_MUST_NOT_READ_LEGACY');}};
}
it.each(['receiverUserId','receiverKeyId']as const)('refuses a connected handover for a foreign %s before a financial action',async field=>{
 const value=input(bytes('note.png'));value.context={...value.context,[field]:'foreign'};
 await expect(validateNativeNoteDeposit(value)).rejects.toThrow('BANK_NOTE_IDENTITY_BINDING_REQUIRED');
});
it.each(['receiverUserId','receiverKeyId']as const)('refuses an account deposit for a foreign %s before a financial action',async field=>{
 const value=input(terminal,{receiverUserId:depositMetadata.receiverUserId,receiverKeyId:depositMetadata.receiverKeyId});value.context={...value.context,[field]:'foreign'};
 await expect(validateNativeNoteDeposit(value)).rejects.toThrow('BANK_NOTE_IDENTITY_BINDING_REQUIRED');
});
it('validates genuine connected and account deposit sources against their active recipients',async()=>{
 await expect(validateNativeNoteDeposit(input(bytes('note.png')))).resolves.toBeUndefined();
 await expect(validateNativeNoteDeposit(input(terminal,{receiverUserId:depositMetadata.receiverUserId,receiverKeyId:depositMetadata.receiverKeyId}))).resolves.toBeUndefined();
});
it('refuses connected funding without locally retained private Note custody',async()=>{
 await expect(validateNativeNoteDeposit(input(await fundingImage()))).rejects.toThrow('BANK_NOTE_IDENTITY_BINDING_REQUIRED');
});
it('accepts the exact connected funding source retained with this private Note custody',async()=>{
 const value=input(await fundingImage(),{receiverUserId:metadata.sender.uid,receiverKeyId:metadata.sender.keyId});await value.connected.create('200');
 await expect(validateNativeNoteDeposit(value)).resolves.toBeUndefined();
});
it('requires an exact untransferred legacy image from the admitted local inventory',async()=>{
 const held=new TextEncoder().encode('held-legacy-note'),foreign=new TextEncoder().encode('foreign-legacy-note-with-same-note-id');
 let transferred=false;
 const inspect=async()=>({noteId:'legacy',rail:'reserve' as const,amountPhiMicro:'1000000',amountUsdCents:'200'});
 const inventory=createLocalNoteInventory({keyId:'key',uid:()=> 'account',assertOpen(){},readLegacy:async()=>({schema:'receiz.bank.offline-notes-device.v1',keyId:'key',uid:'account',create:null,notes:{legacy:{intent:{noteId:'legacy'},imageRef:'held',transferComplete:transferred}},deposits:{},receivers:{}}),readPrepared:async()=>null,restore:async()=>held,inspect});
 const legacyModule={...module,isBankConnectedNoteImage:async()=>false,isBankConnectedNoteSource:async()=>false,isBankNoteAccountDeposit:()=>false};
 const value={...input(held),module:legacyModule,savedNotes:()=>inventory.savedNotes(),inspectLegacy:inspect};
 await expect(validateNativeNoteDeposit(value)).resolves.toBeUndefined();
 await expect(validateNativeNoteDeposit({...value,image:foreign})).rejects.toThrow('BANK_NOTE_RECEIVING_CUSTODY_REQUIRED');
 transferred=true;await expect(validateNativeNoteDeposit(value)).rejects.toThrow('BANK_NOTE_RECEIVING_CUSTODY_REQUIRED');
});
it('admits an incoming prepared Note through native read-only receiving custody without enrolling, signing or writing',async()=>{
 const {createReceizIdIdentity}=await import('@receiz/sdk');
 const {insertPngTextChunks}=await import('../native/receiz/app/utils/pngChunks');
 const key=(await createReceizIdIdentity({passphrase:'read-only-custody-test-phrase'})).keyFile;
 const funded=JSON.parse(new TextDecoder().decode(terminal)).fundedSource;
 const head=JSON.parse(Buffer.from(funded.noteArtifacts.at(-1),'base64url').toString('utf8'));
 const image=insertPngTextChunks(new Uint8Array(readFileSync(new URL('../public/icon-192.png',import.meta.url))),[{keyword:'receiz.bank.offline-note.v1',text:JSON.stringify({schema:'receiz.bank.note-image-transport.v1',wire:await native.packBankNoteBytes(new TextEncoder().encode(JSON.stringify(funded)))})}]);
 const state={schema:'receiz.bank.prepared-notes-device.v1',uid:'account',keyId:key.keyId,create:null,journal:null,slots:{receive:{id:'receive',role:'receive',status:'ready',receivingCustody:head.settlement.packet.currentCustody}},notes:{},components:{},stages:{},proofs:{}};
 const forbidden=async()=>{throw Error('PREFLIGHT_MUTATION_FORBIDDEN');};
 const reader=native.createBankPreparedBrowserRuntime({identity:key,keyId:key.keyId,uid:'account',localUid:key.owner.uid,passphrase:'read-only-custody-test-phrase',origin:'https://bankeiz.com',roots:depositRoots,assertOpen(){},read:async()=>structuredClone(state),restore:forbidden,write:forbidden,retain:forbidden,fetchImpl:forbidden,sealDocument:forbidden,artwork:forbidden});
 const inventory=createLocalNoteInventory({keyId:key.keyId,uid:()=> 'account',readLegacy:async()=>null,readPrepared:async()=>structuredClone(state),restore:forbidden,inspect:source=>reader.inspectNote(source),assertOpen(){}});
 const value={...input(image,{receiverUserId:'account',receiverKeyId:key.keyId}),savedNotes:()=>inventory.savedNotes(),inspectLegacy:(source:Uint8Array)=>reader.inspectNote(source),holdsReceivingCustody:(source:Uint8Array)=>reader.holdsReceivingCustody(source)};
 expect(await inventory.savedNotes()).toEqual([]);
 await expect(validateNativeNoteDeposit(value)).resolves.toBeUndefined();
 state.slots={}as typeof state.slots;
 await expect(validateNativeNoteDeposit(value)).rejects.toThrow('BANK_NOTE_RECEIVING_CUSTODY_REQUIRED');
},30000);

it('refuses retained funding custody when it belongs to a different active account',async()=>{
 const value=input(await fundingImage());await value.connected.create('200');
 await expect(validateNativeNoteDeposit(value)).rejects.toThrow('BANK_NOTE_IDENTITY_BINDING_REQUIRED');
});
