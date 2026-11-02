// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,expect,it,vi} from 'vitest';
import {PublicProfilePage} from '../src/public-explorer/PublicProfilePage';
import {parsePublicProfile} from '../src/receiz/public-profile';
import {profileFixture} from './fixtures/public-profile';

Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
const cleanups:Array<()=>void>=[];
afterEach(()=>{cleanups.splice(0).forEach(clean=>clean());vi.restoreAllMocks();});
const source={catalog:null,status:'ready',pulse:14_000_000} as unknown as React.ComponentProps<typeof PublicProfilePage>['source'];

it('shows and prices every already-public Original regardless of PBI signing without changing held membership or reading again',async()=>{
 const profile=parsePublicProfile(profileFixture(),'alexmorgan');profile.userId='signed-showcase-owner';profile.nextCursor=null;
 const original={...profile.items[0],livePulseSeed:undefined};
 profile.items=[
  {...original,id:'signed-one',title:'Signed first',hasPbiSignature:true,priceUsd:12.25},
  {...original,id:'unsigned',title:'Unsigned original',hasPbiSignature:false,priceUsd:1000},
  {...original,id:'signed-two',title:'Signed second',hasPbiSignature:true,priceUsd:20.50},
  {...original,id:'unknown',title:'No object signature',hasPbiSignature:undefined,priceUsd:40.25},
 ];
 const held=[...profile.items],fetcher=vi.spyOn(globalThis,'fetch'),element=document.createElement('div');document.body.append(element);const root=createRoot(element);
 cleanups.push(()=>{act(()=>root.unmount());element.remove();});
 await act(()=>root.render(<PublicProfilePage username="alexmorgan" source={source} active={false} initialProfile={profile}/>));
 expect([...element.querySelectorAll('.profile-asset-caption>a')].map(link=>link.textContent)).toEqual(['Signed first','Unsigned original','Signed second','No object signature']);
 expect([...element.querySelectorAll('.profile-asset-price')].map(button=>button.textContent)).toEqual(['$12.25','$1,000.00','$20.50','$40.25']);
 expect(element.querySelector('.profile-originals-value')?.textContent).toContain('$1,073.00');
 expect(element.querySelector('.profile-originals-value')?.textContent).toContain('4 displayed originals');
 expect(profile.items).toEqual(held);expect(profile.items[1]).toBe(held[1]);
 expect([...element.querySelectorAll('.profile-activity-entry strong')].map(entry=>entry.textContent)).toEqual(['Signed first','Unsigned original','Signed second','No object signature']);
 expect(fetcher).not.toHaveBeenCalled();
});

it('shows an unsigned public collection at its held value without turning its objects into signed objects',async()=>{
 const profile=parsePublicProfile(profileFixture(),'alexmorgan');profile.userId='unsigned-showcase-owner';profile.nextCursor=null;
 profile.items=[{...profile.items[0],hasPbiSignature:false,priceUsd:1000,livePulseSeed:undefined}];
 expect(profile.authorshipVerified).toBe(true);expect(profile.pbiReceiptHash).not.toBeNull();
 const fetcher=vi.spyOn(globalThis,'fetch'),element=document.createElement('div');document.body.append(element);const root=createRoot(element);
 cleanups.push(()=>{act(()=>root.unmount());element.remove();});
 await act(()=>root.render(<PublicProfilePage username="alexmorgan" source={source} active={false} initialProfile={profile}/>));
 expect(element.querySelectorAll('.profile-asset')).toHaveLength(1);
 expect(element.querySelectorAll('.profile-activity-list li')).toHaveLength(1);
 expect(element.querySelector('.profile-originals-value')?.textContent).toContain('$1,000.00');expect(element.querySelector('.profile-showcase-return')).toBeNull();
 expect(profile.items).toHaveLength(1);expect(profile.items[0].hasPbiSignature).toBe(false);expect(fetcher).not.toHaveBeenCalled();
});
