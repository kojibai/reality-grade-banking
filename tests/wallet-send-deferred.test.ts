import { expect, test, vi } from 'vitest';
import { createDeferredWalletSend, type DeferredWalletSendEntry } from '../src/receiz/wallet-send-deferred';

const sender = '10000000-0000-4000-8000-000000000001';
const first = '10000000-0000-4000-8000-000000000002';
const second = '10000000-0000-4000-8000-000000000003';

test('approves multiple distant sends offline and resumes each exact reference after a reopen', async () => {
 let saved: readonly DeferredWalletSendEntry[] | null = null, online = false;
 let firstNonce = '';
 const deliver = vi.fn(async (entry: DeferredWalletSendEntry): Promise<'unknown' | 'recorded'> => {
   if (entry.clientNonce === firstNonce && deliver.mock.calls.length === 1) return 'unknown';
   return 'recorded';
 });
 const open = () => createDeferredWalletSend({
   account: () => ({ accountUid: sender, availableUsdCents: '10000' }),
   online: () => online,
   lock: async work => work(),
   store: {
     read: async () => saved,
     write: async (next, previous) => { expect(previous).toEqual(saved); saved = structuredClone(next); },
   },
   deliver,
 });
 const wallet = open();
 const a = await wallet.prepare({ recipient: first, amountUsdCents: '3000' });
 const b = await wallet.prepare({ recipient: second, amountUsdCents: '7000' });
 await expect(wallet.approve(a, b.confirmationDigest)).rejects.toThrow('BANK_WALLET_EXACT_CONFIRMATION_REQUIRED');
 firstNonce = (await wallet.approve(a, a.confirmationDigest)).clientNonce;
 await wallet.approve(b, b.confirmationDigest);
 const excess = await wallet.prepare({ recipient: first, amountUsdCents: '1' });
 await expect(wallet.approve(excess, excess.confirmationDigest)).rejects.toThrow('BANK_WALLET_QUEUE_AMOUNT_UNAVAILABLE');
 expect(deliver).not.toHaveBeenCalled();

 online = true;
 const reopened = open();
 await reopened.resume();
 expect(deliver.mock.calls.map(([entry]) => entry.recipientUserId)).toEqual([first, second]);
 expect((await reopened.list()).map(entry => entry.status)).toEqual(['pending', 'recorded']);
 await reopened.resume();
 expect(deliver.mock.calls.map(([entry]) => entry.clientNonce)).toEqual([firstNonce, b.clientNonce, firstNonce]);
 expect((await reopened.list()).map(entry => entry.status)).toEqual(['recorded', 'recorded']);
});
