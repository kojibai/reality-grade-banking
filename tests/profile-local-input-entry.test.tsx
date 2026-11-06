// @vitest-environment happy-dom
import {act,type ComponentProps} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import type {PublicProfilePage as ProfilePage} from '../src/public-explorer/PublicProfilePage';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
const roots:Root[]=[];
const membership=(empty=false)=>({ok:true,transport:{publicMembership:{version:1,scope:'whole-market-visible-showcase',source:'canonical-complete',isComplete:true,itemCount:empty?0:1,revision:empty?'empty':'held B'},publicOriginals:empty?[]:[{id:'profile:alexmorgan:original',receizId:'original',title:'held Original',ownerUsername:'alexmorgan',ownerUserId:'account-1',ownerCreatedAt:'2026-10-20T10:00:00Z',profileOriginal:{media:null}}]}});
function cache(value:Response|null,paused=false){let release!:()=>void;const ready=paused?new Promise<void>(resolve=>{release=resolve;}):Promise.resolve();vi.stubGlobal('caches',{open:vi.fn(async()=>({match:async()=>{await ready;return value?.clone();},put:vi.fn(),delete:vi.fn()}))});return()=>release?.();}
async function mount(fake=false){const {usePublicMarket}=await import('../src/receiz/usePublicMarket'),{PublicProfilePage}=await import('../src/public-explorer/PublicProfilePage'),host=document.createElement('section'),root=createRoot(host);roots.push(root);document.body.append(host);function Probe(){const actual=usePublicMarket(false,!fake,undefined,!fake),source=fake?{catalog:null,historyCatalog:null,pulse:0,status:'loading',quoteStatus:'stale',sportsStatus:'missing',error:null,refresh:async()=>{}} as ComponentProps<typeof ProfilePage>['source']:actual;return <PublicProfilePage username="alexmorgan" source={source} active/>;}await act(()=>root.render(<Probe/>));return host;}
beforeEach(()=>{vi.resetModules();localStorage.clear();history.replaceState(null,'','/alexmorgan/');document.body.innerHTML='<script id="receiz-navigation" type="application/json">{}</script>';});
afterEach(async()=>{for(const root of roots.splice(0))await act(()=>root.unmount());vi.useRealTimers();vi.restoreAllMocks();vi.unstubAllGlobals();localStorage.clear();document.body.replaceChildren();});

it('settles a paused local catalog before deciding whether any full profile read is missing',async()=>{
 const release=cache(Response.json(membership()),true),fetcher=vi.fn((_path:RequestInfo|URL)=>new Promise<Response>(()=>{}));vi.stubGlobal('fetch',fetcher);const host=await mount(),before=fetcher.mock.calls.map(([path])=>String(path));
 await act(async()=>{release();await(await import('../src/receiz/prepared-bank-catalog')).prepareCarriedBankCatalog();});
 expect(before).toEqual([]);expect(fetcher).not.toHaveBeenCalled();expect(host.querySelector('.profile-hero')).not.toBeNull();expect(host.querySelectorAll('.profile-asset')).toHaveLength(1);
});
it('performs one bounded genuine full-profile fallback after local miss and shipped failure',async()=>{
 cache(null);let finish!:(value:Response)=>void;const fetcher=vi.fn(async(path:RequestInfo|URL)=>String(path)==='/receiz-public-market.json'?new Promise<Response>(resolve=>{finish=resolve;}):new Response(null,{status:503}));vi.stubGlobal('fetch',fetcher);await mount();await act(async()=>{await vi.waitFor(()=>expect(finish).toBeTypeOf('function'));});const before=fetcher.mock.calls.map(([path])=>String(path));await act(async()=>{finish(new Response(null,{status:503}));});
 expect(before).toEqual(['/receiz-public-market.json']);expect(fetcher.mock.calls.map(([path])=>String(path))).toEqual(['/receiz-public-market.json','/api/bank/public-profile/alexmorgan']);
});
it('allows one genuine full-profile read when a complete empty local catalog contains no selected profile',async()=>{
 const release=cache(Response.json(membership(true)),true),fetcher=vi.fn(async(_path:RequestInfo|URL)=>new Response(null,{status:404}));vi.stubGlobal('fetch',fetcher);await mount();const before=fetcher.mock.calls.length;await act(async()=>{release();await(await import('../src/receiz/prepared-bank-catalog')).prepareCarriedBankCatalog();});
 expect(before).toBe(0);expect(fetcher.mock.calls.map(([path])=>String(path))).toEqual(['/api/bank/public-profile/alexmorgan']);
});
it('preserves ordinary missing-profile readers for supplied source views without local readiness metadata',async()=>{
 cache(null);const fetcher=vi.fn((_path:RequestInfo|URL)=>new Promise<Response>(()=>{}));vi.stubGlobal('fetch',fetcher);await mount(true);expect(fetcher.mock.calls.map(([path])=>String(path))).toEqual(['/api/bank/public-profile/alexmorgan']);
});

