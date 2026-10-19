import { CHART_PERIODS, type ChartPeriod } from '../../core/chart-history';
import { marketCapUsdAtPulse, marketPeriodPulses, marketPulseTime } from './project';
import { marketCapSummary, marketHistoryBasis,marketHistoryMembership,retainMarketInterval,MARKET_HISTORY_POLICY, type CapitalizationPoint, type MarketHistorySnapshot } from './history';
import type { MarketCapSource } from './source';
import type{PublicMarketCatalog}from'../public-market';
import{currentMarketDisplayModel}from'./catalog-source';
import {marketPulseAtOrAfterTime}from'./sealed-copies';
import {mergeMarketCopyObservations}from'./copy-observations';
function significantEventPulses(source:MarketCapSource):{ranked:number[];observed:number[]}{
 const events=new Map<number,number>(),observed=new Set<number>(),add=(pulse:number,value:number)=>events.set(pulse,(events.get(pulse)??0)+Math.abs(value));
 for(const birth of source.unpricedSealedBirths??[])add(marketPulseAtOrAfterTime(birth.sealedAt),birth.birthUsdValue);
 for(const row of source.valueRows){
  const seed=row.marketItem?.livePulseSeed;if(seed)add(seed.claimPulse,row.birthUsdValue);
  if(!row.sealedCopies)for(const birth of row.sealedBirths??[])add(marketPulseAtOrAfterTime(birth.sealedAt),birth.birthUsdValue);
  for(const copy of row.sealedCopies??[]){
   add(marketPulseAtOrAfterTime(copy.sealedAt),copy.birthUsdValue);let previous=copy.birthUsdValue;
   for(const observation of copy.valueHistory??[]){const pulse=observation.pulse??(observation.basis==='source-observation'&&copy.valuationPulse!==undefined&&observation===copy.valueHistory?.at(-1)?copy.valuationPulse:marketPulseAtOrAfterTime(observation.at));add(pulse,observation.usdValue-previous);if(observation.basis==='source-observation')observed.add(pulse);previous=observation.usdValue;}
  }
 }
 if(source.undatedHistory){add(source.undatedHistory.observationPulse,source.undatedHistory.observationUsd);observed.add(source.undatedHistory.observationPulse);add(source.undatedHistory.modelPulse,source.undatedHistory.observationUsd);observed.add(source.undatedHistory.modelPulse);}
 return {ranked:[...events].sort((a,b)=>b[1]-a[1]||a[0]-b[0]).map(([pulse])=>pulse),observed:[...observed].sort((a,b)=>a-b)};
}
/** Run at build time or in the worker; never calculate these curves on the UI thread. */
export async function buildMarketHistory(source: MarketCapSource, previous: MarketHistorySnapshot | null = null, continuing: () => boolean = () => true, yieldSample: () => Promise<void> = async () => {},current?:{catalog:PublicMarketCatalog|null;pulse:number}): Promise<MarketHistorySnapshot | null> {
  if(current)source=currentMarketDisplayModel(source,current.catalog,current.pulse,previous?.copyObservations);
  const mergedCopies=mergeMarketCopyObservations(source,previous?.copyObservations);source=mergedCopies.source;
  const [basisSha256,membershipSha256] = await Promise.all([marketHistoryBasis(source),marketHistoryMembership(source)]);
  if (!continuing()) return null;
  const sameBasis = previous?.basisSha256 === basisSha256 && previous.summary.serverPulse <= source.serverPulse;
  const matchingMembership=previous?.membershipSha256===membershipSha256&&previous.summary.serverPulse<=source.serverPulse;
  // A saved newer collection must survive while its matching operands load.
  // Identical operands can still advance locally without replacing that capture.
  if(previous&&Date.parse(source.generatedAt)<Date.parse(previous.summary.generatedAt)){
    if(!sameBasis)return null;
    source={...source,...previous.summary,serverPulse:source.serverPulse,currentUsd:source.currentUsd};
  }
  if (sameBasis && previous.summary.serverPulse === source.serverPulse && previous.summary.currentUsd === source.currentUsd) return { ...previous, summary: marketCapSummary(source) };
  const memo = new Map<number, CapitalizationPoint>(), series = {} as Record<ChartPeriod, CapitalizationPoint[]>;
  const events=sameBasis?{ranked:[],observed:previous.observationPulses??[]}:significantEventPulses(source);
  const knownObservations=new Set(previous?.observationPulses??[]),newObservations=new Set(events.observed.filter(pulse=>!knownObservations.has(pulse)));
  const sameMembership=matchingMembership&&(previous.summary.serverPulse<source.serverPulse||newObservations.size>0);
  // A dated feed can arrive behind the locally projected head. Keep earlier
  // records, then replay projections from the newly supplied observation.
  const replaceFrom=sameMembership&&!sameBasis&&newObservations.size?Math.min(...newObservations):Infinity;
  const point = async (pulse: number) => {
    if (!memo.has(pulse)) {
      const held=sameMembership&&!sameBasis&&pulse<replaceFrom&&pulse<=previous.summary.serverPulse?Object.values(previous.series).flat().filter(point=>point.pulse<=pulse).sort((a,b)=>b.pulse-a.pulse)[0]:undefined;
      memo.set(pulse, { at: new Date(marketPulseTime(pulse)).toISOString(), pulse, usdCents:held?.usdCents??String(Math.round(marketCapUsdAtPulse(source, pulse) * 100)) });
      await yieldSample();
    }
    return memo.get(pulse)!;
  };
  for (const period of CHART_PERIODS) {
    const pulses = marketPeriodPulses(source, period);
    if (sameBasis||sameMembership) {
      const additions=events.ranked.filter(pulse=>(pulse>previous.summary.serverPulse||newObservations.has(pulse))&&pulse>pulses[0]&&pulse<source.serverPulse).slice(0,32);
      const retained=new Map<number,CapitalizationPoint>();
      for(const prior of previous.series[period]){if(!continuing())return null;retained.set(prior.pulse,prior.pulse>=replaceFrom?await point(prior.pulse):prior);}
      for(const pulse of additions){if(!continuing())return null;retained.set(pulse,await point(pulse));}
      series[period] = retainMarketInterval([...retained.values()].sort((a,b)=>a.pulse-b.pulse), await point(pulses[0]), await point(source.serverPulse));
    }
    else {
      series[period] = [];
      const sampled=[...new Set([...pulses,...events.ranked.filter(pulse=>pulse>=pulses[0]&&pulse<=source.serverPulse).slice(0,32)])].sort((a,b)=>a-b);
      for (const pulse of sampled) { if (!continuing()) return null; series[period].push(await point(pulse)); }
    }
    if (!continuing()) return null;
  }
  return { schema: 'bank.public-market-history.v1',historyPolicy:MARKET_HISTORY_POLICY,basisSha256,membershipSha256,observationPulses:events.observed,copyObservations:mergedCopies.tape,summary: marketCapSummary(source), series };
}
