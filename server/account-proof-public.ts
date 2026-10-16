import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';
import { accountProofRoute } from '../src/receiz/account-proof-links';
export async function accountProofPublicMiddleware(req: IncomingMessage, res: ServerResponse, next: () => void) {
  const url = new URL(req.url ?? '/', 'http://localhost');
  if (url.pathname !== '/api/bank/account-proof') { next(); return; }
  res.setHeader('Cache-Control', 'no-store'); res.setHeader('X-Content-Type-Options', 'nosniff');
  const digest = url.searchParams.get('proof'), latest = url.searchParams.get('view');
  if (req.method !== 'GET' || !digest || !/^[a-f0-9]{64}$/u.test(digest) || latest !== null && latest !== 'latest' || [...url.searchParams.keys()].some(key => !['proof', 'view'].includes(key) || url.searchParams.getAll(key).length !== 1)) { res.writeHead(400); res.end(); return; }
  try {
    // Public distribution only. Never forward cookies, authorization, an
    // arbitrary URL, account selector, or a private account response.
    const response = await fetch(`https://receiz.com/api/account-proofs/${digest}${latest ? '/latest' : ''}`, { credentials: 'omit', redirect: 'error', signal: AbortSignal.timeout(30_000), headers: { Accept: 'application/json' } });
    if (!response.ok || !response.body) { res.writeHead(response.status === 404 ? 404 : 503); res.end(); return; }
    const reader = response.body.getReader(), parts: Uint8Array[] = []; let size = 0;
    try { for (;;) { const { done, value } = await reader.read(); if (done) break; size += value.length; if (size > 24 * 1024 * 1024) throw Error('CAPACITY'); parts.push(value); } }
    finally { await reader.cancel().catch(() => {}); }
    const output = new Uint8Array(size); let offset = 0; for (const part of parts) { output.set(part, offset); offset += part.length; }
    res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(output);
  } catch { res.writeHead(503); res.end(); }
}
function readerMiddleware(req: IncomingMessage, _res: ServerResponse, next: () => void) {
  const url = new URL(req.url ?? '/', 'http://localhost');
  if ((req.method === 'GET' || req.method === 'HEAD') && accountProofRoute(url.pathname)) req.url = `/verify/index.html${url.search}`;
  next();
}
export function accountProofPublicPlugin(): Plugin {
  return {
    name: 'bankeiz-public-account-proof',
    configureServer(server) { server.middlewares.use(readerMiddleware); server.middlewares.use((req, res, next) => { void accountProofPublicMiddleware(req, res, next); }); },
    configurePreviewServer(server) { server.middlewares.use(readerMiddleware); server.middlewares.use((req, res, next) => { void accountProofPublicMiddleware(req, res, next); }); },
  };
}
