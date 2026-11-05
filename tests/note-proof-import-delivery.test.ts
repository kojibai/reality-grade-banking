import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {expect,it,vi} from 'vitest';
import {readNoteProofImport} from '../src/receiz/note-proof-portability';
import {openConnectedNoteDelivery} from '../src/receiz/note-delivery';
import type {ConnectedNoteModule} from '../src/receiz/connected-note-application';
import type {ReceizSignatureV4RootPublicKey} from '../node_modules/@receiz/sdk/dist/verifier/signatureV4';
// @ts-expect-error Generated native module is typed through the application port.
import * as native from '../public/native/offline-notes.v129.mjs';
// Same explicit ephemeral fixture-root policy as existing note-delivery tests;
// the complete, unchanged installed SDK verifier still checks the whole image.
vi.mock('@receiz/sdk',async original=>{
 const sdk=await original<typeof import('@receiz/sdk')>(),{verifyReceizArtifactWithCanonicalRoots}=await import('../node_modules/@receiz/sdk/dist/artifactVerification.js');
 return{...sdk,verifyReceizArtifact:async(input:Parameters<typeof sdk.verifyReceizArtifact>[0])=>verifyReceizArtifactWithCanonicalRoots(input,roots)};
});
const base=new URL('./fixtures/connected-note-delivery/',import.meta.url),metadata=JSON.parse(readFileSync(new URL('metadata.json',base),'utf8'));
const bytes=(name:string)=>new Uint8Array(gunzipSync(readFileSync(new URL(name+'.gz',base))));
const roots=new Map<string,ReceizSignatureV4RootPublicKey>(metadata.roots.map((root:ReceizSignatureV4RootPublicKey)=>[root.kid,root]));
const module={...native,readBankConnectedNoteImage:(b:Uint8Array)=>native.readBankConnectedNoteImage(b,{roots}),readBankConnectedNoteSource:(b:Uint8Array)=>native.readBankConnectedNoteSource(b,{roots})}as ConnectedNoteModule;
it('preserves the complete genuine delivered Note PNG and its mandatory canonical seal',async()=>{
 const original=bytes('note.png'),prepared=await readNoteProofImport(new File([original],'settlement-note.png',{type:'image/png'}));
 expect(prepared).toEqual(original);const opened=await openConnectedNoteDelivery({native:module,bytes:prepared});
 expect(opened.noteIdentity?.keyId).toBe(metadata.noteKeyId);expect(opened.source.terminalSourceBytes).toEqual(bytes('funding.receizbundle'));
});
it('keeps bare and substituted-authority PNGs subject to the unchanged full delivery refusal',async()=>{
 const bare=await readNoteProofImport(new File([bytes('bare.png')],'bare.png',{type:'image/png'}));
 await expect(openConnectedNoteDelivery({native:module,bytes:bare})).rejects.toThrow('BANK_NOTE_IMAGE_SEAL_INVALID');
 const wrong=await readNoteProofImport(new File([bytes('wrong-note-authority.png')],'wrong.png',{type:'image/png'}));
 await expect(openConnectedNoteDelivery({native:module,bytes:wrong})).rejects.toThrow('BANK_NOTE_DELIVERY_AUTHORITY_MISMATCH');
});
