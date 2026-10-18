import { readFile, writeFile, rename, rm } from 'node:fs/promises';
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
const records = mergePublicRecords([], pages.flatMap(page => page.records)).map(row=>({...row,details:{...row.details,sourceObservedAt:row.source==='proofs'?membership.transport.generatedAt:capture.capturedAt}}));
// Repeated public identity context is carried once, preserving every exact
// field while keeping the first-open payload inside the existing reader limit.
const contextKeys=new Set(['sourceObservedAt','actorUserId','subjectUserId','actorKaiSignature','subjectKaiSignature','actorCreatedAt','subjectCreatedAt','actorPulse','subjectPulse','actorChakraDay','subjectChakraDay','actor','subject','sender','recipient','owner','creator','fromActor','toActor','previousOwner','newOwner']);
const contexts=new Map();
for(const row of records){const fields=Object.fromEntries(Object.entries(row.details??{}).filter(([key])=>contextKeys.has(key)));const key=JSON.stringify(fields);const prior=contexts.get(key);if(prior)prior.count++;else contexts.set(key,{fields,count:1,index:-1});}
const detailContexts=[];for(const context of contexts.values())if(context.count>1&&Object.keys(context.fields).length){context.index=detailContexts.length;detailContexts.push(context.fields);}
const compactRecords=records.map(row=>{const common=Object.fromEntries(Object.entries(row.details??{}).filter(([key])=>contextKeys.has(key))),context=contexts.get(JSON.stringify(common));return context?.index>=0?{...row,details:Object.fromEntries(Object.entries(row.details??{}).filter(([key])=>!contextKeys.has(key))),detailsRef:context.index}:row;});
const compactWire=compactRecords.map(row=>Object.fromEntries(Object.entries(row).filter(([key,value])=>value!==null&&!(key==='valueOperands'&&Object.keys(value??{}).length===0))));
const bytes = Buffer.from(JSON.stringify({ schema: 'receiz.bank.public-ledger-cache.v1', authority: 'public-source-projection',inspectionVersion:1,capturedAt: capture.capturedAt, records:compactWire,detailContexts,coverage: pages.map(page => ({ source: page.source, complete: true, count: page.records.length })) }));
if(bytes.length>32*1024*1024)throw Error(`PUBLIC_LEDGER_SEED_DECODED_CAPACITY_EXCEEDED:${bytes.length}`);
const compressed = gzipSync(bytes, { level: 9 });
const target=new URL('../public/receiz-public-ledger.json.gz.bin',import.meta.url),temporary=new URL(`../public/.receiz-public-ledger-${process.pid}.tmp`,import.meta.url);
try{await writeFile(temporary,compressed);await rename(temporary,target);}finally{await rm(temporary,{force:true});}
console.log(JSON.stringify({ records: records.length, capturedAt: capture.capturedAt, publicOnly: true, bytes: bytes.length, compressedBytes: compressed.length }));
