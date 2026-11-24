import { digestReceizCanonicalV122 } from '@receiz/sdk';
import { verifyNearbyWalletPayment, type NearbyWalletPayment } from './wallet-nearby-consent';
import { readWalletTransferOriginal } from './wallet-transfer-original';

type Entry = Readonly<{ payment: NearbyWalletPayment; original?: unknown }>;
type Ports = {
  applicationId: string;
  accountUid(): string;
  online(): boolean;
  lock<T>(work: () => Promise<T>): Promise<T>;
  store: {
    read(): Promise<unknown>;
    write(next: readonly Entry[], expected: unknown): Promise<void>;
  };
  confirm(payment: NearbyWalletPayment): Promise<unknown>;
  onRecorded(): void;
};

export async function readNearbyWalletOriginal(payment: NearbyWalletPayment, raw: unknown) {
  const record = readWalletTransferOriginal(raw);
  const digest = await digestReceizCanonicalV122(payment);
  if (record.senderUserId !== payment.senderUserId || record.recipientUserId !== payment.recipientUserId
    || record.clientNonce !== payment.clientNonce || record.amountUsdCents !== payment.amountUsdCents
    || !record.carried.every(part => part.nearbyConsentDigest === digest)) throw Error('BANK_WALLET_OUTCOME_MISMATCH');
  return record;
}

export function createNearbyWalletReceive(input: Ports) {
  const listeners = new Set<() => void>();
  let resuming: Promise<void> | undefined;
  function announce() {
    for (const listener of listeners) {
      try { listener(); } catch { /* A view cannot interrupt confirmation. */ }
    }
  }
  async function inspect(value: unknown) {
    const payment = await verifyNearbyWalletPayment(value);
    if (payment.recipientUserId !== input.accountUid() || payment.applicationId !== input.applicationId)
      throw Error('BANK_WALLET_NEARBY_WRONG_RECIPIENT');
    return payment;
  }
  async function read() {
    const raw = await input.store.read();
    if (raw == null) return { raw, entries: [] as readonly Entry[] };
    if (!Array.isArray(raw) || raw.length > 1000) throw Error('BANK_WALLET_NEARBY_INBOX_INVALID');
    const seen = new Set<string>();
    for (const row of raw as Entry[]) {
      const payment = await inspect(row.payment);
      if (seen.has(payment.clientNonce)) throw Error('BANK_WALLET_NEARBY_INBOX_INVALID');
      seen.add(payment.clientNonce);
      if (row.original !== undefined) await readNearbyWalletOriginal(payment, row.original);
    }
    return { raw, entries: raw as readonly Entry[] };
  }
  async function confirm(entry: Entry) {
    if (!input.online()) return;
    const original = await input.confirm(entry.payment).catch(() => null);
    if (original === null) return;
    const recorded = await readNearbyWalletOriginal(entry.payment, original).catch(() => null);
    if (!recorded) return;
    await input.lock(async () => {
      const {raw, entries} = await read();
      const current = entries.find(row => row.payment.clientNonce === entry.payment.clientNonce);
      if (!current || current.original !== undefined) return;
      if (await digestReceizCanonicalV122(current.payment) !== await digestReceizCanonicalV122(entry.payment))
        throw Error('BANK_WALLET_NEARBY_INBOX_INVALID');
      await input.store.write(entries.map(row => row === current ? {...row, original} : row), raw);
      input.onRecorded();
      announce();
    });
  }
  async function resume() {
    if (!input.online()) return;
    const {entries} = await read();
    const pending = entries.filter(entry => entry.original === undefined);
    // Connection work stays outside custody writes so another QR can be accepted
    // even while a previous payment is waiting for its original.
    for (let index = 0; index < pending.length && input.online(); index += 4)
      await Promise.allSettled(pending.slice(index,index+4).map(confirm));
  }
  return {
    async receive(value: unknown, via: 'single'|'funded' = 'single'): Promise<Entry> {
      const payment = await inspect(value);
      if(!!payment.split !== (via==='funded'))throw Error('BANK_WALLET_NEARBY_CONSENT_INVALID');
      return input.lock(async () => {
        const { raw, entries } = await read();
        const existing = entries.find(row => row.payment.clientNonce === payment.clientNonce);
        if (existing) {
          if (await digestReceizCanonicalV122(existing.payment) !== await digestReceizCanonicalV122(payment))
            throw Error('BANK_WALLET_NEARBY_INBOX_INVALID');
          return existing;
        }
        if (entries.length >= 1000) throw Error('BANK_WALLET_CAPACITY');
        const entry = {payment};
        await input.store.write([...entries, entry], raw);
        announce();
        return entry;
      });
    },
    async list() { return (await read()).entries; },
    async original(transferId: string) {
      const {entries} = await read();
      for (const entry of entries) {
        if (entry.original === undefined) continue;
        if (readWalletTransferOriginal(entry.original).transferId === transferId) return entry.original;
      }
      return null;
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    resume() {
      return resuming ??= resume().finally(() => { resuming = undefined; });
    },
  };
}
export type NearbyWalletReceive = ReturnType<typeof createNearbyWalletReceive>;
