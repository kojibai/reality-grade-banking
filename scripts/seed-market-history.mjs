import { readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'vite';
import{receizKaiNow}from'@receiz/sdk';
const server = await createServer({ configFile: false, server: { middlewareMode: true, hmr: false, ws: false }, optimizeDeps: { noDiscovery: true, include: [] }, appType: 'custom' });
try {
  const { parseMarketCapSource } = await server.ssrLoadModule('/src/receiz/market-projection/source.ts');
  const { buildMarketHistory } = await server.ssrLoadModule('/src/receiz/market-projection/build-history.ts');
  const {packMarketHistory}=await server.ssrLoadModule('/src/receiz/market-projection/history-wire.ts');
  const {parsePublicMarket}=await server.ssrLoadModule('/src/receiz/public-market.ts');
  const {mergePublicSports}=await server.ssrLoadModule('/src/receiz/public-sports.ts');
  const source = parseMarketCapSource(JSON.parse(await readFile(new URL('../public/receiz-public-capitalization.json', import.meta.url), 'utf8')));
  const membership=JSON.parse(await readFile(new URL('../public/receiz-public-market.json',import.meta.url),'utf8'));
  const catalog=mergePublicSports(parsePublicMarket(membership,membership.snapshot),JSON.parse(await readFile(new URL('../public/receiz-public-sports.json',import.meta.url),'utf8')));
  if(!catalog.complete)throw Error('The shipped market collection must be complete before preparing its charts.');
  const pulse=Math.max(source.serverPulse,receizKaiNow().pulse);
  if(!process.argv.includes('--shares')){
    const history = await buildMarketHistory(source,null,undefined,undefined,{catalog,pulse});
    await writeFile(new URL('../public/receiz-public-chart-history.json', import.meta.url), JSON.stringify(packMarketHistory(history)));
  }
  const shares=await buildMarketHistory(source,null,undefined,undefined,{catalog,pulse,capitalization:true});
  if(!shares?.summary.shareCapitalization?.covered)throw Error('Share capitalization inputs are unavailable; existing prepared history retained.');
  await writeFile(new URL('../public/receiz-public-share-chart-history.json',import.meta.url),JSON.stringify(packMarketHistory(shares)));
  console.log(`Prepared six share-cap intervals for ${shares.summary.shareCapitalization.covered} canonical assets at Kai ${shares.summary.serverPulse}; display projection only.`);
} finally { await server.close(); }
