import {expect,it} from 'vitest';
import {projectAccountShowcase} from '../src/receiz/account-showcase';
import {parsePublicMarket,type PublicMarketItem} from '../src/receiz/public-market';
import type {MarketValueRow} from '../src/receiz/market-projection/source';
const hash='a'.repeat(64),other='b'.repeat(64),at='2026-05-10T12:00:00Z';
const first={collectibleId:'rsc_aaaaaaaaaaaaaaaa',claimHash:hash,sealedAt:at,ownerUsername:'current',ownerDisplayName:'Current',ownerProfileUrl:'https://receiz.com/current'};
const second={...first,collectibleId:'rsc_bbbbbbbbbbbbbbbb',claimHash:other};
const foreign={...first,collectibleId:'rsc_cccccccccccccccc',claimHash:'c'.repeat(64),ownerUsername:'someone_else'};
const base=parsePublicMarket({ok:true,transport:{publicOriginals:[{id:'group',receizId:first.collectibleId,title:'Card edition'}]}});
const valuation:MarketValueRow={id:`card:${hash}`,source:'sports-economy-card',baseUsdValue:100,birthUsdValue:10,marketUsdValue:110,proofTotalValueUsd:300,scoreDelta:0,seed:hash};
const item:PublicMarketItem={...base.items[0],category:'sports',priceUsd:123.45,changePct:1.5,localValuationPulse:14720000,circulationCount:3,sealedCopies:[first,second,foreign],sportsValuation:valuation};
it('finds owned individual cards inside shared editions and keeps each copy identity and seal',()=>{
 const cards=projectAccountShowcase({...base,items:[item]},'CURRENT');
 expect(cards).toHaveLength(2);expect(cards.map(card=>card.assetId)).toEqual([first.collectibleId,second.collectibleId]);
 expect(cards[0]).toMatchObject({ownerUsername:'current',sealedAt:at,circulationCount:1,priceUsd:123.45});
 expect(cards[0].sourceUrl).toBe(`https://receiz.com/game/sports/card/${first.collectibleId}?claimHash=${hash}`);
 expect(cards[0].sealedCopies).toEqual([first]);
});
it('never attributes the representative copy’s value to another copy in the same edition',()=>{
 const cards=projectAccountShowcase({...base,items:[item]},'current');
 expect(cards).toHaveLength(2);expect(cards[1]).toMatchObject({priceUsd:null,changePct:null});expect(cards[1].sportsValuation).toBeUndefined();
 expect(projectAccountShowcase({...base,items:[item]},'missing')).toEqual([]);
});
