// @vitest-environment happy-dom
import {afterEach,expect,it,vi} from 'vitest';
import {act} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {OpenInvestment} from '../src/features/assets/OpenInvestment';
import {publishOpenPortfolio,readOpenPortfolio} from '../src/receiz/market-portfolio-presentation';
import {parseMarketPortfolio} from '../src/receiz/market-portfolio';
import {portfolioFixture,portfolioUid} from './fixtures/market-portfolio';
let root:Root|undefined,element:HTMLDivElement;
afterEach(async()=>{if(root)await act(()=>root!.unmount());root=undefined;element?.remove();publishOpenPortfolio('test-owner',null);vi.restoreAllMocks();});
it('shows the retained legacy holding and its trades on the canonical public asset without reading the account again',async()=>{
 publishOpenPortfolio('test-owner',parseMarketPortfolio(portfolioFixture(),portfolioUid));element=document.createElement('div');document.body.append(element);root=createRoot(element);const fetcher=vi.spyOn(globalThis,'fetch');
 await act(()=>root!.render(<OpenInvestment item={{id:'canonical:work',assetId:'work',priceUsd:12} as never}/>));expect(element.textContent).toContain('Your shares');expect(element.textContent).toContain('2.5');expect(element.textContent).toContain('$30.00');expect(element.textContent).toContain('Bought');expect(fetcher).not.toHaveBeenCalled();
 await act(()=>publishOpenPortfolio('test-owner',null));expect(element.textContent).toBe('');expect(readOpenPortfolio()).toBeNull();
});
