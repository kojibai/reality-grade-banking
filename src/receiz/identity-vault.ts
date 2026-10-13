import { BANK_APPLICATION_ID } from './config';
export interface ProtectedIdentityTransport { bytes: Uint8Array; phrase: string; }
interface SavedIdentity { schema: 'receiz.bank.device-identity.v1'; bytes: ArrayBuffer; artifactIv?: Uint8Array; filename: string; wrappingKey: CryptoKey; iv: Uint8Array; wrappedPhrase: ArrayBuffer; readConsent: boolean; protectedTransport?: { iv: Uint8Array; bytes: ArrayBuffer }; cardOperation?: { operationId: string; iv: Uint8Array; bytes: ArrayBuffer }; }
async function identityBytes(saved: SavedIdentity): Promise<Uint8Array> { return saved.artifactIv ? new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: new Uint8Array(saved.artifactIv), additionalData: new TextEncoder().encode('receiz.bank.private-identity-source.v1') }, saved.wrappingKey, saved.bytes)) : new Uint8Array(saved.bytes); }
async function database(): Promise<IDBDatabase> { return new Promise((resolve, reject) => { const request = indexedDB.open('receiz-bank-private-custody', 2); request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains('identity')) request.result.createObjectStore('identity'); if (!request.result.objectStoreNames.contains('sources')) request.result.createObjectStore('sources'); }; request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); }); }
async function held(): Promise<SavedIdentity | null> { const db = await database(); try { return await new Promise((resolve, reject) => { const request = db.transaction('identity').objectStore('identity').get('current'); request.onsuccess = () => resolve(request.result ?? null); request.onerror = () => reject(request.error); }); } finally { db.close(); } }
export async function saveDeviceIdentity(bytes: Uint8Array, filename: string, phrase: string, readConsent: boolean, protectedTransport?: ProtectedIdentityTransport) {
  const wrappingKey = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  const iv = crypto.getRandomValues(new Uint8Array(12)); const aad = new TextEncoder().encode('receiz.bank.device-identity.v1');
  const wrappedPhrase = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: aad }, wrappingKey, new TextEncoder().encode(phrase));
  const artifactIv = crypto.getRandomValues(new Uint8Array(12)), encryptedSource = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: artifactIv, additionalData: new TextEncoder().encode('receiz.bank.private-identity-source.v1') }, wrappingKey, new Uint8Array(bytes));
  const value: SavedIdentity = { schema: 'receiz.bank.device-identity.v1', bytes: encryptedSource, artifactIv, filename, wrappingKey, iv, wrappedPhrase, readConsent };
  if (protectedTransport) { const transportIv = crypto.getRandomValues(new Uint8Array(12)); value.protectedTransport = { iv: transportIv, bytes: await crypto.subtle.encrypt({ name: 'AES-GCM', iv: transportIv, additionalData: new TextEncoder().encode('receiz.bank.protected-identity-transport.v1') }, wrappingKey, new TextEncoder().encode(JSON.stringify({ bytes: [...protectedTransport.bytes], phrase: protectedTransport.phrase }))) }; }
  const db = await database(); try { await new Promise<void>((resolve, reject) => { const tx = db.transaction('identity', 'readwrite'); tx.objectStore('identity').put(value, 'current'); tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error); }); } finally { db.close(); }
}
export async function loadDeviceIdentity(): Promise<{ bytes: Uint8Array; filename: string; phrase: string; readConsent: boolean; protectedTransport?: ProtectedIdentityTransport } | null> {
  const saved = await held(); if (!saved) return null;
  if (saved.schema !== 'receiz.bank.device-identity.v1' || saved.wrappingKey.extractable || !saved.bytes || saved.bytes.byteLength > 32 * 1024 * 1024 + 16) throw new Error('The saved device identity could not be opened. Import your Identity Seal again.');
  const phrase = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: new Uint8Array(saved.iv), additionalData: new TextEncoder().encode(saved.schema) }, saved.wrappingKey, saved.wrappedPhrase);
  let protectedTransport: ProtectedIdentityTransport | undefined;
  if (saved.protectedTransport) { const clear = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: new Uint8Array(saved.protectedTransport.iv), additionalData: new TextEncoder().encode('receiz.bank.protected-identity-transport.v1') }, saved.wrappingKey, saved.protectedTransport.bytes); const transport = JSON.parse(new TextDecoder().decode(clear)); protectedTransport = { bytes: new Uint8Array(transport.bytes), phrase: transport.phrase }; }
  return { bytes: await identityBytes(saved), filename: saved.filename, phrase: new TextDecoder().decode(phrase), readConsent: saved.readConsent === true, protectedTransport };
}
export async function forgetDeviceIdentity() { const db = await database(); try { await new Promise<void>((resolve, reject) => { const tx = db.transaction('identity', 'readwrite'); tx.objectStore('identity').delete('current'); tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error); }); } finally { db.close(); } }

