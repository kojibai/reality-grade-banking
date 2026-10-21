// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,expect,it,vi} from 'vitest';
import {LiveMarketTrade} from '../src/features/market/LiveMarketTrade';
import type {OpenIdentity} from '../src/receiz/native-identity';
import {parseMarketPortfolio} from '../src/receiz/market-portfolio';
import {publishOpenPortfolio} from '../src/receiz/market-portfolio-presentation';
import {portfolioFixture,portfolioUid} from './fixtures/market-portfolio';

Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
const owner='open-identity',itemId='profile:artist:work';
function portfolio(quantity='1234567'){
 const raw=portfolioFixture();raw.positions[0].shareQuantityMicro=quantity;
 return parseMarketPortfolio(raw,portfolioUid);
}
function setup(known=portfolio()){
 const review={digest:'review',title:'The First Light',body:{side:'sell',shareQuantity:'1.234567'},observation:{preview:{shareQuantityMicro:'1234567',settlementUsdCents:'1000'}}};
 const api={status:async()=>null,prepare:vi.fn(async()=>review),execute:vi.fn(),discard:vi.fn()};
 const identity={binding:{artifactSha256:owner},knownMarketPortfolio:()=>known,marketPortfolio:vi.fn(),marketTrade:async()=>api} as unknown as OpenIdentity;
 const host=document.createElement('div'),root=createRoot(host);
 return{api,identity,host,root,render:async(side:'buy'|'sell'='sell',id=itemId)=>act(async()=>root.render(<LiveMarketTrade identity={identity} marketItemId={id} side={side} onRefresh={()=>{}}/>))};
}
function button(host:HTMLElement,name:string){return [...host.querySelectorAll<HTMLButtonElement>('button')].find(value=>value.textContent===name)!;}
const input=(host:HTMLElement)=>host.querySelector<HTMLInputElement>('input[inputmode="decimal"]')!;
afterEach(()=>{publishOpenPortfolio(owner,null);publishOpenPortfolio('other-identity',null);vi.unstubAllGlobals();});

it('fills buy budgets locally and requests terms only after Review trade',async()=>{
 const {api,identity,host,root,render}=setup(),fetch=vi.fn();vi.stubGlobal('fetch',fetch);
 try{await render('buy');
  for(const [label,amount] of [['$100','100'],['$250','250'],['$500','500'],['$1,000','1000']]){
   expect(button(host,label)).toBeDefined();await act(async()=>button(host,label).click());expect(input(host).value).toBe(amount);
  }
  expect(api.prepare).not.toHaveBeenCalled();expect(api.execute).not.toHaveBeenCalled();expect(identity.marketPortfolio).not.toHaveBeenCalled();expect(fetch).not.toHaveBeenCalled();
  await act(async()=>button(host,'Review trade').click());expect(api.prepare).toHaveBeenCalledExactlyOnceWith({marketItemId:itemId,side:'buy',amountUsdCents:'100000'});expect(api.execute).not.toHaveBeenCalled();
 }finally{act(()=>root.unmount());}
});

it('uses exact held shares for each percentage, rounding down only sub-microshare fractions',async()=>{
 const {api,identity,host,root,render}=setup(),fetch=vi.fn();vi.stubGlobal('fetch',fetch);
 try{await render();expect(host.querySelector<HTMLSelectElement>('select')!.value).toBe('usd');
  for(const [label,amount] of [['10%','0.123456'],['25%','0.308641'],['50%','0.617283'],['75%','0.925925'],['All','1.234567']]){
   expect(button(host,label)).toBeDefined();await act(async()=>button(host,label).click());expect(input(host).value).toBe(amount);expect(host.querySelector<HTMLSelectElement>('select')!.value).toBe('shares');
  }
  expect(api.prepare).not.toHaveBeenCalled();expect(api.execute).not.toHaveBeenCalled();expect(identity.marketPortfolio).not.toHaveBeenCalled();expect(fetch).not.toHaveBeenCalled();
  await act(async()=>button(host,'Review trade').click());expect(api.prepare).toHaveBeenCalledExactlyOnceWith({marketItemId:itemId,side:'sell',shareQuantityMicro:'1234567'});expect(button(host,'Confirm sale').disabled).toBe(true);expect(api.execute).not.toHaveBeenCalled();
 }finally{act(()=>root.unmount());}
});

it('adopts already-published same-account holdings without fetching and does not resurrect a sold holding',async()=>{
 const {identity,host,root,render}=setup();
 try{await render();await act(async()=>publishOpenPortfolio(owner,portfolio('7654321')));await act(async()=>button(host,'All').click());expect(input(host).value).toBe('7.654321');
  await act(async()=>publishOpenPortfolio(owner,{...portfolio(),positions:[]}));expect(button(host,'All')).toBeUndefined();expect(identity.marketPortfolio).not.toHaveBeenCalled();expect(input(host).value).toBe('7.654321');
 }finally{act(()=>root.unmount());}
});

it('ignores another account’s holdings and does not substitute a different asset',async()=>{
 const {identity,host,root,render}=setup({...portfolio(),positions:[]});
 try{publishOpenPortfolio('other-identity',portfolio());await render();expect(button(host,'All')).toBeUndefined();expect(input(host)).toBeDefined();
  await act(async()=>publishOpenPortfolio(owner,portfolio()));await render('sell','profile:artist:missing');expect(button(host,'All')).toBeUndefined();expect(identity.marketPortfolio).not.toHaveBeenCalled();
 }finally{act(()=>root.unmount());}
});

it('keeps All exact above Number precision and disables percentages smaller than one microshare',async()=>{
 const {host,root,render}=setup(portfolio('999999999999999999'));
 try{await render();await act(async()=>button(host,'All').click());expect(input(host).value).toBe('999999999999.999999');
  await act(async()=>publishOpenPortfolio(owner,portfolio('1')));expect(button(host,'10%').disabled).toBe(true);expect(button(host,'75%').disabled).toBe(true);expect(button(host,'All').disabled).toBe(false);
  await act(async()=>button(host,'All').click());expect(input(host).value).toBe('0.000001');
 }finally{act(()=>root.unmount());}
});

it('keeps custom quantities editable after selecting a preset',async()=>{
 const {api,host,root,render}=setup();
 try{await render();await act(async()=>button(host,'50%').click());
  await act(async()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(input(host),'0.4');input(host).dispatchEvent(new Event('input',{bubbles:true}));});
  await act(async()=>button(host,'Review trade').click());expect(api.prepare).toHaveBeenCalledExactlyOnceWith({marketItemId:itemId,side:'sell',shareQuantityMicro:'400000'});
 }finally{act(()=>root.unmount());}
});
