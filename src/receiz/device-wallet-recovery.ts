import { createReceizInMemoryAdmissionStore, type ReceizAdmissionStore } from '../../native/receiz/packages/receiz-sdk/src/admissionStore';
import { loadReceiz } from './client';

export type DeviceWalletArchive = Readonly<{
  read(key: string): Promise<Uint8Array | null>;
  write(key: string, previousDigest: string | null, bytes: Uint8Array): Promise<boolean>;
}>;

type Seed = Parameters<ReceizAdmissionStore['seedAggregate']>[0];
type Unit = Parameters<ReceizAdmissionStore['commit']>[0];
type JournalEntry = { seed: Seed } | { units: readonly Unit[] };
const conflict = 'BANK_WALLET_DEVICE_ARCHIVE_CONFLICT';
const invalid = 'BANK_WALLET_DEVICE_ARCHIVE_INVALID';
const encode = (value: unknown) => new TextEncoder().encode(JSON.stringify(value));
const decode = (bytes: Uint8Array): unknown => JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));

/** Match the browser vault's identity-bound encryption at the native port. */
export function sealDeviceWalletArchive(archive: DeviceWalletArchive, wrappingKey: CryptoKey, assertOpen: () => void): DeviceWalletArchive {
  const associated = (key: string) => encode(['bankeiz.device-wallet.encrypted.v1', key]);
  async function open(key: string, stored: Uint8Array) {
    if (stored.length < 28) throw Error(invalid);
    return new Uint8Array(await crypto.subtle.decrypt({
      name: 'AES-GCM', iv: stored.slice(0, 12), additionalData: associated(key),
    }, wrappingKey, stored.slice(12)));
  }
  return {
    async read(key) {
      assertOpen();
      const stored = await archive.read(key);
      const exact = stored ? await open(key, stored) : null;
      assertOpen();
      return exact;
    },
    async write(key, previousDigest, bytes) {
      assertOpen();
      const sdk = await loadReceiz(), stored = await archive.read(key);
      if ((stored ? await sdk.sha256ReceizBytes(await open(key, stored)) : null) !== previousDigest) return false;
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const encrypted = new Uint8Array(await crypto.subtle.encrypt({
        name: 'AES-GCM', iv, additionalData: associated(key),
      }, wrappingKey, bytes.slice()));
      const packet = new Uint8Array(iv.length + encrypted.length);
      packet.set(iv);
      packet.set(encrypted, iv.length);
      assertOpen();
      return archive.write(key, stored ? await sdk.sha256ReceizBytes(stored) : null, packet);
    },
  };
}

/** The phone retains the SDK's exact Originals and admission transactions.
 * The SDK still owns admission, chronology, balances and outbox generation. */
export function createDeviceWalletRecovery(archive: DeviceWalletArchive, owner: Readonly<{
  accountUid: string; keyId: string; recordSignerPublicKey: string;
}>) {
  const hash = async (bytes: Uint8Array) => (await loadReceiz()).sha256ReceizBytes(bytes);
  const key = (family: string, name: string) => hash(encode([
    'bankeiz.device-wallet.archive.v1', owner.accountUid, owner.keyId, owner.recordSignerPublicKey, family, name,
  ]));
  const journalKey = (index: number) => key('admission', String(index));
  const createStore = () => createReceizInMemoryAdmissionStore({ maxRecordsPerTransaction: 8192 });
  let store = createStore();
  let length = 0;
  let tail: Promise<unknown> = Promise.resolve();

  async function refresh() {
    while (true) {
      const bytes = await archive.read(await journalKey(length));
      if (!bytes) return;
      const entry = decode(bytes) as JournalEntry;
      if ('seed' in entry) await store.seedAggregate(entry.seed);
      else {
        const results = await store.commitBatch!(entry.units);
        if (results.length !== entry.units.length || results.some(result => result.status !== 'committed'))
          throw Error(invalid);
      }
      length++;
    }
  }
  function access<T>(work: () => Promise<T>): Promise<T> {
    const result = tail.then(async () => {
      try {
        await refresh();
        return await work();
      } catch (error) {
        store = createStore();
        length = 0;
        throw error;
      }
    });
    tail = result.catch(() => {});
    return result;
  }
  async function append(entry: JournalEntry) {
    if (!await archive.write(await journalKey(length), null, encode(entry))) throw Error(conflict);
    length++;
  }
  async function commit(units: readonly Unit[]) {
    const copied = structuredClone(units);
    return access(async () => {
      const results = await store.commitBatch!(copied);
      if (results.length === copied.length && results.every(result => result.status === 'committed'))
        await append({ units: copied });
      return results;
    });
  }
  const admission: ReceizAdmissionStore = {
    readAggregate: id => access(() => store.readAggregate(id)),
    readIdempotency: id => access(() => store.readIdempotency(id)),
    inspect: () => access(() => store.inspect()),
    seedAggregate(input) {
      const seed = structuredClone(input);
      return access(async () => {
        await store.seedAggregate(seed);
        await append({ seed });
      });
    },
    async commit(unit) { return (await commit([unit]))[0]!; },
    commitBatch: commit,
  };

  async function readOriginal(digest: string) {
    const bytes = await archive.read(await key('original', digest));
    if (bytes && await hash(bytes) !== digest) throw Error(invalid);
    return bytes;
  }
  return {
    admission,
    originals: {
      read: readOriginal,
      async retain(digest: string, bytes: Uint8Array) {
        const exact = bytes.slice();
        if (await hash(exact) !== digest) throw Error(invalid);
        if (!await archive.write(await key('original', digest), null, exact) && !await readOriginal(digest))
          throw Error(conflict);
      },
    },
    async readState(name: string) {
      const bytes = await archive.read(await key('state', name));
      return bytes ? decode(bytes) : null;
    },
    async writeState(name: string, next: unknown, previous: unknown) {
      const record = await key('state', name);
      const before = await archive.read(record);
      if (JSON.stringify(before ? decode(before) : null) !== JSON.stringify(previous)
        || !await archive.write(record, before ? await hash(before) : null, encode(next)))
        throw Error(conflict);
    },
  };
}
