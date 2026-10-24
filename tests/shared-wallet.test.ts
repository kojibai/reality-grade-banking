import { expect, it } from 'vitest';
import { parseSharedWallet } from '../src/receiz/shared-wallet';
const input = { ok: true, wallet: { userId: 'same-owner', balanceUsd: '92233720368547758.09', balancePhiMicro: '198123', valueStates: { settledBalanceUsdCents: '103', ecosystemBalanceUsdCents: '9223372036854775706', livePortfolioValueUsdCents: null, unrealizedPnlUsdCents: null, withdrawableNowUsdCents: null }, sync: { projectionComplete: true }, rollup: { lastEntryKaiPulse: '14920000', lastEntryKaiUpulse: '14920000000123' } } };
it('reads exact Reserve, Settlement and total from the same native wallet without counting assets twice', () => {
  const wallet = parseSharedWallet(input, 'same-owner');
  expect(wallet.totalUsdCents).toBe('9223372036854775809'); expect(wallet.reserveUsdCents).toBe('103'); expect(wallet.settlementUsdCents).toBe('9223372036854775706');
  expect(wallet.pulse).toBe('14920000'); expect(wallet.portfolioUsdCents).toBeNull();
});
it('rejects foreign owners, missing rail data and inconsistent totals instead of falling back to demo or zero', () => {
  expect(() => parseSharedWallet(input, 'other')).toThrow();
  expect(() => parseSharedWallet({ ok: true, wallet: { userId: 'same-owner', balanceUsd: '0.00' } }, 'same-owner')).toThrow();
  expect(() => parseSharedWallet({ ...input, wallet: { ...input.wallet, balanceUsd: '1.00' } }, 'same-owner')).toThrow();
});
it('retains a complete account-only balance without treating an incomplete profile projection as complete',()=>{
 const flags={source:'account_only',lawfulActionProjectionAvailable:true,projectionComplete:false};
 const read=(sync:unknown,entitlement:unknown)=>parseSharedWallet({...input,wallet:{...input.wallet,creationSigilEntitlementEnabled:entitlement,sync}},'same-owner');
 expect(read(flags,false)).toMatchObject({projectionComplete:false,accountOnlyComplete:true});
 for(const [sync,entitlement]of [[{...flags,source:'profile_plus_ledger_v1'},false],[{...flags,lawfulActionProjectionAvailable:false},false],[flags,true],[flags,undefined]])expect(read(sync,entitlement).accountOnlyComplete).not.toBe(true);
});
