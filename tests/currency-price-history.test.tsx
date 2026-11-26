// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {expect,it,vi} from 'vitest';
import {CurrencyPriceHistory} from '../src/features/market/CurrencyPriceHistory';
import {retainCurrencyPriceHistory} from '../src/receiz/currency-ledger-view';

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
   [assetId+':LOCAL',[{at,usdCents:'125'},{at:later,usdCents:'200'}]],
   ['b'.repeat(64)+':LOCAL',[{at:later,usdCents:'999'}]],
  ])));
  expect(host.textContent).toContain('$2.00');
  expect(host.querySelector('svg')?.getAttribute('aria-label')).toContain('from 1.25 to 2');
  expect(host.textContent).not.toContain('$9.99');
  await act(async()=>retainCurrencyPriceHistory({id:'fixture',history:['first'],artifact:'older'},new Map([
   [assetId+':LOCAL',[{at,usdCents:'125'}]],
  ])));
  expect(host.textContent).toContain('$2.00');
  expect(network).not.toHaveBeenCalled();
 }finally{
  await act(async()=>root.unmount());vi.unstubAllGlobals();
 }
});
