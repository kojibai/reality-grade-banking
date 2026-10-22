import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {beforeAll,expect,it} from 'vitest';
import {insertPngTextChunks} from '../native/receiz/app/utils/pngChunks';
// @ts-expect-error Generated native module is typed through application ports.
import * as native from '../public/native/offline-notes.v129.mjs';
import {inspectLegacyReceivingCommitment,type LegacyNoteReceivingVerifier} from '../src/receiz/note-proof-portability';
import {holdsLegacyNoteReceivingCustody,validateNativeNoteDeposit} from '../src/receiz/native-note-deposit';
import {createLocalNoteInventory} from '../src/receiz/note-local-inventory';
import type {BankNoteInspection} from '../src/receiz/offline-notes';
import {legacyNoteReceiver} from './helpers/legacy-note-receiver';
const fixture=new URL('./fixtures/note-account-deposit/',import.meta.url),metadata=JSON.parse(readFileSync(new URL('metadata.json',fixture),'utf8'));
const terminal=JSON.parse(gunzipSync(readFileSync(new URL('terminal.receiz.json.gz.bin',fixture))).toString('utf8'));
const funded=terminal.fundedSource;
const commitment='c7f1745306c73685d655dbda6abbb0c44088307834869deeba5992d3e41eb3e7';
let verifier:LegacyNoteReceivingVerifier,image:Uint8Array;
beforeAll(async()=>{
 verifier=await legacyNoteReceiver(metadata.roots);
 image=insertPngTextChunks(new Uint8Array(readFileSync(new URL('../public/icon-192.png',import.meta.url))),[{keyword:'receiz.bank.offline-note.v1',text:JSON.stringify({schema:'receiz.bank.note-image-transport.v1',wire:await native.packBankNoteBytes(new TextEncoder().encode(JSON.stringify(funded)))})}]);
},30000);
const inspect=(bytes:Uint8Array)=>inspectLegacyReceivingCommitment(bytes,async()=>verifier);
function input(overrides:Record<string,unknown>={}){
 const keyId='a'.repeat(64),uid='active-account';
 return{image,uid,keyId,inspectCommitment:inspect,read:async()=>({schema:'receiz.bank.offline-notes-device.v1',keyId,uid,create:null,notes:{},deposits:{},receivers:{[commitment]:`bank-receive:${keyId}:11111111-1111-4111-8111-111111111111`}as Record<string,string>,...overrides})};
}
it('opens complete canonical legacy source and projects its receiving commitment from a real opaque handle',async()=>{
 expect(await inspect(image)).toBe(commitment);
 expect(()=>verifier.inspectReserveNote({receivingCustodyCommitmentDigest:commitment})).toThrow('BANK_NOTE_SOURCE_CUSTODY_REQUIRED');
},30000);
it('preserves an incoming legacy Note held only in the active encrypted receiving map',async()=>{
 expect(await holdsLegacyNoteReceivingCustody(input())).toBe(true);
},30000);
it.each(['schema','uid','keyId'])('refuses a foreign legacy checkpoint %s',async field=>{
 await expect(holdsLegacyNoteReceivingCustody(input({[field]:'foreign'}))).rejects.toThrow('BANK_NOTE_IDENTITY_CHANGED');
});
it.each(['bank-receive:foreign:11111111-1111-4111-8111-111111111111','bank-receive:'+ 'a'.repeat(64)+':not-a-uuid'])('refuses a receiver slot outside the active key and exact slot format',async slot=>{
 expect(await holdsLegacyNoteReceivingCustody(input({receivers:{[commitment]:slot}}))).toBe(false);
});
it('refuses a different receiving commitment while admitting the complete source',async()=>{
 expect(await holdsLegacyNoteReceivingCustody(input({receivers:{['b'.repeat(64)]:`bank-receive:${'a'.repeat(64)}:11111111-1111-4111-8111-111111111111`}}))).toBe(false);
},30000);
it('never treats an edited carried commitment as receiving authority',async()=>{
 const changed=structuredClone(funded),artifact=JSON.parse(Buffer.from(changed.noteArtifacts.at(-1),'base64url').toString('utf8'));
 artifact.settlement.packet.currentCustody.receivingCustodyCommitmentDigest='b'.repeat(64);changed.noteArtifacts[changed.noteArtifacts.length-1]=Buffer.from(JSON.stringify(artifact)).toString('base64url');
 const forged=insertPngTextChunks(new Uint8Array(readFileSync(new URL('../public/icon-192.png',import.meta.url))),[{keyword:'receiz.bank.offline-note.v1',text:JSON.stringify({schema:'receiz.bank.note-image-transport.v1',wire:await native.packBankNoteBytes(new TextEncoder().encode(JSON.stringify(changed)))})}]);
 await expect(holdsLegacyNoteReceivingCustody({...input(),image:forged})).rejects.toThrow();
},30000);

it('admits the canonical legacy receiving map through checkout preflight with no outgoing saved Note',async()=>{
 const held=input(),state=await held.read(),read=async()=>state;
 const inspectLegacy=async(source:Uint8Array)=>verifier.inspectReserveNote(await verifier.openReserveNoteImage(source))as unknown as BankNoteInspection;
 const inventory=createLocalNoteInventory({keyId:held.keyId,uid:()=>held.uid,readLegacy:read,readPrepared:async()=>null,restore:async()=>{throw Error('NO_SAVED_OUTGOING_IMAGE');},inspect:inspectLegacy,assertOpen(){}});
 const value={image,module:native,context:{receiverUserId:held.uid,receiverKeyId:held.keyId},connected:{holdsFundingSource:async()=>{throw Error('CONNECTED_CUSTODY_MUST_NOT_RUN');}},savedNotes:()=>inventory.savedNotes(),inspectLegacy,holdsLegacyReceivingCustody:(source:Uint8Array)=>holdsLegacyNoteReceivingCustody({...held,image:source,read})};
 expect(await inventory.savedNotes()).toEqual([]);
 await expect(validateNativeNoteDeposit(value)).resolves.toBeUndefined();
 state.receivers={};
 await expect(validateNativeNoteDeposit(value)).rejects.toThrow('BANK_NOTE_RECEIVING_CUSTODY_REQUIRED');
},30000);
it('does not load a receiver verifier when no qualified legacy receiving slot is retained',async()=>{
 expect(await holdsLegacyNoteReceivingCustody({...input({receivers:{}}),inspectCommitment:async()=>{throw Error('UNNECESSARY_VERIFIER_LOAD');}})).toBe(false);
});
