import {beforeAll,afterEach,expect,it,vi} from 'vitest';
import {IDBFactory} from 'fake-indexeddb';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {conformanceOfflineFixture} from './helpers/conformance-offline-sealer';
import type {VaultImagePorts} from '../src/receiz/vault/export';
import type {ReceizSignatureV4RootPublicKey} from '../node_modules/@receiz/sdk/dist/verifier/signatureV4';

// Select only ephemeral fixture trust roots; the real canonical verifier and
// native financial guards remain unchanged. No production pin is modified.
vi.mock('@receiz/sdk',async original=>{const sdk=await original<typeof import('@receiz/sdk')>(),{verifyReceizArtifactWithCanonicalRoots}=await import('../node_modules/@receiz/sdk/dist/artifactVerification.js');return{...sdk,verifyReceizArtifact:(bytes:Parameters<typeof sdk.verifyReceizArtifact>[0])=>verifyReceizArtifactWithCanonicalRoots(bytes,roots)};});
const png=Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aF0sAAAAASUVORK5CYII=','base64'));
const nativeUrl=new URL('../public/native/offline-notes.v129.mjs',import.meta.url).href,native=await import(/* @vite-ignore */nativeUrl),base=new URL('./fixtures/connected-note-delivery/',import.meta.url),metadata=JSON.parse(readFileSync(new URL('metadata.json',base),'utf8'));
const roots=new Map<string,ReceizSignatureV4RootPublicKey>(metadata.roots.map((root:ReceizSignatureV4RootPublicKey)=>[root.kid,root]));
const noteBytes=()=>new Uint8Array(gunzipSync(readFileSync(new URL('note.png.gz',base))));
let fixture:Awaited<ReturnType<typeof conformanceOfflineFixture>>,owner:{keyId:string;receizId:string},images:VaultImagePorts,seals=0;
beforeAll(async()=>{
 fixture=await conformanceOfflineFixture();const r=fixture.runtime;
 const a=await r.createReceizArtifactAdmissionEngine()(await r.verifyReceizArtifact(fixture.identity.bytes),{profile:'identity',identityPassphrase:fixture.identity.phrase}),b=await r.readReceizIdentityPublicBinding(a);
 owner={keyId:b.keyId,receizId:b.artifactOwnerReceizId};
 const sealer=r.offline.createReceizOfflineSealer({store:fixture.store,resources:fixture.resources,ownerIdentityAdmission:a,fetch:async()=>{throw Error('NO_NETWORK');}});
 images={render:async()=>png,seal:async(input)=>{seals++;return sealer.seal(input);},verify:async(bytes)=>(await r.verifyReceizArtifact(bytes)).status==='verified-artifact'};
},60000);
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});
const interaction={review:async()=>true,saveAndReopen:async(image:{bytes:Uint8Array})=>image.bytes.slice()};
async function storageFixture(){
 const module=await import('../src/receiz/vault/note-manager');vi.stubGlobal('indexedDB',new IDBFactory());
 // Use the same complete delivery reader as production: canonical enclosing
 // seal, genuine native funding, and its exact scoped private Note authority.
 const {openConnectedNoteDelivery}=await import('../src/receiz/note-delivery'),moduleNative={...native,readBankConnectedNoteImage:(bytes:Uint8Array)=>native.readBankConnectedNoteImage(bytes,{roots}),readBankConnectedNoteSource:(bytes:Uint8Array)=>native.readBankConnectedNoteSource(bytes,{roots})};
 const inspectNote=vi.fn(async(bytes:Uint8Array)=>{const delivery=await openConnectedNoteDelivery({native:moduleNative,bytes}),n=delivery.source;if(!delivery.noteIdentity)throw Error('BANK_NOTE_COMPLETE_DELIVERY_REQUIRED');return{noteId:n.noteId,rail:n.rail,amountUsdCents:n.amountUsdCents,amountPhiMicro:n.amountPhiMicro};});
 return{module,inspectNote,manager:module.createNoteVaultManager({owner,images,admission:{inspectNote}})};
}
it('creates locally and reopens the exact canonical image with no financial or network work',async()=>{
 const f=await storageFixture(),network=vi.spyOn(globalThis,'fetch').mockRejectedValue(Error('NO_NETWORK')),session=await f.manager.create({name:'My reserve'},interaction),snapshot=await session.snapshot();
 expect(snapshot).toMatchObject({name:'My reserve',protection:'image',money:[],originals:[]});expect(snapshot).not.toHaveProperty('pending');
 const file=await session.exportPrivate(),before=seals;expect((await fixture.runtime.verifyReceizArtifact(file.bytes)).status).toBe('verified-artifact');
 expect((await session.exportPrivate()).bytes).toEqual(file.bytes);expect(seals).toBe(before);f.manager.dispose();
 const cold=f.module.createNoteVaultManager({images}),opened=await cold.importPrivate(file.bytes,interaction);expect(await opened.snapshot()).toEqual(snapshot);expect((await opened.exportPrivate()).bytes).toEqual(file.bytes);expect(seals).toBe(before);expect(network).not.toHaveBeenCalled();
 const corrupt=file.bytes.slice();corrupt[50]^=1;await expect(cold.importPrivate(corrupt,interaction)).rejects.toThrow();cold.dispose();
});
it('stores a genuine funded Note byte for byte and reuses accepted rows on duplicate append',async()=>{
 const f=await storageFixture(),review=vi.fn(async(_input:unknown)=>true),s=await f.manager.create({name:'Recorded Notes'},{...interaction,review}),bytes=noteBytes(),network=vi.spyOn(globalThis,'fetch').mockRejectedValue(Error('NO_NETWORK'));
 await s.addNote(bytes,'reserve-note.png');expect((await s.snapshot()).money).toMatchObject([{noteId:metadata.noteId,amountUsdCents:metadata.amountUsdCents}]);expect((await s.snapshot()).money[0]).not.toHaveProperty('status');expect(f.inspectNote).toHaveBeenCalledOnce();
 await s.addNote(bytes,'same-note.png');expect(f.inspectNote).toHaveBeenCalledOnce();expect((await s.exportNote(metadata.noteId)).bytes).toEqual(bytes);
 const file=await s.exportPrivate();expect((await fixture.runtime.verifyReceizArtifact(file.bytes)).status).toBe('verified-artifact');s.lock();const opened=await f.manager.importPrivate(file.bytes,interaction);expect((await opened.exportNote(metadata.noteId)).bytes).toEqual(bytes);expect(f.inspectNote).toHaveBeenCalledTimes(2);expect(review).toHaveBeenCalledOnce();expect(network).not.toHaveBeenCalled();f.manager.dispose();
});
it('refuses cancelled review and caller lifetime without modifying the retained source',async()=>{
 const f=await storageFixture(),s=await f.manager.create({name:'Cancel'},interaction),id=(await s.snapshot()).id,a=new AbortController();a.abort(Error('CALLER_CLOSED'));
 await expect(f.manager.open(id,{...interaction,signal:a.signal})).rejects.toThrow('CALLER_CLOSED');
 await expect(f.manager.create({name:'Refused'},{...interaction,review:async()=>false})).rejects.toThrow('REVIEW_CANCELLED');expect(f.inspectNote).not.toHaveBeenCalled();expect((await s.snapshot()).money).toEqual([]);f.manager.dispose();await expect(s.snapshot()).rejects.toThrow('CLOSED');
});
it('coalesces concurrent exports of the same retained state',async()=>{
 const f=await storageFixture(),s=await f.manager.create({name:'One image'},interaction),before=seals,[a,b]=await Promise.all([s.exportPrivate(),s.exportPrivate()]);expect(a.bytes).toEqual(b.bytes);expect(seals-before).toBe(1);f.manager.dispose();
});
it('requires the primary credential and exports only an explicitly approved portable recovery copy',async()=>{
 const {module}=await storageFixture(),pair=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},false,['sign','verify']),key=new Uint8Array(32).fill(7),encode=(b:Uint8Array)=>Buffer.from(b).toString('base64url');let presences=0;
 const review=vi.fn(async(_input:unknown)=>true),manager=module.createNoteVaultManager({owner,images,register:async()=>({id:encode(new Uint8Array([1,2,3])),publicKeySpki:encode(new Uint8Array(await crypto.subtle.exportKey('spki',pair.publicKey))),rpId:'bankeiz.com',origin:'https://bankeiz.com'}),presence:async()=>{presences++;return{secret:key.slice(),assertion:{credentialId:'',authenticatorData:'',clientDataJSON:'',signature:''},challenge:'',actionDigest:''};}}),s=await manager.create({name:'Protected',protection:'passkey'},{...interaction,review}),primary=await s.exportPrivate();expect(presences).toBe(1);
 const denied=module.createNoteVaultManager({images,presence:async()=>{throw Error('NO_CREDENTIAL');}});await expect(denied.importPrivate(primary.bytes,interaction)).rejects.toThrow('NO_CREDENTIAL');denied.dispose();
 const before=review.mock.calls.length,recovery=await s.exportRecovery();expect(review.mock.calls.length).toBe(before+1);expect(review.mock.calls.at(-1)?.[0]).toMatchObject({kind:'create',intent:{kind:'export-recovery-original',privateCopy:true}});expect(presences).toBe(1);manager.dispose();
 vi.stubGlobal('indexedDB',new IDBFactory());const independent=module.createNoteVaultManager({images,presence:async()=>{throw Error('NO_CREDENTIAL');}}),opened=await independent.importPrivate(recovery.bytes,interaction);expect(await opened.snapshot()).toMatchObject({name:'Protected',protection:'image',money:[],originals:[]});independent.dispose();
});
it('refuses a canonically sealed source/header owner mismatch before writing local custody',async()=>{
 const f=await storageFixture(),{createVaultStore}=await import('../src/receiz/vault/store'),{createImageVault}=await import('../src/receiz/vault/carrier'),{createVaultNoteSource,encodeVaultNoteSource}=await import('../src/receiz/vault/note-source'),{exportNoteVaultPrivateImage}=await import('../src/receiz/vault/export');
 const id=crypto.randomUUID(),source=createVaultNoteSource({id,name:'Mismatch',owner}),carrier=createImageVault(encodeVaultNoteSource(source),{id,owner:{...owner,receizId:'different-owner'}}),file=await exportNoteVaultPrivateImage(carrier,{name:'Mismatch',kaiUPulse:'15028607000000',holdings:0},images),store=createVaultStore('test-owner-mismatch'),save=vi.spyOn(store,'save'),manager=f.module.createNoteVaultManager({images,store});
 await expect(manager.importPrivate(file.bytes,interaction)).rejects.toThrow('VAULT_OWNER_MISMATCH');expect(save).not.toHaveBeenCalled();expect(await store.list(owner.keyId)).toEqual([]);manager.dispose();f.manager.dispose();
});
it('does not infer Note value from a damaged carried financial proof',async()=>{
 const f=await storageFixture(),s=await f.manager.create({name:'Exact Note'},interaction),bad=noteBytes();bad[Math.floor(bad.length/2)]^=1;await expect(s.addNote(bad)).rejects.toThrow();expect((await s.snapshot()).money).toEqual([]);f.manager.dispose();
});

