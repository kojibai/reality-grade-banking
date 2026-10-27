import type {PublicMarketCatalog} from '../public-market';
import {publicCapitalizationAssets,publicShareCapitalization} from '../market-share-inventory';
import {prepareShareCapitalizationAtPulse} from '../market-share-chart';
import {publicAssetPulseSeed} from './asset';
import {publicCatalogAtPulse} from './catalog-prices';
import {publicSigilUsdAtPulse,marketRowsUsdAtPulse} from './project';
import {marketCapChartUsdAtPulse,prepareMarketChartProjection} from './interpolated-history';
import {currentMarketDisplayModel} from './catalog-source';
import type {MarketCapSource} from './source';

/** Read-only composition of the existing pricing and share primitives. No
 * current quantity is projected backward across its recorded coordinate. */
export function prepareGlobalShareCapitalization(source:MarketCapSource,catalog:PublicMarketCatalog){
 const current=publicCatalogAtPulse(catalog,source,source.serverPulse)!,coverage=publicShareCapitalization(current),selected=publicCapitalizationAssets(current).items;
 const proofs=selected.filter(item=>item.category==='proof').map(item=>({item,seed:publicAssetPulseSeed(item,source),value:prepareShareCapitalizationAtPulse(item.shareInventory!)}));
 const sportsRows=source.valueRows.filter(row=>row.source==='sports-economy-card');
 // Keep the existing sealed-copy history and its native projection. Original
 // unit values are replaced by their share cap, never added a second time.
 const sportsCatalog={...current,items:current.items.filter(item=>item.category==='sports')};
 const sportsSource=currentMarketDisplayModel({...source,valueRows:sportsRows,marketAssetsPriced:0,currentUsd:marketRowsUsdAtPulse(sportsRows,source.serverPulse),sourceEvaluation:undefined,undatedHistory:undefined},sportsCatalog,source.serverPulse);
 const sportsContext=prepareMarketChartProjection(sportsSource),sportsCurrent=publicShareCapitalization(sportsCatalog).usdCents;
 const events=[...new Set(proofs.flatMap(({item})=>{
  const inventory=item.shareInventory!,points=[...(inventory.releaseCapitalization?[inventory.releaseCapitalization]:[]),...(inventory.family==='generic'?inventory.capitalizationHistory??[]:inventory.history??[])];
  return points.map(point=>Number((BigInt(point.kaiUPulse)+999999n)/1000000n));
 }))].sort((a,b)=>a-b);
 const basis=selected.filter(item=>item.category==='proof').map(item=>[item.nativeAsset?.id??item.assetId,item.shareInventory]).sort((a,b)=>String(a[0]).localeCompare(String(b[0])));
 const at=(pulse:number):string=>{
  if(pulse===source.serverPulse)return coverage.usdCents;
  let total=BigInt(pulse===sportsSource.serverPulse?sportsCurrent:String(Math.round(marketCapChartUsdAtPulse(sportsSource,pulse,sportsContext)*100)));
  for(const {seed,value}of proofs){
   if(seed&&pulse<seed.claimPulse)continue;
   // A missing individual model contributes only at its captured current head;
   // it cannot manufacture historic prices from today's quote.
   if(!seed)continue;
   const cents=Math.round(publicSigilUsdAtPulse(seed,pulse)*100);if(!Number.isSafeInteger(cents)||cents<0)continue;
   const cap=value(pulse,String(cents));if(cap!==null)total+=BigInt(cap);
  }
  return total.toString();
 };
 return {coverage,events,basis,at};
}
