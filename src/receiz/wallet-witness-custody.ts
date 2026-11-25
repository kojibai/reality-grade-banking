import type { FinancialOriginalStore, LocalFinancialRuntime } from './local-financial-runtime';

type WitnessKey = Readonly<{ publicKey: string; privateKey: CryptoKey; encryptionKey: CryptoKey }>;
type EncryptedOriginal = Readonly<{ iv: Uint8Array<ArrayBuffer>; bytes: ArrayBuffer }>;
const marker = 'witness-custody';

async function openCustody(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('receiz-bankeiz-witness', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('custody');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function access<T>(mode: IDBTransactionMode, key: string, value?: unknown): Promise<T | undefined> {
  const db = await openCustody();
  try {
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction('custody', mode, { durability: 'strict' });
      const table = transaction.objectStore('custody');
      const request = mode === 'readonly' ? table.get(key) : table.put(value, key);
      transaction.oncomplete = () => resolve(request.result);
      transaction.onabort = () => reject(transaction.error ?? Error('BANK_WITNESS_CUSTODY_UNAVAILABLE'));
    });
  } finally { db.close(); }
}

export async function walletWitnessKeyOnDevice(applicationId: string) {
  return (await access<WitnessKey>('readonly', 'key:' + applicationId))?.publicKey;
}

/** This device holds the record key and exact witness Originals independently
 * of either Wallet's backup. A surviving key cannot reopen a missing journal. */
export async function openWalletWitnessCustody(
  applicationId: string,
  runtime: LocalFinancialRuntime,
  encode: (bytes: Uint8Array) => string,
) {
  if (!runtime.createWalletAdmissionStore || !navigator.locks) throw Error('BANK_WITNESS_CUSTODY_UNAVAILABLE');
  const openAdmission = runtime.createWalletAdmissionStore;
  const keyRef = 'key:' + applicationId;
  return navigator.locks.request('bankeiz-wallet-witness-key:' + applicationId, async () => {
    let key = await access<WitnessKey>('readonly', keyRef);
    const existing = !!key;
    if (!key) {
      if (navigator.storage?.persist) await navigator.storage.persist().catch(() => false);
      const keys = await crypto.subtle.generateKey('Ed25519', false, ['sign', 'verify']);
      const publicKey = encode(new Uint8Array(await crypto.subtle.exportKey('raw', keys.publicKey)));
      const encryptionKey = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
      key = { publicKey, privateKey: keys.privateKey, encryptionKey };
    }
    const { publicKey, privateKey, encryptionKey } = key;
    const store = openAdmission({ databaseName: 'receiz-bankeiz-witness-admission', namespace: applicationId + ':' + publicKey });
    if (!existing) {
      await store.seedAggregate({ aggregateId: marker, revision: 0, headDigest: publicKey, state: { publicKey } });
      await access('readwrite', keyRef, key);
    }
    const assertRetained = async () => {
      if ((await store.readAggregate(marker))?.headDigest !== publicKey) throw Error('BANK_WITNESS_JOURNAL_REQUIRED');
    };
    await assertRetained();
    const prefix = 'original:' + applicationId + ':' + publicKey + ':';
    const aad = (digest: string) => new TextEncoder().encode(prefix + digest);
    const originals: FinancialOriginalStore = {
      async retain(digest, bytes) {
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: aad(digest) }, encryptionKey, bytes.slice().buffer);
        await access('readwrite', prefix + digest, { iv, bytes: encrypted });
      },
      async read(digest) {
        const original = await access<EncryptedOriginal>('readonly', prefix + digest);
        if (!original) return null;
        return new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: original.iv, additionalData: aad(digest) }, encryptionKey, original.bytes));
      },
    };
    return {
      publicKey, store, originals, assertRetained,
      async signRecord(bytes: Uint8Array) {
        await assertRetained();
        return new Uint8Array(await crypto.subtle.sign('Ed25519', privateKey, bytes.slice().buffer));
      },
    };
  });
}
