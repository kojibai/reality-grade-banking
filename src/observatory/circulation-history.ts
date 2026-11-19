import type {PublicMarketCatalog} from '../receiz/public-market';
import archivedClaims from './archived-issuance-claims.json';
import {marketPulseTime} from '../receiz/market-projection/coordinates';

export type HistoryPoint={at:number;value:number;observedAt?:number};
type Seal={collectibleId:string;claimHash:string;sealedAt:string};

/** A reappearance in inventory or a transfer does not issue another card. */
export function collectibleSealTimes(catalog:PublicMarketCatalog,archive:readonly (readonly (string|number)[])[]=[]):number[]{
 const seals=new Map<string,number>();
 function include(key:string,at:number){
  if(!Number.isFinite(at))return;
  const prior=seals.get(key);
  seals.set(key,prior===undefined||prior===at?at:NaN);
 }
 const add=(copy:Seal)=>include(copy.collectibleId.toLowerCase(),Date.parse(copy.sealedAt));
 // The immutable slot identifies the collectible across reissued claim hashes.
 for(const [source,at] of archive)if(typeof source==='string'&&typeof at==='number')include(source.split(':',1)[0],at);
 for(const item of catalog.items)if(item.category==='sports'){
  for(const copy of item.sealedBirths??item.sportsValuation?.sealedBirths??[])add(copy);
  for(const copy of item.sealedCopies??item.sportsValuation?.sealedCopies??[])add(copy);
 }
 return [...seals.values()].filter(Number.isFinite).sort((a,b)=>a-b);
}

/** Verified pack-manifest and vault claim coordinates retained in the public display. */
export const networkCollectibleSealTimes=(catalog:PublicMarketCatalog)=>collectibleSealTimes(catalog,archivedClaims);

/** Issuance dates describe the dated part of the held inventory. Published
 * circulation totals can also include inventory without individual dates. */
export function datedIssuances(catalog:PublicMarketCatalog,cardSeals:readonly number[],through:number):HistoryPoint[]{
 const events=new Map<number,number>();
 function add(at:number){if(Number.isFinite(at)&&at<=through)events.set(at,(events.get(at)??0)+1);}
 for(const at of cardSeals)add(at);
 const assets=new Map<string,number>();
 for(const item of catalog.items){
  if(item.category!=='proof')continue;
  const pulse=item.livePulseSeed?.claimPulse??(item.pulse&&/^\d{1,10}$/.test(item.pulse)?Number(item.pulse):undefined);
  const at=pulse!==undefined&&Number.isSafeInteger(pulse)&&pulse>=0&&pulse<=1e10?marketPulseTime(pulse):Date.parse(item.sealedAt??'');
  if(!Number.isFinite(at))continue;
  const prior=assets.get(item.assetId);
  assets.set(item.assetId,prior===undefined||prior===at?at:NaN);
 }
 for(const at of assets.values())add(at);
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