function localDeadlines(){
 vi.useFakeTimers();return vi.spyOn(AbortSignal,'timeout').mockImplementation(ms=>{const controller=new AbortController();setTimeout(()=>controller.abort(new DOMException('Local read timed out.','TimeoutError')),ms);return controller.signal;});
}
it.each(['open','match'] as const)('does not let a never-settling CacheStorage %s starve the genuine full reader',async kind=>{
 localDeadlines();const never=new Promise<never>(()=>{});vi.stubGlobal('caches',{open:vi.fn(async()=>kind==='open'?never:{match:()=>never,put:vi.fn(),delete:vi.fn()})});const fetcher=vi.fn(async(_path:RequestInfo|URL)=>new Response(null,{status:503}));vi.stubGlobal('fetch',fetcher);await mount();expect(fetcher).not.toHaveBeenCalled();
 await act(()=>vi.advanceTimersByTimeAsync(14999));expect(fetcher).not.toHaveBeenCalled();await act(()=>vi.advanceTimersByTimeAsync(1));expect(fetcher.mock.calls.map(([path])=>String(path))).toEqual(['/receiz-public-market.json','/api/bank/public-profile/alexmorgan']);
});
it('shares one local deadline across cache lookup and cached JSON body work',async()=>{
 const deadlines=localDeadlines(),response=Response.json(membership()),body=vi.fn(()=>new Promise<never>(()=>{}));response.json=body;vi.stubGlobal('caches',{open:vi.fn(async()=>({match:async()=>{await new Promise(resolve=>setTimeout(resolve,12000));return response;},put:vi.fn(),delete:vi.fn()}))});const fetcher=vi.fn(async(_path:RequestInfo|URL)=>new Response(null,{status:503}));vi.stubGlobal('fetch',fetcher);await mount();await act(()=>vi.advanceTimersByTimeAsync(12000));expect(body).toHaveBeenCalledOnce();expect(deadlines.mock.calls.filter(([ms])=>ms===15000)).toHaveLength(1);expect(fetcher).not.toHaveBeenCalled();
 await act(()=>vi.advanceTimersByTimeAsync(3000));expect(fetcher.mock.calls.map(([path])=>String(path))).toEqual(['/receiz-public-market.json','/api/bank/public-profile/alexmorgan']);
});
it('bounds an unavailable shipped request before one genuine full-profile fallback',async()=>{
 localDeadlines();cache(null);const fetcher=vi.fn(async(path:RequestInfo|URL)=>String(path)==='/receiz-public-market.json'?new Promise<Response>(()=>{}):new Response(null,{status:503}));vi.stubGlobal('fetch',fetcher);await mount();expect(fetcher.mock.calls.map(([path])=>String(path))).toEqual(['/receiz-public-market.json']);
 await act(()=>vi.advanceTimersByTimeAsync(15000));expect(fetcher.mock.calls.map(([path])=>String(path))).toEqual(['/receiz-public-market.json','/api/bank/public-profile/alexmorgan']);
});
it('keeps available held profile paint without header work independent of a never-settling optional cache',async()=>{
 localDeadlines();localStorage.setItem('receiz-bank-public-discovery-v2',JSON.stringify(membership()));vi.stubGlobal('caches',{open:()=>new Promise<never>(()=>{})});const fetcher=vi.fn((_path:RequestInfo|URL)=>new Promise<Response>(()=>{}));vi.stubGlobal('fetch',fetcher);const host=await mount();expect(host.querySelector('.profile-hero')).not.toBeNull();expect(host.querySelectorAll('.profile-asset')).toHaveLength(1);expect(fetcher).not.toHaveBeenCalled();
 await act(()=>vi.advanceTimersByTimeAsync(15000));expect(host.querySelectorAll('.profile-asset')).toHaveLength(1);expect(fetcher).not.toHaveBeenCalled();
});

