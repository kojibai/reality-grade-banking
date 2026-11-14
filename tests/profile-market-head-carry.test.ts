import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {profileFixture} from './fixtures/public-profile';
let market:typeof import('../src/receiz/public-market'),profiles:typeof import('../src/receiz/public-profile');
const username='alexmorgan',uid='account-1',createdAt='2026-01-10T12:00:00Z';
function head(fields:Record<string,unknown>={}){const fixture=profileFixture().profile;return{profile:{...fixture.profile,userId:uid,createdAt,...fields},viewer:fixture.viewer,stats:{...fixture.stats,originals:611}};}
function input(heads:unknown[]=[],ids=['one']){return{ok:true,transport:{publicOriginals:ids.map(id=>({id:`profile:${username}:${id}`,receizId:id,title:id,ownerUsername:username,ownerDisplayName:'Alex Morgan',ownerUserId:uid,ownerCreatedAt:createdAt,pulse:'14800000',createdAt,profileOriginal:{hasLongForm:false}})),publicProfileHeads:heads,publicMembership:{version:1,scope:'whole-market-visible-showcase',source:'canonical-complete',isComplete:true,itemCount:ids.length,revision:'selected'}}};}
beforeEach(async()=>{vi.resetModules();market=await import('../src/receiz/public-market');profiles=await import('../src/receiz/public-profile');vi.stubGlobal('fetch',vi.fn(()=>{throw Error('Already held metadata must not be fetched');}));});
afterEach(()=>{expect(fetch).not.toHaveBeenCalled();vi.unstubAllGlobals();});
describe('accepted public header carried with the selected Market',()=>{
 it('carries the banner and actual profile PBI with exact held items and membership count',()=>{
  const catalog=market.parsePublicMarket(input([head()],['one','two'])),selected=profiles.selectHeldPublicProfile(username,catalog)!;
  expect(selected).toMatchObject({userId:uid,username,avatarUrl:'https://receiz.com/artwork/avatar.png',bannerUrl:'https://receiz.com/artwork/cover.png',authorshipVerified:true,pbiReceiptHash:'a'.repeat(64),stats:{originals:2}});
  expect(profiles.publicProfileHasHeader(selected)).toBe(true);selected.items.forEach(item=>expect(catalog.items).toContain(item));
  expect(JSON.stringify(catalog)).not.toMatch(/private@example|secret/);
 });
 it('keeps the complete metadata through the ordinary serialized cold response and quote wrappers',()=>{
  const saved=JSON.parse(JSON.stringify(input([head()]))),catalog=market.parsePublicMarket(saved),quoted=market.mergePublicQuotes(catalog,{ok:true,data:{schema:'receiz.market.public-snapshot.v1',liveMarkets:[]}});
  const restored=JSON.parse(JSON.stringify(quoted)),selected=profiles.selectHeldPublicProfile(username,restored)!;
  expect(selected.bannerUrl).toBe('https://receiz.com/artwork/cover.png');expect(selected.pbiReceiptHash).toBe('a'.repeat(64));
 });
 it('passes an accepted header-only update even when item references stay identical',()=>{
  const first=market.parsePublicMarket(input([head()])),selected=profiles.retainPublicProfile(profiles.selectHeldPublicProfile(username,first)!);
  const next=market.parsePublicMarket(input([head({bannerUrl:'/artwork/new-banner.png',bio:'Changed accepted header'})]));next.items=first.items;
  const updated=profiles.selectHeldPublicProfile(username,next)!;
  expect(updated).not.toBe(selected);expect(updated.bannerUrl).toBe('https://receiz.com/artwork/new-banner.png');expect(updated.bio).toBe('Changed accepted header');expect(updated.items).toBe(selected.items);expect(updated.pbiReceiptHash).toBe(selected.pbiReceiptHash);
  profiles.retainPublicProfile(updated);expect(profiles.selectHeldPublicProfile(username,next)).toBe(updated);
 });
 it('retains known metadata if a thinner response appends an Original without a header',()=>{
  const first=market.parsePublicMarket(input([head()]));profiles.retainPublicProfile(profiles.selectHeldPublicProfile(username,first)!);
  const next=market.parsePublicMarket(input([],['one','two'])),selected=profiles.selectHeldPublicProfile(username,next)!;
  expect(selected.items).toHaveLength(2);expect(selected.stats.originals).toBe(2);expect(selected.bannerUrl).toBe('https://receiz.com/artwork/cover.png');expect(selected.pbiReceiptHash).toBe('a'.repeat(64));expect(profiles.publicProfileHasHeader(selected)).toBe(true);
 });
 it.each(['private','cannot-view','wrong-uid','wrong-handle','conflicting-heads'])('never uses an ineligible %s header',kind=>{
  const current=head();if(kind==='private')current.profile.isPrivate=true;if(kind==='cannot-view')current.viewer.canView=false;if(kind==='wrong-uid')current.profile.userId='another';if(kind==='wrong-handle')current.profile.username='someoneelse';
  const catalog=market.parsePublicMarket(input(kind==='conflicting-heads'?[current,head({bannerUrl:'/artwork/conflict.png'})]:[current])),selected=profiles.selectHeldPublicProfile(username,catalog)!;
  if(kind==='private'||kind==='cannot-view'){expect(selected).toBeNull();return;}
  expect(profiles.publicProfileHasHeader(selected)).toBe(false);expect(selected.pbiReceiptHash).toBeNull();expect(selected.bannerUrl).not.toBe('https://receiz.com/artwork/cover.png');
 });
 it('applies the carried header to an already-held complete profile without replacing its collection',()=>{
  const fixture=profileFixture();fixture.profile.originalsPage={hasMore:false,nextCursor:''};const prior=profiles.retainPublicProfile(profiles.parsePublicProfile(fixture,username));
  const catalog=market.parsePublicMarket(input([head({bio:'New accepted profile state'})])),selected=profiles.selectHeldPublicProfile(username,catalog)!;
  expect(selected.bio).toBe('New accepted profile state');expect(selected.items).toBe(prior.items);expect(selected.stats.originals).toBe(prior.stats.originals);
 });
 it('keeps the selected eligible public header in the saved response after a thinner refresh',()=>{
  const priorInput=input([head()]),prior=market.parsePublicMarket(priorInput);market.rememberPublicMarketResponse(prior,priorInput);
  const nextInput=input([],['one','two']),next=market.parsePublicMarket(nextInput);market.rememberPublicMarketResponse(next,nextInput);
  const values=new Map<string,string>();vi.stubGlobal('localStorage',{getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>values.set(key,value)});
  market.retainPublicMarket(next,undefined,next,prior);
  const cold=market.parsePublicMarket(JSON.parse(values.get('receiz-bank-public-discovery-v2')!)),selected=profiles.selectHeldPublicProfile(username,cold)!;
  expect(selected.bannerUrl).toBe('https://receiz.com/artwork/cover.png');expect(selected.pbiReceiptHash).toBe('a'.repeat(64));expect(selected.items).toHaveLength(2);expect(JSON.stringify(cold)).not.toMatch(/private@example|secret/);
 });

 it('preserves a prepared-document header without a response association through a thin refresh and cold restore',()=>{
  const prior=market.parsePublicMarket(input([head()])),nextInput=input([],['one','two']),next=market.parsePublicMarket(nextInput);market.rememberPublicMarketResponse(next,nextInput);
  const values=new Map<string,string>(),writes=vi.fn((key:string,value:string)=>values.set(key,value));vi.stubGlobal('localStorage',{getItem:(key:string)=>values.get(key)??null,setItem:writes});
  market.retainPublicMarket(next,undefined,next,prior);market.retainPublicMarket(next,undefined,next,prior);
  const cold=market.parsePublicMarket(JSON.parse(values.get('receiz-bank-public-discovery-v2')!)),selected=profiles.selectHeldPublicProfile(username,cold)!;
  expect(selected.bannerUrl).toBe('https://receiz.com/artwork/cover.png');expect(selected.pbiReceiptHash).toBe('a'.repeat(64));expect(writes).toHaveBeenCalledTimes(1);
 });
 it('keeps raw compact headers in the catalog without generating artwork for every owner',async()=>{
  const artwork=await import('../src/receiz/profile-artwork'),project=vi.spyOn(artwork,'publicProfileArtwork');
  const catalog=market.parsePublicMarket(input([head({avatarUrl:null,bannerUrl:null})]));expect(project).not.toHaveBeenCalled();expect(catalog.publicProfileHeads?.[0].profile.bannerUrl).toBeNull();
  const selected=profiles.selectHeldPublicProfile(username,catalog)!;expect(project).toHaveBeenCalledTimes(1);expect(selected.bannerUrl).toMatch(/^data:image/);project.mockRestore();
 });

 it('uses an already-carried public header for a known empty collection without any profile reader',()=>{
  const catalog=market.parsePublicMarket(input([head()],[])),selected=profiles.selectHeldPublicProfile(username,catalog)!;
  expect(selected).toMatchObject({userId:uid,username,authorshipVerified:true,stats:{originals:0},items:[],nextCursor:null});expect(profiles.publicProfileHasHeader(selected)).toBe(true);
 });
 it('keeps an accepted zero-Original profile across a thin response and a serialized cold reopen',()=>{
  const priorInput=input([head()],[]),prior=market.parsePublicMarket(priorInput),nextInput=input([],[]),next=market.parsePublicMarket(nextInput);
  const selected=market.retainPublicProfileHeaders(next,prior);expect(selected.publicProfileHeads?.[0].profile.userId).toBe(uid);
  market.rememberPublicMarketResponse(next,nextInput);
  const values=new Map<string,string>();vi.stubGlobal('localStorage',{getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>values.set(key,value)});
  market.retainPublicMarket(next,undefined,selected,prior);
  const cold=market.parsePublicMarket(JSON.parse(values.get('receiz-bank-public-discovery-v2')!));
  expect(profiles.selectHeldPublicProfile(username,cold)).toMatchObject({userId:uid,username,items:[],stats:{originals:0}});
 });
 it('retains a compatible header when a versioned response is missing header delivery',()=>{
  const prior=market.parsePublicMarket(input([head()])),raw=input([]);Object.assign(raw.transport,{publicProfileHeadsRevision:'b'.repeat(64)});
  const next=market.parsePublicMarket(raw),selected=market.retainPublicProfileHeaders(next,prior);
  expect(selected.publicProfileHeads?.[0].profile.userId).toBe(uid);
  market.rememberPublicMarketResponse(next,raw);
  const values=new Map<string,string>();vi.stubGlobal('localStorage',{getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>values.set(key,value)});
  market.retainPublicMarket(next,undefined,selected,prior);
  const cold=market.parsePublicMarket(JSON.parse(values.get('receiz-bank-public-discovery-v2')!));expect(cold.publicProfileHeads?.[0].profile.userId).toBe(uid);
 });

 it('keeps a newer accepted full header against its consumed older cohort, but accepts a genuinely changed header',()=>{
  const a=market.parsePublicMarket(input([head({bannerUrl:'/artwork/old-a.png',updatedAt:'2026-11-01T10:00:00Z'})]));profiles.retainPublicProfile(profiles.selectHeldPublicProfile(username,a)!);
  const full=profileFixture();full.profile.profile.bannerUrl='/artwork/new-b.png';full.profile.originalsPage={hasMore:false,nextCursor:''};const b=profiles.retainPublicProfile(profiles.parsePublicProfile(full,username));
  expect(profiles.selectHeldPublicProfile(username,a)).toBe(b);
  const sameA=market.parsePublicMarket(JSON.parse(JSON.stringify(input([head({bannerUrl:'/artwork/old-a.png',updatedAt:'2026-11-01T10:00:00Z'})],['one','two']))));
  expect(profiles.selectHeldPublicProfile(username,sameA)).toBe(b);
  const c=market.parsePublicMarket(input([head({bannerUrl:'/artwork/old-a.png',updatedAt:'2026-11-06T10:00:00Z'})]));expect(profiles.selectHeldPublicProfile(username,c)?.bannerUrl).toBe('https://receiz.com/artwork/old-a.png');
 });

});
