import { expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash, webcrypto } from 'node:crypto';
import { runInNewContext } from 'node:vm';

const origin = 'http://localhost';
const digest = (value: string) => createHash('sha256').update(value).digest('hex');
type Event = { request?: Request; data?: unknown; ports?: { postMessage(value: unknown): void }[]; source?: { url: string }; waitUntil?(work: Promise<unknown>): void; respondWith?(work: Promise<Response>): void };
function environment() {
  const stores = new Map<string, Map<string, Response>>(), network = new Map<string, string | Response | ((request: Request) => Promise<Response>)>(), requests: string[] = [], fetchRequests: Request[] = [];
  let offline = false;
  const url = (request: Request | string) => new URL(typeof request === 'string' ? request : request.url, origin).href;
  const fetch = async (request: Request | string) => {
    const key = url(request); requests.push(key);
    const actual = typeof request === 'string' ? new Request(key) : request; fetchRequests.push(actual);
    if (offline || !network.has(key)) throw Error('Offline');
    const value = network.get(key)!;
    if (value instanceof Response) { const response = value.clone(); if (value.url) Object.defineProperty(response, 'url', { value: value.url }); return response; }
    if (typeof value === 'function') return value(actual);
    return new Response(value, { headers: { 'content-type': new URL(key).pathname.includes('.html') || new URL(key).pathname.endsWith('/') ? 'text/html' : 'application/javascript', vary: 'Origin' } });
  };
  const open = async (name: string) => {
    if (!stores.has(name)) stores.set(name, new Map()); const store = stores.get(name)!;
    return {
      match: async (request: Request | string) => store.get(url(request))?.clone(),
      put: async (request: Request | string, response: Response) => { store.set(url(request), response.clone()); },
      addAll: async (urls: string[]) => { for (const path of urls) store.set(url(path), await fetch(path)); },
      keys: async () => [...store.keys()].map(key => new Request(key)),
    };
  };
  const caches = { open, keys: async () => [...stores.keys()], delete: async (name: string) => stores.delete(name), match: async (request: Request | string) => { for (const store of stores.values()) { const result = store.get(url(request)); if (result) return result.clone(); } } };
  function worker(version: string, values: Record<string, string>) {
    for (const [path, value] of Object.entries(values)) network.set(url(path), value);
    const handlers: Record<string, (event: Event) => void> = {}; let forced = false;
    const metadata = Object.fromEntries(Object.entries(values).map(([path, value]) => [path, { sha256: digest(value), bytes: Buffer.byteLength(value) }]));
    const source = readFileSync('src/pwa/sw.template.js', 'utf8').replaceAll('__CACHE_VERSION__', version)
      .replace('__SHELL_ASSETS__', JSON.stringify(Object.keys(values))).replace('__RESOURCE_HASHES__', JSON.stringify(metadata))
      .replace('__PAGE_ROUTES__', JSON.stringify({ '/': '/index.html', '/index.html': '/index.html', '/learn/': '/learn/' }));
    runInNewContext(source, { URL, Request, Response, AbortController, setTimeout, clearTimeout, TextEncoder, Uint8Array, crypto: webcrypto, caches, fetch,
      self: { location: { origin }, addEventListener: (name: string, handler: typeof handlers[string]) => { handlers[name] = handler; }, skipWaiting: () => { forced = true; }, clients: { claim: async () => { forced = true; } } } });
    const lifetime = async (name: string) => { let result: Promise<unknown> | undefined; handlers[name]({ waitUntil: work => { result = work; } }); await result; };
    const load = async (path: string, navigate = false, method = 'GET') => {
      let result: Promise<Response> | undefined; const pending: Promise<unknown>[] = [];
      const request = new Request(url(path), { method, headers: { Origin: origin } });
      if (navigate) Object.defineProperty(request, 'mode', { value: 'navigate' });
      handlers.fetch({ request, respondWith: work => { result = work; }, waitUntil: work => { pending.push(work); } });
      const response = await result; await Promise.all(pending); return response;
    };
    const status = async () => {
      let result: unknown, work: Promise<unknown> | undefined;
      handlers.message?.({ data: { type: 'BANK_OFFLINE_STATUS', version: 1 }, source: { url: origin + '/' }, ports: [{ postMessage: value => { result = value; } }], waitUntil: value => { work = value; } });
      await work; return result;
    };
    return { install: () => lifetime('install'), activate: () => lifetime('activate'), load, status, forced: () => forced };
  }
  return { worker, stores, requests, fetchRequests, network, offline: () => { offline = true; } };
}
const resources = (version: string) => ({ '/index.html': `<html>Bank ${version}</html>`, '/learn/': `<html>Learn ${version}</html>`, '/assets/app.js': `app:${version}`, '/native/offline-notes.v129.mjs': `native:${version}`, '/notes/banknote-engraving.webp': `art:${version}` });

