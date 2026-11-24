import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { ChevronDown, Minus, Plus, QrCode } from 'lucide-react';
import type { OpenIdentity } from '../../receiz/native-identity';
import { readWalletPairing, WALLET_RECEIPT_RETENTION_REQUIRED, WALLET_STALE_ALLOCATION, type FundedWalletReview, type WalletOffer } from '../../receiz/funded-wallet';
import { createOpticalNoteFrames, isOpticalNoteFrame, readOpticalNoteFrames } from '../../receiz/optical-note-frames';
import { formatMoney } from '../../core/money';
import { AmountInput } from '../../components/AmountInput';
import { bankOperationDollars } from '../../receiz/bank-operations';
import { PaymentScanner } from './PaymentScanner';
import { WalletPaymentReview } from './WalletSendOperation';
import { WalletPaymentCode, type OpticalFrames } from './WalletPaymentCode';

const walletError=(cause:unknown)=>{
  if(cause instanceof Error){
    if(cause.message===WALLET_RECEIPT_RETENTION_REQUIRED)return 'Wallet couldn’t save the payment proof. Scan the payment again.';
    if(cause.message===WALLET_STALE_ALLOCATION)return 'This balance has older payment history. Use another available balance or scan a newer payment proof.';
    if(cause.message==='BANK_WALLET_FUNDED_RECIPIENT_REQUIRED')return 'No funded offline payment is available for this recipient on this device.';
    if(cause.message==='BANK_WALLET_DEVICE_REQUIRED')return 'This device couldn’t open secure offline Wallet custody.';
    if(cause.message==='BANK_WALLET_MOVE_BACK_AMOUNT')return 'Enter an amount within your available offline balance.';
    if(cause.message==='BANK_WALLET_MOVE_BACK_PENDING')return 'Finish moving back the previous amount first.';
  }
  return 'Wallet could not open or complete this payment. Any accepted payment remains saved on this device.';
};
const pairFrames=(value:unknown)=>createOpticalNoteFrames('wallet',new TextEncoder().encode(JSON.stringify(value)));

type OfflineBalance = Awaited<ReturnType<Awaited<ReturnType<NonNullable<OpenIdentity['fundedWallet']>>>['offlineBalance']>>;

export function FundedWalletBalance({identity,onRefresh}:{identity:OpenIdentity;onRefresh:()=>void}){
  const [balance,setBalance]=useState<OfflineBalance|null>(null);
  const [online,setOnline]=useState(()=>navigator.onLine!==false);
  const [editing,setEditing]=useState<'add'|'moveBack'|null>(null),[amount,setAmount]=useState('');
  const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');
  const running=useRef(false),formId=useId();
  useEffect(()=>{
    let active=true;
    const refresh=async()=>{
      setOnline(navigator.onLine!==false);
      try{
        const wallet=await identity.fundedWallet!();
        const current=await wallet.offlineBalance();
        if(active)setBalance(current);
      }catch(cause){if(active)setError(walletError(cause));}
    };
    void refresh();
    window.addEventListener('online',refresh);
    window.addEventListener('offline',refresh);
    return()=>{active=false;window.removeEventListener('online',refresh);window.removeEventListener('offline',refresh);};
  },[identity]);
  const movingBack=balance?.movingBackUsdCents;
  function edit(next:NonNullable<typeof editing>){
    setEditing(editing===next?null:next);setAmount('');setMessage('');setError('');
  }
  async function change(moveBack:boolean){
    if(running.current||navigator.onLine===false)return;
    running.current=true;setBusy(true);setError('');setMessage('');
    try{
      const wallet=await identity.fundedWallet!();
      if(moveBack){
        const result=await wallet.moveBack(movingBack??bankOperationDollars(amount));
        setMessage(result.status==='published'?'Funds moved back.':'Move back is pending.');
      }else{
        await wallet.prepareOffline(bankOperationDollars(amount));
        setMessage('Ready to send offline.');
      }
      setEditing(null);setAmount('');
      setBalance(await wallet.offlineBalance());
      onRefresh();
    }catch(cause){
      setError(walletError(cause));
      const wallet=await identity.fundedWallet!().catch(()=>null);
      if(wallet)setBalance(await wallet.offlineBalance().catch(()=>balance));
    }finally{running.current=false;setBusy(false);}
  }
  return <section className="detail-list wallet-offline-balance" aria-label="Offline balance">
    <div>
      <span>Available offline</span>
      <div className="wallet-offline-balance-controls">
        <strong aria-live="polite">{balance?formatMoney(balance.availableUsdCents):'—'}</strong>
        <button type="button" className="icon-button" aria-label="Enable more funds offline" title="Enable offline"
          aria-expanded={editing==='add'} aria-controls={editing==='add'?formId:undefined}
          disabled={!balance||busy||!online||!!movingBack} onClick={()=>edit('add')}><Plus size={18} aria-hidden="true"/></button>
        <button type="button" className="icon-button" aria-label="Move back" title="Move back"
          aria-expanded={editing==='moveBack'} aria-controls={editing==='moveBack'?formId:undefined}
          disabled={!balance||balance.availableUsdCents==='0'||busy||!online||!!movingBack} onClick={()=>edit('moveBack')}><Minus size={18} aria-hidden="true"/></button>
      </div>
    </div>
    {movingBack?<button type="button" className="secondary-button" disabled={busy||!online}
      onClick={()=>void change(true)}>Finish moving back {formatMoney(movingBack)}</button>:
      editing&&<form id={formId} onSubmit={event=>{event.preventDefault();void change(editing==='moveBack');}}>
        <AmountInput label={editing==='add'?'Amount to enable offline':'Amount to move back'} dollars value={amount} onChange={setAmount} disabled={busy||!online}/>
        {editing==='add'&&<p className="body-copy small-copy">Send this amount offline from this device.</p>}
        <button className="primary-button" disabled={busy||!online||!amount.trim()}>{editing==='add'?'Enable offline':'Move back funds'}</button>
      </form>}
    {!online&&<p className="body-copy small-copy">Connect to enable offline funds or move them back.</p>}
    {message&&<p role="status" className="body-copy">{message}</p>}
    {error&&<p role="alert" className="error-message">{error}</p>}
  </section>;
}

