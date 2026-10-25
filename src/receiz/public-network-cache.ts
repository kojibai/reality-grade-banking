import { PUBLIC_SOURCES, PUBLIC_NETWORK_INSPECTION_VERSION, mergePublicRecords, type PublicRecord, type PublicSource } from './public-network';
import {safeLedgerSourceUrl} from './ledger-receipts';
import {readLedgerDetails} from './ledger-inspection';
import {readLedgerValueOperands} from './ledger-value';
import type {PublicLedgerFileReview} from './public-ledger-proof';

export interface PublicNetworkCache { records: PublicRecord[]; capturedAt: string | null;inspectionVersion?:number;coverage: { source: PublicSource; complete: boolean; anchorIds?: string[]; observedAt?: number }[]; }
export function parsePublicNetworkCache(input: unknown): PublicNetworkCache {
  const value = input as { schema?: string; authority?: string; inspectionVersion?:unknown;records?: (PublicRecord&{detailsRef?:unknown})[]; detailContexts?:unknown[];capturedAt?: string; coverage?: PublicNetworkCache['coverage'] };
  if (!value || value.schema !== 'receiz.bank.public-ledger-cache.v1' || value.authority !== 'public-source-projection' || !Array.isArray(value.records) || value.records.length > 100_000 || !Array.isArray(value.coverage)) throw new Error('A public-only discovery cache is required.');
  if(value.detailContexts!==undefined&&(!Array.isArray(value.detailContexts)||value.detailContexts.length>100000))throw Error('Public cache contains unsupported context.');
  const contexts=value.detailContexts?.map(readLedgerDetails);
  const records = value.records.map(row => {
    if (!row || row.authority !== 'public-source-projection' || !PUBLIC_SOURCES.includes(row.source) || typeof row.sourceId !== 'string' || row.sourceId.length > 512 || row.id !== `${row.source}:${row.sourceId}` || typeof row.title !== 'string' || row.title.length > 4096 || typeof row.kind !== 'string' || row.kind.length > 128 || typeof row.detail !== 'string' || row.detail.length > 8192) throw new Error('Public cache contains unsupported records.');
    for (const [coordinate, max] of [[row.kaiUpulse??null, 30], [row.pulse??null, 24], [row.amountUsdCents??null, 25]] as const) if (coordinate !== null && (typeof coordinate !== 'string' || !/^(0|[1-9]\d*)$/.test(coordinate) || coordinate.length > max)) throw new Error('Public cache contains invalid display coordinates.');
    const actor = typeof row.actor === 'string' && /^[1-9A-HJ-NP-Za-km-z]{26,36}$/.test(row.actor) ? row.actor : null;
    const evidence: Record<string, string> = {};
    for (const key of ['entryHash', 'prevHash', 'transferId', 'objectId', 'proofHead', 'bundleHash', 'capsuleHash', 'claimHash', 'artifactDigest']) { const item = row.evidence?.[key]; if (typeof item === 'string' && item.length <= 512) evidence[key] = item; }
    // Keep the already supplied cross-feed reference on reopen. Dropping it
    // splits one payment into two display rows until the next live read.
    const publicTransferId=row.evidence?.publicTransferId;
    if(row.source==='actions'&&row.kind==='wallet.transfer.connect'&&typeof publicTransferId==='string'&&/^tx:[a-f0-9]{24}$/.test(publicTransferId))evidence.publicTransferId=publicTransferId;
    const {detailsRef,...record}=row;
    if(detailsRef!==undefined&&(!Number.isInteger(detailsRef)||Number(detailsRef)<0||!contexts?.[Number(detailsRef)]))throw Error('Public cache contains an invalid context reference.');
    return { ...record, actor, time: row.time && Number.isFinite(Date.parse(row.time)) ? row.time : null,kaiUpulse:row.kaiUpulse??null,pulse:row.pulse??null,amountUsdCents:row.amountUsdCents??null,evidence, sourceUrl: safeLedgerSourceUrl(row.sourceUrl),details:readLedgerDetails({...contexts?.[Number(detailsRef)],...row.details}),valueOperands:readLedgerValueOperands(row.valueOperands) };
  });
  return { records: mergePublicRecords([], records),inspectionVersion:Number.isInteger(value.inspectionVersion)&&Number(value.inspectionVersion)>=0&&Number(value.inspectionVersion)<=PUBLIC_NETWORK_INSPECTION_VERSION?Number(value.inspectionVersion):0,capturedAt: typeof value.capturedAt === 'string' && Number.isFinite(Date.parse(value.capturedAt)) ? value.capturedAt : null,
    coverage: value.coverage.filter(item => PUBLIC_SOURCES.includes(item.source)).map(item => ({ source: item.source, complete: item.complete === true, observedAt: Number.isSafeInteger(item.observedAt) && item.observedAt! >= 0 ? item.observedAt : undefined, anchorIds: Array.isArray(item.anchorIds) ? item.anchorIds.filter(id => typeof id === 'string' && id.startsWith(`${item.source}:`) && id.length <= 520).slice(0, 100_000) : undefined })) };
}
async function database(): Promise<IDBDatabase> { return new Promise((resolve, reject) => {
  const request = indexedDB.open('receiz-bank-public-projections', 1);
  request.onupgradeneeded = () => request.result.createObjectStore('public'); request.onerror = () => reject(request.error); request.onsuccess = () => resolve(request.result);
}); }
export async function loadPublicNetworkCache(): Promise<PublicNetworkCache | null> {
  try { const db = await database(); try { const input = await new Promise<unknown>((resolve, reject) => { const request = db.transaction('public').objectStore('public').get('network'); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); }); if (!input) return null; const cache = parsePublicNetworkCache(input);
    // Older caches did not distinguish complete anchors from interrupted additions.
    cache.coverage = cache.coverage.map(item => ({ ...item, complete: item.complete && Array.isArray(item.anchorIds) })); return cache; } finally { db.close(); } } catch { return null; }
}
export async function loadPublicNetworkSeed(signal?: AbortSignal): Promise<PublicNetworkCache | null> {
  try {
    const response = await fetch('/receiz-public-ledger.json.gz.bin', { signal, credentials: 'omit' });
    if (!response.ok || !response.body || Number(response.headers.get('content-length')) > 8 * 1024 * 1024) return null;
    const decodedByTransport = response.headers.get('content-encoding')?.includes('gzip');
    if (!decodedByTransport && typeof DecompressionStream === 'undefined') return null;
    const stream = decodedByTransport ? response.body : response.body.pipeThrough(new DecompressionStream('gzip'));
    const reader = stream.getReader(); const chunks: Uint8Array[] = []; let size = 0;
    try { for (;;) { const chunk = await reader.read(); if (chunk.done) break; size += chunk.value.length; if (size > 32 * 1024 * 1024) throw new Error('Public cache exceeds capacity.'); chunks.push(chunk.value); } }
    catch (cause) { await reader.cancel().catch(() => {}); throw cause; }
    const bytes = new Uint8Array(size); let offset = 0; for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    return parsePublicNetworkCache(JSON.parse(new TextDecoder().decode(bytes)));
  } catch { return null; }
}
function mergeCaches(previous:PublicNetworkCache|null,cache:PublicNetworkCache):PublicNetworkCache{
  const coverage = PUBLIC_SOURCES.map(source => {
    const incoming = cache.coverage.find(item => item.source === source), prior = previous?.coverage.find(item => item.source === source);
    return prior && (prior.observedAt ?? 0) > (incoming?.observedAt ?? 0) ? prior : incoming ?? prior ?? { source, complete: false };
  });
  const records = previous?.records===cache.records?cache.records:PUBLIC_SOURCES.flatMap(source => {
    const incoming = cache.coverage.find(item => item.source === source), prior = previous?.coverage.find(item => item.source === source);
    const oldRows = previous?.records.filter(row => row.source === source) ?? [], newRows = cache.records.filter(row => row.source === source);
    if (['graph', 'proofs'].includes(source)) {
      if ((prior?.observedAt ?? 0) > (incoming?.observedAt ?? 0)) return oldRows;
      if (incoming?.complete) return newRows;
    }
    return mergePublicRecords(oldRows, newRows);
  });
  const capturedAt=previous?.capturedAt&&(!cache.capturedAt||Date.parse(previous.capturedAt)>Date.parse(cache.capturedAt))?previous.capturedAt:cache.capturedAt;
  return {...cache,capturedAt,inspectionVersion:Math.max(previous?.inspectionVersion??0,cache.inspectionVersion??0),coverage,records:previous?.records===cache.records?records:mergePublicRecords([],records)};
}
// Reuse only this module's completed write, beneath the same durable generation.
// Disk readers still validate every restored cache; foreign/legacy writers force
// the existing validation/merge path. This marker admits no proof or funds.
let committedWrite:{generation:string;cache:PublicNetworkCache}|null=null;
const immutableSnapshots=new WeakSet<object>();
/** Ledger projections append by replacement. Protect those already-held rows
 * once, then share them with the saved snapshot instead of cloning the history. */
