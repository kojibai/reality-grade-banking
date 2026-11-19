import {periodBounds,type Period,type MarketExecution} from './activity';

const sideTotals=()=>({count:0,priced:0,volume:0n});
type Totals=ReturnType<typeof sideTotals>;
type Candle={open:bigint;high:bigint;low:bigint;close:bigint};
type Bucket={buy:Totals;sell:Totals;candle:Candle|null;executions:MarketExecution[]};
export function tradingWindow(events:readonly MarketExecution[],asset:string,period:Period,asOf:number) {
  const matching=events.filter(e=>e.time<=asOf&&(!asset||e.trade?.marketItemId===asset));
  const {start,end,count}=periodBounds(matching[0]?.time,period,asOf);
  const width=Math.max((end-start)/count,1);
  const buckets=Array.from({length:count},():Bucket=>({buy:sideTotals(),sell:sideTotals(),candle:null,executions:[]}));
  const totals={buy:sideTotals(),sell:sideTotals()},seen=new Set<string>();
  const range:MarketExecution[]=[];
  let weightedPrice=0n,pricedShares=0n;
  for(const event of matching){
    if(event.time<start)continue;
    const id=event.trade?.tradeId??event.record.id;
    if(seen.has(id))continue;
    seen.add(id);
    const index=end===start?count-1:Math.min(count-1,Math.floor((event.time-start)/width));
    const bucket=buckets[index],amount=event.trade?.notionalUsdCents;
    for(const side of [totals[event.side],bucket[event.side]]){
      side.count++;
      if(amount!==undefined){side.volume+=BigInt(amount);side.priced++;}
    }
    if(asset&&event.trade?.priceUsdCents!==undefined){
      const price=BigInt(event.trade.priceUsdCents);
      if(event.trade.shareQuantityMicro!==undefined){
        const shares=BigInt(event.trade.shareQuantityMicro);
        weightedPrice+=shares*price;pricedShares+=shares;
      }
      if(!bucket.candle)bucket.candle={open:price,high:price,low:price,close:price};
      else {
        if(price>bucket.candle.high)bucket.candle.high=price;
        if(price<bucket.candle.low)bucket.candle.low=price;
        bucket.candle.close=price;
      }
    }
    bucket.executions.push(event);range.push(event);
  }
  return {start,end,width,buckets,totals,executions:range,vwap:pricedShares?(weightedPrice+pricedShares/2n)/pricedShares:null};
}
