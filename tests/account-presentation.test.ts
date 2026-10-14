import { expect, it } from 'vitest';
import { projectPersonalHistory } from '../src/receiz/personal-history';
import { projectAccountShowcase } from '../src/receiz/account-showcase';
import { parsePublicMarket } from '../src/receiz/public-market';
import { appendWalletPoint, settlementDayChange } from '../src/receiz/wallet-series';
import type { ReceizIdentityAccountProjection } from '@receiz/sdk';
import type { SharedWallet } from '../src/receiz/shared-wallet';
const projected = (state: unknown) => ({ authority: 'verified-identity-portable-state', portableStateVerified: true, owner: { uid: 'owner' }, verifiedState: state, completeAtSealedHead: true }) as ReceizIdentityAccountProjection;
it('opens alternate carried ledger domains and transfer history from the same admitted account', () => {
  const history = projectPersonalHistory(projected({ account: { userId: 'owner' }, actionLedgerEntries: [{ entry_hash: 'a', action_kind: 'record', occurred_at: '2026-10-14T10:00:00Z', payload: { summary: 'Sealed painting' } }], wallet: { chatTransfers: [{ id: 't', sender_user_id: 'owner', recipient_user_id: 'friend', amount_usd_cents: '500', created_at: '2026-10-14T11:00:00Z', kai_pulse: '15000000' }] } }), 'owner');
  expect(history.records.map(row => row.title)).toContain('Sealed painting');
  expect(history.records.find(row => row.sourceId === 'transfer:t')?.amountUsdCents).toBe('500');
});
it('shows public showcase objects only for the account presentation username', () => {
  const catalog = parsePublicMarket({ ok: true, transport: { publicOriginals: [{ id: '1', receizId: 'a', title: 'Painting', ownerUsername: 'current' }, { id: '2', receizId: 'b', title: 'Foreign', ownerUsername: 'other' }] } });
  expect(projectAccountShowcase(catalog, 'current').map(item => item.title)).toEqual(['Painting']);
  expect(projectAccountShowcase(catalog, null)).toEqual([]);
});
it('compares settlement with the last observed balance before the exact v129 Kai day boundary', () => {
  const wallet = { userId: 'owner', totalUsdCents: '13000', reserveUsdCents: '1000', settlementUsdCents: '12000' } as SharedWallet;
  const before = appendWalletPoint([], { ...wallet, settlementUsdCents: '10000', totalUsdCents: '11000' }, '2026-10-14T10:00:00Z', '17491270420');
  const current = appendWalletPoint(before, wallet, '2026-10-14T10:01:00Z', '17491270422');
  expect(settlementDayChange(current, '17491270422')).toMatchObject({ deltaCents: '2000', percent: 20 });
  expect(settlementDayChange(current.slice(1), '17491270422')).toBeNull();
  expect(appendWalletPoint(current, { ...wallet, userId: 'different' }, '2026-10-14T10:02:00Z', '17491270423')).toHaveLength(1);
});
