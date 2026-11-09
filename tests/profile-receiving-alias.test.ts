import {expect,it,vi} from 'vitest';
import {handleProfilePreview} from '../server/profile-preview';
import {readPublicProfileAlias} from '../server/profile-alias';
const full='pbahqdfouqyxgsifcy',legacy='receiz_'+full.slice(0,17),generation='b'.repeat(64);
const html='<html><head></head><body><div id="public-explore-root"></div><script id="public-market-seed" type="application/json">{"generation":"'+generation+'"}</script><script id="receiz-navigation" type="application/json">{}</script></body></html>';
it.each([full,'receiz_'+full])('opens %s through its exact existing canonical profile without rendering another collection',async input=>{
 const profile=vi.fn(),alias=vi.fn(async()=>legacy),missingDocument=vi.fn(async(name:string)=>name===legacy?new Response('<article>Actual held profile</article>'):new Response(null,{status:503})),response=await handleProfilePreview(new Request('https://bankeiz.com/'+input+'/?utm_source=share',{headers:{accept:'text/html'}}),{profile,page:async()=>html,alias,missingDocument});
 expect(response.status).toBe(200);expect(response.headers.get('location')).toBeNull();expect(await response.text()).toContain('Actual held profile');expect(missingDocument.mock.calls).toEqual(input===full?[[full],[legacy]]:[[legacy]]);expect(alias).toHaveBeenCalledExactlyOnceWith(input);expect(profile).not.toHaveBeenCalled();
});
it('the production rewrite accepts the complete name and redirects through the same canonical route',async()=>{
 const response=await handleProfilePreview(new Request('https://bankeiz.com/api/profile?username=receiz_'+full,{method:'HEAD'}),{profile:vi.fn(),page:vi.fn(),alias:async()=>legacy});expect(response.status).toBe(307);expect(response.headers.get('location')).toBe('/'+legacy+'/');
});
it('a compiled canonical eighteen-character profile paints while alias and source readers are stalled',async()=>{
 const alias=vi.fn(()=>new Promise<string|null>(()=>{})),profile=vi.fn(),response=await handleProfilePreview(new Request('https://bankeiz.com/'+full+'/',{headers:{accept:'text/html'}}),{profile,alias,page:async()=>html,profileContent:async()=>`<!-- bank.profile.document.v1 ${generation} ${full} --><article>Actual complete profile</article>`});
 expect(response.status).toBe(200);expect(await response.text()).toContain('Actual complete profile');expect(alias).not.toHaveBeenCalled();expect(profile).not.toHaveBeenCalled();
});
it('does not guess an unbound full-name URL or leak a resolver error',async()=>{
 for(const alias of [async()=>null,async()=>{throw Error('private transport detail');}]){const response=await handleProfilePreview(new Request('https://bankeiz.com/receiz_'+full+'/',{headers:{accept:'text/html'}}),{profile:vi.fn(),page:async()=>html,alias});expect([404,503]).toContain(response.status);expect(await response.text()).not.toContain('private transport detail');}
});
it.each([full,'receiz_'+full])('uses only the existing Receiz HEAD redirect for %s and rejects a foreign or wrong canonical target',async input=>{
 const fetcher=vi.fn(async(url:URL|RequestInfo,init?:RequestInit)=>{expect(String(url)).toBe('https://receiz.com/api/profile/'+input+'?surface=public-route&representation=collection-v2');expect(init?.method).toBe('HEAD');expect(init?.redirect).toBe('manual');return new Response(null,{status:307,headers:{location:'https://receiz.com/api/profile/'+legacy+'?surface=public-route&representation=collection-v2'}});});
 expect(await readPublicProfileAlias(input,fetcher as typeof fetch)).toBe(legacy);expect(fetcher).toHaveBeenCalledOnce();
 for(const location of ['https://foreign.invalid/api/profile/'+legacy,'https://receiz.com/api/profile/another?surface=public-route&representation=collection-v2'])await expect(readPublicProfileAlias(input,vi.fn(async()=>new Response(null,{status:307,headers:{location}}))as typeof fetch)).rejects.toThrow('PROFILE_ALIAS_UNAVAILABLE');
});


it('serves a newly saved public profile by its full name with a single delivery read',async()=>{
 const profile=vi.fn(),alias=vi.fn(()=>new Promise<string|null>(()=>{}));
 const missingDocument=vi.fn(async()=>new Response('<article>Real first profile · 0 Originals</article>'));
 const response=await handleProfilePreview(new Request('https://bankeiz.com/'+full+'/',{headers:{accept:'text/html'}}),{
  profile,alias,page:async()=>html,profileContent:async()=>null,missingDocument
 });
 expect(response.status).toBe(200);
 expect(await response.text()).toContain('Real first profile · 0 Originals');
 expect(missingDocument).toHaveBeenCalledExactlyOnceWith(full);
 expect(alias).not.toHaveBeenCalled();
 expect(profile).not.toHaveBeenCalled();
});
