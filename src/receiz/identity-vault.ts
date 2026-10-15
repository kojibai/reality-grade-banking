import { BANK_APPLICATION_ID } from './config';
import { readWalletObservation } from './wallet-observation';
import { cardOperationApplicationId } from './card-deposit';
export interface ProtectedIdentityTransport { bytes: Uint8Array; phrase: string; }
interface SavedIdentity { schema: 'receiz.bank.device-identity.v1'; bytes: ArrayBuffer; artifactIv?: Uint8Array; filename: string; wrappingKey: CryptoKey; iv: Uint8Array; wrappedPhrase: ArrayBuffer; readConsent: boolean; protectedTransport?: { iv: Uint8Array; bytes: ArrayBuffer }; cardOperation?: { operationId: string; applicationId?: string; iv: Uint8Array; bytes: ArrayBuffer }; cardArchive?: { operationId: string; applicationId?: string; iv: Uint8Array; bytes: ArrayBuffer }[]; bankOperation?: { operationId: string; state: string; key: string; }; bankSession?: { iv: Uint8Array; bytes: ArrayBuffer }; }
async function identityBytes(saved: SavedIdentity): Promise<Uint8Array> { return saved.artifactIv ? new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: new Uint8Array(saved.artifactIv), additionalData: new TextEncoder().encode('receiz.bank.private-identity-source.v1') }, saved.wrappingKey, saved.bytes)) : new Uint8Array(saved.bytes); }
async function database(): Promise<IDBDatabase> { return new Promise((resolve, reject) => { const request = indexedDB.open('receiz-bank-private-custody', 3); request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains('identity')) request.result.createObjectStore('identity'); if (!request.result.objectStoreNames.contains('sources')) request.result.createObjectStore('sources'); if (!request.result.objectStoreNames.contains('operations')) request.result.createObjectStore('operations'); }; request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); }); }
async function held(): Promise<SavedIdentity | null> { const db = await database(); try { return await new Promise((resolve, reject) => { const request = db.transaction('identity').objectStore('identity').get('current'); request.onsuccess = () => resolve(request.result ?? null); request.onerror = () => reject(request.error); }); } finally { db.close(); } }
const equalCipher = (a: ArrayBuffer | Uint8Array | undefined, b: ArrayBuffer | Uint8Array | undefined) => !a && !b || !!a && !!b && a.byteLength === b.byteLength && new Uint8Array(a).every((v, index) => v === new Uint8Array(b)[index]);
async function noteRemovalGuard(saved: SavedIdentity) {
  if (saved.bankOperation && ['prepared', 'unknown'].includes(saved.bankOperation.state)) throw new Error('Keep this device until the retained transaction outcome is resolved. An Identity Seal backup does not include its private execution recovery.');
  const digest = [...new Uint8Array(await crypto.subtle.digest('SHA-256', new Uint8Array(await identityBytes(saved))))].map(v => v.toString(16).padStart(2, '0')).join('');
  const key = `offline-notes|${BANK_APPLICATION_ID}|${digest}`, db = await database(); let row: PrivateBankOperation | undefined;
  try { row = await new Promise((resolve, reject) => { const r = db.transaction('operations').objectStore('operations').get(key); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); }); } finally { db.close(); }
  if (row) {
    const clear = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: new Uint8Array(row.iv), additionalData: new TextEncoder().encode(key) }, saved.wrappingKey, row.bytes);
    const state = JSON.parse(new TextDecoder().decode(clear));
    // Conservative bookkeeping guard, never financial admission. Receiving slots
    // may already be addressed by an incoming note even before this tab sees it.
    if (state && (state.schema !== 'receiz.bank.offline-notes-device.v1' || state.create || Object.keys(state.receivers ?? {}).length || Object.values(state.deposits ?? {}).some(v => !(v as { creditRef?: string }).creditRef) || Object.entries(state.notes ?? {}).some(([id, v]) => !(v as { transferComplete?: boolean }).transferComplete && !state.deposits?.[id]?.creditRef))) throw new Error('Keep this device while Offline Notes or receiving requests are held or pending. Deposit or transfer your notes before removing this ID. An Identity Seal backup does not restore device note custody.');
  }
  return { key, row };
}
async function changeHeldIdentity(previous: SavedIdentity | null, next: SavedIdentity | null, guard?: Awaited<ReturnType<typeof noteRemovalGuard>>) {
  const db = await database(); try { await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(['identity', 'operations'], 'readwrite'), identities = tx.objectStore('identity'), read = identities.get('current');
    const apply = () => { if (next) identities.put(next, 'current'); else identities.delete('current'); };
    read.onsuccess = () => {
      const current = read.result as SavedIdentity | undefined;
      if (!equalCipher(current?.bytes, previous?.bytes) || !equalCipher(current?.iv, previous?.iv) || JSON.stringify(current?.bankOperation) !== JSON.stringify(previous?.bankOperation)) { tx.abort(); return; }
      if (!guard) { apply(); return; }
      const check = tx.objectStore('operations').get(guard.key); check.onsuccess = () => { const row = check.result as PrivateBankOperation | undefined; if (!equalCipher(row?.bytes, guard.row?.bytes) || !equalCipher(row?.iv, guard.row?.iv)) { tx.abort(); return; } apply(); };
    };
    tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(new Error('Device identity or note custody changed. Reopen this action and try again.'));
  }); } finally { db.close(); }
}
export async function saveDeviceIdentity(bytes: Uint8Array, filename: string, phrase: string, readConsent: boolean, protectedTransport?: ProtectedIdentityTransport) {
  const previous = await held(), same = !!previous && equalCipher(await identityBytes(previous), bytes), guard = previous && !same ? await noteRemovalGuard(previous) : undefined;
  const wrappingKey = same ? previous!.wrappingKey : await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  const iv = crypto.getRandomValues(new Uint8Array(12)); const aad = new TextEncoder().encode('receiz.bank.device-identity.v1');
  const wrappedPhrase = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: aad }, wrappingKey, new TextEncoder().encode(phrase));
  const artifactIv = crypto.getRandomValues(new Uint8Array(12)), encryptedSource = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: artifactIv, additionalData: new TextEncoder().encode('receiz.bank.private-identity-source.v1') }, wrappingKey, new Uint8Array(bytes));
  const value: SavedIdentity = { ...(same ? previous : {}), schema: 'receiz.bank.device-identity.v1', bytes: encryptedSource, artifactIv, filename, wrappingKey, iv, wrappedPhrase, readConsent };
  if (protectedTransport) { const transportIv = crypto.getRandomValues(new Uint8Array(12)); value.protectedTransport = { iv: transportIv, bytes: await crypto.subtle.encrypt({ name: 'AES-GCM', iv: transportIv, additionalData: new TextEncoder().encode('receiz.bank.protected-identity-transport.v1') }, wrappingKey, new TextEncoder().encode(JSON.stringify({ bytes: [...protectedTransport.bytes], phrase: protectedTransport.phrase }))) }; }
  await changeHeldIdentity(previous, value, guard);
}
export async function loadDeviceIdentity(): Promise<{ bytes: Uint8Array; filename: string; phrase: string; readConsent: boolean; protectedTransport?: ProtectedIdentityTransport } | null> {
  const saved = await held(); if (!saved) return null;
  if (saved.schema !== 'receiz.bank.device-identity.v1' || saved.wrappingKey.extractable || !saved.bytes || saved.bytes.byteLength > 32 * 1024 * 1024 + 16) throw new Error('The saved device identity could not be opened. Import your Identity Seal again.');
  const phrase = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: new Uint8Array(saved.iv), additionalData: new TextEncoder().encode(saved.schema) }, saved.wrappingKey, saved.wrappedPhrase);
  let protectedTransport: ProtectedIdentityTransport | undefined;
  if (saved.protectedTransport) { const clear = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: new Uint8Array(saved.protectedTransport.iv), additionalData: new TextEncoder().encode('receiz.bank.protected-identity-transport.v1') }, saved.wrappingKey, saved.protectedTransport.bytes); const transport = JSON.parse(new TextDecoder().decode(clear)); protectedTransport = { bytes: new Uint8Array(transport.bytes), phrase: transport.phrase }; }
  return { bytes: await identityBytes(saved), filename: saved.filename, phrase: new TextDecoder().decode(phrase), readConsent: saved.readConsent === true, protectedTransport };
}
export async function forgetDeviceIdentity() { const saved = await held(); if (!saved) return; const guard = await noteRemovalGuard(saved); await changeHeldIdentity(saved, null, guard); }

