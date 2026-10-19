// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {expect,it,vi} from 'vitest';
import {LiveMarketTrade} from '../src/features/market/LiveMarketTrade';
import type {OpenIdentity} from '../src/receiz/native-identity';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
it('prepares only a read and submits only after explicit approval, then checks an unknown result without repeating it',async()=>{
 const review={digest:'digest',title:'Proof object',body:{side:'buy',amountUsd:'10.00'},observation:{preview:{shareQuantityMicro:'1250000',settlementUsdCents:'1000'}}};
 const api={status:async()=>null,prepare:vi.fn(async()=>review),execute:vi.fn(async()=>({status:'unknown',clientNonce:'nonce'})),resolve:vi.fn(async()=>({status:'unknown',clientNonce:'nonce'})),discard:vi.fn()};
 const identity={marketTrade:async()=>api} as unknown as OpenIdentity,host=document.createElement('div'),root=createRoot(host);const button=(text:string)=>[...host.querySelectorAll('button')].find(b=>b.textContent?.includes(text))!;
 try{await act(async()=>root.render(<LiveMarketTrade identity={identity} marketItemId="asset:one" side="buy" onRefresh={()=>{}}/>));
  const input=host.querySelector('input')!;await act(async()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(input,'10');input.dispatchEvent(new Event('input',{bubbles:true}));});
  await act(async()=>button('Review trade').click());expect(api.execute).not.toHaveBeenCalled();expect(host.textContent).toContain('live');expect(button('Confirm purchase').disabled).toBe(true);
  await act(async()=>host.querySelector<HTMLInputElement>('input[type=checkbox]')!.click());await act(async()=>button('Confirm purchase').click());expect(api.execute).toHaveBeenCalledOnce();
  await act(async()=>button('Check trade outcome').click());expect(api.resolve).toHaveBeenCalledExactlyOnceWith(true);expect(api.execute).toHaveBeenCalledOnce();
 }finally{act(()=>root.unmount());}
});
it('shows the exact saved Note stage that blocks a fresh Market trade',async()=>{
 const {atNoteStage}=await import('../src/receiz/note-stage'),api={status:async()=>null,prepare:async()=>atNoteStage('offline-note-checkpoint',async()=>{throw new DOMException('private','OperationError');})},host=document.createElement('div'),root=createRoot(host);
 try{await act(async()=>root.render(<LiveMarketTrade identity={{marketTrade:async()=>api} as unknown as OpenIdentity} marketItemId="asset:one" side="buy" onRefresh={()=>{}}/>));await act(async()=>{const input=host.querySelector('input')!;Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(input,'10');input.dispatchEvent(new Event('input',{bubbles:true}));});await act(async()=>[...host.querySelectorAll('button')].find(b=>b.textContent?.includes('Review trade'))!.click());expect(host.textContent).toContain('offline-note-checkpoint');expect(host.textContent).not.toContain('private');}finally{act(()=>root.unmount());}
});
