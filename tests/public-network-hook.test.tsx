// @vitest-environment happy-dom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, expect, it, vi } from 'vitest';
import { usePublicNetwork } from '../src/receiz/usePublicNetwork';
import { parsePublicNetworkPage, PUBLIC_NETWORK_INSPECTION_VERSION, type PublicSource } from '../src/receiz/public-network';
import {parsePublicMarket,type PublicMarketCatalog} from '../src/receiz/public-market';
const network = vi.hoisted(() => ({ read: vi.fn() }));
const cache = vi.hoisted(() => ({ load: vi.fn(), seed: vi.fn(), save: vi.fn() }));
const originals = vi.hoisted(() => ({ restore: vi.fn(), sync: vi.fn(), rows: vi.fn() }));
const publications=vi.hoisted(()=>({hint:undefined as string|undefined,listeners:new Set<(catalog?:PublicMarketCatalog)=>void>()}));
vi.mock('../src/receiz/asset-publication-adoption',async original=>({...await original<typeof import('../src/receiz/asset-publication-adoption')>(),assetPublicationFreshnessHint:()=>publications.hint,subscribeAssetPublicationAdmissions:(listener:(catalog?:PublicMarketCatalog)=>void)=>{publications.listeners.add(listener);return()=>publications.listeners.delete(listener);}}));
vi.mock('../src/receiz/public-ledger-continuity',()=>({readHeldPublicLedger:originals.restore,synchronizePublicLedger:originals.sync,publicLedgerDisplayRows:originals.rows}));
vi.mock('../src/receiz/public-network', async original => ({ ...await original<typeof import('../src/receiz/public-network')>(), readPublicNetworkPage: network.read }));
vi.mock('../src/receiz/public-network-cache', () => ({ loadPublicNetworkCache: cache.load, loadPublicNetworkSeed: cache.seed, savePublicNetworkCache: cache.save }));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
beforeEach(() => { publications.hint=undefined;publications.listeners.clear();network.read.mockReset(); cache.load.mockReset().mockResolvedValue(null); cache.seed.mockReset().mockResolvedValue(null); cache.save.mockReset().mockResolvedValue(undefined); originals.restore.mockReset().mockResolvedValue(null);originals.sync.mockReset().mockResolvedValue(null);originals.rows.mockReset().mockImplementation(async(_review,known)=>known); });
function page(source: PublicSource, ids: string[] = [], cursor: string | null = null) {
  return { source, records: parsePublicNetworkPage('actions', { ok: true, actions: ids.map(id => ({ id, actionKind: 'record', summary: `Record ${id}`, pulse: 100 })), nextCursor: cursor }).records.map(item => ({ ...item, source, id: `${source}:${item.sourceId}` })), nextCursor: cursor, total: null, complete: cursor === null };
}
const proofInput=(at:string|null,ids:string[],complete=true)=>({ok:true,transport:{generatedAt:at,publicMembership:{version:1,scope:'whole-market-visible-showcase',source:complete?'canonical-complete':'partial',isComplete:complete,itemCount:ids.length},publicOriginals:ids.map(id=>({id,receizId:id,title:id,pulse:'14955302'}))}});
async function observe(run: (read: () => ReturnType<typeof usePublicNetwork>) => Promise<void>) {
  let state!: ReturnType<typeof usePublicNetwork>; const root = createRoot(document.createElement('div'));
  function Probe() { state = usePublicNetwork(); return null; }
  try { await act(async () => { root.render(<Probe />); }); await run(() => state); } finally { act(() => root.unmount()); }
}
it('updates other public sources when one is unavailable', async () => {
  network.read.mockImplementation(async (source: PublicSource) => { if (source === 'wallet') throw new Error('Unavailable'); return page(source, [source]); });
  await observe(async read => { expect(read().records).toHaveLength(3); expect(read().sources.wallet.status).toBe('error'); expect(read().sources.actions.status).toBe('live'); });
});
it('refreshes only Ledger proofs when native publication is acknowledged, while pending local admission does not claim public discovery',async()=>{
 let published=false;network.read.mockImplementation(async(source:PublicSource)=>page(source,source==='proofs'&&published?['published-original']:[]));
 await observe(async read=>{
  await act(async()=>{for(const listener of publications.listeners)listener();});expect(network.read).toHaveBeenCalledTimes(4);
  published=true;publications.hint='a'.repeat(64);
  await act(async()=>{for(const listener of publications.listeners)listener();});
  expect(read().records.map(row=>row.sourceId)).toContain('published-original');expect(network.read).toHaveBeenCalledTimes(5);expect(network.read.mock.calls.at(-1)?.[0]).toBe('proofs');
 });
 expect(publications.listeners.size).toBe(0);
});
it('adopts a confirmed public publication catalog immediately and ignores an older in-flight proof response',async()=>{
 let finish!:(value:ReturnType<typeof page>)=>void;network.read.mockImplementation((source:PublicSource)=>source==='proofs'?new Promise(resolve=>{finish=resolve;}):Promise.resolve(page(source,[source])));
 const catalog=parsePublicMarket({ok:true,transport:{publicMembership:{version:1,scope:'whole-market-visible-showcase',source:'canonical-complete',isComplete:true,itemCount:1},publicOriginals:[{id:'published-original',receizId:'published-original',title:'Published Original',pulse:'14955302',profileOriginal:{media:{originalDownloadSha256Hex:'e'.repeat(64)}}}]}});
 await observe(async read=>{
  await act(async()=>{for(const listener of publications.listeners)listener(catalog);});
  expect(read().records.find(row=>row.source==='proofs')).toMatchObject({sourceId:'published-original',title:'Published Original',evidence:{artifactDigest:'e'.repeat(64)}});
  await act(async()=>finish(page('proofs')));
  expect(read().records.find(row=>row.source==='proofs')?.sourceId).toBe('published-original');expect(read().sources.proofs.complete).toBe(true);expect(network.read).toHaveBeenCalledTimes(4);
 });
});
it('keeps confirmed public publication freshness when an older proof request rejects',async()=>{
 let reject!:(cause:Error)=>void;network.read.mockImplementation((source:PublicSource)=>source==='proofs'?new Promise((_resolve,fail)=>{reject=fail;}):Promise.resolve(page(source,[source])));
 const catalog=parsePublicMarket({ok:true,transport:{publicMembership:{version:1,scope:'whole-market-visible-showcase',source:'canonical-complete',isComplete:true,itemCount:1},publicOriginals:[{id:'published-original',receizId:'published-original',title:'Published Original',pulse:'14955302',profileOriginal:{media:{originalDownloadSha256Hex:'e'.repeat(64)}}}]}});
 await observe(async read=>{
  await act(async()=>{for(const listener of publications.listeners)listener(catalog);});
  const observedAt=read().sources.proofs.observedAt;
  await act(async()=>reject(Error('Older request unavailable')));
  expect(read().records.find(row=>row.source==='proofs')?.sourceId).toBe('published-original');
  expect(read().sources.proofs).toMatchObject({status:'live',complete:true,error:null,busy:false,observedAt});
 });
});
it('preserves a newer public publication catalog while retaining partial additions when earlier catalogs finish late',async()=>{
 network.read.mockImplementation(async(source:PublicSource)=>page(source));
 const catalog=(at:string,ids:string[],complete=true)=>parsePublicMarket({ok:true,transport:{generatedAt:at,publicMembership:{version:1,scope:'whole-market-visible-showcase',source:complete?'canonical-complete':'partial',isComplete:complete,itemCount:ids.length},publicOriginals:ids.map(id=>({id,receizId:id,title:id,pulse:'14955302'}))}});
 await observe(async read=>{
  await act(async()=>{for(const listener of publications.listeners)listener(catalog('2026-11-04T12:00:02Z',['existing','published-original']));});
  await act(async()=>{for(const listener of publications.listeners)listener(catalog('2026-11-04T12:00:03Z',['partial-original'],false));});
  await act(async()=>{for(const listener of publications.listeners)listener(catalog('2026-11-04T12:00:01Z',['existing']));});
  expect(read().records.filter(row=>row.source==='proofs').map(row=>row.sourceId)).toEqual(expect.arrayContaining(['existing','published-original','partial-original']));
  await act(async()=>{for(const listener of publications.listeners)listener(catalog('2026-11-04T12:00:04Z',['published-original']));});
  expect(read().records.filter(row=>row.source==='proofs').map(row=>row.sourceId)).toEqual(['published-original']);
  expect(read().sources.proofs).toMatchObject({status:'live',complete:true,error:null});
 });
});
it.each([['older','2026-11-04T12:00:00Z'],['undated',null]]as const)('retains newer dated public membership when an %s proof page arrives on a later read',async(_kind,at)=>{
 let input=proofInput('2026-11-04T12:00:00Z',['existing','removed-original']);
 network.read.mockImplementation(async(source:PublicSource)=>source==='proofs'?parsePublicNetworkPage('proofs',input):page(source));
 await observe(async read=>{
  await act(async()=>{for(const listener of publications.listeners)listener(parsePublicMarket(proofInput('2026-11-04T12:00:02Z',['existing','published-original'])));});
  input=proofInput(at,['existing','removed-original']);
  await act(async()=>read().refresh());
  expect(read().records.filter(row=>row.source==='proofs').map(row=>row.sourceId)).toEqual(['existing','published-original']);
  expect(read().sources.proofs).toMatchObject({status:'live',complete:true,error:null});
  input=proofInput('2026-11-04T12:00:04Z',['existing','newer-original']);
  await act(async()=>read().refresh());
  await act(async()=>{for(const listener of publications.listeners)listener(parsePublicMarket(proofInput('2026-11-04T12:00:03Z',['existing','removed-original'])));});
  expect(read().records.filter(row=>row.source==='proofs').map(row=>row.sourceId)).toEqual(['existing','newer-original']);
 });
});
it.each([['older','2026-11-04T12:00:00Z'],['undated',null]]as const)('does not re-add removed public Originals or downgrade coverage from an %s partial publication catalog',async(_kind,at)=>{
 network.read.mockImplementation(async(source:PublicSource)=>page(source));
 await observe(async read=>{
  await act(async()=>{for(const listener of publications.listeners)listener(parsePublicMarket(proofInput('2026-11-04T12:00:02Z',['published-original'])));});
  await act(async()=>{for(const listener of publications.listeners)listener(parsePublicMarket(proofInput(at,['removed-original'],false)));});
  expect(read().records.filter(row=>row.source==='proofs').map(row=>row.sourceId)).toEqual(['published-original']);
  expect(read().sources.proofs).toMatchObject({status:'live',complete:true,error:null});
 });
});
it('carries the public membership capture time into the Ledger proof page',()=>{
 expect(parsePublicNetworkPage('proofs',proofInput('2026-11-04T12:00:02Z',['published-original']))).toMatchObject({observedAt:'2026-11-04T12:00:02Z'});
});
it('queues the acknowledged publication read behind an already-running proof request without repeating other sources',async()=>{
 let finish!:(value:ReturnType<typeof page>)=>void,reads=0;
 network.read.mockImplementation((source:PublicSource)=>source==='proofs'&&++reads===1?new Promise(resolve=>{finish=resolve;}):Promise.resolve(page(source,source==='proofs'?['published-original']:[])));
 await observe(async read=>{
  publications.hint='b'.repeat(64);await act(async()=>{for(const listener of publications.listeners)listener();});expect(network.read).toHaveBeenCalledTimes(4);
  await act(async()=>finish(page('proofs')));
  expect(read().records.find(row=>row.source==='proofs')?.sourceId).toBe('published-original');expect(network.read).toHaveBeenCalledTimes(5);
 });
});
it('sends the existing publication freshness reference only on the client proof membership request',async()=>{
 const {readPublicNetworkPage}=await vi.importActual<typeof import('../src/receiz/public-network')>('../src/receiz/public-network');
 const fetcher=vi.spyOn(globalThis,'fetch').mockImplementation(async input=>String(input).includes('source=proofs')?Response.json({ok:true,transport:{publicOriginals:[]}}):Response.json({ok:true,ledgerRows:[]}));
 publications.hint='c'.repeat(64);
 try{await readPublicNetworkPage('proofs');await readPublicNetworkPage('graph');expect(String(fetcher.mock.calls[0][0])).toBe('/api/bank/public-network?source=proofs&afterPublication='+'c'.repeat(64));expect(String(fetcher.mock.calls[1][0])).toBe('/api/bank/public-network?source=graph');}finally{fetcher.mockRestore();}
});
it('preserves accepted publication membership and coverage when an older cold cache finishes later',async()=>{
 let finish!:(value:unknown)=>void;cache.load.mockReturnValue(new Promise(resolve=>{finish=resolve;}));
 network.read.mockReturnValue(new Promise(()=>{}));
 await observe(async read=>{
  await act(async()=>{for(const listener of publications.listeners)listener(parsePublicMarket(proofInput('2026-11-04T12:00:02Z',['published-original'])));});
  await act(async()=>finish({records:[...parsePublicNetworkPage('proofs',proofInput('2026-11-04T12:00:00Z',['removed-original'])).records,...page('actions',['retained-action']).records],capturedAt:null,inspectionVersion:PUBLIC_NETWORK_INSPECTION_VERSION,coverage:[{source:'proofs',complete:false},{source:'actions',complete:true}]}));
  expect(read().records.filter(row=>row.source==='proofs').map(row=>row.sourceId)).toEqual(['published-original']);
  expect(read().sources.proofs).toMatchObject({status:'live',complete:true,error:null});
  expect(read().records.some(row=>row.source==='actions'&&row.sourceId==='retained-action')).toBe(true);
 });
});
it('preloads retained public rows before the Ledger is clicked, without a live request or a second cache read',async()=>{
 const records=page('actions',['retained-head','retained-old']).records;
 cache.load.mockResolvedValue({records,capturedAt:null,inspectionVersion:PUBLIC_NETWORK_INSPECTION_VERSION,coverage:(['actions','wallet','graph','proofs']as const).map(source=>({source,complete:true}))});
 network.read.mockReturnValue(new Promise(()=>{}));let state!:ReturnType<typeof usePublicNetwork>;
 function Probe({active}:{active:boolean}){state=usePublicNetwork(active);return null;}
 const root=createRoot(document.createElement('div'));
 try{
  await act(async()=>root.render(<Probe active={false}/>));
  expect(state.records.map(row=>row.sourceId)).toEqual(['retained-head','retained-old']);expect(network.read).not.toHaveBeenCalled();expect(cache.seed).not.toHaveBeenCalled();expect(originals.sync).not.toHaveBeenCalled();
  await act(async()=>root.render(<Probe active/>));
  expect(state.records.map(row=>row.sourceId)).toEqual(['retained-head','retained-old']);expect(cache.load).toHaveBeenCalledOnce();expect(network.read).toHaveBeenCalledTimes(4);
 }finally{act(()=>root.unmount());}
});
it('reuses completed live heads when a slower retained seed finishes instead of fetching the same data twice',async()=>{
 let finish!:(value:unknown)=>void;cache.seed.mockReturnValue(new Promise(resolve=>{finish=resolve;}));
 network.read.mockImplementation(async(source:PublicSource)=>page(source,[source+'-head']));
 await observe(async read=>{
  expect(network.read).toHaveBeenCalledTimes(4);
  await act(async()=>finish({records:page('actions',['older']).records,capturedAt:null,inspectionVersion:PUBLIC_NETWORK_INSPECTION_VERSION,coverage:(['actions','wallet','graph','proofs']as const).map(source=>({source,complete:true}))}));
  expect(read().records.some(row=>row.sourceId==='older')).toBe(true);
  expect(network.read).toHaveBeenCalledTimes(4);expect(originals.sync).toHaveBeenCalledTimes(1);
 });
});
it('keeps live work and settled rows across a quick tab return, pauses polling, and resumes fresh additions',async()=>{
 vi.useFakeTimers();
 let finish!:(value:ReturnType<typeof page>)=>void,addition=false,state!:ReturnType<typeof usePublicNetwork>;
 network.read.mockImplementation((source:PublicSource)=>source==='actions'&&!addition?new Promise(resolve=>{finish=resolve;}):Promise.resolve(page(source,source==='actions'?['fresh-addition','settled']:[])));
 function Probe({active}:{active:boolean}){state=usePublicNetwork(active);return null;}
 const root=createRoot(document.createElement('div'));
 try{
  await act(async()=>root.render(<Probe active/>));expect(network.read).toHaveBeenCalledTimes(4);
  await act(async()=>root.render(<Probe active={false}/>));
  await act(async()=>finish(page('actions',['settled'])));
  expect(state.records.map(row=>row.sourceId)).toContain('settled');const held=state.records;
  await act(async()=>root.render(<Probe active/>));
  expect(network.read).toHaveBeenCalledTimes(4);expect(originals.sync).toHaveBeenCalledOnce();expect(state.records).toBe(held);
  await act(async()=>root.render(<Probe active={false}/>));
  await act(async()=>vi.advanceTimersByTimeAsync(120_000));expect(network.read).toHaveBeenCalledTimes(4);
  addition=true;await act(async()=>root.render(<Probe active/>));
  expect(network.read).toHaveBeenCalledTimes(8);expect(state.records.map(row=>row.sourceId).sort()).toEqual(['fresh-addition','settled']);
 }finally{act(()=>root.unmount());vi.useRealTimers();}
});
it('finishes a seed-revealed history gap after a pause without rereading unrelated heads',async()=>{
 let finish!:(value:unknown)=>void,state!:ReturnType<typeof usePublicNetwork>;
 cache.seed.mockReturnValue(new Promise(resolve=>{finish=resolve;}));
 network.read.mockImplementation(async(source:PublicSource,cursor?:string)=>source==='actions'?page(source,cursor?['gap','older']:['head'],cursor?null:'42'):page(source));
 function Probe({active}:{active:boolean}){state=usePublicNetwork(active);return null;}
 const root=createRoot(document.createElement('div'));
 try{
  await act(async()=>root.render(<Probe active/>));expect(network.read).toHaveBeenCalledTimes(4);
  await act(async()=>root.render(<Probe active={false}/>));
  await act(async()=>finish({records:page('actions',['older']).records,capturedAt:null,inspectionVersion:PUBLIC_NETWORK_INSPECTION_VERSION,coverage:[{source:'actions',complete:true}]}));
  expect(network.read).toHaveBeenCalledTimes(4);
  await act(async()=>root.render(<Probe active/>));
  expect(state.records.map(row=>row.sourceId)).toEqual(expect.arrayContaining(['head','gap','older']));
  expect(network.read.mock.calls.filter(([source])=>source!=='actions')).toHaveLength(3);
 }finally{act(()=>root.unmount());}
});
it('repairs a newly revealed history gap while unrelated feeds and proof synchronization are pending',async()=>{
 let finish!:(value:unknown)=>void;cache.seed.mockReturnValue(new Promise(resolve=>{finish=resolve;}));originals.sync.mockReturnValue(new Promise(()=>{}));
 network.read.mockImplementation(async(source:PublicSource,cursor?:string)=>source==='graph'?new Promise(()=>{}):source==='actions'?page(source,cursor?['gap','older']:['head'],cursor?null:'42'):page(source));
 await observe(async read=>{
  await act(async()=>finish({records:page('actions',['older']).records,capturedAt:null,inspectionVersion:PUBLIC_NETWORK_INSPECTION_VERSION,coverage:[{source:'actions',complete:true}]}));
  expect(network.read.mock.calls.some(([source,cursor])=>source==='actions'&&cursor==='42')).toBe(true);
  expect(read().records.map(row=>row.sourceId)).toEqual(expect.arrayContaining(['head','gap','older']));expect(read().sources.graph.busy).toBe(true);
 });
});
it('stops repeated source cursors instead of looping forever', async () => {
  network.read.mockImplementation(async (source: PublicSource, cursor?: string) => source === 'actions' ? page(source, cursor ? ['older'] : ['head'], '42') : page(source));
  await observe(async read => { await act(async () => { await read().loadMore(); }); expect(read().sources.actions.error).toContain('cursor'); const calls = network.read.mock.calls.length; await act(async () => { await read().loadMore(); }); expect(network.read.mock.calls.length).toBe(calls); });
});
it('head refresh preserves historical records and the in-progress older cursor', async () => {
  network.read.mockImplementation(async (source: PublicSource, cursor?: string) => source === 'actions' ? page(source, cursor ? ['older'] : ['head'], cursor ? '20' : '42') : page(source));
  await observe(async read => { await act(async () => { await read().loadMore(); }); await act(async () => { await read().refresh(); }); expect(read().records.some(item => item.sourceId === 'older')).toBe(true); expect(read().sources.actions.cursor).toBe('20'); });
});
it('fills the gap between an incomplete recent cache and the complete public seed', async () => {
  cache.load.mockResolvedValue({ records: page('actions', ['head']).records, capturedAt: null, coverage: [{ source: 'actions', complete: false }] });
  cache.seed.mockResolvedValue({ records: page('actions', ['older']).records, capturedAt: null, coverage: [{ source: 'actions', complete: true }] });
  network.read.mockImplementation(async (source: PublicSource, cursor?: string) => source === 'actions' ? page(source, cursor ? ['gap', 'older'] : ['head'], cursor ? null : '42') : page(source));
  await observe(async read => { expect(read().records.map(item => item.sourceId)).toEqual(expect.arrayContaining(['head', 'gap', 'older'])); expect(read().sources.actions.complete).toBe(true); });
});