interface PrivateSource { key: string; identityDigest: string; filename: string; iv: Uint8Array; bytes: ArrayBuffer; role?: 'account-coordination' | 'account-genesis'; }
export async function saveDepositSource(binding: { artifactSha256: string }, bytes: Uint8Array, filename: string, digest: string, role?: PrivateSource['role']): Promise<void> {
  if (bytes.length > 32 * 1024 * 1024 || !/^[a-f0-9]{64}$/.test(digest)) throw new Error('This proof exceeds supported device custody.');
  const saved = await held(); if (!saved) throw new Error('Open your identity before saving a proof.');
  const hash = async (source: ArrayBuffer) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', source))].map(byte => byte.toString(16).padStart(2, '0')).join('');
  if (await hash(new Uint8Array(await identityBytes(saved)).buffer) !== binding.artifactSha256 || await hash(new Uint8Array(bytes).buffer) !== digest) throw new Error('The held proof or identity changed before saving.');
  const key = `${binding.artifactSha256}|${digest}`, iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: new TextEncoder().encode(key) }, saved.wrappingKey, new Uint8Array(bytes));
  const value: PrivateSource = { key, identityDigest: binding.artifactSha256, filename, iv, bytes: encrypted, ...(role ? { role } : {}) };
  const db = await database(); try { await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(['identity', 'sources'], 'readwrite'), read = tx.objectStore('identity').get('current'), prior = new Uint8Array(saved.bytes);
    read.onsuccess = () => { const current = read.result as SavedIdentity | undefined;
      if (!current || current.bytes.byteLength !== prior.length || !new Uint8Array(current.bytes).every((byte, index) => byte === prior[index])) { tx.abort(); return; }
      tx.objectStore('sources').put(value, key);
    };
    tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(new Error('Your identity changed before the proof was saved.'));
  }); } finally { db.close(); }
}
export async function loadDepositSources(binding: { artifactSha256: string }): Promise<{ bytes: Uint8Array; filename: string; role?: PrivateSource['role'] }[]> {
  const saved = await held(); if (!saved) return [];
  const db = await database(); let values: PrivateSource[];
  try { values = await new Promise((resolve, reject) => { const req = db.transaction('sources').objectStore('sources').getAll(); req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); }); } finally { db.close(); }
  const sources: { bytes: Uint8Array; filename: string; role?: PrivateSource['role'] }[] = [];
  for (const value of values.filter(value => value.identityDigest === binding.artifactSha256)) {
    try { const bytes = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: new Uint8Array(value.iv), additionalData: new TextEncoder().encode(value.key) }, saved.wrappingKey, value.bytes); sources.push({ bytes: new Uint8Array(bytes), filename: value.filename, ...(value.role ? { role: value.role } : {}) }); } catch { /* Unavailable exact sources cannot project holdings. */ }
  }
  return sources;
}

