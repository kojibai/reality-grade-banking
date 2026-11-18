import type {PublicMarketCatalog,PublicMarketItem} from '../public-market';
/** The exact existing operands consumed by the display calculator. No content,
 * media, profile or custody is required to evaluate a retained price model. */
export type PublicMarketPricingItem=Pick<PublicMarketItem,
 'id'|'assetId'|'category'|'originalDigest'|'pulse'|'priceUsd'|'changePct'|
 'shareInventory'|'livePulseSeed'|'valuationBinding'|'nativeAsset'|
 'circulationCount'|'capitalizationUsdCents'|'sportsValuation'|'sealedBirths'> &
 // An ordinary full catalog can still name calculation explanations. Pricing
 // checkpoints omit this optional presentation field entirely.
 Pick<Partial<PublicMarketItem>,'title'>;
export type PublicMarketPricingCatalog=Omit<PublicMarketCatalog,'items'|'publicProfileHeads'|'publicProfileHeadRefusals'|'publicProfileHeadsRevision'>&{items:PublicMarketPricingItem[]};

/** Existing producer checkpoint fields. Selection carries display operands; it
 * does not admit a Source or replace the complete held public catalog. */
export const PUBLIC_PRICING_CHECKPOINT_FIELDS=['id','assetId','category','originalDigest','pulse','priceUsd','changePct','shareInventory','livePulseSeed','valuationBinding','nativeAsset','circulationCount','capitalizationUsdCents'] as const;
export const PUBLIC_PRICING_METADATA_FIELDS=['complete','revision','observedAt','sourceCount','sportsCoverage','sportsObservedAt','sportsSealedBirthsObservedAt','sportsHistorySnapshot'] as const;
export function pickPublicPricingCheckpointItem(item:PublicMarketPricingItem):PublicMarketPricingItem{
 const picked:Partial<PublicMarketPricingItem>=Object.fromEntries(PUBLIC_PRICING_CHECKPOINT_FIELDS.flatMap(key=>{const value=item[key];return value===undefined?[]:[[key,value]];}));
 return picked as PublicMarketPricingItem;
}
/** Same numeric fields, with the existing sports/copy operands and inspector
 * title. Nested inventory, model and history objects remain held references. */
export function pickPublicMarketPricingCatalog(catalog:PublicMarketPricingCatalog):PublicMarketPricingCatalog{
 const metadata=Object.fromEntries(PUBLIC_PRICING_METADATA_FIELDS.flatMap(key=>{const value=catalog[key];return value===undefined?[]:[[key,value]];}));
 const items=catalog.items.map(item=>({...pickPublicPricingCheckpointItem(item),...(item.title===undefined?{}:{title:item.title}),...(item.sportsValuation===undefined?{}:{sportsValuation:item.sportsValuation}),...(item.sealedBirths===undefined?{}:{sealedBirths:item.sealedBirths})}));
 return{...metadata,items} as PublicMarketPricingCatalog;
}
