import {it,expect,vi} from 'vitest';
import {handleProfilePreview,profilePreviewHtml} from '../server/profile-preview';
import {parsePublicProfile} from '../src/receiz/public-profile';
import {profileFixture} from './fixtures/public-profile';
const html='<html><head><title>Explore</title><meta name="description" content="old"><link rel="canonical" href="https://bankeiz.com/explore/"></head><body><div id="public-explore-root"><main>Old collection</main></div><script id="receiz-navigation" type="application/json">{}</script></body></html>';
it('serves an escaped public profile seed as inline HTML',()=>{
 const profile=parsePublicProfile(profileFixture(),'alexmorgan');profile.bio='</script><script>alert(1)</script>';
 const result=profilePreviewHtml(html,'alexmorgan',profile);expect(result).toContain('public-profile-seed');expect(result).toContain('Alex Morgan | Bankeiz');expect(result).toContain('https://bankeiz.com/alexmorgan/');expect(result).not.toContain('</script><script>alert');
});
it('preloads only the first displayed signed originals and keeps unsigned inventory in the carried seed',()=>{
 const profile=parsePublicProfile(profileFixture(),'alexmorgan');profile.avatarUrl=null;profile.bannerUrl=null;
 const original=profile.items[0];profile.items=[
  {...original,id:'unsigned-cover',hasPbiSignature:false,artworkUrl:'https://receiz.com/artwork/unsigned.png'},
  {...original,id:'signed-cover-1',hasPbiSignature:true,artworkUrl:'https://receiz.com/artwork/signed-1.png'},
  {...original,id:'unknown-cover',hasPbiSignature:undefined,artworkUrl:'https://receiz.com/artwork/unknown.png'},
  {...original,id:'signed-cover-2',hasPbiSignature:true,artworkUrl:'https://receiz.com/artwork/signed-2.png'},
  {...original,id:'signed-cover-3',hasPbiSignature:true,artworkUrl:'https://receiz.com/artwork/signed-3.png'},
 ];
 const result=profilePreviewHtml(html,'alexmorgan',profile);
 expect([...result.matchAll(/<link rel="preload" as="image" href="([^"]+)"/g)].map(match=>match[1])).toEqual(['https://receiz.com/artwork/signed-1.png','https://receiz.com/artwork/signed-2.png']);
 expect(result).toContain('unsigned-cover');expect(profile.items).toHaveLength(5);
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
it('keeps early profile image preparation within the first visible collection rows',async()=>{
 let resolve!:(value:ReturnType<typeof parsePublicProfile>)=>void;const held=new Promise<ReturnType<typeof parsePublicProfile>>(done=>{resolve=done;});
 const response=await handleProfilePreview(new Request('https://bankeiz.com/bjklock/',{headers:{accept:'text/html','user-agent':'Profile browser'}}),{profile:()=>held,page:async()=>html});
 const reader=response.body!.getReader(),first=new TextDecoder().decode((await reader.read()).value);
 expect([...first.matchAll(/<link rel="preload" as="image"/g)]).toHaveLength(2);
 resolve({...parsePublicProfile(profileFixture(),'alexmorgan'),username:'bjklock'});await reader.read();expect((await reader.read()).done).toBe(true);
});
it('keeps crawler status and metadata exact instead of streaming a success before a missing profile',async()=>{
 const {PublicProfileError}=await import('../server/public-profile');const response=await handleProfilePreview(new Request('https://bankeiz.com/alexmorgan/',{headers:{accept:'text/html','user-agent':'Twitterbot'}}),{profile:async()=>{throw new PublicProfileError('PROFILE_NOT_FOUND',404);},page:async()=>html});expect(response.status).toBe(404);expect(await response.text()).toContain('PROFILE_NOT_FOUND');
});
it('places the actual rendered profile in the first document rather than an entry placeholder',async()=>{
 const profile=parsePublicProfile(profileFixture(),'alexmorgan'),render=vi.fn(async()=>'<article class="public-profile-page"><h1>Alex Morgan</h1><div class="profile-collection-grid">Complete first view</div></article>');
 const response=await handleProfilePreview(new Request('https://bankeiz.com/alexmorgan/'),{profile:async()=>profile,page:async()=>html,render});
 const body=await response.text();expect(render).toHaveBeenCalledWith(profile);expect(body).toContain('Complete first view');expect(body).not.toContain('Old collection');expect(body).not.toContain('public-entry-placeholder');
});

it.each(['fbclid=instagram-click','igsh=instagram-share','igshid=instagram-share','utm_source=ig&utm_medium=social&utm_campaign=profile','fbclid=click&igsh=share&utm_source=instagram','utm_source=first&utm_source=second'])('opens the same cold profile when a social link carries inert attribution: %s',async tracking=>{
 const value=parsePublicProfile(profileFixture(),'alexmorgan'),profile=vi.fn(async()=>value),page=vi.fn(async()=>html),render=vi.fn(async()=>'<article><h1>Alex Morgan</h1></article>'),deps={profile,page,render};
 const canonical=await(await handleProfilePreview(new Request('https://bankeiz.com/alexmorgan/'),deps)).text();profile.mockClear();page.mockClear();render.mockClear();
 const response=await handleProfilePreview(new Request('https://bankeiz.com/alexmorgan/?'+tracking,{headers:{'user-agent':'Instagram','referer':'https://l.instagram.com/'}}),deps);
 expect(response.status).toBe(200);expect(response.headers.get('location')).toBeNull();expect(await response.text()).toBe(canonical);
 expect(profile).toHaveBeenCalledExactlyOnceWith('alexmorgan');expect(page).toHaveBeenCalledOnce();expect(render).toHaveBeenCalledExactlyOnceWith(value);
});
it.each(['/alexmorgan','/u/alexmorgan/','/api/profile?username=alexmorgan','/api/profile/?username=alexmorgan'])('accepts tracked profile entry through its canonical and production rewrite paths: %s',async path=>{
 const profile=vi.fn(async()=>parsePublicProfile(profileFixture(),'alexmorgan')),page=vi.fn(async()=>html);
 const response=await handleProfilePreview(new Request('https://bankeiz.com'+path+(path.includes('?')?'&':'?')+'fbclid=click&igsh=share'),{profile,page});
 expect(response.status).toBe(200);expect(await response.text()).toContain('href="https://bankeiz.com/alexmorgan/"');expect(profile).toHaveBeenCalledExactlyOnceWith('alexmorgan');expect(page).toHaveBeenCalledOnce();
});
it('answers tracked profile HEAD probes without reading or rendering the source',async()=>{
 const profile=vi.fn(),page=vi.fn(),render=vi.fn();
 const response=await handleProfilePreview(new Request('https://bankeiz.com/bjklock?fbclid=click&igsh=share',{method:'HEAD'}),{profile,page,render});
 expect(response.status).toBe(200);expect(response.headers.get('location')).toBeNull();expect(await response.text()).toBe('');expect(profile).not.toHaveBeenCalled();expect(page).not.toHaveBeenCalled();expect(render).not.toHaveBeenCalled();
});
it('keeps conflicting selectors and unknown controls invalid even beside attribution',async()=>{
 const profile=vi.fn(),page=vi.fn();
 for(const path of ['/alexmorgan?username=another','/alexmorgan?username=alexmorgan&username=alexmorgan','/alexmorgan?url=https://foreign.invalid','/alexmorgan?accountUid=foreign','/alexmorgan?manage=1','/api/profile?username=alexmorgan&username=another','/api/profile?username=alexmorgan&cursor=foreign']){
  const response=await handleProfilePreview(new Request('https://bankeiz.com'+path+'&fbclid=click&igsh=share'),{profile,page});expect(response.status).toBe(404);
 }
 expect(profile).not.toHaveBeenCalled();expect(page).not.toHaveBeenCalled();
});
it('streams tracked browser entry immediately with one source read and preserves crawler refusals',async()=>{
 let resolve!:(value:ReturnType<typeof parsePublicProfile>)=>void;const pending=new Promise<ReturnType<typeof parsePublicProfile>>(done=>{resolve=done;});
 const profile=vi.fn(()=>pending),page=vi.fn(async()=>html);
 const response=await handleProfilePreview(new Request('https://bankeiz.com/alexmorgan?fbclid=click&igsh=share',{headers:{accept:'text/html','user-agent':'Instagram'}}),{profile,page});
 expect(response.status).toBe(200);const reader=response.body!.getReader(),first=await reader.read();expect(new TextDecoder().decode(first.value)).toContain('<head>');expect(profile).toHaveBeenCalledExactlyOnceWith('alexmorgan');
 resolve(parsePublicProfile(profileFixture(),'alexmorgan'));await reader.read();expect((await reader.read()).done).toBe(true);
 const {PublicProfileError}=await import('../server/public-profile');
 for(const status of [403,404]){
  const refusal=await handleProfilePreview(new Request('https://bankeiz.com/alexmorgan?fbclid=click',{headers:{accept:'text/html','user-agent':'facebookexternalhit/1.1'}}),{profile:async()=>{throw new PublicProfileError(status===403?'PROFILE_PRIVATE':'PROFILE_NOT_FOUND',status);},page});
  expect(refusal.status).toBe(status);expect(await refusal.text()).not.toContain('public-profile-seed');
 }
});

it('prepares the real renderer alongside the single source read without delaying early resources',async()=>{
 let sourceReady!:(value:ReturnType<typeof parsePublicProfile>)=>void,rendererReady!:()=>void;
 const source=new Promise<ReturnType<typeof parsePublicProfile>>(done=>{sourceReady=done;}),prepared=new Promise<void>(done=>{rendererReady=done;});
 const prepareRender=vi.fn(()=>prepared),profile=vi.fn(()=>source),render=vi.fn(async()=>'<article>Complete public profile</article>');
 const response=await handleProfilePreview(new Request('https://bankeiz.com/alexmorgan/',{headers:{accept:'text/html','user-agent':'Browser'}}),{profile,page:async()=>html,render,prepareRender});
 const reader=response.body!.getReader();expect(new TextDecoder().decode((await reader.read()).value)).toContain('<head>');
 expect(prepareRender).toHaveBeenCalledOnce();expect(profile).toHaveBeenCalledOnce();expect(render).not.toHaveBeenCalled();
 rendererReady();sourceReady(parsePublicProfile(profileFixture(),'alexmorgan'));
 expect(new TextDecoder().decode((await reader.read()).value)).toContain('Complete public profile');expect(render).toHaveBeenCalledOnce();
 expect((await reader.read()).done).toBe(true);
});
it('starts the same profile module asynchronously while preserving its complete carried source and navigation',()=>{
 const profile=parsePublicProfile(profileFixture(),'alexmorgan'),page=html.replace('</head>','<script type="module" crossorigin src="/assets/explore-test.js"></script></head>');
 const result=profilePreviewHtml(page,'alexmorgan',profile,undefined,'<article>Same public profile</article>');
 expect(result).toContain('<script type="module" async crossorigin src="/assets/explore-test.js"></script>');
 expect(result.indexOf('public-profile-seed')).toBeLessThan(result.indexOf('receiz-navigation'));
 const payload=/<script id="public-profile-seed" type="application\/json">([\s\S]*?)<\/script>/.exec(result)![1];
 expect(JSON.parse(payload)).toEqual(profile);expect(result).toContain('<article>Same public profile</article>');
 expect(result).toContain('<script id="receiz-navigation" type="application/json">{}</script>');
});
it('keeps inline identity artwork out of preload and social-image tags',()=>{const profile=parsePublicProfile(profileFixture(),'alexmorgan');profile.avatarUrl='data:image/svg+xml;charset=utf-8,%3Csvg%3E%3C%2Fsvg%3E';profile.bannerUrl=profile.avatarUrl;const result=profilePreviewHtml(html,'alexmorgan',profile),head=result.split('</head>')[0];expect(head).not.toMatch(/(?:href|content)="data:image/);expect(result).toContain('public-profile-seed');profile.avatarUrl='https://receiz.com/avatar.png';expect(profilePreviewHtml(html,'alexmorgan',profile)).toContain('<meta property="og:image" content="https://receiz.com/avatar.png">');});
