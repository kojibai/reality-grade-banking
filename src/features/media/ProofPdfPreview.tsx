import {lazy,Suspense,useCallback,useEffect,useRef,useState} from 'react';
const Reader=lazy(()=>import('./ProofPdfReader'));
const covers=new Map<string,string>();
/** Load the PDF engine only near an actual document card, outside initial
 * profile rendering. Its public document is shared with the opened reader. */
export function ProofPdfPreview({url,title,cacheKey=url}:{url:string;title:string;cacheKey?:string}){
 const frame=useRef<HTMLSpanElement>(null),[near,setNear]=useState(false),[image,setImage]=useState(()=>covers.get(cacheKey)??null),retain=useCallback((value:string)=>{covers.delete(cacheKey);covers.set(cacheKey,value);while(covers.size>32)covers.delete(covers.keys().next().value!);setImage(value);},[cacheKey]);
 useEffect(()=>{if(!frame.current)return;if(typeof IntersectionObserver==='undefined'){setNear(true);return;}const observer=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting)){setNear(true);observer.disconnect();}},{rootMargin:'500px'});observer.observe(frame.current);return()=>observer.disconnect();},[]);
 return <span className="proof-pdf-preview" ref={frame}>{image?<img src={image} alt={title+' · first page'} draggable={false}/>:near&&<Suspense fallback={<span className="proof-pdf-cover-label">PDF</span>}><Reader url={url} title={title} cover onCover={retain}/></Suspense>}</span>;
}
