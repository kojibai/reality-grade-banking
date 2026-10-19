import type{PublicMarketCatalog}from'../public-market';
import{publicAssetPulseSeed}from'./asset';
import{publicSigilQuoteAtPulse,marketRowsUsdAtPulse}from'./project';
import type{MarketCapSource,MarketValueRow}from'./source';
import {marketPulseAtOrAfterTime}from'./sealed-copies';
import {mergeMarketCopyObservations,type MarketCopyObservationTape}from'./copy-observations';

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
  for(const item of cards)if(newer||!sports.has(item.sportsValuation!.seed)){
   const row=item.sportsValuation!;
   // A new representative can carry the same exact copies as an older row.
   // Their claims identify that overlap without guessing from a card title.
   if(newer)for(const copy of row.sealedCopies??[])sports.delete(copy.claimHash);
   sports.set(row.seed,row);
  }
  rows=[...rows.filter(row=>row.source!=='sports-economy-card'),...sports.values()];
 }
 if(rows.length>10000)throw Error('Public market display coverage exceeds capacity.');
 const undated=rows.filter(row=>!row.marketItem?.livePulseSeed&&!row.sealedCopies?.length);
 let undatedHistory=source.undatedHistory;
 if(!undated.length)undatedHistory=undefined;
 else if(!undatedHistory){
  const known=copyObservations?mergeMarketCopyObservations({...source,valueRows:rows},copyObservations).source.valueRows:rows;
  const dated=known.filter(row=>row.marketItem?.livePulseSeed||row.sealedCopies?.length),remainder=Number((source.currentUsd-marketRowsUsdAtPulse(dated,source.serverPulse,true)).toFixed(4));
  if(remainder>=0){const observed=Date.parse(catalog?.sportsObservedAt??'');undatedHistory={rows:undated.length,observationPulse:source.serverPulse,observationUsd:remainder,sourceReportedTotalUsd:source.currentUsd,modelPulse:Number.isFinite(observed)&&observed>=Date.parse(source.generatedAt)?Math.max(source.serverPulse,marketPulseAtOrAfterTime(catalog!.sportsObservedAt!)):source.serverPulse};}
 }
 return {...source,undatedHistory,valueRows:rows,firstIssuancePulse:rows.reduce((first,row)=>Math.min(first,row.marketItem?.livePulseSeed?.claimPulse??first,...(row.sealedCopies??[]).map(copy=>marketPulseAtOrAfterTime(copy.sealedAt))),source.firstIssuancePulse),serverPulse:pulse,currentUsd:marketRowsUsdAtPulse(rows,pulse),marketAssetsPriced:rows.filter(row=>row.source==='market-desk-live-asset').length,sportsCardsPriced:rows.filter(row=>row.source==='sports-economy-card').length,cardsInCirculation:Math.max(source.cardsInCirculation,cards.reduce((sum,item)=>sum+(item.circulationCount??0),0)),
  generatedAt:currentCollection?catalog.observedAt!:source.generatedAt};
}
