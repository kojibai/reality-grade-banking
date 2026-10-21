import type {PublicMarketCatalog,PublicMarketItem} from '../receiz/public-market';
import type {MarketCapSource} from '../receiz/market-projection/source';
import {publicAssetPulseSeed} from '../receiz/market-projection/asset';
import {publicSigilQuoteAtPulse,marketPeriodPulses} from '../receiz/market-projection/project';
import {publicProfileMovement} from '../receiz/public-profile';
import type {ChartPeriod} from '../core/chart-history';
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
/** Aggregate current values against the same assets' creation values. This is
 * a weighted collection return, never an average of per-object percentages. */
export function profileCollectionReturn(items:PublicMarketItem[],source:MarketCapSource|null,period:ChartPeriod='ALL'):number|null{
 if(!items.length)return null;let current=0,birth=0;
 for(const item of items){const seed=publicAssetPulseSeed(item,source);if(!seed||item.priceUsd===null||!Number.isFinite(item.priceUsd)||item.priceUsd<0)return null;
  try{if(period!=='ALL'&&item.localValuationPulse===undefined)return null;const opening=period==='ALL'?seed.claimPulse:marketPeriodPulses({firstIssuancePulse:seed.claimPulse,serverPulse:item.localValuationPulse!},period,2)[0],initial=publicSigilQuoteAtPulse(seed,opening).priceUsd;if(!Number.isFinite(initial)||initial<=0)return null;current+=item.priceUsd;birth+=initial;}catch{return null;}
 }
 return publicProfileMovement(current,birth);
}
