// @vitest-environment happy-dom
import {act,useEffect,useMemo,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,expect,it,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import type {OpenIdentity} from '../src/receiz/native-identity';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
afterEach(()=>vi.unstubAllGlobals());
const seal='data:image/svg+xml;base64,'+btoa('<svg xmlns="http://www.w3.org/2000/svg">'+' '.repeat(4000)+'</svg>');
async function helpers(){const mod=await import('../src/receiz/profile-avatar').catch(()=>null);expect(typeof mod?.identityProfileAvatar).toBe('function');return mod!;}
it('uses the admitted profile image or carried seal artwork immediately without opening the backup or making a profile request',async()=>{
 const {identityProfileAvatar}=await helpers(),fetch=vi.fn(),backup=vi.fn();vi.stubGlobal('fetch',fetch);
 const identity={backup,localHistory:{portableStateVerified:true,verifiedState:{profile:{avatarUrl:'https://receiz.com/photo.png'},profileView:{profile:{avatarUrl:seal}}}}} as unknown as OpenIdentity;
 expect(identityProfileAvatar(identity)).toBe('https://receiz.com/photo.png');
 (identity.localHistory.verifiedState as {profile:{avatarUrl:string|null}}).profile.avatarUrl=null;
 expect(identityProfileAvatar(identity)).toBe(seal);expect(fetch).not.toHaveBeenCalled();expect(backup).not.toHaveBeenCalled();
 identity.localHistory.portableStateVerified=false;expect(identityProfileAvatar(identity)).toBeNull();
});
it('preserves complete carried seal images and rejects non-image or credential-bearing sources',async()=>{
 const {profileAvatarUrl}=await helpers();expect(profileAvatarUrl(seal)).toBe(seal);expect(profileAvatarUrl('/api/receiz/image/avatar.png')).toBe('https://receiz.com/api/receiz/image/avatar.png');
 const {chatPerson}=await import('../src/receiz/native-messaging');expect(chatPerson({kind:'user',userId:'peer',avatarUrl:seal})?.avatarUrl).toBe(seal);
 for(const source of ['javascript:alert(1)','data:text/html,private','https://user:secret@receiz.com/avatar.png','//other.test/image.png'])expect(profileAvatarUrl(source)).toBeNull();
});
it('keeps a readable fallback after an image fails and clears the failed source when the person changes',async()=>{
 const mod=await import('../src/components/ProfileAvatar').catch(()=>({ProfileAvatar:null}));expect(mod.ProfileAvatar).not.toBeNull();const ProfileAvatar=mod.ProfileAvatar!;
 const host=document.createElement('div'),root=createRoot(host);
 try{
  act(()=>root.render(<ProfileAvatar src="https://receiz.com/first.png" name="Mira Chen"/>));
  expect(host.querySelector('img')?.getAttribute('referrerpolicy')).toBe('no-referrer');
  act(()=>host.querySelector('img')!.dispatchEvent(new Event('error')));expect(host.querySelector('img')).toBeNull();expect(host.textContent).toBe('MC');
  act(()=>root.render(<ProfileAvatar src={seal} name="Noah"/>));expect(host.querySelector('img')?.getAttribute('src')).toBe(seal);
 }finally{act(()=>root.unmount());}
});

it('respects a confirmed removed portrait instead of reviving older messaging or sealed artwork',async()=>{
 const {identityProfileAvatar}=await helpers();const identity={knownProfile:()=>({avatarUrl:null}),localHistory:{portableStateVerified:true,verifiedState:{profile:{avatarUrl:'https://receiz.com/old.png'}}}} as unknown as OpenIdentity;expect(identityProfileAvatar(identity)).toBeNull();
});

async function freshSignedAccount(){
 const {createReceizIdIdentity,projectReceizIdentityAccount}=await import('@receiz/sdk'),{initializeFreshBankAccount}=await import('../src/receiz/new-account-genesis');
 const created=await createReceizIdIdentity({createdAt:'2026-02-25T06:44:59.650624Z',username:'receiz_fresh_owner'}),key=await initializeFreshBankAccount(created.keyFile),projection=await projectReceizIdentityAccount(key);
 const forbidden=()=>{throw Error('avatar presentation must not open or read an identity');};
 const identity={username:created.username,accountUsername:()=>created.username,binding:{keyId:key.keyId,identityOwnerReceizId:created.localUid},localHistory:projection,knownProfile:()=>null,knownMessagingDisplay:()=>null,walletReceivingAddress:()=>created.localUid,backup:forbidden,readWallet:forbidden,prepareAccountView:forbidden,profile:forbidden,messaging:forbidden} as unknown as OpenIdentity;
 return {identity,created,key,projection};
}
it('shows the canonical public seal from a genuine fresh signed account genesis before any profile or conversation exists',async()=>{
 const {identity,created,projection}=await freshSignedAccount(),{identityProfileAvatar}=await helpers(),before=JSON.stringify(projection),avatar=identityProfileAvatar(identity);
 expect(avatar).not.toBeNull();expect(avatar).toMatch(/^data:image\/svg\+xml/);
 const {pathToFileURL}=await import('node:url'),canonical=await import(pathToFileURL(process.cwd()+'/public/native/identity-artwork.v129.mjs').href),expected=canonical.artwork({userId:created.localUid,createdAt:'2026-02-25T06:44:59.650624Z',creationKaiMicroPulse:'10824603119470',receizId:'receiz_fresh_owner',pbiReceiptHash:null});
 expect(decodeURIComponent(avatar!.slice(avatar!.indexOf(',')+1))).toBe(expected.avatarSvg);
 const {ConsoleShell}=await import('../src/components/ConsoleShell'),{IdentityProfile}=await import('../src/features/account/IdentityProfile'),host=document.createElement('div'),root=createRoot(host);
 try{
  act(()=>root.render(<ConsoleShell identityImage={avatar} active={false} panel="account" onNavigate={()=>{}} onDeposit={()=>{}} onProfile={()=>{}}><IdentityProfile identity={identity} active={false} onForget={async()=>{}} onRefresh={()=>{}}/></ConsoleShell>));
  expect(host.querySelector('[aria-label="Account settings"] img')?.getAttribute('src')).toBe(avatar);expect(host.querySelector('[aria-label="Account settings"]')?.textContent).toBe('');
  expect(host.querySelector('.profile-identity img')?.getAttribute('src')).toBe(avatar);
  act(()=>host.querySelector<HTMLButtonElement>('.quick-profile-toggle')!.click());expect(host.querySelector('.quick-profile-photo img')?.getAttribute('src')).toBe(avatar);
 }finally{act(()=>root.unmount());}
 expect(JSON.stringify(projection)).toBe(before);
});
it('keeps the admitted Identity Seal in the popover when the same key connects to its account’s different receiving identifier',async()=>{
 const {identity,created,key,projection}=await freshSignedAccount(),{identityProfileAvatar}=await helpers(),before=JSON.stringify(projection),avatar=identityProfileAvatar(identity),fetch=vi.fn();vi.stubGlobal('fetch',fetch);
 let receivingId=created.localUid;
 const connected={...identity,walletReceivingAddress:()=>receivingId},host=document.createElement('div'),root=createRoot(host),{IdentityProfile}=await import('../src/features/account/IdentityProfile');
 try{
  act(()=>root.render(<IdentityProfile identity={connected} active={false} onForget={async()=>{}} onRefresh={()=>{}}/>));expect(host.querySelector('.profile-identity img')?.getAttribute('src')===avatar).toBe(true);
  receivingId='00000000-0000-4000-8000-000000000099';
  act(()=>root.render(<IdentityProfile identity={connected} active={false} onForget={async()=>{}} onRefresh={()=>{}}/>));expect(host.querySelector('.profile-identity img')?.getAttribute('src')===avatar).toBe(true);
  const {projectReceizIdentityAccount}=await import('@receiz/sdk'),reopened={...connected,localHistory:await projectReceizIdentityAccount(key)};
  expect(identityProfileAvatar(reopened)===avatar).toBe(true);expect(fetch).not.toHaveBeenCalled();expect(JSON.stringify(projection)).toBe(before);
 }finally{act(()=>root.unmount());}
});
it('never treats a recovered account, export, device timestamp or mismatched genesis as account birth',async()=>{
 const {identity,projection}=await freshSignedAccount(),{identityProfileAvatar}=await helpers();
 for(const alter of [
  (value:Record<string,unknown>)=>{delete value.bankGenesis;},
  (value:Record<string,unknown>)=>{value.schema='receiz.device.identity.v1';delete value.bankGenesis;},
  (value:Record<string,unknown>)=>{(value.bankGenesis as Record<string,unknown>).keyId='another-key';},
  (value:Record<string,unknown>)=>{(value.bankGenesis as Record<string,unknown>).userId='another-user';},
  (value:Record<string,unknown>)=>{(value.bankGenesis as Record<string,unknown>).applicationId='another-app';},
  (value:Record<string,unknown>)=>{(value.bankGenesis as Record<string,unknown>).createdAt='2026-02-26T00:00:00Z';},
  (value:Record<string,unknown>)=>{(value.account as Record<string,unknown>).userId='a-recovered-account';},
 ]){const state=structuredClone(projection.verifiedState) as Record<string,unknown>;alter(state);expect(identityProfileAvatar({...identity,localHistory:{...projection,verifiedState:state}})).toBeNull();}
 expect(identityProfileAvatar({...identity,localHistory:{...projection,portableStateVerified:false}})).toBeNull();
 expect(identityProfileAvatar({...identity,localHistory:{...projection,authority:'identity-only'}})).toBeNull();
 expect(identityProfileAvatar({...identity,binding:{...identity.binding,keyId:'another-key'}})).toBeNull();
 expect(identityProfileAvatar({...identity,binding:{...identity.binding,identityOwnerReceizId:'another-owner'}})).toBeNull();
});
it('uses the already-confirmed same-account username for the fresh seal when the signed bootstrap has an older alias',async()=>{
 const {identity,created,projection}=await freshSignedAccount(),{identityProfileAvatar}=await helpers(),before=JSON.stringify(projection);
 const {pathToFileURL}=await import('node:url'),canonical=await import(pathToFileURL(process.cwd()+'/public/native/identity-artwork.v129.mjs').href),expected=canonical.artwork({userId:created.localUid,createdAt:'2026-02-25T06:44:59.650624Z',creationKaiMicroPulse:'10824603119470',receizId:'fresh_current_name',pbiReceiptHash:null});
 const avatar=identityProfileAvatar({...identity,accountUsername:()=> 'fresh_current_name'});
 expect(avatar).not.toBeNull();expect(decodeURIComponent(avatar!.slice(avatar!.indexOf(',')+1))).toBe(expected.avatarSvg);
 expect(JSON.stringify(projection)).toBe(before);
});

it('keeps a genuine fresh public seal in the existing appearance hint across a public-document reload',async()=>{
 const {identity,projection}=await freshSignedAccount(),{identityProfileAvatar,identityProfileName}=await helpers(),avatar=identityProfileAvatar(identity),name=identityProfileName(identity),before=JSON.stringify(projection),key='bankeiz.account-appearance.v1',previous=localStorage.getItem(key),fetch=vi.fn();vi.stubGlobal('fetch',fetch);
 expect(avatar).not.toBeNull();expect(avatar!.length).toBeGreaterThan(8192);
 const first=await import('../src/receiz/account-appearance'),host=document.createElement('div'),root=createRoot(host);
 try{
  first.publishAccountAppearance({avatarUrl:avatar,name});expect(first.readAccountAppearance()?.avatarUrl===avatar).toBe(true);
  vi.resetModules();const restored=await import('../src/receiz/account-appearance');expect(restored.readAccountAppearance()?.avatarUrl===avatar).toBe(true);expect(restored.readAccountAppearance()?.name).toBe(name);
  const saved=JSON.parse(localStorage.getItem(key)!);expect(Object.keys(saved).sort()).toEqual(['avatarUrl','name']);
  const {Discover}=await import('../src/public-discover/Discover');act(()=>root.render(<Discover seed={[]} active={false}/>));expect(host.querySelector('.discover-account img')?.getAttribute('src')===avatar).toBe(true);
  expect(fetch).not.toHaveBeenCalled();expect(JSON.stringify(projection)).toBe(before);
 }finally{act(()=>root.unmount());if(previous===null)localStorage.removeItem(key);else localStorage.setItem(key,previous);vi.resetModules();}
});
it('restores the same owner’s public hint after an upload or explicit removal without reviving an older portrait',async()=>{
 const {identity,created}=await freshSignedAccount(),{identityProfileAvatar,identityProfileName}=await helpers(),key='bankeiz.account-appearance.v1',previous=localStorage.getItem(key),photo='https://receiz.com/current-owner-photo.png';
 let current:{userId:string;username:string;displayName:string;avatarUrl:string|null;createdAt?:string}={userId:created.localUid,username:created.username,displayName:'Current owner',avatarUrl:photo};
 const owner={...identity,knownProfile:()=>current},name=identityProfileName(owner),fetch=vi.fn();vi.stubGlobal('fetch',fetch);
 const reload=async()=>{const appearance=await import('../src/receiz/account-appearance');appearance.publishAccountAppearance({avatarUrl:identityProfileAvatar(owner),name});vi.resetModules();return(await import('../src/receiz/account-appearance')).readAccountAppearance();};
 try{
  expect((await reload())?.avatarUrl).toBe(photo);
  current={...current,avatarUrl:null};expect(identityProfileAvatar(owner)).toBeNull();expect(await reload()).toEqual({avatarUrl:null,name});
  current={...current,createdAt:'2026-02-25T06:44:59.650624Z'};const seal=identityProfileAvatar(owner);expect(seal).not.toBeNull();expect((await reload())?.avatarUrl===seal).toBe(true);expect(fetch).not.toHaveBeenCalled();
 }finally{if(previous===null)localStorage.removeItem(key);else localStorage.setItem(key,previous);vi.resetModules();}
});
it('keeps the existing public appearance hint bounded and clears an older portrait for an oversized replacement',async()=>{
 const key='bankeiz.account-appearance.v1',previous=localStorage.getItem(key),appearance=await import('../src/receiz/account-appearance');
 try{appearance.publishAccountAppearance({name:'Owner',avatarUrl:'https://receiz.com/owner.png'});appearance.publishAccountAppearance({name:'Owner',avatarUrl:'data:image/svg+xml;base64,'+'a'.repeat(256*1024)});expect(localStorage.getItem(key)).toBeNull();vi.resetModules();expect((await import('../src/receiz/account-appearance')).readAccountAppearance()).toBeNull();}finally{if(previous===null)localStorage.removeItem(key);else localStorage.setItem(key,previous);vi.resetModules();}
});


it('reuses the current same-account public portrait after reopening instead of older carried artwork, without a read',async()=>{
 const{identityProfileAvatar}=await helpers(),{parsePublicProfile,retainPublicProfile,forgetPublicProfilesForAccount}=await import('../src/receiz/public-profile'),{profileFixture}=await import('./fixtures/public-profile');
 const original=profileFixture();original.profile.profile.avatarUrl='https://receiz.com/new-photo.webp';const fresh=retainPublicProfile(parsePublicProfile(original,'alexmorgan')),read=vi.fn();vi.stubGlobal('fetch',read);
 const reopened={knownProfile:()=>null,accountUsername:()=>fresh.username,knownWallet:()=>null,localHistory:{portableStateVerified:true,verifiedState:{account:{userId:fresh.userId},profile:{userId:fresh.userId,username:fresh.username,avatarUrl:'https://receiz.com/old-photo.webp'}}}} as unknown as OpenIdentity;
 try{expect(identityProfileAvatar(reopened)).toBe(fresh.avatarUrl);expect(read).not.toHaveBeenCalled();reopened.knownProfile=()=>({userId:fresh.userId,username:fresh.username,displayName:'Alex',avatarUrl:null});expect(identityProfileAvatar(reopened)).toBeNull();}finally{forgetPublicProfilesForAccount(fresh.userId);}
});
it('never uses a current public portrait for another account sharing an older carried handle',async()=>{
 const{identityProfileAvatar}=await helpers(),{parsePublicProfile,retainPublicProfile,forgetPublicProfilesForAccount}=await import('../src/receiz/public-profile'),{profileFixture}=await import('./fixtures/public-profile');const input=profileFixture();input.profile.profile.userId='other-account';retainPublicProfile(parsePublicProfile(input,'alexmorgan'));
 const reopened={knownProfile:()=>null,accountUsername:()=> 'alexmorgan',localHistory:{portableStateVerified:true,verifiedState:{account:{userId:'account-1'},profile:{avatarUrl:'https://receiz.com/own-photo.webp'}}}} as unknown as OpenIdentity;
 try{expect(identityProfileAvatar(reopened)).toBe('https://receiz.com/own-photo.webp');}finally{forgetPublicProfilesForAccount('other-account');}
});


it('retains the last observed photo across a cold module reopen only for the same admitted identity',async()=>{
 const storageKey='bankeiz.account-appearance.v1',prior=localStorage.getItem(storageKey),keyId='d'.repeat(64),source={account:{userId:'account-1'},profile:{avatarUrl:'https://receiz.com/old-photo.webp'}},owner={binding:{keyId},knownProfile:()=>null,knownWallet:()=>null,localHistory:{portableStateVerified:true,verifiedState:source}} as unknown as OpenIdentity;
 try{
  const first=await import('../src/receiz/account-appearance');first.publishAccountAppearance({name:'Alex',avatarUrl:'https://receiz.com/current-photo.webp',accountUid:'account-1',identityKeyId:keyId} as never);vi.resetModules();let avatar=await helpers();expect(avatar.identityProfileAvatar(owner)).toBe('https://receiz.com/current-photo.webp');
  const appearance=await import('../src/receiz/account-appearance');appearance.publishAccountAppearance({name:'Alex',avatarUrl:null,accountUid:'account-1',identityKeyId:keyId} as never);vi.resetModules();avatar=await helpers();expect(avatar.identityProfileAvatar(owner)).toBeNull();
  expect(avatar.identityProfileAvatar({...owner,binding:{keyId:'e'.repeat(64)},localHistory:{portableStateVerified:true,verifiedState:{...source,account:{userId:'other-account'}}}} as OpenIdentity)).toBe('https://receiz.com/old-photo.webp');
 }finally{if(prior===null)localStorage.removeItem(storageKey);else localStorage.setItem(storageKey,prior);vi.resetModules();}
});

it('updates the retained BankApp header and cold appearance after observing the same owner’s newer portrait',async()=>{
 const storageKey='bankeiz.account-appearance.v1',prior=localStorage.getItem(storageKey);localStorage.removeItem(storageKey);vi.resetModules();
 const avatar=await helpers(),appearance=await import('../src/receiz/account-appearance'),profiles=await import('../src/receiz/public-profile'),{profileFixture}=await import('./fixtures/public-profile');
 const input=profileFixture();input.profile.profile.avatarUrl='https://receiz.com/current-photo.webp';const profile=profiles.parsePublicProfile(input,'alexmorgan');
 const identity={binding:{keyId:'d'.repeat(64)},knownProfile:()=>null,knownWallet:()=>null,localHistory:{portableStateVerified:true,verifiedState:{account:{userId:profile.userId},profile:{userId:profile.userId,username:profile.username,displayName:'Alex',avatarUrl:'https://receiz.com/old-photo.webp'}}}} as unknown as OpenIdentity;
 // Execute App's actual subscription, memo and appearance effect. Merely
 // calling the helper again would hide a stale memo in the retained BankApp.
 const source=readFileSync(process.cwd()+'/src/App.tsx','utf8'),start=source.indexOf('  const [profileRevision,setProfileRevision]'),end=source.indexOf('  const profileAction=',start);
 expect(start).toBeGreaterThan(0);expect(end).toBeGreaterThan(start);
 const code=ts.transpileModule(source.slice(start,end)+'\nreturn identityImage;',{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
 const hooks=new Function('account','useState','useEffect','useMemo','identityProfileAvatar','identityProfileName','publishAccountAppearance',code);
 function Header({active}:{active:boolean}){const src=hooks({identity,opening:false,busy:false},useState,useEffect,useMemo,avatar.identityProfileAvatar,avatar.identityProfileName,appearance.publishAccountAppearance);return <div hidden={!active}><img src={src}/></div>;}
 const host=document.createElement('div'),root=createRoot(host);
 try{
  await act(async()=>root.render(<Header active/>));expect(host.querySelector('img')?.getAttribute('src')).toBe('https://receiz.com/old-photo.webp');
  await act(async()=>root.render(<Header active={false}/>));await act(async()=>{profiles.retainPublicProfile(profile);});
  await act(async()=>root.render(<Header active/>));expect(host.querySelector('img')?.getAttribute('src')).toBe(profile.avatarUrl);
  expect(JSON.parse(localStorage.getItem(storageKey)!).avatarUrl).toBe(profile.avatarUrl);
 }finally{act(()=>root.unmount());profiles.forgetPublicProfilesForAccount(profile.userId);if(prior===null)localStorage.removeItem(storageKey);else localStorage.setItem(storageKey,prior);vi.resetModules();}
});

it('realizes an observed default from its public coordinates and only announces portrait changes',async()=>{
 const avatar=await helpers(),profiles=await import('../src/receiz/public-profile'),{profileFixture}=await import('./fixtures/public-profile'),{publicProfileAvatar}=await import('../src/receiz/profile-artwork');
 const input=profileFixture(),profile=profiles.parsePublicProfile({...input,profile:{...input.profile,profile:{...input.profile.profile,createdAt:'2026-02-25T06:44:59.650624Z'}}},'alexmorgan'),updated=vi.fn();addEventListener('bankeiz:profile-updated',updated);
 const identity={knownProfile:()=>null,knownWallet:()=>null,localHistory:{portableStateVerified:true,verifiedState:{account:{userId:profile.userId},profile:{avatarUrl:'https://receiz.com/old-photo.webp'}}}} as unknown as OpenIdentity;
 try{
  profiles.retainPublicProfile(profile);expect(updated).toHaveBeenCalledTimes(1);
  profiles.retainPublicProfile({...profile,stats:{...profile.stats,views:999}});expect(updated).toHaveBeenCalledTimes(1);
  profiles.retainPublicProfile({...profile,avatarUrl:null});
  const expected=publicProfileAvatar({...profile,avatarUrl:null,authorshipPbiReceiptHash:profile.pbiReceiptHash});expect(expected).not.toBeNull();expect(avatar.identityProfileAvatar(identity)).toBe(expected);expect(updated).toHaveBeenCalledTimes(2);
  profiles.retainPublicProfile({...profile,avatarUrl:null});expect(updated).toHaveBeenCalledTimes(2);
 }finally{removeEventListener('bankeiz:profile-updated',updated);profiles.forgetPublicProfilesForAccount(profile.userId);}
});
