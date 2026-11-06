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

it('reuses the active owner header and its updates without putting owner presentation into anonymous retention',async()=>{
 localStorage.setItem('receiz-bank-public-discovery-v2',JSON.stringify(membership()));cache(null);const fetcher=vi.fn((_path:RequestInfo|URL)=>new Promise<Response>(()=>{}));vi.stubGlobal('fetch',fetcher);
 const actions=await import('../src/receiz/profile-actions'),profiles=await import('../src/receiz/public-profile'),{readPublicProfileHeader}=await import('../src/receiz/public-profile-header'),{profileFixture}=await import('./fixtures/public-profile');
 const header=readPublicProfileHeader(profileFixture().profile)!;actions.publishProfileOwner('account-1',header);
 const host=await mount(),anonymous=profiles.retainedPublicProfile('alexmorgan')!;
 expect(host.querySelector('.profile-banner img')?.getAttribute('src')).toBe(header.bannerUrl);expect(host.querySelector('[aria-label="View PBI authorship evidence"]')).not.toBeNull();expect(anonymous.pbiReceiptHash).toBeNull();expect(anonymous.bannerUrl).not.toBe(header.bannerUrl);
 await act(()=>actions.publishProfileOwner('account-1',{...header,bannerUrl:'https://receiz.com/artwork/owner-next.png'}));expect(host.querySelector('.profile-banner img')?.getAttribute('src')).toBe('https://receiz.com/artwork/owner-next.png');expect(profiles.retainedPublicProfile('alexmorgan')).toBe(anonymous);expect(fetcher).not.toHaveBeenCalled();
 await act(()=>actions.publishProfileOwner(null));expect(host.querySelector('.profile-banner img')?.getAttribute('src')).toBe(anonymous.bannerUrl);expect(host.querySelector('[aria-label="View PBI authorship evidence"]')).toBeNull();expect(fetcher.mock.calls.map(([path])=>String(path))).toEqual(['/api/bank/public-profile/alexmorgan?view=head']);
});
