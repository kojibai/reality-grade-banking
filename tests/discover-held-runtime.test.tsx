// @vitest-environment happy-dom
import {act} from 'react';
import {renderToString} from 'react-dom/server';
import {afterEach,expect,it,vi} from 'vitest';
import type {Root} from 'react-dom/client';
import type {PublicMarketCatalog,PublicMarketItem} from '../src/receiz/public-market';
const state=vi.hoisted(()=>({roots:[] as Root[],creates:0,hydrates:0}));
vi.mock('react-dom/client',async original=>{const actual=await original<typeof import('react-dom/client')>();return {...actual,createRoot:(...args:Parameters<typeof actual.createRoot>)=>{state.creates++;const root=actual.createRoot(...args);state.roots.push(root);return root;},hydrateRoot:(...args:Parameters<typeof actual.hydrateRoot>)=>{state.hydrates++;const root=actual.hydrateRoot(...args);state.roots.push(root);return root;}};});
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
const item=(id:string):PublicMarketItem=>({id,assetId:id,title:id,summary:id,category:'proof',mediaKind:'moment',ownerUsername:null,ownerDisplayName:null,ownerProfileUrl:null,sourceUrl:null,verifyUrl:null,originalUrl:null,originalDigest:null,pulse:null,sealedAt:null,priceUsd:null,changePct:null,chart:[],authority:'projection-only',canTrade:false});
const catalog=(names:string[]):PublicMarketCatalog=>({items:names.map(item),complete:true,revision:names.join(','),observedAt:null,sourceCount:names.length});
function markup(){document.body.innerHTML='<div id="root"><p>Bank account entry stays here</p></div><script id="receiz-navigation" type="application/json">{}</script>';}
function root(){const element=document.createElement('div');element.id='public-discover-root';element.dataset.publicRuntime='discover';document.body.insertBefore(element,document.getElementById('receiz-navigation'));return element;}
afterEach(async()=>{for(const value of state.roots.splice(0))await act(()=>value.unmount());state.creates=state.hydrates=0;document.body.innerHTML='';vi.restoreAllMocks();vi.unstubAllGlobals();history.replaceState(null,'','/');});

it('imports on Bank without auto-mounting or waiting on the account root',async()=>{
 vi.resetModules();markup();const bank=document.getElementById('root'),held=bank!.firstElementChild,fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);
 await import('../src/public-discover/main');expect(state.creates).toBe(0);expect(state.hydrates).toBe(0);expect(bank!.firstElementChild).toBe(held);expect(fetcher).not.toHaveBeenCalled();
});

it('mounts the actual Discover synchronously from the exact full held catalog with no HTML/source read, then reuses its store/root',async()=>{
 vi.resetModules();markup();const api=await import('../src/public-discover/main'),source=await import('../src/public-feed/feed-source'),host=root(),current=catalog(Array.from({length:16},(_,i)=>'Held work '+i)),fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);
 expect(api.mountHeldPublicDocument).toBeTypeOf('function');
 await act(()=>{api.mountHeldPublicDocument(host,{catalog:current,generation:'a'.repeat(64)});});
 expect(host.querySelectorAll('.discover-work')).toHaveLength(16);expect(host.textContent).toContain('Held work 15');expect(state.creates).toBe(1);expect(state.hydrates).toBe(0);
 const marker=document.getElementById('receiz-navigation') as HTMLElement&{publicDiscoveryDocument:()=>{catalog:PublicMarketCatalog;generation:string}};
 expect(marker.publicDiscoveryDocument().catalog).toBe(current);expect(marker.publicDiscoveryDocument().generation).toBe('a'.repeat(64));
 const held=await source.prepareFeedItems(),input=host.querySelector('input'),notify=vi.fn(),unsubscribe=source.subscribePreparedFeedCatalog(notify);notify.mockClear();
 await act(()=>{api.mountHeldDiscovery(host,current,'a'.repeat(64));});expect(host.querySelector('input')).toBe(input);expect(state.creates).toBe(1);expect(await source.prepareFeedItems()).toBe(held);expect(notify).not.toHaveBeenCalled();expect(fetcher).not.toHaveBeenCalled();unsubscribe();
});

it('adopts the latest complete cohort by removal into the same actual Discover instead of appending withdrawn rows',async()=>{
 vi.resetModules();markup();const api=await import('../src/public-discover/main'),host=root(),fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);
 await act(()=>{api.mountHeldDiscovery(host,catalog(['Withdrawn work','Retained work']),'a'.repeat(64));});const input=host.querySelector('input');
 const latest=catalog(['Newest work']);await act(()=>{api.mountHeldDiscovery(host,latest,'b'.repeat(64));});
 expect(host.querySelector('input')).toBe(input);expect(host.textContent).toContain('Newest work');expect(host.textContent).not.toContain('Withdrawn work');expect(host.textContent).not.toContain('Retained work');expect(state.creates).toBe(1);expect(fetcher).not.toHaveBeenCalled();
});

