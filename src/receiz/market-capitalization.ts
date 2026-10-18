import type { PublicMarketCatalog } from './public-market';
export function publicMarketCapitalization(catalog: PublicMarketCatalog | null) {
  const assets = new Map(catalog?.items.map(item => [item.assetId, item]) ?? []);
  let sum = 0n, valued = 0, count = 0, proofs = 0, cards = 0, cardAssets = 0;
  for (const item of assets.values()) { const circulation = item.circulationCount ?? 1; count += circulation; if (item.category === 'sports') { cards += circulation; cardAssets++; } else proofs++; const cents = item.capitalizationUsdCents !== undefined ? item.capitalizationUsdCents : (item.priceUsd === null || !Number.isSafeInteger(Math.round(item.priceUsd * 100)) ? null : String(Math.round(item.priceUsd * 100))); if (cents === null || !/^(0|[1-9]\d{0,39})$/.test(cents)) continue; sum += BigInt(cents); valued += item.pricedCount ?? circulation; }
  return { usdCents: sum.toString(), count, valued, proofs: proofs + cardAssets, cards, listed: assets.size, cardAssets, complete: Boolean(catalog?.complete && valued === count && (!catalog.sportsCoverage || catalog.sportsCoverage === 'complete')) };
}
export interface MarketCapPoint { at: string; usdCents: string; count: number; }