export async function loadCardOperation(binding: { artifactSha256: string }): Promise<unknown> {
  const saved = await held(); if (!saved?.cardOperation) return null;
  const applicationId = cardOperationApplicationId(saved.cardOperation.applicationId);
  const clear = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: new Uint8Array(saved.cardOperation.iv), additionalData: new TextEncoder().encode(`receiz.bank.card|${applicationId}|${binding.artifactSha256}`) }, saved.wrappingKey, saved.cardOperation.bytes);
  const value = JSON.parse(new TextDecoder().decode(clear));
  if (value.applicationId && value.applicationId !== applicationId) throw new Error('The unfinished deposit registration changed.');
  return { ...value, applicationId };
}
export async function loadCardOperations(binding: { artifactSha256: string }): Promise<unknown[]> {
  const saved = await held(); if (!saved) return []; await sameSavedIdentity(saved, binding);
  if ((saved.cardArchive?.length ?? 0) > 24) throw new Error('Check your retained card deposits before continuing.');
  const rows = [...(saved.cardOperation ? [saved.cardOperation] : []), ...(saved.cardArchive ?? []).slice().reverse()], result: unknown[] = [];
  for (const row of rows) {
    const applicationId = cardOperationApplicationId(row.applicationId);
    const clear = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: new Uint8Array(row.iv), additionalData: new TextEncoder().encode(`receiz.bank.card|${applicationId}|${binding.artifactSha256}`) }, saved.wrappingKey, row.bytes);
    const value = JSON.parse(new TextDecoder().decode(clear));
    if (value.operationId !== row.operationId || value.applicationId && value.applicationId !== applicationId) throw new Error('The retained deposit binding changed.');
    result.push({ ...value, applicationId });
  }
  return result;
}
export async function saveCardOperation(binding: { artifactSha256: string }, value: unknown | null, onlyIfEmpty = false, expectedOperationId?: string, archivePrevious = false): Promise<void> {
  const saved = await held(); if (!saved) throw new Error('Open your identity before starting a deposit.');
  if (archivePrevious) { const previous = await loadCardOperation(binding) as { stage?: string; operationId?: string } | null; if (!value || !expectedOperationId || previous?.stage !== 'ready' || previous.operationId !== expectedOperationId) throw new Error('Resolve the previous checkout before starting another.'); }
  const digest = [...new Uint8Array(await crypto.subtle.digest('SHA-256', new Uint8Array(await identityBytes(saved))))].map(byte => byte.toString(16).padStart(2, '0')).join('');
  if (digest !== binding.artifactSha256) throw new Error('Your identity changed before deposit.');
  const applicationId = cardOperationApplicationId((value as { applicationId?: unknown } | null)?.applicationId ?? BANK_APPLICATION_ID);
  const iv = crypto.getRandomValues(new Uint8Array(12)), bytes = value === null ? null : await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: new TextEncoder().encode(`receiz.bank.card|${applicationId}|${binding.artifactSha256}`) }, saved.wrappingKey, new TextEncoder().encode(JSON.stringify({ ...value as Record<string, unknown>, applicationId })));
  const db = await database(); try { await new Promise<void>((resolve, reject) => {
    const tx = db.transaction('identity', 'readwrite'), store = tx.objectStore('identity'), read = store.get('current'), prior = new Uint8Array(saved.bytes), priorIv = new Uint8Array(saved.iv);
    read.onsuccess = () => { const current = read.result as SavedIdentity | undefined;
      if (!current || current.bytes.byteLength !== prior.length || !new Uint8Array(current.bytes).every((byte, index) => byte === prior[index]) || !new Uint8Array(current.iv).every((byte, index) => byte === priorIv[index]) || onlyIfEmpty && current.cardOperation && !archivePrevious) { tx.abort(); return; }
      if (expectedOperationId && current.cardOperation?.operationId !== expectedOperationId) {
        if (archivePrevious || bytes) { tx.abort(); return; }
        if (!bytes && current.cardArchive?.some(item => item.operationId === expectedOperationId)) store.put({ ...current, cardArchive: current.cardArchive.filter(item => item.operationId !== expectedOperationId) }, 'current');
        return;
      }
      const next = { ...current };
      if (archivePrevious && current.cardOperation) { if ((current.cardArchive?.length ?? 0) >= 24) { tx.abort(); return; } next.cardArchive = [...(current.cardArchive ?? []), current.cardOperation]; }
      if (bytes) next.cardOperation = { operationId: (value as { operationId: string }).operationId, applicationId, iv, bytes }; else delete next.cardOperation; store.put(next, 'current');
    };
    tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(new Error('An unfinished card deposit already exists, or your identity changed. Reopen Deposit to check it.'));
  }); } finally { db.close(); }
}

