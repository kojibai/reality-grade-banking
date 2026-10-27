import type {PublicMarketCatalog,PublicMarketItem} from './public-market';
/** Public display observations only. These fields neither issue ownership nor authorize a trade. */
export type PublicShareInventory=Readonly<{
 schema:'receiz.market.share-inventory.v1';marketItemId:string;assetId:string;family:'generic'|'native';quantityScope?:'canonical-asset';observedAtKaiUPulse:string;
 outstandingShareQuantityMicro:string;availableShareQuantityMicro:string|null;maxPurchaseShareQuantityMicro?:string|null;availability:'quote-capacity'|'open-offers';
 capacity?:Readonly<{askPriceUsdCents:string;hardCapUsdCents:string;openInterestUsdCents:string;maxSingleTradeUsdCents:string}>;
 originalIssuedShareQuantityMicro?:string;
 positionsMicro?:string;certificatesMicro?:string;reservedBuyMicro?:string;
 nativeAssetId?:string;issuanceSourceSha256?:string;sourceHeadSha256?:string;
 releaseCapitalization?:Readonly<{kaiUPulse:string;unitPriceUsdCents:string;outstandingShareQuantityMicro:string;availableShareQuantityMicro:string;modelVersion:string}>;
 capitalizationHistory?:readonly Readonly<{kaiUPulse:string;unitPriceUsdCents:string;outstandingShareQuantityMicro:string;availableShareQuantityMicro:string}>[];
 historyBasis?:'recorded-transactions'|'native-events'|'observations';
 history?:readonly Readonly<{kaiUPulse:string;outstandingShareQuantityMicro:string;unitPriceUsdCents?:string}>[];
}>;
const uint=(value:unknown):value is string=>typeof value==='string'&&/^(0|[1-9][0-9]{0,38})$/.test(value);
const hex=(value:unknown):value is string=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
export function readPublicShareInventory(raw:unknown,item:PublicMarketItem):PublicShareInventory|null{
 if(!raw||typeof raw!=='object'||Array.isArray(raw))return null;
 const v=raw as Record<string,unknown>;
 if(v.schema!=='receiz.market.share-inventory.v1'||v.marketItemId!==item.id||v.assetId!==item.assetId||!uint(v.observedAtKaiUPulse)||v.observedAtKaiUPulse==='0'||BigInt(v.observedAtKaiUPulse)>10000000000000000n||!uint(v.outstandingShareQuantityMicro)||(v.availableShareQuantityMicro!==null&&!uint(v.availableShareQuantityMicro)))return null;
 if(v.originalIssuedShareQuantityMicro!==undefined&&(!uint(v.originalIssuedShareQuantityMicro)||BigInt(v.originalIssuedShareQuantityMicro)<BigInt(v.outstandingShareQuantityMicro)))return null;
 if(item.nativeAsset){
  if(v.family!=='native'||v.availability!=='open-offers'||v.nativeAssetId!==item.nativeAsset.id||v.issuanceSourceSha256!==item.nativeAsset.issuanceSourceSha256||!hex(v.sourceHeadSha256)||v.availableShareQuantityMicro===null||BigInt(v.availableShareQuantityMicro)>BigInt(v.outstandingShareQuantityMicro))return null;
 }else if(v.family!=='generic'||v.quantityScope!=='canonical-asset'||v.availability!=='quote-capacity'||!uint(v.positionsMicro)||!uint(v.certificatesMicro)||!uint(v.reservedBuyMicro)||BigInt(v.positionsMicro)+BigInt(v.certificatesMicro)!==BigInt(v.outstandingShareQuantityMicro))return null;
 let capacity:PublicShareInventory['capacity'];
 if(v.capacity!==undefined){
  if(v.family!=='generic'||!v.capacity||typeof v.capacity!=='object')return null;
  const c=v.capacity as Record<string,unknown>;
  if(!uint(c.askPriceUsdCents)||c.askPriceUsdCents==='0'||!uint(c.hardCapUsdCents)||!uint(c.openInterestUsdCents)||!uint(c.maxSingleTradeUsdCents))return null;
  const headroom=BigInt(c.hardCapUsdCents)-BigInt(c.openInterestUsdCents),order=BigInt(c.maxSingleTradeUsdCents),budget=headroom<order?headroom:order;
  const expected=headroom>0n?(headroom*1000000n/BigInt(c.askPriceUsdCents)).toString():'0',maxPurchase=budget>0n?(budget*1000000n/BigInt(c.askPriceUsdCents)).toString():'0';
  if(v.availableShareQuantityMicro!==expected||v.maxPurchaseShareQuantityMicro!==maxPurchase)return null;
  capacity=Object.freeze({askPriceUsdCents:c.askPriceUsdCents,hardCapUsdCents:c.hardCapUsdCents,openInterestUsdCents:c.openInterestUsdCents,maxSingleTradeUsdCents:c.maxSingleTradeUsdCents});
 }
 if(v.historyBasis!==undefined&&![v.family==='native'?'native-events':'recorded-transactions','observations'].includes(String(v.historyBasis)))return null;
 let releaseCapitalization:PublicShareInventory['releaseCapitalization'];
 if(v.releaseCapitalization!==undefined){const point=v.releaseCapitalization as Record<string,unknown>;
  if(v.family!=='generic'||!point||typeof point!=='object'||point.modelVersion!=='market-share-quote-v1'||!uint(point.kaiUPulse)||!uint(point.unitPriceUsdCents)||point.unitPriceUsdCents==='0'||!uint(point.outstandingShareQuantityMicro)||point.outstandingShareQuantityMicro!=='0'||!uint(point.availableShareQuantityMicro)||point.availableShareQuantityMicro==='0'||!item.pulse||!/^\d{1,10}$/.test(item.pulse)||point.kaiUPulse!==(BigInt(item.pulse)*1000000n).toString()||BigInt(point.kaiUPulse)>BigInt(v.observedAtKaiUPulse))return null;
  releaseCapitalization=Object.freeze({kaiUPulse:point.kaiUPulse,unitPriceUsdCents:point.unitPriceUsdCents,outstandingShareQuantityMicro:point.outstandingShareQuantityMicro,availableShareQuantityMicro:point.availableShareQuantityMicro,modelVersion:point.modelVersion});
 }
 let capitalizationHistory:PublicShareInventory['capitalizationHistory'];
 if(v.capitalizationHistory!==undefined){
  if(!Array.isArray(v.capitalizationHistory)||v.capitalizationHistory.length>10001)return null;let previous=-1n;const points=[];
  for(const point of v.capitalizationHistory){if(!point||typeof point!=='object'||!uint(point.kaiUPulse)||!uint(point.unitPriceUsdCents)||!uint(point.outstandingShareQuantityMicro)||!uint(point.availableShareQuantityMicro)||BigInt(point.kaiUPulse)<=previous||BigInt(point.kaiUPulse)>BigInt(v.observedAtKaiUPulse))return null;previous=BigInt(point.kaiUPulse);points.push(Object.freeze({kaiUPulse:point.kaiUPulse,unitPriceUsdCents:point.unitPriceUsdCents,outstandingShareQuantityMicro:point.outstandingShareQuantityMicro,availableShareQuantityMicro:point.availableShareQuantityMicro}));}capitalizationHistory=Object.freeze(points);
 }
 let history:PublicShareInventory['history'];
 if(v.history!==undefined){
  if(!Array.isArray(v.history)||!v.history.length||v.history.length>10000)return null;
  let previous=-1n;const values=[];
  for(const point of v.history){if(!point||typeof point!=='object'||!uint(point.kaiUPulse)||!uint(point.outstandingShareQuantityMicro)||BigInt(point.kaiUPulse)<=previous||BigInt(point.kaiUPulse)>BigInt(v.observedAtKaiUPulse))return null;if(point.unitPriceUsdCents!==undefined&&!uint(point.unitPriceUsdCents))return null;previous=BigInt(point.kaiUPulse);values.push(Object.freeze({kaiUPulse:point.kaiUPulse,outstandingShareQuantityMicro:point.outstandingShareQuantityMicro,...(point.unitPriceUsdCents!==undefined?{unitPriceUsdCents:point.unitPriceUsdCents}:{})}));}
  if(values.at(-1)!.outstandingShareQuantityMicro!==v.outstandingShareQuantityMicro)return null;history=Object.freeze(values);
 }
 return Object.freeze({schema:v.schema,marketItemId:item.id,assetId:item.assetId,family:v.family,observedAtKaiUPulse:v.observedAtKaiUPulse,outstandingShareQuantityMicro:v.outstandingShareQuantityMicro,availableShareQuantityMicro:v.availableShareQuantityMicro,...(v.maxPurchaseShareQuantityMicro===null||uint(v.maxPurchaseShareQuantityMicro)?{maxPurchaseShareQuantityMicro:v.maxPurchaseShareQuantityMicro}:{}),availability:v.availability,...(v.family==='native'?{nativeAssetId:String(v.nativeAssetId),issuanceSourceSha256:String(v.issuanceSourceSha256),sourceHeadSha256:String(v.sourceHeadSha256),...(v.originalIssuedShareQuantityMicro!==undefined?{originalIssuedShareQuantityMicro:String(v.originalIssuedShareQuantityMicro)}:{})}:{quantityScope:'canonical-asset',positionsMicro:String(v.positionsMicro),certificatesMicro:String(v.certificatesMicro),reservedBuyMicro:String(v.reservedBuyMicro)}),...(history?{history}:{}),...(capitalizationHistory?{capitalizationHistory}:{}),...(releaseCapitalization?{releaseCapitalization}:{}),...(v.historyBasis?{historyBasis:v.historyBasis}:{}),...(capacity?{capacity}:{})}) as PublicShareInventory;
}
export function shareCapitalizationUsdCents(unitPriceUsdCents:string,quantityMicro:string):string{
 if(!uint(unitPriceUsdCents)||!uint(quantityMicro))throw Error('MARKET_SHARE_VALUE_INVALID');
 return ((BigInt(unitPriceUsdCents)*BigInt(quantityMicro)+500000n)/1000000n).toString();
}
/** A current quantity cannot invent supply before its first supported coordinate. */
export function shareQuantityAtPulse(inventory:PublicShareInventory,pulse:number):string|null{
 if(!Number.isSafeInteger(pulse)||pulse<0)return null;const at=BigInt(pulse)*1000000n;
 const history=inventory.history??[{kaiUPulse:inventory.observedAtKaiUPulse,outstandingShareQuantityMicro:inventory.outstandingShareQuantityMicro}];let quantity:string|null=null;
 for(const point of history){if(BigInt(point.kaiUPulse)>at)break;if(inventory.family==='native'||inventory.historyBasis==='recorded-transactions'||BigInt(point.kaiUPulse)===at)quantity=point.outstandingShareQuantityMicro;}return quantity;
}
export function publicShareCapitalization(catalog:PublicMarketCatalog|null){
 const groups=new Map<string,PublicMarketItem[]>();
 for(const item of catalog?.items??[]){const key=item.nativeAsset?'native:'+item.nativeAsset.id:'asset:'+item.assetId;const values=groups.get(key)??[];values.push(item);groups.set(key,values);}
 let total=0n,covered=0,shares=0n;
 for(const items of groups.values()){
  const sports=items.find(item=>item.category==='sports');
  if(sports){
   const price=sports.priceUsd===null?null:Math.round(sports.priceUsd*100),copies=sports.circulationCount??1;
   const cents=sports.capitalizationUsdCents??(price!==null&&Number.isSafeInteger(price)&&price>=0&&Number.isSafeInteger(copies)&&copies>=0?(BigInt(price)*BigInt(copies)).toString():null);
   if(cents!==null&&uint(cents)){total+=BigInt(cents);covered++;}continue;
  }
  const candidates=items.filter(item=>item.shareInventory&&item.shareInventory.assetId===item.assetId&&item.shareInventory.marketItemId===item.id).sort((a,b)=>BigInt(a.shareInventory!.observedAtKaiUPulse)>BigInt(b.shareInventory!.observedAtKaiUPulse)?-1:1),item=candidates[0];
  if(!item||item.priceUsd===null||!Number.isSafeInteger(Math.round(item.priceUsd*100))||item.priceUsd<0)continue;
  if(candidates.some(other=>other.shareInventory!.observedAtKaiUPulse===item.shareInventory!.observedAtKaiUPulse&&(other.shareInventory!.outstandingShareQuantityMicro!==item.shareInventory!.outstandingShareQuantityMicro||other.shareInventory!.availableShareQuantityMicro!==item.shareInventory!.availableShareQuantityMicro)))continue;
  const quantity=marketCapitalizationQuantity(item.shareInventory!);if(quantity===null)continue;total+=BigInt(shareCapitalizationUsdCents(String(Math.round(item.priceUsd*100)),quantity));shares+=BigInt(item.shareInventory!.outstandingShareQuantityMicro);covered++;
 }
 return{usdCents:total.toString(),outstandingShareQuantityMicro:shares.toString(),covered,listed:groups.size,complete:!!catalog?.complete&&covered===groups.size&&(!catalog?.items.some(item=>item.category==='sports')||catalog.sportsCoverage==='complete')};
}

