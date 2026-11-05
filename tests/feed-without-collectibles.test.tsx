// @vitest-environment happy-dom
import {act,type ReactNode} from 'react';
import {createRoot} from 'react-dom/client';
import {renderToStaticMarkup} from 'react-dom/server';
import {afterEach,expect,it,vi} from 'vitest';
import type {PublicMarketCatalog,PublicMarketItem} from '../src/receiz/public-market';
import {PublicFeed} from '../src/public-feed/PublicFeed';
import {MarketFeedPopover} from '../src/features/market/MarketFeedPopover';
import * as feedItems from '../src/public-feed/feed-items';
import {renderFeedState} from '../scripts/feed-page.mjs';
import type {ViteDevServer} from 'vite';

const state=vi.hoisted(()=>({listeners:new Set<(catalog:PublicMarketCatalog)=>void>(),prepare:vi.fn(async()=>[])}));
vi.mock('../src/components/Sheet',()=>({Sheet:({children}:{children:ReactNode})=><div>{children}</div>}));
vi.mock('../src/public-feed/feed-source',async original=>({...await original<typeof import('../src/public-feed/feed-source')>(),prepareFeedItems:state.prepare,subscribePreparedFeedCatalog:(listener:(catalog:PublicMarketCatalog)=>void)=>{state.listeners.add(listener);return()=>state.listeners.delete(listener);}}));
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
const item=(id:string,sports=false):PublicMarketItem=>({id,assetId:id,title:id,summary:'Public '+id,category:sports?'sports':'proof',mediaKind:'moment',ownerUsername:null,ownerDisplayName:null,ownerProfileUrl:null,sourceUrl:null,verifyUrl:null,originalUrl:null,originalDigest:null,pulse:null,sealedAt:null,priceUsd:null,changePct:null,chart:[],authority:'projection-only',canTrade:false});
const card=item('baseball-card',true),otherCard=item('other-baseball-card',true),work=item('authored-work');
const catalog=(items:PublicMarketItem[]):PublicMarketCatalog=>({items,complete:true,revision:'public-cohort',observedAt:null,sourceCount:items.length});
const visible=(host:ParentNode)=>[...host.querySelectorAll('[data-feed-item]')].map(row=>row.getAttribute('data-feed-item'));
afterEach(()=>{document.body.innerHTML='';state.listeners.clear();state.prepare.mockClear();vi.restoreAllMocks();vi.unstubAllGlobals();});

it('excludes sports from the actual first Feed render without changing the held public objects',()=>{
 const rows=[card,work,otherCard],markup=renderToStaticMarkup(<PublicFeed seed={rows} active={false} discover={false}/>),parsed=new DOMParser().parseFromString(markup,'text/html');
 expect(visible(parsed)).toEqual([work.id]);expect(parsed.querySelector('[data-feed-kind="collectible"]')).toBeNull();expect(rows).toEqual([card,work,otherCard]);
});

it('keeps subsequent discoveries and complete saved-cohort updates out of the Feed sequence, with zero reads',async()=>{
 const host=document.createElement('div'),root=createRoot(host),fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);
 try{
  await act(()=>root.render(<PublicFeed seed={[work]} discoveries={[work,card]} completeCatalog active discover={false}/>));expect(visible(host)).toEqual([work.id]);
  const next=item('next-authored-work');await act(()=>{for(const publish of state.listeners)publish(catalog([card,next,otherCard]));});expect(visible(host)).toEqual([next.id]);
  expect(fetcher).not.toHaveBeenCalled();expect(state.prepare).not.toHaveBeenCalled();
 }finally{act(()=>root.unmount());}
});

it('renders a useful empty Feed rather than a sports object when the supplied cohort has no eligible work',()=>{
 const parsed=new DOMParser().parseFromString(renderToStaticMarkup(<PublicFeed seed={[card,otherCard]} active={false} discover={false} onClose={()=>{}}/>),'text/html');
 expect(visible(parsed)).toEqual([]);expect(parsed.body.textContent).toContain('Make room for discovery.');expect(parsed.querySelector('[aria-label="Close feed"]')).not.toBeNull();
});

it('ordinary Market/Discover feed opening omits sports while explicit collectible inspection retains only the selected collectible',async()=>{
 const host=document.createElement('div'),root=createRoot(host),fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);
 try{
  await act(()=>root.render(<MarketFeedPopover items={[card,work,otherCard]} active onClose={()=>{}}/>));expect(visible(host)).toEqual([work.id]);
  await act(()=>root.render(<MarketFeedPopover key="selected" items={[card,work,otherCard]} selectedItemId={card.id} active onClose={()=>{}}/>));expect(visible(host)).toEqual([card.id,work.id]);expect(host.querySelector('[data-feed-item][aria-hidden="false"]')?.getAttribute('data-feed-item')).toBe(card.id);
  expect(host.querySelector('[aria-label="View asset"]')).not.toBeNull();expect(fetcher).not.toHaveBeenCalled();
 }finally{act(()=>root.unmount());}
});

function server(items:PublicMarketItem[]){return {ssrLoadModule:async(path:string)=>{
 if(path.endsWith('/PublicFeed.tsx'))return{PublicFeed};if(path.endsWith('/feed-items.ts'))return feedItems;if(path.endsWith('/public-market.ts'))return{parsePublicMarket:()=>catalog(items)};if(path.endsWith('/public-profile.ts'))return{publicProfileReservedNames:[]};if(path.endsWith('/PublicOwnerAvatar.tsx'))return{publicOwnerSealAvatar:()=>null};throw Error('Unexpected source '+path);
 }} as unknown as ViteDevServer;}
it('filters before the saved Feed first-eight selection and navigation fallback, without deleting catalog data',async()=>{
 const rows=[...Array.from({length:12},(_,i)=>item('sport-'+i,true)),...Array.from({length:10},(_,i)=>item('work-'+i))],snapshot=[...rows],result=await renderFeedState(server(rows));
 expect(result.seed).toHaveLength(8);expect(result.seed.every(row=>(row as PublicMarketItem).category==='proof')).toBe(true);expect(result.navigationContent).not.toContain('sport-');expect(result.content).not.toContain('data-feed-kind="collectible"');expect(rows).toEqual(snapshot);
});
it('can save an intentionally empty filtered Feed while retaining the existing genuinely empty-source refusal',async()=>{
 const result=await renderFeedState(server([card]));expect(result.seed).toEqual([]);expect(result.content).toContain('Make room for discovery.');
 await expect(renderFeedState(server([]))).rejects.toThrow('PUBLIC_FEED_SOURCE_EMPTY');
});
