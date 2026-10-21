import type {PublicMarketCatalog,PublicMarketItem} from '../receiz/public-market';
import type {MarketCapSource} from '../receiz/market-projection/source';
import {publicAssetPulseSeed} from '../receiz/market-projection/asset';
import {publicSigilQuoteAtPulse,marketPeriodPulses} from '../receiz/market-projection/project';
import {publicProfileMovement} from '../receiz/public-profile';
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