export function FundedWalletSend({identity,request,onRefresh,onNext,initialReview,onEdit,children}:{
  identity:OpenIdentity; request:()=>{recipient:string;amountUsdCents:string;note?:string;nearby:boolean};
  onRefresh:()=>void;onNext:()=>void;initialReview?:FundedWalletReview;onEdit?:()=>void;children:ReactNode;
}){
  const [review,setReview]=useState<FundedWalletReview|null>(initialReview??null),[result,setResult]=useState<{qr:OpticalFrames|null;operationId:string}|null>(null);
  const [pairing,setPairing]=useState<{offer:WalletOffer;frames:OpticalFrames;input:ReturnType<typeof request>}|null>(null);
  const pairReader=useRef(readOpticalNoteFrames('wallet'));
  const [pendingBundle,setPendingBundle]=useState<string|null>(null);
  const [error,setError]=useState(''),[busy,setBusy]=useState(false),[approved,setApproved]=useState(false);
  const running=useRef(false);
  useEffect(()=>{
    let current=true;
    void identity.fundedWallet!().then(async wallet=>{
      const saved=await wallet.outgoing();
      const pending=saved?null:await wallet.pendingBundle?.();
      if(current){if(saved)setResult(saved);setPendingBundle(pending??null);}
    }).catch(cause=>{if(current)setError(walletError(cause));});
    return()=>{current=false;};
  },[identity]);
  async function act(work:()=>Promise<void>){
    if(running.current)return;
    running.current=true;setError('');setBusy(true);
    try{await work();}catch(error){setError(walletError(error));}finally{running.current=false;setBusy(false);}
  }
  const errors=error&&<p className="error-message" role="alert">{error}</p>;
  async function scanReply(bytes:Uint8Array){
    if(!pairing||!isOpticalNoteFrame(bytes))return false;
    try{
      const pending=pairReader.current.push(bytes);if(!pending)return false;
      const reply=readWalletPairing((await pending).bytes);
      if((reply?.schema!=='bankeiz.wallet.answer.v1'&&reply?.schema!=='bankeiz.wallet.answer.v2')||JSON.stringify(reply.offer)!==JSON.stringify(pairing.offer))throw Error('BANK_WALLET_PAIRING_INVALID');
      await act(async()=>{const wallet=await identity.fundedWallet!();setReview(await wallet.review({...pairing.input,paired:reply}));setPairing(null);});
    }catch(cause){setError(walletError(cause));}
    pairReader.current=readOpticalNoteFrames('wallet');return true;
  }
  if(result)return <section className="native-operation-result" aria-live="polite">
    <h1 className="sheet-hero">{result.qr?'Show payment QR.':'Payment kept on this device.'}</h1>
    {result.qr?<WalletPaymentCode frames={result.qr} label="Wallet payment QR" onError={cause=>setError(walletError(cause))}/>:
      <p className="body-copy">Wallet will deliver the signed payment when this device reconnects.</p>}
    <button className="secondary-button" disabled={busy} onClick={()=>void act(async()=>{
      const wallet=await identity.fundedWallet!();await wallet.completeOutgoing(result.operationId);
      setResult(null);setPendingBundle(null);setReview(null);setApproved(false);onNext();
    })}>Send another payment</button>
    {errors}
  </section>;
  if(pendingBundle&&!review)return <section className="native-operation-result">
    <h1 className="sheet-hero">Continue payment.</h1>
    <p className="body-copy">{formatMoney(pendingBundle)} is saved for this recipient.</p>
    <button type="button" className="primary-button" disabled={busy} onClick={()=>void act(async()=>{
      const wallet=await identity.fundedWallet!();
      try{setResult(await wallet.resumeBundle());onRefresh();}
      finally{setPendingBundle(await wallet.pendingBundle());}
    })}>Continue payment</button>{errors}
  </section>;
  if(review)return <WalletPaymentReview offline review={review} busy={busy} approved={approved} onApprove={setApproved}
    onEdit={()=>{setReview(null);setApproved(false);onEdit?.();}}
    onSend={()=>{if(approved)void act(async()=>{const wallet=await identity.fundedWallet!();setResult(await wallet.confirm(review));onRefresh();});}}>
    {errors}
  </WalletPaymentReview>;
  if(pairing)return <section className="native-operation-result">
    <h1 className="sheet-hero">Pair with the recipient.</h1>
    <p className="body-copy">Show this QR to the recipient, then scan their reply.</p>
    <WalletPaymentCode frames={pairing.frames} label="Wallet pairing QR" onError={cause=>setError(walletError(cause))}/>
    <PaymentScanner compact onBytes={scanReply}/>
    <button type="button" className="text-button" onClick={()=>setPairing(null)}>Edit payment</button>{errors}
  </section>;
  return <><fieldset className="native-operation-fields" disabled={busy}>{children}</fieldset>
    <button className="primary-button" disabled={busy} onClick={()=>void act(async()=>{
      const wallet=await identity.fundedWallet!(),input=request();
      try{setReview(await wallet.review(input));}catch(cause){
        if(!(cause instanceof Error)||cause.message!=='BANK_WALLET_FUNDED_RECIPIENT_REQUIRED')throw cause;
        const offer=await wallet.offer(input);if(!offer)throw cause;
        setPairing({offer,input,frames:await pairFrames(offer)});
      }
    })}>
      {busy?'Checking payment…':'Review payment'}
    </button>{errors}</>;
}

