import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { ChevronDown, Minus, Plus, QrCode } from 'lucide-react';
import type { OpenIdentity } from '../../receiz/native-identity';
import { readWalletPairing, WALLET_RECEIPT_RETENTION_REQUIRED, WALLET_STALE_ALLOCATION, type FundedWalletReview, type WalletOffer } from '../../receiz/funded-wallet';
import { createOpticalNoteFrames, isOpticalNoteFrame, readOpticalNoteFrames } from '../../receiz/optical-note-frames';
import { formatMoney } from '../../core/money';
import type { DeferredWalletSendEntry, DeferredWalletSendReview } from '../../receiz/wallet-send-deferred';
import { AmountInput } from '../../components/AmountInput';
import { bankOperationDollars } from '../../receiz/bank-operations';
import { PaymentScanner } from './PaymentScanner';
import { WalletPaymentReview } from './WalletSendOperation';
import { WalletPaymentCode, createNearbyPaymentCode, type NearbyPaymentCode, type OpticalFrames } from './WalletPaymentCode';
import { isNearbyWalletPayment, type NearbyWalletPayment } from '../../receiz/wallet-nearby-consent';
import { nearbyPaymentLinkBytes, readNearbyPaymentLink } from '../../receiz/wallet-nearby-link';
import { walletBalanceNotice, type WalletBalanceNotice } from './wallet-balance-notice';
import {OfflineCashOptions} from './OfflineCashOptions';

const walletError=(cause:unknown)=>{
  if(cause instanceof Error){
    if(cause.message===WALLET_RECEIPT_RETENTION_REQUIRED)return 'Wallet couldn’t save the payment proof. Scan the payment again.';
    if(cause.message===WALLET_STALE_ALLOCATION)return 'This balance has older payment history. Use another available balance or scan a newer payment proof.';
    if(cause.message==='BANK_WALLET_FUNDED_RECIPIENT_REQUIRED')return 'No funded offline payment is available for this recipient on this device.';
    if(cause.message==='BANK_WALLET_DEVICE_REQUIRED')return 'This device couldn’t open secure offline Wallet custody.';
    if(cause.message==='BANK_WALLET_MOVE_BACK_AMOUNT')return 'Enter an amount within your available offline balance.';
    if(cause.message==='BANK_WALLET_MOVE_BACK_PENDING')return 'Finish moving back the previous amount first.';
    if(cause.message==='BANK_WALLET_NEARBY_WRONG_RECIPIENT')return 'This payment QR is addressed to another account.';
    if(cause.message==='BANK_WALLET_QUEUE_AMOUNT_UNAVAILABLE')return 'Choose an amount within your last available balance, after pending payments.';
  }
  return 'Wallet could not open or complete this payment. Any accepted payment remains saved on this device.';
};
function readNearbyPacket(bytes:Uint8Array):NearbyWalletPayment|null{
  if(bytes[0]!==123)return null;
  const packet:unknown=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
  return isNearbyWalletPayment(packet)?packet as NearbyWalletPayment:null;
}
const connectionReplySchema='bankeiz.wallet.confirm-on-connection.v1';
function connectionReply(bytes:Uint8Array, offer:WalletOffer){
  if(bytes[0]!==123)return false;
  const value=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
  return value?.schema===connectionReplySchema&&Object.keys(value).length===2
    && JSON.stringify(value.offer)===JSON.stringify(offer);
}
const pairFrames=(value:unknown)=>createOpticalNoteFrames('wallet',new TextEncoder().encode(JSON.stringify(value)));
const fundedWalletUnavailable=(cause:unknown)=>cause instanceof Error
  && ['BANK_WALLET_ACCOUNT_REQUIRED','BANK_WALLET_DEVICE_REQUIRED'].includes(cause.message);

type OfflineBalance = Awaited<ReturnType<Awaited<ReturnType<NonNullable<OpenIdentity['fundedWallet']>>>['offlineBalance']>>;

