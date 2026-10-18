// @vitest-environment happy-dom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it } from 'vitest';
import { BalanceChart } from '../src/features/account/BalanceChart';
import { LiveAccount } from '../src/features/account/LiveAccount';
import type { SharedWallet } from '../src/receiz/shared-wallet';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
it('fills the plotting width with the available real observations for every selected period',()=>{
  const host=document.createElement('div'),root=createRoot(host);
  const end=Date.UTC(2026,9,17,12),history=[2,1,0].map((hours,index)=>({userId:'account',at:new Date(end-hours*3600000).toISOString(),kaiUPulse:null,totalUsdCents:String(10000+index*1000),reserveUsdCents:'0',settlementUsdCents:String(10000+index*1000)}));
  const wallet={userId:'account',totalUsdCents:'12000',reserveUsdCents:'0',settlementUsdCents:'12000'} as SharedWallet;
  try{
    act(()=>root.render(<BalanceChart wallet={wallet} history={history} observedAt={new Date(end).toISOString()}/>));
    const select=(period:string)=>act(()=>[...host.querySelectorAll('button')].find(button=>button.textContent===period)!.click());
    for(const period of ['1D','1W','1M','3M','1Y','All']){
      select(period);const svg=host.querySelector('svg')!;
      expect(Number(svg.getAttribute('data-range-start'))).toBe(end-2*3600000);
      expect(Number(svg.getAttribute('data-range-end'))).toBe(end);
      expect(svg.querySelector('path[fill="none"]')!.getAttribute('d')).toMatch(/^M12,/);
      expect(svg.querySelector('circle')!.getAttribute('cx')).toBe('308');
      expect(svg.getAttribute('aria-label')).toContain('from 100 to 120');
      const labels=host.querySelector('.chart-date-range')!.children;
      expect(labels[0].textContent).not.toBe(labels[1].textContent);
      expect(host.querySelector('.chart-period-change')!.textContent).toContain('20.00%');
    }
  }finally{act(()=>root.unmount());}
});
it('labels the partial observed settlement movement as Day with its actual interval in the title',()=>{
  const host=document.createElement('div'),root=createRoot(host);
  const wallet={userId:'account',totalUsdCents:'12000',reserveUsdCents:'0',settlementUsdCents:'12000'} as SharedWallet;
  const history=['10000','12000'].map((cents,index)=>({userId:'account',at:`2026-10-17T12:0${index}:00Z`,kaiUPulse:String(17491270422n+BigInt(index)),totalUsdCents:cents,reserveUsdCents:'0',settlementUsdCents:cents}));
  const noop=()=>{};
  try{
    act(()=>root.render(<LiveAccount wallet={wallet} walletHistory={history} busy={false} error={null} observedAt={history[1].at} onRefresh={noop} onSend={noop} onReceive={noop} onBalance={noop} onAssets={noop} onLedger={noop}/>));
    const change=host.querySelector('.settlement-day-change')!;
    expect(change.textContent).toContain('· Day');
    expect(change.getAttribute('title')).toContain('current day');
    expect(change.getAttribute('title')).toContain(new Date(history[0].at).toLocaleString());
  }finally{act(()=>root.unmount());}
});
it('uses the displayed period opening for change and never carries an older out-of-period balance into it',()=>{
  const host=document.createElement('div'),root=createRoot(host),end=Date.UTC(2026,9,17,12);
  const history=[{hours:30,cents:'1000'},{hours:2,cents:'10000'},{hours:0,cents:'12000'}].map(({hours,cents})=>({userId:'account',at:new Date(end-hours*3600000).toISOString(),kaiUPulse:null,totalUsdCents:cents,reserveUsdCents:'0',settlementUsdCents:cents}));
  const wallet={userId:'account',totalUsdCents:'12000',reserveUsdCents:'0',settlementUsdCents:'12000'} as SharedWallet;
  try{
    act(()=>root.render(<BalanceChart wallet={wallet} history={history} observedAt={new Date(end).toISOString()}/>));
    act(()=>[...host.querySelectorAll('button')].find(button=>button.textContent==='1D')!.click());
    expect(host.querySelector('.chart-period-change')!.textContent).toContain('20.00%');
    expect(host.querySelector('svg')!.getAttribute('aria-label')).toContain('from 100 to 120');
    expect(Number(host.querySelector('svg')!.getAttribute('data-range-start'))).toBe(end-2*3600000);
  }finally{act(()=>root.unmount());}
});
