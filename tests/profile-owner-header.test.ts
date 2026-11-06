// @vitest-environment happy-dom
import {afterEach,expect,it,vi} from 'vitest';
import * as actions from '../src/receiz/profile-actions';
import type {PublicProfileHeader} from '../src/receiz/public-profile-header';
import {readVerifiedOwnerProfileHeader} from '../src/receiz/profile-owner-header';
import type {OpenIdentity} from '../src/receiz/native-identity';
import {act,createElement} from 'react';
import {createRoot} from 'react-dom/client';
import {PublicProfilePortal} from '../src/features/account/PublicProfilePortal';
const uid='01234567-0123-4123-8123-0123456789ab';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
const header={schema:'bankeiz.public-profile.v1',userId:uid,username:'public_owner',displayName:'Held Owner',bio:'Already here.',location:null,websiteUrl:null,avatarUrl:'https://receiz.com/custom-avatar.webp',bannerUrl:'https://receiz.com/custom-banner.webp',socialLinks:[],links:[],authorshipVerified:true,pbiReceiptHash:'a'.repeat(64),createdAt:'2026-01-01T00:00:00Z',stats:{originals:null,views:null,plays:null,seconds:null,completion:null}} as PublicProfileHeader;
const publish=actions.publishProfileOwner as (uid:string|null,header?:PublicProfileHeader|null)=>void;
const held=()=>('readProfileOwnerHeader' in actions?(actions as unknown as {readProfileOwnerHeader:()=>PublicProfileHeader|null}).readProfileOwnerHeader():null);
afterEach(()=>{publish(null);vi.restoreAllMocks();});
it('makes the same-owner header available only while the owner is present',()=>{
 publish(uid,header);expect(actions.readProfileOwner()).toBe(uid);expect(held()).toBe(header);
 publish(null);expect(held()).toBeNull();
});
it('refuses a different-account header and clears the old owner overlay on switch',()=>{
 publish(uid,header);publish('another-account',header);expect(actions.readProfileOwner()).toBe('another-account');expect(held()).toBeNull();
 publish(uid,header);publish(uid);expect(held()).toBeNull();
});
it('notifies consumers when same-owner metadata changes without granting a signer',()=>{
 const changed=vi.fn(),remove=actions.subscribeProfileActions(changed);publish(uid,header);changed.mockClear();
 const next={...header,bannerUrl:'https://receiz.com/new-banner.webp'};publish(uid,next);expect(held()).toBe(next);expect(changed).toHaveBeenCalledTimes(1);remove();
});
const publicMetadata={userId:uid,username:'public_owner',displayName:'Held Owner',isPrivate:false,bio:'Already here.',avatarUrl:'https://receiz.com/custom-avatar.webp',bannerUrl:'https://receiz.com/custom-banner.webp',authorshipVerified:true,authorshipPbiReceiptHash:'a'.repeat(64),createdAt:'2026-01-01T00:00:00Z'};
function identity(profile:Record<string,unknown>=publicMetadata):OpenIdentity{
 const view={profile:{...profile}};Object.defineProperty(view,'originals',{enumerable:true,get(){throw Error('Originals must not be read');}});
 return {binding:{keyId:'identity-key',identityOwnerReceizId:'device-owner.receiz.id'},accountUsername:()=> 'public_owner',knownProfile:()=>{throw Error('Private owner projection must not be read');},
  localHistory:{schema:'receiz.sdk.identity_account_projection.v1',keyId:'identity-key',owner:{uid:'device-owner.receiz.id'},portableStateVerified:true,authority:'verified-identity-portable-state',completeAtSealedHead:false,
   verifiedState:{schema:'receiz.account.state.v3',account:{userId:uid},profileView:view}}} as unknown as OpenIdentity;
}
it('reuses verified public owner metadata without reading Originals, private profile APIs or Source',()=>{
 const fetch=vi.spyOn(globalThis,'fetch').mockRejectedValue(Error('No Source read'));
 const value=readVerifiedOwnerProfileHeader(identity(),uid);
 expect(value).toMatchObject({userId:uid,username:'public_owner',bannerUrl:'https://receiz.com/custom-banner.webp',avatarUrl:'https://receiz.com/custom-avatar.webp',authorshipVerified:true,pbiReceiptHash:'a'.repeat(64),bio:'Already here.'});
 expect(value?.stats.originals).toBeNull();expect(value).not.toHaveProperty('items');expect(fetch).not.toHaveBeenCalled();
});
it.each(['unverified','authority','schema','key','owner','state','account','handle','private','missing privacy','missing UID'])('refuses %s portable metadata',kind=>{
 const value=identity(),history=value.localHistory as unknown as Record<string,unknown>,state=history.verifiedState as Record<string,unknown>,profile=(state.profileView as {profile:Record<string,unknown>}).profile;
 if(kind==='unverified')history.portableStateVerified=false;if(kind==='authority')history.authority='identity-only';if(kind==='schema')history.schema='unknown';if(kind==='key')history.keyId='other-key';if(kind==='owner')history.owner={uid:'other-owner'};
 if(kind==='state')state.schema='unknown';if(kind==='account')state.account={userId:'other-account'};if(kind==='handle')value.accountUsername=()=> 'different_owner';if(kind==='private')profile.isPrivate=true;if(kind==='missing privacy')delete profile.isPrivate;if(kind==='missing UID')delete profile.userId;
 expect(readVerifiedOwnerProfileHeader(value,uid)).toBeNull();
});
it('uses a public direct header only when the richer header is absent and the same Account binds it',()=>{
 const value=identity();const state=value.localHistory.verifiedState as Record<string,unknown>;delete state.profileView;state.profile={...publicMetadata,bannerUrl:'https://receiz.com/direct-banner.webp'};
 expect(readVerifiedOwnerProfileHeader(value,uid)?.bannerUrl).toBe('https://receiz.com/direct-banner.webp');
 expect(readVerifiedOwnerProfileHeader(value,'other-account')).toBeNull();
});
it('never turns an invalid profile receipt or an Original receipt into profile PBI',()=>{
 const invalid=readVerifiedOwnerProfileHeader(identity({...publicMetadata,authorshipPbiReceiptHash:'invalid'}),uid);expect(invalid?.authorshipVerified).toBe(false);expect(invalid?.pbiReceiptHash).toBeNull();
 const value=identity({...publicMetadata,authorshipVerified:false,authorshipPbiReceiptHash:null});const state=value.localHistory.verifiedState as Record<string,unknown>;state.originals=[{hasPbiSignature:true,pbiReceiptHash:'b'.repeat(64)}];
 expect(readVerifiedOwnerProfileHeader(value,uid)?.authorshipVerified).toBe(false);
});
it('keeps private owner fields, analytics and collections out of the lifetime header',()=>{
 const value=identity({...publicMetadata,email:'private@example.test',revenueCents:90000}),state=value.localHistory.verifiedState as Record<string,unknown>;
 const view=state.profileView as Record<string,unknown>;view.viewer={canView:true,isOwner:true};view.stats={originals:611,revenueCents:90000};
 const result=readVerifiedOwnerProfileHeader(value,uid)!;expect(result.stats).toEqual({originals:null,views:null,plays:null,seconds:null,completion:null});
 expect(JSON.stringify(result)).not.toContain('private@example.test');expect(result).not.toHaveProperty('viewer');expect(result).not.toHaveProperty('originals');expect(result).not.toHaveProperty('revenueCents');
});
it('refuses an explicit private same-account copy even when a second carried copy is public',()=>{
 const value=identity({...publicMetadata,isPrivate:true}),state=value.localHistory.verifiedState as Record<string,unknown>;state.profile={...publicMetadata};
 expect(readVerifiedOwnerProfileHeader(value,uid)).toBeNull();
});
it('rejects a different profile UID and a missing active Account',()=>{
 expect(readVerifiedOwnerProfileHeader(identity({...publicMetadata,userId:'another-account'}),uid)).toBeNull();expect(readVerifiedOwnerProfileHeader(identity(),null)).toBeNull();
});
it('publishes the held header through the existing Portal and clears it when identity closes',async()=>{
 const host=document.createElement('div'),root=createRoot(host),value=identity(),fetch=vi.spyOn(globalThis,'fetch').mockRejectedValue(Error('No Source read'));document.body.append(host);
 try{
  await act(()=>root.render(createElement(PublicProfilePortal,{identity:value,userId:uid})));expect(held()?.bannerUrl).toBe('https://receiz.com/custom-banner.webp');
  await act(()=>root.render(createElement(PublicProfilePortal,{identity:null,userId:uid})));expect(actions.readProfileOwner()).toBeNull();expect(held()).toBeNull();expect(fetch).not.toHaveBeenCalled();
 }finally{await act(()=>root.unmount());host.remove();}
});
