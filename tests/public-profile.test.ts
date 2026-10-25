import {describe,it,expect} from 'vitest';
import {parsePublicProfile,profilePagePath,profilePageUsername,publicProfileMovement} from '../src/receiz/public-profile';

import {profileFixture} from './fixtures/public-profile';

describe('public profiles',()=>{
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

it.each(['agent','agents','fraud','recover','proof'])('keeps the %s landing route distinct while preserving the same named profile under /u',username=>{
 expect(profilePageUsername('/'+username)).toBeNull();expect(profilePageUsername('/'+username+'/')).toBeNull();expect(profilePagePath(username)).toBe('/u/'+username+'/');expect(profilePageUsername('/u/'+username+'/')).toBe(username);
});
