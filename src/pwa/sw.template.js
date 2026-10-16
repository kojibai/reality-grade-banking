const CACHE = 'receiz-bank-__CACHE_VERSION__';
const SHELL = __SHELL_ASSETS__;
const RESOURCES = __RESOURCE_HASHES__;
const PAGES = __PAGE_ROUTES__;

async function verifiedFetch(path) {
  const expected = RESOURCES[path];
  const response = await fetch(new Request(new URL(path, self.location.origin), { cache: 'reload', credentials: 'omit', redirect: 'error' }));
  if (!response.ok || response.type === 'opaque') throw Error('OFFLINE_RESOURCE_UNAVAILABLE');
  const bytes = await response.clone().arrayBuffer();
  if (bytes.byteLength !== expected.bytes) throw Error('OFFLINE_RESOURCE_SIZE_MISMATCH');
  const digest = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(value => value.toString(16).padStart(2, '0')).join('');
  if (digest !== expected.sha256) throw Error('OFFLINE_RESOURCE_BUILD_MISMATCH');
  return response;
}
async function install() {
  const cache = await caches.open(CACHE);
  try {
    // Bounded background work, independent of the account's first paint.
    let cursor = 0;
    const outcomes = await Promise.allSettled(Array.from({ length: Math.min(4, SHELL.length) }, async () => {
      while (cursor < SHELL.length) { const path = SHELL[cursor++]; await cache.put(path, await verifiedFetch(path)); }
    }));
    const failed = outcomes.find(result => result.status === 'rejected'); if (failed) throw failed.reason;
  } catch (cause) { await caches.delete(CACHE); throw cause; }
}
async function fromBuild(path) {
  const cache = await caches.open(CACHE), cached = await cache.match(path, { ignoreVary: true });
  if (cached) return cached;
  // An evicted entry may be restored only from this exact build. A newer
  // deployment cannot silently replace the runtime beneath an open account.
  const response = await verifiedFetch(path); await cache.put(path, response.clone()); return response;
}
self.addEventListener('install', event => { event.waitUntil(install()); });
self.addEventListener('activate', event => { event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('receiz-bank-') && key !== CACHE).map(key => caches.delete(key))))); });
self.addEventListener('message', event => {
  if (event.data?.type !== 'BANK_OFFLINE_STATUS' || event.data.version !== 1 || !event.ports[0] || !event.source?.url || new URL(event.source.url).origin !== self.location.origin) return;
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE), found = await Promise.all(SHELL.map(path => cache.match(path, { ignoreVary: true })));
    const cached = found.filter(Boolean).length;
    event.ports[0].postMessage({ schema: 'bankeiz.offline-status.v1', build: CACHE.slice('receiz-bank-'.length), ready: cached === SHELL.length, required: SHELL.length, cached });
  })());
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || url.pathname === '/api' || url.pathname.startsWith('/api/')) return;
  const page = event.request.mode === 'navigate' && PAGES[url.pathname];
  const nativeBuild = url.pathname.startsWith('/native/') && url.searchParams.size === 1 && url.searchParams.get('build') === RESOURCES[url.pathname]?.sha256;
  const path = page || (RESOURCES[url.pathname + url.search] ? url.pathname + url.search : nativeBuild ? url.pathname : undefined);
  if (path) event.respondWith(fromBuild(path));
});