interface PrivateSource { key: string; identityDigest: string; filename: string; iv: Uint8Array; bytes: ArrayBuffer; }
export async function saveDepositSource(binding: { artifactSha256: string }, bytes: Uint8Array, filename: string, digest: string): Promise<void> {
  if (bytes.length > 32 * 1024 * 1024 || !/^[a-f0-9]{64}$/.test(digest)) throw new Error('This proof exceeds supported device custody.');
  const saved = await held(); if (!saved) throw new Error('Open your identity before saving a proof.');
  const hash = async (source: ArrayBuffer) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', source))].map(byte => byte.toString(16).padStart(2, '0')).join('');
  if (await hash(new Uint8Array(await identityBytes(saved)).buffer) !== binding.artifactSha256 || await hash(new Uint8Array(bytes).buffer) !== digest) throw new Error('The held proof or identity changed before saving.');
  const key = `${binding.artifactSha256}|${digest}`, iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: new TextEncoder().encode(key) }, saved.wrappingKey, new Uint8Array(bytes));
  const value: PrivateSource = { key, identityDigest: binding.artifactSha256, filename, iv, bytes: encrypted };
  const db = await database(); try { await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(['identity', 'sources'], 'readwrite'), read = tx.objectStore('identity').get('current'), prior = new Uint8Array(saved.bytes);
    read.onsuccess = () => { const current = read.result as SavedIdentity | undefined;
      if (!current || current.bytes.byteLength !== prior.length || !new Uint8Array(current.bytes).every((byte, index) => byte === prior[index])) { tx.abort(); return; }
      tx.objectStore('sources').put(value, key);
    };
    tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(new Error('Your identity changed before the proof was saved.'));
  }); } finally { db.close(); }
}
export async function loadDepositSources(binding: { artifactSha256: string }): Promise<{ bytes: Uint8Array; filename: string }[]> {
  const saved = await held(); if (!saved) return [];
  const db = await database(); let values: PrivateSource[];
  try { values = await new Promise((resolve, reject) => { const req = db.transaction('sources').objectStore('sources').getAll(); req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); }); } finally { db.close(); }
  const sources: { bytes: Uint8Array; filename: string }[] = [];
  for (const value of values.filter(value => value.identityDigest === binding.artifactSha256)) {
    try { const bytes = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: new Uint8Array(value.iv), additionalData: new TextEncoder().encode(value.key) }, saved.wrappingKey, value.bytes); sources.push({ bytes: new Uint8Array(bytes), filename: value.filename }); } catch { /* Unavailable exact sources cannot project holdings. */ }
  }
  return sources;
}

export async function loadCardOperation(binding: { artifactSha256: string }): Promise<unknown> {
  const saved = await held(); if (!saved?.cardOperation) return null;
  const clear = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: new Uint8Array(saved.cardOperation.iv), additionalData: new TextEncoder().encode(`receiz.bank.card|${BANK_APPLICATION_ID}|${binding.artifactSha256}`) }, saved.wrappingKey, saved.cardOperation.bytes);
  return JSON.parse(new TextDecoder().decode(clear));
}
export async function saveCardOperation(binding: { artifactSha256: string }, value: unknown | null, onlyIfEmpty = false, expectedOperationId?: string): Promise<void> {
  const saved = await held(); if (!saved) throw new Error('Open your identity before starting a deposit.');
  const digest = [...new Uint8Array(await crypto.subtle.digest('SHA-256', new Uint8Array(await identityBytes(saved))))].map(byte => byte.toString(16).padStart(2, '0')).join('');
  if (digest !== binding.artifactSha256) throw new Error('Your identity changed before deposit.');
  const iv = crypto.getRandomValues(new Uint8Array(12)), bytes = value === null ? null : await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: new TextEncoder().encode(`receiz.bank.card|${BANK_APPLICATION_ID}|${binding.artifactSha256}`) }, saved.wrappingKey, new TextEncoder().encode(JSON.stringify(value)));
  const db = await database(); try { await new Promise<void>((resolve, reject) => {
    const tx = db.transaction('identity', 'readwrite'), store = tx.objectStore('identity'), read = store.get('current'), prior = new Uint8Array(saved.bytes), priorIv = new Uint8Array(saved.iv);
    read.onsuccess = () => { const current = read.result as SavedIdentity | undefined;
      if (!current || current.bytes.byteLength !== prior.length || !new Uint8Array(current.bytes).every((byte, index) => byte === prior[index]) || !new Uint8Array(current.iv).every((byte, index) => byte === priorIv[index]) || onlyIfEmpty && current.cardOperation) { tx.abort(); return; }
      if (expectedOperationId && current.cardOperation?.operationId !== expectedOperationId) return;
      const next = { ...current }; if (bytes) next.cardOperation = { operationId: (value as { operationId: string }).operationId, iv, bytes }; else delete next.cardOperation; store.put(next, 'current');
    };
    tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(new Error('An unfinished card deposit already exists, or your identity changed. Reopen Deposit to check it.'));
  }); } finally { db.close(); }
}

