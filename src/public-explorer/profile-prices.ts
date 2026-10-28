import type {PublicMarketCatalog,PublicMarketItem} from '../receiz/public-market';
import type {MarketCapSource} from '../receiz/market-projection/source';
import {publicAssetPulseSeed} from '../receiz/market-projection/asset';
import {publicSigilQuoteAtPulse,marketPeriodPulses} from '../receiz/market-projection/project';
import {publicProfileMovement} from '../receiz/public-profile';
import type {ChartPeriod} from '../core/chart-history';
const signedOriginals=new WeakMap<PublicMarketItem[],PublicMarketItem[]>();
/** One selection per immutable held collection, also reused after navigation. */
export function profileSignedOriginals(items:PublicMarketItem[]){let held=signedOriginals.get(items);if(!held){held=items.filter(item=>item.hasPbiSignature===true);signedOriginals.set(items,held);}return held;}
/** The current collection's one shared local clock/pricing operands; no
 * timers, history graphs, network reads or per-card subscriptions. */
export function profileCollectionPrices(items:PublicMarketItem[],catalog:PublicMarketCatalog|null,source:MarketCapSource|null,pulse:number){
 const current=new Map(catalog?.items.map(item=>[item.assetId,item]));
 return items.map(item=>{
  const quote=current.get(item.assetId),same=!!item.originalDigest&&quote?.originalDigest===item.originalDigest,merged=same?{...quote,...item,priceUsd:quote.priceUsd,livePulseSeed:quote.livePulseSeed??item.livePulseSeed}:item;
  const seed=publicAssetPulseSeed(merged,source);if(!seed)return {...merged,changePct:null};
  try{const end=Math.max(pulse,seed.claimPulse),first=marketPeriodPulses({firstIssuancePulse:seed.claimPulse,serverPulse:end},'1D',2)[0],priceUsd=publicSigilQuoteAtPulse(seed,end).priceUsd,previous=publicSigilQuoteAtPulse(seed,first).priceUsd;return {...merged,priceUsd,changePct:publicProfileMovement(priceUsd,previous),localValuationPulse:end};}catch{return {...merged,changePct:null};}
 });
}
/** Reuse the prepared current values in the existing weighted-return pass.
 * Missing growth operands do not hide a fully priced collection. Missing
 * current values never become a misleading total of just the priced subset. */
export function profileCollectionSummary(items:PublicMarketItem[],source:MarketCapSource|null,period:ChartPeriod='ALL'):{valueUsd:number|null;returnPct:number|null}{
 if(!items.length)return {valueUsd:null,returnPct:null};let current=0,birth=0,growthAvailable=true;
 for(const item of items){
  if(item.priceUsd===null||!Number.isFinite(item.priceUsd)||item.priceUsd<0)return {valueUsd:null,returnPct:null};
  current+=item.priceUsd;
  if(!growthAvailable)continue;
  const seed=publicAssetPulseSeed(item,source);if(!seed){growthAvailable=false;continue;}
  try{if(period!=='ALL'&&item.localValuationPulse===undefined){growthAvailable=false;continue;}const opening=period==='ALL'?seed.claimPulse:marketPeriodPulses({firstIssuancePulse:seed.claimPulse,serverPulse:item.localValuationPulse!},period,2)[0],initial=publicSigilQuoteAtPulse(seed,opening).priceUsd;if(!Number.isFinite(initial)||initial<=0){growthAvailable=false;continue;}birth+=initial;}catch{growthAvailable=false;}
 }
 if(!Number.isFinite(current))return {valueUsd:null,returnPct:null};
 return {valueUsd:current,returnPct:growthAvailable?publicProfileMovement(current,birth):null};
}
/** A weighted collection return, never an average of per-object percentages. */
export function profileCollectionReturn(items:PublicMarketItem[],source:MarketCapSource|null,period:ChartPeriod='ALL'):number|null{
 return profileCollectionSummary(items,source,period).returnPct;
}
