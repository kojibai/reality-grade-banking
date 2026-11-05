// @vitest-environment happy-dom
import {act} from 'react';
import {renderToString} from 'react-dom/server';
import {afterEach,expect,it,vi} from 'vitest';
import type {Root} from 'react-dom/client';
import type {PublicMarketCatalog,PublicMarketItem} from '../src/receiz/public-market';
const state=vi.hoisted(()=>({roots:[] as Root[],publications:new Set<(catalog?:PublicMarketCatalog)=>void>()}));
vi.mock('react-dom/client',async original=>{const actual=await original<typeof import('react-dom/client')>();return {...actual,hydrateRoot:(...args:Parameters<typeof actual.hydrateRoot>)=>{const root=actual.hydrateRoot(...args);state.roots.push(root);return root;}};});
vi.mock('../src/receiz/asset-publication-adoption',async original=>({...await original<typeof import('../src/receiz/asset-publication-adoption')>(),subscribeAssetPublicationAdmissions:(listener:(catalog?:PublicMarketCatalog)=>void)=>{state.publications.add(listener);return()=>state.publications.delete(listener);}}));
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
const item=(id:string,title:string):PublicMarketItem=>({id,assetId:id,title,summary:title,category:'proof',mediaKind:'moment',ownerUsername:'example',ownerDisplayName:'Example',ownerProfileUrl:null,sourceUrl:null,verifyUrl:null,originalUrl:null,originalDigest:null,pulse:null,sealedAt:null,priceUsd:null,changePct:null,chart:[],authority:'projection-only',canTrade:false});
const withdrawn=item('withdrawn','Withdrawn Original'),current=item('current','Current accepted Original');
function catalog(items:PublicMarketItem[],observedAt:string):PublicMarketCatalog{return {items,observedAt,complete:true,revision:observedAt,sourceCount:items.length};}
function prepared(path:string,items:PublicMarketItem[],observedAt:string){const root=document.createElement('div'),seed=document.createElement('script');seed.id='public-market-seed';seed.textContent=JSON.stringify({schema:'bank.public-market.document.v1',generation:'b'.repeat(64),path,catalog:catalog(items,observedAt),visibleCount:items.length,asOfPulse:14900000,format:{locale:'en-US',timeZone:'UTC'}});root.append(seed);return root;}
afterEach(async()=>{for(const root of state.roots.splice(0))await act(()=>root.unmount());document.body.innerHTML='';state.publications.clear();vi.restoreAllMocks();});
for(const path of ['feed'] as Array<'feed'|'discover'>)it(`promotes a retained legacy ${path} to the fresh prepared cohort before reactivation`,async()=>{
 vi.resetModules();const source=await import('../src/public-feed/feed-source');
 const element=path==='feed'?await(async()=>{const {PublicFeed}=await import('../src/public-feed/PublicFeed');return <PublicFeed seed={[withdrawn]} active={false}/>;})():await(async()=>{const {Discover}=await import('../src/public-discover/Discover');return <Discover seed={[withdrawn]} active={false}/>;})();
 document.body.innerHTML=`<div id="public-${path}-root" data-public-runtime="${path}" hidden>${renderToString(element,{identifierPrefix:path==='feed'?'public-feed-':'public-discover-'})}<script id="public-${path==='feed'?'feed':'discovery'}-seed" type="application/json">${JSON.stringify([withdrawn])}</script></div><script id="receiz-navigation" type="application/json">{}</script>`;
 const host=document.getElementById(`public-${path}-root`)!,first=host.firstElementChild,fetcher=vi.spyOn(globalThis,'fetch').mockRejectedValue(Error('NO_OLD_SHIPPED_READ'));
 await act(async()=>{if(path==='feed')await import('../src/public-feed/main');else await import('../src/public-discover/main');});
 await act(()=>source.readPreparedFeedCatalog(prepared(path,[current],'2026-11-04T20:00:00Z'),path));
 await act(async()=>{host.hidden=false;dispatchEvent(new Event('receiz-bank:surface'));await new Promise(resolve=>setTimeout(resolve,40));});
 expect(host.firstElementChild).toBe(first);expect(host.textContent).toContain('Current accepted Original');expect(host.textContent).not.toContain('Withdrawn Original');expect(fetcher).not.toHaveBeenCalled();
});
it('keeps the prepared observation fence above a delayed older confirmed publication catalog',async()=>{
 vi.resetModules();const {PublicFeed}=await import('../src/public-feed/PublicFeed'),{readPreparedFeedCatalog}=await import('../src/public-feed/feed-source'),{createRoot}=await import('react-dom/client');
 readPreparedFeedCatalog(prepared('feed',[current],'2026-11-04T20:00:00Z'),'feed');const host=document.createElement('div');document.body.append(host);const root=createRoot(host);state.roots.push(root);
 await act(async()=>root.render(<PublicFeed seed={[current]} active={false} completeCatalog/>));
 await act(()=>{for(const listener of state.publications)listener(catalog([withdrawn],'2026-11-04T19:00:00Z'));});
 expect(host.textContent).toContain('Current accepted Original');expect(host.textContent).not.toContain('Withdrawn Original');
});
