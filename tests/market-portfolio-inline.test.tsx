// @vitest-environment happy-dom
import {act,useSyncExternalStore} from 'react';
import {createRoot} from 'react-dom/client';
import {expect,it,vi} from 'vitest';
import {Investments} from '../src/features/assets/Investments';
import {OpenInvestment} from '../src/features/assets/OpenInvestment';
import {createMarketPortfolio,parseMarketPortfolio} from '../src/receiz/market-portfolio';
import {publishOpenPortfolio} from '../src/receiz/market-portfolio-presentation';
import {portfolioItem} from '../src/receiz/market-portfolio-value';
import {createMarketTrade} from '../src/receiz/market-trade';
import {portfolioFixture,portfolioUid} from './fixtures/market-portfolio';
import {syntheticMarketQuote,syntheticMarketRecord} from './fixtures/market-trade';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
it('updates Assets and the open asset investment together from the confirmed POST before any portfolio fetch',async()=>{
 const initial=parseMarketPortfolio(portfolioFixture(),portfolioUid),request=vi.fn(),portfolio=createMarketPortfolio({accountUid:portfolioUid,initial,assertOpen(){},request}),item=portfolioItem(initial.positions[0],null);
 const publish=()=>publishOpenPortfolio('fixture',portfolio.known()),unsubscribe=portfolio.subscribe(publish);publish();
 function Surfaces(){const data=useSyncExternalStore(portfolio.subscribe,portfolio.known);return <><Investments portfolio={data} items={[]} active pulse={15000000} history={null} onTrade={()=>{}}/><OpenInvestment item={item}/></>;}
 let saved:any=null;const network=vi.fn(async(path:string,options:any)=>{if(options.method==='GET')return syntheticMarketQuote(new URL(path,'https://test.invalid').searchParams,portfolioUid);const raw=syntheticMarketRecord(options.body,portfolioUid),position=raw.source.position as any;Object.assign(position,{asset_id:'work',title:item.title,summary:'An original work.',share_quantity_micro:options.body.side==='buy'?'3500000':'0',cost_basis_usd_cents:options.body.side==='buy'?'3000':'0',last_price_usd_cents:'1000',opened_at:'2026-10-19T10:00:00Z',last_trade_at:options.body.side==='buy'?'2026-10-21T15:00:00Z':'2026-10-21T15:01:00Z'});Object.assign(raw.source.trade,{id:options.body.side==='buy'?'10000000-0000-4000-8000-000000000004':'10000000-0000-4000-8000-000000000005',title:item.title,created_at:position.last_trade_at});return raw;});
 const api=createMarketTrade({ownerReceizId:'fixture',assertOpen(){},assertNoOtherPending:async()=>{},lock:async work=>work(),store:{read:async()=>saved,write:async next=>{saved=next;}},connect:async()=>({accountUid:portfolioUid,client:{request:network}}),onRecorded:async(uid,original)=>{expect(saved.current.status).toBe('recorded');expect(uid).toBe(portfolioUid);portfolio.adoptRecorded(original);}});
 const host=document.createElement('div'),root=createRoot(host);document.body.append(host);const fetcher=vi.spyOn(globalThis,'fetch');
 try{
  await act(async()=>root.render(<Surfaces/>));expect(host.querySelector('.investment-row')?.textContent).toContain('2.5 shares');
  await act(async()=>{const review=await api.prepare({marketItemId:item.id,side:'buy',amountUsdCents:'1000'});await api.execute(review,review.digest);});
  expect(host.querySelector('.investment-row')?.textContent).toContain('3.5 shares');expect(host.querySelector('.asset-private-investment')?.textContent).toContain('3.5');expect(host.querySelector('.asset-private-investment')?.textContent).toContain('$35.00');expect(network).toHaveBeenCalledTimes(2);expect(request).not.toHaveBeenCalled();expect(fetcher).not.toHaveBeenCalled();
  await act(async()=>{const review=await api.prepare({marketItemId:item.id,side:'sell',shareQuantityMicro:'3500000'});await api.execute(review,review.digest);});
  expect([...host.querySelectorAll('.investment-row')].some(row=>row.textContent?.includes(item.title))).toBe(false);expect(host.querySelector('.asset-private-investment')?.textContent).not.toContain('Your shares');expect(host.querySelector('.asset-private-investment')?.textContent).toContain('Sold 3.5 shares');expect(network).toHaveBeenCalledTimes(4);expect(request).not.toHaveBeenCalled();expect(fetcher).not.toHaveBeenCalled();
 }finally{act(()=>root.unmount());host.remove();unsubscribe();publishOpenPortfolio('fixture',null);fetcher.mockRestore();}
});
