import type {ReactNode} from 'react';
import {ArrowUpRight,Download,ShieldCheck} from 'lucide-react';
import {formatMoney} from '../core/money';
import type {InvoiceSource} from '../receiz/invoice-source';
import type {ProposalItem} from '../receiz/proposal-draft';
import './invoice.css';
function lineAmount(item:ProposalItem){const [whole,fraction='']=item.quantity.split('.');return((BigInt(whole)*1000n+BigInt(fraction.padEnd(3,'0')))*BigInt(item.unitPriceUsdCents)/1000n).toString();}
export function downloadInvoiceOriginal(source:InvoiceSource){const url=URL.createObjectURL(source.original),link=document.createElement('a');link.href=url;link.download=source.original.name;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
export function InvoiceView({source,onPay,children}:{source:InvoiceSource;onPay?:()=>void;children?:ReactNode}){
 const p=source.proposal,b=p.branding;
 return <article className="invoice-document" aria-label="Invoice"><header className="invoice-document-heading"><div><span className="invoice-eyebrow">Invoice</span><h1>{p.draft.title}</h1><p className="invoice-summary">{p.draft.summary}</p></div><div className="invoice-reference"><span>Reference</span><code>{p.id.slice(-8).toUpperCase()}</code><time dateTime={p.createdAt}>{new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'}).format(new Date(p.createdAt))}</time></div></header>
  <div className="invoice-parties"><section><h2>From</h2><strong>{b?.issuerName||p.issuer.name}</strong><span>@{p.issuer.username}</span>{b?.issuerDetails&&<p>{b.issuerDetails}</p>}</section><section><h2>Bill to</h2><strong>{b?.clientName||'Client'}</strong>{b?.clientDetails&&<p>{b.clientDetails}</p>}</section></div>
  <div className="invoice-items"><table aria-label="Invoice line items"><thead><tr><th scope="col">Description</th><th scope="col">Qty</th><th scope="col">Rate</th><th scope="col">Amount</th></tr></thead><tbody>{p.draft.items.map((item,i)=><tr key={i}><th scope="row">{item.description}</th><td>{item.quantity}</td><td>{formatMoney(item.unitPriceUsdCents)}</td><td>{formatMoney(lineAmount(item))}</td></tr>)}</tbody></table></div>
  <div className="invoice-total"><div><span>Total requested</span><small>USD · US dollars</small></div><strong>{formatMoney(p.fixedSale.amountUsdCents)}</strong></div>
  {(p.draft.timeline||p.draft.terms||p.draft.deliverables.length>0)&&<section className="invoice-terms"><h2>Details &amp; terms</h2>{p.draft.timeline&&<p>{p.draft.timeline}</p>}{p.draft.deliverables.length>0&&<ul>{p.draft.deliverables.map((value,i)=><li key={i}>{value}</li>)}</ul>}{p.draft.terms&&<p>{p.draft.terms}</p>}</section>}
  {onPay&&<div className="invoice-pay"><button type="button" className="primary-button" onClick={onPay}>Pay {formatMoney(p.fixedSale.amountUsdCents)}<ArrowUpRight size={18}/></button><p><ShieldCheck size={14}/>Review and approve before any payment.</p><span>Card, balance or Note. Your choice.</span></div>}
  {children}<footer className="invoice-document-footer"><button type="button" onClick={()=>downloadInvoiceOriginal(source)}><Download size={14}/>Download original PDF</button><span>Keep a copy for your records.</span></footer>
 </article>;
}
