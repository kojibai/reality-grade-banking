import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {publicMarketPulseSeed} from '../src/receiz/market-projection/source.js';
import {readPublicShareInventory} from '../src/receiz/market-share-inventory.js';
import {publicNativeAssetBinding} from '../src/receiz/native-asset-public-binding.js';
import type {PublicMarketPricingItem} from '../src/receiz/market-projection/pricing-inputs.js';
export const PUBLIC_PRICING_METADATA_FIELDS=['complete','revision','observedAt','sourceCount','sportsCoverage','sportsObservedAt','sportsSealedBirthsObservedAt','sportsHistorySnapshot'] as const;
const fields=['id','assetId','category','originalDigest','pulse','priceUsd','changePct','shareInventory','livePulseSeed','valuationBinding','nativeAsset','circulationCount','capitalizationUsdCents'] as const;
export type PublicPricingCheckpoint=Readonly<{schema:'bank.public-market.pricing-checkpoint.v1';item:PublicMarketPricingItem}>;
function invalid():never{throw Error('PUBLIC_PRICING_CHECKPOINT_INVALID');}
const object=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value);
const same=isDeepStrictEqual;
/** Numeric display operands already carried by an actual curated public item.
 * This is neither an Original nor financial admission/ownership evidence. */
export function createPublicPricingCheckpoint(item:PublicMarketPricingItem):PublicPricingCheckpoint{
 if(item.category!=='proof')invalid();
 const picked=Object.fromEntries(fields.flatMap(key=>item[key]===undefined?[]:[[key,item[key]]]));
 const checkpoint={schema:'bank.public-market.pricing-checkpoint.v1',item:picked};
 return{schema:'bank.public-market.pricing-checkpoint.v1',item:readPublicPricingCheckpoint(checkpoint)};
}
export function readPublicPricingCheckpoint(input:unknown):PublicMarketPricingItem{
 if(!object(input)||input.schema!=='bank.public-market.pricing-checkpoint.v1'||Object.keys(input).length!==2||!object(input.item))invalid();
 const raw=input.item;if(Object.keys(raw).some(key=>!fields.includes(key as typeof fields[number])))invalid();
 for(const key of ['id','assetId'] as const)if(typeof raw[key]!=='string'||!raw[key]||raw[key].length>512||/[\x00-\x1f]/.test(raw[key]))invalid();
 if(raw.category!=='proof'||raw.originalDigest!==null&&(typeof raw.originalDigest!=='string'||!/^[a-f0-9]{64}$/i.test(raw.originalDigest))||raw.pulse!==null&&(typeof raw.pulse!=='string'||!/^\d{1,10}$/.test(raw.pulse)))invalid();
 if(raw.priceUsd!==null&&(typeof raw.priceUsd!=='number'||!Number.isFinite(raw.priceUsd)||raw.priceUsd<0)||raw.changePct!==null&&(typeof raw.changePct!=='number'||!Number.isFinite(raw.changePct)))invalid();
 if(raw.circulationCount!==undefined&&(!Number.isSafeInteger(raw.circulationCount)||Number(raw.circulationCount)<0))invalid();
 if(raw.capitalizationUsdCents!==undefined&&raw.capitalizationUsdCents!==null&&(typeof raw.capitalizationUsdCents!=='string'||!/^(0|[1-9][0-9]*)$/.test(raw.capitalizationUsdCents)))invalid();
 const nativeAsset=raw.nativeAsset===undefined?undefined:publicNativeAssetBinding(raw.nativeAsset);if(raw.nativeAsset!==undefined&&!nativeAsset)invalid();
 const seed=raw.livePulseSeed===undefined?undefined:publicMarketPulseSeed(raw.livePulseSeed,raw.pulse);if(raw.livePulseSeed!==undefined&&(!seed||!same(seed,raw.livePulseSeed)))invalid();
 if(raw.valuationBinding!==undefined&&(!object(raw.valuationBinding)||Object.keys(raw.valuationBinding).length!==2||raw.valuationBinding.itemId!==raw.id||raw.valuationBinding.assetId!==raw.assetId))invalid();
 const base={id:raw.id as string,assetId:raw.assetId as string,category:'proof' as const,originalDigest:raw.originalDigest as string|null,pulse:raw.pulse as string|null,priceUsd:raw.priceUsd as number|null,changePct:raw.changePct as number|null,...(nativeAsset?{nativeAsset:raw.nativeAsset as typeof nativeAsset}:{}),...(seed?{livePulseSeed:raw.livePulseSeed as typeof seed}:{}),...(raw.valuationBinding?{valuationBinding:raw.valuationBinding as {itemId:string;assetId:string}}:{}),...(raw.circulationCount!==undefined?{circulationCount:Number(raw.circulationCount)}:{}),...(raw.capitalizationUsdCents!==undefined?{capitalizationUsdCents:raw.capitalizationUsdCents as string|null}:{})};
 const shareInventory=raw.shareInventory===undefined?undefined:readPublicShareInventory(raw.shareInventory,base);if(raw.shareInventory!==undefined&&(!shareInventory||!same(shareInventory,raw.shareInventory)))invalid();
 return{...base,...(shareInventory?{shareInventory:raw.shareInventory as typeof shareInventory}:{})};
}
export const publicPricingCheckpointSha256=(value:PublicPricingCheckpoint)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');

export type PublicPricingCatalogInput={schema:'bank.public-market.pricing-input.v1';metadata:Omit<import('../src/receiz/market-projection/pricing-inputs.js').PublicMarketPricingCatalog,'items'>;entries:readonly {logicalKey:string;pricingCheckpoint:PublicPricingCheckpoint;pricingCheckpointSha256:string}[]};
/** Initial write-side extraction from already selected, complete display inputs.
 * Routine Original changes use the single-row projectOriginals output instead. */
export async function preparePublicPricingCatalogInput(membership:unknown,snapshot:unknown,sports:unknown):Promise<PublicPricingCatalogInput>{
 const [{curatePublicMarketMembership},{parsePublicMarket},{mergePublicSports}]=await Promise.all([import('./public-market.js'),import('../src/receiz/public-market.js'),import('../src/receiz/public-sports.js')]);
 if(!object(membership))invalid();
 const curated=curatePublicMarketMembership(membership),rows=(curated as {transport:{publicOriginals:Record<string,unknown>[]}}).transport.publicOriginals,logicalKeys=new Map(rows.map(row=>{if(typeof row.id!=='string'||typeof row.ownerUserId!=='string'||!row.ownerUserId||typeof row.receizId!=='string'||!row.receizId)invalid();return[row.id,JSON.stringify([row.ownerUserId,row.receizId])] as const;})),catalog=mergePublicSports(parsePublicMarket(curated,snapshot),sports);
 if(!catalog.complete)invalid();
 const entries=catalog.items.filter(item=>item.category==='proof').map(item=>{const logicalKey=logicalKeys.get(item.id);if(!logicalKey)invalid();const pricingCheckpoint=createPublicPricingCheckpoint(item);return{logicalKey,pricingCheckpoint,pricingCheckpointSha256:publicPricingCheckpointSha256(pricingCheckpoint)};});
 if(entries.length!==rows.length||new Set(entries.map(entry=>entry.logicalKey)).size!==entries.length)invalid();
 const metadata=Object.fromEntries(PUBLIC_PRICING_METADATA_FIELDS.flatMap(key=>catalog[key]===undefined?[]:[[key,catalog[key]]])) as PublicPricingCatalogInput['metadata'];
 return{schema:'bank.public-market.pricing-input.v1',metadata,entries};
}
