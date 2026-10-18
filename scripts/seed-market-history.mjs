import { readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'vite';
import{receizKaiNow}from'@receiz/sdk';
const server = await createServer({ configFile: false, server: { middlewareMode: true, hmr: false }, optimizeDeps: { noDiscovery: true, include: [] }, appType: 'custom' });
try {
  const { parseMarketCapSource } = await server.ssrLoadModule('/src/receiz/market-projection/source.ts');
  const { buildMarketHistory } = await server.ssrLoadModule('/src/receiz/market-projection/build-history.ts');
  const {parsePublicMarket}=await server.ssrLoadModule('/src/receiz/public-market.ts');
  const {mergePublicSports}=await server.ssrLoadModule('/src/receiz/public-sports.ts');
  const source = parseMarketCapSource(JSON.parse(await readFile(new URL('../public/receiz-public-capitalization.json', import.meta.url), 'utf8')));
  const catalog=mergePublicSports(parsePublicMarket(JSON.parse(await readFile(new URL('../public/receiz-public-market.json',import.meta.url),'utf8'))),JSON.parse(await readFile(new URL('../public/receiz-public-sports.json',import.meta.url),'utf8')));
  if(!catalog.complete)throw Error('The shipped market collection must be complete before preparing its charts.');
  const history = await buildMarketHistory(source,null,undefined,undefined,{catalog,pulse:Math.max(source.serverPulse,receizKaiNow().pulse)});
  await writeFile(new URL('../public/receiz-public-chart-history.json', import.meta.url), JSON.stringify(history));
  console.log(`Prepared six public chart intervals for ${history.summary.marketAssetsPriced} market objects at Kai ${history.summary.serverPulse}; display projection only.`);
} finally { await server.close(); }
