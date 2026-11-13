import {publicCapitalizationAssets,type PublicShareInventory} from '../market-share-inventory';
import type {PublicMarketPricingCatalog,PublicMarketPricingItem} from './pricing-inputs';
import {publicAssetPulseSeed} from './asset';
import type {MarketCapSource,MarketPulseSeed} from './source';
import {publicCatalogAtPulse} from './catalog-prices';
const same=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
// The canonical valuation does not consume this creator label. Account/handle
// projection may change it without changing any retained numeric operand.
const pricingSeed=(seed:MarketPulseSeed|null|undefined)=>{if(!seed)return seed;const {userPhiKey:_creator,...operands}=seed;return operands;};
const pricingRow=(row:MarketCapSource['valueRows'][number]|undefined)=>row?.marketItem?.livePulseSeed?{...row,marketItem:{...row.marketItem,livePulseSeed:pricingSeed(row.marketItem.livePulseSeed)}}:row;
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
/** Shared membership, binding and prior-row checks for Original additions. */
function originalAdditionInputs(beforeSource:MarketCapSource,source:MarketCapSource,before:PublicMarketPricingCatalog,catalog:PublicMarketPricingCatalog){
 if(!before.complete||!catalog.complete||source.firstIssuancePulse!==beforeSource.firstIssuancePulse)return null;
 // Global shares rebuild the sports-only residual from these same rows; the
 // full-universe residual/sourceEvaluation is deliberately cleared there.
 const context=(value:MarketCapSource)=>[value.unpricedSealedBirths,value.sportsHistorySnapshot,value.sportsHistoryEvaluationPulse];
 if(!same(context(beforeSource),context(source)))return null;
 const rows=new Map(source.valueRows.map(row=>[row.id,row]));if(rows.size!==source.valueRows.length)return null;
 for(const row of beforeSource.valueRows)if(!same(pricingRow(row),pricingRow(rows.get(row.id))))return null;
 const priorRows=new Set(beforeSource.valueRows.map(row=>row.id)),addedRows=source.valueRows.filter(row=>!priorRows.has(row.id));
 if(addedRows.some(row=>row.source!=='market-desk-live-asset'))return null;
 const membership=new Map(catalog.items.map(item=>[item.id,item])),priorMembership=new Map(before.items.map(item=>[item.id,item]));
 if(membership.size!==catalog.items.length||priorMembership.size!==before.items.length)return null;
 for(const item of before.items){const next=membership.get(item.id);if(!next||next.assetId!==item.assetId||next.category!==item.category||next.originalDigest!==item.originalDigest||next.pulse!==item.pulse)return null;}
 return {membership,priorMembership,addedRows};
}
/** Only later births can retain rounded unit-value samples exactly: rounding
 * a retroactive contribution separately can differ from the canonical sum. */
export function marketHistoryOriginalUnitAdditions(beforeSource:MarketCapSource,source:MarketCapSource,before:PublicMarketPricingCatalog,catalog:PublicMarketPricingCatalog):MarketCapSource['valueRows']|null{
 const inputs=originalAdditionInputs(beforeSource,source,before,catalog);if(!inputs)return null;
 if(!same([beforeSource.undatedHistory,beforeSource.sourceEvaluation],[source.undatedHistory,source.sourceEvaluation]))return null;
 for(const item of before.items){const next=inputs.membership.get(item.id)!;
  if(item.category==='sports'?!same(item,next):!same(pricingSeed(publicAssetPulseSeed(item,beforeSource)),pricingSeed(publicAssetPulseSeed(next,source))))return null;
 }
 for(const row of inputs.addedRows){const item=inputs.membership.get(row.marketItem?.id??'');
  if(!item||item.category!=='proof'||item.assetId!==row.seed||!row.marketItem?.livePulseSeed||row.marketItem.livePulseSeed.claimPulse<=beforeSource.serverPulse||!same(publicAssetPulseSeed(item,source),row.marketItem.livePulseSeed))return null;
 }
 return inputs.addedRows;
}
/** A new public Original can add to exact completed samples. Every former
 * membership, pricing model and share prefix must still be present. This is a
 * display optimization; no input, quantity, coverage or law is manufactured. */
export function marketHistoryOriginalAdditions(beforeSource:MarketCapSource,source:MarketCapSource,before:PublicMarketPricingCatalog,catalog:PublicMarketPricingCatalog,last:number):PublicMarketPricingCatalog|null{
 const inputs=originalAdditionInputs(beforeSource,source,before,catalog);if(!inputs)return null;
 const {membership,priorMembership}=inputs;
 const previous=publicCapitalizationAssets(publicCatalogAtPulse(before,beforeSource,last)).items,next=publicCapitalizationAssets(publicCatalogAtPulse(catalog,source,source.serverPulse)).items,selected=new Map(next.map(item=>[identity(item),item]));
 for(const item of previous){const current=selected.get(identity(item));if(!current)return null;
  if(item.category==='sports'){if(!same(priorMembership.get(item.id),membership.get(current.id)))return null;continue;}
  if(current.id!==item.id||!same(pricingSeed(publicAssetPulseSeed(item,beforeSource)),pricingSeed(publicAssetPulseSeed(current,source)))||!same(inventoryPrefix(item.shareInventory!,last),inventoryPrefix(current.shareInventory!,last)))return null;
 }
 const prior=new Set(previous.map(identity)),added=next.filter(item=>!prior.has(identity(item)));
 if(added.some(item=>item.category!=='proof'||!publicAssetPulseSeed(item,source)))return null;
 return {...catalog,items:added,complete:false};
}
