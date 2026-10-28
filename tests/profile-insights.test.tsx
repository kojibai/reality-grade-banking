// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {afterEach,expect,it,vi} from 'vitest';
import {PublicProfilePage} from '../src/public-explorer/PublicProfilePage';
import {parsePublicProfile,retainPublicProfile,forgetPublicProfile} from '../src/receiz/public-profile';
import {publishProfileOwner} from '../src/receiz/profile-actions';
import {registerProfileInsightsSource} from '../src/receiz/profile-insights-access';
import {createProfileInsights} from '../src/receiz/profile-insights';
import {profileFixture} from './fixtures/public-profile';
import {insightsFixture} from './fixtures/profile-insights';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
let root:Root,host:HTMLDivElement,remove=()=>{};
afterEach(()=>{act(()=>root?.unmount());host?.remove();remove();publishProfileOwner(null);forgetPublicProfile('alexmorgan');vi.restoreAllMocks();});
function mount(){const profile=parsePublicProfile(profileFixture(),'alexmorgan');profile.items=[];profile.nextCursor=null;retainPublicProfile(profile);host=document.createElement('div');document.body.append(host);root=createRoot(host);const source={catalog:null,historyCatalog:null,status:'ready',pulse:14800001} as unknown as React.ComponentProps<typeof PublicProfilePage>['source'];act(()=>root.render(<PublicProfilePage username="alexmorgan" initialProfile={profile} source={source} active/>));}
async function open(){await act(async()=>host.querySelector<HTMLButtonElement>('[aria-label="View profile insights"]')!.click());await vi.waitFor(()=>expect(host.querySelector('.profile-insights-panel')).not.toBeNull());}
it('lets a visitor open already-carried public figures without any private or display request',async()=>{
 const fetcher=vi.spyOn(globalThis,'fetch');mount();expect(host.querySelector('.profile-insights-panel')).toBeNull();await open();
 const panel=host.querySelector('.profile-insights-panel')!;expect(panel.textContent).toContain('120');expect(panel.textContent).toContain('15');expect(panel.textContent).toContain('70%');
 expect(panel.querySelector('[data-insights-private]')).toBeNull();expect(panel.querySelector('[data-insights-public-chart]')).not.toBeNull();expect(fetcher).not.toHaveBeenCalled();
});
it('reuses the native owner snapshot for periods and reopen, then removes it immediately on logout',async()=>{
 const request=vi.fn(async()=>Response.json(insightsFixture()));const source=createProfileInsights({accountUid:'account-1',request});
 remove=registerProfileInsightsSource('account-1',async()=>source);publishProfileOwner('account-1');mount();expect(request).not.toHaveBeenCalled();await open();
 await vi.waitFor(()=>expect(host.querySelector('[data-insights-private]')).not.toBeNull());
 expect(host.querySelector('[aria-label^="Profile views over time"]')).not.toBeNull();expect(host.querySelector('[data-insights-private]')?.textContent).toContain('$15.00');
 await act(async()=>host.querySelector<HTMLButtonElement>('[aria-label="Show 7 days"]')!.click());
 await act(async()=>host.querySelector<HTMLButtonElement>('dialog [aria-label="Close"]')!.click());await open();await vi.waitFor(()=>expect(host.querySelector('[data-insights-private]')).not.toBeNull());expect(request).toHaveBeenCalledOnce();
 act(()=>publishProfileOwner(null));expect(host.querySelector('[data-insights-private]')).toBeNull();expect(host.querySelector('.profile-insights-panel')?.textContent).not.toContain('Only you');
});
it('does not read private analytics when an owner signs in after closing a visitor panel',async()=>{
 const request=vi.fn(async()=>Response.json(insightsFixture())),source=createProfileInsights({accountUid:'account-1',request});
 mount();await open();await act(async()=>host.querySelector<HTMLButtonElement>('dialog [aria-label="Close"]')!.click());
 remove=registerProfileInsightsSource('account-1',async()=>source);await act(async()=>publishProfileOwner('account-1'));
 expect(request).not.toHaveBeenCalled();expect(host.querySelector('[data-insights-private]')).toBeNull();
 await open();await vi.waitFor(()=>expect(host.querySelector('[data-insights-private]')).not.toBeNull());expect(request).toHaveBeenCalledOnce();
 await act(async()=>host.querySelector<HTMLButtonElement>('[aria-label="Refresh private insights"]')!.click());await vi.waitFor(()=>expect(request).toHaveBeenCalledTimes(2));
 await act(async()=>host.querySelector<HTMLButtonElement>('dialog [aria-label="Close"]')!.click());await open();expect(request).toHaveBeenCalledTimes(2);
});
it('keeps public figures visible during a genuine private wait and discards a result after logout',async()=>{
 let resolve!:(r:Response)=>void;const source=createProfileInsights({accountUid:'account-1',request:()=>new Promise(done=>{resolve=done;})});remove=registerProfileInsightsSource('account-1',async()=>source);publishProfileOwner('account-1');mount();await open();
 expect(host.querySelector('.profile-insights-panel')?.textContent).toContain('120');expect(host.querySelector('[data-insights-private]')).toBeNull();
 act(()=>publishProfileOwner(null));await act(async()=>resolve(Response.json(insightsFixture())));expect(host.querySelector('[data-insights-private]')).toBeNull();
});
it('formats native conversion ratios as percentages and preserves missing listening observations',async()=>{
 const data=insightsFixture();Object.assign(data.analytics.stream,{completionRate:.5,totalListenSeconds:null});data.analytics.funnel.checkoutToPaidRate=.25;
 const request=vi.fn(async()=>Response.json(data));const source=createProfileInsights({accountUid:'account-1',request});
 remove=registerProfileInsightsSource('account-1',async()=>source);publishProfileOwner('account-1');mount();await open();
 await vi.waitFor(()=>expect(host.querySelector('[data-insights-private]')).not.toBeNull());
 const details=host.querySelector('.insight-disclosure')!;expect(details.textContent).toContain('50%');expect(details.textContent).toContain('25%');expect(details.querySelector('dd')?.textContent).toBe('—');
});
