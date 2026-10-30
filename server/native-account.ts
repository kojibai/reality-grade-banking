import {relayTwinWorkspace} from './twin-workspace.js';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';
import { Readable } from 'node:stream';
import { once } from 'node:events';
import { permittedNativePath } from '../src/receiz/native-transport.js';
import { isNativeChatStreamPath, NATIVE_CHAT_STREAM_TIMEOUT_MS } from '../src/receiz/native-chat-paths.js';
import { probeNativeQualification } from './native-qualification-probe.js';
import {relayBusinessDns,dnsConnectionReturn} from './business-dns-route.js';
import {relayBusinessSetup} from './business-setup.js';
import {relayTwinUpgrade} from './twin-upgrade.js';
const PREFIX = '/api/bank/native'; const LIMIT = 32 * 1024 * 1024;
export function nativeRequestPath(path: string, method: string): string | null {
  if (!path.startsWith(PREFIX)) return null;
  const native = path.slice(PREFIX.length); return native.startsWith('/api/') && permittedNativePath(native, method) ? native : null;
}
async function bytes(stream: ReadableStream<Uint8Array> | null, max = LIMIT, signal?: AbortSignal): Promise<Buffer> {
  if (!stream) return Buffer.alloc(0);
  const reader = stream.getReader(), parts: Buffer[] = []; let length = 0;
  const stop = () => { void reader.cancel(signal?.reason).catch(() => {}); }; signal?.addEventListener('abort',stop,{once:true});
  try { signal?.throwIfAborted(); for (;;) { const {value,done} = await reader.read(); signal?.throwIfAborted(); if (done) break; length += value.length; if (length > max) throw Error('Source exceeds supported transport capacity.'); parts.push(Buffer.from(value)); } }
  finally { signal?.removeEventListener('abort',stop); await reader.cancel().catch(() => {}); }
  return Buffer.concat(parts);
}
function streamingBody(body: ReadableStream<Uint8Array>, signal: AbortSignal, abort: AbortController) {
  const reader = body.getReader(); let size = 0, stopped = false, pending: Uint8Array | undefined, offset = 0;
  let target: ReadableStreamDefaultController<Uint8Array>;
  const cleanup = () => signal.removeEventListener('abort', onAbort);
  const onAbort = () => { if (stopped) return; stopped = true; cleanup(); target.error(signal.reason); void reader.cancel(signal.reason).catch(() => {}); };
  return new ReadableStream<Uint8Array>({
    start(controller) { target = controller; signal.addEventListener('abort', onAbort, {once:true}); if (signal.aborted) onAbort(); },
    async pull(controller) {
      if (stopped) return;
      try {
        if (!pending) {
          const next = await reader.read(); if (stopped) return;
          if (next.done) { stopped = true; cleanup(); controller.close(); return; }
          size += next.value.length; if (size > LIMIT) throw Error('Source exceeds supported transport capacity.');
          pending = next.value; offset = 0;
        }
        const end = Math.min(offset + 64 * 1024, pending.length);
        controller.enqueue(pending.subarray(offset,end)); offset = end;
        if (offset === pending.length) pending = undefined;
      } catch (cause) {
        if (stopped) return; stopped = true; cleanup(); controller.error(cause); abort.abort(cause); await reader.cancel(cause).catch(() => {});
      }
    },
    async cancel(reason) { stopped = true; cleanup(); abort.abort(reason); await reader.cancel(reason).catch(() => {}); },
  });
}
function completeBody(output: Uint8Array) {
  let offset = 0;
  return new ReadableStream<Uint8Array>({pull(controller) {
    if (offset >= output.length) { controller.close(); return; }
    const end = Math.min(offset + 64 * 1024, output.length); controller.enqueue(output.subarray(offset,end)); offset = end;
  }});
}
/** Same bounded, cookie-free transport in development and production. Exact
 * message/call effects and authorization remain in the existing Receiz host. */