// A private, source-bound observation supplies first paint, never movement authority.
export async function loadWalletObservation(binding: { keyId: string; artifactSha256: string }): Promise<import('./wallet-observation').WalletObservation | null> {
  try {
    const saved = await held() as SavedIdentity & { walletObservation?: { iv: Uint8Array; bytes: ArrayBuffer } };
    if (!saved?.walletObservation) return null;
    const clear = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: new Uint8Array(saved.walletObservation.iv), additionalData: new TextEncoder().encode(`receiz.bank.wallet|${binding.keyId}|${binding.artifactSha256}`) }, saved.wrappingKey, saved.walletObservation.bytes);
    const { readWalletObservation } = await import('./wallet-observation'); return readWalletObservation(JSON.parse(new TextDecoder().decode(clear)), binding);
  } catch { return null; }
}
export async function restoreKnownWalletObservation(): Promise<import('./wallet-observation').WalletObservation | null> {
  try {
    const saved = await held() as SavedIdentity & { walletObservation?: { iv: Uint8Array; bytes: ArrayBuffer; binding?: { keyId: string; artifactSha256: string } } };
    const binding = saved?.walletObservation?.binding; if (!saved?.readConsent || !binding) return null;
    const digest = [...new Uint8Array(await crypto.subtle.digest('SHA-256', new Uint8Array(await identityBytes(saved))))].map(byte => byte.toString(16).padStart(2, '0')).join('');
    if (digest !== binding.artifactSha256) return null;
    return await loadWalletObservation(binding);
  } catch { return null; }
}
export async function saveWalletObservation(binding: { keyId: string; artifactSha256: string }, wallet: import('./shared-wallet').SharedWallet, observedAt: string): Promise<void> {
  try {
    const saved = await held(); if (!saved) return;
    const digest = [...new Uint8Array(await crypto.subtle.digest('SHA-256', new Uint8Array(await identityBytes(saved))))].map(byte => byte.toString(16).padStart(2, '0')).join('');
    if (digest !== binding.artifactSha256) return;
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const value = { schema: 'receiz.bank.private-wallet-observation.v1', authority: 'read-only-observation', applicationId: BANK_APPLICATION_ID, keyId: binding.keyId, artifactSha256: binding.artifactSha256, wallet, observedAt };
    const bytes = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: new TextEncoder().encode(`receiz.bank.wallet|${binding.keyId}|${binding.artifactSha256}`) }, saved.wrappingKey, new TextEncoder().encode(JSON.stringify(value)));
    const db = await database(); try { await new Promise<void>((resolve, reject) => {
      const priorBytes = new Uint8Array(saved.bytes);
      const tx = db.transaction('identity', 'readwrite'), store = tx.objectStore('identity'), read = store.get('current');
      read.onsuccess = () => { const current = read.result as SavedIdentity | undefined;
        // Compare exact held bytes in the write transaction; a replaced/removed ID cannot be revived.
        if (current && current.bytes.byteLength === saved.bytes.byteLength && new Uint8Array(current.bytes).every((byte, index) => byte === priorBytes[index])) store.put({ ...current, walletObservation: { iv, bytes, binding: { keyId: binding.keyId, artifactSha256: binding.artifactSha256 } } }, 'current'); };
      tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error);
    }); } finally { db.close(); }
  } catch { /* Retention failure changes no account source or identity. */ }
}
