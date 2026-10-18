// @vitest-environment happy-dom
import {act,useLayoutEffect} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import sourceFile from '../public/receiz-public-capitalization.json';
import marketFile from '../public/receiz-public-market.json';
import {parsePublicMarket} from '../src/receiz/public-market';
import {parseMarketCapSource} from '../src/receiz/market-projection/source';
const source=parseMarketCapSource(sourceFile);
const item=parsePublicMarket(marketFile,marketFile.snapshot).items.find(item=>source.valueRows.some(row=>row.marketItem?.id===item.id&&row.seed===item.assetId&&row.marketItem.livePulseSeed?.claimPulse===Number(item.pulse)))!;
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
beforeEach(()=>{vi.resetModules();localStorage.clear();});
afterEach(()=>{vi.unstubAllGlobals();});
it('opens period history directly from a showcase object before visiting Market or Ledger',async()=>{
 const fetch=vi.fn(async(path:unknown)=>path==='/receiz-public-capitalization.json'?Response.json(sourceFile):new Response('',{status:503}));vi.stubGlobal('fetch',fetch);
 const {PublicAssetDetail}=await import('../src/features/market/PublicAssetDetail');const host=document.createElement('div'),root=createRoot(host);
 try{
  await act(async()=>root.render(<PublicAssetDetail item={item}/>));
  const buttons=[...host.querySelectorAll<HTMLButtonElement>('.periods button')];expect(buttons).toHaveLength(6);
  const chart=()=>host.querySelector<SVGElement>('.asset-chart svg')!,start=()=>Number(chart().getAttribute('data-range-start'));
  const all=start(),requests=fetch.mock.calls.length;act(()=>buttons[1].click());expect(start()).toBeGreaterThan(all);const day=start();act(()=>buttons[2].click());expect(start()).toBeLessThan(day);expect(fetch.mock.calls.length).toBe(requests);
 }finally{act(()=>root.unmount());}
});
it('restores object periods in the first cold frame with the source unavailable',async()=>{
 const {publishMarketDisplaySource}=await import('../src/receiz/market-projection/display-source');publishMarketDisplaySource(source);
 vi.resetModules();const fetch=vi.fn().mockRejectedValue(Error('offline'));vi.stubGlobal('fetch',fetch);
 const {PublicAssetDetail}=await import('../src/features/market/PublicAssetDetail');const host=document.createElement('div'),root=createRoot(host),frames:number[]=[];
 function Probe(){useLayoutEffect(()=>{frames.push(host.querySelectorAll('.periods button').length);},[]);return <PublicAssetDetail item={item}/>;}
 try{await act(async()=>root.render(<Probe/>));expect(frames[0]).toBe(6);const buttons=host.querySelectorAll<HTMLButtonElement>('.periods button');for(const button of buttons)act(()=>button.click());expect(fetch).not.toHaveBeenCalled();}finally{act(()=>root.unmount());}
});
it('does not give period returns to an object without matching pricing operands',async()=>{
 const fetch=vi.fn(async(path:unknown)=>path==='/receiz-public-capitalization.json'?Response.json(sourceFile):new Response('',{status:503}));vi.stubGlobal('fetch',fetch);
 const {PublicAssetDetail}=await import('../src/features/market/PublicAssetDetail');const host=document.createElement('div'),root=createRoot(host);
 try{await act(async()=>root.render(<PublicAssetDetail item={{...item,pulse:String(Number(item.pulse)+1)}}/>));expect(host.querySelector('.periods')).toBeNull();expect(host.querySelector('.asset-chart')).toBeNull();}finally{act(()=>root.unmount());}
});
it('refreshes a retained pricing source when a newly discovered object is absent from that cache',async()=>{
 const old={...source,valueRows:source.valueRows.filter(row=>row.marketItem?.id!==item.id),marketAssetsPriced:source.marketAssetsPriced-1};
 const {publishMarketDisplaySource}=await import('../src/receiz/market-projection/display-source');publishMarketDisplaySource(old);
 const fetch=vi.fn(async(path:unknown)=>path==='/api/bank/public-market/capitalization'?Response.json(sourceFile):new Response('',{status:503}));vi.stubGlobal('fetch',fetch);
 const {PublicAssetDetail}=await import('../src/features/market/PublicAssetDetail');const host=document.createElement('div'),root=createRoot(host);
 try{await act(async()=>root.render(<PublicAssetDetail item={item}/>));expect(host.querySelectorAll('.periods button')).toHaveLength(6);const count=fetch.mock.calls.length;act(()=>host.querySelectorAll<HTMLButtonElement>('.periods button')[1].click());expect(fetch.mock.calls.length).toBe(count);}finally{act(()=>root.unmount());}
});
it('keeps a live same-pulse object model when an older shipped response arrives afterwards',async()=>{
 const old={...sourceFile,marketCapProjection:{...source,valueRows:source.valueRows.filter(row=>row.marketItem?.id!==item.id),marketAssetsPriced:source.marketAssetsPriced-1}};
 let finish!:(response:Response)=>void;
 vi.stubGlobal('fetch',vi.fn(async(path:unknown)=>path==='/receiz-public-capitalization.json'?new Promise<Response>(resolve=>{finish=resolve;}):Response.json(sourceFile)));
 const {PublicAssetDetail}=await import('../src/features/market/PublicAssetDetail');const host=document.createElement('div'),root=createRoot(host);
 try{await act(async()=>root.render(<PublicAssetDetail item={item}/>));expect(host.querySelectorAll('.periods button')).toHaveLength(6);await act(async()=>finish(Response.json(old)));expect(host.querySelectorAll('.periods button')).toHaveLength(6);}finally{act(()=>root.unmount());}
});
it('coalesces discovery, object and overview reads of the same public endpoint',async()=>{
 let finish!:(response:Response)=>void;const fetch=vi.fn(()=>new Promise<Response>(resolve=>{finish=resolve;}));vi.stubGlobal('fetch',fetch);
 const {readMarketDisplaySource,retainedMarketDisplaySource}=await import('../src/receiz/market-projection/display-source');
 const first=readMarketDisplaySource('/api/bank/public-market/capitalization'),second=readMarketDisplaySource('/api/bank/public-market/capitalization');
 expect(first).toBe(second);finish(Response.json(sourceFile));await Promise.all([first,second]);expect(fetch).toHaveBeenCalledTimes(1);expect(retainedMarketDisplaySource()?.valueRows.some(row=>row.marketItem?.id===item.id)).toBe(true);
});
