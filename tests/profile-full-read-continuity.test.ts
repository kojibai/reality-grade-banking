import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {parsePublicMarket} from '../src/receiz/public-market';
import {profileFixture} from './fixtures/public-profile';

const username='alexmorgan';
type Profiles=typeof import('../src/receiz/public-profile');
let profiles:Profiles;
beforeEach(async()=>{vi.resetModules();profiles=await import('../src/receiz/public-profile');});
afterEach(()=>{vi.unstubAllGlobals();vi.restoreAllMocks();});
function market(ids:string[],userId='account-1'){
 return parsePublicMarket({ok:true,transport:{publicOriginals:ids.map((id,index)=>({id:`market:${id}`,receizId:id,title:id,ownerUsername:username,ownerDisplayName:userId==='account-1'?'Alex Morgan':'Blair',ownerUserId:userId,ownerCreatedAt:'2026-01-10T12:00:00Z',pulse:String(14800000+index),createdAt:'2026-10-20T10:00:00Z',profileOriginal:{hasLongForm:false}})),publicMembership:{version:1,scope:'whole-market-visible-showcase',source:'canonical-complete',isComplete:true,itemCount:ids.length,revision:ids.join(':')}}});
}
function full(){return profiles.parsePublicProfile(profileFixture(),username);}
function accept(kind:'projected-append'|'confirmed-metadata'|'new-uid'){
 if(kind==='confirmed-metadata'){const accepted=full();return profiles.retainPublicProfile({...accepted,bio:'Newly accepted public header',items:market(['accepted','appended']).items,nextCursor:null});}
 const firstCatalog=market(['accepted'],kind==='new-uid'?'account-2':'account-1');profiles.retainPublicProfile(profiles.selectHeldPublicProfile(username,firstCatalog)!);
 const appended=market(['appended'],kind==='new-uid'?'account-2':'account-1').items[0],next={...firstCatalog,items:[...firstCatalog.items,appended]};return profiles.retainPublicProfile(profiles.selectHeldPublicProfile(username,next)!);
}

it.each((['projected-append','confirmed-metadata','new-uid'] as const).flatMap(kind=>[200,403,404].map(status=>({kind,status}))))('keeps $kind selected when an older genuine full read settles with $status',async({kind,status})=>{
 let finish!:(value:Response)=>void;const fetcher=vi.fn(()=>new Promise<Response>(resolve=>{finish=resolve;}));vi.stubGlobal('fetch',fetcher);
 const read=profiles.fetchPublicProfile(username);expect(fetcher).toHaveBeenCalledExactlyOnceWith('/api/bank/public-profile/alexmorgan',expect.objectContaining({credentials:'omit',redirect:'error',cache:'no-store'}));
 const selected=accept(kind),items=selected.items,hasHeader=profiles.publicProfileHasHeader(selected);
 finish(status===200?Response.json(full()):new Response(null,{status}));
 if(status===200)expect((await read)===selected).toBe(true);else await expect(read).rejects.toThrow(status===403?'PROFILE_PRIVATE':'PROFILE_NOT_FOUND');
 const current=profiles.retainedPublicProfile(username);expect(current===selected).toBe(true);expect(current!.items===items).toBe(true);expect(current!.items).toHaveLength(2);expect(current!.items.map(item=>item.assetId)).toEqual(expect.arrayContaining(['accepted','appended']));
 expect(profiles.publicProfileHasHeader(current!)).toBe(hasHeader);expect(profiles.publicProfilePageError(username)).toBe('');expect(fetcher).toHaveBeenCalledTimes(1);
});

it('keeps a refused full transport from admitting or withdrawing Source before a successful explicit retry',async()=>{
 const catalog=market(['accepted']),fetcher=vi.fn().mockResolvedValueOnce(new Response(null,{status:403})).mockImplementationOnce(async()=>Response.json(full()));vi.stubGlobal('fetch',fetcher);
 await expect(profiles.fetchPublicProfile(username)).rejects.toThrow('PROFILE_PRIVATE');expect(profiles.publicProfilePageError(username)).toBe('');expect(profiles.retainedPublicProfile(username)).toBeNull();expect(profiles.selectHeldPublicProfile(username,catalog)?.items).toHaveLength(1);
 const retried=await profiles.fetchPublicProfile(username);expect(profiles.retainedPublicProfile(username)===retried).toBe(true);expect(profiles.selectHeldPublicProfile(username,catalog)===retried).toBe(true);expect(profiles.publicProfileHasHeader(retried)).toBe(true);expect(profiles.publicProfilePageError(username)).toBe('');expect(fetcher.mock.calls.map(([url])=>String(url))).toEqual(['/api/bank/public-profile/alexmorgan','/api/bank/public-profile/alexmorgan']);
});

