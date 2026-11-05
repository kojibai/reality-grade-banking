import { readFile, writeFile, rename, rm } from 'node:fs/promises';
import { gunzipSync, gzipSync } from 'node:zlib';
import { PUBLIC_NETWORK_INSPECTION_VERSION, mergePublicRecords, parsePublicNetworkPage } from '../src/receiz/public-network.ts';
import {parsePublicNetworkCache} from '../src/receiz/public-network-cache.ts';
import {publicNetworkCacheWire} from '../src/receiz/public-network-cache-wire.ts';

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
let priorRecords=[];
try{priorRecords=parsePublicNetworkCache(JSON.parse(gunzipSync(await readFile(new URL('../public/receiz-public-ledger.json.gz.bin',import.meta.url))))).records;}catch{/* No retained public seed. */}
const priorById=new Map(priorRecords.map(record=>[record.id,record]));
const records = mergePublicRecords([], pages.flatMap(page => page.records)).map(row=>{
 const prior=priorById.get(row.id),record=prior?mergePublicRecords([prior],[row])[0]:row;
 return {...record,details:{...record.details,sourceObservedAt:record.source==='proofs'?membership.transport.generatedAt:capture.capturedAt}};
});
const bytes=Buffer.from(JSON.stringify(publicNetworkCacheWire({records,inspectionVersion:PUBLIC_NETWORK_INSPECTION_VERSION,capturedAt:capture.capturedAt,coverage:pages.map(page=>({source:page.source,complete:true,count:page.records.length}))})));
if(bytes.length>32*1024*1024)throw Error(`PUBLIC_LEDGER_SEED_DECODED_CAPACITY_EXCEEDED:${bytes.length}`);
const compressed = gzipSync(bytes, { level: 9 });
const target=new URL('../public/receiz-public-ledger.json.gz.bin',import.meta.url),temporary=new URL(`../public/.receiz-public-ledger-${process.pid}.tmp`,import.meta.url);
try{await writeFile(temporary,compressed);await rename(temporary,target);}finally{await rm(temporary,{force:true});}
console.log(JSON.stringify({ records: records.length, capturedAt: capture.capturedAt, publicOnly: true, bytes: bytes.length, compressedBytes: compressed.length }));
