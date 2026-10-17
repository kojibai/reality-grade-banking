import { BANK_APPLICATION_ID } from './config';
import { readWalletObservation } from './wallet-observation';
import { cardOperationApplicationId } from './card-deposit';
export interface ProtectedIdentityTransport { bytes: Uint8Array; phrase: string; }
interface SavedIdentity { schema: 'receiz.bank.device-identity.v1'; bytes: ArrayBuffer; artifactIv?: Uint8Array; filename: string; wrappingKey: CryptoKey; iv: Uint8Array; wrappedPhrase: ArrayBuffer; readConsent: boolean; walletObservation?:{iv:Uint8Array;bytes:ArrayBuffer;binding:{keyId:string;artifactSha256:string};localHeadDigest?:string}; protectedTransport?: { iv: Uint8Array; bytes: ArrayBuffer }; cardOperation?: { operationId: string; applicationId?: string; iv: Uint8Array; bytes: ArrayBuffer }; cardArchive?: { operationId: string; applicationId?: string; iv: Uint8Array; bytes: ArrayBuffer }[]; bankOperation?: { operationId: string; state: string; key: string; }; bankSession?: { iv: Uint8Array; bytes: ArrayBuffer }; }
async function identityBytes(saved: SavedIdentity): Promise<Uint8Array> { return saved.artifactIv ? new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: new Uint8Array(saved.artifactIv), additionalData: new TextEncoder().encode('receiz.bank.private-identity-source.v1') }, saved.wrappingKey, saved.bytes)) : new Uint8Array(saved.bytes); }
async function database(): Promise<IDBDatabase> { return new Promise((resolve, reject) => { const request = indexedDB.open('receiz-bank-private-custody', 3); request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains('identity')) request.result.createObjectStore('identity'); if (!request.result.objectStoreNames.contains('sources')) request.result.createObjectStore('sources'); if (!request.result.objectStoreNames.contains('operations')) request.result.createObjectStore('operations'); }; request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); }); }
async function held(): Promise<SavedIdentity | null> { const db = await database(); try { return await new Promise((resolve, reject) => { const request = db.transaction('identity').objectStore('identity').get('current'); request.onsuccess = () => resolve(request.result ?? null); request.onerror = () => reject(request.error); }); } finally { db.close(); } }
const equalCipher = (a: ArrayBuffer | Uint8Array | undefined, b: ArrayBuffer | Uint8Array | undefined) => !a && !b || !!a && !!b && a.byteLength === b.byteLength && new Uint8Array(a).every((v, index) => v === new Uint8Array(b)[index]);
async function noteRemovalGuard(saved: SavedIdentity) {
  if (saved.bankOperation && ['prepared', 'unknown'].includes(saved.bankOperation.state)) throw new Error('Keep this device until the retained transaction outcome is resolved. An Identity Seal backup does not include its private execution recovery.');
  const digest = [...new Uint8Array(await crypto.subtle.digest('SHA-256', new Uint8Array(await identityBytes(saved))))].map(v => v.toString(16).padStart(2, '0')).join('');
  const db = await database();
  const rows: {key:string;row:PrivateBankOperation|undefined}[]=[];
  try {
    for (const family of ['offline-notes','prepared-notes']) {
      const key=`${family}|${BANK_APPLICATION_ID}|${digest}`;
      const row=await new Promise<PrivateBankOperation|undefined>((resolve,reject)=>{const read=db.transaction('operations').objectStore('operations').get(key);read.onsuccess=()=>resolve(read.result);read.onerror=()=>reject(read.error);});
      rows.push({key,row});
      if(!row)continue;
      const clear=await crypto.subtle.decrypt({name:'AES-GCM',iv:new Uint8Array(row.iv),additionalData:new TextEncoder().encode(key)},saved.wrappingKey,row.bytes);
      const state=JSON.parse(new TextDecoder().decode(clear));
      // This retention guard grants no financial authority. A reserved receiving
      // slot may already be addressed by an incoming note outside this tab.
      const held=family==='offline-notes'
        ? state.schema!=='receiz.bank.offline-notes-device.v1'||state.create||Object.keys(state.receivers??{}).length||Object.values(state.deposits??{}).some(v=>!(v as {creditRef?:string}).creditRef)||Object.entries(state.notes??{}).some(([id,v])=>!(v as {transferComplete?:boolean}).transferComplete&&!state.deposits?.[id]?.creditRef)
        : state.schema!=='receiz.bank.prepared-notes-device.v1'||state.create||Object.values(state.slots??{}).some(v=>(v as {status:string}).status==='reserved')||Object.values(state.components??{}).some(v=>!(v as {exhausted?:boolean}).exhausted)||Object.values(state.journal?.deposits??{}).some(v=>(v as {phase:string}).phase!=='complete')||Object.entries(state.notes??{}).some(([id,v])=>!(v as {transferComplete?:boolean}).transferComplete&&state.journal?.deposits?.[id]?.phase!=='complete');
      if(held)throw new Error('Keep this device while Offline Notes, prepared value or receiving requests are held or pending. Deposit or transfer your notes before removing this ID. An Identity Seal backup does not restore device note custody.');
    }
  } finally {db.close();}
  return rows;
}
async function changeHeldIdentity(previous: SavedIdentity | null, next: SavedIdentity | null, guard?: Awaited<ReturnType<typeof noteRemovalGuard>>) {
  const db = await database(); try { await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(['identity', 'operations'], 'readwrite'), identities = tx.objectStore('identity'), read = identities.get('current');
    const apply = () => { if (next) identities.put(next, 'current'); else identities.delete('current'); };
    read.onsuccess = () => {
      const current = read.result as SavedIdentity | undefined;
      if (!equalCipher(current?.bytes, previous?.bytes) || !equalCipher(current?.iv, previous?.iv) || JSON.stringify(current?.bankOperation) !== JSON.stringify(previous?.bankOperation)) { tx.abort(); return; }
      if (!guard) { apply(); return; }
      let remaining=guard.length;
      for(const item of guard){const check=tx.objectStore('operations').get(item.key);check.onsuccess=()=>{const row=check.result as PrivateBankOperation|undefined;if(!equalCipher(row?.bytes,item.row?.bytes)||!equalCipher(row?.iv,item.row?.iv)){tx.abort();return;}if(--remaining===0)apply();};}
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
export async function loadDepositSources(binding: { artifactSha256: string }, options: { requireComplete?: boolean; originalsOnly?: boolean; digests?: readonly string[] } = {}): Promise<{ bytes: Uint8Array; filename: string; role?: PrivateSource['role'] }[]> {
  if (options.digests && (options.digests.length > 8 || options.digests.some(digest => !/^[a-f0-9]{64}$/u.test(digest)))) throw Error('PROOF_SOURCE_INVALID');
  const saved = await held(); if (!saved) { if (options.requireComplete) throw Error('PROOF_IDENTITY_CLOSED'); return []; }
  if (options.requireComplete) await sameSavedIdentity(saved, binding);
  const db = await database(); let values: PrivateSource[];
  try {
    const store = db.transaction('sources').objectStore('sources');
    values = options.digests ? (await Promise.all([...new Set(options.digests)].map(digest => new Promise<PrivateSource | undefined>((resolve, reject) => { const req = store.get(`${binding.artifactSha256}|${digest}`); req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); })))).filter((value): value is PrivateSource => Boolean(value))
      : await new Promise((resolve, reject) => { const req = store.getAll(); req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); });
  } finally { db.close(); }
  const sources: { bytes: Uint8Array; filename: string; role?: PrivateSource['role'] }[] = [];
  for (const value of values.filter(value => value.identityDigest === binding.artifactSha256 && (!options.originalsOnly || !value.role))) {
    try { const bytes = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: new Uint8Array(value.iv), additionalData: new TextEncoder().encode(value.key) }, saved.wrappingKey, value.bytes); sources.push({ bytes: new Uint8Array(bytes), filename: value.filename, ...(value.role ? { role: value.role } : {}) }); } catch (cause) { if (options.requireComplete) throw cause; /* Unavailable exact sources cannot project holdings. */ }
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
    if (previous.accountSubjectId !== value.accountSubjectId || previous.sourcesRestored && !value.sourcesRestored) throw new Error('BANK_EXECUTION_ACCOUNT_SOURCE_CHANGED');
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
export async function saveWalletObservation(binding: { keyId: string; artifactSha256: string }, wallet: import('./shared-wallet').SharedWallet, observedAt: string, history?: import('./wallet-series').WalletPoint[], source?: import('./wallet-observation').WalletObservation['source'], localHeadDigest?: string): Promise<void> {
  try {
    const saved = await held(); if (!saved) return;
    const digest = [...new Uint8Array(await crypto.subtle.digest('SHA-256', new Uint8Array(await identityBytes(saved))))].map(byte => byte.toString(16).padStart(2, '0')).join('');
    if (digest !== binding.artifactSha256) return;
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const value = { schema: 'receiz.bank.private-wallet-observation.v1', authority: 'read-only-observation', applicationId: BANK_APPLICATION_ID, keyId: binding.keyId, artifactSha256: binding.artifactSha256, wallet, observedAt, history, ...(source ? { source } : {}), ...(localHeadDigest ? {localHeadDigest} : {}) };
    const bytes = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: new TextEncoder().encode(`receiz.bank.wallet|${binding.keyId}|${binding.artifactSha256}`) }, saved.wrappingKey, new TextEncoder().encode(JSON.stringify(value)));
    const db = await database(); try { await new Promise<void>((resolve, reject) => {
      const priorBytes = new Uint8Array(saved.bytes);
      const tx = db.transaction('identity', 'readwrite'), store = tx.objectStore('identity'), read = store.get('current');
      read.onsuccess = () => { const current = read.result as SavedIdentity | undefined;
        // Compare exact held bytes in the write transaction; a replaced/removed ID cannot be revived.
        if (current && current.bytes.byteLength === saved.bytes.byteLength && new Uint8Array(current.bytes).every((byte, index) => byte === priorBytes[index]) && (!current.walletObservation?.localHeadDigest || current.walletObservation.localHeadDigest === localHeadDigest)) store.put({ ...current, walletObservation: { iv, bytes, binding: { keyId: binding.keyId, artifactSha256: binding.artifactSha256 }, ...(localHeadDigest ? {localHeadDigest} : {}) } }, 'current'); };
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
async function loadNoteState(binding: { artifactSha256: string }, family: string): Promise<unknown> {
  const saved = await held(); if (!saved) throw new Error('BANK_NOTE_IDENTITY_UNAVAILABLE'); await sameSavedIdentity(saved, binding);
  const key = `${family}|${BANK_APPLICATION_ID}|${binding.artifactSha256}`, db = await database();
  let row: PrivateBankOperation | undefined;
  try { row = await new Promise((resolve, reject) => { const r = db.transaction('operations').objectStore('operations').get(key); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); }); } finally { db.close(); }
  if (!row) return null;
  const bytes = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: new Uint8Array(row.iv), additionalData: new TextEncoder().encode(key) }, saved.wrappingKey, row.bytes);
  return JSON.parse(new TextDecoder().decode(bytes));
}
async function saveNoteState(binding: { artifactSha256: string; keyId?: string }, family: string, value: unknown, expected: unknown, observation?: import('./wallet-observation').WalletObservation): Promise<void> {
  const saved = await held(); if (!saved) throw new Error('BANK_NOTE_IDENTITY_UNAVAILABLE'); await sameSavedIdentity(saved, binding);
  const key = `${family}|${BANK_APPLICATION_ID}|${binding.artifactSha256}`, clear = new TextEncoder().encode(JSON.stringify(value));
  if (clear.length > 32 * 1024 * 1024) throw new Error('BANK_NOTE_DEVICE_CAPACITY');
  const db = await database();
  const equal = (a: ArrayBuffer | Uint8Array | undefined, b: ArrayBuffer | Uint8Array | undefined) => !a && !b || !!a && !!b && a.byteLength === b.byteLength && new Uint8Array(a).every((v, index) => v === new Uint8Array(b)[index]);
  try {
    const prior = await new Promise<PrivateBankOperation | undefined>((resolve, reject) => { const r = db.transaction('operations').objectStore('operations').get(key); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
    const previous = prior ? JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: new Uint8Array(prior.iv), additionalData: new TextEncoder().encode(key) }, saved.wrappingKey, prior.bytes))) : null;
    if (JSON.stringify(previous) !== JSON.stringify(expected)) throw new Error('BANK_NOTE_INTENT_CHANGED');
    const iv = crypto.getRandomValues(new Uint8Array(12)), bytes = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: new TextEncoder().encode(key) }, saved.wrappingKey, clear);
    let walletObservation: {iv:Uint8Array;bytes:ArrayBuffer;binding:{keyId:string;artifactSha256:string};localHeadDigest:string} | undefined;
    if (observation) {
      if (!binding.keyId || observation.source !== 'local-note-head' || !observation.localHeadDigest) throw Error('BANK_NOTE_ACCOUNT_SUCCESSOR_INVALID');
      const record = {schema:'receiz.bank.private-wallet-observation.v1',authority:'read-only-observation',applicationId:BANK_APPLICATION_ID,keyId:binding.keyId,artifactSha256:binding.artifactSha256,...observation};
      if (!readWalletObservation(record,{keyId:binding.keyId,artifactSha256:binding.artifactSha256})) throw Error('BANK_NOTE_ACCOUNT_SUCCESSOR_INVALID');
      const walletIv=crypto.getRandomValues(new Uint8Array(12));
      const walletBytes=await crypto.subtle.encrypt({name:'AES-GCM',iv:walletIv,additionalData:new TextEncoder().encode(`receiz.bank.wallet|${binding.keyId}|${binding.artifactSha256}`)},saved.wrappingKey,new TextEncoder().encode(JSON.stringify(record)));
      walletObservation={iv:walletIv,bytes:walletBytes,localHeadDigest:observation.localHeadDigest,binding:{keyId:binding.keyId,artifactSha256:binding.artifactSha256}};
    }
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
          if (walletObservation) identities.put({...current,walletObservation},'current');
        };
      };
      tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(new Error('BANK_NOTE_IDENTITY_OR_INTENT_CHANGED'));
    });
  } finally { db.close(); }
}

