import { expect, it } from 'vitest';
import { mergePublicRecords, parsePublicNetworkPage } from '../src/receiz/public-network';

const alias = '1BoatSLRHtKNngkdXEeobR76b53LETtpyT';
it('reads the actual public actions wire and preserves native exact amounts and Kai', () => {
  const page = parsePublicNetworkPage('actions', { ok: true, actions: [{ id: 'a', actionKind: 'wallet.transfer', summary: 'Transfer recorded', actorUserId: alias, kaiUpulse: '14600000123456', occurredAt: '2026-10-13T12:00:00Z', amountUsdCents: '9223372036854775809', entryHash: 'a'.repeat(64) }], nextCursor: '42', rollup: { count: 5000 } });
  expect(page.records[0].actor).toBe(alias); expect(page.records[0].amountUsdCents).toBe('9223372036854775809');
  expect(page.records[0].kaiUpulse).toBe('14600000123456'); expect(page.nextCursor).toBe('42'); expect(page.records[0].authority).toBe('public-source-projection');
});
it('deduplicates by exact source and ID while preserving distinct public witnesses', () => {
  const action = parsePublicNetworkPage('actions', { ok: true, actions: [{ id: 'x', actionKind: 'record' }], nextCursor: null }).records;
  const wallet = parsePublicNetworkPage('wallet', { ok: true, events: [{ id: 'x', kind: 'transfer' }], nextCursor: null }).records;
  expect(mergePublicRecords(action, [...action, ...wallet])).toHaveLength(2);
});
it('does not turn private identity fields, demo conversion or unsafe routes into public presentation', () => {
  const row = parsePublicNetworkPage('actions', { ok: true, actions: [{ id: 'x', actionKind: 'record', actorUserId: 'f1234567-0000-0000-0000-000000000000', username: 'private_name', amountPhiMicro: '1000000', route: '/api/connect/wallet/me' }], nextCursor: null }).records[0];
  expect(row.actor).toBeNull(); expect(row.amountUsdCents).toBeNull(); expect(row.sourceUrl).toBeNull();
});
it('fails closed on invalid response or cursor shapes instead of claiming complete history', () => {
  expect(() => parsePublicNetworkPage('actions', { ok: true })).toThrow();
  expect(() => parsePublicNetworkPage('wallet', { ok: true, events: [], nextCursor: 2 })).toThrow();
  expect(() => parsePublicNetworkPage('wallet', { source: 'actions', rows: [] })).toThrow();
});

