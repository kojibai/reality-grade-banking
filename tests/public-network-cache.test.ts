import { afterEach, expect, it, vi } from 'vitest';
import { loadPublicNetworkSeed, parsePublicNetworkCache } from '../src/receiz/public-network-cache';
import { parsePublicNetworkPage } from '../src/receiz/public-network';
afterEach(() => vi.unstubAllGlobals());
it('reads a public gzip seed already decoded by the browser transport', async () => {
  const records = parsePublicNetworkPage('actions', { ok: true, actions: [{ id: 'a', actionKind: 'record' }], nextCursor: null }).records;
  const input = { schema: 'receiz.bank.public-ledger-cache.v1', authority: 'public-source-projection', records, coverage: [{ source: 'actions', complete: true }], capturedAt: '2026-10-02T01:25:40Z' };
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(input), { headers: { 'Content-Encoding': 'gzip', 'Content-Type': 'application/json' } })));
  expect((await loadPublicNetworkSeed())?.records).toHaveLength(1);
});
it('does not accept private Mind captures or malformed display coordinates as a public cache', () => {
  expect(() => parsePublicNetworkCache({ schema: 'receiz.mind.private.v1' })).toThrow();
  const records = parsePublicNetworkPage('actions', { ok: true, actions: [{ id: 'a', actionKind: 'record' }], nextCursor: null }).records;
  expect(() => parsePublicNetworkCache({ schema: 'receiz.bank.public-ledger-cache.v1', authority: 'public-source-projection', records: [{ ...records[0], kaiUpulse: 'invalid' }], coverage: [] })).toThrow();
});
