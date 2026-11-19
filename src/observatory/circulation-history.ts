import type {PublicMarketCatalog} from '../receiz/public-market';
import {marketPulseTime} from '../receiz/market-projection/coordinates';

export type HistoryPoint={at:number;value:number;observedAt?:number};
type Seal={collectibleId:string;claimHash:string;sealedAt:string};

/** A reappearance in inventory or a transfer does not issue another card. */
export function collectibleSealTimes(catalog:PublicMarketCatalog):number[]{
 const seals=new Map<string,number>();
 function add(copy:Seal){
  const at=Date.parse(copy.sealedAt);
  if(!Number.isFinite(at))return;
  const key=copy.collectibleId.toLowerCase()+':'+copy.claimHash.toLowerCase(),prior=seals.get(key);
  seals.set(key,prior===undefined||prior===at?at:NaN);
 }
 for(const item of catalog.items)if(item.category==='sports'){
  for(const copy of item.sealedBirths??item.sportsValuation?.sealedBirths??[])add(copy);
  for(const copy of item.sealedCopies??item.sportsValuation?.sealedCopies??[])add(copy);
 }
 return [...seals.values()].filter(Number.isFinite).sort((a,b)=>a-b);
}

/** Issuance dates describe the dated part of the held inventory. Published
 * circulation totals can also include inventory without individual dates. */
export function datedIssuances(catalog:PublicMarketCatalog,cardSeals:readonly number[],through:number):HistoryPoint[]{
 const events=new Map<number,number>();
 function add(at:number){if(Number.isFinite(at)&&at<=through)events.set(at,(events.get(at)??0)+1);}
 for(const at of cardSeals)add(at);
 const assets=new Map<string,number>();
 for(const item of catalog.items){
  const pulse=item.livePulseSeed?.claimPulse;
  if(item.category!=='proof'||pulse===undefined||!Number.isSafeInteger(pulse)||pulse<0||pulse>1e10)continue;
  const prior=assets.get(item.assetId);
  assets.set(item.assetId,prior===undefined||prior===pulse?pulse:NaN);
 }
 for(const pulse of assets.values())if(Number.isFinite(pulse))add(marketPulseTime(pulse));
 let value=0;
 return [...events].sort(([a],[b])=>a-b).map(([at,count])=>{
  value+=count;
  return {at,value};
 });
}

/** Hold the last actual observation across the left and right range edges.
 * Its timestamp stays available for inspection. Never backfill an unknown past. */
export function visibleHistory<T extends HistoryPoint>(points:readonly T[],start:number,end:number):(T & {observedAt?:number})[]{
 let first=0,upper=points.length;
 while(first<upper){
  const mid=Math.floor((first+upper)/2);
  if(points[mid].at<start)first=mid+1;
  else upper=mid;
 }
 const rows:(T & {observedAt?:number})[]=[];
 const prior=points[first-1];
 if(prior&&points[first]?.at!==start)rows.push({...prior,at:start,observedAt:prior.observedAt??prior.at});
 for(let i=first;i<points.length&&points[i].at<=end;i++)rows.push(points[i]);
 const last=rows.at(-1);
 if(last&&last.at<end)rows.push({...last,at:end,observedAt:last.observedAt??last.at});
 return rows;
}
