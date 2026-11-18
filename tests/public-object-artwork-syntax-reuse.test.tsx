// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {afterEach,expect,it,vi} from 'vitest';
import {parsePublicMarket,type PublicMarketItem} from '../src/receiz/public-market';
import {usePublicObjectArtwork} from '../src/features/media/usePublicObjectArtwork';
import * as adoption from '../src/receiz/asset-publication-adoption';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
afterEach(()=>{vi.unstubAllGlobals();vi.restoreAllMocks();});
const packet=JSON.parse(readFileSync(resolve('public/receiz-public-market.json'),'utf8'));
const examples=parsePublicMarket(packet,packet.snapshot).items.filter(item=>item.originalDigest&&item.artworkUrl?.includes('/api/profile/showcase/imported-source?'));
function fixture(){
 let parses=0;const parse=JSON.parse,fetcher=vi.fn(()=>{throw Error('Unexpected transport');});
 vi.spyOn(JSON,'parse').mockImplementation((text,...args)=>{if(typeof text==='string'&&text.includes('receiz.imported-proof-source.v1'))parses++;return parse(text,...args);});
 vi.stubGlobal('indexedDB',undefined);vi.stubGlobal('fetch',fetcher);
 const host=document.createElement('div'),root=createRoot(host);
 function Probe({item}:{item:PublicMarketItem}){const url=usePublicObjectArtwork(item.artworkUrl,item);return <img src={url??undefined}/>;}
 return{host,fetcher,parses:()=>parses,async render(item:PublicMarketItem){await act(()=>root.render(<Probe item={item}/>));},close(){act(()=>root.unmount());}};
}
it('reuses one exact URL syntax parse group through forty same-Source display updates',async()=>{
 expect(examples.length).toBeGreaterThan(1);const held=examples[0],view=fixture();
 try{
  await view.render(held);const image=view.host.querySelector('img'),url=image?.getAttribute('src');
  for(let tick=1;tick<=40;tick++)await view.render({...held,localValuationPulse:tick});
  expect(view.parses()).toBe(3);expect(view.host.querySelector('img')).toBe(image);expect(image?.getAttribute('src')).toBe(url);expect(url).toBe(held.artworkUrl);
  expect(view.fetcher).not.toHaveBeenCalled();
 }finally{view.close();}
});
it('checks the current Original digest every render and reparses a changed URL without granting authority',async()=>{
 const held=examples[0],next=examples.find(item=>item.artworkUrl!==held.artworkUrl)!;expect(next).toBeDefined();const view=fixture();
 try{
  await view.render(held);expect(view.parses()).toBe(3);
  await view.render({...held,originalDigest:held.originalDigest==='a'.repeat(64)?'b'.repeat(64):'a'.repeat(64)});
  expect(view.host.querySelector('img')?.getAttribute('src')).toBeNull();expect(view.parses()).toBe(3);
  await view.render(held);expect(view.host.querySelector('img')?.getAttribute('src')).toBe(held.artworkUrl);expect(view.parses()).toBe(3);
  await view.render(next);expect(view.host.querySelector('img')?.getAttribute('src')).toBe(next.artworkUrl);expect(view.parses()).toBe(6);
  await view.render({...next,artworkUrl:next.artworkUrl+'&unexpected=1'});expect(view.host.querySelector('img')?.getAttribute('src')).toBeNull();
  expect(view.fetcher).not.toHaveBeenCalled();
 }finally{view.close();}
});
it('keeps the existing admitted-preview owner lookup current when only the owner changes',async()=>{
 const held=examples[0],view=fixture(),preview='blob:already-admitted-owner-only';
 // Instrument the post-admission display selector only. Genuine sealed Source,
 // encrypted custody and verifier behavior run in the adjacent 33-Original test.
 const lookup=vi.spyOn(adoption,'retainedAssetPublicationArtwork').mockImplementation((digest,owner)=>digest===held.originalDigest&&owner===held.ownerUsername?preview:null);
 try{
  await view.render(held);expect(view.host.querySelector('img')?.getAttribute('src')).toBe(preview);
  await view.render({...held,ownerUsername:'foreign_creator'});
  expect(lookup).toHaveBeenLastCalledWith(held.originalDigest,'foreign_creator');
  expect(view.host.querySelector('img')?.getAttribute('src')).toBe(held.artworkUrl);
  expect(view.parses()).toBe(3);expect(view.fetcher).not.toHaveBeenCalled();
 }finally{view.close();}
});
