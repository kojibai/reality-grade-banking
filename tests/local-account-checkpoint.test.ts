import {expect,it} from 'vitest';
import * as sdk from '@receiz/sdk';
import {readLocalAccountCheckpoint} from '../src/receiz/local-account-checkpoint';
import {BANK_APPLICATION_ID} from '../src/receiz/config';
import {readWalletObservation} from '../src/receiz/wallet-observation';
const uid='account-test',phrase='local-test-passphrase';
function summary(cents:string){return{userId:uid,balancePhiMicro:cents,balanceUsd:`${BigInt(cents)/100n}.${(BigInt(cents)%100n).toString().padStart(2,'0')}`,valueStates:{settledBalanceUsdCents:cents,ecosystemBalanceUsdCents:'0'},sync:{projectionComplete:true},rollup:{lastEntryKaiPulse:'14692714'}};}
it('retains the exact local head and appends its balance to the existing chart without a network read',async()=>{
 const identity=(await sdk.createReceizIdIdentity({passphrase:phrase})).keyFile;
 const proof=await sdk.appendReceizIdentityPortableState({keyFile:identity,passphrase:phrase,snapshot:{account:{userId:uid},wallet:{routeSummary:summary('200')}},exportedAt:'2026-10-17T12:00:00.000Z'});
 const observation=await readLocalAccountCheckpoint(proof,identity,uid,{wallet:{userId:uid,totalUsdCents:'100',reserveUsdCents:'100',settlementUsdCents:'0',balancePhiMicro:'100',portfolioUsdCents:null,pnlUsdCents:null,withdrawableUsdCents:null,projectionComplete:true,pulse:'14692713',kaiUpulse:null},observedAt:'2026-10-17T11:00:00.000Z',history:[{userId:uid,at:'2026-10-17T11:00:00.000Z',kaiUPulse:null,totalUsdCents:'100',reserveUsdCents:'100',settlementUsdCents:'0'}]});
 expect(observation.source).toBe('local-note-head');expect(observation.localHeadDigest).toBe(proof.portableState!.proof!.digestSha256Hex);
 expect(observation.history?.map(p=>p.totalUsdCents)).toEqual(['100','200']);
 expect(await readLocalAccountCheckpoint(proof,identity,uid,observation)).toEqual(observation);
 const retained=readWalletObservation({schema:'receiz.bank.private-wallet-observation.v1',authority:'read-only-observation',applicationId:BANK_APPLICATION_ID,keyId:identity.keyId,artifactSha256:'a'.repeat(64),...observation},{keyId:identity.keyId,artifactSha256:'a'.repeat(64)});
 expect(retained?.source).toBe('local-note-head');expect(retained?.localHeadDigest).toBe(observation.localHeadDigest);
});
it('refuses a foreign identity or account before adopting a local head',async()=>{
 const identity=(await sdk.createReceizIdIdentity({passphrase:phrase})).keyFile,foreign=(await sdk.createReceizIdIdentity({passphrase:phrase})).keyFile;
 const proof=await sdk.appendReceizIdentityPortableState({keyFile:identity,passphrase:phrase,snapshot:{account:{userId:uid},wallet:{routeSummary:summary('200')}},exportedAt:'2026-10-17T12:00:00.000Z'});
 await expect(readLocalAccountCheckpoint(proof,foreign,uid,null)).rejects.toThrow('INVALID');await expect(readLocalAccountCheckpoint(proof,identity,'foreign-account',null)).rejects.toThrow('INVALID');
});
it('keeps prior chart observations when the descriptive wall clock moves backward',async()=>{
 const identity=(await sdk.createReceizIdIdentity({passphrase:phrase})).keyFile;
 const proof=await sdk.appendReceizIdentityPortableState({keyFile:identity,passphrase:phrase,snapshot:{account:{userId:uid},wallet:{routeSummary:summary('200')}},exportedAt:'2026-10-17T10:00:00.000Z'});
 const before={wallet:{userId:uid,totalUsdCents:'100',reserveUsdCents:'100',settlementUsdCents:'0',balancePhiMicro:'100',portfolioUsdCents:null,pnlUsdCents:null,withdrawableUsdCents:null,projectionComplete:true,pulse:'14692713',kaiUpulse:null},observedAt:'2026-10-17T11:00:00.000Z',history:[{userId:uid,at:'2026-10-17T11:00:00.000Z',kaiUPulse:null,totalUsdCents:'100',reserveUsdCents:'100',settlementUsdCents:'0'}]};
 const next=await readLocalAccountCheckpoint(proof,identity,uid,before,'2026-10-17T10:00:00.000Z');
 expect(next.history?.map(row=>row.totalUsdCents)).toEqual(['100','200']);
});

it('does not carry old closing holdings or complete-history claims across a new Note successor',async()=>{
 const identity=(await sdk.createReceizIdIdentity({passphrase:phrase})).keyFile;
 const proof=await sdk.appendReceizIdentityPortableState({keyFile:identity,passphrase:phrase,snapshot:{account:{userId:uid},wallet:{routeSummary:summary('200')}},exportedAt:'2026-10-17T12:00:00.000Z'});
 const next=await readLocalAccountCheckpoint(proof,identity,uid,{wallet:{userId:uid,totalUsdCents:'100',reserveUsdCents:'100',settlementUsdCents:'0',balancePhiMicro:'100',portfolioUsdCents:null,pnlUsdCents:null,withdrawableUsdCents:null,projectionComplete:true,pulse:'14692713',kaiUpulse:'14692713000000'},observedAt:'2026-10-17T11:00:00Z',history:[{userId:uid,at:'2026-10-17T11:00:00Z',kaiUPulse:'14692713000000',totalUsdCents:'100',reserveUsdCents:'100',settlementUsdCents:'0'}],historyBasis:{schema:'bank.account-history-display.v1',startKaiUPulse:'14692713000000',endKaiUPulse:'14692713000000',balancePhiMicro:'100',settlementPhiMicro:'0',reserveUsdCents:'100'}});
 expect(next.wallet.totalUsdCents).toBe('200');expect(next.historyBasis).toBeUndefined();expect(next.history).toHaveLength(2);
});