it('paints the newest cached head before a pending seed and persists additions without an unmount delay',async()=>{
 let finish!:(value:null)=>void;cache.seed.mockImplementation(()=>new Promise(resolve=>{finish=resolve;}));
 cache.load.mockResolvedValue({records:page('actions',['newest']).records,capturedAt:'2026-10-18T12:00:00Z',coverage:[{source:'actions',complete:false}]});
 network.read.mockRejectedValue(Error('503'));
 await observe(async read=>{
  expect(read().records.map(row=>row.sourceId)).toEqual(['newest']);expect(read().bootstrap).toBe(false);
  expect(cache.save).toHaveBeenCalled();expect(originals.sync).toHaveBeenCalled();
  await act(async()=>finish(null));
 });
 expect(cache.save.mock.calls.at(-1)![0].records[0].sourceId).toBe('newest');
});

it('restores supported original rows offline and polls the source independently of row discovery',async()=>{
 originals.restore.mockResolvedValue({artifactSha256:'held'});originals.rows.mockImplementation(async(_review,known)=>[...known,...page('actions',['sealed-head']).records]);
 network.read.mockRejectedValue(Error('503'));
 await observe(async read=>{
  expect(read().records.some(row=>row.sourceId==='sealed-head')).toBe(true);
  expect(read().sources.wallet.complete).toBe(false);expect(read().sources.actions.complete).toBe(false);
  await act(async()=>read().refresh());expect(originals.sync).toHaveBeenCalledTimes(2);
  expect(cache.save.mock.calls.at(-1)![0].records.some((row:{sourceId:string})=>row.sourceId==='sealed-head')).toBe(true);
 });
});
it('starts persisting an accepted live addition and its complete anchor before immediate unmount',async()=>{
 let ids:string[]=[];network.read.mockImplementation(async(source:PublicSource)=>page(source,source==='actions'?ids:[]));
 await observe(async read=>{
  ids=['live-addition'];await act(async()=>read().refresh());
  const saved=cache.save.mock.calls.at(-1)![0];expect(saved.records.map((row:{sourceId:string})=>row.sourceId)).toEqual(['live-addition']);
  expect(saved.coverage.find((item:{source:string})=>item.source==='actions')).toMatchObject({complete:true,anchorIds:['actions:live-addition']});
 });
 expect(cache.save.mock.calls.at(-1)![0].records[0].sourceId).toBe('live-addition');
});
it('rebases a delayed original fill on concurrent public rows',async()=>{
 let finish!:(value:ReturnType<typeof page>['records'])=>void;originals.restore.mockResolvedValue({artifactSha256:'held'});
 originals.rows.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;})).mockImplementation(async(_review,known)=>[...known,...page('actions',['sealed']).records]);
 let addition=false;network.read.mockImplementation(async(source:PublicSource)=>page(source,source==='graph'?['live-graph']:source==='actions'&&addition?['live-action']:[]));
 await observe(async read=>{
  expect(read().records.some(row=>row.sourceId==='live-graph')).toBe(true);
  addition=true;await act(async()=>read().refresh());
  await act(async()=>finish(page('actions',['sealed']).records));
  expect(read().records.map(row=>row.sourceId)).toEqual(expect.arrayContaining(['sealed','live-graph','live-action']));
 });
});

