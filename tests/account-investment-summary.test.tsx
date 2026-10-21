// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {expect,it,vi} from 'vitest';
import {LiveAccount} from '../src/features/account/LiveAccount';
import {parseMarketPortfolio,type MarketPortfolio} from '../src/receiz/market-portfolio';
import {parsePublicMarket,type PublicMarketItem} from '../src/receiz/public-market';
import {portfolioFixture,portfolioUid} from './fixtures/market-portfolio';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
const items=parsePublicMarket({ok:true,transport:{publicOriginals:[{id:'profile:artist:work',receizId:'work',title:'The First Light',valueUsd:12},{id:'profile:artist:other',receizId:'other',title:'Second Light',valueUsd:5},{id:'profile:artist:showcase',receizId:'showcase',title:'A Public Original',valueUsd:9000}]}}).items;
const no=()=>{};
function fixture(portfolio:MarketPortfolio|null){
 const host=document.createElement('div'),root=createRoot(host),onAssets=vi.fn();
 const render=(value=portfolio,publicItems:PublicMarketItem[]=items)=>act(async()=>root.render(<LiveAccount wallet={null} busy={false} error={null} observedAt={null} onRefresh={no} onSend={no} onReceive={no} onBalance={no} onAssets={onAssets} onLedger={no} portfolio={value} marketItems={publicItems} showcase={[items[2]]}/>));
 return{host,root,onAssets,render};
}
it('puts purchased holdings before Showcase and shows quantity, holding value and cost-basis return without requesting data',async()=>{
 const {host,root,onAssets,render}=fixture(parseMarketPortfolio(portfolioFixture(),portfolioUid)),fetcher=vi.spyOn(globalThis,'fetch');
 try{await render();const section=host.querySelector('.account-assets-summary')!,rows=section.querySelectorAll('.account-investment-row');expect(rows).toHaveLength(2);
  expect(rows[0].textContent).toContain('Second Light');expect(rows[0].textContent).toContain('1 share');expect(rows[0].textContent).toContain('$5.00');expect(rows[0].querySelector('.negative')?.textContent).toContain('16.66%');
  expect(rows[1].textContent).toContain('2.5 shares');expect(rows[1].textContent).toContain('$30.00');expect(rows[1].querySelector('.positive')?.textContent).toContain('+50%');
  expect(section.textContent!.indexOf('Second Light')).toBeLessThan(section.textContent!.indexOf('A Public Original'));
  await act(async()=>rows[0].dispatchEvent(new MouseEvent('click',{bubbles:true})));expect(onAssets).toHaveBeenCalledOnce();expect(fetcher).not.toHaveBeenCalled();
 }finally{act(()=>root.unmount());fetcher.mockRestore();}
});
it('shows the three most recent purchases, without ranking a recent sale as a new investment',async()=>{
 const p=parseMarketPortfolio(portfolioFixture(),portfolioUid),base=p.positions[0];
 p.positions=['a','b','c','d'].map((id,index)=>({...base,id,marketItemId:id,assetId:id,title:id.toUpperCase(),openedAt:`2026-10-${17+index}T12:00:00Z`,lastTradeAt:id==='d'?'2026-10-22T12:00:00Z':null}));
 p.trades=[{...p.trades[0],id:'new-purchase',marketItemId:'a',executedAt:'2026-10-21T12:00:00Z'},{...p.trades[0],id:'recent-sale',marketItemId:'d',side:'sell',executedAt:'2026-10-22T12:00:00Z'}];
 const {host,root,render}=fixture(p);try{await render();expect([...host.querySelectorAll('.account-investment-row .row-copy strong')].map(node=>node.textContent)).toEqual(['A','D','C']);}finally{act(()=>root.unmount());}
});
it('retains Showcase as the default when no purchased holding exists, including after a full sale',async()=>{
 const p=parseMarketPortfolio(portfolioFixture(),portfolioUid),{host,root,render}=fixture(null);
 try{await render();expect(host.querySelector('.account-investment-row')).toBeNull();expect(host.querySelector('.account-assets-summary')?.textContent).toContain('A Public Original');
  await render(p);expect(host.querySelectorAll('.account-investment-row')).toHaveLength(2);
  await render({...p,positions:[]});expect(host.querySelector('.account-investment-row')).toBeNull();expect(host.querySelector('.account-assets-summary')?.textContent).toContain('A Public Original');
 }finally{act(()=>root.unmount());}
});
it('updates existing rows inline from the same portfolio and pricing inputs without substituting public price change for return',async()=>{
 const p=parseMarketPortfolio(portfolioFixture(),portfolioUid),{host,root,render}=fixture(p);
 try{await render();const next={...p,positions:[{...p.positions[0],shareQuantityMicro:'3500000',costBasisUsdCents:'3000'}]};
  await render(next,items.map(item=>item.id===next.positions[0].marketItemId?{...item,priceUsd:20,changePct:-99}:item));
  const row=host.querySelector('.account-investment-row')!;expect(row.textContent).toContain('3.5 shares');expect(row.textContent).toContain('$70.00');expect(row.querySelector('.positive')?.textContent).toContain('+133.33%');expect(row.textContent).not.toContain('-99');
  await render({...next,positions:[{...next.positions[0],costBasisUsdCents:null,lastPriceUsdCents:null}]},[]);expect(host.querySelector('.account-investment-row')?.textContent).toContain('—');expect(host.querySelector('.account-investment-row .positive')).toBeNull();
 }finally{act(()=>root.unmount());}
});
