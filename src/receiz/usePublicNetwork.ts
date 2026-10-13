import { useCallback, useEffect, useRef, useState } from 'react';
import { PUBLIC_SOURCES, mergePublicRecords, readPublicNetworkPage, type PublicRecord, type PublicSource } from './public-network';
import { loadPublicNetworkCache, loadPublicNetworkSeed, savePublicNetworkCache } from './public-network-cache';

export interface PublicSourceState { status: 'loading' | 'live' | 'stale' | 'error'; cursor: string | null; complete: boolean; busy: boolean; error: string | null; }
type Sources = Record<PublicSource, PublicSourceState>;
function initialSources(): Sources { return Object.fromEntries(PUBLIC_SOURCES.map(source => [source, { status: 'loading', cursor: null, complete: false, busy: false, error: null }])) as Sources; }
export function usePublicNetwork(active = true) {
  const [records, setRecords] = useState<PublicRecord[]>([]), rows = useRef(records);
  const [sources, setSources] = useState<Sources>(initialSources), sourceState = useRef(sources);
  const [bootstrap, setBootstrap] = useState(true), [capturedAt, setCapturedAt] = useState<string | null>(null);
  const lifetime = useRef<AbortController | null>(null);
  const completeAnchors = useRef<Partial<Record<PublicSource, Set<string>>>>({});
  const historyCursors = useRef<Record<PublicSource, Set<string>>>({ actions: new Set(), wallet: new Set(), graph: new Set(), proofs: new Set() });
  const update = (source: PublicSource, patch: Partial<PublicSourceState>) => { const next = { ...sourceState.current, [source]: { ...sourceState.current[source], ...patch } }; sourceState.current = next; setSources(next); };
  const append = (source: PublicSource, incoming: PublicRecord[], replace = false) => {
    const next = mergePublicRecords(replace ? rows.current.filter(row => row.source !== source) : rows.current, incoming); rows.current = next; setRecords(next);
  };
  const readSource = useCallback(async (source: PublicSource, phase: 'head' | 'older') => {
    const controller = lifetime.current, before = sourceState.current[source];
    if (!controller || controller.signal.aborted || before.busy || phase === 'older' && (before.complete || !before.cursor || before.error)) return;
    const existing = phase === 'head' && completeAnchors.current[source] ? completeAnchors.current[source]! : new Set(rows.current.filter(row => row.source === source).map(row => row.id));
    const visited = phase === 'head' ? new Set<string>() : historyCursors.current[source];
    update(source, { busy: true, error: null });
    let cursor = phase === 'older' ? before.cursor! : undefined;
    try {
      for (;;) {
        if (cursor && visited.has(cursor)) throw new Error('Public source repeated a cursor.');
        const page = await readPublicNetworkPage(source, cursor, controller.signal);
        if (controller.signal.aborted) return;
        if (cursor) visited.add(cursor);
        if (page.nextCursor && (page.nextCursor === cursor || visited.has(page.nextCursor))) throw new Error('Public source repeated a cursor.');
        const reachedHeld = page.records.some(row => existing.has(row.id));
        append(source, page.records, phase === 'head' && page.complete && ['graph', 'proofs'].includes(source));
        if (phase === 'head' && existing.size && !reachedHeld && !page.complete && page.nextCursor && ['actions', 'wallet'].includes(source)) { cursor = page.nextCursor; continue; }
        const complete = page.complete || phase === 'head' && reachedHeld && before.complete;
        update(source, { status: page.complete || source !== 'proofs' ? 'live' : 'stale', complete,
          cursor: complete ? null : phase === 'head' && existing.size && before.cursor ? before.cursor : page.nextCursor, busy: false,
          error: source === 'proofs' && !page.complete ? 'Public showcase collection is incomplete.' : null });
        if (complete) completeAnchors.current[source] = new Set(rows.current.filter(row => row.source === source).map(row => row.id));
        break;
      }
    } catch (cause) {
      if (!controller.signal.aborted) update(source, { busy: false, status: rows.current.some(row => row.source === source) ? 'stale' : 'error', error: cause instanceof Error ? cause.message : 'Public source unavailable.' });
    } finally { if (!controller.signal.aborted && sourceState.current[source].busy) update(source, { busy: false }); }
  }, []);
  const refresh = useCallback(async () => { await Promise.allSettled(PUBLIC_SOURCES.map(source => readSource(source, 'head'))); }, [readSource]);
  const loadMore = useCallback(async () => { await Promise.allSettled(PUBLIC_SOURCES.map(source => readSource(source, 'older'))); }, [readSource]);
  useEffect(() => {
    if (!active) return; const controller = new AbortController(); lifetime.current = controller;
    // Restore this public discovery cache before searching live heads for additions.
    void (async () => {
      const cache = rows.current.length ? null : await loadPublicNetworkCache();
      const needsSeed = !rows.current.length && (!cache || PUBLIC_SOURCES.some(source => !cache.coverage.some(item => item.source === source && item.complete)));
      const seed = needsSeed ? await loadPublicNetworkSeed(controller.signal) : null;
      if (controller.signal.aborted) return;
      if (cache || seed) {
        rows.current = mergePublicRecords(seed?.records ?? [], mergePublicRecords(cache?.records ?? [], rows.current)); setRecords(rows.current); setCapturedAt(seed?.capturedAt ?? cache?.capturedAt ?? null);
        for (const source of PUBLIC_SOURCES) {
          const cachedComplete = cache?.coverage.some(item => item.source === source && item.complete);
          const seededComplete = seed?.coverage.some(item => item.source === source && item.complete);
          const anchor = cachedComplete ? cache : seededComplete ? seed : null;
          if (anchor) completeAnchors.current[source] = new Set(anchor.records.filter(row => row.source === source).map(row => row.id));
          update(source, { status: 'stale', complete: Boolean(anchor) });
        }
      }
      setBootstrap(false); void refresh();
    })();
    const interval = setInterval(() => { if (document.visibilityState === 'visible') void refresh(); }, 60_000);
    const wake = () => { if (document.visibilityState === 'visible') void refresh(); };
    document.addEventListener('visibilitychange', wake); window.addEventListener('online', wake);
    return () => { controller.abort(); if (lifetime.current === controller) lifetime.current = null; clearInterval(interval); document.removeEventListener('visibilitychange', wake); window.removeEventListener('online', wake); for (const source of PUBLIC_SOURCES) sourceState.current[source] = { ...sourceState.current[source], busy: false }; };
  }, [active, refresh]);
  useEffect(() => {
    if (bootstrap || !records.length) return;
    const timer = setTimeout(() => { void savePublicNetworkCache({ records: rows.current, capturedAt, coverage: PUBLIC_SOURCES.map(source => ({ source, complete: sourceState.current[source].complete })) }); }, 1_000);
    return () => clearTimeout(timer);
  }, [records, bootstrap, capturedAt]);
  return { records, sources, bootstrap, capturedAt, refresh, loadMore };
}
