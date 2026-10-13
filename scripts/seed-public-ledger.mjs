import { readFile, writeFile } from 'node:fs/promises';
import { gunzipSync, gzipSync } from 'node:zlib';
import { mergePublicRecords, parsePublicNetworkPage } from '../src/receiz/public-network.ts';

const reference = process.argv[2];
if (!reference) throw new Error('Pass the selected public Mind capture path; private Memory Crystals are not supported.');
const capture = JSON.parse(gunzipSync(await readFile(reference)));
if (capture.schema !== 'receiz.mind.public-sources.v1' || capture.projectionVersion !== 2 || capture.history?.uid !== 'public-receiz-network' || capture.history.authority !== 'public-source-projection' || !capture.progress.every(([, state]) => state.complete === true)) throw new Error('A complete public-only source capture is required.');
const mapping = { actions: 'actions', ledger: 'wallet', structure: 'graph' };
const pages = Object.entries(mapping).map(([group, source]) => {
  const index = capture.history.groups.findIndex(item => item.id === group);
  const rows = capture.history.records.filter(item => item.group === index && item.authority === 'public-source-projection').map(item => item.recorded);
  return parsePublicNetworkPage(source, { source, rows, nextCursor: null });
});
const membership = JSON.parse(await readFile(new URL('../public/receiz-public-market.json', import.meta.url), 'utf8'));
pages.push(parsePublicNetworkPage('proofs', membership));
const records = mergePublicRecords([], pages.flatMap(page => page.records));
const bytes = Buffer.from(JSON.stringify({ schema: 'receiz.bank.public-ledger-cache.v1', authority: 'public-source-projection', capturedAt: capture.capturedAt, records, coverage: pages.map(page => ({ source: page.source, complete: true, count: page.records.length })) }));
const compressed = gzipSync(bytes, { level: 9 });
await writeFile(new URL('../public/receiz-public-ledger.json.gz', import.meta.url), compressed);
console.log(JSON.stringify({ records: records.length, capturedAt: capture.capturedAt, publicOnly: true, bytes: bytes.length, compressedBytes: compressed.length }));
