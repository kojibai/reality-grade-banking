import {it,expect,vi} from 'vitest';
import {handleOriginalsQualification} from '../server/originals-qualification';
const observation={schema:'bankeiz.originals-observation.v1',authority:'observation-only',accountUid:'owner',username:'owner',sourceOriginalIds:[],membershipComplete:true,witnessComplete:true,originals:0,witnessedBreaths:0,retention:{starts:0,retained:0},fundingUsdCents:null,baseline:{pbi:false,avatar:false,header:false,threeOriginals:false,verifiedOriginal:null},acceptance:'not-admitted',economyActive:false};
it('relays only the public observation without forwarding private credentials or enabling anything',async()=>{
 const request=vi.fn(async()=>Response.json({ok:true,observation}));
 const result=await handleOriginalsQualification(new Request('https://bankeiz.com/api/bank/originals-qualification/owner',{headers:{cookie:'private',authorization:'private'}}),request);
 expect(result.status).toBe(200);expect(await result.json()).toEqual({ok:true,observation});
 const [url,init]=request.mock.calls[0] as unknown as [string,RequestInit];expect(url).toBe('https://receiz.com/api/profile/owner/originals-qualification');expect(init).toMatchObject({credentials:'omit',redirect:'error',cache:'no-store'});expect(init.headers).toBeUndefined();expect(init.body).toBeUndefined();
});
it('rejects mutation methods, foreign paths and unknown query parameters without an upstream request',async()=>{
 const request=vi.fn();for(const input of [new Request('https://bankeiz.com/api/bank/originals-qualification/owner',{method:'POST'}),new Request('https://bankeiz.com/api/bank/originals-qualification/owner?activate=true'),new Request('https://bankeiz.com/api/bank/originals-qualification/x')])expect((await handleOriginalsQualification(input,request)).status).toBeGreaterThanOrEqual(400);
 expect(request).not.toHaveBeenCalled();
});
it('refuses a different owner handle, invented qualification or unavailable upstream',async()=>{
 for(const response of [Response.json({ok:true,observation:{...observation,username:'another'}}),Response.json({ok:true,observation:{...observation,acceptance:'qualified'}}),new Response(null,{status:503})])expect((await handleOriginalsQualification(new Request('https://bankeiz.com/api/bank/originals-qualification/owner'),async()=>response)).status).toBe(503);
});
