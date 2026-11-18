// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,expect,it,vi} from 'vitest';
import {createHash} from 'node:crypto';
import type {ComponentProps} from 'react';
import {MarketOverviewView} from '../src/features/market/MarketOverview';
import type {ValueChart} from '../src/components/ValueChart';
import shippedHistory from '../public/receiz-public-share-chart-history.json';
import {parseMarketHistory} from '../src/receiz/market-projection/history';
const trace=vi.hoisted(()=>({props:[] as Array<ComponentProps<typeof ValueChart>>}));
vi.mock('../src/components/ValueChart',async original=>{
 const actual=await original<typeof import('../src/components/ValueChart')>();
 return {...actual,ValueChart:(props:ComponentProps<typeof ValueChart>)=>{
  trace.props.push(props);return <actual.ValueChart {...props}/>;
 }};
});
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
afterEach(()=>{trace.props=[];vi.unstubAllGlobals();});
const points=[{pulse:1,at:'2026-11-01T00:00:00Z',usdCents:'10000'},
 {pulse:2,at:'2026-11-02T00:00:00Z',usdCents:'12500'}];
type Props=ComponentProps<typeof MarketOverviewView>;
const projection={source:{shareCapitalization:{usdCents:'12500',listed:2,covered:2,complete:true},marketAssetsPriced:2,cardsInCirculation:0},points,status:'live'} as unknown as Props['projection'];
function mount(){
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
 const render=(value:Props['projection']=projection,period:Props['period']='ALL')=>act(()=>root.render(<MarketOverviewView catalog={null} projection={{...value}} period={period} onPeriodChange={()=>{}} onExplore={()=>{}}/>));
 return {host,render,close(){act(()=>root.unmount());host.remove();}};
}
it('reuses the held chart geometry inputs through unrelated parent and information-panel renders',()=>{
 const fetcher=vi.fn(()=>{throw Error('unexpected read');});vi.stubGlobal('fetch',fetcher);const view=mount();
 try{
  view.render();const first=trace.props.at(-1)!,svg=view.host.querySelector('svg[role="img"]')!.outerHTML;
  view.render();const second=trace.props.at(-1)!;
  expect(second.values).toBe(first.values);expect(second.times).toBe(first.times);expect(second.timeRange).toBe(first.timeRange);
  expect(view.host.querySelector('svg[role="img"]')!.outerHTML).toBe(svg);
  const info=view.host.querySelector<HTMLButtonElement>('[aria-label="About market capitalization"]')!;
  act(()=>info.click());const opened=trace.props.at(-1)!;
  expect(opened.values).toBe(first.values);expect(opened.times).toBe(first.times);expect(opened.timeRange).toBe(first.timeRange);
  expect(view.host.querySelector('svg[role="img"]')!.outerHTML).toBe(svg);expect(fetcher).not.toHaveBeenCalled();
 }finally{view.close();}
});
it('updates the exact chart, dates and tooltip when held points or selected period change',()=>{
 const view=mount();try{
  view.render();const first=trace.props.at(-1)!;
  expect(first.values).toEqual([100,125]);expect(first.times).toEqual([1793491200000,1793577600000]);
  expect(first.tooltip!(1).value).toBe('$125.00');
  const replacement=[...points,{pulse:3,at:'2026-11-03T00:00:00Z',usdCents:'15000'}];
  view.render({...projection,points:replacement});const next=trace.props.at(-1)!;
  expect(next.values).toEqual([100,125,150]);expect(next.values).not.toBe(first.values);expect(next.times).not.toBe(first.times);
  expect(next.tooltip!(2).value).toBe('$150.00');expect(view.host.querySelector('svg[role="img"]')!.getAttribute('aria-label')).toBe('Global share market cap · All history, from 100 to 150');
  view.render({...projection,points:replacement},'1D');const period=trace.props.at(-1)!;
  expect(period.label).toBe('Global share market cap · 1D');expect(period.values).toBe(next.values);expect(period.times).toBe(next.times);
  expect(period.timeRange).not.toBe(next.timeRange);
 }finally{view.close();}
});
it('keeps the actual shipped all-history geometry and inputs through forty unchanged publications',()=>{
 const held=parseMarketHistory(shippedHistory),value={source:held.summary,points:held.series.ALL,status:'cached' as const},view=mount();
 const samples=(globalThis as typeof globalThis&{__marketGeometrySamples?:number[]});if(samples.__marketGeometrySamples)samples.__marketGeometrySamples=[];
 try{
  view.render(value);const first=trace.props.at(-1)!,svg=view.host.querySelector('svg[role="img"]')!.outerHTML;
  for(let update=0;update<40;update++)view.render(value);
  const rows=trace.props,metric={renders:rows.length,heldPoints:value.points.length,svgSha256:createHash('sha256').update(svg).digest('hex'),tooltipLast:first.tooltip!(value.points.length-1),valuesArrays:new Set(rows.map(row=>row.values)).size,timesArrays:new Set(rows.map(row=>row.times)).size,boundsObjects:new Set(rows.map(row=>row.timeRange)).size,geometryComputations:samples.__marketGeometrySamples?.length,geometryTotalMs:samples.__marketGeometrySamples?.reduce((sum,ms)=>sum+ms,0)};
  console.info('HELD_MARKET_CHART_WORK',JSON.stringify(metric));
  expect(trace.props.at(-1)!.values).toBe(first.values);expect(trace.props.at(-1)!.times).toBe(first.times);expect(trace.props.at(-1)!.timeRange).toBe(first.timeRange);
  expect(view.host.querySelector('svg[role="img"]')!.outerHTML).toBe(svg);
 }finally{view.close();}
});
