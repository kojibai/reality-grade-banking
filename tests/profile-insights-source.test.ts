import {expect,it,vi} from 'vitest';
import {createProfileInsights,readProfileInsights} from '../src/receiz/profile-insights';
import {insightsFixture} from './fixtures/profile-insights';
it('admits only the open owner and retains actual timeline observations',()=>{
 const value=readProfileInsights(insightsFixture(),'account-1');
 expect(value.timelines['30d'].map(row=>row.views)).toEqual([5,10]);expect(value.overview.revenueCents.all).toBe(1500);
 expect(()=>readProfileInsights(insightsFixture('another-owner'),'account-1')).toThrow('PROFILE_INSIGHTS_OWNER_MISMATCH');
});
it('rejects malformed counters and out-of-order history without replacing held data',async()=>{
 let data=insightsFixture();const source=createProfileInsights({accountUid:'account-1',request:async()=>Response.json(data)});
 const known=await source.read();data=insightsFixture();data.analytics.overview.originalViews.all=-1;
 await expect(source.read(true)).rejects.toThrow('PROFILE_INSIGHTS_INVALID');expect(source.known()).toBe(known);
 const bad=insightsFixture();bad.analytics.timelines['30d'].reverse();expect(()=>readProfileInsights(bad,'account-1')).toThrow('PROFILE_INSIGHTS_INVALID');
});
it('rejects unbounded metrics and oversized history before they become a retained dashboard',()=>{
 const huge=insightsFixture();huge.analytics.overview.originalViews.all=Infinity;expect(()=>readProfileInsights(huge,'account-1')).toThrow('PROFILE_INSIGHTS_INVALID');
 huge.analytics.overview.originalViews.all=1e30;expect(()=>readProfileInsights(huge,'account-1')).toThrow('PROFILE_INSIGHTS_INVALID');
 const oversized=insightsFixture();oversized.analytics.timelines['30d']=Array(2001).fill(oversized.analytics.timelines['30d'][0]);expect(()=>readProfileInsights(oversized,'account-1')).toThrow('PROFILE_INSIGHTS_INVALID');
});
it('coalesces explicit opening and reuses the same snapshot until an explicit refresh',async()=>{
 let resolve!:(r:Response)=>void;const request=vi.fn(()=>new Promise<Response>(done=>{resolve=done;}));
 const source=createProfileInsights({accountUid:'account-1',request});expect(source.known()).toBeNull();expect(request).not.toHaveBeenCalled();
 const first=source.read(),second=source.read();resolve(Response.json(insightsFixture()));const value=await first;
 expect(await second).toBe(value);expect(await source.read()).toBe(value);expect(request).toHaveBeenCalledExactlyOnceWith('/api/connect/profile/analytics');
});
it('rejects an in-flight response after identity closure and never adopts its private contents',async()=>{
 let open=true,resolve!:(r:Response)=>void;const source=createProfileInsights({accountUid:'account-1',request:()=>new Promise<Response>(done=>{resolve=done;}),assertOpen:()=>{if(!open)throw Error('IDENTITY_CLOSED');}});
 const attempt=source.read();open=false;resolve(Response.json(insightsFixture()));await expect(attempt).rejects.toThrow('IDENTITY_CLOSED');expect(()=>source.known()).toThrow('IDENTITY_CLOSED');
});
