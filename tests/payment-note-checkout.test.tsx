// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {expect,it,vi} from 'vitest';
import {LiveSend} from '../src/features/account/LivePayments';
import type {OpenIdentity} from '../src/receiz/native-identity';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
const click=(host:HTMLElement,label:string)=>[...host.querySelectorAll('button')].find(button=>button.textContent?.trim()===label)!.click();

it.each(['reserve','settlement','composite'] as const)('uses the same original Note deposit for %s and preserves the merchant and amount before payment review',async rail=>{
 const value={noteId:'original-note',rail,amountUsdCents:'1230',amountPhiMicro:'1000000',...(rail==='composite'?{fundingParts:{reserve:{amountUsdCents:'500',amountPhiMicro:'400000'},settlement:{amountUsdCents:'730',amountPhiMicro:'600000'}}}:{})};
 const bytes=new Uint8Array([1,2,3]),inspect=vi.fn().mockResolvedValue(value),deposit=vi.fn().mockResolvedValue({...value,status:'received',proofBytes:bytes});
 const prepare=vi.fn().mockRejectedValue(Error('Stop before payment approval')),execute=vi.fn(),refresh=vi.fn(),create=vi.fn();
 const identity={offlineNotes:async()=>({inspect,deposit,create,receivedNotes:async()=>[]}),walletSend:async()=>({status:async()=>null,prepare,execute,discard:vi.fn()})}as unknown as OpenIdentity;
 const host=document.createElement('div'),root=createRoot(host);
 try{
  await act(async()=>root.render(<LiveSend identity={identity} wallet={null} initialRequest={{recipient:'merchant',amount:'12.30'}} onRefresh={refresh} onClose={()=>{}}/>));
  expect(inspect).not.toHaveBeenCalled();expect(deposit).not.toHaveBeenCalled();
  await act(async()=>click(host,'Pay with a Note'));
  expect(host.textContent).toContain('Back to payment');expect(host.querySelector('select')).toBeNull();
  const file=host.querySelector<HTMLInputElement>('input[type="file"]')!;
  Object.defineProperty(file,'files',{value:[{size:bytes.length,arrayBuffer:async()=>bytes.buffer}]});
  await act(async()=>file.dispatchEvent(new Event('change',{bubbles:true})));
  await act(async()=>click(host,'Deposit note'));
  expect(deposit).toHaveBeenCalledExactlyOnceWith(bytes);expect(refresh).toHaveBeenCalledOnce();
  expect(host.textContent).toContain('reconcile');expect(prepare).not.toHaveBeenCalled();expect(execute).not.toHaveBeenCalled();
  await act(async()=>click(host,'Done'));
  expect(host.querySelector<HTMLInputElement>('[aria-label="Amount to send"]')?.value).toBe('12.30');
  expect(host.querySelector<HTMLInputElement>('[placeholder="Receiz ID"]')?.value).toBe('merchant');
  await act(async()=>click(host,'Review payment'));
  expect(prepare).toHaveBeenCalledExactlyOnceWith({recipient:'merchant',amountUsdCents:'1230',note:''});
  expect(execute).not.toHaveBeenCalled();expect(create).not.toHaveBeenCalled();
 }finally{act(()=>root.unmount());}
});

it('opens existing card funding only on request and returns to the same payment without creating a checkout',async()=>{
 const beginCardDeposit=vi.fn(),identity={pendingCardDeposits:async()=>[],beginCardDeposit,walletSend:async()=>({status:async()=>null})}as unknown as OpenIdentity;
 const host=document.createElement('div'),root=createRoot(host);
 try{
  await act(async()=>root.render(<LiveSend identity={identity} wallet={null} initialRequest={{recipient:'merchant',amount:'12.30'}} onClose={()=>{}}/>));
  await act(async()=>click(host,'Add money by card'));
  expect(host.textContent).toContain('Back to payment');expect(host.querySelector<HTMLInputElement>('[aria-label="Amount"]')?.value).toBe('12.30');expect(beginCardDeposit).not.toHaveBeenCalled();
  await act(async()=>click(host,'Back to payment'));
  expect(host.querySelector<HTMLInputElement>('[aria-label="Amount to send"]')?.value).toBe('12.30');expect(beginCardDeposit).not.toHaveBeenCalled();
 }finally{act(()=>root.unmount());}
});
