import {useEffect,useMemo,useState} from 'react';
import {ArrowLeft,ArrowUpRight,Check,Copy,FileText,Link2} from 'lucide-react';
import type {PublicRecord} from '../../receiz/public-network';
import type {LedgerValueIndex} from '../../receiz/ledger-value';
import {readReceiptLink,readLocalReceiptContext,releaseLocalReceiptContext,type LedgerReceipt} from '../../receiz/ledger-receipts';
import {formatMoney} from '../../core/money';
import {ledgerValueLabel,type LedgerValueDisplay} from '../../receiz/ledger-value';
import {LedgerInspector} from '../ledger/LedgerInspector';
import {useKaiKlok} from '../../components/useKaiKlok';
import {ledgerCurrentAssetValue} from '../../receiz/ledger-economy';
import {LedgerValueChange} from '../ledger/LedgerValueChange';
import {LedgerFundingTrace} from '../ledger/LedgerFundingTrace';
import './receipt.css';
function ReceiptLiveValue({record,value,valueSource}:{record:PublicRecord;value:LedgerValueDisplay;valueSource:LedgerValueIndex|null}){
 const {pulse}=useKaiKlok(Boolean(valueSource||record.valueOperands?.cardValuation));
 const currentValue=useMemo(()=>ledgerCurrentAssetValue(record,valueSource,pulse),[record,valueSource,pulse]);
 if(!currentValue)return null;
 return <div className="receipt-live-value"><div><span>Current live value</span><strong>{formatMoney(currentValue.amountUsdCents!)}</strong><small>☤KAI {BigInt(currentValue.pulse!).toLocaleString('en-US')}</small></div><LedgerValueChange value={value} currentValue={currentValue}/></div>;
}
export function ReceiptView({onBack}:{onBack():void}){
 const [localContext]=useState(()=>readLocalReceiptContext(location.href));
 useEffect(()=>()=>releaseLocalReceiptContext(localContext),[localContext]);
 const [receipt,setReceipt]=useState<LedgerReceipt|null>(null),[error,setError]=useState(''),[notice,setNotice]=useState('');
 useEffect(()=>{try{setReceipt(readReceiptLink(location.href));setError('');}catch{setError('This receipt link is incomplete or unsupported. Ask the sender for the original link.');}},[]);
 const record=useMemo(()=>localContext?.record??(receipt?{id:`${receipt.source}:${receipt.id}`,sourceId:receipt.id,source:receipt.source,kind:receipt.kind,title:receipt.title,detail:receipt.detail,time:receipt.time,actor:null,amountUsdCents:receipt.amountUsdCents,pulse:receipt.pulse,kaiUpulse:receipt.kaiUpulse,sender:receipt.sender,recipient:receipt.recipient,sourceUrl:receipt.sourceUrl,evidence:receipt.evidence,valueOperands:receipt.valueOperands,details:receipt.details??undefined,authority:receipt.authority}:null),[receipt,localContext]);
 const copy=async()=>{try{await navigator.clipboard.writeText(location.href);setNotice('Receipt link copied.');}catch{setNotice('Copy the receipt link from your address bar.');}};
 if(error)return <main className="receipt-page"><div className="receipt-error"><FileText size={30}/><h1>Receipt unavailable.</h1><p>{error}</p><button onClick={onBack}>Return to bank<ArrowLeft size={16}/></button></div></main>;
 if(!receipt)return null;
 const proof=/proof|market.asset/i.test(receipt.kind),value:LedgerValueDisplay=localContext?.value??receipt.value??{basis:receipt.amountUsdCents===null?'unavailable':'payment',amountUsdCents:receipt.amountUsdCents,pulse:receipt.pulse,considerationUsdCents:null},amount=value.amountUsdCents===null?'Recorded':formatMoney(value.amountUsdCents),label=proof?'Proof receipt':'Activity receipt';
 return <main className="receipt-page"><header className="receipt-header"><button onClick={onBack} className="receipt-back" aria-label="Return to ledger"><ArrowLeft size={18}/></button><a href="/" className="receipt-brand">Bankeiz</a><button onClick={()=>void copy()} className="receipt-copy" aria-label="Copy receipt link" title="Copy receipt link">{notice.startsWith('Receipt link copied')?<Check size={17}/>:<Copy size={17}/>}</button></header>
 <article className="transaction-receipt" aria-label={label}><div className="receipt-topline"><span>{label}</span><span><FileText size={14}/>Source record</span></div>
 <div className="receipt-value"><span className="receipt-symbol"><ArrowUpRight size={25} strokeWidth={1.25}/></span><p>{value.basis==='unavailable'?'Value not supplied':ledgerValueLabel(value)}</p><h1 style={{fontSize:`clamp(18px, min(10.5vw, ${Math.min(64,700/amount.length)}px), 64px)`}}>{amount}</h1>{receipt.time&&<time>{new Date(receipt.time).toLocaleString(undefined,{month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'})}</time>}</div>
 <dl className="receipt-facts">{receipt.sender&&<div><dt>From</dt><dd title={receipt.sender}>{receipt.sender}</dd></div>}{receipt.recipient&&<div><dt>To</dt><dd title={receipt.recipient}>{receipt.recipient}</dd></div>}{value.considerationUsdCents!==null&&<div><dt>Consideration</dt><dd>{formatMoney(value.considerationUsdCents)}</dd></div>}<div><dt>Reference</dt><dd className="receipt-mono" title={receipt.id}>{receipt.id}</dd></div><div><dt>Event ☤KAI</dt><dd className="receipt-mono">{receipt.pulse??'Not carried by source'}</dd></div>{receipt.kaiUpulse&&<div><dt>Event ☤µKAI</dt><dd className="receipt-mono">{receipt.kaiUpulse}</dd></div>}{value.amountUsdCents!==null&&value.pulse&&value.pulse!==receipt.pulse&&value.basis!=='payment'&&<div><dt>Value at ☤KAI</dt><dd className="receipt-mono">{value.pulse}</dd></div>}</dl>
 <ReceiptLiveValue record={record!} value={value} valueSource={localContext?.valueSource??null}/>
 <div className="receipt-provenance"><LedgerFundingTrace record={record!}/></div>
 <footer className="receipt-source"><Link2 size={17} strokeWidth={1.5}/><div><strong>The record stays connected.</strong><p>{receipt.sourceUrl?'Inspect the original source and its supported claims.':'This link carries the selected ledger entry.'}</p></div>{receipt.sourceUrl&&<a href={receipt.sourceUrl} target="_blank" rel="noreferrer" aria-label="Inspect original receipt" title="Inspect original receipt"><ArrowUpRight size={18}/></a>}</footer>
 <details className="receipt-inspection"><summary>Inspect full record</summary>{receipt.contextOmitted&&<p className="receipt-context-note">This link carries the core receipt. Additional source context remains in the Ledger.</p>}<LedgerInspector receiptMode record={record!} value={value} valuation={localContext?.valuation??receipt.valuation}/></details>
 </article><p className="receipt-caption">This shareable display record is not independently verified. A calculated protocol value is separate from a completed sale price and available account funds.</p><p className="receipt-status" role="status">{notice}</p><div className="receipt-signature"><a href="/learn/reality-grade-banking/">Reality-Grade Banking</a></div></main>;
}
