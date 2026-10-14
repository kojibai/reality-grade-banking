import type { PublicMarketCatalog, PublicMarketItem } from './public-market';
/** Account display only: a public showcase is not transferable ownership authority. */
export function projectAccountShowcase(catalog: PublicMarketCatalog | null, username: string | null): PublicMarketItem[] {
  if (!username || !/^[a-zA-Z0-9_-]{1,64}$/.test(username)) return [];
  return (catalog?.items ?? []).filter(item => item.ownerUsername?.toLowerCase() === username.toLowerCase());
}
