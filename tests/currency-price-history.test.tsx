// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {expect,it,vi} from 'vitest';
import {CurrencyPriceHistory} from '../src/features/market/CurrencyPriceHistory';
import {retainCurrencyPriceHistory} from '../src/receiz/currency-ledger-view';

const ledger=vi.hoisted(()=>({readHeldPublicLedger:vi.fn(async()=>null),publicLedgerDisplayRows:vi.fn(async()=>[]),
 synchronizePublicLedger:vi.fn(async()=>null)}));
vi.mock('../src/receiz/public-ledger-continuity',()=>ledger);

it('renders a held currency immediately and follows the shared signed ledger without a request',async()=>{
 const assetId='a'.repeat(64), at='2026-01-01T00:00:00.000Z', later='2026-01-02T00:00:00.000Z';
 const network=vi.fn(async()=>{throw Error('EXTRA_NETWORK_REQUEST');});
 vi.stubGlobal('fetch',network);
 vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);
 const host=document.createElement('div'),root=createRoot(host);
 try{
  await act(async()=>root.render(<CurrencyPriceHistory assetId={assetId} symbol="LOCAL"
    opening={{priceUsdCentsPerUnit:'100',at}}/>));
  expect(host.textContent).toContain('$1.00');
  await act(async()=>retainCurrencyPriceHistory({id:'fixture',history:['first','second'],artifact:'current'},new Map([
   [assetId+':LOCAL',[{at,usdCents:'125',kaiUPulse:'1000000'},{at:later,usdCents:'200',kaiUPulse:'2000000'}]],
   ['b'.repeat(64)+':LOCAL',[{at:later,usdCents:'999',kaiUPulse:'2000000'}]],
  ]),new Map([
   [assetId+':LOCAL',[
    {id:'sell',side:'sell',at:later,kaiUPulse:'2000000',quantityMicro:'2000000',priceUsdCentsPerUnit:'200',tradeUsdCents:'325'},
    {id:'buy',side:'buy',at,kaiUPulse:'1000000',quantityMicro:'3000000',priceUsdCentsPerUnit:'125',tradeUsdCents:'375'},
   ]],
  ])));
  expect(host.textContent).toContain('$2.00');
  expect(host.querySelector('svg')?.getAttribute('aria-label')).toContain('from 1.25 to 2');
  expect(host.textContent).not.toContain('$9.99');
  const table=host.querySelector('table')!;
  expect([...table.querySelectorAll('tbody tr')].map(row=>row.querySelector('strong')?.textContent)).toEqual(['Sell · 2 LOCAL','Buy · 3 LOCAL']);
  expect(table.textContent).toContain('$3.25');
  expect(table.textContent).toContain('$3.75');
  const button=(label:string)=>[...host.querySelectorAll('button')].find(button=>button.textContent===label)!;
  const activity=host.querySelector('[aria-label="LOCAL market activity"]')!;
  expect(activity.textContent).toContain('Bought3 LOCAL');
  expect(activity.textContent).toContain('Sold2 LOCAL');
  expect(activity.textContent).toContain('Traded value$7.00');
  await act(async()=>button('Volume').click());
  expect(host.querySelector('svg')?.getAttribute('aria-label')).toContain('LOCAL cumulative volume, from 3 to 5');
  await act(async()=>button('Price').click());
  expect(host.querySelector('svg')?.getAttribute('aria-label')).toContain('from 1.25 to 2');
  expect([...host.querySelectorAll('.currency-trade-filters button')].map(filter=>filter.textContent)).toEqual(['All','Buy','Sell']);
  expect([...table.querySelectorAll('.currency-trade-side')].map(label=>label.getAttribute('data-side'))).toEqual(['sell','buy']);
  await act(async()=>button('Buy').click());
  expect(button('Buy').getAttribute('aria-pressed')).toBe('true');
  expect(table.textContent).toContain('Buy · 3 LOCAL');
  expect(table.textContent).not.toContain('Sell · 2 LOCAL');
  await act(async()=>button('Sell').click());
  expect(table.textContent).toContain('Sell · 2 LOCAL');
  expect(table.textContent).not.toContain('Buy · 3 LOCAL');
  await act(async()=>retainCurrencyPriceHistory({id:'fixture',history:['first'],artifact:'older'},new Map([
   [assetId+':LOCAL',[{at,usdCents:'125',kaiUPulse:'1000000'}]],
  ])));
  expect(host.textContent).toContain('$2.00');
  expect(network).not.toHaveBeenCalled();
 }finally{
  await act(async()=>root.unmount());vi.unstubAllGlobals();
 }
});

it('places the listing quote on the first frame while a cold currency opens the shared Ledger',async()=>{
 vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);
 const host=document.createElement('div'),root=createRoot(host);
 let finish!:()=>void;
 ledger.synchronizePublicLedger.mockImplementationOnce(()=>new Promise<null>(resolve=>{finish=()=>resolve(null);}));
 try {
  await act(async()=>root.render(<CurrencyPriceHistory assetId={'c'.repeat(64)} symbol="NEW" openLedger
    opening={{priceUsdCentsPerUnit:'250',at:null}}/>));
  expect(host.textContent).toContain('$2.50');
  await vi.waitFor(()=>expect(ledger.synchronizePublicLedger).toHaveBeenCalledOnce());
  await act(async()=>finish());
  expect(host.textContent).toContain('$2.50');
 } finally { await act(async()=>root.unmount());vi.unstubAllGlobals(); }
});

it('shows the existing Discover impression aggregate on the first frame without adding price points or requests',async()=>{
 vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);
 const fetcher=vi.fn(()=>Promise.reject(Error('Unexpected traffic fetch')));
 vi.stubGlobal('fetch',fetcher);
 const host=document.createElement('div'),root=createRoot(host);
 try{
  await act(async()=>root.render(<CurrencyPriceHistory assetId={'d'.repeat(64)} symbol="SPT" discoverTraffic
    opening={{priceUsdCentsPerUnit:'93',at:'2026-11-26T00:00:00Z'}}/>));
  expect(host.textContent).toContain('292 recorded Discover card impressions');
  expect(host.querySelector('svg')?.getAttribute('aria-label')).toContain('Discover card impressions');
  const price=[...host.querySelectorAll('button')].find(button=>button.textContent==='Price')!;
  await act(async()=>price.click());
  expect(host.querySelector('svg')?.getAttribute('aria-label')).toContain('purchase price in US dollars');
  expect(host.textContent).not.toContain('292 recorded');
  expect(fetcher).not.toHaveBeenCalled();
 }finally{await act(async()=>root.unmount());vi.unstubAllGlobals();}
});
