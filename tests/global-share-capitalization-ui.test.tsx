// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {expect,it,vi} from 'vitest';
import {MarketOverviewView} from '../src/features/market/MarketOverview';
import type {PublicMarketCatalog} from '../src/receiz/public-market';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
it('uses the published share cap for the headline, chart, tooltip and change instead of a different unit-value total',()=>{
 const host=document.createElement('div'),root=createRoot(host);
 const source={currentUsd:12500,marketAssetsPriced:1,cardsInCirculation:0,shareCapitalization:{usdCents:'1250000',covered:1,listed:1,complete:true,outstandingShareQuantityMicro:'5000000'}};
 const points=[{at:'2026-10-26T12:00:00Z',pulse:14900000,usdCents:'1000000'},{at:'2026-10-27T12:00:00Z',pulse:14916500,usdCents:'1250000'}];
 try{
  act(()=>root.render(<MarketOverviewView catalog={{items:[],complete:true}as unknown as PublicMarketCatalog} projection={{source:source as never,points,status:'live'}} period="1D" onPeriodChange={vi.fn()} onExplore={vi.fn()}/>));
  expect(host.querySelector('.market-cap-amount')?.textContent).toBe('$12,500.00');
  expect(host.querySelector('.market-valuation-history-label')).toBeNull();
  expect(host.querySelector('.chart-period-change')?.textContent).toContain('+$2,500.00 (+25.00%)');
  const chart=host.querySelector('svg[role="img"]')!;expect(chart.getAttribute('aria-label')).toContain('12500');
  act(()=>chart.dispatchEvent(new KeyboardEvent('keydown',{key:'End',bubbles:true})));
  expect(host.querySelector('.chart-tooltip')?.textContent).toContain('$12,500.00');
  expect(host.textContent).not.toContain('unit-value');
 }finally{act(()=>root.unmount());}
});
