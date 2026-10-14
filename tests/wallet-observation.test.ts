import { expect, it } from 'vitest';
import { readWalletObservation } from '../src/receiz/wallet-observation';
import { BANK_APPLICATION_ID } from '../src/receiz/config';
it('restores only the exact identity-bound, consistent private source observation', () => {
  const binding = { keyId: 'key-a', artifactSha256: 'a'.repeat(64) }, input = { schema: 'receiz.bank.private-wallet-observation.v1', authority: 'read-only-observation', applicationId: BANK_APPLICATION_ID, ...binding, observedAt: '2026-10-13T20:00:00Z', wallet: { userId: 'same-user', totalUsdCents: '300', reserveUsdCents: '100', settlementUsdCents: '200', balancePhiMicro: '1000' } };
  expect(readWalletObservation(input, binding)?.wallet.totalUsdCents).toBe('300');
  expect(readWalletObservation(input, { ...binding, keyId: 'other-key' })).toBeNull();
  expect(readWalletObservation({ ...input, wallet: { ...input.wallet, totalUsdCents: '99999' } }, binding)).toBeNull();
  expect(readWalletObservation({ ...input, authority: 'funding-authority' }, binding)).toBeNull();
});
it('does not turn a signer-authenticated foreign placement into an independently bound wallet', async () => {
  const { readCarriedWalletObservation } = await import('../src/receiz/wallet-observation');
  const projection = { portableStateVerified: true, authority: 'verified-identity-portable-state', owner: { uid: 'local-device' }, verifiedState: { account: { userId: 'foreign' }, exportedAt: '2026-10-14T12:00:00Z', wallet: { routeSummary: { userId: 'foreign', balanceUsd: '1.00', balancePhiMicro: '10', valueStates: { settledBalanceUsdCents: '0', ecosystemBalanceUsdCents: '100' }, sync: {}, rollup: {} } } } } as unknown as import('@receiz/sdk').ReceizIdentityAccountProjection;
  expect(readCarriedWalletObservation(projection)).toBeNull();
  projection.owner.uid = 'foreign';
  expect(readCarriedWalletObservation(projection)?.wallet.totalUsdCents).toBe('100');
});
