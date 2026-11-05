// @vitest-environment happy-dom
import {createHash} from 'node:crypto';
import {expect,it,vi} from 'vitest';
import {act} from 'react';
import {hydrateRoot} from 'react-dom/client';
import {renderPreparedDependentDocument} from '../server/prepared-dependent-documents';
import {PublicFeed} from '../src/public-feed/PublicFeed';
import {Discover} from '../src/public-discover/Discover';
import {orderFeedItems} from '../src/public-feed/feed-items';
import {orderDiscoveryItems} from '../src/public-discover/discovery-index';
import {readPreparedFeedCatalog,prepareFeedItems} from '../src/public-feed/feed-source';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
const row=(id:string,title:string)=>({id:'profile:example:'+id,receizId:id,title,summary:title+' exact claim.',visibility:'public',ownerUsername:'example',profileOriginal:{media:null}});
function input(path:'feed'|'discover',originals=[row('new','New accepted Original'),row('held','Existing public Original')]){
 const material=JSON.stringify({membership:{ok:true,transport:{generatedAt:'2026-11-04T20:00:00Z',publicMembership:{version:1,scope:'whole-market-visible-showcase',source:'canonical-complete',isComplete:true,itemCount:originals.length,revision:'accepted-B'},publicOriginals:originals}},marketPrepared:{schema:'bank.public-market.prepared.v1',asOfPulse:14900000}}),runtime=path==='feed'?'feed':'discover';
 const navigation={reserved:['feed','discover'],styles:[],bank:{head:'',entry:'/assets/bank.js',content:'Frozen entry'},pages:{'/explore/':{head:'',content:'old Market',runtime:'explore'},'/feed/':{head:'',content:'old Feed',runtime:'feed'},'/discover/':{head:'',content:'old Discover',runtime:'discover'}}};
 return {path,material,generation:createHash('sha256').update(material).digest('hex'),template:`<!doctype html><html><head><title>${path}</title></head><body><div id="public-${runtime}-root" data-public-runtime="${runtime}"><p>Older shipped work</p></div><script id="public-${path==='feed'?'feed':'discovery'}-seed" type="application/json">[]</script><script id="receiz-navigation" type="application/json">${JSON.stringify(navigation)}</script></body></html>`};
}
for(const path of ['feed','discover'] as const)it(`prepares current ${path} HTML from the same accepted material without rereading the shipped catalog`,async()=>{
 const fetcher=vi.spyOn(globalThis,'fetch').mockRejectedValue(Error('NO_SOURCE_OR_SHIPPED_READ'));
 try{
  const html=await renderPreparedDependentDocument(input(path));
  expect(html).toContain('New accepted Original');expect(html).toContain('Existing public Original');expect(html).not.toContain('Older shipped work');
  const parsed=new DOMParser().parseFromString(html,'text/html'),seed=JSON.parse(parsed.getElementById('public-market-seed')!.textContent!);
  expect(seed.catalog.complete).toBe(true);expect(seed.catalog.items.map((item:{assetId:string})=>item.assetId)).toEqual(['new','held']);expect(fetcher).not.toHaveBeenCalled();
  const withdrawn=await renderPreparedDependentDocument(input(path,[row('new','New accepted Original')]));expect(withdrawn).not.toContain('Existing public Original');
 }finally{fetcher.mockRestore();}
});
it('refuses an unsupported prepared-state schema even when its display pulse and catalog are well formed',async()=>{
 const value=input('feed'),body=JSON.parse(value.material);body.marketPrepared.schema='unsupported-state';const material=JSON.stringify(body);
 await expect(renderPreparedDependentDocument({...value,material,generation:createHash('sha256').update(material).digest('hex')})).rejects.toThrow('PUBLIC_DISCOVERY_COMPLETE_CATALOG_REQUIRED');
});
for(const path of ['feed','discover'] as const)it(`hydrates the current ${path} DOM without the older shipped catalog or withdrawn rows`,async()=>{
 const html=await renderPreparedDependentDocument(input(path,[row('new','New accepted Original')]));document.body.innerHTML=new DOMParser().parseFromString(html,'text/html').body.innerHTML;
 const host=document.getElementById(`public-${path}-root`)!,first=host.firstElementChild,catalog=path==='feed'?readPreparedFeedCatalog(host,path)!:null;
 const seed=path==='feed'?orderFeedItems(catalog!.items).slice(0,8):JSON.parse(document.getElementById('public-discovery-seed')!.textContent!),fetcher=vi.spyOn(globalThis,'fetch').mockRejectedValue(Error('NO_OLD_SHIPPED_OR_SOURCE_READ')),errors=vi.spyOn(console,'error').mockImplementation(()=>{});
 let root:ReturnType<typeof hydrateRoot>|undefined;
 try{
  await act(async()=>{root=hydrateRoot(host,path==='feed'?<PublicFeed seed={seed} active completeCatalog/>:<Discover seed={seed} active={false}/>,{identifierPrefix:path==='feed'?'public-feed-':'public-discover-'});await new Promise(resolve=>setTimeout(resolve,40));});
  expect(host.firstElementChild).toBe(first);expect(host.textContent).toContain('New accepted Original');expect(host.textContent).not.toContain('Existing public Original');if(path==='feed')expect((await prepareFeedItems()).map(item=>item.assetId)).toEqual(['new']);else expect(seed.map((item:{assetId:string})=>item.assetId)).toEqual(['new']);expect(fetcher).not.toHaveBeenCalled();expect(errors).not.toHaveBeenCalled();
 }finally{if(root)await act(()=>root!.unmount());fetcher.mockRestore();errors.mockRestore();document.body.innerHTML='';}
});
for(const path of ['feed'] as Array<'feed'|'discover'>)it(`updates a retained ${path} from a new saved cohort without reviving withdrawals or replacing its root`,async()=>{
 document.body.innerHTML=new DOMParser().parseFromString(await renderPreparedDependentDocument(input(path)),'text/html').body.innerHTML;
 const host=document.getElementById(`public-${path}-root`)!,first=host.firstElementChild,catalog=readPreparedFeedCatalog(host,path)!,seed=(path==='feed'?orderFeedItems(catalog.items):orderDiscoveryItems(catalog.items)).slice(0,path==='feed'?8:12);
 const fetcher=vi.spyOn(globalThis,'fetch').mockRejectedValue(Error('NO_SHIPPED_READ')),errors=vi.spyOn(console,'error').mockImplementation(()=>{});let root:ReturnType<typeof hydrateRoot>|undefined;
 try{
  await act(async()=>{root=hydrateRoot(host,path==='feed'?<PublicFeed seed={seed} active completeCatalog/>:<Discover seed={seed} active={false}/>,{identifierPrefix:path==='feed'?'public-feed-':'public-discover-'});await new Promise(resolve=>setTimeout(resolve,30));});
  const retained=path==='discover'?host.querySelector<HTMLInputElement>('input[type="search"]'):host.querySelector<HTMLElement>('.feed-scroll');
  if(retained&&path==='discover')await act(()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(retained,'New');retained.dispatchEvent(new Event('input',{bubbles:true}));});
  const next=new DOMParser().parseFromString(await renderPreparedDependentDocument(input(path,[row('new','New accepted Original')])),'text/html').getElementById(`public-${path}-root`)!;
  await act(()=>dispatchEvent(new CustomEvent('bankeiz:prepared-discovery',{detail:{root:next,path}})));
  expect(host.firstElementChild).toBe(first);expect(host.textContent).not.toContain('Existing public Original');
  if(path==='discover'){expect(host.querySelector('input')).toBe(retained);expect((retained as HTMLInputElement).value).toBe('New');}
  expect(fetcher).not.toHaveBeenCalled();expect(errors).not.toHaveBeenCalled();
 }finally{if(root)await act(()=>root!.unmount());fetcher.mockRestore();errors.mockRestore();document.body.innerHTML='';}
});