/** Keep accepted quantity observations when later public responses only carry a
 * current observation. This retention creates no financial authority. */
export function mergeShareInventory(previous:PublicShareInventory|undefined,next:PublicShareInventory|null):PublicShareInventory|undefined{
 if(!next)return previous;
 if(!previous||previous.assetId!==next.assetId||previous.marketItemId!==next.marketItemId||previous.family!==next.family||previous.nativeAssetId!==next.nativeAssetId||previous.issuanceSourceSha256!==next.issuanceSourceSha256)return next;
 if(BigInt(next.observedAtKaiUPulse)<BigInt(previous.observedAtKaiUPulse))return previous;
 if(next.observedAtKaiUPulse===previous.observedAtKaiUPulse&&next.outstandingShareQuantityMicro!==previous.outstandingShareQuantityMicro)return previous;
 if(!next.releaseCapitalization&&previous.releaseCapitalization)next=Object.freeze({...next,releaseCapitalization:previous.releaseCapitalization});
 const capPoints=new Map<string,NonNullable<PublicShareInventory['capitalizationHistory']>[number]>();
 for(const inventory of [previous,next])for(const point of inventory.capitalizationHistory??[]){
  const held=capPoints.get(point.kaiUPulse);
  if(held&&(held.unitPriceUsdCents!==point.unitPriceUsdCents||held.outstandingShareQuantityMicro!==point.outstandingShareQuantityMicro||held.availableShareQuantityMicro!==point.availableShareQuantityMicro))continue;
  capPoints.set(point.kaiUPulse,point);
 }
 const capitalizationHistory=capPoints.size?Object.freeze([...capPoints.values()].sort((a,b)=>BigInt(a.kaiUPulse)<BigInt(b.kaiUPulse)?-1:1).slice(-10001)):undefined;
 if(next.historyBasis==='recorded-transactions'||next.historyBasis==='native-events')return capitalizationHistory?Object.freeze({...next,capitalizationHistory}):next;
 const points=new Map<string,NonNullable<PublicShareInventory['history']>[number]>();
 for(const inv of [previous,next])for(const point of inv.history??[{kaiUPulse:inv.observedAtKaiUPulse,outstandingShareQuantityMicro:inv.outstandingShareQuantityMicro}]){
  if(points.has(point.kaiUPulse)&&points.get(point.kaiUPulse)!.outstandingShareQuantityMicro!==point.outstandingShareQuantityMicro)return previous;
  points.set(point.kaiUPulse,point);
 }
 const history=[...points.values()].sort((a,b)=>BigInt(a.kaiUPulse)<BigInt(b.kaiUPulse)?-1:1).slice(-10000);
 return Object.freeze({...next,history:Object.freeze(history),...(capitalizationHistory?{capitalizationHistory}:{})});
}

export function compatibleShareInventory(item:PublicMarketItem,inventory:PublicShareInventory|undefined){
 if(!inventory)return;const parsed=readPublicShareInventory({...inventory,marketItemId:item.id},item);return parsed?(inventory.marketItemId===item.id?inventory:parsed):undefined;
}

/** Remaining generic buying capacity is unissued. Native sell offers already
 * partition issued supply and must never be added to it a second time. */
export function marketCapitalizationQuantity(inventory:PublicShareInventory):string|null{
 if(inventory.family==='native')return inventory.outstandingShareQuantityMicro;
 return inventory.availableShareQuantityMicro===null?null:(BigInt(inventory.outstandingShareQuantityMicro)+BigInt(inventory.availableShareQuantityMicro)).toString();
}
