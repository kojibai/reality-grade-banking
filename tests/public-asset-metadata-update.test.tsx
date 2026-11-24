// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {expect,it,vi} from 'vitest';
vi.mock('../src/features/market/PublicAssetDetail',()=>({PublicAssetDetail:()=>null}));
vi.mock('../src/components/AssetPageLinks',()=>({AssetPageLinks:()=>null}));
vi.mock('../src/public-explorer/PublicAssetTradeHost',()=>({PublicAssetTradeHost:()=>null}));
import {PublicAssetPage} from '../src/public-explorer/PublicAssetPage';
import type {PublicMarketItem} from '../src/receiz/public-market';
import {retainedPublicAsset} from '../src/receiz/public-asset-page';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
it('updates share metadata when only the existing playback role changes',async()=>{
 const item={id:'profile:artist:one',assetId:'one',title:'Same title',summary:'Same caption',category:'proof',mediaKind:'audio',sourceUrl:'https://receiz.com/artist/verified/one'}as PublicMarketItem;
 const root=createRoot(document.createElement('div')),events:CustomEvent[]=[];
 const collect=(event:Event)=>events.push(event as CustomEvent);addEventListener('bankeiz:asset-metadata',collect);
 try{
  await act(async()=>root.render(<PublicAssetPage item={item}/>));expect(events.at(-1)?.detail.media).toBeNull();
  await act(async()=>root.render(<PublicAssetPage item={{...item,playback:{url:'https://receiz.com/audio/one.mp3',mimeType:'audio/mpeg'}}}/>));
  expect(events.at(-1)?.detail.media['og:audio']).toBe('https://receiz.com/audio/one.mp3');
  await act(async()=>root.render(<PublicAssetPage item={item}/>));expect(events.at(-1)?.detail.media).toBeNull();
 }finally{act(()=>root.unmount());removeEventListener('bankeiz:asset-metadata',collect);}
});


it('retains an exact signature-only update before reopening the asset',async()=>{
 const item={id:'profile:artist:signature-only',assetId:'signature-only',title:'Same Original',category:'proof',hasPbiSignature:false}as PublicMarketItem;
 const signed={...item,hasPbiSignature:true,pbiReceiptHash:'a'.repeat(64)};
 const root=createRoot(document.createElement('div'));
 try{
  await act(async()=>root.render(<PublicAssetPage item={item}/>));
  expect(retainedPublicAsset(item.id)).toBe(item);
  await act(async()=>root.render(<PublicAssetPage item={signed}/>));
  expect(retainedPublicAsset(item.id)).toBe(signed);
 }finally{act(()=>root.unmount());}
});
