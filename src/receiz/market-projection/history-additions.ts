import {publicCapitalizationAssets,type PublicShareInventory} from '../market-share-inventory';
import type {PublicMarketPricingCatalog,PublicMarketPricingItem} from './pricing-inputs';
import {publicAssetPulseSeed} from './asset';
import type {MarketCapSource} from './source';
import {publicCatalogAtPulse} from './catalog-prices';
const same=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
/** Whole-pulse quantity intervals and exact-price anchors of the existing share
 * reader, bounded to the completed history. Later observations do not rewrite
 * that prefix; any changed past quantity or price refuses reuse. */
function inventoryPrefix(inventory:PublicShareInventory,last:number){
 const end=BigInt(last),observed=BigInt(inventory.observedAtKaiUPulse),release=inventory.releaseCapitalization;
 const history=inventory.family==='generic'?(release?[release,...(inventory.capitalizationHistory??[]).filter(point=>BigInt(point.kaiUPulse)>BigInt(release.kaiUPulse))]:inventory.capitalizationHistory??[]):inventory.history??[];
 const points=new Map<bigint,string|null>([[0n,history.length?'0':null]]),anchors=new Map<bigint,string>();
 for(const point of history){const at=BigInt(point.kaiUPulse),pulse=(at+999999n)/1000000n;if(at>observed||pulse>end)continue;
  const quantity=inventory.family==='native'?point.outstandingShareQuantityMicro:(BigInt(point.outstandingShareQuantityMicro)+BigInt((point as NonNullable<PublicShareInventory['capitalizationHistory']>[number]).availableShareQuantityMicro)).toString();
  points.set(pulse,quantity);
  if(inventory.family==='generic'&&at%1000000n===0n)anchors.set(pulse,(point as {unitPriceUsdCents:string}).unitPriceUsdCents);
 }
 const current=observed/1000000n+1n;
 if(current<=end)points.set(current,inventory.family==='native'?inventory.outstandingShareQuantityMicro:inventory.availableShareQuantityMicro===null?null:(BigInt(inventory.outstandingShareQuantityMicro)+BigInt(inventory.availableShareQuantityMicro)).toString());
 const intervals:[string,string|null][]=[];for(const [at,quantity]of [...points].sort((a,b)=>a[0]<b[0]?-1:1))if(!intervals.length||intervals.at(-1)![1]!==quantity)intervals.push([String(at),quantity]);
 return {family:inventory.family,quantityScope:inventory.quantityScope,nativeAssetId:inventory.nativeAssetId,issuanceSourceSha256:inventory.issuanceSourceSha256,intervals,anchors:[...anchors].map(([at,price])=>[String(at),price])};
}
const identity=(item:PublicMarketPricingItem)=>item.nativeAsset?'native:'+item.nativeAsset.id:'asset:'+item.assetId;
/** A new public Original can add to exact completed samples. Every former
 * membership, pricing model and share prefix must still be present. This is a
 * display optimization; no input, quantity, coverage or law is manufactured. */
export function marketHistoryOriginalAdditions(beforeSource:MarketCapSource,source:MarketCapSource,before:PublicMarketPricingCatalog,catalog:PublicMarketPricingCatalog,last:number):PublicMarketPricingCatalog|null{
 if(!before.complete||!catalog.complete||source.firstIssuancePulse!==beforeSource.firstIssuancePulse)return null;
 // Global shares rebuild the sports-only residual from these same rows; the
 // full-universe residual/sourceEvaluation is deliberately cleared there.
 const context=(value:MarketCapSource)=>[value.unpricedSealedBirths,value.sportsHistorySnapshot,value.sportsHistoryEvaluationPulse];
 if(!same(context(beforeSource),context(source)))return null;
 const rows=new Map(source.valueRows.map(row=>[row.id,row]));if(rows.size!==source.valueRows.length)return null;
 for(const row of beforeSource.valueRows)if(!same(row,rows.get(row.id)))return null;
 const priorRows=new Set(beforeSource.valueRows.map(row=>row.id));if(source.valueRows.some(row=>!priorRows.has(row.id)&&row.source!=='market-desk-live-asset'))return null;
 const membership=new Map(catalog.items.map(item=>[item.id,item])),priorMembership=new Map(before.items.map(item=>[item.id,item]));
 for(const item of before.items){const next=membership.get(item.id);if(!next||next.assetId!==item.assetId||next.category!==item.category||next.originalDigest!==item.originalDigest||next.pulse!==item.pulse)return null;}
 const previous=publicCapitalizationAssets(publicCatalogAtPulse(before,beforeSource,last)).items,next=publicCapitalizationAssets(publicCatalogAtPulse(catalog,source,source.serverPulse)).items,selected=new Map(next.map(item=>[identity(item),item]));
 for(const item of previous){const current=selected.get(identity(item));if(!current)return null;
  if(item.category==='sports'){if(!same(priorMembership.get(item.id),membership.get(current.id)))return null;continue;}
  if(current.id!==item.id||!same(publicAssetPulseSeed(item,beforeSource),publicAssetPulseSeed(current,source))||!same(inventoryPrefix(item.shareInventory!,last),inventoryPrefix(current.shareInventory!,last)))return null;
 }
 const prior=new Set(previous.map(identity)),added=next.filter(item=>!prior.has(identity(item)));
 if(added.some(item=>item.category!=='proof'||!publicAssetPulseSeed(item,source)))return null;
 return {...catalog,items:added,complete:false};
}
