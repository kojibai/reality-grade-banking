import { loadReceiz } from './client';
import { verifyNearbyWalletPayment, type NearbyWalletPayment, type NearbyWalletSplit } from './wallet-nearby-consent';

type AmountAndRecipient = { recipient: string; amountUsdCents: string; note?: string };
export type DeferredWalletSendReview = Readonly<{
  accountUid: string;
  recipientUserId: string;
  recipientLabel: string;
  amountUsdCents: string;
  note?: string;
  clientNonce: string;
  nearby?: true;
  split?: NearbyWalletSplit;
  confirmationDigest: string;
}>;
export type DeferredWalletSendEntry = DeferredWalletSendReview & Readonly<{ status: 'pending' | 'recorded' | 'not-sent'; payment?: NearbyWalletPayment }>;
type Ports = {
  account(): { accountUid: string; availableUsdCents: string | null } | null;
  online(): boolean;
  lock<T>(work: () => Promise<T>): Promise<T>;
  store: {
    read(): Promise<unknown>;
    write(next: readonly DeferredWalletSendEntry[], previous: unknown): Promise<void>;
  };
  signNearby?(review: DeferredWalletSendReview): Promise<NearbyWalletPayment>;
  deliver(entry: DeferredWalletSendEntry): Promise<'recorded' | 'not-sent' | 'unknown'>;
};

const accountId = (value: unknown): value is string => typeof value === 'string'
  && /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value);
const splitId = /^[a-f0-9]{8}-[a-f0-9]{4}-8[a-f0-9]{3}-a[a-f0-9]{3}-[a-f0-9]{12}$/u;
const amount = (value: unknown): value is string => typeof value === 'string' && /^[1-9]\d{0,19}$/.test(value);
const approvalDigest = async (review: Omit<DeferredWalletSendReview, 'confirmationDigest'>) =>
  (await loadReceiz()).digestReceizCanonicalV122({ schema: 'bank.wallet.deferred-send-review.v1', ...review });

/** Retains a delivery instruction. Spending and the accepted original still
 * come from the regular connected Wallet writer when the sender reconnects. */
