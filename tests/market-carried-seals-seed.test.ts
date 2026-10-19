import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {expect,it} from 'vitest';
import {mergePublicSports} from '../src/receiz/public-sports';
import {parsePublicMarket} from '../src/receiz/public-market';
import {publicSportsSealedBirths,marketPulseAtOrAfterTime} from '../src/receiz/market-projection/sealed-copies';
import {marketRowsUsdAtPulse} from '../src/receiz/market-projection/project';

it('ships every verified copy with its own seal and owner while preserving all retained price operands',async()=>{
 const input=JSON.parse(await readFile(new URL('../public/receiz-public-sports.json',import.meta.url),'utf8'));
 const priced=input.cards.filter((card:Record<string,unknown>)=>card.valuationRow),unpriced=input.cards.filter((card:Record<string,unknown>)=>!card.valuationRow);
 expect(priced).toHaveLength(1962);expect(unpriced).toHaveLength(615);
 const retained=priced.map(({sealedBirths,...card}:Record<string,unknown>)=>card);
 expect(createHash('sha256').update(JSON.stringify(retained)).digest('hex')).toBe('252d1e47bc57fe513ce3b902302d150a573199d341a8a4f9abe1db7f271cf678');
 const copies=input.cards.flatMap((card:{sealedBirths:unknown})=>{expect(publicSportsSealedBirths(card.sealedBirths)).toBeDefined();return card.sealedBirths;});
 expect(copies).toHaveLength(5366);expect(new Set(copies.map((copy:{collectibleId:string;claimHash:string})=>copy.collectibleId+':'+copy.claimHash)).size).toBe(5366);
 expect(copies.every((copy:{ownerUsername:string;ownerDisplayName:string})=>copy.ownerUsername||copy.ownerDisplayName)).toBe(true);
 expect(unpriced.every((card:Record<string,unknown>)=>card.liveValueUsd===null&&card.totalValueUsd===null&&card.pricedCount===0)).toBe(true);
 const catalog=mergePublicSports(parsePublicMarket(JSON.parse(await readFile(new URL('../public/receiz-public-market.json',import.meta.url),'utf8'))),input);
 const items=catalog.items.filter(item=>item.category==='sports');
 expect(items).toHaveLength(2577);expect(items.flatMap(item=>item.sealedCopies??[])).toHaveLength(5366);
 expect(items.filter(item=>item.sportsValuation)).toHaveLength(1962);
 const sports=items.flatMap(item=>item.sportsValuation?[item.sportsValuation]:[]),first=Math.min(...sports.flatMap(row=>row.sealedBirths??[]).map(copy=>marketPulseAtOrAfterTime(copy.sealedAt)));
 expect(marketRowsUsdAtPulse(sports,first-1,true)).toBe(0);expect(marketRowsUsdAtPulse(sports,first,true)).toBeGreaterThan(0);
});
