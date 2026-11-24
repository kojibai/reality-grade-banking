// @vitest-environment happy-dom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, test, vi } from 'vitest';
import { FundedWalletReceive, FundedWalletSend } from '../src/features/account/FundedWalletPayments';
import type { OpenIdentity } from '../src/receiz/native-identity';
import type { WalletPairOffer } from '../src/receiz/funded-wallet';
import { createOpticalNoteFrames } from '../src/receiz/optical-note-frames';

const scanner = vi.hoisted(() => ({ read: undefined as undefined | ((bytes:Uint8Array)=>Promise<boolean>) }));
vi.mock('../src/features/account/PaymentScanner',()=>({PaymentScanner({onBytes}:{onBytes:(bytes:Uint8Array)=>Promise<boolean>}){
  scanner.read=onBytes;
  return <p>QR scanner</p>;
}}));
vi.mock('../src/features/account/WalletPaymentCode',()=>({WalletPaymentCode:({label}:{label:string})=><output>{label}</output>}));

const offer:WalletPairOffer={schema:'bankeiz.wallet.offer.v1',applicationId:'rc_wallet',sourceArtifactSha256:'a'.repeat(64),
  allocationId:'b'.repeat(64),conversationId:'66666666-6666-4666-8666-666666666666',amountUsdCents:'100',recipient:'second.receiz.id'};
const answer={schema:'bankeiz.wallet.answer.v1',offer,recipientUserId:'22222222-2222-4222-8222-222222222222',scannedRecipient:{assertion:'fixture'}};
async function scan(value:unknown){
  const frames=await createOpticalNoteFrames('wallet',new TextEncoder().encode(JSON.stringify(value)));
  await act(async()=>{for(let i=0;i<frames.count;i++)await scanner.read!(frames.frame(i));});
}
function click(host:HTMLElement,label:string){
  const button=[...host.querySelectorAll('button')].find(element=>element.textContent===label);
  expect(button,label).toBeDefined();return act(async()=>button!.click());
}

test.each([false,true])('regular Wallet components carry scan-time approval into payment review (shared counter %s)',async shared=>{
  const paymentOffer:WalletPairOffer=shared?{...offer,walletCounterMode:'device'}:offer;
  const paymentAnswer={...answer,offer:paymentOffer,...(shared?{scannedRecipient:{assertion:'fixture',signCount:'4'}}:{})};
  const host=document.createElement('div'),root=createRoot(host);document.body.append(host);
  const review=vi.fn(async (input:{paired?:unknown})=>{
    if(!input.paired)throw Error('BANK_WALLET_FUNDED_RECIPIENT_REQUIRED');
    return {recipientLabel:offer.recipient,amountUsdCents:'100',quote:{amountPhiMicro:'500000',settledUsdCents:'0',ecosystemUsdCents:'100'}};
  });
  const receiver=vi.fn(async()=>paymentAnswer);
  const wallet={outgoing:async()=>null,availableReceipt:async()=>null,offer:async()=>paymentOffer,answer:receiver,review};
  const identity={fundedWallet:async()=>wallet} as unknown as OpenIdentity;
  const send=()=> <FundedWalletSend identity={identity} request={()=>({recipient:offer.recipient,amountUsdCents:'100',nearby:true})}
    onRefresh={()=>{}} onNext={()=>{}}>Payment fields</FundedWalletSend>;
  try{
    await act(async()=>root.render(<FundedWalletReceive identity={identity} onRefresh={()=>{}}/>));
    await scan(paymentOffer);
    expect(receiver).not.toHaveBeenCalled();
    await click(host,'Approve receiving');
    expect(receiver).toHaveBeenCalledWith(paymentOffer);
    await vi.waitFor(()=>expect(host.textContent).toContain('Wallet recipient reply QR'));
    await act(async()=>root.render(send()));
    await click(host,'Review payment');
    await vi.waitFor(()=>expect(host.textContent).toContain('Wallet pairing QR'));
    await scan(paymentAnswer);
    expect(review).toHaveBeenLastCalledWith(expect.objectContaining({paired:paymentAnswer}));
    expect(host.textContent).toContain('Review payment.');
    expect(host.textContent).toContain('Settlement');
  }finally{await act(async()=>root.unmount());host.remove();}
});

test('Wallet opens the recipient’s retained proof and scans the same proof for recovery',async()=>{
  const host=document.createElement('div'),root=createRoot(host);document.body.append(host);
  const exact=Uint8Array.of(8,21,34);
  const receipt=await createOpticalNoteFrames('wallet',exact);
  const recoverWalletProof=vi.fn(async () => 1),onRefresh=vi.fn(),receiptQr=vi.fn(async (_index:number)=>receipt);
  const wallet={availableReceipt:async()=>null,receiptProofCount:async()=>2,receiptQr,recoverWalletProof,
    receive:async()=>{throw Error('ACCOUNT_FINANCIAL_SOURCE_WALLET_RECIPIENT');}};
  const identity={fundedWallet:async()=>wallet} as unknown as OpenIdentity;
  try{
    await act(async()=>root.render(<FundedWalletReceive identity={identity} onRefresh={onRefresh}/>));
    await click(host,'Show payment proof');
    expect(host.textContent).toContain('Wallet payment proof QR');
    await click(host,'Older payment');
    expect(receiptQr).toHaveBeenLastCalledWith(1);
    await click(host,'Done');
    await act(async()=>{for(let i=0;i<receipt.count;i++)await scanner.read!(receipt.frame(i));});
    expect(recoverWalletProof).toHaveBeenCalledExactlyOnceWith(exact);
    expect(host.textContent).toContain('Wallet history recovered.');
    expect(onRefresh).toHaveBeenCalledOnce();
  }finally{await act(async()=>root.unmount());host.remove();}
});

test('Receive asks for a rescan and waits for a readable recovery copy before reporting value available',async()=>{
  const host=document.createElement('div'),root=createRoot(host);document.body.append(host);
  const receive=vi.fn(async()=>({allocationId:'a'.repeat(64),wallet:{availableUsdCents:'40'}}));
  receive.mockRejectedValueOnce(Error('BANK_WALLET_RECEIPT_RETENTION_REQUIRED'));
  const onRefresh=vi.fn();
  const wallet={receive,availableReceipt:async()=>null};
  const identity={fundedWallet:async()=>wallet} as unknown as OpenIdentity;
  const proof=await createOpticalNoteFrames('wallet',Uint8Array.of(8,21,34));
  const scanProof=()=>act(async()=>{for(let i=0;i<proof.count;i++)await scanner.read!(proof.frame(i));});
  try{
    await act(async()=>root.render(<FundedWalletReceive identity={identity} onRefresh={onRefresh}/>));
    await scanProof();
    expect(host.querySelector('[role="alert"]')?.textContent).toContain('Scan the payment again');
    expect(host.textContent).not.toContain('available to send from this device');
    expect(onRefresh).not.toHaveBeenCalled();
    await scanProof();
    expect(host.textContent).toContain('available to send from this device');
    expect(onRefresh).toHaveBeenCalledOnce();
  }finally{await act(async()=>root.unmount());host.remove();}
});
