const CACHE = 'receiz-bank-__CACHE_VERSION__';
const SHELL = __SHELL_ASSETS__;
const RESOURCES = __RESOURCE_HASHES__;
const PAGES = __PAGE_ROUTES__;
// Derived by the offline builder from the actual public renderer inputs. The
// offline version and this renderer digest are different coordinates.
const PUBLIC_RENDER_BUILD = '__PUBLIC_RENDER_BUILD__';
const PUBLIC_CACHE = 'bankeiz-public-pages-__CACHE_VERSION__';
const PUBLIC_LIMIT = 32 * 1024 * 1024;
const PUBLIC_PATHS = ['explore','ledger','ledger/proofs','explore/music','explore/images','explore/videos','explore/books','explore/essays','explore/moments','explore/collectibles','explore/documents','market-cap','feed'];
const publicRequests = new Map(), publicWrites = new Map(), publicBodies = new Map();
let publicBodyBytes = 0;
function discardPublicBody(path) {
  const previous = publicBodies.get(path); if (previous) { publicBodyBytes -= previous.blob.size; publicBodies.delete(path); }
}
function retainPublicBody(path, value) {
  discardPublicBody(path);
  publicBodies.set(path, value); publicBodyBytes += value.blob.size;
  while (publicBodies.size > 2 || publicBodyBytes > PUBLIC_LIMIT) { const key = publicBodies.keys().next().value, prior = publicBodies.get(key); publicBodies.delete(key); publicBodyBytes -= prior.blob.size; }
}
let publicSequence = 0, rootRetirement = 0;
const publicDigest = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
function publicPath(url) {
  // The native Bank entrance uses its exact installed static document.
  // Public data and proof views keep their separate prepared delivery.
  if (url.pathname === '/') return null;
  const path = url.pathname.replace(/^\//, '').replace(/\/$/, '').replace(/^explorer$/, 'explore');
  if (!PUBLIC_PATHS.includes(path)) return null;
  const keys = [...url.searchParams.keys()];
  if (keys.length && (!(path === 'ledger' || path === 'ledger/proofs') || keys.length !== 1 || keys[0] !== 'source' || !publicDigest(url.searchParams.get('source')))) return null;
  return path;
}
function publicReceipt(response) {
  const header = name => response.headers.get('x-receiz-public-' + name);
  const generation = header('material-revision'), build = header('render-build'), digest = header('html-sha256'), state = header('html-state'), selected = header('state-coordinate'), pending = header('pending-state-coordinate');
  if (response.status !== 200 || !/^text\/html(?:;|$)/i.test(response.headers.get('content-type') || '') || !publicDigest(generation) || build !== PUBLIC_RENDER_BUILD || !publicDigest(digest) || !publicDigest(selected)
    || !(state === 'current' && pending === null || state === 'retained' && publicDigest(pending) && selected !== pending)) throw Error('PUBLIC_DOCUMENT_RECEIPT_INVALID');
  return { generation, build, digest };
}
function samePublicBody(a, b) { return !!a && !!b && a.generation === b.generation && a.build === b.build && a.digest === b.digest; }
function publicHeaders(response) {
  const headers = new Headers(response.headers);
  // fetch exposes decoded bytes. Wire compression/length must not be attached
  // to the newly buffered public body or a cached body's fresh HEAD receipt.
  for (const key of ['content-encoding','content-length','transfer-encoding']) headers.delete(key);
  return headers;
}
function localHistoricalPublicBody(blob) {
  return new Response(blob, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', 'x-receiz-public-html-state': 'historical' } });
}
async function publicDocument(request, path, installedPath) {
  if (request.signal.aborted) throw request.signal.reason;
  const nativeNavigation = request.method === 'GET' && request.mode === 'navigate';
  const known = nativeNavigation && publicBodies.get(path);
  // This exact immutable Blob was already admitted in this worker. Opening
  // local historical display needs no disk read, hash or Source renewal.
  if (known) return localHistoricalPublicBody(known.blob);
  const controller = new AbortController(), abort = () => controller.abort(request.signal.reason);
  const timer = setTimeout(() => controller.abort(new DOMException('Public document delivery timed out.', 'TimeoutError')), 15000);
  request.signal.addEventListener('abort', abort, { once: true });
  let rejectAbort;
  const cancelled = new Promise((_, reject) => { rejectAbort = () => reject(controller.signal.reason); controller.signal.addEventListener('abort', rejectAbort, { once: true }); });
  const check = () => { if (controller.signal.aborted) throw controller.signal.reason; };
  const url = new URL('/api/explore', self.location.origin); url.searchParams.set('path', path); url.searchParams.set('build', PUBLIC_RENDER_BUILD);
  const source = new URL(request.url).searchParams.get('source'); if (path.startsWith('ledger') && source) url.searchParams.set('source', source);
  const key = new URL('/api/explore', self.location.origin); key.searchParams.set('path', path); key.searchParams.set('build', PUBLIC_RENDER_BUILD);
  const sequence = ++publicSequence; publicRequests.set(path, sequence);
  let historicalRoot, networkFailure = false;
  const get = async method => {
    check();
    let response;
    try { response = await fetch(new Request(url, { method, credentials: 'omit', cache: 'no-store', redirect: 'error', signal: controller.signal, headers: { accept: 'text/html' } })); }
    catch (error) { if (error?.name === 'TypeError' && !controller.signal.aborted) networkFailure = true; throw error; }
    if (controller.signal.aborted) { await response.body?.cancel(); check(); }
    if (response.type === 'opaque' || response.type === 'opaqueredirect' || response.redirected || response.url !== url.href) { await response.body?.cancel(); throw Error('PUBLIC_DOCUMENT_TRANSPORT_INVALID'); }
    try { publicReceipt(response); } catch (error) { await response.body?.cancel(); throw error; }
    return response;
  };
  const completeBody = async (response, expected) => {
    // Native fetch may retain compressed wire headers after exposing decoded
    // bytes. Only an unencoded length is a decoded-body size assertion.
    const length = response.headers.has('content-encoding') ? null : response.headers.get('content-length');
    if (length !== null && (!/^\d+$/.test(length) || Number(length) > PUBLIC_LIMIT)) { await response.body?.cancel(); throw Error('PUBLIC_DOCUMENT_CAPACITY'); }
    const reader = response.body?.getReader(); if (!reader) throw Error('PUBLIC_DOCUMENT_BODY_REQUIRED');
    const parts = []; let size = 0;
    const cancelBody = () => { void reader.cancel(controller.signal.reason).catch(() => {}); };
    controller.signal.addEventListener('abort', cancelBody, { once: true });
    try { for (;;) { check(); const chunk = await reader.read(); check(); if (chunk.done) break; size += chunk.value.byteLength; if (size > PUBLIC_LIMIT) throw Error('PUBLIC_DOCUMENT_CAPACITY'); parts.push(chunk.value); } }
    finally { controller.signal.removeEventListener('abort', cancelBody); await reader.cancel().catch(() => {}); reader.releaseLock(); }
    if (!size || length !== null && Number(length) !== size) throw Error('PUBLIC_DOCUMENT_SIZE_MISMATCH');
    const bytes = new Uint8Array(size); let offset = 0; for (const part of parts) { bytes.set(part, offset); offset += part.byteLength; }
    new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    const digest = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(value => value.toString(16).padStart(2, '0')).join(''); check();
    if (digest !== expected.digest) throw Error('PUBLIC_DOCUMENT_BODY_MISMATCH');
    return new Blob([bytes]);
  };
  const supersedeRoot = async (cache, previous) => {
    historicalRoot = undefined;
    // Local async invalidation only, not an ordering of Source generations.
    ++rootRetirement;
    // A positive new Source selection retires B before a failed C body can
    // leave B eligible for a later offline reopen. Serialize with old writes.
    // Request order cannot rank Source state. Even an older request may learn
    // that its exact B was retired, while an independently completed D stays.
    if (samePublicBody(publicBodies.get(path)?.receipt, previous)) discardPublicBody(path);
    const prior = publicWrites.get(path) || Promise.resolve();
    const writing = prior.catch(() => {}).then(async () => {
      if (samePublicBody(publicBodies.get(path)?.receipt, previous)) discardPublicBody(path);
      if (cache) {
        const cached = await cache.match(key.href); let receipt;
        try { if (cached) receipt = publicReceipt(cached); } catch { /* An invalid disk record is never historical eligibility. */ }
        if (samePublicBody(receipt, previous)) await cache.delete(key.href);
      }
    });
    publicWrites.set(path, writing);
    try { await writing; } finally { if (publicWrites.get(path) === writing) publicWrites.delete(path); }
  };
  const work = (async () => {
    // A later Root read must not restore a disk entry while its known
    // supersession is queued behind an earlier complete cache commit.
    if (path === 'bank-entry') await publicWrites.get(path)?.catch(() => {});
    check();
    let cache, cached, held = publicBodies.get(path);
    try { cache = await caches.open(PUBLIC_CACHE); if (!held) cached = await cache.match(key.href); } catch { /* An unavailable display cache does not invalidate a complete network response. */ }
    check();
    if (nativeNavigation) {
      const current = publicBodies.get(path);
      if (current) return localHistoricalPublicBody(current.blob);
      if (cached) try {
        // A restored disk body is admitted once with the same build, bounded
        // complete UTF-8 and byte digest checks. It supplies no current verdict.
        const previous = publicReceipt(cached), blob = await completeBody(cached, previous); check();
        const newer = publicBodies.get(path);
        if (newer) return localHistoricalPublicBody(newer.blob);
        if (publicRequests.get(path) === sequence) retainPublicBody(path, { blob, receipt: previous });
        return localHistoricalPublicBody(blob);
      } catch (error) {
        check();
        if (cache && publicRequests.get(path) === sequence) await cache.delete(key.href).catch(() => {});
        cached = undefined;
      }
      // Opening an installed public view needs no prepared-page renewal.
      if (installedPath && !source) return fromBuild(installedPath);
    }
    if (path === 'bank-entry') {
      // Only the private Root may retain a previously checked local display
      // while offline. Disk bytes need their one bounded integrity check
      // before a stalled HEAD can consume the delivery deadline.
      if (!held && cached) try {
        const restoringAt = rootRetirement, previous = publicReceipt(cached), blob = await completeBody(cached, previous); check();
        if (restoringAt !== rootRetirement) { held = publicBodies.get(path); cached = undefined; }
        else { held = { blob, receipt: previous }; if (publicRequests.get(path) === sequence) retainPublicBody(path, held); }
      } catch (error) { check(); if (cache && publicRequests.get(path) === sequence) await cache.delete(key.href); cached = undefined; }
      historicalRoot = held;
    }
    if (request.method === 'HEAD') {
      const response = await get('HEAD'); await response.body?.cancel(); check();
      const current = publicReceipt(response), previous = held?.receipt;
      if (path === 'bank-entry' && previous && (previous.generation !== current.generation || previous.digest !== current.digest)) await supersedeRoot(cache, previous);
      return new Response(null, { headers: publicHeaders(response) });
    }
    if (held || cached) {
      const response = await get('HEAD'); await response.body?.cancel(); check();
      let previous = held?.receipt; try { previous ||= publicReceipt(cached); } catch { /* Only this worker's verified complete response is reusable. */ }
      const current = publicReceipt(response);
      if (previous && previous.generation === current.generation && previous.build === current.build && previous.digest === current.digest) {
        try {
          // CacheStorage is not an admission marker. Verify a restored body
          // once, then retain an immutable private Blob for this worker only.
          const blob = held?.blob || await completeBody(cached, current); check();
          if (publicRequests.get(path) === sequence) retainPublicBody(path, { blob, receipt: current });
          return new Response(blob, { headers: publicHeaders(response) });
        } catch (error) { check(); if (cache && publicRequests.get(path) === sequence) await cache.delete(key.href).catch(() => {}); }
      }
      if (path === 'bank-entry' && previous && (previous.generation !== current.generation || previous.digest !== current.digest)) await supersedeRoot(cache, previous);
    }
    const response = await get('GET'), expected = publicReceipt(response), blob = await completeBody(response, expected);
    const result = new Response(blob, { headers: publicHeaders(response) });
    if (cache) {
      // Serialize only CacheStorage commits for this visited path. A delayed
      // earlier request cannot replace a later request's completed display.
      const prior = publicWrites.get(path) || Promise.resolve();
      const writing = prior.catch(() => {}).then(async () => {
        check(); if (publicRequests.get(path) !== sequence) return;
        try { await cache.put(key.href, result.clone()); } catch { /* The verified immutable body can still be held locally. */ }
        if (controller.signal.aborted && publicRequests.get(path) === sequence) await cache.delete(key.href);
        check(); if (publicRequests.get(path) === sequence) retainPublicBody(path, { blob, receipt: expected });
      });
      publicWrites.set(path, writing);
      try { await writing; } catch (error) { check(); /* Display persistence failure cannot turn a verified body into Source authority. */ }
      finally { if (publicWrites.get(path) === writing) publicWrites.delete(path); }
    } else if (publicRequests.get(path) === sequence) { check(); retainPublicBody(path, { blob, receipt: expected }); }
    check(); return result;
  })();
  try { return await Promise.race([work, cancelled]); }
  catch (error) {
    if (request.signal.aborted) throw request.signal.reason;
    if (path === 'bank-entry' && historicalRoot && samePublicBody(historicalRoot.receipt, publicBodies.get(path)?.receipt) && (networkFailure || controller.signal.aborted && controller.signal.reason?.name === 'TimeoutError')) {
      // This is local historical display, never Source currentness or a
      // public republication. HTTP503 can mean privacy/proof denial and is
      // deliberately excluded. Keep every old qualification header out.
      return new Response(request.method === 'HEAD' ? null : historicalRoot.blob, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', 'x-receiz-public-html-state': 'historical' } });
    }
    // Source503 is NOT retention permission. This exact installed document is
    // a historical offline closure, with no manufactured currentness receipt.
    const response = installedPath ? await fromBuild(installedPath) : new Response('Public document unavailable.', { status: 503, headers: { 'cache-control': 'no-store' } });
    if (request.signal.aborted) throw request.signal.reason;
    return request.method === 'HEAD' ? new Response(null, { status: response.status, headers: response.headers }) : response;
  } finally { clearTimeout(timer); request.signal.removeEventListener('abort', abort); controller.signal.removeEventListener('abort', rejectAbort); }
}

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
// A new document navigation may open the current deployment's HTML. Installed
// SDK/assets remain in their exact immutable cache; online HTML never replaces
// that custody. This is one ordinary document GET, with no Source probe.
async function navigationDocument(request, installedPath) {
  if (request.signal.aborted) throw request.signal.reason;
  const controller = new AbortController(), abort = () => controller.abort(request.signal.reason);
  const timer = setTimeout(() => controller.abort(), 1500);
  request.signal.addEventListener('abort', abort, { once: true });
  let rejectAbort;
  const cancelled = new Promise((_, reject) => { rejectAbort = () => reject(controller.signal.reason); controller.signal.addEventListener('abort', rejectAbort, { once: true }); });
  try {
    const response = await Promise.race([fetch(new Request(request, { cache: 'no-store', signal: controller.signal })), cancelled]);
    if (controller.signal.aborted || !response.ok || !/^text\/html(?:;|$)/i.test(response.headers.get('content-type') || '') || response.url && new URL(response.url).origin !== self.location.origin) {
      void response.body?.cancel().catch(() => {}); throw Error('NAVIGATION_DOCUMENT_UNAVAILABLE');
    }
    return response;
  } catch (error) {
    if (request.signal.aborted) throw request.signal.reason;
    return fromBuild(installedPath);
  } finally {
    clearTimeout(timer); request.signal.removeEventListener('abort', abort); controller.signal.removeEventListener('abort', rejectAbort);
  }
}
self.addEventListener('install', event => { event.waitUntil(install()); });
self.addEventListener('activate', event => { event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('receiz-bank-') && key !== CACHE || key.startsWith('bankeiz-public-pages-') && key !== PUBLIC_CACHE).map(key => caches.delete(key))))); });
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
  if (!['GET','HEAD'].includes(event.request.method) || url.origin !== self.location.origin || url.pathname === '/api' || url.pathname.startsWith('/api/')) return;
  const publicPage = publicDigest(PUBLIC_RENDER_BUILD) && publicPath(url);
  if (publicPage) { event.respondWith(publicDocument(event.request, publicPage, PAGES[url.pathname])); return; }
  if (event.request.method !== 'GET') return;
  const page = event.request.mode === 'navigate' && (PAGES[url.pathname] || (/^\/vault\/[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}\/?$/i.test(url.pathname) && (PAGES['/vault/index.html'] || PAGES['/'])) || (/^\/pay\/[a-z0-9_]{3,24}\/?$/.test(url.pathname) && PAGES['/pay/checkout.html']) || (/^\/verify\/[a-f0-9]{64}\/?$/.test(url.pathname) && PAGES['/verify/']) || (/^\/asset\/[^/]+\/?$/.test(url.pathname) && PAGES['/explore/']));
  const nativeBuild = (url.pathname.startsWith('/native/') || url.pathname === '/proof-verifier/v129/verifier.js') && url.searchParams.size === 1 && url.searchParams.get('build') === RESOURCES[url.pathname]?.sha256;
  const path = page || (RESOURCES[url.pathname + url.search] ? url.pathname + url.search : nativeBuild ? url.pathname : undefined);
  const heldEntry = url.pathname === '/' || url.pathname === '/index.html' || url.pathname.startsWith('/vault/') || url.pathname.startsWith('/discover/');
  if (path) event.respondWith(page && !heldEntry ? navigationDocument(event.request, path) : fromBuild(path));
});
