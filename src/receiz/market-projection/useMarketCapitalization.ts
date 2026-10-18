import { useEffect, useRef, useState } from 'react';
import type { ChartPeriod } from '../../core/chart-history';
import seedHistory from '../../../public/receiz-public-chart-history.json';
import { type MarketCapSource } from './source';
import { marketCapSummary, parseMarketHistory, type MarketCapSummary, type MarketHistorySnapshot } from './history';
import {readMarketDisplaySource} from './display-source';
export type { CapitalizationPoint } from './history';
const KEY = 'receiz-bank-public-graph-history-v2';
const shipped = parseMarketHistory(seedHistory);
function restore(): MarketHistorySnapshot {
  try { const cached = parseMarketHistory(JSON.parse(localStorage.getItem(KEY) ?? 'null')); if (cached.summary.serverPulse >= shipped.summary.serverPulse) return cached; } catch { /* Only bounded public display data is retained. */ }
  return shipped;
}
export function useMarketCapitalization(period: ChartPeriod, active: boolean) {
  const [history, setHistory] = useState<MarketHistorySnapshot>(restore), [source, setSource] = useState<MarketCapSummary>(() => history.summary), [fullSource, setFullSource] = useState<MarketCapSource | null>(null), [status, setStatus] = useState<'cached' | 'live' | 'unavailable'>('cached'), [completedSource, setCompletedSource] = useState<MarketCapSource | null>(null);
  const heldHistory = useRef(history), worker = useRef<Worker | null>(null), request = useRef(0), acceptedSource = useRef<MarketCapSource | null>(null), postedSource = useRef<MarketCapSource | null>(null);
  heldHistory.current = history;
  useEffect(() => {
    if (!active) return;
    const controller = new AbortController(); let pending = false;
    const read = async (path: string, live: boolean) => {
      if (pending && live) return; if (live) pending = true;
      try {
        const value = await readMarketDisplaySource(path); if (controller.signal.aborted) return;
        if (value.serverPulse < Math.max(heldHistory.current.summary.serverPulse, acceptedSource.current?.serverPulse ?? 0) || !live && acceptedSource.current) return;
        acceptedSource.current = value; setFullSource(value); setSource(marketCapSummary(value));
        if (live) setStatus('live');
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
    instance.onmessage = event => {
      if (event.data.id !== request.current || !event.data.history) return;
      try { const next = parseMarketHistory(event.data.history); heldHistory.current = next; setHistory(next); setCompletedSource(postedSource.current); try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* Optional public retention. */ } } catch { /* Preserve the last complete chart. */ }
    };
    return () => { instance.terminate(); worker.current = null; };
  }, []);
  useEffect(() => {
    const id = ++request.current;
    if (!worker.current) return;
    if (!fullSource || !active) { worker.current.postMessage({ id, cancel: true }); return; }
    postedSource.current = fullSource;
    worker.current.postMessage({ id, source: { ok: true, marketCapProjection: fullSource }, history: heldHistory.current });
  }, [fullSource, active]);
  // A period switch is a pure synchronous lookup. No job, cleared series or loading frame.
  return { source, points: history.series[period], status, historyUpdating: Boolean(fullSource && completedSource !== fullSource) };
}
