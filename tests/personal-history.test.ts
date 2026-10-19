import { expect, it } from 'vitest';
import type { ReceizIdentityAccountProjection } from '@receiz/sdk';
import { projectPersonalHistory } from '../src/receiz/personal-history';
import {ledgerFundingTrace} from '../src/receiz/ledger-funding-trace';
function projection(state: unknown, localUid = 'owner') { return { authority: 'verified-identity-portable-state', portableStateVerified: true, owner: { uid: localUid }, verifiedState: state, completeAtSealedHead: true } as ReceizIdentityAccountProjection; }
it('projects only the opened identity portable history and never substitutes public activity', () => {
  const history = projectPersonalHistory(projection({ account: { userId: 'owner' }, ledger: { entries: [{ entryHash: 'a', actionKind: 'wallet.transfer', payload: { summary: 'My transfer', amountUsdCents: '100' }, kaiPulse: '123' }] }, wallet: { ledgerEntries: [] } }));
  expect(history.records[0].title).toBe('My transfer'); expect(history.records[0].pulse).toBe('123');
  expect(projectPersonalHistory({ authority: 'identity-only', portableStateVerified: false } as ReceizIdentityAccountProjection).records).toEqual([]);
  expect(() => projectPersonalHistory(projection({ account: { userId: 'other' } }), 'owner')).toThrow('different');
});
it('preserves a valid local identity with its separately bound global account placement', () => {
  const state = projection({ account: { userId: 'global-account' }, ledger: { entries: [{ entryHash: 'a', actionKind: 'record' }] } }, 'local-device');
  expect(projectPersonalHistory(state, 'global-account').records).toHaveLength(1);
  expect(() => projectPersonalHistory(state, 'foreign-account')).toThrow('different');
  expect(projectPersonalHistory(state).available).toBe(false);
});
it('reads the current wallet activityEvents-only export with exact event IDs, cents and Kai', () => {
  const history = projectPersonalHistory(projection({ account: { userId: 'owner' }, wallet: { activityEvents: [{ id: 'reserve:credit-1', kind: 'reserve_credit', createdAt: '2026-10-13T12:00:00Z', kaiUpulse: '14920000000001', pulse: 14920000, amountUsdCents: '9223372036854775809', proofBundle: { bundleHash: 'b'.repeat(64) } }] } }));
  expect(history.records).toHaveLength(1); expect(history.records[0].sourceId).toBe('reserve:credit-1'); expect(history.records[0].amountUsdCents).toBe('9223372036854775809'); expect(history.records[0].kaiUpulse).toBe('14920000000001');
});
it('deduplicates overlapping legacy and current representations of the same carried wallet entry', () => {
  const history = projectPersonalHistory(projection({ account: { userId: 'owner' }, wallet: { ledgerEntries: [{ id: 'same', entry_kind: 'credit', amount_usd_cents: '100' }], activityEvents: [{ id: 'wallet_ledger:same', kind: 'wallet_ledger_entry', amountUsdCents: '100', kaiUpulse: '120000001' }] } }));
  expect(history.records).toHaveLength(1); expect(history.records[0].sourceId).toBe('wallet_ledger:same'); expect(history.records[0].kaiUpulse).toBe('120000001');
});
it('keeps proof origin evidence when a current activity row replaces the same portable credit',()=>{
 const history=projectPersonalHistory(projection({account:{userId:'owner'},wallet:{ledgerEntries:[{id:'credit',entry_kind:'credit',direction:'credit',amount_usd_cents:'2500',amount_phi_micro:'500000',kai_pulse:'120',kai_upulse:'120000001',metadata:{source:'sigil_upload_claim',contentHash:'d'.repeat(64),claimPulse:120,sigilPulse:100,privateKey:'never carry'}}],activityEvents:[{id:'wallet_ledger:credit',kind:'wallet_ledger_entry',amountUsdCents:'2500',pulse:120,kaiUpulse:'120000001'}]}}));
 expect(history.records).toHaveLength(1);
 expect(history.records[0].sourceId).toBe('wallet_ledger:credit');
 expect(ledgerFundingTrace(history.records[0])).toMatchObject({boundary:'source-origins',steps:[{kind:'post_work_proof',kaiPulse:'100'},{kind:'glyph_economy_value',claimPulse:'120',amountPhiMicro:'500000'}]});
 expect(JSON.stringify(history.records)).not.toContain('never carry');
});
it('does not attach legacy source evidence to a contradictory activity amount or coordinate',()=>{
 for(const event of [{amountUsdCents:'2501',pulse:120,kaiUpulse:'120000001'},{amountUsdCents:'2500',pulse:121,kaiUpulse:'121000001'}]){
  const history=projectPersonalHistory(projection({account:{userId:'owner'},wallet:{ledgerEntries:[{id:'credit',entry_kind:'credit',direction:'credit',amount_usd_cents:'2500',amount_phi_micro:'500000',kai_pulse:'120',kai_upulse:'120000001',metadata:{source:'sigil_upload_claim',contentHash:'d'.repeat(64)}}],activityEvents:[{id:'wallet_ledger:credit',kind:'wallet_ledger_entry',...event}]}}));
  expect(history.records).toHaveLength(1);expect(ledgerFundingTrace(history.records[0]).steps).toEqual([]);
 }
});
it('handles the actual SDK-signed portable local/global placement contract', async () => {
  const sdk = await import('@receiz/sdk');
  const created = await sdk.createReceizIdentityKeyFile({ owner: { uid: 'local-device', username: 'test-fixture' }, passphrase: 'test-fixture-private-phrase' });
  const key = await sdk.appendReceizIdentityPortableState({ keyFile: created.keyFile, passphrase: 'test-fixture-private-phrase', snapshot: { account: { userId: 'global-account' }, wallet: { activityEvents: [{ id: 'reserve_credit:fixture', kind: 'reserve_credit', amountUsdCents: '123', pulse: 100, kaiUpulse: '100000001' }] } } });
  const projected = await sdk.projectReceizIdentityAccount(key);
  expect(projected.portableStateVerified).toBe(true); expect(projected.owner.uid).toBe('local-device');
  expect(projectPersonalHistory(projected, 'global-account').records[0].amountUsdCents).toBe('123');
  expect(() => projectPersonalHistory(projected, 'foreign-account')).toThrow('different');
});
it('carries calculated FIFO to the exact linked transfer without conflating the later wallet posting coordinate',()=>{
 const state={account:{userId:'owner'},wallet:{ledgerEntryCount:3,ledgerEntries:[
  {id:'proof-credit',user_id:'owner',direction:'credit',entry_kind:'market_sell',amount_usd_cents:'500',created_at:'2026-05-01T00:00:00Z',kai_upulse:'100000000',metadata:{source:'market_trade',marketItemId:'profile:owner:proof'}},
  {id:'funding',user_id:'owner',direction:'credit',entry_kind:'admin_adjustment',amount_usd_cents:'200',created_at:'2026-05-02T00:00:00Z',kai_upulse:'110000000',metadata:{source:'stripe_checkout_wallet_deposit'}},
  {id:'debit',user_id:'owner',direction:'debit',entry_kind:'chat_transfer_send',chat_transfer_id:'transfer-one',amount_usd_cents:'500',created_at:'2026-05-03T00:00:00.100Z',kai_upulse:'120010000',metadata:{settledUsdCents:'200',phiUsdCents:'300'}}
 ],chatTransfers:[{id:'transfer-one',sender_user_id:'owner',recipient_user_id:'recipient',amount_usd_cents:'500',created_at:'2026-05-03T00:00:00Z',kai_pulse:'120',kai_upulse:'120000000'}]}};
 const history=projectPersonalHistory(projection(state)),record=history.records.find(r=>r.sourceId==='transfer:transfer-one')!,trace=ledgerFundingTrace(record);
 expect(trace.basis).toBe('calculated-fifo');expect(trace.sources.map(s=>s.sourceId)).toEqual(['funding','proof-credit']);expect(trace.steps[1]).toMatchObject({kind:'post_work_proof',sourceId:'profile:owner:proof'});
 expect(trace.components).toEqual([{rail:'reserve',amountUsdCents:'200'},{rail:'settlement',amountUsdCents:'300'}]);
 expect(ledgerFundingTrace({...record,evidence:{transferId:'unrelated'}}).basis).not.toBe('calculated-fifo');
 expect(projectPersonalHistory({...projection(state),completeAtSealedHead:false}).records.every(r=>!r.details?.fundingAttribution)).toBe(true);
});
it('retains the exact delegated-action foreign key from the carried payload for paired payment inspection',async()=>{
 const {groupLedgerPaymentRecords}=await import('../src/receiz/ledger-payment-records');
 const history=projectPersonalHistory(projection({account:{userId:'owner'},ledger:{entries:[{id:'action',actionKind:'wallet.transfer.connect',payload:{summary:'Delegated wallet transfer',transferId:'one',amountUsdCents:'100',conversationId:'private-chat'}}]},wallet:{activityEvents:[{id:'movement',kind:'chat_transfer',transferId:'one',amountUsdCents:'100'}]}}));
 expect(history.records).toHaveLength(2);expect(groupLedgerPaymentRecords(history.records)).toHaveLength(1);expect(JSON.stringify(history.records)).not.toContain('private-chat');
});
