// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {renderToStaticMarkup} from 'react-dom/server';
import {afterEach,expect,it,vi} from 'vitest';
import captured from './fixtures/created-original-public.json';
import {parsePublicOriginal,parsePublicProfile,retainPublicProfile,forgetPublicProfile} from '../src/receiz/public-profile';
import {retainAssetPublicationAdmission,admittedAssetPublicationItem,forgetAssetPublicationAdmissions,acceptDiscoveredProfileAssets,acceptDiscoveredPublicAssets,mergeAdmittedPublicAssets} from '../src/receiz/asset-publication-adoption';
import type {ConnectedAssetLocalAdmission} from '../src/receiz/asset-publication-runtime';
import {publishAccountAppearance} from '../src/receiz/account-appearance';
vi.mock('../src/features/media/ProofMedia',()=>({ProofMedia:()=>null}));
vi.mock('../src/receiz/market-projection/usePublicAssetPeriods',()=>({usePublicAssetPeriods:()=>null}));
import {PublicAssetDetail} from '../src/features/market/PublicAssetDetail';
import {parsePublicMarket} from '../src/receiz/public-market';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
const username=captured.profile.username,id=captured.original.id,digest=captured.original.importedSource.reference.artifactSha256;
const full=()=>parsePublicProfile({ok:true,profile:{profile:captured.profile,viewer:{canView:true},originals:[captured.original],stats:{originals:1},originalsPage:{hasMore:false,nextCursor:null}}},username);
const bare=new URL(captured.original.verifyUrl).pathname;
afterEach(()=>{forgetAssetPublicationAdmissions();forgetPublicProfile(username);publishAccountAppearance(null);vi.restoreAllMocks();});

it('preserves the current public photo and complete native receipt carried by the selected Original',()=>{
 const fetcher=vi.spyOn(globalThis,'fetch').mockRejectedValue(Error('No request expected'));
 const item=parsePublicOriginal({ok:true,viewer:{profile:captured.profile,originals:[captured.original]}},username,id);
 expect(item.ownerAvatarUrl).toBe(full().avatarUrl);
 expect(item.verifyUrl).toBe(captured.original.verifyUrl);
 expect(new URL(item.verifyUrl!).searchParams.get('c')).toMatch(/^rpb2:/);
 expect(item.originalDigest).toBe(digest);expect(item.proofManifestSource?.claimHashHex?.toLowerCase()).toBe('33da91a0486a0ef1402787cdfc8128aef6f0b5048fcf50a2c1a29c7254bedad0');
 expect(fetcher).not.toHaveBeenCalled();
});

it('keeps absent selected-viewer portrait metadata unknown and preserves an explicit remote clear',()=>{
 const profile:Record<string,unknown>={...captured.profile};delete profile.avatarUrl;
 const input={ok:true,viewer:{profile,originals:[captured.original]}};
 expect(parsePublicOriginal(input,username,id).ownerAvatarUrl).toBeUndefined();
 profile.avatarUrl=null;expect(parsePublicOriginal(input,username,id).ownerAvatarUrl).toBeNull();
});

