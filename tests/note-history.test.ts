import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {expect,it,vi} from 'vitest';
import {createNoteHistoryReader,readRetainedNoteHistory} from '../src/receiz/note-history';
import {ledgerRecordTitle} from '../src/receiz/ledger-payment-records';
import {mergePublicRecords,parsePublicNetworkPage} from '../src/receiz/public-network';
// @ts-expect-error Pinned generated native verifier, exercised with isolated roots.
import * as native from '../public/native/offline-notes.v129.mjs';

const bytes=(value:unknown)=>new TextEncoder().encode(JSON.stringify(value));
function fixture(rail:'reserve'|'settlement'|'composite'){
 const uid='11111111-1111-4111-8111-111111111111',keyId='a'.repeat(64),noteId='22222222-2222-4222-8222-222222222222' as const,operationId='b'.repeat(64),debit='33333333-3333-4333-8333-333333333333',credit='44444444-4444-4444-8444-444444444444';
 const blobs=new Map<string,Uint8Array>(),retain=(value:unknown)=>{const source=bytes(value),ref=createHash('sha256').update(source).digest('hex');blobs.set(ref,source);return ref;};
 const sourceRef=retain({source:'native signed funding'}),openingRef=retain({source:'native private opening'}),proofRef=retain({schema:'receiz.bank.connected-note.receipt.v1',source:'credit',privateAccountOpening:'opening'});
 const fundingParts=rail==='composite'?{reserve:{amountUsdCents:'100',amountPhiMicro:'500000'},settlement:{amountUsdCents:'100',amountPhiMicro:'500000'}}:undefined;
 const funding={noteId,operationId,accountUserId:uid,issuer:{keyId},rail,amountUsdCents:'200',amountPhiMicro:'1000000',fundedAtKai:'100',debitLedgerId:debit,...(fundingParts?{fundingParts}:{})};
 const credited={noteId,operationId,receiverUserId:uid,receiverKeyId:keyId,rail,amountUsdCents:'200',amountPhiMicro:'1000000',acceptedAtKai:'101',creditLedgerId:credit,...(fundingParts?{fundingParts}:{})};
 const creditRef=retain({noteId,rail,amountUsdCents:'200',amountPhiMicro:'1000000',reserveAfterUsdCents:'400',proofRef,...(fundingParts?{fundingParts}:{})});
 const connected={schema:'bank.connected-notes.v1',uid,keyId,current:null,notes:{[noteId]:{noteId,operationId,rail,amountUsdCents:'200',authorizationRef:'c'.repeat(64),noteIdentityRef:'d'.repeat(64),phase:'issued',sourceRef,openingRef}}};
 const received={schema:'bank.received-note-deposits.v1',uid,keyId,entries:{[noteId]:{sourceRef,redemptionDigest:'e'.repeat(64),terminalArtifactSha256:'f'.repeat(64),status:'confirmed',creditRef}}};
 const module={verifyBankConnectedNoteFunding:async()=>({funding}),verifyBankConnectedNoteReceipt:async()=>({kind:'credit',rail,credit:credited,funding}),openBankNoteDepositReceipt:async()=>{throw Error('WRONG_FORMAT');}};
 return{uid,keyId,noteId,debit,credit,connected,received,funding,credited,blobs,input:{accountUid:uid,keyId,readConnected:async()=>structuredClone(connected),readReceived:async()=>structuredClone(received),restore:async(ref:string)=>blobs.get(ref)!.slice(),module:async()=>module}};
}
it.each(['reserve','settlement','composite'] as const)('projects confirmed %s Note debit and credit by their exact native ledger IDs without transport',async rail=>{
 const f=fixture(rail),fetch=vi.fn();vi.stubGlobal('fetch',fetch);
 try{
  const records=await readRetainedNoteHistory(f.input);
  expect(records.map(row=>row.sourceId)).toEqual([`wallet_ledger:${f.credit}`,`wallet_ledger:${f.debit}`]);
  expect(records.map(row=>row.accountFlow)).toEqual(['in','out']);
  expect(records.map(ledgerRecordTitle)).toEqual(['Note Deposited','Note Created']);
  expect(records[0].time).toBe('2024-05-10T06:54:30.731Z');
  expect(records[0].details?.noteReceipt).toMatchObject({creditLedgerId:f.credit,acceptedAtKai:'101',debitLedgerId:f.debit,fundedAtKai:'100',operationId:f.funding.operationId});
  expect(records.every(row=>row.authority==='account-source-projection'&&row.origin==='private-account')).toBe(true);
  const host=parsePublicNetworkPage('wallet',{ok:true,events:[{id:`wallet_ledger:${f.credit}`,kind:'wallet_ledger_entry',ledgerEntryKind:'note_claim',amountUsdCents:'200',pulse:'101'}]}).records.map(row=>({...row,authority:'account-source-projection' as const}));
  expect(mergePublicRecords(records,host)).toHaveLength(2);
  expect(fetch).not.toHaveBeenCalled();
 }finally{vi.unstubAllGlobals();}
});
it('reuses admission for the exact same retained sources and can reuse a live verified receipt',async()=>{
 const f=fixture('reserve'),native=await f.input.module(),verifyFunding=vi.fn(native.verifyBankConnectedNoteFunding),verifyCredit=vi.fn(native.verifyBankConnectedNoteReceipt);
 const reader=createNoteHistoryReader({...f.input,module:async()=>({...native,verifyBankConnectedNoteFunding:verifyFunding,verifyBankConnectedNoteReceipt:verifyCredit})});
 const source=f.blobs.get(f.connected.notes[f.noteId].sourceRef)!,opening=f.blobs.get(f.connected.notes[f.noteId].openingRef)!;
 await reader.rememberFunding(source,opening,{funding:f.funding});
 await reader.read();await reader.read();
 expect(verifyFunding).not.toHaveBeenCalled();expect(verifyCredit).toHaveBeenCalledOnce();
});
it('never calls pending or submitted Notes a deposit and opens no native module for empty checkpoints',async()=>{
 const f=fixture('settlement');f.received.entries[f.noteId].status='received';delete (f.received.entries[f.noteId] as {creditRef?:string}).creditRef;
 f.connected.notes[f.noteId].phase='submitted';delete (f.connected.notes[f.noteId] as {sourceRef?:string}).sourceRef;delete (f.connected.notes[f.noteId] as {openingRef?:string}).openingRef;
 const module=vi.fn(f.input.module);
 expect(await readRetainedNoteHistory({...f.input,module})).toEqual([]);
 expect(module).not.toHaveBeenCalled();
});
it('refuses a foreign verified credit and a changed retained source before producing a history row',async()=>{
 const f=fixture('reserve');f.credited.receiverUserId='other';
 await expect(readRetainedNoteHistory(f.input)).rejects.toThrow('BANK_NOTE_HISTORY_BINDING_MISMATCH');
 const g=fixture('reserve');g.blobs.set(g.connected.notes[g.noteId].sourceRef,new Uint8Array([1]));
 await expect(readRetainedNoteHistory(g.input)).rejects.toThrow('BANK_NOTE_SOURCE_REQUIRED');
});
it('opens actual signed retained funding and credit sources without signing, transport or private-opening disclosure',async()=>{
 const base=new URL('./fixtures/connected-note/',import.meta.url),metadata=JSON.parse(readFileSync(new URL('metadata.json',base),'utf8'));
 const blobs=new Map<string,Uint8Array>(),load=(name:string)=>{const source=new Uint8Array(gunzipSync(readFileSync(new URL(name+'.gz',base)))),ref=createHash('sha256').update(source).digest('hex');blobs.set(ref,source);return ref;};
 const sourceRef=load('funding.receizbundle'),openingRef=load('funding-opening.json'),proofRef=load('credit.receipt'),operationId='4c66870211e144e3dbebcca56595761254280c71b22c4153326369acc49356bf';
 const packed=bytes({noteId:metadata.noteId,rail:'reserve',amountUsdCents:'200',amountPhiMicro:'1000000',proofRef}),creditRef=createHash('sha256').update(packed).digest('hex');blobs.set(creditRef,packed);
 const options={roots:new Map(metadata.issuerRootPublicKeys.map((root:{kid:string})=>[root.kid,root]))};
 const module=async()=>({verifyBankConnectedNoteFunding:(source:Uint8Array,opening:Uint8Array)=>native.verifyBankConnectedNoteFunding(source,opening,options),verifyBankConnectedNoteReceipt:(source:Uint8Array)=>native.verifyBankConnectedNoteReceipt(source,options),openBankNoteDepositReceipt:native.openBankNoteDepositReceipt});
 const sender={schema:'bank.connected-notes.v1',uid:metadata.sender.uid,keyId:metadata.sender.keyId,current:null,notes:{[metadata.noteId]:{noteId:metadata.noteId,operationId,rail:'reserve',amountUsdCents:'200',authorizationRef:'a'.repeat(64),noteIdentityRef:'b'.repeat(64),phase:'issued',sourceRef,openingRef,transfer:{requestRef:'c'.repeat(64),sourceRef:'d'.repeat(64),imageRef:'e'.repeat(64)}}}};
 const receiver={schema:'bank.received-note-deposits.v1',uid:metadata.receiver.uid,keyId:metadata.receiver.keyId,entries:{[metadata.noteId]:{sourceRef:'a'.repeat(64),redemptionDigest:'b'.repeat(64),terminalArtifactSha256:'c'.repeat(64),status:'confirmed',creditRef}}};
 const sent=await readRetainedNoteHistory({accountUid:metadata.sender.uid,keyId:metadata.sender.keyId,readConnected:async()=>sender,readReceived:async()=>null,restore:async ref=>blobs.get(ref)!,module});
 const received=await readRetainedNoteHistory({accountUid:metadata.receiver.uid,keyId:metadata.receiver.keyId,readConnected:async()=>null,readReceived:async()=>receiver,restore:async ref=>blobs.get(ref)!,module});
 expect(sent[0].sourceId).toBe('wallet_ledger:d396106c-54e6-4059-b2e2-cad63ad38ac0');expect(sent[0].accountFlow).toBe('out');
 expect(received[0].sourceId).toBe('wallet_ledger:ed452831-35f4-4321-849b-acc9ac590b56');expect(received[0].accountFlow).toBe('in');
 expect(received[0].details?.noteReceipt).toMatchObject({debitLedgerId:'d396106c-54e6-4059-b2e2-cad63ad38ac0',fundedAtKai:'14742558',operationId,issuerKeyId:metadata.sender.keyId});
 expect(JSON.stringify([...sent,...received])).not.toMatch(/privateAccountOpening|noteIdentityRef|noteAuthority|publicKeyRawB64u/);
});
