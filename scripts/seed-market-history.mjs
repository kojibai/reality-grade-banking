import { readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'vite';
const server = await createServer({ configFile: false, server: { middlewareMode: true, hmr: false }, optimizeDeps: { noDiscovery: true, include: [] }, appType: 'custom' });
try {
  const { parseMarketCapSource } = await server.ssrLoadModule('/src/receiz/market-projection/source.ts');
  const { buildMarketHistory } = await server.ssrLoadModule('/src/receiz/market-projection/build-history.ts');
  const source = parseMarketCapSource(JSON.parse(await readFile(new URL('../public/receiz-public-capitalization.json', import.meta.url), 'utf8')));
  const history = await buildMarketHistory(source);
  await writeFile(new URL('../public/receiz-public-chart-history.json', import.meta.url), JSON.stringify(history));
  console.log(`Prepared six public chart intervals at Kai ${source.serverPulse}; display projection only.`);
} finally { await server.close(); }
