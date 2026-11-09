import {expect,it} from 'vitest';
import {packPublicCatalogArtwork,unpackPublicCatalogArtwork} from '../src/receiz/public-catalog-artwork-wire';
import {parsePublicMarket} from '../src/receiz/public-market';
import {profileFixture} from './fixtures/public-profile';
it('carries a repeated exact portrait once and restores every row without changing the held catalog',()=>{
 const head=profileFixture().profile;head.profile.avatarUrl='data:image/png;base64,'+'a'.repeat(88000);
 const catalog=parsePublicMarket({ok:true,transport:{publicProfileHeads:[head],publicOriginals:Array.from({length:613},(_,n)=>({id:'work-'+n,receizId:'work-'+n,ownerUsername:head.profile.username,ownerUserId:head.profile.userId,ownerCreatedAt:'2026-01-01T00:00:00Z',ownerAvatarUrl:head.profile.avatarUrl,title:'Held Original'}))}});
 const before=JSON.stringify(catalog),packed=packPublicCatalogArtwork(catalog),wire=JSON.stringify(packed);
 expect(before.length).toBeGreaterThan(50*1024*1024);expect(wire.length).toBeLessThan(2*1024*1024);expect(JSON.stringify(catalog)).toBe(before);
 const restored=unpackPublicCatalogArtwork(JSON.parse(wire));expect(restored).toEqual(catalog);expect(restored.items).toHaveLength(613);
});
it('does not compact an unbound portrait or restore a mismatched owner reference',()=>{
 const head=profileFixture().profile,catalog=parsePublicMarket({ok:true,transport:{publicProfileHeads:[head],publicOriginals:[{id:'work',receizId:'work',title:'Held Original',ownerUsername:head.profile.username,ownerUserId:head.profile.userId,ownerCreatedAt:'2026-01-01T00:00:00Z',ownerAvatarUrl:'https://receiz.com/different.png'}]}});
 expect(packPublicCatalogArtwork(catalog).items[0]).toBe(catalog.items[0]);
 const wire=JSON.parse(JSON.stringify(catalog));delete wire.items[0].ownerAvatarUrl;wire.items[0].ownerAvatarFromProfile='different-owner';expect(()=>unpackPublicCatalogArtwork(wire)).toThrow('PUBLIC_CATALOG_ARTWORK_BINDING_INVALID');
});
