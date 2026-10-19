import {marketPulseTime} from './coordinates.js';
export interface MarketValueObservation {at:string;usdValue:number;basis:'sealed-birth'|'source-observation';pulse?:number;}
export interface MarketSealedBirth {collectibleId:string;claimHash:string;sealedAt:string;birthUsdValue:number;}
export interface MarketSealedCopy extends MarketSealedBirth {proofValueUsd:number;currentValueUsd:number;valueHistory?:MarketValueObservation[];valuationPulse?:number;valuation?:{baseUsdValue:number;birthUsdValue:number;marketUsdValue:number;scoreDelta:number;seed:string};}
const value=(input:unknown):input is number=>typeof input==='number'&&Number.isFinite(input)&&input>=0&&input<=1e13;
const firstTime=marketPulseTime(0),lastTime=marketPulseTime(1e10);
/** Verified issue metadata carries no claim about a later individual price. */
export function publicSportsSealedBirths(input:unknown):MarketSealedBirth[]|undefined{
 if(!Array.isArray(input)||!input.length||input.length>10000)return;
 const births:MarketSealedBirth[]=[],seen=new Set<string>();
 for(const raw of input){const birth=raw as MarketSealedBirth|null;
  if(!birth||!/^rsc_[a-f0-9]{16}$/i.test(birth.collectibleId)||!/^[a-f0-9]{64}$/i.test(birth.claimHash)||typeof birth.sealedAt!=='string'||birth.sealedAt.length>64||!Number.isFinite(Date.parse(birth.sealedAt))||Date.parse(birth.sealedAt)<firstTime||Date.parse(birth.sealedAt)>lastTime||!value(birth.birthUsdValue))return;
  const collectibleId=birth.collectibleId.toLowerCase(),claimHash=birth.claimHash.toLowerCase(),key=`${collectibleId}:${claimHash}`;if(seen.has(key))return;seen.add(key);
  births.push({collectibleId,claimHash,sealedAt:birth.sealedAt,birthUsdValue:birth.birthUsdValue});
 }
 return births;
}
/** Curated public copy operands; no owner or account authority enters valuation. */
export function publicSportsSealedCopies(input:unknown):MarketSealedCopy[]|undefined{
 if(!Array.isArray(input)||input.length<1||input.length>10000)return;
 const copies:MarketSealedCopy[]=[],seen=new Set<string>();
 for(const raw of input){
  const copy=raw as MarketSealedCopy|null;
  if(!copy||!/^rsc_[a-f0-9]{16}$/i.test(copy.collectibleId)||!/^[a-f0-9]{64}$/i.test(copy.claimHash)||typeof copy.sealedAt!=='string'||copy.sealedAt.length>64||!Number.isFinite(Date.parse(copy.sealedAt))||![copy.birthUsdValue,copy.proofValueUsd,copy.currentValueUsd].every(value))return;
  if(Date.parse(copy.sealedAt)<firstTime||Date.parse(copy.sealedAt)>lastTime)return;
  const key=`${copy.collectibleId.toLowerCase()}:${copy.claimHash.toLowerCase()}`;if(seen.has(key))return;seen.add(key);
  let valueHistory:MarketValueObservation[]|undefined;
  if(copy.valueHistory!==undefined){
   if(!Array.isArray(copy.valueHistory)||copy.valueHistory.length<1||copy.valueHistory.length>256)return;
   valueHistory=[];
   for(const observation of copy.valueHistory){if(!observation||typeof observation.at!=='string'||observation.at.length>64||!Number.isFinite(Date.parse(observation.at))||Date.parse(observation.at)<Date.parse(copy.sealedAt)||!value(observation.usdValue)||!['sealed-birth','source-observation'].includes(observation.basis)||observation.pulse!==undefined&&(!Number.isSafeInteger(observation.pulse)||observation.pulse<0||observation.pulse>1e10||observation.basis!=='source-observation'))return;valueHistory.push({at:observation.at,usdValue:observation.usdValue,basis:observation.basis,...(observation.pulse!==undefined?{pulse:observation.pulse}:{})});}
   valueHistory.sort((a,b)=>Date.parse(a.at)-Date.parse(b.at));
   if(valueHistory[0].basis!=='sealed-birth'||Date.parse(valueHistory[0].at)!==Date.parse(copy.sealedAt)||valueHistory[0].usdValue!==copy.birthUsdValue)return;
  }
  const model=copy.valuation;
  if((model===undefined)!==(copy.valuationPulse===undefined))return;
  if(model&&(![model.baseUsdValue,model.birthUsdValue,model.marketUsdValue].every(value)||typeof model.scoreDelta!=='number'||!Number.isFinite(model.scoreDelta)||Math.abs(model.scoreDelta)>1e13||typeof model.seed!=='string'||!model.seed||model.seed.length>512||!Number.isSafeInteger(copy.valuationPulse)||(copy.valuationPulse??-1)<0||(copy.valuationPulse??Infinity)>1e10))return;
  copies.push({collectibleId:copy.collectibleId.toLowerCase(),claimHash:copy.claimHash.toLowerCase(),sealedAt:copy.sealedAt,birthUsdValue:copy.birthUsdValue,proofValueUsd:copy.proofValueUsd,currentValueUsd:copy.currentValueUsd,...(valueHistory?{valueHistory}:{}),...(model?{valuationPulse:copy.valuationPulse,valuation:{baseUsdValue:model.baseUsdValue,birthUsdValue:model.birthUsdValue,marketUsdValue:model.marketUsdValue,scoreDelta:model.scoreDelta,seed:model.seed}}:{})});
 }
 return copies;
}
const times=new Map<string,number>();
/** UTC is a presentation bridge for the carried issue date, never a new seal. */
export function marketPulseAtOrAfterTime(at:string):number{
 const held=times.get(at);if(held!==undefined)return held;
 const ms=Date.parse(at);if(!Number.isFinite(ms)||ms<marketPulseTime(0)||ms>marketPulseTime(1e10))throw Error('Public sealed time is invalid.');
 let lo=0,hi=1e10;while(lo<hi){const mid=Math.floor((lo+hi)/2);if(marketPulseTime(mid)<ms)lo=mid+1;else hi=mid;}
 if(times.size>=20000)times.clear();times.set(at,lo);return lo;
}
