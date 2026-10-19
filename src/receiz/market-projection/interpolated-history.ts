import type {MarketCapSource,MarketValueRow} from './source';
import {boundSportsHistoryObservation,type SportsHistoryObservation} from './sports-observations';
import {marketPulseAtOrAfterTime} from './sealed-copies';
import type {MarketSealedBirth} from './sealed-copies';
import {marketCapUsdAtPulse,marketQuoteMovementAtPulse,prepareMarketProjection,sportsUnitValue} from './project';
interface Curve {issue:number;until:number;birth:number;model:NonNullable<SportsHistoryObservation['model']>;}
export interface SportsCopyHistory extends Curve {copy:MarketSealedBirth;observation:SportsHistoryObservation;}
const finiteUsd=(value:number)=>Number(Math.max(0,value).toFixed(4));
/** The historical fallback in Receiz SportsCardPremiumValueChart.tsx:
 * sportsCardPulseProgress -> interpolatedSportsCardValue([birth,base]) ->
 * sportsCardHistoricalLivePulseChartPoint -> sportsArenaLiveValueMotionAtPulse.
 * This is a deterministic display projection, never another price record.
 */
function nativeHistoricalValue(curve:Curve,pulse:number,quoteMove:number){
 const progress=Math.max(0,Math.min(1,(Math.trunc(pulse)-Math.trunc(curve.issue))/Math.max(1,Math.trunc(curve.until)-Math.trunc(curve.issue))));
 const birth=finiteUsd(curve.birth||curve.model.baseUsdValue),base=finiteUsd(curve.model.baseUsdValue);
 const baseUsdValue=finiteUsd(birth+(base-birth)*progress);
 const row:MarketValueRow={id:'historical-display',source:'sports-economy-card',baseUsdValue,birthUsdValue:curve.birth,marketUsdValue:baseUsdValue+(finiteUsd(curve.model.marketUsdValue)-base)*progress,proofTotalValueUsd:baseUsdValue,scoreDelta:curve.model.scoreDelta*progress,seed:curve.model.seed};
 return finiteUsd(sportsUnitValue(row,pulse,quoteMove));
}
/** Only a source-bound individual model supports a per-copy replay. An
 * aggregate group quote cannot establish any one copy's historical value. */
export function prepareSportsCopyHistory(row:MarketValueRow):SportsCopyHistory|undefined{
 if(row.source!=='sports-economy-card')return;
 const record=boundSportsHistoryObservation(row.historyObservation,row);
 if(record?.scope!=='single-copy'||!record.model)return;
 const until=marketPulseAtOrAfterTime(record.at);
 const copy=(row.sealedCopies??row.sealedBirths??[]).find(copy=>copy.collectibleId===record.collectibleId&&copy.claimHash===record.claimHash);if(!copy)return;
 if(row.sealedCopies?.some(copy=>copy.valueHistory?.some(point=>point.basis==='source-observation'&&(point.pulse??marketPulseAtOrAfterTime(point.at))<until)))return;
 const issue=marketPulseAtOrAfterTime(copy.sealedAt);
 return issue<until?{issue,until,birth:copy.birthUsdValue,model:record.model,copy,observation:record}:undefined;
}
export function sportsCopyHistoryUsdAtPulse(history:SportsCopyHistory,pulse:number):number|undefined{
 if(!Number.isSafeInteger(pulse)||pulse<history.issue||pulse>history.until)return;
 if(pulse===history.issue)return history.birth;
 if(pulse===history.until)return history.observation.usdValue;
 return nativeHistoricalValue(history,pulse,marketQuoteMovementAtPulse(pulse));
}
export function prepareMarketChartProjection(source:MarketCapSource){
 const curves:Curve[]=[];
 for(const row of source.valueRows){
  const history=prepareSportsCopyHistory(row);if(history&&history.until<=source.serverPulse)curves.push(history);
 }
 return {projection:prepareMarketProjection(source),curves};
}
export function marketCapChartUsdAtPulse(source:MarketCapSource,pulse:number,context=prepareMarketChartProjection(source)):number{
 const recorded=marketCapUsdAtPulse(source,pulse,context.projection);
 if(pulse===source.serverPulse)return recorded;
 let adjustment=0;let quoteMove:number|undefined;
 for(const curve of context.curves)if(pulse>curve.issue&&pulse<curve.until){
  quoteMove??=marketQuoteMovementAtPulse(pulse);
  adjustment+=nativeHistoricalValue(curve,pulse,quoteMove)-curve.birth;
 }
 return Number(Math.max(0,recorded+adjustment).toFixed(4));
}