function retainImmutableSnapshot<T extends object>(value:T):T{
  const pending:object[]=[value];
  while(pending.length){
    const next=pending.pop()!;if(immutableSnapshots.has(next))continue;
    immutableSnapshots.add(next);
    for(const child of Object.values(next))if(child&&typeof child==='object')pending.push(child);
    Object.freeze(next);
  }
  return value;
}
async function writePublicNetworkCache(cache: PublicNetworkCache, canonicalActionIds?:ReadonlySet<string>): Promise<boolean> {
  try { const db = await database(); try { await new Promise<void>((resolve, reject) => {
    const tx = db.transaction('public', 'readwrite'), store = tx.objectStore('public'), read = store.get('network');
    let accepted:typeof committedWrite=null;
    read.onsuccess = () => { try { let previous: PublicNetworkCache | null = null; try { if(read.result)previous=committedWrite&&read.result.writeGeneration===committedWrite.generation?committedWrite.cache:parsePublicNetworkCache(read.result); } catch { /* Reject invalid projection cache. */ }
      if(previous&&canonicalActionIds?.size)previous={...previous,records:previous.records.filter(record=>!canonicalActionIds.has(record.id))};
      const next=mergeCaches(previous,cache),generation=crypto.randomUUID();
      accepted={generation,cache:retainImmutableSnapshot(next)};
      store.put({ ...next, schema: 'receiz.bank.public-ledger-cache.v1', authority: 'public-source-projection',writeGeneration:generation }, 'network');
    } catch(error) { try { tx.abort(); } catch { /* It may already be aborted. */ } reject(error); } };
    tx.oncomplete = () => {if(accepted)committedWrite=accepted;resolve();}; tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error);
  });return true; } finally { db.close(); } } catch { return false; /* Cache is discovery convenience, never financial authority. */ }
}
/** The existing held original, rather than a transported display flag, permits
 * correcting weaker cached duplicates. Peer writes keep their conflict guard. */