it('persists the complete anchor separately so interrupted catch-up resumes after reload', async () => {
  vi.useFakeTimers();
  try {
    const seed = { records: page('actions', ['old']).records, capturedAt: null, coverage: [{ source: 'actions', complete: true }] };
    cache.seed.mockResolvedValue(seed);
    network.read.mockImplementation(async (source: PublicSource, cursor?: string) => {
      if (source !== 'actions') return page(source);
      if (cursor) throw new Error('Interrupted');
      return page(source, ['new'], 'gap');
    });
    await observe(async read => {
      expect(read().sources.actions.status).toBe('stale');
      await act(async () => { await vi.advanceTimersByTimeAsync(1001); });
    });
    const saved = structuredClone(cache.save.mock.calls.at(-1)![0]);
    cache.load.mockResolvedValue(saved);
    network.read.mockClear().mockImplementation(async (source: PublicSource, cursor?: string) => source === 'actions' ? page(source, cursor ? ['missing', 'old'] : ['new'], cursor ? null : 'gap') : page(source));
    await observe(async read => {
      expect(read().records.map(row => row.sourceId)).toEqual(expect.arrayContaining(['new', 'missing', 'old']));
      expect(read().sources.actions.status).toBe('live');
      expect(network.read.mock.calls.some(([source, cursor]) => source === 'actions' && cursor === 'gap')).toBe(true);
    });
  } finally { vi.useRealTimers(); }
});
it('enriches a complete v1 cache once and retains the snapshot when the old feed repeats that entry',async()=>{
 const raw={id:'restored-card',actionKind:'card_transfer',entryHash:'a'.repeat(64),pulse:120,claimHash:'b'.repeat(64)};
 const thin=parsePublicNetworkPage('actions',{ok:true,actions:[raw]}),enriched=parsePublicNetworkPage('actions',{ok:true,actions:[{...raw,cardValueUsdCents:'9900'}]});
 const coverage=(['actions','wallet','graph','proofs'] as const).map(source=>({source,complete:true,anchorIds:source==='actions'?thin.records.map(row=>row.id):[]}));
 cache.load.mockResolvedValue({records:thin.records,capturedAt:null,inspectionVersion:1,coverage});
 cache.seed.mockResolvedValue({records:enriched.records,capturedAt:null,inspectionVersion:PUBLIC_NETWORK_INSPECTION_VERSION,coverage});
 network.read.mockImplementation(async(source:PublicSource)=>source==='actions'?thin:page(source));
 await observe(async read=>{
  expect(read().records.find(row=>row.sourceId==='restored-card')?.valueOperands?.cardValueUsdCents).toBe('9900');
  expect(cache.seed).toHaveBeenCalledOnce();
  await act(async()=>read().refresh());
  expect(read().records.find(row=>row.sourceId==='restored-card')?.valueOperands?.cardValueUsdCents).toBe('9900');
  expect(cache.save.mock.calls.at(-1)![0].inspectionVersion).toBe(PUBLIC_NETWORK_INSPECTION_VERSION);
 });
 const saved=structuredClone(cache.save.mock.calls.at(-1)![0]);cache.load.mockResolvedValue(saved);cache.seed.mockClear();
 await observe(async read=>{expect(read().records.find(row=>row.sourceId==='restored-card')?.valueOperands?.cardValueUsdCents).toBe('9900');expect(cache.seed).not.toHaveBeenCalled();});
});
it('retains bound transfer evidence during complete graph replacement without reviving withdrawn rows',async()=>{
 const id=`sports-card-transfer-rsc_${'1'.repeat(16)}-${'b'.repeat(64)}:${'c'.repeat(24)}`;
 const raw={id,ledgerKind:'card-transfer',eventKaiPulse:120,claimHash:'b'.repeat(64),collectibleId:`rsc_${'1'.repeat(16)}`};
 const thin=parsePublicNetworkPage('graph',{ok:true,ledgerRows:[raw]}),enriched=parsePublicNetworkPage('graph',{ok:true,ledgerRows:[{...raw,cardValueUsdCents:'9900'}]});
 cache.load.mockResolvedValue({records:[...enriched.records,...page('graph',['withdrawn']).records],capturedAt:null,inspectionVersion:2,coverage:(['actions','wallet','graph','proofs'] as const).map(source=>({source,complete:true}))});
 network.read.mockImplementation(async(source:PublicSource)=>source==='graph'?thin:page(source));
 await observe(async read=>{
  expect(read().records.find(row=>row.sourceId===id)?.valueOperands?.cardValueUsdCents).toBe('9900');
  expect(read().records.some(row=>row.sourceId==='withdrawn')).toBe(false);
  await act(async()=>read().refresh());
  expect(read().records.find(row=>row.sourceId===id)?.valueOperands?.cardValueUsdCents).toBe('9900');
 });
});

