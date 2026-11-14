import {afterEach,expect,it,vi} from 'vitest';
import {profileFixture} from './fixtures/public-profile';
const full='abcdefghijklmnopqr',legacy='receiz_abcdefghijklmnopq',uid='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222';
const source='https://receiz.com/api/profile/'+full+'?surface=public-route&representation=collection-v2';
function manifest(userId=uid,username=legacy){const f=profileFixture();Object.assign(f.profile.profile,{userId,username,receivingUsername:full});return{ok:true,head:{profile:f.profile.profile,viewer:f.profile.viewer,stats:f.profile.stats}};}
async function handler(fetcher:typeof fetch){vi.resetModules();vi.stubGlobal('fetch',fetcher);return(await import('../server/public-profile')).handlePublicProfile;}
afterEach(()=>vi.unstubAllGlobals());
it('the explicit email-only head read composes the existing full-name canonical owner redirect with the exact bounded manifest',async()=>{
 const send=vi.fn(async(input:RequestInfo|URL,_init?:RequestInit)=>String(input)===source?new Response(null,{status:307,headers:{location:source.replace('/'+full+'?','/'+legacy+'?'),'x-receiz-profile-alias':full,'x-receiz-profile-owner':uid}}):Response.json(manifest()));
 const handle=await handler(send),response=await handle(new Request('https://bankeiz.com/api/bank/public-profile/'+full+'?view=email'));
 expect(response.status).toBe(200);expect(await response.json()).toMatchObject({userId:uid,username:legacy,receivingUsername:full,resolvedReceivingUsername:full});expect(send).toHaveBeenCalledTimes(2);
 expect(send.mock.calls[0]).toEqual([new URL(source),expect.objectContaining({method:'HEAD',credentials:'omit',redirect:'manual'})]);expect(send.mock.calls[1]).toEqual(['https://receiz.com/api/profile/'+legacy+'/manifest',expect.objectContaining({credentials:'omit',redirect:'error'})]);for(const [input,init]of send.mock.calls)if(String(input).includes('collection-v2'))expect(init?.method).toBe('HEAD');
});
it.each(['missing-owner','wrong-owner','ambiguous'])('the explicit email lookup refuses %s canonical binding without choosing the shortened profile',async failure=>{
 const send=vi.fn(async(input:RequestInfo|URL)=>String(input)===source?failure==='ambiguous'?new Response(null,{status:404}):new Response(null,{status:307,headers:{location:source.replace('/'+full+'?','/'+legacy+'?'),'x-receiz-profile-alias':full,...(failure==='missing-owner'?{}:{'x-receiz-profile-owner':other})}}):Response.json(manifest()));
 const handle=await handler(send),response=await handle(new Request('https://bankeiz.com/api/bank/public-profile/'+full+'?view=email'));expect(response.status).toBe(failure==='ambiguous'?404:503);
});
it('a literal full18 profile remains its exact Native UID so the account consumer can refuse a different owner',async()=>{
 const send=vi.fn(async(input:RequestInfo|URL)=>String(input)===source?new Response(null,{status:200}):Response.json(manifest(other,full)));
 const handle=await handler(send),response=await handle(new Request('https://bankeiz.com/api/bank/public-profile/'+full+'?view=email'));expect(response.status).toBe(200);expect(await response.json()).toMatchObject({userId:other,username:full,resolvedReceivingUsername:full});expect(send.mock.calls[1][0]).toBe('https://receiz.com/api/profile/'+full+'/manifest');
});
it('ordinary held-profile header reads keep their one existing manifest request without the email alias path',async()=>{
 const send=vi.fn(async()=>Response.json(manifest()));const handle=await handler(send),response=await handle(new Request('https://bankeiz.com/api/bank/public-profile/'+legacy+'?view=head'));expect(response.status).toBe(200);expect(send).toHaveBeenCalledExactlyOnceWith('https://receiz.com/api/profile/'+legacy+'/manifest',expect.objectContaining({credentials:'omit',redirect:'error'}));
});
