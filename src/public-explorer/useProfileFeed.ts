import {useCallback,useEffect,useRef,useState} from 'react';

const PAGE_SIZE=24;
/** Reveal already-held rows ahead of scrolling. A remaining source page is read
 * once per boundary; a failed read requires an explicit retry, never a loop. */
export function useProfileFeed({length,boundary,hasMore,active,busy,onMore,initialCount=PAGE_SIZE,view=''}:{length:number;boundary:string;hasMore:boolean;active:boolean;busy:boolean;onMore?:()=>void;initialCount?:number;view?:string}){
 const [windows,setWindows]=useState<Record<string,number>>(()=>({[view]:initialCount})),tail=useRef<HTMLDivElement>(null),attempted=useRef(''),count=windows[view]??PAGE_SIZE;
 const remaining=count<length||hasMore;
 const loadMore=useCallback((automatic=false)=>{
  if(busy)return;
  if(count<length){setWindows(previous=>({...previous,[view]:Math.min(length,count+PAGE_SIZE)}));return;}
  if(hasMore&&onMore&&(!automatic||attempted.current!==boundary)){attempted.current=boundary;onMore();}
 },[busy,count,length,hasMore,onMore,boundary,view]);
 useEffect(()=>{
  if(!active||!remaining||busy||!tail.current||typeof IntersectionObserver==='undefined')return;
  const observer=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting))loadMore(true);},{rootMargin:'1400px 0px'});
  observer.observe(tail.current);return()=>observer.disconnect();
 },[active,remaining,busy,loadMore]);
 return {count,remaining,tail,loadMore:()=>loadMore(false)};
}