export function FundedWalletBalance({identity,onRefresh,onSendNearby}:{identity:OpenIdentity;onRefresh:()=>void;onSendNearby?:()=>void}){
  const [balance,setBalance]=useState<OfflineBalance|null>(null);
  const [online,setOnline]=useState(()=>navigator.onLine!==false);
  const [editing,setEditing]=useState<'add'|'moveBack'|null>(null),[amount,setAmount]=useState('');
  const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[notice,setNotice]=useState<WalletBalanceNotice|null>(null);
  const running=useRef(false),formId=useId();
  useEffect(()=>{
    let active=true;
    const refresh=async()=>{
      setOnline(navigator.onLine!==false);
      try{
        const wallet=await identity.fundedWallet!();
        const current=await wallet.offlineBalance();
        if(active)setBalance(current);
      }catch(cause){if(active&&!running.current)setNotice(walletBalanceNotice(cause,'read'));}
    };
    void refresh();
    window.addEventListener('online',refresh);
    window.addEventListener('offline',refresh);
    return()=>{active=false;window.removeEventListener('online',refresh);window.removeEventListener('offline',refresh);};
  },[identity]);
  const movingBack=balance?.movingBackUsdCents;
  const canSendNearby=!!identity.nearbyWalletReceive;
  function edit(next:NonNullable<typeof editing>){
    setEditing(editing===next?null:next);setAmount('');setMessage('');setNotice(null);
  }
  async function change(moveBack:boolean){
    if(running.current||navigator.onLine===false)return;
    running.current=true;setBusy(true);setNotice(null);setMessage('');
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
      setNotice(walletBalanceNotice(cause,moveBack?'moveBack':'enable'));
      const wallet=await identity.fundedWallet!().catch(()=>null);
      if(wallet)setBalance(await wallet.offlineBalance().catch(()=>balance));
    }finally{running.current=false;setBusy(false);}
  }
  return <section className="detail-list wallet-offline-balance" aria-label="Offline cash">
    <div>
      <span>Offline cash</span>
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
        {editing==='add'&&<p className="body-copy small-copy">Use this amount to pay nearby without internet. Your device may ask you to approve setup.</p>}
        <button className="primary-button" disabled={busy||!online||!amount.trim()}>{editing==='add'?'Enable offline':'Move back funds'}</button>
      </form>}
    {!online&&<p className="body-copy small-copy">Connect to enable offline funds or move them back.</p>}
    {message&&<p role="status" className="body-copy">{message}</p>}
    {notice&&<OfflineCashOptions notice={notice} canSendNearby={canSendNearby} onSendNearby={onSendNearby}/>}
  </section>;
}

export function DeferredWalletPayments({identity}:{identity:OpenIdentity}){
  const [entries,setEntries]=useState<readonly DeferredWalletSendEntry[]>([]);
  const [savedCode,setSavedCode]=useState<{id:string;frames:NearbyPaymentCode}|null>(null);
  useEffect(()=>{
    let active=true,unsubscribe:(()=>void)|undefined;
    setEntries([]);
    void identity.deferredWalletSend?.().then(wallet=>{
      if(!active||!wallet.list||!wallet.subscribe)return;
      const refresh=()=>{void wallet.list().then(value=>{if(active)setEntries(value);}).catch(()=>{});};
      unsubscribe=wallet.subscribe(refresh);refresh();
    }).catch(()=>{});
    return()=>{active=false;unsubscribe?.();};
  },[identity]);
  const outstanding=entries.filter(entry=>entry.status!=='recorded');
  if(!outstanding.length)return null;
  return <details className="transaction-proof-details">
    <summary>Saved payments</summary>
    <div className="detail-list">{outstanding.map(entry=><div key={entry.clientNonce}>
      <span>{entry.recipientLabel}<br/><small>{entry.status==='pending'?'Waiting for confirmation':'Not sent'}</small></span>
      <strong>{formatMoney(entry.amountUsdCents)}</strong>
      {entry.payment&&!entry.split&&entry.status==='pending'&&(savedCode?.id===entry.clientNonce
        ? <><WalletPaymentCode frames={savedCode.frames} label="Saved payment QR" onError={()=>setSavedCode(null)}/>
          <button className="text-button" onClick={()=>setSavedCode(null)}>Hide QR</button></>
        : <button className="text-button" onClick={()=>{const payment=entry.payment;if(payment)
          void createNearbyPaymentCode(payment).then(frames=>setSavedCode({id:entry.clientNonce,frames}));}}>Show payment QR</button>)}
    </div>)}</div>
  </details>;
}