it('upgrades an older cached sale beyond the held head once, without clearing visible history',async()=>{
 const raw={id:'old-sale',actionKind:'market.share.sell',entryHash:'a'.repeat(64),assetTrade:{side:'sell',marketItemId:'profile:artist:work',title:'Old caption',shareQuantityMicro:'0',settlementUsdCents:'12500',feeUsdCents:'0'}};
 const thin=parsePublicNetworkPage('actions',{ok:true,actions:[raw]}),exact=parsePublicNetworkPage('actions',{ok:true,actions:[{...raw,assetTrade:{...raw.assetTrade,tradeId:'3fb381c0-e10c-4f81-8af6-4bd83d135f86',shareQuantityMicro:'2500000',priceUsdCents:'5000',realizedCostBasisUsdCents:'10000'}}]});
 const head=page('actions',['new-head'],'older-page'),records=[...head.records,...thin.records],coverage=(['actions','wallet','graph','proofs'] as const).map(source=>({source,complete:true,anchorIds:source==='actions'?records.map(row=>row.id):[]}));
 cache.load.mockResolvedValue({records,capturedAt:null,inspectionVersion:4,coverage});
 network.read.mockImplementation(async(source:PublicSource,cursor?:string)=>source==='actions'?cursor?exact:head:page(source));
 await observe(async read=>{
  expect(read().records.map(row=>row.sourceId)).toEqual(expect.arrayContaining(['new-head','old-sale']));
  expect(read().records.find(row=>row.sourceId==='old-sale')?.details?.assetTrade).toMatchObject({shareQuantityMicro:'2500000',realizedCostBasisUsdCents:'10000'});
  expect(read().sources.actions.complete).toBe(true);
 });
 const saved=structuredClone(cache.save.mock.calls.at(-1)![0]);cache.load.mockResolvedValue(saved);network.read.mockClear();cache.seed.mockClear();
 await observe(async read=>{expect(read().records.find(row=>row.sourceId==='old-sale')?.details?.assetTrade).toMatchObject({shareQuantityMicro:'2500000'});expect(network.read.mock.calls.some(([source,cursor])=>source==='actions'&&cursor)).toBe(false);expect(cache.seed).not.toHaveBeenCalled();});
});
it('includes old trade rows restored by a delayed seed while the live head is still pending',async()=>{
 let releaseSeed!:(value:unknown)=>void,releaseHead!:(value:ReturnType<typeof page>)=>void;
 const seedPending=new Promise(resolve=>{releaseSeed=resolve;}),headPending=new Promise<ReturnType<typeof page>>(resolve=>{releaseHead=resolve;});
 const raw={id:'delayed-sale',actionKind:'market.share.sell',entryHash:'a'.repeat(64),assetTrade:{side:'sell',marketItemId:'profile:artist:work',shareQuantityMicro:'0',settlementUsdCents:'12500'}};
 const old=parsePublicNetworkPage('actions',{ok:true,actions:[raw]}),exact=parsePublicNetworkPage('actions',{ok:true,actions:[{...raw,assetTrade:{...raw.assetTrade,tradeId:'3fb381c0-e10c-4f81-8af6-4bd83d135f86',shareQuantityMicro:'2500000',realizedCostBasisUsdCents:'10000'}}]});
 const head=page('actions',['new-head'],'older-page'),coverage=(['actions','wallet','graph','proofs'] as const).map(source=>({source,complete:true,anchorIds:source==='actions'?head.records.map(row=>row.id):[]}));
 cache.load.mockResolvedValue({records:head.records,capturedAt:null,inspectionVersion:4,coverage});cache.seed.mockReturnValue(seedPending);
 network.read.mockImplementation(async(source:PublicSource,cursor?:string)=>source==='actions'?cursor?exact:headPending:page(source));
 await observe(async read=>{
  await act(async()=>releaseSeed({records:old.records,capturedAt:null,inspectionVersion:4,coverage}));
  expect(read().records.some(row=>row.sourceId==='delayed-sale')).toBe(true);
  await act(async()=>releaseHead(head));
  expect(read().records.find(row=>row.sourceId==='delayed-sale')?.details?.assetTrade).toMatchObject({shareQuantityMicro:'2500000',realizedCostBasisUsdCents:'10000'});
  expect(cache.save.mock.calls.at(-1)![0].inspectionVersion).toBe(PUBLIC_NETWORK_INSPECTION_VERSION);
 });
});

it('keeps the held record list across unchanged complete source refreshes',async()=>{
 network.read.mockImplementation(async(source:PublicSource)=>page(source,[source+'-same']));
 await observe(async read=>{
  const held=read().records;
  await act(async()=>{await read().refresh();});
  expect(read().records).toBe(held);
  expect(network.read).toHaveBeenCalledTimes(8);
 });
});
