// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,expect,it,vi} from 'vitest';
import App from '../src/App';
const entry=vi.hoisted(()=>({account:vi.fn(()=>{throw Error('Normal account entry must not run before invitation verification.');}),read:vi.fn(),open:vi.fn()}));
vi.mock('../src/receiz/useNativeAccount',()=>({useNativeAccount:entry.account}));
vi.mock('../src/receiz/email-meeting-entry',()=>({readEmailMeetingEntry:entry.read,openEmailMeeting:entry.open,emailMeetingResumePath:()=>'/#account/messages'}));
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
afterEach(()=>{vi.restoreAllMocks();vi.resetAllMocks();history.replaceState(null,'','/');});
it('the exact email landing route mounts invitation recovery without normal account creation',async()=>{
 history.replaceState(null,'','/?emailMeeting=1');entry.read.mockResolvedValue({ok:true,pending:true,autoContinue:false});
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
 try{await act(async()=>root.render(<App/>));await vi.waitFor(()=>expect(host.textContent).toContain('Open the invitation link in your email to continue.'));expect(host.querySelector('button')).toBeNull();expect(entry.account).not.toHaveBeenCalled();expect(entry.open).not.toHaveBeenCalled();}finally{await act(async()=>root.unmount());host.remove();}
});
