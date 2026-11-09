import {expect,it,vi} from 'vitest';
import {handleProfilePreview} from '../server/profile-preview';

const generation='a'.repeat(64),template='<html><head></head><body><div id="public-explore-root"></div><script id="receiz-navigation"></script><script id="public-market-seed" type="application/json">{"generation":"'+generation+'"}</script></body></html>';
const request=(name='cadence')=>new Request('https://bankeiz.test/'+name+'/',{headers:{accept:'text/html','user-agent':'Safari'}});
it('a new profile sends its producer-saved real document as the first response with no handle or loading intermediary',async()=>{
 const body='<!doctype html><main><h1>Cadence</h1><p>Saved biography</p><article>A Place Kept Open</article><span>1 displayed original</span></main>',profile=vi.fn(async()=>{throw Error('SOURCE_READ_FORBIDDEN');}),saved=vi.fn(async()=>new Response(body,{headers:{'content-type':'text/html'}})),render=vi.fn(async()=>{throw Error('VISITOR_RENDER_FORBIDDEN');});
 const response=await handleProfilePreview(request(),{profile,page:async()=>template,profileContent:async()=>null,missingDocument:saved,render});
 expect(await response.text()).toBe(body);expect(saved).toHaveBeenCalledExactlyOnceWith('cadence');expect(profile).not.toHaveBeenCalled();expect(render).not.toHaveBeenCalled();
});
it('a complete compiled profile opens while every missing-data reader is stalled',async()=>{
 const saved=vi.fn(()=>new Promise<Response>(()=>{})),profile=vi.fn(()=>new Promise<never>(()=>{}));
 const response=await handleProfilePreview(request('bjklock'),{profile,page:async()=>template,profileContent:async()=>`<!-- bank.profile.document.v1 ${generation} bjklock --><main>Real held profile</main>`,missingDocument:saved});
 expect(await response.text()).toContain('<main>Real held profile</main>');expect(saved).not.toHaveBeenCalled();expect(profile).not.toHaveBeenCalled();
});
it('new-profile delivery preserves an explicit public refusal',async()=>{
 const response=await handleProfilePreview(request(),{profile:vi.fn(),page:async()=>template,profileContent:async()=>null,missingDocument:async()=>new Response('This profile is private.',{status:403})});
 expect(response.status).toBe(403);expect(await response.text()).toBe('This profile is private.');
});
