import {expect,it} from 'vitest';
import {registerProfileInsightsSource,profileInsightsSource} from '../src/receiz/profile-insights-access';
import {createProfileInsights} from '../src/receiz/profile-insights';
import {permittedNativePath} from '../src/receiz/native-transport';
it('exposes only the currently registered identity and rejects an in-flight replacement',async()=>{
 const source=createProfileInsights({accountUid:'owner-a',request:async()=>{throw Error('No automatic request');}});
 let resolve!:(value:typeof source)=>void;const remove=registerProfileInsightsSource('owner-a',()=>new Promise(done=>{resolve=done;}));
 await expect(profileInsightsSource('owner-b')).rejects.toThrow('PROFILE_INSIGHTS_ACCOUNT_REQUIRED');
 const attempt=profileInsightsSource('owner-a');remove();resolve(source);await expect(attempt).rejects.toThrow('PROFILE_INSIGHTS_IDENTITY_CHANGED');
 const removeNew=registerProfileInsightsSource('owner-b',async()=>source);await expect(profileInsightsSource('owner-b')).rejects.toThrow('PROFILE_INSIGHTS_IDENTITY_CHANGED');removeNew();
});
it('permits only the same-account analytics read, never owner selection or mutation',()=>{
 expect(permittedNativePath('/api/connect/profile/analytics','GET')).toBe(true);
 expect(permittedNativePath('/api/connect/profile/analytics?owner=other','GET')).toBe(false);
 expect(permittedNativePath('/api/connect/profile/analytics','POST')).toBe(false);
});
