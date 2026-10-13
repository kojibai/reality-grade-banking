import { PUBLIC_SOURCES, mergePublicRecords, type PublicRecord, type PublicSource } from './public-network';
import { safeReceizPublicUrl } from './public-market';

export interface PublicNetworkCache { records: PublicRecord[]; capturedAt: string | null; coverage: { source: PublicSource; complete: boolean }[]; }
export function parsePublicNetworkCache(input: unknown): PublicNetworkCache {
  const value = input as { schema?: string; authority?: string; records?: PublicRecord[]; capturedAt?: string; coverage?: PublicNetworkCache['coverage'] };
  if (!value || value.schema !== 'receiz.bank.public-ledger-cache.v1' || value.authority !== 'public-source-projection' || !Array.isArray(value.records) || value.records.length > 100_000 || !Array.isArray(value.coverage)) throw new Error('A public-only discovery cache is required.');
  const records = value.records.map(row => {
    if (!row || row.authority !== 'public-source-projection' || !PUBLIC_SOURCES.includes(row.source) || typeof row.sourceId !== 'string' || row.sourceId.length > 512 || row.id !== `${row.source}:${row.sourceId}` || typeof row.title !== 'string' || row.title.length > 4096 || typeof row.kind !== 'string' || row.kind.length > 128 || typeof row.detail !== 'string' || row.detail.length > 2048) throw new Error('Public cache contains unsupported records.');
    for (const [coordinate, max] of [[row.kaiUpulse, 30], [row.pulse, 24], [row.amountUsdCents, 25]] as const) if (coordinate !== null && (typeof coordinate !== 'string' || !/^(0|[1-9]\d*)$/.test(coordinate) || coordinate.length > max)) throw new Error('Public cache contains invalid display coordinates.');
    const actor = typeof row.actor === 'string' && /^[1-9A-HJ-NP-Za-km-z]{26,36}$/.test(row.actor) ? row.actor : null;
    const evidence: Record<string, string> = {};
    for (const key of ['entryHash', 'prevHash', 'transferId', 'objectId', 'proofHead', 'bundleHash', 'capsuleHash', 'claimHash', 'artifactDigest']) { const item = row.evidence?.[key]; if (typeof item === 'string' && item.length <= 512) evidence[key] = item; }
    return { ...row, actor, time: row.time && Number.isFinite(Date.parse(row.time)) ? row.time : null, evidence, sourceUrl: safeReceizPublicUrl(row.sourceUrl, 'proof') ?? safeReceizPublicUrl(row.sourceUrl, 'source') };
  });
  return { records: mergePublicRecords([], records), capturedAt: typeof value.capturedAt === 'string' && Number.isFinite(Date.parse(value.capturedAt)) ? value.capturedAt : null,
    coverage: value.coverage.filter(item => PUBLIC_SOURCES.includes(item.source)).map(item => ({ source: item.source, complete: item.complete === true })) };
}
async function database(): Promise<IDBDatabase> { return new Promise((resolve, reject) => {
  const request = indexedDB.open('receiz-bank-public-projections', 1);
  request.onupgradeneeded = () => request.result.createObjectStore('public'); request.onerror = () => reject(request.error); request.onsuccess = () => resolve(request.result);
}); }
export async function loadPublicNetworkCache(): Promise<PublicNetworkCache | null> {
  try { const db = await database(); try { const input = await new Promise<unknown>((resolve, reject) => { const request = db.transaction('public').objectStore('public').get('network'); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); }); return input ? parsePublicNetworkCache(input) : null; } finally { db.close(); } } catch { return null; }
}
export async function loadPublicNetworkSeed(signal?: AbortSignal): Promise<PublicNetworkCache | null> {
  try {
    const response = await fetch('/receiz-public-ledger.json.gz', { signal, credentials: 'omit' });
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
export async function savePublicNetworkCache(cache: PublicNetworkCache): Promise<void> {
  try { const db = await database(); try { await new Promise<void>((resolve, reject) => {
    const tx = db.transaction('public', 'readwrite'), store = tx.objectStore('public'), read = store.get('network');
    read.onsuccess = () => { let previous: PublicNetworkCache | null = null; try { if (read.result) previous = parsePublicNetworkCache(read.result); } catch { /* Reject invalid projection cache. */ }
      store.put({ ...cache, records: mergePublicRecords(previous?.records ?? [], cache.records), schema: 'receiz.bank.public-ledger-cache.v1', authority: 'public-source-projection' }, 'network'); };
    tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error);
  }); } finally { db.close(); } } catch { /* Cache is additive convenience, never financial authority. */ }
}
