import {it,expect,vi} from 'vitest';
import {PublicProfileError} from '../server/public-profile';
import {profilePreviewHtml,handleProfilePreview} from '../server/profile-preview';
import {parsePublicProfile,publicProfileSocialImage} from '../src/receiz/public-profile';
import {profileFixture} from './fixtures/public-profile';
const source=()=>parsePublicProfile(profileFixture(),'alexmorgan');
const page='<html><head><meta charset="utf-8"><style>'+'.known{}'.repeat(30000)+'</style></head><body><div id="public-explore-root"><article>same visible profile</article></div><script id="receiz-navigation" type="application/json">{}</script></body></html>';
it('carries an early same-origin profile PNG without changing the known visible profile or Source seed',()=>{
 const profile=source();profile.bannerUrl='https://receiz.com/custom-banner.webp';
 const html=profilePreviewHtml(page,'alexmorgan',profile,undefined,'<article>same visible profile</article>');
 expect(html.includes('property="og:image" content="https://bankeiz.com/alexmorgan/og.png"')).toBe(true);
 expect(html.indexOf('property="og:image"')).toBeLessThan(4096);
 expect(html).toContain('property="og:image:width" content="1730"');expect(html).toContain('name="twitter:image:alt"');
 expect(html).toContain('<article>same visible profile</article>');
 expect(JSON.parse(/id="public-profile-seed" type="application\/json">([^<]+)/.exec(html)![1])).toEqual(profile);
 expect(publicProfileSocialImage(profile)).toBe('https://bankeiz.com/alexmorgan/og.png');
});
it('uses only the owner-bound header and dedicated renderer for a profile image request',async()=>{
 const profile=vi.fn(),header=vi.fn(async()=>source()),image=vi.fn(async()=>new Uint8Array([137,80,78,71])),template=vi.fn();
 const response=await handleProfilePreview(new Request('https://bankeiz.com/api/profile?username=alexmorgan&image=1'),{profile,header,image,page:template} as any);
 expect(response.status).toBe(200);expect(response.headers.get('content-type')).toBe('image/png');
 expect(header).toHaveBeenCalledExactlyOnceWith('alexmorgan');expect(image).toHaveBeenCalledOnce();expect(profile).not.toHaveBeenCalled();expect(template).not.toHaveBeenCalled();
});

it.each([403,404,503])('keeps public refusal %s out of the image and never invokes the renderer',async status=>{
 const image=vi.fn(),header=vi.fn(async()=>{throw new PublicProfileError('SOURCE_REFUSAL',status);});
 const response=await handleProfilePreview(new Request('https://bankeiz.com/alexmorgan/og.png'),{header,image,profile:vi.fn(),page:vi.fn()} as any);
 expect(response.status).toBe(status);expect(response.headers.get('cache-control')).toBe('no-store');expect(image).not.toHaveBeenCalled();
});
it.each(['/alexmorgan/og.png','/u/build/og.png','/api/profile?username=alexmorgan&image=1'])('keeps HEAD free of profile, header, font, template and image work at %s',async path=>{
 const header=vi.fn(),image=vi.fn(),profile=vi.fn(),page=vi.fn();const response=await handleProfilePreview(new Request('https://bankeiz.com'+path,{method:'HEAD'}),{header,image,profile,page} as any);
 expect(response.status).toBe(200);expect(response.headers.get('content-type')).toBe('image/png');for(const f of [header,image,profile,page])expect(f).not.toHaveBeenCalled();
});
it('refuses foreign profiles, arbitrary query inputs, duplicate selectors and mutation methods',async()=>{
 const image=vi.fn(),header=vi.fn(async()=>({...source(),username:'foreign'}));
 expect((await handleProfilePreview(new Request('https://bankeiz.com/alexmorgan/og.png'),{header,image,profile:vi.fn(),page:vi.fn()} as any)).status).toBe(503);expect(image).not.toHaveBeenCalled();
 for(const query of ['username=alexmorgan&image=1&image=1','username=alexmorgan&image=1&url=http://private.invalid','username=alexmorgan&username=foreign&image=1','username=alexmorgan&image=2']){
  const forbidden=vi.fn();expect((await handleProfilePreview(new Request('https://bankeiz.com/api/profile?'+query),{header:forbidden,image,profile:forbidden,page:forbidden} as any)).status).toBe(404);expect(forbidden).not.toHaveBeenCalled();
 }
 expect((await handleProfilePreview(new Request('https://bankeiz.com/alexmorgan/og.png',{method:'POST'}))).status).toBe(405);
});
it('keeps an already-compiled profile body and catalog without reading or rendering its image',async()=>{
 const generation='b'.repeat(64),content='<article>exact compiled Source profile</article>',template=page.replace('<script id="receiz-navigation"','<script id="public-market-seed" type="application/json">{"generation":"'+generation+'"}</script><script id="receiz-navigation"'),header=vi.fn(),image=vi.fn(),profile=vi.fn();
 const response=await handleProfilePreview(new Request('https://bankeiz.com/alexmorgan/',{headers:{accept:'text/html','user-agent':'Browser'}}),{header,image,profile,page:async()=>template,profileContent:async()=>`<!-- bank.profile.document.v1 ${generation} alexmorgan -->${content}`} as any);
 const body=await response.text();expect(body.includes(content)).toBe(true);expect(body.includes('id="public-market-seed"')).toBe(true);expect(body.includes('https://bankeiz.com/alexmorgan/og.png')).toBe(true);for(const f of [header,image,profile])expect(f).not.toHaveBeenCalled();
});
