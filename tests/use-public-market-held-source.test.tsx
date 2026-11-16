// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import type {PublicMarketCatalog} from '../src/receiz/public-market';
// Header delivery has its own tests. Keep the real catalog/admission selectors.
vi.mock('../src/receiz/public-profile-directory',async original=>({...await original<typeof import('../src/receiz/public-profile-directory')>(),subscribePublicProfileDirectory:()=>()=>{}}));
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
const roots:Root[]=[];
const input=(ids:string[],observedAt:string|null=null)=>({ok:true,transport:{generatedAt:observedAt,publicMembership:{version:1,scope:'whole-market-visible-showcase',source:'canonical-complete',isComplete:true,itemCount:ids.length,revision:ids.length?ids.join(','):'explicit-empty'},publicOriginals:ids.map(id=>({id,receizId:id,title:id,profileOriginal:{media:null}}))}});
let market:typeof import('../src/receiz/public-market'),adoption:typeof import('../src/receiz/asset-publication-adoption');
beforeEach(async()=>{
 vi.resetModules();localStorage.clear();history.replaceState(null,'','/');document.body.innerHTML='<script id="receiz-navigation" type="application/json">{}</script>';
 market=await import('../src/receiz/public-market');adoption=await import('../src/receiz/asset-publication-adoption');
});
afterEach(async()=>{for(const root of roots.splice(0))await act(()=>root.unmount());vi.restoreAllMocks();vi.unstubAllGlobals();document.body.replaceChildren();localStorage.clear();});
function admitC(){
 const reference={schema:'receiz.imported-proof-source.v1',artifactSha256:'c'.repeat(64),byteLength:2,filename:'asset.receizbundle',mimeType:'application/vnd.receiz.bundle+json',bytes:{kind:'bytes',sha256:'d'.repeat(64),byteLength:2,contentByteLength:2,height:0}};
 adoption.retainAssetPublicationAdmission({username:'artist',sourceReference:reference,firstPaint:null,original:{id:'imported-c',assetTitle:'Local C',claim:'New exact Source',pulse:'14700000',createdAt:'2026-10-21T10:00:00Z',showOnProfile:true,importedSource:{reference},media:null}},{identityDigest:'e'.repeat(64),accountUid:'owner'});
 expect(adoption.admittedAssetPublicationItem(reference.artifactSha256,'artist')?.id).toBe('profile:artist:imported-c');
}
function shipped(){
 let release!:(response:Response)=>void;const response=new Promise<Response>(resolve=>{release=resolve;});
 const fetcher=vi.fn(async(path:RequestInfo|URL)=>String(path)==='/receiz-public-market.json'?response:new Response(null,{status:503}));vi.stubGlobal('fetch',fetcher);
 return{fetcher,async finish(ids=['shipped-A-only'],at='2026-11-01T12:00:00Z'){await act(async()=>{release(Response.json(input(ids,at)));await response;});}};
}
async function probe(active=false){
 const {usePublicMarket}=await import('../src/receiz/usePublicMarket');let current!:ReturnType<typeof usePublicMarket>;const frames:string[][]=[];
 function Probe(){current=usePublicMarket(active,true,undefined,!active);frames.push(current.historyCatalog?.items.map(item=>item.id)??[]);return <output>{current.historyCatalog?.items.map(item=>item.id).join(',')}</output>;}
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host);roots.push(root);await act(async()=>root.render(<Probe/>));
 return{host,frames,read:()=>current};
}
it.each([null,'invalid-clock'] as const)('keeps held B and admitted C when its display clock is %s',async observedAt=>{
 const held={...market.parsePublicMarket(input(['held-B-only'])),observedAt};adoption.publishDiscoveredPublicCatalog(held);admitC();const old=shipped(),view=await probe();
 expect(view.read().historyCatalog?.complete).toBe(false);expect(view.read().historyCatalog?.items.map(item=>item.id)).toEqual(['profile:artist:imported-c','held-B-only']);
 await old.finish();
 expect(view.read().historyCatalog?.items.map(item=>item.id)).toEqual(['profile:artist:imported-c','held-B-only']);
 expect(view.frames.every(frame=>frame.includes('held-B-only'))).toBe(true);expect(view.read().displayLocalPending).toBeUndefined();expect(old.fetcher).not.toHaveBeenCalled();
});
it.each([null,'2020-01-01T00:00:00Z'] as const)('uses shipped hints without replacing held B for clock %s',async observedAt=>{
 const held={...market.parsePublicMarket(input(['shared','held-B-only'])),observedAt};adoption.publishDiscoveredPublicCatalog(held);const old=shipped(),view=await probe(true);
 await vi.waitFor(()=>expect(old.fetcher.mock.calls.some(([path])=>String(path)==='/receiz-public-market.json')).toBe(true));
 await old.finish(['shared','shipped-A-only'],'2026-11-01T12:00:00Z');
 expect(view.read().historyCatalog?.items.map(item=>item.id)).toEqual(['shared','held-B-only']);expect(view.frames.every(frame=>frame.includes('held-B-only'))).toBe(true);
 expect(old.fetcher.mock.calls.some(([path])=>String(path).startsWith('/api/'))).toBe(false);
});
it.each([false,true])('uses the shipped seed only when initial membership is missing (local C=%s)',async local=>{
 if(local)admitC();const old=shipped(),view=await probe();
 await vi.waitFor(()=>expect(old.fetcher).toHaveBeenCalledOnce());await old.finish();
 expect(view.read().historyCatalog?.items.map(item=>item.id)).toEqual(local?['profile:artist:imported-c','shipped-A-only']:['shipped-A-only']);
 expect(old.fetcher.mock.calls.map(([path])=>String(path))).toEqual(['/receiz-public-market.json']);expect(view.read().displayLocalPending).toBeUndefined();
});
it('keeps an explicit complete withdrawal selected when older shipped hints finish',async()=>{
 const held=market.parsePublicMarket(input(['withdrawn-B-only']));adoption.publishDiscoveredPublicCatalog(held);const old=shipped(),view=await probe(true);
 await vi.waitFor(()=>expect(old.fetcher.mock.calls.some(([path])=>String(path)==='/receiz-public-market.json')).toBe(true));
 const withdrawn:PublicMarketCatalog=market.parsePublicMarket(input([]));await act(async()=>adoption.publishDiscoveredPublicCatalog(withdrawn));expect(view.read().historyCatalog?.items).toEqual([]);
 await old.finish();expect(view.read().historyCatalog?.items).toEqual([]);expect(view.read().historyCatalog?.complete).toBe(true);
 expect(old.fetcher.mock.calls.some(([path])=>String(path).startsWith('/api/'))).toBe(false);
});
