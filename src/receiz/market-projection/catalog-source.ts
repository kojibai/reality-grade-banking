import type{PublicMarketCatalog}from'../public-market';
import{publicAssetPulseSeed}from'./asset';
import{publicSigilQuoteAtPulse,marketRowsUsdAtPulse}from'./project';
import type{MarketCapSource,MarketValueRow}from'./source';
import {marketPulseAtOrAfterTime}from'./sealed-copies';
import {mergeMarketCopyObservations,type MarketCopyObservationTape}from'./copy-observations';
import {boundSportsHistoryObservation,sameSportsPricingOperands}from'./sports-observations';

/** The complete public inventory supplies membership; its existing operands
 * supply valuation. Neither this projection nor its digest grants authority. */
export function currentMarketDisplayModel(source:MarketCapSource,catalog:PublicMarketCatalog|null,pulse:number,copyObservations?:MarketCopyObservationTape):MarketCapSource{
 if(!Number.isSafeInteger(pulse)||pulse<source.serverPulse||pulse>1e10)throw Error('Public market evaluation pulse is invalid.');
 let rows=source.valueRows;
 const currentCollection=catalog?.complete&&Date.parse(catalog.observedAt??'')>=Date.parse(source.generatedAt);
 if(currentCollection){
  // The asset is the economic unit; profile aliases do not issue it twice.
  const assets=new Map(catalog.items.filter(item=>item.category==='proof').map(item=>[item.assetId,item]));
  const ids=new Set([...assets.values()].map(item=>item.id));
  const current:MarketValueRow[]=source.valueRows.filter(row=>row.source==='sports-economy-card'||!row.marketItem?.id.startsWith('profile:')&&!assets.has(row.seed)&&!ids.has(row.marketItem?.id??''));
  for(const item of assets.values()){
   const seed=publicAssetPulseSeed(item,source);if(!seed||seed.claimPulse>pulse)continue;
   const birth=publicSigilQuoteAtPulse(seed,seed.claimPulse);
   current.push({id:`public-market:${item.id}`,source:'market-desk-live-asset',seed:item.assetId,baseUsdValue:birth.priceUsd,birthUsdValue:birth.priceUsd,marketUsdValue:birth.priceUsd,proofTotalValueUsd:birth.priceUsd,scoreDelta:0,quoteUsdPerPhi:birth.quoteUsdPerPhi,marketItem:{id:item.id,source:'profile',...birth,changePct:0,livePulseSeed:seed}});
  }
  rows=current;
 }
 const cards=catalog?.items.filter(item=>item.category==='sports'&&item.sportsValuation)??[];
 if(cards.length){
  const sports=new Map(rows.filter(row=>row.source==='sports-economy-card').map(row=>[row.seed,row]));
  const newer=Date.parse(catalog?.sportsObservedAt??'')>=Date.parse(source.generatedAt);
  const newerBirths=Date.parse(catalog?.sportsSealedBirthsObservedAt??catalog?.sportsObservedAt??'')>=Date.parse(source.generatedAt);
  for(const item of cards){
   let row=item.sportsValuation!;
   if(!newer&&sports.has(row.seed)){
    // Recovered seals have their own capture time. An older price capture
    // can enrich the exact retained claim without replacing its pricing law.
    const retained=sports.get(row.seed)!;
    const enriched={...retained,...(row.sealedBirths?.length&&(newerBirths||!retained.sealedBirths?.length)?{sealedBirths:row.sealedBirths}:{})};
    sports.set(row.seed,!retained.historyObservation&&boundSportsHistoryObservation(row.historyObservation,enriched)?{...enriched,historyObservation:row.historyObservation}:enriched);
    continue;
   }
   // A new representative can carry the same exact copies as an older row.
   // Their claims identify that overlap without guessing from a card title.
   const prior=sports.get(row.seed)??(row.sealedCopies??row.sealedBirths??[]).map(copy=>sports.get(copy.claimHash)).find(candidate=>candidate?.historyObservation);
   if(!row.historyObservation&&prior?.historyObservation){const target={...row,sportsGroup:row.sportsGroup??prior.sportsGroup};if(boundSportsHistoryObservation(prior.historyObservation,target))row={...target,historyObservation:prior.historyObservation};}
   if(newer&&row.historyObservation?.model&&!sameSportsPricingOperands(row,row.historyObservation.model)&&row.historyEvaluationPulse===undefined&&Number.isFinite(Date.parse(catalog?.sportsObservedAt??'')))row={...row,historyEvaluationPulse:marketPulseAtOrAfterTime(catalog!.sportsObservedAt!)};
   if(newer)for(const copy of row.sealedCopies??row.sealedBirths??[])sports.delete(copy.claimHash);
   sports.set(row.seed,row);
  }
  rows=[...rows.filter(row=>row.source!=='sports-economy-card'),...sports.values()];
 }
 if(rows.length>10000)throw Error('Public market display coverage exceeds capacity.');
 rows=rows.map(row=>row.historyObservation&&!boundSportsHistoryObservation(row.historyObservation,row)?{...row,historyObservation:undefined}:row);
 const identity=(copy:{collectibleId:string;claimHash:string})=>`${copy.collectibleId.toLowerCase()}:${copy.claimHash.toLowerCase()}`;
 const pricedIdentities=new Set(rows.flatMap(row=>(row.sealedCopies??row.sealedBirths??[]).map(identity)));
 const unpriced=new Map((source.unpricedSealedBirths??[]).map(copy=>[identity(copy),copy]));
 for(const item of catalog?.items??[])if(item.category==='sports'&&!item.sportsValuation)for(const copy of item.sealedBirths??[])unpriced.set(identity(copy),copy);
 for(const id of pricedIdentities)unpriced.delete(id);
 const unpricedSealedBirths=unpriced.size?[...unpriced.values()]:undefined;if(unpriced.size>10000)throw Error('Public sealed birth coverage exceeds capacity.');
 const candidate=catalog?.sportsHistorySnapshot??source.sportsHistorySnapshot,observedRows=candidate?rows.filter(row=>row.historyObservation?.sourceHash===candidate.sourceHash&&Date.parse(row.historyObservation.at)===Date.parse(candidate.at)):[];
 const sportsHistorySnapshot=candidate&&observedRows.length>=candidate.groups-candidate.unpricedGroups&&observedRows.length<=candidate.groups&&Math.round(observedRows.reduce((sum,row)=>sum+row.historyObservation!.usdValue,0)*100)===Math.round(candidate.totalUsd*100)?candidate:undefined;
 const sportsHistoryEvaluationPulse=sportsHistorySnapshot?source.sportsHistoryEvaluationPulse??(sportsHistorySnapshot.evaluatedAt?marketPulseAtOrAfterTime(sportsHistorySnapshot.evaluatedAt):catalog?.sportsObservedAt?marketPulseAtOrAfterTime(catalog.sportsObservedAt):source.serverPulse):undefined;
 if(sportsHistorySnapshot)rows=rows.map(row=>{
  const record=row.historyObservation;if(!record)return row;
  const changed=record.model&&!sameSportsPricingOperands(row,record.model),capture=Date.parse(source.generatedAt)>Date.parse(record.at)?marketPulseAtOrAfterTime(source.generatedAt):sportsHistoryEvaluationPulse;
  return {...row,historyEvaluationPulse:row.historyEvaluationPulse??(changed?capture:sportsHistoryEvaluationPulse)};
 });
 const aggregateRows=rows.filter(row=>!row.marketItem?.livePulseSeed&&!row.sealedCopies?.length),undated=aggregateRows.filter(row=>!row.sealedBirths?.length);
 let undatedHistory=source.undatedHistory;
 if(!aggregateRows.length&&!unpricedSealedBirths?.length)undatedHistory=undefined;
 else{
  const known=copyObservations?mergeMarketCopyObservations({...source,valueRows:rows},copyObservations).source.valueRows:rows;
  const originalPulse=source.undatedHistory?.observationPulse??source.serverPulse,reported=source.undatedHistory?.sourceReportedTotalUsd??source.currentUsd;
  const unpricedBirthValue=(unpricedSealedBirths??[]).reduce((sum,copy)=>sum+(originalPulse<marketPulseAtOrAfterTime(copy.sealedAt)?0:copy.birthUsdValue),0),remainder=Number((reported-marketRowsUsdAtPulse(known,originalPulse,true)-unpricedBirthValue).toFixed(4));
  const observed=Date.parse(catalog?.sportsObservedAt??'');undatedHistory={rows:aggregateRows.length,undatedRows:undated.length,birthOnlyRows:aggregateRows.length-undated.length,unpricedCopies:unpricedSealedBirths?.length??0,observationPulse:originalPulse,observationUsd:remainder,sourceReportedTotalUsd:reported,modelPulse:Number.isFinite(observed)&&observed>=Date.parse(source.generatedAt)?Math.max(originalPulse,marketPulseAtOrAfterTime(catalog!.sportsObservedAt!)):source.undatedHistory?.modelPulse??originalPulse};
 }
 if(sportsHistorySnapshot)undatedHistory=undefined;
 return {...source,undatedHistory,unpricedSealedBirths,sportsHistorySnapshot,sportsHistoryEvaluationPulse,sourceEvaluation:sportsHistorySnapshot?source.sourceEvaluation??{pulse:source.serverPulse,usdValue:source.currentUsd,sourceHash:source.proofObjectHash}:source.sourceEvaluation,valueRows:rows,firstIssuancePulse:rows.reduce((first,row)=>Math.min(first,row.marketItem?.livePulseSeed?.claimPulse??first,...(row.sealedCopies??row.sealedBirths??[]).map(copy=>marketPulseAtOrAfterTime(copy.sealedAt))),Math.min(source.firstIssuancePulse,...(unpricedSealedBirths??[]).map(copy=>marketPulseAtOrAfterTime(copy.sealedAt)))),serverPulse:pulse,currentUsd:marketRowsUsdAtPulse(rows,pulse),marketAssetsPriced:rows.filter(row=>row.source==='market-desk-live-asset').length,sportsCardsPriced:rows.filter(row=>row.source==='sports-economy-card').length,cardsInCirculation:Math.max(source.cardsInCirculation,cards.reduce((sum,item)=>sum+(item.circulationCount??0),0)),
  generatedAt:currentCollection?catalog.observedAt!:source.generatedAt};
}
