import {retainMarketInterval} from './history';
import {CHART_PERIODS,type ChartPeriod} from '../../core/chart-history';
import {portfolioItem} from '../market-portfolio-value';
import type {MarketPortfolio} from '../market-portfolio';
import type {PublicMarketItem,PublicMarketCatalog} from '../public-market';
import {publicAssetPulseSeed} from './asset';
import type {MarketCapSource,MarketPulseSeed} from './source';
import {marketPeriodPulses,marketPulseTime,publicSigilQuoteAtPulse} from './project';
export interface InvestmentHistoryRow {seed:MarketPulseSeed;events:{pulse:number;quantity:string}[]}
export interface InvestmentHistory {pulse:number;series:Record<ChartPeriod,{pulse:number;at:string;usdCents:string}[]>}
/** A UTC display bridge only; execution order and ownership remain with Receiz. */
function atPulse(at:string){const time=Date.parse(at);let pulse=Math.max(0,Math.floor((time-marketPulseTime(0))/((3+Math.sqrt(5))*1000)));while(marketPulseTime(pulse)<time)pulse++;return pulse;}
export function investmentHistoryRows(portfolio:MarketPortfolio|null,items:PublicMarketItem[],source:MarketCapSource|null,pulse:number):InvestmentHistoryRow[]|null{
 if(!portfolio?.positions.length||!Number.isSafeInteger(pulse)||pulse<0)return null;
 const trades=new Map<string,typeof portfolio.trades>();for(const t of portfolio.trades){const group=trades.get(t.marketItemId)??[];group.push(t);trades.set(t.marketItemId,group);}
 try{return portfolio.positions.map(position=>{const item=portfolioItem(position,{items} as PublicMarketCatalog),seed=publicAssetPulseSeed(item,source);if(!seed)throw Error('No bound pricing');let quantity=0n;
  const events=(trades.get(position.marketItemId)??[]).slice().sort((a,b)=>Date.parse(a.executedAt)-Date.parse(b.executedAt)||a.id.localeCompare(b.id)).map(trade=>{const at=atPulse(trade.executedAt);quantity+=(trade.side==='buy'?1n:-1n)*BigInt(trade.shareQuantityMicro);if(quantity<0n||at<seed.claimPulse)throw Error('Incomplete position history');return{pulse:at,quantity:quantity.toString()};});
  if(!events.length||quantity!==BigInt(position.shareQuantityMicro))throw Error('Incomplete position history');return{seed,events};
 });}catch{return null;}
}
/** Runs off the UI thread, with bounded samples and no source reads. Historical
 * value includes purchases/sales; it is deliberately not labelled performance. */
export async function buildInvestmentHistory(rows:InvestmentHistoryRow[],pulse:number,continuing=()=>true,yieldSample:()=>Promise<void>=async()=>{},previous:InvestmentHistory|null=null):Promise<InvestmentHistory|null>{
 if(!rows.length||rows.length>10000||!Number.isSafeInteger(pulse)||pulse<0)throw Error('Investment history unavailable');
 if(rows.some(row=>row.events.at(-1)!.pulse>pulse))return null;
 const first=Math.min(...rows.map(row=>row.events[0].pulse)),series={} as InvestmentHistory['series'],memo=new Map<number,string>();let work=0;
 const point=async(at:number)=>{if(!continuing())return null;let cents=memo.get(at);if(cents===undefined){let total=0n;for(const row of rows){let lo=0,hi=row.events.length;while(lo<hi){const mid=(lo+hi)>>>1;if(row.events[mid].pulse<=at)lo=mid+1;else hi=mid;}if(lo){const price=Math.round(publicSigilQuoteAtPulse(row.seed,at).priceUsd*100);if(!Number.isSafeInteger(price)||price<0)throw Error('Unsupported price');total+=BigInt(row.events[lo-1].quantity)*BigInt(price)/1000000n;}if(++work%128===0){await yieldSample();if(!continuing())return null;}}cents=String(total);memo.set(at,cents);}return{pulse:at,at:new Date(marketPulseTime(at)).toISOString(),usdCents:cents};};
 for(const period of CHART_PERIODS){const pulses=marketPeriodPulses({firstIssuancePulse:first,serverPulse:pulse},period,64);series[period]=[];
  if(previous&&previous.pulse<=pulse){const opening=await point(pulses[0]),closing=await point(pulse);if(!opening||!closing)return null;series[period]=retainMarketInterval(previous.series[period],opening,closing);}
  else for(const at of pulses){const value=await point(at);if(!value)return null;series[period].push(value);}
 }return{pulse,series};
}