it.each([200,403,404])('keeps a newly complete same-UID cohort when an older explicit expansion settles with %s',async status=>{
 const catalog=market(['accepted']),partial={...catalog,complete:false};profiles.retainPublicProfile(profiles.selectHeldPublicProfile(username,partial)!);
 let finish!:(value:Response)=>void;const fetcher=vi.fn(()=>new Promise<Response>(resolve=>{finish=resolve;}));vi.stubGlobal('fetch',fetcher);
 const read=profiles.fetchPublicProfile(username,'all:account-1'),appended=market(['appended']).items[0],next={...catalog,items:[...catalog.items,appended]},selected=profiles.retainPublicProfile(profiles.selectHeldPublicProfile(username,next)!);
 finish(status===200?Response.json(full()):new Response(null,{status}));
 if(status===200){const returned=await read;expect(returned===selected).toBe(true);profiles.retainPublicProfile(returned);}else await expect(read).rejects.toThrow(status===403?'PROFILE_PRIVATE':'PROFILE_NOT_FOUND');
 expect(profiles.retainedPublicProfile(username)===selected).toBe(true);expect(profiles.retainedPublicProfile(username)!.items).toContain(appended);expect(profiles.retainedPublicProfile(username)!.nextCursor).toBeNull();expect(profiles.publicProfilePageError(username)).toBe('');expect(fetcher).toHaveBeenCalledTimes(1);
});

it('cancels an already superseded success body without parsing the discarded full collection',async()=>{
 let finish!:(value:Response)=>void;const fetcher=vi.fn(()=>new Promise<Response>(resolve=>{finish=resolve;}));vi.stubGlobal('fetch',fetcher);
 const read=profiles.fetchPublicProfile(username),selected=accept('projected-append'),response=Response.json(full()),parse=vi.spyOn(response,'json'),cancel=vi.spyOn(response.body!,'cancel');
 finish(response);expect((await read)===selected).toBe(true);expect(parse).not.toHaveBeenCalled();expect(cancel).toHaveBeenCalledOnce();expect(profiles.retainedPublicProfile(username)===selected).toBe(true);expect(fetcher).toHaveBeenCalledTimes(1);
});
it('advances a directly held full profile when the shared reader selects a subsequent Showcase collection',async()=>{
 const {publishDiscoveredPublicCatalog}=await import('../src/receiz/asset-publication-adoption');const first=market(['accepted']);publishDiscoveredPublicCatalog(first);
 const original=profiles.retainPublicProfile(full()),next=market(['accepted','new-showcase-original']);publishDiscoveredPublicCatalog(next);
 const selected=profiles.selectHeldPublicProfile(username,next)!;
 expect(selected.items.map(item=>item.assetId)).toEqual(['new-showcase-original','accepted']);expect(selected.bio).toBe(original.bio);expect(selected.avatarUrl).toBe(original.avatarUrl);expect(selected.userId).toBe(original.userId);
});
it('withdraws the last Original from a directly held full profile when the shared complete selection becomes empty',async()=>{
 const {publishDiscoveredPublicCatalog}=await import('../src/receiz/asset-publication-adoption');publishDiscoveredPublicCatalog(market(['accepted']));const previous=profiles.retainPublicProfile(full()),next=market([]);publishDiscoveredPublicCatalog(next);
 const selected=profiles.selectHeldPublicProfile(username,next)!;expect(selected.items).toEqual([]);expect(selected.bio).toBe(previous.bio);expect(selected.stats.originals).toBe(0);
});
it('keeps a newer full reader collection through a shared header-only edit',async()=>{
 const {publishDiscoveredPublicCatalog}=await import('../src/receiz/asset-publication-adoption');const first=market(['accepted']);publishDiscoveredPublicCatalog(first);const previous=profiles.retainPublicProfile(full()),next={...first,publicProfileHeadsRevision:'b'.repeat(64)};publishDiscoveredPublicCatalog(next);
 expect(profiles.selectHeldPublicProfile(username,next)!.items).toBe(previous.items);
});
it('does not replace a newer full reader with the first unassociated saved family',async()=>{
 const previous=profiles.retainPublicProfile(full()),{publishDiscoveredPublicCatalog}=await import('../src/receiz/asset-publication-adoption'),saved=market(['old-saved-work']);publishDiscoveredPublicCatalog(saved);expect(profiles.selectHeldPublicProfile(username,saved)!.items).toBe(previous.items);
});

it('keeps the exact enclosing document basis when a saved successor arrives before its full profile is decoded',async()=>{
 const {curatePublicProfileHead}=await import('../src/receiz/public-profile-header'),raw=profileFixture().profile,headA=curatePublicProfileHead(raw)!,headB=curatePublicProfileHead({...raw,profile:{...raw.profile,bio:'Saved successor biography'}})!;
 const documentCatalog={...market(['document-original']),publicProfileHeads:[headA]},successor={...market(['saved-successor']),publicProfileHeads:[headB]},{publishDiscoveredPublicCatalog}=await import('../src/receiz/asset-publication-adoption');publishDiscoveredPublicCatalog(successor);
 const value={...full(),schema:'bankeiz.public-profile.v1'},seed={textContent:JSON.stringify(value),remove:vi.fn()};
 vi.stubGlobal('document',{getElementById:(id:string)=>id==='public-profile-seed'?seed:id==='receiz-navigation'?{publicMarketCatalog:()=>successor}:null});
 const carried=profiles.retainedPublicProfile(username,documentCatalog)!;expect(carried.items).toHaveLength(value.items.length);expect(seed.remove).toHaveBeenCalledOnce();
 const selected=profiles.selectHeldPublicProfile(username,successor)!;expect(selected.items.map(item=>item.assetId)).toEqual(['saved-successor']);expect(selected.bio).toBe('Saved successor biography');
});
