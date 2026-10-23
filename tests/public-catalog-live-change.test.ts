import {expect,it} from 'vitest';
import {parsePublicMarket} from '../src/receiz/public-market';
import {publicCatalogAtPulse} from '../src/receiz/market-projection/catalog-prices';
const catalog=(ids=['proof'])=>parsePublicMarket({ok:true,transport:{publicOriginals:ids.map(id=>({id,receizId:id,title:'Moment',pulse:'14000000',valueUsd:10,livePulseSeed:{kind:'sigil',claimPulse:14000000,beat:0,stepIndex:0,creatorVerified:true}}))}});
it('updates the displayed change alongside the live value using the already retained quote',()=>{
 const held=catalog(),current=publicCatalogAtPulse(held,null,14720000)!.items[0];
 expect(current.priceUsd).not.toBe(10);
 expect(current.changePct).toBe(Number(((current.priceUsd!/10-1)*100).toFixed(2)));
 expect(held.items[0].priceUsd).toBe(10);
 expect(publicCatalogAtPulse(held,null,14720001)!.items[0].changePct).not.toBe(current.changePct);
});
it('does not invent a percentage when the retained quote is missing or zero',()=>{
 for(const priceUsd of [null,0]){const held=catalog();held.items[0].priceUsd=priceUsd;expect(publicCatalogAtPulse(held,null,14720000)!.items[0].changePct).toBeNull();}
});
it('revalues only the selected asset and preserves every other retained row until the full collection is shown',()=>{
 const held=catalog(['proof','other-proof']);
 const full=publicCatalogAtPulse(held,null,14720000)!;
 const selected=publicCatalogAtPulse(held,null,14720000,'proof')!;
 expect(selected.items[0]).toEqual(full.items[0]);
 expect(selected.items[0].priceUsd).toBe(11773.11);
 expect(selected.items[1]).toBe(held.items[1]);
 expect(selected.items[1].priceUsd).toBe(10);
 expect(publicCatalogAtPulse(held,null,14720000,'absent')!.items).toEqual(held.items);
 expect(publicCatalogAtPulse(held,null,14720000,null)).toEqual(full);
});
