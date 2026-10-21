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
import {PublicAssetTradePortal,type PublicTradeAccount} from '../src/features/market/PublicAssetTradePortal';
import {closePublicAssetTrade} from '../src/receiz/public-asset-trade';
vi.mock('../src/features/market/MarketOverview',()=>({MarketOverview:()=>null}));
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
const catalog=()=>parsePublicMarket({ok:true,transport:{publicOriginals:[{id:'profile:artist:work',receizId:'work',title:'The First Light',valueUsd:12}]}});
it('keeps asset creation while directing purchases through each asset instead of a separate Exchange picker',async()=>{
 const source={catalog:catalog(),status:'live',error:null,refresh:vi.fn()} as never,open=vi.fn(),host=document.createElement('div'),root=createRoot(host);
 try{await act(async()=>root.render(<Market source={source} onAction={open}/>));
  const actions=host.querySelector('.market-actions')!;expect(actions.querySelectorAll('button')).toHaveLength(1);
  await act(()=>actions.querySelector<HTMLButtonElement>('button')!.click());expect(open).toHaveBeenCalledExactlyOnceWith({kind:'currency'});
 }finally{act(()=>root.unmount());}
});
it.each(['buy','sell']as const)('keeps the Market object and route beneath a %s trade',async side=>{
 history.replaceState({},'','/#market');const source={catalog:catalog(),status:'live',error:null,refresh:vi.fn()} as never,open=vi.fn(),host=document.createElement('div'),root=createRoot(host);document.body.append(host);const request=vi.fn();vi.stubGlobal('fetch',request);
 try{
  await act(async()=>root.render(<Market source={source} onAction={open}/>));await act(()=>host.querySelector<HTMLButtonElement>('.asset-row')!.click());
  const dialog=host.querySelector('dialog')!,object=dialog.querySelector('.asset-object'),route=location.hash;
  await act(()=>[...dialog.querySelectorAll<HTMLButtonElement>('button')].find(button=>button.textContent===(side==='buy'?'Buy ownership':'Take cash'))!.click());
  expect(open).toHaveBeenCalledExactlyOnceWith({kind:'market-trade',marketItemId:'profile:artist:work',side});expect(host.querySelector('dialog')).toBe(dialog);expect(dialog.open).toBe(true);expect(dialog.querySelector('.asset-object')).toBe(object);expect(location.hash).toBe(route);expect(request).not.toHaveBeenCalled();
 }finally{act(()=>root.unmount());host.remove();vi.unstubAllGlobals();history.replaceState({},'','/');}
});
it.each(['buy','sell']as const)('opens the existing public %s flow over the Explore object without another holding read',async side=>{
 history.replaceState({},'','/explore/');const source={catalog:catalog(),status:'live',error:null,refresh:vi.fn()} as never,open=vi.fn(),host=document.createElement('div'),root=createRoot(host);document.body.append(host);
 const request=vi.fn();vi.stubGlobal('fetch',request);
 const loader=vi.fn((event:Event)=>{const detail=(event as CustomEvent).detail;detail.handled=true;detail.resolve();});addEventListener('bankeiz:request-bank-runtime',loader);
 const api={status:async()=>null,prepare:vi.fn(async()=>({digest:'review',title:'The First Light',body:side==='buy'?{side,amountUsd:'250.00'}:{side,shareQuantity:'2.500000'},observation:{preview:{shareQuantityMicro:'2500000',settlementUsdCents:'25000'}}})),execute:vi.fn(),discard:vi.fn()};
 const identity={binding:{artifactSha256:'explore-owner'},knownMarketPortfolio:()=>parseMarketPortfolio(portfolioFixture(),portfolioUid),marketPortfolio:vi.fn(),marketTrade:async()=>api,beginCardDeposit:vi.fn()} as unknown as OpenIdentity;
 const account={identity,wallet:{totalUsdCents:'10000'},opening:false,busy:false,error:null,create:vi.fn(),refresh:vi.fn()} as unknown as PublicTradeAccount;
 const button=(scope:HTMLElement,label:string)=>[...scope.querySelectorAll<HTMLButtonElement>('button')].find(value=>value.textContent===label);
 try{
  await act(async()=>root.render(<><Market source={source} mode="explorer" onAction={open}/><PublicAssetTradePortal account={account}/></>));await act(()=>host.querySelector<HTMLButtonElement>('.asset-row')!.click());
  const objectDialog=host.querySelector('dialog')!,object=objectDialog.querySelector('.asset-object'),route=location.href;
  expect(loader).not.toHaveBeenCalled();expect(request).not.toHaveBeenCalled();expect(api.prepare).not.toHaveBeenCalled();
  const action=button(objectDialog,side==='buy'?'Buy ownership':'Take cash');expect(action).toBeDefined();expect(action!.disabled).toBe(false);
  await act(async()=>action!.click());
  const tradeDialog=host.querySelector('.public-asset-trade-slot')?.closest('dialog');expect(tradeDialog).toBeDefined();expect(tradeDialog?.open).toBe(true);
  expect(host.querySelector('dialog')).toBe(objectDialog);expect(objectDialog.open).toBe(true);expect(objectDialog.querySelector('.asset-object')).toBe(object);expect(location.href).toBe(route);expect(loader).toHaveBeenCalledOnce();expect(open).not.toHaveBeenCalled();
  await act(async()=>button(tradeDialog!,side==='buy'?'$250':'All')!.click());expect(tradeDialog!.querySelector('input')?.value).toBe(side==='buy'?'250':'2.5');
  expect(api.prepare).not.toHaveBeenCalled();expect(api.execute).not.toHaveBeenCalled();expect(identity.marketPortfolio).not.toHaveBeenCalled();expect(identity.beginCardDeposit).not.toHaveBeenCalled();expect(account.create).not.toHaveBeenCalled();expect(request).not.toHaveBeenCalled();
  await act(async()=>button(tradeDialog!,'Review trade')!.click());expect(api.prepare).toHaveBeenCalledExactlyOnceWith({marketItemId:'profile:artist:work',side,...(side==='buy'?{amountUsdCents:'25000'}:{shareQuantityMicro:'2500000'})});expect(api.execute).not.toHaveBeenCalled();
  await act(()=>tradeDialog!.querySelector<HTMLButtonElement>('button[aria-label="Close"]')!.click());expect(host.querySelectorAll('dialog')).toHaveLength(1);expect(objectDialog.open).toBe(true);expect(objectDialog.querySelector('.asset-object')).toBe(object);expect(location.href).toBe(route);
 }finally{act(()=>{closePublicAssetTrade();root.unmount();});host.remove();removeEventListener('bankeiz:request-bank-runtime',loader);vi.unstubAllGlobals();history.replaceState({},'','/');}
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
