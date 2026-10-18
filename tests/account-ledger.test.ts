import {beforeEach,expect,it,vi} from 'vitest';
import {quoteReceizDisplayUsdV122} from '@receiz/sdk';
import {accountLedgerObservation,canAdoptAccountLedgerObservation,mergeAccountLedgerObservation,createLocalAccountLedger} from '../src/receiz/account-ledger';
import type {VerifiedAccountProof} from '../src/receiz/account-proof';
const p=vi.hoisted(()=>({known:new WeakSet<object>(),files:new Map<string,unknown>()}));
// Retention/projection mechanics only. Canonical proof verification has its own
// unmocked tests and the native browser fixture; these are not issuer evidence.
vi.mock('../src/receiz/account-proof',()=>({isVerifiedAccountProof:(v:object)=>p.known.has(v),heldAccountProofBytes:(v:{sourceDigest:string})=>new TextEncoder().encode(v.sourceDigest),verifyAccountProof:async(file:File,owner:{keyId:string;artifactOwnerReceizId:string})=>{const proof=p.files.get(await file.text()) as VerifiedAccountProof;if(!proof||proof.statement.account.keyId!==owner.keyId||proof.statement.account.receizId!==owner.artifactOwnerReceizId)throw Error('ACCOUNT_PROOF_OWNER_MISMATCH');return proof;}}));
vi.mock('../src/receiz/client',()=>({loadReceiz:async()=>({quoteReceizDisplayUsdV122})}));
beforeEach(()=>p.files.clear());
function proof(count:number,reserve='1000',settlement='0',rate='200000000'){
 const value={sourceDigest:String(count).repeat(64),writer:'writer.receiz.id',statement:{schema:'bankeiz.public-account-statement.v2',applicationId:'app',account:{keyId:'a'.repeat(64),receizId:'owner.receiz.id'},checkpoint:{genesisHead:'b'.repeat(64),kaiUPulse:String(100000000+count),reserveUsdCents:reserve,settlementPhiMicro:settlement,balancePhiMicro:'5000000',usdPerPhiMicrocents:rate},transactions:Array.from({length:count},(_,i)=>({sequence:i+1,transactionId:'tx'+i,eventDigest:String(i),previousEventDigest:String(i-1),kaiUPulse:String(100000001+i),reserveDeltaUsdCents:i?(i===1?(BigInt(reserve)-1000n).toString():'0'):'1000',settlementDeltaPhiMicro:'0'}))}} as unknown as VerifiedAccountProof;p.known.add(value);p.files.set(value.sourceDigest,value);return value;
}
function setup(){let state:unknown=null;const write=vi.fn(async(next:unknown,expected:unknown)=>{expect(expected).toBe(state);state=next;});return{ledger:createLocalAccountLedger({owner:{keyId:'a'.repeat(64),artifactOwnerReceizId:'owner.receiz.id'},read:async()=>state,write,assertOpen:()=>{}}),write,state:()=>state,set:(v:unknown)=>{state=v;}};}
it('restores both rails and exact original from a complete retained account source without transport',async()=>{
 const s=setup(),v=proof(1,'1000','1000000','200000000');const saved=await s.ledger.retain(v,'bound-user'),restored=await s.ledger.restore();
 expect(saved.observation.wallet).toMatchObject({reserveUsdCents:'1000',settlementUsdCents:'200',totalUsdCents:'1200',balancePhiMicro:'5000000'});expect(restored?.proof).toBe(v);expect(restored?.observation).toEqual(saved.observation);expect((s.state() as {sourceJson:string}).sourceJson).toBe(v.sourceDigest);
});
it('accepts only an extension and makes duplicate or older sources zero-write',async()=>{
 const s=setup(),old=proof(1),newer=proof(2,'600');await s.ledger.retain(old,'bound-user');await s.ledger.retain(newer,'bound-user');expect(s.write).toHaveBeenCalledTimes(2);
 await s.ledger.retain(newer,'bound-user');expect((await s.ledger.retain(old,'bound-user')).proof).toBe(newer);expect(s.write).toHaveBeenCalledTimes(2);expect((await s.ledger.restore())?.observation.wallet.reserveUsdCents).toBe('600');
});
it('refuses changed historical events, foreign account binding and unverified display objects',async()=>{
 const s=setup(),old=proof(1);await s.ledger.retain(old,'bound-user');const fork=proof(2);(fork.statement.transactions[0] as {transactionId:string}).transactionId='substituted';await expect(s.ledger.retain(fork,'bound-user')).rejects.toThrow('CONTINUITY');await expect(s.ledger.retain(old,'foreign-user')).rejects.toThrow('ACCOUNT_MISMATCH');await expect(accountLedgerObservation({...old},'bound-user',new Date().toISOString())).rejects.toThrow('SOURCE_REQUIRED');expect(s.write).toHaveBeenCalledTimes(1);
});
it('keeps Reserve dollars fixed while valuing only native Settlement Phi',async()=>{
 const v=proof(1,'1000','0','800000000');expect((await accountLedgerObservation(v,'bound-user',new Date().toISOString())).wallet.totalUsdCents).toBe('1000');
});
it('preserves later genuine chart observations and their read time when retained amounts match',async()=>{
 const prior=await accountLedgerObservation(proof(1),'bound-user','2026-10-18T12:05:00Z');
 const older=await accountLedgerObservation(proof(1),'bound-user','2026-10-18T12:00:00Z');
 expect(mergeAccountLedgerObservation(prior,older)).toBe(prior);
 const changed=await accountLedgerObservation(proof(2,'600'),'bound-user','2026-10-18T12:01:00Z');
 const merged=mergeAccountLedgerObservation(prior,changed);
 expect(merged.history).toContainEqual(prior.history![0]);expect(merged.wallet.reserveUsdCents).toBe('600');
 expect(Date.parse(merged.observedAt)).toBeGreaterThan(Date.parse(prior.observedAt));
});

