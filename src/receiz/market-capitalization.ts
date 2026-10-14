import type { PublicMarketCatalog } from './public-market';
export function publicMarketCapitalization(catalog: PublicMarketCatalog | null) {
  const assets = new Map(catalog?.items.map(item => [item.assetId, item]) ?? []);
  let sum = 0n, valued = 0;
  for (const item of assets.values()) { if (item.priceUsd === null) continue; const cents = Math.round(item.priceUsd * 100); if (!Number.isSafeInteger(cents) || cents < 0) continue; sum += BigInt(cents); valued++; }
  return { usdCents: sum.toString(), count: assets.size, valued, complete: Boolean(catalog?.complete && valued === assets.size) };
}
export interface MarketCapPoint { at: string; usdCents: string; count: number; }
