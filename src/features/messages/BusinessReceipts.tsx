import {ArrowUpRight,Check,Copy,FileCheck,Globe,Info} from 'lucide-react';
import {useState} from 'react';
import type {BusinessChatReceipt} from '../../receiz/business-chat';
export function BusinessReceipts({receipts,onConnect,onReceizAction}:{receipts:readonly BusinessChatReceipt[];onConnect?:(href:string)=>void;onReceizAction?:(id:string,action:'approve'|'inspect')=>void}){
 const[copied,setCopied]=useState('');
 async function copy(value:string){try{await navigator.clipboard.writeText(value);setCopied(value);}catch{setCopied('');}}
 return <div className="bank-business-receipts" aria-label="Native setup results">{receipts.map(receipt=>{
  const domain=receipt.domain,automatic=domain?.providerResult?.status==='applied',live=receipt.status==='accepted'&&domain?.status==='live'&&domain.liveUrl==='https://'+domain.hostname;
  const records=domain?<>{[...domain.connectionOptions,...domain.verificationRecords].map((row,index)=><div className="bank-business-dns-record" key={index}><small>{row.purpose} · {row.type}</small><span>{row.name}</span><button type="button" onClick={()=>void copy(row.value)} aria-label={'Copy '+row.type+' value'}><code>{row.value}</code>{copied===row.value?<Check size={14}/>:<Copy size={14}/>}</button></div>)}</>:null;
  return <section key={receipt.id} className="bank-business-receipt" data-outcome={receipt.status}>
   <header>{receipt.status==='accepted'?<Check size={17}/>:domain?<Globe size={17}/>:receipt.status==='needs-file'?<FileCheck size={17}/>:<Info size={17}/>}<strong>{receipt.title}</strong></header><p>{receipt.summary}</p>
   {domain&&<><p className="bank-business-hostname">{domain.hostname}</p>{domain.warning&&<p role="status">{domain.warning}</p>}
    {automatic&&<div className="bank-business-domain-progress" role="status"><span><Check size={13}/>DNS saved</span><span>{live?<Check size={13}/>:<i className={receipt.domainChecking&&domain.status!=='domain_changed'?"bank-business-domain-pulse":"bank-business-domain-wait"} aria-hidden="true"/>}{live?'Profile verified':domain.status==='domain_changed'?'Checks stopped':receipt.domainChecking?'Checking delivery':'Waiting for delivery'}</span></div>}
    {live&&<a className="bank-business-domain-open" href={domain.liveUrl!} target="_blank" rel="noopener noreferrer">Open your domain<ArrowUpRight size={15}/></a>}
    {automatic?<details><summary>Connection details</summary>{records}</details>:<>{records}<details><summary>Domain instructions</summary><ol>{domain.steps.map((step,index)=><li key={index}>{step}</li>)}</ol></details></>}
   </>}
   {receipt.connect&&onConnect&&<button className="primary-button" type="button" onClick={()=>onConnect(receipt.connect!.href)}>{receipt.connect.label}</button>}
   {receipt.reviewTool&&onReceizAction&&<><p>{receipt.reviewTool.name.replace(/^receiz_/,'').replaceAll('_',' ')}</p><details><summary>Action details</summary><pre>{receipt.reviewTool.argumentsJson}</pre></details><button type="button" className="primary-button" onClick={()=>onReceizAction(receipt.id,'approve')}>Run this action</button></>}
   {receipt.inspectTool&&onReceizAction&&<button type="button" className="secondary-button" onClick={()=>onReceizAction(receipt.id,'inspect')}>Check result</button>}
   {receipt.details&&<details><summary>View native result</summary><pre>{receipt.details}</pre></details>}
  </section>;
 })}</div>;
}
