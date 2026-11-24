import type {PublicMarketPricingCatalog} from './pricing-inputs';

/** Reuse separately selected Sports rows without reopening their operands. */
export function retainPublicMarketSports<T extends PublicMarketPricingCatalog>(catalog:T,held?:T|null):T{
  // A Showcase membership response carries Originals only. Collectibles are
  // selected independently and remain available while that operand refreshes.
  const heldSports = held?.items.filter(item => item.category === 'sports');
  if (held && heldSports?.length) {
    const selected = new Set(catalog.items.map(item => item.assetId.toLowerCase()));
    catalog = { ...catalog, items: [...catalog.items, ...heldSports.filter(item => !selected.has(item.assetId.toLowerCase()))],
      sportsCoverage: held.sportsCoverage, sportsObservedAt: held.sportsObservedAt,
      sportsSealedBirthsObservedAt: held.sportsSealedBirthsObservedAt, sportsHistorySnapshot: held.sportsHistorySnapshot };
  }
  return catalog;
}
