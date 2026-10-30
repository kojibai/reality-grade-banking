import type {PublicMarketCatalog} from '../public-market';
import type {MarketCapSource} from './source';
import {publicAssetPulseSeed} from './asset';
import {publicSigilQuoteAtPulse,publicSportsQuoteAtPulse,publicSportsCapitalizationUsdAtPulse,marketQuoteMovementAtPulse} from './project';
import type {MarketUnitCalculation,MarketQuoteMovementCalculation} from './calculation';
/** Revalue retained public operands locally. A failed collection read cannot
 * freeze supported object prices, and an unsupported object gains no model. */
export function publicCatalogAtPulse(catalog:PublicMarketCatalog|null,source:MarketCapSource|null,pulse:number,selectedItemId?:string|null,explain?:(id:string,value:MarketUnitCalculation)=>void,explainMovement?:(value:MarketQuoteMovementCalculation)=>void):PublicMarketCatalog|null{
 if(!catalog||!Number.isSafeInteger(pulse)||pulse<0)return catalog;
 let quoteMove:number|undefined;
 return {...catalog,items:catalog.items.map(item=>{
  if(selectedItemId!==undefined&&selectedItemId!==null&&item.id!==selectedItemId)return item;
  try{
   const priced=(priceUsd:number)=>({...item,priceUsd,changePct:item.priceUsd!==null&&item.priceUsd>0?Number(((priceUsd/item.priceUsd-1)*100).toFixed(2)):null,localValuationPulse:pulse});
   const seed=publicAssetPulseSeed(item,source);
   if(seed&&pulse>=seed.claimPulse)return priced(publicSigilQuoteAtPulse(seed,pulse,explain?value=>explain(item.id,value):undefined).priceUsd);
   if(item.category==='sports'&&item.sportsValuation){quoteMove??=marketQuoteMovementAtPulse(pulse,explainMovement);const updated=priced(Math.round(publicSportsQuoteAtPulse(item.sportsValuation,pulse,quoteMove)*100)/100),cap=Math.round(publicSportsCapitalizationUsdAtPulse(item.sportsValuation,pulse,quoteMove,explain?value=>explain(item.id,value):undefined)*100);return Number.isSafeInteger(cap)&&cap>=0?{...updated,capitalizationUsdCents:String(cap)}:updated;}
  }catch{/* Keep the observed price when this source lacks supported operands. */}
  return item;
 })};
}
