import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';

const PREFIX = '/api/bank/public-market/';
const MAX_BYTES = 128 * 1024 * 1024;
export function resolvePublicMarketTarget(requestUrl: string): URL | null {
  const local = new URL(requestUrl, 'http://localhost');
  if (local.pathname === `${PREFIX}membership` && !local.search) return new URL('https://receiz.com/api/market/public-membership');
  if (local.pathname === `${PREFIX}sports` && !local.search) return new URL('https://receiz.com/api/game/sports/economy');
  if (local.pathname === `${PREFIX}capitalization` && !local.search) return new URL('https://receiz.com/api/proof-graph/market-cap');
  if (local.pathname === `${PREFIX}quotes` && !local.search) return new URL('https://receiz.com/api/market/public-snapshot?detail=full');
  if (local.pathname !== `${PREFIX}original` || [...local.searchParams.keys()].some(key => key !== 'path') || local.searchParams.getAll('path').length !== 1) return null;
  const path = local.searchParams.get('path'); if (!path || !path.startsWith('/api/profile/originals/download?')) return null;
  const target = new URL(path, 'https://receiz.com');
  if (target.pathname !== '/api/profile/originals/download' || target.hash || [...target.searchParams.keys()].some(key => !['receizId', 'kind'].includes(key)) || target.searchParams.getAll('receizId').length !== 1 || target.searchParams.getAll('kind').length !== 1 || !/^[a-zA-Z0-9_-]{1,128}$/.test(target.searchParams.get('receizId') ?? '') || target.searchParams.get('kind') !== 'original') return null;
  return target;
}
interface CachedResponse { bytes: Uint8Array; type: string; etag: string | null; fetchedAt: number; }
const cache = new Map<string, CachedResponse>(), pending = new Map<string, Promise<CachedResponse>>();
async function readBounded(response: Response): Promise<Uint8Array> {
  if (Number(response.headers.get('content-length')) > MAX_BYTES) throw new Error('Public source exceeds supported size.');
  const reader = response.body?.getReader(); if (!reader) throw new Error('Public source returned no bytes.');
  const chunks: Uint8Array[] = []; let length = 0;
  try { for (;;) { const { value, done } = await reader.read(); if (done) break; length += value.length; if (length > MAX_BYTES) throw new Error('Public source exceeds supported size.'); chunks.push(value); } }
  catch (error) { await reader.cancel().catch(() => {}); throw error; }
  const bytes = new Uint8Array(length); let offset = 0; for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; } return bytes;
}
async function loadPublicResponse(target: URL): Promise<CachedResponse> {
  const key = target.href, previous = cache.get(key);
  const original = target.pathname === '/api/profile/originals/download';
  if (!original && previous && Date.now() - previous.fetchedAt < 60_000) return previous;
  const inflight = pending.get(key); if (inflight) return inflight;
  const attempt = (async () => {
    const response = await fetch(target, { signal: AbortSignal.timeout(90_000), credentials: 'omit', redirect: 'error', headers: previous?.etag ? { 'If-None-Match': previous.etag } : {} });
    if (response.status === 304 && previous) { const current = { ...previous, fetchedAt: Date.now() }; cache.set(key, current); return current; }
    if (!response.ok) throw new Error(`Receiz public source returned ${response.status}.`);
    let bytes = await readBounded(response);
    const type = response.headers.get('content-type') ?? 'application/octet-stream';
    if (!original) {
      if (!type.includes('application/json')) throw new Error('Receiz public source returned an unsupported response.');
      const input = JSON.parse(new TextDecoder().decode(bytes));
      // Drop full works and unrelated private/session fields from discovery transport.
      if (target.pathname.endsWith('public-membership')) {
        const transport = input.transport;
        if (input.ok !== true || !Array.isArray(transport?.publicOriginals)) throw new Error('Receiz public collection is unavailable.');
        input.transport = { generatedAt: transport.generatedAt, publicMembership: transport.publicMembership, publicOriginals: transport.publicOriginals.map((item: Record<string, unknown>) => {
          const profile = item.profileOriginal as Record<string, unknown> | undefined, media = profile?.media as Record<string, unknown> | undefined;
          return { id: item.id, receizId: item.receizId, title: item.title, summary: item.summary, visibility: item.visibility, ownerUsername: item.ownerUsername, ownerDisplayName: item.ownerDisplayName, canonicalHref: item.canonicalHref, verifyHref: item.verifyHref, pulse: item.pulse, createdAt: item.createdAt, valueUsd: item.valueUsd,
            profileOriginal: { media: { originalDownloadSrc: media?.originalDownloadSrc, originalDownloadSha256Hex: media?.originalDownloadSha256Hex, material: media?.material ? { sealedArtifactSha256Hex: (media.material as Record<string, unknown>).sealedArtifactSha256Hex } : null } } };
        }) };
      } else if (target.pathname === '/api/game/sports/economy') {
        if (input.ok !== true || input.schema !== 'receiz.sports_economy.live_inventory.v1' || !Array.isArray(input.cards) || input.cards.length > 100000) throw new Error('Public sports inventory is unavailable.');
        const fields = ['collectibleId', 'claimHash', 'athlete', 'sport', 'rarity', 'issueLine', 'liveValueUsd', 'totalValueUsd', 'vaultCount', 'pricedCount', 'route'];
        input.cards = input.cards.map((card: Record<string, unknown>) => Object.fromEntries(fields.map(key => [key, card[key]])));
        const publicInput = { ok: true, schema: input.schema, generatedAt: input.generatedAt, fallback: input.fallback === true, cards: input.cards };
        for (const key of Object.keys(input)) delete input[key];
        Object.assign(input, publicInput);
      } else if (target.pathname === '/api/proof-graph/market-cap') {
        const publicInput = curatePublicCapitalization(input);
        for (const key of Object.keys(input)) delete input[key];
        Object.assign(input, publicInput);
      } else if (input.data) { input.data = { schema: input.data.schema, liveMarkets: input.data.liveMarkets }; }
      bytes = new TextEncoder().encode(JSON.stringify(input));
    }
    const current = { bytes, type, etag: response.headers.get('etag'), fetchedAt: Date.now() };
    if (!original) cache.set(key, current); return current;
  })().finally(() => pending.delete(key));
  pending.set(key, attempt); return attempt;
}
export async function publicMarketMiddleware(request: IncomingMessage, response: ServerResponse, next: () => void): Promise<void> {
  if (!request.url?.startsWith(PREFIX)) { next(); return; }
  response.setHeader('X-Content-Type-Options', 'nosniff'); response.setHeader('Cache-Control', 'no-store');
  if (request.method !== 'GET') { response.writeHead(405, { Allow: 'GET' }); response.end(); return; }
  const target = resolvePublicMarketTarget(request.url); if (!target) { response.writeHead(400); response.end(); return; }
  try { const result = await loadPublicResponse(target); response.setHeader('Content-Type', result.type); response.writeHead(200); response.end(result.bytes); }
  catch { response.writeHead(503, { 'Content-Type': 'application/json' }); response.end(JSON.stringify({ ok: false, error: 'Receiz public source is temporarily unavailable.' })); }
}
/** Build-time public discovery seed. Report-only projection, never a held account. */
export async function readReceizPublicMarketSource(kind: 'membership' | 'quotes' | 'sports' | 'capitalization'): Promise<unknown> {
  const target = resolvePublicMarketTarget(`${PREFIX}${kind}`); if (!target) throw new Error('Unsupported public source.');
  return JSON.parse(new TextDecoder().decode((await loadPublicResponse(target)).bytes));
}
/** Only public fields used by the canonical display projector cross this boundary. */
export function curatePublicCapitalization(input: Record<string, unknown>) {
  const seed = input.marketCapProjection as Record<string, unknown> | undefined;
  if (input.ok !== true || !seed || !Array.isArray(seed.valueRows) || seed.valueRows.length > 10000) throw new Error('Public capitalization source is unavailable.');
  const fields = ['schema', 'source', 'proofObjectHash', 'generatedAt', 'firstIssuancePulse', 'serverPulse', 'currentUsd', 'cardsInCirculation', 'sportsCardsPriced', 'marketAssetsPriced'];
  return { ok: true, marketCapProjection: { ...Object.fromEntries(fields.map(key => [key, seed[key]])), valueRows: seed.valueRows.map((row: Record<string, unknown>) => {
    const item = row.marketItem as Record<string, unknown> | undefined, meta = item?.livePulseSeed as Record<string, unknown> | undefined;
    return { ...Object.fromEntries(['id', 'source', 'baseUsdValue', 'birthUsdValue', 'marketUsdValue', 'proofTotalValueUsd', 'scoreDelta', 'seed', 'quoteUsdPerPhi'].map(key => [key, row[key]])), ...(item ? { marketItem: { ...Object.fromEntries(['id', 'source', 'priceUsd', 'pricePhi', 'quoteUsdPerPhi', 'changePct', 'pricingSourceKey'].map(key => [key, item[key]])), ...(meta ? { livePulseSeed: Object.fromEntries(['kind', 'claimPulse', 'beat', 'stepIndex', 'creatorVerified', 'chakraDay', 'kaiSignature', 'userPhiKey'].map(key => [key, meta[key]])) } : {}) } } : {}) };
  }) } };
}
export function publicMarketPlugin(): Plugin { return { name: 'receiz-public-market', configureServer(server) { server.middlewares.use((req, res, next) => { void publicMarketMiddleware(req, res, next); }); }, configurePreviewServer(server) { server.middlewares.use((req, res, next) => { void publicMarketMiddleware(req, res, next); }); } }; }
