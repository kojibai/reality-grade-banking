import { afterEach, expect, it, vi } from 'vitest';
import { loadPublicNetworkCache, loadPublicNetworkSeed, parsePublicNetworkCache, savePublicNetworkCache } from '../src/receiz/public-network-cache';
import { parsePublicNetworkPage } from '../src/receiz/public-network';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
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

it('reopens pooled public context without losing exact per-entry fields or accepting an invalid reference',()=>{
 const records=parsePublicNetworkPage('actions',{ok:true,actions:[{id:'one',seq:1}]}).records;
 const cache={schema:'receiz.bank.public-ledger-cache.v1',authority:'public-source-projection',records:[{...records[0],details:{seq:1},detailsRef:0}],detailContexts:[{actorPulse:120,actorUserId:'1BoatSLRHtKNngkdXEeobR76b53LETtpyT',privateKey:'never-retain'}],coverage:[]};
 const restored=parsePublicNetworkCache(cache).records[0];
 expect(restored.details).toEqual({seq:1,actorUserId:'1BoatSLRHtKNngkdXEeobR76b53LETtpyT',actorPulse:120});
 expect(restored).not.toHaveProperty('detailsRef');
 expect(()=>parsePublicNetworkCache({...cache,records:[{...cache.records[0],detailsRef:9}]})).toThrow();
});
it('ships complete inspectable public records and prices inside the existing bounded seed reader',()=>{
 const bytes=gunzipSync(readFileSync('public/receiz-public-ledger.json.gz.bin'));
 expect(bytes.length).toBeLessThanOrEqual(32*1024*1024);
 const cache=parsePublicNetworkCache(JSON.parse(bytes.toString('utf8'))),proofs=cache.records.filter(row=>row.source==='proofs');
 expect(cache.records.length).toBeGreaterThan(45000);expect(proofs.length).toBeGreaterThan(1600);
 expect(proofs.every(row=>row.valueOperands?.proofValueUsdCents!==undefined&&row.details?.owner)).toBe(true);
 expect(cache.records.some(row=>row.source==='actions'&&row.details?.actorPulse!==undefined&&row.evidence.entryHash)).toBe(true);
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
