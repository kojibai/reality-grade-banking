import { expect, it } from 'vitest';
import { mergePublicSports } from '../src/receiz/public-sports';
import { parsePublicMarket } from '../src/receiz/public-market';
import { publicMarketCapitalization } from '../src/receiz/market-capitalization';
const base = () => parsePublicMarket({ ok: true, transport: { publicMembership: { version: 1, scope: 'whole-market-visible-showcase', source: 'canonical-complete', isComplete: true, itemCount: 1 }, publicOriginals: [{ id: 'original', receizId: 'original', title: 'Original', valueUsd: 10 }] } });
const card = { collectibleId: 'rsc_0123456789abcdef', claimHash: 'a'.repeat(64), athlete: 'Public athlete', sport: 'baseball', rarity: 'Rare', liveValueUsd: 25, totalValueUsd: 50, issuedCount: 2, vaultCount: 2, pricedCount: 2, route: '/game/sports/card/rsc_0123456789abcdef?claimHash=' + 'a'.repeat(64) };
it('retains the canonical card valuation operands bound to its exact public claim',async()=>{
 const {publicSportsValueRow}=await import('../src/receiz/market-projection/source');
 const row=publicSportsValueRow({...card,cardId:'public-card',baseRating:90,proofValueUsd:20,proofTotalValueUsd:40,representativeValueUsd:25,card:{currentScore:2,projectedScore:3}});
 const catalog=mergePublicSports(base(),{ok:true,schema:'receiz.sports_economy.live_inventory.v1',cards:[{...card,valuationRow:row}]});
 expect(catalog.items[1].sportsValuation).toMatchObject({source:'sports-economy-card',seed:card.claimHash,baseUsdValue:20,birthUsdValue:20,marketUsdValue:25,proofTotalValueUsd:40,scoreDelta:2});
 const wrong=mergePublicSports(base(),{ok:true,schema:'receiz.sports_economy.live_inventory.v1',cards:[{...card,valuationRow:{...row,seed:'b'.repeat(64)}}]});expect(wrong.items[1].sportsValuation).toBeUndefined();
});
it('adds public sports circulation and its reported aggregate value once per stable collectible', () => {
  const catalog = mergePublicSports(base(), { ok: true, schema: 'receiz.sports_economy.live_inventory.v1', generatedAt: '2026-10-14T12:00:00Z', cards: [card, card] });
  expect(catalog.items).toHaveLength(2);
  expect(catalog.items[1]).toMatchObject({ category: 'sports', circulationCount: 2, canTrade: false, authority: 'projection-only', priceUsd: 25 });
  expect(publicMarketCapitalization(catalog)).toMatchObject({ usdCents: '6000', count: 3 });
});
it('never treats a fallback, unpriced or partial sports source as complete market coverage', () => {
  expect(mergePublicSports(base(), { ok: true, fallback: true, schema: 'receiz.sports_economy.live_inventory.v1', cards: [card] }).sportsCoverage).toBe('partial');
  expect(mergePublicSports(base(), null).sportsCoverage).toBe('missing');
  const catalog = mergePublicSports(base(), { ok: true, schema: 'receiz.sports_economy.live_inventory.v1', cards: [{ ...card, pricedCount: 1 }] });
  expect(publicMarketCapitalization(catalog).complete).toBe(false);
});
it('counts only priced copies and refuses missing aggregate/count data as complete', () => {
  const partial = mergePublicSports(base(), { ok: true, schema: 'receiz.sports_economy.live_inventory.v1', cards: [{ ...card, pricedCount: 1 }] });
  expect(publicMarketCapitalization(partial)).toMatchObject({ count: 3, valued: 2, complete: false });
  const missingTotal = mergePublicSports(base(), { ok: true, schema: 'receiz.sports_economy.live_inventory.v1', cards: [{ ...card, totalValueUsd: null, vaultCount: 'bad' }] });
  expect(publicMarketCapitalization(missingTotal)).toMatchObject({ usdCents: '1000', complete: false });
});
it('normalizes sports identity casing and merges proof collisions without double counting', () => {
  const catalog = base(); catalog.items[0].assetId = card.collectibleId.toUpperCase();
  const merged = mergePublicSports(catalog, { ok: true, schema: 'receiz.sports_economy.live_inventory.v1', cards: [card, { ...card, collectibleId: card.collectibleId.toUpperCase() }] });
  expect(merged.items).toHaveLength(1); expect(merged.items[0].id).toBe('original');
  expect(publicMarketCapitalization(merged)).toMatchObject({ usdCents: '5000', count: 2, valued: 2, complete: true });
});

it('counts all issued copies while keeping vault and priced subsets distinct', () => {
 const catalog = mergePublicSports(base(), { ok: true, schema: 'receiz.sports_economy.live_inventory.v1', cards: [{ ...card, issuedCount: 5, vaultCount: 2, pricedCount: 2 }] });
 expect(publicMarketCapitalization(catalog)).toMatchObject({ count: 6, cards: 5, proofs: 2, valued: 3, complete: false });
});
