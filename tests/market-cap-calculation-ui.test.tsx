// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {expect,it,vi} from 'vitest';
import {MarketCalculationDetails} from '../src/features/market/MarketCalculationDetails';
import type {GlobalMarketCalculation} from '../src/receiz/market-projection/calculation';
import {chartChange} from '../src/core/chart-history';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
const calculation:GlobalMarketCalculation={pulse:15000000,sourceHash:'a'.repeat(64),generatedAt:'2026-10-30T18:00:00Z',usdCents:'15000',covered:2,listed:3,complete:false,outstandingShareQuantityMicro:'10000000',assets:[{id:'one',assetId:'one',title:'An Original',category:'proof',copies:1,basis:'share-supply',unitPriceUsdCents:'2000',quantityMicro:'5000000',usdCents:'10000',runningTotalUsdCents:'10000',inventory:{schema:'receiz.market.share-inventory.v1',marketItemId:'one',assetId:'one',family:'generic',observedAtKaiUPulse:'14999999000000',outstandingShareQuantityMicro:'3000000',availableShareQuantityMicro:'2000000',positionsMicro:'2500000',certificatesMicro:'500000',reservedBuyMicro:'1000000',availability:'quote-capacity'}},{id:'card',assetId:'card',title:'Different card values',category:'sports',copies:2,basis:'carried-collectible-aggregate',unitPriceUsdCents:'2000',quantityMicro:null,usdCents:'5000',runningTotalUsdCents:'15000'}]};
const source={serverPulse:calculation.pulse,proofObjectHash:calculation.sourceHash,shareCapitalization:calculation},points=[{pulse:14900000,at:'2026-10-23T18:00:00Z',usdCents:'10000'},{pulse:15000000,at:'2026-10-30T18:00:00Z',usdCents:'15000'}];
const click=(host:HTMLElement,label:string)=>{const button=[...host.querySelectorAll<HTMLElement>('summary,button')].find(node=>node.textContent?.includes(label));expect(button,label).toBeTruthy();act(()=>button!.click());};
it('keeps deep math unmounted until opened and shows exact sum, units, integer rounding and period operands without reads',()=>{
 const host=document.createElement('div'),root=createRoot(host),inspect=vi.fn(),fetcher=vi.spyOn(globalThis,'fetch');
 try{
  act(()=>root.render(<MarketCalculationDetails source={source} points={points} change={chartChange('10000','15000')} calculation={calculation} inspect={inspect}/>));
  expect(host.querySelector('[data-market-contribution]')).toBeNull();expect(inspect).not.toHaveBeenCalled();
  click(host,'Exact market-cap calculation');expect(inspect).toHaveBeenLastCalledWith(true);expect(host.textContent).toContain('$150.00');expect(host.textContent).toContain('1 asset');
  click(host,'Assets counted once');expect(host.querySelectorAll('[data-market-contribution]')).toHaveLength(2);
  click(host,'An Original');expect(host.textContent).toContain('2,000 × 5,000,000');expect(host.textContent).toContain('500,000');click(host,'Share supply and buying capacity');expect(host.textContent).toContain('2.5');
  click(host,'Different card values');expect(host.textContent).toContain('Recorded aggregate');expect(host.textContent).not.toContain('$20.00 × 2');
  click(host,'Selected-period change');expect(host.textContent).toContain('15,000 − 10,000');expect(host.textContent).toContain('50.00%');
  click(host,'Exact market-cap calculation');expect(host.querySelector('[data-market-contribution]')).toBeNull();expect(inspect).toHaveBeenLastCalledWith(false);expect(fetcher).not.toHaveBeenCalled();
 }finally{act(()=>root.unmount());fetcher.mockRestore();}
});
it('renders only requested rows and never presents operands from a different chart publication',()=>{
 const host=document.createElement('div'),root=createRoot(host),many={...calculation,covered:1000,listed:1000,assets:Array.from({length:1000},(_,i)=>({...calculation.assets[0],id:'asset-'+i,title:'Original '+i}))},summary={...source,shareCapitalization:many};
 try{
  act(()=>root.render(<MarketCalculationDetails source={summary} points={points} change={null} calculation={many}/>));click(host,'Exact market-cap calculation');click(host,'Assets counted once');expect(host.querySelectorAll('[data-market-contribution]')).toHaveLength(24);
  click(host,'Show next');expect(host.querySelectorAll('[data-market-contribution]')).toHaveLength(48);
  act(()=>root.render(<MarketCalculationDetails source={{...summary,serverPulse:summary.serverPulse+1}} points={points} change={null} calculation={many}/>));expect(host.querySelector('[data-market-contribution]')).toBeNull();expect(host.textContent).toContain('$150.00');
 }finally{act(()=>root.unmount());}
});
