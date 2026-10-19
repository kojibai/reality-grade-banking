import {CHART_PERIODS,type ChartPeriod} from '../../core/chart-history';
import type {PublicMarketItem} from '../public-market';
import {publicMarketPulseSeed,type MarketCapSource,type MarketValueRow} from './source';
import {retainMarketInterval,type CapitalizationPoint} from './history';
import {publicSigilUsdAtPulse,publicSportsQuoteAtPulse,marketPeriodPulses,marketPulseTime} from './project';
import {prepareSportsCopyHistory,sportsCopyHistoryUsdAtPulse} from './interpolated-history';
export type PublicAssetPeriods=Record<ChartPeriod,CapitalizationPoint[]>;
const issuedPeriods=new WeakMap<PublicAssetPeriods,{basis:string;pulse:number}>();
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
export function publicAssetCardHistory(item:PublicMarketItem){
 if(item.category!=='sports'||!item.sportsValuation)return null;
 const history=prepareSportsCopyHistory(item.sportsValuation);
 return history&&history.copy.collectibleId===item.assetId&&history.copy.claimHash===item.sportsValuation.seed?history:null;
}
export function projectPublicAssetPeriods(item:PublicMarketItem,source:MarketCapSource|null,evaluationPulse:number,previous?:PublicAssetPeriods|null):PublicAssetPeriods|null{
 const seed=publicAssetPulseSeed(item,source),card=publicAssetCardHistory(item),issue=seed?.claimPulse??card?.issue;
 if(issue===undefined||!Number.isSafeInteger(evaluationPulse)||evaluationPulse<issue||evaluationPulse>1e10)return null;
 const model=item.sportsValuation;
 const basis=JSON.stringify([item.id,item.assetId,seed,card?.copy,card?.observation,card&&[model!.baseUsdValue,model!.birthUsdValue,model!.marketUsdValue,model!.scoreDelta,model!.seed]]),prior=previous&&issuedPeriods.get(previous),reuse=!!prior&&prior.basis===basis&&prior.pulse<=evaluationPulse&&evaluationPulse-prior.pulse<=2;
 if(reuse&&prior.pulse===evaluationPulse)return previous!;
 const bounds={firstIssuancePulse:issue,serverPulse:evaluationPulse},values=new Map<number,CapitalizationPoint>(),periods={}as PublicAssetPeriods;
 try{
  const point=(pulse:number)=>{let value=values.get(pulse);if(!value){const usd=seed?publicSigilUsdAtPulse(seed,pulse):sportsCopyHistoryUsdAtPulse(card!,pulse)??publicSportsQuoteAtPulse(model!,pulse),cents=Math.round(usd*100);if(!Number.isSafeInteger(cents)||cents<0)throw Error('Unsupported object value.');value={pulse,at:new Date(marketPulseTime(pulse)).toISOString(),usdCents:String(cents)};values.set(pulse,value);}return value;};
  for(const period of CHART_PERIODS){const pulses=marketPeriodPulses(bounds,period,96);periods[period]=reuse?retainMarketInterval(previous![period],point(pulses[0]),point(evaluationPulse)):pulses.map(point);}
  issuedPeriods.set(periods,{basis,pulse:evaluationPulse});return periods;
 }catch{return null;}
}
