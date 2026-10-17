import {useEffect,useState} from 'react';
import {ArrowLeft,ArrowUpRight,Check,Copy,FileCheck2,Link2} from 'lucide-react';
import {readReceiptLink,type LedgerReceipt} from '../../receiz/ledger-receipts';
import {formatMoney} from '../../core/money';
import './receipt.css';
export function ReceiptView({onBack}:{onBack():void}){
 const [receipt,setReceipt]=useState<LedgerReceipt|null>(null),[error,setError]=useState(''),[notice,setNotice]=useState('');
 useEffect(()=>{try{setReceipt(readReceiptLink(location.href));setError('');}catch{setError('This receipt link is incomplete or unsupported. Ask the sender for the original link.');}},[]);
 const copy=async()=>{try{await navigator.clipboard.writeText(location.href);setNotice('Receipt link copied.');}catch{setNotice('Copy the receipt link from your address bar.');}};
 if(error)return <main className="receipt-page"><div className="receipt-error"><FileCheck2 size={30}/><h1>Receipt unavailable.</h1><p>{error}</p><button onClick={onBack}>Return to bank<ArrowLeft size={16}/></button></div></main>;
 if(!receipt)return null;
 const transfer=/transfer|send|payment/i.test(receipt.kind),amount=receipt.amountUsdCents===null?'Recorded activity':formatMoney(receipt.amountUsdCents);
 return <main className="receipt-page"><header className="receipt-header"><button onClick={onBack} className="receipt-back" aria-label="Return to ledger"><ArrowLeft size={18}/></button><a href="/" className="receipt-brand">Bankeiz</a><button onClick={()=>void copy()} className="receipt-copy" aria-label="Copy receipt link" title="Copy receipt link">{notice.startsWith('Receipt link copied')?<Check size={17}/>:<Copy size={17}/>}</button></header>
 <article className="transaction-receipt" aria-label="Transaction receipt"><div className="receipt-topline"><span>Transaction receipt</span><span><FileCheck2 size={14}/>Source record</span></div>
 <div className="receipt-value"><span className="receipt-symbol"><ArrowUpRight size={25} strokeWidth={1.25}/></span><p>{transfer?'Value transferred':receipt.kind.replace(/[_\.]/g,' ')}</p><h1 style={{fontSize:`clamp(18px, min(10.5vw, ${Math.min(64,700/amount.length)}px), 64px)`}}>{amount}</h1>{receipt.time&&<time>{new Date(receipt.time).toLocaleString(undefined,{month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'})}</time>}</div>
 <dl className="receipt-facts">{receipt.sender&&<div><dt>From</dt><dd title={receipt.sender}>{receipt.sender}</dd></div>}{receipt.recipient&&<div><dt>To</dt><dd title={receipt.recipient}>{receipt.recipient}</dd></div>}<div><dt>Reference</dt><dd className="receipt-mono" title={receipt.id}>{receipt.id}</dd></div><div><dt>☤KAI</dt><dd className="receipt-mono">{receipt.pulse??'Not carried by source'}</dd></div>{receipt.kaiUpulse&&<div><dt>µ☤KAI</dt><dd className="receipt-mono">{receipt.kaiUpulse}</dd></div>}</dl>
 <footer className="receipt-source"><Link2 size={17} strokeWidth={1.5}/><div><strong>The record stays connected.</strong><p>{receipt.sourceUrl?'Inspect the original transaction source.':'This link carries the selected ledger entry.'}</p></div>{receipt.sourceUrl&&<a href={receipt.sourceUrl} target="_blank" rel="noreferrer" aria-label="Inspect original receipt" title="Inspect original receipt"><ArrowUpRight size={18}/></a>}</footer>
 </article><p className="receipt-caption">Transaction record · Account access and available funds are not shared.</p><p className="receipt-status" role="status">{notice}</p><div className="receipt-signature">Reality-Grade Banking</div></main>;
}
