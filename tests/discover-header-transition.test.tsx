// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {profileFixture} from './fixtures/public-profile';
import type {PublicMarketCatalog} from '../src/receiz/public-market';

Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
const originalRevision='a'.repeat(64),firstHeadsRevision='b'.repeat(64),nextHeadsRevision='c'.repeat(64);
const owner={userId:'account-1',username:'alexmorgan'},emptyOwner={userId:'email-created-account',username:'newcorrespondent'};
const createdAt='2026-01-10T12:00:00Z';
let root:Root|undefined,host:HTMLDivElement,market:typeof import('../src/receiz/public-market');
let publication:typeof import('../src/receiz/asset-publication-adoption');

function head(fields:Record<string,unknown>={}){
 const fixture=profileFixture().profile;
 return{profile:{...fixture.profile,...owner,createdAt,...fields},viewer:fixture.viewer,stats:{...fixture.stats,originals:0}};
}
function transport(heads:unknown[],headsRevision:string|null=firstHeadsRevision){
 return{ok:true,transport:{publicOriginals:[{id:'profile:alexmorgan:held-work',receizId:'held-work',title:'Unchanged accepted work',ownerUsername:owner.username,ownerDisplayName:'Alex Morgan',ownerUserId:owner.userId,ownerCreatedAt:createdAt,pulse:'14800000',createdAt,profileOriginal:{hasLongForm:false}}],publicProfileHeads:heads,...(headsRevision?{publicProfileHeadsRevision:headsRevision}:{}),publicMembership:{version:1,scope:'whole-market-visible-showcase',source:'canonical-complete',isComplete:true,itemCount:1,revision:originalRevision}}};
}
function selected(input:ReturnType<typeof transport>,previous?:PublicMarketCatalog){
 const parsed=market.parsePublicMarket(input),catalog=previous?market.retainPublicProfileHeaders(parsed,previous):parsed;
 market.rememberPublicMarketResponse(catalog,input);
 return catalog;
}
function coldCatalog(){
 const saved=localStorage.getItem('receiz-bank-public-discovery-v2');
 expect(saved,'accepted display must retain its original transport for cold reopen').not.toBeNull();
 return market.parsePublicMarket(JSON.parse(saved!));
}
async function show(catalog:PublicMarketCatalog){
 const {Discover}=await import('../src/public-discover/Discover');
 root=createRoot(host);
 await act(async()=>root!.render(<Discover seed={catalog.items} seedHeads={catalog.publicProfileHeads} active={false}/>));
 await act(async()=>publication.publishDiscoveredPublicCatalog(catalog));
}
async function reopen(){
 const saved=localStorage.getItem('receiz-bank-public-discovery-v2');
 expect(saved).not.toBeNull();
 await act(()=>root!.unmount());root=undefined;host.replaceChildren();
 vi.resetModules();
 market=await import('../src/receiz/public-market');publication=await import('../src/receiz/asset-publication-adoption');
 const cold=market.parsePublicMarket(JSON.parse(saved!));
 market.rememberPublicMarketResponse(cold,JSON.parse(saved!));
 await show(cold);
 return cold;
}
const people=()=>host.querySelector('[aria-label="People to discover"]');

beforeEach(async()=>{
 vi.resetModules();localStorage.clear();document.body.replaceChildren();
 host=document.createElement('div');document.body.append(host);
 vi.stubGlobal('fetch',vi.fn(()=>{throw Error('Held Discover must not read Source or profile APIs');}));
 market=await import('../src/receiz/public-market');publication=await import('../src/receiz/asset-publication-adoption');
});
afterEach(async()=>{
 if(root){await act(()=>root!.unmount());root=undefined;}
 expect(fetch).not.toHaveBeenCalled();document.body.replaceChildren();localStorage.clear();vi.unstubAllGlobals();vi.restoreAllMocks();
});

