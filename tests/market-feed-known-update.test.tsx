// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {afterEach,expect,it,vi} from 'vitest';
import {parsePublicMarket,type PublicMarketItem} from '../src/receiz/public-market';
import {mergePublicSports} from '../src/receiz/public-sports';
import {appendFeedItems,refreshFeedItems} from '../src/public-feed/feed-items';
import {PublicFeed} from '../src/public-feed/PublicFeed';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
afterEach(()=>{vi.unstubAllGlobals();vi.restoreAllMocks();});
const row=(id:string,mediaKind:PublicMarketItem['mediaKind']='moment'):PublicMarketItem=>({id,assetId:id,title:id,summary:'Exact held words',category:'proof',mediaKind,ownerUsername:'fixture',ownerDisplayName:'Fixture',ownerProfileUrl:null,sourceUrl:null,verifyUrl:null,originalUrl:null,originalDigest:'a'.repeat(64),pulse:'15114807',sealedAt:null,priceUsd:1,changePct:0,chart:[],authority:'projection-only',canTrade:false});
it('refreshes every exact already-held public row without running diversity ordering again',()=>{
 const packet=JSON.parse(readFileSync(resolve('public/receiz-public-market.json'),'utf8'));
 const sports=JSON.parse(readFileSync(resolve('public/receiz-public-sports.json'),'utf8'));
 const catalog=mergePublicSports(parsePublicMarket(packet,packet.snapshot),sports);expect(catalog.items.length).toBeGreaterThan(4000);
 let orderingReads=0;const updates=catalog.items.map(item=>new Proxy(item,{get(target,key,receiver){if(key==='mediaKind')orderingReads++;return Reflect.get(target,key,receiver);}}));
 const result=refreshFeedItems(catalog.items,updates);
 expect(result.map(item=>item.id)).toEqual(catalog.items.map(item=>item.id));
 result.forEach((item,index)=>expect(item).toBe(updates[index]));
 expect(orderingReads).toBe(0);
});
it('keeps settled order, exact Source refusals and existing mixed-kind addition ordering',()=>{
 const held=[row('held-image','image'),row('held-moment')],updated={...held[0],title:'Accepted updated title',priceUsd:2},foreign={...held[1],assetId:'different-source',title:'Foreign source'};
 const next=[row('new-image','image'),row('new-image-2','image'),row('new-audio','audio'),row('new-moment')];
 const result=refreshFeedItems(held,[updated,foreign,...next,next[0]]);
 expect(result.map(item=>item.id)).toEqual(['held-image','held-moment','new-audio','new-image','new-moment','new-image-2']);
 expect(result[0]).toBe(updated);expect(result[1]).toBe(held[1]);
 expect(appendFeedItems(held,[updated,foreign])).toEqual(held);
 expect(refreshFeedItems(held,[])).toEqual(held);
});
it('refreshes a closed Feed with one existing list index and preserves its mounted viewport',async()=>{
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host),first=row('first'),second=row('second');
 const fetcher=vi.fn(()=>{throw Error('unexpected external read');});vi.stubGlobal('fetch',fetcher);
 let indexes=0;const observe=(items:PublicMarketItem[])=>new Proxy(items,{get(target,key,receiver){if(key==='map')return (...args:Parameters<typeof target.map>)=>{const output=Array.prototype.map.apply(target,args);if(output.every(value=>Array.isArray(value)&&value.length===2))indexes++;return output;};return Reflect.get(target,key,receiver);}});
 try{
  await act(async()=>root.render(<PublicFeed seed={[first,second]} discoveries={observe([first,second])} active={false} discover={false}/>));
  const scroll=host.querySelector('.feed-scroll'),current=host.querySelector('[data-feed-item="first"]');indexes=0;
  const updated={...first,title:'Accepted stronger title',summary:'Accepted stronger public words'};
  await act(async()=>root.render(<PublicFeed seed={[first,second]} discoveries={observe([updated,second])} active={false} discover={false}/>));
  expect(indexes).toBe(1);expect(host.querySelector('.feed-scroll')).toBe(scroll);expect(host.querySelector('[data-feed-item="first"]')).toBe(current);
  expect(current?.textContent).toContain('Accepted stronger public words');expect(host.querySelectorAll('[data-feed-item]').length).toBeLessThanOrEqual(3);
  expect(fetcher).not.toHaveBeenCalled();
 }finally{act(()=>root.unmount());host.remove();}
});
