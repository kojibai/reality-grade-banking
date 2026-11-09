// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,expect,it,vi} from 'vitest';
import {profileFixture} from './fixtures/public-profile';
import {parsePublicMarket} from '../src/receiz/public-market';
import {PublicProfilePage} from '../src/public-explorer/PublicProfilePage';
import * as profiles from '../src/receiz/public-profile';
import {createPublicProfileReader} from '../server/public-profile';

Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
const full='pbahqdfouqyxgsifcy',legacy='receiz_'+full.slice(0,17),cleanup:Array<()=>void>=[];
function fixture(){
 const value=profileFixture();Object.assign(value.profile.profile,{username:legacy,receivingUsername:full});
 value.profile.originalsPage={hasMore:false,nextCursor:''};return value;
}
function catalog(){
 const value=fixture().profile;
 return parsePublicMarket({ok:true,transport:{publicMembership:{version:1,scope:'whole-market-visible-showcase',source:'canonical-complete',isComplete:true,itemCount:0,revision:'selected'},publicOriginals:[],publicProfileHeads:[value]}});
}
afterEach(()=>{cleanup.splice(0).forEach(run=>run());profiles.retainPublicProfile(profiles.parsePublicProfile(fixture(),legacy));profiles.forgetPublicProfile(legacy);profiles.forgetPublicProfile(full);vi.unstubAllGlobals();vi.restoreAllMocks();});
it.each([full,'receiz_'+full])('opens a Discover display link %s from the exact held owner with APIs stalled',async username=>{
 const held=catalog(),source={catalog:held,historyCatalog:held,status:'stale',pulse:15000000,quoteStatus:'stale',sportsStatus:'missing',error:null,refresh:async()=>{}} as React.ComponentProps<typeof PublicProfilePage>['source'];
 const fetcher=vi.fn(()=>new Promise<Response>(()=>{}));vi.stubGlobal('fetch',fetcher);
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host);cleanup.push(()=>{act(()=>root.unmount());host.remove();});
 await act(async()=>root.render(<PublicProfilePage username={username} source={source} active/>));
 expect(host.querySelector('h1')?.textContent).toBe('Alex Morgan');expect(host.textContent).toContain('Original work.');
 expect(host.querySelector('.profile-banner img')?.getAttribute('src')).toBe('https://receiz.com/artwork/cover.png');
 expect(host.textContent).not.toContain('This public profile is not available.');expect(fetcher).not.toHaveBeenCalled();
 const selected=profiles.selectHeldPublicProfile(username,source.catalog)!;
 expect(selected.userId).toBe('account-1');expect(selected.username).toBe(legacy);
 expect(profiles.selectHeldPublicProfile(legacy,source.catalog)).toBe(selected);
 profiles.forgetPublicProfilesForAccount(selected.userId);
 expect(profiles.selectHeldPublicProfile(username,source.catalog)).toBeNull();
});
it('does not infer a shortened owner from the name or choose an ambiguous owner',()=>{
 expect(profiles.heldPublicProfileUsername(full)).toBe(full);
 const selected=catalog(),first=selected.publicProfileHeads![0];
 selected.publicProfileHeads=[...selected.publicProfileHeads!,{...first,profile:{...first.profile,userId:'other-owner'}}];
 expect(profiles.heldPublicProfileUsername(full,selected)).toBe(full);
});
it.each([full,'receiz_'+full])('resolves a genuinely missing %s through its existing exact route redirect',async username=>{
 const value=fixture(),fetcher=vi.fn(async()=>Response.json(value));
 fetcher.mockImplementationOnce(async()=>new Response(null,{status:307,headers:{location:`/api/profile/${legacy}?surface=public-route&representation=collection-v2`}}));
 const read=createPublicProfileReader(fetcher,async profile=>profile),profile=await read(username);
 expect(profile.username).toBe(legacy);expect(profile.receivingUsername).toBe(full);expect(fetcher).toHaveBeenCalledTimes(2);
 expect(profiles.profilePageUsername('/'+username+'/')).toBe(username);
});
it('rejects an external or unbound alias redirect',async()=>{
 const external=createPublicProfileReader(async()=>new Response(null,{status:307,headers:{location:'https://other.example/api/profile/'+legacy}}));
 await expect(external(full)).rejects.toThrow('PROFILE_ALIAS_UNAVAILABLE');
 const value=fixture();Object.assign(value.profile.profile,{receivingUsername:'aaaaaaaaaaaaaaaaaa'});
 let calls=0;const unbound=createPublicProfileReader(async()=>++calls===1?new Response(null,{status:307,headers:{location:`/api/profile/${legacy}?surface=public-route&representation=collection-v2`}}):Response.json(value));
 await expect(unbound(full)).rejects.toThrow('PROFILE_IDENTITY_MISMATCH');
});
