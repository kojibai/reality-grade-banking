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
it('defaults a sale to dollars and allows an explicit six-decimal share quantity instead',async()=>{
 const api={status:async()=>null,prepare:vi.fn(async()=>{throw Error('quote unavailable');}),discard:vi.fn()},host=document.createElement('div'),root=createRoot(host),identity={marketTrade:async()=>api} as unknown as OpenIdentity;
 const change=async(value:string)=>act(async()=>{const input=host.querySelector<HTMLInputElement>('input[inputmode="decimal"]')!;Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(input,value);input.dispatchEvent(new Event('input',{bubbles:true}));});
 const review=async()=>act(async()=>[...host.querySelectorAll<HTMLButtonElement>('button')].find(button=>button.textContent==='Review trade')!.click());
 try{await act(async()=>root.render(<LiveMarketTrade identity={identity} marketItemId="asset:one" side="sell" onRefresh={()=>{}}/>));expect(host.textContent).toContain('Dollar amount to sell');await change('10.25');await review();expect(api.prepare).toHaveBeenLastCalledWith({marketItemId:'asset:one',side:'sell',amountUsdCents:'1025'});
  const units=host.querySelector<HTMLSelectElement>('select[aria-label="Sell amount in"]')!;await act(async()=>{units.value='shares';units.dispatchEvent(new Event('change',{bubbles:true}));});await change('1.250001');await review();expect(api.prepare).toHaveBeenLastCalledWith({marketItemId:'asset:one',side:'sell',shareQuantityMicro:'1250001'});
 }finally{act(()=>root.unmount());}
});
it('shows only a bounded upstream Market code and HTTP status when quote lookup fails',async()=>{
 const api={status:async()=>null,prepare:async()=>{throw Object.assign(Error('private account payload'),{status:503,payload:{error:'market_position_lookup_failed',token:'secret-token'}});}},host=document.createElement('div'),root=createRoot(host);
 try{await act(async()=>root.render(<LiveMarketTrade identity={{marketTrade:async()=>api} as unknown as OpenIdentity} marketItemId="asset:one" side="sell" onRefresh={()=>{}}/>));await act(async()=>{const input=host.querySelector('input')!;Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(input,'10');input.dispatchEvent(new Event('input',{bubbles:true}));});await act(async()=>[...host.querySelectorAll<HTMLButtonElement>('button')].find(button=>button.textContent==='Review trade')!.click());expect(host.textContent).toContain('market_position_lookup_failed');expect(host.textContent).toContain('HTTP 503');expect(host.textContent).not.toContain('private account payload');expect(host.textContent).not.toContain('secret-token');expect(host.textContent).not.toContain('Checking Market');}finally{act(()=>root.unmount());}
});
it('shows a closed refusal reason and its saved diagnostic instead of discarding the service response',async()=>{
 const nonce='10000000-0000-4000-8000-000000000002';
 const review={digest:'digest',title:'An asset',body:{side:'buy',amountUsd:'10.00',clientNonce:nonce},observation:{preview:{shareQuantityMicro:'1250000',settlementUsdCents:'1000'}}};
 const api={status:async()=>null,prepare:async()=>review,execute:async()=>({status:'not-sent',clientNonce:nonce,reason:'market_trade_rejected',failure:{code:'market_quote_exposure_cap',status:409}}),discard:vi.fn()};
 const host=document.createElement('div'),root=createRoot(host),button=(name:string)=>[...host.querySelectorAll('button')].find(button=>button.textContent===name)!;
 try{
  await act(async()=>root.render(<LiveMarketTrade identity={{marketTrade:async()=>api} as unknown as OpenIdentity} marketItemId="asset:one" side="buy" onRefresh={()=>{}}/>));
  await act(async()=>{const input=host.querySelector('input')!;Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(input,'10');input.dispatchEvent(new Event('input',{bubbles:true}));});
  await act(async()=>button('Review trade').click());expect(host.textContent).not.toContain('Receiz');
  await act(async()=>host.querySelector<HTMLInputElement>('input[type=checkbox]')!.click());await act(async()=>button('Confirm purchase').click());
  expect(host.textContent).toContain('current purchase capacity');expect(host.textContent).toContain('market_quote_exposure_cap');expect(host.textContent).toContain('HTTP 409');expect(host.textContent).toContain('No money moved');
 }finally{act(()=>root.unmount());}
});
it('presents a trade-limit refusal as an asset-specific trading condition rather than a service failure',async()=>{
 const api={status:async()=>null,prepare:vi.fn(async()=>{throw Object.assign(Error('service response'),{status:409,payload:{error:'market_quote_trade_limit'}});})};
 const host=document.createElement('div'),root=createRoot(host);
 try{
  await act(async()=>root.render(<LiveMarketTrade identity={{marketTrade:async()=>api} as unknown as OpenIdentity} marketItemId="asset:one" side="buy" onRefresh={()=>{}}/>));
  await act(async()=>{const input=host.querySelector('input')!;Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(input,'1000000');input.dispatchEvent(new Event('input',{bubbles:true}));});
  await act(async()=>[...host.querySelectorAll('button')].find(button=>button.textContent==='Review trade')!.click());
  expect(host.textContent).toContain('Amount exceeds trade limit');expect(host.textContent).toContain('one-third');expect(host.textContent).toContain('this asset');expect(host.textContent).toContain('No trade was submitted');
  expect(host.querySelector('.error-message')).toBeNull();expect(host.textContent).not.toContain('Verified transaction terms are unavailable');expect(api.prepare).toHaveBeenCalledOnce();
 }finally{act(()=>root.unmount());}
});
it('clears a failed quote immediately and retries only after another explicit review click',async()=>{
 const review={digest:'sale',title:'An original',body:{side:'sell',amountUsd:'10.00'},observation:{preview:{shareQuantityMicro:'1000000',settlementUsdCents:'1000'}}};
 const api={status:async()=>null,prepare:vi.fn().mockRejectedValueOnce(Object.assign(Error('market_position_lookup_failed'),{status:503,payload:{error:'market_position_lookup_failed'}})).mockResolvedValueOnce(review),execute:vi.fn(),discard:vi.fn()},host=document.createElement('div'),root=createRoot(host);
 const button=(name:string)=>[...host.querySelectorAll<HTMLButtonElement>('button')].find(item=>item.textContent===name)!;
 try{await act(async()=>root.render(<LiveMarketTrade identity={{marketTrade:async()=>api} as unknown as OpenIdentity} marketItemId="asset:one" side="sell" onRefresh={()=>{}}/>));expect(api.prepare).not.toHaveBeenCalled();
  await act(async()=>{const input=host.querySelector<HTMLInputElement>('input')!;Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(input,'10');input.dispatchEvent(new Event('input',{bubbles:true}));});await act(async()=>button('Review trade').click());expect(api.prepare).toHaveBeenCalledOnce();expect(button('Review trade').disabled).toBe(false);expect(host.querySelector('input')?.value).toBe('10');expect(host.textContent).toContain('Market stage: quote');
  await act(async()=>button('Review trade').click());expect(api.prepare).toHaveBeenCalledTimes(2);expect(host.textContent).toContain('Review sale');expect(host.textContent).not.toContain('HTTP 503');expect(button('Confirm sale').disabled).toBe(true);expect(api.execute).not.toHaveBeenCalled();
 }finally{act(()=>root.unmount());}
});
it('lets an unconfirmed trade be closed without submitting another and shows a completed race correctly',async()=>{
 const nonce='10000000-0000-4000-8000-000000000002',api={status:async()=>({status:'unknown',clientNonce:nonce}),stop:vi.fn(async()=>({status:'not-sent',clientNonce:nonce,reason:'market_trade_canceled'})),resolve:vi.fn(),execute:vi.fn()},host=document.createElement('div'),root=createRoot(host);
 try{await act(async()=>root.render(<LiveMarketTrade identity={{marketTrade:async()=>api} as unknown as OpenIdentity} marketItemId="asset:one" side="buy" onRefresh={()=>{}}/>));const cancel=[...host.querySelectorAll('button')].find(b=>b.textContent==='Cancel unconfirmed trade');expect(cancel).toBeDefined();await act(async()=>cancel!.click());expect(api.stop).toHaveBeenCalledWith(true,nonce);expect(host.textContent).toContain('Trade canceled.');expect(host.textContent).toContain('Review another trade');expect(api.execute).not.toHaveBeenCalled();}finally{act(()=>root.unmount());}
});
