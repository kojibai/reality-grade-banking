import {CHART_PERIODS,sampleChartIndices,type ChartPeriod} from '../../core/chart-history';
import type {PublicMarketItem} from '../public-market';
import {publicAssetPulseSeed} from './asset';
import type {MarketCapSource,MarketPulseSeed} from './source';
import {marketPeriodPulses,marketPulseTime,publicSigilQuoteAtPulse} from './project';

export interface ProfileGrowthRow {seed:MarketPulseSeed;birthUsd:number}
export interface ProfileGrowthPoint {pulse:number;at:string;percent:number;usd:number;assets:number}
export interface ProfileGrowthHistory {basis:string;pulse:number;series:Record<ChartPeriod,ProfileGrowthPoint[]>}
/** Whole current collection, using only each artifact's bound public operands. */
export function profileGrowthRows(items:PublicMarketItem[],source:MarketCapSource|null):ProfileGrowthRow[]|null{
 if(!items.length)return null;
 try{return items.map(item=>{const seed=publicAssetPulseSeed(item,source);if(!seed)throw Error('Missing public valuation');const birthUsd=publicSigilQuoteAtPulse(seed,seed.claimPulse).priceUsd;if(!Number.isFinite(birthUsd)||birthUsd<=0)throw Error('Missing birth value');return {seed,birthUsd};});}catch{return null;}
}
/** Run in the existing projection worker. Assets enter at their own creation
 * pulse. Dividing by their corresponding birth values excludes new principal
 * from growth; the latest point matches the showcase's weighted Total. */
export async function buildProfileGrowth(rows:ProfileGrowthRow[],pulse:number,previous:ProfileGrowthHistory|null=null,continuing=()=>true,yieldSample:()=>Promise<void>=async()=>{}):Promise<ProfileGrowthHistory|null>{
 if(!rows.length||rows.length>10_000||!Number.isSafeInteger(pulse)||pulse<0||pulse>1e10||rows.some(row=>row.seed.kind!=='sigil'||!Number.isSafeInteger(row.seed.claimPulse)||row.seed.claimPulse<0||row.seed.claimPulse>pulse||!Number.isFinite(row.birthUsd)||row.birthUsd<=0))throw Error('Collection growth source unavailable');
 const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(rows))),basis=Array.from(new Uint8Array(bytes),n=>n.toString(16).padStart(2,'0')).join('');
 const reuse=previous?.basis===basis&&previous.pulse<=pulse?previous:null;if(reuse?.pulse===pulse)return reuse;
 const ordered=[...rows].sort((a,b)=>a.seed.claimPulse-b.seed.claimPulse),firstIssuancePulse=ordered[0].seed.claimPulse,memo=new Map<number,{usd:number;assets:number}>(),series={}as ProfileGrowthHistory['series'];
 for(const period of CHART_PERIODS){
  if(!continuing())return null;
  const pulses=marketPeriodPulses({firstIssuancePulse,serverPulse:pulse},period,64);
  const baseline=[0];for(const row of ordered)baseline.push(baseline.at(-1)!+(period==='ALL'||row.seed.claimPulse>=pulses[0]?row.birthUsd:publicSigilQuoteAtPulse(row.seed,pulses[0]).priceUsd));
  const relative=(point:ProfileGrowthPoint)=>{const percent=(point.usd/baseline[point.assets]-1)*100;if(!Number.isFinite(percent))throw Error('Collection growth unavailable');return percent===point.percent?point:{...point,percent};};
  const point=async(at:number)=>{let value=memo.get(at);if(!value){let usd=0,assets=0;for(const row of ordered){if(row.seed.claimPulse>at)break;usd+=publicSigilQuoteAtPulse(row.seed,at).priceUsd;assets++;}value={usd,assets};memo.set(at,value);await yieldSample();}return relative({pulse:at,at:new Date(marketPulseTime(at)).toISOString(),percent:NaN,...value});};
  if(reuse){const first=await point(pulses[0]),last=await point(pulse),points=[first,...reuse.series[period].filter(p=>p.pulse>first.pulse&&p.pulse<last.pulse).map(relative),...(first.pulse===last.pulse?[]:[last])];series[period]=sampleChartIndices(points.map(p=>p.percent),96).map(index=>points[index]);}
  else{series[period]=[];for(const at of pulses){if(!continuing())return null;series[period].push(await point(at));}}
 }
 return {basis,pulse,series};
}
