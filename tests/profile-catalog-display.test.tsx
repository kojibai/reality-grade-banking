// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import type {usePublicMarket as PublicMarketHook} from '../src/receiz/usePublicMarket';

Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
const roots:Root[]=[];
const membership=(title:string)=>({ok:true,transport:{publicMembership:{version:1,scope:'whole-market-visible-showcase',source:'canonical-complete',isComplete:true,itemCount:1,revision:title},publicOriginals:[{id:'profile:alexmorgan:original',receizId:'original',title,visibility:'public',ownerUsername:'alexmorgan',ownerUserId:'account-1',ownerCreatedAt:'2026-10-20T10:00:00Z',profileOriginal:{media:null}}]}});
function localCache(value:Response|null,paused=false){
 let release!:()=>void;const ready=paused?new Promise<void>(resolve=>{release=resolve;}):Promise.resolve(),jsonReads=vi.fn();
 const port={match:vi.fn(async(_key:string)=>{await ready;const response=value?.clone();if(response){const json=response.json.bind(response);response.json=()=>{jsonReads();return json();};}return response??undefined;}),put:vi.fn(),delete:vi.fn()};
 vi.stubGlobal('caches',{open:vi.fn(async()=>port)});return {port,jsonReads,release:()=>release?.()};
}
async function display(){
 const {usePublicMarket}=await import('../src/receiz/usePublicMarket');let state!:ReturnType<typeof PublicMarketHook>;const paints:string[]=[];
 function Probe({visible=true}:{visible?:boolean}){state=usePublicMarket(false,visible,undefined,true);const title=state.historyCatalog?.items.map(item=>item.title).join(',')??'missing';paints.push(title);return <p>{title}</p>;}
 const host=document.createElement('section');document.body.append(host);const root=createRoot(host);roots.push(root);await act(()=>root.render(<Probe/>));return {host,root,Probe,paints,read:()=>state};
}
beforeEach(()=>{vi.resetModules();vi.useFakeTimers();vi.setSystemTime(new Date('2026-11-05T18:00:00Z'));localStorage.clear();history.replaceState(null,'','/alexmorgan/');document.body.innerHTML='<script id="receiz-navigation" type="application/json">{}</script>';});
afterEach(async()=>{for(const root of roots.splice(0))await act(()=>root.unmount());vi.useRealTimers();vi.restoreAllMocks();vi.unstubAllGlobals();localStorage.clear();document.body.replaceChildren();});