export async function relayNativeAccount(request: Request): Promise<Response> {
  if(new URL(request.url).pathname.startsWith(PREFIX+'/pbi/'))return(await import('./pbi-account-transport.js')).relayPbiAccount(request);
  if(new URL(request.url).pathname===PREFIX+'/twin-upgrade')return relayTwinUpgrade(request);
  const url = new URL(request.url), path = nativeRequestPath(url.pathname + url.search, request.method);
  const base = {'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
  const fail = (status: number) => Response.json({ok:false,error:'Receiz account transport is temporarily unavailable.'},{status,headers:base});
  if (!path) return fail(400);
  if (request.headers.has('origin') && request.headers.get('origin') !== url.origin) return fail(403);
  const abort = new AbortController(), streamPath = isNativeChatStreamPath(new URL(path,'https://receiz.com').pathname);
  const signal = AbortSignal.any([request.signal,abort.signal,AbortSignal.timeout(streamPath?NATIVE_CHAT_STREAM_TIMEOUT_MS:60_000)]);
  try {
    const certificateExport=path==='/api/connect/market/shares/export'||/^\/api\/connect\/market\/share-certificates\/[^/]+\/download$/.test(path),certificateImport=path==='/api/connect/market/shares/import',artifactPath=path==='/api/receiz/ownership/bearer-claim'||certificateExport,multipartPath=artifactPath&&!certificateExport||certificateImport||path==='/api/document-verify'||path==='/api/profile/me/media';
    const headers: Record<string, string> = { Accept: streamPath?'text/event-stream':artifactPath?'application/vnd.receiz.bundle+json, application/octet-stream':'application/json' };
    let multipart=false;
    const authorization = request.headers.get('authorization'); if (authorization) headers.Authorization = authorization;
    if(new URL(path,'https://receiz.com').pathname==='/api/connect/profile/showcase/publication'){
      for(const key of ['x-receiz-owner-id','x-receiz-profile-username','x-receiz-local-action-id','x-receiz-local-action-key-id','x-receiz-local-action-public-key','x-receiz-local-action-challenge','x-receiz-local-action-signature','x-receiz-local-outbox-replay']){
        const value=request.headers.get(key);if(value){if(value.length>8192)return fail(400);headers[key]=value;}
      }
    }
    let body: Buffer | undefined;
    if (['POST','PATCH','PUT'].includes(request.method) || request.method==='DELETE' && path==='/api/chat/notifications/push') {
      const contentType=request.headers.get('content-type');multipart=!!multipartPath&&typeof contentType==='string'&&/^multipart\/form-data;\s*boundary=(?:[A-Za-z0-9'()+_,.\/=:?-]{1,100}|"[A-Za-z0-9'()+_,.\/=:?-]{1,100}")$/i.test(contentType);
      if (!multipart&&!contentType?.startsWith('application/json')||multipartPath&&!multipart) return fail(415);
      headers['Content-Type'] = multipart?contentType!:'application/json'; body = await bytes(request.body,certificateImport?26*1024*1024:multipart?4*1024*1024:LIMIT,signal);
    }
    signal.throwIfAborted();
    const response = await fetch(`https://receiz.com${path}`, { method: request.method, headers, body: multipart&&body?new Uint8Array(body):body?.toString('utf8'), credentials: 'omit', redirect: 'error', signal });
    if (!response.ok && path.startsWith('/api/sdk/v1/runtime/qualify?')) {
      const requestId = response.headers.get('x-vercel-id');
      // Public transport correlation only: never log a bearer, query, body,
      // proof, response payload or arbitrary upstream diagnostic header.
      console.warn('receiz-bank native qualification', { status: response.status, requestId: requestId && /^[a-zA-Z0-9:.-]{1,160}$/.test(requestId) ? requestId : null });
    }
    const type = response.headers.get('content-type')?.split(';')[0].trim().toLowerCase();
    if (type === 'text/event-stream') {
      if (!streamPath || !response.ok || !response.body) { await response.body?.cancel(); return fail(503); }
      return new Response(streamingBody(response.body,signal,abort), {status:response.status,headers:{...base,'Cache-Control':'no-store, no-transform','Content-Type':response.headers.get('content-type')!,'X-Accel-Buffering':'no'}});
    }
    let output = await bytes(response.body,certificateExport?26*1024*1024:LIMIT,signal);
    // Older certificate projections can omit an Original's pricing operands.
    // Reuse the exact public source already shipped for that same artifact;
    // no account, quote or discovery request belongs in this public read.
    if(response.ok&&request.method==='GET'&&/^\/api\/market\/share-certificates\/[^/]+$/.test(path)){
      try{const raw=JSON.parse(new TextDecoder().decode(output)),item=raw?.ok===true?raw.state?.item:null;
        if(item&&item.livePulseSeed==null&&typeof item.id==='string'&&typeof item.assetId==='string'){
          const {assetPreviewItem}=await import('./asset-runtime/asset-preview.mjs'),held=await assetPreviewItem(item.id,{shippedOnly:true});
          if(held&&held.id===item.id&&held.assetId===item.assetId&&held.livePulseSeed){item.livePulseSeed=held.livePulseSeed;output=Buffer.from(JSON.stringify(raw),'utf8');}
        }
      }catch{/* Exact upstream certificate remains usable without display operands. */}
    }
    if (process.env.RECEIZ_BANK_QUALIFICATION_DIAGNOSTICS === '1' && response.status === 503 && path.startsWith('/api/sdk/v1/runtime/qualify?') && body) {
      const probes = await probeNativeQualification(body.toString('utf8'), authorization ?? undefined);
      for (const probe of probes) console.warn('receiz-bank native qualification probe', probe);
    }
    const responseHeaders:Record<string,string>={...base,'Content-Type':artifactPath&&response.ok?response.headers.get('content-type')??'application/octet-stream':'application/json'};
    for(const key of ['x-receiz-actor-user','x-receiz-share-certificate','x-receiz-market-item']){const value=response.headers.get(key);if(value)responseHeaders[key]=value;}
    const challenge = response.headers.get('www-authenticate'); if (challenge) responseHeaders['WWW-Authenticate'] = challenge;
    if(artifactPath&&response.ok)for(const key of ['content-disposition','x-receiz-continuity','x-receiz-owner','x-receiz-record-id','x-receiz-claim-id','x-receiz-verify-path','x-receiz-signature-version']){const value=response.headers.get(key);if(value)responseHeaders[key]=value;}
    return new Response([204,205,304].includes(response.status)?null:completeBody(output),{status:response.status,headers:responseHeaders});
  } catch { abort.abort(); return fail(503); }
}
export async function nativeAccountMiddleware(req: IncomingMessage, res: ServerResponse, next: () => void) {
  if (!req.url?.startsWith(PREFIX)&&!['/api/bank/twin-workspace','/api/bank/business/setup','/api/bank/business/dns','/api/bank/business/dns-return'].includes(req.url?.split('?')[0]??'')) { next(); return; }
  const controller = new AbortController(), abort = () => controller.abort();
  const close = () => { if (!res.writableFinished) abort(); };
  req.once('aborted',abort); res.once('close',close);
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  try {
    const host = req.headers.host ?? 'localhost', scheme = /^(localhost|127\.0\.0\.1)(:|$)/.test(host)?'http':'https';
    const body = ['POST','PATCH'].includes(req.method ?? '') || req.method==='DELETE' && req.url?.split('?')[0]===PREFIX+'/api/chat/notifications/push' ? Readable.toWeb(req) as unknown as ReadableStream<Uint8Array> : undefined;
    const request = new Request(`${scheme}://${host}${req.url}`,{method:req.method,headers:Object.fromEntries(Object.entries(req.headers).filter((entry):entry is [string,string]=>typeof entry[1]==='string')),body,signal:controller.signal,...body?{duplex:'half'}:{}});
    const response = await (new URL(request.url).pathname==='/api/bank/twin-workspace'?relayTwinWorkspace(request):new URL(request.url).pathname==='/api/bank/business/setup'?relayBusinessSetup(request):new URL(request.url).pathname==='/api/bank/business/dns'?relayBusinessDns(request):new URL(request.url).pathname==='/api/bank/business/dns-return'&&request.method==='GET'?dnsConnectionReturn(request):relayNativeAccount(request));
    res.writeHead(response.status,Object.fromEntries(response.headers));
    reader = response.body?.getReader();
    if (reader) for (;;) { const part = await reader.read(); if (part.done) break; if (!res.write(part.value)) await once(res,'drain',{signal:controller.signal}); }
    res.end();
  } catch { if (res.headersSent) res.destroy(); else { res.writeHead(503,{'Content-Type':'application/json'}); res.end(JSON.stringify({ok:false,error:'Receiz account transport is temporarily unavailable.'})); } }
  finally { await reader?.cancel().catch(()=>{}); req.removeListener('aborted',abort); res.removeListener('close',close); }
}
export function nativeAccountPlugin(): Plugin { return { name: 'receiz-native-account', configureServer(server) { server.middlewares.use((req, res, next) => { void nativeAccountMiddleware(req, res, next); }); }, configurePreviewServer(server) { server.middlewares.use((req, res, next) => { void nativeAccountMiddleware(req, res, next); }); } }; }
