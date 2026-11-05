import {describe,it,expect,vi} from 'vitest';
import {parsePublicProfile,profilePagePath,profilePageUsername,publicProfileMovement} from '../src/receiz/public-profile';

import {profileFixture} from './fixtures/public-profile';

describe('public profiles',()=>{
 it('shows the newest sealed pulse first even when accepted storage appends arrive last',()=>{
  const input=profileFixture(),base=input.profile.originals[0];
  if(!base.media)throw Error('Public Original fixture missing');
  input.profile.originals=[
   {...base,id:'old',pulse:'9007199254740992',createdAt:'2026-11-03T00:00:00Z'},
   {...base,id:'newest',pulse:'9007199254740993',createdAt:'2026-09-01T00:00:00Z'},
   {...base,id:'missing-coordinate',pulse:''},
   {...base,id:'same-pulse-z',pulse:'9007199254740992'},
  ];
  const before=JSON.stringify(input);
  expect(parsePublicProfile(input,'alexmorgan').items.map(item=>item.assetId)).toEqual(['newest','same-pulse-z','old','missing-coordinate']);
  expect(JSON.stringify(input)).toBe(before);
 });
 it('keeps the complete accepted collection and brings an unsigned final append into the first visible window without fetching',()=>{
  const input=profileFixture(),base=input.profile.originals[0];
  if(!base.media)throw Error('Public Original fixture missing');
  input.profile.stats.originals=612;input.profile.originalsPage={hasMore:false,nextCursor:''};
  input.profile.originals=Array.from({length:612},(_,index)=>({...base,id:'work-'+index,pulse:String(14000000+index)}));
  const fetcher=vi.spyOn(globalThis,'fetch').mockRejectedValue(Error('presentation must reuse the collection'));
  try{
   const profile=parsePublicProfile(input,'alexmorgan');
   expect(profile.items).toHaveLength(612);expect(profile.stats.originals).toBe(612);expect(profile.nextCursor).toBeNull();
   expect(profile.items[0]).toMatchObject({assetId:'work-611',hasPbiSignature:false,pulse:'14000611'});
   expect(new Set(profile.items.map(item=>item.assetId)).size).toBe(612);expect(fetcher).not.toHaveBeenCalled();
  }finally{fetcher.mockRestore();}
 });
 it('preserves identity and authored assets while excluding private data and hidden work',()=>{
  const profile=parsePublicProfile(profileFixture(),'alexmorgan');
  expect(profile).toMatchObject({userId:'account-1',username:'alexmorgan',displayName:'Alex Morgan',pbiReceiptHash:'a'.repeat(64),nextCursor:'all:account-1'});
  expect(profile.items).toHaveLength(1);expect(profile.items[0]).toMatchObject({title:'Authored title',priceUsd:12,ownerUsername:'alexmorgan',hasLongForm:true});
  expect(JSON.stringify(profile)).not.toMatch(/private@example|secret|Private draft|Do not duplicate/);
 });
 it('refuses private, unreadable and different-handle responses',()=>{
  const input=profileFixture();input.profile.profile.isPrivate=true;expect(()=>parsePublicProfile(input,'alexmorgan')).toThrow('PROFILE_PRIVATE');
  input.profile.profile.isPrivate=false;input.profile.viewer.canView=false;expect(()=>parsePublicProfile(input,'alexmorgan')).toThrow('PROFILE_PRIVATE');
  input.profile.viewer.canView=true;expect(()=>parsePublicProfile(input,'different')).toThrow('PROFILE_IDENTITY_MISMATCH');
 });
 it('does not turn absent authorship or unsafe links into identity evidence',()=>{
  const input=profileFixture();input.profile.profile.authorshipVerified=false;input.profile.profile.authorshipPbiReceiptHash='bad';input.profile.profile.websiteUrl='javascript:alert(1)';
  const profile=parsePublicProfile(input,'alexmorgan');expect(profile.websiteUrl).toBeNull();expect(profile.pbiReceiptHash).toBeNull();expect(profile.authorshipVerified).toBe(false);
 });
 it('keeps marketing, asset and API routes out of the username namespace',()=>{
  expect(profilePagePath('alexmorgan')).toBe('/alexmorgan/');expect(profilePageUsername('/alexmorgan/')).toBe('alexmorgan');
  for(const path of ['/business/','/business','/learn/','/explore/','/ledger/','/api/','/asset/id/','/bad%2fname/'])expect(profilePageUsername(path)).toBeNull();
  expect(profilePagePath('business')).toBe('/u/business/');expect(profilePageUsername('/u/business/')).toBe('business');
  expect(profilePagePath('explore')).toBe('/u/explore/');expect(profilePageUsername('/u/explore/')).toBe('explore');
 });
 it('reports missing movement honestly and uses the selected existing comparison',()=>{
  expect(publicProfileMovement(100,null)).toBeNull();expect(publicProfileMovement(110,100)).toBeCloseTo(10);expect(publicProfileMovement(90,100)).toBeCloseTo(-10);expect(publicProfileMovement(10,0)).toBeNull();
 });
});
it('keeps named links separate from social fields and rejects unsafe custom destinations',()=>{
 const value=profileFixture() as unknown as {ok:true;profile:{profile:Record<string,unknown>}};value.profile.profile.links=[{label:'Studio',url:'https://studio.example'},{label:'Unsafe',url:'https://name:secret@other.example/'}];value.profile.profile.socialInstagramUrl='https://instagram.com/alex';const parsed=parsePublicProfile(value,'alexmorgan');expect(parsed.links).toEqual([{label:'Studio',url:'https://studio.example/'}]);expect(parsed.socialLinks).toEqual([{label:'Instagram',url:'https://instagram.com/alex'}]);
});
it('invalidates a retained previous handle when the same account confirms a new username',async()=>{
 const {retainPublicProfile,retainedPublicProfile}=await import('../src/receiz/public-profile');const original=parsePublicProfile(profileFixture(),'alexmorgan');retainPublicProfile(original);expect(retainedPublicProfile('alexmorgan')).toBe(original);retainPublicProfile({...original,username:'alexrenamed'});expect(retainedPublicProfile('alexmorgan')).toBeNull();expect(retainedPublicProfile('alexrenamed')?.userId).toBe(original.userId);
});
it('appends confirmed PBI authorship without fetching or replacing held assets and other profiles',async()=>{
 const {retainPublicProfile,retainedPublicProfile,retainProfilePbiAuthorship}=await import('../src/receiz/public-profile');
 const profile=parsePublicProfile(profileFixture(),'alexmorgan'),other={...profile,userId:'other-account',username:'otherperson'};
 retainPublicProfile({...profile,authorshipVerified:false,pbiReceiptHash:null});retainPublicProfile(other);
 const items=retainedPublicProfile('alexmorgan')!.items;retainProfilePbiAuthorship(profile.userId,'b'.repeat(64));
 expect(retainedPublicProfile('alexmorgan')).toMatchObject({authorshipVerified:true,pbiReceiptHash:'b'.repeat(64),stats:profile.stats});
 expect(retainedPublicProfile('alexmorgan')!.items).toBe(items);expect(retainedPublicProfile('otherperson')).toBe(other);
});

it.each(['accept','receive','agent','agents','fraud','recover','proof'])('keeps the %s landing route distinct while preserving the same named profile under /u',username=>{
 expect(profilePageUsername('/'+username)).toBeNull();expect(profilePageUsername('/'+username+'/')).toBeNull();expect(profilePagePath(username)).toBe('/u/'+username+'/');expect(profilePageUsername('/u/'+username+'/')).toBe(username);
});
