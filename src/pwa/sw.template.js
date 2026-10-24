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
  if (event.data?.type === 'BANK_PUSH_BIND' && event.data.version === 1 && event.source?.url && new URL(event.source.url).origin === self.location.origin) {
    if (event.data.accountUid !== null && !pushUuid(event.data.accountUid)) return;
    event.waitUntil((async () => {
      const store = await caches.open('bankeiz-notification-preferences-v1');
      await store.put('/notification-account', Response.json({accountUid:event.data.accountUid}));
      event.ports?.[0]?.postMessage({ready:true});
    })());
    return;
  }
  if (event.data?.type === 'BANK_PUSH_STATUS' && event.source?.url && new URL(event.source.url).origin === self.location.origin) {
    event.ports?.[0]?.postMessage({ready:true,version:1}); return;
  }
  if (event.data?.type !== 'BANK_OFFLINE_STATUS' || event.data.version !== 1 || !event.ports[0] || !event.source?.url || new URL(event.source.url).origin !== self.location.origin) return;
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE), found = await Promise.all(SHELL.map(path => cache.match(path, { ignoreVary: true })));
    const cached = found.filter(Boolean).length;
    event.ports[0].postMessage({ schema: 'bankeiz.offline-status.v1', build: CACHE.slice('receiz-bank-'.length), ready: cached === SHELL.length, required: SHELL.length, cached });
  })());
});

// Notification preferences contain only a local account selector, never tokens,
// message bodies, proof, custody or payment state. Push is a delivery hint; the
// authenticated conversation/call route remains authoritative when opened.
const pushUuid = value => typeof value === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value);
async function pushOwner() {
  try { return (await (await (await caches.open('bankeiz-notification-preferences-v1')).match('/notification-account'))?.json())?.accountUid ?? null; } catch { return null; }
}
function pushTarget(value, owner) {
  if (!value || value.version !== 1 || value.source !== 'receiz.chat' || !['message','call'].includes(value.kind) || !pushUuid(value.conversationId) || !pushUuid(value.recipientUserId) || value.recipientUserId !== owner) return null;
  const target = {conversationId:value.conversationId,recipientUserId:value.recipientUserId};
  if (value.kind === 'call' && pushUuid(value.callId) && ['voice','video'].includes(value.mode) && Number.isFinite(value.timestamp) && Date.now()-value.timestamp < 120000 && value.timestamp <= Date.now()+30000) Object.assign(target,{callId:value.callId,mode:value.mode});
  return target;
}
const pushText = (value,limit) => typeof value === 'string' ? value.replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,limit) : '';
self.addEventListener('push', event => {
  event.waitUntil((async () => {
    let value; try { value = event.data?.json(); } catch { /* Show a generic visible alert for invalid payloads. */ }
    const target = pushTarget(value,await pushOwner()), incoming = !!target?.callId;
    const missed = target && value.kind === 'call' && !incoming;
    await self.registration.showNotification(target ? missed ? 'Missed call' : pushText(value.title,100) || (incoming ? 'Incoming call' : 'New message') : 'Bankeiz', {
      body:target ? missed ? 'Open your conversation to call back.' : pushText(value.body,240) || 'Open Bankeiz to view.' : 'Open Bankeiz to view your notifications.',
      icon:'/icon-192.png',badge:'/icon-192.png',tag:target ? 'bank-'+(incoming ? 'call-'+target.callId : 'message-'+target.conversationId) : 'bank-activity',
      requireInteraction:incoming,renotify:incoming,
      actions:incoming ? [{action:'open',title:'View call'},{action:'dismiss',title:'Dismiss'}] : [{action:'open',title:'Open'}],
      data:target ? {version:1,source:'receiz.chat',kind:incoming?'call':'message',timestamp:Date.now(),...target} : null,
    });
  })());
});
self.addEventListener('notificationclick', event => {
  event.notification.close(); if (event.action === 'dismiss') return;
  event.waitUntil((async () => {
    const target = pushTarget(event.notification.data,await pushOwner());
    const params = new URLSearchParams(target ? {bankNotification:'1',conversation:target.conversationId,recipient:target.recipientUserId,...(target.callId?{call:target.callId,mode:target.mode}:{})} : {});
    const url = new URL('/'+(params.size?'?'+params:'')+'#account/messages',self.location.origin);
    const windows = await self.clients.matchAll({type:'window',includeUncontrolled:true});
    const current = windows.find(client => { try { const url=new URL(client.url);return url.origin===self.location.origin && url.pathname==='/'; } catch { return false; } });
    if (current) { current.postMessage({type:'BANK_NOTIFICATION_OPEN',target});await current.focus();return; }
    await self.clients.openWindow(url.href);
  })());
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || url.pathname === '/api' || url.pathname.startsWith('/api/')) return;
  const page = event.request.mode === 'navigate' && (PAGES[url.pathname] || (/^\/vault\/[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}\/?$/i.test(url.pathname) && (PAGES['/vault/index.html'] || PAGES['/'])) || (/^\/pay\/[a-z0-9_]{3,24}\/?$/.test(url.pathname) && PAGES['/pay/index.html']) || (/^\/verify\/[a-f0-9]{64}\/?$/.test(url.pathname) && PAGES['/verify/']) || (/^\/asset\/[^/]+\/?$/.test(url.pathname) && PAGES['/explore/']));
  const nativeBuild = (url.pathname.startsWith('/native/') || url.pathname === '/proof-verifier/v129/verifier.js') && url.searchParams.size === 1 && url.searchParams.get('build') === RESOURCES[url.pathname]?.sha256;
  const path = page || (RESOURCES[url.pathname + url.search] ? url.pathname + url.search : nativeBuild ? url.pathname : undefined);
  if (path) event.respondWith(fromBuild(path));
});
