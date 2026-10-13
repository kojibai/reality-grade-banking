import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchPublicMarket, fetchPublicQuotes, mergePublicQuotes, parsePublicMarket, type PublicMarketCatalog } from './public-market';

export const PUBLIC_MARKET_CACHE_KEY = 'receiz-bank-public-discovery-v1';
function restorePublicCatalog(): PublicMarketCatalog | null { try { const saved = localStorage.getItem(PUBLIC_MARKET_CACHE_KEY); return saved ? parsePublicMarket(JSON.parse(saved)) : null; } catch { return null; } }
export function usePublicMarket(active = true) {
  const [catalog, setCatalog] = useState<PublicMarketCatalog | null>(restorePublicCatalog);
  const [status, setStatus] = useState<'loading' | 'live' | 'stale' | 'error'>(catalog ? 'stale' : 'loading');
  const [error, setError] = useState<string | null>(null);
  const running = useRef<AbortController | null>(null);
  const generation = useRef(0);
  const refresh = useCallback(async () => {
    if (running.current) return;
    const controller = new AbortController(); running.current = controller; const attempt = ++generation.current;
    const quotesAttempt = fetchPublicQuotes(controller.signal).then(value => ({ value }), () => ({ value: null }));
    try {
      const next = await fetchPublicMarket(controller.signal);
      if (controller.signal.aborted) return;
      setCatalog(current => {
        const previous = new Map(current?.items.map(item => [item.id, item]));
        return { ...next, items: next.items.map(item => {
          const quoted = previous.get(item.id);
          return quoted?.chart.length ? { ...item, priceUsd: quoted.priceUsd, changePct: quoted.changePct, chart: quoted.chart } : item;
        }) };
      }); setStatus('live'); setError(null);
      const quotes = await quotesAttempt;
      if (!controller.signal.aborted && attempt === generation.current) {
        if (quotes.value) setCatalog(current => current ? mergePublicQuotes(current, quotes.value) : current);
        else setError('Public collection updated. Price charts are temporarily unavailable.');
      }
    } catch (cause) { if (!controller.signal.aborted) { setStatus('stale'); setError(cause instanceof Error ? cause.message : 'The public Market could not be refreshed.'); } }
    finally { if (running.current === controller) running.current = null; }
  }, []);
  useEffect(() => {
    if (!active) return;
    const seed = new AbortController();
    if (!catalog) void fetch('/receiz-public-market.json', { signal: seed.signal, credentials: 'omit' }).then(async response => {
      if (!response.ok) return; const input = await response.json(); const cached = parsePublicMarket(input, input.snapshot);
      if (seed.signal.aborted) return; setCatalog(current => current ?? cached);
    }).catch(() => {});
    void refresh();
    const interval = setInterval(() => { if (document.visibilityState === 'visible') void refresh(); }, 60_000);
    const wake = () => { if (document.visibilityState === 'visible') void refresh(); };
    document.addEventListener('visibilitychange', wake); window.addEventListener('online', wake);
    return () => { clearInterval(interval); document.removeEventListener('visibilitychange', wake); window.removeEventListener('online', wake); seed.abort(); running.current?.abort(); running.current = null; };
  }, [active, refresh]);
  return { catalog, status: !catalog && status === 'stale' ? 'error' as const : status, error, refresh };
}
