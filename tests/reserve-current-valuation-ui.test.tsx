// @vitest-environment happy-dom
import fixture from './fixtures/current-balance/mixed.json';
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {expect,it,vi} from 'vitest';
import {BalanceDetails} from '../src/features/account/BalanceDetails';
import {parseSharedWallet} from '../src/receiz/shared-wallet';
import {currentWalletObservation,advanceCurrentWalletObservation} from '../src/receiz/current-wallet-valuation';
import {currentBalanceCaptureKai} from '../src/receiz/current-balance-source';
import {readWalletObservation} from '../src/receiz/wallet-observation';
import {BANK_APPLICATION_ID} from '../src/receiz/config';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
it('opens the retained exact Reserve after a local valuation and reopen, keeping it through another ordinary tick without a read',async()=>{
 const envelope=structuredClone(fixture),wallet=parseSharedWallet(envelope,envelope.wallet.userId),source=wallet.currentBalanceSource!,kai=BigInt(currentBalanceCaptureKai(source));
 const olderSource={...source,reservePhiMicro:null,settlementPhiMicro:null,reserveFundingSource:undefined};
 const first=currentWalletObservation({...wallet,currentBalanceSource:olderSource},null,String(kai+1_000_000n))!;
 const binding={keyId:'held-display-only',artifactSha256:'a'.repeat(64)},packet=JSON.parse(JSON.stringify({...first,schema:'receiz.bank.private-wallet-observation.v1',authority:'read-only-observation',applicationId:BANK_APPLICATION_ID,...binding})),restored=readWalletObservation(packet,binding)!;
 const fetch=vi.spyOn(globalThis,'fetch').mockImplementation(()=>{throw Error('NETWORK_FORBIDDEN');}),host=document.createElement('div'),root=createRoot(host);
 try{
  await act(async()=>root.render(<BalanceDetails wallet={restored.wallet} observation={restored}/>));
  await act(async()=>host.querySelector<HTMLDetailsElement>('.balance-source-details')!.querySelector('summary')!.click());
  const reserve=host.querySelector<HTMLDetailsElement>('[data-balance-rail="reserve"]')!;
  await act(async()=>reserve.querySelector('summary')!.click());expect(reserve.querySelector('[data-rail-phi]')?.textContent).toBe('Reserve total · 8 Φ');expect(reserve.querySelector('summary')?.textContent).toContain('$19.00');
  const next=advanceCurrentWalletObservation(restored,String(kai+2_000_000n))!;
  await act(async()=>root.render(<BalanceDetails wallet={next.wallet} observation={next}/>));
  expect(reserve.open).toBe(true);expect(reserve.querySelector('[data-rail-phi]')?.textContent).toBe('Reserve total · 8 Φ');expect(fetch).not.toHaveBeenCalled();
 }finally{act(()=>root.unmount());fetch.mockRestore();}
});
