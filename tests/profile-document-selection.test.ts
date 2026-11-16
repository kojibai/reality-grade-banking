// @vitest-environment happy-dom
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import fixture from './fixtures/profile-cold-reopen.json';
import type {PublicMarketCatalog,PublicMarketItem} from '../src/receiz/public-market';
import type {PublicProfile} from '../src/receiz/public-profile';

let profiles:typeof import('../src/receiz/public-profile'),adoption:typeof import('../src/receiz/asset-publication-adoption'),market:typeof import('../src/receiz/public-market'),fetcher:ReturnType<typeof vi.fn>;
beforeEach(async()=>{vi.resetModules();localStorage.clear();document.body.innerHTML='';fetcher=vi.fn(async()=>{throw Error('A held profile must not read the network');});vi.stubGlobal('fetch',fetcher);profiles=await import('../src/receiz/public-profile');adoption=await import('../src/receiz/asset-publication-adoption');market=await import('../src/receiz/public-market');});
afterEach(()=>{expect(fetcher).not.toHaveBeenCalled();vi.unstubAllGlobals();});
type DisplayFact={id:string;assetId:string;title:string;pulse:string;sealedAt:string;originalDigest:string|null};
function catalog(rows:readonly DisplayFact[],revision:string){
 const originals=rows.map(row=>({id:row.id,receizId:row.assetId,title:row.title,ownerUsername:fixture.owner.username,ownerDisplayName:'Cadence',ownerUserId:fixture.owner.userId,ownerCreatedAt:fixture.owner.createdAt,pulse:row.pulse,createdAt:row.sealedAt,valueUsd:12,profileOriginal:{media:{kind:'image',originalDownloadSha256Hex:row.originalDigest}}}));
 return market.parsePublicMarket({ok:true,transport:{publicOriginals:originals,publicMembership:{version:1,scope:'whole-market-visible-showcase',source:'canonical-complete',isComplete:true,itemCount:originals.length,revision}}});
}
function setup(){
 const before=catalog([fixture.predecessor],'older-carried-document'),next=catalog(fixture.additions,'accepted-two-additions');
 const head={profile:{...fixture.owner,...fixture.artwork,displayName:'Cadence',bio:'Retained biography',isPrivate:false},viewer:{canView:true},stats:{originals:2,signedOriginals:0}};
 before.publicProfileHeads=[{...head,stats:{originals:1,signedOriginals:0}}];next.publicProfileHeads=[head];
 const original=profiles.selectHeldPublicProfile(fixture.owner.username,before)!;
 const seed=document.createElement('script');seed.id='public-profile-seed';seed.type='application/json';seed.textContent=JSON.stringify(original);document.body.append(seed);
 return{before,next,original};
}
function bindAfterEarlyRestore(before:PublicMarketCatalog,next:PublicMarketCatalog,consumeFirst=false){
 if(consumeFirst)profiles.retainedPublicProfile(fixture.owner.username);
 adoption.publishDiscoveredPublicCatalog(next);
 const restored=profiles.retainedPublicProfile(fixture.owner.username)!;
 expect(restored.items.map(row=>row.id)).toEqual([fixture.predecessor.id]);
 // The entry already supplies this exact carried catalog after its local
 // preparation. A prior read of the serialized profile must not lose it.
 profiles.retainedPublicProfile(fixture.owner.username,before);
 return profiles.selectHeldPublicProfile(fixture.owner.username,adoption.retainedDiscoveredPublicCatalog());
}
it.each([true,false])('binds a serialized profile to its actual document when consumed before durable restoration=%s',consumeFirst=>{
 const {before,next,original}=setup(),items=next.items,unchanged=JSON.stringify(next),selected=bindAfterEarlyRestore(before,next,consumeFirst)!;
 expect(selected.items.map(row=>row.id)).toEqual(fixture.additions.map(row=>row.id));
 expect(selected.items.some(row=>row.id===fixture.predecessor.id)).toBe(false);
 for(const item of selected.items)expect(item).toBe(items.find(row=>row.id===item.id));
 expect(selected).toMatchObject({...fixture.owner,avatarUrl:original.avatarUrl,bannerUrl:original.bannerUrl,bio:'Retained biography',stats:{originals:2},nextCursor:null});
 expect(adoption.retainedDiscoveredPublicCatalog()?.items).toBe(items);expect(JSON.stringify(next)).toBe(unchanged);
 profiles.retainPublicProfile(selected);
 expect(profiles.retainedPublicProfile(fixture.owner.username,before)).toBe(selected);
 expect(profiles.selectHeldPublicProfile(fixture.owner.username,next)?.items).toBe(selected.items);
});
it('retains the pending document binding through an early header-only selection',()=>{
 const {before,next}=setup();profiles.retainedPublicProfile(fixture.owner.username);
 next.publicProfileHeads![0].profile.bio='Accepted header v2';adoption.publishDiscoveredPublicCatalog(next);
 const headerOnly=profiles.selectHeldPublicProfile(fixture.owner.username,next)!;
 expect(headerOnly.bio).toBe('Accepted header v2');expect(headerOnly.items.map(row=>row.id)).toEqual([fixture.predecessor.id]);
 profiles.retainPublicProfile(headerOnly);
 const changed=vi.fn(),stop=profiles.subscribePublicProfiles(changed);
 profiles.retainedPublicProfile(fixture.owner.username,before);
 expect(changed).toHaveBeenCalledOnce();profiles.retainedPublicProfile(fixture.owner.username,before);expect(changed).toHaveBeenCalledOnce();stop();
 const selected=profiles.selectHeldPublicProfile(fixture.owner.username,next)!;
 expect(selected.items.map(row=>row.id)).toEqual(fixture.additions.map(row=>row.id));expect(selected.bio).toBe('Accepted header v2');
 for(const item of selected.items)expect(item).toBe(next.items.find(row=>row.id===item.id));
});
it('keeps the full-reader guard for a result that did not come from this document seed',()=>{
 const {before,next,original}=setup();document.getElementById('public-profile-seed')!.remove();adoption.publishDiscoveredPublicCatalog(next);
 const full=profiles.retainPublicProfile(structuredClone(original));
 profiles.retainedPublicProfile(fixture.owner.username,before);
 expect(profiles.selectHeldPublicProfile(fixture.owner.username,next)).toBe(full);
});
it.each(['missing-owner','created-at','uid','privacy'] as const)('preserves existing %s refusal after binding a serialized document',reason=>{
 const {before,next}=setup();
 if(reason==='missing-owner')delete next.items[1].ownerIdentity;
 if(reason==='created-at')next.items[1].ownerIdentity={...next.items[1].ownerIdentity!,createdAt:'2026-01-01T00:00:00Z'};
 if(reason==='uid')next.items[1].ownerIdentity={...next.items[1].ownerIdentity!,userId:'different-account'};
 if(reason==='privacy')next.publicProfileHeadRefusals=[{profile:{userId:fixture.owner.userId,username:fixture.owner.username,isPrivate:true},viewer:{canView:false}}];
 const selected=bindAfterEarlyRestore(before,next);
 if(reason==='uid'||reason==='privacy')expect(selected).toBeNull();
 else expect((selected as PublicProfile).items.map((row:PublicMarketItem)=>row.id)).toEqual([fixture.predecessor.id]);
});
