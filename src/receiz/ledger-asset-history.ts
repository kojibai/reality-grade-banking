import {ledgerCardCopyValuation,ledgerValueRow,ledgerProofValueSeed,type LedgerValueIndex} from './ledger-value';
import {ledgerCardCopyUsdAtPulse} from './ledger-card-copy';
import type {PublicRecord} from './public-network';
import type {PublicMarketItem} from './public-market';
import {projectPublicAssetPeriods,type PublicAssetPeriods} from './market-projection/asset';
import {marketPeriodPulses,marketPulseTime} from './market-projection/coordinates';
import {retainMarketInterval,type CapitalizationPoint} from './market-projection/history';
import {CHART_PERIODS} from '../core/chart-history';

const held=new WeakMap<PublicRecord,{basis:object;copy:object|null;pulse:number;periods:PublicAssetPeriods}>();
/** Only already-indexed source operands. No lookup, inventory scan, source
 * verification or additional clock. Event values remain fixed separately. */
export function ledgerAssetPeriods(record:PublicRecord,index:LedgerValueIndex|null):PublicAssetPeriods|null{
 const row=ledgerValueRow(record,index),copy=ledgerCardCopyValuation(record,index,true);
 const seed=ledgerProofValueSeed(record,index,row);
 const pulse=Math.max(index?.evaluationPulse??index?.source.serverPulse??0,copy?.copy.valuationPulse??0);
 if(!copy&&!seed||!Number.isSafeInteger(pulse)||pulse<0||pulse>1e10)return null;
 const basis=copy?.copy??record.valueOperands?.proofValuation??row!,previous=held.get(record),reuse=previous?.basis===basis&&previous.copy===(copy?.copy??null)&&previous.pulse<=pulse&&pulse-previous.pulse<=2;
 if(reuse&&previous.pulse===pulse)return previous.periods;
 let periods:PublicAssetPeriods|null=null;
 if(copy){
  if(pulse<copy.issue)return null;
  const points=new Map<number,CapitalizationPoint>(),point=(p:number)=>{
   let value=points.get(p);if(value)return value;
   const usd=ledgerCardCopyUsdAtPulse(copy,p),cents=usd===undefined?NaN:Math.round(usd*100);
   if(!Number.isSafeInteger(cents)||cents<0)throw Error('Unsupported source value.');
   value={pulse:p,at:new Date(marketPulseTime(p)).toISOString(),usdCents:String(cents)};points.set(p,value);return value;
  };
  try{periods={} as PublicAssetPeriods;for(const period of CHART_PERIODS){const pulses=marketPeriodPulses({firstIssuancePulse:copy.issue,serverPulse:pulse},period,96);periods[period]=reuse?retainMarketInterval(previous.periods[period],point(pulses[0]),point(pulse)):pulses.map(point);}}catch{return null;}
 }else if(seed){
  const assetId=record.valueOperands?.proofValuation?.assetId??row!.seed,itemId=record.valueOperands?.proofValuation?.marketItemId??row!.marketItem!.id;
  const item:PublicMarketItem={id:itemId,assetId,title:record.title,summary:'',category:'proof',pulse:String(seed.claimPulse),livePulseSeed:seed,valuationBinding:{itemId,assetId},sourceUrl:null,verifyUrl:null,originalUrl:null,originalDigest:null,sealedAt:null,ownerUsername:null,ownerDisplayName:null,ownerProfileUrl:null,priceUsd:null,changePct:null,chart:[],authority:'projection-only',canTrade:false};
  periods=projectPublicAssetPeriods(item,index?.source??null,pulse,reuse?previous.periods:null);
 }
 if(periods)held.set(record,{basis,copy:copy?.copy??null,pulse,periods});return periods;
}
