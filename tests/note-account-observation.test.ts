import { expect, it } from 'vitest';
import { appendReceizIdentityPortableState, createReceizIdIdentity } from '@receiz/sdk';
import { readNoteAccountObservation } from '../src/receiz/note-account-observation';

// Local signing fixtures exercise actual v129 portable-state verification.
// They are display observations, never financial funding or spend authority.
async function fixture() {
  const { keyFile } = await createReceizIdIdentity();
  const wallet = { userId: 'connected-account', balanceUsd: '7.00', balancePhiMicro: '7000000', valueStates: { settledBalanceUsdCents: '300', ecosystemBalanceUsdCents: '400' }, sync: {}, rollup: { lastEntryKaiPulse: '123' } };
  const proof = await appendReceizIdentityPortableState({ keyFile, snapshot: { account: { userId: wallet.userId }, wallet: { routeSummary: wallet } }, exportedAt: '2026-10-17T12:00:00.000Z' });
  return { keyFile, proof, wallet };
}
it('reads the exact signed note successor for the already connected account without network or amount arithmetic', async () => {
  const { keyFile, proof } = await fixture();
  const result = await readNoteAccountObservation(proof, keyFile, 'connected-account');
  expect(result.wallet).toMatchObject({ userId: 'connected-account', totalUsdCents: '700', reserveUsdCents: '300', settlementUsdCents: '400' });
  expect(result.observedAt).toBe('2026-10-17T12:00:00.000Z');
  expect(result.source).toBeUndefined();
});
it('uses SDK verified state rather than a changed snapshot inspection alias', async () => {
  const { keyFile, proof } = await fixture();
  const changed = structuredClone(proof);
  (changed.portableState!.snapshot as { wallet: { routeSummary: unknown } }).wallet.routeSummary = { balanceUsd: '999999.00' };
  expect((await readNoteAccountObservation(changed, keyFile, 'connected-account')).wallet.totalUsdCents).toBe('700');
});
it('refuses an invalid signature, foreign key or a different connected account', async () => {
  const { keyFile, proof } = await fixture();
  const invalid = structuredClone(proof); invalid.portableState!.proof!.signatureB64u = 'invalid';
  await expect(readNoteAccountObservation(invalid, keyFile, 'connected-account')).rejects.toThrow('BANK_NOTE_ACCOUNT_SUCCESSOR_INVALID');
  const foreign = await createReceizIdIdentity();
  await expect(readNoteAccountObservation(proof, foreign.keyFile, 'connected-account')).rejects.toThrow('BANK_NOTE_ACCOUNT_SUCCESSOR_INVALID');
  await expect(readNoteAccountObservation(proof, keyFile, 'another-account')).rejects.toThrow('BANK_NOTE_ACCOUNT_SUCCESSOR_INVALID');
});
