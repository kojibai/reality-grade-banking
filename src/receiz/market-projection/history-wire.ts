import {CHART_PERIODS,type ChartPeriod} from '../../core/chart-history';
import {marketPulseTime} from './coordinates';
import type {CapitalizationPoint,MarketHistorySnapshot} from './history';
const MAX_POINTS=100096;
export type CompactMarketHistory=Omit<MarketHistorySnapshot,'schema'|'series'|'eventPulses'>&{schema:'bank.public-market-history.compact.v1';pointTable:[number,string][];eventRanges?:[number,number][];series:Record<ChartPeriod,number[]>};
/** Lossless display transport: shared samples cross the boundary once. */
export function packMarketHistory(history:MarketHistorySnapshot):CompactMarketHistory{
 const {schema:_schema,series:intervals,eventPulses,...metadata}=history,pointTable:[number,string][]=[],byPulse=new Map<number,number>(),series={} as Record<ChartPeriod,number[]>;
 for(const period of CHART_PERIODS)series[period]=intervals[period].map(point=>{
  const held=byPulse.get(point.pulse);
  if(held!==undefined){if(pointTable[held][1]!==point.usdCents)throw Error('Public market interval values conflict.');return held;}
  if(pointTable.length>=MAX_POINTS)throw Error('Public market point coverage exceeds capacity.');
  const index=pointTable.length;byPulse.set(point.pulse,index);pointTable.push([point.pulse,point.usdCents]);return index;
 });
 const eventRanges:[number,number][]=[];
 for(const pulse of eventPulses??[]){const index=byPulse.get(pulse);if(index===undefined)throw Error('Public market sealed event is missing.');const last=eventRanges.at(-1);if(last&&index===last[1]+1)last[1]=index;else eventRanges.push([index,index]);}
 return {...metadata,schema:'bank.public-market-history.compact.v1',pointTable,series,...(eventPulses?{eventRanges}:{})};
}
/** Expansion does not admit data; parseMarketHistory still checks every field. */
export function unpackMarketHistory(input:unknown):unknown{
 const wire=input as CompactMarketHistory|null;if(wire?.schema!=='bank.public-market-history.compact.v1')return input;
 if(!Array.isArray(wire.pointTable)||!wire.pointTable.length||wire.pointTable.length>MAX_POINTS||!wire.series)throw Error('Public market point table is invalid.');
 const seen=new Set<number>(),points:CapitalizationPoint[]=wire.pointTable.map(pair=>{
  if(!Array.isArray(pair)||pair.length!==2||!Number.isSafeInteger(pair[0])||pair[0]<0||pair[0]>1e10||typeof pair[1]!=='string'||!/^(0|[1-9]\d{0,15})$/.test(pair[1])||seen.has(pair[0]))throw Error('Public market point table is invalid.');
  seen.add(pair[0]);return {pulse:pair[0],usdCents:pair[1],at:new Date(marketPulseTime(pair[0])).toISOString()};
 });
 const series={} as MarketHistorySnapshot['series'];
 for(const period of CHART_PERIODS){const indexes=wire.series[period];if(!Array.isArray(indexes)||!indexes.length||indexes.length>MAX_POINTS)throw Error('Public market interval indexes are invalid.');series[period]=indexes.map(index=>{if(!Number.isSafeInteger(index)||index<0||index>=points.length)throw Error('Public market interval index is invalid.');return points[index];});}
 let eventPulses:number[]|undefined;
 if(wire.eventRanges!==undefined){if(!Array.isArray(wire.eventRanges)||wire.eventRanges.length>MAX_POINTS)throw Error('Public market event ranges are invalid.');eventPulses=[];let previousEnd=-1;for(const range of wire.eventRanges){if(!Array.isArray(range)||range.length!==2||!range.every(Number.isSafeInteger)||range[0]<=previousEnd||range[1]<range[0]||range[1]>=points.length||eventPulses.length+range[1]-range[0]+1>MAX_POINTS)throw Error('Public market event ranges are invalid.');previousEnd=range[1];for(let index=range[0];index<=range[1];index++)eventPulses.push(points[index].pulse);}}
 const {pointTable:_table,eventRanges:_ranges,eventPulses:_untrustedEvents,...metadata}=wire as CompactMarketHistory&{eventPulses?:unknown};
 return {...metadata,...(eventPulses?{eventPulses}:{}),schema:'bank.public-market-history.v1',series};
}
