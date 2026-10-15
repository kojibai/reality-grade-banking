import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
function dispatch(request: Request): Promise<Response> | undefined {
  const handlers: Record<string, (event: { request: Request; respondWith: (response: Promise<Response>) => void }) => void> = {};
  let result: Promise<Response> | undefined;
  const source = readFileSync('src/pwa/sw.template.js', 'utf8').replace('__CACHE_VERSION__', 'test').replace('__SHELL_ASSETS__', JSON.stringify(['/index.html', '/assets/app.js']));
  const cache = { match: async (_request: unknown, options?: { ignoreVary?: boolean }) => options?.ignoreVary ? new Response('export const bank = true;', { headers: { 'content-type': 'application/javascript', vary: 'Origin' } }) : undefined };
  runInNewContext(source, { self: { location: { origin: 'http://localhost' }, addEventListener: (name: string, handler: typeof handlers[string]) => { handlers[name] = handler; } }, URL, Response, caches: cache, fetch: async () => { throw new Error('Offline'); } });
  handlers.fetch({ request, respondWith: response => { result = response; } });
  return result;
}
it('restores immutable app scripts offline despite Vary Origin on cached responses', async () => { const response = await dispatch(new Request('http://localhost/assets/app.js', { headers: { Origin: 'http://localhost' } })); expect(await response?.text()).toBe('export const bank = true;'); });
it('never responds from the app cache for financial API calls', () => expect(dispatch(new Request('http://localhost/api/wallet/me'))).toBeUndefined());
it.each(['/notes/banknote-engraving.webp', '/notes/denomination-engraving.png', '/notes/fonts/Cinzel.ttf', '/native/offline-notes.v129.mjs'])('retains note presentation and runtime assets for offline reuse: %s', async path => { expect(await (await dispatch(new Request(`http://localhost${path}`)))?.text()).toBe('export const bank = true;'); });
it('keeps an open old client able to load its verifier offline while an update waits', async () => {
  const stores = new Map<string, Map<string, Response>>();
  const caches = {
    open: async (name: string) => { if (!stores.has(name)) stores.set(name, new Map()); const store = stores.get(name)!; return { addAll: async (urls: string[]) => { urls.forEach(url => store.set(`http://localhost${url}`, new Response(`cached:${url}`))); }, put: async (request: Request, response: Response) => { store.set(request.url, response); } }; },
    keys: async () => [...stores.keys()], delete: async (name: string) => stores.delete(name),
    match: async (request: Request | string) => { const url = typeof request === 'string' ? `http://localhost${request}` : request.url; for (const store of stores.values()) { const response = store.get(url); if (response) return response.clone(); } },
  };
  function worker(version: string) {
    const handlers: Record<string, (event: { waitUntil?: (work: Promise<unknown>) => void; request?: Request; respondWith?: (work: Promise<Response>) => void }) => void> = {}; let immediate = false;
    const source = readFileSync('src/pwa/sw.template.js', 'utf8').replace('__CACHE_VERSION__', version).replace('__SHELL_ASSETS__', JSON.stringify(['/index.html', `/assets/sdk-${version}.js`]));
    runInNewContext(source, { URL, Response, caches, fetch: async () => { throw new Error('Offline'); }, self: { location: { origin: 'http://localhost' }, addEventListener: (name: string, handler: typeof handlers[string]) => { handlers[name] = handler; }, skipWaiting: () => { immediate = true; }, clients: { claim: async () => undefined } } });
    return { handlers, immediate: () => immediate };
  }
  const old = worker('A'); let install: Promise<unknown> | undefined; old.handlers.install({ waitUntil: work => { install = work; } }); await install;
  const update = worker('B'); update.handlers.install({ waitUntil: work => { install = work; } }); await install;
  if (update.immediate()) { update.handlers.activate({ waitUntil: work => { install = work; } }); await install; }
  expect(update.immediate()).toBe(false);
  let loaded: Promise<Response> | undefined;
  old.handlers.fetch({ request: new Request('http://localhost/assets/sdk-A.js'), respondWith: work => { loaded = work; } });
  expect(await (await loaded)?.text()).toBe('cached:/assets/sdk-A.js');
});
