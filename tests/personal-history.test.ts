import { expect, it } from 'vitest';
import type { ReceizIdentityAccountProjection } from '@receiz/sdk';
import { projectPersonalHistory } from '../src/receiz/personal-history';
function projection(state: unknown) { return { authority: 'verified-identity-portable-state', portableStateVerified: true, owner: { uid: 'owner' }, verifiedState: state, completeAtSealedHead: true } as ReceizIdentityAccountProjection; }
it('projects only the opened identity portable history and never substitutes public activity', () => {
  const history = projectPersonalHistory(projection({ account: { userId: 'owner' }, ledger: { entries: [{ entryHash: 'a', actionKind: 'wallet.transfer', payload: { summary: 'My transfer', amountUsdCents: '100' }, kaiPulse: '123' }] }, wallet: { ledgerEntries: [] } }));
  expect(history.records[0].title).toBe('My transfer'); expect(history.records[0].pulse).toBe('123');
  expect(projectPersonalHistory({ authority: 'identity-only', portableStateVerified: false } as ReceizIdentityAccountProjection).records).toEqual([]);
  expect(() => projectPersonalHistory(projection({ account: { userId: 'other' } }))).toThrow('different identity');
});
