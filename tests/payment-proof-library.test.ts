/** Choreography only: the financial verifier is simulated here. Independent
 * real-root signature and canonical forgery-refusal tests qualify its boundary. */
import {expect,it,vi} from 'vitest';
import {createProofLibrary,type ProofSource} from '../src/receiz/proof-library';
const boundary=vi.hoisted(()=>({owner:'sender.receiz.id',keyId:'a'.repeat(64)}));
vi.mock('../src/receiz/native-payment',()=>({verifyNativePaymentSource:async(packet:unknown)=>{if((packet as {status?:unknown})?.status!=='committed')throw Error('UNVERIFIED');return{receipt:{schema:'receiz.bank.native-payment-receipt.v1',review:{request:{actorReceizId:boundary.owner,requestId:'payment-test-0001'},keyId:boundary.keyId}}};}}));
it('exports, reviews, imports and reopens a payment receipt through the existing proof library',async()=>{
 let archive:ProofSource[]=[];const binding={artifactOwnerReceizId:'sender.receiz.id',keyId:'a'.repeat(64)};
 const source:ProofSource={kind:'payment-receipt',filename:'payment.receiz-payment.json',bytes:new TextEncoder().encode(JSON.stringify({schema:'receiz.bank.native-payment-result.v1',status:'committed'}))};
 const make=(recoveries:ProofSource[])=>createProofLibrary({binding,assertOpen(){},readOwned:async()=>[],readArchive:async()=>archive,readRecoveries:async()=>recoveries,readNotes:async()=>[],commit:async rows=>{archive=structuredClone(rows);return{added:rows.length,alreadyHeld:0};}});
 const original=make([source]),backup=await original.exportBackup(),cold=make([]);
 const review=await cold.inspect(new File([new Uint8Array(backup.bytes)],backup.filename));expect(review.items[0].kind).toBe('payment-receipt');expect(archive).toHaveLength(0);await cold.retain(review);
 const reopened=await cold.list();expect(reopened[0].title).toBe('Payment receipt');expect((await cold.exportProof(reopened[0].digest)).bytes).toEqual(source.bytes);
 const individual=await cold.inspect(new File([new Uint8Array(source.bytes)],source.filename));expect(individual.items[0].kind).toBe('payment-receipt');
 boundary.owner='foreign.receiz.id';await expect(cold.inspect(new File([new Uint8Array(source.bytes)],source.filename))).rejects.toThrow('IDENTITY');
});
