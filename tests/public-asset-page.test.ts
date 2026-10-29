// @vitest-environment happy-dom
import {expect,it,vi} from 'vitest';
import type {PublicMarketItem} from '../src/receiz/public-market';
import {retainPublicAsset} from '../src/receiz/public-asset-page';
it('keeps source metadata until navigation is ready and publishes only the currently held asset',()=>{
 const item={id:'profile:artist:early-asset',assetId:'early-asset',title:'Carried Original',summary:'Original source.',category:'proof',mediaKind:'image'} as PublicMarketItem;
 const ready=vi.spyOn(document,'readyState','get').mockReturnValue('loading'),seen:any[]=[];
 const listen=(event:Event)=>seen.push((event as CustomEvent).detail);addEventListener('bankeiz:asset-metadata',listen);
 try{retainPublicAsset(item);expect(seen).toHaveLength(0);retainPublicAsset({...item,title:'Current Original'});expect(seen).toHaveLength(0);document.dispatchEvent(new Event('DOMContentLoaded'));expect(seen.map(row=>row.title)).toEqual(['Current Original']);}
 finally{ready.mockRestore();removeEventListener('bankeiz:asset-metadata',listen);}
});
it('uses the same source description formatting in the carried document and its later metadata event',()=>{
 const ready=vi.spyOn(document,'readyState','get').mockReturnValue('complete'),seen:any[]=[];
 const listen=(event:Event)=>seen.push((event as CustomEvent).detail);addEventListener('bankeiz:asset-metadata',listen);
 try{retainPublicAsset({id:'profile:artist:metadata-lines',assetId:'metadata-lines',title:'Same Original',summary:'First line.\nSecond line.',category:'proof',mediaKind:'image'} as PublicMarketItem);expect(seen[0].description).toBe('First line. Second line.');}
 finally{ready.mockRestore();removeEventListener('bankeiz:asset-metadata',listen);}
});
it('retains the carried source description for an Original with no summary',()=>{
 const ready=vi.spyOn(document,'readyState','get').mockReturnValue('complete'),seen:any[]=[];
 const listen=(event:Event)=>seen.push((event as CustomEvent).detail);addEventListener('bankeiz:asset-metadata',listen);
 try{retainPublicAsset({id:'profile:artist:metadata-empty',assetId:'metadata-empty',title:'Same Original',summary:'',category:'proof',mediaKind:'image'} as PublicMarketItem);expect(seen[0].description).toBe('Inspect this asset, its media, ownership, valuation and original evidence.');}
 finally{ready.mockRestore();removeEventListener('bankeiz:asset-metadata',listen);}
});
