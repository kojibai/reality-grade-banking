import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {parsePublicMarket,type PublicMarketCatalog} from '../src/receiz/public-market';
import {publicProfileArtwork} from '../src/receiz/profile-artwork';
import {profileFixture} from './fixtures/public-profile';

const username='alexmorgan',userId='account-1',createdAt='2026-01-10T12:00:00Z';
function original(id:string,pulse:string|null='14800000',fields:Record<string,unknown>={}){
 return {id:`market:${id}`,receizId:id,title:`Original ${id}`,summary:'Public work',ownerUsername:username,ownerDisplayName:'Alex Morgan',ownerUserId:userId,ownerCreatedAt:createdAt,
  canonicalHref:`https://receiz.com/${username}/verified/${id}`,verifyHref:'/v/20261020_1000/AB12CD34/14800000',pulse,createdAt:'2026-10-20T10:00:00Z',valueUsd:12,
  profileOriginal:{hasLongForm:false,media:{kind:'image',src:'/artwork/work.png',originalDownloadSha256Hex:'b'.repeat(64)}},...fields};
}
function market(rows:ReturnType<typeof original>[]):PublicMarketCatalog{
 return parsePublicMarket({ok:true,transport:{generatedAt:'2026-11-05T12:00:00Z',publicOriginals:rows,publicMembership:{version:1,scope:'whole-market-visible-showcase',source:'canonical-complete',isComplete:true,itemCount:rows.length,revision:'test-selected'}}});
}
type ProfileModule=typeof import('../src/receiz/public-profile');
let profiles:ProfileModule;
let fetcher:ReturnType<typeof vi.fn>;
beforeEach(async()=>{
 vi.resetModules();
 fetcher=vi.fn(async()=>{throw Error('Held profile display must not read the network');});vi.stubGlobal('fetch',fetcher);
 profiles=await import('../src/receiz/public-profile');
});
afterEach(()=>{expect(fetcher).not.toHaveBeenCalled();vi.unstubAllGlobals();vi.restoreAllMocks();});

