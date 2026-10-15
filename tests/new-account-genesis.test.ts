import { expect, it } from 'vitest';
import { appendReceizIdentityPortableState, createReceizIdIdentity, projectReceizIdentityAccount } from '@receiz/sdk';
import { initializeFreshBankAccount } from '../src/receiz/new-account-genesis';
import { readCarriedWalletObservation } from '../src/receiz/wallet-observation';

// Local test signing keys only; no account enrollment, remote admission or funds.
it('carries a signed empty account and its opening chart point from genuine SDK identity creation', async () => {
  const identity = await createReceizIdIdentity({ createdAt: '2026-10-15T22:00:00.000Z' });
  const keyFile = await initializeFreshBankAccount(identity.keyFile);
  const projection = await projectReceizIdentityAccount(keyFile);
  expect(projection.portableStateVerified).toBe(true);
  const observation = readCarriedWalletObservation(projection);
  expect(observation?.source).toBe('account-genesis');
  expect(observation?.wallet).toMatchObject({ userId: identity.localUid, totalUsdCents: '0', reserveUsdCents: '0', settlementUsdCents: '0', balancePhiMicro: '0' });
  expect(observation?.history?.[0]).toMatchObject({ userId: identity.localUid, at: identity.createdAt, totalUsdCents: '0' });
  expect(keyFile.keyId).toBe(identity.keyFile.keyId); expect(keyFile.owner).toEqual(identity.keyFile.owner);
});
it('refuses to initialize a restored account with a carried wallet instead of replacing its balance with zero', async () => {
  const { keyFile } = await createReceizIdIdentity();
  const existing = await appendReceizIdentityPortableState({ keyFile, snapshot: { schema: 'receiz.account.state.v3', account: { userId: keyFile.owner.uid }, wallet: { settledBalanceUsdCents: '1700' } } });
  await expect(initializeFreshBankAccount(existing)).rejects.toThrow('BANK_FRESH_IDENTITY_GENESIS_REQUIRED');
});
it('rejects an altered signed bootstrap proof before signing an initial Bank balance', async () => {
  const { keyFile } = await createReceizIdIdentity();
  const altered = structuredClone(keyFile); altered.portableState!.proof!.signatureB64u = 'invalid';
  await expect(initializeFreshBankAccount(altered)).rejects.toThrow('BANK_FRESH_IDENTITY_GENESIS_REQUIRED');
});
it('uses verified segmented truth instead of a changed inspection alias', async () => {
  const { keyFile } = await createReceizIdIdentity();
  const altered = structuredClone(keyFile); (altered.portableState!.snapshot as Record<string, unknown>).wallet = { balanceUsd: '999999' };
  const initialized = await initializeFreshBankAccount(altered);
  expect(readCarriedWalletObservation(await projectReceizIdentityAccount(initialized))?.wallet.totalUsdCents).toBe('0');
});