export function FundedWalletSend({identity,request,recipientLabel,onRefresh,onNext,initialReview,onEdit,preferNearby=false,children}:{
  identity:OpenIdentity; request:()=>{recipient:string;amountUsdCents:string;note?:string;nearby:boolean};
  recipientLabel?:string;onRefresh:()=>void;onNext:()=>void;initialReview?:FundedWalletReview;onEdit?:()=>void;preferNearby?:boolean;children:ReactNode;
}){
  const [review,setReview]=useState<FundedWalletReview|null>(initialReview??null),[result,setResult]=useState<{qr:OpticalFrames|null;operationId:string}|null>(null);
  const [deferredReview,setDeferredReview]=useState<DeferredWalletSendReview|null>(null);
  const [deferredAmount,setDeferredAmount]=useState<string|null>(null);
  const [nearbyCode,setNearbyCode]=useState<NearbyPaymentCode|null>(null);
  const [pairing,setPairing]=useState<{offer:WalletOffer;frames:OpticalFrames;input:ReturnType<typeof request>}|null>(null);
  const [connectionNotice,setConnectionNotice]=useState('');
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
    }).catch(cause=>{if(current&&!fundedWalletUnavailable(cause))setError(walletError(cause));});
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
      const exact=(await pending).bytes;
      if(identity.deferredWalletSend&&connectionReply(exact,pairing.offer)){
        await act(async()=>{
          const wallet=await identity.deferredWalletSend!();
          setDeferredReview(await wallet.prepare(pairing.input,recipientLabel,true));
          setPairing(null);
        });
        pairReader.current=readOpticalNoteFrames('wallet');
        return true;
      }
      const reply=readWalletPairing(exact);
      if((reply?.schema!=='bankeiz.wallet.answer.v1'&&reply?.schema!=='bankeiz.wallet.answer.v2')||JSON.stringify(reply.offer)!==JSON.stringify(pairing.offer))throw Error('BANK_WALLET_PAIRING_INVALID');
      await act(async()=>{const wallet=await identity.fundedWallet!();setReview(await wallet.review({...pairing.input,paired:reply}));setPairing(null);});
    }catch(cause){setError(walletError(cause));}
    pairReader.current=readOpticalNoteFrames('wallet');return true;
  }
  if(result)return <section className="native-operation-result" aria-live="polite">
    <h1 className="sheet-hero">{result.qr?'Show payment QR.':'Payment kept on this device.'}</h1>
    {result.qr?<><p className="body-copy small-copy">Ask the recipient to scan this code in Bankeiz under Receive nearby.</p>
      <WalletPaymentCode frames={result.qr} label="Wallet payment QR" onError={cause=>setError(walletError(cause))}/></>:
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
  if(nearbyCode)return <section className="native-operation-result" aria-live="polite">
    <h1 className="sheet-hero">Show payment QR.</h1>
    <p className="body-copy">The recipient can save this payment now and use the funds once they connect and it’s confirmed.</p>
    <p className="body-copy small-copy">{typeof nearbyCode==='string'?'Scan in Bankeiz or open the link from your camera.':'Scan in Bankeiz using Receive nearby.'}</p>
    <WalletPaymentCode frames={nearbyCode} label="Wallet payment QR" onError={cause=>setError(walletError(cause))}/>
    <button className="secondary-button" onClick={()=>{setNearbyCode(null);onNext();}}>Send another payment</button>
    {errors}
  </section>;
  if(deferredAmount)return <section className="native-operation-result" aria-live="polite">
    <h1 className="sheet-hero">Payment saved.</h1>
    <p className="body-copy">Wallet will send {formatMoney(deferredAmount)} when you reconnect and the balance is available.</p>
    <button className="secondary-button" onClick={()=>{setDeferredAmount(null);onNext();}}>Send another payment</button>
  </section>;
  if(deferredReview)return <WalletPaymentReview deferred={!deferredReview.nearby} nearby={deferredReview.nearby} review={deferredReview} approved={approved} busy={busy} onApprove={setApproved}
    onEdit={()=>{setDeferredReview(null);setApproved(false);onEdit?.();}}
    onSend={()=>{if(approved)void act(async()=>{
      const wallet=await identity.deferredWalletSend!();
      const entry=await wallet.approve(deferredReview,deferredReview.confirmationDigest);
      if(deferredReview.nearby){
        if(!entry?.payment)throw Error('BANK_WALLET_QUEUE_INVALID');
        setNearbyCode(await createNearbyPaymentCode(entry.payment));
      }else setDeferredAmount(deferredReview.amountUsdCents);
      setDeferredReview(null);setApproved(false);
      void wallet.resume().catch(()=>{});
    });}}>{errors}</WalletPaymentReview>;
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
    <button type="button" className="text-button" onClick={()=>{setPairing(null);onEdit?.();}}>Edit payment</button>{errors}
  </section>;
  function preparePayment(nearbyOverride?:boolean){
    return act(async()=>{
      setConnectionNotice('');
      const draft=request();
      const input={...draft,nearby:nearbyOverride??draft.nearby};
      try{
        const wallet=await identity.fundedWallet!();
        try{
          setReview(await wallet.review(input));
          return;
        }catch(cause){
          if(!(cause instanceof Error)||cause.message!=='BANK_WALLET_FUNDED_RECIPIENT_REQUIRED')throw cause;
        }
        const offer=await wallet.offer({...input,connectRemainder:!!identity.deferredWalletSend});
        if(offer){
          setPairing({offer,input,frames:await pairFrames(offer)});
          return;
        }
      }catch(cause){
        if(!fundedWalletUnavailable(cause))throw cause;
      }
      if(identity.deferredWalletSend){
        try{
          const deferred=await identity.deferredWalletSend();
          setDeferredReview(await (input.nearby?deferred.prepare(input,recipientLabel,true):deferred.prepare(input,recipientLabel)));
          return;
        }catch(cause){
          if(!(cause instanceof Error)||!['BANK_WALLET_QUEUE_RECIPIENT_REQUIRED','BANK_WALLET_QUEUE_BALANCE_REQUIRED'].includes(cause.message))throw cause;
          setConnectionNotice(cause.message==='BANK_WALLET_QUEUE_RECIPIENT_REQUIRED'
            ? 'Scan the recipient’s Receive QR to find them offline.'
            : 'Open your balance while connected once to prepare this device for offline payments.');
          return;
        }
      }
      setConnectionNotice('Connect to pay from your balance.');
      onEdit?.();
    });
  }
  return <><fieldset className="native-operation-fields" disabled={busy}>{children}</fieldset>
    <button type="button" className="primary-button" disabled={busy} onClick={()=>void preparePayment(preferNearby?true:undefined)}>
      {busy?'Checking payment…':preferNearby?'Create a payment QR':'Review payment'}
    </button>
    {preferNearby&&<button type="button" className="text-button" disabled={busy} onClick={()=>void preparePayment(false)}>Send when I reconnect</button>}
    {connectionNotice&&<p className="body-copy small-copy" role="status">{connectionNotice}</p>}{errors}</>;
}