it('keeps passive Discover producer data complete while the old runtime hydrates exactly its 12 visible SSR items',async()=>{
 const originals=Array.from({length:16},(_,index)=>row('item-'+index,'Public Original '+index)),value=input('discover',originals);
 const fetcher=vi.spyOn(globalThis,'fetch').mockRejectedValue(Error('NO_SOURCE_READ'));
 try{
  const html=await renderPreparedDependentDocument(value),doc=new DOMParser().parseFromString(html,'text/html'),host=doc.getElementById('public-discover-root')!;
  const full=JSON.parse(doc.getElementById('public-market-seed')!.textContent!),legacy=JSON.parse(doc.getElementById('public-discovery-seed')!.textContent!);
  expect(full.generation).toBe(value.generation);expect(full.catalog.complete).toBe(true);expect(full.catalog.items).toHaveLength(16);
  expect(legacy).toHaveLength(12);expect(legacy.map((item:{assetId:string})=>item.assetId)).toEqual(orderDiscoveryItems(full.catalog.items).slice(0,12).map(item=>item.assetId));
  expect(host.querySelectorAll('.discover-work')).toHaveLength(12);expect(host.querySelector('script')).toBeNull();
  const navigation=JSON.parse(doc.getElementById('receiz-navigation')!.textContent!);expect(navigation.pages['/discover/'].content).toContain('public-discovery-seed');
  expect(navigation.pages['/discover/'].preparedBuild).toBeUndefined();expect(navigation.pages['/discover/'].preparedRevision).toBeUndefined();expect(fetcher).not.toHaveBeenCalled();
 }finally{fetcher.mockRestore();}
});
