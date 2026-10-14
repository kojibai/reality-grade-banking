import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchPublicSports, mergePublicSports } from './public-sports';
import { fetchPublicMarket, fetchPublicQuotes, mergePublicQuotes, parsePublicMarket, validatePublicQuotes, type PublicMarketCatalog } from './public-market';

export const PUBLIC_MARKET_CACHE_KEY = 'receiz-bank-public-discovery-v2';
function restorePublicCatalog(): PublicMarketCatalog | null { try { const saved = localStorage.getItem(PUBLIC_MARKET_CACHE_KEY); const input = saved ? JSON.parse(saved) : null; const catalog = input ? parsePublicMarket(input, input.snapshot) : null; if (!catalog) return null; try { return mergePublicSports(catalog, JSON.parse(localStorage.getItem('receiz-bank-public-sports-v1') ?? 'null')); } catch { return catalog; } } catch { return null; } }
export function usePublicMarket(active = true) {
  const [catalog, setCatalog] = useState<PublicMarketCatalog | null>(restorePublicCatalog);
  const [status, setStatus] = useState<'loading' | 'live' | 'stale' | 'error'>(catalog ? 'stale' : 'loading');
  const [quoteStatus, setQuoteStatus] = useState<'loading' | 'fresh' | 'stale'>('stale');
  const [sportsStatus, setSportsStatus] = useState<'loading' | 'fresh' | 'retained' | 'missing'>(catalog?.items.some(item => item.category === 'sports') ? 'retained' : 'loading');
  const [error, setError] = useState<string | null>(null);
  const running = useRef<AbortController | null>(null);
  const generation = useRef(0), sports = useRef<unknown>(null);
  useEffect(() => { try { sports.current = JSON.parse(localStorage.getItem('receiz-bank-public-sports-v1') ?? 'null'); } catch { /* No retained public inventory. */ } }, []);
  const refresh = useCallback(async () => {
    if (running.current) return;
    const controller = new AbortController(); running.current = controller; const attempt = ++generation.current;
    setQuoteStatus('loading');
    const quotesAttempt = fetchPublicQuotes(controller.signal).then(validatePublicQuotes).then(value => ({ value }), () => ({ value: null }));
    const membershipAttempt = fetchPublicMarket(controller.signal).then(value => ({ value, error: null }), cause => ({ value: null, error: cause instanceof Error ? cause.message : 'The public Market could not be refreshed.' }));
    const sportsAttempt = fetchPublicSports(controller.signal).catch(() => null);
    const membership = await membershipAttempt;
    if (!controller.signal.aborted && attempt === generation.current) {
      const next = membership.value;
      setCatalog(current => {
        if (!next || !next.complete && current) return current;
        const previous = new Map(current?.items.map(item => [item.id, item]));
        return mergePublicSports({ ...next, items: next.items.map(item => {
          const quoted = previous.get(item.id);
          return quoted?.chart.length ? { ...item, priceUsd: quoted.priceUsd, changePct: quoted.changePct, chart: quoted.chart } : item;
        }) }, sports.current);
      });
      setStatus(next?.complete ? 'live' : 'stale');
      setError(next?.complete ? null : membership.error ?? 'The public collection is incomplete. Keeping the last complete collection.');
    }
    const sportsData = await sportsAttempt;
    if (!controller.signal.aborted && attempt === generation.current) {
      if (sportsData) { sports.current = sportsData; setCatalog(current => current ? mergePublicSports(current, sportsData) : current); setSportsStatus((sportsData as { fallback?: boolean }).fallback === true ? 'retained' : 'fresh'); }
      else setSportsStatus(sports.current ? 'retained' : 'missing');
    }
    const quotes = await quotesAttempt;
    if (!controller.signal.aborted && attempt === generation.current) {
      if (quotes.value) {
        setCatalog(current => current ? mergePublicQuotes(current, quotes.value) : current); setQuoteStatus('fresh');
      } else {
        setQuoteStatus('stale'); setError(message => [message, 'Public prices and charts could not be refreshed. Showing cached quotes.'].filter(Boolean).join(' '));
      }
    }
    if (running.current === controller) running.current = null;
  }, []);
  useEffect(() => {
    if (!active) return;
    const seed = new AbortController();
    void fetch('/receiz-public-sports.json', { signal: seed.signal, credentials: 'omit' }).then(async response => { if (!response.ok) return; const data = await response.json(); if (seed.signal.aborted || sports.current) return; sports.current = data; setSportsStatus('retained'); setCatalog(current => current ? mergePublicSports(current, data) : current); }).catch(() => {});
    if (!catalog) void fetch('/receiz-public-market.json', { signal: seed.signal, credentials: 'omit' }).then(async response => {
      if (!response.ok) return; const input = await response.json(); const cached = parsePublicMarket(input, input.snapshot);
      if (seed.signal.aborted) return; setCatalog(current => current ?? mergePublicSports(cached, sports.current));
    }).catch(() => {});
    void refresh();
    const interval = setInterval(() => { if (document.visibilityState === 'visible') void refresh(); }, 60_000);
    const wake = () => { if (document.visibilityState === 'visible') void refresh(); };
    document.addEventListener('visibilitychange', wake); window.addEventListener('online', wake);
    return () => { clearInterval(interval); document.removeEventListener('visibilitychange', wake); window.removeEventListener('online', wake); seed.abort(); running.current?.abort(); running.current = null; };
  }, [active, refresh]);
  return { catalog, quoteStatus, sportsStatus, status: !catalog && status === 'stale' ? 'error' as const : status, error, refresh };
}
