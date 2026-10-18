// @vitest-environment happy-dom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it } from 'vitest';
import { BalanceChart } from '../src/features/account/BalanceChart';
import type { SharedWallet } from '../src/receiz/shared-wallet';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
it('changes the actual time window even when the available account observations fit in every period',()=>{
  const host=document.createElement('div'),root=createRoot(host);
  const end=Date.UTC(2026,9,17,12),history=[2,1,0].map((hours,index)=>({userId:'account',at:new Date(end-hours*3600000).toISOString(),kaiUPulse:null,totalUsdCents:String(10000+index*1000),reserveUsdCents:'0',settlementUsdCents:String(10000+index*1000)}));
  const wallet={userId:'account',totalUsdCents:'12000',reserveUsdCents:'0',settlementUsdCents:'12000'} as SharedWallet;
  try{
    act(()=>root.render(<BalanceChart wallet={wallet} history={history} observedAt={new Date(end).toISOString()}/>));
    const select=(period:string)=>act(()=>[...host.querySelectorAll('button')].find(button=>button.textContent===period)!.click());
    select('1D');const day=host.querySelector('svg')!,dayStart=Number(day.getAttribute('data-range-start')),dayPath=day.querySelector('path[fill="none"]')!.getAttribute('d');
    expect(dayStart).toBe(end-86400000);
    expect(host.querySelector('.chart-date-range')?.textContent).toBeTruthy();
    select('1W');const week=host.querySelector('svg')!;
    expect(Number(week.getAttribute('data-range-start'))).toBe(end-7*86400000);
    expect(week.querySelector('path[fill="none"]')!.getAttribute('d')).not.toBe(dayPath);
    expect(week.getAttribute('aria-label')).toContain('1W');
    select('All');expect(Number(host.querySelector('svg')!.getAttribute('data-range-start'))).toBe(end-2*3600000);
    expect(host.querySelector('svg')!.getAttribute('aria-label')).toContain('from 100 to 120');
  }finally{act(()=>root.unmount());}
});
