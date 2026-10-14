import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';
import { readReceizPublicMarketSource } from './public-market.js';
import type { PublicSource } from '../src/receiz/public-network';

const PATH = '/api/bank/public-network';
export function parsePublicNetworkRequest(requestUrl: string): { source: PublicSource; cursor?: string } | null {
  const url = new URL(requestUrl, 'http://localhost'), source = url.searchParams.get('source'), cursor = url.searchParams.get('cursor');
  if (url.pathname !== PATH || [...url.searchParams.keys()].some(key => !['source', 'cursor'].includes(key)) || url.searchParams.getAll('source').length !== 1 || url.searchParams.getAll('cursor').length > 1 || !['wallet', 'actions', 'graph', 'proofs'].includes(source ?? '')) return null;
  if (cursor !== null && (!/^[a-zA-Z0-9_-]{1,2048}$/.test(cursor) || !['wallet', 'actions'].includes(source!))) return null;
  return { source: source as PublicSource, ...(cursor ? { cursor } : {}) };
}
async function publicFetch(input: string | URL | Request, init?: RequestInit): Promise<Response> {
  const url = new URL(typeof input === 'string' || input instanceof URL ? String(input) : input.url);
  if (url.origin !== 'https://receiz.com' || !['/api/wallet/ledger/public', '/api/ledger/actions/public', '/api/proof-graph/ledger'].includes(url.pathname) || init?.method && init.method !== 'GET') throw new Error('Public source path required.');
  const response = await fetch(url, { method: 'GET', credentials: 'omit', redirect: 'error', headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(30_000) });
  if (Number(response.headers.get('content-length')) > 32 * 1024 * 1024) throw new Error('Public source exceeds supported capacity.');
  const reader = response.body?.getReader(); if (!reader) throw new Error('Public source returned no bytes.');
  const chunks: Uint8Array[] = []; let size = 0;
  try { for (;;) { const chunk = await reader.read(); if (chunk.done) break; size += chunk.value.length; if (size > 32 * 1024 * 1024) throw new Error('Public source exceeds supported capacity.'); chunks.push(chunk.value); } }
  catch (error) { await reader.cancel().catch(() => {}); throw error; }
  const bytes = new Uint8Array(size); let offset = 0; for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return new Response(bytes, { status: response.status, headers: { 'Content-Type': response.headers.get('content-type') ?? 'application/json' } });
}
let sdkClient: Promise<ReturnType<typeof import('@receiz/sdk').createReceizClient>> | undefined;
function client() { return sdkClient ??= import('@receiz/sdk').then(sdk => sdk.createReceizClient({ baseUrl: 'https://receiz.com', fetchImpl: publicFetch })); }
const pending = new Map<string, Promise<unknown>>();
export async function readSharedPublicSource(source: PublicSource, cursor?: string): Promise<unknown> {
  const key = `${source}:${cursor ?? ''}`, existing = pending.get(key); if (existing) return existing;
  const request = (async () => {
    if (source === 'proofs') return readReceizPublicMarketSource('membership');
    if (source === 'graph') { const response = await publicFetch('https://receiz.com/api/proof-graph/ledger'); if (!response.ok) throw new Error('Public graph unavailable.'); return response.json(); }
    const sdk = await client();
    return source === 'wallet' ? sdk.wallet.publicLedger({ limit: 256, cursor }) : sdk.wallet.actionLedger({ limit: 256, cursor });
  })().finally(() => pending.delete(key));
  pending.set(key, request); return request;
}
export async function publicNetworkMiddleware(req: IncomingMessage, res: ServerResponse, next: () => void): Promise<void> {
  if (!req.url?.startsWith(PATH)) { next(); return; }
  res.setHeader('Cache-Control', 'no-store'); res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'GET') { res.writeHead(405, { Allow: 'GET' }); res.end(); return; }
  const parsed = parsePublicNetworkRequest(req.url); if (!parsed) { res.writeHead(400); res.end(); return; }
  try { const result = await readSharedPublicSource(parsed.source, parsed.cursor); res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(result)); }
  catch { res.writeHead(503, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ ok: false, error: 'Public source temporarily unavailable.' })); }
}
export function publicNetworkPlugin(): Plugin { return { name: 'receiz-shared-public-network', configureServer(server) { server.middlewares.use((req, res, next) => { void publicNetworkMiddleware(req, res, next); }); }, configurePreviewServer(server) { server.middlewares.use((req, res, next) => { void publicNetworkMiddleware(req, res, next); }); } }; }