it('adopts an advanced verified Ledger without allowing a delayed source to rewind a newer wallet or local note', async()=>{
 const next=(await accountLedgerObservation(proof(2,'600'),'bound-user',new Date().toISOString()));
 const before={...next,wallet:{...next.wallet,totalUsdCents:'1000',reserveUsdCents:'1000',kaiUpulse:'100000001'}};
 expect(canAdoptAccountLedgerObservation(before,next)).toBe(true);
 expect(canAdoptAccountLedgerObservation({...before,wallet:{...before.wallet,kaiUpulse:'100000003'}},next)).toBe(false);
 expect(canAdoptAccountLedgerObservation({...before,source:'local-note-head'},next)).toBe(false);
 expect(canAdoptAccountLedgerObservation({...before,wallet:{...before.wallet,userId:'foreign'}},next)).toBe(false);
 expect(canAdoptAccountLedgerObservation({...before,wallet:{...before.wallet,kaiUpulse:null}},next)).toBe(false);
 expect(canAdoptAccountLedgerObservation(next,next)).toBe(true);
});

it('serializes concurrent captures so both verified extensions remain ordered',async()=>{
 const s=setup(),old=proof(1),newer=proof(2,'600');
 await Promise.all([s.ledger.retain(old,'bound-user'),s.ledger.retain(newer,'bound-user')]);
 expect((await s.ledger.restore())?.proof).toBe(newer);expect(s.write).toHaveBeenCalledTimes(2);
});
it('reopens and reconciles a competing tab write before retrying the newer source',async()=>{
 const old=proof(1),newer=proof(2,'600');let state:unknown=null,compete=true;
 const write=vi.fn(async(next:unknown,expected:unknown)=>{
  if(compete){compete=false;state={schema:'bank.account-ledger.v1',accountUid:'bound-user',observedAt:new Date().toISOString(),sourceJson:old.sourceDigest};throw Error('BANK_NOTE_IDENTITY_OR_INTENT_CHANGED');}
  expect(expected).toBe(state);state=next;
 });
 const ledger=createLocalAccountLedger({owner:{keyId:'a'.repeat(64),artifactOwnerReceizId:'owner.receiz.id'},read:async()=>state,write,assertOpen:()=>{}});
 await ledger.retain(newer,'bound-user');expect((await ledger.restore())?.proof).toBe(newer);expect(write).toHaveBeenCalledTimes(2);
});
it('keeps transaction-head coordinates distinct from later proof issuance coordinates',async()=>{
 const v=proof(2,'600');v.statement.checkpoint.kaiUPulse='100000500';
 (v.statement.transactions as import('../src/receiz/account-proof').AccountProofTransaction[]).push({...v.statement.transactions[1],sequence:3,kind:'account-opened',transactionId:'identity-backdate',kaiUPulse:'100000000',reserveDeltaUsdCents:'0',settlementDeltaPhiMicro:'0'});
 const observation=await accountLedgerObservation(v,'bound-user',new Date().toISOString());
 expect(observation.wallet.kaiUpulse).toBe('100000002');expect(observation.history?.[0].kaiUPulse).toBe('100000500');
});
