import {ArrowDownLeft,ArrowUpRight,Sparkles} from 'lucide-react';
import type {ChatMessage,ChatPerson} from '../../receiz/native-messaging';
import {readMessagePayment} from '../../receiz/message-payment';
import {formatMoney,formatUnits} from '../../core/money';
export function PaymentMessage({message,accountUid,members}:{message:ChatMessage;accountUid:string;members:ChatPerson[]}){
 if(message.walletTransfer?.kind==='bankeiz.meeting.twin')return <div aria-label="Twin reply"><small className="bank-delivery-status"><Sparkles size={12}/>{String(message.walletTransfer.displayName??'Twin')}{Number(message.walletTransfer.parts)>1?` · ${message.walletTransfer.part}/${message.walletTransfer.parts}`:''}</small><p>{message.body}</p></div>;
 const payment=readMessagePayment(message,accountUid);if(!payment)return <p>{message.body}</p>;
 const peer=members.find(person=>person.userId===(payment.direction==='sent'?payment.recipientUserId:payment.senderUserId));
 const name=peer?.displayName||peer?.username||'Receiz account';
 return <article className="bank-chat-payment" aria-label="Recorded money transfer"><span className="bank-chat-payment-mark">{payment.direction==='received'?<ArrowDownLeft size={18}/>:<ArrowUpRight size={18}/>}</span><div><span className="bank-chat-payment-kind">{payment.direction==='sent'?'Money sent':payment.direction==='received'?'Money received':'Money transfer'}</span><strong>{formatMoney(payment.amountUsdCents)}</strong><span className="bank-chat-payment-peer">{payment.direction==='sent'?'To':'From'} {name}</span>{payment.note&&<p className="bank-chat-payment-note">{payment.note}</p>}<details><summary>Payment details</summary><dl><div><dt>Recorded amount</dt><dd>{formatMoney(payment.amountUsdCents)}</dd></div><div><dt>Φ</dt><dd>{formatUnits(payment.amountPhiMicro)}</dd></div>{payment.transferId&&<div><dt>Reference</dt><dd>{payment.transferId}</dd></div>}</dl>{payment.href&&<a href={payment.href} target="_blank" rel="noopener noreferrer">Open transaction<ArrowUpRight size={13}/></a>}</details></div></article>;
}
