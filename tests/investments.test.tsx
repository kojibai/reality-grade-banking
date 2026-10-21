// @vitest-environment happy-dom
import {afterEach,expect,it,vi} from 'vitest';
import {act} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {Investments} from '../src/features/assets/Investments';
import {parseMarketPortfolio} from '../src/receiz/market-portfolio';
import {portfolioFixture,portfolioUid} from './fixtures/market-portfolio';
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