it('repairs a cached local admission with the already-carried same-owner photo and exact receipt on its first standalone paint',async()=>{
 const current=full();retainPublicProfile({...current,avatarUrl:null,items:[]});
 const original={...captured.original,verifyPath:bare,verifyUrl:'https://receiz.com'+bare};
 retainAssetPublicationAdmission({username,original,sourceReference:original.importedSource.reference,firstPaint:null} as unknown as ConnectedAssetLocalAdmission,{identityDigest:'d'.repeat(64),accountUid:current.userId});
 const early=admittedAssetPublicationItem(digest,username)!;expect(early.ownerAvatarUrl).toBeNull();expect(early.verifyUrl).toBe('https://receiz.com'+bare);
 retainPublicProfile(current);
 const request=vi.spyOn(globalThis,'fetch').mockRejectedValue(Error('No request expected'));
 const host=document.createElement('div'),root=createRoot(host);
 try{
  await act(async()=>root.render(<PublicAssetDetail item={early} standalone/>));
  expect(host.querySelector('.asset-profile-byline img')?.getAttribute('src')).toBe(current.avatarUrl);
  const inspect=[...host.querySelectorAll('a')].find(link=>link.textContent?.includes('Inspect proof'));
  expect(inspect?.href).toBe(captured.original.verifyUrl);
  expect(admittedAssetPublicationItem(digest,username)?.verifyUrl).toBe(captured.original.verifyUrl);
  expect(request).not.toHaveBeenCalled();
  await act(async()=>{retainPublicProfile({...current,avatarUrl:null});});
  expect(host.querySelector('.asset-profile-byline img')).toBeNull();
 }finally{act(()=>root.unmount());}
});

it('does not override a remote explicit portrait clear through an unrelated local admission',async()=>{
 const current=full();retainPublicProfile(current);
 const item={...current.items[0],ownerAvatarUrl:null};
 const host=document.createElement('div'),root=createRoot(host);
 try{await act(async()=>root.render(<PublicAssetDetail item={item} standalone/>));expect(host.querySelector('.asset-profile-byline img')?.getAttribute('src')).not.toBe(current.avatarUrl);}
 finally{act(()=>root.unmount());}
});

it('keeps the selected public Original bound to its already-carried owner UID and creation coordinate',()=>{
 const current=full(),item=current.items[0];
 expect(item.ownerIdentity).toEqual({userId:current.userId,username,createdAt:captured.profile.createdAt});
 expect(parsePublicOriginal({ok:true,viewer:{profile:captured.profile,originals:[captured.original]}},username,id).ownerIdentity).toEqual(item.ownerIdentity);
});

it.each([null,'https://receiz.com/artwork/new-owner.webp'])('SSR preserves the reassigned owner portrait over an old same-name admission: %s',avatarUrl=>{
 const current=full();retainPublicProfile(current);
 retainAssetPublicationAdmission({username,original:captured.original,sourceReference:captured.original.importedSource.reference,firstPaint:null} as unknown as ConnectedAssetLocalAdmission,
  {identityDigest:'d'.repeat(64),accountUid:current.userId});
 const selected={...current.items[0],ownerAvatarUrl:avatarUrl,
  ownerIdentity:{userId:'11111111-1111-4111-8111-111111111111',username,createdAt:captured.profile.createdAt}};
 const host=document.createElement('div');host.innerHTML=renderToStaticMarkup(<PublicAssetDetail item={selected} standalone/>);
 const src=host.querySelector('.asset-profile-byline img')?.getAttribute('src');
 expect(src).not.toBe(current.avatarUrl);
 if(avatarUrl)expect(src).toBe(avatarUrl);
});

it('SSR preserves a canonical same-owner explicit clear over an older positive local admission',()=>{
 const current=full();retainPublicProfile(current);
 retainAssetPublicationAdmission({username,original:captured.original,sourceReference:captured.original.importedSource.reference,firstPaint:null} as unknown as ConnectedAssetLocalAdmission,
  {identityDigest:'d'.repeat(64),accountUid:current.userId});
 const host=document.createElement('div');host.innerHTML=renderToStaticMarkup(<PublicAssetDetail item={{...current.items[0],ownerAvatarUrl:null}} standalone/>);
 expect(host.querySelector('.asset-profile-byline img')?.getAttribute('src')).not.toBe(current.avatarUrl);
});