export function createDeferredWalletSend(input: Ports) {
  async function checkPayment(review: DeferredWalletSendReview, value: unknown) {
    const payment = await verifyNearbyWalletPayment(value);
    if (payment.senderUserId !== review.accountUid || payment.recipientUserId !== review.recipientUserId
      || payment.clientNonce !== review.clientNonce || payment.amountUsdCents !== review.amountUsdCents
      || payment.note !== (review.note ?? null)
      || payment.split?.conversationId !== review.split?.conversationId
      || payment.split?.offlineUsdCents !== review.split?.offlineUsdCents) throw Error('BANK_WALLET_QUEUE_INVALID');
    return payment;
  }
  const held = new WeakSet<DeferredWalletSendReview>();
  const listeners = new Set<() => void>();
  let resuming: Promise<void> | undefined;
  function announce() {
    for (const listener of listeners) {
      try { listener(); } catch { /* A view cannot interrupt settlement. */ }
    }
  }
  async function read(): Promise<{ raw: unknown; entries: readonly DeferredWalletSendEntry[] }> {
    const raw = await input.store.read();
    if (raw == null) return { raw, entries: [] as readonly DeferredWalletSendEntry[] };
    if (!Array.isArray(raw) || raw.length > 1000) throw Error('BANK_WALLET_QUEUE_INVALID');
    const entries = raw as DeferredWalletSendEntry[];
    const nonces = new Set<string>();
    for (const entry of entries) {
      if (!entry || !accountId(entry.accountUid) || !accountId(entry.recipientUserId) || entry.accountUid === entry.recipientUserId
        || !(entry.split?splitId.test(entry.clientNonce):accountId(entry.clientNonce)) || !amount(entry.amountUsdCents) || !['pending', 'recorded', 'not-sent'].includes(entry.status)
        || typeof entry.recipientLabel !== 'string' || !entry.recipientLabel || entry.recipientLabel.length > 128
        || entry.note !== undefined && (typeof entry.note !== 'string' || !entry.note || entry.note.length > 280)
        || nonces.has(entry.clientNonce)) throw Error('BANK_WALLET_QUEUE_INVALID');
      const { confirmationDigest, status: _status, payment, ...review } = entry;
      if (entry.nearby === true) await checkPayment(entry, payment);
      else if (entry.nearby !== undefined || payment !== undefined || entry.split !== undefined) throw Error('BANK_WALLET_QUEUE_INVALID');
      if (confirmationDigest !== await approvalDigest(review)) throw Error('BANK_WALLET_QUEUE_INVALID');
      nonces.add(entry.clientNonce);
    }
    return { raw, entries };
  }
  function account() {
    const value = input.account();
    if (!value || !accountId(value.accountUid) || value.availableUsdCents===null || !/^(0|[1-9]\d{0,19})$/.test(value.availableUsdCents))
      throw Error('BANK_WALLET_QUEUE_BALANCE_REQUIRED');
    return { accountUid:value.accountUid, availableUsdCents:value.availableUsdCents };
  }
  return {
    async prepare(value: AmountAndRecipient, recipientLabel = value.recipient, nearby = false, split?: NearbyWalletSplit): Promise<DeferredWalletSendReview> {
      const { accountUid } = account();
      const recipientUserId = value.recipient.toLowerCase();
      if (!accountId(recipientUserId) || recipientUserId === accountUid || !recipientLabel || recipientLabel.length > 128)
        throw Error('BANK_WALLET_QUEUE_RECIPIENT_REQUIRED');
      if (split && (!nearby || !splitId.test(split.conversationId) || !amount(split.offlineUsdCents)))
        throw Error('BANK_WALLET_QUEUE_INVALID');
      if (!amount(value.amountUsdCents)) throw Error('Enter an amount greater than zero.');
      const note = value.note?.replace(/\s+/gu, ' ').trim();
      if (note && note.length > 280) throw Error('Use a note of 280 characters or fewer.');
      const review = { accountUid, recipientUserId, recipientLabel, amountUsdCents: value.amountUsdCents,
        ...(note ? { note } : {}), ...(nearby ? {nearby: true as const} : {}), ...(split?{split:Object.freeze({...split})}:{}),
        clientNonce: split?.conversationId ?? crypto.randomUUID() };
      const heldReview = Object.freeze({ ...review, confirmationDigest: await approvalDigest(review) });
      held.add(heldReview);
      return heldReview;
    },
    async approve(review: DeferredWalletSendReview, confirmationDigest: string) {
      return input.lock(async () => {
        if (!held.has(review) || confirmationDigest !== review.confirmationDigest)
          throw Error('BANK_WALLET_EXACT_CONFIRMATION_REQUIRED');
        const { raw, entries } = await read();
        const current = account();
        if (current.accountUid !== review.accountUid || entries.some(entry => entry.accountUid !== current.accountUid))
          throw Error('BANK_WALLET_IDENTITY_CHANGED');
        if(review.split){
          const saved=entries.find(row=>row.clientNonce===review.clientNonce);
          if(saved){
            if(saved.confirmationDigest!==review.confirmationDigest)throw Error('BANK_WALLET_QUEUE_INVALID');
            held.delete(review);
            return saved;
          }
        }
        const allocated = entries.reduce<bigint>((total, entry) =>
          entry.status === 'pending' ? total + BigInt(entry.amountUsdCents) : total, 0n);
        if (allocated + BigInt(review.amountUsdCents) > BigInt(current.availableUsdCents))
          throw Error('BANK_WALLET_QUEUE_AMOUNT_UNAVAILABLE');
        if (entries.length >= 1000) throw Error('BANK_WALLET_CAPACITY');
        const payment = review.nearby ? await input.signNearby?.(review) : undefined;
        if (review.nearby) await checkPayment(review, payment);
        const entry: DeferredWalletSendEntry = { ...review, status: 'pending', ...(payment ? {payment} : {}) };
        await input.store.write([...entries, entry], raw);
        held.delete(review);
        announce();
        return entry;
      });
    },
    abandonUnexposedSplit(conversationId:string) {
      return input.lock(async()=>{
        const {raw,entries}=await read();
        const draft=entries.find(entry=>entry.split?.conversationId===conversationId&&entry.status==='pending');
        if(draft){
          await input.store.write(entries.filter(entry=>entry!==draft),raw);
          announce();
        }
      });
    },
    async list() {
      return (await read()).entries;
    },
    subscribe(listener:()=>void) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    resume() {
      return resuming ??= input.lock(async () => {
        if (!input.online()) return;
        let { raw, entries } = await read();
        const current = input.account();
        if (!current || entries.some(entry => entry.accountUid !== current.accountUid))
          throw Error('BANK_WALLET_IDENTITY_CHANGED');
        for (const entry of entries) {
          if (!input.online()) break;
          if (entry.status !== 'pending') continue;
          const status = await input.deliver(entry).catch(() => 'unknown' as const);
          if (status === 'unknown') continue;
          const next = entries.map(row => row.clientNonce === entry.clientNonce ? { ...row, status } : row);
          await input.store.write(next, raw);
          raw = entries = next;
          announce();
        }
      }).finally(() => { resuming = undefined; });
    },
  };
}
export type DeferredWalletSend = ReturnType<typeof createDeferredWalletSend>;
