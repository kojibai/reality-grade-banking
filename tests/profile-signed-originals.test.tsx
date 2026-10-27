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

it('shows only object-level PBI-signed originals and values that exact set without changing held membership or reading again',async()=>{
 const profile=parsePublicProfile(profileFixture(),'alexmorgan');profile.userId='signed-showcase-owner';profile.nextCursor=null;
 const original={...profile.items[0],livePulseSeed:undefined};
 profile.items=[
  {...original,id:'signed-one',title:'Signed first',hasPbiSignature:true,priceUsd:12.25},
  {...original,id:'unsigned',title:'Unsigned original',hasPbiSignature:false,priceUsd:1000},
  {...original,id:'signed-two',title:'Signed second',hasPbiSignature:true,priceUsd:20.50},
  {...original,id:'unknown',title:'No object signature',hasPbiSignature:undefined,priceUsd:null},
 ];
 const held=[...profile.items],fetcher=vi.spyOn(globalThis,'fetch'),element=document.createElement('div');document.body.append(element);const root=createRoot(element);
 cleanups.push(()=>{act(()=>root.unmount());element.remove();});
 await act(()=>root.render(<PublicProfilePage username="alexmorgan" source={source} active={false} initialProfile={profile}/>));
 expect([...element.querySelectorAll('.profile-asset-caption>a')].map(link=>link.textContent)).toEqual(['Signed first','Signed second']);
 expect(element.querySelector('.profile-originals-value')?.textContent).toContain('$32.75');
 expect(element.querySelector('.profile-originals-value')?.textContent).toContain('2 displayed originals');
 expect(profile.items).toEqual(held);expect(profile.items[1]).toBe(held[1]);
 expect([...element.querySelectorAll('.profile-activity-entry strong')].map(entry=>entry.textContent)).toEqual(['Signed first','Signed second']);
 expect(fetcher).not.toHaveBeenCalled();
});

it('does not treat a signed profile as signed objects or show a zero-value total for an unsigned showcase',async()=>{
 const profile=parsePublicProfile(profileFixture(),'alexmorgan');profile.userId='unsigned-showcase-owner';profile.nextCursor=null;
 profile.items=[{...profile.items[0],hasPbiSignature:false,priceUsd:1000,livePulseSeed:undefined}];
 expect(profile.authorshipVerified).toBe(true);expect(profile.pbiReceiptHash).not.toBeNull();
 const fetcher=vi.spyOn(globalThis,'fetch'),element=document.createElement('div');document.body.append(element);const root=createRoot(element);
 cleanups.push(()=>{act(()=>root.unmount());element.remove();});
 await act(()=>root.render(<PublicProfilePage username="alexmorgan" source={source} active={false} initialProfile={profile}/>));
 expect(element.querySelectorAll('.profile-asset')).toHaveLength(0);
 expect(element.querySelectorAll('.profile-activity-list li')).toHaveLength(0);
 expect(element.querySelector('.profile-originals-value')).toBeNull();expect(element.querySelector('.profile-showcase-return')).toBeNull();
 expect(profile.items).toHaveLength(1);expect(fetcher).not.toHaveBeenCalled();
});
