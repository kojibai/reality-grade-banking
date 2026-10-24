// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {expect,it,vi} from 'vitest';
import {BusinessUpgradePanel} from '../src/features/messages/BusinessUpgradePanel';
import type {OpenIdentity} from '../src/receiz/native-identity';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
it('shows the charged interval and included credits before a deliberate checkout request',async()=>{
 const upgrade=vi.fn().mockResolvedValue({accountUid:'owner',twinAccess:false});
 const identity={upgradeTwin:upgrade,knownTwinAccess:()=>false} as unknown as OpenIdentity;
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
 try{
  await act(async()=>root.render(<BusinessUpgradePanel identity={identity} onOpenAssistant={()=>{}}/>));
  expect(host.textContent).toContain('$149/month');expect(host.textContent).toContain('7,500');expect(upgrade).not.toHaveBeenCalled();
  const yearly=[...host.querySelectorAll('button')].find(button=>button.textContent==='Yearly')!;
  await act(async()=>yearly.click());expect(host.textContent).toContain('$1,499/year');expect(host.textContent).toContain('Renews yearly');expect(upgrade).not.toHaveBeenCalled();
  await act(async()=>[...host.querySelectorAll('button')].find(button=>button.textContent==='Continue to secure payment')!.click());
  expect(upgrade).toHaveBeenCalledOnce();expect(upgrade).toHaveBeenCalledWith({action:'checkout',interval:'year'});
 }finally{await act(async()=>root.unmount());host.remove();}
});
it('uses confirmed existing access without initiating another checkout or account lookup',async()=>{
 const upgrade=vi.fn(),open=vi.fn(),identity={upgradeTwin:upgrade,knownTwinAccess:()=>true} as unknown as OpenIdentity;
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
 try{
  await act(async()=>root.render(<BusinessUpgradePanel identity={identity} onOpenAssistant={open}/>));
  expect(host.textContent).toContain('Business is active');expect(host.textContent).not.toContain('Continue to secure payment');
  await act(async()=>host.querySelector('button')!.click());expect(open).toHaveBeenCalledOnce();expect(upgrade).not.toHaveBeenCalled();
 }finally{await act(async()=>root.unmount());host.remove();}
});
it('retains a pending success without navigating a selected public page, then resumes on return',async()=>{
 let finish!:(value:{accountUid:string;twinAccess:boolean})=>void;
 const upgrade=vi.fn(()=>new Promise<{accountUid:string;twinAccess:boolean}>(resolve=>{finish=resolve;})),open=vi.fn();
 const identity={upgradeTwin:upgrade,knownTwinAccess:()=>false} as unknown as OpenIdentity;
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
 try{
  await act(async()=>root.render(<BusinessUpgradePanel identity={identity} onOpenAssistant={open} active/>));
  await act(async()=>[...host.querySelectorAll('button')].find(button=>button.textContent==='Continue to secure payment')!.click());
  await act(async()=>root.render(<BusinessUpgradePanel identity={identity} onOpenAssistant={open} active={false}/>));
  history.replaceState(null,'','/business/');
  await act(async()=>finish({accountUid:'owner',twinAccess:true}));
  expect(open).not.toHaveBeenCalled();expect(location.pathname).toBe('/business/');
  history.replaceState(null,'','/#account/business');
  await act(async()=>root.render(<BusinessUpgradePanel identity={identity} onOpenAssistant={open} active/>));
  expect(open).toHaveBeenCalledOnce();expect(upgrade).toHaveBeenCalledOnce();
 }finally{await act(async()=>root.unmount());host.remove();history.replaceState(null,'','/');}
});
