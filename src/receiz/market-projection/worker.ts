import { parseMarketCapSource } from './source';
import { parseMarketHistory, type MarketHistorySnapshot } from './history';
import { buildMarketHistory } from './build-history';
let latest = 0, retained: MarketHistorySnapshot | null = null;
// Publish only complete curves. Ordinary same-basis refreshes retain every
// prior sample and calculate just the moving opening bounds and newest point.
self.onmessage = async (event: MessageEvent<{ id: number; source?: unknown; history?: unknown; cancel?: boolean }>) => {
  const { id } = event.data; latest = id;
  if (event.data.cancel) return;
  try {
    if (event.data.history) retained = parseMarketHistory(event.data.history);
    if (!event.data.source) return;
    const source = parseMarketCapSource(event.data.source);
    const next = await buildMarketHistory(source, retained, () => latest === id, () => new Promise(resolve => setTimeout(resolve, 0)));
    if (!next || latest !== id) return;
    retained = next; self.postMessage({ id, history: next });
  } catch { if (latest === id) self.postMessage({ id, error: 'Projected market history is unavailable.' }); }
};
