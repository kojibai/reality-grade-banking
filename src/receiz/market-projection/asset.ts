import {CHART_PERIODS,type ChartPeriod} from '../../core/chart-history';
import type {PublicMarketItem} from '../public-market';
import type {MarketCapSource,MarketValueRow} from './source';
import type {CapitalizationPoint} from './history';
import {marketAssetUsdAtPulse,marketPeriodPulses,marketPulseTime} from './project';
export type PublicAssetPeriods=Record<ChartPeriod,CapitalizationPoint[]>;
/** This public contract identifies a display model, not a verified artifact or holding. */
export function matchPublicAssetRow(item:PublicMarketItem,source:MarketCapSource|null):MarketValueRow|null{
 if(!source||item.category!=='proof'||!item.pulse||!/^\d{1,10}$/.test(item.pulse))return null;
 const candidates=source.valueRows.filter(row=>row.source==='market-desk-live-asset'&&(row.marketItem?.id===item.id||row.seed===item.assetId));
 if(candidates.length!==1)return null;const row=candidates[0],meta=row.marketItem?.livePulseSeed;
 return row.marketItem?.id===item.id&&row.seed===item.assetId&&meta?.kind==='sigil'&&meta.claimPulse===Number(item.pulse)&&meta.claimPulse<=source.serverPulse?row:null;
}
export function projectPublicAssetPeriods(item:PublicMarketItem,source:MarketCapSource|null,evaluationPulse:number):PublicAssetPeriods|null{
 const row=matchPublicAssetRow(item,source);if(!row||!source||!Number.isSafeInteger(evaluationPulse)||evaluationPulse<source.serverPulse||evaluationPulse>1e10)return null;
 const bounds={firstIssuancePulse:row.marketItem!.livePulseSeed!.claimPulse,serverPulse:evaluationPulse},values=new Map<number,CapitalizationPoint>(),periods={}as PublicAssetPeriods;
 try{for(const period of CHART_PERIODS)periods[period]=marketPeriodPulses(bounds,period,96).map(pulse=>{let point=values.get(pulse);if(!point){const cents=Math.round(marketAssetUsdAtPulse(row,pulse)*100);if(!Number.isSafeInteger(cents)||cents<0)throw Error('Unsupported object value.');point={pulse,at:new Date(marketPulseTime(pulse)).toISOString(),usdCents:String(cents)};values.set(pulse,point);}return point;});return periods;}catch{return null;}
}
