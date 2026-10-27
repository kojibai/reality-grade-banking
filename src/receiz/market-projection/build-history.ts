import { CHART_PERIODS, type ChartPeriod } from '../../core/chart-history';
import { marketPeriodPulses, marketPulseTime } from './project';
import { marketCapSummary, marketHistoryBasis,marketHistoryMembership,retainMarketInterval,MARKET_HISTORY_POLICY,SHARE_MARKET_HISTORY_POLICY, type CapitalizationPoint, type MarketHistorySnapshot } from './history';
import type { MarketCapSource } from './source';
import type{PublicMarketCatalog}from'../public-market';
import{currentMarketDisplayModel}from'./catalog-source';
import {marketPulseAtOrAfterTime}from'./sealed-copies';
import {mergeMarketCopyObservations}from'./copy-observations';
import {sameSportsPricingOperands}from'./sports-observations';
import {marketCapChartUsdAtPulse,prepareMarketChartProjection} from './interpolated-history';
import {prepareGlobalShareCapitalization,globalMarketCapitalizationInputs} from './global-share-capitalization';
function significantEventPulses(source:MarketCapSource):{ranked:number[];observed:number[]}{
 const events=new Map<number,number>(),observed=new Set<number>(),add=(pulse:number,value:number)=>events.set(pulse,(events.get(pulse)??0)+Math.abs(value));
 for(const birth of source.unpricedSealedBirths??[])add(marketPulseAtOrAfterTime(birth.sealedAt),birth.birthUsdValue);
 for(const row of source.valueRows){
  if(row.historyObservation){const captured=marketPulseAtOrAfterTime(row.historyObservation.at);add(captured,row.historyObservation.usdValue);observed.add(captured);}
  if(row.historyObservation?.model&&row.historyEvaluationPulse!==undefined&&!sameSportsPricingOperands(row,row.historyObservation.model)){add(row.historyEvaluationPulse,row.proofTotalValueUsd);observed.add(row.historyEvaluationPulse);}
  const seed=row.marketItem?.livePulseSeed;if(seed)add(seed.claimPulse,row.birthUsdValue);
  if(!row.sealedCopies)for(const birth of row.sealedBirths??[])add(marketPulseAtOrAfterTime(birth.sealedAt),birth.birthUsdValue);
  for(const copy of row.sealedCopies??[]){
   add(marketPulseAtOrAfterTime(copy.sealedAt),copy.birthUsdValue);let previous=copy.birthUsdValue;
   for(const observation of copy.valueHistory??[]){const pulse=observation.pulse??(observation.basis==='source-observation'&&copy.valuationPulse!==undefined&&observation===copy.valueHistory?.at(-1)?copy.valuationPulse:marketPulseAtOrAfterTime(observation.at));add(pulse,observation.usdValue-previous);if(observation.basis==='source-observation')observed.add(pulse);previous=observation.usdValue;}
  }
 }
 // A dated pricing capture also declares its coverage. Preserve that boundary
 // without presenting a model evaluation as a new performance observation.
 if(source.sportsHistorySnapshot&&source.sportsHistoryEvaluationPulse!==undefined){
  const captured=Date.parse(source.sportsHistorySnapshot.at),copies=[...(source.unpricedSealedBirths??[]),...source.valueRows.flatMap(row=>row.historyObservation?(row.sealedBirths??[]):[])];
  add(source.sportsHistoryEvaluationPulse,copies.reduce((value,copy)=>value+(Date.parse(copy.sealedAt)>captured?copy.birthUsdValue:0),0));
 }
 if(source.undatedHistory){add(source.undatedHistory.observationPulse,source.undatedHistory.observationUsd);observed.add(source.undatedHistory.observationPulse);add(source.undatedHistory.modelPulse,source.undatedHistory.observationUsd);observed.add(source.undatedHistory.modelPulse);}
 return {ranked:[...events].sort((a,b)=>b[1]-a[1]||a[0]-b[0]).map(([pulse])=>pulse),observed:[...observed].sort((a,b)=>a-b)};
}
/** Run at build time or in the worker; never calculate these curves on the UI thread. */
export async function buildMarketHistory(source: MarketCapSource, previous: MarketHistorySnapshot | null = null, continuing: () => boolean = () => true, yieldSample: () => Promise<void> = async () => {},current?:{catalog:PublicMarketCatalog|null;pulse:number;capitalization?:boolean}): Promise<MarketHistorySnapshot | null> {
  if(current?.capitalization&&current.catalog){const scoped=globalMarketCapitalizationInputs(source,current.catalog);source=scoped.source;current={...current,catalog:scoped.catalog};}
  if(current)source=currentMarketDisplayModel(source,current.catalog,current.pulse,previous?.copyObservations);
  const mergedCopies=mergeMarketCopyObservations(source,previous?.copyObservations);source=mergedCopies.source;
  const shares=current?.capitalization&&current.catalog?prepareGlobalShareCapitalization(source,current.catalog):null;
  if(shares&&(!shares.coverage.covered&&!(shares.coverage.complete&&shares.coverage.listed===0)||previous?.historyPolicy===SHARE_MARKET_HISTORY_POLICY&&previous?.summary.shareCapitalization&&shares.coverage.listed>=previous.summary.shareCapitalization.listed&&shares.coverage.covered<previous.summary.shareCapitalization.covered))return null;
  const policy=shares?SHARE_MARKET_HISTORY_POLICY:MARKET_HISTORY_POLICY;
  if(shares)source={...source,currentUsd:Number(shares.coverage.usdCents)/100};
  const summary=()=>({...marketCapSummary(source),...(shares?{shareCapitalization:shares.coverage}:{})});
  const [basisSha256,membershipSha256] = await Promise.all([marketHistoryBasis(source,shares?.basis),marketHistoryMembership(source)]);
  if (!continuing()) return null;
  const sameBasis = previous?.historyPolicy===policy && previous?.basisSha256 === basisSha256 && previous.summary.serverPulse <= source.serverPulse;
  const matchingMembership=previous?.historyPolicy===policy&&previous?.membershipSha256===membershipSha256&&previous.summary.serverPulse<=source.serverPulse;
  // A saved newer collection must survive while its matching operands load.
  // Identical operands can still advance locally without replacing that capture.
  if(previous&&previous.historyPolicy===policy&&Date.parse(source.generatedAt)<Date.parse(previous.summary.generatedAt)){
    if(!sameBasis)return null;
    source={...source,...previous.summary,serverPulse:source.serverPulse,currentUsd:source.currentUsd};
  }
  if (sameBasis && previous.summary.serverPulse === source.serverPulse && previous.summary.currentUsd === source.currentUsd) return { ...previous, summary: summary() };
  const context=prepareMarketChartProjection(source),memo = new Map<number, CapitalizationPoint>(), series = {} as Record<ChartPeriod, CapitalizationPoint[]>;
  const discovered=significantEventPulses(source);
  const events={ranked:[...new Set([...discovered.ranked,...(shares?.events??[])])].filter(pulse=>pulse>=source.firstIssuancePulse&&pulse<=source.serverPulse),observed:[...new Set([...discovered.observed,...(shares?.events??[])])].filter(pulse=>pulse>=source.firstIssuancePulse&&pulse<=source.serverPulse).sort((a,b)=>a-b)};
  const eventPulses=[...events.ranked].sort((a,b)=>a-b),protectedPulses=new Set(eventPulses);
  if(eventPulses.length>100000)throw Error('Public market event coverage exceeds capacity.');
  const knownObservations=new Set(previous?.observationPulses??[]),newObservations=new Set(events.observed.filter(pulse=>!knownObservations.has(pulse)));
  const sameMembership=matchingMembership&&(previous.summary.serverPulse<source.serverPulse||newObservations.size>0);
  // A dated feed can arrive behind the locally projected head. Keep earlier
  // records, then replay projections from the newly supplied observation.
  const replaceFrom=sameMembership&&!sameBasis&&newObservations.size?Math.min(...newObservations):Infinity;
  // One index for all ranges; avoid repeated flattening and sorting per point.
  const heldPoints=sameMembership&&!sameBasis?[...new Map(Object.values(previous.series).flat().map(point=>[point.pulse,point])).values()].sort((a,b)=>a.pulse-b.pulse):[];
  const heldAt=(pulse:number)=>{let lo=0,hi=heldPoints.length;while(lo<hi){const mid=(lo+hi)>>>1;if(heldPoints[mid].pulse<=pulse)lo=mid+1;else hi=mid;}return heldPoints[lo-1];};
  const point = async (pulse: number) => {
    if (!memo.has(pulse)) {
      const held=sameMembership&&!sameBasis&&pulse<replaceFrom&&pulse<=previous.summary.serverPulse?heldAt(pulse):undefined;
      memo.set(pulse, { at: new Date(marketPulseTime(pulse)).toISOString(), pulse, usdCents:held?.usdCents??shares?.at(pulse)??String(Math.round(marketCapChartUsdAtPulse(source, pulse,context) * 100)) });
      await yieldSample();
    }
    return memo.get(pulse)!;
  };
  for (const period of CHART_PERIODS) {
    const pulses = marketPeriodPulses(source, period);
    if (sameBasis||sameMembership) {
      const additions=events.ranked.filter(pulse=>(pulse>previous.summary.serverPulse||newObservations.has(pulse))&&pulse>pulses[0]&&pulse<source.serverPulse);
      const retained=new Map<number,CapitalizationPoint>();
      for(const prior of previous.series[period]){if(!continuing())return null;retained.set(prior.pulse,prior.pulse>=replaceFrom?await point(prior.pulse):prior);}
      for(const pulse of new Set([...additions,...pulses.filter(pulse=>pulse>previous.summary.serverPulse)])){if(!continuing())return null;retained.set(pulse,await point(pulse));}
      series[period] = retainMarketInterval([...retained.values()].sort((a,b)=>a.pulse-b.pulse), await point(pulses[0]), await point(source.serverPulse),protectedPulses);
    }
    else {
      series[period] = [];
      const sampled=[...new Set([...pulses,...events.ranked.filter(pulse=>pulse>=pulses[0]&&pulse<=source.serverPulse)])].sort((a,b)=>a-b);
      for (const pulse of sampled) { if (!continuing()) return null; series[period].push(await point(pulse)); }
    }
    if (!continuing()) return null;
  }
  return { schema: 'bank.public-market-history.v1',historyPolicy:policy,eventPulses,basisSha256,membershipSha256,observationPulses:events.observed,copyObservations:mergedCopies.tape,summary: summary(), series };
}
