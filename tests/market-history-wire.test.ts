import {expect,it} from 'vitest';
import {packMarketHistory,unpackMarketHistory} from '../src/receiz/market-projection/history-wire';
import {marketPulseTime} from '../src/receiz/market-projection/coordinates';
import type {MarketHistorySnapshot} from '../src/receiz/market-projection/history';
const point=(pulse:number,cents:string)=>({pulse,usdCents:cents,at:new Date(marketPulseTime(pulse)).toISOString()});
it('transports shared historical points once and restores exact timestamps and every interval',()=>{
 const points=[point(100,'12345'),point(200,'98765')],input={schema:'bank.public-market-history.v1',eventPulses:[100,200],series:{ALL:points,'1D':[points[1]],'1W':points,'1M':points,'3M':points,'1Y':points}} as MarketHistorySnapshot;
 const packed=packMarketHistory(input),decoded=unpackMarketHistory(JSON.parse(JSON.stringify(packed)));
 expect(packed.pointTable).toEqual([[100,'12345'],[200,'98765']]);
 expect(decoded).toEqual(input);
 expect(JSON.stringify(packed).length).toBeLessThan(JSON.stringify(input).length);
});
it('rejects malformed tables, indexes and conflicting values for the same coordinate',()=>{
 for(const input of [{pointTable:null,series:{}},{pointTable:[[100,'NaN']],series:{}},{pointTable:[[100,'1']],series:{ALL:[-1]}},{pointTable:[[100,'1']],series:{ALL:[1]}}])expect(()=>unpackMarketHistory({schema:'bank.public-market-history.compact.v1',...input})).toThrow();
 const a=point(100,'1'),b=point(100,'2');
 expect(()=>packMarketHistory({schema:'bank.public-market-history.v1',series:{ALL:[a,b]}} as MarketHistorySnapshot)).toThrow();
});
