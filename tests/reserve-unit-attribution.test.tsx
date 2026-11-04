// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {expect,it,vi} from 'vitest';
import {parseSharedWallet,retainWalletPhiSplit} from '../src/receiz/shared-wallet';
import {readWalletObservation} from '../src/receiz/wallet-observation';
import {BANK_APPLICATION_ID} from '../src/receiz/config';
import {BalanceDetails} from '../src/features/account/BalanceDetails';
import * as calculations from '../src/receiz/balance-calculation';
const uid='11111111-1111-4111-8111-111111111111',at='2026-11-04T01:06:34.867364+00:00',kai='14978960035736';
const attribution={basis:'calculated-attribution',rule:'receiz-card-fifo-cent-intervals',accountId:uid,lastEntryId:'22222222-2222-4222-8222-222222222222',lastEntryAt:at,lastEntryKaiUpulse:kai,recordedReserveUsdCents:'192',reservePhiMicro:'27219',lots:[{ledgerId:'33333333-3333-4333-8333-333333333333',amountPhiMicro:'8506085386',amountUsdCents:'60000000',reserveUsdCents:'192',usedReserveUsdCents:'0',creditReservePhiMicro:'27219',remainingReservePhiMicro:'27219'}]};
const packet=()=>({ok:true,wallet:{userId:uid,balancePhiMicro:'143714996830',balanceUsd:'10009511.52',reservePhiMicro:null,settlementPhiMicro:null,
 reserveUnitAttribution:attribution,valueStates:{settledBalanceUsdCents:'192',ecosystemBalanceUsdCents:'1000950960'},sync:{projectionComplete:true},rollup:{lastEntryAt:at,lastEntryKaiUpulse:kai,lastEntryKaiPulse:'14978960'}}});
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
it('keeps the recorded Reserve units when a same-head chart update omits duplicate funding data',()=>{
 const previous=parseSharedWallet(packet(),uid),thin=packet();
 delete (thin.wallet as Partial<typeof thin.wallet>).reserveUnitAttribution;
 const next=parseSharedWallet(thin,uid);
 expect(next.reserveUnitAttribution).toBeUndefined();
 const retained=retainWalletPhiSplit(previous,next);
 expect(retained.reserveUnitAttribution).toEqual(previous.reserveUnitAttribution);
 expect(retained.reservePhiMicro).toBeNull();
 expect(retained.settlementPhiMicro).toBeNull();
 const repriced={...next,totalUsdCents:'1000951153',settlementUsdCents:'1000950961',balancePhiMicro:'143714996831'};
 expect(retainWalletPhiSplit(previous,repriced).reserveUnitAttribution).toEqual(previous.reserveUnitAttribution);
 for(const changed of [{...next,userId:'another-account'},{...next,reserveUsdCents:'193'},
  {...next,lastEntryAt:'2026-11-04T01:06:35Z'},{...next,kaiUpulse:'14978960035737'}]){
  expect(retainWalletPhiSplit(previous,changed).reserveUnitAttribution).toBeUndefined();
 }
});
it('retains recorded Reserve unit attribution across a private observation reopen without changing native units',()=>{
 const wallet=parseSharedWallet(packet(),uid);expect(wallet.reserveUnitAttribution?.reservePhiMicro).toBe('27219');
 expect(wallet.reservePhiMicro).toBeNull();expect(wallet.settlementPhiMicro).toBeNull();
 const binding={keyId:'existing-observation',artifactSha256:'a'.repeat(64)};
 const restored=readWalletObservation(JSON.parse(JSON.stringify({schema:'receiz.bank.private-wallet-observation.v1',authority:'read-only-observation',applicationId:BANK_APPLICATION_ID,...binding,wallet,observedAt:'2026-11-04T02:00:00Z'})),binding);
 expect(restored?.wallet.reserveUnitAttribution).toEqual(wallet.reserveUnitAttribution);
 const stale=packet();stale.wallet.rollup.lastEntryKaiUpulse='14978960035737';
 expect(parseSharedWallet(stale,uid).reserveUnitAttribution).toBeUndefined();
});
it('opens Reserve with its carried Phi and full calculation disclosure without fetching',async()=>{
 const wallet=parseSharedWallet(packet(),uid),host=document.createElement('div'),root=createRoot(host),fetch=vi.spyOn(globalThis,'fetch').mockImplementation(()=>{throw Error('NETWORK_FORBIDDEN');}),calculation=vi.spyOn(calculations,'readBalanceCalculation');
 try{
  await act(async()=>root.render(<BalanceDetails wallet={wallet}/>));
  await act(async()=>host.querySelector<HTMLElement>('.balance-source-details > summary')!.click());
  await act(async()=>host.querySelector<HTMLElement>('[data-balance-rail="reserve"] > summary')!.click());
  expect(host.querySelector('[data-balance-rail="reserve"] [data-rail-phi]')?.textContent).toBe('Reserve total · 0.027219 Φ');
  expect(host.textContent).not.toContain('Exact Φ unavailable');
  await act(async()=>{await vi.dynamicImportSettled();});
  await act(async()=>host.querySelector<HTMLElement>('[data-balance-rail="reserve"] .balance-calculation > summary')!.click());
  expect(host.querySelector('[aria-label="Recorded Reserve unit attribution"]')).not.toBeNull();
  const bindings=host.querySelector('[data-balance-rail="reserve"] .balance-calculation-bindings')!;
  expect(bindings.textContent).toContain('Displayed Reserve$1.92');
  expect(bindings.textContent).toContain(kai);
  expect(bindings.textContent).toContain('Recorded funding allocation');
  expect(host.querySelector('[data-balance-rail="reserve"]')?.textContent).not.toContain('Exact calculation source not carried');
  const thin=packet();delete (thin.wallet as Partial<typeof thin.wallet>).reserveUnitAttribution;
  await act(async()=>root.render(<BalanceDetails wallet={retainWalletPhiSplit(wallet,parseSharedWallet(thin,uid))}/>));
  expect(host.querySelector('[data-balance-rail="reserve"] [data-rail-phi]')?.textContent).toBe('Reserve total · 0.027219 Φ');
  expect(host.querySelector('[aria-label="Recorded Reserve unit attribution"]')).not.toBeNull();
  expect(calculation).not.toHaveBeenCalled();
  expect(fetch).not.toHaveBeenCalled();
 }finally{act(()=>root.unmount());fetch.mockRestore();calculation.mockRestore();}
});
it('shows Settlement-only Phi beside the already-held Reserve attribution without changing either source',async()=>{
 const wallet={...parseSharedWallet(packet(),uid),balancePhiMicro:'143753582614'},before=JSON.stringify(wallet),host=document.createElement('div'),root=createRoot(host),fetch=vi.spyOn(globalThis,'fetch').mockImplementation(()=>{throw Error('NETWORK_FORBIDDEN');});
 try{
  await act(async()=>root.render(<BalanceDetails wallet={wallet} focusSettlement/>));
  await act(async()=>host.querySelector<HTMLElement>('[data-balance-rail="reserve"] > summary')!.click());
  expect(host.querySelector('[data-balance-rail="settlement"] [data-rail-phi]')?.textContent).toBe('Settlement total · 143753.555395 Φ');
  expect(host.querySelector('[data-balance-rail="reserve"] [data-rail-phi]')?.textContent).toBe('Reserve total · 0.027219 Φ');
  expect(host.textContent).not.toContain('Account total (includes Reserve)');
  expect(wallet.settlementPhiMicro).toBeNull();expect(wallet.reservePhiMicro).toBeNull();expect(JSON.stringify(wallet)).toBe(before);expect(fetch).not.toHaveBeenCalled();
 }finally{act(()=>root.unmount());fetch.mockRestore();}
});
it.each([
 {userId:'another-account'},
 {lastEntryAt:'2026-11-04T01:06:35Z'},
 {kaiUpulse:'14978960035737'},
 {reserveUsdCents:'193'},
 {currentBalanceSource:{userId:'another-account'}},
 {balancePhiMicro:'27218'},
])('does not disclose an attributed Settlement split across a changed or negative unit frame %s',async patch=>{
 const wallet={...parseSharedWallet(packet(),uid),...patch} as ReturnType<typeof parseSharedWallet>,host=document.createElement('div'),root=createRoot(host);
 try{
  await act(async()=>root.render(<BalanceDetails wallet={wallet} focusSettlement/>));
  expect(host.querySelector('[data-balance-rail="settlement"] [data-rail-phi]')?.textContent).toBe('Exact Φ unavailable');
  expect(host.querySelector('[data-balance-rail="settlement"]')?.textContent).not.toContain('Account total');
 }finally{act(()=>root.unmount());}
});
it('keeps directly carried native units above the optional attribution and refuses conflicting partial units',async()=>{
 const wallet={...parseSharedWallet(packet(),uid),balancePhiMicro:'143753582614',reservePhiMicro:'30000',settlementPhiMicro:'143753552614'},host=document.createElement('div'),root=createRoot(host);
 try{
  await act(async()=>root.render(<BalanceDetails wallet={wallet} focusSettlement/>));
  await act(async()=>host.querySelector<HTMLElement>('[data-balance-rail="reserve"] > summary')!.click());
  expect(host.querySelector('[data-balance-rail="settlement"] [data-rail-phi]')?.textContent).toBe('Settlement total · 143753.552614 Φ');
  expect(host.querySelector('[data-balance-rail="reserve"] [data-rail-phi]')?.textContent).toBe('Reserve total · 0.03 Φ');
  await act(async()=>root.render(<BalanceDetails wallet={{...wallet,reservePhiMicro:null}} focusSettlement/>));
  expect(host.querySelector('[data-balance-rail="settlement"] [data-rail-phi]')?.textContent).toBe('Settlement total · 143753.552614 Φ');
  expect(host.querySelector('[data-balance-rail="reserve"] [data-rail-phi]')?.textContent).toBe('Exact Φ unavailable');
 }finally{act(()=>root.unmount());}
});