it('rejects malformed required row IDs rather than accepting an empty complete snapshot', () => {
  expect(() => parsePublicNetworkPage('graph', { ok: true, ledgerRows: [{ renamedId: 'gone' }] })).toThrow();
  expect(() => parsePublicNetworkPage('actions', { ok: true, actions: [{ id: 'valid' }, null] })).toThrow();
  expect(parsePublicNetworkPage('graph', { ok: true, ledgerRows: [] }).complete).toBe(true);
});
it('retains the exact historical snapshot when an older feed repeats the same immutable entry without value fields',()=>{
 const raw={id:'card-event',actionKind:'receiz.sports_arena.card_transfer',entryHash:'a'.repeat(64),pulse:12000000,kaiUpulse:'12000000000000'};
 const known=parsePublicNetworkPage('actions',{ok:true,actions:[{...raw,claimHash:'b'.repeat(64),collectibleId:'rsc_1234567890abcdef',transferId:'transfer-01',cardValueUsdCents:'9900',cardValueRule:'recorded-at-transfer'}]}).records;
 const thin=parsePublicNetworkPage('actions',{ok:true,actions:[raw]}).records;
 expect(mergePublicRecords(known,thin)[0].valueOperands).toMatchObject({claimHash:'b'.repeat(64),collectibleId:'rsc_1234567890abcdef',cardValueUsdCents:'9900',cardValueRule:'recorded-at-transfer'});
 expect(mergePublicRecords(known,thin)[0].evidence.transferId).toBe('transfer-01');
});
it('does not combine an unbound same-ID row with retained transaction evidence',()=>{
 const known=parsePublicNetworkPage('actions',{ok:true,actions:[{id:'unbound',actionKind:'card_transfer',pulse:120,cardValueUsdCents:'9900'}]}).records;
 const thin=parsePublicNetworkPage('actions',{ok:true,actions:[{id:'unbound',actionKind:'card_transfer',pulse:120}]}).records;
 expect(mergePublicRecords(known,thin)[0].valueOperands?.cardValueUsdCents).toBeUndefined();
});
it.each([{cardValueUsdCents:'9901'},{claimHash:'c'.repeat(64)},{pulse:121},{pulse:null,kaiUpulse:'121000000'},{transferValueUsdCents:'9901'}])('surfaces conflicting immutable transfer evidence instead of overwriting or combining it: %j',conflict=>{
 const raw={id:'conflict',actionKind:'card_transfer',entryHash:'a'.repeat(64),pulse:120,claimHash:'b'.repeat(64),cardValueUsdCents:'9900'};
 const known=parsePublicNetworkPage('actions',{ok:true,actions:[raw]}).records;
 const incoming=parsePublicNetworkPage('actions',{ok:true,actions:[{...raw,...conflict}]}).records;
 expect(()=>mergePublicRecords(known,incoming)).toThrow(/conflict/i);
});
it.each([
 [{amountUsdCents:'100'}, {amountUsdCents:'500'}],
 [{considerationUsdCents:'100'}, {amountUsdCents:'500'}],
 [{amountUsdCents:'100'}, {considerationUsdCents:'500'}],
])('refuses changed payment consideration beneath the same immutable card transfer', (before, after) => {
 const raw={id:'same-transfer',actionKind:'card_transfer',entryHash:'a'.repeat(64),pulse:120};
 const known=parsePublicNetworkPage('actions',{ok:true,actions:[{...raw,cardValueUsdCents:'9900',...before}]}).records;
 const thin=parsePublicNetworkPage('actions',{ok:true,actions:[{...raw,...after}]}).records;
 expect(()=>mergePublicRecords(known,thin)).toThrow(/conflict/i);
});
it('retains consideration omitted by a thin feed and keeps wallet snapshot amounts separate',()=>{
 const raw={id:'same-transfer',actionKind:'card_transfer',entryHash:'a'.repeat(64),pulse:120};
 const known=parsePublicNetworkPage('actions',{ok:true,actions:[{...raw,amountUsdCents:'100',cardValueUsdCents:'9900'}]}).records;
 const thin=parsePublicNetworkPage('actions',{ok:true,actions:[raw]}).records;
 expect(mergePublicRecords(known,thin)[0].amountUsdCents).toBe('100');
 const wallet=parsePublicNetworkPage('wallet',{ok:true,events:[{...raw,kind:'card_transfer',amountUsdCents:'9900',considerationUsdCents:'100',valueReceipt:{phiUsdCents:'9900',fundingRule:'sports_card_transfer_card_value_snapshot'}}]}).records;
 const walletThin=parsePublicNetworkPage('wallet',{ok:true,events:[{...raw,kind:'card_transfer',amountUsdCents:'9900'}]}).records;
 expect(mergePublicRecords(wallet,walletThin)[0].valueOperands).toMatchObject({cardValueUsdCents:'9900',considerationUsdCents:'100'});
});
it('does not let a generic thin row replace a bound transfer kind',()=>{
 const known=parsePublicNetworkPage('actions',{ok:true,actions:[{id:'bound-kind',actionKind:'card_transfer',entryHash:'a'.repeat(64),pulse:120,amountUsdCents:'100'}]}).records;
 const thin=parsePublicNetworkPage('actions',{ok:true,actions:[{id:'bound-kind'}]}).records;
 expect(mergePublicRecords(known,thin)[0]).toBe(known[0]);
 const conflicting=parsePublicNetworkPage('actions',{ok:true,actions:[{id:'bound-kind',entryHash:'b'.repeat(64)}]}).records;
 expect(()=>mergePublicRecords(known,conflicting)).toThrow(/conflict/i);
});
