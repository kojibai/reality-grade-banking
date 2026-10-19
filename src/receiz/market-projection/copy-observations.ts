import type {MarketCapSource} from './source';
import type {MarketValueObservation} from './sealed-copies';
import {marketPulseTime} from './coordinates';
interface CopyObservations {collectibleId:string;claimHash:string;sealedAt:string;birthUsdValue:number;observations:{at:string;usdValue:number;pulse?:number}[];}
export interface MarketCopyObservationTape {schema:'bank.market-copy-observations.v1';copies:CopyObservations[];}
const MAX_COPIES=10000,MAX_VALUES=20000,MAX_PER_COPY=32;
const firstTime=marketPulseTime(0),lastTime=marketPulseTime(1e10);
const key=(copy:Pick<CopyObservations,'collectibleId'|'claimHash'>)=>`${copy.collectibleId.toLowerCase()}:${copy.claimHash.toLowerCase()}`;
const amount=(value:unknown):value is number=>typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=1e13;
const time=(at:unknown):at is string=>typeof at==='string'&&at.length<=64&&Number.isFinite(Date.parse(at))&&Date.parse(at)>=firstTime&&Date.parse(at)<=lastTime;
/** Bounded public valuation observations only; this tape grants no authority. */
export function validMarketCopyObservationTape(input:unknown):input is MarketCopyObservationTape{
 const tape=input as MarketCopyObservationTape|null;
 if(!tape||tape.schema!=='bank.market-copy-observations.v1'||!Array.isArray(tape.copies)||tape.copies.length>MAX_COPIES)return false;
 const seen=new Set<string>();let values=0;
 for(const copy of tape.copies){
  if(!copy||!/^rsc_[a-f0-9]{16}$/.test(copy.collectibleId)||!/^[a-f0-9]{64}$/.test(copy.claimHash)||!time(copy.sealedAt)||!amount(copy.birthUsdValue)||!Array.isArray(copy.observations)||!copy.observations.length||copy.observations.length>MAX_PER_COPY||seen.has(key(copy)))return false;
  seen.add(key(copy));values+=copy.observations.length;if(values>MAX_VALUES)return false;
  for(let index=0;index<copy.observations.length;index++){const point=copy.observations[index];if(!point||!time(point.at)||!amount(point.usdValue)||point.pulse!==undefined&&(!Number.isSafeInteger(point.pulse)||point.pulse<0||point.pulse>1e10)||Date.parse(point.at)<Date.parse(copy.sealedAt)||index>0&&Date.parse(point.at)<=Date.parse(copy.observations[index-1].at))return false;}
 }
 return true;
}
/** Exact copy identity and sealed birth bind old observations across membership changes. */
export function mergeMarketCopyObservations(source:MarketCapSource,previous?:MarketCopyObservationTape):{source:MarketCapSource;tape?:MarketCopyObservationTape}{
 const old=previous&&validMarketCopyObservationTape(previous)?previous.copies:[],entries=new Map(old.map(copy=>[key(copy),copy])),active=new Set<string>();
 for(const row of source.valueRows)for(const copy of row.sealedCopies??[]){
  const id=key(copy),prior=entries.get(id),bound=prior&&Date.parse(prior.sealedAt)===Date.parse(copy.sealedAt)&&prior.birthUsdValue===copy.birthUsdValue;
  const observations=new Map((bound?prior.observations:[]).map(point=>[Date.parse(point.at),point]));
  for(const point of copy.valueHistory??[])if(point.basis==='source-observation'){
   // The model's capture pulse is authoritative even when generatedAt falls
   // inside that pulse. Keep it when this record later becomes historical.
   const pulse=point.pulse??(point===copy.valueHistory?.at(-1)?copy.valuationPulse:undefined);
   observations.set(Date.parse(point.at),{at:point.at,usdValue:point.usdValue,...(pulse!==undefined?{pulse}:{})});
  }
  let ordered=[...observations.values()].sort((a,b)=>Date.parse(a.at)-Date.parse(b.at));if(!ordered.length)continue;
  if(ordered.length>MAX_PER_COPY)ordered=[ordered[0],...ordered.slice(-(MAX_PER_COPY-1))];
  active.add(id);entries.set(id,{collectibleId:copy.collectibleId.toLowerCase(),claimHash:copy.claimHash.toLowerCase(),sealedAt:copy.sealedAt,birthUsdValue:copy.birthUsdValue,observations:ordered});
 }
 const copies=[...entries.values()].sort((a,b)=>Number(active.has(key(b)))-Number(active.has(key(a)))||key(a).localeCompare(key(b))).slice(0,MAX_COPIES);
 if(!copies.length)return {source};
 if(copies.reduce((sum,copy)=>sum+copy.observations.length,0)>MAX_VALUES){
  const selected=copies.map(copy=>new Map([copy.observations[0],copy.observations.at(-1)!].map(point=>[Date.parse(point.at),point])));
  let budget=MAX_VALUES-selected.reduce((sum,values)=>sum+values.size,0);
  const middle=copies.flatMap((copy,index)=>copy.observations.slice(1,-1).map(point=>({index,point}))).sort((a,b)=>Date.parse(b.point.at)-Date.parse(a.point.at));
  for(const {index,point}of middle){if(budget--<=0)break;selected[index].set(Date.parse(point.at),point);}
  for(let index=0;index<copies.length;index++)copies[index]={...copies[index],observations:[...selected[index].values()].sort((a,b)=>Date.parse(a.at)-Date.parse(b.at))};
 }
 const retained=new Map(copies.map(copy=>[key(copy),copy]));
 const valueRows=source.valueRows.map(row=>!row.sealedCopies?row:{...row,sealedCopies:row.sealedCopies.map(copy=>{
  const saved=retained.get(key(copy));if(!saved||Date.parse(saved.sealedAt)!==Date.parse(copy.sealedAt)||saved.birthUsdValue!==copy.birthUsdValue)return copy;
  const valueHistory:MarketValueObservation[]=[{at:copy.sealedAt,usdValue:copy.birthUsdValue,basis:'sealed-birth'},...saved.observations.map(point=>({...point,basis:'source-observation' as const}))];
  return {...copy,valueHistory};
 })});
 return {source:{...source,valueRows},tape:{schema:'bank.market-copy-observations.v1',copies}};
}
