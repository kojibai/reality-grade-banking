import { writeFile } from 'node:fs/promises';
import { readReceizPublicMarketSource } from '../server/public-market.ts';
import { parsePublicMarket } from '../src/receiz/public-market.ts';

const [membership, snapshot, sports, capitalization] = await Promise.all([
  readReceizPublicMarketSource('membership'),
  readReceizPublicMarketSource('quotes'),
  readReceizPublicMarketSource('sports'),
  readReceizPublicMarketSource('capitalization'),
]);
const catalog = parsePublicMarket(membership, snapshot);
if (!catalog.complete) throw new Error('The public source did not return its complete collection; seed not replaced.');
const wanted = new Set(catalog.items.map(item => item.id));
const quotes = { ...snapshot, data: { schema: snapshot.data.schema, liveMarkets: snapshot.data.liveMarkets.filter(item => wanted.has(item.itemId)).map(item => ({ itemId: item.itemId, visibility: item.visibility, priceUsd: item.priceUsd, quoteUsdPerPhi: item.quoteUsdPerPhi, changePct: item.changePct, chart: item.chart?.slice(-48).map(point => ({ value: point.value })) })) } };
const source = { ...membership, snapshot: quotes };
const bytes = JSON.stringify(source);
await writeFile(new URL('../public/receiz-public-market.json', import.meta.url), bytes);
console.log(JSON.stringify({ source: 'https://receiz.com/api/market/public-membership', count: catalog.items.length, observedAt: catalog.observedAt, bytes: Buffer.byteLength(bytes), authority: 'projection-only' }));

await writeFile(new URL('../public/receiz-public-sports.json', import.meta.url), JSON.stringify(sports));
await writeFile(new URL('../public/receiz-public-capitalization.json', import.meta.url), JSON.stringify(capitalization));
await import('./seed-market-history.mjs');
