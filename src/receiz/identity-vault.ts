interface SavedIdentity { schema: 'receiz.bank.device-identity.v1'; bytes: ArrayBuffer; filename: string; wrappingKey: CryptoKey; iv: Uint8Array; wrappedPhrase: ArrayBuffer; readConsent: boolean; }
async function database(): Promise<IDBDatabase> { return new Promise((resolve, reject) => { const request = indexedDB.open('receiz-bank-private-custody', 1); request.onupgradeneeded = () => request.result.createObjectStore('identity'); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); }); }
async function held(): Promise<SavedIdentity | null> { const db = await database(); try { return await new Promise((resolve, reject) => { const request = db.transaction('identity').objectStore('identity').get('current'); request.onsuccess = () => resolve(request.result ?? null); request.onerror = () => reject(request.error); }); } finally { db.close(); } }
export async function saveDeviceIdentity(bytes: Uint8Array, filename: string, phrase: string, readConsent: boolean) {
  const wrappingKey = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  const iv = crypto.getRandomValues(new Uint8Array(12)); const aad = new TextEncoder().encode('receiz.bank.device-identity.v1');
  const wrappedPhrase = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: aad }, wrappingKey, new TextEncoder().encode(phrase));
  const value: SavedIdentity = { schema: 'receiz.bank.device-identity.v1', bytes: new Uint8Array(bytes).buffer, filename, wrappingKey, iv, wrappedPhrase, readConsent };
  const db = await database(); try { await new Promise<void>((resolve, reject) => { const tx = db.transaction('identity', 'readwrite'); tx.objectStore('identity').put(value, 'current'); tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error); }); } finally { db.close(); }
}
export async function loadDeviceIdentity(): Promise<{ bytes: Uint8Array; filename: string; phrase: string; readConsent: boolean } | null> {
  const saved = await held(); if (!saved) return null;
  if (saved.schema !== 'receiz.bank.device-identity.v1' || saved.wrappingKey.extractable || !saved.bytes || saved.bytes.byteLength > 32 * 1024 * 1024) throw new Error('The saved device identity could not be opened. Import your Identity Seal again.');
  const phrase = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: new Uint8Array(saved.iv), additionalData: new TextEncoder().encode(saved.schema) }, saved.wrappingKey, saved.wrappedPhrase);
  return { bytes: new Uint8Array(saved.bytes), filename: saved.filename, phrase: new TextDecoder().decode(phrase), readConsent: saved.readConsent === true };
}
export async function forgetDeviceIdentity() { const db = await database(); try { await new Promise<void>((resolve, reject) => { const tx = db.transaction('identity', 'readwrite'); tx.objectStore('identity').delete('current'); tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error); }); } finally { db.close(); } }
