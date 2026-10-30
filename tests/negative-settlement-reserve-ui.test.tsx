// @vitest-environment happy-dom
import fixture from './fixtures/negative-settlement-reserve.json';
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {expect,it,vi} from 'vitest';
import {BalanceDetails} from '../src/features/account/BalanceDetails';
import {parseSharedWallet} from '../src/receiz/shared-wallet';
import {currentWalletObservation} from '../src/receiz/current-wallet-valuation';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
it.each([1,2,3])('keeps the Settlement explanation inspectable for funded-negative native frame %s',async index=>{
 const packet=fixture.cases[index],wallet=parseSharedWallet(packet,packet.wallet.userId),observation=currentWalletObservation(wallet)!;
 const host=document.createElement('div'),root=createRoot(host),fetch=vi.spyOn(globalThis,'fetch').mockImplementation(()=>{throw Error('NETWORK_FORBIDDEN');});
 try{
  await act(async()=>{root.render(<BalanceDetails wallet={wallet} observation={observation} focusSettlement/>);await import('../src/features/account/BalanceCalculationDetails');});
  const settlement=host.querySelector<HTMLDetailsElement>('[data-balance-rail="settlement"]');
  expect(settlement).not.toBeNull();expect(settlement!.open).toBe(true);
  const details=settlement!.querySelector<HTMLDetailsElement>('.balance-calculation')!;
  await act(async()=>details.querySelector('summary')!.click());
  const steps=Array.from(details.querySelectorAll('.balance-calculation-steps li'));
  const beforeFloor=steps.find(row=>row.querySelector('strong')?.textContent==='Settlement before display floor');
  expect(beforeFloor?.textContent).toContain('-50000 USD cents');
  expect(beforeFloor?.textContent).toContain(packet.depositUsdCents);
  expect(details.textContent).toContain(wallet.totalUsdCents==='20000'?'$200.00':'$0.00');
  expect(host.querySelector('[data-balance-rail="reserve"] summary strong')?.textContent).toBe(index===1?'$200.00':index===2?'$500.00':'$700.00');
  expect(fetch).not.toHaveBeenCalled();
 }finally{await act(async()=>root.unmount());fetch.mockRestore();}
});
it('preserves the same open Settlement calculation when recovery reaches Reserve equality',async()=>{
 const packet=fixture.cases[3],wallet=parseSharedWallet(packet,packet.wallet.userId),observation=currentWalletObservation(wallet)!;
 const host=document.createElement('div'),root=createRoot(host);
 try{
  await act(async()=>{root.render(<BalanceDetails wallet={wallet} observation={observation}/>);await import('../src/features/account/BalanceCalculationDetails');});
  await act(async()=>host.querySelector<HTMLDetailsElement>('.balance-source-details')!.querySelector('summary')!.click());
  const settlement=host.querySelector<HTMLDetailsElement>('[data-balance-rail="settlement"]')!;
  await act(async()=>settlement.querySelector('summary')!.click());
  const calculation=settlement.querySelector<HTMLDetailsElement>('.balance-calculation')!;
  await act(async()=>calculation.querySelector('summary')!.click());
  const recovered={...wallet,totalUsdCents:'70000'};
  await act(async()=>root.render(<BalanceDetails wallet={recovered} observation={null}/>));
  expect(host.querySelector('[data-balance-rail="settlement"]')).toBe(settlement);expect(settlement.open).toBe(true);
  expect(settlement.querySelector('.balance-calculation')).toBe(calculation);expect(calculation.open).toBe(true);
  await act(async()=>root.render(<BalanceDetails wallet={{...recovered,totalUsdCents:'70001',settlementUsdCents:'1'}} observation={null}/>));
  expect(host.querySelector('[data-balance-rail="settlement"]')).toBe(settlement);expect(calculation.open).toBe(true);
 }finally{await act(async()=>root.unmount());}
});
