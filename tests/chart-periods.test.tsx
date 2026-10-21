// @vitest-environment happy-dom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it } from 'vitest';
import { BalanceChart } from '../src/features/account/BalanceChart';
import { LiveAccount } from '../src/features/account/LiveAccount';
import type { SharedWallet } from '../src/receiz/shared-wallet';
import {projectHistoricalWallet} from '../src/receiz/historical-wallet';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
it('paints a retained deterministic total history immediately across all periods from its first sealed activity',()=>{
  const host=document.createElement('div'),root=createRoot(host);
  const history=projectHistoricalWallet({transactions:[{kaiUPulse:'8000000000000',reserveDeltaUsdCents:'0',settlementDeltaPhiMicro:'0'},{kaiUPulse:'8000001000000',reserveDeltaUsdCents:'100000',settlementDeltaPhiMicro:'100000000'}],userId:'account',endKaiUPulse:'15000000000000'});
  const last=history.at(-1)!,wallet:SharedWallet={...last,balancePhiMicro:'100000000',portfolioUsdCents:null,pnlUsdCents:null,withdrawableUsdCents:null,projectionComplete:true,pulse:'15000000',kaiUpulse:'8000001000000'};
  try{
    act(()=>root.render(<BalanceChart wallet={wallet} history={history} observedAt={last.at}/>));
    const select=(text:string)=>act(()=>[...host.querySelectorAll('button')].find(button=>button.textContent===text)!.click());
    {
      for(const period of ['All','1D','1W','1M','3M','1Y']){
        select(period);const svg=host.querySelector('svg')!;
        expect(svg.getAttribute('aria-description')).toContain('recomputed from accepted holdings');
        expect(svg.querySelector('path[fill="none"]')!.getAttribute('d')).toMatch(/^M12,/);
        expect(svg.querySelector('circle')!.getAttribute('cx')).toBe('308');
        expect(host.querySelector('.chart-observation-note')).toBeNull();
        if(period==='All')expect(Number(svg.getAttribute('data-range-start'))).toBe(Date.parse(history[0].at));
      }
    }
    const svg=host.querySelector('svg')!;
    act(()=>svg.dispatchEvent(new KeyboardEvent('keydown',{key:'Home',bubbles:true})));
    expect(host.querySelector('.chart-tooltip')!.textContent).toContain('Valuation');
  }finally{act(()=>root.unmount());}
});
it('shows a complete current-value line when a selected period contains only one observation',()=>{
  const host=document.createElement('div'),root=createRoot(host);
  const history=[{userId:'account',at:'2026-08-01T12:00:00Z',kaiUPulse:null,totalUsdCents:'10000',reserveUsdCents:'0',settlementUsdCents:'10000'},{userId:'account',at:'2026-10-18T12:00:00Z',kaiUPulse:null,totalUsdCents:'12000',reserveUsdCents:'0',settlementUsdCents:'12000'}];
  const wallet={userId:'account',totalUsdCents:'12000',reserveUsdCents:'0',settlementUsdCents:'12000'} as SharedWallet;
  try{
    act(()=>root.render(<BalanceChart wallet={wallet} history={history} observedAt={history[1].at}/>));
    for(const period of ['1D','1W','1M']){
      act(()=>[...host.querySelectorAll('button')].find(button=>button.textContent===period)!.click());
      const svg=host.querySelector('svg')!;
      expect(svg.querySelector('path[fill="none"]')!.getAttribute('d')).toBe('M12,62 L308,62');
      expect(svg.getAttribute('aria-label')).toContain('from 120 to 120');
      expect(host.querySelector('.chart-observation-note')?.textContent).toContain('Earlier account history');
      expect(host.querySelector('.chart-period-change')).toBeNull();
    }
  }finally{act(()=>root.unmount());}
});
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
it('shows daily total balance movement with its actual observed interval',()=>{
  const host=document.createElement('div'),root=createRoot(host),end=Date.UTC(2026,9,17,12);
  const wallet={userId:'account',totalUsdCents:'12000',reserveUsdCents:'2000',settlementUsdCents:'10000'} as SharedWallet;
  const history=['10000','12000'].map((cents,index)=>({userId:'account',at:new Date(end-(1-index)*60000).toISOString(),kaiUPulse:null,totalUsdCents:cents,reserveUsdCents:'2000',settlementUsdCents:String(BigInt(cents)-2000n)}));
  try{
    act(()=>root.render(<BalanceChart wallet={wallet} history={history} observedAt={history[1].at}/>));
    act(()=>[...host.querySelectorAll('button')].find(button=>button.textContent==='1D')!.click());
    expect(host.querySelector('.chart-period-change')!.textContent).toContain('+$20.00 (+20.00%)');
    expect(Number(host.querySelector('svg')!.getAttribute('data-range-start'))).toBe(end-60000);
    expect(Number(host.querySelector('svg')!.getAttribute('data-range-end'))).toBe(end);
  }finally{act(()=>root.unmount());}
});
it('keeps total balance movement in the selected chart window and omits a change for one observation',()=>{
  const host=document.createElement('div'),root=createRoot(host),end=Date.UTC(2026,9,18,12),noop=()=>{};
  const history=[{days:400,cents:'1000'},{days:200,cents:'2000'},{days:60,cents:'3000'},{days:10,cents:'4000'},{days:3,cents:'5000'},{days:2/24,cents:'6000'},{days:0,cents:'10000'}].map(({days,cents})=>({userId:'account',at:new Date(end-days*86400000).toISOString(),kaiUPulse:null,totalUsdCents:String(BigInt(cents)+1000n),reserveUsdCents:'1000',settlementUsdCents:cents}));
  const wallet={...history.at(-1)} as SharedWallet;
  const render=(rows=history)=>act(()=>root.render(<LiveAccount wallet={wallet} walletHistory={rows} busy={false} error={null} observedAt={history.at(-1)!.at} onRefresh={noop} onSend={noop} onReceive={noop} onBalance={noop} onAssets={noop} onLedger={noop}/>));
  try{
    render();
    const select=(text:string)=>act(()=>[...host.querySelectorAll('button')].find(button=>button.textContent===text)!.click());
    for(const [period,percent,amount] of [['All','+450.00%','+$90.00'],['1D','+57.14%','+$40.00'],['1W','+83.33%','+$50.00'],['1M','+120.00%','+$60.00'],['3M','+175.00%','+$70.00'],['1Y','+266.67%','+$80.00']]){
      select(period);const change=host.querySelector('.chart-period-change')!;
      expect(change.textContent,period).toContain(percent);expect(change.textContent).toContain(amount);
    }
    select('1D');render(history.slice(-1));expect(host.querySelector('.chart-period-change')).toBeNull();
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
    expect(host.querySelector('svg path[fill="none"]')!.getAttribute('d')).toMatch(/^M12,/);
  }finally{act(()=>root.unmount());}
});
it('fits each sparse total balance window to both plot edges',()=>{
  const host=document.createElement('div'),root=createRoot(host),end=Date.UTC(2026,9,18,12);
  const days=[400,200,60,10,3,2/24,1/24,0];
  const history=days.map((day,index)=>({userId:'account',at:new Date(end-day*86400000).toISOString(),kaiUPulse:null,totalUsdCents:String(20000+index*2000),reserveUsdCents:String(10000+index*1000),settlementUsdCents:String(10000+index*1000)}));
  const wallet={...history.at(-1)} as SharedWallet;
  try{
    act(()=>root.render(<BalanceChart wallet={wallet} history={history} observedAt={new Date(end).toISOString()}/>));
    const select=(text:string)=>act(()=>[...host.querySelectorAll('button')].find(button=>button.textContent===text)!.click());
    {
      for(const [period,first] of [['All',0],['1D',5],['1W',4],['1M',3],['3M',2],['1Y',1]] as const){
        select(period);const svg=host.querySelector('svg')!;
        expect(Number(svg.getAttribute('data-range-start')),period).toBe(Date.parse(history[first].at));
        expect(Number(svg.getAttribute('data-range-end'))).toBe(end);
        expect(svg.querySelector('path[fill="none"]')!.getAttribute('d')).toMatch(/^M12,/);
        expect(svg.querySelector('circle')!.getAttribute('cx')).toBe('308');
        expect(svg.getAttribute('aria-label')).toContain(`from ${Number(history[first].totalUsdCents)/100} to`);
      }
    }
  }finally{act(()=>root.unmount());}
});
