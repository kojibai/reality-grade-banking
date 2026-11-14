// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,expect,it,vi} from 'vitest';
import {IdentityProfile} from '../src/features/account/IdentityProfile';
import type {OpenIdentity} from '../src/receiz/native-identity';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
afterEach(async()=>{const {forgetPublicProfile}=await import('../src/receiz/public-profile');await act(()=>{forgetPublicProfile('abcdefghijklmnopqr');forgetPublicProfile('receiz_abcdefghijklmnopq');});vi.restoreAllMocks();vi.unstubAllGlobals();});
function fixture(name:string|null='confirmed_owner'){
 let currentName=name;const prepare=vi.fn(async()=>{currentName='prepared_owner';return 'untrusted_operation_return';}),profile=vi.fn(()=>{throw Error('Opening the email row must not read a profile');});
 const identity={username:'signed_device_name',accountUsername:()=> 'unconfirmed_fallback',confirmedAccountUsername:()=>currentName,binding:{identityOwnerReceizId:'receiz_device_aaaaaaaaaaaaaaaaaa'},needsPhrase:false,prepareReceivingUsername:prepare,profile}as unknown as OpenIdentity;
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
 const render=(value=identity)=>act(()=>root.render(<IdentityProfile identity={value} onForget={async()=>{}} onRefresh={()=>{}} active={false}/>));
 const row=()=>host.querySelector<HTMLDetailsElement>('details.account-email');
 const click=async(label:string)=>{const button=[...host.querySelectorAll('button')].find(node=>node.getAttribute('aria-label')===label||node.textContent===label);expect(button,'button '+label).toBeTruthy();await act(()=>button!.click());};
 return{host,identity,prepare,profile,render,row,click,rename(name:string|null){currentName=name;},close(){act(()=>root.unmount());host.remove();}};
}
it('shows the exact held current account email in a collapsed row without account or profile requests',async()=>{
 const f=fixture('abcdefghijklmnopqr'),copy=vi.fn(async()=>{});vi.stubGlobal('navigator',{clipboard:{writeText:copy}});
 try{await f.render();expect(f.row(),'Your email row').not.toBeNull();expect(f.row()?.open).toBe(false);expect(f.row()?.querySelector('summary')?.textContent).toContain('Your email');expect(f.row()?.querySelector('code')?.textContent).toBe('abcdefghijklmnopqr@receiz.com');expect(f.row()?.textContent).toContain('Messages');expect(f.row()?.querySelector('a[href="/email/"]')).not.toBeNull();expect(f.prepare).not.toHaveBeenCalled();expect(f.profile).not.toHaveBeenCalled();await f.click('Copy email address');expect(copy).toHaveBeenCalledExactlyOnceWith('abcdefghijklmnopqr@receiz.com');expect(f.row()?.querySelector('[aria-label="Email address copied"]')).not.toBeNull();}finally{f.close();}
});
it.each([undefined,()=>null])('does not turn device names or unconfirmed presentation into an email (%s)',async getter=>{
 const f=fixture(null),identity={...f.identity,confirmedAccountUsername:getter}as OpenIdentity;
 try{await f.render(identity);expect(f.row()).not.toBeNull();expect(f.row()?.querySelector('code')).toBeNull();expect(f.row()?.textContent).not.toContain('signed_device_name@');expect(f.row()?.textContent).not.toContain('unconfirmed_fallback@');expect(f.row()?.textContent).not.toContain('receiz_device_');if(f.row())await act(()=>{f.row()!.open=true;f.row()!.dispatchEvent(new Event('toggle'));});expect(f.prepare).not.toHaveBeenCalled();expect(f.profile).not.toHaveBeenCalled();}finally{f.close();}
});
it('prepares a missing name only on a deliberate action and uses the confirmed getter rather than the operation return',async()=>{
 const f=fixture(null);try{await f.render();expect(f.prepare).not.toHaveBeenCalled();await f.click('Show my email');expect(f.prepare).toHaveBeenCalledTimes(1);expect(f.row()?.querySelector('code')?.textContent).toBe('prepared_owner@receiz.com');expect(f.row()?.textContent).not.toContain('untrusted_operation_return');}finally{f.close();}
});
it('updates to the accepted renamed account address through the existing profile event and copies that exact successor',async()=>{
 const f=fixture(),copy=vi.fn(async()=>{});vi.stubGlobal('navigator',{clipboard:{writeText:copy}});
 try{await f.render();f.rename('chosen_successor');await act(()=>dispatchEvent(new Event('bankeiz:profile-updated')));expect(f.row()?.querySelector('code')?.textContent).toBe('chosen_successor@receiz.com');expect(f.row()?.textContent).not.toContain('confirmed_owner@');await f.click('Copy email address');expect(copy).toHaveBeenCalledExactlyOnceWith('chosen_successor@receiz.com');}finally{f.close();}
});
it.each(['info','reply','support','receiz_abcdefghijklmnopq','bad name','owner@elsewhere.test'])('never advertises an infrastructure or incomplete receiving address from %s',async name=>{
 const f=fixture(name);try{await f.render();expect(f.row()).not.toBeNull();expect(f.row()?.querySelector('code')).toBeNull();expect(f.row()?.querySelector('[aria-label="Copy email address"]')).toBeNull();expect(f.prepare).not.toHaveBeenCalled();}finally{f.close();}
});
it('a clipboard refusal offers manual copying without claiming success',async()=>{
 const f=fixture();vi.stubGlobal('navigator',{clipboard:{writeText:vi.fn(async()=>{throw Error('denied');})}});
 try{await f.render();await f.click('Copy email address');expect(f.row()?.querySelector('[aria-label="Email address copied"]')).toBeNull();expect(f.row()?.querySelector('[role="status"]')?.textContent).toContain('copy');expect(f.row()?.querySelector('code')?.textContent).toBe('confirmed_owner@receiz.com');}finally{f.close();}
});
it('a late preparation cannot publish the previous identity email after an account switch',async()=>{
 const f=fixture(null);let finish!:()=>void;f.prepare.mockImplementation(()=>new Promise<string>(resolve=>{finish=()=>{f.rename('previous_owner');resolve('previous_owner');};}));
 try{await f.render();await f.click('Show my email');await f.render({...f.identity,confirmedAccountUsername:()=> 'next_owner'}as OpenIdentity);await act(()=>finish());expect(f.row()?.querySelector('code')?.textContent).toBe('next_owner@receiz.com');expect(f.row()?.textContent).not.toContain('previous_owner@');}finally{f.close();}
});
it('reuses a complete receiving name held for the same confirmed Native account without opening I/O',async()=>{
 const legacy='receiz_abcdefghijklmnopq',full='abcdefghijklmnopqr',f=fixture(legacy),read=vi.fn(async()=>Response.json({schema:'bankeiz.public-profile.v1',userId:'native-account',username:full,displayName:'Owner',items:[],stats:{originals:0,views:null,plays:null,seconds:null,completion:null}}));vi.stubGlobal('fetch',read);const {fetchPublicProfile}=await import('../src/receiz/public-profile');await fetchPublicProfile(full);read.mockClear();
 const identity={...f.identity,walletReceivingAddress:()=> 'native-account',knownProfile:()=>({userId:'native-account',username:legacy,receivingUsername:full,displayName:'Owner',avatarUrl:null})}as OpenIdentity;
 try{await f.render(identity);expect(f.row()?.querySelector('code')?.textContent).toBe('abcdefghijklmnopqr@receiz.com');expect(f.prepare).not.toHaveBeenCalled();expect(read).not.toHaveBeenCalled();}finally{f.close();}
});
it('the deliberate email action resolves a legacy confirmed locator through the existing same-UID profile header',async()=>{
 const legacy='receiz_abcdefghijklmnopq',f=fixture(legacy),read=vi.fn(async(_path:string,_options?:RequestInit)=>Response.json({schema:'bankeiz.public-profile.v1',userId:'native-account',username:legacy,receivingUsername:'abcdefghijklmnopqr',resolvedReceivingUsername:'abcdefghijklmnopqr'}));vi.stubGlobal('fetch',read);f.prepare.mockImplementation(async()=>legacy);
 const identity={...f.identity,walletReceivingAddress:()=> 'native-account'}as OpenIdentity;
 try{await f.render(identity);expect(read).not.toHaveBeenCalled();expect(f.row()?.querySelector('code')).toBeNull();await f.click('Show my email');expect(read).toHaveBeenCalledTimes(2);expect(read.mock.calls[0][0]).toBe('/api/bank/public-profile/'+legacy+'?view=head');expect(read.mock.calls[1][0]).toBe('/api/bank/public-profile/abcdefghijklmnopqr?view=email');expect(f.row()?.querySelector('code')?.textContent).toBe('abcdefghijklmnopqr@receiz.com');}finally{f.close();}
});
it.each([{userId:'foreign-account',receivingUsername:'abcdefghijklmnopqr'},{userId:'native-account'},{userId:'native-account',receivingUsername:'abcdefghijklmnopq'}])('does not invent an address from foreign, ambiguous or unretained legacy metadata (%j)',async metadata=>{
 const legacy='receiz_abcdefghijklmnopq',f=fixture(legacy);vi.stubGlobal('fetch',vi.fn(async()=>Response.json({schema:'bankeiz.public-profile.v1',username:legacy,...metadata})));f.prepare.mockImplementation(async()=>legacy);
 try{await f.render({...f.identity,walletReceivingAddress:()=> 'native-account'}as OpenIdentity);await f.click('Show my email');expect(f.row()?.querySelector('code')).toBeNull();expect(f.row()?.querySelector('[role="status"]')).not.toBeNull();}finally{f.close();}
});

