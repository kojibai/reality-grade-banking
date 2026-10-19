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
it('identifies the saved Note checkpoint that blocks Send without showing private error text',async()=>{
 const {WalletSendOperation}=await import('../src/features/account/WalletSendOperation');
 const {atNoteStage}=await import('../src/receiz/note-stage');
 const api={status:async()=>null,prepare:async()=>atNoteStage('offline-note-checkpoint',async()=>{throw new DOMException('private ciphertext detail','OperationError');})};
 const identity={walletSend:async()=>api} as unknown as OpenIdentity,host=document.createElement('div'),root=createRoot(host);
 try{await act(async()=>root.render(<WalletSendOperation identity={identity} input={()=>({recipient:'receiver',amountUsdCents:'100'})} inputKey="test" onRefresh={()=>{}}>Fields</WalletSendOperation>));
  await act(async()=>[...host.querySelectorAll('button')].find(button=>button.textContent?.includes('Review payment'))!.click());
  expect(host.textContent).toContain('offline-note-checkpoint');expect(host.textContent).toContain('Saved Offline Note custody');expect(host.textContent).not.toContain('private ciphertext detail');expect(host.textContent).not.toContain('receiving service');
 }finally{act(()=>root.unmount());}
});
it.each([{reserve:'1000',settlement:'0',source:'Reserve'},{reserve:'0',settlement:'1000',source:'Settlement'},{reserve:'250',settlement:'750',source:'Composite balance'}])('shows funding components only for a composite payment at review ($reserve/$settlement)',async({reserve,settlement,source})=>{
 const {WalletSendOperation}=await import('../src/features/account/WalletSendOperation');
 const review={digest:'review',recipientLabel:'@receiver',amountUsdCents:'1000',quote:{amountPhiMicro:'10000000',settledUsdCents:reserve,ecosystemUsdCents:settlement}},api={status:async()=>null,prepare:async()=>review,discard:()=>{}};
 const host=document.createElement('div'),root=createRoot(host);try{await act(async()=>root.render(<WalletSendOperation identity={{walletSend:async()=>api}as unknown as OpenIdentity} input={()=>({recipient:'receiver',amountUsdCents:'1000'})} inputKey="funding" onRefresh={()=>{}}>Fields</WalletSendOperation>));await act(async()=>[...host.querySelectorAll('button')].find(b=>b.textContent?.includes('Review payment'))!.click());
 const row=[...host.querySelectorAll('.detail-list > div')].find(row=>row.querySelector('span')?.textContent==='From');expect(row?.querySelector('strong')?.textContent).toBe(source);expect(host.textContent).toContain('$10.00');expect(host.textContent).not.toContain('From Reserve at review');expect(host.textContent).not.toContain('From Settlement at review');if(reserve==='250'&&settlement==='750'){expect(host.textContent).toContain('$2.50');expect(host.textContent).toContain('$7.50');}else{expect(host.textContent).not.toContain('Composite balance');}
 }finally{act(()=>root.unmount());}
});
