import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {beforeAll,expect,it,vi} from 'vitest';
import {canonicalizeReceizConstitution as canonical,createReceizIdentityKeyFile,serializeReceizIdentityArtifact} from '@receiz/sdk';
import {insertPngTextChunks,readPngTextChunks} from '../native/receiz/app/utils/pngChunks';
import {createConnectedNoteRuntime} from '../src/receiz/connected-note-runtime';
import {createLocalNoteDepositQueue} from '../src/receiz/note-received-deposits';
import {openConnectedAccountNote,type ConnectedNoteModule} from '../src/receiz/connected-note-application';
import type {BankNoteAccountModule} from '../src/receiz/offline-notes';
import type {ReceizSignatureV4RootPublicKey} from '../node_modules/@receiz/sdk/dist/verifier/signatureV4.js';
// @ts-expect-error Native module is typed by the application port.
import * as native from '../public/native/offline-notes.v129.mjs';

// Select only the fixture's ephemeral roots; the unmodified installed canonical
// verifier still checks the complete enclosing seal. No production pins change.
vi.mock('@receiz/sdk',async original=>{
 const sdk=await original<typeof import('@receiz/sdk')>();
 const {verifyReceizArtifactWithCanonicalRoots}=await import('../node_modules/@receiz/sdk/dist/artifactVerification.js');
 return{...sdk,verifyReceizArtifact:async(bytes:Parameters<typeof sdk.verifyReceizArtifact>[0])=>verifyReceizArtifactWithCanonicalRoots(bytes,roots)};
});
const base=new URL('./fixtures/connected-note-delivery/',import.meta.url),metadata=JSON.parse(readFileSync(new URL('metadata.json',base),'utf8'));
const bytes=(name:string)=>new Uint8Array(gunzipSync(readFileSync(new URL(name+'.gz',base))));
const roots=new Map<string,ReceizSignatureV4RootPublicKey>(metadata.roots.map((root:ReceizSignatureV4RootPublicKey)=>[root.kid,root]));
const module={...native,readBankConnectedNoteImage:(b:Uint8Array)=>native.readBankConnectedNoteImage(b,{roots}),readBankConnectedNoteSource:(b:Uint8Array)=>native.readBankConnectedNoteSource(b,{roots}),createBankConnectedNoteHandover:(input:Record<string,unknown>)=>native.createBankConnectedNoteHandover({...input,roots})}as ConnectedNoteModule&Pick<BankNoteAccountModule,'createBankNoteAccountReceivingRequest'>;
let delivery:typeof import('../src/receiz/note-delivery')|undefined;
beforeAll(async()=>{try{const url=new URL('../src/receiz/note-delivery.ts',import.meta.url).href;delivery=await import(/* @vite-ignore */ url);}catch(cause){if(!(cause instanceof Error)||!/(Cannot find|Failed to load)/.test(cause.message))throw cause;}});
function api(){expect(typeof delivery?.openConnectedNoteDelivery).toBe('function');return delivery!;}
async function receiver(){const uid=crypto.randomUUID(),identity=await createReceizIdentityKeyFile({owner:{uid},portableState:{schema:'receiz.account.state.v3',snapshot:{schema:'receiz.account.state.v3',account:{userId:uid}}}});return{uid,...identity};}
function storage(){let state:unknown=null;const blobs=new Map<string,Uint8Array>();return{read:async()=>structuredClone(state),write:async(next:unknown,previous:unknown)=>{expect(previous).toEqual(state);state=structuredClone(next);},retain:async(b:Uint8Array)=>{const ref=createHash('sha256').update(b).digest('hex');blobs.set(ref,b.slice());return ref;},restore:async(ref:string)=>blobs.get(ref)!.slice()};}

it('forms a genuine receiver-bound handover and signed claim from the complete PNG without an exchanged request',async()=>{
 const d=api(),recipient=await receiver(),opened=await d.openConnectedNoteDelivery({native:module,bytes:bytes('note.png')});
 expect(recipient.keyId).not.toBe(metadata.sender.keyId);expect(opened.noteIdentity?.keyId).toBe(metadata.noteKeyId);expect(opened.noteIdentity?.keyId).not.toBe(metadata.sender.keyId);expect(opened.noteIdentity?.keyId).not.toBe(recipient.keyId);
 expect(opened.source.terminalSourceBytes).toEqual(bytes('funding.receizbundle'));
 const terminal=await d.prepareConnectedNoteDelivery({native:module,delivery:opened,identity:recipient.keyFile,accountUserId:recipient.uid,kai:'14000000'});
 const held=await openConnectedAccountNote(module,terminal,{receiverUserId:recipient.uid,receiverKeyId:recipient.keyId});expect(held.noteId).toBe(metadata.noteId);expect(held.amountUsdCents).toBe('200');
 const claim=await native.createBankConnectedNoteClaim({sourceBytes:terminal,identity:recipient.keyFile,accountUserId:recipient.uid,roots});
 expect((await native.verifyBankConnectedNoteClaim(claim)).receiver.keyId).toBe(recipient.keyId);
 const handover=JSON.parse(new TextDecoder().decode(terminal));expect(JSON.stringify(handover)).not.toContain('privateKey');expect(JSON.stringify(claim)).not.toContain('privateKey');
 const request=await native.verifyBankNoteAccountReceivingRequest(new Uint8Array(Buffer.from(handover.receivingRequest,'base64url')));expect(request.receiverUserId).toBe(recipient.uid);expect(request.receiverKeyId).toBe(recipient.keyId);
});

