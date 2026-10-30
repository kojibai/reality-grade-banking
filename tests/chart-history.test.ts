import { expect, it } from 'vitest';
import { chartChange, chartDateLabel, chartPeriodBounds, chartPeriodPoints, sampleChartIndices } from '../src/core/chart-history';
import {mergeWalletPoints,type WalletPoint} from '../src/receiz/wallet-series';

it('selects only real observations inside each period and keeps the real beginning for All', () => {
  const points = [0, 1, 8, 9, 10].map(day => ({ at: new Date(Date.UTC(2026, 0, 1 + day)).toISOString(), value: day }));
  expect(chartPeriodPoints(points, 'ALL')).toEqual(points);
  expect(chartPeriodPoints(points, '1W').map(point => point.value)).toEqual([8, 9, 10]);
  expect(chartPeriodPoints(points, '1D').map(point => point.value)).toEqual([9, 10]);
});
it('fits the domain to the available selected history instead of padding missing days', () => {
  const points = ['2026-10-17T10:00:00Z', '2026-10-17T11:00:00Z', '2026-10-17T12:00:00Z'].map(at => ({ at }));
  for (const period of ['1D', '1W', '1M', '3M', '1Y', 'ALL'] as const) {
    expect(chartPeriodBounds(points, period)).toEqual({ start: Date.parse(points[0].at), end: Date.parse(points[2].at) });
  }
});
it('distinguishes the real endpoints when history covers less than one minute', () => {
  const range={start:Date.UTC(2026,9,17,12),end:Date.UTC(2026,9,17,12,0,30)};
  expect(chartDateLabel(range.start,'ALL',range)).not.toBe(chartDateLabel(range.end,'ALL',range));
});
it('calculates exact signed change without inventing a percentage from a zero baseline', () => {
  expect(chartChange('10000', '12345')).toEqual({ deltaCents: '2345', percent: 23.45, trend: 'up' });
  expect(chartChange('10000', '9876')).toEqual({ deltaCents: '-124', percent: -1.24, trend: 'down' });
  expect(chartChange('0', '200')).toEqual({ deltaCents: '200', percent: null, trend: 'up' });
});
it('bounds chart geometry while retaining the beginning, latest and sharp extrema', () => {
  const values = Array.from({ length: 10000 }, (_, i) => i === 2001 ? 100000 : i === 8001 ? -100000 : i);
  const indices = sampleChartIndices(values, 320);
  expect(indices.length).toBeLessThanOrEqual(320);
  expect(indices[0]).toBe(0); expect(indices.at(-1)).toBe(9999);
  expect(indices).toContain(2001); expect(indices).toContain(8001);
});
it('keeps sparse older history visible when recent pulse observations are much denser',()=>{
 const day=86400000,times=[...Array.from({length:96},(_,i)=>i*day),...Array.from({length:10000},(_,i)=>96*day+i*6000)],values=times.map((_,i)=>100+Math.sin(i)*20);
 const indices=sampleChartIndices(values,320,times);
 expect(indices.filter(index=>index<96)).toHaveLength(96);expect(indices.length).toBeLessThanOrEqual(320);
 expect(indices[0]).toBe(0);expect(indices.at(-1)).toBe(values.length-1);
 const history=times.map((at,i):WalletPoint=>({userId:'dense-owner',at:new Date(at).toISOString(),kaiUPulse:String(i+1),totalUsdCents:String(Math.round(values[i]*100)),reserveUsdCents:'0',settlementUsdCents:String(Math.round(values[i]*100))}));
 const held=mergeWalletPoints([history],'dense-owner');
 expect(held.filter(point=>Date.parse(point.at)<96*day)).toEqual(history.slice(0,96));expect(held.length).toBeLessThanOrEqual(4096);
 expect(chartPeriodPoints(held,'1D').length).toBeGreaterThan(640);
});
it('keeps an actual observed quote over a model sample at the exact same display coordinate in either merge order',()=>{
  const observed:WalletPoint={userId:'owner',at:'2026-10-18T12:00:00Z',kaiUPulse:'15000000000000',totalUsdCents:'100',reserveUsdCents:'0',settlementUsdCents:'100'};
  const model:WalletPoint={...observed,totalUsdCents:'101',settlementUsdCents:'101',valuation:'deterministic-v129'};
  for(const histories of [[[model],[observed]],[[observed],[model]]])expect(mergeWalletPoints(histories,'owner')).toEqual([observed]);
  const later={...observed,at:'2026-10-18T12:01:00Z',totalUsdCents:'102',settlementUsdCents:'102'};
  expect(mergeWalletPoints([[model,observed,later]],'owner')).toEqual([observed,later]);
});
it('uses distinct full selected windows from the original history even when recent observations are sparse',()=>{
 const end=Date.UTC(2026,9,18,12),points=[400,2,0].map(days=>({at:new Date(end-days*86400000).toISOString()}));
 for(const [period,days]of [['1D',1],['1W',7],['1M',31],['3M',93],['1Y',366]]as const)expect(chartPeriodBounds(points,period)).toEqual({start:end-days*86400000,end});
 expect(chartPeriodBounds(points,'ALL')?.start).toBe(end-400*86400000);
});
