import {afterEach,expect,it,vi} from 'vitest';
import {handlePublicProfile} from '../server/public-profile';
const release={schema:'receiz.native-public-showcase-release.v1',ownerUserId:'owner',username:'artist',artifactDigest:'a'.repeat(64),operationCount:2,revision:'b'.repeat(64)};
afterEach(()=>vi.unstubAllGlobals());
it('reads only the selected release headers for explicit publication status, never a collection body',async()=>{
 const fetcher=vi.fn(async()=>new Response(null,{headers:{'x-receiz-public-showcase-release':JSON.stringify(release),'x-receiz-profile-public-collection-revision':release.revision}}));vi.stubGlobal('fetch',fetcher);
 const response=await handlePublicProfile(new Request('https://bankeiz.com/api/bank/public-profile/artist?view=release'));
 expect(response.status).toBe(200);expect(await response.json()).toEqual(release);expect(fetcher).toHaveBeenCalledOnce();const [url,init]=fetcher.mock.calls[0] as unknown as [string,RequestInit];
 expect(url).toBe('https://receiz.com/api/profile/artist?surface=public-route&representation=collection-v2');expect(init.method).toBe('HEAD');expect(init.credentials).toBe('omit');
});
it('keeps missing release evidence unknown and preserves a real public withdrawal refusal',async()=>{
 const fetcher=vi.fn(async()=>new Response(null,{status:204}));vi.stubGlobal('fetch',fetcher);
 expect(await(await handlePublicProfile(new Request('https://bankeiz.com/api/bank/public-profile/artist?view=release'))).json()).toBeNull();
 fetcher.mockImplementation(async()=>new Response(null,{status:403}));
 expect((await handlePublicProfile(new Request('https://bankeiz.com/api/bank/public-profile/artist?view=release'))).status).toBe(403);
});
it.each([{...release,username:'someone_else'},{...release,revision:'foreign'},{...release,operationCount:-1}])('refuses malformed or differently scoped release evidence',async value=>{
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(null,{headers:{'x-receiz-public-showcase-release':JSON.stringify(value),'x-receiz-profile-public-collection-revision':release.revision}})));
 expect((await handlePublicProfile(new Request('https://bankeiz.com/api/bank/public-profile/artist?view=release'))).status).toBe(503);
});
