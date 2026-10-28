// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {expect,it,vi} from 'vitest';
import {BalanceDetails} from '../src/features/account/BalanceDetails';
import type {SharedWallet} from '../src/receiz/shared-wallet';

Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
it.each([
 {total:'100',phi:'1000000',reserve:'0',settlement:'100',expected:['settlement']},
 {total:'100',phi:'1000000',reserve:'100',settlement:'0',expected:['reserve']},
 {total:'100',phi:'1000000',reserve:'25',settlement:'75',expected:['settlement','reserve']},
 {total:'0',phi:'0',reserve:'0',settlement:'0',expected:['reserve']},
])('keeps $reserve Reserve / $settlement Settlement inside the closed proof disclosure',async value=>{
 const wallet={userId:'owner',totalUsdCents:value.total,balancePhiMicro:value.phi,reserveUsdCents:value.reserve,settlementUsdCents:value.settlement} as SharedWallet;
 const host=document.createElement('div'),root=createRoot(host),fetch=vi.spyOn(globalThis,'fetch').mockRejectedValue(Error('NO_DISPLAY_REQUESTS'));
 try{
  await act(async()=>root.render(<BalanceDetails wallet={wallet}/>));
  const disclosure=host.querySelector<HTMLDetailsElement>('.balance-source-details')!;
  expect(disclosure.open).toBe(false);
  const rows=[...host.querySelectorAll('[data-balance-rail]')];
  expect(rows.map(row=>row.getAttribute('data-balance-rail'))).toEqual(value.expected);
  for(const row of rows)expect(disclosure.contains(row)).toBe(true);
  expect(fetch).not.toHaveBeenCalled();
 }finally{act(()=>root.unmount());fetch.mockRestore();}
});
