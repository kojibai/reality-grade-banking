// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,expect,it,vi} from 'vitest';
import {RecipientInput} from '../src/features/account/RecipientInput';
import type {OpenIdentity} from '../src/receiz/native-identity';
import type {ChatConversation,ChatPerson} from '../src/receiz/native-messaging';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
afterEach(()=>vi.useRealTimers());
const peer:ChatPerson={kind:'user',userId:'22222222-2222-4222-8222-222222222222',username:'mira',displayName:'Mira West',avatarUrl:null};
function fixture(){
 const api={accountUid:'11111111-1111-4111-8111-111111111111',knownConversations:()=>[{members:[peer],lastMessageAt:'2026-10-19T12:00:00Z'}]as ChatConversation[],conversations:vi.fn(),search:vi.fn(async(_q:string,_signal?:AbortSignal)=>[peer])};
 const identity={messaging:vi.fn(async()=>api)}as unknown as OpenIdentity,onSelect=vi.fn(),onChange=vi.fn(),host=document.createElement('div'),root=createRoot(host);document.body.appendChild(host);
 const render=(value='',owner=identity)=>act(async()=>root.render(<RecipientInput identity={owner} value={value} onChange={onChange} onSelect={onSelect}/>));
 const focus=()=>act(async()=>host.querySelector('input')!.focus());
 return{api,identity,onSelect,onChange,host,render,focus,unmount(){act(()=>root.unmount());host.remove();}};
}
it('paints held contacts on focus without rereading inbox history or sending anything',async()=>{
 const f=fixture();try{await f.render();expect(f.identity.messaging).not.toHaveBeenCalled();await f.focus();expect(f.host.textContent).toContain('Recent contacts');expect(f.host.textContent).toContain('Mira West');expect(f.api.conversations).not.toHaveBeenCalled();expect(f.api.search).not.toHaveBeenCalled();await act(async()=>f.host.querySelector<HTMLElement>('[role=option]')!.click());expect(f.onSelect).toHaveBeenCalledWith({userId:peer.userId,username:'mira'});expect(f.host.querySelector('[role=listbox]')).toBeNull();}finally{f.unmount();}
});
it('debounces name search, cancels superseded queries and supports keyboard selection',async()=>{
 vi.useFakeTimers();const f=fixture();try{await f.render();await f.focus();await f.render('Mira West');expect(f.host.textContent).toContain('Mira West');expect(f.api.search).not.toHaveBeenCalled();await act(async()=>vi.advanceTimersByTimeAsync(300));expect(f.api.search.mock.calls[0]?.[0]).toBe('mira west');const signal=f.api.search.mock.calls[0]?.[1];await f.render('mir');expect(signal?.aborted).toBe(true);await act(async()=>vi.advanceTimersByTimeAsync(300));const input=f.host.querySelector('input')!;await act(async()=>input.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true})));await act(async()=>input.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true})));expect(f.onSelect).toHaveBeenCalledWith({userId:peer.userId,username:'mira'});}finally{f.unmount();}
});
it('keeps manual entry available when optional messaging access is unavailable',async()=>{
 const f=fixture(),identity={messaging:async()=>{throw Error('MESSAGING_CONSENT_REQUIRED');}}as unknown as OpenIdentity;try{await f.render('manual_user',identity);await f.focus();expect(f.host.querySelector<HTMLInputElement>('input')!.value).toBe('manual_user');expect(f.host.querySelector('[role=listbox]')).toBeNull();expect(f.host.querySelector('[role=alert]')).toBeNull();}finally{f.unmount();}
});
it('discards a delayed directory response after switching identities',async()=>{
 vi.useFakeTimers();const f=fixture();let finish!:(people:ChatPerson[])=>void;f.api.search.mockImplementation(()=>new Promise(resolve=>{finish=resolve;}));try{await f.render('old');await f.focus();await act(async()=>vi.advanceTimersByTimeAsync(300));const identity={messaging:async()=>({...f.api,knownConversations:()=>[],conversations:async()=>[]})}as unknown as OpenIdentity;await f.render('',identity);await act(async()=>finish([peer]));expect(f.host.textContent).not.toContain('Mira West');}finally{f.unmount();}
});
