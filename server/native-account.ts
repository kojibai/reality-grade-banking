import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';
import { permittedNativePath } from '../src/receiz/native-transport';
import { probeNativeQualification } from './native-qualification-probe';
const PREFIX = '/api/bank/native'; const LIMIT = 32 * 1024 * 1024;
export function nativeRequestPath(path: string, method: string): string | null {
  if (!path.startsWith(PREFIX)) return null;
  const native = path.slice(PREFIX.length); return native.startsWith('/api/') && permittedNativePath(native, method) ? native : null;
}
async function bytes(stream: AsyncIterable<Uint8Array>, max = LIMIT): Promise<Buffer> { let length = 0; const parts: Buffer[] = []; for await (const chunk of stream) { length += chunk.length; if (length > max) throw new Error('Source exceeds supported transport capacity.'); parts.push(Buffer.from(chunk)); } return Buffer.concat(parts); }
export async function nativeAccountMiddleware(req: IncomingMessage, res: ServerResponse, next: () => void) {
  if (!req.url?.startsWith(PREFIX)) { next(); return; }
  res.setHeader('Cache-Control', 'no-store'); res.setHeader('X-Content-Type-Options', 'nosniff');
  const path = nativeRequestPath(req.url, req.method ?? '');
  if (!path) { res.writeHead(400); res.end(); return; }
  if (req.headers.origin && !['http', 'https'].some(protocol => req.headers.origin === `${protocol}://${req.headers.host}`)) { res.writeHead(403); res.end(); return; }
  try {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (req.headers.authorization) headers.Authorization = req.headers.authorization;
    let body: Buffer | undefined;
    if (req.method === 'POST') {
      if (!req.headers['content-type']?.startsWith('application/json')) { res.writeHead(415); res.end(); return; }
      headers['Content-Type'] = 'application/json'; body = await bytes(req);
    }
    const response = await fetch(`https://receiz.com${path}`, { method: req.method, headers, body: body?.toString('utf8'), credentials: 'omit', redirect: 'error', signal: AbortSignal.timeout(60_000) });
    if (!response.ok && path.startsWith('/api/sdk/v1/runtime/qualify?')) {
      const requestId = response.headers.get('x-vercel-id');
      // Public transport correlation only: never log a bearer, query, body,
      // proof, response payload or arbitrary upstream diagnostic header.
      console.warn('receiz-bank native qualification', { status: response.status, requestId: requestId && /^[a-zA-Z0-9:.-]{1,160}$/.test(requestId) ? requestId : null });
    }
    const output = response.body ? await bytes(response.body as unknown as AsyncIterable<Uint8Array>) : Buffer.alloc(0);
    if (process.env.RECEIZ_BANK_QUALIFICATION_DIAGNOSTICS === '1' && response.status === 503 && path.startsWith('/api/sdk/v1/runtime/qualify?') && body) {
      const probes = await probeNativeQualification(body.toString('utf8'), req.headers.authorization);
      for (const probe of probes) console.warn('receiz-bank native qualification probe', probe);
    }
    res.writeHead(response.status, { 'Content-Type': 'application/json' }); res.end(output);
  } catch { res.writeHead(503, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ ok: false, error: 'Receiz account transport is temporarily unavailable.' })); }
}
export function nativeAccountPlugin(): Plugin { return { name: 'receiz-native-account', configureServer(server) { server.middlewares.use((req, res, next) => { void nativeAccountMiddleware(req, res, next); }); }, configurePreviewServer(server) { server.middlewares.use((req, res, next) => { void nativeAccountMiddleware(req, res, next); }); } }; }
