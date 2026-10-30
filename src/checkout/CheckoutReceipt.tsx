import {profileUsernameLabel} from '../receiz/account-name';
import {meetingPaymentReturn} from '../receiz/meeting-payment-return';
import {CopyFeedbackIcon,useCopyFeedback} from '../components/CopyFeedback';
import {useState} from 'react';
import {Check,Download,ArrowUpRight} from 'lucide-react';
import type {CheckoutReceipt as Receipt} from '../receiz/checkout-state';
import type {OpenIdentity} from '../receiz/native-identity';
import {formatMoney} from '../core/money';
import {saveIdentityRecord} from './CheckoutIdentity';
export function CheckoutReceipt({receipt,identity,onAgain}:{receipt:Receipt;identity:OpenIdentity|null;onAgain():void}){
 const [returnMeeting]=useState(()=>meetingPaymentReturn(receipt.fixedSale));
 const {copied,confirm,clear}=useCopyFeedback(receipt.clientNonce),[copyError,setCopyError]=useState(false);
 function save(){const url=URL.createObjectURL(new Blob([JSON.stringify(receipt,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=`payment-${receipt.clientNonce}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 return <section className="checkout-complete" aria-live="polite"><span className="checkout-success"><Check size={28}/></span><p className="checkout-eyebrow">Payment recorded</p><h1>Payment complete.</h1><strong className="checkout-paid-amount">{formatMoney(receipt.amountUsdCents)}</strong><p>To @{profileUsernameLabel(receipt.recipient.username)}</p><dl className="checkout-receipt-details"><div><dt>Paid with</dt><dd>{receipt.method==='card'?'Card':receipt.method==='note'?'Note':'Balance'}</dd></div>{receipt.recordedAt&&<div><dt>Recorded</dt><dd>{new Date(receipt.recordedAt).toLocaleString()}</dd></div>}<div className="checkout-reference"><dt>Payment reference</dt><dd><code>{receipt.clientNonce}</code><button type="button" aria-label={copied?'Payment reference copied':'Copy payment reference'} onClick={()=>void navigator.clipboard.writeText(receipt.clientNonce).then(()=>{confirm();setCopyError(false);}).catch(()=>{clear();setCopyError(true);})}><CopyFeedbackIcon copied={copied} size={15}/></button></dd></div></dl>{copyError&&<p className="checkout-caption" role="status">Select and copy the reference above.</p>}<button className="secondary-button" onClick={save}><Download size={16}/>Save receipt</button>{identity&&<button className="primary-button" onClick={()=>saveIdentityRecord(identity)}><Download size={17}/>Save Identity Record</button>}<p className="checkout-caption">Your account is already on this device. Your Identity Record lets you take it with you.</p><a className="checkout-open-bank" href={returnMeeting??'/'}>{returnMeeting?'Return to meeting':'Open Bankeiz'}<ArrowUpRight size={15}/></a>{!receipt.fixedSale&&<button type="button" className="checkout-text-button" onClick={onAgain}>Make another payment</button>}</section>;
}
