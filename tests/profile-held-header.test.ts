import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {parsePublicMarket,type PublicMarketCatalog} from '../src/receiz/public-market';
import {publicProfileArtwork} from '../src/receiz/profile-artwork';
import {profileFixture} from './fixtures/public-profile';

const username='alexmorgan',uid='account-1';
type Profiles=typeof import('../src/receiz/public-profile');
let profiles:Profiles;
beforeEach(async()=>{vi.resetModules();profiles=await import('../src/receiz/public-profile');});
afterEach(()=>{vi.unstubAllGlobals();vi.restoreAllMocks();});
function market(ids=['one'],userId=uid):PublicMarketCatalog{
 return parsePublicMarket({ok:true,transport:{publicOriginals:ids.map((id,index)=>({id:`market:${id}`,receizId:id,title:id,ownerUsername:username,ownerDisplayName:'Alex Morgan',ownerUserId:userId,ownerCreatedAt:'2026-01-10T12:00:00Z',pulse:String(14800000+index),createdAt:'2026-10-20T10:00:00Z',profileOriginal:{hasLongForm:false}})),publicMembership:{version:1,scope:'whole-market-visible-showcase',source:'canonical-complete',isComplete:true,itemCount:ids.length,revision:ids.join(':')}}});
}
function hold(catalog=market()){return profiles.retainPublicProfile(profiles.selectHeldPublicProfile(username,catalog)!);}
function header(userId=uid){const full=profiles.parsePublicProfile(profileFixture(),username),{items:_items,nextCursor:_cursor,...value}=full;return {...value,userId};}
function pendingResponse(){let finish!:(value:Response)=>void;const fetcher=vi.fn(()=>new Promise<Response>(resolve=>{finish=resolve;}));vi.stubGlobal('fetch',fetcher);return {fetcher,finish:(value:Response)=>finish(value)};}

