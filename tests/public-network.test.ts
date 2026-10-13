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