// Encrypted choreography checkpoints are recovery mechanics, never proof
// admission. Every use must reopen their complete sources with the SDK.
type BankCheckpoint = import('./bank-execution').BankExecutionCheckpoint;
interface PrivateBankOperation { key: string; iv: Uint8Array; bytes: ArrayBuffer; }
function bankOperationKey(binding: { artifactSha256: string }, operationId: string): string {
  if (!/^[a-f0-9]{64}$/.test(binding.artifactSha256) || !/^[A-Za-z0-9_.:-]{1,200}$/.test(operationId)) throw new Error('BANK_EXECUTION_CHECKPOINT_INVALID');
  return `bank-operation|${BANK_APPLICATION_ID}|${binding.artifactSha256}|${operationId}`;
}
async function sameSavedIdentity(saved: SavedIdentity, binding: { artifactSha256: string }) {
  const digest = [...new Uint8Array(await crypto.subtle.digest('SHA-256', new Uint8Array(await identityBytes(saved))))].map(byte => byte.toString(16).padStart(2, '0')).join('');
  if (digest !== binding.artifactSha256) throw new Error('BANK_EXECUTION_IDENTITY_CHANGED');
}
type BankSessionIntent = import('./bank-native-session').BankSessionIntent;
function sessionAad(binding: { artifactSha256: string }): Uint8Array<ArrayBuffer> {
  if (!/^[a-f0-9]{64}$/.test(binding.artifactSha256)) throw new Error('BANK_SESSION_IDENTITY_INVALID');
  return new TextEncoder().encode(`bank-session|${BANK_APPLICATION_ID}|${binding.artifactSha256}`);
}
async function sessionIntent(saved: SavedIdentity, binding: { artifactSha256: string }, cipher = saved.bankSession): Promise<BankSessionIntent | null> {
  if (!cipher) return null;
  const clear = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: new Uint8Array(cipher.iv), additionalData: sessionAad(binding) }, saved.wrappingKey, cipher.bytes);
  const value = JSON.parse(new TextDecoder().decode(clear)) as BankSessionIntent;
  if (value.schema !== 'bank.native-session-intent.v1' || !['pending', 'active', 'zero-write'].includes(value.state) || !['open', 'refresh'].includes(value.operation)) throw new Error('BANK_SESSION_INTENT_INVALID');
  return value;
}
function sessionKey(binding: { artifactSha256: string }, sourceDigest: string) {
  if (!/^[a-f0-9]{64}$/.test(sourceDigest)) throw new Error('BANK_SESSION_SOURCE_INVALID');
  return `bank-session|${BANK_APPLICATION_ID}|${binding.artifactSha256}|${sourceDigest}`;
}
export async function loadBankSessionIntent(binding: { artifactSha256: string }, sourceDigest?: string): Promise<BankSessionIntent | null> {
  const saved = await held(); if (!saved) throw new Error('BANK_SESSION_IDENTITY_UNAVAILABLE');
  await sameSavedIdentity(saved, binding);
  const current = await sessionIntent(saved, binding);
  if (!sourceDigest || current?.sourceDigest === sourceDigest) return current;
  const key = sessionKey(binding, sourceDigest), db = await database();
  let row: { key: string; iv: Uint8Array; bytes: ArrayBuffer } | undefined;
  try { row = await new Promise((resolve, reject) => { const request = db.transaction('operations').objectStore('operations').get(key); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); }); } finally { db.close(); }
  if (!row) return null;
  const value = await sessionIntent(saved, binding, row);
  if (row.key !== key || value?.sourceDigest !== sourceDigest) throw new Error('BANK_SESSION_SOURCE_CHANGED');
  return value;
}
export async function saveBankSessionIntent(binding: { artifactSha256: string }, value: BankSessionIntent, expected: BankSessionIntent | null): Promise<void> {
  const saved = await held(); if (!saved) throw new Error('BANK_SESSION_IDENTITY_UNAVAILABLE');
  await sameSavedIdentity(saved, binding);
  const previousCurrent = await sessionIntent(saved, binding);
  if (expected && expected.sourceDigest !== value.sourceDigest || JSON.stringify(await loadBankSessionIntent(binding, value.sourceDigest)) !== JSON.stringify(expected)) throw new Error('BANK_SESSION_INTENT_CHANGED');
  const clear = new TextEncoder().encode(JSON.stringify(value));
  if (value.schema !== 'bank.native-session-intent.v1' || clear.length > 256 * 1024) throw new Error('BANK_SESSION_INTENT_INVALID');
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: sessionAad(binding) }, saved.wrappingKey, clear);
  const equalBytes = (a: ArrayBuffer | Uint8Array | undefined, b: ArrayBuffer | Uint8Array | undefined) => !a && !b || !!a && !!b && a.byteLength === b.byteLength && new Uint8Array(a).every((byte, index) => byte === new Uint8Array(b)[index]);
  const db = await database(); try { await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(['identity', 'operations'], 'readwrite'), identities = tx.objectStore('identity'), operations = tx.objectStore('operations'), read = identities.get('current');
    read.onsuccess = () => {
      const current = read.result as SavedIdentity | undefined;
      if (!current || !equalBytes(current.bytes, saved.bytes) || !equalBytes(current.iv, saved.iv) || !equalBytes(current.bankSession?.bytes, saved.bankSession?.bytes) || !equalBytes(current.bankSession?.iv, saved.bankSession?.iv)) { tx.abort(); return; }
      // Different source objects have separate retained session requests.
      // Switching the displayed connection never discards the earlier intent.
      if (previousCurrent && current.bankSession && previousCurrent.sourceDigest !== value.sourceDigest) {
        const previousKey = sessionKey(binding, previousCurrent.sourceDigest);
        operations.put({ ...current.bankSession, key: previousKey }, previousKey);
      }
      const key = sessionKey(binding, value.sourceDigest);
      operations.put({ key, iv, bytes: encrypted }, key);
      identities.put({ ...current, bankSession: { iv, bytes: encrypted } }, 'current');
    };
    tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(new Error('BANK_SESSION_IDENTITY_OR_INTENT_CHANGED'));
  }); } finally { db.close(); }
}
export async function loadBankOperation(binding: { artifactSha256: string }): Promise<BankCheckpoint | null> {
  const saved = await held(); if (!saved?.bankOperation) return null;
  await sameSavedIdentity(saved, binding);
  const key = bankOperationKey(binding, saved.bankOperation.operationId);
  if (key !== saved.bankOperation.key) throw new Error('BANK_EXECUTION_APPLICATION_OR_SOURCE_CHANGED');
  const db = await database(); let row: PrivateBankOperation | undefined;
  try { row = await new Promise((resolve, reject) => { const request = db.transaction('operations').objectStore('operations').get(key); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); }); } finally { db.close(); }
  if (!row || row.key !== key) throw new Error('BANK_EXECUTION_EXACT_CHECKPOINT_UNAVAILABLE');
  const clear = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: new Uint8Array(row.iv), additionalData: new TextEncoder().encode(key) }, saved.wrappingKey, row.bytes);
  const value = JSON.parse(new TextDecoder().decode(clear)) as BankCheckpoint;
  if (value.schema !== 'bank.execution-checkpoint.v1' || value.operationId !== saved.bankOperation.operationId || value.state !== saved.bankOperation.state || value.plan.applicationId !== BANK_APPLICATION_ID || value.plan.attemptId !== value.operationId) throw new Error('BANK_EXECUTION_CHECKPOINT_INVALID');
  return value;
}
export async function saveBankOperation(binding: { artifactSha256: string }, value: BankCheckpoint, mode: 'new' | 'replace'): Promise<void> {
  if (value.schema !== 'bank.execution-checkpoint.v1' || value.plan.applicationId !== BANK_APPLICATION_ID || value.plan.attemptId !== value.operationId || !['prepared', 'unknown', 'committed', 'zero-write'].includes(value.state)) throw new Error('BANK_EXECUTION_CHECKPOINT_INVALID');
  const previous = mode === 'replace' ? await loadBankOperation(binding) : null;
  if (mode === 'replace') {
    if (!previous || previous.operationId !== value.operationId) throw new Error('BANK_EXECUTION_CHECKPOINT_CHANGED');
    // These are exact retained mechanics, not proof admission. A changed plan
    // or source requires a new human review and cannot overwrite this intent.
    if (JSON.stringify(previous.plan) !== JSON.stringify(value.plan) || JSON.stringify(previous.transitionSet) !== JSON.stringify(value.transitionSet)) throw new Error('BANK_EXECUTION_INTENT_CHANGED');
    if (['committed', 'zero-write'].includes(previous.state) && (previous.state !== value.state || JSON.stringify(previous.recovery) !== JSON.stringify(value.recovery))) throw new Error('BANK_EXECUTION_TERMINAL');
  }
  const saved = await held(); if (!saved) throw new Error('BANK_EXECUTION_IDENTITY_UNAVAILABLE');
  await sameSavedIdentity(saved, binding);
  const key = bankOperationKey(binding, value.operationId), clear = new TextEncoder().encode(JSON.stringify(value));
  if (clear.length > 32 * 1024 * 1024) throw new Error('BANK_EXECUTION_CHECKPOINT_CAPACITY');
  const iv = crypto.getRandomValues(new Uint8Array(12)), encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: new TextEncoder().encode(key) }, saved.wrappingKey, clear);
  const row: PrivateBankOperation = { key, iv, bytes: encrypted };
  const db = await database(); try { await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(['identity', 'operations'], 'readwrite'), identities = tx.objectStore('identity'), operations = tx.objectStore('operations'), read = identities.get('current');
    const prior = new Uint8Array(saved.bytes), priorIv = new Uint8Array(saved.iv); let reason = 'BANK_EXECUTION_CHECKPOINT_CHANGED';
    read.onsuccess = () => {
      const current = read.result as SavedIdentity | undefined;
      if (!current || current.bytes.byteLength !== prior.length || !new Uint8Array(current.bytes).every((byte, i) => byte === prior[i]) || !new Uint8Array(current.iv).every((byte, i) => byte === priorIv[i])) { reason = 'BANK_EXECUTION_IDENTITY_CHANGED'; tx.abort(); return; }
      if (mode === 'new' && current.bankOperation && ['prepared', 'unknown'].includes(current.bankOperation.state)) { reason = 'BANK_EXECUTION_PENDING'; tx.abort(); return; }
      if (mode === 'replace' && (current.bankOperation?.operationId !== value.operationId || current.bankOperation.key !== key || current.bankOperation.state !== previous?.state)) { tx.abort(); return; }
      const existing = operations.get(key);
      existing.onsuccess = () => {
        if (mode === 'new' && existing.result) { reason = 'BANK_EXECUTION_ATTEMPT_ALREADY_RETAINED'; tx.abort(); return; }
        // History entries remain held when a later intent becomes current.
        operations.put(row, key); identities.put({ ...current, bankOperation: { operationId: value.operationId, state: value.state, key } }, 'current');
      };
    };
    tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(new Error(reason));
  }); } finally { db.close(); }
}

