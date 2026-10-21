// @vitest-environment happy-dom
import {afterEach,expect,it,vi} from 'vitest';
import {act} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {Investments} from '../src/features/assets/Investments';
import {parseMarketPortfolio} from '../src/receiz/market-portfolio';
import {portfolioFixture,portfolioUid} from './fixtures/market-portfolio';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
let root:Root|undefined,element:HTMLDivElement;
afterEach(async()=>{if(root)await act(()=>root!.unmount());root=undefined;element?.remove();vi.restoreAllMocks();});
it('shows all purchased holdings, exact shares, value and return, and opens existing buy/sell actions without submitting a trade',async()=>{
 const p=parseMarketPortfolio(portfolioFixture(),portfolioUid),onTrade=vi.fn(),fetcher=vi.spyOn(globalThis,'fetch');element=document.createElement('div');document.body.append(element);root=createRoot(element);
 await act(()=>root!.render(<Investments portfolio={p} items={[]} active pulse={15000000} history={null} onTrade={onTrade}/>));
 expect(element.querySelectorAll('.investment-row')).toHaveLength(2);expect(element.textContent).toContain('The First Light');expect(element.textContent).toContain('2.5 shares');expect(element.textContent).toContain('$30.00');
 await act(()=>element.querySelector<HTMLButtonElement>('.investment-row')!.click());expect(element.querySelector('dialog')?.textContent).toContain('Your shares');expect(element.querySelector('dialog')?.textContent).toContain('2.5');expect(element.querySelector('dialog a[href^="/asset/"]')).toBeNull();
 await act(()=>[...element.querySelectorAll<HTMLButtonElement>('dialog button')].find(button=>button.textContent==='Buy ownership')!.click());expect(onTrade).toHaveBeenCalledWith('buy','profile:artist:work');expect(fetcher).not.toHaveBeenCalled();
});
it('filters holdings locally and distinguishes unavailable cost basis from a zero return',async()=>{
 const p=parseMarketPortfolio(portfolioFixture(),portfolioUid);p.positions[0].costBasisUsdCents=null;element=document.createElement('div');document.body.append(element);root=createRoot(element);const fetcher=vi.spyOn(globalThis,'fetch');
 await act(()=>root!.render(<Investments portfolio={p} items={[]} active pulse={15000000} history={null} onTrade={()=>{}}/>));
 const input=element.querySelector<HTMLInputElement>('[aria-label="Search investments"]')!;await act(()=>{const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!;setter.call(input,'First');input.dispatchEvent(new Event('input',{bubbles:true}));});expect(element.querySelectorAll('.investment-row')).toHaveLength(1);expect(element.querySelector('.investment-row')?.textContent).not.toContain('0.00%');expect(fetcher).not.toHaveBeenCalled();
});
it('uses the same unique public asset match for a legacy holding row and its portfolio total',async()=>{
 const p=parseMarketPortfolio(portfolioFixture(),portfolioUid);p.positions=p.positions.slice(0,1);const item={id:'public:work',assetId:'work',title:'A public title',priceUsd:12,chart:[],category:'proof',authority:'projection-only',canTrade:false} as never;
 element=document.createElement('div');document.body.append(element);root=createRoot(element);await act(()=>root!.render(<Investments portfolio={p} items={[item]} active pulse={15000000} history={null} onTrade={()=>{}}/>));expect(element.querySelector('.investment-row')?.textContent).toContain('$30.00');expect(element.querySelector('.investment-summary')?.textContent).toContain('$30.00');
});
it('retains account trade history after the final holding has been sold',async()=>{
 const p=parseMarketPortfolio(portfolioFixture(),portfolioUid);p.positions=[];element=document.createElement('div');document.body.append(element);root=createRoot(element);await act(()=>root!.render(<Investments portfolio={p} items={[]} active pulse={15000000} history={null} onTrade={()=>{}}/>));expect(element.querySelectorAll('.investment-row')).toHaveLength(0);expect(element.textContent).toContain('Trade history');expect(element.textContent).toContain('Bought 2.5 shares');
});
it('retains the selected investment chart after a full sale while updating its actual remaining shares and value',async()=>{
 const initial=portfolioFixture(),onTrade=vi.fn();initial.positions=initial.positions.slice(0,1);initial.trades=initial.trades.filter(trade=>trade.marketItemId==='profile:artist:work');element=document.createElement('div');document.body.append(element);root=createRoot(element);const fetcher=vi.spyOn(globalThis,'fetch');
 const render=async(input:ReturnType<typeof portfolioFixture>)=>act(async()=>root!.render(<Investments portfolio={parseMarketPortfolio(input,portfolioUid)} items={[]} active pulse={15000000} history={null} onTrade={onTrade}/>));
 await render(initial);await act(async()=>element.querySelector<HTMLButtonElement>('.investment-row')!.click());const dialog=element.querySelector('dialog')!,chart=dialog.querySelector('.investment-chart')!;expect(chart).not.toBeNull();
 await act(async()=>[...dialog.querySelectorAll<HTMLButtonElement>('button')].find(button=>button.textContent==='Take cash')!.click());expect(onTrade).toHaveBeenCalledExactlyOnceWith('sell','profile:artist:work');
 const partial=structuredClone(initial);partial.positions[0].shareQuantityMicro='1000000';partial.positions[0].costBasisUsdCents='800';partial.trades.push({id:'sell-partial',marketItemId:'profile:artist:work',title:'The First Light',side:'sell',shareQuantityMicro:'1500000',executionPriceUsdCents:'1000',settlementUsdCents:'1500',executedAt:'2026-10-21T12:00:30Z'});await render(partial);
 const field=(label:string)=>[...dialog.querySelectorAll('.detail-list>div')].find(row=>row.querySelector('span')?.textContent===label)?.querySelector('strong')?.textContent;
 expect(element.querySelector('dialog')).toBe(dialog);expect(field('Your shares')).toBe('1');expect(dialog.querySelector('.investment-detail-value>strong')?.textContent).toBe('$10.00');
 const closed=structuredClone(partial);closed.observedAt='2026-10-21T12:01:00Z';closed.positions[0].shareQuantityMicro='0';closed.positions[0].costBasisUsdCents='0';closed.trades.push({id:'sell-final',marketItemId:'profile:artist:work',title:'The First Light',side:'sell',shareQuantityMicro:'1000000',executionPriceUsdCents:'1000',settlementUsdCents:'1000',executedAt:'2026-10-21T12:01:00Z'});
 await render(closed);expect(element.querySelectorAll('.investment-row')).toHaveLength(0);
 expect(element.querySelector('dialog')).toBe(dialog);expect(dialog.open).toBe(true);expect(dialog.querySelector('.investment-chart')).toBe(chart);expect(dialog.querySelector('h3')?.textContent).toBe('The First Light');expect(field('Your shares')).toBe('0');expect(field('Cost basis')).toBe('$0.00');expect(field('Average cost per share')).toBe('—');expect(dialog.querySelector('.investment-detail-value>strong')?.textContent).toBe('$0.00');expect(dialog.textContent).toContain('Sold 1.5 shares');expect(dialog.textContent).toContain('Sold 1 shares');
 const sell=[...dialog.querySelectorAll<HTMLButtonElement>('button')].find(button=>button.textContent==='Take cash')!;expect(sell.disabled).toBe(true);await act(async()=>sell.click());expect(onTrade).toHaveBeenCalledOnce();expect([...dialog.querySelectorAll<HTMLButtonElement>('button')].find(button=>button.textContent==='Buy ownership')!.disabled).toBe(false);expect(fetcher).not.toHaveBeenCalled();
 await act(async()=>dialog.querySelector<HTMLButtonElement>('[aria-label="Close"]')!.click());expect(element.querySelector('dialog')).toBeNull();
});