export function FundedWalletReceive({identity,offline,onRefresh,linkedPayment,onLinkedPaymentSaved}:{
  identity:OpenIdentity;offline:boolean;onRefresh:()=>void;linkedPayment?:string;onLinkedPaymentSaved?:()=>void;
}){
  const panelId=useId();
  const [expanded,setExpanded]=useState(offline||!!linkedPayment);
  const [savedLink,setSavedLink]=useState<string>();
  const paymentToAccept=linkedPayment&&linkedPayment!==savedLink?linkedPayment:undefined;
  useEffect(()=>{if(offline||linkedPayment)setExpanded(true);},[offline,linkedPayment]);
  const reader=useRef(readOpticalNoteFrames('wallet'));
  const [status,setStatus]=useState(''),[error,setError]=useState('');
  const [received,setReceived]=useState<{allocationId:string}|null>(null);
  const [reply,setReply]=useState<OpticalFrames|null>(null);
  const [receiptProof,setReceiptProof]=useState<{frames:OpticalFrames;index:number}|null>(null);
  const [receiptCount,setReceiptCount]=useState(0);
  const [nearbyReceipts,setNearbyReceipts]=useState<readonly {payment:NearbyWalletPayment;original?:unknown}[]>([]);
  const latestRefresh=useRef(onRefresh);
  latestRefresh.current=onRefresh;
  useEffect(()=>{
    let current=true,unsubscribe:(()=>void)|undefined;
    void identity.nearbyWalletReceive?.().then(inbox=>{
      if(!current)return;
      const update=()=>{void inbox.list().then(rows=>{if(current)setNearbyReceipts(rows);}).catch(()=>{});};
      unsubscribe=inbox.subscribe(()=>{update();latestRefresh.current();});
      update();
      if(!offline)void inbox.resume().catch(()=>{});
    }).catch(()=>{});
    return()=>{current=false;unsubscribe?.();};
  },[identity,offline]);
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
  async function saveNearby(packet:NearbyWalletPayment|null){
    if(!packet||!identity.nearbyWalletReceive)throw Error('BANK_WALLET_NEARBY_CONSENT_INVALID');
    const inbox=await identity.nearbyWalletReceive();
    if(!active.current)return;
    const entry=await inbox.receive(packet);
    if(!active.current)return;
    reader.current=readOpticalNoteFrames('wallet');
    setReply(null);
    setError('');
    setStatus(entry.original?'Payment already confirmed.':'Payment saved on this device.');
    void inbox.resume().catch(()=>{});
  }
  async function acceptLink(){
    if(!paymentToAccept||busy)return;
    setBusy(true);setError('');
    try{
      const bytes=nearbyPaymentLinkBytes(paymentToAccept);
      if(!bytes)throw Error('BANK_WALLET_NEARBY_CONSENT_INVALID');
      await saveNearby(readNearbyPacket(bytes));
      if(active.current){setSavedLink(paymentToAccept);onLinkedPaymentSaved?.();}
    }catch(cause){if(active.current)setError(walletError(cause));}
    finally{if(active.current)setBusy(false);}
  }
  async function scan(bytes:Uint8Array){
    try {
      if(!isOpticalNoteFrame(bytes)){
        const linked=readNearbyPaymentLink(new TextDecoder().decode(bytes));
        if(!linked){
          if(active.current)setStatus('Use the payment QR from the sender’s Send screen.');
          return false;
        }
        await saveNearby(readNearbyPacket(linked));
        return true;
      }
      const next=reader.current.push(bytes);
      if(!next){if(active.current)setStatus(`${reader.current.received} of ${reader.current.count} frames scanned.`);return false;}
      const proof=await next;
      if(!active.current)return true;
      const nearby=readNearbyPacket(proof.bytes);
      if(nearby){
        await saveNearby(nearby);
        return true;
      }
      const pair=readWalletPairing(proof.bytes);
      if(pair){
        if(pair.schema!=='bankeiz.wallet.offer.v1'&&pair.schema!=='bankeiz.wallet.offer.v2')throw Error('BANK_WALLET_PAIRING_INVALID');
        if(active.current){setOffer(pair);reader.current=readOpticalNoteFrames('wallet');setError('');}
        return true;
      }
      const wallet=await identity.fundedWallet!();
      if(!active.current)return true;
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
    setBusy(true);setStatus('');setError('');
    try{
      const wallet=await identity.fundedWallet!();
      const frames=await pairFrames(await wallet.answer(offer));
      if(active.current){setReply(frames);setOffer(null);}
    }catch(cause){
      if(!active.current)return;
      if(fundedWalletUnavailable(cause)&&identity.nearbyWalletReceive&&offer.recipient===identity.walletReceivingAddress?.()){
        setReply(await pairFrames({schema:connectionReplySchema,offer}));
        setOffer(null);
        setStatus('Connect to confirm after you scan the payment.');
      }else if(cause instanceof Error&&cause.message==='BANK_WALLET_DEVICE_REQUIRED'){
        setOffer(null);
        setReply(null);
        setStatus('Offline cash is unavailable for this payment. The sender can complete the payment when they’re online.');
      }else setError(walletError(cause));
    }
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
      {paymentToAccept ? <>
        <p className="body-copy">Save this nearby payment to your account. Once confirmed, it will be available to spend.</p>
        <button className="primary-button" type="button" disabled={busy} onClick={()=>void acceptLink()}>Accept payment</button>
      </> : !offer&&!receiptProof&&<>
        <p className="body-copy small-copy">Scan the sender’s payment QR or use a photo of it. For a moving QR, keep the camera on the code until all frames are scanned.</p>
        <PaymentScanner imageLabel="Use QR image" onBytes={scan}/>
      </>}
    {offer&&<><p className="body-copy">Approve receiving {formatMoney(offer.amountUsdCents)} on this device.</p>
      <button type="button" className="primary-button" disabled={busy} onClick={()=>void approveOffer()}>Approve receiving</button>
      <button type="button" className="text-button" disabled={busy} onClick={()=>setOffer(null)}>Cancel</button></>}
    {reply&&<><p className="body-copy">Show this reply to the sender, then scan their payment QR.</p>
      <WalletPaymentCode frames={reply} label="Wallet recipient reply QR" onError={cause=>setError(walletError(cause))}/></>}
    {status&&<p className="body-copy small-copy" role="status">{status}</p>}
    {nearbyReceipts.length>0&&<div className="detail-list" aria-label="Nearby payment history">
      {nearbyReceipts.slice().reverse().map(({payment,original})=><div key={payment.clientNonce}>
        <span>{original?'Confirmed':offline?'Connect to confirm':'Awaiting confirmation'}
          {payment.split&&<><br/><small>{formatMoney(payment.split.offlineUsdCents)} received as Offline Cash</small></>}
        </span>
        <strong>{formatMoney(payment.amountUsdCents)}</strong>
      </div>)}
    </div>}
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
