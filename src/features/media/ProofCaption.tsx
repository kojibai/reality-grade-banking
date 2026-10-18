import {ArrowUpRight} from 'lucide-react';
import {splitProofCaption} from './proof-caption';

export function ProofCaption({caption}:{caption:string}){
 const {text,links}=splitProofCaption(caption);
 return <section className="asset-caption" aria-label="Object caption"><span>Object note</span>{text&&<p>{text}</p>}{links.length>0&&<nav className="proof-caption-links" aria-label="Caption destinations">{links.map(href=>{const url=new URL(href),label=url.host+(url.pathname==='/'?'':url.pathname)+url.search+url.hash;return <a key={href} href={href} target="_blank" rel="noopener noreferrer" aria-label={`Open ${href}`} title={href}><span>{label}</span><ArrowUpRight size={13} strokeWidth={1.5}/></a>;})}</nav>}</section>;
}