// A private, source-bound observation supplies first paint, never movement authority.
export async function loadWalletObservation(binding: { keyId: string; artifactSha256: string }): Promise<import('./wallet-observation').WalletObservation | null> {
  try {
    const saved = await held() as SavedIdentity & { walletObservation?: { iv: Uint8Array; bytes: ArrayBuffer } };
    if (!saved?.walletObservation) return null;
    const clear = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: new Uint8Array(saved.walletObservation.iv), additionalData: new TextEncoder().encode(`receiz.bank.wallet|${binding.keyId}|${binding.artifactSha256}`) }, saved.wrappingKey, saved.walletObservation.bytes);
    return readWalletObservation(JSON.parse(new TextDecoder().decode(clear)), binding);
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
export async function saveWalletObservation(binding: { keyId: string; artifactSha256: string }, wallet: import('./shared-wallet').SharedWallet, observedAt: string, history?: import('./wallet-series').WalletPoint[], source?: 'account-genesis'): Promise<void> {
  try {
    const saved = await held(); if (!saved) return;
    const digest = [...new Uint8Array(await crypto.subtle.digest('SHA-256', new Uint8Array(await identityBytes(saved))))].map(byte => byte.toString(16).padStart(2, '0')).join('');
    if (digest !== binding.artifactSha256) return;
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const value = { schema: 'receiz.bank.private-wallet-observation.v1', authority: 'read-only-observation', applicationId: BANK_APPLICATION_ID, keyId: binding.keyId, artifactSha256: binding.artifactSha256, wallet, observedAt, history, ...(source ? { source } : {}) };
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

/** Private display history. It never replaces sealed history or supplies execution authority. */
export interface PrivateHistoryCache { schema: 'bank.private-history-cache.v1'; accountUid: string; observedAt: string; records: import('./public-network').PublicRecord[]; nextCursor: string | null; }
function privateHistoryKey(binding: { artifactSha256: string }, accountUid: string) {
  if (!/^[a-f0-9]{64}$/.test(binding.artifactSha256) || !/^[A-Za-z0-9_.:-]{1,128}$/.test(accountUid)) throw new Error('PRIVATE_HISTORY_BINDING_INVALID');
  return `private-history|${BANK_APPLICATION_ID}|${binding.artifactSha256}|${accountUid}`;
}
export async function loadPrivateHistoryCache(binding: { artifactSha256: string }, accountUid: string): Promise<PrivateHistoryCache | null> {
  const saved = await held(); if (!saved) return null; await sameSavedIdentity(saved, binding);
  const key = privateHistoryKey(binding, accountUid), db = await database();
  let row: PrivateBankOperation | undefined;
  try { row = await new Promise((resolve, reject) => { const request = db.transaction('operations').objectStore('operations').get(key); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); }); } finally { db.close(); }
  if (!row) return null;
  const clear = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: new Uint8Array(row.iv), additionalData: new TextEncoder().encode(key) }, saved.wrappingKey, row.bytes);
  const value = JSON.parse(new TextDecoder().decode(clear)) as PrivateHistoryCache;
  if (value.schema !== 'bank.private-history-cache.v1' || value.accountUid !== accountUid || !Array.isArray(value.records) || value.records.length > 100000 || !Number.isFinite(Date.parse(value.observedAt)) || value.nextCursor !== null && !/^[A-Za-z0-9_-]{1,2048}$/.test(value.nextCursor)) throw new Error('PRIVATE_HISTORY_CACHE_INVALID');
  return value;
}
export async function savePrivateHistoryCache(binding: { artifactSha256: string }, value: PrivateHistoryCache): Promise<void> {
  const saved = await held(); if (!saved) throw new Error('PRIVATE_HISTORY_IDENTITY_UNAVAILABLE'); await sameSavedIdentity(saved, binding);
  const key = privateHistoryKey(binding, value.accountUid), clear = new TextEncoder().encode(JSON.stringify(value));
  if (value.schema !== 'bank.private-history-cache.v1' || clear.length > 8 * 1024 * 1024 || value.records.length > 100000) throw new Error('PRIVATE_HISTORY_CAPACITY_EXCEEDED');
  const iv = crypto.getRandomValues(new Uint8Array(12)), bytes = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: new TextEncoder().encode(key) }, saved.wrappingKey, clear), db = await database();
  try { await new Promise<void>((resolve, reject) => { const tx = db.transaction(['identity', 'operations'], 'readwrite'), request = tx.objectStore('identity').get('current'); request.onsuccess = () => { const current = request.result as SavedIdentity | undefined; if (!current || current.bytes.byteLength !== saved.bytes.byteLength || !new Uint8Array(current.bytes).every((byte, i) => byte === new Uint8Array(saved.bytes)[i]) || !new Uint8Array(current.iv).every((byte, i) => byte === new Uint8Array(saved.iv)[i])) { tx.abort(); return; } tx.objectStore('operations').put({ key, iv, bytes }, key); }; tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(new Error('PRIVATE_HISTORY_IDENTITY_CHANGED')); }); } finally { db.close(); }
}

