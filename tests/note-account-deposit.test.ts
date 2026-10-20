import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {expect,it} from 'vitest';
import {insertPngTextChunks} from '../native/receiz/app/utils/pngChunks';
// @ts-expect-error Generated, typed through the application port.
import * as notes from '../public/native/offline-notes.v129.mjs';
const fixture=new URL('./fixtures/note-account-deposit/',import.meta.url);
const metadata=JSON.parse(readFileSync(new URL('metadata.json',fixture),'utf8'));
const terminal=new Uint8Array(gunzipSync(readFileSync(new URL('terminal.receiz.json.gz.bin',fixture))));
const credit=JSON.parse(gunzipSync(readFileSync(new URL('credit.json.gz.bin',fixture))).toString('utf8'));
const context={receiverUserId:metadata.receiverUserId,receiverKeyId:metadata.receiverKeyId,roots:new Map(metadata.roots.map((r:{kid:string})=>[r.kid,r]))};

it('verifies a sender-consumed deposit for a receiver with no qualified custody',async()=>{
 expect(typeof notes.openBankNoteAccountDeposit).toBe('function');
 const held=await notes.openBankNoteAccountDeposit(terminal,context);
 expect(held.noteId).toBe(metadata.noteId);expect(held.amountUsdCents).toBe('200');expect(held.amountPhiMicro).toBe('1000000');
 expect(held.receiverUserId).toBe(metadata.receiverUserId);expect(metadata.receiverCustodyCreated).toBe(false);
 expect(held.terminalSourceBytes).toEqual(terminal);
 await expect(notes.openBankNoteAccountDeposit(terminal,{...context,receiverKeyId:'a'.repeat(64)})).rejects.toThrow('BANK_NOTE_IDENTITY_BINDING_REQUIRED');
 await expect(notes.openBankNoteAccountDeposit(terminal,{...context,roots:new Map()})).rejects.toThrow();
 const edited=JSON.parse(new TextDecoder().decode(terminal));edited.terminalArtifactBytes=edited.terminalArtifactBytes.slice(0,-4)+'AAAA';
 await expect(notes.openBankNoteAccountDeposit(new TextEncoder().encode(JSON.stringify(edited)),context)).rejects.toThrow();
},30000);

it('preserves the full terminal proof in the original PNG and admits it again',async()=>{
 expect(typeof notes.exportBankNoteAccountDepositImage).toBe('function');
 const artwork=new Uint8Array(readFileSync(new URL('../public/icon-192.png',import.meta.url)));
 const png=await notes.exportBankNoteAccountDepositImage(terminal,artwork,context);
 const opened=await notes.openBankNoteAccountDeposit(png,context);
 expect(opened.terminalSourceBytes).toEqual(terminal);expect(opened.noteId).toBe(metadata.noteId);
},30000);

it('reopens native credit before accepting a connected reconciliation and binds it to the exact original',async()=>{
 expect(typeof notes.verifyBankNoteAccountDepositCredit).toBe('function');
 const result=await notes.verifyBankNoteAccountDepositCredit({artifactBytes:credit.artifactBytes,privateCashSnapshot:credit.privateCashSnapshot},terminal,context);
 expect(result.noteId).toBe(metadata.noteId);expect(result.reserveAfterUsdCents).toBe('200');expect(result.amountUsdCents).toBe('200');
 await expect(notes.verifyBankNoteAccountDepositCredit({artifactBytes:credit.artifactBytes,privateCashSnapshot:Buffer.from('{}').toString('base64url')},terminal,context)).rejects.toThrow();
 await expect(notes.verifyBankNoteAccountDepositCredit({ok:true,noteId:metadata.noteId,amountUsdCents:'200'},terminal,context)).rejects.toThrow();
},30000);

it('snapshots the root policy before asynchronous admission so a caller cannot substitute it in flight',async()=>{
 const roots=new Map();
 const opening=notes.openBankNoteAccountDeposit(terminal,{...context,roots});
 for(const [kid,value]of context.roots)roots.set(kid,value);
 expect(await opening.then(()=>false,()=>true)).toBe(true);
 await expect(notes.openBankNoteAccountDeposit(terminal,{...context,roots:new Map()})).rejects.toThrow();
 expect((await notes.openBankNoteAccountDeposit(terminal,context)).noteId).toBe(metadata.noteId);
},30000);