it('locks a page-hidden visit without poisoning the retained manager after BFCache return',async()=>{
 const target=new EventTarget();vi.stubGlobal('window',target);const f=await storageFixture(),s=await f.manager.create({name:'Return'},interaction),id=(await s.snapshot()).id;target.dispatchEvent(new Event('pagehide'));await expect(s.snapshot()).rejects.toThrow('VAULT_CLOSED');expect(await f.manager.list()).toHaveLength(1);const reopened=await f.manager.open(id,interaction);expect((await reopened.snapshot()).id).toBe(id);f.manager.dispose();
});
it('aborts an unfinished hidden creation before it can write a carrier',async()=>{
 const target=new EventTarget();vi.stubGlobal('window',target);const f=await storageFixture();let release!:(approved:boolean)=>void,entered!:()=>void;const waiting=new Promise<void>(resolve=>{entered=resolve;});
 const creating=f.manager.create({name:'No late write'},{...interaction,review:()=>{entered();return new Promise<boolean>(resolve=>{release=resolve;});}});await waiting;target.dispatchEvent(new Event('pagehide'));release(true);await expect(creating).rejects.toThrow('VAULT_CLOSED');expect(await f.manager.list()).toEqual([]);f.manager.dispose();
});
it('exports the new append head while an older image is still being prepared',async()=>{
 const f=await storageFixture();let release!:()=>void,entered!:()=>void;const waiting=new Promise<void>(resolve=>{entered=resolve;});let renders=0;
 const ports={...images,render:async()=>{if(++renders===1){entered();await new Promise<void>(resolve=>{release=resolve;});}return png;}},manager=f.module.createNoteVaultManager({owner,images:ports,admission:{inspectNote:f.inspectNote}}),s=await manager.create({name:'Current image'},interaction),old=s.exportPrivate();await waiting;await s.addNote(noteBytes());const fresh=await s.exportPrivate();release();expect((await old).bytes).not.toEqual(fresh.bytes);const opened=await manager.importPrivate(fresh.bytes,interaction);expect((await opened.snapshot()).money).toHaveLength(1);manager.dispose();f.manager.dispose();
});

