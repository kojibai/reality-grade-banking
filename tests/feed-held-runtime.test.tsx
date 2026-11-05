// @vitest-environment happy-dom
import {act} from 'react';
import {renderToString} from 'react-dom/server';
import {afterEach,expect,it,vi} from 'vitest';
import type {Root} from 'react-dom/client';
import type {PublicMarketCatalog,PublicMarketItem} from '../src/receiz/public-market';
const state=vi.hoisted(()=>({roots:[] as Root[],creates:0,hydrates:0}));
vi.mock('react-dom/client',async original=>{const actual=await original<typeof import('react-dom/client')>();return {...actual,createRoot:(...args:Parameters<typeof actual.createRoot>)=>{state.creates++;const root=actual.createRoot(...args);state.roots.push(root);return root;},hydrateRoot:(...args:Parameters<typeof actual.hydrateRoot>)=>{state.hydrates++;const root=actual.hydrateRoot(...args);state.roots.push(root);return root;}};});
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
const item=(id:string,sports=false):PublicMarketItem=>({id,assetId:id,title:id,summary:id,category:sports?'sports':'proof',mediaKind:'moment',hasLongForm:true,ownerUsername:null,ownerDisplayName:null,ownerProfileUrl:null,sourceUrl:null,verifyUrl:null,originalUrl:null,originalDigest:null,pulse:null,sealedAt:null,priceUsd:null,changePct:null,chart:[],authority:'projection-only',canTrade:false});
const catalog=(names:string[]):PublicMarketCatalog=>({items:names.map(id=>item(id)),complete:true,revision:names.join(','),observedAt:null,sourceCount:names.length});
function markup(){document.body.innerHTML='<div id="root"><p>Held Bank entry</p></div><script id="receiz-navigation" type="application/json">{}</script>';}
function root(){const element=document.createElement('div');element.id='public-feed-root';element.dataset.publicRuntime='feed';document.body.insertBefore(element,document.getElementById('receiz-navigation'));return element;}
afterEach(async()=>{for(const value of state.roots.splice(0))await act(()=>value.unmount());state.creates=state.hydrates=0;document.body.innerHTML='';vi.restoreAllMocks();vi.unstubAllGlobals();history.replaceState(null,'','/');});

it('imports Feed on Bank without hydrating or changing the account root',async()=>{
 vi.resetModules();markup();const bank=document.getElementById('root'),first=bank!.firstElementChild;await import('../src/public-feed/main');expect(state.creates).toBe(0);expect(state.hydrates).toBe(0);expect(bank!.firstElementChild).toBe(first);
});
it('mounts the actual Feed from the exact full held family without a read and preserves the no-sports sequence',async()=>{
 vi.resetModules();markup();const api=await import('../src/public-feed/main'),source=await import('../src/public-feed/feed-source'),host=root(),current=catalog(Array.from({length:16},(_,i)=>'Original '+i));current.items.unshift(item('Baseball card',true));const held={catalog:current,generation:'a'.repeat(64)},fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);
 expect(api.mountHeldPublicDocument).toBeTypeOf('function');await act(()=>{api.mountHeldPublicDocument(host,held);});
 expect(host.querySelector('[data-feed-item][aria-hidden="false"]')?.getAttribute('data-feed-item')).toBe('Original 0');expect(host.querySelector('[data-feed-kind="collectible"]')).toBeNull();
 const marker=document.getElementById('receiz-navigation') as HTMLElement&{publicDiscoveryDocument:()=>typeof held};expect(marker.publicDiscoveryDocument().catalog).toBe(current);
 const ordered=await source.prepareFeedItems(),scroll=host.querySelector('.feed-scroll');await act(()=>{api.mountHeldPublicDocument(host,held);});expect(host.querySelector('.feed-scroll')).toBe(scroll);expect(await source.prepareFeedItems()).toBe(ordered);expect(state.creates).toBe(1);expect(state.hydrates).toBe(0);expect(fetcher).not.toHaveBeenCalled();
});
it('returns to the same Feed/filter with the actual selected Bank successor and withdrawals, irrespective of capture-date order',async()=>{
 vi.resetModules();markup();const api=await import('../src/public-feed/main'),host=root(),old=catalog(['Withdrawn work']),latest=catalog(['Current work']),listeners=new Set<()=>void>(),fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);old.observedAt='2026-11-05T14:00:00Z';latest.observedAt='2026-11-05T12:00:00Z';let selected={catalog:old,generation:'a'.repeat(64)};
 Object.assign(document.getElementById('receiz-navigation')!,{publicMarketDocument:()=>selected,subscribePublicMarketDocument:(listener:()=>void)=>{listeners.add(listener);return()=>listeners.delete(listener);}});
 await act(()=>{api.mountHeldPublicDocument(host,selected);});const scroll=host.querySelector('.feed-scroll');await act(()=>host.querySelector<HTMLButtonElement>('[aria-label="Browse feed"]')!.click());await act(()=>[...host.querySelectorAll<HTMLButtonElement>('.feed-filters button')].find(button=>button.textContent==='Essays')!.click());
 await act(()=>{host.hidden=true;dispatchEvent(new Event('receiz-bank:surface'));});selected={catalog:latest,generation:'b'.repeat(64)};await act(()=>{for(const listener of listeners)listener();});await act(()=>{host.hidden=false;dispatchEvent(new Event('receiz-bank:surface'));});
 expect(host.querySelector('.feed-scroll')).toBe(scroll);expect(host.textContent).toContain('Current work');expect(host.textContent).not.toContain('Withdrawn work');await act(()=>host.querySelector<HTMLButtonElement>('[aria-label="Browse feed"]')!.click());expect([...host.querySelectorAll<HTMLButtonElement>('.feed-filters button')].find(button=>button.textContent==='Essays')?.getAttribute('aria-pressed')).toBe('true');expect(state.creates).toBe(1);expect(fetcher).not.toHaveBeenCalled();
});
it('hydrates the normal saved Feed once after a prior Bank-side module import, preserving its existing SSR nodes',async()=>{
 vi.resetModules();markup();const api=await import('../src/public-feed/main'),{PublicFeed}=await import('../src/public-feed/PublicFeed'),host=root(),current=catalog(['Saved work']);host.hidden=true;
 host.innerHTML=renderToString(<PublicFeed seed={current.items} active={false} completeCatalog/>,{identifierPrefix:'public-feed-'})+'<script id="public-market-seed" type="application/json">'+JSON.stringify({schema:'bank.public-market.document.v1',generation:'c'.repeat(64),path:'feed',catalog:current,visibleCount:1,asOfPulse:14900000,format:{locale:'en-US',timeZone:'UTC'}})+'</script>';
 const first=host.firstElementChild,errors=vi.spyOn(console,'error').mockImplementation(()=>{}),fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);expect(api.mountPublicDocument).toBeTypeOf('function');await act(()=>{api.mountPublicDocument(host);});await act(()=>{api.mountPublicDocument(host);});expect(host.firstElementChild).toBe(first);expect(host.textContent).toContain('Saved work');expect(state.hydrates).toBe(1);expect(state.creates).toBe(0);expect(errors).not.toHaveBeenCalled();expect(fetcher).not.toHaveBeenCalled();
});
