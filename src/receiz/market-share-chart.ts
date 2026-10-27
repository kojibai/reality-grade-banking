import {marketUPulseTime} from './market-projection/coordinates';
import type {PublicShareInventory} from './market-share-inventory';
import {shareCapitalizationUsdCents,marketCapitalizationQuantity} from './market-share-inventory';
import type {CapitalizationPoint} from './market-projection/history';
type ShareCapPoint=CapitalizationPoint&{kaiUPulse:string};
type UnitResolver=(pulse:number)=>string|null;
const observations=new WeakMap<PublicShareInventory,readonly ShareCapPoint[]>();
const nativeAnchors=new WeakMap<PublicShareInventory,WeakMap<UnitResolver,readonly ShareCapPoint[]>>();
const at=(coordinate:bigint,price:string,quantity:string):ShareCapPoint=>({pulse:Number(coordinate/1000000n),kaiUPulse:coordinate.toString(),at:new Date(marketUPulseTime(coordinate.toString())).toISOString(),usdCents:shareCapitalizationUsdCents(price,quantity)});
function recordedCapacityPoints(inventory:PublicShareInventory){
 let result=observations.get(inventory);if(result)return result;
 const release=inventory.releaseCapitalization,recorded=inventory.capitalizationHistory??[],history=release?[release,...recorded.filter(point=>BigInt(point.kaiUPulse)>BigInt(release.kaiUPulse))]:recorded;
 result=history.map(point=>at(BigInt(point.kaiUPulse),point.unitPriceUsdCents,(BigInt(point.outstandingShareQuantityMicro)+BigInt(point.availableShareQuantityMicro)).toString()));
 observations.set(inventory,result);return result;
}
function nativeEventAnchors(inventory:PublicShareInventory,unitAtPulse:UnitResolver){
 let resolvers=nativeAnchors.get(inventory);if(!resolvers){resolvers=new WeakMap();nativeAnchors.set(inventory,resolvers);}
 const cached=resolvers.get(unitAtPulse);if(cached)return cached;
 const prices=new Map<number,string|null>(),anchors=new Map<string,ShareCapPoint>();let previous:string|undefined;
 const price=(coordinate:bigint)=>{const pulse=Number(coordinate/1000000n);if(!prices.has(pulse))prices.set(pulse,unitAtPulse(pulse));return prices.get(pulse)!;};
 for(const event of inventory.history??[]){
  const coordinate=BigInt(event.kaiUPulse);
  if(previous!==undefined&&coordinate>0n){const before=coordinate-1n,cents=price(before);if(cents!==null)anchors.set(before.toString(),at(before,cents,previous));}
  const cents=price(coordinate);if(cents!==null)anchors.set(coordinate.toString(),at(coordinate,cents,event.outstandingShareQuantityMicro));
  previous=event.outstandingShareQuantityMicro;
 }
 const result=[...anchors.values()].sort((a,b)=>BigInt(a.kaiUPulse)<BigInt(b.kaiUPulse)?-1:1);resolvers.set(unitAtPulse,result);return result;
}
/** Generic capacity history starts at deterministic release capacity and retains actual recorded quote observations. Native
 * history composes the verified issued supply without adding open asks twice.
 * Historic anchors are retained by immutable inventory and stable price resolver;
 * projecting samples and merging anchors is linear, never a history scan per point. */
export function shareCapitalizationPoints(points:readonly CapitalizationPoint[],inventory:PublicShareInventory|null|undefined,unitAtPulse?:UnitResolver):ShareCapPoint[]{
 if(!inventory||!points.length)return[];
 const start=BigInt(points[0].pulse)*1000000n,end=BigInt(points.at(-1)!.pulse)*1000000n+999999n;
 if(inventory.family==='generic'){
  const recorded=recordedCapacityPoints(inventory),history=inventory.releaseCapitalization?[inventory.releaseCapitalization,...(inventory.capitalizationHistory??[]).filter(point=>BigInt(point.kaiUPulse)>BigInt(inventory.releaseCapitalization!.kaiUPulse))]:inventory.capitalizationHistory??[],values=new Map<string,ShareCapPoint>();
  let index=0,quantity:string|null=null;
  for(const point of points){const coordinate=BigInt(point.pulse)*1000000n;
   while(index<history.length&&BigInt(history[index].kaiUPulse)<=coordinate){quantity=(BigInt(history[index].outstandingShareQuantityMicro)+BigInt(history[index].availableShareQuantityMicro)).toString();index++;}
   if(quantity!==null)values.set(coordinate.toString(),at(coordinate,point.usdCents,quantity));
  }
  // Retained quote observations keep their exact recorded value. Between them,
  // the chart projects unit value against the last known share capacity.
  for(const point of recorded){const coordinate=BigInt(point.kaiUPulse);if(coordinate>=start&&coordinate<=end)values.set(point.kaiUPulse,point);}
  const latest=points.at(-1)!,coordinate=BigInt(latest.pulse)*1000000n,current=marketCapitalizationQuantity(inventory);
  if(current!==null&&coordinate>BigInt(inventory.observedAtKaiUPulse))values.set(coordinate.toString(),at(coordinate,latest.usdCents,current));
  return [...values.values()].sort((a,b)=>BigInt(a.kaiUPulse)<BigInt(b.kaiUPulse)?-1:1);
 }
 const history=inventory.history??[{kaiUPulse:inventory.observedAtKaiUPulse,outstandingShareQuantityMicro:inventory.outstandingShareQuantityMicro}],samples:ShareCapPoint[]=[];
 let index=0,quantity:string|null=null;
 for(const point of points){const coordinate=BigInt(point.pulse)*1000000n;while(index<history.length&&BigInt(history[index].kaiUPulse)<=coordinate){quantity=history[index].outstandingShareQuantityMicro;index++;}if(quantity!==null)samples.push({...point,kaiUPulse:coordinate.toString(),usdCents:shareCapitalizationUsdCents(point.usdCents,quantity)});}
 if(!unitAtPulse)return samples;
 const anchors=nativeEventAnchors(inventory,unitAtPulse),merged:ShareCapPoint[]=[];let sampleIndex=0;
 for(const anchor of anchors){const coordinate=BigInt(anchor.kaiUPulse);if(coordinate<start)continue;if(coordinate>end)break;
  while(sampleIndex<samples.length&&BigInt(samples[sampleIndex].kaiUPulse)<coordinate)merged.push(samples[sampleIndex++]);
  if(sampleIndex<samples.length&&samples[sampleIndex].kaiUPulse===anchor.kaiUPulse)sampleIndex++;
  merged.push(anchor);
 }
 return merged.concat(samples.slice(sampleIndex));
}
