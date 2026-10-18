import { expect, it } from 'vitest';
import { publicMarketCapitalization } from '../src/receiz/market-capitalization';
import { parsePublicMarket } from '../src/receiz/public-market';
it('aggregates the complete public collection once per asset and reports missing valuations', () => {
  const catalog = parsePublicMarket({ ok: true, transport: { publicMembership: { version: 1, scope: 'whole-market-visible-showcase', source: 'canonical-complete', isComplete: true, itemCount: 3 }, publicOriginals: [{ id: 'a', receizId: 'one', title: 'One', valueUsd: 12.34 }, { id: 'b', receizId: 'two', title: 'Two', valueUsd: 20.01 }, { id: 'duplicate', receizId: 'one', title: 'Duplicate', valueUsd: 12.34 }] } });
  expect(publicMarketCapitalization(catalog)).toMatchObject({ usdCents: '3235', count: 2, valued: 2, proofs: 2, cards: 0, listed: 2, cardAssets: 0, complete: true });
  catalog.items[1].priceUsd = null;
  expect(publicMarketCapitalization(catalog)).toMatchObject({ usdCents: '1234', valued: 1, complete: false });
});
it('counts collectible cards within proof objects rather than outside that total', () => {
  const catalog = parsePublicMarket({ok:true,transport:{publicMembership:{version:1,scope:'whole-market-visible-showcase',source:'canonical-complete',isComplete:true,itemCount:1},publicOriginals:[{id:'a',receizId:'one',title:'One',valueUsd:12.34}]}});
  catalog.items.push({...catalog.items[0],id:'card',assetId:'card',category:'sports',circulationCount:4,pricedCount:4,capitalizationUsdCents:'400'});
  expect(publicMarketCapitalization(catalog)).toMatchObject({proofs:2,listed:2,cardAssets:1,cards:4,count:5,valued:5,usdCents:'1634'});
});
