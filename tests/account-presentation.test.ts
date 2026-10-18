import { expect, it } from 'vitest';
import { projectPersonalHistory } from '../src/receiz/personal-history';
import { projectAccountShowcase } from '../src/receiz/account-showcase';
import { parsePublicMarket } from '../src/receiz/public-market';
import { appendWalletPoint, KAI_DAY_UPULSES, settlementDayChange, settlementVisibleChange } from '../src/receiz/wallet-series';
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
it('shows real available movement with its observed interval when the Kai-day opening is absent', () => {
  const wallet = { userId: 'owner', totalUsdCents: '10000', reserveUsdCents: '0', settlementUsdCents: '10000' } as SharedWallet;
  const first = appendWalletPoint([], wallet, '2026-10-14T10:00:00Z', '17491270422');
  const points = appendWalletPoint(first, { ...wallet, totalUsdCents: '9000', settlementUsdCents: '9000' }, '2026-10-14T10:01:00Z', '17491270423');
  expect(settlementVisibleChange(points)).toMatchObject({ deltaCents: '-1000', percent: -10, period: 'observed', from: '2026-10-14T10:00:00Z' });
  expect(settlementVisibleChange(first)).toBeNull();
});
it('limits a partial day change to observations in the current Kai day', () => {
  const wallet = { userId: 'owner', totalUsdCents: '100', reserveUsdCents: '0', settlementUsdCents: '100' } as SharedWallet;
  // The older point lacks a day coordinate and cannot provide a day opening.
  const older = appendWalletPoint([], wallet, '2026-10-12T10:00:00Z', null);
  const first = appendWalletPoint(older, { ...wallet, totalUsdCents: '10000', settlementUsdCents: '10000' }, '2026-10-14T10:00:00Z', '17491270422');
  const current = appendWalletPoint(first, { ...wallet, totalUsdCents: '12000', settlementUsdCents: '12000' }, '2026-10-14T10:01:00Z', '17491270423');
  expect(settlementVisibleChange(current)).toMatchObject({ deltaCents: '2000', percent: 20, period: 'observed', from: '2026-10-14T10:00:00Z' });
  expect(settlementVisibleChange(first)).toBeNull();
});
it('keeps the true financial beginning when reducing a long display history', () => {
  const history=Array.from({length:4100},(_,i)=>({userId:'owner',at:new Date(1700000000000+i*1000).toISOString(),kaiUPulse:String(i),totalUsdCents:String(10000+i),reserveUsdCents:'0',settlementUsdCents:String(10000+i)}));
  const latest={userId:'owner',totalUsdCents:'15000',reserveUsdCents:'0',settlementUsdCents:'15000'} as SharedWallet;
  const retained=appendWalletPoint(history,latest,new Date(1700005000000).toISOString(),'5000');
  expect(retained.length).toBeLessThanOrEqual(4096);expect(retained[0]).toEqual(history[0]);expect(retained.at(-1)?.totalUsdCents).toBe('15000');
});
it('does not use an ancient restored financial point as the current day opening', () => {
  const wallet = { userId: 'owner', totalUsdCents: '100', reserveUsdCents: '0', settlementUsdCents: '100' } as SharedWallet;
  const start=KAI_DAY_UPULSES*3n;
  const older=appendWalletPoint([],wallet,'2024-05-10T03:00:00Z','1');
  const first=appendWalletPoint(older,{...wallet,totalUsdCents:'10000',settlementUsdCents:'10000'},'2026-10-14T10:00:00Z',String(start+1n));
  const current=appendWalletPoint(first,{...wallet,totalUsdCents:'12000',settlementUsdCents:'12000'},'2026-10-14T10:01:00Z',String(start+10n));
  expect(settlementDayChange(current,String(start+10n))).toBeNull();
  expect(settlementVisibleChange(current)).toMatchObject({deltaCents:'2000',percent:20,period:'observed',from:'2026-10-14T10:00:00Z'});
});
it('uses only the current calendar day when observations have no Kai coordinate', () => {
  const wallet={userId:'owner',totalUsdCents:'100',reserveUsdCents:'0',settlementUsdCents:'100'} as SharedWallet;
  const at=(day:number,hour:number)=>new Date(2026,9,day,hour).toISOString();
  const previous=appendWalletPoint([],wallet,at(13,18),null);
  const first=appendWalletPoint(previous,{...wallet,totalUsdCents:'10000',settlementUsdCents:'10000'},at(14,10),null);
  const current=appendWalletPoint(first,{...wallet,totalUsdCents:'12000',settlementUsdCents:'12000'},at(14,12),null);
  expect(settlementVisibleChange(current)).toMatchObject({deltaCents:'2000',percent:20,period:'observed',from:at(14,10)});
});