it('opens the selected recovery beside an intact encrypted primary without overwriting it or granting mutations',async()=>{
 const f=await storageFixture(),{createVaultStore}=await import('../src/receiz/vault/store'),store=createVaultStore('recovery-beside-primary'),pair=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},false,['sign','verify']),encode=(b:Uint8Array)=>Buffer.from(b).toString('base64url'),manager=f.module.createNoteVaultManager({owner,images,store,admission:{inspectNote:f.inspectNote},register:async()=>({id:encode(new Uint8Array([1,2,3])),publicKeySpki:encode(new Uint8Array(await crypto.subtle.exportKey('spki',pair.publicKey))),rpId:'bankeiz.com',origin:'https://bankeiz.com'}),presence:async()=>({secret:new Uint8Array(32).fill(7),assertion:{credentialId:'',authenticatorData:'',clientDataJSON:'',signature:''},challenge:'',actionDigest:''})}),session=await manager.create({name:'Private recovery',protection:'passkey'},interaction);
 await session.addNote(noteBytes());const id=(await session.snapshot()).id,primary=await store.load(owner.keyId,id),recovery=await session.exportRecovery();manager.dispose();
 const offline=f.module.createNoteVaultManager({images,store,admission:{inspectNote:f.inspectNote},presence:async()=>{throw Error('NO_CREDENTIAL');}}),opened=await offline.importPrivate(recovery.bytes,interaction);expect(await opened.snapshot()).toMatchObject({readOnly:true,protection:'image'});expect((await opened.exportNote(metadata.noteId)).bytes).toEqual(noteBytes());expect((await opened.exportPrivate()).bytes).toEqual(recovery.bytes);await expect(opened.addNote(noteBytes())).rejects.toThrow('VAULT_READ_ONLY');await expect(opened.addOriginal(new Uint8Array([1]),'not-added')).rejects.toThrow('VAULT_READ_ONLY');expect(await store.load(owner.keyId,id)).toEqual(primary);offline.dispose();f.manager.dispose();
});

