// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {expect,it,vi} from 'vitest';
import {WalletSendRecovery} from '../src/features/account/WalletSendOperation';
import type {OpenIdentity} from '../src/receiz/native-identity';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
it('ignores an old identity outcome after the recovery panel switches identities',async()=>{
 let finish!:(v:unknown)=>void;const refresh=vi.fn();
 const oldApi={status:async()=>({status:'unknown',clientNonce:'old-nonce'}),resolve:vi.fn(()=>new Promise(resolve=>{finish=resolve;}))};
 const newApi={status:async()=>({status:'unknown',clientNonce:'new-nonce'}),resolve:vi.fn(async()=>({status:'unknown',clientNonce:'new-nonce'}))};
 const oldId={walletSend:async()=>oldApi} as unknown as OpenIdentity,newId={walletSend:async()=>newApi} as unknown as OpenIdentity;
 const host=document.createElement('div'),root=createRoot(host);
 try{
  await act(async()=>root.render(<WalletSendRecovery identity={oldId} onRefresh={refresh}/>));
  await act(async()=>host.querySelector('button')!.click());expect(oldApi.resolve).toHaveBeenCalledWith(true);
  await act(async()=>root.render(<WalletSendRecovery identity={newId} onRefresh={refresh}/>));
  await act(async()=>finish({status:'recorded',clientNonce:'old-nonce',transferId:'old-transfer'}));
  expect(host.textContent).toContain('new-nonce');expect(host.textContent).not.toContain('old-nonce');expect(refresh).not.toHaveBeenCalled();
  await act(async()=>host.querySelector('button')!.click());expect(newApi.resolve).toHaveBeenCalledTimes(1);
 }finally{act(()=>root.unmount());}
});