export function FundedWalletReceive({identity,offline,onRefresh}:{identity:OpenIdentity;offline:boolean;onRefresh:()=>void}){
  const panelId=useId();
  const [expanded,setExpanded]=useState(offline);
  useEffect(()=>{if(offline)setExpanded(true);},[offline]);
  const reader=useRef(readOpticalNoteFrames('wallet'));
  const [status,setStatus]=useState(''),[error,setError]=useState('');
  const [received,setReceived]=useState<{allocationId:string}|null>(null);
  const [reply,setReply]=useState<OpticalFrames|null>(null);
  const [receiptProof,setReceiptProof]=useState<{frames:OpticalFrames;index:number}|null>(null);
  const [receiptCount,setReceiptCount]=useState(0);
  const [offer,setOffer]=useState<WalletOffer|null>(null);
  const [busy,setBusy]=useState(false);
  const active=useRef(true);
  useEffect(()=>{
    let current=true;
    active.current=true;
    void identity.fundedWallet!().then(async wallet=>{
      const [value,count]=await Promise.all([wallet.availableReceipt(),wallet.receiptProofCount?.()]);
      if(current){setReceived(value);setReceiptCount(count??0);}
    }).catch(()=>{});
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
      const pair=readWalletPairing(proof.bytes);
      if(pair){
        if(pair.schema!=='bankeiz.wallet.offer.v1'&&pair.schema!=='bankeiz.wallet.offer.v2')throw Error('BANK_WALLET_PAIRING_INVALID');
        if(active.current){setOffer(pair);reader.current=readOpticalNoteFrames('wallet');setError('');}
        return true;
      }
      const outcome=await wallet.receive(proof.bytes).then(
        payment=>({kind:'received',payment} as const),
        async cause=>{
          if(!(cause instanceof Error)||cause.message!=='ACCOUNT_FINANCIAL_SOURCE_WALLET_RECIPIENT')throw cause;
          const recovered=await wallet.recoverWalletProof(proof.bytes);
          if(recovered===null)throw cause;
          return {kind:'recovered',recovered} as const;
        },
      );
      if(active.current){
        reader.current=readOpticalNoteFrames('wallet');
        setError('');
        setReply(null);
        if(outcome.kind==='recovered'){
          setStatus(outcome.recovered>0?'Wallet history recovered.':'Wallet already holds this payment proof.');
        }else{
          const {payment}=outcome;
          const spendable=BigInt(payment.wallet.availableUsdCents)>0n;
          setReceiptCount(count=>Math.max(1,count));
          void wallet.receiptProofCount?.().then(count=>{if(active.current)setReceiptCount(count);}).catch(()=>{});
          setReceived(spendable&&(!('bundle' in payment)||!payment.bundle)?payment:null);
          setStatus(spendable?`${formatMoney(payment.wallet.availableUsdCents)} available to send from this device.`:'Wallet has already recorded this payment.');
        }
        onRefresh();
      }
      return true;
    }catch(cause){
      if(active.current){setError(walletError(cause));reader.current=readOpticalNoteFrames('wallet');}
      return true;
    }
  }
  async function approveOffer(){
    if(!offer||busy)return;
    setBusy(true);setError('');
    try{
      const wallet=await identity.fundedWallet!();
      const frames=await pairFrames(await wallet.answer(offer));
      if(active.current){setReply(frames);setOffer(null);}
    }catch(cause){if(active.current)setError(walletError(cause));}
    finally{if(active.current)setBusy(false);}
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
  async function showReceipt(index=0){
    setError('');
    try{
      const wallet=await identity.fundedWallet!(),frames=await wallet.receiptQr(index);
      if(active.current&&frames)setReceiptProof({frames,index});
    }catch(cause){if(active.current)setError(walletError(cause));}
  }
  return <section className="receive-nearby">
    <button type="button" className="receive-nearby-toggle" aria-controls={panelId} aria-expanded={expanded} onClick={()=>setExpanded(value=>!value)}>
      <QrCode size={16} aria-hidden="true"/><span>Receive nearby</span><ChevronDown size={16} aria-hidden="true"/>
    </button>
    <div id={panelId} className="receive-nearby-panel" hidden={!expanded}>{expanded&&<>
      {!offer&&!receiptProof&&<>
        <p className="body-copy small-copy">Scan the sender’s payment QR. Works offline.</p>
        <PaymentScanner imageLabel="Use QR image" onBytes={scan}/>
      </>}
    {offer&&<><p className="body-copy">Approve receiving {formatMoney(offer.amountUsdCents)} on this device.</p>
      <button type="button" className="primary-button" disabled={busy} onClick={()=>void approveOffer()}>Approve receiving</button>
      <button type="button" className="text-button" disabled={busy} onClick={()=>setOffer(null)}>Cancel</button></>}
    {reply&&<><p className="body-copy">Show this reply to the sender, then scan their payment QR.</p>
      <WalletPaymentCode frames={reply} label="Wallet recipient reply QR" onError={cause=>setError(walletError(cause))}/></>}
    {status&&<p className="body-copy small-copy" role="status">{status}</p>}
    {error&&<p className="error-message" role="alert">{error}</p>}
    {receiptCount>0&&!receiptProof&&<button type="button" className="text-button" onClick={()=>void showReceipt()}>Show payment proof</button>}
    {receiptProof&&<><WalletPaymentCode frames={receiptProof.frames} label="Wallet payment proof QR" onError={cause=>setError(walletError(cause))}/>
      {receiptProof.index+1<receiptCount&&<button type="button" className="text-button" onClick={()=>void showReceipt(receiptProof.index+1)}>Older payment</button>}
      {receiptProof.index>0&&<button type="button" className="text-button" onClick={()=>void showReceipt(receiptProof.index-1)}>Newer payment</button>}
      <button type="button" className="text-button" onClick={()=>setReceiptProof(null)}>Done</button></>}
    {received&&<button className="text-button" onClick={()=>void release()} disabled={busy}>Sync to account</button>}
    </>}</div>
  </section>;
}
