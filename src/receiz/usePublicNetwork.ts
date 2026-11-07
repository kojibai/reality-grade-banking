import {ledgerAssetTradeSide,ledgerAssetTrade} from './ledger-asset-trade';
import { useCallback, useEffect, useRef, useState } from 'react';
import { PUBLIC_SOURCES, PUBLIC_NETWORK_INSPECTION_VERSION, mergePublicRecords, publicMarketRecord, readPublicNetworkPage, type PublicRecord, type PublicSource } from './public-network';
import {assetPublicationFreshnessHint,subscribeAssetPublicationAdmissions} from './asset-publication-adoption';
import { loadPublicNetworkCache, loadPublicNetworkSeed, savePublicNetworkCache } from './public-network-cache';
import {restorePublicNetworkRows} from './public-network-bootstrap';
import {subscribePublicLedgerSync} from './public-ledger-sync';
import {publicLedgerDisplayRows,readHeldPublicLedger,synchronizePublicLedger} from './public-ledger-continuity';
import type {PublicLedgerFileReview} from './public-ledger-proof';
import type {PublicNetworkCache} from './public-network-cache';
import type {PublicMarketCatalog} from './public-market';

export interface PublicSourceState { status: 'loading' | 'live' | 'stale' | 'error'; cursor: string | null; complete: boolean; busy: boolean; error: string | null; observedAt?: number; }
type Sources = Record<PublicSource, PublicSourceState>;
function initialSources(): Sources { return Object.fromEntries(PUBLIC_SOURCES.map(source => [source, { status: 'loading', cursor: null, complete: false, busy: false, error: null }])) as Sources; }
type PublicCatalogMarker=HTMLElement&{publicMarketCatalog?:()=>PublicMarketCatalog|null;subscribePublicMarketCatalog?:(listener:()=>void)=>()=>void};
function heldProofCatalog(){
  if(typeof document==='undefined')return null;
  try{const catalog=(document.getElementById('receiz-navigation') as PublicCatalogMarker|null)?.publicMarketCatalog?.();return catalog?.complete?catalog:null;}catch{return null;}
}
export function usePublicNetwork(active = true, initialSnapshot?:PublicNetworkCache) {
  const [initialProofs]=useState(()=>{
    const catalog=heldProofCatalog(),at=Date.parse(catalog?.observedAt??''),preparedAt=initialSnapshot?.coverage.find(row=>row.source==='proofs'&&row.complete)?.observedAt;
    // Prepared document coverage carries the actual Source capture. Unlike
    // restored IDB receipt clocks, it can order this held Market projection.
    if(preparedAt!==undefined&&(!Number.isFinite(at)||at<preparedAt))return null;
    return catalog?{catalog,records:catalog.items.filter(item=>item.category==='proof').map(publicMarketRecord)}:null;
  });
  const [records, setRecords] = useState<PublicRecord[]>(()=>initialProofs?mergePublicRecords(initialSnapshot?.records.filter(row=>row.source!=='proofs')??[],initialProofs.records):initialSnapshot?.records??[]), rows = useRef(records);
  const [sources, setSources] = useState<Sources>(()=>{const initial=initialSources();for(const covered of initialSnapshot?.coverage??[])initial[covered.source]={status:'stale',cursor:null,complete:covered.complete,busy:false,error:null,observedAt:covered.observedAt};if(initialProofs)initial.proofs={status:'live',cursor:null,complete:true,busy:false,error:null,observedAt:Date.now()};return initial;}), sourceState = useRef(sources);
  const [bootstrap, setBootstrap] = useState(!initialSnapshot), [capturedAt, setCapturedAt] = useState<string | null>(initialSnapshot?.capturedAt??null);
  const capture = (value:string|null) => { if(value)setCapturedAt(previous=>!previous||Date.parse(value)>Date.parse(previous)?value:previous); };
  const lifetime = useRef<AbortController | null>(null);
  const enabled=useRef(active);enabled.current=active;
  const activate=useRef<(()=>Promise<void>)|null>(null),lastRefresh=useRef<number|null>(null);
  const deferredRepairs=useRef(new Set<PublicSource>());
  const inspectionVersion=useRef(initialSnapshot?.inspectionVersion??0);
  const sourceReads=useRef(new Map<PublicSource,{controller:AbortController;promise:Promise<void>}>());
  const proofRevision=useRef(initialProofs?1:0),publicationRefresh=useRef<Promise<void>|null>(null);
  const proofObservedAt=useRef<number|null>(initialProofs?(Number.isFinite(Date.parse(initialProofs.catalog.observedAt??''))?Date.parse(initialProofs.catalog.observedAt!):null):initialSnapshot?.coverage.find(row=>row.source==='proofs')?.observedAt??null);
  const selectedProofCatalog=useRef(initialProofs?.catalog??null);
  const activeTradeRepair=useRef<{targets:Set<string>;seen:Set<string>}|null>(null);
  const originalProjection=useRef<{digest:string;records:PublicRecord[]}|null>(null);
  const saved=useRef<{records:PublicRecord[];capturedAt:string|null;coverage:string;inspectionVersion:number}|null>(null);
  const retainedCache=useRef<Promise<PublicNetworkCache|null>|null>(null);
  const [initialAnchors]=useState(()=>({...Object.fromEntries((initialSnapshot?.coverage??[]).filter(row=>row.complete).map(row=>[row.source,new Set(row.anchorIds??initialSnapshot!.records.filter(record=>record.source===row.source).map(record=>record.id))])),...(initialProofs?{proofs:new Set(initialProofs.records.map(row=>row.id))}:{})}) as Partial<Record<PublicSource,Set<string>>>);
  const completeAnchors = useRef(initialAnchors);
  const historyCursors = useRef<Record<PublicSource, Set<string>>>({ actions: new Set(), wallet: new Set(), graph: new Set(), proofs: new Set() });
  // Source capture dates order public display membership only. An older or
  // undated response cannot reopen visibility removed by a newer dated read.
  const acceptsProofCapture=useCallback((value:string|null|undefined)=>{
    const observedAt=Date.parse(value??'');
    if(proofObservedAt.current!==null&&(!Number.isFinite(observedAt)||observedAt<proofObservedAt.current))return false;
    if(Number.isFinite(observedAt))proofObservedAt.current=observedAt;
    return true;
  },[]);
  const update = (source: PublicSource, patch: Partial<PublicSourceState>) => { const next = { ...sourceState.current, [source]: { ...sourceState.current[source], ...patch } }; sourceState.current = next; setSources(next); };
  const append = (source: PublicSource, incoming: PublicRecord[], replace = false) => {
    const incomingIds = new Set(incoming.map(row => row.id));
    const held=rows.current;
    const removed=replace&&held.some(row=>row.source===source&&!incomingIds.has(row.id));
    const next = mergePublicRecords(removed ? held.filter(row => row.source !== source || incomingIds.has(row.id)) : held, incoming); rows.current = next; setRecords(next);
  };
  // Market already selected this exact public cohort. Reuse it for Proofs;
  // opening or returning to Ledger does not rediscover the same Originals.
  const reuseHeldProofs=useCallback(()=>{
    const catalog=heldProofCatalog();if(!catalog)return false;
    if(selectedProofCatalog.current===catalog||!acceptsProofCapture(catalog.observedAt))return true;
    selectedProofCatalog.current=catalog;proofRevision.current++;
    const proofs=catalog.items.filter(item=>item.category==='proof').map(publicMarketRecord);
    append('proofs',proofs,true);capture(catalog.observedAt);
    update('proofs',{status:'live',complete:true,observedAt:Date.now(),cursor:null,busy:false,error:null});
    completeAnchors.current.proofs=new Set(proofs.map(row=>row.id));return true;
  },[acceptsProofCapture]);
  const performSourceRead = useCallback(async (source: PublicSource, phase: 'head' | 'older') => {
    if(source==='proofs'&&phase==='head'&&reuseHeldProofs())return;
    const controller = lifetime.current, before = sourceState.current[source];
    if (!controller || controller.signal.aborted || before.busy || phase === 'older' && (before.complete || !before.cursor || before.error)) return;
    const existing = phase === 'head' && completeAnchors.current[source] ? completeAnchors.current[source]! : new Set(rows.current.filter(row => row.source === source).map(row => row.id));
    // One display migration reaches old cached trades beyond a held head. It
    // never clears first paint, and subsequent reads keep normal head polling.
    const upgradeTrades=source==='actions'&&phase==='head'&&inspectionVersion.current<5;
    const repairTargets=new Set(upgradeTrades?rows.current.filter(row=>row.source==='actions'&&ledgerAssetTradeSide(row)&&!ledgerAssetTrade(row)?.tradeId).map(row=>row.id):[]);
    const repairCycle=source==='actions'&&phase==='head'?{targets:repairTargets,seen:new Set<string>()}:null;
    if(repairCycle)activeTradeRepair.current=repairCycle;
    const visited = phase === 'head' ? new Set<string>() : historyCursors.current[source];
    update(source, { busy: true, error: null });
    let cursor = phase === 'older' ? before.cursor! : undefined;
    const revision=proofRevision.current;
    try {
      for (;;) {
        if (cursor && visited.has(cursor)) throw new Error('Public source repeated a cursor.');
        const page = await readPublicNetworkPage(source, cursor, controller.signal);
        if (controller.signal.aborted) return;
        // A confirmed membership delivered by the publication reader is newer
        // than an already-running pre-publication proof request.
        if(source==='proofs'&&revision!==proofRevision.current)return;
        if(source==='proofs'&&!acceptsProofCapture(page.observedAt))return;
        if (cursor) visited.add(cursor);
        if (page.nextCursor && (page.nextCursor === cursor || visited.has(page.nextCursor))) throw new Error('Public source repeated a cursor.');
        const reachedHeld = page.records.some(row => existing.has(row.id));
        for(const row of page.records){repairTargets.delete(row.id);repairCycle?.seen.add(row.id);}
        append(source, page.records, phase === 'head' && page.complete && ['graph', 'proofs'].includes(source));
        capture(new Date().toISOString());
        if (phase === 'head' && (existing.size && !reachedHeld || repairTargets.size>0) && !page.complete && page.nextCursor && ['actions', 'wallet'].includes(source)) { cursor = page.nextCursor; continue; }
        if(source==='actions'&&phase==='head'&&inspectionVersion.current<5&&(repairTargets.size===0||page.complete))inspectionVersion.current=PUBLIC_NETWORK_INSPECTION_VERSION;
        const complete = page.complete || phase === 'head' && reachedHeld && before.complete;
        update(source, { status: page.complete || source !== 'proofs' ? 'live' : 'stale', complete,
          observedAt: complete ? Date.now() : before.observedAt, cursor: complete ? null : phase === 'head' && existing.size && before.cursor ? before.cursor : page.nextCursor, busy: false,
          error: source === 'proofs' && !page.complete ? 'Public showcase collection is incomplete.' : null });
        if (complete) completeAnchors.current[source] = new Set(rows.current.filter(row => row.source === source).map(row => row.id));
        break;
      }
    } catch (cause) {
      if (!controller.signal.aborted&&(source!=='proofs'||revision===proofRevision.current)) update(source, { busy: false, status: rows.current.some(row => row.source === source) ? 'stale' : 'error', error: cause instanceof Error ? cause.message : 'Public source unavailable.' });
    } finally { if(repairCycle&&activeTradeRepair.current===repairCycle)activeTradeRepair.current=null; if (!controller.signal.aborted && sourceState.current[source].busy) update(source, { busy: false }); }
  }, [acceptsProofCapture,reuseHeldProofs]);
  const readSource=useCallback((source:PublicSource,phase:'head'|'older')=>{
    const controller=lifetime.current;if(!controller||controller.signal.aborted)return Promise.resolve();
    const held=sourceReads.current.get(source);if(held?.controller===controller&&sourceState.current[source].busy)return held.promise;
    const promise=performSourceRead(source,phase),entry={controller,promise};sourceReads.current.set(source,entry);
    void promise.finally(()=>{if(sourceReads.current.get(source)===entry)sourceReads.current.delete(source);}).catch(()=>{});
    return promise;
  },[performSourceRead]);
  const adoptOriginal = useCallback(async(review:PublicLedgerFileReview|null,controller:AbortController)=>{
    if(!review||controller.signal.aborted||originalProjection.current?.digest===review.artifactSha256&&originalProjection.current.records===rows.current)return;
    // Projection can yield while the verifier module loads. Rebase on the newest
    // rows so a concurrent public read cannot be erased by this display fill.
    for(;;){
      const before=rows.current,next=await publicLedgerDisplayRows(review,before);
      if(controller.signal.aborted||lifetime.current!==controller)return;
      if(rows.current!==before)continue;
      rows.current=next;originalProjection.current={digest:review.artifactSha256,records:next};setRecords(next);
      let latest:string|null=null;
      for(const row of next)if(row.time&&Number.isFinite(Date.parse(row.time))&&(!latest||Date.parse(row.time)>Date.parse(latest)))latest=row.time;
      capture(latest);
      break;
    }
  },[]);
  const refresh = useCallback(async () => {
    const controller=lifetime.current;if(!controller||controller.signal.aborted)return;
    lastRefresh.current=Date.now();
    await Promise.allSettled([...PUBLIC_SOURCES.map(source => readSource(source, 'head')),synchronizePublicLedger().then(review=>adoptOriginal(review,controller))]);
  }, [readSource,adoptOriginal]);
  const loadMore = useCallback(async () => { await Promise.allSettled(PUBLIC_SOURCES.map(source => readSource(source, 'older'))); }, [readSource]);
  useEffect(() => {
    const controller = new AbortController(); lifetime.current = controller;
    // A view pause stops new polling, while already accepted reads keep their
    // mounted lifetime and can settle into the retained source rows.
    let opened=false;
    const restore=(held:PublicNetworkCache|null,seed:PublicNetworkCache|null)=>{
        inspectionVersion.current=Math.max(inspectionVersion.current,held?.inspectionVersion??0,seed?.inspectionVersion??0);
        // Publication can settle while the initial cache is still opening.
        // That older display cache cannot reopen accepted proof membership.
        // Complete server-selected public membership outranks an older local
        // discovery cache. Cache observation clocks cannot revive a withdrawn
        // object; immutable account-independent history may still append.
        const retainedMembership=new Set(initialSnapshot?.coverage.filter(item=>item.complete&&['proofs','graph'].includes(item.source)).map(item=>item.source)??[]);if(proofRevision.current>0)retainedMembership.add('proofs');
        const restoredRows=restorePublicNetworkRows(held,seed);
        rows.current = mergePublicRecords(restoredRows.filter(row=>!retainedMembership.has(row.source)),rows.current);
        const oldTradeIds=new Set([held,seed].flatMap(value=>value&&(value.inspectionVersion??0)<5?value.records.filter(row=>row.source==='actions'&&ledgerAssetTradeSide(row)).map(row=>row.id):[]));
        for(const row of rows.current)if(oldTradeIds.has(row.id)&&!ledgerAssetTrade(row)?.tradeId){
          inspectionVersion.current=Math.min(inspectionVersion.current,4);
          if(activeTradeRepair.current&&!activeTradeRepair.current.seen.has(row.id))activeTradeRepair.current.targets.add(row.id);
        }
        setRecords(rows.current);capture(held?.capturedAt??null);capture(seed?.capturedAt??null);
        for (const source of PUBLIC_SOURCES) {
          if(retainedMembership.has(source))continue;
          const cachedComplete = held?.coverage.some(item => item.source === source && item.complete);
          const seededComplete = seed?.coverage.some(item => item.source === source && item.complete);
          const anchor = cachedComplete ? held : seededComplete ? seed : null;
          const anchorCoverage = anchor?.coverage.find(item => item.source === source);
          if (anchor) completeAnchors.current[source] = new Set([...(completeAnchors.current[source]??[]),...(anchorCoverage?.anchorIds ?? anchor.records.filter(row => row.source === source).map(row => row.id))]);
          const observedAt=Math.max(sourceState.current[source].observedAt??0,anchorCoverage?.observedAt??0);
          update(source, { status: sourceState.current[source].status==='live'?'live':'stale', complete: sourceState.current[source].complete||Boolean(anchor), observedAt:observedAt||undefined });
        }
    };
    const restored=(async()=>{
      const cache=!initialSnapshot&&rows.current.length&&!initialProofs?null:await(retainedCache.current??=loadPublicNetworkCache());
      if(controller.signal.aborted)return false;
      const needsSeed=!initialSnapshot&&(Math.max(inspectionVersion.current,cache?.inspectionVersion??0)<PUBLIC_NETWORK_INSPECTION_VERSION||(!rows.current.length||Boolean(initialProofs))&&(!cache||PUBLIC_SOURCES.some(source=>!cache.coverage.some(item=>item.source===source&&item.complete))));
      if(cache)restore(cache,null);setBootstrap(false);return needsSeed;
    })();
    activate.current=async()=>{
      // A complete prepared document already supplies its history anchors.
      // Opening newer local rows must not postpone a fresh bounded head read.
      const needsSeed=initialSnapshot?false:await restored;
      if(controller.signal.aborted||!enabled.current)return;
      if(opened){
        if(lastRefresh.current===null||Date.now()-lastRefresh.current>=60_000||PUBLIC_SOURCES.some(source=>sourceState.current[source].error)){deferredRepairs.current.clear();void refresh();}
        else for(const source of deferredRepairs.current){deferredRepairs.current.delete(source);void readSource(source,'head');}
        return;
      }
      opened=true;
      // The cold document was already selected beneath current public state.
      // Keep it visible and retain newer local rows without repeating four
      // complete feed reads or reopening a Ledger original on first paint.
      if(initialSnapshot){lastRefresh.current=Date.now();return;}
      void refresh();
      void readHeldPublicLedger().then(review=>adoptOriginal(review,controller)).catch(()=>{});
      // Seed enrichment must not delay the newest durable head or source polling.
      const seed=needsSeed?await loadPublicNetworkSeed(controller.signal):null;
      if(controller.signal.aborted||!seed)return;
      const held:PublicNetworkCache={records:rows.current,capturedAt:null,inspectionVersion:inspectionVersion.current,coverage:PUBLIC_SOURCES.map(source=>({source,complete:sourceState.current[source].complete,anchorIds:completeAnchors.current[source]?[...completeAnchors.current[source]!]:undefined,observedAt:sourceState.current[source].observedAt}))};
      const gaps=new Set(PUBLIC_SOURCES.filter(source=>!!sourceState.current[source].cursor&&!sourceState.current[source].complete));
      restore(held,seed);
      // A delayed seed does not invalidate heads already read during this
      // opening. Only a newly revealed history gap or legacy trade correction
      // needs another source pass; do not repeat all four reads and proof sync.
      for(const source of ['actions','wallet']as const)void(async()=>{
        await sourceReads.current.get(source)?.promise;
        if(controller.signal.aborted||lifetime.current!==controller)return;
        const state=sourceState.current[source];
        if(state.busy||state.error)return;
        const historyGap=gaps.has(source)||!!state.cursor&&!state.complete;
        const tradeRepair=source==='actions'&&inspectionVersion.current<5;
        if(historyGap||tradeRepair){if(enabled.current)await readSource(source,'head');else deferredRepairs.current.add(source);}
      })().catch(()=>{});
    };
    return()=>{controller.abort();if(lifetime.current===controller){lifetime.current=null;activate.current=null;}for(const source of PUBLIC_SOURCES)sourceState.current[source]={...sourceState.current[source],busy:false};};
  }, [refresh,adoptOriginal,readSource,initialSnapshot]);
  useEffect(()=>{
    const marker=typeof document==='undefined'?null:document.getElementById('receiz-navigation') as PublicCatalogMarker|null;
    const stop=marker?.subscribePublicMarketCatalog?.(reuseHeldProofs);reuseHeldProofs();return stop;
  },[reuseHeldProofs]);
  useEffect(()=>subscribeAssetPublicationAdmissions(catalog=>{
    const controller=lifetime.current;if(!controller||controller.signal.aborted)return;
    const held=heldProofCatalog(),heldAt=Date.parse(held?.observedAt??''),offeredAt=Date.parse(catalog?.observedAt??'');
    if(held&&(!catalog||held===catalog||Number.isFinite(heldAt)&&(!Number.isFinite(offeredAt)||heldAt>=offeredAt))&&reuseHeldProofs())return;
    if(catalog){
      if(!acceptsProofCapture(catalog.observedAt))return;
      proofRevision.current++;
      append('proofs',catalog.items.map(publicMarketRecord),catalog.complete);
      capture(catalog.observedAt);
      update('proofs',{status:catalog.complete?'live':'stale',complete:catalog.complete,observedAt:catalog.complete?Date.now():sourceState.current.proofs.observedAt,cursor:null,error:catalog.complete?null:'Public showcase collection is incomplete.'});
      if(catalog.complete)completeAnchors.current.proofs=new Set(catalog.items.map(item=>`proofs:${item.id}`));
      return;
    }
    // A pending local preview is not a public proof. Only the existing native
    // publication acknowledgment triggers a fresh public membership read.
    if(!assetPublicationFreshnessHint())return;
    if(!enabled.current){deferredRepairs.current.add('proofs');return;}
    if(publicationRefresh.current)return;
    const inflight=sourceReads.current.get('proofs')?.promise;
    const refreshProofs=(async()=>{if(inflight)await inflight;if(lifetime.current===controller&&!controller.signal.aborted)await readSource('proofs','head');})();
    publicationRefresh.current=refreshProofs;
    void refreshProofs.finally(()=>{if(publicationRefresh.current===refreshProofs)publicationRefresh.current=null;}).catch(()=>{});
  }),[readSource,acceptsProofCapture,reuseHeldProofs]);
  useEffect(()=>{
    if(!active)return;
    void activate.current?.();
    const interval=setInterval(()=>{if(document.visibilityState==='visible')void refresh();},60_000);
    const wake=()=>{if(document.visibilityState==='visible')void refresh();};
    document.addEventListener('visibilitychange',wake);window.addEventListener('online',wake);const stopSync=subscribePublicLedgerSync(wake);
    return()=>{clearInterval(interval);stopSync();document.removeEventListener('visibilitychange',wake);window.removeEventListener('online',wake);};
  },[active,refresh]);
  useEffect(() => {
    if (bootstrap || !records.length) return;
    const coverageKey=PUBLIC_SOURCES.map(source=>`${source}:${sourceState.current[source].complete}:${sourceState.current[source].observedAt??''}`).join('|');
    if(saved.current?.records===records&&saved.current.capturedAt===capturedAt&&saved.current.coverage===coverageKey&&saved.current.inspectionVersion===inspectionVersion.current)return;
    saved.current={records,capturedAt,coverage:coverageKey,inspectionVersion:inspectionVersion.current};
    // Start the transaction now. Unmounting must not cancel accepted additions.
    void savePublicNetworkCache({ records: rows.current, capturedAt,inspectionVersion:inspectionVersion.current,coverage: PUBLIC_SOURCES.map(source => ({ source, complete: sourceState.current[source].complete, anchorIds: completeAnchors.current[source] ? [...completeAnchors.current[source]!] : undefined, observedAt: sourceState.current[source].observedAt })) });
  }, [records, sources, bootstrap, capturedAt]);
  return { records, sources, bootstrap, capturedAt, refresh, loadMore };
}
