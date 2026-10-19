import {expect,it} from 'vitest';
import {parsePublicMarket} from '../src/receiz/public-market';
import {publicCatalogAtPulse} from '../src/receiz/market-projection/catalog-prices';
const catalog=()=>parsePublicMarket({ok:true,transport:{publicOriginals:[{id:'proof',receizId:'proof',title:'Moment',pulse:'14000000',valueUsd:10,livePulseSeed:{kind:'sigil',claimPulse:14000000,beat:0,stepIndex:0,creatorVerified:true}}]}});
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
