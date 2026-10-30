// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {expect,it,vi} from 'vitest';
import {MessagesPanel} from '../src/features/messages/MessagesPanel';
import type {OpenIdentity} from '../src/receiz/native-identity';
const p=vi.hoisted(()=>({code:vi.fn()}));
vi.mock('../src/features/messages/organizer/OrganizerPanel',()=>{p.code();return{OrganizerPanel:({entry}:{entry:{view:string}})=><p data-organizer-view>{entry.view}</p>};});
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
it('warms Contacts/Calendar code without waiting for messaging transport and opens the selected view on the same click',async()=>{
 const messaging=vi.fn(()=>new Promise<never>(()=>{})),organizer=vi.fn(()=>new Promise<never>(()=>{}));
 const identity={binding:{identityOwnerReceizId:'owner'},knownTwinAccess:()=>false,messaging,organizer} as unknown as OpenIdentity;
 const host=document.createElement('div'),root=createRoot(host);document.body.append(host);
 try{
  await act(async()=>root.render(<MessagesPanel identity={identity} active onClose={()=>{}} onOpen={()=>{}} onPreparePayment={()=>{}}/>));
  await act(async()=>{await vi.waitFor(()=>expect(p.code).toHaveBeenCalledOnce());});
  expect(messaging).toHaveBeenCalledOnce();expect(organizer).not.toHaveBeenCalled();
  const calendar=host.querySelector<HTMLButtonElement>('[aria-label="Calendar"]');expect(calendar).not.toBeNull();
  act(()=>calendar!.click());expect(host.querySelector('[data-organizer-view]')?.textContent).toBe('calendar');
  expect(organizer).not.toHaveBeenCalled();
 }finally{act(()=>root.unmount());host.remove();}
});
