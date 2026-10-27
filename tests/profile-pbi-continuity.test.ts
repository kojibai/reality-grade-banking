import {expect,it} from 'vitest';import {retainPublicProfile,retainProfilePbiAuthorship,forgetPublicProfile} from '../src/receiz/public-profile';import type {PublicProfile} from '../src/receiz/public-profile';
const profile={schema:'bankeiz.public-profile.v1',userId:'pbi-owner',username:'pbi_owner',displayName:'Owner',authorshipVerified:false,pbiReceiptHash:null,items:[],stats:{originals:0,views:null,plays:null,seconds:null,completion:null}} as unknown as PublicProfile;
it('keeps the confirmed blue check when signing precedes the public read or a stale unsigned read arrives',()=>{
 retainProfilePbiAuthorship(profile.userId,'a'.repeat(64));
 try{expect(retainPublicProfile(profile).authorshipVerified).toBe(true);expect(retainPublicProfile(profile).pbiReceiptHash).toBe('a'.repeat(64));
 expect(retainPublicProfile({...profile,userId:'a-different-account'}).authorshipVerified).toBe(false);
 }finally{forgetPublicProfile(profile.username);}
});
