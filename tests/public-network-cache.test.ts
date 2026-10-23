import { afterEach, expect, it, vi } from 'vitest';
import { loadPublicNetworkCache, loadPublicNetworkSeed, parsePublicNetworkCache, savePublicNetworkCache, savePublicLedgerDisplayCache } from '../src/receiz/public-network-cache';
import { parsePublicNetworkPage } from '../src/receiz/public-network';
import {groupLedgerPaymentRecords} from '../src/receiz/ledger-payment-records';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
// Admission is mocked only at the existing custody boundary; these fixtures
// verify display persistence, not cryptographic source qualification.
const admitted=vi.hoisted(()=>new WeakSet<object>());
vi.mock('../src/receiz/public-ledger-proof',()=>({heldPublicLedgerFile:(review:object)=>{if(!admitted.has(review))throw Error('CUSTODY_REQUIRED');return {};}}));
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
  const open=vi.fn(() => {
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
  });vi.stubGlobal('indexedDB',{open});return open;
}
it('reopens an already matched payment as one row before any live refresh',async()=>{
 memoryIndexedDb();
 const transferId='7493d3ac-882e-4bc7-92e4-73d914580a30',publicTransferId='tx:0123456789abcdef01234567';
 const records=[...parsePublicNetworkPage('actions',{ok:true,actions:[{id:'execution',actionKind:'wallet.transfer.connect',transferId,publicTransferId,amountUsdCents:'2700'}]}).records,
  ...parsePublicNetworkPage('wallet',{ok:true,events:[{id:'movement',kind:'chat_transfer',transferId:publicTransferId,amountUsdCents:'2700'}]}).records];
 expect(groupLedgerPaymentRecords(records)).toHaveLength(1);
 await savePublicNetworkCache({records,capturedAt:null,coverage:[]});
 const fetch=vi.fn();vi.stubGlobal('fetch',fetch);
 const reopened=(await loadPublicNetworkCache())!.records,groups=groupLedgerPaymentRecords(reopened);
 expect(groups).toHaveLength(1);expect(groups[0].record.sourceId).toBe('movement');
 expect(groups[0].executionRecords[0].evidence).toMatchObject({transferId,publicTransferId});
 expect(reopened).toHaveLength(2);expect(fetch).not.toHaveBeenCalled();
 // Another save/reopen must keep the relationship too.
 await savePublicNetworkCache({records:reopened,capturedAt:null,coverage:[]});
 expect(groupLedgerPaymentRecords((await loadPublicNetworkCache())!.records)).toHaveLength(1);
});
it('retains only a valid public transfer reference on its matching action family',()=>{
 const action=parsePublicNetworkPage('actions',{ok:true,actions:[{id:'execution',actionKind:'wallet.transfer.connect',transferId:'native'}]}).records[0];
 const read=(record:typeof action,alias:unknown)=>parsePublicNetworkCache({schema:'receiz.bank.public-ledger-cache.v1',authority:'public-source-projection',records:[{...record,evidence:{...record.evidence,publicTransferId:alias,accessToken:'never-retain'}}],coverage:[]}).records[0];
 expect(read(action,'tx:0123456789abcdef01234567').evidence.publicTransferId).toBe('tx:0123456789abcdef01234567');
 expect(read(action,'tx:invalid').evidence.publicTransferId).toBeUndefined();
 expect(read(action,['tx:0123456789abcdef01234567']).evidence.publicTransferId).toBeUndefined();
 expect(read(action,{toString:null}).evidence.publicTransferId).toBeUndefined();
 expect(read({...action,kind:'other.action'},'tx:0123456789abcdef01234567').evidence.publicTransferId).toBeUndefined();
 expect(read({...action,source:'wallet',id:'wallet:execution'},'tx:0123456789abcdef01234567').evidence.publicTransferId).toBeUndefined();
 expect(read(action,'tx:0123456789abcdef01234567').evidence).not.toHaveProperty('accessToken');
});
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
it('does not rewind retained freshness when an older tab saves its shipped seed date',async()=>{
 memoryIndexedDb();
 await savePublicNetworkCache({records:[],capturedAt:'2026-10-18T12:00:00Z',coverage:[]});
 await savePublicNetworkCache({records:[],capturedAt:'2026-10-02T01:25:40Z',coverage:[]});
 expect((await loadPublicNetworkCache())?.capturedAt).toBe('2026-10-18T12:00:00Z');
});
it('coalesces immediate snapshots and durably retains the newest complete anchor without a component timer',async()=>{
 const open=memoryIndexedDb(),records=parsePublicNetworkPage('actions',{ok:true,actions:[{id:'old'},{id:'new'}]}).records;
 const first=savePublicNetworkCache({records:records.slice(0,1),capturedAt:null,coverage:[{source:'actions',complete:false}]});
 const second=savePublicNetworkCache({records,capturedAt:'2026-10-18T12:00:00Z',coverage:[{source:'actions',complete:true,anchorIds:records.map(row=>row.id),observedAt:200}]});
 // An older pending snapshot must not downgrade the settled complete anchor.
 const third=savePublicNetworkCache({records:records.slice(0,1),capturedAt:null,coverage:[{source:'actions',complete:false,observedAt:100}]});
 expect(second).toBe(first);expect(third).toBe(first);await third;expect(open).toHaveBeenCalledOnce();
 const restored=await loadPublicNetworkCache();expect(restored?.records).toHaveLength(2);
 expect(restored?.coverage.find(item=>item.source==='actions')).toEqual({source:'actions',complete:true,anchorIds:records.map(row=>row.id),observedAt:200});
 expect(restored?.capturedAt).toBe('2026-10-18T12:00:00Z');
});
it('requests opaque compressed seed bytes so HTTP content decoding cannot invalidate the offline resource hash',async()=>{
 const {gzipSync}=await import('node:zlib');
 const records=parsePublicNetworkPage('actions',{ok:true,actions:[{id:'compressed-source',actionKind:'record'}],nextCursor:null}).records;
 const input={schema:'receiz.bank.public-ledger-cache.v1',authority:'public-source-projection',records,coverage:[{source:'actions',complete:true}],capturedAt:'2026-10-17T12:00:00Z'};
 const fetch=vi.fn(async(_input:string|URL|Request)=>new Response(new Uint8Array(gzipSync(JSON.stringify(input))),{headers:{'Content-Type':'application/octet-stream'}}));vi.stubGlobal('fetch',fetch);
 expect((await loadPublicNetworkSeed())?.records).toHaveLength(1);expect(fetch.mock.calls[0][0]).toBe('/receiz-public-ledger.json.gz.bin');
});
it('retains completed value-enrichment version across parsing and older-tab saves',async()=>{
 memoryIndexedDb();
 const input={schema:'receiz.bank.public-ledger-cache.v1',authority:'public-source-projection',records:[],coverage:[],inspectionVersion:2};
 expect(parsePublicNetworkCache(input).inspectionVersion).toBe(2);
 await savePublicNetworkCache({records:[],capturedAt:null,coverage:[],inspectionVersion:2});
 await savePublicNetworkCache({records:[],capturedAt:null,coverage:[],inspectionVersion:1});
 expect((await loadPublicNetworkCache())?.inspectionVersion).toBe(2);
});
it('corrects weaker cached transfer rows only beneath an admitted original and rejects a stale peer rewrite',async()=>{
 memoryIndexedDb();
 const raw={id:'canonical-transfer',actionKind:'card_transfer',entryHash:'e'.repeat(64),prevHash:'f'.repeat(64),kaiUpulse:'1000000',pulse:1,amountUsdCents:'12'};
 const canonical=parsePublicNetworkPage('actions',{ok:true,actions:[raw]}).records;
 const wrong=parsePublicNetworkPage('actions',{ok:true,actions:[{...raw,entryHash:'0'.repeat(64),amountUsdCents:'500',pulse:999,kaiUpulse:'999000000'}]}).records;
 const cache={records:canonical,capturedAt:null,coverage:[]};
 const review={snapshot:{records:[{id:raw.id,kind:raw.actionKind,kaiUpulse:raw.kaiUpulse,amountUsdCents:raw.amountUsdCents,entryHash:raw.entryHash,previousHash:raw.prevHash}]}};
 await savePublicNetworkCache({...cache,records:wrong});
 await expect(savePublicLedgerDisplayCache(review as never,cache)).rejects.toThrow('CUSTODY');
 admitted.add(review);
 await expect(savePublicLedgerDisplayCache(review as never,{...cache,records:wrong})).rejects.toThrow('SOURCE_MISMATCH');
 expect(await savePublicLedgerDisplayCache(review as never,cache)).toBe(true);
 expect((await loadPublicNetworkCache())?.records[0]).toMatchObject({amountUsdCents:'12',pulse:'1',evidence:{entryHash:raw.entryHash}});
 expect(await savePublicNetworkCache({...cache,records:wrong})).toBe(false);
 expect(await savePublicNetworkCache({...cache,records:wrong.map(record=>({...record,kind:'public record'}))})).toBe(false);
 expect((await loadPublicNetworkCache())?.records[0].amountUsdCents).toBe('12');
});