/** Encrypted note choreography; all financial sources are reopened by v129. */
export async function loadOfflineNoteState(binding: { artifactSha256: string }): Promise<unknown> {
  const saved = await held(); if (!saved) throw new Error('BANK_NOTE_IDENTITY_UNAVAILABLE'); await sameSavedIdentity(saved, binding);
  const key = `offline-notes|${BANK_APPLICATION_ID}|${binding.artifactSha256}`, db = await database();
  let row: PrivateBankOperation | undefined;
  try { row = await new Promise((resolve, reject) => { const r = db.transaction('operations').objectStore('operations').get(key); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); }); } finally { db.close(); }
  if (!row) return null;
  const bytes = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: new Uint8Array(row.iv), additionalData: new TextEncoder().encode(key) }, saved.wrappingKey, row.bytes);
  return JSON.parse(new TextDecoder().decode(bytes));
}
export async function saveOfflineNoteState(binding: { artifactSha256: string }, value: unknown, expected: unknown): Promise<void> {
  const saved = await held(); if (!saved) throw new Error('BANK_NOTE_IDENTITY_UNAVAILABLE'); await sameSavedIdentity(saved, binding);
  const key = `offline-notes|${BANK_APPLICATION_ID}|${binding.artifactSha256}`, clear = new TextEncoder().encode(JSON.stringify(value));
  if (clear.length > 32 * 1024 * 1024) throw new Error('BANK_NOTE_DEVICE_CAPACITY');
  const db = await database();
  const equal = (a: ArrayBuffer | Uint8Array | undefined, b: ArrayBuffer | Uint8Array | undefined) => !a && !b || !!a && !!b && a.byteLength === b.byteLength && new Uint8Array(a).every((v, index) => v === new Uint8Array(b)[index]);
  try {
    const prior = await new Promise<PrivateBankOperation | undefined>((resolve, reject) => { const r = db.transaction('operations').objectStore('operations').get(key); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
    const previous = prior ? JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: new Uint8Array(prior.iv), additionalData: new TextEncoder().encode(key) }, saved.wrappingKey, prior.bytes))) : null;
    if (JSON.stringify(previous) !== JSON.stringify(expected)) throw new Error('BANK_NOTE_INTENT_CHANGED');
    const iv = crypto.getRandomValues(new Uint8Array(12)), bytes = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: new TextEncoder().encode(key) }, saved.wrappingKey, clear);
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(['identity', 'operations'], 'readwrite'), identities = tx.objectStore('identity'), operations = tx.objectStore('operations'), read = identities.get('current');
      read.onsuccess = () => {
        const current = read.result as SavedIdentity | undefined;
        if (!current || !equal(current.bytes, saved.bytes) || !equal(current.iv, saved.iv)) { tx.abort(); return; }
        const operation = operations.get(key);
        operation.onsuccess = () => {
          const held = operation.result as PrivateBankOperation | undefined;
          if (!equal(held?.bytes, prior?.bytes) || !equal(held?.iv, prior?.iv)) { tx.abort(); return; }
          operations.put({ key, iv, bytes }, key);
        };
      };
      tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(new Error('BANK_NOTE_IDENTITY_OR_INTENT_CHANGED'));
    });
  } finally { db.close(); }
}

