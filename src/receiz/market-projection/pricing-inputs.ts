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
export type PublicMarketPricingCatalog=Omit<PublicMarketCatalog,'items'|'publicProfileHeads'|'publicProfileHeadsRevision'>&{items:PublicMarketPricingItem[]};
