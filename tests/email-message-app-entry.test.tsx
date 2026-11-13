// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,expect,it,vi} from 'vitest';
import App from '../src/App';
const entry=vi.hoisted(()=>({account:vi.fn(()=>{throw Error('Normal account entry must not run before email-message verification.');}),read:vi.fn(),open:vi.fn()}));
vi.mock('../src/receiz/useNativeAccount',()=>({useNativeAccount:entry.account}));
vi.mock('../src/receiz/email-message-entry',()=>({readEmailMessageEntry:entry.read,openEmailMessage:entry.open,emailMessageResumePath:()=>'/#account/messages'}));
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
afterEach(()=>{vi.restoreAllMocks();vi.resetAllMocks();history.replaceState(null,'','/');});
it('isolates the email-message landing route from normal account entry and exposes no extra button',async()=>{
 history.replaceState(null,'','/?emailMessage=1');entry.read.mockResolvedValue({ok:true,pending:true,autoContinue:false});
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
 try{let error:unknown;try{await act(async()=>root.render(<App/>));}catch(cause){error=cause;}
  expect(error).toBeUndefined();await vi.waitFor(()=>expect(host.textContent).toContain('Open the message link in your email to continue.'));expect(host.querySelector('button')).toBeNull();expect(entry.account).not.toHaveBeenCalled();expect(entry.open).not.toHaveBeenCalled();
 }finally{await act(async()=>root.unmount());host.remove();}
});
