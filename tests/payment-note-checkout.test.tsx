// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {expect,it,vi} from 'vitest';
import {LiveReceive,LiveSend} from '../src/features/account/LivePayments';
import type {OpenIdentity} from '../src/receiz/native-identity';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
const click=(host:HTMLElement,label:string)=>[...host.querySelectorAll('button')].find(button=>button.textContent?.trim()===label)!.click();

it.each(['reserve','settlement','composite'] as const)('receives the same original %s Note before a separately approved payment',async rail=>{
 const value={noteId:'original-note',rail,amountUsdCents:'1230',amountPhiMicro:'1000000',...(rail==='composite'?{fundingParts:{reserve:{amountUsdCents:'500',amountPhiMicro:'400000'},settlement:{amountUsdCents:'730',amountPhiMicro:'600000'}}}:{})};
 const bytes=new Uint8Array([1,2,3]),inspect=vi.fn().mockResolvedValue(value),deposit=vi.fn().mockResolvedValue({...value,status:'received',proofBytes:bytes});
 const prepare=vi.fn().mockRejectedValue(Error('Stop before payment approval')),execute=vi.fn(),refresh=vi.fn(),create=vi.fn();
 const identity={offlineNotes:async()=>({inspect,deposit,create,receivedNotes:async()=>[]}),walletSend:async()=>({status:async()=>null,prepare,execute,discard:vi.fn()})}as unknown as OpenIdentity;
 const host=document.createElement('div'),root=createRoot(host);
 try{
  await act(async()=>root.render(<LiveReceive identity={identity} onRefresh={refresh}/>));
  expect(inspect).not.toHaveBeenCalled();expect(deposit).not.toHaveBeenCalled();
  await act(async()=>click(host,'Deposit note'));
  expect(host.textContent).toContain('All receive options');expect(host.querySelector('select')).toBeNull();
  const file=host.querySelector<HTMLInputElement>('input[type="file"]')!;
  Object.defineProperty(file,'files',{value:[{size:bytes.length,arrayBuffer:async()=>bytes.buffer}]});
  await act(async()=>file.dispatchEvent(new Event('change',{bubbles:true})));
  await act(async()=>click(host,'Deposit note'));
  expect(deposit).toHaveBeenCalledExactlyOnceWith(bytes);expect(refresh).toHaveBeenCalledOnce();
  expect(host.textContent).toContain('reconcile');expect(prepare).not.toHaveBeenCalled();expect(execute).not.toHaveBeenCalled();
  await act(async()=>click(host,'Done'));
  await act(async()=>root.render(<LiveSend identity={identity} wallet={null} initialRequest={{recipient:'merchant',amount:'12.30'}} onRefresh={refresh} onClose={()=>{}}/>));
  expect(host.querySelector<HTMLInputElement>('[aria-label="Amount to send"]')?.value).toBe('12.30');
  expect(host.querySelector<HTMLInputElement>('[placeholder="Receiz ID"]')?.value).toBe('merchant');
  await act(async()=>click(host,'Review payment'));
  expect(prepare).toHaveBeenCalledExactlyOnceWith({recipient:'merchant',amountUsdCents:'1230',note:''});
  expect(execute).not.toHaveBeenCalled();expect(create).not.toHaveBeenCalled();
 }finally{act(()=>root.unmount());}
});

it('keeps manual funding choices out of Send and never starts a checkout merely by opening it',async()=>{
 const beginCardDeposit=vi.fn(),identity={beginCardDeposit,walletSend:async()=>({status:async()=>null})}as unknown as OpenIdentity;
 const host=document.createElement('div'),root=createRoot(host);
 try{await act(async()=>root.render(<LiveSend identity={identity} wallet={null} initialRequest={{recipient:'merchant',amount:'12.30'}} onClose={()=>{}}/>));
 expect(host.textContent).not.toContain('Payment options');expect(host.textContent).not.toContain('Add money by card');
 expect(host.querySelector<HTMLInputElement>('[aria-label="Amount to send"]')?.value).toBe('12.30');expect(beginCardDeposit).not.toHaveBeenCalled();
 }finally{act(()=>root.unmount());}
});