describe('held Market profile selection',()=>{
 it('projects the exact owner-bound Original references in sealed-pulse order without changing the catalog',()=>{
  const catalog=market([original('tie-a','9007199254740992'),original('newest','9007199254740993'),original('missing',null),original('tie-z','9007199254740992'),original('other','9999999999999999',{ownerUsername:'different',ownerUserId:'other-account'})]);
  const sports={...catalog.items[0],id:'sports:held',assetId:'sports-held',category:'sports' as const};catalog.items.push(sports);
  const before=catalog.items.slice(),selected=profiles.selectHeldPublicProfile(username,catalog);
  expect(selected).not.toBeNull();expect(selected).toMatchObject({schema:'bankeiz.public-profile.v1',userId,username,displayName:'Alex Morgan',createdAt,nextCursor:null});
  expect(selected!.items).toEqual([before[1],before[3],before[0],before[2]]);
  selected!.items.forEach(item=>expect(before.find(held=>held.assetId===item.assetId)).toBe(item));
  expect(catalog.items).toEqual(before);expect(selected!.items).not.toContain(sports);expect(selected!.stats.originals).toBe(4);
  expect(profiles.publicProfileHasHeader(selected!)).toBe(false);
 });

 it('reuses the public default artwork projector from the held original-account coordinates',()=>{
  const catalog=market([original('default')]),expected=publicProfileArtwork({userId,username,createdAt}),selected=profiles.selectHeldPublicProfile(username,catalog)!;
  expect(expected.avatarUrl).toMatch(/^data:image\/svg\+xml/);expect(expected.bannerUrl).toMatch(/^data:image\/svg\+xml/);
  expect(selected.avatarUrl).toBe(expected.avatarUrl);expect(selected.bannerUrl).toBe(expected.bannerUrl);
 });

 it('preserves a carried owner portrait instead of substituting regenerated artwork',()=>{
  const avatar='https://receiz.com/artwork/custom-owner.png',catalog=market([original('portrait',undefined,{ownerAvatarUrl:avatar})]);
  expect(profiles.selectHeldPublicProfile(username,catalog)?.avatarUrl).toBe(avatar);
 });

 it.each(['missing','bare-handle','missing-uid','conflicting-uid','mismatched-bound-handle'] as const)('does not establish a profile from %s',kind=>{
  let catalog:PublicMarketCatalog|null;
  if(kind==='missing')catalog=null;
  else if(kind==='bare-handle')catalog=market([original('bare',undefined,{ownerUserId:undefined,ownerCreatedAt:undefined})]);
  else if(kind==='missing-uid')catalog=market([original('no-uid',undefined,{ownerUserId:undefined})]);
  else if(kind==='conflicting-uid')catalog=market([original('one'),original('two',undefined,{ownerUserId:'different-account'})]);
  else{catalog=market([original('mismatched')]);catalog.items[0].ownerIdentity={...catalog.items[0].ownerIdentity!,username:'different'};}
  expect(profiles.selectHeldPublicProfile(username,catalog)).toBeNull();
 });

 it('prefers already-held full metadata, artwork and profile PBI without replacing its items',()=>{
  const input=profileFixture();input.profile.originalsPage={hasMore:false,nextCursor:''};
  const full=profiles.parsePublicProfile(input,username),retained=profiles.retainPublicProfile(full),catalog=market([original('different-held-collection')]);
  const selected=profiles.selectHeldPublicProfile(username,catalog);
  expect(selected).toBe(retained);expect(selected!.items).toBe(retained.items);
  expect(selected).toMatchObject({bio:'Original work.',websiteUrl:'https://example.com/',avatarUrl:'https://receiz.com/artwork/avatar.png',bannerUrl:'https://receiz.com/artwork/cover.png',authorshipVerified:true,pbiReceiptHash:'a'.repeat(64)});
  expect(profiles.publicProfileHasHeader(selected!)).toBe(true);expect(profiles.selectHeldPublicProfile(username,null)).toBe(retained);
 });

 it('reuses the selected profile and item array across wrappers of the same held Market rows',()=>{
  const catalog=market([original('one'),original('two','14800001')]),first=profiles.selectHeldPublicProfile(username,catalog)!;
  expect(profiles.selectHeldPublicProfile(username,catalog)).toBe(first);
  const wrapper={...catalog,revision:'same-rows-new-wrapper',observedAt:'2026-11-05T12:01:00Z'};
  const returned=profiles.selectHeldPublicProfile(username,wrapper)!;
  expect(returned).toBe(first);expect(returned.items).toBe(first.items);expect(returned.avatarUrl).toBe(first.avatarUrl);
 });

 it('shows a newly selected append while retaining the exact prior and appended item operands',()=>{
  const catalog=market([original('older')]),first=profiles.selectHeldPublicProfile(username,catalog)!;
  const appended=market([original('appended','14800001')]).items[0],next={...catalog,items:[...catalog.items,appended],revision:'accepted-append'};
  const selected=profiles.selectHeldPublicProfile(username,next)!;
  expect(selected).not.toBe(first);expect(selected.items).toHaveLength(2);expect(selected.items[0]).toBe(appended);expect(selected.items[1]).toBe(catalog.items[0]);
  expect(first.items).toEqual([catalog.items[0]]);expect(profiles.selectHeldPublicProfile(username,next)).toBe(selected);
 });

 it('does not turn Original PBI evidence or raw private fields into profile-level metadata',()=>{
  const catalog=market([original('signed',undefined,{email:'private@example.com',balance:'private-balance',profileOriginal:{hasPbiSignature:true,pbiReceiptHash:'c'.repeat(64),hasLongForm:false}})]);
  expect(catalog.items[0].hasPbiSignature).toBe(true);
  const selected=profiles.selectHeldPublicProfile(username,catalog)!;
  expect(selected.authorshipVerified).toBe(false);expect(selected.pbiReceiptHash).toBeNull();expect(profiles.publicProfileHasHeader(selected)).toBe(false);
  expect(JSON.stringify(selected)).not.toMatch(/private@example|private-balance/);
 });
});
