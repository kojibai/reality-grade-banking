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
it('keeps each exact sealed copy and shows carried owner and time only for a single copy',async()=>{
 const {publicSportsValueRow}=await import('../src/receiz/market-projection/source');
 const copy={collectibleId:card.collectibleId,claimHash:card.claimHash,sealedAt:'2026-10-01T12:00:00Z',birthUsdValue:10,proofValueUsd:20,currentValueUsd:25,ownerUsername:'current_holder',ownerDisplayName:'Current Holder'};
 const input={...card,cardId:'public-card',proofValueUsd:20,proofTotalValueUsd:20,sealedCopies:[copy],issuedCount:1,vaultCount:1,pricedCount:1,totalValueUsd:25};
 const row=publicSportsValueRow(input)!;
 const catalog=mergePublicSports(base(),{ok:true,schema:'receiz.sports_economy.live_inventory.v1',cards:[{...input,valuationRow:row}]});
 expect(catalog.items[1]).toMatchObject({sealedAt:copy.sealedAt,ownerUsername:'current_holder',ownerProfileUrl:'https://receiz.com/current_holder'});
 expect(row.sealedCopies).toEqual([{collectibleId:copy.collectibleId,claimHash:copy.claimHash,sealedAt:copy.sealedAt,birthUsdValue:10,proofValueUsd:20,currentValueUsd:25}]);
 expect(JSON.stringify(row)).not.toContain('current_holder');
 const edition={...input,sealedCopies:[copy,{...copy,collectibleId:'rsc_1123456789abcdef',claimHash:'b'.repeat(64),sealedAt:'2026-10-02T12:00:00Z'}],issuedCount:2,vaultCount:2,pricedCount:2,proofTotalValueUsd:40};
 const multi=mergePublicSports(base(),{ok:true,schema:'receiz.sports_economy.live_inventory.v1',cards:[{...edition,valuationRow:publicSportsValueRow(edition)}]}).items[1];
 expect(multi.ownerUsername).toBeNull();expect(multi.sealedAt).toBeNull();
});
it('preserves stronger exact copy provenance and valuation through fallback or metadata-poor matching feeds',async()=>{
 const {publicSportsValueRow}=await import('../src/receiz/market-projection/source');
 const copy={collectibleId:card.collectibleId,claimHash:card.claimHash,sealedAt:'2026-10-01T12:00:00Z',birthUsdValue:10,proofValueUsd:20,currentValueUsd:25,ownerUsername:'holder',ownerDisplayName:'Holder'};
 const exact={...card,cardId:'public-card',proofValueUsd:20,proofTotalValueUsd:20,issuedCount:1,vaultCount:1,pricedCount:1,totalValueUsd:25,sealedCopies:[copy]};
 const retained=mergePublicSports(base(),{ok:true,schema:'receiz.sports_economy.live_inventory.v1',generatedAt:'2026-10-18T12:00:00Z',cards:[{...exact,valuationRow:publicSportsValueRow(exact)}]});
 const weak={...exact,sealedCopies:undefined,liveValueUsd:999},feed={ok:true,schema:'receiz.sports_economy.live_inventory.v1',generatedAt:'2026-10-19T12:00:00Z',cards:[{...weak,valuationRow:publicSportsValueRow(weak)}]};
 for(const fallback of [false,true]){
  const refreshed=mergePublicSports(retained,{...feed,fallback}),item=refreshed.items.find(item=>item.category==='sports')!;
  expect(item.sealedAt).toBe(copy.sealedAt);expect(item.ownerUsername).toBe('holder');expect(item.sportsValuation?.sealedCopies).toEqual(retained.items[1].sportsValuation?.sealedCopies);
  if(fallback){expect(item.priceUsd).toBe(25);expect(refreshed.sportsObservedAt).toBe(retained.sportsObservedAt);}
 }
});
it('rejects older qualified sports captures before replacing a newer exact owner or value',async()=>{
 const {publicSportsValueRow}=await import('../src/receiz/market-projection/source'),{retainPublicSportsInput}=await import('../src/receiz/public-sports');
 const capture=(generatedAt:string,ownerUsername:string,value:number)=>{
  const exact={...card,cardId:'public-card',liveValueUsd:value,totalValueUsd:value,proofValueUsd:value,proofTotalValueUsd:value,issuedCount:1,vaultCount:1,pricedCount:1,sealedCopies:[{collectibleId:card.collectibleId,claimHash:card.claimHash,sealedAt:'2026-10-01T12:00:00Z',birthUsdValue:10,proofValueUsd:value,currentValueUsd:value,ownerUsername,ownerDisplayName:ownerUsername}]};
  return {ok:true,schema:'receiz.sports_economy.live_inventory.v1',generatedAt,cards:[{...exact,valuationRow:publicSportsValueRow(exact)}]};
 };
 const fresh=capture('2026-10-19T12:00:00Z','new_owner',200),older=capture('2026-10-18T12:00:00Z','old_owner',100);
 expect(retainPublicSportsInput(fresh,older)).toBe(fresh);
 const catalog=mergePublicSports(base(),fresh),retained=mergePublicSports(catalog,older);
 expect(retained.sportsObservedAt).toBe(fresh.generatedAt);expect(retained.items[1]).toMatchObject({ownerUsername:'new_owner',priceUsd:200});
 const next=mergePublicSports(retained,capture('2026-10-20T12:00:00Z','latest_owner',300));expect(next.items[1]).toMatchObject({ownerUsername:'latest_owner',priceUsd:300});
});
