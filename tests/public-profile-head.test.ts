import {afterEach,expect,it,vi} from 'vitest';
import {parsePublicProfile} from '../src/receiz/public-profile';
import {profileFixture} from './fixtures/public-profile';

const manifest=()=>{const value=profileFixture();return {ok:true,head:{profile:value.profile.profile,viewer:value.profile.viewer,stats:value.profile.stats,deterministicManifest:{version:1,scope:'visible-showcase',username:'alexmorgan',stamp:'public-display-only',itemCount:612,isComplete:true,pageSize:612,nextCursor:null,newestOriginalAt:null}}};};
const endpoint='https://bankeiz.com/api/bank/public-profile/alexmorgan?view=head';
async function handler(fetcher:typeof fetch){vi.resetModules();vi.stubGlobal('fetch',fetcher);return(await import('../server/public-profile')).handlePublicProfile;}
afterEach(()=>{vi.unstubAllGlobals();vi.restoreAllMocks();});

it('normalizes the actual anonymous manifest head with no collection read or raw private fields',async()=>{
 const raw=manifest(),fetcher=vi.fn(async(_input:RequestInfo|URL,_init?:RequestInit)=>Response.json(raw)),handle=await handler(fetcher),response=await handle(new Request(endpoint));
 expect(response.status).toBe(200);const {items:_items,nextCursor:_cursor,...expected}=parsePublicProfile(profileFixture(),'alexmorgan');expect(await response.json()).toEqual(expected);
 expect(fetcher).toHaveBeenCalledExactlyOnceWith('https://receiz.com/api/profile/alexmorgan/manifest',expect.objectContaining({credentials:'omit',redirect:'error',cache:'no-store',headers:{accept:'application/json'}}));
 const options=fetcher.mock.calls[0]?.[1] as RequestInit|undefined;expect(new Headers(options?.headers).has('authorization')).toBe(false);
});
it('coalesces only concurrent head reads and observes the new UID on a later named read',async()=>{
 let finish!:(response:Response)=>void;const fetcher=vi.fn(()=>new Promise<Response>(resolve=>{finish=resolve;})),handle=await handler(fetcher);
 const first=handle(new Request(endpoint)),second=handle(new Request(endpoint));expect(fetcher).toHaveBeenCalledTimes(1);finish(Response.json(manifest()));expect(await(await first).json()).toEqual(await(await second).json());
 const next=manifest();next.head.profile.userId='account-2';const later=handle(new Request(endpoint));expect(fetcher).toHaveBeenCalledTimes(2);finish(Response.json(next));expect((await(await later).json()).userId).toBe('account-2');
});
it.each([403,404,503])('preserves a source %s refusal without disclosing its body',async status=>{
 const fetcher=vi.fn(async()=>new Response('upstream private diagnostic',{status})),handle=await handler(fetcher),response=await handle(new Request(endpoint));expect(response.status).toBe(status);expect(await response.text()).not.toContain('upstream private diagnostic');expect(fetcher).toHaveBeenCalledTimes(1);
});
it.each(['private','denied','viewer-missing','wrong-username','missing-uid','wrong-envelope'] as const)('refuses an unqualified head: %s',async kind=>{
 const value=manifest();if(kind==='private')value.head.profile.isPrivate=true;if(kind==='denied')value.head.viewer.canView=false;if(kind==='viewer-missing')Reflect.deleteProperty(value.head,'viewer');if(kind==='wrong-username')value.head.profile.username='another';if(kind==='missing-uid')value.head.profile.userId='';
 const body=kind==='wrong-envelope'?{ok:true,profile:value.head}:value,handle=await handler(vi.fn(async()=>Response.json(body))),response=await handle(new Request(endpoint));expect(response.status).toBe(kind==='private'||kind==='denied'||kind==='viewer-missing'?403:503);const output=await response.text();expect(output).not.toContain('private@example.com');expect(output).not.toContain('cover.png');
});
it('keeps default artwork and public PBI metadata through the shared normalizer',async()=>{
 const value=manifest();Object.assign(value.head.profile,{avatarUrl:null,bannerUrl:null,createdAt:'2026-10-20T10:00:00Z'});const handle=await handler(vi.fn(async()=>Response.json(value))),response=await handle(new Request(endpoint));expect(response.status).toBe(200);const body=await response.json();expect(body.avatarUrl).toMatch(/^data:image\/svg\+xml/);expect(body.bannerUrl).toMatch(/^data:image\/svg\+xml/);expect(body.authorshipVerified).toBe(true);expect(body.pbiReceiptHash).toBe('a'.repeat(64));expect(body).not.toHaveProperty('items');expect(body).not.toHaveProperty('deterministicManifest');
});
it('retains original account creation and PBI artwork coordinates in the compact header',async()=>{
 const value=manifest();Object.assign(value.head.profile,{creationKaiMicroPulse:'12345678900000',creationKaiSource:'sealed-receiz-identity',authorshipPbiSignedAt:'2026-10-20T10:00:00Z',authorshipPbiSignedKaiMicroPulse:'12345679000000'});
 const handle=await handler(vi.fn(async()=>Response.json(value))),body=await(await handle(new Request(endpoint))).json();
 expect(body).toMatchObject({creationKaiMicroPulse:'12345678900000',creationKaiSource:'sealed-receiz-identity',authorshipPbiSignedAt:'2026-10-20T10:00:00Z',authorshipPbiSignedKaiMicroPulse:'12345679000000'});
 expect(body).not.toHaveProperty('identity');expect(body).not.toHaveProperty('portableState');
});
it.each(['declared','streamed'] as const)('bounds the manifest head body before projection: %s',async kind=>{
 const oversized='x'.repeat(512*1024+1),fetcher=vi.fn(async()=>kind==='declared'?new Response('{}',{headers:{'content-length':String(oversized.length)}}):new Response(oversized)),handle=await handler(fetcher),response=await handle(new Request(endpoint));expect(response.status).toBe(503);expect(await response.text()).not.toContain(oversized.slice(0,32));
});
it.each(['view=head&cursor=all:account-1','view=head&view=head','view=head&userId=other','view=head&source=inventory','view=unknown'])('rejects unrecognized or conflicting selectors: %s',async query=>{
 const fetcher=vi.fn(),handle=await handler(fetcher),response=await handle(new Request(endpoint.split('?')[0]+'?'+query));expect(response.status).toBe(400);expect(fetcher).not.toHaveBeenCalled();
});
it('keeps head reads GET-only without opening Source on HEAD',async()=>{
 const fetcher=vi.fn(),handle=await handler(fetcher),response=await handle(new Request(endpoint,{method:'HEAD'}));expect(response.status).toBe(405);expect(fetcher).not.toHaveBeenCalled();
});
