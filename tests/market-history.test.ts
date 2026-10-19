import { readFileSync } from 'node:fs';
import { expect, it, vi } from 'vitest';
import { CHART_PERIODS } from '../src/core/chart-history';
import { parseMarketCapSource } from '../src/receiz/market-projection/source';
import { marketHistoryBasis, parseMarketHistory } from '../src/receiz/market-projection/history';
import { buildMarketHistory } from '../src/receiz/market-projection/build-history';
import { marketPeriodPulses } from '../src/receiz/market-projection/coordinates';
import{currentMarketDisplayModel}from'../src/receiz/market-projection/catalog-source';
import{parsePublicMarket}from'../src/receiz/public-market';
import{mergePublicSports}from'../src/receiz/public-sports';
const calculate = vi.hoisted(() => vi.fn((source: { serverPulse: number; currentUsd: number }, pulse: number) => pulse === source.serverPulse ? source.currentUsd : pulse));
vi.mock('../src/receiz/market-projection/project', async original => ({...await original<typeof import('../src/receiz/market-projection/project')>(),marketCapUsdAtPulse:calculate}));
const seed = parseMarketCapSource(JSON.parse(readFileSync(new URL('../public/receiz-public-capitalization.json', import.meta.url), 'utf8')));
const shipped = parseMarketHistory(JSON.parse(readFileSync(new URL('../public/receiz-public-chart-history.json', import.meta.url), 'utf8')));
it('ships all six complete genuine public intervals before any network read or worker result', async () => {
  const membership=JSON.parse(readFileSync(new URL('../public/receiz-public-market.json',import.meta.url),'utf8')),cards=JSON.parse(readFileSync(new URL('../public/receiz-public-sports.json',import.meta.url),'utf8')),catalog=mergePublicSports(parsePublicMarket(membership),cards),current=currentMarketDisplayModel(seed,catalog,shipped.summary.serverPulse);
  expect(shipped.summary.serverPulse).toBeGreaterThanOrEqual(Math.max(...catalog.items.map(item=>item.livePulseSeed?.claimPulse??0)));
  expect(shipped.basisSha256).toBe(await marketHistoryBasis(current));
  expect(shipped.summary.marketAssetsPriced).toBe(current.marketAssetsPriced);
  for (const period of CHART_PERIODS) {
    expect(shipped.series[period].length).toBeGreaterThanOrEqual(64);expect(shipped.series[period].length).toBeLessThanOrEqual(96+(shipped.eventPulses?.length??0));
    expect(shipped.series[period][0].pulse).toBe(marketPeriodPulses(current, period)[0]);
    expect(shipped.series[period].at(-1)?.usdCents).toBe(String(Math.round(shipped.summary.currentUsd*100)));
  }
});
it('refreshes a constant public valuation basis without rebuilding historic samples', async () => {
  const retained=(await buildMarketHistory(seed))!;
  calculate.mockClear(); const source = { ...seed, serverPulse: seed.serverPulse + 60, currentUsd: seed.currentUsd + 100 };
  const updated = (await buildMarketHistory(source, retained))!;
  expect(calculate.mock.calls.length).toBeLessThanOrEqual(6);
  for (const period of CHART_PERIODS) {
    expect(updated.series[period][0].pulse).toBe(marketPeriodPulses(source, period)[0]);
    expect(updated.series[period].at(-1)?.usdCents).toBe(String(Math.round(source.currentUsd * 100)));
    expect(updated.series[period].some(point => point.pulse === retained.series[period][20].pulse && point.usdCents === retained.series[period][20].usdCents)).toBe(true);
  }
  expect(() => parseMarketHistory(updated)).not.toThrow();
});
it('rebuilds all ranges when a public asset valuation basis changes', async () => {
  const retained=(await buildMarketHistory(seed))!;
  calculate.mockClear(); const source = structuredClone(seed); source.valueRows[0].scoreDelta += 1;
  const rebuilt = (await buildMarketHistory(source, retained))!;
  expect(rebuilt.basisSha256).not.toBe(retained.basisSha256); expect(calculate.mock.calls.length).toBeGreaterThan(100);
  for (const period of CHART_PERIODS) {expect(rebuilt.series[period].length).toBeGreaterThanOrEqual(64);expect(rebuilt.series[period].length).toBeLessThanOrEqual(96+(rebuilt.eventPulses?.length??0));}
});
it('rejects stale endpoints, missing ranges, wrong pulse labels and malformed retained values', () => {
  const corrupted = structuredClone(shipped); corrupted.series['1D'][0].at = '2026-01-01T00:00:00Z';
  expect(() => parseMarketHistory(corrupted)).toThrow();
  expect(() => parseMarketHistory({ ...shipped, series: { ALL: shipped.series.ALL } })).toThrow();
  const bad = structuredClone(shipped); bad.series.ALL.at(-1)!.usdCents = 'NaN'; expect(() => parseMarketHistory(bad)).toThrow();
});
it('rejects public chart coverage that exceeds circulation or the source row limit', () => {
  expect(() => parseMarketHistory({ ...shipped, summary: { ...shipped.summary, cardsInCirculation: 0 } })).toThrow();
  expect(() => parseMarketHistory({ ...shipped, summary: { ...shipped.summary, marketAssetsPriced: 1e14 } })).toThrow();
});
it('rejects malformed retained observation coordinates and undated aggregate fields before rendering or worker use',()=>{
  for(const observationPulses of [{},[NaN],[1,1],[-1]])expect(()=>parseMarketHistory({...shipped,observationPulses})).toThrow();
  for(const undatedHistory of [{},{rows:1,observationPulse:0,observationUsd:NaN,sourceReportedTotalUsd:100,modelPulse:1},{rows:1,observationPulse:2,observationUsd:10,sourceReportedTotalUsd:100,modelPulse:1}]){
    expect(()=>parseMarketHistory({...shipped,summary:{...shipped.summary,undatedHistory}})).toThrow();
    expect(()=>parseMarketCapSource({ok:true,marketCapProjection:{...seed,undatedHistory}})).toThrow();
  }
});
it('refuses a retained chart that omits a declared seal or carries invalid event coordinates',()=>{
 const event=shipped.eventPulses!.find(pulse=>pulse>shipped.summary.firstIssuancePulse&&pulse<shipped.summary.serverPulse)!;
 const missing=structuredClone(shipped);missing.series.ALL=missing.series.ALL.filter(point=>point.pulse!==event);
 expect(()=>parseMarketHistory(missing)).toThrow('sealed event is missing');
 for(const eventPulses of [undefined,{},[-1],[event,event],[shipped.summary.serverPulse+1]])expect(()=>parseMarketHistory({...shipped,eventPulses})).toThrow();
});
