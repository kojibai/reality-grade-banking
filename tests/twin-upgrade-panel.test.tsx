// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {expect,it,vi} from 'vitest';
import {TwinUpgradePanel} from '../src/features/messages/TwinUpgradePanel';
import type {OpenIdentity} from '../src/receiz/native-identity';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
it('opens only on request, keeps secure checkout in Bankeiz and confirms actual entitlement before enabling Twin',async()=>{
 const upgrade=vi.fn().mockResolvedValueOnce({accountUid:'owner',twinAccess:false,checkout:{sessionId:'cs_test_upgrade123',clientSecret:'cs_test_upgrade123_secret_fixture',interval:'year'}}).mockResolvedValueOnce({accountUid:'owner',twinAccess:false}).mockResolvedValueOnce({accountUid:'owner',twinAccess:true});
 const identity={upgradeTwin:upgrade} as unknown as OpenIdentity,onUpgraded=vi.fn(),host=document.createElement('div');document.body.append(host);const root=createRoot(host);
 const click=async(text:string)=>{const button=[...host.querySelectorAll('button')].find(node=>node.textContent===text)!;expect(button).toBeTruthy();await act(async()=>button.click());};
 try{
  await act(async()=>root.render(<TwinUpgradePanel identity={identity} onUpgraded={onUpgraded}/>));expect(upgrade).not.toHaveBeenCalled();expect(host.querySelector('iframe')).toBeNull();
  await click('Explore Business');expect(upgrade).not.toHaveBeenCalled();await click('Yearly');await click('Continue to secure payment');expect(upgrade).toHaveBeenCalledWith({action:'checkout',interval:'year'});
  const frame=host.querySelector('iframe')!;expect(frame.title).toBe('Secure account upgrade');expect(frame.getAttribute('src')).toContain('https://receiz.com/payments/embed/checkout#client_secret=');expect(frame.getAttribute('src')).not.toContain('amount_usd_cents');
  await click('Check upgrade status');expect(onUpgraded).not.toHaveBeenCalled();await click('Check upgrade status');expect(onUpgraded).toHaveBeenCalledOnce();expect(upgrade).toHaveBeenLastCalledWith({action:'status',sessionId:'cs_test_upgrade123'});
 }finally{await act(async()=>root.unmount());host.remove();}
});
it('resumes the same embedded checkout after unmounting and reopening the Twin view',async()=>{
 let finish!:(value:unknown)=>void;const upgrade=vi.fn(()=>new Promise(done=>{finish=done;}));
 const identity={upgradeTwin:upgrade} as unknown as OpenIdentity,host=document.createElement('div');document.body.append(host);let root=createRoot(host);
 const render=()=>root.render(<TwinUpgradePanel identity={identity} onUpgraded={()=>{}}/>);
 const click=async(text:string)=>{await act(async()=>[...host.querySelectorAll('button')].find(node=>node.textContent===text)!.click());};
 try{
  await act(async()=>render());await click('Explore Business');await click('Continue to secure payment');
  await act(async()=>root.unmount());
  finish({accountUid:'owner',twinAccess:false,checkout:{sessionId:'cs_test_retained123',clientSecret:'cs_test_retained123_secret_fixture',interval:'month'}});
  root=createRoot(host);await act(async()=>render());
  expect(host.querySelector('iframe')?.getAttribute('src')).toContain('session_id=cs_test_retained123');expect(upgrade).toHaveBeenCalledOnce();
 }finally{await act(async()=>root.unmount());host.remove();}
});
