// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,expect,it,vi} from 'vitest';
import captured from './fixtures/created-original-public.json';
import {createPublicProfileReader} from '../server/public-profile';
import {renderPublicProfile} from '../server/profile-document';
import {profilePreviewHtml} from '../server/profile-preview';
import {PublicProfilePage} from '../src/public-explorer/PublicProfilePage';
import {forgetPublicProfile,retainedPublicProfile,type PublicProfile} from '../src/receiz/public-profile';
import {retainedPublicAsset} from '../src/receiz/public-asset-page';

Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
const username='bjklock',id='imported-b69c12eaabfb7e5e2a3875c936a728f2670c007d7ad191471388da23c78e73d4';
afterEach(()=>{forgetPublicProfile(username);document.body.innerHTML='';vi.restoreAllMocks();});

it('carries the exact unsigned Original, artwork and full receipt from one cold collection read through warm profile and chart navigation',async()=>{
 const input={ok:true,representation:'collection-v2',profile:{profile:captured.profile,viewer:{canView:true},originals:[captured.original],stats:{originals:1},originalsPage:{hasMore:false,nextCursor:null}}};
 const bytes=JSON.stringify(input),parse=vi.spyOn(JSON,'parse'),fetcher=vi.fn(async()=>new Response(bytes)),enrich=vi.fn(async(profile:PublicProfile)=>profile);
 const read=createPublicProfileReader(fetcher,enrich),[profile,otherConsumer]=await Promise.all([read(username),read(username)]);
 expect(otherConsumer).toBe(profile);expect(fetcher).toHaveBeenCalledOnce();expect(enrich).toHaveBeenCalledOnce();
 expect(parse.mock.calls.filter(([value])=>value===bytes)).toHaveLength(1);
 expect(profile.items).toHaveLength(1);expect(profile.items[0]).toMatchObject({assetId:id,hasPbiSignature:false,hasLongForm:true,originalDigest:'ea1ac75145e828fdf2873ce40790d566579b32a967093ff457c6aa4c21a8621f',verifyUrl:captured.original.verifyUrl});
 const shell='<html><head><title>Explore</title></head><body><div id="public-explore-root"></div><script id="receiz-navigation" type="application/json">{}</script></body></html>';
 const html=profilePreviewHtml(shell,username,profile,undefined,renderPublicProfile(profile));
 document.body.innerHTML=/<body>([\s\S]*?)<\/body>/.exec(html)![1];
 const coldCover=document.querySelector('.profile-asset-cover img'),seed=document.getElementById('public-profile-seed')!.textContent!;
 expect(coldCover?.getAttribute('src')).toBe(profile.items[0].artworkUrl);expect(coldCover?.getAttribute('loading')).toBe('eager');
 expect(document.querySelector('.profile-asset-caption>a')?.textContent).toBe('THE MONEY DOESN’T NEED TO COME BACK.');
 const held=retainedPublicProfile(username)!;expect(held.items).toEqual(profile.items);expect(document.getElementById('public-profile-seed')).toBeNull();
 const requests=vi.spyOn(globalThis,'fetch').mockRejectedValue(Error('Warm navigation must use its carried collection'));
 const source={catalog:null,historyCatalog:null,pulse:14956000,status:'ready'} as unknown as React.ComponentProps<typeof PublicProfilePage>['source'];
 const host=document.createElement('div'),root=createRoot(host);document.body.append(host);
 try{
  await act(async()=>root.render(<PublicProfilePage username={username} source={source} active/>));
  const cover=host.querySelector('.profile-asset-cover img');
  expect(cover?.getAttribute('src')).toBe(coldCover?.getAttribute('src'));
  expect(host.querySelector('.profile-portrait img')?.getAttribute('src')).toBe(profile.avatarUrl);
  await act(async()=>host.querySelector<HTMLButtonElement>('.profile-asset-price')!.click());
  expect(host.querySelector('dialog .value-chart')).not.toBeNull();
  await act(async()=>host.querySelector<HTMLButtonElement>('dialog [aria-label="Close"]')!.click());
  await act(async()=>[...host.querySelectorAll<HTMLButtonElement>('.profile-tabs button')].find(button=>button.textContent==='Public Activity')!.click());
  await act(async()=>[...host.querySelectorAll<HTMLButtonElement>('.profile-tabs button')].find(button=>button.textContent==='Assets')!.click());
  expect(host.querySelector('.profile-asset-cover img')).toBe(cover);
  const asset=host.querySelector<HTMLAnchorElement>('.profile-asset-caption>a')!;
  await act(async()=>asset.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true})));
  expect(retainedPublicAsset('profile:'+username+':'+id)?.verifyUrl).toBe(captured.original.verifyUrl);
  await act(async()=>root.render(<div>Selected asset</div>));
  await act(async()=>root.render(<PublicProfilePage username={username} source={source} active/>));
  expect(host.querySelector('.profile-asset-cover img')?.getAttribute('src')).toBe(profile.items[0].artworkUrl);
  await act(async()=>host.querySelector<HTMLButtonElement>('.profile-asset-price')!.click());
  expect(host.querySelector('dialog .value-chart')).not.toBeNull();
  expect(retainedPublicProfile(username)?.items).toBe(held.items);
  expect(parse.mock.calls.filter(([value])=>value===seed)).toHaveLength(1);
  expect(requests).not.toHaveBeenCalled();expect(fetcher).toHaveBeenCalledOnce();
 }finally{act(()=>root.unmount());host.remove();}
});
