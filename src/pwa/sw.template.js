const CACHE = 'receiz-bank-__CACHE_VERSION__';
const SHELL = __SHELL_ASSETS__;
self.addEventListener('install', event => { event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL))); });
self.addEventListener('activate', event => { event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('receiz-bank-') && key !== CACHE).map(key => caches.delete(key))))); });
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).catch(() => caches.match('/index.html', { ignoreVary: true })));
  } else if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/notes/') || url.pathname.startsWith('/native/') || SHELL.includes(url.pathname + url.search) || SHELL.includes(url.pathname)) {
    event.respondWith(caches.match(event.request, { ignoreVary: true }).then(cached => cached || fetch(event.request).then(response => { if (response.ok) { const saved = response.clone(); void caches.open(CACHE).then(cache => cache.put(event.request, saved)); } return response; })));
  }
});
