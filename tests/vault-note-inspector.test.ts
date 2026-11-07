import {beforeAll,expect,it,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {conformanceOfflineFixture} from './helpers/conformance-offline-sealer';
import {inspectVaultOriginal,openVaultOriginalSources,recoverVaultOriginalSources} from '../src/receiz/vault/inspect';
import {appendVaultNote,appendVaultOriginal,createVaultNoteSource,encodeVaultNoteSource} from '../src/receiz/vault/note-source';
import {createImageVault} from '../src/receiz/vault/carrier';
import {createVaultHeader,encryptVaultBytes} from '../src/receiz/vault/encryption';
import {exportNoteVaultPrivateImage,type VaultImagePorts} from '../src/receiz/vault/export';
import {openConnectedNoteDelivery} from '../src/receiz/note-delivery';
import {vaultBytes} from '../src/receiz/vault/encoding';
import type {ConnectedNoteModule} from '../src/receiz/connected-note-application';
import type {ReceizSignatureV4RootPublicKey} from '../node_modules/@receiz/sdk/dist/verifier/signatureV4';
// @ts-expect-error Generated native module is typed through the application port.
import * as native from '../public/native/offline-notes.v129.mjs';
const canonical=vi.hoisted(()=>({runtime:null as any}));
// Explicit ephemeral fixture roots bind both genuine funded Note delivery and
// owned Original admission. The unchanged SDK cryptographic guards still run.
vi.mock('@receiz/sdk',async original=>{
 const sdk=await original<typeof import('@receiz/sdk')>(),{verifyReceizArtifactWithCanonicalRoots}=await import('../node_modules/@receiz/sdk/dist/artifactVerification.js');
 return{...sdk,verifyReceizArtifact:async(input:Parameters<typeof sdk.verifyReceizArtifact>[0])=>verifyReceizArtifactWithCanonicalRoots(input,roots)};
});
vi.mock('../src/receiz/client',async()=>({loadReceiz:async()=>{
 const sdk=await import('@receiz/sdk');return{...sdk,createReceizClient:(options:unknown)=>canonical.runtime.createReceizClient(options)};
}}));
const base=new URL('./fixtures/connected-note-delivery/',import.meta.url),metadata=JSON.parse(readFileSync(new URL('metadata.json',base),'utf8'));
const roots=new Map<string,ReceizSignatureV4RootPublicKey>(metadata.roots.map((root:ReceizSignatureV4RootPublicKey)=>[root.kid,root]));
const bytes=(name:string)=>new Uint8Array(gunzipSync(readFileSync(new URL(name+'.gz',base))));
const module={...native,readBankConnectedNoteImage:(b:Uint8Array)=>native.readBankConnectedNoteImage(b,{roots}),readBankConnectedNoteSource:(b:Uint8Array)=>native.readBankConnectedNoteSource(b,{roots})}as ConnectedNoteModule;
const png=Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aF0sAAAAASUVORK5CYII=','base64'));
const id='10000000-0000-4000-8000-000000000001';
let owner:{keyId:string;receizId:string},original:Uint8Array,imagePorts:VaultImagePorts;
beforeAll(async()=>{
 const f=await conformanceOfflineFixture({account:true});canonical.runtime=f.runtime;
 const verified=await f.runtime.verifyReceizArtifact(f.identity.bytes),admission=await f.runtime.createReceizArtifactAdmissionEngine()(verified,{profile:'identity',identityPassphrase:f.identity.phrase}),binding=await f.runtime.readReceizIdentityPublicBinding(admission);
 owner={keyId:binding.keyId,receizId:binding.artifactOwnerReceizId};
 const sealer=f.runtime.offline.createReceizOfflineSealer({ownerIdentityAdmission:admission,store:f.store,resources:f.resources,fetch:async()=>{throw Error('NO_NETWORK');}});
 original=new Uint8Array((await sealer.seal({bytes:new TextEncoder().encode('A complete owned Original, retained for independent offline recovery.'),filename:'field-notes.txt',mimeType:'text/plain'})).artifactBytes);
 imagePorts={render:async()=>png,seal:async input=>{const result=await sealer.seal(input);return{artifactBytes:new Uint8Array(result.artifactBytes)};},verify:async value=>(await f.runtime.verifyReceizArtifact(value)).status==='verified-artifact'};
},60000);
const notePorts={async inspectNote(input:Uint8Array){
 const delivery=await openConnectedNoteDelivery({native:module,bytes:input});
 if(delivery.source.kind==='funding'&&!delivery.noteIdentity)throw Error('VAULT_NOTE_AUTHORITY_REQUIRED');
 return{noteId:delivery.source.noteId,rail:delivery.source.rail,amountUsdCents:delivery.source.amountUsdCents,amountPhiMicro:delivery.source.amountPhiMicro};
}};
async function image(source:ReturnType<typeof createVaultNoteSource>){return exportNoteVaultPrivateImage(createImageVault(encodeVaultNoteSource(source),{id,owner}),{name:source.name,kaiUPulse:'15000000000000',holdings:source.notes.length+source.originals.sources.length},imagePorts);}
it('independently opens a genuine sealed Vault with complete funded Note authority and an owned Original, offline',async()=>{
 const fetch=vi.spyOn(globalThis,'fetch').mockRejectedValue(Error('NETWORK_FORBIDDEN'));
 try{
  let source=await appendVaultNote(createVaultNoteSource({id,name:'Private reserve',owner}),{bytes:bytes('note.png'),filename:'funded-note.png'});
  source=await appendVaultOriginal(source,{bytes:original,filename:'field-notes.receized.txt'});
  const saved=await image(source),opened=await openVaultOriginalSources(saved.bytes,{verifyOuter:imagePorts.verify,notes:notePorts}),result=opened.inspection;
  expect(result).toMatchObject({kind:'note-private',verified:true,grantsAccess:false,currentUnspentness:false,record:{vaultId:id,name:'Private reserve',ownerReceizId:owner.receizId,notes:[{noteId:metadata.noteId,filename:'funded-note.png'}],originals:[{filename:'field-notes.receized.txt'}]}});
  if(result.kind!=='note-private')throw Error('EXPECTED_NOTE_VAULT');
  expect(result.record.recordedNoteValueUsdCents).toBe(result.record.notes[0].amountUsdCents);
  expect(vaultBytes(source.notes[0].bytesB64u,32*1024*1024)).toEqual(bytes('note.png'));
  expect(vaultBytes(source.originals.sources[0].bytesB64u,32*1024*1024)).toEqual(original);
  expect(opened.sources).toMatchObject([{kind:'note',filename:'funded-note.png',bytes:bytes('note.png')},{kind:'owned-original',filename:'field-notes.receized.txt',bytes:original}]);
  expect(JSON.stringify(result)).not.toMatch(/privateKey|noteIdentity|bytesB64u|keyFileText|passphrase|sourceB64u|ciphertext/);
  expect(fetch).not.toHaveBeenCalled();
 }finally{fetch.mockRestore();}
});
it('refuses a valid outer carrier containing substituted Note authority or a corrupted owned Original',async()=>{
 const wrongNote=await appendVaultNote(createVaultNoteSource({id,name:'Authority boundary',owner}),{bytes:bytes('wrong-note-authority.png'),filename:'wrong-note.png'});
 await expect(inspectVaultOriginal((await image(wrongNote)).bytes,{verifyOuter:imagePorts.verify,notes:notePorts})).rejects.toThrow('AUTHORITY_MISMATCH');
 const corrupt=original.slice();corrupt[Math.floor(corrupt.length/2)]^=1;
 const wrongOriginal=await appendVaultOriginal(createVaultNoteSource({id,name:'Exact Original boundary',owner}),{bytes:corrupt,filename:'changed.receized.txt'});
 await expect(inspectVaultOriginal((await image(wrongOriginal)).bytes,{verifyOuter:imagePorts.verify,notes:notePorts})).rejects.toThrow();
});
it('keeps protected contents unopened and requires the included Note reader for unprotected contents',async()=>{
 const source=await appendVaultNote(createVaultNoteSource({id,name:'Optional protection',owner}),{bytes:bytes('note.png'),filename:'note.png'});
 const header=createVaultHeader({purpose:'vault-private',id,owner,credential:{id:'Y3JlZGVudGlhbA',publicKeySpki:'cHVibGlj',rpId:'bankeiz.com',origin:'https://bankeiz.com'}});
 const carrier=await encryptVaultBytes(encodeVaultNoteSource(source),header,new Uint8Array(32).fill(3));
 const protectedImage=await exportNoteVaultPrivateImage(carrier,{name:source.name,kaiUPulse:'15000000000000',holdings:1},imagePorts),inspectNote=vi.fn(notePorts.inspectNote);
 const result=await inspectVaultOriginal(protectedImage.bytes,{verifyOuter:imagePorts.verify,notes:{inspectNote}});
 expect(result).toMatchObject({kind:'protected-private',outerVerified:true,contentsVerified:false,passkeyRequired:true,verified:false});expect(inspectNote).not.toHaveBeenCalled();
 await expect(recoverVaultOriginalSources(protectedImage.bytes,{verifyOuter:imagePorts.verify,notes:notePorts})).rejects.toThrow('VAULT_PRESENCE_REQUIRED');
 await expect(inspectVaultOriginal((await image(source)).bytes,{verifyOuter:imagePorts.verify})).rejects.toThrow('VAULT_NOTE_READER_REQUIRED');
 await expect(inspectVaultOriginal((await image(source)).bytes,{verifyOuter:async()=>false,notes:notePorts})).rejects.toThrow('SEAL_INVALID');
});