export async function savePublicLedgerDisplayCache(review:PublicLedgerFileReview,cache:PublicNetworkCache):Promise<boolean>{
 const {heldPublicLedgerFile}=await import('./public-ledger-proof');heldPublicLedgerFile(review);
 if(!review.snapshot)throw Error('PUBLIC_LEDGER_SOURCE_REQUIRED');
 const signed=new Map(review.snapshot.records.map(record=>[record.id,record])),canonicalActionIds=new Set<string>();
 for(const record of cache.records){
  if(record.source!=='actions')continue;const source=signed.get(record.sourceId);if(!source)continue;
  if(record.id!==`actions:${source.id}`||record.kind!==source.kind||record.amountUsdCents!==source.amountUsdCents||record.kaiUpulse!==source.kaiUpulse||record.pulse!==(BigInt(source.kaiUpulse)/1_000_000n).toString()||record.evidence.entryHash!==source.entryHash||record.evidence.prevHash!==source.previousHash)throw Error('PUBLIC_LEDGER_DISPLAY_SOURCE_MISMATCH');
  canonicalActionIds.add(record.id);
 }
 return writePublicNetworkCache(cache,canonicalActionIds);
}
let queued:PublicNetworkCache|null=null,writing:Promise<boolean>|null=null;
/** Coalesce the same task's updates immediately, then retain only the newest
 * pending snapshot during a write. No component cleanup cancels this queue. */
export function savePublicNetworkCache(cache:PublicNetworkCache):Promise<boolean>{
  try { queued=queued?mergeCaches(queued,cache):cache; } catch { return Promise.resolve(false); }
  if(!writing)writing=Promise.resolve().then(async()=>{
    let saved=true;
    try{while(queued){const next=queued;queued=null;saved=await writePublicNetworkCache(next)&&saved;}return saved;}
    finally{writing=null;}
  });
  return writing;
}
