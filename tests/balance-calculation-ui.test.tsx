// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {expect,it,vi} from 'vitest';
import {LiveActions} from '../src/features/account/LiveActions';
import * as calculation from '../src/receiz/balance-calculation';
import {projectCompositeWalletAt,type CompositeWalletSource} from '../src/receiz/composite-wallet-history';
import {compositeWalletObservation} from '../src/receiz/composite-wallet-source';
import {formatMoney} from '../src/core/money';
import type {OpenIdentity} from '../src/receiz/native-identity';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
// Already-authenticated display operands only; source admission is qualified
// by the producer tests. This fixture performs no signing or account operation.
function frame(kai:string){
 const source:CompositeWalletSource={schema:'receiz.wallet.chart-source.v129',earningMembershipPolicy:'public-pbi-original-v1',authority:'authenticated-display-source',userId:'owner',throughKaiUPulse:kai,objects:[{id:'own-signed-A',seed:{kind:'sigil',claimPulse:10825210,beat:2,stepIndex:3,creatorVerified:true},intervals:[{fromKaiUPulse:'10825210000000',toKaiUPulse:null}]}],movements:[],lawfulValues:[]};
 const point=projectCompositeWalletAt(source,kai),wallet={userId:'owner',totalUsdCents:point.totalUsdCents,reserveUsdCents:point.reserveUsdCents,settlementUsdCents:point.settlementUsdCents,balancePhiMicro:point.balancePhiMicro!,reservePhiMicro:'0',settlementPhiMicro:point.balancePhiMicro!,portfolioUsdCents:null,pnlUsdCents:null,withdrawableUsdCents:null,projectionComplete:true,pulse:null,kaiUpulse:null};
 return compositeWalletObservation({wallet,observedAt:point.at},source)!;
}
it('opens actual full Original terms lazily and updates the exact same header/Kai/trace frame without new IO',async()=>{
 let current=frame('14710000000123');const identity={knownWallet:()=>current} as unknown as OpenIdentity;
 const host=document.createElement('div'),root=createRoot(host),fetch=vi.spyOn(globalThis,'fetch').mockImplementation(()=>{throw Error('NETWORK_FORBIDDEN');}),inspect=vi.spyOn(calculation,'inspectBalanceOriginal');
 const render=()=>act(async()=>root.render(<LiveActions action={{kind:'balance'}} identity={identity} wallet={current.wallet} onClose={()=>{}} onForget={async()=>{}} onRefresh={()=>{}}/>));
 try{await render();expect(inspect).not.toHaveBeenCalled();expect(host.querySelector('[data-balance-calculation]')).toBeNull();
  const row=host.querySelector<HTMLDetailsElement>('[data-balance-rail="settlement"]')!;await act(async()=>{row.querySelector('summary')!.click();await import('../src/features/account/BalanceCalculationDetails');});
  const details=row.querySelector<HTMLDetailsElement>('.balance-calculation')!;await act(async()=>details.querySelector('summary')!.click());
  expect(details.open).toBe(true);expect(inspect).not.toHaveBeenCalled();expect(host.querySelector('.balance-sheet-amount')?.textContent).toBe(formatMoney(current.wallet.totalUsdCents));
  expect(row.querySelector('.balance-calculation-bindings')?.textContent).toContain('14710000000123');expect(row.querySelector('.balance-calculation-bindings')?.textContent).toContain(formatMoney(current.wallet.totalUsdCents));
  const original=row.querySelector<HTMLDetailsElement>('[data-balance-original="own-signed-A"]')!;await act(async()=>original.querySelector('summary')!.click());
  expect(inspect).toHaveBeenCalledOnce();const first=inspect.mock.results[0].value!;expect(original.querySelectorAll('.balance-calculation-steps li').length).toBe(first.calculation.length);expect(first.calculation.length).toBeGreaterThan(10);expect(original.textContent).toContain(first.calculation[0].label);expect(original.textContent).toContain(first.calculation[0].result);
  current=frame('14710001000123');await render();expect(row.open).toBe(true);expect(original.open).toBe(true);expect(inspect).toHaveBeenCalledTimes(2);
  expect(host.querySelector('.balance-sheet-amount')?.textContent).toBe(formatMoney(current.wallet.totalUsdCents));expect(row.querySelector('.balance-calculation-bindings')?.textContent).toContain('14710001000123');expect(row.querySelector('.balance-calculation-bindings')?.textContent).toContain(formatMoney(current.wallet.totalUsdCents));expect(inspect.mock.results[1].value!.pulse).toBe(14710001);
  const history=row.querySelector<HTMLDetailsElement>('.balance-held-history')!;expect(history.querySelector('pre')).toBeNull();await act(async()=>history.querySelector('summary')!.click());expect(history.querySelector('pre')!.textContent).toContain(current.historyBasis!.endKaiUPulse);
  await act(async()=>row.querySelector('summary')!.click());expect(row.querySelector('[data-balance-calculation]')).toBeNull();current=frame('14710002000123');await render();expect(inspect).toHaveBeenCalledTimes(2);expect(fetch).not.toHaveBeenCalled();
 }finally{act(()=>root.unmount());fetch.mockRestore();inspect.mockRestore();}
});
it('keeps a real native/private production source and full Original calculation aligned while the open view advances',async()=>{
 const packet=(await import('./fixtures/current-balance/private.json')).default;
 const {parseSharedWallet}=await import('../src/receiz/shared-wallet'),{currentWalletObservation,advanceCurrentWalletObservation}=await import('../src/receiz/current-wallet-valuation');
 let current=currentWalletObservation(parseSharedWallet(packet,packet.wallet.userId))!;const identity={knownWallet:()=>current} as unknown as OpenIdentity;
 const host=document.createElement('div'),root=createRoot(host),fetch=vi.spyOn(globalThis,'fetch').mockImplementation(()=>{throw Error('NETWORK_FORBIDDEN');});
 const render=()=>act(async()=>root.render(<LiveActions action={{kind:'balance'}} identity={identity} wallet={current.wallet} onClose={()=>{}} onForget={async()=>{}} onRefresh={()=>{}}/>));
 try{await render();const row=host.querySelector<HTMLDetailsElement>('[data-balance-rail="settlement"]')!;await act(async()=>{row.querySelector('summary')!.click();await import('../src/features/account/BalanceCalculationDetails');});
  const details=row.querySelector<HTMLDetailsElement>('.balance-calculation')!;await act(async()=>details.querySelector('summary')!.click());
  const original=row.querySelector<HTMLDetailsElement>('[data-balance-original]')!;await act(async()=>original.querySelector('summary')!.click());
  expect(original.querySelectorAll('.balance-calculation-steps li').length).toBeGreaterThan(10);expect(original.textContent).toContain(packet.wallet.currentBalanceSource.originalProofReferences[packet.wallet.currentBalanceSource.glyphs[0].id as keyof typeof packet.wallet.currentBalanceSource.originalProofReferences].pbiReceiptHash);expect(original.querySelector('a')?.href).toContain('https://receiz.test/v/');
  const oldTerms=original.querySelector('.balance-calculation-steps')!.textContent;current=advanceCurrentWalletObservation(current,(BigInt(current.historyBasis!.endKaiUPulse)+1_000_000n).toString())!;await render();
  expect(row.open&&details.open&&original.open).toBe(true);expect(host.querySelector('.balance-sheet-amount')?.textContent).toBe(formatMoney(current.wallet.totalUsdCents));expect(details.querySelector('.balance-calculation-bindings')?.textContent).toContain(current.historyBasis!.endKaiUPulse);expect(original.querySelector('.balance-calculation-steps')!.textContent).not.toBe(oldTerms);expect(fetch).not.toHaveBeenCalled();
 }finally{act(()=>root.unmount());fetch.mockRestore();}
});
it('shows the real mixed-rate Reserve receipts and exact live cap while both rail disclosures stay open',async()=>{
 const packet=(await import('./fixtures/current-balance/mixed.json')).default,{parseSharedWallet}=await import('../src/receiz/shared-wallet'),{currentWalletObservation,advanceCurrentWalletObservation}=await import('../src/receiz/current-wallet-valuation');
 let current=currentWalletObservation(parseSharedWallet(packet,packet.wallet.userId))!;const identity={knownWallet:()=>current} as unknown as OpenIdentity,host=document.createElement('div'),root=createRoot(host),fetch=vi.spyOn(globalThis,'fetch').mockImplementation(()=>{throw Error('NETWORK_FORBIDDEN');});
 const render=()=>act(async()=>root.render(<LiveActions action={{kind:'balance'}} identity={identity} wallet={current.wallet} onClose={()=>{}} onForget={async()=>{}} onRefresh={()=>{}}/>));
 try{await render();const rows=[...host.querySelectorAll<HTMLDetailsElement>('[data-balance-rail]')];expect(rows).toHaveLength(2);for(const row of rows)await act(async()=>{row.querySelector('summary')!.click();await import('../src/features/account/BalanceCalculationDetails');});for(const row of rows)await act(async()=>row.querySelector<HTMLElement>('.balance-calculation>summary')!.click());
  const reserve=host.querySelector<HTMLDetailsElement>('[data-balance-rail="reserve"]')!,funding=reserve.querySelector<HTMLDetailsElement>('.balance-funding-record')!;expect(reserve.querySelector('[data-rail-phi]')?.textContent).toBe('8 Φ');expect(reserve.textContent).toContain('$19.00');expect(reserve.querySelectorAll('.balance-funding-record')).toHaveLength(2);expect(reserve.textContent).toContain('5 Φ · $10.00');expect(reserve.textContent).toContain('3 Φ · $9.00');
  await act(async()=>funding.querySelector('summary')!.click());expect(funding.textContent).toContain(packet.wallet.reserveFundingSource.movements[0].receipt.acceptedInputSha256);expect(funding.textContent).toContain(packet.wallet.reserveFundingSource.movements[0].usdPerPhiMicrocents);
  current=advanceCurrentWalletObservation(current,(BigInt(current.historyBasis!.endKaiUPulse)+1_000_000n).toString())!;await render();expect(rows.every(row=>row.open)).toBe(true);expect(funding.open).toBe(true);expect(reserve.querySelector('[data-rail-phi]')?.textContent).toBe('8 Φ');const actual=calculation.readBalanceCalculation(current.wallet,current)!;expect(reserve.querySelector('.balance-calculation-bindings')?.textContent).toContain(actual.kaiUPulse!);expect(reserve.textContent).toContain(actual.steps.find(step=>step.label==='Reserve')!.operands.quotedGrossUsdCents);expect(fetch).not.toHaveBeenCalled();
 }finally{act(()=>root.unmount());fetch.mockRestore();}
});
it('names an unmarked retained historical cohort without claiming current own-PBI membership',async()=>{
 const held=frame('14710000000123'),current={...held,chartSource:{...held.chartSource!,earningMembershipPolicy:undefined}},identity={knownWallet:()=>current} as unknown as OpenIdentity,host=document.createElement('div'),root=createRoot(host);
 try{await act(async()=>root.render(<LiveActions action={{kind:'balance'}} identity={identity} wallet={current.wallet} onClose={()=>{}} onForget={async()=>{}} onRefresh={()=>{}}/>));await act(async()=>{host.querySelector<HTMLElement>('[data-balance-rail="settlement"] summary')!.click();await import('../src/features/account/BalanceCalculationDetails');});await act(async()=>host.querySelector<HTMLElement>('.balance-calculation>summary')!.click());expect(host.textContent).toContain('Retained historical source cohort');expect(host.textContent).not.toContain('Own-signed source cohort');
 }finally{act(()=>root.unmount());}
});
