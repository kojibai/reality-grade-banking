import {CHART_PERIODS,type ChartPeriod} from '../../core/chart-history';
import type {PublicMarketItem} from '../public-market';
import {publicMarketPulseSeed,type MarketCapSource,type MarketValueRow} from './source';
import type {CapitalizationPoint} from './history';
import {publicSigilUsdAtPulse,marketPeriodPulses,marketPulseTime} from './project';
export type PublicAssetPeriods=Record<ChartPeriod,CapitalizationPoint[]>;
/** This public contract identifies a display model, not a verified artifact or holding. */
export function matchPublicAssetRow(item:PublicMarketItem,source:MarketCapSource|null):MarketValueRow|null{
 if(!source||item.category!=='proof'||!item.pulse||!/^\d{1,10}$/.test(item.pulse))return null;
 const candidates=source.valueRows.filter(row=>row.source==='market-desk-live-asset'&&(row.marketItem?.id===item.id||row.seed===item.assetId));
 if(candidates.length!==1)return null;const row=candidates[0],meta=row.marketItem?.livePulseSeed;
 return row.marketItem?.id===item.id&&row.seed===item.assetId&&meta?.kind==='sigil'&&meta.claimPulse===Number(item.pulse)&&meta.claimPulse<=source.serverPulse?row:null;
}
export function publicAssetPulseSeed(item:PublicMarketItem,source:MarketCapSource|null){
 if(item.category!=='proof')return null;
 const own=item.valuationBinding?.itemId===item.id&&item.valuationBinding.assetId===item.assetId?publicMarketPulseSeed(item.livePulseSeed,item.pulse):undefined;
 return own??matchPublicAssetRow(item,source)?.marketItem?.livePulseSeed??null;
}
export function projectPublicAssetPeriods(item:PublicMarketItem,source:MarketCapSource|null,evaluationPulse:number):PublicAssetPeriods|null{
 const seed=publicAssetPulseSeed(item,source);if(!seed||!Number.isSafeInteger(evaluationPulse)||evaluationPulse<seed.claimPulse||evaluationPulse>1e10)return null;
 const bounds={firstIssuancePulse:seed.claimPulse,serverPulse:evaluationPulse},values=new Map<number,CapitalizationPoint>(),periods={}as PublicAssetPeriods;
 try{for(const period of CHART_PERIODS)periods[period]=marketPeriodPulses(bounds,period,96).map(pulse=>{let point=values.get(pulse);if(!point){const cents=Math.round(publicSigilUsdAtPulse(seed,pulse)*100);if(!Number.isSafeInteger(cents)||cents<0)throw Error('Unsupported object value.');point={pulse,at:new Date(marketPulseTime(pulse)).toISOString(),usdCents:String(cents)};values.set(pulse,point);}return point;});return periods;}catch{return null;}
}
