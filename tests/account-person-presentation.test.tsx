// @vitest-environment happy-dom
import {act} from 'react';import {createRoot} from 'react-dom/client';import {expect,it,vi} from 'vitest';
import {chatPerson} from '../src/receiz/native-messaging';
import {profileUsernameLabel,publicAccountDisplayName} from '../src/receiz/account-name';
import {publicProfileArtwork} from '../src/receiz/profile-artwork';
import {ReplyIdentity} from '../src/features/messages/ReplyIdentity';
import {ProfileAvatar} from '../src/components/ProfileAvatar';
import {AccountProfileLink} from '../src/components/AccountProfileLink';
import {ProfileIdentity} from '../src/public-explorer/ProfileIdentity';
import {parsePublicProfile} from '../src/receiz/public-profile';
import {profileFixture} from './fixtures/public-profile';
import {projectMessagingDisplay,readMessagingDisplay} from '../src/receiz/messaging-retention';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
const account={userId:'b44aab55-32db-4888-bce5-bc20d3b21841',username:'receiz_device',displayName:'Receiz ID',createdAt:'2026-02-27T03:00:17.651387Z'};
it('keeps the complete handle in real profile labels and links without changing their canonical source',async()=>{
 const username='receiz_chosen_handle',profile={...parsePublicProfile(profileFixture(),'alexmorgan'),username},before=JSON.stringify(profile),host=document.createElement('div'),root=createRoot(host);
 expect(profileUsernameLabel(username)).toBe(username);expect(profileUsernameLabel(null)).toBe('');expect(profileUsernameLabel(undefined)).toBe('');
 try{await act(()=>root.render(<><AccountProfileLink username={username}>@{username}</AccountProfileLink><ProfileIdentity profile={profile}/></>));expect(host.querySelector('a')?.textContent).toBe('@receiz_chosen_handle');expect(host.querySelector('a')?.getAttribute('href')).toBe('/receiz_chosen_handle/');expect(host.querySelector('.profile-identity-handle')?.textContent).toBe('@receiz_chosen_handle');expect(host.querySelector('.profile-identity-handle')?.getAttribute('aria-label')).toBe('View @receiz_chosen_handle’s Receiz ID');expect(JSON.stringify(profile)).toBe(before);}finally{act(()=>root.unmount());}
});
it('retains an explicitly chosen full username through people projection, display retention and human replies',async()=>{
 const source={...account,username:'receiz_chosen_handle',displayName:'Old creation pulse',displayNameSource:'username',kind:'user',avatarUrl:null},before=JSON.stringify(source),person=chatPerson(source)!;
 expect(publicAccountDisplayName(source)).toBe('receiz_chosen_handle');expect(person.displayName).toBe('receiz_chosen_handle');
 const conversation={id:'a44aab55-32db-4888-bce5-bc20d3b21841',kind:'dm' as const,title:'Conversation',members:[person],aiAgents:[],defaultAiId:null,unreadCount:0,previewMessage:null,createdAt:account.createdAt,updatedAt:account.createdAt,lastMessageAt:null},retained=readMessagingDisplay(projectMessagingDisplay({accountUid:account.userId,inbox:[conversation],pages:[]}),account.userId)!.inbox[0].members[0];
 expect(retained.username).toBe('receiz_chosen_handle');expect(retained.displayName).toBe('receiz_chosen_handle');
 const host=document.createElement('div'),root=createRoot(host);try{await act(()=>root.render(<ReplyIdentity human name="Historical sender name" person={retained}/>));expect(host.textContent).toBe('receiz_chosen_handle');expect(host.querySelector('a')?.getAttribute('href')).toBe('/receiz_chosen_handle/');await act(()=>root.render(<ReplyIdentity name="Mira’s Twin" person={retained}/>));expect(host.textContent).toBe('Mira’s Twin');expect(JSON.stringify(source)).toBe(before);}finally{act(()=>root.unmount());}
});
it('preserves explicit custom names and the original creation-pulse resolver beneath the full-handle adapter',()=>{
 const source={...account,username:'receiz_chosen_handle',createdAt:'2026-02-25T06:44:59.650624Z',creationKaiMicroPulse:'14000000000000'};
 expect(publicAccountDisplayName({...source,displayName:'receiz_My Chosen Name',displayNameSource:'custom'})).toBe('receiz_My Chosen Name');
 expect(publicAccountDisplayName({...source,displayName:'Old name',displayNameSource:'creation-pulse'})).toBe('10,824,603');
 expect(publicAccountDisplayName({...source,username:'',displayName:'Receiz ID',displayNameSource:'username'})).toBe('10,824,603');
});
it('uses an explicit display name, then the chosen username, then the original creation pulse across retained people',()=>{
 const person=(fields:Record<string,unknown>)=>chatPerson({...account,kind:'user',avatarUrl:null,...fields})!;
 expect(person({username:'my_handle',displayName:'Old pulse',displayNameSource:'username'}).displayName).toBe('my_handle');
 expect(person({username:'my_handle',displayName:'Mira',displayNameSource:'custom'}).displayName).toBe('Mira');
 expect(person({displayName:'Receiz ID',displayNameSource:'creation-pulse'}).displayName).toBe(publicAccountDisplayName(account));
});
it('carries original creation metadata through a chat projection and paints its exact public Identity Seal locally',async()=>{
 const fetch=vi.spyOn(globalThis,'fetch'),person=chatPerson({...account,kind:'user',avatarUrl:null})!;
 expect(person.displayName).toBe(publicAccountDisplayName(account));expect(person).toHaveProperty('createdAt',account.createdAt);
 const host=document.createElement('div'),root=createRoot(host);
 try{await act(()=>root.render(<ProfileAvatar account={person} name={person.displayName!}/>));expect(host.querySelector('img')?.getAttribute('src')).toBe(publicProfileArtwork(account).avatarUrl);expect(host.querySelector('span>span')?.textContent).not.toBe('1');expect(fetch).not.toHaveBeenCalled();}
 finally{act(()=>root.unmount());fetch.mockRestore();}
});
it('retains small creation coordinates instead of duplicating generated artwork in stored conversations',()=>{
 const person=chatPerson({...account,kind:'user',avatarUrl:null})!;
 const conversation={id:'a44aab55-32db-4888-bce5-bc20d3b21841',kind:'dm' as const,title:'Conversation',members:[person],aiAgents:[],defaultAiId:null,unreadCount:0,previewMessage:null,createdAt:account.createdAt,updatedAt:account.createdAt,lastMessageAt:null};
 const held=projectMessagingDisplay({accountUid:account.userId,inbox:[conversation],pages:[]}),read=readMessagingDisplay(held,account.userId)!;
 expect(read.inbox[0].members[0]).toHaveProperty('createdAt',account.createdAt);expect(JSON.stringify(held)).not.toContain('data:image');
});
it('keeps uploaded portraits and chosen names while a portrait failure reveals the same public seal',async()=>{
 const person=chatPerson({...account,displayName:'Mira Chen',kind:'user',avatarUrl:'https://receiz.com/photo.png'})!;expect(person.displayName).toBe('Mira Chen');
 const host=document.createElement('div'),root=createRoot(host);try{await act(()=>root.render(<ProfileAvatar src={person.avatarUrl} account={person} name={person.displayName!}/>));expect(host.querySelector('img')?.getAttribute('src')).toBe(person.avatarUrl);await act(()=>host.querySelector('img')!.dispatchEvent(new Event('error')));expect(host.querySelector('img')?.getAttribute('src')).toBe(publicProfileArtwork(account).avatarUrl);}finally{act(()=>root.unmount());}
});
it('preserves the public signing coordinates that select the existing signed Identity Seal artwork',async()=>{
 const signed={...account,authorshipVerified:true,authorshipPbiReceiptHash:'a'.repeat(64),authorshipPbiSignedAt:'2026-10-01T10:00:00Z',authorshipPbiSignedKaiMicroPulse:'14400000000000'},person=chatPerson({...signed,kind:'user',avatarUrl:null})!,host=document.createElement('div'),root=createRoot(host);
 try{await act(()=>root.render(<ProfileAvatar account={person} name={person.displayName!}/>));expect(host.querySelector('img')?.getAttribute('src')===publicProfileArtwork(signed).avatarUrl).toBe(true);}finally{act(()=>root.unmount());}
});

it('uses the current chosen name on human replies without rewriting historical message names or Twin labels',async()=>{
 const person=chatPerson({...account,username:'chosen_handle',displayNameSource:'username',kind:'user',avatarUrl:null})!,host=document.createElement('div'),root=createRoot(host);
 try{await act(()=>root.render(<ReplyIdentity human name="Receiz ID" person={person}/>));expect(host.textContent).toBe('chosen_handle');await act(()=>root.render(<ReplyIdentity name="Mira’s Twin" person={person}/>));expect(host.textContent).toBe('Mira’s Twin');}finally{act(()=>root.unmount());}
});
