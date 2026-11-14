// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,expect,it,vi} from 'vitest';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();document.body.replaceChildren();localStorage.clear();});
it('indexes a thousand public profiles without realizing artwork and prepares only visible exact portraits',async()=>{
 vi.resetModules();localStorage.clear();
 const artwork=await import('../src/receiz/profile-artwork'),avatar=artwork.publicProfileAvatar;
 const full=vi.spyOn(artwork,'publicProfileArtwork'),portraits=vi.spyOn(artwork,'publicProfileAvatar');
 const fetcher=vi.fn(()=>{throw Error('Held directory rendering cannot read APIs');});vi.stubGlobal('fetch',fetcher);
 const heads=Array.from({length:1000},(_,index)=>({profile:{userId:'directory-owner-'+index,username:'person_'+index,displayName:'Person '+index,createdAt:'2026-01-01T12:00:00Z',isPrivate:false,avatarUrl:index===0?'https://receiz.com/artwork/custom-person.png':null,authorshipVerified:true,authorshipPbiReceiptHash:'a'.repeat(64)},viewer:{canView:true},stats:{originals:0}}));
 const {buildDiscoveryIndex}=await import('../src/public-discover/discovery-index');
 const index=buildDiscoveryIndex([],heads);expect(index.people).toHaveLength(1000);expect(full).not.toHaveBeenCalled();expect(portraits).not.toHaveBeenCalled();
 const {Discover}=await import('../src/public-discover/Discover'),host=document.createElement('div'),root=createRoot(host);document.body.append(host);
 try{
  await act(async()=>root.render(<Discover seed={[]} seedHeads={heads} active={false}/>));
  const people=[...host.querySelectorAll<HTMLImageElement>('.discover-people-list a img')];
  expect(people).toHaveLength(20);expect(full).not.toHaveBeenCalled();expect(portraits).toHaveBeenCalledTimes(19);
  expect(people[0].getAttribute('src')).toBe('https://receiz.com/artwork/custom-person.png');
  expect(people[1].getAttribute('src')).toBe(avatar(heads[1].profile));expect(fetcher).not.toHaveBeenCalled();
 }finally{await act(()=>root.unmount());host.remove();}
});
