// @vitest-environment happy-dom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi, afterEach } from 'vitest';
import { LiveReceive, LiveSend } from '../src/features/account/LivePayments';
import { readCardReturn, readCardResume, cardResumeLink } from '../src/features/deposit/CardDepositReturn';
import type { OpenIdentity } from '../src/receiz/native-identity';
import { parsePaymentRequest } from '../src/receiz/payment-request';
import { createWalletSend } from '../src/receiz/wallet-send';
import {paymentQr,paymentQrPath} from '../src/receiz/payment-qr';
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
afterEach(() => vi.unstubAllGlobals());
it('shows a chat username while reviewing payment against that selected stable account',async()=>{
 const target={userId:'22222222-2222-4222-8222-222222222222',username:'mira'},prepare=vi.fn().mockRejectedValue(Error('Stop at preparation')),execute=vi.fn();
 const identity={walletSend:async()=>({status:async()=>null,prepare,execute,discard:vi.fn()})} as unknown as OpenIdentity;
 const host=document.createElement('div'),root=createRoot(host);
 try{
  await act(async()=>root.render(<LiveSend identity={identity} wallet={null} initialRecipient={target} onClose={()=>{}}/>));
  const recipient=host.querySelector<HTMLInputElement>('input[placeholder="Receiz ID or public username"]')!;
  expect(recipient.value).toBe('mira');expect(host.textContent).not.toContain(target.userId);
  const amount=host.querySelector<HTMLInputElement>('input[aria-label="Amount to send"]')!;
  await act(async()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(amount,'1');amount.dispatchEvent(new Event('input',{bubbles:true}));});
  await act(async()=>[...host.querySelectorAll('button')].find(button=>button.textContent?.includes('Review payment'))!.click());
  expect(prepare).toHaveBeenCalledWith({recipient:target.userId,amountUsdCents:'100',note:''});expect(execute).not.toHaveBeenCalled();
 }finally{act(()=>root.unmount());}
});
it('generates the bank QR and writes only the public request URL to NFC on explicit user action', async () => {
  const write = vi.fn().mockResolvedValue(undefined); vi.stubGlobal('isSecureContext', true); Object.assign(window, { NDEFReader: class { write = write; } });
  const host = document.createElement('div'), root = createRoot(host);
  try { act(() => root.render(<LiveReceive identity={{ username:'fixture_user', binding: { identityOwnerReceizId: 'receiz_device_fixture', artifactOwnerReceizId: 'test-public-coordinate' },walletReceivingAddress:()=> '10000000-0000-4000-8000-000000000002' } as OpenIdentity} />));
    expect(host.querySelector('svg[aria-label="Your payment QR"]')).not.toBeNull(); expect(write).not.toHaveBeenCalled();
    expect(host.querySelector('.payment-link')!.textContent).toBe('fixture_user');
    await act(async () => [...host.querySelectorAll('button')].find(button => button.textContent?.includes('Set up NFC tag'))!.click());
    expect(write.mock.calls[0][0]).toEqual({ records: [{ recordType: 'url', data: 'https://bankeiz.com/?to=fixture_user' }] });
    expect(host.textContent).toContain('Tag ready.');
  } finally { act(() => root.unmount()); delete (window as unknown as { NDEFReader?: unknown }).NDEFReader; }
});
it('a scanned/shared request preloads the in-bank form without auto-executing a transfer', () => {
  const host = document.createElement('div'), root = createRoot(host);
  try { act(() => root.render(<LiveSend wallet={null} initialRequest={{ recipient: 'public-coordinate', amount: '12.30' }} onClose={vi.fn()} />));
    expect((host.querySelector('input[placeholder="Receiz ID or public username"]') as HTMLInputElement).value).toBe('public-coordinate');
    expect(host.textContent).toContain('Review payment'); expect(host.querySelector('a[href*="receiz.com/wallet"]')).toBeNull(); expect(host.textContent).not.toContain('Value sent');
  } finally { act(() => root.unmount()); }
});
it('a provider return is only an exact session signal, never payment proof', () => {
  expect(readCardReturn('?cardReturn=1&session_id=cs_test_12345678')).toBe('cs_test_12345678');
  expect(readCardReturn('?cardReturn=1&session_id=not-a-session')).toBeNull();
  expect(readCardReturn('?cardReturn=1&session_id=cs_test_12345678&session_id=cs_other_12345678')).toBeNull();
});
it('routes its generated Receive link through the request parser to the exact Wallet recipient before any send',async()=>{
  const recipient='10000000-0000-4000-8000-000000000002',sender='10000000-0000-4000-8000-000000000001';
  const host=document.createElement('div'),root=createRoot(host),transfer=vi.fn();
  try{
    await act(async()=>root.render(<LiveReceive identity={{username:'fixture_user',walletReceivingAddress:()=>recipient,binding:{artifactOwnerReceizId:'unroutable-proof-owner'}} as OpenIdentity}/>));
    const request=parsePaymentRequest(host.querySelector('.payment-link')!.textContent!);
    const api=createWalletSend({ownerReceizId:'synthetic',assertOpen(){},assertNoOtherPending:async()=>{},lock:async f=>f(),store:{read:async()=>null,write:async()=>{}},connect:async()=>({accountUid:sender,client:{connect:{transfer},request:async(path)=>{
      if(path==='/api/chat/users/search?q=fixture_user')return{ok:true,users:[{kind:'user',username:'fixture_user',userId:recipient}]};expect(path).toBe('/api/connect/transfers?amountUsd=10.00');return{ok:true,senderUserId:sender,quote:{amountUsdCents:'1000',amountPhiMicro:'10000000',usdPerPhiMicrocents:'100000000',settledUsdCents:'250',ecosystemUsdCents:'750',fundingRule:'settled_first_then_phi'}};
    }}})});
    const review=await api.prepare({recipient:request.recipient,amountUsdCents:'1000'});
    expect(review.recipientUserId).toBe(recipient);expect(transfer).not.toHaveBeenCalled();
  }finally{act(()=>root.unmount());}
});
it('keeps available account balances out of the Send entry form',async()=>{const host=document.createElement('div'),root=createRoot(host);try{await act(async()=>root.render(<LiveSend wallet={{reserveUsdCents:'123456',settlementUsdCents:'789012'}as never} onClose={()=>{}}/>));expect(host.querySelector('input[aria-label="Amount to send"]')).not.toBeNull();expect(host.textContent).not.toContain('$1,234.56');expect(host.textContent).not.toContain('$7,890.12');expect(host.querySelector('.detail-list')).toBeNull();}finally{act(()=>root.unmount());}});
it('uses the current public username for the Receive ID, QR and copied address instead of the Wallet UUID',async()=>{
 const host=document.createElement('div'),root=createRoot(host),copy=vi.fn().mockResolvedValue(undefined);vi.stubGlobal('navigator',{clipboard:{writeText:copy}});
 try{act(()=>root.render(<LiveReceive identity={{accountUsername:()=> 'Klok',username:'old_name',walletReceivingAddress:()=> '10000000-0000-4000-8000-000000000002'}as OpenIdentity}/>));
 expect(host.querySelector('.receiving-coordinate')?.textContent).toBe('klok');expect(host.textContent).not.toContain('.receiz.id');expect(host.querySelector('.payment-link')?.textContent).toBe('klok');expect(host.textContent).not.toContain('10000000-0000-4000-8000-000000000002');
 await act(async()=>[...host.querySelectorAll('button')].find(b=>b.textContent==='Copy Receiz ID')!.click());expect(copy).toHaveBeenCalledWith('klok');
 }finally{act(()=>root.unmount());}
});
it('waits for a new account’s confirmed public username and uses the assigned name for QR, copy and share',async()=>{
 const host=document.createElement('div'),root=createRoot(host),copy=vi.fn().mockResolvedValue(undefined),share=vi.fn().mockResolvedValue(undefined);vi.stubGlobal('navigator',{clipboard:{writeText:copy},share});
 const write=vi.fn().mockResolvedValue(undefined);vi.stubGlobal('isSecureContext',true);Object.assign(window,{NDEFReader:class{write=write;}});
 let finish!:(name:string)=>void;const prepare=vi.fn(()=>new Promise<string>(resolve=>{finish=resolve;}));
 const identity={username:'receiz_123456789012345678',accountUsername:()=>null,prepareReceivingUsername:prepare,walletReceivingAddress:()=> '10000000-0000-4000-8000-000000000002'}as unknown as OpenIdentity;
 try{
  await act(async()=>root.render(<LiveReceive identity={identity}/>));expect(prepare).toHaveBeenCalledOnce();expect(host.querySelector('.receiving-coordinate')?.textContent).toContain('Preparing');expect(host.querySelector('svg[aria-label="Your payment QR"]')).toBeNull();
  await act(async()=>finish('assigned_collision_2'));
  expect(host.querySelector('.receiving-coordinate')?.textContent).toBe('assigned_collision_2');expect(host.querySelector('.payment-link')?.textContent).toBe('assigned_collision_2');
  expect(host.querySelector('.payment-qr path')?.getAttribute('d')).toBe(paymentQrPath(paymentQr('assigned_collision_2')));
  await act(async()=>[...host.querySelectorAll('button')].find(b=>b.textContent==='Copy Receiz ID')!.click());expect(copy).toHaveBeenCalledWith('assigned_collision_2');
  await act(async()=>[...host.querySelectorAll('button')].find(b=>b.textContent==='Share Receiz ID')!.click());expect(share).toHaveBeenCalledWith({title:'Receiz ID',text:'assigned_collision_2'});
  await act(async()=>[...host.querySelectorAll('button')].find(b=>b.textContent==='Set up NFC tag')!.click());expect(write.mock.calls[0][0]).toEqual({records:[{recordType:'url',data:'https://bankeiz.com/?to=assigned_collision_2'}]});
  expect(host.textContent).not.toContain('receiz_123456789012345678');expect(host.textContent).not.toContain('10000000-0000-4000-8000-000000000002');
 }finally{act(()=>root.unmount());delete(window as unknown as {NDEFReader?:unknown}).NDEFReader;}
});
it('ignores a delayed receiving-name result after switching identities',async()=>{
 const host=document.createElement('div'),root=createRoot(host);let finish!:(name:string)=>void;
 const first={username:null,prepareReceivingUsername:()=>new Promise<string>(resolve=>{finish=resolve;})}as unknown as OpenIdentity,second={username:null,prepareReceivingUsername:async()=> 'second_confirmed'}as unknown as OpenIdentity;
 try{
  await act(async()=>root.render(<LiveReceive identity={first}/>));await act(async()=>root.render(<LiveReceive identity={second}/>));
  expect(host.querySelector('.receiving-coordinate')?.textContent).toBe('second_confirmed');await act(async()=>finish('first_confirmed'));
  expect(host.querySelector('.receiving-coordinate')?.textContent).toBe('second_confirmed');expect(host.textContent).not.toContain('first_confirmed');
 }finally{act(()=>root.unmount());}
});

it('carries only the public session reference back to the same account deposit route',()=>{
 expect(cardResumeLink('cs_test_12345678')).toBe('/?resumeCardSession=cs_test_12345678#account/deposit');
 expect(readCardResume('?resumeCardSession=cs_test_12345678')).toBe('cs_test_12345678');
 expect(readCardResume('?resumeCardSession=cs_test_12345678&resumeCardSession=cs_other_12345678')).toBeNull();
 expect(readCardResume('?resumeCardSession=not-a-session')).toBeNull();
});
