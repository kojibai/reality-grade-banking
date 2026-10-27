// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {expect,it,vi} from 'vitest';
const p=vi.hoisted(()=>({loads:0,renders:0}));
vi.mock('../src/features/account/BalanceCalculationDetails',()=>{p.loads++;return{BalanceCalculationDetails:()=>{p.renders++;return <p data-test-calculation>Calculation inspector</p>;}};});
import {BalanceDetails} from '../src/features/account/BalanceDetails';
import type {SharedWallet} from '../src/receiz/shared-wallet';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
it('does not load the calculation inspector until an explicit rail expansion and stops its rendering on close',async()=>{
 const wallet={userId:'owner',totalUsdCents:'100',reserveUsdCents:'100',settlementUsdCents:'0',balancePhiMicro:'100001',reservePhiMicro:'100001',settlementPhiMicro:'0'} as SharedWallet;
 const host=document.createElement('div'),root=createRoot(host),fetch=vi.spyOn(globalThis,'fetch').mockImplementation(()=>{throw Error('NETWORK_FORBIDDEN');});
 try{await act(async()=>root.render(<BalanceDetails wallet={wallet}/>));expect(p.loads).toBe(0);expect(p.renders).toBe(0);
  const row=host.querySelector<HTMLDetailsElement>('[data-balance-rail="reserve"]')!;await act(async()=>row.querySelector('summary')!.click());expect(p.loads).toBe(1);expect(p.renders).toBe(1);expect(host.querySelector('[data-test-calculation]')).not.toBeNull();
  await act(async()=>row.querySelector('summary')!.click());expect(host.querySelector('[data-test-calculation]')).toBeNull();const renders=p.renders;
  await act(async()=>root.render(<BalanceDetails wallet={{...wallet,totalUsdCents:'101',reserveUsdCents:'101'}}/>));expect(p.renders).toBe(renders);expect(fetch).not.toHaveBeenCalled();
 }finally{act(()=>root.unmount());fetch.mockRestore();}
});
