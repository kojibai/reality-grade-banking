import type { IncomingMessage, ServerResponse } from 'node:http';
import { Readable } from 'node:stream';
import type { ReadableStream as NodeReadableStream } from 'node:stream/web';
import { relayNativeAccount } from './native-account.js';
import { publicMarketMiddleware } from './public-market.js';
import { publicNetworkMiddleware } from './public-network.js';
import {publicLedgerProofMiddleware} from './public-ledger-proof.js';
import { accountProofPublicMiddleware } from './account-proof-public.js';
import {handlePublicProfile} from './public-profile.js';

// One production entry reuses the same bounded transports as Vite. The
// adapter changes HTTP interfaces only; it never parses or reseals a proof.
export async function handleBankApi(request: Request): Promise<Response> {
  const url = new URL(request.url);
  if (url.pathname.startsWith('/api/bank/native')) return relayNativeAccount(request);
  if (url.pathname.startsWith('/api/bank/public-profile/')) return handlePublicProfile(request);
  const stream = request.body ? Readable.fromWeb(request.body as unknown as NodeReadableStream<Uint8Array>) : Readable.from([]);
  const req = Object.assign(stream, { url: `${url.pathname}${url.search}`, method: request.method, headers: { ...Object.fromEntries(request.headers), host: url.host } }) as IncomingMessage;
  const headers = new Headers({ 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  let status = 200, ended = false, output: Uint8Array = new Uint8Array();
  const response = {
    setHeader(name: string, value: string | number | readonly string[]) { headers.set(name, Array.isArray(value) ? value.join(', ') : String(value)); },
    writeHead(code: number, values?: Record<string, string>) { status = code; for (const [name, value] of Object.entries(values ?? {})) headers.set(name, value); },
    end(bytes?: string | Uint8Array) { output = typeof bytes === 'string' ? new TextEncoder().encode(bytes) : bytes ?? new Uint8Array(); ended = true; },
  } as unknown as ServerResponse;
  try {
    for (const middleware of [publicLedgerProofMiddleware, accountProofPublicMiddleware, publicMarketMiddleware, publicNetworkMiddleware]) {
      let next = false;
      await middleware(req, response, () => { next = true; });
      if (ended) {
        // Vercel's buffered response cap is smaller than real public graph
        // and proof sources. Stream the already-bounded complete bytes with
        // backpressure, preserving their exact content and no-store policy.
        let offset = 0;
        const body = new ReadableStream<Uint8Array>({ pull(controller) {
          if (offset >= output.length) { controller.close(); return; }
          const end = Math.min(offset + 64 * 1024, output.length);
          controller.enqueue(output.subarray(offset, end)); offset = end;
        } });
        return new Response([204, 205, 304].includes(status) ? null : body, { status, headers });
      }
      if (!next) throw new Error('BANK_API_RESPONSE_INCOMPLETE');
    }
    return Response.json({ ok: false, error: 'Bank API route not found.' }, { status: 404, headers });
  } catch {
    return Response.json({ ok: false, error: 'Bank API transport is temporarily unavailable.' }, { status: 503, headers });
  } finally { stream.destroy(); }
}
