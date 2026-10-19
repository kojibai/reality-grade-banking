import { useCallback, useEffect, useRef, useState } from 'react';
import type { OpenIdentity } from './native-identity';
import { savePrivateHistoryCache, type PrivateHistoryCache } from './identity-vault';
import { mergePublicRecords } from './public-network';
import { privateHistoryFailureCode, appendPrivateLedgerPage } from './private-history';
import { peekPrivateHistory, preloadPrivateHistory, updatePrivateHistory } from './private-history-restore';
export function usePrivateHistory(identity: OpenIdentity | null, accountUid: string | undefined, active: boolean) {
  const [frame, setCache] = useState<{ identity: OpenIdentity; accountUid: string; value: PrivateHistoryCache } | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState<string | null>(null);
  const [failureCode, setFailureCode] = useState<string | null>(null);
  const refreshQueued=useRef(false);
  const held = useRef<PrivateHistoryCache | null>(null), generation = useRef(0), pending = useRef(false), paused = useRef(false), seen = useRef(new Set<string>()), restoring = useRef(Promise.resolve()), scope = useRef({ identity, accountUid });
  useEffect(() => {
    const ticket = ++generation.current; scope.current = { identity, accountUid };
    const retained = peekPrivateHistory(identity, accountUid);
    held.current = retained; pending.current = false;refreshQueued.current=false; paused.current = false; seen.current.clear(); setCache(identity && accountUid && retained ? { identity, accountUid, value: retained } : null); setBusy(false); setError(null); setFailureCode(null);
    restoring.current = identity && accountUid ? preloadPrivateHistory(identity, accountUid).then(value => {
      if (ticket === generation.current && value?.accountUid === accountUid) { held.current = value; setCache({ identity, accountUid, value }); }
    }).catch(() => {}) : Promise.resolve();
    return () => { generation.current++; };
  }, [identity, accountUid]);
  const read = useCallback(async (older = false, canStart?: () => boolean):Promise<void> => {
    if (scope.current.identity !== identity || scope.current.accountUid !== accountUid) return;
    if (!identity?.readPrivateHistory || !accountUid || pending.current || older && paused.current) return;
    const ticket = generation.current; pending.current = true; setBusy(true);
    try {
      // Preserve already retained pages before merging a freshly read head.
      await restoring.current;
      if (ticket !== generation.current || canStart && !canStart()) return;
      const cursor = older ? held.current?.nextCursor ?? undefined : undefined;
      if (older && !cursor) return;
      if (!older) { paused.current = false; seen.current.clear(); }
      if (cursor && seen.current.has(cursor)) throw new Error('Repeated private history cursor.');
      if (cursor) seen.current.add(cursor);
      setError(null); setFailureCode(null);
      const page = await identity.readPrivateHistory(cursor);
      if (ticket !== generation.current) return;
      if (page.accountUid !== accountUid) throw new Error('PRIVATE_HISTORY_ACCOUNT_MISMATCH');
      if (page.nextCursor && (page.nextCursor === cursor || seen.current.has(page.nextCursor))) throw new Error('Repeated private history cursor.');
      const previous = held.current?.accountUid === accountUid ? held.current.records : [];
      const next: PrivateHistoryCache = { schema: 'bank.private-history-cache.v1', accountUid, observedAt: new Date().toISOString(), records: mergePublicRecords(previous, page.records), pages: appendPrivateLedgerPage(held.current?.pages,page,cursor??null), nextCursor: page.nextCursor };
      updatePrivateHistory(identity, accountUid, next); held.current = next; setCache({ identity, accountUid, value: next });
      try {
        const retained = await savePrivateHistoryCache(identity.binding, next);
        if (ticket === generation.current && retained && updatePrivateHistory(identity, accountUid, retained)) { held.current = retained; setCache({ identity, accountUid, value: retained }); }
      } catch { if (ticket === generation.current) setError('Activity loaded. This device could not retain it for offline access.'); }
    } catch (cause) {
      if (ticket === generation.current) { paused.current = true; setFailureCode(privateHistoryFailureCode(cause)); setError('Your activity could not be loaded. Retained activity stays available. Refresh to try again.'); }
    } finally { if (ticket === generation.current) { pending.current = false; setBusy(false);if(refreshQueued.current){refreshQueued.current=false;void read();} } }
  }, [identity, accountUid]);
  const refresh = useCallback(() => {if(scope.current.identity!==identity||scope.current.accountUid!==accountUid)return Promise.resolve();if(pending.current){refreshQueued.current=true;return Promise.resolve();}return read();}, [identity,accountUid,read]), loadMore = useCallback(() => read(true), [read]);
  useEffect(() => {
    let alive = true, queued = false;
    const foreground = () => alive && active && Boolean(identity && accountUid) && document.visibilityState === 'visible' && location.pathname === '/';
    const wake = () => {
      if (!foreground() || queued) return;
      queued = true;
      queueMicrotask(() => { queued = false; if (foreground()) void read(false, foreground); });
    };
    if (foreground()) void read(false, foreground);
    const timer = setInterval(wake, 60_000);
    const events = ['online', 'focus', 'pageshow', 'popstate', 'receiz-bank:surface'] as const;
    for (const event of events) addEventListener(event, wake);
    document.addEventListener('visibilitychange', wake);
    return () => { alive = false; clearInterval(timer); for (const event of events) removeEventListener(event, wake); document.removeEventListener('visibilitychange', wake); };
  }, [active, identity, accountUid, read]);
  useEffect(()=>{const changed=(event:Event)=>{const detail=(event as CustomEvent).detail;if(identity&&detail?.identityDigest===identity.binding.artifactSha256&&detail?.accountUid===accountUid)void refresh();};addEventListener('bankeiz:wallet-send-recorded',changed);return()=>removeEventListener('bankeiz:wallet-send-recorded',changed);},[identity,accountUid,refresh]);
  const cache = frame?.identity === identity && frame.accountUid === accountUid ? frame.value : peekPrivateHistory(identity, accountUid);
  const current = scope.current.identity === identity && scope.current.accountUid === accountUid;
  return { cache, busy: current && busy, error: current ? error : null, failureCode: current ? failureCode : null, canLoadMore: Boolean(cache?.nextCursor && (current ? !paused.current : true)), refresh, loadMore };
}
