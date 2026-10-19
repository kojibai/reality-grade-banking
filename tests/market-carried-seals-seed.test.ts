import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {expect,it} from 'vitest';
import {mergePublicSports} from '../src/receiz/public-sports';
import {parsePublicMarket} from '../src/receiz/public-market';
import {publicSportsSealedBirths,marketPulseAtOrAfterTime} from '../src/receiz/market-projection/sealed-copies';
import {parseMarketHistory} from '../src/receiz/market-projection/history';
import {marketRowsUsdAtPulse} from '../src/receiz/market-projection/project';
import {parseMarketCapSource} from '../src/receiz/market-projection/source';
import {currentMarketDisplayModel} from '../src/receiz/market-projection/catalog-source';
import {marketCapChartUsdAtPulse,prepareMarketChartProjection} from '../src/receiz/market-projection/interpolated-history';

it('ships every verified copy with its own seal and owner while preserving all retained price operands',async()=>{
 const input=JSON.parse(await readFile(new URL('../public/receiz-public-sports.json',import.meta.url),'utf8'));
 const priced=input.cards.filter((card:Record<string,unknown>)=>card.valuationRow),unpriced=input.cards.filter((card:Record<string,unknown>)=>!card.valuationRow);
 expect(priced).toHaveLength(1962);expect(unpriced).toHaveLength(615);
 const retained=priced.map(({sealedBirths,historyObservation,...card}:Record<string,unknown>)=>{const {historyObservation:record,sportsGroup,...valuationRow}=card.valuationRow as Record<string,unknown>;return {...card,valuationRow};});
 expect(createHash('sha256').update(JSON.stringify(retained)).digest('hex')).toBe('252d1e47bc57fe513ce3b902302d150a573199d341a8a4f9abe1db7f271cf678');
 const copies=input.cards.flatMap((card:{sealedBirths:unknown})=>{expect(publicSportsSealedBirths(card.sealedBirths)).toBeDefined();return card.sealedBirths;});
 expect(copies).toHaveLength(5366);expect(new Set(copies.map((copy:{collectibleId:string;claimHash:string})=>copy.collectibleId+':'+copy.claimHash)).size).toBe(5366);
 expect(new Set(copies.map((copy:{collectibleId:string})=>copy.collectibleId)).size).toBe(5364);
 expect(copies.every((copy:{ownerUsername:string;ownerDisplayName:string})=>copy.ownerUsername||copy.ownerDisplayName)).toBe(true);
 expect(unpriced.every((card:Record<string,unknown>)=>card.liveValueUsd===null&&card.totalValueUsd===null&&card.pricedCount===0)).toBe(true);
 const catalog=mergePublicSports(parsePublicMarket(JSON.parse(await readFile(new URL('../public/receiz-public-market.json',import.meta.url),'utf8'))),input);
 const items=catalog.items.filter(item=>item.category==='sports');
 expect(items).toHaveLength(2577);expect(items.flatMap(item=>item.sealedCopies??[])).toHaveLength(5366);
 expect(items.filter(item=>item.sportsValuation)).toHaveLength(1962);
 const sports=items.flatMap(item=>item.sportsValuation?[item.sportsValuation]:[]),first=Math.min(...sports.flatMap(row=>row.sealedBirths??[]).map(copy=>marketPulseAtOrAfterTime(copy.sealedAt)));
 expect(marketRowsUsdAtPulse(sports,first-1,true)).toBe(0);expect(marketRowsUsdAtPulse(sports,first,true)).toBeGreaterThan(0);
});
it('ships every real card opening in temporal order without a later sampled entry date',async()=>{
 const cards=JSON.parse(await readFile(new URL('../public/receiz-public-sports.json',import.meta.url),'utf8'));
 const history=parseMarketHistory(JSON.parse(await readFile(new URL('../public/receiz-public-chart-history.json',import.meta.url),'utf8')));
 const plotted=new Set(history.series.ALL.map((point:{pulse:number})=>point.pulse));
 const pulses=new Set<number>(cards.cards.flatMap((card:{sealedBirths:{sealedAt:string}[]})=>card.sealedBirths.map(copy=>marketPulseAtOrAfterTime(copy.sealedAt))));
 expect(pulses.size).toBe(1819);
 expect([...pulses].filter(pulse=>!plotted.has(pulse))).toEqual([]);
});
it('keeps May 10 the largest daily entry while the full chart reaches its live valuation',async()=>{
 const history=parseMarketHistory(JSON.parse(await readFile(new URL('../public/receiz-public-chart-history.json',import.meta.url),'utf8')));
 const daily=new Map<string,bigint>();let previous=0n;
 for(const point of history.series.ALL){const value=BigInt(point.usdCents),date=point.at.slice(0,10);daily.set(date,(daily.get(date)??0n)+value-previous);previous=value;}
 const largest=[...daily].sort((a,b)=>a[1]>b[1]?-1:1)[0];
 expect(largest[0]).toBe('2026-05-10');expect(largest[1]).toBeGreaterThan(12000000000n);
 expect(history.series.ALL.at(-1)?.usdCents).toBe(String(Math.round(history.summary.currentUsd*100)));
 expect(history.summary.currentUsd).toBeGreaterThan(400000000);
});
it('ends on the same live calculation as the preceding native pulse without a coverage catch-up',async()=>{
 const read=async(name:string)=>JSON.parse(await readFile(new URL(`../public/${name}`,import.meta.url),'utf8'));
 const history=parseMarketHistory(await read('receiz-public-chart-history.json'));
 const catalog=mergePublicSports(parsePublicMarket(await read('receiz-public-market.json')),await read('receiz-public-sports.json'));
 const source=currentMarketDisplayModel(parseMarketCapSource(await read('receiz-public-capitalization.json')),catalog,history.summary.serverPulse);
 const context=prepareMarketChartProjection(source),head=marketCapChartUsdAtPulse(source,source.serverPulse,context),prior=marketCapChartUsdAtPulse(source,source.serverPulse-1,context);
 expect(head).toBe(marketRowsUsdAtPulse(source.valueRows,source.serverPulse));
 expect(Math.abs(head-prior)).toBeLessThan(1000000);
});
