import {Check,Copy,FileCheck,Globe,Info} from 'lucide-react';
import {useState} from 'react';
import type {BusinessChatReceipt} from '../../receiz/business-chat';
export function BusinessReceipts({receipts,onConnect}:{receipts:readonly BusinessChatReceipt[];onConnect?:(href:string)=>void}){
 const[copied,setCopied]=useState('');
 async function copy(value:string){try{await navigator.clipboard.writeText(value);setCopied(value);}catch{setCopied('');}}
 return <div className="bank-business-receipts" aria-label="Native setup results">{receipts.map(receipt=><section key={receipt.id} className="bank-business-receipt" data-outcome={receipt.status}>
  <header>{receipt.status==='accepted'?<Check size={17}/>:receipt.domain?<Globe size={17}/>:receipt.status==='needs-file'?<FileCheck size={17}/>:<Info size={17}/>}<strong>{receipt.title}</strong></header><p>{receipt.summary}</p>
  {receipt.domain&&<><p>{receipt.domain.hostname}</p>{receipt.domain.warning&&<p role="status">{receipt.domain.warning}</p>}{receipt.status==='manual'&&<p>Provider access is not connected. Keep your existing email and unrelated records. Use one connection option, plus every verification record.</p>}
  {[...receipt.domain.connectionOptions,...receipt.domain.verificationRecords].map((row,index)=><div className="bank-business-dns-record" key={index}><small>{row.purpose} · {row.type}</small><span>{row.name}</span><button type="button" onClick={()=>void copy(row.value)} aria-label={'Copy '+row.type+' value'}><code>{row.value}</code>{copied===row.value?<Check size={14}/>:<Copy size={14}/>}</button></div>)}
  <details><summary>Domain instructions</summary><ol>{receipt.domain.steps.map((step,index)=><li key={index}>{step}</li>)}</ol></details></>}
  {receipt.connect&&onConnect&&<button className="primary-button" type="button" onClick={()=>onConnect(receipt.connect!.href)}>{receipt.connect.label}</button>}
  {receipt.details&&<details><summary>View native result</summary><pre>{receipt.details}</pre></details>}
 </section>)}</div>;
}
