import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { OpenIdentity } from '../../receiz/native-identity';
import type { FundedWalletReview } from '../../receiz/funded-wallet';
import { isOpticalNoteFrame, readOpticalNoteFrames } from '../../receiz/optical-note-frames';
import { formatMoney } from '../../core/money';
import { PaymentScanner } from './PaymentScanner';
import { WalletPaymentReview } from './WalletSendOperation';
import { WalletPaymentCode, type OpticalFrames } from './WalletPaymentCode';

const walletError=(cause:unknown)=>cause instanceof Error&&cause.message==='BANK_WALLET_FUNDED_RECIPIENT_REQUIRED'
 ?'No funded offline payment is available for this recipient on this device.'
 :'Wallet could not open or complete this payment. Any accepted payment remains saved on this device.';

export function FundedWalletSend({identity,request,onRefresh,onNext,children}:{
  identity:OpenIdentity; request:()=>{recipient:string;amountUsdCents:string;note?:string;nearby:boolean};
  onRefresh:()=>void;onNext:()=>void;children:ReactNode;
}){
  const [review,setReview]=useState<FundedWalletReview|null>(null),[result,setResult]=useState<{qr:OpticalFrames|null;operationId:string}|null>(null);
  const [error,setError]=useState(''),[busy,setBusy]=useState(false),[approved,setApproved]=useState(false);
  const running=useRef(false);
  useEffect(()=>{
    let current=true;
    void identity.fundedWallet!().then(wallet=>wallet.outgoing()).then(saved=>{if(current&&saved)setResult(saved);}).catch(cause=>{if(current)setError(walletError(cause));});
    return()=>{current=false;};
  },[identity]);
  async function act(work:()=>Promise<void>){
    if(running.current)return;
    running.current=true;setError('');setBusy(true);
    try{await work();}catch(error){setError(walletError(error));}finally{running.current=false;setBusy(false);}
  }
  const errors=error&&<p className="error-message" role="alert">{error}</p>;
  if(result)return <section className="native-operation-result" aria-live="polite">
    <h1 className="sheet-hero">{result.qr?'Show payment QR.':'Payment kept on this device.'}</h1>
    {result.qr?<WalletPaymentCode frames={result.qr} label="Wallet payment QR" onError={cause=>setError(walletError(cause))}/>:
      <p className="body-copy">Wallet will deliver the signed payment when this device reconnects.</p>}
    <button className="secondary-button" disabled={busy} onClick={()=>void act(async()=>{
      const wallet=await identity.fundedWallet!();await wallet.completeOutgoing(result.operationId);
      setResult(null);setReview(null);setApproved(false);onNext();
    })}>Send another payment</button>
    {errors}
  </section>;
  if(review)return <WalletPaymentReview offline review={review} busy={busy} approved={approved} onApprove={setApproved}
    onEdit={()=>{setReview(null);setApproved(false);}}
    onSend={()=>{if(approved)void act(async()=>{const wallet=await identity.fundedWallet!();setResult(await wallet.confirm(review));onRefresh();});}}>
    {errors}
  </WalletPaymentReview>;
  return <><fieldset className="native-operation-fields" disabled={busy}>{children}</fieldset>
    <button className="primary-button" disabled={busy} onClick={()=>void act(async()=>{const wallet=await identity.fundedWallet!(); setReview(await wallet.review(request()));})}>
      {busy?'Checking payment…':'Review payment'}
    </button>{errors}</>;
}

export function FundedWalletReceive({identity,onRefresh}:{identity:OpenIdentity;onRefresh:()=>void}){
  const reader=useRef(readOpticalNoteFrames('wallet'));
  const [status,setStatus]=useState(''),[error,setError]=useState('');
  const [received,setReceived]=useState<{allocationId:string}|null>(null);
  const [busy,setBusy]=useState(false);
  const active=useRef(true);
  useEffect(()=>{
    let current=true;
    active.current=true;
    void identity.fundedWallet!().then(wallet=>wallet.availableReceipt()).then(value=>{if(current&&value)setReceived(value);}).catch(()=>{});
    return()=>{current=false;active.current=false;reader.current=readOpticalNoteFrames('wallet');};
  },[identity]);
  async function scan(bytes:Uint8Array){
    if(!isOpticalNoteFrame(bytes))return false;
    try {
      const next=reader.current.push(bytes);
      if(!next){if(active.current)setStatus(`${reader.current.received} of ${reader.current.count} frames scanned.`);return false;}
      const proof=await next;
      if(!active.current)return true;
      const wallet=await identity.fundedWallet!();
      if(!active.current)return true;
      const payment=await wallet.receive(proof.bytes);
      if(active.current){
        reader.current=readOpticalNoteFrames('wallet');
        setError('');
        const spendable=BigInt(payment.wallet.availableUsdCents)>0n;
        setReceived(spendable?payment:null);
        setStatus(spendable?`${formatMoney(payment.wallet.availableUsdCents)} available to send from this device.`:'Wallet has already recorded this payment.');
        onRefresh();
      }
      return true;
    }catch(cause){
      if(active.current){setError(walletError(cause));reader.current=readOpticalNoteFrames('wallet');}
      return true;
    }
  }
  async function release(){
    if(!received||busy)return;
    setBusy(true);setError('');
    try{
      const wallet=await identity.fundedWallet!(),result=await wallet.release(received.allocationId);
      if(active.current){setStatus(result.status==='published'?'Wallet synchronized the payment.':'Payment saved for synchronization on reconnect.');setReceived(null);onRefresh();}
    }catch(cause){if(active.current)setError(walletError(cause));}
    finally{if(active.current)setBusy(false);}
  }
  return <><PaymentScanner compact onBytes={scan}/>
    {status&&<p className="body-copy small-copy" role="status">{status}</p>}
    {error&&<p className="error-message" role="alert">{error}</p>}
    {received&&<button className="text-button" onClick={()=>void release()} disabled={busy}>Sync to account</button>}</>;
}
