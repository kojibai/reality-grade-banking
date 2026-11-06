import {CHART_PERIODS,type ChartPeriod} from '../src/core/chart-history.js';
import type {MarketHistorySnapshot,CapitalizationPoint} from '../src/receiz/market-projection/history.js';
import {marketPulseTime} from '../src/receiz/market-projection/coordinates.js';
type PointAddition=Readonly<{pulse:number;usdCents:string}>;
type PointPatch=Readonly<{add:readonly PointAddition[];remove:readonly number[];delta:readonly (readonly [number,string])[]}>;
export type PublicHistoryPatch=Readonly<{schema:'bank.public-market.history-patch.v1';set:Readonly<Record<string,unknown>>;remove:readonly string[];events:{add:readonly number[];remove:readonly number[]};observations:{add:readonly number[];remove:readonly number[]};series:Readonly<Record<ChartPeriod,PointPatch>>}>;
const invalid=():never=>{throw Error('PUBLIC_HISTORY_PATCH_INVALID');};
const integer=(n:unknown):n is number=>typeof n==='number'&&Number.isSafeInteger(n)&&n>=0&&n<=1e10;
const cents=(n:unknown):n is string=>typeof n==='string'&&/^(0|[1-9]\d{0,15})$/.test(n);
function equal(a:unknown,b:unknown):boolean{if(Object.is(a,b))return true;if(!a||!b||typeof a!=='object'||typeof b!=='object'||Array.isArray(a)!==Array.isArray(b))return false;const ak=Object.keys(a),bk=Object.keys(b);return ak.length===bk.length&&ak.every(key=>Object.hasOwn(b,key)&&equal((a as Record<string,unknown>)[key],(b as Record<string,unknown>)[key]));}
function numbers(before:readonly number[]=[],after:readonly number[]=[]){const old=new Set(before),next=new Set(after);return{add:after.filter(n=>!old.has(n)),remove:before.filter(n=>!next.has(n))};}
/** A cache delta over an already calculated display. This issues no financial
 * fact and cannot qualify Source. Existing exact point bodies stay referenced;
 * only a changed contribution, new sample or removed sample is encoded. */
export function derivePublicHistoryPatch(before:MarketHistorySnapshot,after:MarketHistorySnapshot):PublicHistoryPatch|null{
 if(before===after)return null;
 const set:Record<string,unknown>={},remove:string[]=[],skip=new Set(['series','eventPulses','observationPulses']);let changed=false;
 for(const key of new Set([...Object.keys(before),...Object.keys(after)])){if(skip.has(key))continue;const old=(before as unknown as Record<string,unknown>)[key],next=(after as unknown as Record<string,unknown>)[key];if(equal(old,next))continue;changed=true;if(Object.hasOwn(after,key))set[key]=next;else remove.push(key);}
 const series={} as Record<ChartPeriod,PointPatch>;
 for(const period of CHART_PERIODS){const old=new Map(before.series[period].map(point=>[point.pulse,point])),next=new Set<number>(),add:PointAddition[]=[],delta:[number,string][]=[];
  for(const point of after.series[period]){if(!integer(point.pulse)||!cents(point.usdCents)||next.has(point.pulse)||Date.parse(point.at)!==marketPulseTime(point.pulse))invalid();next.add(point.pulse);const prior=old.get(point.pulse);if(!prior)add.push({pulse:point.pulse,usdCents:point.usdCents});else if(prior.usdCents!==point.usdCents)delta.push([point.pulse,(BigInt(point.usdCents)-BigInt(prior.usdCents)).toString()]);}
  const removed=[...old.keys()].filter(pulse=>!next.has(pulse));series[period]={add,remove:removed,delta};changed||=!!(add.length||removed.length||delta.length);
 }
 const events=numbers(before.eventPulses,after.eventPulses),observations=numbers(before.observationPulses,after.observationPulses);changed||=!!(events.add.length||events.remove.length||observations.add.length||observations.remove.length);
 return changed?{schema:'bank.public-market.history-patch.v1',set,remove,events,observations,series}:null;
}
export function applyPublicHistoryPatch(before:MarketHistorySnapshot,patch:PublicHistoryPatch):MarketHistorySnapshot{
 if(patch?.schema!=='bank.public-market.history-patch.v1'||!patch.set||typeof patch.set!=='object'||!Array.isArray(patch.remove)||patch.remove.some(key=>typeof key!=='string'||['schema','series','eventPulses','observationPulses','__proto__','constructor','prototype'].includes(key))||Object.keys(patch.set).some(key=>['schema','series','eventPulses','observationPulses','__proto__','constructor','prototype'].includes(key)))invalid();
 const result={...before,...patch.set} as MarketHistorySnapshot;for(const key of patch.remove)delete (result as unknown as Record<string,unknown>)[key];
 const list=(input:readonly number[]|undefined,change:PublicHistoryPatch['events'])=>{if(!change||!Array.isArray(change.add)||!Array.isArray(change.remove)||change.add.some(n=>!integer(n))||change.remove.some(n=>!integer(n)))invalid();const values=new Set(input);for(const n of change.remove)if(!values.delete(n))invalid();for(const n of change.add){if(values.has(n))invalid();values.add(n);}return [...values].sort((a,b)=>a-b);};
 if(before.eventPulses||patch.events.add.length||patch.events.remove.length)result.eventPulses=list(before.eventPulses,patch.events);
 if(before.observationPulses||patch.observations.add.length||patch.observations.remove.length)result.observationPulses=list(before.observationPulses,patch.observations);
 result.series={} as MarketHistorySnapshot['series'];
 for(const period of CHART_PERIODS){const value=patch.series?.[period];if(!value||!Array.isArray(value.add)||!Array.isArray(value.remove)||!Array.isArray(value.delta))invalid();const points=new Map(before.series[period].map(point=>[point.pulse,point]));
  for(const pulse of value.remove)if(!integer(pulse)||!points.delete(pulse))invalid();const updated=new Set<number>();
  for(const [pulse,delta]of value.delta){const prior=points.get(pulse);if(!prior)throw Error('PUBLIC_HISTORY_PATCH_INVALID');if(!integer(pulse)||updated.has(pulse)||typeof delta!=='string'||! /^-?(0|[1-9]\d{0,15})$/.test(delta))invalid();const sum=(BigInt(prior.usdCents)+BigInt(delta)).toString();if(!cents(sum))invalid();updated.add(pulse);points.set(pulse,{...prior,usdCents:sum});}
  for(const point of value.add){if(!integer(point.pulse)||!cents(point.usdCents)||points.has(point.pulse))invalid();points.set(point.pulse,{pulse:point.pulse,at:new Date(marketPulseTime(point.pulse)).toISOString(),usdCents:point.usdCents} satisfies CapitalizationPoint);}
  result.series[period]=[...points.values()].sort((a,b)=>a.pulse-b.pulse);
 }
 return result;
}