it('keeps a selected public item’s carried portrait and receipt while its earlier local admission has neither',async()=>{
 const current=full(),original={...captured.original,verifyPath:bare,verifyUrl:'https://receiz.com'+bare};
 retainAssetPublicationAdmission({username,original,sourceReference:original.importedSource.reference,firstPaint:null} as unknown as ConnectedAssetLocalAdmission,{identityDigest:'d'.repeat(64),accountUid:current.userId});
 const host=document.createElement('div'),root=createRoot(host);
 try{
  await act(async()=>root.render(<PublicAssetDetail item={current.items[0]} standalone/>));
  expect(host.querySelector('.asset-profile-byline img')?.getAttribute('src')).toBe(current.avatarUrl);
  expect([...host.querySelectorAll('a')].find(link=>link.textContent?.includes('Inspect proof'))?.href).toBe(captured.original.verifyUrl);
 }finally{act(()=>root.unmount());}
});

it('keeps the exact selected local Original enriched from its same-owner retained profile after both public surfaces retire the admission',async()=>{
 const current=full();retainPublicProfile({...current,avatarUrl:null,items:[]});
 const original={...captured.original,verifyPath:bare,verifyUrl:'https://receiz.com'+bare};
 retainAssetPublicationAdmission({username,original,sourceReference:original.importedSource.reference,firstPaint:null} as unknown as ConnectedAssetLocalAdmission,{identityDigest:'d'.repeat(64),accountUid:current.userId});
 const early=admittedAssetPublicationItem(digest,username)!;
 const request=vi.spyOn(globalThis,'fetch'),host=document.createElement('div'),root=createRoot(host);
 try{
  await act(async()=>root.render(<PublicAssetDetail item={early} standalone/>));
  const catalog={...parsePublicMarket({ok:true,transport:{publicOriginals:[]}}),items:current.items,sourceCount:1,complete:true};
  await act(async()=>{acceptDiscoveredProfileAssets(current);acceptDiscoveredPublicAssets(catalog);retainPublicProfile(current);mergeAdmittedPublicAssets(catalog);});
  expect(admittedAssetPublicationItem(digest,username)).toBeNull();
  expect(host.querySelector('.asset-profile-byline img')?.getAttribute('src')).toBe(current.avatarUrl);
  expect([...host.querySelectorAll('a')].find(link=>link.textContent?.includes('Inspect proof'))?.href).toBe(captured.original.verifyUrl);
  // The same selected row follows a current explicit clear and never borrows
  // presentation from a different account that later owns the same handle.
  await act(async()=>retainPublicProfile({...current,avatarUrl:null}));
  expect(host.querySelector('.asset-profile-byline img')?.getAttribute('src')).not.toBe(current.avatarUrl);
  await act(async()=>retainPublicProfile({...current,userId:'11111111-1111-4111-8111-111111111111'}));
  expect(host.querySelector('.asset-profile-byline img')?.getAttribute('src')).not.toBe(current.avatarUrl);
  expect(request).not.toHaveBeenCalled();
 }finally{act(()=>root.unmount());}
});

it.each([captured.profile.userId,'another-account'])('reuses only an already-carried photo bound to the local admission owner: %s',async accountUid=>{
 const current=full(),original={...captured.original,verifyPath:bare,verifyUrl:'https://receiz.com'+bare};
 retainAssetPublicationAdmission({username,original,sourceReference:original.importedSource.reference,firstPaint:null} as unknown as ConnectedAssetLocalAdmission,{identityDigest:'d'.repeat(64),accountUid:current.userId});
 const early={...admittedAssetPublicationItem(digest,username)!,ownerAvatarUrl:null};
 publishAccountAppearance({accountUid,name:current.displayName,avatarUrl:current.avatarUrl});
 const request=vi.spyOn(globalThis,'fetch').mockRejectedValue(Error('No request expected'));
 const host=document.createElement('div'),root=createRoot(host);
 try{
  await act(async()=>root.render(<PublicAssetDetail item={early} standalone/>));
  expect(host.querySelector('.asset-profile-byline img')?.getAttribute('src')??null).toBe(accountUid===current.userId?current.avatarUrl:null);
  expect(request).not.toHaveBeenCalled();
 }finally{act(()=>root.unmount());}
});
