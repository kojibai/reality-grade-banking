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
it('replaces an insufficient-funds result with the existing secure checkout and completes the already approved Send',async()=>{
 const {WalletSendOperation}=await import('../src/features/account/WalletSendOperation'),review={digest:'review',recipientLabel:'@receiver',amountUsdCents:'1000',quote:{amountPhiMicro:'10000000',settledUsdCents:'0',ecosystemUsdCents:'1000'}},checkout={sessionId:'cs_test_send_ui12345',clientSecret:'synthetic-only',amountUsdCents:'1000'};
 const api={status:async()=>null,prepare:vi.fn(async()=>review),execute:vi.fn(async()=>({status:'funding',clientNonce:'nonce',stage:'ready',recipientLabel:'@receiver',amountUsdCents:'1000',checkout})),resumeFunding:vi.fn(async()=>({status:'recorded',clientNonce:'nonce',transferId:'transfer'})),discard:vi.fn()},refresh=vi.fn(),host=document.createElement('div'),root=createRoot(host);
 try{await act(async()=>root.render(<WalletSendOperation identity={{walletSend:async()=>api}as unknown as OpenIdentity} input={()=>({recipient:'receiver',amountUsdCents:'1000'})} inputKey="card-payment" onRefresh={refresh}>Fields</WalletSendOperation>));
 await act(async()=>[...host.querySelectorAll('button')].find(b=>b.textContent?.includes('Review payment'))!.click());await act(async()=>host.querySelector<HTMLInputElement>('input[type=checkbox]')!.click());await act(async()=>[...host.querySelectorAll('button')].find(b=>b.textContent?.includes('Send payment'))!.click());
 expect(host.textContent).toContain('Pay $10.00');expect(host.textContent).toContain('@receiver');expect(host.textContent).not.toContain('Payment not sent');expect(host.querySelector('iframe[title="Secure payment"]')).not.toBeNull();
 await act(async()=>[...host.querySelectorAll('button')].find(b=>b.textContent?.includes('Check payment status'))!.click());expect(host.textContent).toContain('Payment sent.');expect(api.execute).toHaveBeenCalledTimes(1);expect(api.prepare).toHaveBeenCalledTimes(1);expect(refresh).toHaveBeenCalledTimes(1);
 }finally{act(()=>root.unmount());}
});
it('returns from card checkout to the prepared Send with one visible back action and no repeated send',async()=>{
 const {WalletSendOperation}=await import('../src/features/account/WalletSendOperation');
 const review={digest:'review',recipientLabel:'@receiver',amountUsdCents:'1000',quote:{amountPhiMicro:'10000000',settledUsdCents:'0',ecosystemUsdCents:'1000'}},checkout={sessionId:'cs_test_back_send12345',clientSecret:'synthetic-only',amountUsdCents:'1000'};
 let pending:unknown=null;
 const api={status:vi.fn(async()=>pending),prepare:vi.fn(async()=>review),execute:vi.fn(async()=>pending={status:'funding',clientNonce:'nonce',stage:'ready',recipientLabel:'@receiver',amountUsdCents:'1000',checkout}),cancelFunding:vi.fn(async()=>{pending={status:'not-sent',clientNonce:'nonce',reason:'card_cancelled'};}),resumeFunding:vi.fn(),discard:vi.fn()};
 const host=document.createElement('div'),root=createRoot(host),refresh=vi.fn();
 try{
  await act(async()=>root.render(<WalletSendOperation identity={{walletSend:async()=>api}as unknown as OpenIdentity} input={()=>({recipient:'receiver',amountUsdCents:'1000'})} inputKey="back-to-send" onRefresh={refresh}><label>Recipient<input aria-label="Recipient" value="receiver" readOnly/></label><label>Amount<input aria-label="Amount" value="10.00" readOnly/></label></WalletSendOperation>));
  await act(async()=>[...host.querySelectorAll('button')].find(b=>b.textContent?.includes('Review payment'))!.click());await act(async()=>host.querySelector<HTMLInputElement>('input[type=checkbox]')!.click());await act(async()=>[...host.querySelectorAll('button')].find(b=>b.textContent?.includes('Send payment'))!.click());
  const back=[...host.querySelectorAll<HTMLButtonElement>('button')].find(b=>b.textContent==='Back to send');expect(back).toBeDefined();
  const checkoutFrame=host.querySelector('iframe')!;expect(Boolean(back!.compareDocumentPosition(checkoutFrame)&Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);
  expect(host.textContent).not.toContain('Cancel payment');await act(async()=>back!.click());
  expect(api.cancelFunding).toHaveBeenCalledOnce();expect(host.querySelector('iframe')).toBeNull();expect(host.querySelector<HTMLInputElement>('input[aria-label="Recipient"]')?.value).toBe('receiver');expect(host.querySelector<HTMLInputElement>('input[aria-label="Amount"]')?.value).toBe('10.00');expect(host.textContent).not.toContain('Payment not sent.');expect(host.textContent).toContain('Review payment');
  expect(api.execute).toHaveBeenCalledOnce();expect(api.resumeFunding).not.toHaveBeenCalled();expect(refresh).not.toHaveBeenCalled();
 }finally{act(()=>root.unmount());}
});

it.each([
 {card:'700',shortfall:'700',headline:'Pay $7.00.',balance:'$3.00',remainder:null},
 {card:'50',shortfall:'25',headline:'Pay $0.50.',balance:'$9.75',remainder:'$0.25 stays in your balance'},
])('shows the card amount separately from the full Send ($card card)',async({card,shortfall,headline,balance,remainder})=>{
 const {WalletSendOperation}=await import('../src/features/account/WalletSendOperation');
 const pending={status:'funding',clientNonce:'nonce',stage:'ready',recipientLabel:'@receiver',amountUsdCents:'1000',cardAmountUsdCents:card,shortfallUsdCents:shortfall,checkout:{sessionId:'cs_test_delta_ui1234',clientSecret:'synthetic-only',amountUsdCents:card}};
 const api={status:async()=>pending,resumeFunding:async()=>pending,discard:vi.fn()},host=document.createElement('div'),root=createRoot(host);
 try{await act(async()=>root.render(<WalletSendOperation identity={{walletSend:async()=>api}as unknown as OpenIdentity} input={()=>({recipient:'receiver',amountUsdCents:'1000'})} inputKey="delta-card" onRefresh={()=>{}}>Fields</WalletSendOperation>));
  expect(host.querySelector('h1')?.textContent).toBe(headline);expect(host.textContent).toContain(balance);expect(host.textContent).toContain('send $10.00 to @receiver');
  const frame=host.querySelector('iframe')!;expect(new URL(frame.src).hash).toContain(`amount_usd_cents=${card}`);if(remainder)expect(host.textContent).toContain(remainder);else expect(host.textContent).not.toContain('card minimum');
 }finally{act(()=>root.unmount());}
});
it('does not present the full Send amount as a card charge while the shortfall is unresolved',async()=>{
 const {WalletSendOperation}=await import('../src/features/account/WalletSendOperation');
 const pending={status:'funding',clientNonce:'nonce',stage:'reviewing',recipientLabel:'@receiver',amountUsdCents:'1000'},api={status:async()=>pending,resumeFunding:async()=>pending,discard:vi.fn()},host=document.createElement('div'),root=createRoot(host);
 try{await act(async()=>root.render(<WalletSendOperation identity={{walletSend:async()=>api}as unknown as OpenIdentity} input={()=>({recipient:'receiver',amountUsdCents:'1000'})} inputKey="unresolved-card" onRefresh={()=>{}}>Fields</WalletSendOperation>));expect(host.querySelector('h1')?.textContent).not.toContain('Pay $10.00');expect(host.querySelector('iframe')).toBeNull();expect(host.textContent).toContain('Back to send');}finally{act(()=>root.unmount());}
});
