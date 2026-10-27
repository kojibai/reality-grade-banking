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
it('carries exact source Phi rails independently of unequal funded dollar rates',()=>{
 const raw={...input,wallet:{...input.wallet,balanceUsd:'10.00',balancePhiMicro:'2100000',reservePhiMicro:'100000',settlementPhiMicro:'2000000',valueStates:{...input.wallet.valueStates,settledBalanceUsdCents:'100',ecosystemBalanceUsdCents:'900'}}};
 expect(parseSharedWallet(raw,'same-owner')).toMatchObject({totalUsdCents:'1000',reservePhiMicro:'100000',settlementPhiMicro:'2000000',balancePhiMicro:'2100000'});
});
it('prefers the currently carried native split over top-level fields left behind by a local movement',()=>{
 const wallet={...input.wallet,balanceUsd:'10.00',balancePhiMicro:'2100001',reservePhiMicro:'100000',settlementPhiMicro:'2000000',valueStates:{...input.wallet.valueStates,settledBalanceUsdCents:'100',ecosystemBalanceUsdCents:'900'},bankNoteValueProjection:{schema:'receiz.bank.local-rail-value.v1',reserveBackingPhiMicro:'100001',settlementPhiMicro:'2000000'}};
 expect(parseSharedWallet({ok:true,wallet},'same-owner')).toMatchObject({reservePhiMicro:'100001',settlementPhiMicro:'2000000'});
 const invalid={...wallet,bankNoteValueProjection:{...wallet.bankNoteValueProjection,reserveBackingPhiMicro:'999'}};
 expect(parseSharedWallet({ok:true,wallet:invalid},'same-owner')).toMatchObject({totalUsdCents:'1000',reservePhiMicro:null,settlementPhiMicro:null});
});
it('preserves unknown and legacy Phi splits without deriving from dollars or a current quote',()=>{
 expect(parseSharedWallet(input,'same-owner').reservePhiMicro).toBeUndefined();
 const wallet={...input.wallet,reservePhiMicro:null,settlementPhiMicro:null};
 expect(parseSharedWallet({ok:true,wallet},'same-owner')).toMatchObject({reservePhiMicro:null,settlementPhiMicro:null});
 expect(parseSharedWallet({ok:true,wallet:{...wallet,reservePhiMicro:'198123',settlementPhiMicro:'1'}},'same-owner')).toMatchObject({reservePhiMicro:null,settlementPhiMicro:null});
});
it('carries fixed funded Phi units through the same held-source revaluation without using new dollars',async()=>{
 const {projectUnchangedWalletPhiSplit}=await import('../src/receiz/shared-wallet');
 const before={userId:'owner',totalUsdCents:'1000',reserveUsdCents:'100',settlementUsdCents:'900',balancePhiMicro:'2100000',reservePhiMicro:'100000',settlementPhiMicro:'2000000'} as import('../src/receiz/shared-wallet').SharedWallet;
 expect(projectUnchangedWalletPhiSplit(before,{...before,balancePhiMicro:'2200000',settlementUsdCents:'2000',totalUsdCents:'2100'})).toEqual({reservePhiMicro:'100000',settlementPhiMicro:'2100000'});
 expect(projectUnchangedWalletPhiSplit(before,{...before,balancePhiMicro:'2200000',reserveUsdCents:'101'})).toEqual({reservePhiMicro:null,settlementPhiMicro:null});
 expect(projectUnchangedWalletPhiSplit(before,{...before,reserveUsdCents:'101'})).toEqual({reservePhiMicro:null,settlementPhiMicro:null});
 expect(projectUnchangedWalletPhiSplit(before,{...before,userId:'foreign'})).toEqual({reservePhiMicro:null,settlementPhiMicro:null});
});
