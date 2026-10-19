// @vitest-environment happy-dom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi, afterEach } from 'vitest';
import { LiveReceive, LiveSend } from '../src/features/account/LivePayments';
import { readCardReturn } from '../src/features/deposit/CardDepositReturn';
import type { OpenIdentity } from '../src/receiz/native-identity';
import { parsePaymentRequest } from '../src/receiz/payment-request';
import { createWalletSend } from '../src/receiz/wallet-send';
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
afterEach(() => vi.unstubAllGlobals());
it('generates the bank QR and writes only the public request URL to NFC on explicit user action', async () => {
  const write = vi.fn().mockResolvedValue(undefined); vi.stubGlobal('isSecureContext', true); Object.assign(window, { NDEFReader: class { write = write; } });
  const host = document.createElement('div'), root = createRoot(host);
  try { act(() => root.render(<LiveReceive identity={{ binding: { identityOwnerReceizId: 'receiz_device_fixture', artifactOwnerReceizId: 'test-public-coordinate' },walletReceivingAddress:()=> '10000000-0000-4000-8000-000000000002' } as OpenIdentity} />));
    expect(host.querySelector('svg[aria-label="Your payment QR"]')).not.toBeNull(); expect(write).not.toHaveBeenCalled();
    expect(host.querySelector('.payment-link')!.textContent).toBe('https://bankeiz.com/?to=10000000-0000-4000-8000-000000000002');
    await act(async () => [...host.querySelectorAll('button')].find(button => button.textContent?.includes('Set up NFC tag'))!.click());
    expect(write.mock.calls[0][0]).toEqual({ records: [{ recordType: 'url', data: 'https://bankeiz.com/?to=10000000-0000-4000-8000-000000000002' }] });
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
    await act(async()=>root.render(<LiveReceive identity={{walletReceivingAddress:()=>recipient,binding:{artifactOwnerReceizId:'unroutable-proof-owner'}} as OpenIdentity}/>));
    const request=parsePaymentRequest(host.querySelector('.payment-link')!.textContent!);
    const api=createWalletSend({ownerReceizId:'synthetic',assertOpen(){},assertNoOtherPending:async()=>{},lock:async f=>f(),store:{read:async()=>null,write:async()=>{}},connect:async()=>({accountUid:sender,client:{connect:{transfer},request:async(path)=>{
      expect(path).toBe('/api/connect/transfers?amountUsd=10.00');return{ok:true,senderUserId:sender,quote:{amountUsdCents:'1000',amountPhiMicro:'10000000',usdPerPhiMicrocents:'100000000',settledUsdCents:'250',ecosystemUsdCents:'750',fundingRule:'settled_first_then_phi'}};
    }}})});
    const review=await api.prepare({recipient:request.recipient,amountUsdCents:'1000'});
    expect(review.recipientUserId).toBe(recipient);expect(transfer).not.toHaveBeenCalled();
  }finally{act(()=>root.unmount());}
});
