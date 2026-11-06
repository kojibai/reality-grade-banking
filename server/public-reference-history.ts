import {CHART_PERIODS,type ChartPeriod} from '../src/core/chart-history.js';
import {parseMarketHistory,type MarketHistorySnapshot} from '../src/receiz/market-projection/history.js';
import {applyPublicHistoryPatch,type PublicHistoryPatch} from './public-history-patch.js';
import type {createPublicMaterialWindowReader} from './public-material-window.js';
const histories=new Map<string,Promise<MarketHistorySnapshot>>();
const parsedBaselines=new WeakMap<object,MarketHistorySnapshot>();
function retainedBaseline(input:unknown){if(input&&typeof input==='object'){const held=parsedBaselines.get(input);if(held)return held;const value=parseMarketHistory(input);parsedBaselines.set(input,value);return value;}return parseMarketHistory(input);}
function overlayValue(encoded:string,kind:'point'|'pulse'):unknown{
 let value:unknown;try{value=JSON.parse(encoded);}catch{throw Error('PUBLIC_MATERIAL_HISTORY_INVALID');}
 if(value&&typeof value==='object'&&!Array.isArray(value)){const cell=value as {baseline?:unknown;value?:unknown};if(Object.keys(cell).sort().join(',')!=='baseline,value')throw Error('PUBLIC_MATERIAL_HISTORY_INVALID');const valid=(v:unknown)=>kind==='pulse'?typeof v==='boolean':v===null||typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);if(!valid(cell.baseline)||!valid(cell.value))throw Error('PUBLIC_MATERIAL_HISTORY_INVALID');return cell.value;}
 // Existing held display overlays remain readable; new writers retain the
 // first touched baseline value so reverted keys can disappear completely.
 return value;
}
/** Materialize only the displayed chart, never the collection or financial
 * prefix. Unchanged exact history parts and sparse correction checkpoints keep
 * their byte identities; this does not recalculate financial history. */
export function readPublicReferenceHistory(reader:ReturnType<typeof createPublicMaterialWindowReader>):Promise<MarketHistorySnapshot>{
 const descriptor=reader.root.history,key=JSON.stringify(descriptor),selectedBaseline=descriptor.baseline?reader.readSelectedPart(descriptor.baseline.generation).then(retainedBaseline):null,held=histories.get(key);if(held)return selectedBaseline?selectedBaseline.then(()=>held):held;
 const job=(async()=>{
  if(selectedBaseline){const [baseline,raw]=await Promise.all([selectedBaseline,reader.readPart(descriptor.header)]);if(raw===null||typeof raw!=='object'||Array.isArray(raw)||Object.hasOwn(raw,'series')||Object.hasOwn(raw,'eventPulses')||descriptor.adjustments?.count)throw Error('PUBLIC_MATERIAL_HISTORY_INVALID');
   const observations=new Set((raw as Partial<MarketHistorySnapshot>).observationPulses??baseline.observationPulses),events=new Set(baseline.eventPulses),series={} as MarketHistorySnapshot['series'];
   if(descriptor.eventBaselineChanges)for(const [key,encoded]of await reader.indexEntries(descriptor.eventBaselineChanges)){const pulse=Number(key),value=overlayValue(encoded,'pulse');if(!/^(0|[1-9]\d*)$/.test(key)||!Number.isSafeInteger(pulse)||pulse>1e10||typeof value!=='boolean')throw Error('PUBLIC_MATERIAL_HISTORY_INVALID');if(value===true)events.add(pulse);else events.delete(pulse);}
   if(descriptor.observationBaselineChanges)for(const [key,encoded]of await reader.indexEntries(descriptor.observationBaselineChanges)){const pulse=Number(key),value=overlayValue(encoded,'pulse');if(!/^(0|[1-9]\d*)$/.test(key)||!Number.isSafeInteger(pulse)||pulse>1e10||typeof value!=='boolean')throw Error('PUBLIC_MATERIAL_HISTORY_INVALID');if(value===true)observations.add(pulse);else observations.delete(pulse);}
   for(const period of CHART_PERIODS){const points=new Map(baseline.series[period].map(point=>[point.pulse,point]));if(descriptor.baselineChanges?.[period])for(const [key,encoded]of await reader.indexEntries(descriptor.baselineChanges[period])){const pulse=Number(key);if(!/^(0|[1-9]\d*)$/.test(key)||!Number.isSafeInteger(pulse)||pulse>1e10)throw Error('PUBLIC_MATERIAL_HISTORY_INVALID');const generation=overlayValue(encoded,'point');if(generation===null){points.delete(pulse);continue;}if(typeof generation!=='string'||!/^[a-f0-9]{64}$/.test(generation))throw Error('PUBLIC_MATERIAL_HISTORY_INVALID');const point=await reader.readPart(generation) as MarketHistorySnapshot['series'][ChartPeriod][number];if(!point||point.pulse!==pulse)throw Error('PUBLIC_MATERIAL_HISTORY_INVALID');points.set(pulse,point);}series[period]=[...points.values()].sort((a,b)=>a.pulse-b.pulse);}
   return parseMarketHistory({...raw,...(baseline.observationPulses||descriptor.observationBaselineChanges?{observationPulses:[...observations].sort((a,b)=>a-b)}:{}),eventPulses:[...events].sort((a,b)=>a-b),series});
  }
  const [raw,events,periods]=await Promise.all([reader.readPart(descriptor.header),descriptor.events?reader.indexValues(descriptor.events):Promise.resolve(undefined),Promise.all(CHART_PERIODS.map(async period=>[period,await reader.indexValues(descriptor.series[period])] as const))]);
  if(raw===null||typeof raw!=='object'||Array.isArray(raw)||Object.hasOwn(raw,'series')||Object.hasOwn(raw,'eventPulses'))throw Error('PUBLIC_MATERIAL_HISTORY_INVALID');
  let value={...raw,...(events?{eventPulses:events}:{}),series:Object.fromEntries(periods) as Record<ChartPeriod,unknown[]>} as MarketHistorySnapshot;
  if(descriptor.adjustments)for(const patch of await reader.indexValues(descriptor.adjustments))value=applyPublicHistoryPatch(value,patch as PublicHistoryPatch);
  return parseMarketHistory(value);
 })();histories.set(key,job);while(histories.size>4)histories.delete(histories.keys().next().value!);void job.catch(()=>{if(histories.get(key)===job)histories.delete(key);});return job;
}
