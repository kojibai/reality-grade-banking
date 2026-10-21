import {it,expect,vi} from 'vitest';
import {handleProfilePreview,profilePreviewHtml} from '../server/profile-preview';
import {parsePublicProfile} from '../src/receiz/public-profile';
import {profileFixture} from './fixtures/public-profile';
const html='<html><head><title>Explore</title><meta name="description" content="old"><link rel="canonical" href="https://bankeiz.com/explore/"></head><body><div id="public-explore-root"><main>Old collection</main></div><script id="receiz-navigation" type="application/json">{}</script></body></html>';
it('serves an escaped public profile seed as inline HTML',()=>{
 const profile=parsePublicProfile(profileFixture(),'alexmorgan');profile.bio='</script><script>alert(1)</script>';
 const result=profilePreviewHtml(html,'alexmorgan',profile);expect(result).toContain('public-profile-seed');expect(result).toContain('Alex Morgan | Bankeiz');expect(result).toContain('https://bankeiz.com/alexmorgan/');expect(result).not.toContain('</script><script>alert');
});
it('handles HEAD without fetching a profile or rendering a page',async()=>{
 const profile=vi.fn(),page=vi.fn();const response=await handleProfilePreview(new Request('https://bankeiz.com/alexmorgan/',{method:'HEAD'}),{profile,page});expect(response.status).toBe(200);expect(await response.text()).toBe('');expect(profile).not.toHaveBeenCalled();expect(page).not.toHaveBeenCalled();
});
it('does not let a profile function claim reserved public routes',async()=>{
 const profile=vi.fn(),page=vi.fn();const response=await handleProfilePreview(new Request('https://bankeiz.com/explore/'),{profile,page});expect(response.status).toBe(404);expect(profile).not.toHaveBeenCalled();
});
it('keeps the public page shell on a source failure and carries only its safe retry state',async()=>{
 const {PublicProfileError}=await import('../server/public-profile');const response=await handleProfilePreview(new Request('https://bankeiz.com/alexmorgan/'),{profile:async()=>{throw new PublicProfileError('upstream diagnostic not for public output',503);},page:async()=>html});const body=await response.text();expect(response.status).toBe(503);expect(body).toContain('public-profile-error');expect(body).toContain('PROFILE_UNAVAILABLE');expect(body).not.toContain('upstream diagnostic');expect(body).not.toContain('public-profile-seed');
});
it('streams static resources immediately while its single public source read runs in parallel',async()=>{
 let resolve!:(value:ReturnType<typeof parsePublicProfile>)=>void;const held=new Promise<ReturnType<typeof parsePublicProfile>>(done=>{resolve=done;});const profile=vi.fn(()=>held),page=vi.fn(async()=>html);
 const response=await handleProfilePreview(new Request('https://bankeiz.com/alexmorgan/',{headers:{accept:'text/html','user-agent':'Profile browser'}}),{profile,page});const reader=response.body!.getReader(),first=await reader.read();expect(new TextDecoder().decode(first.value)).toContain('<head>');expect(new TextDecoder().decode(first.value)).not.toContain('public-profile-seed');expect(profile).toHaveBeenCalledTimes(1);expect(page).toHaveBeenCalledTimes(1);
 resolve(parsePublicProfile(profileFixture(),'alexmorgan'));const second=await reader.read(),body=new TextDecoder().decode(first.value)+new TextDecoder().decode(second.value);expect(body).toContain('Alex Morgan | Bankeiz');expect(body).toContain('public-profile-seed');expect(body).toContain('rel="preload" as="image"');expect(body).not.toContain('<title>Explore');expect((await reader.read()).done).toBe(true);
});
it('keeps crawler status and metadata exact instead of streaming a success before a missing profile',async()=>{
 const {PublicProfileError}=await import('../server/public-profile');const response=await handleProfilePreview(new Request('https://bankeiz.com/alexmorgan/',{headers:{accept:'text/html','user-agent':'Twitterbot'}}),{profile:async()=>{throw new PublicProfileError('PROFILE_NOT_FOUND',404);},page:async()=>html});expect(response.status).toBe(404);expect(await response.text()).toContain('PROFILE_NOT_FOUND');
});
it('places the actual rendered profile in the first document rather than an entry placeholder',async()=>{
 const profile=parsePublicProfile(profileFixture(),'alexmorgan'),render=vi.fn(async()=>'<article class="public-profile-page"><h1>Alex Morgan</h1><div class="profile-collection-grid">Complete first view</div></article>');
 const response=await handleProfilePreview(new Request('https://bankeiz.com/alexmorgan/'),{profile:async()=>profile,page:async()=>html,render});
 const body=await response.text();expect(render).toHaveBeenCalledWith(profile);expect(body).toContain('Complete first view');expect(body).not.toContain('Old collection');expect(body).not.toContain('public-entry-placeholder');
});
