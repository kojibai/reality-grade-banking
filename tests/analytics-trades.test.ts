import {expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {indexActivity} from '../src/observatory/activity';
import {tradingWindow} from '../src/observatory/market-trades';
import {mergePublicRecords,parsePublicNetworkPage} from '../src/receiz/public-network';
import {publicNetworkCacheWire} from '../src/receiz/public-network-cache-wire';
import {parsePublicNetworkCache} from '../src/receiz/public-network-cache';

it('charts every shipped public execution from its recorded price and notional',()=>{
 const wire=JSON.parse(gunzipSync(readFileSync('public/receiz-public-ledger.json.gz.bin')).toString());
 const market=wire.records.filter((r:{source:string;kind:string})=>r.source==='actions'&&['market.share.buy','market.share.sell'].includes(r.kind));
 const records=parsePublicNetworkCache({...wire,records:market}).records;
 const trades=indexActivity(records).executions,view=tradingWindow(trades,'','All',Date.parse(wire.capturedAt));
 expect(view.executions.length).toBe(market.length);
 expect(trades.every(e=>e.trade?.tradeId&&e.trade.priceUsdCents!==undefined&&e.trade.shareQuantityMicro!==undefined)).toBe(true);
 for(const side of ['buy','sell'] as const){
  const amounts=market.filter((r:{kind:string})=>r.kind==='market.share.'+side).map((r:{details:{assetTrade:{notionalUsdCents:string}}})=>BigInt(r.details.assetTrade.notionalUsdCents));
  expect(amounts.length).toBeGreaterThan(0);
  expect(view.totals[side]).toEqual({count:amounts.length,priced:amounts.length,volume:amounts.reduce((a:bigint,b:bigint)=>a+b,0n)});
 }
});
it('keeps candles within one asset, uses event order, excludes future trades and distinguishes zero from unknown',()=>{
 const anchor=Date.parse('2026-11-18T20:00Z');
 const action=(seq:number,price:string,notional:string|undefined,extra={})=>({id:String(seq),seq,actionKind:'market.share.buy',occurredAt:new Date(anchor-1000).toISOString(),assetTrade:{side:'buy',marketItemId:'a',priceUsdCents:price,notionalUsdCents:notional,feeUsdCents:'5',settlementUsdCents:'105'},...extra});
 const records=parsePublicNetworkPage('actions',{ok:true,actions:[action(3,'90','0'),action(1,'95','100'),action(2,'110',undefined),action(4,'900','500',{assetTrade:{side:'buy',marketItemId:'b',priceUsdCents:'900',notionalUsdCents:'500'}}),action(5,'800','1000',{occurredAt:new Date(anchor+1).toISOString()})]}).records;
 const tape=indexActivity(records).executions,view=tradingWindow(tape,'a','1H',anchor);
 expect(view.totals.buy).toEqual({count:3,priced:2,volume:100n});
 expect(view.buckets.flatMap(b=>b.candle?[b.candle]:[])).toEqual([{open:95n,high:110n,low:90n,close:90n}]);
 expect(tradingWindow(tape,'','1H',anchor).buckets.every(b=>b.candle===null)).toBe(true);
});

it('adopts a new execution once and preserves both sides and fees through a thin replay and cold reopen',()=>{
 const at=Date.parse('2026-11-18T22:00Z');
 const action=(id:string,side:'buy'|'sell',amount:string)=>({id,actionKind:'market.share.'+side,occurredAt:new Date(at).toISOString(),entryHash:(side==='buy'?'a':'b').repeat(64),assetTrade:{side,marketItemId:'asset',priceUsdCents:'200',notionalUsdCents:amount,settlementUsdCents:side==='buy'?'1105':'1695',feeUsdCents:'5'}});
 const buy=action('one','buy','1100'),sell=action('two','sell','1700');
 const read=(actions:unknown[])=>parsePublicNetworkPage('actions',{ok:true,actions}).records;
 const base=read([buy]),next=mergePublicRecords(base,read([buy,sell]));
 const thin=mergePublicRecords(next,read([{...sell,assetTrade:undefined}]));
 const cold=parsePublicNetworkCache(publicNetworkCacheWire({records:thin,capturedAt:new Date(at).toISOString(),inspectionVersion:5,coverage:[{source:'actions',complete:true,observedAt:at}]}));
 const view=tradingWindow(indexActivity(cold.records).executions,'asset','All',at);
 expect(view.executions).toHaveLength(2);
 expect(view.totals).toEqual({buy:{count:1,priced:1,volume:1100n},sell:{count:1,priced:1,volume:1700n}});
 expect(view.executions.map(e=>e.trade?.feeUsdCents)).toEqual(['5','5']);
});
