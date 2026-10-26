import {useEffect} from 'react';
import {Check,Download,FileCheck,Info} from 'lucide-react';
import type {MoneyReceipt} from '../../receiz/money-workspace';
import {formatMoney} from '../../core/money';
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const money=(v:unknown)=>typeof v==='string'&&/^\d{1,40}$/.test(v)?formatMoney(v):null;
export function MoneyReceipts({receipts,onDownload,onReviewShown}:{onReviewShown?:(reviewId:string)=>void;receipts:readonly MoneyReceipt[];onDownload?:(digest:string)=>void}){
 useEffect(()=>{for(const receipt of receipts)if(receipt.status==='needs-confirmation'&&typeof receipt.data?.reviewId==='string'&&typeof receipt.data.body==='string')onReviewShown?.(receipt.data.reviewId);},[receipts,onReviewShown]);
 return <div className="bank-business-receipts bank-money-receipts" aria-label="Your money task results">{receipts.map(receipt=>{
  const data=receipt.data??{},rows=Array.isArray(data.commitments)?data.commitments.filter(object):[],transactions=Array.isArray(data.transactions)?data.transactions.filter(object):[],source=typeof data.sourceDigest==='string'&&/^[a-f0-9]{64}$/.test(data.sourceDigest)?data.sourceDigest:null;
  return <section className="bank-business-receipt" data-outcome={receipt.status} key={receipt.id}><header>{receipt.status==='accepted'?<Check size={17}/>:<Info size={17}/>}<strong>{receipt.tool==='money_search_history'?'Your financial history':receipt.status==='needs-confirmation'?'Review your message':receipt.tool==='money_list_commitments'?'What’s owed and due':'Money task'}</strong></header><p>{receipt.summary}</p>
   {money(data.totalOutstandingUsdCents)&&<p><strong>{money(data.totalOutstandingUsdCents)}</strong> outstanding in tracked commitments</p>}
   {rows.map(row=><div className="bank-money-row" key={String(row.id)}><span><strong>{String(row.title)}</strong><small>{String(row.counterparty)}{typeof row.dueAt==='string'?' · Due '+new Date(row.dueAt).toLocaleDateString():''}</small></span><span>{money(row.outstandingUsdCents)}<small>{row.paymentState==='verified-paid'?'Payment confirmed':row.paymentState==='partially-paid'?'Part paid':'Owner-reported'}</small></span></div>)}
   {transactions.map(row=><div className="bank-money-row" key={String(row.transactionId)}><span><strong>{String(row.description)}</strong><small>{String(row.transactionId)}</small></span></div>)}
   {typeof data.body==='string'&&<div className="bank-money-review"><p><strong>To @{String(data.username)}</strong>{money(data.amountUsdCents)?' · '+money(data.amountUsdCents):''}</p><blockquote>{data.body}</blockquote><small>Reply “send it” to confirm this exact message.</small></div>}
   {typeof data.url==='string'&&/^https:\/\/bankeiz\.com\//.test(data.url)&&<a className="bank-business-domain-open" href={data.url} target="_blank" rel="noopener noreferrer">Open payment request<FileCheck size={14}/></a>}
   {source&&onDownload&&<><button className="bank-money-download" type="button" onClick={()=>onDownload(source)}><Download size={14}/>Download source proof</button><small className="bank-money-private-note">Includes the underlying private account statement. Keep it private.</small></>}
   {typeof data.coverage==='string'&&<small className="bank-money-private-note">{data.coverage}</small>}
  </section>;
 })}</div>;
}
