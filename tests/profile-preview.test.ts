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
