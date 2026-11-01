import {Search,X} from 'lucide-react';
import './ledger-search.css';
export function LedgerSearch({query,onChange,mine}:{query:string;onChange(value:string):void;mine:boolean}){
 const label=mine?'Search your history':'Search the Ledger';
 return <div className="ledger-search"><Search size={15} aria-hidden="true"/><input aria-label={label} placeholder={label} value={query} maxLength={160} autoComplete="off" enterKeyHint="search" onChange={event=>onChange(event.target.value)}/>{query&&<button type="button" onClick={()=>onChange('')} aria-label="Clear search"><X size={14}/></button>}</div>;
}