describe('held profile header enrichment',()=>{
 it('coalesces concurrent missing headers and keeps the exact already-held collection',async()=>{
  const selected=hold(),items=selected.items,{fetcher,finish}=pendingResponse();
  const first=profiles.fetchPublicProfileHeader(selected),second=profiles.fetchPublicProfileHeader(selected);
  expect(first).toBe(second);expect(fetcher).toHaveBeenCalledExactlyOnceWith('/api/bank/public-profile/alexmorgan?view=head',expect.objectContaining({credentials:'omit',redirect:'error',cache:'no-store'}));
  expect(profiles.retainedPublicProfile(username)).toBe(selected);finish(Response.json(header()));
  const accepted=await first;expect(accepted.items).toBe(items);expect(accepted).toMatchObject({bio:'Original work.',bannerUrl:'https://receiz.com/artwork/cover.png',authorshipVerified:true,pbiReceiptHash:'a'.repeat(64)});
  expect(profiles.publicProfileHasHeader(accepted)).toBe(true);expect(profiles.selectHeldPublicProfile(username,null)).toBe(accepted);expect(fetcher).toHaveBeenCalledTimes(1);
 });

 it('enriches the currently selected appended collection rather than restoring the requested old array',async()=>{
  const firstCatalog=market(),first=hold(firstCatalog),{fetcher,finish}=pendingResponse(),read=profiles.fetchPublicProfileHeader(first);
  const appended=market(['appended']).items[0],next={...firstCatalog,items:[...firstCatalog.items,appended]},current=hold(next),items=current.items;
  finish(Response.json(header()));const accepted=await read;
  expect(accepted.items).toBe(items);expect(accepted.items).toContain(appended);expect(profiles.retainedPublicProfile(username)).toBe(accepted);expect(fetcher).toHaveBeenCalledTimes(1);
 });

 it('reuses complete held metadata on ordinary return after the previous fifteen-second age',async()=>{
  const selected=profiles.retainPublicProfile(profiles.parsePublicProfile(profileFixture(),username)),fetcher=vi.fn(async()=>{throw Error('return must not reread the full collection');});vi.stubGlobal('fetch',fetcher);
  const now=Date.now();vi.spyOn(Date,'now').mockReturnValue(now+60_000);
  expect(profiles.selectHeldPublicProfile(username,market())).toBe(selected);expect(profiles.selectHeldPublicProfile(username,null)).toBe(selected);expect(fetcher).not.toHaveBeenCalled();
 });

 it.each([403,404,409])('keeps a confirmed %s refusal from resurrecting through the same held Market',async status=>{
  const catalog=market(),selected=hold(catalog),fetcher=vi.fn(async()=>new Response(null,{status}));vi.stubGlobal('fetch',fetcher);
  await expect(profiles.fetchPublicProfileHeader(selected)).rejects.toThrow(status===403?'PROFILE_PRIVATE':status===404?'PROFILE_NOT_FOUND':'PROFILE_CHANGED');
  const now=Date.now();vi.spyOn(Date,'now').mockReturnValue(now+60_000);
  expect(profiles.retainedPublicProfile(username)).toBeNull();expect(profiles.selectHeldPublicProfile(username,catalog)).toBeNull();expect(profiles.selectHeldPublicProfile(username,{...catalog})).toBeNull();expect(fetcher).toHaveBeenCalledTimes(1);
 });

 it('keeps available public display and its exact items when distinct metadata is temporarily unavailable',async()=>{
  const catalog=market(),selected=hold(catalog),fetcher=vi.fn(async()=>new Response(null,{status:503}));vi.stubGlobal('fetch',fetcher);
  await expect(profiles.fetchPublicProfileHeader(selected)).rejects.toThrow('PROFILE_UNAVAILABLE');
  expect(profiles.retainedPublicProfile(username)).toBe(selected);expect(profiles.selectHeldPublicProfile(username,catalog)).toBe(selected);expect(profiles.publicProfileHasHeader(selected)).toBe(false);expect(fetcher).toHaveBeenCalledTimes(1);
 });

 it('does not apply a late header or refusal for the old UID over a newly admitted owner',async()=>{
  const selected=hold(),{fetcher,finish}=pendingResponse(),read=profiles.fetchPublicProfileHeader(selected);
  profiles.forgetPublicProfile(username);const replacement=hold(market(['new-owner'],'account-2'));
  finish(Response.json(header()));await read;expect(profiles.retainedPublicProfile(username)).toBe(replacement);expect(profiles.publicProfilePageError(username)).toBe('');expect(fetcher).toHaveBeenCalledTimes(1);
 });

 it('does not restore a late successful header after its selected public profile was explicitly invalidated',async()=>{
  const selected=hold(),{finish}=pendingResponse(),read=profiles.fetchPublicProfileHeader(selected);
  profiles.forgetPublicProfile(username);finish(Response.json(header()));await read;expect(profiles.retainedPublicProfile(username)).toBeNull();
 });

 it('does not let an obsolete header refusal remove newer confirmed metadata for the same UID',async()=>{
  const selected=hold(),{finish}=pendingResponse(),read=profiles.fetchPublicProfileHeader(selected);
  const full=profiles.parsePublicProfile(profileFixture(),username),replacement=profiles.retainPublicProfile({...full,bio:'Newly accepted public metadata'});
  finish(new Response(null,{status:403}));await expect(read).rejects.toThrow('PROFILE_PRIVATE');
  expect(profiles.retainedPublicProfile(username)===replacement).toBe(true);expect(profiles.selectHeldPublicProfile(username,market())===replacement).toBe(true);expect(profiles.publicProfilePageError(username)).toBe('');
 });

 it('appends confirmed profile PBI without pretending missing header metadata or the Market selection has been loaded',()=>{
  const catalog=market(),selected=hold(catalog);profiles.retainProfilePbiAuthorship(uid,'d'.repeat(64));
  const signed=profiles.retainedPublicProfile(username)!;expect(signed).toMatchObject({authorshipVerified:true,pbiReceiptHash:'d'.repeat(64)});expect(signed.items).toBe(selected.items);expect(profiles.publicProfileHasHeader(signed)).toBe(false);
  const appended=market(['appended']).items[0],next={...catalog,items:[...catalog.items,appended]},nextProfile=profiles.selectHeldPublicProfile(username,next)!;
  expect(nextProfile.items).toContain(appended);expect(nextProfile.authorshipVerified).toBe(true);expect(nextProfile.pbiReceiptHash).toBe('d'.repeat(64));
 });

 it('does not resurrect a confirmed previous handle from old Market rows after the same UID accepts a new handle',()=>{
  const catalog=market(),full=profiles.parsePublicProfile(profileFixture(),username);profiles.retainPublicProfile(full);profiles.retainPublicProfile({...full,username:'alexrenamed'});
  expect(profiles.retainedPublicProfile(username)).toBeNull();expect(profiles.selectHeldPublicProfile(username,catalog)===null).toBe(true);expect(profiles.retainedPublicProfile('alexrenamed')?.userId).toBe(uid);
 });

 it('does not reproject stale public rows after the existing confirmed-private account invalidation',()=>{
  const catalog=market();hold(catalog);
  // This is the existing native-identity private-profile publication callback.
  profiles.forgetPublicProfilesForAccount(uid);profiles.forgetPublicProfile(username);
  expect(profiles.retainedPublicProfile(username)).toBeNull();expect(profiles.selectHeldPublicProfile(username,catalog)===null).toBe(true);
 });

 it('projects a complete withdrawal as zero items while keeping the known owner and actual header',async()=>{
  const catalog=market(),selected=hold(catalog),fetcher=vi.fn(async()=>Response.json(header()));vi.stubGlobal('fetch',fetcher);
  const enriched=await profiles.fetchPublicProfileHeader(selected),empty=market([]),withdrawn=profiles.selectHeldPublicProfile(username,empty)!;
  expect(withdrawn.userId).toBe(uid);expect(withdrawn.username).toBe(username);expect(withdrawn.items).toEqual([]);expect(withdrawn.nextCursor).toBeNull();
  expect(withdrawn.bio).toBe(enriched.bio);expect(withdrawn.avatarUrl).toBe(enriched.avatarUrl);expect(withdrawn.bannerUrl).toBe(enriched.bannerUrl);expect(withdrawn.pbiReceiptHash).toBe(enriched.pbiReceiptHash);expect(profiles.publicProfileHasHeader(withdrawn)).toBe(true);
  expect(profiles.selectHeldPublicProfile(username,empty)).toBe(withdrawn);expect(fetcher).toHaveBeenCalledTimes(1);
 });

 it('keeps settled projected items when a partial catalog simply lacks their rows',()=>{
  const catalog=market(['one','two']),selected=hold(catalog),partial={...market([]),complete:false},fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);
  const current=profiles.selectHeldPublicProfile(username,partial);
  expect(current).toBe(selected);expect(current!.items).toBe(selected.items);expect(current!.items).toHaveLength(2);expect(fetcher).not.toHaveBeenCalled();
 });

 it.each(['projected','full'] as const)('replaces %s A with an unambiguous complete UID B binding without carrying A metadata',async kind=>{
  if(kind==='full')profiles.retainPublicProfile(profiles.parsePublicProfile(profileFixture(),username));
  else{const selected=hold();vi.stubGlobal('fetch',vi.fn(async()=>Response.json(header())));await profiles.fetchPublicProfileHeader(selected);}
  const previous=profiles.retainedPublicProfile(username)!,next=market(['new-one','new-two'],'account-2');next.items.forEach(item=>{item.ownerDisplayName='Blair';});
  const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);const current=profiles.selectHeldPublicProfile(username,next)!,expected=publicProfileArtwork(next.items[0].ownerIdentity!);
  expect(current===previous).toBe(false);expect(current.userId).toBe('account-2');expect(current.displayName).toBe('Blair');expect(current.bio).toBeNull();expect(current.websiteUrl).toBeNull();expect(current.links).toEqual([]);expect(current.socialLinks).toEqual([]);
  expect(current.authorshipVerified).toBe(false);expect(current.pbiReceiptHash).toBeNull();expect(profiles.publicProfileHasHeader(current)).toBe(false);
  expect(current.avatarUrl===previous.avatarUrl).toBe(false);expect(current.bannerUrl===previous.bannerUrl).toBe(false);expect(current.avatarUrl).toBe(expected.avatarUrl);expect(current.bannerUrl).toBe(expected.bannerUrl);
  expect(current.items).toHaveLength(2);current.items.forEach(item=>{expect(next.items.find(held=>held.assetId===item.assetId)).toBe(item);expect(previous.items.includes(item)).toBe(false);});expect(fetcher).not.toHaveBeenCalled();
 });

 it('fails closed when a replacement catalog has conflicting UIDs for the selected handle',()=>{
  hold();const a=market(['ambiguous-a']).items[0],b=market(['ambiguous-b'],'account-2').items[0],mixed={...market([]),items:[a,b]},fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);
  expect(profiles.selectHeldPublicProfile(username,mixed)===null).toBe(true);expect(fetcher).not.toHaveBeenCalled();
 });

 it.each([403,404,409])('keeps refused UID A blocked after %s while accepting an unambiguous complete public UID B',async status=>{
  const oldCatalog=market(),selected=hold(oldCatalog),fetcher=vi.fn(async()=>new Response(null,{status}));vi.stubGlobal('fetch',fetcher);
  await expect(profiles.fetchPublicProfileHeader(selected)).rejects.toThrow(status===403?'PROFILE_PRIVATE':status===404?'PROFILE_NOT_FOUND':'PROFILE_CHANGED');
  expect(profiles.selectHeldPublicProfile(username,oldCatalog)===null).toBe(true);expect(profiles.selectHeldPublicProfile(username,{...oldCatalog,items:[...oldCatalog.items]})===null).toBe(true);
  const next=market(['new-public'],'account-2'),current=profiles.selectHeldPublicProfile(username,next);
  expect(current?.userId).toBe('account-2');expect(current!.items).toHaveLength(1);expect(current!.items[0]).toBe(next.items[0]);expect(current!.bio).toBeNull();expect(current!.pbiReceiptHash).toBeNull();expect(current!.authorshipVerified).toBe(false);expect(profiles.publicProfileHasHeader(current!)).toBe(false);expect(fetcher).toHaveBeenCalledTimes(1);
 });
});
