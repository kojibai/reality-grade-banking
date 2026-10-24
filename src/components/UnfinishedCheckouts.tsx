import {ChevronRight,X} from 'lucide-react';
import {formatMoney} from '../core/money';
import './UnfinishedCheckouts.css';
export function UnfinishedCheckouts({title='Unfinished card deposits',entries,busy,onResume,onCancel}:{title?:string;entries:readonly {id:string;amountUsdCents:string;label?:string;cancellable?:boolean}[];busy:boolean;onResume(id:string):void;onCancel?:(id:string)=>void}){
 if(!entries.length)return null;
 return <section className="unfinished-checkouts" aria-label={title}><h2>{title}</h2>{entries.map(entry=><div className="unfinished-checkout" key={entry.id}><button className="unfinished-checkout-resume" type="button" disabled={busy} onClick={()=>onResume(entry.id)}><span><strong>{formatMoney(entry.amountUsdCents)}</strong><span>{entry.label??'Resume secure checkout'}</span></span><ChevronRight size={17}/></button>{onCancel&&entry.cancellable!==false&&<button className="unfinished-checkout-cancel" type="button" disabled={busy} aria-label={`Cancel ${formatMoney(entry.amountUsdCents)} checkout`} onClick={()=>onCancel(entry.id)}><X size={16}/></button>}</div>)}</section>;
}
