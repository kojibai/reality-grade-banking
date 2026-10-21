import {expect,it} from 'vitest';
import {parsePublicMarket} from '../src/receiz/public-market';
import {CHART_PERIODS} from '../src/core/chart-history';
import {buildProfileGrowth,profileGrowthRows} from '../src/receiz/market-projection/profile-growth';
import {profileCollectionPrices,profileCollectionReturn} from '../src/public-explorer/profile-prices';
import {marketPulseTime} from '../src/receiz/market-projection/project';
const seed={kind:'sigil' as const,claimPulse:14_000_000,beat:2,stepIndex:3,creatorVerified:true};
const items=parsePublicMarket({ok:true,transport:{publicOriginals:[
 {id:'a',receizId:'a',title:'First',pulse:String(seed.claimPulse),livePulseSeed:seed,valueUsd:1},
 {id:'b',receizId:'b',title:'Second',pulse:'15000000',livePulseSeed:{...seed,claimPulse:15_000_000},valueUsd:1},
]}}).items;
it('replays the entire current collection and matches the weighted Total without counting new principal as growth',async()=>{
 const rows=profileGrowthRows(items,null)!,end=15_001_000,history=(await buildProfileGrowth(rows,end))!;
 const priced=profileCollectionPrices(items,null,null,end);
 for(const period of CHART_PERIODS){const points=history.series[period];expect(points.length).toBeLessThanOrEqual(64);expect(points.at(-1)?.pulse).toBe(end);expect(points.at(-1)?.percent).toBeCloseTo(profileCollectionReturn(priced,null,period)!,8);expect(points[0].percent).toBeCloseTo(0,8);for(const p of points)expect(Date.parse(p.at)).toBe(marketPulseTime(p.pulse));}
 expect(history.series.ALL[0]).toMatchObject({pulse:seed.claimPulse,percent:0});
 const secondOnly=(await buildProfileGrowth([rows[1]],15_000_000))!;expect(secondOnly.series.ALL).toHaveLength(1);expect(secondOnly.series.ALL[0].percent).toBe(0);
 expect(history.series['1D'][0].pulse).toBeGreaterThan(history.series.ALL[0].pulse);
});
it('retains completed curves when advancing locally, refuses partial sources and stops a superseded build',async()=>{
 const rows=profileGrowthRows(items,null)!,first=(await buildProfileGrowth(rows,15_001_000))!,next=(await buildProfileGrowth(rows,15_001_001,first))!;
 expect(next.series.ALL[20]).toBe(first.series.ALL[20]);expect(next.series.ALL.at(-1)?.pulse).toBe(15_001_001);
 for(const period of CHART_PERIODS)expect(next.series[period].at(-1)?.percent).toBeCloseTo(profileCollectionReturn(profileCollectionPrices(items,null,null,15_001_001),null,period)!,8);
 expect(profileGrowthRows([{...items[0],livePulseSeed:undefined}],null)).toBeNull();
 await expect(buildProfileGrowth(rows,seed.claimPulse)).rejects.toThrow();
 expect(await buildProfileGrowth(rows,15_001_000,null,()=>false)).toBeNull();
});