it('uses the public header already in the local Market response on the first profile paint, with no header call',async()=>{
 const {profileFixture}=await import('./fixtures/public-profile'),source=membership(),raw=profileFixture().profile;
 Object.assign(source.transport,{publicProfileHeads:[{profile:{...raw.profile,createdAt:'2026-10-20T10:00:00Z'},viewer:raw.viewer,stats:raw.stats}]});
 localStorage.setItem('receiz-bank-public-discovery-v2',JSON.stringify(source));cache(null);const fetcher=vi.fn(()=>new Promise<Response>(()=>{}));vi.stubGlobal('fetch',fetcher);
 const host=await mount();expect(host.querySelector('.profile-banner img')?.getAttribute('src')).toBe('https://receiz.com/artwork/cover.png');expect(host.querySelector('[aria-label="View PBI authorship evidence"]')).not.toBeNull();expect(host.querySelector('[aria-label="Verify your profile with PBI"]')).toBeNull();expect(fetcher).not.toHaveBeenCalled();
});
it('does not present unresolved profile metadata as an unsigned profile or start a second signing ceremony',async()=>{
 localStorage.setItem('receiz-bank-public-discovery-v2',JSON.stringify(membership()));cache(null);const fetcher=vi.fn(()=>new Promise<Response>(()=>{}));vi.stubGlobal('fetch',fetcher);
 const actions=await import('../src/receiz/profile-actions');actions.publishProfileOwner('account-1');
 const host=await mount();expect(host.querySelector('.profile-hero')).not.toBeNull();expect(host.querySelector('[aria-label="Verify your profile with PBI"]')).toBeNull();expect(fetcher).not.toHaveBeenCalled();
});

it('reuses the active owner header and its updates without putting owner presentation into anonymous retention',async()=>{
 localStorage.setItem('receiz-bank-public-discovery-v2',JSON.stringify(membership()));cache(null);const fetcher=vi.fn(()=>new Promise<Response>(()=>{}));vi.stubGlobal('fetch',fetcher);
 const actions=await import('../src/receiz/profile-actions'),profiles=await import('../src/receiz/public-profile'),{readPublicProfileHeader}=await import('../src/receiz/public-profile-header'),{profileFixture}=await import('./fixtures/public-profile');
 const header=readPublicProfileHeader(profileFixture().profile)!;actions.publishProfileOwner('account-1',header);
 const host=await mount(),anonymous=profiles.retainedPublicProfile('alexmorgan')!;
 expect(host.querySelector('.profile-banner img')?.getAttribute('src')).toBe(header.bannerUrl);expect(host.querySelector('[aria-label="View PBI authorship evidence"]')).not.toBeNull();expect(anonymous.pbiReceiptHash).toBeNull();expect(anonymous.bannerUrl).not.toBe(header.bannerUrl);
 await act(()=>actions.publishProfileOwner('account-1',{...header,bannerUrl:'https://receiz.com/artwork/owner-next.png'}));expect(host.querySelector('.profile-banner img')?.getAttribute('src')).toBe('https://receiz.com/artwork/owner-next.png');expect(profiles.retainedPublicProfile('alexmorgan')).toBe(anonymous);
 await act(()=>actions.publishProfileOwner(null));expect(host.querySelector('.profile-banner img')?.getAttribute('src')).toBe(anonymous.bannerUrl);expect(host.querySelector('[aria-label="View PBI authorship evidence"]')).toBeNull();expect(fetcher).not.toHaveBeenCalled();
});

it('preserves a newly accepted full header before its first public visit against the existing older Market header',async()=>{
 const {profileFixture}=await import('./fixtures/public-profile'),{parsePublicMarket}=await import('../src/receiz/public-market'),profiles=await import('../src/receiz/public-profile'),old=membership(),raw=profileFixture().profile;
 Object.assign(old.transport,{publicProfileHeads:[{profile:{...raw.profile,createdAt:'2026-10-20T10:00:00Z',bannerUrl:'/artwork/old-header.png'},viewer:raw.viewer,stats:raw.stats}]});
 const catalog=parsePublicMarket(old);Object.assign(document.getElementById('receiz-navigation')!,{publicMarketCatalog:()=>catalog});
 const next=profileFixture();next.profile.profile.bannerUrl='/artwork/newly-accepted.png';next.profile.originalsPage={hasMore:false,nextCursor:''};const accepted=profiles.retainPublicProfile(profiles.parsePublicProfile(next,'alexmorgan'));
 localStorage.setItem('receiz-bank-public-discovery-v2',JSON.stringify(old));cache(null);const fetcher=vi.fn(()=>new Promise<Response>(()=>{}));vi.stubGlobal('fetch',fetcher);
 const host=await mount();expect(host.querySelector('.profile-banner img')?.getAttribute('src')).toBe('https://receiz.com/artwork/newly-accepted.png');expect(profiles.retainedPublicProfile('alexmorgan')).toBe(accepted);expect(fetcher).not.toHaveBeenCalled();
});
it('does not let optional held-catalog metadata failure interrupt accepting a complete public profile',async()=>{
 const {profileFixture}=await import('./fixtures/public-profile'),profiles=await import('../src/receiz/public-profile');Object.assign(document.getElementById('receiz-navigation')!,{publicMarketCatalog:()=>{throw Error('Optional display unavailable');}});
 const full=profiles.parsePublicProfile(profileFixture(),'alexmorgan');expect(()=>profiles.retainPublicProfile(full)).not.toThrow();expect(profiles.retainedPublicProfile('alexmorgan')).toBe(full);
});
