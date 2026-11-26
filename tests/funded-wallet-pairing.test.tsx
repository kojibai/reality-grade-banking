// @vitest-environment happy-dom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, test, vi } from 'vitest';
import { FundedWalletReceive, FundedWalletSend } from '../src/features/account/FundedWalletPayments';
import type { OpenIdentity } from '../src/receiz/native-identity';
import type { WalletPairOffer } from '../src/receiz/funded-wallet';
import { createReceizIdIdentity, signReceizIdentityLoginProof } from '@receiz/sdk';
import { createDeferredWalletSend } from '../src/receiz/wallet-send-deferred';
import { createNearbyWalletReceive } from '../src/receiz/wallet-nearby-receive';
import { signNearbyWalletPayment } from '../src/receiz/wallet-nearby-consent';
import type { NearbyPaymentCode } from '../src/features/account/WalletPaymentCode';
import { createOpticalNoteFrames } from '../src/receiz/optical-note-frames';

const scanner = vi.hoisted(() => ({
  read: undefined as undefined | ((bytes:Uint8Array)=>Promise<boolean>),
  shown: undefined as NearbyPaymentCode | undefined,
}));
vi.mock('../src/features/account/PaymentScanner',()=>({PaymentScanner({onBytes}:{onBytes:(bytes:Uint8Array)=>Promise<boolean>}){
  scanner.read=onBytes;
  return <p>QR scanner</p>;
}}));
vi.mock(import('../src/features/account/WalletPaymentCode'),async importOriginal=>({
  ...await importOriginal(),
  WalletPaymentCode:({label,frames})=>{
    scanner.shown=frames;
    return <output>{label}</output>;
  },
}));

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
  const wallet={outgoing:async()=>null,availableReceipt:async()=>null,offer:async()=>paymentOffer,hasReceivingCustody:async()=>true,answer:receiver,review};
  const identity={fundedWallet:async()=>wallet} as unknown as OpenIdentity;
  const send=()=> <FundedWalletSend identity={identity} request={()=>({recipient:offer.recipient,amountUsdCents:'100',nearby:true})}
    onRefresh={()=>{}} onNext={()=>{}}>Payment fields</FundedWalletSend>;
  try{
    await act(async()=>root.render(<FundedWalletReceive offline identity={identity} onRefresh={()=>{}}/>));
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

test('nearby Receive offers balance confirmation without opening new protected custody',async()=>{
  const host=document.createElement('div'),root=createRoot(host);
  document.body.append(host);
  const onRefresh=vi.fn(),answerOffer=vi.fn();
  const wallet={availableReceipt:async()=>null,hasReceivingCustody:async()=>false,answer:answerOffer};
  const identity={fundedWallet:async()=>wallet,walletReceivingAddress:()=>answer.recipientUserId,nearbyWalletReceive:async()=>({list:async()=>[],subscribe:()=>()=>{}})} as unknown as OpenIdentity;
  try{
    await act(async()=>root.render(<FundedWalletReceive offline identity={identity} onRefresh={onRefresh}/>));
    await scan({...offer,recipient:answer.recipientUserId});
    expect(host.textContent).not.toContain('Approve receiving');
    expect(host.querySelector('[role="status"]')?.textContent).toContain('Connect to use these funds after you scan the payment.');
    expect(host.querySelector('[role="alert"]')).toBeNull();
    expect(host.textContent).toContain('Wallet recipient reply QR');
    expect(answerOffer).not.toHaveBeenCalled();
    expect(onRefresh).not.toHaveBeenCalled();
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
    await act(async()=>root.render(<FundedWalletReceive offline identity={identity} onRefresh={onRefresh}/>));
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

test.each([
  {entry:'confirm',standalone:true,blocked:false},
  {entry:'confirm',standalone:true,blocked:true},
  {entry:'confirm',standalone:false,blocked:false},
  {entry:'resume',standalone:true,blocked:false},
  {entry:'reopen',standalone:true,blocked:false},
])('starts a recovery download only for newly completed iPhone payments ($entry, standalone $standalone, blocked $blocked)',async({entry,standalone,blocked})=>{
  const host=document.createElement('div'),root=createRoot(host);document.body.append(host);
  const previousStandalone=Object.getOwnPropertyDescriptor(navigator,'standalone');
  Object.defineProperty(navigator,'standalone',{configurable:true,value:standalone});
  const exact=Uint8Array.of(11,22,33);
  const qr=await createOpticalNoteFrames('wallet',exact);
  const result={operationId:offer.conversationId,qr,recoveryProof:exact};
  const review={recipientLabel:'Recipient',amountUsdCents:'100',
    quote:{amountPhiMicro:'500000',settledUsdCents:'100',ecosystemUsdCents:'0'}};
  const wallet={outgoing:async()=>entry==='reopen'?result:null,
    pendingBundle:async()=>entry==='resume'?'100':null,
    confirm:vi.fn(async()=>result),resumeBundle:vi.fn(async()=>result)};
  const identity={fundedWallet:async()=>wallet} as unknown as OpenIdentity;
  const createUrl=vi.spyOn(URL,'createObjectURL').mockReturnValue('blob:wallet-recovery');
  const downloads:{filename:string;qrVisible:boolean}[]=[];
  const download=vi.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(function(this:HTMLAnchorElement){
    downloads.push({filename:this.download,qrVisible:host.textContent?.includes('Wallet payment QR')??false});
    if(blocked)throw new DOMException('Download denied','NotAllowedError');
  });
  try{
    await act(async()=>root.render(<FundedWalletSend identity={identity} request={()=>({
      recipient:offer.recipient,amountUsdCents:'100',nearby:true,
    })} initialReview={entry==='confirm'?review:undefined} onRefresh={()=>{}} onNext={()=>{}}>Payment fields</FundedWalletSend>));
    if(entry==='confirm'){
      await act(async()=>host.querySelector<HTMLInputElement>('input[type=checkbox]')!.click());
      await click(host,'Send payment');
      expect(wallet.confirm).toHaveBeenCalledExactlyOnceWith(review);
    }else if(entry==='resume'){
      await click(host,'Continue payment');
      expect(wallet.resumeBundle).toHaveBeenCalledOnce();
    }
    expect(downloads).toEqual(standalone&&entry!=='reopen'?[{
      filename:`bankeiz-wallet-${result.operationId}.receiz`,qrVisible:false,
    }]:[]);
    if(downloads.length){
      const file=createUrl.mock.calls[0]![0];
      if(!(file instanceof File))throw Error('Expected a Wallet recovery file');
      expect(new Uint8Array(await file.arrayBuffer())).toEqual(exact);
    }
    expect(host.textContent).toContain('Wallet payment QR');
    expect(host.textContent).toContain('Save recovery file');
    expect(host.querySelector('[role="alert"]')).toBeNull();
  }finally{
    createUrl.mockRestore();download.mockRestore();
    if(previousStandalone)Object.defineProperty(navigator,'standalone',previousStandalone);
    else Reflect.deleteProperty(navigator,'standalone');
    await act(async()=>root.unmount());host.remove();
  }
});

test('saves the sender’s exact Wallet recovery file and imports it without the recipient',async()=>{
  const host=document.createElement('div'),root=createRoot(host);document.body.append(host);
  const exact=Uint8Array.of(11,22,33);
  const qr=await createOpticalNoteFrames('wallet',exact);
  const share=vi.fn(async (_data:ShareData)=>{});
  const originalShare=Object.getOwnPropertyDescriptor(navigator,'share');
  const originalCanShare=Object.getOwnPropertyDescriptor(navigator,'canShare');
  Object.defineProperty(navigator,'share',{configurable:true,value:share});
  Object.defineProperty(navigator,'canShare',{configurable:true,value:()=>true});
  const restoreWalletRecoveryFile=vi.fn(async (_bytes:Uint8Array):Promise<{count:number;freshness:string}>=>({count:1,freshness:'unconfirmed'}));
  const receive=vi.fn(),onRefresh=vi.fn(),completeOutgoing=vi.fn(async()=>{});
  const latestRecoveryFiles=vi.fn(async()=>[{operationId:offer.conversationId,amountUsdCents:'100',recoveryProof:exact}]);
  const wallet={availableReceipt:async()=>null,receiptProofCount:async()=>0,completeOutgoing,latestRecoveryFiles,
    outgoing:async()=>({operationId:offer.conversationId,qr,recoveryProof:exact}),restoreWalletRecoveryFile,receive};
  const verifyWalletRecoveryOwner=vi.fn(async (_bytes:Uint8Array)=>true);
  const identity={fundedWallet:async()=>wallet,verifyWalletRecoveryOwner} as unknown as OpenIdentity;
  try{
    await act(async()=>root.render(<FundedWalletSend identity={identity} request={()=>({
      recipient:offer.recipient,amountUsdCents:'100',nearby:true,
    })} onRefresh={onRefresh} onNext={()=>{}}>Payment fields</FundedWalletSend>));
    await click(host,'Save recovery file');
    expect(share).toHaveBeenCalledOnce();
    const file=share.mock.calls[0]![0].files?.[0];
    expect(file?.name).toMatch(/\.receiz$/);
    expect(new Uint8Array(await file!.arrayBuffer())).toEqual(exact);
    expect(host.textContent).toContain('after it syncs');

    await click(host,'Send another payment');
    expect(completeOutgoing).toHaveBeenCalledExactlyOnceWith(offer.conversationId);
    await act(async()=>root.render(<FundedWalletReceive offline identity={identity} onRefresh={onRefresh}/>));
    await click(host,'Save latest recovery file');
    expect(share).toHaveBeenCalledTimes(2);
    expect(new Uint8Array(await share.mock.calls[1]![0].files![0]!.arrayBuffer())).toEqual(exact);
    const input=host.querySelector<HTMLInputElement>('[aria-label="Restore Wallet from file"]');
    expect(input).not.toBeNull();
    expect(input!.hasAttribute('accept')).toBe(false);
    Object.defineProperty(input,'files',{configurable:true,value:[file]});
    await act(async()=>input!.dispatchEvent(new Event('change',{bubbles:true})));
    expect(restoreWalletRecoveryFile).toHaveBeenCalledExactlyOnceWith(exact);
    expect(receive).not.toHaveBeenCalled();
    expect(onRefresh).toHaveBeenCalledOnce();
    expect(host.textContent).toContain('Wallet history recovered. Bankeiz can’t confirm this is the latest copy.');

    restoreWalletRecoveryFile.mockResolvedValueOnce({count:0,freshness:'older'});
    await act(async()=>input!.dispatchEvent(new Event('change',{bubbles:true})));
    expect(host.textContent).toContain('This file is older than the payment history on this device.');
    expect(receive).not.toHaveBeenCalled();
    restoreWalletRecoveryFile.mockRejectedValueOnce(Error('BANK_WALLET_DEVICE_REQUIRED'));
    await act(async()=>input!.dispatchEvent(new Event('change',{bubbles:true})));
    expect(verifyWalletRecoveryOwner).toHaveBeenCalledExactlyOnceWith(exact);
    expect(host.textContent).toContain('The signed payment matches this Receiz ID.');
    expect(host.textContent).toContain('Sending again requires the Wallet’s original signing credential.');
    expect(onRefresh).toHaveBeenCalledTimes(2);

  }finally{
    if(originalShare)Object.defineProperty(navigator,'share',originalShare);else Reflect.deleteProperty(navigator,'share');
    if(originalCanShare)Object.defineProperty(navigator,'canShare',originalCanShare);else Reflect.deleteProperty(navigator,'canShare');
    await act(async()=>root.unmount());host.remove();
  }
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
    await act(async()=>root.render(<FundedWalletReceive offline identity={identity} onRefresh={onRefresh}/>));
    await scanProof();
    expect(host.querySelector('[role="alert"]')?.textContent).toContain('Scan the payment again');
    expect(host.textContent).not.toContain('available to send from this device');
    expect(onRefresh).not.toHaveBeenCalled();
    await scanProof();
    expect(host.textContent).toContain('available to send from this device');
    expect(onRefresh).toHaveBeenCalledOnce();
  }finally{await act(async()=>root.unmount());host.remove();}
});

test('two unqualified Wallets use regular review, one payment QR and a quiet connect-to-confirm status',async()=>{
  const senderUid='11111111-1111-4111-8111-111111111111';
  const passphrase='test-nearby-identity';
  const {keyFile}=await createReceizIdIdentity({passphrase});
  let sent:Awaited<ReturnType<ReturnType<typeof createDeferredWalletSend>['list']>>|null=null;
  let incoming:Awaited<ReturnType<ReturnType<typeof createNearbyWalletReceive>['list']>>|null=null;
  const refuseCustody=async()=>{throw Error('BANK_WALLET_DEVICE_REQUIRED');};
  const approve=createDeferredWalletSend({
    account:()=>({accountUid:senderUid,availableUsdCents:'1000'}),online:()=>false,lock:async work=>work(),
    deliver:async()=>{throw Error('Sender is offline');},
    store:{read:async()=>sent,write:async next=>{sent=structuredClone(next);}},
    signNearby:review=>signNearbyWalletPayment({
      applicationId:offer.applicationId,senderUserId:senderUid,recipientUserId:review.recipientUserId,
      amountUsdCents:review.amountUsdCents,clientNonce:review.clientNonce,note:null,kaiUPulse:'1000000',
      keyId:keyFile.keyId,alg:keyFile.alg,publicKeyRawB64u:keyFile.crypto.publicKeyRawB64u,
    }, challengeB64Url=>signReceizIdentityLoginProof({keyFile,passphrase,challengeB64Url})),
  });
  const confirm=vi.fn();
  const inbox=createNearbyWalletReceive({
    applicationId:offer.applicationId,accountUid:()=>answer.recipientUserId,online:()=>false,lock:async work=>work(),
    confirm,onRecorded:()=>{},
    store:{read:async()=>incoming,write:async next=>{incoming=structuredClone(next);}},
  });
  const sender={fundedWallet:refuseCustody,deferredWalletSend:async()=>approve} as unknown as OpenIdentity;
  const merchant={fundedWallet:refuseCustody,nearbyWalletReceive:async()=>inbox} as unknown as OpenIdentity;
  const host=document.createElement('div'),root=createRoot(host);
  document.body.append(host);
  try{
    await act(async()=>root.render(<FundedWalletSend identity={sender} recipientLabel="Coffee shop" request={()=>({
      recipient:answer.recipientUserId,amountUsdCents:'100',nearby:true,
    })} onRefresh={()=>{}} onNext={()=>{}}>Payment fields</FundedWalletSend>));
    await click(host,'Review payment');
    await vi.waitFor(()=>expect(host.textContent).toContain('After confirmation'));
    await act(async()=>host.querySelector<HTMLInputElement>('input[type=checkbox]')!.click());
    await click(host,'Send payment');
    await vi.waitFor(()=>expect(host.textContent).toContain('Wallet payment QR'));
    const payment=scanner.shown;
    if(typeof payment!=='string')throw Error('Expected one Bankeiz payment link QR');
    expect(payment).toMatch(/^https:\/\/bankeiz\.com\/#account\/receive\/payment\//u);
    await act(async()=>root.render(<FundedWalletReceive offline identity={merchant} onRefresh={()=>{}}/>));
    await act(async()=>{expect(await scanner.read!(new TextEncoder().encode(payment))).toBe(true);});
    await vi.waitFor(()=>expect(host.textContent).toContain('Connect to confirm'));
    expect(host.textContent).toContain('$1.00');
    expect(host.querySelector('[role=alert]')).toBeNull();
    expect(confirm).not.toHaveBeenCalled();
  }finally{
    await act(async()=>root.unmount());
    host.remove();
  }
});

test('Send Nearby selects the funded Note and Receive Nearby can forward the same amount offline',async()=>{
  const host=document.createElement('div'),root=createRoot(host);document.body.append(host);
  const raw=(name:string)=>new TextEncoder().encode(JSON.stringify({schema:'receiz.bank.connected-note.handover-source.v1',name}));
  const ab=raw('A to B'),bc=raw('B to C'),request=Uint8Array.of(21,34,55);
  const owned={noteId:'same-note',rail:'reserve' as const,recipientUserId:answer.recipientUserId,amountUsdCents:'100',forwardable:true as const,image:Uint8Array.of(137)};
  const received={status:'received' as const,noteId:owned.noteId,rail:owned.rail,amountUsdCents:'100',amountPhiMicro:'1000000',forwardable:true as const,proofBytes:ab};
  const forwardOwnedNote=vi.fn(async()=>({...received,status:'forwarded' as const,proofBytes:ab}));
  const forwardReceivedNote=vi.fn(async()=>({...received,status:'forwarded' as const,proofBytes:bc}));
  const deposit=vi.fn(async()=>received);
  const missingCash=async()=>{throw Error('BANK_WALLET_DEVICE_REQUIRED');},deferredWalletSend=vi.fn();
  const sender={fundedWallet:missingCash,deferredWalletSend,offlineNotes:async()=>({savedNotes:async()=>[owned],forwardOwnedNote})} as unknown as OpenIdentity;
  const receiver={fundedWallet:missingCash,offlineNotes:async()=>({receivingRequest:async()=>request,deposit,forwardReceivedNote})} as unknown as OpenIdentity;
  async function scanShown(){
    const frames=scanner.shown,scanFrame=scanner.read!;
    if(!frames||typeof frames==='string')throw Error('Expected portable Note frames');
    await act(async()=>{for(let index=0;index<frames.count;index++)await scanFrame(frames.frame(index));});
  }
  try{
    await act(async()=>root.render(<FundedWalletSend identity={sender} request={()=>({recipient:answer.recipientUserId,amountUsdCents:'100',nearby:true})}
      onRefresh={()=>{}} onNext={()=>{}}>Payment fields</FundedWalletSend>));
    await click(host,'Review payment');
    expect(deferredWalletSend).not.toHaveBeenCalled();
    expect(host.textContent).toContain('Scan the recipient’s Note receiving QR.');
    scanner.shown=await createOpticalNoteFrames('request',request);
    await scanShown();
    expect(forwardOwnedNote).toHaveBeenCalledExactlyOnceWith(owned.noteId,request);
    expect(host.textContent).toContain('Forwarded Note QR');
    await act(async()=>root.render(<FundedWalletReceive identity={receiver} offline onRefresh={()=>{}}/>));
    scanner.shown=await createOpticalNoteFrames('wallet',ab);
    await scanShown();
    expect(deposit).toHaveBeenCalledExactlyOnceWith(ab);
    expect(host.textContent).toContain('You can send this Note offline.');
    await click(host,'Send Note nearby');
    scanner.shown=await createOpticalNoteFrames('request',request);
    await scanShown();
    expect(forwardReceivedNote).toHaveBeenCalledExactlyOnceWith(owned.noteId,request,undefined);
    expect(host.textContent).toContain('Forwarded Note QR');
  }finally{
    await act(async()=>root.unmount());host.remove();
  }
});

test('signed-in Receive opens the witness pairing camera while offline', async () => {
  const { LiveReceive } = await import('../src/features/account/LivePayments');
  const host=document.createElement('div'),root=createRoot(host);
  document.body.append(host);
  const identity={
    username:'receiver',binding:{artifactSha256:'a'.repeat(64)},
    witnessedWallet:async()=>({summary:async()=>({paired:false,availableUsdCents:'0',lots:[],pending:null})}),
  } as unknown as OpenIdentity;
  try {
    await act(async()=>root.render(<LiveReceive identity={identity} onRefresh={()=>{}}/>));
    await click(host,'Pay offline with a witness');
    await vi.waitFor(()=>expect(host.textContent).toContain('Pair with a witness'));
    await click(host,'Pair with a witness');
    expect(scanner.read).toBeTypeOf('function');
    expect(host.textContent).toContain('Scan the witness’s pairing QR');
  } finally {
    await act(async()=>root.unmount());
    host.remove();
  }
});