it('reopens a retained expanded terminal above the PNG carrier limit without losing its source',async()=>{
 const expanded=new Uint8Array(8*1024*1024+1);expanded.fill(32);expanded.set(terminal);
 const artwork=new Uint8Array(readFileSync(new URL('../public/icon-192.png',import.meta.url)));
 const image=insertPngTextChunks(artwork,[{keyword:'receiz.bank.offline-note.v1',text:JSON.stringify({schema:'receiz.bank.note-account-deposit-image.v1',terminalWire:await notes.packBankNoteBytes(expanded)})}]);
 expect(image.length).toBeLessThan(8*1024*1024);
 const carried=await notes.openBankNoteAccountDeposit(image,context);
 expect(carried.terminalSourceBytes.length).toBe(expanded.length);
 expect(await notes.openBankNoteAccountDeposit(carried.terminalSourceBytes,context).then((value:any)=>value.noteId,()=>null)).toBe(metadata.noteId);
},30000);

it('independently reopens a complete exported credit receipt above the legacy four MiB cap',async()=>{
 const expanded=new Uint8Array(terminal.length+8*1024*1024);expanded.set(terminal);
 const whitespace=[9,10,13,32];let seed=0x6d2b79f5;
 for(let i=terminal.length;i<expanded.length;i++){seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;expanded[i]=whitespace[(seed>>>0)%4];}
 const result=await notes.verifyBankNoteAccountDepositCredit(credit,expanded,context);
 expect(result.proofBytes.length).toBeGreaterThan(4*1024*1024);
 expect(typeof notes.openBankNoteDepositReceipt).toBe('function');
 expect(await notes.openBankNoteDepositReceipt(result.proofBytes,{roots:context.roots}).then((value:any)=>value.credit.noteId)).toBe(metadata.noteId);
},30000);

it('submits a compact lossless terminal while retaining the exact larger incoming original',async()=>{
 const expanded=new Uint8Array(terminal.length+8*1024*1024);expanded.set(terminal);
 const whitespace=[9,10,13,32];let seed=0x6d2b79f5;
 for(let i=terminal.length;i<expanded.length;i++){seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;expanded[i]=whitespace[(seed>>>0)%4];}
 expect((await notes.packBankNoteBytes(expanded)).length).toBeGreaterThan(4*1024*1024);
 expect(typeof notes.prepareBankNoteAccountDepositSubmission).toBe('function');
 const body=await notes.prepareBankNoteAccountDepositSubmission(expanded,context);
 expect(new TextEncoder().encode(JSON.stringify(body)).length).toBeLessThan(4*1024*1024);
 const reopened=await notes.openBankNoteAccountDeposit(await notes.unpackBankNoteBytes(body.terminalArtifactBytes),context);
 const original=await notes.openBankNoteAccountDeposit(expanded,context);
 expect(reopened.terminalArtifactSha256).toBe(original.terminalArtifactSha256);expect(reopened.redemptionDigest).toBe(original.redemptionDigest);
 expect(original.terminalSourceBytes.length).toBe(expanded.length);
},30000);

it('normalizes decoder-accepted base64 transport whitespace without changing any signed funding bytes',async()=>{
 const source=JSON.parse(new TextDecoder().decode(terminal));
 const whitespace=[9,10,13,32],padding=new Uint8Array(8*1024*1024);let seed=0x6d2b79f5;
 for(let i=0;i<padding.length;i++){seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;padding[i]=whitespace[(seed>>>0)%4];}
 source.fundedSource.fundingArtifactBytes+=new TextDecoder().decode(padding);
 const expanded=new TextEncoder().encode(JSON.stringify(source));
 expect((await notes.openBankNoteAccountDeposit(expanded,context)).noteId).toBe(metadata.noteId);
 const body=await notes.prepareBankNoteAccountDepositSubmission(expanded,context);
 expect(new TextEncoder().encode(JSON.stringify(body)).length).toBeLessThan(4*1024*1024);
 expect((await notes.openBankNoteAccountDeposit(await notes.unpackBankNoteBytes(body.terminalArtifactBytes),context)).terminalArtifactSha256).toBe((await notes.openBankNoteAccountDeposit(terminal,context)).terminalArtifactSha256);
},30000);
