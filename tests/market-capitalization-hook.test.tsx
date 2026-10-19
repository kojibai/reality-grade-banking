// @vitest-environment happy-dom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, expect, it, vi } from 'vitest';
import { CHART_PERIODS, type ChartPeriod } from '../src/core/chart-history';
import { useMarketCapitalization } from '../src/receiz/market-projection/useMarketCapitalization';
import sourceFile from'../public/receiz-public-capitalization.json';
import{parsePublicMarket}from'../src/receiz/public-market';
import{parseMarketCapSource}from'../src/receiz/market-projection/source';
import{buildMarketHistory}from'../src/receiz/market-projection/build-history';
const clock=vi.hoisted(()=>({pulse:14720000}));vi.mock('@receiz/sdk',async original=>({...await original<typeof import('@receiz/sdk')>(),receizKaiNow:()=>({pulse:clock.pulse})}));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
afterEach(() => { vi.unstubAllGlobals(); localStorage.clear();vi.useRealTimers(); });
it('feeds live membership to the chart worker and publishes all periods and their amount together',async()=>{
 vi.useFakeTimers();clock.pulse=14720000;vi.stubGlobal('fetch',vi.fn(async()=>Response.json(sourceFile)));
 const messages:any[]=[];let worker!:WorkerStub;
 class WorkerStub{onmessage:((event:any)=>void)|null=null;constructor(){worker=this;}postMessage(message:any){messages.push(message);}terminate(){}}
 vi.stubGlobal('Worker',WorkerStub);
 const seed={kind:'sigil',claimPulse:14700000,beat:2,stepIndex:3,creatorVerified:true};
 const catalog=parsePublicMarket({ok:true,transport:{generatedAt:'2026-10-18T22:00:00Z',publicMembership:{version:1,scope:'whole-market-visible-showcase',source:'canonical-complete',isComplete:true,itemCount:1,revision:'new'},publicOriginals:[{id:'new',receizId:'new',title:'New object',pulse:'14700000',livePulseSeed:seed}]}});
 let state!:ReturnType<typeof useMarketCapitalization>;const root=createRoot(document.createElement('div'));
 function Probe({period='ALL'}:{period?:ChartPeriod}){state=useMarketCapitalization(period,true,catalog);return null;}
 try{await act(async()=>root.render(<Probe/>));const request=[...messages].reverse().find(message=>message.source);expect(request.catalog).toBe(catalog);expect(request.pulse).toBe(clock.pulse);
  const old=state.source;expect(state.points.at(-1)?.usdCents).toBe(String(Math.round(old.currentUsd*100)));
  const sent=messages.length;clock.pulse++;await act(async()=>vi.advanceTimersByTimeAsync(1000));expect(messages).toHaveLength(sent);
  const history=(await buildMarketHistory(parseMarketCapSource(sourceFile),null,undefined,undefined,{catalog,pulse:request.pulse}))!;
  act(()=>worker.onmessage!({data:{id:request.id,history}}));expect(state.source.marketAssetsPriced).toBe(1);expect(state.source.serverPulse).toBe(request.pulse);expect(state.points.at(-1)?.usdCents).toBe(String(Math.round(state.source.currentUsd*100)));
  expect(messages.at(-1).history.basisSha256).toBe(history.basisSha256);
  const latest=messages.at(-1),advanced=(await buildMarketHistory(parseMarketCapSource(sourceFile),history,undefined,undefined,{catalog,pulse:clock.pulse}))!;act(()=>worker.onmessage!({data:{id:latest.id,history:advanced}}));
  const count=messages.length;await act(async()=>root.render(<Probe period="1D"/>));expect(messages).toHaveLength(count);expect(state.points.length).toBeGreaterThanOrEqual(64);expect(state.points.length).toBeLessThanOrEqual(96);
  clock.pulse++;await act(async()=>vi.advanceTimersByTimeAsync(1000));expect(messages.at(-1).pulse).toBe(clock.pulse);
 }finally{act(()=>root.unmount());}
});
it('switches every range and restores the market instantly without a worker or a network result', async () => {
  vi.stubGlobal('Worker', undefined); const fetch = vi.fn().mockRejectedValue(new Error('offline')); vi.stubGlobal('fetch', fetch);
  let state!: ReturnType<typeof useMarketCapitalization>; const root = createRoot(document.createElement('div'));
  function Probe({ period, active }: { period: ChartPeriod; active: boolean }) { state = useMarketCapitalization(period, active); return null; }
  try {
    await act(async () => root.render(<Probe period="ALL" active={false} />));
    const initial = state.points; expect(initial.length).toBeGreaterThanOrEqual(64);expect(initial.length).toBeLessThanOrEqual(96); expect(fetch).not.toHaveBeenCalled();
    for (const period of CHART_PERIODS) { await act(async () => root.render(<Probe period={period} active />)); expect(state.points.length).toBeGreaterThanOrEqual(64);expect(state.points.length).toBeLessThanOrEqual(96); }
    await act(async () => root.render(<Probe period="ALL" active={false} />));
    await act(async () => root.render(<Probe period="ALL" active />));
    expect(state.points).toBe(initial); expect(state.status).toBe('unavailable');
  } finally { act(() => root.unmount()); }
});
it('restarts a suspended PWA worker and samples the canonical pulse immediately on foreground',async()=>{
 vi.useFakeTimers();clock.pulse=14720000;vi.stubGlobal('fetch',vi.fn(async()=>Response.json(sourceFile)));
 const workers:WorkerStub[]=[];
 class WorkerStub{onmessage:((event:any)=>void)|null=null;messages:any[]=[];terminate=vi.fn();constructor(){workers.push(this);}postMessage(value:any){this.messages.push(value);}}
 vi.stubGlobal('Worker',WorkerStub);
 let state!:ReturnType<typeof useMarketCapitalization>;const root=createRoot(document.createElement('div'));
 function Probe(){state=useMarketCapitalization('ALL',true);return null;}
 try{
  await act(async()=>root.render(<Probe/>));const completed=state.source,first=workers[0];expect(first.messages.some(message=>message.source)).toBe(true);
  // The background process disappears before its in-flight valuation replies.
  Object.defineProperty(document,'visibilityState',{configurable:true,value:'hidden'});act(()=>document.dispatchEvent(new Event('visibilitychange')));
  clock.pulse+=100;
  Object.defineProperty(document,'visibilityState',{configurable:true,value:'visible'});act(()=>document.dispatchEvent(new Event('visibilitychange')));
  expect(workers.length).toBeGreaterThan(1);expect(first.terminate).toHaveBeenCalled();
  expect(workers.at(-1)!.messages.find(message=>message.source)?.pulse).toBe(clock.pulse);expect(state.source).toBe(completed);
  const resumed=workers.at(-1)!;clock.pulse+=20;act(()=>window.dispatchEvent(new Event('pageshow')));
  expect(resumed.terminate).toHaveBeenCalled();expect(workers.at(-1)!.messages.find(message=>message.source)?.pulse).toBe(clock.pulse);
  const reopened=workers.at(-1)!;clock.pulse+=20;act(()=>window.dispatchEvent(new Event('focus')));
  expect(reopened.terminate).toHaveBeenCalled();expect(workers.at(-1)!.messages.find(message=>message.source)?.pulse).toBe(clock.pulse);
 }finally{act(()=>root.unmount());Object.defineProperty(document,'visibilityState',{configurable:true,value:'visible'});}
});
it.each(['onerror','onmessageerror'] as const)('recovers a visible failed worker on the next Kai pulse after %s',async(kind)=>{
 vi.useFakeTimers();clock.pulse=14720000;
 const original=parseMarketCapSource(sourceFile),row=original.valueRows.find(row=>row.marketItem?.livePulseSeed)!,tiny={...original,generatedAt:'2026-10-19T05:00:00Z',serverPulse:clock.pulse-1,valueRows:[row],marketAssetsPriced:1,sportsCardsPriced:0,cardsInCirculation:0};
 vi.stubGlobal('fetch',vi.fn(async()=>Response.json({ok:true,marketCapProjection:tiny})));
 const workers:WorkerStub[]=[];
 class WorkerStub{onmessage:((event:any)=>void)|null=null;onerror:((event:any)=>void)|null=null;onmessageerror:((event:any)=>void)|null=null;messages:any[]=[];terminate(){}constructor(){workers.push(this);}postMessage(value:any){this.messages.push(value);}}
 vi.stubGlobal('Worker',WorkerStub);
 let state!:ReturnType<typeof useMarketCapitalization>;const root=createRoot(document.createElement('div'));
 function Probe(){state=useMarketCapitalization('ALL',true);return null;}
 try{
  await act(async()=>root.render(<Probe/>));const retained=state.source;act(()=>workers[0][kind]!({}));expect(workers).toHaveLength(1);expect(state.source).toBe(retained);
  clock.pulse++;await act(async()=>vi.advanceTimersByTimeAsync(1000));expect(workers).toHaveLength(2);
  const next=workers.at(-1)!,request=next.messages.find(message=>message.source);expect(request.pulse).toBe(clock.pulse);
  const history=(await buildMarketHistory(request.source.marketCapProjection,null,undefined,undefined,{catalog:null,pulse:clock.pulse}))!;
  act(()=>next.onmessage!({data:{id:request.id,history}}));expect(state.source.serverPulse).toBe(clock.pulse);expect(state.points.at(-1)?.usdCents).toBe(String(Math.round(state.source.currentUsd*100)));
 }finally{act(()=>root.unmount());}
});