it('refuses mail when the shortened profile is this account but the canonical full18 belongs to another Native UID',async()=>{
 const legacy='receiz_abcdefghijklmnopq',full='abcdefghijklmnopqr',f=fixture(legacy);f.prepare.mockImplementation(async()=>legacy);
 const read=vi.fn(async(path:string)=>Response.json(path.includes('/'+full+'?')?{schema:'bankeiz.public-profile.v1',userId:'different-native-account',username:full}:{schema:'bankeiz.public-profile.v1',userId:'native-account',username:legacy,receivingUsername:full}));vi.stubGlobal('fetch',read);
 try{await f.render({...f.identity,walletReceivingAddress:()=> 'native-account'}as OpenIdentity);expect(read).not.toHaveBeenCalled();await f.click('Show my email');expect(read).toHaveBeenCalledTimes(2);expect(f.row()?.querySelector('code')).toBeNull();expect(f.row()?.querySelector('[role="status"]')).not.toBeNull();}finally{f.close();}
});
it('does not show a device-derived full name without the already-held canonical full18 owner selection',async()=>{
 const legacy='receiz_abcdefghijklmnopq',f=fixture(legacy),read=vi.fn();vi.stubGlobal('fetch',read);
 try{await f.render({...f.identity,walletReceivingAddress:()=> 'native-account',knownProfile:()=>({userId:'native-account',username:legacy,receivingUsername:'abcdefghijklmnopqr',displayName:'Owner',avatarUrl:null})}as OpenIdentity);expect(f.row()?.querySelector('code')).toBeNull();expect(read).not.toHaveBeenCalled();expect(f.prepare).not.toHaveBeenCalled();}finally{f.close();}
});
it('conflicting complete receiving names remain unresolved instead of choosing a missing final character',async()=>{
 const {accountEmailReceivingName}=await import('../src/receiz/account-email'),legacy='receiz_abcdefghijklmnopq';
 expect(accountEmailReceivingName(legacy,'native-account',[{userId:'native-account',username:legacy,receivingUsername:'abcdefghijklmnopqr'},{userId:'native-account',username:legacy,receivingUsername:'abcdefghijklmnopqs'}])).toBeNull();
});
it('a canonical lookup arriving after a rename cannot replace the accepted chosen address',async()=>{
 const legacy='receiz_abcdefghijklmnopq',full='abcdefghijklmnopqr',f=fixture(legacy);f.prepare.mockImplementation(async()=>legacy);let finish!:(response:Response)=>void;
 const read=vi.fn(async(path:string)=>path.includes('/'+full+'?')?new Promise<Response>(resolve=>{finish=resolve;}):Response.json({schema:'bankeiz.public-profile.v1',userId:'native-account',username:legacy,receivingUsername:full}));vi.stubGlobal('fetch',read);
 try{await f.render({...f.identity,walletReceivingAddress:()=> 'native-account'}as OpenIdentity);await f.click('Show my email');await vi.waitFor(()=>expect(read).toHaveBeenCalledTimes(2));await act(()=>{f.rename('accepted_successor');dispatchEvent(new Event('bankeiz:profile-updated'));});await act(()=>finish(Response.json({schema:'bankeiz.public-profile.v1',userId:'native-account',username:legacy,receivingUsername:full,resolvedReceivingUsername:full})));expect(f.row()?.querySelector('code')?.textContent).toBe('accepted_successor@receiz.com');expect(f.row()?.textContent).not.toContain(full+'@');}finally{f.close();}
});
