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
    const initial = state.points; expect(initial).toHaveLength(64); expect(fetch).not.toHaveBeenCalled();
    for (const period of CHART_PERIODS) { await act(async () => root.render(<Probe period={period} active />)); expect(state.points).toHaveLength(64); }
    await act(async () => root.render(<Probe period="ALL" active={false} />));
    await act(async () => root.render(<Probe period="ALL" active />));
    expect(state.points).toBe(initial); expect(state.status).toBe('unavailable');
  } finally { act(() => root.unmount()); }
});
