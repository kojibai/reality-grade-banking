import {readFileSync} from 'node:fs';
import {expect,it,vi} from 'vitest';
import * as pricing from '../src/receiz/market-projection/project';
import {CHART_PERIODS} from '../src/core/chart-history';
import {parseMarketCapSource} from '../src/receiz/market-projection/source';
import {matchPublicAssetRow,projectPublicAssetPeriods} from '../src/receiz/market-projection/asset';
import {marketAssetUsdAtPulse,marketPulseTime} from '../src/receiz/market-projection/project';
import {parsePublicMarket} from '../src/receiz/public-market';
const source=parseMarketCapSource(JSON.parse(readFileSync(new URL('../public/receiz-public-capitalization.json',import.meta.url),'utf8')));
const input=JSON.parse(readFileSync(new URL('../public/receiz-public-market.json',import.meta.url),'utf8')),catalog=parsePublicMarket(input,input.snapshot);
const item=catalog.items.find(item=>source.valueRows.some(row=>row.marketItem?.id===item.id&&row.seed===item.assetId&&row.marketItem.livePulseSeed?.claimPulse===Number(item.pulse)))!;
it('recomputes six bounded object histories from the exact admitted public seed and real Kai bounds',()=>{
 const histories=projectPublicAssetPeriods(item,source,source.serverPulse)!;
 expect(histories).not.toBeNull();const row=matchPublicAssetRow(item,source)!;
 for(const period of CHART_PERIODS){const points=histories[period];expect(points.length).toBeLessThanOrEqual(96);expect(points.length).toBeGreaterThan(1);expect(points.at(-1)?.pulse).toBe(source.serverPulse);expect(points.at(-1)?.usdCents).toBe(String(Math.round(marketAssetUsdAtPulse(row,source.serverPulse)*100)));expect(points[0].pulse).toBeGreaterThanOrEqual(row.marketItem!.livePulseSeed!.claimPulse);for(const point of points)expect(Date.parse(point.at)).toBe(marketPulseTime(point.pulse));}
 expect(histories['1D'][0].pulse).toBeGreaterThan(histories['1W'][0].pulse);expect(histories['1W'][0].pulse).toBeGreaterThan(histories['1M'][0].pulse);expect(histories.ALL[0].pulse).toBe(row.marketItem!.livePulseSeed!.claimPulse);
 expect(histories['1D'].map(point=>point.usdCents)).not.toEqual(histories['1W'].map(point=>point.usdCents));
});
it('advances the current and historical object projection offline from unchanged held inputs',()=>{
 const earlier=projectPublicAssetPeriods(item,source,source.serverPulse)!,later=projectPublicAssetPeriods(item,source,source.serverPulse+17000)!;
 expect(later.ALL.at(-1)?.pulse).toBe(source.serverPulse+17000);expect(later.ALL.at(-1)?.usdCents).not.toBe(earlier.ALL.at(-1)?.usdCents);expect(later.ALL[0]).toEqual(earlier.ALL[0]);expect(later['1D'][0].pulse).toBeGreaterThan(earlier['1D'][0].pulse);
});
it('reuses held object history and calculates only newly entering window edges and the latest pulse',()=>{
 const earlier=projectPublicAssetPeriods(item,source,source.serverPulse)!,calculate=vi.spyOn(pricing,'publicSigilUsdAtPulse');
 try{
  const later=projectPublicAssetPeriods(item,source,source.serverPulse+1,earlier)!;
  expect(calculate.mock.calls.length).toBeLessThanOrEqual(7);
  expect(later.ALL.some(point=>point===earlier.ALL[20])).toBe(true);
  for(const period of CHART_PERIODS){expect(later[period].at(-1)?.pulse).toBe(source.serverPulse+1);expect(later[period].length).toBeLessThanOrEqual(96);}
  calculate.mockClear();expect(projectPublicAssetPeriods(item,source,source.serverPulse+1,later)).toBe(later);expect(calculate).not.toHaveBeenCalled();
 }finally{calculate.mockRestore();}
});
it('rebuilds object periods when their source operands change and never trusts a detached cached curve',()=>{
 const earlier=projectPublicAssetPeriods(item,source,source.serverPulse)!;
 const changed={...item,livePulseSeed:{...item.livePulseSeed!,creatorVerified:!item.livePulseSeed!.creatorVerified}};
 const updated=projectPublicAssetPeriods(changed,source,source.serverPulse+1,earlier)!;
 expect(updated.ALL.some(point=>point===earlier.ALL[20])).toBe(false);
 expect(updated.ALL[0].usdCents).not.toBe(earlier.ALL[0].usdCents);
 const detached=structuredClone(earlier);detached.ALL[10].usdCents='999999999';
 const rebuilt=projectPublicAssetPeriods(item,source,source.serverPulse+1,detached)!;
 expect(rebuilt.ALL.some(point=>point.usdCents==='999999999')).toBe(false);
});
it('fills an unseen offline interval instead of connecting a previous observation directly to the present',()=>{
 const earlier=projectPublicAssetPeriods(item,source,source.serverPulse)!;
 const resumed=projectPublicAssetPeriods(item,source,source.serverPulse+17000,earlier)!;
 expect(resumed['1D'].length).toBe(96);
 expect(resumed['1D'].filter(point=>point.pulse>source.serverPulse).length).toBeGreaterThan(80);
});
it('refuses mismatched object identifiers, birth pulses, duplicate candidates and unsupported sources',()=>{
 const legacy={...item,livePulseSeed:undefined};
 const row=matchPublicAssetRow(item,source)!;
 expect(projectPublicAssetPeriods({...item,assetId:'different'},source,source.serverPulse)).toBeNull();expect(projectPublicAssetPeriods({...item,id:'different'},source,source.serverPulse)).toBeNull();expect(projectPublicAssetPeriods({...item,pulse:String(Number(item.pulse)+1)},source,source.serverPulse)).toBeNull();
 expect(projectPublicAssetPeriods(legacy,{...source,valueRows:[...source.valueRows,{...row,id:row.id+':duplicate'}]},source.serverPulse)).toBeNull();
 expect(projectPublicAssetPeriods(legacy,{...source,valueRows:[{...row,marketItem:{...row.marketItem!,livePulseSeed:null}}]},source.serverPulse)).toBeNull();expect(projectPublicAssetPeriods({...item,category:'sports'},source,source.serverPulse)).toBeNull();expect(projectPublicAssetPeriods(legacy,null,source.serverPulse)).toBeNull();
});