it('restores the complete current Bank runtime and artwork offline', async () => {
  const env = environment(), worker = env.worker('A', resources('A')); await worker.install(); env.offline();
  for (const [path, expected] of Object.entries(resources('A'))) expect(await (await worker.load(path))?.text()).toBe(expected);
});
it('opens the requested guide offline instead of replacing it with the account entrance', async () => {
  const env = environment(), worker = env.worker('A', resources('A')); await worker.install(); env.offline();
  expect(await (await worker.load('/learn/?from=bank', true))?.text()).toBe('<html>Learn A</html>');
});
it('opens the exact installed Bank entrance without a network wait while the controlling build keeps its held assets', async () => {
  const env = environment(), old = env.worker('A', resources('A')); await old.install();
  const next = env.worker('B', resources('B')); await next.install();
  env.network.set(origin + '/', '<html>Bank B</html>');
  const before=env.requests.length;expect(await (await old.load('/', true))?.text()).toBe('<html>Bank A</html>');expect(env.requests).toHaveLength(before);
  expect(await (await old.load('/native/offline-notes.v129.mjs'))?.text()).toBe('native:A');
  expect(await old.load('/native/offline-notes.v129.mjs?build=' + digest('native:B'))).toBeUndefined();
  expect(await env.stores.get('receiz-bank-A')!.get(origin + '/index.html')!.clone().text()).toBe('<html>Bank A</html>');
  expect(old.forced()).toBe(false); expect(next.forced()).toBe(false);
  env.offline(); expect(await (await old.load('/', true))?.text()).toBe('<html>Bank A</html>');
});
it('preserves the requested navigation path, query and credentials while bypassing the browser HTTP cache', async () => {
  const env = environment(), worker = env.worker('A', resources('A')); await worker.install();
  const requested = '/learn/?from=bank&mode=current'; env.network.set(origin + requested, '<html>Current guide</html>');
  expect(await (await worker.load(requested, true))?.text()).toBe('<html>Current guide</html>');
  const sent = env.fetchRequests.at(-1)!;
  expect(sent.url).toBe(origin + requested); expect(sent.cache).toBe('no-store');
  expect(sent.credentials).toBe('same-origin'); expect(sent.headers.get('Origin')).toBe(origin);
});
it.each([
  ['server failure', new Response('Unavailable', { status: 503, headers: { 'content-type': 'text/html' } })],
  ['non-document response', new Response('{}', { headers: { 'content-type': 'application/json' } })],
  ['foreign redirected document', Object.defineProperty(new Response('<html>Foreign</html>', { headers: { 'content-type': 'text/html' } }), 'url', { value: 'https://unrelated.invalid/' })],
])('retains installed HTML on %s without saving the failed update into its cache', async (_label, response) => {
  const env = environment(), worker = env.worker('A', resources('A')); await worker.install();
  env.network.set(origin + '/learn/', response);
  expect(await (await worker.load('/learn/', true))?.text()).toBe('<html>Learn A</html>');
  expect(env.fetchRequests.at(-1)!.url).toBe(origin + '/learn/');
  expect(await env.stores.get('receiz-bank-A')!.get(origin + '/index.html')!.clone().text()).toBe('<html>Bank A</html>');
});
it('aborts stalled navigation headers after1500ms and keeps the installed document usable', async () => {
  vi.useFakeTimers();
  try {
    const env = environment(), worker = env.worker('A', resources('A')); await worker.install();
    let signal: AbortSignal | undefined;
    env.network.set(origin + '/learn/', request => new Promise<Response>((_resolve, reject) => {
      signal = request.signal; signal.addEventListener('abort', () => reject(signal!.reason), { once: true });
    }));
    const pending = worker.load('/learn/', true);
    await vi.advanceTimersByTimeAsync(1500);
    expect(await (await pending)?.text()).toBe('<html>Learn A</html>');
    expect(signal?.aborted).toBe(true); expect(worker.forced()).toBe(false);
  } finally { vi.useRealTimers(); }
});
it('does not read another build or an unrelated application cache', async () => {
  const env = environment(), old = env.worker('A', resources('A')); await old.install();
  const next = env.worker('B', resources('B')); await next.install(); env.offline();
  expect(await (await next.load('/assets/app.js'))?.text()).toBe('app:B');
});
it('reuses the cached native bytes only for the exact compiled build query', async () => {
  const env = environment(), worker = env.worker('A', resources('A')); await worker.install(); env.offline();
  expect(await (await worker.load('/native/offline-notes.v129.mjs?build=' + digest('native:A')))?.text()).toBe('native:A');
  expect(await worker.load('/native/offline-notes.v129.mjs?build=' + digest('native:B'))).toBeUndefined();
});
it('refuses mismatched static bytes without leaving a partial install or removing the current build', async () => {
  const env = environment(), old = env.worker('A', resources('A')); await old.install();
  const next = env.worker('B', resources('B')); env.network.set(origin + '/assets/app.js', 'wrong deployment');
  await expect(next.install()).rejects.toThrow();
  expect([...env.stores.keys()]).toEqual(['receiz-bank-A']);
  env.offline(); expect(await (await old.load('/assets/app.js'))?.text()).toBe('app:A');
});
it('reports missing cached resources instead of equating worker activation with readiness', async () => {
  const env = environment(), worker = env.worker('A', resources('A')); await worker.install();
  expect(await worker.status()).toMatchObject({ schema: 'bankeiz.offline-status.v1', build: 'A', ready: true, cached: 5, required: 5 });
  env.stores.get('receiz-bank-A')!.delete(origin + '/native/offline-notes.v129.mjs');
  expect(await worker.status()).toMatchObject({ ready: false, cached: 4, required: 5 });
});
it('cleans up old app caches only on normal activation and leaves unrelated caches intact', async () => {
  const env = environment(), old = env.worker('A', resources('A')); await old.install();
  env.stores.set('other-application', new Map()); const next = env.worker('B', resources('B')); await next.install();
  expect(env.stores.has('receiz-bank-A')).toBe(true); await next.activate();
  expect([...env.stores.keys()].sort()).toEqual(['other-application', 'receiz-bank-B']);
});
it.each(['/api/bank/native/fund', '/api/wallet/me', 'https://receiz.com/api/bank/notes'])('never caches or replays financial/private requests: %s', async path => {
  const env = environment(), worker = env.worker('A', resources('A')); await worker.install();
  const before = env.requests.length;
  expect(await worker.load(path)).toBeUndefined(); expect(await worker.load(path, false, 'POST')).toBeUndefined();
  expect(env.requests).toHaveLength(before);
});
