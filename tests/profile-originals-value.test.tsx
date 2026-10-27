// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,expect,it,vi} from 'vitest';
import {PublicProfilePage} from '../src/public-explorer/PublicProfilePage';
import {parsePublicProfile} from '../src/receiz/public-profile';
import {profileFixture} from './fixtures/public-profile';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
const cleanups:Array<()=>void>=[];afterEach(()=>{cleanups.splice(0).forEach(clean=>clean());vi.restoreAllMocks();});
it('shows the complete public originals total immediately from held prices without another read and omits partial or unpriced totals',async()=>{
 const profile=parsePublicProfile(profileFixture(),'alexmorgan');profile.userId='originals-value-owner';profile.nextCursor=null;
 profile.items=[{...profile.items[0],id:'displayed-one',hasPbiSignature:true,priceUsd:12.25,livePulseSeed:undefined},{...profile.items[0],id:'displayed-two',hasPbiSignature:true,priceUsd:20.50,livePulseSeed:undefined}];
 const source={catalog:null,status:'ready',pulse:14_000_000} as unknown as React.ComponentProps<typeof PublicProfilePage>['source'];
 const fetcher=vi.spyOn(globalThis,'fetch'),element=document.createElement('div');document.body.append(element);const root=createRoot(element);cleanups.push(()=>{act(()=>root.unmount());element.remove();});
 await act(async()=>root.render(<PublicProfilePage key="complete" username="alexmorgan" source={source} active={false} initialProfile={profile}/>));
 expect(element.querySelector('.profile-originals-value')?.textContent).toContain('$32.75');expect(element.querySelector('.profile-originals-value')?.textContent).toContain('2 displayed originals');
 await act(async()=>root.render(<PublicProfilePage key="partial" username="alexmorgan" source={source} active={false} initialProfile={{...profile,nextCursor:'all:'+profile.userId}}/>));
 expect(element.querySelector('.profile-originals-value')).toBeNull();
 await act(async()=>root.render(<PublicProfilePage key="unpriced" username="alexmorgan" source={source} active={false} initialProfile={{...profile,items:[{...profile.items[0],priceUsd:null}]}}/>));
 expect(element.querySelector('.profile-originals-value')).toBeNull();expect(fetcher).not.toHaveBeenCalled();
});
