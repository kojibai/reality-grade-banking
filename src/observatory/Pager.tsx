import {ChevronLeft, ChevronRight} from 'lucide-react';
const number=new Intl.NumberFormat('en-US');

export function Pager({count,page,onPage,size=8}:{count:number;page:number;onPage:(page:number)=>void;size?:number}){
  const pages=Math.max(1,Math.ceil(count/size));
  return <div className="obs-pager"><span>{count?number.format(page*size+1)+'–'+number.format(Math.min(count,(page+1)*size))+' of '+number.format(count):'No matches'}</span><button disabled={!page} aria-label="Previous page" onClick={()=>onPage(page-1)}><ChevronLeft/></button><label>Page <select aria-label="Jump to page" value={page} onChange={e=>onPage(Number(e.target.value))}>{Array.from({length:pages},(_,i)=><option key={i} value={i}>{i+1}</option>)}</select> / {pages}</label><button disabled={page+1>=pages} aria-label="Next page" onClick={()=>onPage(page+1)}><ChevronRight/></button></div>;
}