it('uses the store atomic compare-and-swap once without reloading held history or writing duplicate appends',async()=>{
 const f=await storageFixture(),{createVaultStore}=await import('../src/receiz/vault/store'),store=createVaultStore('single-cas'),load=vi.spyOn(store,'load'),save=vi.spyOn(store,'save'),manager=f.module.createNoteVaultManager({owner,images,store,admission:{inspectNote:f.inspectNote}}),a=await manager.create({name:'One CAS'},interaction),b=await manager.open((await a.snapshot()).id,interaction);load.mockClear();save.mockClear();
 await a.addNote(noteBytes());expect(load).not.toHaveBeenCalled();expect(save).toHaveBeenCalledOnce();await a.addNote(noteBytes());expect(load).not.toHaveBeenCalled();expect(save).toHaveBeenCalledOnce();await expect(b.addNote(noteBytes())).rejects.toThrow('VAULT_STORAGE_CONFLICT');expect((await a.snapshot()).money).toHaveLength(1);expect((await b.snapshot()).money).toHaveLength(0);manager.dispose();f.manager.dispose();
});

it('does not revive an old opening when pagehide happens during the local store read',async()=>{
 const target=new EventTarget();vi.stubGlobal('window',target);const f=await storageFixture(),{createVaultStore}=await import('../src/receiz/vault/store'),store=createVaultStore('opening-lifetime'),manager=f.module.createNoteVaultManager({owner,images,store}),s=await manager.create({name:'Open lifetime'},interaction),id=(await s.snapshot()).id,original=store.load;let release!:()=>void,entered!:()=>void;const waiting=new Promise<void>(resolve=>{entered=resolve;});
 store.load=async(...args)=>{entered();await new Promise<void>(resolve=>{release=resolve;});return original(...args);};const opening=manager.open(id,interaction);await waiting;target.dispatchEvent(new Event('pagehide'));release();await expect(opening).rejects.toThrow('VAULT_CLOSED');store.load=original;expect((await(await manager.open(id,interaction)).snapshot()).id).toBe(id);manager.dispose();f.manager.dispose();
});
