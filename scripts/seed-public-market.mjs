import { readFile,writeFile } from 'node:fs/promises';
import { readReceizPublicMarketSource } from '../server/public-market.ts';
import { parsePublicMarket } from '../src/receiz/public-market.ts';
import {retainPublicMomentManifest} from '../src/receiz/public-asset-manifest.ts';

const [membership, snapshot, sports, capitalization] = await Promise.all([
  readReceizPublicMarketSource('membership'),
  readReceizPublicMarketSource('quotes'),
  readReceizPublicMarketSource('sports'),
  readReceizPublicMarketSource('capitalization'),
]);
const catalog = parsePublicMarket(membership, snapshot);
if (!catalog.complete) throw new Error('The public source did not return its complete collection; seed not replaced.');
const wanted = new Set(catalog.items.map(item => item.id));
const quotes = { ...snapshot, data: { schema: snapshot.data.schema, liveMarkets: snapshot.data.liveMarkets.filter(item => wanted.has(item.itemId)).map(item => ({ itemId: item.itemId, visibility: item.visibility, priceUsd: item.priceUsd, quoteUsdPerPhi: item.quoteUsdPerPhi, changePct: item.changePct,...(item.shareInventory?{shareInventory:item.shareInventory}:{}), chart: item.chart?.slice(-48).map(point => ({ value: point.value })) })) } };
// A thinner membership response must not discard an already-carried receipt
// basis. Reuse the same exact binding checks as the live catalog.
let previous=null;try{const held=JSON.parse(await readFile(new URL('../public/receiz-public-market.json',import.meta.url),'utf8'));previous=new Map(parsePublicMarket(held,held.snapshot).items.map(item=>[item.id,item]));}catch{/* First capture has no retained public inputs. */}
if(previous){const rows=new Map(membership.transport.publicOriginals.map(row=>[row.id,row]));for(const item of catalog.items){const retained=retainPublicMomentManifest(item,previous.get(item.id));if(retained!==item)rows.get(item.id).profileOriginal.recordCardMediaSha256Hex=retained.proofManifestSource.recordCardMediaSha256Hex;}}
const source = { ...membership, snapshot: quotes };
const bytes = JSON.stringify(source);
await writeFile(new URL('../public/receiz-public-market.json', import.meta.url), bytes);
await (await import('./build-asset-title-index.mjs')).writeAssetTitleIndex();
console.log(JSON.stringify({ source: 'https://receiz.com/api/market/public-membership', count: catalog.items.length, observedAt: catalog.observedAt, bytes: Buffer.byteLength(bytes), authority: 'projection-only' }));

await writeFile(new URL('../public/receiz-public-sports.json', import.meta.url), JSON.stringify(sports));
await writeFile(new URL('../public/receiz-public-capitalization.json', import.meta.url), JSON.stringify(capitalization));
await import('./seed-market-history.mjs');
