import {useEffect,useRef,useState,type ReactNode} from 'react';
import {ArrowRight,Check,ShieldCheck} from 'lucide-react';
import type {OpenIdentity} from '../../receiz/native-identity';
import type {WalletSend,WalletSendOutcome,WalletSendReview} from '../../receiz/wallet-send';
import {bankOperationError,bankOperationFailureDetails} from '../../receiz/bank-operations';
import {BANK_WALLET_SEND_CONSENT} from '../../receiz/config';
import {identityRecordCopy} from '../../content/identity-record-copy.mjs';
import {formatMoney,formatUnits} from '../../core/money';

export function WalletSendRecovery({identity,onRefresh=()=>{}}:{identity:OpenIdentity;onRefresh?:()=>void}){
 const [outcome,setOutcome]=useState<WalletSendOutcome|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),generation=useRef(0),running=useRef(false);
 useEffect(()=>{generation.current++;let current=true;running.current=false;setBusy(false);setOutcome(null);setError('');void identity.walletSend?.().then(api=>api.status()).then(value=>{if(current)setOutcome(value??null);}).catch(()=>{if(current)setError('Saved payment details could not be opened. Keep this device and retry.');});return()=>{current=false;generation.current++;};},[identity]);
 async function act(action:'read'|'save'){
  if(running.current||!identity.walletSend)return;const ticket=generation.current;running.current=true;setBusy(true);setError('');
  try{const api=await identity.walletSend();if(action==='read'){const next=await api.resolve(true);if(ticket===generation.current){setOutcome(next);if(next?.status==='recorded')onRefresh();}}
   else{const file=await api.exportRecord();if(ticket!==generation.current)return;const url=URL.createObjectURL(new Blob([new Uint8Array(file.bytes)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=file.filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}}
  catch{if(ticket===generation.current)setError('The payment record could not be opened. The original request stays saved; checking never sends another payment.');}
  finally{if(ticket===generation.current){running.current=false;setBusy(false);}}
 }
 if(!outcome&&!error)return null;
 return <details className="identity-import"><summary>Wallet payment record</summary>
  {outcome&&<><p className="body-copy small-copy" role="status">{outcome.status==='recorded'?'Wallet recorded this payment. Its complete response and original transaction record are saved on this device.':outcome.status==='not-sent'?'Wallet refused this request before a payment was submitted.':'The payment result is not confirmed. Check the saved reference before another payment.'}</p><code className="proof-coordinate">{outcome.clientNonce}</code>
  {outcome.status==='unknown'&&<><p className="body-copy small-copy">This reads your original payment reference. It does not submit or repeat the payment.</p><button className="secondary-button" disabled={busy} onClick={()=>void act('read')}>{busy?'Checking…':'Check payment outcome'}</button></>}
  {outcome.status==='recorded'&&<button className="secondary-button" disabled={busy} onClick={()=>void act('save')}>Save payment record</button>}</>}
  {error&&<p className="error-message" role="status">{error}</p>}
 </details>;
}

export function WalletSendOperation({identity,input,inputKey,onRefresh,children}:{identity?:OpenIdentity;input():{recipient:string;amountUsdCents:string;note?:string};inputKey:string;onRefresh():void;children:ReactNode}){
 const [review,setReview]=useState<WalletSendReview|null>(null),[outcome,setOutcome]=useState<WalletSendOutcome|null>(null),[approved,setApproved]=useState(false),[busy,setBusy]=useState(false),[ready,setReady]=useState(false),[error,setError]=useState('');
 const [failure,setFailure]=useState<ReturnType<typeof bankOperationFailureDetails>|null>(null),api=useRef<WalletSend|null>(null),held=useRef<WalletSendReview|null>(null),running=useRef(false),generation=useRef(0);
 useEffect(()=>{const ticket=++generation.current;running.current=false;setReady(false);setBusy(false);setReview(null);setOutcome(null);setApproved(false);setError('');setFailure(null);
  if(!identity?.walletSend){setReady(true);return;}
  void identity.walletSend().then(async next=>{const pending=await next.status();if(ticket===generation.current){api.current=next;setOutcome(pending?.status==='unknown'?pending:null);setReady(true);}}).catch(()=>{if(ticket===generation.current){setError('Saved payment details could not be opened. Keep this device and try again.');}});
  return()=>{generation.current++;if(held.current)api.current?.discard(held.current);held.current=null;api.current=null;};
 },[identity,inputKey]);
 const report=(cause:unknown)=>{setError(bankOperationError(cause));setFailure(bankOperationFailureDetails(cause));};
 async function prepare(){if(running.current||!ready)return;const ticket=generation.current;running.current=true;setBusy(true);setError('');setFailure(null);
  try{if(!api.current)throw Error('BANK_OPERATION_RUNTIME_UNAVAILABLE');const next=await api.current.prepare(input());if(ticket!==generation.current){api.current?.discard(next);return;}held.current=next;setReview(next);setApproved(false);}
  catch(cause){if(ticket===generation.current)report(cause);}finally{if(ticket===generation.current){running.current=false;setBusy(false);}}
 }
 async function send(){if(running.current||!approved||!review||!api.current)return;const ticket=generation.current;running.current=true;setBusy(true);setError('');setFailure(null);
  try{const next=await api.current.execute(review,review.digest);if(ticket===generation.current){held.current=null;setReview(null);setOutcome(next);if(next.status==='recorded')onRefresh();}}
  catch(cause){if(ticket===generation.current)report(cause);}finally{if(ticket===generation.current){running.current=false;setBusy(false);}}
 }
 async function check(){if(running.current||!api.current)return;const ticket=generation.current;running.current=true;setBusy(true);setError('');
  try{const next=await api.current.resolve(true);if(ticket===generation.current){setOutcome(next);if(next?.status==='recorded')onRefresh();}}
  catch(cause){if(ticket===generation.current)report(cause);}finally{if(ticket===generation.current){running.current=false;setBusy(false);}}
 }
 const diagnostics=error&&<><p className="error-message" role="status">{error}</p>{failure&&<details className="transaction-proof-details"><summary>Failure details</summary><code>{failure.code}</code>{failure.stage&&<p>Stage: {failure.stage} · {failure.errorName}</p>}{failure.status&&<p>HTTP {failure.status}</p>}<p className="small-copy">These details contain no credentials or account data.</p></details>}</>;
 if(outcome)return <section className="native-operation-result" aria-live="polite">
  {outcome.status==='recorded'&&<div className="status-icon success"><Check size={30}/></div>}
  <h1 className="sheet-hero">{outcome.status==='recorded'?'Payment sent.':outcome.status==='not-sent'?'Payment not sent.':'Confirming your payment.'}</h1>
  <p className="body-copy">{outcome.status==='recorded'?'Wallet recorded your payment. Its transaction record is saved on this device, and your account and Ledger are refreshing.':outcome.status==='not-sent'?'Wallet did not submit this payment. Check your available value and review again.':'Your exact request is saved. Checking its original reference will not send another payment.'}</p>
  {outcome.status==='unknown'?<button className="primary-button" disabled={busy} onClick={()=>void check()}>{busy?'Checking outcome…':'Check payment outcome'}</button>:<button className="secondary-button" onClick={()=>{setOutcome(null);setApproved(false);}}> {outcome.status==='recorded'?'Send another payment':'Review again'}</button>}
  {identity&&<WalletSendRecovery key={outcome.status} identity={identity} onRefresh={onRefresh}/>} {diagnostics}
 </section>;
 if(review)return <section className="native-operation-review"><h1 className="sheet-hero">Review payment.</h1><div className="detail-list">
  <div><span>Recipient</span><strong>{review.recipientLabel}</strong></div><div><span>You send</span><strong>{formatMoney(review.amountUsdCents)}</strong></div>
  <div><span>Φ at this quote</span><strong>{formatUnits(review.quote.amountPhiMicro)} Φ</strong></div>
  <div><span>From</span><strong>{BigInt(review.quote.settledUsdCents)>0n?(BigInt(review.quote.ecosystemUsdCents)>0n?'Composite balance':'Reserve'):'Settlement'}</strong></div>
  {BigInt(review.quote.settledUsdCents)>0n&&BigInt(review.quote.ecosystemUsdCents)>0n&&<><div><span>Reserve</span><strong>{formatMoney(review.quote.settledUsdCents)}</strong></div><div><span>Settlement</span><strong>{formatMoney(review.quote.ecosystemUsdCents)}</strong></div></>}
  {review.note&&<div><span>Public note</span><strong className="send-public-note">{review.note}</strong></div>}
  <div><span>Fee</span><strong>$0.00</strong></div></div>
  <p className="body-copy small-copy">Reserve is used first; Settlement covers the remainder. The dollar amount is fixed. Wallet computes the Φ amount and funding split from your current account when you send.</p>
  <label className="consent-option"><input type="checkbox" checked={approved} disabled={busy} onChange={event=>setApproved(event.target.checked)}/><span>I approve sending {formatMoney(review.amountUsdCents)} to {review.recipientLabel} using this funding rule{review.note?', and publishing the note shown above':''}.</span></label>
  <button className="primary-button" disabled={busy||!approved} onClick={()=>void send()}>{busy?'Sending payment…':'Send payment'}<ArrowRight size={17}/></button>
  <button className="secondary-button" disabled={busy} onClick={()=>{api.current?.discard(review);held.current=null;setReview(null);setApproved(false);}}>Edit details</button>{diagnostics}</section>;
 return <><fieldset className="native-operation-fields" disabled={busy}>{children}</fieldset><div className="note-box"><ShieldCheck size={18}/><p>Review the recipient and amount before approving your payment.</p></div><details className="transaction-proof-details"><summary>Wallet access</summary><p className="small-copy">{identityRecordCopy(BANK_WALLET_SEND_CONSENT)}</p></details>
  <button className="primary-button" disabled={busy||!ready} onClick={()=>void prepare()}>{busy?'Checking payment…':'Review payment'}<ArrowRight size={17}/></button>{diagnostics}</>;
}
