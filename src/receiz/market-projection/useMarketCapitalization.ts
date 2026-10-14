import { useEffect, useRef, useState } from 'react';
import type { ChartPeriod } from '../../core/chart-history';
import { parseMarketCapSource, type MarketCapSource } from './source';
const KEY = 'receiz-bank-public-graph-cap-v1';
export interface CapitalizationPoint { at: string; pulse: number; usdCents: string; }
function restore(): MarketCapSource | null { try { return parseMarketCapSource(JSON.parse(localStorage.getItem(KEY) ?? 'null')); } catch { return null; } }
export function useMarketCapitalization(period: ChartPeriod, active: boolean) {
  const [source, setSource] = useState<MarketCapSource | null>(restore), [points, setPoints] = useState<CapitalizationPoint[]>([]), [status, setStatus] = useState<'cached' | 'live' | 'unavailable'>('cached');
  const worker = useRef<Worker | null>(null), request = useRef(0), loaded = useRef<MarketCapSource | null>(null), displayedPeriod = useRef(period);
  useEffect(() => {
    if (!active) return;
    const controller = new AbortController(); let pending = false;
    const read = async (path: string, live: boolean) => {
      if (pending && live) return; if (live) pending = true;
      try {
        const response = await fetch(path, { credentials: 'omit', signal: controller.signal }); if (!response.ok) throw new Error();
        const data = await response.json(), value = parseMarketCapSource(data); if (controller.signal.aborted) return;
        setSource(previous => !live && previous || value); if (live) { setStatus('live'); try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* Optional public display retention. */ } }
      } catch { if (live && !controller.signal.aborted) setStatus('unavailable'); }
      finally { if (live) pending = false; }
    };
    void read('/receiz-public-capitalization.json', false); void read('/api/bank/public-market/capitalization', true);
    const interval = setInterval(() => { if (document.visibilityState === 'visible') void read('/api/bank/public-market/capitalization', true); }, 60000);
    return () => { controller.abort(); clearInterval(interval); };
  }, [active]);
  useEffect(() => {
    if (typeof Worker === 'undefined') return;
    let instance: Worker; try { instance = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' }); } catch { return; } worker.current = instance;
    instance.onmessage = event => { if (event.data.id === request.current) setPoints(event.data.points ?? []); };
    instance.onerror = () => setPoints([]);
    return () => { instance.terminate(); worker.current = null; loaded.current = null; };
  }, []);
  useEffect(() => {
    const id = ++request.current;
    if (displayedPeriod.current !== period) { displayedPeriod.current = period; setPoints([]); }
    if (!worker.current) return;
    if (!source || !active) { worker.current.postMessage({ id, cancel: true }); return; }
    const changed = loaded.current !== source; loaded.current = source;
    worker.current.postMessage({ id, period, ...(changed ? { source: { ok: true, marketCapProjection: source } } : {}) });
  }, [source, period, active]);
  return { source, points, status };
}
