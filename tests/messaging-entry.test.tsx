// @vitest-environment happy-dom
import {afterEach,expect,it,vi} from 'vitest';
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {ConsoleShell} from '../src/components/ConsoleShell';
import {parseRoute,routeHash} from '../src/core/routes';
vi.mock('../src/components/KaiKlok',()=>({KaiKlok:()=>null}));
(globalThis as {IS_REACT_ACT_ENVIRONMENT?:boolean}).IS_REACT_ACT_ENVIRONMENT=true;
afterEach(()=>{document.body.innerHTML='';});
it('opens the one messaging entry from the account header without changing the bottom navigation',async()=>{
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host),onMessages=vi.fn();await act(async()=>root.render(<ConsoleShell panel="account" onNavigate={()=>{}} onDeposit={()=>{}} onProfile={()=>{}} onMessages={onMessages}><p>Account</p></ConsoleShell>));
 const trigger=host.querySelector<HTMLButtonElement>('[aria-label="Open your agent and messages"]');expect(trigger).not.toBeNull();await act(async()=>trigger!.click());expect(onMessages).toHaveBeenCalledOnce();expect(host.querySelector('nav')?.textContent).not.toContain('Messages');await act(async()=>root.unmount());
});
it('restores the messaging sheet route with the existing browser back contract',()=>{const action={kind:'messages' as const};expect(routeHash('ledger',action)).toBe('#ledger/messages');expect(parseRoute('#ledger/messages')).toEqual({panel:'ledger',sheet:action});});