export const loadOfflineNoteState = (binding:{artifactSha256:string}) => loadNoteState(binding,'offline-notes');
export const saveOfflineNoteState = (binding:{artifactSha256:string},value:unknown,expected:unknown) => saveNoteState(binding,'offline-notes',value,expected);
export const loadPreparedNoteState = (binding:{artifactSha256:string}) => loadNoteState(binding,'prepared-notes');
export const savePreparedNoteState = (binding:{artifactSha256:string;keyId:string},value:unknown,expected:unknown,observation?:import('./wallet-observation').WalletObservation) => saveNoteState(binding,'prepared-notes',value,expected,observation);

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

/** Portable proof evidence is retained separately from live execution/note
 * checkpoints. These bytes never establish balances or device custody. */
type PortableProof = import('./proof-library').ProofSource;
const proofArchivePrefix = (binding: { artifactSha256: string }) => `proof-archive|${BANK_APPLICATION_ID}|${binding.artifactSha256}|`;
async function retainedOperationRows(prefix: string): Promise<PrivateBankOperation[]> {
  const db = await database();
  try { return await new Promise((resolve, reject) => {
    const read = db.transaction('operations').objectStore('operations').getAll(IDBKeyRange.bound(prefix, prefix + '\uffff'));
    read.onsuccess = () => resolve(read.result); read.onerror = () => reject(read.error);
  }); } finally { db.close(); }
}
function proofFrame(source: PortableProof): Uint8Array {
  const meta = new TextEncoder().encode(JSON.stringify({ kind: source.kind, filename: source.filename }));
  const bytes = new Uint8Array(4 + meta.length + source.bytes.length);
  new DataView(bytes.buffer).setUint32(0, meta.length); bytes.set(meta, 4); bytes.set(source.bytes, 4 + meta.length); return bytes;
}
function openProofFrame(bytes: Uint8Array): PortableProof {
  if (bytes.length < 5) throw Error('PROOF_ARCHIVE_INVALID');
  const size = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(0);
  if (size > 1024 || size + 4 >= bytes.length) throw Error('PROOF_ARCHIVE_INVALID');
  const meta = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes.slice(4, 4 + size)));
  if (!meta || Object.keys(meta).sort().join('|') !== 'filename|kind' || !['execution-recovery', 'note-image', 'note-deposit'].includes(meta.kind)
    || typeof meta.filename !== 'string' || !meta.filename || meta.filename.length > 240 || /[\x00-\x1f\x7f/\\]/u.test(meta.filename)) throw Error('PROOF_ARCHIVE_INVALID');
  return { kind: meta.kind, filename: meta.filename, bytes: bytes.slice(4 + size) };
}
export async function loadProofArchive(binding: { artifactSha256: string }): Promise<PortableProof[]> {
  const saved = await held(); if (!saved) throw Error('PROOF_IDENTITY_CLOSED'); await sameSavedIdentity(saved, binding);
  const prefix = proofArchivePrefix(binding), rows = await retainedOperationRows(prefix), result: PortableProof[] = [];
  if (rows.length > 1000) throw Error('PROOF_BACKUP_CAPACITY');
  for (const row of rows) {
    const clear = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: new Uint8Array(row.iv), additionalData: new TextEncoder().encode(row.key) }, saved.wrappingKey, row.bytes));
    const source = openProofFrame(clear), digest = await import('./proof-library').then(m => m.proofDigest(source.bytes));
    if (row.key !== prefix + digest) throw Error('PROOF_SOURCE_DIGEST_MISMATCH'); result.push(source);
  }
  return result;
}
export async function loadExportableRecoveries(binding: { artifactSha256: string }): Promise<PortableProof[]> {
  const saved = await held(); if (!saved) throw Error('PROOF_IDENTITY_CLOSED'); await sameSavedIdentity(saved, binding);
  const rows = await retainedOperationRows(`bank-operation|${BANK_APPLICATION_ID}|${binding.artifactSha256}|`), result: PortableProof[] = [];
  for (const row of rows) {
    const value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: new Uint8Array(row.iv), additionalData: new TextEncoder().encode(row.key) }, saved.wrappingKey, row.bytes))) as BankCheckpoint;
    if (value.state !== 'committed') continue;
    if (value.schema !== 'bank.execution-checkpoint.v1' || !value.recovery || value.plan.applicationId !== BANK_APPLICATION_ID || value.operationId !== value.plan.attemptId) throw Error('BANK_EXECUTION_CHECKPOINT_INVALID');
    result.push({ kind: 'execution-recovery', filename: `bank-execution-${value.plan.exactPlanDigest}.receiz-recovery.json`, bytes: new TextEncoder().encode(JSON.stringify(value.recovery)) });
  }
  return result;
}
type ProofStoredRow = PrivateSource | PrivateBankOperation;
type ProofSnapshot = { sources: Map<string, PrivateSource>; archive: Map<string, PrivateBankOperation> };
// Read only this identity's bounded proof collections.
// Crypto runs outside the write transaction; the complete snapshot is compared
// again in that transaction so another tab cannot bypass capacity or dedupe.
async function proofSnapshot(db: IDBDatabase, sourcePrefix: string, prefix: string): Promise<ProofSnapshot> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['sources', 'operations']);
    let sources: PrivateSource[] = [], archive: PrivateBankOperation[] = [];
    const read = tx.objectStore('operations').getAll(IDBKeyRange.bound(prefix, prefix + '\uffff'), 1001);
    read.onsuccess = () => { archive = read.result; };
    const owned = tx.objectStore('sources').getAll(IDBKeyRange.bound(sourcePrefix, sourcePrefix + '\uffff'), 1003);
    owned.onsuccess = () => { sources = owned.result; };
    tx.oncomplete = () => resolve({ sources: new Map(sources.map(row => [row.key, row])), archive: new Map(archive.map(row => [row.key, row])) });
    tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error ?? Error('PROOF_STORAGE_UNAVAILABLE'));
  });
}
function sameProofRow(a: ProofStoredRow | undefined, b: ProofStoredRow | undefined): boolean {
  return !a && !b || !!a && !!b && a.key === b.key && equalCipher(a.bytes, b.bytes) && equalCipher(a.iv, b.iv)
    && (a as PrivateSource).filename === (b as PrivateSource).filename && (a as PrivateSource).role === (b as PrivateSource).role
    && (a as PrivateSource).identityDigest === (b as PrivateSource).identityDigest;
}
export async function retainProofBatch(binding: { artifactSha256: string }, originals: PortableProof[]): Promise<import('./proof-library').ProofRetention> {
  if (originals.length > 1000) throw Error('PROOF_BACKUP_CAPACITY');
  const saved = await held(); if (!saved) throw Error('PROOF_IDENTITY_CLOSED'); await sameSavedIdentity(saved, binding);
  const { proofDigest } = await import('./proof-library'), sources = originals.map(value => ({ ...value, bytes: new Uint8Array(value.bytes) }));
  const prepared: { store: 'sources' | 'operations'; key: string; source: PortableProof; value: ProofStoredRow }[] = [];
  const seen = new Map<string, string>(); let total = 0;
  for (const source of sources) {
    total += source.bytes.length;
    if (!source.bytes.length || source.bytes.length > 32 * 1024 * 1024 || total > 64 * 1024 * 1024
      || !['owned-source', 'execution-recovery', 'note-image', 'note-deposit'].includes(source.kind)
      || !source.filename || source.filename.length > 240 || /[\x00-\x1f\x7f/\\]/u.test(source.filename)) throw Error('PROOF_SOURCE_INVALID');
    const digest = await proofDigest(source.bytes), prior = seen.get(digest);
    if (prior && prior !== source.kind) throw Error('PROOF_SOURCE_KIND_CONFLICT');
    if (prior) continue; seen.set(digest, source.kind);
    const owned = source.kind === 'owned-source', key = owned ? `${binding.artifactSha256}|${digest}` : proofArchivePrefix(binding) + digest;
    const iv = crypto.getRandomValues(new Uint8Array(12)), clear = owned ? source.bytes : proofFrame(source);
    const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: new TextEncoder().encode(key) }, saved.wrappingKey, new Uint8Array(clear));
    prepared.push({ store: owned ? 'sources' : 'operations', key, source, value: owned ? { key, identityDigest: binding.artifactSha256, filename: source.filename, iv, bytes: encrypted } : { key, iv, bytes: encrypted } });
  }
  const db = await database(), prefix = proofArchivePrefix(binding), sourcePrefix = `${binding.artifactSha256}|`;
  try {
    for (let attempt = 0; attempt < 3; attempt++) {
      const snapshot = await proofSnapshot(db, sourcePrefix, prefix), writes = new Set<string>(), sizes = new Map<string, number>();
      if (snapshot.archive.size > 1000 || snapshot.sources.size >= 1003) throw Error('PROOF_BACKUP_CAPACITY');
      const decrypt = (row: ProofStoredRow) => crypto.subtle.decrypt({ name: 'AES-GCM', iv: new Uint8Array(row.iv), additionalData: new TextEncoder().encode(row.key) }, saved.wrappingKey, row.bytes);
      const imported = new Set(prepared.map(v => v.key));
      for (const [key, row] of [...snapshot.archive, ...snapshot.sources] as [string, ProofStoredRow][]) {
        if (imported.has(key) || (row as PrivateSource).role) continue;
        // Old-key ciphertext remains untouched unless its verified exact
        // original is supplied. Its encrypted length is a safe capacity bound.
        let clear: ArrayBuffer | undefined; try { clear = await decrypt(row); } catch { /* Lost key or damaged ciphertext. */ }
        sizes.set(key, clear ? snapshot.sources.has(key) ? clear.byteLength : openProofFrame(new Uint8Array(clear)).bytes.length : row.bytes.byteLength);
      }
      let alreadyHeld = 0;
      for (const item of prepared) {
        const prior = item.store === 'sources' ? snapshot.sources.get(item.key) : snapshot.archive.get(item.key);
        let clear: ArrayBuffer | undefined;
        if (prior) { try { clear = await decrypt(prior); } catch { /* Restore verified bytes under the current wrapping key. */ } }
        if (clear) {
          const heldSource = item.store === 'sources' ? new Uint8Array(clear) : openProofFrame(new Uint8Array(clear));
          const heldBytes = heldSource instanceof Uint8Array ? heldSource : heldSource.bytes;
          if (!(heldSource instanceof Uint8Array) && heldSource.kind !== item.source.kind) throw Error('PROOF_SOURCE_KIND_CONFLICT');
          if (!equalCipher(heldBytes, item.source.bytes)) throw Error('PROOF_SOURCE_DIGEST_MISMATCH');
          alreadyHeld++;
        } else {
          if ((prior as PrivateSource | undefined)?.role) throw Error('PROOF_INTERNAL_SOURCE_UNAVAILABLE');
          writes.add(item.key);
        }
        if (!(prior as PrivateSource | undefined)?.role) sizes.set(item.key, item.source.bytes.length);
      }
      if (sizes.size > 1000 || [...sizes.values()].reduce((sum, size) => sum + size, 0) > 64 * 1024 * 1024) throw Error('PROOF_BACKUP_CAPACITY');
      try {
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction(['identity', 'sources', 'operations'], 'readwrite');
          let current: SavedIdentity | undefined, archive: PrivateBankOperation[] = [], currentSources: PrivateSource[] = [], completed = 0, failure = 'PROOF_IMPORT_NOT_COMMITTED';
          const complete = () => {
            if (++completed !== 3) return;
            if (!current || !equalCipher(current.bytes, saved.bytes) || !equalCipher(current.iv, saved.iv)) { failure = 'PROOF_IDENTITY_CHANGED'; tx.abort(); return; }
            if (archive.length !== snapshot.archive.size || archive.some(row => !sameProofRow(row, snapshot.archive.get(row.key)))
              || currentSources.length !== snapshot.sources.size || currentSources.some(row => !sameProofRow(row, snapshot.sources.get(row.key)))) { failure = 'PROOF_IMPORT_RETRY'; tx.abort(); return; }
            for (const item of prepared) if (writes.has(item.key)) tx.objectStore(item.store).put(item.value, item.key);
          };
          const identityRead = tx.objectStore('identity').get('current'); identityRead.onsuccess = () => { current = identityRead.result; complete(); };
          const archiveRead = tx.objectStore('operations').getAll(IDBKeyRange.bound(prefix, prefix + '\uffff'), 1001); archiveRead.onsuccess = () => { archive = archiveRead.result; complete(); };
          const ownedRead = tx.objectStore('sources').getAll(IDBKeyRange.bound(sourcePrefix, sourcePrefix + '\uffff'), 1003); ownedRead.onsuccess = () => { currentSources = ownedRead.result; complete(); };
          tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(Error(failure));
        });
        return { added: writes.size, alreadyHeld };
      } catch (cause) { if (!(cause instanceof Error) || cause.message !== 'PROOF_IMPORT_RETRY' || attempt === 2) throw cause; }
    }
    throw Error('PROOF_IMPORT_NOT_COMMITTED');
  } finally { db.close(); }
}
