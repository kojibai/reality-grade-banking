import { useCallback, useEffect, useRef, useState } from 'react';
import type { OpenIdentity } from './native-identity';
import { loadPrivateHistoryCache, savePrivateHistoryCache, type PrivateHistoryCache } from './identity-vault';
import { mergePublicRecords } from './public-network';
import { privateHistoryFailureCode } from './private-history';
export function usePrivateHistory(identity: OpenIdentity | null, accountUid: string | undefined, active: boolean) {
  const [cache, setCache] = useState<PrivateHistoryCache | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState<string | null>(null);
  const [failureCode, setFailureCode] = useState<string | null>(null);
  const held = useRef<PrivateHistoryCache | null>(null), generation = useRef(0), pending = useRef(false), paused = useRef(false), seen = useRef(new Set<string>()), restoring = useRef(Promise.resolve()), scope = useRef({ identity, accountUid });
  useEffect(() => {
    const ticket = ++generation.current; scope.current = { identity, accountUid };
    held.current = null; pending.current = false; paused.current = false; seen.current.clear(); setCache(null); setBusy(false); setError(null); setFailureCode(null);
    restoring.current = identity && accountUid ? loadPrivateHistoryCache(identity.binding, accountUid).then(value => {
      if (ticket === generation.current && value?.accountUid === accountUid) { held.current = value; setCache(value); }
    }).catch(() => {}) : Promise.resolve();
    return () => { generation.current++; };
  }, [identity, accountUid]);
  const read = useCallback(async (older = false) => {
    if (scope.current.identity !== identity || scope.current.accountUid !== accountUid) return;
    if (!identity?.readPrivateHistory || !accountUid || pending.current || older && paused.current) return;
    const ticket = generation.current; pending.current = true; setBusy(true);
    try {
      // Preserve already retained pages before merging a freshly read head.
      await restoring.current;
      if (ticket !== generation.current) return;
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
      const next: PrivateHistoryCache = { schema: 'bank.private-history-cache.v1', accountUid, observedAt: new Date().toISOString(), records: mergePublicRecords(previous, page.records), nextCursor: page.nextCursor };
      held.current = next; setCache(next);
      try { await savePrivateHistoryCache(identity.binding, next); } catch { if (ticket === generation.current) setError('Activity loaded. This device could not retain it for offline access.'); }
    } catch (cause) {
      if (ticket === generation.current) { paused.current = true; setFailureCode(privateHistoryFailureCode(cause)); setError('Your activity could not be loaded. Retained activity stays available. Refresh to try again.'); }
    } finally { if (ticket === generation.current) { pending.current = false; setBusy(false); } }
  }, [identity, accountUid]);
  const refresh = useCallback(() => read(), [read]), loadMore = useCallback(() => read(true), [read]);
  useEffect(() => { if (active) void read(); }, [active, read]);
  return { cache: cache?.accountUid === accountUid ? cache : null, busy, error, failureCode, canLoadMore: Boolean(cache?.nextCursor && !paused.current), refresh, loadMore };
}