/** Immutable encrypted byte custody; digest references never replace SDK admission. */
export async function saveOfflineNoteBlob(binding: { artifactSha256: string }, input: Uint8Array): Promise<string> {
  const bytes = new Uint8Array(input); if (!bytes.length || bytes.length > 32 * 1024 * 1024) throw new Error('BANK_NOTE_DEVICE_CAPACITY');
  const digest = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(v => v.toString(16).padStart(2, '0')).join('');
  const saved = await held(); if (!saved) throw new Error('BANK_NOTE_IDENTITY_UNAVAILABLE'); await sameSavedIdentity(saved, binding);
  const key = `offline-note-source|${BANK_APPLICATION_ID}|${binding.artifactSha256}|${digest}`, iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: new TextEncoder().encode(key) }, saved.wrappingKey, bytes), db = await database();
  try { await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(['identity', 'operations'], 'readwrite'), read = tx.objectStore('identity').get('current'), sources = tx.objectStore('operations');
    read.onsuccess = () => { const current = read.result as SavedIdentity | undefined; if (!current || current.bytes.byteLength !== saved.bytes.byteLength || !new Uint8Array(current.bytes).every((v, i) => v === new Uint8Array(saved.bytes)[i]) || !new Uint8Array(current.iv).every((v, i) => v === new Uint8Array(saved.iv)[i])) { tx.abort(); return; } const existing = sources.get(key); existing.onsuccess = () => { if (!existing.result) sources.put({ key, iv, bytes: encrypted }, key); }; };
    tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(new Error('BANK_NOTE_IDENTITY_CHANGED'));
  }); } finally { db.close(); } return digest;
}
export async function loadOfflineNoteBlob(binding: { artifactSha256: string }, digest: string): Promise<Uint8Array> {
  if (!/^[a-f0-9]{64}$/.test(digest)) throw new Error('BANK_NOTE_SOURCE_REFERENCE_INVALID');
  const saved = await held(); if (!saved) throw new Error('BANK_NOTE_IDENTITY_UNAVAILABLE'); await sameSavedIdentity(saved, binding);
  const key = `offline-note-source|${BANK_APPLICATION_ID}|${binding.artifactSha256}|${digest}`, db = await database();
  let row: PrivateBankOperation | undefined;
  try { row = await new Promise((resolve, reject) => { const r = db.transaction('operations').objectStore('operations').get(key); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); }); } finally { db.close(); }
  if (!row) throw new Error('BANK_NOTE_EXACT_SOURCE_UNAVAILABLE');
  const bytes = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: new Uint8Array(row.iv), additionalData: new TextEncoder().encode(key) }, saved.wrappingKey, row.bytes));
  const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(v => v.toString(16).padStart(2, '0')).join('');
  if (hash !== digest) throw new Error('BANK_NOTE_EXACT_SOURCE_MISMATCH'); return bytes;
}