it('admits the enclosing seal before using delivery authority and rejects changed carrier or substituted authority',async()=>{
 const d=api(),original=bytes('note.png'),bare=bytes('bare.png');
 await expect(d.openConnectedNoteDelivery({native:module,bytes:bare})).rejects.toThrow('BANK_NOTE_IMAGE_SEAL_INVALID');
 const capsule=JSON.parse(readPngTextChunks(original,{keyword:d.NOTE_DELIVERY_KEYWORD})[0].text);
 const changed=insertPngTextChunks(original,[{keyword:d.NOTE_DELIVERY_KEYWORD,text:canonical({...capsule,noteId:crypto.randomUUID()})}]);
 await expect(d.openConnectedNoteDelivery({native:module,bytes:changed})).rejects.toThrow();
 await expect(d.openConnectedNoteDelivery({native:module,bytes:bytes('wrong-note-authority.png')})).rejects.toThrow('BANK_NOTE_DELIVERY_AUTHORITY_MISMATCH');
 const other=await receiver();
 await expect(d.attachConnectedNoteDelivery({native:module,image:bare,source:bytes('funding.receizbundle'),noteIdentityBytes:new TextEncoder().encode(serializeReceizIdentityArtifact(other.keyFile))})).rejects.toThrow('BANK_NOTE_DELIVERY_AUTHORITY_MISMATCH');
 await expect(d.attachConnectedNoteDelivery({native:module,image:bare,source:new Uint8Array([1]),noteIdentityBytes:bytes('note-authority.json')})).rejects.toThrow('BANK_NOTE_DELIVERY_SOURCE_MISMATCH');
 await expect(d.attachConnectedNoteDelivery({native:module,image:original,source:bytes('funding.receizbundle'),noteIdentityBytes:bytes('note-authority.json')})).rejects.toThrow('BANK_NOTE_DELIVERY_ALREADY_SEALED');
 const prepared=await d.attachConnectedNoteDelivery({native:module,image:bare,source:bytes('funding.receizbundle'),noteIdentityBytes:bytes('note-authority.json')});
 d.assertConnectedNoteDeliveryPreserved(prepared,original);expect(()=>d.assertConnectedNoteDeliveryPreserved(prepared,bare)).toThrow('BANK_NOTE_DELIVERY_SOURCE_MISMATCH');
});

it('reopens and reuses the exact admitted terminal for the same recipient while rejecting another recipient',async()=>{
 const d=api(),recipient=await receiver(),other=await receiver(),opened=await d.openConnectedNoteDelivery({native:module,bytes:bytes('note.png')});
 const terminal=await d.prepareConnectedNoteDelivery({native:module,delivery:opened,identity:recipient.keyFile,accountUserId:recipient.uid,kai:'14000000'}),heldStorage=storage();
 const queue=()=>createLocalNoteDepositQueue({uid:recipient.uid,keyId:recipient.keyId,assertOpen(){},...heldStorage,verify:b=>openConnectedAccountNote(module,b,{receiverUserId:recipient.uid,receiverKeyId:recipient.keyId}),submit:async()=>{throw Error('NO_NETWORK_OR_CREDIT_IN_READ_ONLY_TEST');}});
 expect((await queue().receive(terminal)).status).toBe('received');const retained=await queue().retainedSource(metadata.noteId);expect(retained).toEqual(terminal);retained!.fill(0);
 const exact=(await queue().retainedSource(metadata.noteId))!;expect(exact).toEqual(terminal);
 expect(await d.prepareConnectedNoteDelivery({native:module,delivery:{source:opened.source},identity:recipient.keyFile,accountUserId:recipient.uid,kai:'14000001',retainedSource:exact})).toEqual(terminal);
 await expect(d.prepareConnectedNoteDelivery({native:module,delivery:opened,identity:other.keyFile,accountUserId:other.uid,kai:'14000001',retainedSource:terminal})).rejects.toThrow('BANK_NOTE_IDENTITY_BINDING_REQUIRED');
 expect(await d.prepareConnectedNoteDelivery({native:module,delivery:{source:await module.readBankConnectedNoteSource(terminal)},identity:recipient.keyFile,accountUserId:recipient.uid,kai:'14000002'})).toEqual(terminal);
 const different=await d.openConnectedNoteDelivery({native:module,bytes:bytes('second-note.png')});
 await expect(d.prepareConnectedNoteDelivery({native:module,delivery:different,identity:recipient.keyFile,accountUserId:recipient.uid,kai:'14000002',retainedSource:terminal})).rejects.toThrow('BANK_NOTE_EXACT_DEPOSIT_REQUIRED');
});

