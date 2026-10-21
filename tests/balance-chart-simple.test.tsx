// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {expect,it,vi} from 'vitest';
import {BalanceChart} from '../src/features/account/BalanceChart';
const wallet={userId:'fixture-owner',totalUsdCents:'18000',reserveUsdCents:'6000',settlementUsdCents:'12000',balancePhiMicro:'0',portfolioUsdCents:null,pnlUsdCents:null,withdrawableUsdCents:null,projectionComplete:true,pulse:null,kaiUpulse:null};
const chart=vi.hoisted(()=>({values:[] as number[]}));
vi.mock('../src/components/ValueChart',()=>({ValueChart:(props:{values:number[]})=>{chart.values=props.values;return <div aria-label="Balance history"/>;},Periods:()=> <div aria-label="Time period">All · 1D · 1W · 1M · 3M · 1Y</div>}));
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
it('shows one total balance chart and retains time periods without Reserve or Settlement tabs',()=>{
 const host=document.createElement('div'),root=createRoot(host);
 try{
  act(()=>root.render(<BalanceChart wallet={wallet} observedAt={null} history={[{userId:'fixture-owner',kaiUPulse:'1',at:'2026-10-20T10:00:00Z',totalUsdCents:'15000',reserveUsdCents:'5000',settlementUsdCents:'10000'},{userId:'fixture-owner',kaiUPulse:'2',at:'2026-10-21T10:00:00Z',totalUsdCents:'18000',reserveUsdCents:'6000',settlementUsdCents:'12000'}]}/>));
  expect(host.querySelector('.balance-chart-rails')).toBeNull();expect(host.querySelector('[aria-label="Time period"]')).not.toBeNull();expect(chart.values).toEqual([150,180]);expect(host.textContent).not.toContain('Settlement');expect(host.textContent).not.toContain('Reserve');
 }finally{act(()=>root.unmount());}
});
