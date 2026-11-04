// @vitest-environment happy-dom
import {act,useLayoutEffect} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,expect,it,vi} from 'vitest';
import marketFile from '../public/receiz-public-market.json';
import {parsePublicMarket,publicAssetImagePreviewUrl} from '../src/receiz/public-market';

Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
afterEach(()=>vi.unstubAllGlobals());
it('shows the carried public avatar Original immediately without requiring a separately downloadable sealed file',async()=>{
 const item=parsePublicMarket(marketFile,marketFile.snapshot).items.find(row=>row.id==='profile:nubiel:d878a977-88bb-4943-8ab9-eee4e37ca4d6')!;
 expect(item).toBeDefined();expect(item.originalUrl).toBeNull();expect(item.artworkUrl).toContain('4fade99512ee88d3857a.webp');
 const fetch=vi.fn().mockRejectedValue(Error('extra data read forbidden'));vi.stubGlobal('fetch',fetch);
 const {PublicAssetDetail}=await import('../src/features/market/PublicAssetDetail');
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host),firstFrame:string[]=[];
 function Probe(){useLayoutEffect(()=>{firstFrame.push(host.querySelector<HTMLImageElement>('.proof-image-view img')?.src??'');},[]);return <PublicAssetDetail item={item} readOnly/>;}
 try{
  await act(async()=>root.render(<Probe/>));
  expect(firstFrame).toEqual([item.artworkUrl]);expect(publicAssetImagePreviewUrl(item)).toBe(item.artworkUrl);
  expect(host.querySelector('.public-collectible-face')).toBeNull();
  act(()=>host.querySelector<HTMLButtonElement>('[aria-label="Open full image"]')!.click());
  expect(document.querySelector<HTMLImageElement>('dialog img')?.src).toBe(item.artworkUrl);
  expect(fetch).not.toHaveBeenCalled();
 }finally{act(()=>root.unmount());host.remove();}
});
