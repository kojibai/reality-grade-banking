import { afterEach, expect, it, vi } from 'vitest';
import { loadPublicNetworkCache, loadPublicNetworkSeed, parsePublicNetworkCache, savePublicNetworkCache } from '../src/receiz/public-network-cache';
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

function memoryIndexedDb() {
  let held: unknown;
  vi.stubGlobal('indexedDB', { open: () => {
    const request: Record<string, unknown> = {};
    queueMicrotask(() => { request.result = { close() {}, transaction: () => {
      const tx: Record<string, unknown> = { objectStore: () => ({ get: () => {
        const read: Record<string, unknown> = {};
        queueMicrotask(() => { read.result = held; (read.onsuccess as () => void)?.(); queueMicrotask(() => (tx.oncomplete as () => void)?.()); });
        return read;
      }, put: (value: unknown) => { held = structuredClone(value); } }) };
      return tx;
    } }; (request.onsuccess as () => void)?.(); });
    return request;
  } });
}
it('does not resurrect withdrawn graph or showcase entries through cache saves and reloads', async () => {
  memoryIndexedDb();
  const raw = parsePublicNetworkPage('graph', { ok: true, ledgerRows: [{ id: 'removed' }, { id: 'kept' }] }).records;
  for (const source of ['graph', 'proofs'] as const) {
    const records = raw.map(row => ({ ...row, source, id: `${source}:${row.sourceId}` }));
    await savePublicNetworkCache({ records, capturedAt: null, coverage: [{ source, complete: true, observedAt: 100 }] });
    await savePublicNetworkCache({ records: records.filter(row => row.sourceId === 'kept'), capturedAt: null, coverage: [{ source, complete: true, observedAt: 200 }] });
    // An older tab's delayed save must not revive a withdrawn public entry either.
    await savePublicNetworkCache({ records, capturedAt: null, coverage: [{ source, complete: true, observedAt: 100 }] });
    expect((await loadPublicNetworkCache())?.records.filter(row => row.source === source).map(row => row.sourceId)).toEqual(['kept']);
  }
});
it('requests opaque compressed seed bytes so HTTP content decoding cannot invalidate the offline resource hash',async()=>{
 const {gzipSync}=await import('node:zlib');
 const records=parsePublicNetworkPage('actions',{ok:true,actions:[{id:'compressed-source',actionKind:'record'}],nextCursor:null}).records;
 const input={schema:'receiz.bank.public-ledger-cache.v1',authority:'public-source-projection',records,coverage:[{source:'actions',complete:true}],capturedAt:'2026-10-17T12:00:00Z'};
 const fetch=vi.fn(async(_input:string|URL|Request)=>new Response(new Uint8Array(gzipSync(JSON.stringify(input))),{headers:{'Content-Type':'application/octet-stream'}}));vi.stubGlobal('fetch',fetch);
 expect((await loadPublicNetworkSeed())?.records).toHaveLength(1);expect(fetch.mock.calls[0][0]).toBe('/receiz-public-ledger.json.gz.bin');
});
