// @vitest-environment happy-dom
import {afterEach,it,expect,vi} from 'vitest';
import {act} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {ProfileCollection} from '../src/public-explorer/ProfileCollection';
import {parsePublicProfile} from '../src/receiz/public-profile';
import {profileFixture} from './fixtures/public-profile';
vi.mock('../src/features/media/ProofMedia',async importOriginal=>({...await importOriginal<typeof import('../src/features/media/ProofMedia')>(),ProofMedia:()=> <div data-reader>Existing media reader</div>}));
let root:Root;let element:HTMLDivElement;afterEach(async()=>{if(root)await act(()=>root.unmount());element?.remove();});
it('changes collection columns without fetching and opens media in place',async()=>{
 element=document.createElement('div');document.body.append(element);root=createRoot(element);const fetcher=vi.spyOn(globalThis,'fetch');
 const profile=parsePublicProfile(profileFixture(),'alexmorgan');
 await act(()=>root.render(<ProfileCollection profile={profile} items={profile.items} active/>));
 expect(element.querySelector('.profile-collection-grid')?.getAttribute('data-columns')).toBe('2');
 await act(()=>element.querySelector<HTMLButtonElement>('[aria-label="Single-column view"]')!.click());
 expect(element.querySelector('.profile-collection-grid')?.getAttribute('data-columns')).toBe('1');expect([...element.querySelectorAll('.profile-asset-cover img')].every(img=>img.getAttribute('loading')==='eager')).toBe(true);expect(fetcher).not.toHaveBeenCalled();
 await act(()=>element.querySelector<HTMLButtonElement>('[aria-label="Experience Authored title"]')!.click());
 expect(element.querySelector('[data-reader]')).not.toBeNull();expect(element.querySelector('a[href^="/asset/"]')).not.toBeNull();fetcher.mockRestore();
});
it('restores the selected profile section after opening an asset and returning',async()=>{
 const {PublicProfilePage}=await import('../src/public-explorer/PublicProfilePage'),{retainPublicProfile}=await import('../src/receiz/public-profile');const profile=parsePublicProfile(profileFixture(),'alexmorgan');retainPublicProfile(profile);const source={catalog:null,status:'loading'} as unknown as import('react').ComponentProps<typeof PublicProfilePage>['source'];element=document.createElement('div');document.body.append(element);root=createRoot(element);
 await act(()=>root.render(<PublicProfilePage username="alexmorgan" source={source} active/>));expect(element.querySelector<HTMLAnchorElement>('.profile-actions a.primary-button')?.href).toBe('https://bankeiz.com/pay/alexmorgan/');expect([...element.querySelectorAll('.profile-actions button')].some(node=>node.textContent==='Message')).toBe(true);await act(()=>[...element.querySelectorAll('button')].find(node=>node.textContent==='Public Activity')!.click());await act(()=>root.render(<div>Standalone asset</div>));await act(()=>root.render(<PublicProfilePage username="alexmorgan" source={source} active/>));expect([...element.querySelectorAll('.profile-tabs button')].find(node=>node.getAttribute('aria-selected')==='true')?.textContent).toBe('Public Activity');
});
it('prioritizes the first covers and reveals the held collection ahead of scrolling without another data read',async()=>{
 let intersect:(entries:{isIntersecting:boolean}[])=>void=()=>{};const disconnected=vi.fn();
 vi.stubGlobal('IntersectionObserver',class{constructor(callback:typeof intersect){intersect=callback;}observe(){}disconnect(){disconnected();}});
 const fetcher=vi.spyOn(globalThis,'fetch'),profile=parsePublicProfile(profileFixture(),'alexmorgan');profile.userId='feed-window-owner';profile.nextCursor=null;profile.items=Array.from({length:60},(_,i)=>({...profile.items[0],id:'feed-'+i}));
 element=document.createElement('div');document.body.append(element);root=createRoot(element);
 try{
  await act(()=>root.render(<ProfileCollection profile={profile} items={profile.items} active/>));expect(element.querySelectorAll('.profile-asset')).toHaveLength(24);expect([...element.querySelectorAll('.profile-asset-cover img')].map(img=>img.getAttribute('loading'))).toEqual([...Array(2).fill('eager'),...Array(22).fill('lazy')]);
  await act(()=>intersect([{isIntersecting:true}]));expect(element.querySelectorAll('.profile-asset')).toHaveLength(48);expect(fetcher).not.toHaveBeenCalled();
  await act(()=>intersect([{isIntersecting:true}]));expect(element.querySelectorAll('.profile-asset')).toHaveLength(60);expect(element.querySelector('.profile-load-more')).toBeNull();
  await act(()=>element.querySelector<HTMLButtonElement>('[aria-label="Single-column view"]')!.click());expect([...element.querySelectorAll('.profile-asset-cover img')].every(img=>img.getAttribute('loading')==='eager')).toBe(true);
 }finally{fetcher.mockRestore();vi.unstubAllGlobals();}
});
it('limits initial document image preloads to the first collection rows while retaining every held card',async()=>{
 const {renderToString}=await import('react-dom/server');
 const profile=parsePublicProfile(profileFixture(),'alexmorgan');profile.userId='cold-cover-owner';profile.nextCursor=null;
 profile.items=Array.from({length:24},(_,i)=>({...profile.items[0],id:'cold-cover-'+i,artworkUrl:'https://receiz.com/artwork/cold-cover-'+i+'.png'}));
 const document=documentFor(renderToString(<ProfileCollection profile={profile} items={profile.items} active={false}/>));
 expect(document.querySelectorAll('.profile-asset')).toHaveLength(24);
 expect([...document.querySelectorAll('link[rel="preload"][as="image"]')].map(link=>link.getAttribute('href'))).toEqual([0,1].map(i=>'https://receiz.com/artwork/cold-cover-'+i+'.png'));
 expect([...document.querySelectorAll('.profile-asset-cover img')].slice(2).every(image=>image.getAttribute('loading')==='lazy')).toBe(true);
});
it('keeps hidden public activity artwork out of initial document preloads without dropping its history',async()=>{
 const {renderToString}=await import('react-dom/server'),{ProfileActivity}=await import('../src/public-explorer/ProfileActivity');
 const profile=parsePublicProfile(profileFixture(),'alexmorgan');profile.items=Array.from({length:24},(_,i)=>({...profile.items[0],id:'cold-activity-'+i,artworkUrl:'https://receiz.com/artwork/cold-activity-'+i+'.png'}));
 const document=documentFor(renderToString(<ProfileActivity items={profile.items} hasMore={false} onMore={()=>{}} active={false}/>));
 expect(document.querySelectorAll('.profile-activity-list li')).toHaveLength(24);expect(document.querySelectorAll('link[rel="preload"][as="image"]')).toHaveLength(0);
 expect([...document.querySelectorAll('.profile-activity-artwork img')].every(image=>image.getAttribute('loading')==='lazy')).toBe(true);
});
function documentFor(html:string){const container=document.createElement('div');container.innerHTML=html;return container;}
it('does not loop source reads after automatic expansion fails',async()=>{
 let intersect:(entries:{isIntersecting:boolean}[])=>void=()=>{};vi.stubGlobal('IntersectionObserver',class{constructor(callback:typeof intersect){intersect=callback;}observe(){}disconnect(){}});
 const profile=parsePublicProfile(profileFixture(),'alexmorgan');profile.userId='feed-refusal-owner';const onMore=vi.fn();element=document.createElement('div');document.body.append(element);root=createRoot(element);
 try{
  await act(()=>root.render(<ProfileCollection profile={profile} items={profile.items} active onMore={onMore}/>));
  await act(()=>intersect([{isIntersecting:true}]));await act(()=>intersect([{isIntersecting:true}]));expect(onMore).toHaveBeenCalledTimes(1);
  await act(()=>element.querySelector<HTMLButtonElement>('.profile-load-more')!.click());expect(onMore).toHaveBeenCalledTimes(2);
 }finally{vi.unstubAllGlobals();}
});
it('offers categories from the entire held collection and opens all matches beyond the All window without another read',async()=>{
 const profile=parsePublicProfile(profileFixture(),'alexmorgan');profile.userId='complete-category-owner';profile.nextCursor=null;
 profile.items=Array.from({length:75},(_,i)=>({...profile.items[0],id:'category-'+i,title:'Asset '+i,hasLongForm:false,mediaKind:i>=66?'audio':'image'}));
 const fetcher=vi.spyOn(globalThis,'fetch'),onMore=vi.fn();element=document.createElement('div');document.body.append(element);root=createRoot(element);
 try{
  await act(()=>root.render(<ProfileCollection profile={profile} items={profile.items} active onMore={onMore}/>));
  expect(element.querySelectorAll('.profile-asset')).toHaveLength(24);
  const categories=()=>[...element.querySelectorAll<HTMLButtonElement>('.profile-categories button')];
  expect(categories().map(button=>button.textContent)).toEqual(['All','Music','Images']);
  await act(()=>categories().find(button=>button.textContent==='Music')!.click());
  expect(element.querySelectorAll('.profile-asset')).toHaveLength(9);
  expect(element.querySelector('.profile-asset-caption>a')?.textContent).toBe('Asset 66');
  expect(element.querySelector('.profile-load-more')).toBeNull();expect(fetcher).not.toHaveBeenCalled();expect(onMore).not.toHaveBeenCalled();
  await act(()=>categories().find(button=>button.textContent==='All')!.click());expect(element.querySelectorAll('.profile-asset')).toHaveLength(24);
 }finally{fetcher.mockRestore();}
});
it('opens a price sheet directly from the collection using held chart material without a source request',async()=>{
 const profile=parsePublicProfile(profileFixture(),'alexmorgan');profile.userId='price-peek-owner';profile.nextCursor=null;
 const fetcher=vi.spyOn(globalThis,'fetch');element=document.createElement('div');document.body.append(element);root=createRoot(element);
 try{
  await act(()=>root.render(<ProfileCollection profile={profile} items={profile.items} active/>));
  await act(()=>element.querySelector<HTMLButtonElement>('.profile-asset-price')!.click());
  expect(element.querySelector('dialog h2')?.textContent).toBe('Asset value');expect(element.querySelector('dialog h3')?.textContent).toBe('Authored title');
  expect(element.querySelector('dialog a[href^="/asset/"]')).not.toBeNull();expect(fetcher).not.toHaveBeenCalled();
  await act(()=>element.querySelector<HTMLButtonElement>('dialog [aria-label="Close"]')!.click());expect(element.querySelector('dialog')).toBeNull();
 }finally{fetcher.mockRestore();}
});
it('opens the existing trade intent from the chart sheet without submitting a purchase',async()=>{
 const {readPublicAssetTrade,closePublicAssetTrade}=await import('../src/receiz/public-asset-trade');
 const profile=parsePublicProfile(profileFixture(),'alexmorgan');profile.userId='price-trade-owner';const fetcher=vi.spyOn(globalThis,'fetch');element=document.createElement('div');document.body.append(element);root=createRoot(element);
 try{
  await act(()=>root.render(<ProfileCollection profile={profile} items={profile.items} active/>));
  await act(()=>element.querySelector<HTMLButtonElement>('.profile-asset-price')!.click());
  const heading=element.querySelector('dialog h3')!,link=element.querySelector('dialog .profile-peek-link')!;expect(heading.compareDocumentPosition(link)&Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  await act(()=>[...element.querySelectorAll<HTMLButtonElement>('dialog button')].find(button=>button.textContent==='Buy ownership')!.click());
  expect(element.querySelector('dialog')).toBeNull();expect(readPublicAssetTrade()).toMatchObject({itemId:profile.items[0].id,side:'buy'});expect(fetcher).not.toHaveBeenCalled();
 }finally{closePublicAssetTrade();fetcher.mockRestore();}
});
it('switches weighted showcase percentage periods immediately without a source read',async()=>{
 const {PublicProfilePage}=await import('../src/public-explorer/PublicProfilePage'),{retainPublicProfile,forgetPublicProfile}=await import('../src/receiz/public-profile');
 const raw=profileFixture();Object.assign(raw.profile.originals[0].marketPreview!,{livePulseSeed:{kind:'sigil',claimPulse:14800000,beat:2,stepIndex:3,creatorVerified:true}});
 const profile=parsePublicProfile(raw,'alexmorgan');profile.items=profile.items.map(item=>({...item,hasPbiSignature:true}));profile.userId='period-control-owner';profile.nextCursor=null;retainPublicProfile(profile);
 const source={catalog:null,pulse:15000000,status:'loading'} as unknown as import('react').ComponentProps<typeof PublicProfilePage>['source'];
 const fetcher=vi.spyOn(globalThis,'fetch');element=document.createElement('div');document.body.append(element);root=createRoot(element);
 try{
  await act(()=>root.render(<PublicProfilePage username="alexmorgan" source={source} active={false}/>));
  const initial=element.querySelector('.profile-showcase-return')?.textContent;
  expect(element.querySelector<HTMLSelectElement>('[aria-label="Showcase growth period"]')?.value).toBe('ALL');
  await act(()=>element.querySelector<HTMLButtonElement>('[aria-label="Next growth period"]')!.click());
  expect(element.querySelector<HTMLSelectElement>('[aria-label="Showcase growth period"]')?.value).toBe('1D');expect(element.querySelector('.profile-showcase-return')?.textContent).not.toBe(initial);
  await act(()=>element.querySelector<HTMLButtonElement>('[aria-label="Previous growth period"]')!.click());expect(element.querySelector('.profile-showcase-return')?.textContent).toBe(initial);expect(fetcher).not.toHaveBeenCalled();
 }finally{forgetPublicProfile('alexmorgan');fetcher.mockRestore();}
});

it('opens Moment entries locally and keeps the compact two-column preview free of coordinates',async()=>{
 const profile=parsePublicProfile(profileFixture(),'alexmorgan');profile.userId='moment-view-owner';profile.nextCursor=null;profile.items=[{...profile.items[0],id:'moment-preview',mediaKind:'moment',originalUrl:null,originalDigest:null,summary:'The full moment. Another line.',pulse:'123456',sealedAt:'2026-10-21T00:00:00Z'}];
 element=document.createElement('div');document.body.append(element);root=createRoot(element);const fetcher=vi.spyOn(globalThis,'fetch');
 try{await act(()=>root.render(<ProfileCollection profile={profile} items={profile.items} active/>));expect(element.querySelector('.moment-card-owner time')).toBeNull();expect(element.querySelector('.moment-card-coordinates')).toBeNull();await act(()=>element.querySelector<HTMLButtonElement>('.profile-asset-cover')!.click());expect(element.querySelector('.profile-asset.is-experiencing .asset-object')).not.toBeNull();expect(element.querySelector('.moment-card-owner time')).not.toBeNull();expect(fetcher).not.toHaveBeenCalled();}finally{fetcher.mockRestore();}
});

it('opens a public profile-image object from its existing artwork when no downloadable original is carried',async()=>{
 const profile=parsePublicProfile(profileFixture(),'alexmorgan');profile.userId='profile-artwork-owner';profile.nextCursor=null;profile.items=[{...profile.items[0],id:'profile-image',mediaKind:'image',originalUrl:null,originalDigest:null,artworkUrl:'https://receiz.com/artwork/avatar.png'}];
 element=document.createElement('div');document.body.append(element);root=createRoot(element);const fetcher=vi.spyOn(globalThis,'fetch');try{await act(()=>root.render(<ProfileCollection profile={profile} items={profile.items} active/>));const button=element.querySelector<HTMLButtonElement>('.profile-asset-cover')!;expect(button.disabled).toBe(false);await act(()=>button.click());expect(element.querySelector('dialog img')?.getAttribute('src')).toBe(profile.items[0].artworkUrl);expect(fetcher).not.toHaveBeenCalled();}finally{fetcher.mockRestore();}
});