it('reuses the selected Bank family before initial effects and on retained return, preserving search and withdrawals with zero reads',async()=>{
 vi.resetModules();markup();const api=await import('../src/public-discover/main'),host=root(),old=catalog(['Withdrawn work']),latest=catalog(['New bank work']),listeners=new Set<()=>void>(),fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);
 old.observedAt='2026-11-05T12:00:00Z';latest.observedAt='2026-11-05T13:00:00Z';let bank={catalog:latest,generation:'b'.repeat(64)};
 Object.assign(document.getElementById('receiz-navigation')!,{publicMarketDocument:()=>bank,subscribePublicMarketDocument:(listener:()=>void)=>{listeners.add(listener);return()=>listeners.delete(listener);}});
 await act(()=>{api.mountHeldDiscovery(host,old,'a'.repeat(64));});expect(host.textContent).toContain('New bank work');expect(host.textContent).not.toContain('Withdrawn work');
 const input=host.querySelector('input')!;await act(()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(input,'New');input.dispatchEvent(new Event('input',{bubbles:true}));});
 await act(()=>{host.hidden=true;dispatchEvent(new Event('receiz-bank:surface'));});const next=catalog(['New successor work']);next.observedAt='2026-11-05T14:00:00Z';bank={catalog:next,generation:'c'.repeat(64)};
 await act(()=>{for(const listener of listeners)listener();});await act(()=>{host.hidden=false;dispatchEvent(new Event('receiz-bank:surface'));});
 expect(host.querySelector('input')).toBe(input);expect(input.value).toBe('New');expect(host.textContent).toContain('New successor work');expect(host.textContent).not.toContain('New bank work');expect(state.creates).toBe(1);expect(fetcher).not.toHaveBeenCalled();
 bank={catalog:{...old,complete:false},generation:'a'.repeat(64)};await act(()=>{for(const listener of listeners)listener();});expect(host.textContent).toContain('New successor work');expect(fetcher).not.toHaveBeenCalled();
});

it('keeps the actually selected complete Bank successor with withdrawals even when its capture date is older than saved Discover',async()=>{
 vi.resetModules();markup();const api=await import('../src/public-discover/main'),host=root(),previous=catalog(['Withdrawn later-capture work']),current=catalog(['Current earlier-capture work']),listeners=new Set<()=>void>(),fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);
 previous.observedAt='2026-11-05T14:00:00Z';current.observedAt='2026-11-05T12:00:00Z';let bank:{catalog:PublicMarketCatalog;generation:string}|null=null;
 Object.assign(document.getElementById('receiz-navigation')!,{publicMarketDocument:()=>bank,subscribePublicMarketDocument:(listener:()=>void)=>{listeners.add(listener);return()=>listeners.delete(listener);}});
 await act(()=>{api.mountHeldDiscovery(host,previous,'b'.repeat(64));});const input=host.querySelector('input');bank={catalog:current,generation:'c'.repeat(64)};
 await act(()=>{for(const listener of listeners)listener();});expect(host.textContent).toContain('Current earlier-capture work');expect(host.textContent).not.toContain('Withdrawn later-capture work');expect(host.querySelector('input')).toBe(input);expect(state.creates).toBe(1);expect(fetcher).not.toHaveBeenCalled();
});

it('adopts a distinct actual full Bank catalog at the same material generation, then reuses its exact reference without notification or reordering',async()=>{
 vi.resetModules();markup();const api=await import('../src/public-discover/main'),source=await import('../src/public-feed/feed-source'),host=root(),originals=catalog(['Original work']),full={...originals,items:[...originals.items,{...item('Held collectible'),category:'sports' as const}]},generation='e'.repeat(64),notify=vi.fn();
 await act(()=>{api.mountHeldDiscovery(host,originals,generation);});const unsubscribe=source.subscribePreparedFeedCatalog(notify);notify.mockClear();
 await act(()=>{api.mountHeldDiscovery(host,full,generation);});const marker=document.getElementById('receiz-navigation') as HTMLElement&{publicDiscoveryDocument:()=>{catalog:PublicMarketCatalog;generation:string}};
 expect(marker.publicDiscoveryDocument().catalog).toBe(full);expect(host.textContent).toContain('Held collectible');expect(notify).toHaveBeenCalledExactlyOnceWith(full);const ordered=await source.prepareFeedItems();notify.mockClear();
 await act(()=>{api.mountHeldDiscovery(host,full,generation);});expect(await source.prepareFeedItems()).toBe(ordered);expect(notify).not.toHaveBeenCalled();expect(state.creates).toBe(1);unsubscribe();
});

it('still hydrates a normal saved Discover once, including fallback mounting after an earlier Bank-side module import',async()=>{
 vi.resetModules();markup();const api=await import('../src/public-discover/main'),{Discover}=await import('../src/public-discover/Discover'),host=root(),current=catalog(['Saved SSR work']);host.hidden=true;
 host.innerHTML=renderToString(<Discover seed={current.items} active={false} completeCatalog/>,{identifierPrefix:'public-discover-'})+'<script id="public-market-seed" type="application/json">'+JSON.stringify({schema:'bank.public-market.document.v1',generation:'c'.repeat(64),path:'discover',catalog:current,visibleCount:1,asOfPulse:14900000,format:{locale:'en-US',timeZone:'UTC'}})+'</script>';
 const first=host.firstElementChild,errors=vi.spyOn(console,'error').mockImplementation(()=>{}),fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);
 expect(api.mountPublicDocument).toBeTypeOf('function');await act(()=>{api.mountPublicDocument(host);});await act(()=>{api.mountPublicDocument(host);});expect(host.firstElementChild).toBe(first);expect(host.textContent).toContain('Saved SSR work');expect(state.hydrates).toBe(1);expect(state.creates).toBe(0);expect(errors).not.toHaveBeenCalled();expect(fetcher).not.toHaveBeenCalled();
});
