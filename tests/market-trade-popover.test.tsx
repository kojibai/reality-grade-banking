// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {expect,it,vi} from 'vitest';
import {Market} from '../src/features/market/Market';
import {Investments} from '../src/features/assets/Investments';
import {LiveAssets} from '../src/features/assets/LiveAssets';
import {parsePublicMarket} from '../src/receiz/public-market';
import {parseMarketPortfolio} from '../src/receiz/market-portfolio';
import {portfolioFixture,portfolioUid} from './fixtures/market-portfolio';
import type {OpenIdentity} from '../src/receiz/native-identity';
vi.mock('../src/features/market/MarketOverview',()=>({MarketOverview:()=>null}));
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
const catalog=()=>parsePublicMarket({ok:true,transport:{publicOriginals:[{id:'profile:artist:work',receizId:'work',title:'The First Light',valueUsd:12}]}});
it.each(['buy','sell']as const)('keeps the Market object and route beneath a %s trade',async side=>{
 history.replaceState({},'','/#market');const source={catalog:catalog(),status:'live',error:null,refresh:vi.fn()} as never,open=vi.fn(),host=document.createElement('div'),root=createRoot(host);document.body.append(host);const request=vi.fn();vi.stubGlobal('fetch',request);
 try{
  await act(async()=>root.render(<Market source={source} onAction={open}/>));await act(()=>host.querySelector<HTMLButtonElement>('.asset-row')!.click());
  const dialog=host.querySelector('dialog')!,object=dialog.querySelector('.asset-object'),route=location.hash;
  await act(()=>[...dialog.querySelectorAll<HTMLButtonElement>('button')].find(button=>button.textContent===(side==='buy'?'Buy ownership':'Take cash'))!.click());
  expect(open).toHaveBeenCalledExactlyOnceWith({kind:'market-trade',marketItemId:'profile:artist:work',side});expect(host.querySelector('dialog')).toBe(dialog);expect(dialog.open).toBe(true);expect(dialog.querySelector('.asset-object')).toBe(object);expect(location.hash).toBe(route);expect(request).not.toHaveBeenCalled();
 }finally{act(()=>root.unmount());host.remove();vi.unstubAllGlobals();history.replaceState({},'','/');}
});
it.each(['buy','sell']as const)('keeps the investment chart beneath a %s trade',async side=>{
 const portfolio=parseMarketPortfolio(portfolioFixture(),portfolioUid),onTrade=vi.fn(),host=document.createElement('div'),root=createRoot(host);document.body.append(host);const request=vi.fn();vi.stubGlobal('fetch',request);
 try{
  await act(async()=>root.render(<Investments portfolio={portfolio} items={[]} active pulse={15000000} history={null} onTrade={onTrade}/>));await act(()=>host.querySelector<HTMLButtonElement>('.investment-row')!.click());
  const dialog=host.querySelector('dialog')!,chart=dialog.querySelector('.investment-chart');
  await act(()=>[...dialog.querySelectorAll<HTMLButtonElement>('button')].find(button=>button.textContent===(side==='buy'?'Buy ownership':'Take cash'))!.click());
  expect(onTrade).toHaveBeenCalledExactlyOnceWith(side,'profile:artist:work');expect(host.querySelector('dialog')).toBe(dialog);expect(dialog.open).toBe(true);expect(dialog.querySelector('.investment-chart')).toBe(chart);expect(request).not.toHaveBeenCalled();
 }finally{act(()=>root.unmount());host.remove();vi.unstubAllGlobals();}
});
it.each(['buy','sell']as const)('keeps the Showcase object beneath a connected Market %s trade',async side=>{
 const onOpen=vi.fn(),identity={listDeposits:async()=>[]} as unknown as OpenIdentity,host=document.createElement('div'),root=createRoot(host);document.body.append(host);const request=vi.fn();vi.stubGlobal('fetch',request);
 try{
  await act(async()=>root.render(<LiveAssets identity={identity} active revision={0} showcase={catalog().items} onOpen={onOpen}/>));await act(()=>host.querySelector<HTMLButtonElement>('.market-rows .asset-row')!.click());const dialog=host.querySelector('dialog')!;
  await act(()=>[...dialog.querySelectorAll<HTMLButtonElement>('button')].find(button=>button.textContent===(side==='buy'?'Buy ownership':'Take cash'))!.click());
  expect(onOpen).toHaveBeenCalledExactlyOnceWith({kind:'market-trade',marketItemId:'profile:artist:work',side});expect(host.querySelector('dialog')).toBe(dialog);expect(dialog.open).toBe(true);expect(request).not.toHaveBeenCalled();
 }finally{act(()=>root.unmount());host.remove();vi.unstubAllGlobals();}
});
