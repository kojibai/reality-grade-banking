// @vitest-environment happy-dom
import {act} from 'react';import {createRoot} from 'react-dom/client';import {expect,it,vi} from 'vitest';
import {chatPerson} from '../src/receiz/native-messaging';
import {publicAccountDisplayName} from '../src/receiz/account-name';
import {publicProfileArtwork} from '../src/receiz/profile-artwork';
import {ReplyIdentity} from '../src/features/messages/ReplyIdentity';
import {ProfileAvatar} from '../src/components/ProfileAvatar';
import {projectMessagingDisplay,readMessagingDisplay} from '../src/receiz/messaging-retention';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
const account={userId:'b44aab55-32db-4888-bce5-bc20d3b21841',username:'receiz_device',displayName:'Receiz ID',createdAt:'2026-02-27T03:00:17.651387Z'};
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
