// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,expect,it,vi} from 'vitest';
import {IdentityProfile} from '../src/features/account/IdentityProfile';
import type {OpenIdentity} from '../src/receiz/native-identity';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});
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
it.each(['info','reply','support','receiz_abcdefghijklmnopq','receiz_abcdefghijklmnopqr','bad name','owner@elsewhere.test'])('never advertises an infrastructure or incomplete receiving address from %s',async name=>{
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