it('publishes delayed bare-cache membership to the profile display without a pulse, rerender or live Source read',async()=>{
 const disk=localCache(Response.json(membership('held cache B')),true),fetcher=vi.fn().mockRejectedValue(Error('NO_NETWORK_NEEDED'));vi.stubGlobal('fetch',fetcher);const view=await display();expect(view.host.textContent).toBe('missing');
 const reader=await import('../src/receiz/prepared-bank-catalog');await act(async()=>{disk.release();await reader.prepareCarriedBankCatalog();});
 expect(view.host.textContent).toBe('held cache B');const held=view.read().historyCatalog;expect(held?.items[0]).toBe(reader.preparedBankCatalogState().bareCatalog?.items[0]);expect(disk.jsonReads).toHaveBeenCalledOnce();expect(fetcher).not.toHaveBeenCalled();
 expect(view.read().quoteStatus).toBe('stale');expect(held?.items[0]).toMatchObject({authority:'projection-only',canTrade:false});
 await act(()=>view.root.render(<view.Probe visible={false}/>));await act(()=>view.root.render(<view.Probe/>));expect(view.read().historyCatalog).toBe(held);expect(disk.jsonReads).toHaveBeenCalledOnce();expect(fetcher).not.toHaveBeenCalled();
});
it('uses the shipped membership once after a genuine local miss, without Sports, Source or Market polling',async()=>{
 const disk=localCache(null),fetcher=vi.fn(async(path:RequestInfo|URL)=>String(path)==='/receiz-public-market.json'?Response.json(membership('shipped public C')):new Response(null,{status:503}));vi.stubGlobal('fetch',fetcher);const view=await display();
 await act(async()=>{await vi.waitFor(()=>expect(view.host.textContent).toBe('shipped public C'),{timeout:300,interval:1});});
 expect(fetcher.mock.calls.map(([path])=>String(path))).toEqual(['/receiz-public-market.json']);const held=view.read().historyCatalog;expect(held?.complete).toBe(true);expect(disk.jsonReads).not.toHaveBeenCalled();
 await act(async()=>{window.dispatchEvent(new Event('online'));document.dispatchEvent(new Event('visibilitychange'));window.dispatchEvent(new Event('pageshow'));window.dispatchEvent(new Event('focus'));await vi.advanceTimersByTimeAsync(61_000);});
 expect(view.read().historyCatalog).toBe(held);expect(fetcher).toHaveBeenCalledOnce();
 await act(()=>view.root.render(<view.Probe visible={false}/>));await act(()=>view.root.render(<view.Probe/>));expect(view.read().historyCatalog).toBe(held);expect(fetcher).toHaveBeenCalledOnce();
});
it('paints complete synchronous local membership on the first frame with zero network or duplicate body reads',async()=>{
 localStorage.setItem('receiz-bank-public-discovery-v2',JSON.stringify(membership('held local B')));const disk=localCache(Response.json(membership('old disk A')),true),fetcher=vi.fn().mockRejectedValue(Error('NO_NETWORK_NEEDED'));vi.stubGlobal('fetch',fetcher);const view=await display();
 expect(view.paints[0]).toBe('held local B');const held=view.read().historyCatalog;const reader=await import('../src/receiz/prepared-bank-catalog');await act(async()=>{disk.release();await reader.prepareCarriedBankCatalog();});expect(view.read().historyCatalog).toBe(held);expect(disk.jsonReads).not.toHaveBeenCalled();expect(fetcher).not.toHaveBeenCalled();
});
it('keeps a newer accepted public cohort when an older delayed cache body becomes available',async()=>{
 const disk=localCache(Response.json(membership('old disk A')),true),fetcher=vi.fn().mockRejectedValue(Error('NO_NETWORK_NEEDED'));vi.stubGlobal('fetch',fetcher);const view=await display();const {parsePublicMarket}=await import('../src/receiz/public-market'),{publishDiscoveredPublicCatalog}=await import('../src/receiz/asset-publication-adoption');
 await act(()=>publishDiscoveredPublicCatalog(parsePublicMarket(membership('new RAM C'))));expect(view.host.textContent).toBe('new RAM C');const held=view.read().historyCatalog,reader=await import('../src/receiz/prepared-bank-catalog');await act(async()=>{disk.release();await reader.prepareCarriedBankCatalog();});
 expect(view.read().historyCatalog).toBe(held);expect(view.host.textContent).toBe('new RAM C');expect(disk.jsonReads).not.toHaveBeenCalled();expect(fetcher).not.toHaveBeenCalled();
});
it('fills a genuinely missing complete shipped collection beside a partial local public admission',async()=>{
 localCache(null);const fetcher=vi.fn(async(path:RequestInfo|URL)=>String(path)==='/receiz-public-market.json'?Response.json(membership('shipped public C')):new Response(null,{status:503}));vi.stubGlobal('fetch',fetcher);
 const {retainAssetPublicationAdmission}=await import('../src/receiz/asset-publication-adoption');
 const reference={schema:'receiz.imported-proof-source.v1',artifactSha256:'a'.repeat(64),byteLength:2,filename:'public.receizbundle',mimeType:'application/vnd.receiz.bundle+json',bytes:{kind:'bytes',sha256:'b'.repeat(64),byteLength:2,contentByteLength:2,height:0}},source='/api/profile/showcase/imported-source?'+new URLSearchParams({reference:JSON.stringify(reference)});
 retainAssetPublicationAdmission({username:'alexmorgan',sourceReference:reference,firstPaint:null,original:{id:'pending',assetTitle:'held pending Original',showOnProfile:true,importedSource:{reference},media:{kind:'image',src:source+'&payload=1',originalDownloadSrc:source,originalDownloadSha256Hex:reference.artifactSha256}}},{identityDigest:'d'.repeat(64),accountUid:'account-1'});
 const view=await display();expect(view.paints[0]).toBe('held pending Original');await act(async()=>{await vi.waitFor(()=>expect(view.read().historyCatalog?.items.map(item=>item.title)).toContain('shipped public C'),{timeout:300,interval:1});});
 expect(view.read().historyCatalog?.items.map(item=>item.title)).toContain('held pending Original');expect(fetcher.mock.calls.map(([path])=>String(path))).toEqual(['/receiz-public-market.json']);
});
it('keeps a complete empty local withdrawal without treating it as missing shipped membership',async()=>{
 const empty=membership('empty');empty.transport.publicMembership.itemCount=0;empty.transport.publicOriginals=[];const disk=localCache(Response.json(empty),true),fetcher=vi.fn().mockRejectedValue(Error('NO_NETWORK_NEEDED'));vi.stubGlobal('fetch',fetcher);const view=await display(),reader=await import('../src/receiz/prepared-bank-catalog');
 await act(async()=>{disk.release();await reader.prepareCarriedBankCatalog();});expect(view.read().historyCatalog?.complete).toBe(true);expect(view.read().historyCatalog?.items).toEqual([]);expect(view.host.textContent).toBe('');expect(fetcher).not.toHaveBeenCalled();
});