describe('Discover accepted owner-header transitions',()=>{
 it('adopts the same Originals revision with an updated header and a new zero-Original person in place',async()=>{
  const first=selected(transport([head()]));await show(first);
  const page=host.firstElementChild,search=host.querySelector('input')!;
  await act(()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(search,'e');search.dispatchEvent(new Event('input',{bubbles:true}));});
  const work=host.querySelector('[aria-label="Open Unchanged accepted work"]');
  expect(work).not.toBeNull();
  expect(people()?.textContent).toContain('Alex Morgan');
  const next=selected(transport([head({displayName:'Alex Updated',avatarUrl:'/artwork/accepted-new-avatar.png'}),head({...emptyOwner,displayName:'New Correspondent',avatarUrl:'/artwork/email-account.png'})],nextHeadsRevision));
  next.items=first.items;
  await act(async()=>publication.publishDiscoveredPublicCatalog(next));
  expect(next.revision).toBe(first.revision);expect(next.items).toBe(first.items);
  expect(host.firstElementChild).toBe(page);expect(host.querySelector('input')).toBe(search);
  expect(search.value).toBe('e');
  expect(host.querySelector('[aria-label="Open Unchanged accepted work"]')).toBe(work);
  expect(people()?.textContent).toContain('Alex Updated');expect(people()?.textContent).toContain('New Correspondent');
  expect(people()?.querySelector(`a[href="/${emptyOwner.username}/"] img`)?.getAttribute('src')).toBe('https://receiz.com/artwork/email-account.png');
  const cold=coldCatalog();expect(cold.publicProfileHeadsRevision).toBe(nextHeadsRevision);
  expect(cold.publicProfileHeads?.map(value=>value.profile.userId)).toEqual([owner.userId,emptyOwner.userId]);
 });

 it('retains the complete selected owner index through a legacy thin response and real serialized cold reopen',async()=>{
  const first=selected(transport([head(),head({...emptyOwner,displayName:'New Correspondent'})]));await show(first);
  const thin=selected(transport([],null));
  await act(async()=>publication.publishDiscoveredPublicCatalog(thin));
  expect(people()?.textContent).toContain('New Correspondent');
  const cold=coldCatalog();
  expect(cold.items).toHaveLength(1);expect(cold.sourceCount).toBe(1);
  expect(cold.publicProfileHeads?.map(value=>value.profile.userId)).toEqual([owner.userId,emptyOwner.userId]);
  const reopened=await reopen();
  expect(people()?.textContent).toContain('New Correspondent');
  const profiles=await import('../src/receiz/public-profile'),profile=profiles.selectHeldPublicProfile(emptyOwner.username,reopened)!;
  expect(profile).toMatchObject({userId:emptyOwner.userId,authorshipVerified:true,pbiReceiptHash:'a'.repeat(64),stats:{originals:0},items:[]});
  expect(profile.bannerUrl).toBe('https://receiz.com/artwork/cover.png');
 });

 it('cold-opens standalone Discover from retained B while the carried document still contains older A',async()=>{
  const first=transport([head()]);
  const older=market.parsePublicMarket({...first,transport:{...first.transport,generatedAt:'2026-11-13T21:00:00Z'}});
  const retained=transport([head({displayName:'Alex Updated'}),head({...emptyOwner,displayName:'New Correspondent'})],nextHeadsRevision);
  localStorage.setItem('receiz-bank-public-discovery-v2',JSON.stringify({...retained,transport:{...retained.transport,generatedAt:'2026-11-13T21:01:00Z'}}));
  const marker=document.createElement('script');marker.id='receiz-navigation';marker.type='application/json';marker.textContent='{}';document.body.append(marker);
  const carrier=document.createElement('script');carrier.id='public-market-seed';carrier.type='application/json';
  carrier.textContent=JSON.stringify({schema:'bank.public-market.document.v1',generation:'d'.repeat(64),path:'discover',catalog:older,visibleCount:older.items.length,asOfPulse:14900000,format:{locale:'en-US',timeZone:'UTC'}});
  document.body.append(carrier);
  vi.resetModules();
  market=await import('../src/receiz/public-market');publication=await import('../src/receiz/asset-publication-adoption');
  const {Discover}=await import('../src/public-discover/Discover');
  root=createRoot(host);
  await act(async()=>root!.render(<Discover seed={older.items} seedHeads={older.publicProfileHeads} active/>));
  expect(people()?.textContent).toContain('New Correspondent');
  expect(people()?.textContent).toContain('Alex Updated');
  expect(host.querySelector('[aria-label="Open Unchanged accepted work"]')).not.toBeNull();
  expect(coldCatalog().publicProfileHeadsRevision).toBe(nextHeadsRevision);
 });

 it('does not resurrect an explicitly private header after a thinner response or cold reopen',async()=>{
  const first=selected(transport([head(),head({...emptyOwner,displayName:'Withdrawn Correspondent'})]));await show(first);
  const refused=head({...emptyOwner,isPrivate:true});
  const withdrawn=selected(transport([head(),refused],nextHeadsRevision),first);
  expect(withdrawn.publicProfileHeads?.map(value=>value.profile.userId)).toEqual([owner.userId]);
  await act(async()=>publication.publishDiscoveredPublicCatalog(withdrawn));
  expect(people()?.textContent).not.toContain('Withdrawn Correspondent');
  const thin=selected(transport([],null));
  await act(async()=>publication.publishDiscoveredPublicCatalog(thin));

  const cold=coldCatalog();expect(cold.publicProfileHeads?.map(value=>value.profile.userId)).toEqual([owner.userId]);
  await reopen();
  expect(people()?.textContent).not.toContain('Withdrawn Correspondent');
 });

 it('does not reintroduce an old owner header after its handle is offered for a different UID',async()=>{
  const first=selected(transport([head(),head({...emptyOwner,displayName:'New Correspondent'})]));await show(first);
  const rebound=selected(transport([head({userId:'different-account',displayName:'Wrong Owner'}),head({...emptyOwner,displayName:'New Correspondent'})],nextHeadsRevision),first);
  expect(rebound.publicProfileHeads?.some(value=>value.profile.userId===owner.userId)).toBe(false);
  await act(async()=>publication.publishDiscoveredPublicCatalog(rebound));
  expect(people()?.textContent).not.toContain('Wrong Owner');
  const thin=selected(transport([],null));
  await act(async()=>publication.publishDiscoveredPublicCatalog(thin));

  const cold=await reopen(),profiles=await import('../src/receiz/public-profile');
  const profile=profiles.selectHeldPublicProfile(owner.username,cold)!;
  expect(profile.userId).toBe(owner.userId);expect(profile.authorshipVerified).toBe(false);expect(profile.pbiReceiptHash).toBeNull();
  expect(cold.publicProfileHeads?.some(value=>value.profile.userId===owner.userId)).toBe(false);
  expect(people()?.textContent).not.toContain('Wrong Owner');expect(people()?.textContent).toContain('New Correspondent');
 });
});