it('upgrades an older funding image only on explicit export and keeps new complete images exact after reopen',async()=>{
 const d=api(),local=storage(),source=bytes('funding.receizbundle'),key=bytes('note-authority.json'),sealed=bytes('note.png');let renders=0,issues=0;
 const ports={uid:metadata.sender.uid,keyId:metadata.sender.keyId,assertOpen(){},...local,prepare:async()=>({noteId:metadata.noteId,operationId:'b'.repeat(64),rail:'reserve' as const,amountUsdCents:'200',authorization:{},noteIdentityBytes:key}),issue:async()=>{issues++;return{noteId:metadata.noteId,rail:'reserve' as const,amountUsdCents:'200',amountPhiMicro:'1000000',sourceBytes:source,privateOpeningBytes:new TextEncoder().encode('not-exported-account-opening')};},inspect:(b:Uint8Array)=>module.readBankConnectedNoteSource(b),handover:async()=>{throw Error('NO_ADDRESSING_DURING_EXPORT');},image:async()=>bytes('bare.png'),cancel:async()=>new Uint8Array([1])};
 const old=await createConnectedNoteRuntime(ports).create('200');expect(old.image).toEqual(bytes('bare.png'));
 const complete={...ports,deliveryImage:async(funding:Uint8Array,_note:unknown,noteIdentity:Uint8Array)=>{expect(funding).toEqual(source);expect(noteIdentity).toEqual(key);renders++;return sealed;}};
 const upgraded=createConnectedNoteRuntime(complete);await upgraded.savedNotes();expect(renders).toBe(0);expect((await upgraded.exportNote(metadata.noteId)).image).toEqual(sealed);expect(renders).toBe(1);expect(issues).toBe(1);
 expect((await createConnectedNoteRuntime(complete).exportNote(metadata.noteId)).image).toEqual(sealed);expect(renders).toBe(1);
 const opened=await d.openConnectedNoteDelivery({native:module,bytes:sealed});expect(opened.noteIdentity?.keyId).toBe(metadata.noteKeyId);
});

it('pauses each failed copy independently and reuses exact claims only on explicit retry after cold reopen',async()=>{
 const d=api(),recipient=await receiver(),local=storage(),attempts:{id:string;recover:boolean;claim:Uint8Array}[]=[],prepared=new Map<string,Uint8Array>();
 const queue=()=>createLocalNoteDepositQueue({uid:recipient.uid,keyId:recipient.keyId,assertOpen(){},...local,verify:b=>openConnectedAccountNote(module,b,{receiverUserId:recipient.uid,receiverKeyId:recipient.keyId}),
  prepare:async b=>{const claim=await native.createBankConnectedNoteClaim({sourceBytes:b,identity:recipient.keyFile,accountUserId:recipient.uid,roots}),value=new TextEncoder().encode(JSON.stringify(claim));prepared.set(claim.noteId,value.slice());return value;},
  submit:async(b,options)=>{const held=await module.readBankConnectedNoteSource(b);attempts.push({id:held.noteId,recover:options.recoverFirst,claim:options.preparedRequestBytes!.slice()});throw Error(held.noteId===metadata.noteId?'BANK_NOTE_ALREADY_DEPOSITED':'LOST_AFTER_ACCEPT');},
 });
 for(const name of ['note.png','second-note.png']){const opened=await d.openConnectedNoteDelivery({native:module,bytes:bytes(name)}),terminal=await d.prepareConnectedNoteDelivery({native:module,delivery:opened,identity:recipient.keyFile,accountUserId:recipient.uid,kai:'14000000'});await queue().receive(terminal);}
 await queue().reconcile();expect(attempts.map(value=>value.id)).toEqual([metadata.noteId,metadata.secondNoteId]);
 expect(await queue().list()).toMatchObject([{status:'received',depositError:'BANK_NOTE_ALREADY_DEPOSITED'},{status:'received',depositError:'LOST_AFTER_ACCEPT'}]);
 await queue().reconcile();expect(attempts).toHaveLength(2);
 await queue().reconcile({retryFailed:true});expect(attempts).toHaveLength(4);
 expect(attempts.map(value=>value.recover)).toEqual([false,false,true,true]);
 for(const attempt of attempts)expect(attempt.claim).toEqual(prepared.get(attempt.id));
 expect(prepared.size).toBe(2);expect(await queue().confirmed(metadata.noteId)).toBeNull();
});
