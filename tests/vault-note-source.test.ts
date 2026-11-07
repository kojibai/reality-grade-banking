import {beforeAll,expect,it,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {conformanceOfflineFixture} from './helpers/conformance-offline-sealer';
import {admitVaultNoteSource,appendVaultNote,appendVaultOriginal,createVaultNoteSource,encodeVaultNoteSource,readVaultNoteSource} from '../src/receiz/vault/note-source';
import {vaultBytes,vaultDigest} from '../src/receiz/vault/encoding';
import {insertPngTextChunks} from '../native/receiz/app/utils/pngChunks';
import type {ReceizSignatureV4RootPublicKey} from '../node_modules/@receiz/sdk/dist/verifier/signatureV4';
const canonical=vi.hoisted(()=>({runtime:null as any,opens:0}));
// Use the unchanged real SDK opener under the explicit ephemeral fixture root
// policy. This wrapper counts opens; it does not replace an admission guard.
vi.mock('../src/receiz/client',async()=>({loadReceiz:async()=>{
 const sdk=await import('@receiz/sdk');return{...sdk,createReceizClient:(options:unknown)=>{
  const client=canonical.runtime.createReceizClient(options);return{artifacts:{verifyAndOpen:async(input:unknown)=>{canonical.opens++;return client.artifacts.verifyAndOpen(input);}}};
 }};
}}));
const nativeUrl=new URL('../public/native/offline-notes.v129.mjs',import.meta.url).href;
const native=await import(/* @vite-ignore */nativeUrl);
const base=new URL('./fixtures/connected-note/',import.meta.url),meta=JSON.parse(readFileSync(new URL('metadata.json',base),'utf8'));
const roots=new Map<string,ReceizSignatureV4RootPublicKey>(meta.issuerRootPublicKeys.map((root:ReceizSignatureV4RootPublicKey)=>[root.kid,root]));
const noteBytes=()=>new Uint8Array(gunzipSync(readFileSync(new URL('note.png.gz',base))));
const id='10000000-0000-4000-8000-000000000001';
let owner:{keyId:string;receizId:string},original:Uint8Array;
beforeAll(async()=>{
 const f=await conformanceOfflineFixture({account:true});canonical.runtime=f.runtime;
 const verified=await f.runtime.verifyReceizArtifact(f.identity.bytes),admission=await f.runtime.createReceizArtifactAdmissionEngine()(verified,{profile:'identity',identityPassphrase:f.identity.phrase}),binding=await f.runtime.readReceizIdentityPublicBinding(admission);
 owner={keyId:binding.keyId,receizId:binding.artifactOwnerReceizId};
 const sealer=f.runtime.offline.createReceizOfflineSealer({ownerIdentityAdmission:admission,store:f.store,resources:f.resources,fetch:async()=>{throw Error('NETWORK_FORBIDDEN');}});
 original=new Uint8Array((await sealer.seal({bytes:new TextEncoder().encode('An actual sealed Original held inside the private Vault.'),filename:'field-notes.txt',mimeType:'text/plain'})).artifactBytes);
},60000);
function ports(){
 const inspectNote=vi.fn(async(bytes:Uint8Array)=>{
  const note=await native.readBankConnectedNoteImage(bytes,{roots});return{noteId:note.noteId,rail:note.rail,amountUsdCents:note.amountUsdCents,amountPhiMicro:note.amountPhiMicro};
 });
 return{inspectNote};
}
it('creates an empty local container without an account, custody grant or network call',async()=>{
 const network=vi.spyOn(globalThis,'fetch').mockRejectedValue(Error('NO_NETWORK'));
 try{const source=createVaultNoteSource({id,name:'My reserve',owner}),p=ports(),admitted=await admitVaultNoteSource(await readVaultNoteSource(encodeVaultNoteSource(source)),p);
  expect(admitted.notes).toEqual([]);expect(admitted.originals).toEqual([]);expect(p.inspectNote).not.toHaveBeenCalled();expect(network).not.toHaveBeenCalled();expect(JSON.stringify(source)).not.toMatch(/privateKey|passphrase|custody|accountId|access_token/);
 }finally{network.mockRestore();}
});
it('holds exact genuine Originals and Notes, reopens offline, and reuses accepted rows for only-new appends',async()=>{
 const network=vi.spyOn(globalThis,'fetch').mockRejectedValue(Error('NO_NETWORK'));
 try{
  const p=ports();let source=await appendVaultOriginal(createVaultNoteSource({id,name:'Field work',owner}),{bytes:original,filename:'field-notes.receized.txt'});
  const before=canonical.opens;let projection=await admitVaultNoteSource(source,p);expect(projection.originals).toHaveLength(1);expect(canonical.opens-before).toBe(1);
  source=await appendVaultNote(source,{bytes:noteBytes(),filename:'reserve-note.png'});projection=await admitVaultNoteSource(source,p);
  expect(canonical.opens-before).toBe(1);expect(p.inspectNote).toHaveBeenCalledOnce();expect(projection.notes[0]).toMatchObject({noteId:meta.noteId,amountUsdCents:meta.amountUsdCents,amountPhiMicro:meta.amountPhiMicro});expect(projection.notes[0]).not.toHaveProperty('status');
  const same=await appendVaultNote(source,{bytes:noteBytes(),filename:'same-note.png'});expect(same).toBe(source);
  await admitVaultNoteSource(source,p);
  expect(canonical.opens-before).toBe(1);expect(p.inspectNote).toHaveBeenCalledOnce();
  const reopened=await readVaultNoteSource(encodeVaultNoteSource(source));await admitVaultNoteSource(reopened,p);expect(canonical.opens-before).toBe(2);expect(p.inspectNote).toHaveBeenCalledTimes(2);
  expect(vaultBytes(reopened.originals.sources[0].bytesB64u,32*1024*1024)).toEqual(original);expect(vaultBytes(reopened.notes[0].bytesB64u,32*1024*1024)).toEqual(noteBytes());expect(network).not.toHaveBeenCalled();
 }finally{network.mockRestore();}
});
it('refuses a changed file, canonical tampering with a repaired wrapper hash, wrong owner, and duplicate Note identity',async()=>{
 const p=ports();let source=await appendVaultOriginal(createVaultNoteSource({id,name:'Exact bytes',owner}),{bytes:original,filename:'original.receized.txt'});
 const changed=structuredClone(source);changed.originals.sources[0].bytesB64u='AQI';await expect(readVaultNoteSource(encodeVaultNoteSource(changed))).rejects.toThrow('SOURCE_CHANGED');
 const corrupt=original.slice();corrupt[Math.floor(corrupt.length/2)]^=1;
 const altered=await appendVaultOriginal(createVaultNoteSource({id,name:'Changed proof',owner}),{bytes:corrupt,filename:'altered.receized.txt'});await expect(admitVaultNoteSource(altered,p)).rejects.toThrow();
 const foreign=await appendVaultOriginal(createVaultNoteSource({id,name:'Wrong owner',owner:{keyId:'f'.repeat(64),receizId:'another.receiz.id'}}),{bytes:original,filename:'original.receized.txt'});await expect(admitVaultNoteSource(foreign,p)).rejects.toThrow('different Receiz identity');
 source=await appendVaultNote(createVaultNoteSource({id,name:'One Note',owner}),{bytes:noteBytes(),filename:'note.png'});
 const sameFunding=insertPngTextChunks(noteBytes(),[{keyword:'Comment',text:'A different carrier of the same genuine Note source.'}]);expect(await vaultDigest(sameFunding)).not.toBe(source.notes[0].sha256);
 source=await appendVaultNote(source,{bytes:sameFunding,filename:'same-funding.png'});await expect(admitVaultNoteSource(source,p)).rejects.toThrow('NOTE_DUPLICATE');
});
it('does not reuse Note admission under a different inspector or admit extra execution/access metadata',async()=>{
 const p=ports();let source=await appendVaultNote(createVaultNoteSource({id,name:'Admission boundary',owner}),{bytes:noteBytes(),filename:'note.png'});await admitVaultNoteSource(source,p);
 await expect(admitVaultNoteSource(source,{inspectNote:async()=>{throw Error('RECEIVING_POLICY_REFUSED');}})).rejects.toThrow('RECEIVING_POLICY_REFUSED');
 const captured=structuredClone(source);(captured as Record<string,unknown>).access_token='a secret';await expect(readVaultNoteSource(encodeVaultNoteSource(captured))).rejects.toThrow('FORMAT_INVALID');
 const claim=structuredClone(source);(claim.notes[0] as Record<string,unknown>).deposit={status:'confirmed'};await expect(readVaultNoteSource(encodeVaultNoteSource(claim))).rejects.toThrow('FORMAT_INVALID');
});
