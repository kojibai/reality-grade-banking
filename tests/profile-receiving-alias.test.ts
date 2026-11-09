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

it('resolves a renamed complete identity only with the exact same-origin alias confirmation',async()=>{
 const response=()=>new Response(null,{status:307,headers:{location:'https://receiz.com/api/profile/cadence?surface=public-route&representation=collection-v2','x-receiz-profile-alias':full}});
 expect(await readPublicProfileAlias(full,vi.fn(async()=>response())as typeof fetch)).toBe('cadence');
 await expect(readPublicProfileAlias('receiz_'+full,vi.fn(async()=>response())as typeof fetch)).rejects.toThrow('PROFILE_ALIAS_UNAVAILABLE');
});
it('an unsaved profile returns its actual public view in the first response',async()=>{
 const {profileFixture}=await import('./fixtures/public-profile'),{parsePublicProfile}=await import('../src/receiz/public-profile');
 const value=parsePublicProfile(profileFixture(),'alexmorgan'),read=vi.fn(async()=>value),render=vi.fn(async()=>'<article class="profile-hero"><h1>Alex Morgan</h1></article>');
 const response=await handleProfilePreview(new Request('https://bankeiz.com/alexmorgan/',{headers:{accept:'text/html'}}),{page:async()=>html,profile:read,render,profileContent:async()=>null,missingDocument:async()=>new Response(null,{status:503})});
 expect(response.status).toBe(200);const body=await response.text();expect(body).toContain('<h1>Alex Morgan</h1>');expect(body).not.toContain('data-profile-opening');expect(read).toHaveBeenCalledExactlyOnceWith('alexmorgan');expect(render).toHaveBeenCalledOnce();
});
it('the existing public reader preserves a confirmed renamed alias through its canonical profile response',async()=>{
 const {createPublicProfileReader}=await import('../server/public-profile'),{profileFixture}=await import('./fixtures/public-profile');const input=profileFixture();input.profile.profile.userId='01234567-0123-4123-8123-0123456789ab';
 const read=createPublicProfileReader(vi.fn(async(url:RequestInfo|URL)=>String(url).includes('/'+full+'?')?new Response(null,{status:307,headers:{location:'https://receiz.com/api/profile/alexmorgan?surface=public-route&representation=collection-v2','x-receiz-profile-alias':full,'x-receiz-profile-owner':'01234567-0123-4123-8123-0123456789ab'}}):Response.json(input))as typeof fetch,async p=>p);
 const result=await read(full);expect(result.username).toBe('alexmorgan');expect(result.resolvedReceivingUsername).toBe(full);
 const {retainPublicProfile,heldPublicProfileUsername}=await import('../src/receiz/public-profile');retainPublicProfile(result);expect(heldPublicProfileUsername(full)).toBe('alexmorgan');
});

it('a confirmed renamed alias refuses a canonical response for a different immutable Account',async()=>{
 const {createPublicProfileReader}=await import('../server/public-profile'),{profileFixture}=await import('./fixtures/public-profile');
 const read=createPublicProfileReader(vi.fn(async(url:RequestInfo|URL)=>String(url).includes('/'+full+'?')?new Response(null,{status:307,headers:{location:'https://receiz.com/api/profile/alexmorgan?surface=public-route&representation=collection-v2','x-receiz-profile-alias':full,'x-receiz-profile-owner':'01234567-0123-4123-8123-0123456789ab'}}):Response.json(profileFixture()))as typeof fetch,async p=>p);
 await expect(read(full)).rejects.toThrow('PROFILE_IDENTITY_MISMATCH');
});
